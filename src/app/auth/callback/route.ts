import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveAppUrl } from "@/lib/site-url";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  const loginUrl = resolveAppUrl("/app/login", requestUrl.origin);
  const feedUrl = resolveAppUrl("/app/feed", requestUrl.origin);

  if (!code) {
    return NextResponse.redirect(loginUrl);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const loginErrorUrl = new URL(loginUrl);
    loginErrorUrl.searchParams.set("error", "callback_failed");
    return NextResponse.redirect(loginErrorUrl.toString());
  }

  return NextResponse.redirect(feedUrl);
}
