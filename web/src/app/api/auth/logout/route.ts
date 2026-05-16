import { getSession } from "@/lib/session";
import { ok, handleError } from "@/lib/api";

export async function POST() {
  try {
    const sess = await getSession();
    sess.destroy();
    return ok({ loggedOut: true });
  } catch (e) {
    return handleError(e);
  }
}
