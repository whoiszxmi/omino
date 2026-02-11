import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE = "omino-auth";

function isPublicAsset(pathname: string) {
  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/assets/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js" ||
    /^\/workbox-.*\.js$/.test(pathname)
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicAsset(pathname)) {
    return NextResponse.next();
  }

  if (pathname === "/auth/callback" || pathname === "/app/login") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/app")) {
    const isAuthed = request.cookies.get(AUTH_COOKIE)?.value === "1";
    if (!isAuthed) {
      const loginUrl = new URL("/app/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api).*)"],
};
