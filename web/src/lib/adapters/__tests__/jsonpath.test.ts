import { describe, it, expect } from "vitest";
import { extractByPath } from "../jsonpath";

describe("extractByPath", () => {
  it("简单 key", () => {
    expect(extractByPath({ result: "abc" }, "result")).toBe("abc");
  });

  it("嵌套路径", () => {
    expect(extractByPath({ a: { b: { c: 1 } } }, "a.b.c")).toBe("1");
  });

  it("数组下标", () => {
    expect(extractByPath({ arr: ["a", "b", "c"] }, "arr[1]")).toBe("b");
  });

  it("通配符返回数组", () => {
    const r = extractByPath(
      { data: [{ url: "u1" }, { url: "u2" }] },
      "data[*].url",
    );
    expect(r).toEqual(["u1", "u2"]);
  });

  it("不存在返回 undefined", () => {
    expect(extractByPath({}, "x.y.z")).toBeUndefined();
  });

  it("OpenAI 兼容响应", () => {
    const resp = {
      data: [{ url: "https://img.x/1.png" }, { url: "https://img.x/2.png" }],
    };
    expect(extractByPath(resp, "data[*].url")).toEqual([
      "https://img.x/1.png",
      "https://img.x/2.png",
    ]);
  });

  it("Midjourney 风格响应", () => {
    const resp = { status: "SUCCESS", imageUrl: "https://mj.x/grid.png" };
    expect(extractByPath(resp, "imageUrl")).toBe("https://mj.x/grid.png");
    expect(extractByPath(resp, "status")).toBe("SUCCESS");
  });
});
