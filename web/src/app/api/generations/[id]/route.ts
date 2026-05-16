/**
 * GET    /api/generations/[id]   单条生成详情（含 debug 快照）
 * PATCH  /api/generations/[id]   修改 favorite / hidden
 * DELETE /api/generations/[id]   软删除（hidden = true）
 */
import { z } from "zod";
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
      favorite: g.favorite,
      provider: g.provider,
      model: g.model,
      imageUrls: safeArr(g.resultUrlsJson),
      errorMessage: g.errorMessage,
      durationMs: g.durationMs,
      externalTaskId: g.externalTaskId,
      createdAt: g.createdAt,
      finishedAt: g.finishedAt,
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

const PatchBody = z.object({
  favorite: z.boolean().optional(),
  hidden: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const sess = await getSession();
    const g = await prisma.generation.findUnique({
      where: { id: params.id },
      select: { userId: true },
    });
    if (!g) return fail(404, "记录不存在");
    if (sess.role !== "admin" && g.userId && g.userId !== sess.userId) {
      return fail(403, "无权限修改该记录");
    }
    const body = PatchBody.parse(await req.json());
    const updated = await prisma.generation.update({
      where: { id: params.id },
      data: body,
    });
    return ok({ id: updated.id, favorite: updated.favorite, hidden: updated.hidden });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const sess = await getSession();
    const g = await prisma.generation.findUnique({
      where: { id: params.id },
      select: { userId: true },
    });
    if (!g) return fail(404, "记录不存在");
    if (sess.role !== "admin" && g.userId && g.userId !== sess.userId) {
      return fail(403, "无权限删除该记录");
    }
    await prisma.generation.update({
      where: { id: params.id },
      data: { hidden: true },
    });
    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}

function safeArr(s: string | null | undefined): string[] {
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
