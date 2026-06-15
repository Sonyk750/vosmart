import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
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
    const general = data?.found?.[0]?.date_generale;
    if (!general) return NextResponse.json({ found: false });

    return NextResponse.json({
      found: true,
      denumire: general.denumire ?? "",
      adresa: general.adresa ?? "",
      telefon: general.telefon ?? "",
    });
  } catch (e) {
    console.error("Eroare cautare CUI in ANAF:", e);
    return NextResponse.json({ found: false });
  }
}
