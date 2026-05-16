/**
 * 数据库种子（幂等）：
 *  1. 若不存在用户，依据 ADMIN_USERNAME / ADMIN_PASSWORD 创建管理员
 *  2. 注入内置 AdapterTemplate（OpenAI 兼容 + KIE.AI），均为 published 状态
 *
 * 重复运行不会重复插入；模板的 templateKey+version 是唯一键。
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();

async function getSyncFn() {
  const mod = (await import("../src/lib/services/providers")) as typeof import("../src/lib/services/providers");
  return mod.syncAllProvidersOfTemplate;
}

const DEFAULT_OPENAI_COMPATIBLE = {
  id: "openai-compatible-v1",
  name: "OpenAI 兼容 (DALL·E 3 / GPT-Image)",
  baseUrl: "https://api.openai.com/v1",
  auth: {
    type: "bearer",
    valueTemplate: "Bearer {API_KEY}",
  },
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

interface BuiltinTemplate {
  templateKey: string;
  name: string;
  description: string;
  config: Record<string, unknown>;
  version: string;
}

function loadKieAi(): BuiltinTemplate {
  const path = join(__dirname, "templates/kie-ai-v1.json");
  const config = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  return {
    templateKey: "kie-ai",
    name: "KIE.AI 图像生成（GPT Image 2 + Flux Kontext + 4o）",
    description:
      "kie.ai 中转站官方端点：GPT Image 2 (1K/2K/4K) + Flux Kontext + 4o Image。任务式 API，自动轮询。",
    config,
    version: (config.version as string) ?? "1.0.0",
  };
}

const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  {
    templateKey: "openai-compatible",
    name: "OpenAI 兼容 v1",
    description:
      "默认模板：适用于任何兼容 OpenAI /v1/images/generations 接口的中转站",
    config: DEFAULT_OPENAI_COMPATIBLE,
    version: "1.0.0",
  },
  loadKieAi(),
];

async function main() {
  // 1) admin 用户
  const username = process.env.ADMIN_USERNAME ?? "admin";
  const password = process.env.ADMIN_PASSWORD ?? "admin1234";
  const existsUser = await prisma.user.findUnique({ where: { username } });
  if (!existsUser) {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: { username, passwordHash, role: "admin" },
    });
    console.log(`[seed] created admin user: ${username}`);
  } else {
    console.log(`[seed] admin user "${username}" exists, skipped`);
  }

  // 2) 内置模板（幂等，但同 templateKey 已存在的旧版本会被自动升级到当前 version）
  const refreshedTemplateIds: string[] = [];
  for (const t of BUILTIN_TEMPLATES) {
    const existsAny = await prisma.adapterTemplate.findFirst({
      where: { templateKey: t.templateKey },
      orderBy: { updatedAt: "desc" },
    });
    const targetVersion = t.version ?? "1.0.0";

    if (!existsAny) {
      const created = await prisma.adapterTemplate.create({
        data: {
          templateKey: t.templateKey,
          version: targetVersion,
          name: t.name,
          description: t.description,
          status: "published",
          configJson: JSON.stringify(t.config),
        },
      });
      console.log(`[seed] created template: ${t.templateKey} v${targetVersion}`);
      refreshedTemplateIds.push(created.id);
      continue;
    }

    if (existsAny.version === targetVersion) {
      // 同版本：仅刷新 config / name / description（保持其余字段）
      const updated = await prisma.adapterTemplate.update({
        where: { id: existsAny.id },
        data: {
          name: t.name,
          description: t.description,
          configJson: JSON.stringify(t.config),
          status:
            existsAny.status === "archived" ? existsAny.status : "published",
        },
      });
      console.log(
        `[seed] refreshed template: ${t.templateKey} v${targetVersion}`,
      );
      refreshedTemplateIds.push(updated.id);
      continue;
    }

    // 不同版本：检查是否已存在该 version
    const sameVer = await prisma.adapterTemplate.findFirst({
      where: { templateKey: t.templateKey, version: targetVersion },
    });
    if (sameVer) {
      const updated = await prisma.adapterTemplate.update({
        where: { id: sameVer.id },
        data: {
          name: t.name,
          description: t.description,
          configJson: JSON.stringify(t.config),
        },
      });
      console.log(
        `[seed] refreshed existing version: ${t.templateKey} v${targetVersion}`,
      );
      refreshedTemplateIds.push(updated.id);
    } else {
      const created = await prisma.adapterTemplate.create({
        data: {
          templateKey: t.templateKey,
          version: targetVersion,
          name: t.name,
          description: t.description,
          status: "published",
          configJson: JSON.stringify(t.config),
        },
      });
      console.log(
        `[seed] upgraded ${t.templateKey} ${existsAny.version} → ${targetVersion}`,
      );
      refreshedTemplateIds.push(created.id);
    }
  }

  // 3) 同步使用刷新模板的 Provider 的 Model 表（增删改）
  const syncAllProvidersOfTemplate = await getSyncFn();
  for (const tid of refreshedTemplateIds) {
    const r = await syncAllProvidersOfTemplate(tid);
    if (r.providers > 0 && (r.added || r.updated || r.disabled)) {
      console.log(
        `[seed] synced ${r.providers} provider(s): +${r.added} models, ~${r.updated} updated, -${r.disabled} disabled`,
      );
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
