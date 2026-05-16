/**
 * POST /api/templates/[id]/dryrun
 *
 * 用临时凭证执行模板的最小可用调用（一次真实请求），
 * 验证 baseUrl 可达 + 鉴权 + 响应路径解析。
 * 结果写回 AdapterTemplate.lastDryRun*。
 */
import { z } from "zod";
import { ok, fail, handleError } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/db";
import { parseAdapter } from "@/lib/adapters/schema";
import { dryRunAdapter } from "@/lib/adapters/dryrun";

export const dynamic = "force-dynamic";

const Body = z.object({
  apiKey: z.string().min(1, "需要 apiKey 进行干跑"),
  baseUrl: z.string().url().optional(),
  samplePrompt: z.string().optional(),
  /** true = 仅校验 schema，不发送任何网络请求 */
  skipNetwork: z.boolean().default(false),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    await requireAdmin();
    const body = Body.parse(await req.json());
    const tpl = await prisma.adapterTemplate.findUnique({
      where: { id: params.id },
    });
    if (!tpl) return fail(404, "模板不存在");

    const parsed = parseAdapter(JSON.parse(tpl.configJson));
    if (!parsed.ok) {
      await prisma.adapterTemplate.update({
        where: { id: tpl.id },
        data: {
          lastDryRunOk: false,
          lastDryRunAt: new Date(),
          lastDryRunMessage: `Schema 校验失败：${parsed.error}`,
        },
      });
      return fail(422, `Schema 校验失败：${parsed.error}`);
    }

    const result = await dryRunAdapter(parsed.data, body.apiKey, {
      baseUrl: body.baseUrl,
      samplePrompt: body.samplePrompt,
      skipNetwork: body.skipNetwork,
    });

    await prisma.adapterTemplate.update({
      where: { id: tpl.id },
      data: {
        lastDryRunOk: result.ok,
        lastDryRunAt: new Date(),
        lastDryRunMessage: result.message.slice(0, 1000),
      },
    });

    return ok(result);
  } catch (e) {
    return handleError(e);
  }
}
