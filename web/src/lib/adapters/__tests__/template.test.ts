import { describe, it, expect } from "vitest";
import { renderTemplate } from "../template";

describe("renderTemplate", () => {
  it("替换基础占位符", () => {
    const r = renderTemplate(
      { prompt: "{{prompt}}", model: "dall-e-3" },
      { prompt: "a cat" },
    );
    expect(r).toEqual({ prompt: "a cat", model: "dall-e-3" });
  });

  it("整体占位符保留数字类型", () => {
    const r = renderTemplate({ n: "{{n}}" }, { n: 3 });
    expect(r).toEqual({ n: 3 });
  });

  it("默认值（数字）", () => {
    const r = renderTemplate({ n: "{{n|1}}" }, {});
    expect(r).toEqual({ n: 1 });
  });

  it("默认值（字符串）", () => {
    const r = renderTemplate({ size: "{{size|1024x1024}}" }, {});
    expect(r).toEqual({ size: "1024x1024" });
  });

  it("内联占位符", () => {
    const r = renderTemplate(
      { url: "https://api.x.com/v1/{{taskId}}/fetch" },
      { taskId: "abc" },
    );
    expect(r).toEqual({ url: "https://api.x.com/v1/abc/fetch" });
  });

  it("空字符串字段被剔除（避免污染请求体）", () => {
    const r = renderTemplate(
      { prompt: "{{prompt}}", size: "{{size}}" },
      { prompt: "x", size: "" },
    );
    expect(r).toEqual({ prompt: "x" });
  });

  it("数组中的占位符也会渲染", () => {
    const r = renderTemplate(
      { tags: ["{{a}}", "{{b}}", "literal"] },
      { a: "x", b: "y" },
    );
    expect(r).toEqual({ tags: ["x", "y", "literal"] });
  });

  it("嵌套对象", () => {
    const r = renderTemplate(
      { request: { params: { prompt: "{{prompt}}" } } },
      { prompt: "p" },
    );
    expect(r).toEqual({ request: { params: { prompt: "p" } } });
  });
});
