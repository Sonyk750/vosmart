import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import {
  COOKIE_SERVICE, ORE_SESIUNE, creeazaBilet, esteContService, verificaCodService,
} from "@/lib/service-acces";

export const runtime = "nodejs";

// POST — primeste codul si, daca e bun, lasa un bilet semnat in cookie.
export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!esteContService(user?.email)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rl = rateLimit(`service-verifica:${clientIp(req)}`, 10, 15 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Prea multe încercări. Așteaptă câteva minute." }, { status: 429 });
  }

  const { cod } = await req.json().catch(() => ({ cod: "" }));
  if (!verificaCodService(String(cod ?? ""))) {
    return NextResponse.json({ error: "Cod greșit sau expirat. Cere unul nou." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_SERVICE, creeazaBilet(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ORE_SESIUNE * 3600,
  });
  return res;
}
