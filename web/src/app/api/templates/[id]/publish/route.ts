/**
 * POST /api/templates/[id]/publish
 * POST /api/templates/[id]/archive
 *
 * 简单的状态机：draft → published → archived
 */
import { ok, fail, handleError } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    await requireAdmin();
    const tpl = await prisma.adapterTemplate.findUnique({
      where: { id: params.id },
    });
    if (!tpl) return fail(404, "模板不存在");
    if (tpl.status === "archived") {
      return fail(400, "已归档的模板无法再次发布");
    }
    const updated = await prisma.adapterTemplate.update({
      where: { id: tpl.id },
      data: { status: "published" },
    });
    return ok({ id: updated.id, status: updated.status });
  } catch (e) {
    return handleError(e);
  }
}
