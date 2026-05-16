/**
 * POST /api/generate/stream
 *
 * Server-Sent Events 流式生成。每个事件 data 是 JSON：
 *   { type: "queued" | "running" | "progress" | "succeeded" | "failed" | "canceled", ... }
 */
import { z } from "zod";
import { fail } from "@/lib/api";
import { getSession } from "@/lib/session";
import { runGenerationStream } from "@/lib/services/generation";
import { assertLimit, clientKey } from "@/lib/rate-limit";
import { ZodError } from "zod";
import { HttpError } from "@/lib/session";

export const dynamic = "force-dynamic";

const Body = z.object({
  providerId: z.string().min(1),
  modelId: z.string().min(1),
  prompt: z.string().min(1).max(5000),
  negativePrompt: z.string().max(2000).optional(),
  size: z.string().regex(/^\d+x\d+$/).optional(),
  count: z.number().int().min(1).max(8).optional(),
  seed: z.number().int().optional(),
  imageUrl: z.string().url().optional(),
  maskUrl: z.string().url().optional(),
  extra: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: Request) {
  try {
    const sess = await getSession();
    assertLimit({
      scope: "generate-stream",
      key: clientKey(req, sess.userId),
      max: 20,
      windowMs: 60_000,
    });
    const body = Body.parse(await req.json());

    const encoder = new TextEncoder();
    const upstreamSignal = req.signal;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        };
        try {
          for await (const e of runGenerationStream(body, {
            userId: sess.userId,
            signal: upstreamSignal,
          })) {
            send(e.type, e);
            if (
              e.type === "succeeded" ||
              e.type === "failed" ||
              e.type === "canceled"
            ) {
              break;
            }
          }
        } catch (err) {
          send("failed", { error: (err as Error).message ?? "生成失败" });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e) {
    if (e instanceof HttpError) return fail(e.status, e.message);
    if (e instanceof ZodError)
      return fail(
        400,
        "参数校验失败",
        e.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`),
      );
    return fail(500, (e as Error).message);
  }
}
