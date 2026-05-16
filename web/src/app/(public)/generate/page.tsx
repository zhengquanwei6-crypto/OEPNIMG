import { GenerateClient } from "./generate-client";
import { listProviders } from "@/lib/services/providers";

export const dynamic = "force-dynamic";

export default async function GeneratePage() {
  const providers = await listProviders().catch(() => []);
  return (
    <main className="container mx-auto py-8">
      <h1 className="text-2xl font-bold tracking-tight">图片生成</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        选择 API 源与模型，输入提示词即可生成。后台可管理多个中转站。
      </p>
      <div className="mt-6">
        <GenerateClient providers={providers} />
      </div>
    </main>
  );
}
