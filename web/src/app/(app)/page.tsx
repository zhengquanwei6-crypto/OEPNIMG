import { redirect } from "next/navigation";

/**
 * Root /  inside (app) group → redirect to /chat
 */
export default function AppHome() {
  redirect("/chat");
}
