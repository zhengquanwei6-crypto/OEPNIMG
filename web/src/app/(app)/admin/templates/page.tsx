import { listTemplates } from "@/lib/services/providers";
import { TemplatesClient } from "./templates-client";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const list = await listTemplates();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">适配器模板</h1>
      <p className="text-sm text-muted-foreground">
        每条记录代表一份「调用规则」，由 LLM 助手生成或手工编辑。同一中转站可保留多个版本。
        草稿模板需通过干跑或人工确认后发布，方可被「API 源」选用。
      </p>
      <TemplatesClient templates={list as never} />
    </div>
  );
}
