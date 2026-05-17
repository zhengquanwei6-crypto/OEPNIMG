/**
 * 运行时 seed（在 Docker container 中由 entrypoint 调用）
 *
 * 与 prisma/seed.ts 等价，但用纯 CommonJS + 已生成的 prisma client，
 * 避免在 standalone 镜像里引入 tsx 编译开销。幂等。
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const fs = require("node:fs");
const path = require("node:path");

const prisma = new PrismaClient();

const DEFAULT_OPENAI_COMPATIBLE = {
  id: "openai-compatible-v1",
  name: "OpenAI 兼容 (DALL·E 3 / GPT-Image)",
  baseUrl: "https://api.openai.com/v1",
  auth: { type: "bearer", valueTemplate: "Bearer {API_KEY}" },
  capabilities: ["text-to-image"],
  models: [
    {
      id: "dall-e-3",
      displayName: "DALL·E 3",
      capability: "text-to-image",
      endpoint: { method: "POST", path: "/images/generations" },
      request: {
        contentType: "application/json",
        bodyTemplate: {
          model: "dall-e-3",
          prompt: "{{prompt}}",
          size: "{{size|1024x1024}}",
          n: "{{n|1}}",
          quality: "{{quality|standard}}",
        },
      },
      response: {
        type: "sync",
        imageUrlPath: "data[*].url",
        errorPath: "error.message",
      },
    },
  ],
};

function loadKieAi() {
  // /app/prisma/templates/kie-ai-v1.json
  const p = path.join(__dirname, "..", "prisma", "templates", "kie-ai-v1.json");
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

const TEMPLATES = [
  {
    templateKey: "openai-compatible",
    name: "OpenAI 兼容 v1",
    description: "默认模板：适用于任何兼容 OpenAI /v1/images/generations 接口的中转站",
    config: DEFAULT_OPENAI_COMPATIBLE,
    version: "1.0.0",
  },
  (() => {
    const c = loadKieAi();
    return {
      templateKey: "kie-ai",
      name: "KIE.AI 图像生成（GPT Image 2 + Flux Kontext + 4o）",
      description: "kie.ai 中转站官方端点：GPT Image 2 (1K/2K/4K) + Flux Kontext + 4o Image。",
      config: c,
      version: c.version || "1.0.0",
    };
  })(),
];

async function syncProviderModels(providerId) {
  const p = await prisma.provider.findUnique({
    where: { id: providerId },
    include: { template: true, models: true },
  });
  if (!p) return;
  const cfg = JSON.parse(p.template.configJson);
  const cfgKeys = new Set(cfg.models.map((m) => m.id));
  for (const cm of cfg.models) {
    const ex = p.models.find((mm) => mm.modelKey === cm.id);
    if (!ex) {
      await prisma.model.create({
        data: {
          providerId: p.id,
          modelKey: cm.id,
          displayName: cm.displayName,
          capability: cm.capability,
          costEstimate: cm.costEstimate,
        },
      });
    } else if (
      ex.displayName !== cm.displayName ||
      ex.capability !== cm.capability
    ) {
      await prisma.model.update({
        where: { id: ex.id },
        data: {
          displayName: cm.displayName,
          capability: cm.capability,
          costEstimate: cm.costEstimate,
        },
      });
    }
  }
  for (const mm of p.models) {
    if (!cfgKeys.has(mm.modelKey) && mm.enabled) {
      await prisma.model.update({ where: { id: mm.id }, data: { enabled: false } });
    }
  }
}

async function main() {
  // 1) admin
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "admin1234";
  const u = await prisma.user.findUnique({ where: { username } });
  if (!u) {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: { username, passwordHash, role: "admin" },
    });
    console.log(`[seed] created admin user: ${username}`);
  } else {
    console.log(`[seed] admin user "${username}" exists, skipped`);
  }

  // 2) 模板
  const refreshed = [];
  for (const t of TEMPLATES) {
    const ex = await prisma.adapterTemplate.findFirst({
      where: { templateKey: t.templateKey },
      orderBy: { updatedAt: "desc" },
    });
    if (!ex) {
      const c = await prisma.adapterTemplate.create({
        data: {
          templateKey: t.templateKey,
          version: t.version,
          name: t.name,
          description: t.description,
          status: "published",
          configJson: JSON.stringify(t.config),
        },
      });
      console.log(`[seed] created template: ${t.templateKey} v${t.version}`);
      refreshed.push(c.id);
    } else if (ex.version === t.version) {
      const c = await prisma.adapterTemplate.update({
        where: { id: ex.id },
        data: {
          name: t.name,
          description: t.description,
          configJson: JSON.stringify(t.config),
          status: ex.status === "archived" ? ex.status : "published",
        },
      });
      console.log(`[seed] refreshed template: ${t.templateKey} v${t.version}`);
      refreshed.push(c.id);
    } else {
      const same = await prisma.adapterTemplate.findFirst({
        where: { templateKey: t.templateKey, version: t.version },
      });
      if (same) {
        await prisma.adapterTemplate.update({
          where: { id: same.id },
          data: {
            name: t.name,
            description: t.description,
            configJson: JSON.stringify(t.config),
          },
        });
        console.log(`[seed] refreshed v${t.version} of ${t.templateKey}`);
        refreshed.push(same.id);
      } else {
        const c = await prisma.adapterTemplate.create({
          data: {
            templateKey: t.templateKey,
            version: t.version,
            name: t.name,
            description: t.description,
            status: "published",
            configJson: JSON.stringify(t.config),
          },
        });
        console.log(`[seed] upgraded ${t.templateKey} ${ex.version} → ${t.version}`);
        refreshed.push(c.id);
      }
    }
  }

  // 3) 同步引用模板的 Provider 的 Model 表
  for (const tid of refreshed) {
    const ps = await prisma.provider.findMany({
      where: { templateId: tid },
      select: { id: true },
    });
    for (const p of ps) {
      await syncProviderModels(p.id);
    }
  }
}

main()
  .catch((e) => {
    console.error("[seed] failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
