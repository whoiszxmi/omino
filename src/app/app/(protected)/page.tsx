import { redirect } from "next/navigation";

// Redireciona /app → /app/feed (server-side, sem flash)
export default function AppHome() {
  redirect("/app/feed");
}
