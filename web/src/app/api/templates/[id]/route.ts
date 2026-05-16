import { z } from "zod";
import { ok, fail, handleError } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { getTemplate, saveTemplate } from "@/lib/services/providers";
import { ProviderAdapterSchema } from "@/lib/adapters/schema";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const t = await getTemplate(params.id);
    if (!t) return fail(404, "模板不存在");
    return ok(t);
  } catch (e) {
    return handleError(e);
  }
}

const PatchBody = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  version: z.string().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  config: ProviderAdapterSchema.optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    await requireAdmin();
    const body = PatchBody.parse(await req.json());
    const t = await getTemplate(params.id);
    if (!t) return fail(404, "模板不存在");

    const updated = await saveTemplate({
      id: t.id,
      templateKey: t.templateKey,
      version: body.version ?? t.version,
      name: body.name ?? t.name,
      description: body.description ?? t.description ?? undefined,
      config: body.config ?? t.config,
      status: body.status ?? (t.status as "draft" | "published" | "archived"),
    });
    return ok({ id: updated.id });
  } catch (e) {
    return handleError(e);
  }
}
