import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIXES = ["/admin", "/corporate/dashboard"];
const PUBLIC_AUTH_PATHS = ["/admin/login", "/corporate/login"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_AUTH_PATHS.includes(pathname)) return NextResponse.next();

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (!isProtected) return NextResponse.next();

  const sessionToken = req.cookies.get("vosmart_session")?.value;
  if (!sessionToken) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = pathname.startsWith("/admin")
      ? "/admin/login"
      : "/corporate/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/corporate/dashboard/:path*"],
};
