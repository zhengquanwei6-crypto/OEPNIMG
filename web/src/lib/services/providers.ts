/**
 * Provider / Model / AdapterTemplate 服务层
 * 隔离 Prisma 与路由层，统一 JSON 字段的序列化/反序列化
 */
import { prisma } from "@/lib/db";
import {
  parseAdapter,
  type ProviderAdapter,
} from "@/lib/adapters/schema";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

// ----------------- AdapterTemplate -----------------

export async function listTemplates() {
  const list = await prisma.adapterTemplate.findMany({
    orderBy: [{ updatedAt: "desc" }],
  });
  return list.map((t) => ({
    id: t.id,
    templateKey: t.templateKey,
    version: t.version,
    name: t.name,
    description: t.description,
    status: t.status,
    lastDryRunOk: t.lastDryRunOk,
    lastDryRunAt: t.lastDryRunAt,
    updatedAt: t.updatedAt,
  }));
}

export async function getTemplate(id: string) {
  const t = await prisma.adapterTemplate.findUnique({ where: { id } });
  if (!t) return null;
  const config = JSON.parse(t.configJson) as ProviderAdapter;
  return { ...t, config };
}

export async function saveTemplate(args: {
  id?: string;
  templateKey: string;
  version: string;
  name: string;
  description?: string;
  config: ProviderAdapter;
  sourceDocId?: string;
  status?: "draft" | "published" | "archived";
}) {
  const parsed = parseAdapter(args.config);
  if (!parsed.ok) throw new Error(`配置校验失败：${parsed.error}`);

  const data = {
    templateKey: args.templateKey,
    version: args.version,
    name: args.name,
    description: args.description,
    configJson: JSON.stringify(parsed.data),
    sourceDocId: args.sourceDocId ?? null,
    status: args.status ?? "draft",
  };
  if (args.id) {
    return prisma.adapterTemplate.update({ where: { id: args.id }, data });
  }
  return prisma.adapterTemplate.create({ data });
}

// ----------------- Provider -----------------

export async function listProviders() {
  const list = await prisma.provider.findMany({
    where: { enabled: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: {
      template: { select: { id: true, name: true, version: true, templateKey: true } },
      models: {
        where: { enabled: true },
        orderBy: { displayName: "asc" },
      },
    },
  });
  // 不返回 apiKeyEnc
  return list.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    baseUrl: p.baseUrl,
    enabled: p.enabled,
    sortOrder: p.sortOrder,
    template: p.template,
    models: p.models.map((m) => ({
      id: m.id,
      modelKey: m.modelKey,
      displayName: m.displayName,
      capability: m.capability,
      enabled: m.enabled,
    })),
  }));
}

export async function getProviderWithKey(id: string) {
  const p = await prisma.provider.findUnique({
    where: { id },
    include: { template: true, models: true },
  });
  if (!p) return null;
  const apiKey = decryptSecret(p.apiKeyEnc);
  const adapter = JSON.parse(p.template.configJson) as ProviderAdapter;
  return { provider: p, apiKey, adapter };
}

export async function createProvider(args: {
  slug: string;
  name: string;
  description?: string;
  baseUrl: string;
  apiKey: string;
  templateId: string;
}) {
  const tpl = await prisma.adapterTemplate.findUnique({
    where: { id: args.templateId },
  });
  if (!tpl) throw new Error("模板不存在");
  const cfg = JSON.parse(tpl.configJson) as ProviderAdapter;

  const provider = await prisma.provider.create({
    data: {
      slug: args.slug,
      name: args.name,
      description: args.description,
      baseUrl: args.baseUrl || cfg.baseUrl,
      apiKeyEnc: encryptSecret(args.apiKey),
      templateId: args.templateId,
      models: {
        create: cfg.models.map((m) => ({
          modelKey: m.id,
          displayName: m.displayName,
          capability: m.capability,
          costEstimate: m.costEstimate,
        })),
      },
    },
    include: { models: true },
  });
  return provider;
}

export async function updateProvider(args: {
  id: string;
  name?: string;
  description?: string;
  baseUrl?: string;
  apiKey?: string;
  enabled?: boolean;
  sortOrder?: number;
}) {
  const data: Record<string, unknown> = {};
  if (args.name !== undefined) data.name = args.name;
  if (args.description !== undefined) data.description = args.description;
  if (args.baseUrl !== undefined) data.baseUrl = args.baseUrl;
  if (args.enabled !== undefined) data.enabled = args.enabled;
  if (args.sortOrder !== undefined) data.sortOrder = args.sortOrder;
  if (args.apiKey) data.apiKeyEnc = encryptSecret(args.apiKey);
  return prisma.provider.update({ where: { id: args.id }, data });
}

export async function deleteProvider(id: string) {
  return prisma.provider.delete({ where: { id } });
}
