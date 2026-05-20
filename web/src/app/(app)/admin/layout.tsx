import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Admin layout - auth guard only.
 * Navigation is handled by the AppShell Sidebar (no separate aside needed).
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sess = await getSession();
  if (!sess.userId) redirect("/login?next=/admin");
  if (sess.role !== "admin") redirect("/");

  return <>{children}</>;
}
