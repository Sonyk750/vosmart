import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { COOKIE_SERVICE, biletValid, esteContService } from "@/lib/service-acces";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Starea aplicatiei, in clipa in care intrebi.
 *
 * Caietul spune cum e facuta aplicatia; asta spune cum SE SIMTE acum. Cand ceva
 * se strica seara, primele intrebari sunt mereu aceleasi: mai raspunde baza? ce
 * versiune ruleaza? a ramas vreun dosar impotmolit intr-o etapa? Raspunsurile
 * stateau in locuri diferite — Vercel, Neon, fluxul lunar.
 *
 * Ce NU intoarce niciodata: valoarea unei chei. Doar "e pusa" sau "lipseste", si
 * pentru Stripe doar daca e pe bani reali sau pe test. O pagina de service care
 * arata secrete devine ea insasi problema pe care trebuia s-o previna.
 */
export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!esteContService(user?.email)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!biletValid(req.cookies.get(COOKIE_SERVICE)?.value)) {
    return NextResponse.json({ error: "Cod neconfirmat." }, { status: 401 });
  }

  const acum = new Date();
  const acum24h = new Date(acum.getTime() - 24 * 3600 * 1000);

  // Latenta bazei: un dus-intors gol. Numarul conteaza mai putin decat ordinul
  // de marime — 20 ms e sanatos, 900 ms inseamna ca baza e in alta parte.
  const t0 = Date.now();
  let bdOk = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    bdOk = false;
  }
  const latentaMs = Date.now() - t0;

  const [
    utilizatori, sesiuniVii, contracteActive, contracteSuspendate,
    dosare, dosare24h, rapoarteDraft, rapoartePublicate,
    comenziInitiate, comenziPlatite, peEtape, esuate, ultimaSesiune,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.session.count({ where: { expiresAt: { gt: acum } } }),
    prisma.contract.count({ where: { status: "activ" } }),
    prisma.contract.count({ where: { status: "suspendat" } }),
    prisma.dosar.count(),
    prisma.dosar.count({ where: { createdAt: { gte: acum24h } } }),
    prisma.report.count({ where: { status: "draft" } }),
    prisma.report.count({ where: { status: "publicat" } }),
    prisma.comanda.count({ where: { status: "initiata" } }),
    prisma.comanda.count({ where: { status: "platita" } }),
    prisma.dosar.groupBy({ by: ["etapa"], _count: { _all: true } }),
    // Un dosar cu etapa esuata nu se repara singur si nu striga nicaieri: pana
    // acum se vedea doar daca intrai pe el. Aici e numarul, in fata.
    prisma.dosar.count({ where: { stareEtapa: "esuata" } }),
    prisma.session.findFirst({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, user: { select: { email: true, role: true } } },
    }),
  ]);

  // Cheile: doar daca sunt puse. Stripe primeste in plus raspunsul la singura
  // intrebare care conteaza cu adevarat — sunt bani reali sau nu.
  const stripe = process.env.STRIPE_SECRET_KEY ?? "";
  const chei = [
    { nume: "DATABASE_URL",      pus: !!process.env.DATABASE_URL },
    { nume: "NEXTAUTH_SECRET",   pus: !!(process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET) },
    { nume: "ANTHROPIC_API_KEY", pus: !!process.env.ANTHROPIC_API_KEY },
    {
      nume: "STRIPE_SECRET_KEY",
      pus: !!stripe,
      nota: stripe.startsWith("sk_live") ? "bani reali" : stripe ? "test" : undefined,
      atentie: stripe.startsWith("sk_live"),
    },
    { nume: "SMTP_HOST / SMTP_PASS", pus: !!(process.env.SMTP_HOST && process.env.SMTP_PASS) },
    { nume: "ROMARG_UPLOAD_URL",  pus: !!process.env.ROMARG_UPLOAD_URL },
  ];

  return NextResponse.json({
    acum: acum.toISOString(),
    bd: { ok: bdOk, latentaMs },
    numere: {
      utilizatori, sesiuniVii, contracteActive, contracteSuspendate,
      dosare, dosare24h, rapoarteDraft, rapoartePublicate,
      comenziInitiate, comenziPlatite, esuate,
    },
    etape: peEtape
      .map((e) => ({ etapa: e.etapa, cate: e._count._all }))
      .sort((a, b) => b.cate - a.cate),
    deploy: {
      mediu:   process.env.VERCEL_ENV ?? "local",
      ramura:  process.env.VERCEL_GIT_COMMIT_REF ?? null,
      commit:  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      mesaj:   process.env.VERCEL_GIT_COMMIT_MESSAGE ?? null,
      regiune: process.env.VERCEL_REGION ?? null,
      node:    process.version,
    },
    ultimaSesiune: ultimaSesiune && {
      cand: ultimaSesiune.createdAt,
      email: ultimaSesiune.user?.email ?? null,
      rol: ultimaSesiune.user?.role ?? null,
    },
    chei,
  });
}
