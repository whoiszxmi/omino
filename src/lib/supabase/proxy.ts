import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request });

  const hasSbCookie = request.cookies
    .getAll()
    .some((cookie) => cookie.name.includes("sb-") && cookie.name.includes("auth-token"));

  console.log("[proxy] auth check", {
    pathname: request.nextUrl.pathname,
    hasSbCookie,
  });

  return response;
}
