/**
 * GET /api/generations/[id]   —— 单条生成详情（含 debug 快照）
 */
import { ok, fail, handleError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const sess = await getSession();
    const g = await prisma.generation.findUnique({
      where: { id: params.id },
      include: {
        provider: { select: { name: true, slug: true } },
        model: { select: { displayName: true, modelKey: true } },
      },
    });
    if (!g) return fail(404, "记录不存在");
    // 普通用户只能看自己；admin 可看全部
    if (sess.role !== "admin" && g.userId && g.userId !== sess.userId) {
      return fail(403, "无权限查看该记录");
    }
    return ok({
      id: g.id,
      status: g.status,
      progress: g.progress,
      prompt: g.prompt,
      negativePrompt: g.negativePrompt,
      size: g.size,
      count: g.count,
      seed: g.seed,
      provider: g.provider,
      model: g.model,
      imageUrls: safeParseArray(g.resultUrlsJson),
      errorMessage: g.errorMessage,
      durationMs: g.durationMs,
      externalTaskId: g.externalTaskId,
      createdAt: g.createdAt,
      finishedAt: g.finishedAt,
      // debug 仅 admin 返回
      debug:
        sess.role === "admin"
          ? {
              request: safeParse(g.lastRequestJson),
              response: safeParse(g.lastResponseJson),
            }
          : undefined,
    });
  } catch (e) {
    return handleError(e);
  }
}

function safeParseArray(s: string | null | undefined): string[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function safeParse(s: string | null | undefined): unknown {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}
