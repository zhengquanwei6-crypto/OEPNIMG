import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container mx-auto flex flex-1 flex-col items-center justify-center py-16">
        <section className="max-w-2xl space-y-6 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            OEPNIMG
          </h1>
          <p className="text-lg text-muted-foreground">
            一处接入，多源切换 —— 聚合任意 API 中转站的图片生成能力，内嵌 LLM
            助手帮你按文档自动接入新的中转站。
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/generate"
              className="inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              开始生成
            </Link>
            <Link
              href="/admin"
              className="inline-flex h-11 items-center rounded-md border bg-background px-6 text-sm font-medium hover:bg-accent"
            >
              进入后台
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
