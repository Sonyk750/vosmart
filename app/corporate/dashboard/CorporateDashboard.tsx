"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import CardPaymentForm from "@/app/components/CardPaymentForm";
import { CORPORATE_PACKAGES, CorporatePackage } from "@/lib/billing";

interface Association {
  id: string; name: string; cui: string | null; address: string | null;
  user: { name: string | null; email: string };
  documents: any[]; reports: any[];
  _count: { documents: number; reports: number };
}
interface Corporate {
  id: string; companyName: string; package: string; maxAssoc: number;
  status: string; logoUrl: string | null; cui: string | null;
  subscriptionStatus: string | null; currentPeriodEnd: string | null;
  associations: Association[];
}
interface User { id: string; name: string | null; email: string; role: string; }

const ALL_PACKAGES: CorporatePackage[] = ["trial", "starter", "business", "professional", "enterprise"];

export default function CorporateDashboard({ user, corporate, isAdmin = false }: { user: User; corporate: Corporate; isAdmin?: boolean }) {
  const router = useRouter();
  const [tab, setTab] = useState<"overview" | "clienti" | "adauga" | "abonament">("overview");

  // Admin: comutare între pachete pentru testare
  const [previewPackage, setPreviewPackage] = useState<CorporatePackage>(
    isAdmin ? (corporate.package as CorporatePackage) : (corporate.package as CorporatePackage)
  );
  const effectivePackageKey: CorporatePackage = isAdmin ? previewPackage : (corporate.package as CorporatePackage);
  const pkg = CORPORATE_PACKAGES[effectivePackageKey] as { name: string; priceRon: number; maxAssoc: number } | undefined;
  const effectiveMaxAssoc: number = isAdmin ? (pkg?.maxAssoc ?? corporate.maxAssoc) : corporate.maxAssoc;

  const [associations, setAssociations] = useState<Association[]>(corporate.associations);
  const [selectedAssoc, setSelectedAssoc] = useState<Association | null>(null);
  const [draftText, setDraftText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [msg, setMsg] = useState("");
  const [logoPreview, setLogoPreview] = useState(corporate.logoUrl || "");
  const logoRef = useRef<HTMLInputElement>(null);

  // Formular de creare client
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPassword, setClientPassword] = useState("");
  const [assocName, setAssocName] = useState("");
  const [assocCui, setAssocCui] = useState("");
  const [assocAddress, setAssocAddress] = useState("");
  const [assocPhone, setAssocPhone] = useState("");
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState("");

  const canAddMore = associations.length < effectiveMaxAssoc;

  // Abonament corporate
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeClientSecret, setSubscribeClientSecret] = useState("");
  const [subMsg, setSubMsg] = useState("");

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/corporate";
  }

  async function startSubscription() {
    setSubscribing(true);
    setSubMsg("");
    try {
      const res = await fetch("/api/billing/subscribe", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSubscribeClientSecret(data.clientSecret);
      } else {
        setSubMsg("✗ " + (data.error || "Eroare la inițierea plății"));
      }
    } catch {
      setSubMsg("✗ Eroare de conexiune");
    } finally {
      setSubscribing(false);
    }
  }

  function handleSubscribeSuccess() {
    setSubscribeClientSecret("");
    setSubMsg("✓ Plata a fost procesată. Abonamentul va fi activat în câteva minute.");
    setTimeout(() => router.refresh(), 3000);
  }

  async function createClient(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateMsg("");
    try {
      const res = await fetch("/api/corporate/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName, clientEmail, clientPassword,
          assocName, assocCui, assocAddress, assocPhone,
          corporateId: corporate.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setCreateMsg("✗ " + (data.error || "Eroare")); return; }
      setCreateMsg("✓ Client creat cu succes!");
      setAssociations(prev => [...prev, data.association]);
      setClientName(""); setClientEmail(""); setClientPassword("");
      setAssocName(""); setAssocCui(""); setAssocAddress(""); setAssocPhone("");
      setTimeout(() => { setTab("clienti"); setCreateMsg(""); }, 1500);
    } catch { setCreateMsg("✗ Eroare de conexiune"); }
    finally { setCreating(false); }
  }

  async function loadDraft(assoc: Association) {
    if (!assoc.documents[0]) return;
    setGenerating(true);
    setDraftText("");
    setMsg("");
    const res = await fetch(`/api/corporate/reports/draft?documentId=${assoc.documents[0].id}`);
    if (res.ok) {
      const data = await res.json();
      if (data.draft) { setDraftText(data.draft); setMsg("✓ Draft încărcat"); }
      else setMsg("Nu există draft generat încă.");
    }
    setGenerating(false);
  }

  async function generateDraft(assoc: Association) {
    if (!assoc.documents[0]) return;
    setGenerating(true);
    setDraftText("");
    setMsg("");
    const res = await fetch("/api/corporate/reports/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: assoc.documents[0].id }),
    });
    const data = await res.json();
    if (res.ok) { setDraftText(data.draft); setMsg("✓ Draft generat"); }
    else setMsg("✗ " + (data.error || "Eroare"));
    setGenerating(false);
  }

  async function publishDraft(assoc: Association) {
    if (!draftText || !assoc.documents[0]) return;
    setPublishing(true);
    const res = await fetch("/api/corporate/reports/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: assoc.documents[0].id, draft: draftText, associationId: assoc.id }),
    });
    if (res.ok) {
      setMsg("✓ Raport publicat! Clientul îl poate vedea.");
      setDraftText("");
      setSelectedAssoc(null);
    } else {
      const data = await res.json();
      setMsg("✗ " + (data.error || "Eroare"));
    }
    setPublishing(false);
  }

  const statusBadge = (status: string) => {
    const map: Record<string, [string, string]> = {
      published: ["bg-emerald-500/15 text-emerald-300", "Publicat"],
      analyzed: ["bg-cyan-500/15 text-cyan-300", "Analizat"],
      analyzing: ["bg-violet-500/15 text-violet-300 animate-pulse", "Se analizează"],
      uploaded: ["bg-slate-500/15 text-slate-300", "Încărcat"],
      error: ["bg-red-500/15 text-red-300", "Eroare"],
      draft: ["bg-slate-500/15 text-slate-300", "Draft"],
    };
    const [cls, label] = map[status] || ["bg-slate-500/15 text-slate-300", status];
    return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${cls}`}>{label}</span>;
  };

  const subscriptionStatusBadge = (status: string | null) => {
    const map: Record<string, [string, string]> = {
      active: ["bg-emerald-500/15 text-emerald-300 border border-emerald-500/20", "✓ Activ"],
      trialing: ["bg-cyan-500/15 text-cyan-300 border border-cyan-500/20", "Perioadă de probă"],
      incomplete: ["bg-yellow-500/15 text-yellow-300 border border-yellow-500/20", "⏳ Incomplet"],
      past_due: ["bg-red-500/15 text-red-300 border border-red-500/20", "Plată restantă"],
      canceled: ["bg-slate-500/15 text-slate-300", "Anulat"],
      unpaid: ["bg-red-500/15 text-red-300 border border-red-500/20", "Neplătit"],
    };
    const [cls, label] = (status && map[status]) || ["bg-slate-500/15 text-slate-300", "Fără abonament"];
    return <span className={`rounded-full px-3 py-1 text-xs font-medium ${cls}`}>{label}</span>;
  };

  return (
    <main className="min-h-screen bg-[#050814] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(124,58,237,0.18),transparent_40%)]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#050814]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            {/* Logo firmei corporate (dacă există) sau VoSmart */}
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="h-9 w-auto object-contain" />
            ) : (
              <Image src="/logo-vosmart.png" alt="VoSmart" width={80} height={36}
                className="h-auto" style={{ mixBlendMode:"screen", width:"70px" }} />
            )}
            <div className="hidden sm:block">
              <p className="text-sm font-semibold">{corporate.companyName}</p>
              <p className="text-xs text-slate-400">{pkg ? `${pkg.name} — ${pkg.priceRon} lei/lună` : corporate.package}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 hidden sm:block">{associations.length}/{effectiveMaxAssoc === 9999 ? "∞" : effectiveMaxAssoc} asociații</span>
            <a href="/" className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/[0.08]">← Site</a>
            <button onClick={handleLogout}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/[0.08]">
              Ieșire
            </button>
          </div>
        </div>
      </header>

      {/* Admin package switcher */}
      {isAdmin && (
        <div className="border-b border-amber-500/20 bg-amber-500/5">
          <div className="mx-auto max-w-7xl px-5 py-3 sm:px-6">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-amber-400 font-semibold uppercase tracking-wider shrink-0">
                🔧 Mod test admin — pachet simulat:
              </span>
              <div className="flex gap-2 flex-wrap">
                {ALL_PACKAGES.map(pk => {
                  const pkInfo = CORPORATE_PACKAGES[pk];
                  const isSelected = previewPackage === pk;
                  return (
                    <button key={pk} onClick={() => setPreviewPackage(pk)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        isSelected
                          ? "bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                          : "border border-amber-500/25 text-amber-300 hover:bg-amber-500/15"
                      }`}>
                      {pkInfo.name}
                      {pkInfo.priceRon > 0 && <span className="ml-1 opacity-60">{pkInfo.priceRon}L</span>}
                      {pkInfo.priceRon === 0 && <span className="ml-1 opacity-60">gratuit</span>}
                    </button>
                  );
                })}
              </div>
              <span className="text-xs text-slate-500 ml-auto hidden md:block">
                Max asociații: <strong className="text-amber-300">{effectiveMaxAssoc === 9999 ? "∞" : effectiveMaxAssoc}</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Panou {corporate.companyName}</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Gestionare clienți și rapoarte
            {isAdmin && <span className="ml-2 text-amber-400">· Pachet simulat: <strong>{pkg?.name}</strong></span>}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            ["👥", "Clienți activi", associations.length.toString()],
            ["📋", "Locuri disponibile", effectiveMaxAssoc === 9999 ? "∞" : (effectiveMaxAssoc - associations.length).toString()],
            ["📄", "Doc. de revizuit", associations.reduce((a, c) => a + c.documents.filter((d: any) => d.status === "analyzed").length, 0).toString()],
            ["✅", "Rapoarte publicate", associations.reduce((a, c) => a + c.reports.filter((r: any) => r.status === "published").length, 0).toString()],
          ].map(([icon, label, value]) => (
            <div key={label} className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
              <div className="text-2xl mb-2">{icon}</div>
              <div className="text-2xl font-bold">{value}</div>
              <div className="text-xs text-slate-500 mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-white/5 pb-1 flex-wrap">
          {[
            { key: "overview", label: "📊 Prezentare" },
            { key: "clienti", label: `👥 Clienți (${associations.length})` },
            { key: "adauga", label: "➕ Adaugă client" },
            { key: "abonament", label: "💳 Abonament" },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition ${tab === t.key ? "bg-violet-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.3)]" : "text-slate-400 hover:text-white hover:bg-white/[0.05]"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab === "overview" && (
          <div className="space-y-4">
            {/* Pachet info */}
            <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-sm text-slate-400">Pachet activ</p>
                  <p className="text-xl font-bold">{pkg ? pkg.name : corporate.package}</p>
                  {pkg && <p className="text-sm text-violet-300">{pkg.priceRon} lei/lună</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-400">Asociații folosite</p>
                  <p className="text-3xl font-bold">{associations.length}<span className="text-lg text-slate-400">/{effectiveMaxAssoc === 9999 ? "∞" : effectiveMaxAssoc}</span></p>
                </div>
              </div>
              <div className="mt-4 w-full bg-white/10 rounded-full h-2">
                <div className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all"
                  style={{ width: effectiveMaxAssoc === 9999 ? "30%" : `${Math.min(100, (associations.length / effectiveMaxAssoc) * 100)}%` }} />
              </div>
            </div>

            {/* Documente care asteapta */}
            {associations.some(a => a.documents.some((d: any) => d.status === "analyzed")) && (
              <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5">
                <p className="text-sm font-semibold text-yellow-300 mb-3">⚠️ Documente care așteaptă revizuire</p>
                <div className="space-y-2">
                  {associations.filter(a => a.documents.some((d: any) => d.status === "analyzed")).map(a => (
                    <div key={a.id} className="flex items-center justify-between rounded-xl bg-black/20 p-3">
                      <div>
                        <p className="text-sm font-medium">{a.name}</p>
                        <p className="text-xs text-slate-400">{a.documents.filter((d: any) => d.status === "analyzed").length} doc. de revizuit</p>
                      </div>
                      <button onClick={() => { setSelectedAssoc(a); setTab("clienti"); setDraftText(""); setMsg(""); }}
                        className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold transition hover:bg-violet-500">
                        Revizuiește
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {associations.length === 0 && (
              <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-12 text-center">
                <div className="text-5xl mb-4">👥</div>
                <p className="text-slate-300 font-medium">Nu ai clienți încă</p>
                <button onClick={() => setTab("adauga")}
                  className="mt-4 rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-semibold transition hover:bg-violet-500">
                  Adaugă primul client →
                </button>
              </div>
            )}
          </div>
        )}

        {/* CLIENȚI */}
        {tab === "clienti" && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Lista */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold mb-4">Clienții tăi</h2>
              {associations.length === 0 ? (
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-8 text-center text-slate-400">
                  <p>Nu ai clienți încă.</p>
                  <button onClick={() => setTab("adauga")} className="mt-3 text-violet-400 hover:text-violet-300 text-sm">Adaugă primul →</button>
                </div>
              ) : associations.map(a => (
                <div key={a.id}
                  onClick={() => { setSelectedAssoc(a); setDraftText(""); setMsg(""); loadDraft(a); }}
                  className={`rounded-2xl border p-5 cursor-pointer transition ${selectedAssoc?.id === a.id ? "border-violet-500/50 bg-violet-500/8" : "border-white/8 bg-white/[0.03] hover:bg-white/[0.06]"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{a.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{a.user.email}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-xs text-slate-400">
                      <span>📁 {a._count.documents}</span>
                      <span>📋 {a._count.reports}</span>
                    </div>
                  </div>
                  {a.documents[0] && (
                    <div className="mt-3 flex items-center gap-2">
                      {statusBadge(a.documents[0].status)}
                      {a.documents[0].aiScore !== null && (
                        <span className={`text-xs font-bold ${a.documents[0].aiScore >= 80 ? "text-emerald-400" : a.documents[0].aiScore >= 60 ? "text-yellow-400" : "text-red-400"}`}>
                          {a.documents[0].aiScore.toFixed(0)}%
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Panou dreapta */}
            <div className="sticky top-24">
              {selectedAssoc ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                  <h3 className="text-lg font-semibold mb-1">{selectedAssoc.name}</h3>
                  <p className="text-sm text-slate-400 mb-4">{selectedAssoc.user.email}</p>

                  {selectedAssoc.documents[0] && (
                    <>
                      {selectedAssoc.documents[0].aiScore !== null && (
                        <div className="mb-4">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-sm text-slate-400">Scor AI:</span>
                            <span className={`text-xl font-bold ${selectedAssoc.documents[0].aiScore >= 80 ? "text-emerald-400" : selectedAssoc.documents[0].aiScore >= 60 ? "text-yellow-400" : "text-red-400"}`}>
                              {selectedAssoc.documents[0].aiScore.toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full bg-white/10 rounded-full h-2">
                            <div className={`h-2 rounded-full ${selectedAssoc.documents[0].aiScore >= 80 ? "bg-emerald-400" : selectedAssoc.documents[0].aiScore >= 60 ? "bg-yellow-400" : "bg-red-400"}`}
                              style={{ width: `${selectedAssoc.documents[0].aiScore}%` }} />
                          </div>
                        </div>
                      )}

                      {selectedAssoc.documents[0].aiFindings && (() => {
                        try {
                          const f = JSON.parse(selectedAssoc.documents[0].aiFindings);
                          return f.length > 0 ? (
                            <div className="mb-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
                              <p className="text-xs font-semibold text-yellow-300 mb-2">Probleme găsite:</p>
                              <ul className="space-y-1.5">
                                {f.slice(0, 4).map((item: string, i: number) => (
                                  <li key={i} className="text-xs text-slate-300 flex gap-2">
                                    <span className="text-yellow-400 flex-shrink-0">▸</span>{item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null;
                        } catch { return null; }
                      })()}
                    </>
                  )}

                  <div className="border-t border-white/5 pt-4">
                    <p className="text-sm font-semibold mb-3">Raport de cenzor</p>

                    {generating && !draftText && (
                      <div className="mb-4 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 text-center">
                        <div className="flex items-center justify-center gap-2 text-violet-300">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                          <span className="text-sm">AI generează raportul...</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">20-40 secunde</p>
                      </div>
                    )}

                    <textarea value={draftText} onChange={e => setDraftText(e.target.value)} rows={8}
                      placeholder="Apasă 'Draft AI' pentru a genera raportul..."
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-violet-500 transition resize-none" />

                    {msg && <p className={`text-xs mt-1 ${msg.startsWith("✓") ? "text-emerald-400" : "text-red-400"}`}>{msg}</p>}

                    <div className="flex gap-3 mt-3">
                      <button onClick={() => generateDraft(selectedAssoc)} disabled={generating}
                        className="flex-1 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
                        {generating ? <><svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Generează...</> : "✨ Draft AI"}
                      </button>
                      <button onClick={() => publishDraft(selectedAssoc)} disabled={publishing || !draftText}
                        className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold transition hover:bg-emerald-500 disabled:opacity-50">
                        {publishing ? "Se publică..." : "✅ Aprobă & Publică"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-12 text-center text-slate-400">
                  <div className="text-4xl mb-3">👆</div>
                  <p>Selectează un client</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ADAUGĂ CLIENT */}
        {tab === "adauga" && (
          <div className="max-w-xl">
            {!canAddMore ? (
              <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-8 text-center">
                <div className="text-4xl mb-3">🔒</div>
                <p className="font-semibold text-red-300 mb-2">Limită atinsă</p>
                <p className="text-sm text-slate-400">Ai atins limita de {effectiveMaxAssoc} asociații pentru pachetul {pkg ? pkg.name : corporate.package}.</p>
                <p className="text-sm text-slate-400 mt-2">Contactează VoSmart pentru upgrade la un pachet superior.</p>
              </div>
            ) : (
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
                <h2 className="text-xl font-semibold mb-1">Adaugă client nou</h2>
                <p className="text-sm text-slate-400 mb-6">Creează cont pentru o asociație clientă. Ei se vor putea loga și încărca documente.</p>

                {createMsg && (
                  <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${createMsg.startsWith("✓") ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-red-500/30 bg-red-500/10 text-red-300"}`}>
                    {createMsg}
                  </div>
                )}

                <form onSubmit={createClient} className="space-y-4">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Date asociație</p>
                    <div className="space-y-3">
                      <input type="text" required value={assocName} onChange={e => setAssocName(e.target.value)}
                        placeholder="Numele asociației *"
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />
                      <input type="text" value={assocCui} onChange={e => setAssocCui(e.target.value)}
                        placeholder="CUI asociație"
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />
                      <input type="text" value={assocAddress} onChange={e => setAssocAddress(e.target.value)}
                        placeholder="Adresa"
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />
                      <input type="text" value={assocPhone} onChange={e => setAssocPhone(e.target.value)}
                        placeholder="Telefon"
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />
                    </div>
                  </div>
                  <div className="border-t border-white/5 pt-4">
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Cont de acces client</p>
                    <div className="space-y-3">
                      <input type="text" required value={clientName} onChange={e => setClientName(e.target.value)}
                        placeholder="Numele reprezentantului *"
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />
                      <input type="email" required value={clientEmail} onChange={e => setClientEmail(e.target.value)}
                        placeholder="Email *"
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />
                      <input type="password" required minLength={8} value={clientPassword} onChange={e => setClientPassword(e.target.value)}
                        placeholder="Parolă pentru client *"
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />
                    </div>
                  </div>
                  <button type="submit" disabled={creating}
                    className="w-full rounded-xl bg-violet-600 px-6 py-3.5 font-semibold transition hover:bg-violet-500 disabled:opacity-50">
                    {creating ? "Se creează..." : "Creează cont client →"}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ABONAMENT */}
        {tab === "abonament" && (() => {
          const status = corporate.subscriptionStatus;
          const isActive = status === "active" || status === "trialing";
          return (
            <div className="max-w-2xl">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
                  <div>
                    <p className="text-sm text-slate-400">Pachetul tău</p>
                    <p className="text-xl font-bold">{pkg ? pkg.name : corporate.package}</p>
                    {pkg && <p className="text-sm text-violet-300">{pkg.priceRon} lei/lună</p>}
                  </div>
                  {subscriptionStatusBadge(status)}
                </div>
                {corporate.currentPeriodEnd && (
                  <p className="text-xs text-slate-500">
                    Valabil până la {new Date(corporate.currentPeriodEnd).toLocaleDateString("ro-RO")}
                  </p>
                )}

                {!isActive && (
                  <div className="mt-5 border-t border-white/5 pt-5">
                    {subscribeClientSecret ? (
                      <CardPaymentForm
                        clientSecret={subscribeClientSecret}
                        onSuccess={handleSubscribeSuccess}
                        submitLabel={`Activează — ${pkg ? pkg.priceRon : ""} lei/lună`}
                      />
                    ) : (
                      <button onClick={startSubscription} disabled={subscribing}
                        className="w-full rounded-xl bg-violet-600 px-6 py-3.5 font-semibold transition hover:bg-violet-500 disabled:opacity-50">
                        {subscribing ? "Se încarcă..." : "Activează abonamentul"}
                      </button>
                    )}
                    {subMsg && (
                      <p className={`mt-3 text-sm ${subMsg.startsWith("✓") ? "text-emerald-400" : "text-red-400"}`}>{subMsg}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Footer cu VoSmart */}
      <footer className="mt-16 border-t border-white/5 py-6 text-center">
        <div className="flex items-center justify-center gap-2 text-slate-600 text-xs">
          <span>Powered by</span>
          <Image src="/logo-vosmart.png" alt="VoSmart" width={60} height={26}
            className="h-auto opacity-40" style={{ mixBlendMode:"screen", width:"50px" }} />
        </div>
      </footer>
    </main>
  );
}
