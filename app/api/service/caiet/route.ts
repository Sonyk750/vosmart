import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { COOKIE_SERVICE, biletValid, esteContService } from "@/lib/service-acces";
import caiet from "@/lib/caiet-service.json";

export const runtime = "nodejs";

// GET — datele caietului. Amandoua incuietorile se verifica AICI, nu doar in
// pagina: altfel harta completa a aplicatiei ar fi la un singur fetch distanta
// de oricine e logat.
export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!esteContService(user?.email)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!biletValid(req.cookies.get(COOKIE_SERVICE)?.value)) {
    return NextResponse.json({ error: "Cod neconfirmat." }, { status: 401 });
  }
  return NextResponse.json(caiet);
}
