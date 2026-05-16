import Link from "next/link";
import { getSession } from "@/lib/session";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";

export async function SiteHeader() {
  const sess = await getSession();
  return (
    <header className="border-b">
      <div className="container mx-auto flex h-14 items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight">
          OEPNIMG
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link
            href="/generate"
            className="text-muted-foreground hover:text-foreground"
          >
            生成
          </Link>
          <Link
            href="/admin"
            className="text-muted-foreground hover:text-foreground"
          >
            后台
          </Link>
          <ThemeToggle />
          {sess.userId ? (
            <>
              <span className="text-xs text-muted-foreground">
                {sess.username}
              </span>
              <LogoutButton />
            </>
          ) : (
            <Link
              href="/login"
              className="text-muted-foreground hover:text-foreground"
            >
              登录
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
