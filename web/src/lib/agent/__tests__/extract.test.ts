import { describe, it, expect } from "vitest";
import { extractCleanText, truncateForLlm } from "../extract";

describe("extractCleanText", () => {
  it("HTML：去 script/style/nav，保留正文", () => {
    const html = `
      <html><head><style>body{color:red}</style></head>
      <body>
        <nav>nav menu</nav>
        <h1>API Docs</h1>
        <p>POST /v1/images/generations</p>
        <script>alert(1)</script>
        <pre>curl -X POST ...</pre>
      </body></html>
    `;
    const out = extractCleanText(html, "text/html");
    expect(out).toContain("API Docs");
    expect(out).toContain("POST /v1/images/generations");
    expect(out).toContain("curl -X POST");
    expect(out).not.toContain("alert(1)");
    expect(out).not.toContain("color:red");
    expect(out).not.toContain("nav menu");
  });

  it("HTML 实体解码", () => {
    const html = "<p>foo &amp; bar &lt;tag&gt; &quot;x&quot;</p>";
    const out = extractCleanText(html, "text/html");
    expect(out).toContain("foo & bar <tag> \"x\"");
  });

  it("Markdown 原样返回", () => {
    const md = "# API\n\n```\nPOST /images\n```";
    expect(extractCleanText(md, "text/markdown")).toBe(md);
  });

  it("JSON/YAML 原样返回", () => {
    const j = '{"openapi":"3.0.0"}';
    expect(extractCleanText(j, "application/json")).toBe(j);
  });

  it("BOM 被剥离", () => {
    expect(extractCleanText("\uFEFFhello", "text/markdown")).toBe("hello");
  });
});

describe("truncateForLlm", () => {
  it("短文本不变", () => {
    expect(truncateForLlm("short", 100)).toBe("short");
  });

  it("超长文本保留首尾", () => {
    const long = "A".repeat(10_000) + "B".repeat(10_000);
    const out = truncateForLlm(long, 1000);
    expect(out.length).toBeLessThan(long.length);
    expect(out.startsWith("A")).toBe(true);
    expect(out.endsWith("B")).toBe(true);
    expect(out).toContain("[省略");
  });
});
