import { describe, it, expect } from "vitest";
import { parseAdapter } from "../schema";

describe("parseAdapter", () => {
  it("最小可用模板通过", () => {
    const r = parseAdapter({
      id: "test-v1",
      name: "Test",
      baseUrl: "https://api.example.com/v1",
      auth: { type: "bearer" },
      capabilities: ["text-to-image"],
      models: [
        {
          id: "m1",
          displayName: "Model 1",
          capability: "text-to-image",
          endpoint: { method: "POST", path: "/images" },
          request: { bodyTemplate: { prompt: "{{prompt}}" } },
          response: { type: "sync", imageUrlPath: "data[0].url" },
        },
      ],
    });
    expect(r.ok).toBe(true);
  });

  it("异步轮询模板通过", () => {
    const r = parseAdapter({
      id: "mj-v1",
      name: "MJ",
      baseUrl: "https://api.example.com",
      auth: { type: "bearer" },
      capabilities: ["text-to-image"],
      models: [
        {
          id: "mj",
          displayName: "Midjourney",
          capability: "text-to-image",
          endpoint: { method: "POST", path: "/mj/submit/imagine" },
          request: { bodyTemplate: { prompt: "{{prompt}}" } },
          response: {
            type: "async-polling",
            taskIdPath: "result",
            polling: {
              endpoint: { method: "GET", path: "/mj/task/{{taskId}}/fetch" },
              statusPath: "status",
              doneStatuses: ["SUCCESS"],
              failStatuses: ["FAILURE"],
              imageUrlPath: "imageUrl",
            },
          },
        },
      ],
    });
    expect(r.ok).toBe(true);
  });

  it("非法 id 拒绝", () => {
    const r = parseAdapter({
      id: "INVALID ID WITH SPACE",
      name: "X",
      baseUrl: "https://x",
      auth: { type: "none" },
      capabilities: ["text-to-image"],
      models: [],
    });
    expect(r.ok).toBe(false);
  });

  it("缺少 models 拒绝", () => {
    const r = parseAdapter({
      id: "test",
      name: "Test",
      baseUrl: "https://api.example.com",
      auth: { type: "none" },
      capabilities: ["text-to-image"],
      models: [],
    });
    expect(r.ok).toBe(false);
  });

  it("非法 baseUrl 拒绝", () => {
    const r = parseAdapter({
      id: "test",
      name: "Test",
      baseUrl: "not-a-url",
      auth: { type: "none" },
      capabilities: ["text-to-image"],
      models: [
        {
          id: "m",
          displayName: "M",
          capability: "text-to-image",
          endpoint: { method: "POST", path: "/x" },
          request: { bodyTemplate: {} },
          response: { type: "sync", imageUrlPath: "url" },
        },
      ],
    });
    expect(r.ok).toBe(false);
  });
});
