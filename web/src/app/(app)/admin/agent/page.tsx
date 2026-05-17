import { AgentClient } from "./agent-client";

export default function AgentPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">LLM 文档助手</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          粘贴中转站 API 文档链接（或直接粘贴文档正文）。助手会抓取、解析并生成 OEPNIMG
          适配器配置；校验通过后会保存为<b>草稿模板</b>，再到「API 源」填入 API Key
          即可创建可用的 Provider。
        </p>
      </div>
      <AgentClient />
    </div>
  );
}
