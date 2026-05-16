import { ok, handleError } from "@/lib/api";
import { listTemplates } from "@/lib/services/providers";

export async function GET() {
  try {
    return ok(await listTemplates());
  } catch (e) {
    return handleError(e);
  }
}
