import { Suspense } from "react";
import { GenerateClient } from "./generate-client";

export default function GeneratePage() {
  return (
    <div className="p-6">
      <Suspense fallback={<div className="text-sm text-muted-foreground">加载中...</div>}>
        <GenerateClient />
      </Suspense>
    </div>
  );
}
