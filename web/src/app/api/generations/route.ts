/**
 * GET /api/generations  生成历史列表（带筛选）
 *   ?favorite=1  仅收藏
 *   ?status=succeeded
 *   ?providerId=xxx
 *   ?page=1&pageSize=20
 */
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { ok, handleError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const Query = z.object({
  favorite: z.coerce.number().optional(),
  status: z.string().optional(),
  providerId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(req: Request) {
  try {
    const sess = await getSession();
    const url = new URL(req.url);
    const q = Query.parse(Object.fromEntries(url.searchParams.entries()));

    const where: Prisma.GenerationWhereInput = { hidden: false };
    if (q.favorite) where.favorite = true;
    if (q.status) where.status = q.status;
    if (q.providerId) where.providerId = q.providerId;
    if (sess.role !== "admin") where.userId = sess.userId ?? null;

    const [list, total] = await Promise.all([
      prisma.generation.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: {
          provider: { select: { name: true } },
          model: { select: { displayName: true } },
        },
      }),
      prisma.generation.count({ where }),
    ]);

    return ok({
      items: list.map((g) => ({
        id: g.id,
        status: g.status,
        prompt: g.prompt,
        size: g.size,
        favorite: g.favorite,
        durationMs: g.durationMs,
        createdAt: g.createdAt,
        provider: g.provider,
        model: g.model,
        imageUrls: safeArr(g.resultUrlsJson),
      })),
      total,
      page: q.page,
      pageSize: q.pageSize,
    });
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
