// ─── Caietul de service: harta aplicatiei, generata din cod ─────────────────
//
// De ce exista: cand ceva se strica — de obicei seara, de obicei repede —
// intrebarea nu e "cum functioneaza", ci "unde e". Un caiet scris de mana ar
// raspunde la asta trei saptamani, apoi ar incepe sa minta. Unul care se
// regenereaza din cod nu minte niciodata.
//
// Cum lucreaza: citeste fiecare route.ts, page.tsx si fisier din lib/ si
// features/, si scoate doar ce se poate DEDUCE SIGUR — metode HTTP exportate,
// paza de acces, tabele atinse, cine pe cine importa. Nu incearca sa ghiceasca
// ce "face" un fisier; ghicitul ar produce propozitii frumoase si false.
//
// Ce NU poate sti: de ce exista un lucru, ce capcane are, ce nu trebuie atins.
// Alea raman scrise de mana, in CLAUDE.md.
//
// Unde iese: lib/caiet-service.json — singura iesire, citita de pagina
// /panou/service. Nu genereaza fisiere de citit pe langa: un al doilea
// exemplar al aceleiasi harti apuca intotdeauna sa spuna altceva decat primul.
//
// Rulare:  node scripts/caiet-service.mjs
import fs from "fs"
import path from "path"

const RADACINA = process.cwd()
// Aplicatia nu sta intr-un src/: codul e imprastiat in patru radacini, si toate
// patru intra in harta — altfel jumatate din aplicatie ar lipsi din ea.
const RADACINI = ["app", "lib"]

function* fisiere(dir) {
  if (!fs.existsSync(dir)) return
  for (const it of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, it.name)
    if (it.isDirectory()) {
      if (["node_modules", ".next", ".git"].includes(it.name)) continue
      yield* fisiere(p)
    } else if (/\.(ts|tsx)$/.test(it.name)) {
      yield p
    }
  }
}

const rel = (p) => path.relative(RADACINA, p).replace(/\\/g, "/")

// Formele de paza folosite in aplicatie, in ordinea in care conteaza la citit.
// Cand adaugi una noua in cod, adaug-o si aici — altfel caietul striga degeaba
// ca o ruta e nepazita, iar un avertisment in care nu ai incredere nu mai e
// citit de nimeni.
const GARZI = [
  { tipar: /\brequireSuperAdmin\s*\(/,  nume: "doar proprietarul firmei" },
  { tipar: /\brequireAdmin\s*\(/,       nume: "proprietar sau cenzor" },
  { tipar: /\bgetSession\s*\(/,         nume: "sesiune" },
  { tipar: /\besteContService\b/,               nume: "contul de service" },
  { tipar: /\bfiltruContracte\b/,               nume: "doar contractele lui" },
  { tipar: /\brateLimit\b/,                     nume: "limitare pe IP" },
  { tipar: /stripe-signature/,                    nume: "semnatura webhook" },
]

/**
 * Paza pusa nu in ruta, ci in ajutorul pe care ruta il cheama.
 *
 * Sapte rute de contabilitate pareau nepazite: nu au niciun auth() in ele,
 * dar toata munca o face un fisier din features/, iar ACOLO se cere sesiunea
 * si compania deschisa. Numarate ca "fara paza", ar fi facut caietul sa strige
 * degeaba — iar un avertisment in care nu ai incredere nu mai e citit deloc.
 * Deci ne uitam si un nivel mai jos, in ce importa ruta.
 */
function garziPrinAjutoare(text) {
  const gasite = []
  for (const m of text.matchAll(/from\s+["']@\/((?:features|lib)\/[^"']+)["']/g)) {
    for (const ext of [".ts", ".tsx", "/index.ts"]) {
      const p = path.join(RADACINA, m[1] + ext)
      if (!fs.existsSync(p)) continue
      const t = fs.readFileSync(p, "utf8")
      if (/\brequireAdmin\s*\(|\bgetSession\s*\(|\bfiltruContracte\b/.test(t)) {
        gasite.push("prin " + m[1].split("/").pop())
      }
      break
    }
  }
  return [...new Set(gasite)]
}

function analizeazaRuta(cale) {
  const t = fs.readFileSync(cale, "utf8")
  const metode = [...t.matchAll(/^export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)/gm)].map(m => m[1])
  let garzi = GARZI.filter(g => g.tipar.test(t)).map(g => g.nume)
  if (garzi.length === 0) garzi = garziPrinAjutoare(t)
  const tabele = [...new Set([...t.matchAll(/\b(?:db|prisma|tx)\.([a-z][a-zA-Z0-9]*)\.(?:find|create|update|delete|upsert|count|aggregate|groupBy)/g)].map(m => m[1]))].sort()
  const libImp = [...new Set([...t.matchAll(/from\s+["']@\/lib\/([^"']+)["']/g)].map(m => m[1]))].sort()
  const runtime = (t.match(/export\s+const\s+runtime\s*=\s*["']([a-z]+)["']/) || [])[1] || null

  // URL-ul public: app/api/facturi/[id]/route.ts -> /api/facturi/[id]
  const url = "/" + rel(cale)
    .replace(/^app\//, "")
    .replace(/\/route\.ts$/, "")
    .replace(/\/\((?:[^)]+)\)/g, "") // grupurile Next, (dashboard) etc., nu apar in URL

  return { cale: rel(cale), url, metode, garzi, tabele, libImp, roluriAi: [], runtime, linii: t.split("\n").length }
}

function analizeazaLib(cale) {
  const t = fs.readFileSync(cale, "utf8")
  const exp = [...new Set([
    ...[...t.matchAll(/^export\s+(?:async\s+)?function\s+([a-zA-Z0-9_]+)/gm)].map(m => m[1]),
    ...[...t.matchAll(/^export\s+(?:const|let)\s+([a-zA-Z0-9_]+)/gm)].map(m => m[1]),
    ...[...t.matchAll(/^export\s+(?:type|interface|enum)\s+([a-zA-Z0-9_]+)/gm)].map(m => m[1] + " (tip)"),
  ])]
  return {
    cale: rel(cale),
    nume: rel(cale).replace(/^lib\//, "").replace(/\.tsx?$/, ""),
    exporturi: exp,
    linii: t.split("\n").length,
  }
}

function analizeazaPagina(cale) {
  const url = "/" + rel(cale)
    .replace(/^app\//, "")
    .replace(/\/page\.tsx$/, "")
    .replace(/\/\((?:[^)]+)\)/g, "")
  return { cale: rel(cale), url: url === "/" ? "/" : url, linii: fs.readFileSync(cale, "utf8").split("\n").length }
}

const toate = RADACINI.flatMap(r => [...fisiere(path.join(RADACINA, r))])
const rute   = toate.filter(p => /[\\/]api[\\/].*route\.ts$/.test(p)).map(analizeazaRuta).sort((a, b) => a.url.localeCompare(b.url))
const libs   = toate.filter(p => /^lib[\\/]/.test(path.relative(RADACINA, p))).map(analizeazaLib).sort((a, b) => a.nume.localeCompare(b.nume))
const pagini = toate.filter(p => /page\.tsx$/.test(p)).map(analizeazaPagina).sort((a, b) => a.url.localeCompare(b.url))

// Cine pe cine importa (index invers pentru lib/)
const folositDe = new Map(libs.map(l => [l.nume, []]))
for (const p of toate) {
  const t = fs.readFileSync(p, "utf8")
  for (const m of t.matchAll(/from\s+["']@\/lib\/([^"']+)["']/g)) {
    const cheie = m[1]
    if (folositDe.has(cheie) && rel(p) !== `lib/${cheie}.ts` && rel(p) !== `lib/${cheie}.tsx`) {
      folositDe.get(cheie).push(rel(p))
    }
  }
}

const zi = new Date().toISOString().slice(0, 10)
const IESIRE_JSON = path.join(RADACINA, "lib", "caiet-service.json")

const date = {
  generat: zi,
  fisiere: toate.length,
  rute,
  pagini,
  libs: libs.map(l => ({ ...l, folositDe: folositDe.get(l.nume) || [] }))
            .sort((a, b) => b.folositDe.length - a.folositDe.length),
}

fs.writeFileSync(IESIRE_JSON, JSON.stringify(date, null, 1), "utf8")
console.log(`✓ scris ${rel(IESIRE_JSON)}`)
console.log(`  ${rute.length} rute · ${pagini.length} pagini · ${libs.length} fisiere lib`)

const faraGarda = rute.filter(r => r.garzi.length === 0)
const orfane = libs.filter(l => (folositDe.get(l.nume) || []).length === 0)
if (faraGarda.length) {
  console.log(`\n⚠ ${faraGarda.length} rute fara nicio paza de acces detectata:`)
  faraGarda.forEach(r => console.log(`    ${r.url}`))
}
if (orfane.length) console.log(`\n⚠ ${orfane.length} fisiere din lib pe care nu le importa nimeni: ${orfane.map(o => o.nume).join(", ")}`)
