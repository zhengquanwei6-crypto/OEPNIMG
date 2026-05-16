import { z } from "zod";
import { ok, handleError } from "@/lib/api";
import { getSession } from "@/lib/session";
import { runGeneration } from "@/lib/services/generation";

const Body = z.object({
  providerId: z.string().min(1),
  modelId: z.string().min(1),
  prompt: z.string().min(1).max(5000),
  negativePrompt: z.string().max(2000).optional(),
  size: z
    .string()
    .regex(/^\d+x\d+$/)
    .optional(),
  count: z.number().int().min(1).max(8).optional(),
  seed: z.number().int().optional(),
  imageUrl: z.string().url().optional(),
  maskUrl: z.string().url().optional(),
  extra: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: Request) {
  try {
    const body = Body.parse(await req.json());
    const sess = await getSession();
    const result = await runGeneration(body, { userId: sess.userId });
    return ok(result);
  } catch (e) {
    return handleError(e);
  }
}
