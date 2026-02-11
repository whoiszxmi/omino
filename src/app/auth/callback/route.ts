import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolveAppUrl } from "@/lib/site-url";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  const loginUrl = resolveAppUrl("/app/login", requestUrl.origin);
  const feedUrl = resolveAppUrl("/app/feed", requestUrl.origin);

  if (!code || !supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(loginUrl);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const loginErrorUrl = new URL(loginUrl);
    loginErrorUrl.searchParams.set("error", "callback_failed");
    return NextResponse.redirect(loginErrorUrl.toString());
  }

  return NextResponse.redirect(feedUrl);
}
