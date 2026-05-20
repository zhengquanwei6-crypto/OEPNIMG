import { redirect } from "next/navigation";

/**
 * Root / → redirect to /chat (handled inside (app) route group)
 */
export default function RootPage() {
  redirect("/chat");
}
