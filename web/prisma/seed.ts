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
  config: unknown;
}

function loadKieAi(): BuiltinTemplate {
  const path = join(__dirname, "templates/kie-ai-v1.json");
  const config = JSON.parse(readFileSync(path, "utf8"));
  return {
    templateKey: "kie-ai",
    name: "KIE.AI 图像生成（Flux Kontext + 4o Image）",
    description:
      "kie.ai 中转站官方端点：Flux Kontext Pro/Max + GPT-4o Image。任务式 API，自动轮询。",
    config,
  };
}

const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  {
    templateKey: "openai-compatible",
    name: "OpenAI 兼容 v1",
    description:
      "默认模板：适用于任何兼容 OpenAI /v1/images/generations 接口的中转站",
    config: DEFAULT_OPENAI_COMPATIBLE,
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

  // 2) 内置模板（幂等）
  for (const t of BUILTIN_TEMPLATES) {
    const exists = await prisma.adapterTemplate.findFirst({
      where: { templateKey: t.templateKey },
    });
    if (exists) {
      console.log(`[seed] template "${t.templateKey}" exists, skipped`);
      continue;
    }
    await prisma.adapterTemplate.create({
      data: {
        templateKey: t.templateKey,
        version: "1.0.0",
        name: t.name,
        description: t.description,
        status: "published",
        configJson: JSON.stringify(t.config),
      },
    });
    console.log(`[seed] created template: ${t.templateKey}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
