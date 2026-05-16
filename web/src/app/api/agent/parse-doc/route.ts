/**
 * POST /api/agent/parse-doc
 * 输入：sourceUrl 或 rawText（二选一）+ 可选 hint
 * 输出：解析得到的 ProviderAdapter；同时保存到 ApiDoc & 创建 AdapterTemplate(draft)
 */
import { z } from "zod";
import { ok, fail, handleError } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { generateAdapterFromDoc } from "@/lib/agent";
import { prisma } from "@/lib/db";
import { extractCleanText } from "@/lib/agent/extract";

const Body = z
  .object({
    sourceUrl: z.string().url().optional(),
    rawText: z.string().optional(),
    hint: z.string().optional(),
    /** 是否落库为 AdapterTemplate(draft) */
    saveAsDraft: z.boolean().default(true),
  })
  .refine((b) => !!(b.sourceUrl || b.rawText), {
    message: "需要 sourceUrl 或 rawText 之一",
  });

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = Body.parse(await req.json());
    const result = await generateAdapterFromDoc(body);

    if (!result.ok) {
      return fail(422, result.error, {
        stage: result.stage,
        llmRaw: "llmRaw" in result ? result.llmRaw : undefined,
      });
    }

    let savedDocId: string | undefined;
    if (result.sourceDoc) {
      const doc = await prisma.apiDoc.create({
        data: {
          sourceUrl: result.sourceDoc.url,
          rawContent: result.sourceDoc.rawContent.slice(0, 1_000_000),
          contentType: result.sourceDoc.contentType,
          cleanedText: extractCleanText(
            result.sourceDoc.rawContent,
            result.sourceDoc.contentType,
          ).slice(0, 500_000),
          bytesSize: result.sourceDoc.bytes,
        },
      });
      savedDocId = doc.id;
    }

    let draftId: string | undefined;
    if (body.saveAsDraft) {
      const adapter = result.adapter;
      // 同 templateKey + version 已存在则递增 patch
      let version = adapter.version;
      const exists = await prisma.adapterTemplate.findFirst({
        where: { templateKey: adapter.id, version },
      });
      if (exists) version = `${version}-${Date.now().toString(36)}`;

      const tpl = await prisma.adapterTemplate.create({
        data: {
          templateKey: adapter.id,
          version,
          name: adapter.name,
          description: adapter.notes,
          configJson: JSON.stringify(adapter),
          sourceDocId: savedDocId,
          status: "draft",
        },
      });
      draftId = tpl.id;
    }

    return ok({
      adapter: result.adapter,
      cleanedTextSize: result.cleanedTextSize,
      sourceDocId: savedDocId,
      draftTemplateId: draftId,
    });
  } catch (e) {
    return handleError(e);
  }
}
