import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sess = await getSession();
  if (!sess.userId) redirect("/login?next=/admin");
  if (sess.role !== "admin") redirect("/");

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="container mx-auto flex flex-1 gap-6 py-6">
        <aside className="w-48 shrink-0 space-y-1 text-sm">
          <NavItem href="/admin" label="概览" />
          <NavItem href="/admin/providers" label="API 源" />
          <NavItem href="/admin/templates" label="适配器模板" />
          <NavItem href="/admin/agent" label="LLM 助手" />
          <NavItem href="/admin/history" label="生成历史" />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

function NavItem({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block rounded-md px-3 py-2 hover:bg-accent hover:text-accent-foreground"
    >
      {label}
    </Link>
  );
}
