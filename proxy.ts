import { NextRequest, NextResponse } from "next/server";
import { RUTA_LOGIN } from "@/lib/rute";

const PROTECTED_PREFIXES = ["/panou", "/admin", "/corporate/dashboard"];
// Rutele vechi de login au ramas ca redirectari catre /login; portarul nu are
// ce cauta pe ele, altfel ar trimite omul in cerc.
const PUBLIC_AUTH_PATHS = [RUTA_LOGIN, "/admin/login", "/corporate/login"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_AUTH_PATHS.includes(pathname)) return NextResponse.next();

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (!isProtected) return NextResponse.next();

  const sessionToken = req.cookies.get("vosmart_session")?.value;
  if (!sessionToken) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = RUTA_LOGIN;
    loginUrl.search = "";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/panou/:path*", "/admin/:path*", "/corporate/dashboard/:path*"],
};
