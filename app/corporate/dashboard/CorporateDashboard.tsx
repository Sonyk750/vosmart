"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import CardPaymentForm from "@/app/components/CardPaymentForm";
import { CORPORATE_PACKAGES, CorporatePackage } from "@/lib/billing";

interface Corporate {
  id: string; companyName: string; package: string; maxAssoc: number;
  status: string; logoUrl: string | null; cui: string | null;
  subscriptionStatus: string | null; currentPeriodEnd: string | null;
  associations: any[];
}
interface User { id: string; name: string | null; email: string; role: string; }

const ALL_PACKAGES: CorporatePackage[] = ["trial", "starter", "business", "professional", "enterprise"];

export default function CorporateDashboard({ user, corporate, isAdmin = false }: { user: User; corporate: Corporate; isAdmin?: boolean }) {
  const router = useRouter();
  const [tab, setTab] = useState<"overview" | "documente" | "rapoarte" | "abonament">("overview");

  // Admin: comutare între pachete pentru testare
  const [previewPackage, setPreviewPackage] = useState<CorporatePackage>(
    corporate.package as CorporatePackage
  );
  const effectivePackageKey: CorporatePackage = isAdmin ? previewPackage : (corporate.package as CorporatePackage);
  const pkg = CORPORATE_PACKAGES[effectivePackageKey] as { name: string; priceRon: number; maxAssoc: number } | undefined;

  const [logoPreview, setLogoPreview] = useState(corporate.logoUrl || "");

  // Abonament corporate
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeClientSecret, setSubscribeClientSecret] = useState("");
  const [subMsg, setSubMsg] = useState("");

  // Upload state
  const [uploadPeriod, setUploadPeriod] = useState("");
  const [uploadFiles, setUploadFiles] = useState<{ type: string; label: string; file: File | null }[]>([
    { type: "lista_plata", label: "Lista de plată *", file: null },
    { type: "explicatii_lista", label: "Explicații listă *", file: null },
    { type: "distributia_facturilor", label: "Distribuția facturilor *", file: null },
    { type: "facturi", label: "Facturi furnizori *", file: null },
    { type: "extras_cont", label: "Extras cont bancar", file: null },
  ]);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [documents, setDocuments] = useState<any[]>([]);

  // Rapoarte state
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    fetchDocuments();
    fetchReports();
  }, []);

  async function fetchDocuments() {
    const res = await fetch("/api/dashboard/documents");
    if (res.ok) setDocuments(await res.json());
  }

  async function fetchReports() {
    const res = await fetch("/api/dashboard/reports");
    if (res.ok) setReports(await res.json());
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadPeriod) { setUploadMsg("Selectează perioada"); return; }
    const required = ["lista_plata", "explicatii_lista", "distributia_facturilor", "facturi"];
    const missing = required.filter(r => !uploadFiles.find(f => f.type === r && f.file));
    if (missing.length > 0) { setUploadMsg("Documentele obligatorii lipsă: " + missing.join(", ")); return; }

    setUploading(true);
    setUploadMsg("Se încarcă și se analizează... (30-60 secunde)");

    const form = new FormData();
    form.append("period", uploadPeriod);
    form.append("associationName", corporate.companyName);
    form.append("cui", corporate.cui || "");
    form.append("address", "");

    for (const uf of uploadFiles) {
      if (uf.file) {
        form.append("files", uf.file);
        form.append("fileTypes", uf.type);
        form.append("fileLabels", uf.label);
      }
    }

    const res = await fetch("/api/dashboard/upload-structured", { method: "POST", body: form });
    const data = await res.json();

    if (res.ok) {
      setUploadMsg("✓ Dosar trimis cu succes! Analiza AI este completă.");
      setUploadFiles(prev => prev.map(f => ({ ...f, file: null })));
      setUploadPeriod("");
      fetchDocuments();
      fetchReports();
    } else {
      setUploadMsg("✗ " + (data.error || "Eroare la upload"));
    }
    setUploading(false);
  }

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
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="h-9 w-auto object-contain" />
            ) : (
              <Image src="/logo-vosmart.png" alt="VoSmart" width={80} height={36}
                className="h-auto" style={{ mixBlendMode: "screen", width: "70px" }} />
            )}
            <div className="hidden sm:block">
              <p className="text-sm font-semibold">{corporate.companyName}</p>
              <p className="text-xs text-slate-400">{pkg ? `${pkg.name} — ${pkg.priceRon} lei/lună` : corporate.package}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="/help" className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/[0.08]">Ajutor</a>
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
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Panou {corporate.companyName}</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Dashboard corporate — documente și rapoarte
            {isAdmin && <span className="ml-2 text-amber-400">· Pachet simulat: <strong>{pkg?.name}</strong></span>}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            ["📄", "Documente", documents.length.toString()],
            ["✅", "Rapoarte publicate", reports.filter((r: any) => r.status === "published").length.toString()],
            ["🤖", "Se analizează", documents.filter((d: any) => d.status === "analyzing").length.toString()],
            ["📋", "Rapoarte draft", reports.filter((r: any) => r.status === "draft").length.toString()],
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
            { key: "documente", label: "📁 Documente" },
            { key: "rapoarte", label: "📋 Rapoarte" },
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
                  <p className="text-sm text-slate-400">Documente încărcate</p>
                  <p className="text-3xl font-bold">{documents.length}</p>
                </div>
              </div>
            </div>

            {/* Documente în analiză */}
            {documents.filter((d: any) => d.status === "analyzing").length > 0 && (
              <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
                <p className="text-sm font-semibold text-violet-300 mb-2 flex items-center gap-2">
                  <span className="animate-pulse">●</span> Documente în analiză AI
                </p>
                <p className="text-xs text-slate-400">Analiza poate dura 30-60 secunde. Reîncarcă pagina pentru a verifica statusul.</p>
              </div>
            )}

            {/* Acces rapid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button onClick={() => setTab("documente")}
                className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 text-left hover:bg-white/[0.06] hover:border-violet-500/30 transition group">
                <div className="text-3xl mb-3">📁</div>
                <p className="font-semibold">Încarcă documente</p>
                <p className="text-sm text-slate-400 mt-1">Trimite dosarul lunar pentru analiză AI</p>
                <span className="text-violet-400 text-sm mt-3 inline-block group-hover:translate-x-1 transition-transform">Deschide →</span>
              </button>
              <button onClick={() => setTab("rapoarte")}
                className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 text-left hover:bg-white/[0.06] hover:border-cyan-500/30 transition group">
                <div className="text-3xl mb-3">📋</div>
                <p className="font-semibold">Rapoartele mele</p>
                <p className="text-sm text-slate-400 mt-1">{reports.filter((r: any) => r.status === "published").length} rapoarte publicate</p>
                <span className="text-cyan-400 text-sm mt-3 inline-block group-hover:translate-x-1 transition-transform">Vezi rapoarte →</span>
              </button>
            </div>

            {documents.length === 0 && (
              <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-12 text-center">
                <div className="text-5xl mb-4">📤</div>
                <p className="text-slate-300 font-medium">Nu ai documente încă</p>
                <p className="text-sm text-slate-500 mt-2">Încarcă primul dosar pentru a genera un raport de admin</p>
                <button onClick={() => setTab("documente")}
                  className="mt-4 rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-semibold transition hover:bg-violet-500">
                  Încarcă documente →
                </button>
              </div>
            )}
          </div>
        )}

        {/* DOCUMENTE */}
        {tab === "documente" && (
          <div className="space-y-6">
            {/* Upload form */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-lg font-semibold mb-1">Trimite dosar la analiză AI</h2>
              <p className="text-sm text-slate-400 mb-6">Încarcă documentele lunare pentru verificare automată. Analiza durează 30-60 secunde.</p>

              <form onSubmit={handleUpload} className="space-y-5">
                {/* Selector perioadă */}
                <div>
                  <label className="block text-xs text-slate-400 uppercase tracking-wider mb-2">Perioada *</label>
                  <input
                    type="month"
                    value={uploadPeriod}
                    onChange={e => setUploadPeriod(e.target.value)}
                    className="w-full max-w-xs rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-violet-500 transition"
                  />
                </div>

                {/* Fișiere */}
                <div>
                  <label className="block text-xs text-slate-400 uppercase tracking-wider mb-3">Documente</label>
                  <div className="space-y-3">
                    {uploadFiles.map((uf, idx) => (
                      <div key={uf.type} className="flex items-center gap-4">
                        <label className="w-52 text-sm text-slate-300 shrink-0">{uf.label}</label>
                        <div className="flex-1">
                          <label className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 cursor-pointer transition ${
                            uf.file
                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                              : "border-white/10 bg-black/10 text-slate-400 hover:border-violet-500/40 hover:bg-violet-500/5"
                          }`}>
                            <span className="text-lg">{uf.file ? "✓" : "📄"}</span>
                            <span className="text-sm truncate">{uf.file ? uf.file.name : "Alege fișier..."}</span>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx"
                              className="hidden"
                              onChange={e => {
                                const file = e.target.files?.[0] || null;
                                setUploadFiles(prev => prev.map((f, i) => i === idx ? { ...f, file } : f));
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {uploadMsg && (
                  <div className={`rounded-xl border px-4 py-3 text-sm ${
                    uploadMsg.startsWith("✓")
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : uploadMsg.startsWith("✗")
                      ? "border-red-500/30 bg-red-500/10 text-red-300"
                      : "border-violet-500/30 bg-violet-500/10 text-violet-300"
                  }`}>
                    {uploading && (
                      <span className="inline-flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                      </span>
                    )}
                    {uploadMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={uploading}
                  className="w-full rounded-xl bg-violet-600 px-6 py-3.5 font-semibold transition hover:bg-violet-500 disabled:opacity-50 flex items-center justify-center gap-2">
                  {uploading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Se analizează...
                    </>
                  ) : "🤖 Trimite dosar la analiză AI"}
                </button>
              </form>
            </div>

            {/* Lista documente existente */}
            {documents.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <h2 className="text-lg font-semibold mb-4">Dosarele mele</h2>
                <div className="space-y-3">
                  {documents.map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between rounded-xl border border-white/8 bg-black/20 p-4">
                      <div>
                        <p className="font-medium text-sm">{doc.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{doc.fileName}</p>
                        {doc.aiSummary && <p className="text-xs text-slate-400 mt-1">{doc.aiSummary}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {statusBadge(doc.status)}
                        {doc.aiScore !== null && doc.aiScore !== undefined && (
                          <span className={`text-xs font-bold ${doc.aiScore >= 80 ? "text-emerald-400" : doc.aiScore >= 60 ? "text-yellow-400" : "text-red-400"}`}>
                            {doc.aiScore.toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* RAPOARTE */}
        {tab === "rapoarte" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold mb-4">Rapoartele mele</h2>
            {reports.length === 0 ? (
              <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-12 text-center text-slate-400">
                <div className="text-4xl mb-3">📋</div>
                <p>Nu există rapoarte încă.</p>
                <p className="text-sm mt-2">Trimite un dosar la analiză pentru a genera primul raport.</p>
                <button onClick={() => setTab("documente")}
                  className="mt-4 rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-semibold transition hover:bg-violet-500">
                  Încarcă documente →
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {reports.map((report: any) => (
                  <div key={report.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 hover:border-violet-500/30 transition">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="font-semibold">{report.title}</p>
                        {report.month && report.year && (
                          <p className="text-xs text-slate-400 mt-0.5">{report.month} {report.year}</p>
                        )}
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        report.status === "published"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : report.status === "draft"
                          ? "bg-slate-500/15 text-slate-300"
                          : "bg-yellow-500/15 text-yellow-300"
                      }`}>
                        {report.status === "published" ? "✓ Publicat" : report.status === "draft" ? "Draft" : report.status}
                      </span>
                    </div>
                    {report.status === "published" && (
                      <button
                        onClick={() => {
                          const content = report.aiDraft || report.content || "";
                          const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `${report.title.replace(/\s+/g, "_")}.txt`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20">
                        📄 Descarcă raport
                      </button>
                    )}
                    {report.status !== "published" && (
                      <p className="text-xs text-slate-500">Raportul este în curs de procesare de către admin.</p>
                    )}
                  </div>
                ))}
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

              {/* Pachete disponibile */}
              <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                <p className="text-sm font-semibold mb-3 text-slate-300">Pachete disponibile</p>
                <div className="space-y-2">
                  {[
                    { key: "trial", name: "Trial", price: "Gratuit", assoc: "1 dosar (5 documente)" },
                    { key: "starter", name: "Starter", price: "250 lei/lună", assoc: "10 asociații" },
                    { key: "business", name: "Business", price: "500 lei/lună", assoc: "25 asociații" },
                    { key: "professional", name: "Professional", price: "900 lei/lună", assoc: "50 asociații" },
                  ].map(p => (
                    <div key={p.key} className={`flex items-center justify-between rounded-xl border p-3 ${corporate.package === p.key ? "border-violet-500/40 bg-violet-500/10" : "border-white/5 bg-white/[0.02]"}`}>
                      <div>
                        <span className="text-sm font-medium">{p.name}</span>
                        <span className="text-xs text-slate-500 ml-2">{p.assoc}</span>
                      </div>
                      <span className="text-sm text-violet-300">{p.price}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-4">
                  Pentru upgrade contactează <a href="mailto:office@vosmart.ro" className="text-violet-400 hover:underline">office@vosmart.ro</a>
                </p>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Footer */}
      <footer className="mt-16 border-t border-white/5 py-6 text-center">
        <div className="flex items-center justify-center gap-2 text-slate-600 text-xs">
          <span>Powered by</span>
          <Image src="/logo-vosmart.png" alt="VoSmart" width={60} height={26}
            className="h-auto opacity-40" style={{ mixBlendMode: "screen", width: "50px" }} />
        </div>
      </footer>
    </main>
  );
}
