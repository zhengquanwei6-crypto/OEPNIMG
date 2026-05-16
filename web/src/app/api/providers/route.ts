import { z } from "zod";
import { ok, handleError } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { listProviders, createProvider } from "@/lib/services/providers";

export async function GET() {
  try {
    const data = await listProviders();
    return ok(data);
  } catch (e) {
    return handleError(e);
  }
}

const CreateBody = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9][a-z0-9-]*$/i),
  name: z.string().min(1),
  description: z.string().optional(),
  baseUrl: z.string().url().optional().or(z.literal("")),
  apiKey: z.string().min(1),
  templateId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = CreateBody.parse(await req.json());
    const p = await createProvider({
      slug: body.slug,
      name: body.name,
      description: body.description,
      baseUrl: body.baseUrl || "",
      apiKey: body.apiKey,
      templateId: body.templateId,
    });
    return ok({ id: p.id, slug: p.slug });
  } catch (e) {
    return handleError(e);
  }
}
