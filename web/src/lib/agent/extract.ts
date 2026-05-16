/**
 * 文本抽取：
 *   - HTML  → 去掉 <script>/<style>/<nav> 等噪声，保留主体可读文本
 *   - Markdown / YAML / JSON / Plain → 原样返回（已去 BOM）
 *
 * 不引第三方库（如 cheerio）以保持无依赖；正则足够覆盖 90% 文档。
 */

export function extractCleanText(rawContent: string, contentType: string): string {
  const ct = contentType.toLowerCase();
  const stripped = rawContent.replace(/^\uFEFF/, "");
  if (
    ct.includes("json") ||
    ct.includes("yaml") ||
    ct.includes("markdown") ||
    ct.includes("plain")
  ) {
    return stripped;
  }
  return cleanHtml(stripped);
}

function cleanHtml(html: string): string {
  let s = html;
  // 去掉常见噪声块
  s = s.replace(/<script[\s\S]*?<\/script>/gi, " ");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, " ");
  s = s.replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  s = s.replace(/<svg[\s\S]*?<\/svg>/gi, " ");
  s = s.replace(/<nav[\s\S]*?<\/nav>/gi, " ");
  s = s.replace(/<footer[\s\S]*?<\/footer>/gi, " ");
  s = s.replace(/<header[\s\S]*?<\/header>/gi, " ");
  s = s.replace(/<aside[\s\S]*?<\/aside>/gi, " ");
  s = s.replace(/<!--[\s\S]*?-->/g, " ");
  // 保留 code/pre 内容（API 文档关键），仅去标签
  s = s.replace(/<\/?(?:pre|code)[^>]*>/gi, "\n");
  // 段落 / 换行
  s = s.replace(/<\/(?:p|div|li|tr|h[1-6])>/gi, "\n");
  s = s.replace(/<br\s*\/?>(?:\s*)/gi, "\n");
  // 余下标签全部去除
  s = s.replace(/<[^>]+>/g, " ");
  // HTML 实体（最常见的几个）
  s = s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
  // 折叠空白
  s = s.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

/** 截断到 LLM 上下文友好的尺寸（约 ~24k 字符 ≈ 6k tokens 中文） */
export function truncateForLlm(text: string, maxChars = 24_000): string {
  if (text.length <= maxChars) return text;
  // 优先保留前 70% + 后 20%
  const headLen = Math.floor(maxChars * 0.7);
  const tailLen = Math.floor(maxChars * 0.2);
  return (
    text.slice(0, headLen) +
    `\n\n... [省略 ${text.length - headLen - tailLen} 字符] ...\n\n` +
    text.slice(-tailLen)
  );
}
