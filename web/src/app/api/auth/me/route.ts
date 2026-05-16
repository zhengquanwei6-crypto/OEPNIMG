import { getSession } from "@/lib/session";
import { ok, handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sess = await getSession();
    return ok({
      authenticated: Boolean(sess.userId),
      username: sess.username ?? null,
      role: sess.role ?? null,
    });
  } catch (e) {
    return handleError(e);
  }
}
