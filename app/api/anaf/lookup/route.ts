import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ found: false, error: "Neautorizat" }, { status: 401 });

  const cui = req.nextUrl.searchParams.get("cui")?.replace(/\D/g, "");
  if (!cui || cui.length < 2 || cui.length > 10) {
    return NextResponse.json({ found: false });
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    const res = await fetch("https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ cui: Number(cui), data: today }]),
    });
    if (!res.ok) return NextResponse.json({ found: false });

    const data = await res.json();
    const result = data?.found?.[0];
    const general = result?.date_generale;
    if (!general) return NextResponse.json({ found: false });

    const sediu = result?.adresa_sediu_social;
    const strada = [sediu?.sdenumire_Strada, sediu?.snumar_Strada].filter(Boolean).join(" ");

    return NextResponse.json({
      found: true,
      denumire: general.denumire ?? "",
      adresa: general.adresa ?? "",
      telefon: general.telefon ?? "",
      oras: sediu?.sdenumire_Localitate ?? "",
      strada: [strada, sediu?.sdetalii_Adresa].filter(Boolean).join(", "),
    });
  } catch (e) {
    console.error("Eroare cautare CUI in ANAF:", e);
    return NextResponse.json({ found: false });
  }
}
