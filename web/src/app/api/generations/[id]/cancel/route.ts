/**
 * POST /api/generations/[id]/cancel
 * 取消进行中的任务。仅创建者或 admin 可取消。
 */
import { ok, fail, handleError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { cancelGeneration } from "@/lib/services/generation";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const sess = await getSession();
    const g = await prisma.generation.findUnique({
      where: { id: params.id },
      select: { userId: true, status: true },
    });
    if (!g) return fail(404, "记录不存在");
    if (sess.role !== "admin" && g.userId && g.userId !== sess.userId) {
      return fail(403, "无权限取消该任务");
    }
    if (g.status !== "running" && g.status !== "polling" && g.status !== "queued") {
      return fail(400, `任务已结束（${g.status}）`);
    }
    const ok2 = cancelGeneration(params.id);
    if (!ok2) {
      // 进程内未找到 —— 可能是另一实例发起的；仅标记数据库状态
      await prisma.generation.update({
        where: { id: params.id },
        data: { status: "canceled", finishedAt: new Date() },
      });
    }
    return ok({ canceled: true });
  } catch (e) {
    return handleError(e);
  }
}
