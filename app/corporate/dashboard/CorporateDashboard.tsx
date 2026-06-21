"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import CardPaymentForm from "@/app/components/CardPaymentForm";
import { CORPORATE_PACKAGES, CorporatePackage } from "@/lib/billing";
import JSZip from "jszip";

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
  const [uploadMonth, setUploadMonth] = useState("");
  const [uploadYear, setUploadYear] = useState(new Date().getFullYear().toString());
  const [assocName, setAssocName] = useState("");
  const [uploadSubTab, setUploadSubTab] = useState<"fisiere" | "zip">("fisiere");
  const [uploadFiles, setUploadFiles] = useState<{ type: string; label: string; file: File | null; required: boolean }[]>([
    { type: "lista_plata", label: "Lista de plată", file: null, required: true },
    { type: "explicatii_lista", label: "Explicații listă", file: null, required: true },
    { type: "distributia_facturilor", label: "Distribuția facturilor", file: null, required: true },
    { type: "extras_cont", label: "Extras cont bancar", file: null, required: false },
  ]);
  const [invoiceFiles, setInvoiceFiles] = useState<File[]>([]);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [zipExtracted, setZipExtracted] = useState<{ name: string; assignedType: string; file: File }[]>([]);
  const [zipLoading, setZipLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStep, setAnalysisStep] = useState("");
  const [analysisDossierName, setAnalysisDossierName] = useState("");
  const analysisTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);

  // Rapoarte state
  const [reports, setReports] = useState<any[]>([]);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [confirmDeleteDocId, setConfirmDeleteDocId] = useState<string | null>(null);

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

  const MONTHS_RO = [
    { val: "01", name: "Ianuarie" }, { val: "02", name: "Februarie" },
    { val: "03", name: "Martie" },   { val: "04", name: "Aprilie" },
    { val: "05", name: "Mai" },      { val: "06", name: "Iunie" },
    { val: "07", name: "Iulie" },    { val: "08", name: "August" },
    { val: "09", name: "Septembrie" },{ val: "10", name: "Octombrie" },
    { val: "11", name: "Noiembrie" }, { val: "12", name: "Decembrie" },
  ];
  const YEARS = ["2024", "2025", "2026", "2027"];

  const ZIP_TYPE_MAP: { patterns: string[]; type: string; label: string }[] = [
    { patterns: ["lista", "plata", "plată"], type: "lista_plata", label: "Lista de plată" },
    { patterns: ["explicat"], type: "explicatii_lista", label: "Explicații listă" },
    { patterns: ["distribut", "repartiz"], type: "distributia_facturilor", label: "Distribuția facturilor" },
    { patterns: ["factur", "furniz"], type: "facturi", label: "Facturi furnizori" },
    { patterns: ["extras", "cont", "bancar"], type: "extras_cont", label: "Extras cont bancar" },
  ];

  function guessTypeFromName(name: string) {
    const lower = name.toLowerCase();
    for (const entry of ZIP_TYPE_MAP) {
      if (entry.patterns.some(p => lower.includes(p))) return entry;
    }
    return { type: "altele", label: name };
  }

  async function handleZipChange(zipF: File) {
    setZipFile(zipF);
    setZipLoading(true);
    setZipExtracted([]);
    try {
      const zip = await JSZip.loadAsync(zipF);
      const extracted: { name: string; assignedType: string; file: File }[] = [];
      for (const [name, entry] of Object.entries(zip.files)) {
        if (entry.dir) continue;
        const ext = name.split(".").pop()?.toLowerCase() || "";
        const allowed = ["pdf", "jpg", "jpeg", "png", "xlsx", "xls", "doc", "docx"];
        if (!allowed.includes(ext)) continue;
        const buffer = await entry.async("arraybuffer");
        const mimeMap: Record<string, string> = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", xls: "application/vnd.ms-excel", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
        const mime = mimeMap[ext] || "application/octet-stream";
        const file = new File([buffer], name.split("/").pop() || name, { type: mime });
        const { type } = guessTypeFromName(name);
        extracted.push({ name: name.split("/").pop() || name, assignedType: type, file });
      }
      setZipExtracted(extracted);
    } catch {
      setUploadMsg("✗ Nu s-a putut deschide arhiva ZIP.");
    }
    setZipLoading(false);
  }

  function startAnalysisProgress() {
    setAnalysisProgress(0);
    setAnalysisStep("Se pregătesc fișierele...");
    let progress = 0;
    const STEPS = [
      { at: 8, label: "Se încarcă fișierele..." },
      { at: 22, label: "Se procesează documentele..." },
      { at: 45, label: "Analiză AI în curs..." },
      { at: 68, label: "Generare raport de cenzor..." },
      { at: 82, label: "Finalizare raport..." },
    ];
    analysisTimerRef.current = setInterval(() => {
      progress += 1;
      if (progress >= 90) { if (analysisTimerRef.current) clearInterval(analysisTimerRef.current); return; }
      const step = STEPS.filter(s => s.at <= progress).pop();
      setAnalysisProgress(progress);
      if (step) setAnalysisStep(step.label);
    }, 560);
  }

  function stopAnalysisProgress() {
    if (analysisTimerRef.current) { clearInterval(analysisTimerRef.current); analysisTimerRef.current = null; }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!assocName.trim()) { setUploadMsg("Introdu numele asociației"); return; }
    if (!uploadMonth || !uploadYear) { setUploadMsg("Selectează luna și anul"); return; }

    const period = `${uploadYear}-${uploadMonth}`;

    // Build files list
    let allFiles: { file: File; type: string; label: string }[] = [];

    if (uploadSubTab === "fisiere") {
      const missing = uploadFiles.filter(f => f.required && !f.file).map(f => f.label);
      if (missing.length > 0) { setUploadMsg("Lipsesc: " + missing.join(", ")); return; }
      if (invoiceFiles.length === 0) { setUploadMsg("Adaugă cel puțin o factură furnizori"); return; }
      for (const uf of uploadFiles) {
        if (uf.file) allFiles.push({ file: uf.file, type: uf.type, label: uf.label });
      }
      invoiceFiles.forEach((file, idx) => {
        allFiles.push({ file, type: idx === 0 ? "facturi" : `facturi_${idx + 1}`, label: invoiceFiles.length > 1 ? `Factură furnizori (${idx + 1})` : "Facturi furnizori" });
      });
    } else {
      if (zipExtracted.length === 0) { setUploadMsg("Alege o arhivă ZIP validă"); return; }
      const hasReq = ["lista_plata", "explicatii_lista", "distributia_facturilor"].every(t => zipExtracted.some(z => z.assignedType === t));
      const hasFacturi = zipExtracted.some(z => z.assignedType === "facturi");
      if (!hasReq || !hasFacturi) { setUploadMsg("ZIP-ul trebuie să conțină: lista de plată, explicații, distribuția facturilor și facturi"); return; }
      allFiles = zipExtracted.map(z => ({ file: z.file, type: z.assignedType, label: guessTypeFromName(z.name).label }));
    }

    const monthLabel = MONTHS_RO.find(m => m.val === uploadMonth)?.name || uploadMonth;
    setAnalysisDossierName(`${assocName.trim()} — ${monthLabel} ${uploadYear}`);
    startAnalysisProgress();
    setUploading(true);
    setUploadMsg("");

    const form = new FormData();
    form.append("period", period);
    form.append("associationName", assocName.trim());
    form.append("cui", corporate.cui || "");
    form.append("address", "");
    for (const { file, type, label } of allFiles) {
      form.append("files", file);
      form.append("fileTypes", type);
      form.append("fileLabels", label);
    }

    const res = await fetch("/api/dashboard/upload-structured", { method: "POST", body: form });
    const data = await res.json();

    stopAnalysisProgress();

    if (res.ok) {
      setAnalysisProgress(100);
      setAnalysisStep("Analiză completă!");
      setUploadMsg("✓ Dosar trimis! Analiza AI este completă.");
      setUploadFiles(prev => prev.map(f => ({ ...f, file: null })));
      setInvoiceFiles([]);
      setZipFile(null); setZipExtracted([]);
      setUploadMonth(""); setAssocName("");
      fetchDocuments(); fetchReports();
      router.refresh();
      setTimeout(() => { setAnalysisProgress(0); setAnalysisStep(""); }, 4000);
    } else {
      setUploadMsg("✗ " + (data.error || "Eroare la upload"));
      setTimeout(() => { setAnalysisProgress(0); setAnalysisStep(""); }, 3000);
    }
    setUploading(false);
  }

  async function deleteDocument(id: string) {
    setDeletingDocId(id);
    const res = await fetch(`/api/dashboard/documents/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDocuments(prev => prev.filter(d => d.id !== id));
      router.refresh();
    }
    setDeletingDocId(null);
    setConfirmDeleteDocId(null);
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
        {tab === "documente" && (() => {
          const assoc = corporate.associations?.[0];
          const filesUsed: number = assoc?.filesUploadedCount ?? 0;
          const filesMax: number = assoc?.maxDocuments ?? 5;
          const atLimit = filesUsed >= filesMax;

          const docsFilled = uploadFiles.filter(f => f.file).length + invoiceFiles.length;
          const docsMax = 5;
          const barHue = Math.round(120 - (docsFilled / docsMax) * 120);
          const barPct = Math.min(100, (docsFilled / docsMax) * 100);

          return (
          <div className="space-y-6">
            {/* Upload form */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-semibold">Trimite dosar la analiză AI</h2>
                  <p className="text-sm text-slate-400 mt-0.5">Analiza durează 30–60 secunde.</p>
                </div>
                {/* Contor documente */}
                <div className={`shrink-0 rounded-xl border px-3 py-2 text-right ${
                  atLimit ? "border-red-500/40 bg-red-500/10" : filesUsed >= filesMax - 1 ? "border-yellow-500/40 bg-yellow-500/10" : "border-white/10 bg-white/[0.03]"
                }`}>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Dosare / Limită</p>
                  <p className={`text-lg font-bold ${atLimit ? "text-red-400" : filesUsed >= filesMax - 1 ? "text-yellow-400" : "text-white"}`}>
                    {filesUsed}<span className="text-slate-600 text-sm font-normal">/{filesMax}</span>
                  </p>
                </div>
              </div>

              {/* Banner limită atinsă */}
              {atLimit && (
                <div className="mb-5 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 flex items-start gap-3">
                  <span className="text-xl shrink-0">⛔</span>
                  <div>
                    <p className="text-sm font-semibold text-red-300">Limita de dosare a fost atinsă</p>
                    <p className="text-xs text-red-400/80 mt-0.5">
                      Pachetul <strong>Trial</strong> permite maximum <strong>{filesMax} dosare</strong>.
                      Șterge un dosar existent sau contactează administratorul pentru upgrade.
                    </p>
                  </div>
                </div>
              )}

              {/* Avertizare aproape de limită */}
              {!atLimit && filesUsed >= filesMax - 1 && (
                <div className="mb-5 rounded-xl border border-yellow-500/30 bg-yellow-500/8 px-4 py-3 flex items-start gap-3">
                  <span className="text-xl shrink-0">⚠️</span>
                  <p className="text-xs text-yellow-300">
                    Atenție: mai ai un singur dosar disponibil în pachetul Trial.
                  </p>
                </div>
              )}

              <form onSubmit={handleUpload} className="space-y-5">

                {/* Rând 1: Asociatie + Calendar */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Asociatie */}
                  <div>
                    <label className="block text-xs text-slate-400 uppercase tracking-wider mb-2">Asociație *</label>
                    <input
                      type="text" value={assocName} onChange={e => setAssocName(e.target.value)}
                      placeholder="ex: Bloc 12 Sc. B — Str. Mihai Eminescu"
                      className="w-full rounded-xl border border-white/10 bg-[#0d0d1a] px-4 py-3 text-white text-sm placeholder-slate-600 outline-none focus:border-violet-500 transition" />
                  </div>

                  {/* Calendar luna + an */}
                  <div>
                    <label className="block text-xs text-slate-400 uppercase tracking-wider mb-2">Perioada verificată *</label>
                    <div className="flex gap-2">
                      <select value={uploadMonth} onChange={e => setUploadMonth(e.target.value)}
                        className="flex-1 rounded-xl border border-white/10 bg-[#0d0d1a] px-3 py-3 text-white text-sm outline-none focus:border-violet-500 transition appearance-none">
                        <option value="">Luna...</option>
                        {MONTHS_RO.map(m => <option key={m.val} value={m.val}>{m.name}</option>)}
                      </select>
                      <select value={uploadYear} onChange={e => setUploadYear(e.target.value)}
                        className="w-28 rounded-xl border border-white/10 bg-[#0d0d1a] px-3 py-3 text-white text-sm outline-none focus:border-violet-500 transition appearance-none">
                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Sub-tabs: Fisiere / ZIP */}
                <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/8 w-fit">
                  {[
                    { key: "fisiere" as const, label: "📄 Fișiere individuale" },
                    { key: "zip" as const, label: "📦 Arhivă ZIP" },
                  ].map(t => (
                    <button key={t.key} type="button" onClick={() => setUploadSubTab(t.key)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        uploadSubTab === t.key ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"
                      }`}>
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* TAB: Fisiere individuale */}
                {uploadSubTab === "fisiere" && (
                  <div className="space-y-2.5">
                    {/* Documente fixe (fara facturi) */}
                    {uploadFiles.map((uf, idx) => (
                      <div key={uf.type} className="flex items-center gap-3">
                        <div className="w-48 shrink-0 flex items-center gap-1.5">
                          <span className={`text-xs ${uf.required ? "text-red-400" : "text-slate-600"}`}>
                            {uf.required ? "●" : "○"}
                          </span>
                          <span className="text-sm text-slate-300">{uf.label}</span>
                          {uf.required && <span className="text-red-400 text-xs">*</span>}
                        </div>
                        <label className={`flex-1 flex items-center gap-2.5 rounded-xl border px-4 py-2.5 cursor-pointer transition text-sm ${
                          uf.file ? "border-emerald-500/40 bg-emerald-500/8 text-emerald-300" : "border-white/8 bg-white/[0.03] text-slate-500 hover:border-violet-500/40 hover:text-slate-300"
                        }`}>
                          <span>{uf.file ? "✅" : "📄"}</span>
                          <span className="truncate flex-1">{uf.file ? uf.file.name : "Alege fișier..."}</span>
                          {uf.file && <button type="button" onClick={e => { e.preventDefault(); setUploadFiles(p => p.map((f,i)=>i===idx?{...f,file:null}:f)); }} className="text-slate-500 hover:text-red-400 transition ml-1">✕</button>}
                          <input type="file" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx" className="hidden"
                            onChange={e => { const file = e.target.files?.[0]||null; setUploadFiles(p=>p.map((f,i)=>i===idx?{...f,file}:f)); }} />
                        </label>
                      </div>
                    ))}

                    {/* Facturi — multiple */}
                    <div className="mt-1">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-xs text-red-400">●</span>
                        <span className="text-sm text-slate-300">Facturi furnizori</span>
                        <span className="text-red-400 text-xs">*</span>
                        <span className="text-xs text-slate-600 ml-1">(selectează una sau mai multe deodată)</span>
                      </div>
                      {/* Fișiere selectate deja */}
                      {invoiceFiles.length > 0 && (
                        <div className="space-y-1.5 mb-2">
                          {invoiceFiles.map((file, idx) => (
                            <div key={idx} className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/8 px-3 py-2.5">
                              <span className="text-base">🧾</span>
                              <span className="text-sm text-emerald-300 flex-1 truncate">{file.name}</span>
                              <span className="text-xs text-emerald-600 shrink-0">{Math.round(file.size / 1024)} KB</span>
                              <button type="button" onClick={() => setInvoiceFiles(p => p.filter((_, i) => i !== idx))}
                                className="text-slate-500 hover:text-red-400 transition ml-1 text-sm">✕</button>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Buton selectare (multiple) */}
                      <label className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition text-sm w-full ${
                        invoiceFiles.length > 0
                          ? "border-violet-500/30 bg-violet-500/5 text-violet-300 hover:bg-violet-500/10"
                          : "border-white/8 bg-white/[0.03] text-slate-500 hover:border-violet-500/40 hover:text-slate-300"
                      }`}>
                        <span>📁</span>
                        <span className="flex-1">{invoiceFiles.length > 0 ? `+ Adaugă mai multe facturi` : "Selectează facturi (una sau mai multe)"}</span>
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls" multiple className="hidden"
                          onChange={e => {
                            const files = Array.from(e.target.files || []);
                            if (files.length > 0) setInvoiceFiles(p => [...p, ...files]);
                            e.target.value = "";
                          }} />
                      </label>
                    </div>

                    {/* Bara progres documente (verde → rosu) */}
                    <div className="mt-4 pt-4 border-t border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-500">Documente pregătite</span>
                        <span className="text-xs font-semibold" style={{ color: `hsl(${barHue},75%,55%)` }}>
                          {docsFilled}/{docsMax}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${barPct}%`, background: `hsl(${barHue},75%,50%)`, boxShadow: `0 0 8px hsl(${barHue},75%,40%)` }} />
                      </div>
                      <div className="flex justify-between mt-1">
                        {[...Array(docsMax)].map((_, i) => (
                          <span key={i} className="text-[10px]" style={{ color: i < docsFilled ? `hsl(${Math.round(120-(i/(docsMax-1))*120)},75%,55%)` : "rgba(255,255,255,0.1)" }}>▐</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB: Arhiva ZIP */}
                {uploadSubTab === "zip" && (
                  <div className="space-y-4">
                    {/* Drop zone */}
                    <label className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 cursor-pointer transition ${
                      zipFile ? "border-emerald-500/40 bg-emerald-500/5" : "border-white/15 hover:border-violet-500/50 hover:bg-violet-500/5"
                    }`}>
                      <div className="text-4xl">{zipFile ? "📦" : "⬆️"}</div>
                      {zipFile ? (
                        <div className="text-center">
                          <p className="font-medium text-emerald-300">{zipFile.name}</p>
                          <p className="text-xs text-slate-400 mt-1">{Math.round(zipFile.size / 1024)} KB · {zipExtracted.length} fișiere detectate</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <p className="text-slate-300 font-medium">Trage ZIP-ul aici sau apasă să alegi</p>
                          <p className="text-xs text-slate-500 mt-1">Acceptăm arhive .zip cu PDF-uri, imagini și Excel</p>
                        </div>
                      )}
                      <input type="file" accept=".zip" className="hidden"
                        onChange={e => { const f=e.target.files?.[0]; if(f) handleZipChange(f); }} />
                    </label>

                    {zipLoading && (
                      <div className="flex items-center gap-2 text-sm text-violet-300">
                        <span className="w-4 h-4 rounded-full border-2 border-violet-300/30 border-t-violet-300 animate-spin"/>
                        Se extrage arhiva...
                      </div>
                    )}

                    {/* Lista fisiere extrase */}
                    {zipExtracted.length > 0 && (
                      <div className="rounded-xl border border-white/8 bg-white/[0.02] overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-white/5 bg-white/[0.03]">
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fișiere detectate în ZIP</p>
                        </div>
                        {zipExtracted.map((z, i) => {
                          const entry = ZIP_TYPE_MAP.find(m => m.type === z.assignedType);
                          return (
                            <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-white/5 last:border-0">
                              <span className="text-base">📄</span>
                              <span className="text-sm text-slate-300 flex-1 truncate">{z.name}</span>
                              <select value={z.assignedType} onChange={e => setZipExtracted(p=>p.map((x,xi)=>xi===i?{...x,assignedType:e.target.value}:x))}
                                className="rounded-lg border border-white/10 bg-[#0d0d1a] px-2 py-1 text-xs text-white outline-none focus:border-violet-500">
                                <option value="lista_plata">Lista de plată</option>
                                <option value="explicatii_lista">Explicații listă</option>
                                <option value="distributia_facturilor">Distribuția facturilor</option>
                                <option value="facturi">Facturi furnizori</option>
                                <option value="extras_cont">Extras cont bancar</option>
                                <option value="altele">Altele</option>
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Structura asteptata */}
                    {!zipFile && (
                      <div className="rounded-xl border border-violet-500/15 bg-violet-500/5 p-4">
                        <p className="text-xs font-semibold text-violet-300 mb-2">Structura recomandată în ZIP</p>
                        <div className="space-y-1">
                          {[
                            "lista_plata.pdf",
                            "explicatii_lista.pdf",
                            "distributia_facturilor.pdf",
                            "facturi.pdf",
                            "extras_cont.pdf (opțional)",
                          ].map(f => (
                            <div key={f} className="flex items-center gap-2 text-xs text-slate-400">
                              <span className="text-slate-600">📄</span> {f}
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-slate-600 mt-2">Fișierele sunt mapate automat pe baza numelui. Poți corecta manual dacă e nevoie.</p>
                      </div>
                    )}
                  </div>
                )}

                {uploadMsg && (
                  <div className={`rounded-xl border px-4 py-3 text-sm ${
                    uploadMsg.startsWith("✓") ? "border-emerald-500/30 bg-emerald-500/8 text-emerald-300"
                    : uploadMsg.startsWith("✗") ? "border-red-500/30 bg-red-500/8 text-red-300"
                    : "border-violet-500/30 bg-violet-500/8 text-violet-300"
                  }`}>
                    {uploadMsg}
                  </div>
                )}

                <button type="submit" disabled={uploading || atLimit}
                  className={`w-full rounded-xl px-6 py-4 font-semibold transition flex items-center justify-center gap-2 ${
                    atLimit
                      ? "bg-red-500/10 border border-red-500/30 text-red-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-[0_0_25px_rgba(124,58,237,0.3)] disabled:opacity-50"
                  }`}>
                  {uploading ? (
                    <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"/>Se analizează...</>
                  ) : atLimit ? (
                    "⛔ Limită atinsă — șterge un dosar sau contactează admin"
                  ) : "🤖 Trimite dosar la analiză AI"}
                </button>
              </form>

              {/* Bara progres analiză — apare DOAR după apăsarea butonului */}
              {uploading && (
                <div className="mt-4 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                  <div className="mb-2">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Se analizează dosar</p>
                    <p className="text-sm font-semibold text-violet-200">{analysisDossierName}</p>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-violet-300">{analysisStep}</span>
                    <span className="text-sm font-bold text-violet-200">{analysisProgress}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-white/8 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700 relative"
                      style={{ width: `${analysisProgress}%`, background: "linear-gradient(90deg,#7c3aed,#06b6d4)" }}>
                      <div className="absolute inset-0 animate-pulse opacity-40 rounded-full"
                        style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent)" }} />
                    </div>
                  </div>
                  <div className="flex justify-between mt-1.5 text-[10px] text-slate-600">
                    <span>Pregătire</span><span>Procesare</span><span>Analiză AI</span><span>Raport</span><span>Complet</span>
                  </div>
                </div>
              )}
            </div>

            {/* Dosarele mele */}
            {documents.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
                <h2 className="text-lg font-semibold mb-4">Dosarele mele</h2>
                <div className="space-y-3">
                  {documents.map((doc: any) => {
                    const isAnalyzing = doc.status === "analyzing";
                    const isError = doc.status === "error";
                    const isConfirmingDelete = confirmDeleteDocId === doc.id;
                    const isDeleting = deletingDocId === doc.id;
                    return (
                      <div key={doc.id} className={`rounded-xl border overflow-hidden transition ${
                        isAnalyzing ? "border-violet-500/25 bg-violet-500/5"
                        : isError ? "border-red-500/25 bg-red-500/5"
                        : "border-white/8 bg-white/[0.02]"
                      }`}>
                        {/* Rândul principal */}
                        <div className="flex items-center gap-3 px-4 py-3">
                          {/* Icon status */}
                          <div className="text-xl shrink-0">
                            {isAnalyzing ? "🔄" : isError ? "❌" : "✅"}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-white truncate">{doc.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {statusBadge(doc.status)}
                              {doc.aiScore !== null && doc.aiScore !== undefined && (
                                <span className={`text-xs font-bold ${doc.aiScore >= 80 ? "text-emerald-400" : doc.aiScore >= 60 ? "text-yellow-400" : "text-red-400"}`}>
                                  {doc.aiScore.toFixed(0)}%
                                </span>
                              )}
                            </div>
                            {doc.aiSummary && !isError && (
                              <p className="text-xs text-slate-400 mt-1">{doc.aiSummary}</p>
                            )}
                            {isError && (
                              <p className="text-xs text-red-400 mt-1">
                                {doc.aiSummary || "Analiza a eșuat — verifică formatul fișierelor și reîncearcă."}
                              </p>
                            )}
                          </div>

                          {/* Buton ștergere */}
                          {!isConfirmingDelete ? (
                            <button type="button"
                              onClick={() => setConfirmDeleteDocId(doc.id)}
                              className="shrink-0 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20 hover:text-red-300 transition font-medium">
                              🗑 Șterge
                            </button>
                          ) : (
                            <div className="shrink-0 flex items-center gap-2">
                              <button type="button" onClick={() => setConfirmDeleteDocId(null)}
                                className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-400 hover:text-white transition">
                                Anulează
                              </button>
                              <button type="button" onClick={() => deleteDocument(doc.id)} disabled={isDeleting}
                                className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-500 transition disabled:opacity-50 flex items-center gap-1">
                                {isDeleting
                                  ? <><span className="w-3 h-3 rounded-full border border-white/30 border-t-white animate-spin"/>...</>
                                  : "Confirmă"}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Bara analiză în curs */}
                        {isAnalyzing && (
                          <div className="px-4 pb-3">
                            <div className="h-1 rounded-full bg-white/8 overflow-hidden">
                              <div className="h-full rounded-full animate-pulse" style={{ width: "70%", background: "linear-gradient(90deg,#7c3aed,#06b6d4)" }} />
                            </div>
                            <p className="text-[11px] text-violet-400 mt-1">Reîncarcă pagina pentru a vedea rezultatul</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          );
        })()}

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
