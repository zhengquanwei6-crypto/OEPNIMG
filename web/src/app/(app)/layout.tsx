import { getSession } from "@/lib/session";
import { AppShell } from "@/components/layout";

export const dynamic = "force-dynamic";

/**
 * (app) route group layout:
 * All authenticated pages use the AppShell (Sidebar + Topbar).
 * Unauthenticated users see a minimal shell with login prompt in topbar.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sess = await getSession();

  return (
    <AppShell username={sess.username ?? null} role={sess.role ?? null}>
      {children}
    </AppShell>
  );
}
