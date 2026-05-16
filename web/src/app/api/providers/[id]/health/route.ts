/**
 * POST /api/providers/[id]/health  立即触发健康检查
 * GET  /api/providers/[id]/health  查询最近 20 次结果
 */
import { ok, handleError } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { checkProviderHealth, getRecentHealth } from "@/lib/services/health";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    await requireAdmin();
    const r = await checkProviderHealth(params.id);
    return ok(r);
  } catch (e) {
    return handleError(e);
  }
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    await requireAdmin();
    const list = await getRecentHealth(params.id);
    return ok(list);
  } catch (e) {
    return handleError(e);
  }
}
