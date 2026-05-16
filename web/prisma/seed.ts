/**
 * 数据库种子：
 *  1. 若不存在用户，依据 ADMIN_USERNAME / ADMIN_PASSWORD 创建管理员
 *  2. 若不存在任何 AdapterTemplate，注入一个 OpenAI 兼容的官方默认模板（draft 状态，需要用户填 baseUrl/apiKey 后激活）
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

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
  }

  // 2) 默认 OpenAI 兼容模板（draft）
  const existsTpl = await prisma.adapterTemplate.findFirst({
    where: { templateKey: "openai-compatible" },
  });
  if (!existsTpl) {
    await prisma.adapterTemplate.create({
      data: {
        templateKey: "openai-compatible",
        version: "1.0.0",
        name: "OpenAI 兼容 v1",
        description:
          "默认模板：适用于任何兼容 OpenAI /v1/images/generations 接口的中转站",
        status: "published",
        configJson: JSON.stringify(DEFAULT_OPENAI_COMPATIBLE),
      },
    });
    console.log("[seed] created default adapter template: openai-compatible");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
