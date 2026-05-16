import { z } from "zod";
import { ok, handleError } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { updateProvider, deleteProvider } from "@/lib/services/providers";

const PatchBody = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  baseUrl: z.string().url().optional(),
  apiKey: z.string().optional(),
  enabled: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    await requireAdmin();
    const body = PatchBody.parse(await req.json());
    const p = await updateProvider({ id: params.id, ...body });
    return ok({ id: p.id });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    await requireAdmin();
    await deleteProvider(params.id);
    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
