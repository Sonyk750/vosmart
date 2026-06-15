"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";

interface Report {
  id: string; title: string; month: string | null; year: number | null;
  status: string; fileUrl: string | null; aiDraft: string | null; createdAt: string;
}
interface Document {
  id: string; title: string; type: string; fileName: string;
  status: string; createdAt: string;
}
interface AnalysisStatus {
  id: string; title: string; status: string; aiScore: number | null;
}
interface User {
  id: string; name: string | null; email: string; role: string;
  association: { id: string; name: string; package: string; cui: string | null; address: string | null; maxDocuments: number; filesUploadedCount: number; } | null;
}

// Tipurile de documente obligatorii

const DOC_TYPES = [
  { key: "lista_plata", label: "Listă de plată", required: true, multiple: false, multiSelect: false, description: "Lista de plată lunară a cheltuielilor" },
  { key: "explicatii_lista", label: "Explicațiile listei de plată", required: true, multiple: false, multiSelect: false, description: "Anexa cu explicațiile cheltuielilor" },
  { key: "distributia_facturilor", label: "Distribuirea facturilor în listă", required: true, multiple: false, multiSelect: false, description: "Modul de distribuire a facturilor pe apartamente" },
  { key: "facturi", label: "Facturi introduse în listă", required: true, multiple: true, multiSelect: true, description: "Toate facturile introduse în lista de plată (poți selecta mai multe odată)" },
  { key: "registru_casa", label: "Registru casă", required: false, multiple: false, multiSelect: false, description: "Registrul de casă pentru perioada verificată" },
  { key: "registru_banca", label: "Registru bancă", required: false, multiple: true, multiSelect: false, description: "Registrul de bancă (dacă sunt mai multe conturi, adaugă câte unul pentru fiecare)" },
  { key: "registru_jurnal", label: "Registru jurnal", required: false, multiple: false, multiSelect: false, description: "Registrul jurnal contabil" },
  { key: "situatie_activ_pasiv", label: "Situația activ/pasiv", required: false, multiple: false, multiSelect: false, description: "Situația elementelor de activ și pasiv" },
  { key: "extras_cont", label: "Extras de cont", required: false, multiple: true, multiSelect: false, description: "Extrasele de cont bancar (adaugă câte unul per cont)" },
  { key: "fond_rulment", label: "Registru fond rulment", required: false, multiple: false, multiSelect: false, description: "Registrul fondului de rulment" },
  { key: "fond_reparatii", label: "Registru fond reparații", required: false, multiple: false, multiSelect: false, description: "Registrul fondului de reparații" },
  { key: "alte_fonduri", label: "Alte fonduri", required: false, multiple: true, multiSelect: false, description: "Registre pentru alte fonduri (adaugă câte unul per fond)" },
  { key: "fond_penalitati", label: "Registru fond penalități", required: false, multiple: false, multiSelect: false, description: "Registrul fondului de penalități" },
  { key: "citiri_apometre", label: "Citiri apometre", required: false, multiple: false, multiSelect: false, description: "Citirile apometrelor individuale" },
];

interface DocFile {
  type: string;
  label: string;
  file: File;
  period: string;
  index: number;
}

let fileCounter = 0;

export default function DashboardClient({ user }: { user: User }) {
  const [tab, setTab] = useState<"rapoarte" | "documente" | "upload">("rapoarte");
  const [reports, setReports] = useState<Report[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [uploadProgress, setUploadProgress] = useState("");
  const [docFiles, setDocFiles] = useState<DocFile[]>([]);
  const [periodMonth, setPeriodMonth] = useState("");
  const [periodYear, setPeriodYear] = useState(new Date().getFullYear().toString());
  const period = periodMonth && periodYear ? `${periodYear}-${periodMonth}` : "";
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [analyzingDocs, setAnalyzingDocs] = useState<AnalysisStatus[]>([]);
  const [fakeProgress, setFakeProgress] = useState(0);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (tab === "rapoarte") fetchReports();
    if (tab === "documente") fetchDocuments();
  }, [tab]);

  // Polling real-time pentru documente în analiză
  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/dashboard/status");
        if (!res.ok) return;
        const data: AnalysisStatus[] = await res.json();
        setAnalyzingDocs(data);

        const stillAnalyzing = data.some(d => d.status === "analyzing");
        if (!stillAnalyzing && data.length > 0) {
          setFakeProgress(100);
          stopPolling();
          setTimeout(() => {
            fetchDocuments();
            fetchReports();
            setFakeProgress(0);
            setAnalyzingDocs([]);
          }, 1500);
        }
      } catch {}
    }, 3000);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    if (progressRef.current) { clearInterval(progressRef.current); progressRef.current = null; }
  }, []);

  // Progres animat fals (0→90% în 30s, se oprește la 90 până vine răspunsul real)
  const startFakeProgress = useCallback(() => {
    setFakeProgress(5);
    let current = 5;
    progressRef.current = setInterval(() => {
      current += Math.random() * 4 + 1;
      if (current >= 90) { current = 90; if (progressRef.current) clearInterval(progressRef.current); }
      setFakeProgress(Math.min(90, current));
    }, 1500);
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  async function fetchReports() {
    const res = await fetch("/api/dashboard/reports");
    if (res.ok) setReports(await res.json());
  }
  async function fetchDocuments() {
    const res = await fetch("/api/dashboard/documents");
    if (res.ok) {
      const docs = await res.json();
      setDocuments(docs);
      // Dacă există documente în analiză, pornim polling automat
      const hasAnalyzing = docs.some((d: Document) => d.status === "analyzing");
      if (hasAnalyzing) {
        startFakeProgress();
        startPolling();
      }
    }
  }

  function addFile(type: string, label: string, file: File) {
    setDocFiles(prev => [...prev, { type, label, file, period, index: ++fileCounter }]);
  }

  function removeFile(index: number) {
    setDocFiles(prev => prev.filter(f => f.index !== index));
  }

  function getFilesForType(type: string) {
    return docFiles.filter(f => f.type === type);
  }

  const requiredTypes = DOC_TYPES.filter(d => d.required).map(d => d.key);
  const hasAllRequired = requiredTypes.every(type => docFiles.some(f => f.type === type));

  // Extrage text din PDF folosind PDF.js în browser (gratuit, fără API)
  async function extractPdfTextInBrowser(file: File): Promise<string> {
    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item: any) => item.str).join(" ");
        fullText += pageText + "\n";
      }
      return fullText.trim().slice(0, 8000);
    } catch {
      return "";
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!hasAllRequired || !period) return;
    setUploading(true);
    setUploadMsg("");

    try {
      // Extragem textul din PDF-uri în browser înainte de upload (gratuit)
      setUploadProgress("Se extrage textul din documente...");
      const extractedTexts: string[] = [];
      for (const df of docFiles) {
        if (df.file.type === "application/pdf") {
          const text = await extractPdfTextInBrowser(df.file);
          extractedTexts.push(text);
        } else {
          extractedTexts.push("");
        }
      }

      const form = new FormData();
      form.append("period", period);
      form.append("associationName", user.association?.name || "");
      form.append("cui", user.association?.cui || "");
      form.append("address", user.association?.address || "");

      docFiles.forEach((df, i) => {
        form.append("files", df.file);
        form.append("fileTypes", df.type);
        form.append("fileLabels", df.label);
        form.append("filePeriods", df.period || period);
        form.append("fileTexts", extractedTexts[i] || "");
      });

      setUploadProgress("Se încarcă documentele...");
      const res = await fetch("/api/dashboard/upload-structured", {
        method: "POST",
        body: form,
      });

      const data = await res.json();
      if (res.ok) {
        setUploadMsg("✓ Documentele au fost trimise! AI analizează dosarul...");
        setDocFiles([]);
        setPeriodMonth("");
        setPeriodYear(new Date().getFullYear().toString());
        startFakeProgress();
        startPolling();
        setTimeout(() => { setTab("documente"); setUploadMsg(""); }, 2000);
      } else {
        setUploadMsg("✗ " + (data.error || "Eroare la upload"));
      }
    } catch {
      setUploadMsg("✗ Eroare de conexiune");
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  const statusBadge = (status: string) => {
    const map: Record<string, [string, string]> = {
      published: ["bg-emerald-500/15 text-emerald-300 border border-emerald-500/20", "✓ Publicat"],
      approved: ["bg-cyan-500/15 text-cyan-300 border border-cyan-500/20", "Aprobat"],
      pending_approval: ["bg-yellow-500/15 text-yellow-300 border border-yellow-500/20", "⏳ În verificare"],
      draft: ["bg-slate-500/15 text-slate-300", "Draft"],
      analyzing: ["bg-violet-500/15 text-violet-300 border border-violet-500/20", "🔄 Se analizează..."],
      analyzed: ["bg-cyan-500/15 text-cyan-300", "✓ Analizat"],
      uploaded: ["bg-slate-500/15 text-slate-300", "Încărcat"],
      error: ["bg-red-500/15 text-red-300", "Eroare"],
      dosar_lunar: ["bg-slate-500/15 text-slate-300", "Dosar"],
    };
    const [cls, label] = map[status] || ["bg-slate-500/15 text-slate-300", status];
    const isAnalyzing = status === "analyzing";
    return (
      <span className={`rounded-full px-3 py-1 text-xs font-medium ${cls} ${isAnalyzing ? "animate-pulse" : ""}`}>
        {label}
      </span>
    );
  };

  return (
    <main className="min-h-screen bg-[#050814] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(124,58,237,0.20),transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.12),transparent_40%)]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#050814]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="/">
            <Image src="/logo-vosmart.png" alt="VoSmart" width={110} height={48}
              className="h-auto" style={{ mixBlendMode: "screen", width: "90px" }} />
          </a>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold">{user.name || user.email}</p>
              <p className="text-xs text-slate-400">{user.association?.name}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-medium hidden sm:inline ${user.association?.package === "premium" ? "bg-violet-500/15 text-violet-300" : "bg-cyan-500/15 text-cyan-300"}`}>
              {user.association?.package === "premium" ? "Premium" : "Smart"}
            </span>
            <button onClick={handleLogout}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300 transition hover:bg-white/[0.08]">
              Ieșire
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Bună, {user.name?.split(" ")[0] || "Client"}! 👋</h1>
          <p className="text-slate-400 mt-1">Dashboard — {user.association?.name}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            ["📋", "Rapoarte", reports.length.toString()],
            ["📁", "Dosare trimise", documents.length.toString()],
            ["✅", "Rapoarte publicate", reports.filter(r => r.status === "published").length.toString()],
            ["⏳", "În verificare", reports.filter(r => r.status === "pending_approval" || r.status === "draft").length.toString()],
          ].map(([icon, label, value]) => (
            <div key={label} className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
              <div className="text-2xl mb-2">{icon}</div>
              <div className="text-2xl font-bold">{value}</div>
              <div className="text-xs text-slate-500 mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Limită documente */}
        {user.association && (() => {
          const used = user.association.filesUploadedCount;
          const max = user.association.maxDocuments;
          const percent = max > 0 ? Math.min(100, (used / max) * 100) : 0;
          const barColor = percent >= 90 ? "bg-red-500" : percent >= 70 ? "bg-yellow-500" : "bg-emerald-500";
          return (
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-300">📄 Documente încărcate</span>
                <span className="text-sm text-slate-400">{used} / {max}</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })()}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-white/5 pb-1 flex-wrap">
          {[
            { key: "rapoarte", label: "📋 Rapoartele mele" },
            { key: "documente", label: "📁 Dosare trimise" },
            { key: "upload", label: "⬆️ Trimite dosar lunar" },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition ${tab === t.key ? "bg-violet-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.3)]" : "text-slate-400 hover:text-white hover:bg-white/[0.05]"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* RAPOARTE */}
        {tab === "rapoarte" && (
          <div className="space-y-4">
            {reports.length === 0 ? (
              <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-12 text-center">
                <div className="text-5xl mb-4">📋</div>
                <p className="text-slate-300 font-medium">Nu există rapoarte încă</p>
                <p className="text-sm text-slate-500 mt-2">Rapoartele vor apărea după ce trimiteți dosarul lunar și cenzorul îl aprobă.</p>
                <button onClick={() => setTab("upload")}
                  className="mt-6 rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-semibold transition hover:bg-violet-500">
                  Trimite primul dosar →
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map(r => (
                  <div key={r.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-6">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <h3 className="font-semibold">{r.title}</h3>
                        <p className="text-sm text-slate-400 mt-1">
                          {r.month && r.year ? `${r.month} ${r.year}` : new Date(r.createdAt).toLocaleDateString("ro-RO")}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        {statusBadge(r.status)}
                        {r.status === "published" && (
                          <button onClick={() => setSelectedReport(selectedReport?.id === r.id ? null : r)}
                            className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-cyan-400">
                            {selectedReport?.id === r.id ? "Închide" : "Vezi raportul"}
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Raport expandat */}
                    {selectedReport?.id === r.id && r.aiDraft && (
                      <div className="mt-6 border-t border-white/5 pt-6">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
                          <pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
                            {r.aiDraft}
                          </pre>
                        </div>
                        <button
                          onClick={() => {
                            const blob = new Blob([r.aiDraft!], { type: "text/plain" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `Raport_cenzor_${r.month}_${r.year}.txt`;
                            a.click();
                          }}
                          className="mt-4 rounded-xl bg-cyan-500 px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-cyan-400">
                          ⬇️ Descarcă raportul
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DOSARE TRIMISE */}
        {tab === "documente" && (
          <div className="space-y-4">
            {/* Banner analiză în curs */}
            {analyzingDocs.some(d => d.status === "analyzing") && (
              <div className="rounded-2xl border border-violet-500/30 bg-violet-500/8 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <svg className="animate-spin h-5 w-5 text-violet-400 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-violet-300">AI analizează documentele tale</p>
                    <p className="text-xs text-slate-400 mt-0.5">Pagina se actualizează automat — nu e nevoie de refresh</p>
                  </div>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-2.5 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-1000"
                    style={{ width: `${fakeProgress}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1.5 text-xs text-slate-500">
                  <span>Analiză în curs...</span>
                  <span>{Math.round(fakeProgress)}%</span>
                </div>
              </div>
            )}

            {/* Completat recent */}
            {analyzingDocs.some(d => d.status === "analyzed") && !analyzingDocs.some(d => d.status === "analyzing") && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/8 p-4 flex items-center gap-3">
                <span className="text-emerald-400 text-xl">✓</span>
                <div>
                  <p className="text-sm font-semibold text-emerald-300">Analiză finalizată!</p>
                  <p className="text-xs text-slate-400">Documentele au fost procesate. Cenzorul va revizui și publica raportul.</p>
                </div>
              </div>
            )}
            {documents.length === 0 ? (
              <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-12 text-center">
                <div className="text-5xl mb-4">📁</div>
                <p className="text-slate-300 font-medium">Nu ai trimis dosare încă</p>
                <button onClick={() => setTab("upload")}
                  className="mt-4 rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-semibold transition hover:bg-violet-500">
                  Trimite primul dosar
                </button>
              </div>
            ) : documents.map(d => (
              <div key={d.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold">{d.title}</h3>
                  <p className="text-sm text-slate-400 mt-0.5">{new Date(d.createdAt).toLocaleDateString("ro-RO")}</p>
                </div>
                {statusBadge(d.status)}
              </div>
            ))}
          </div>
        )}

        {/* UPLOAD DOSAR */}
        {tab === "upload" && (
          <div className="max-w-3xl">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
              <h2 className="text-xl font-semibold mb-1">Trimite dosar lunar pentru verificare</h2>
              <p className="text-sm text-slate-400 mb-6">
                Completează toate documentele obligatorii (marcate cu <span className="text-red-400">*</span>) pentru ca cenzorul să poată verifica și emite raportul.
              </p>

              <form onSubmit={handleUpload} className="space-y-6">
                {/* Perioada */}
                <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
                  <label className="block text-sm font-semibold text-violet-300 mb-3">
                    Luna și anul pentru care se face verificarea <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 mb-1.5 block">Luna</label>
                      <select
                        value={periodMonth}
                        onChange={e => setPeriodMonth(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-violet-500 transition cursor-pointer"
                        style={{ colorScheme: "dark" }}
                      >
                        <option value="" style={{ background: "#1a1a2e" }}>Selectează luna</option>
                        {["Ianuarie","Februarie","Martie","Aprilie","Mai","Iunie","Iulie","August","Septembrie","Octombrie","Noiembrie","Decembrie"].map((m, i) => (
                          <option key={m} value={String(i + 1).padStart(2, "0")} style={{ background: "#1a1a2e" }}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1.5 block">Anul</label>
                      <select
                        value={periodYear}
                        onChange={e => setPeriodYear(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-violet-500 transition cursor-pointer"
                        style={{ colorScheme: "dark" }}
                      >
                        {[2024,2025,2026,2027].map(y => (
                          <option key={y} value={y.toString()} style={{ background: "#1a1a2e" }}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {period && (
                    <p className="text-xs text-violet-300 mt-2">
                      ✓ Verificare pentru: {["Ianuarie","Februarie","Martie","Aprilie","Mai","Iunie","Iulie","August","Septembrie","Octombrie","Noiembrie","Decembrie"][parseInt(periodMonth)-1]} {periodYear}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 mt-1.5">Ex: dacă trimiți lista de plată pentru Aprilie 2026, alege Aprilie 2026</p>
                </div>

                {/* Documente obligatorii */}
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                    <span className="text-red-400">*</span> Documente obligatorii
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">Fără aceste documente raportul nu poate fi emis conform legii</p>
                  <div className="space-y-3">
                    {DOC_TYPES.filter(d => d.required).map(docType => (
                      <DocUploadRow
                        key={docType.key}
                        docType={docType}
                        files={getFilesForType(docType.key)}
                        period={period}
                        onAdd={addFile}
                        onRemove={removeFile}
                        required={true}
                      />
                    ))}
                  </div>
                </div>

                {/* Documente suplimentare */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-300 mb-1">Documente suplimentare</h3>
                  <p className="text-xs text-slate-500 mb-4">Recomandate pentru o verificare completă și un raport mai detaliat</p>
                  <div className="space-y-3">
                    {DOC_TYPES.filter(d => !d.required).map(docType => (
                      <DocUploadRow
                        key={docType.key}
                        docType={docType}
                        files={getFilesForType(docType.key)}
                        period={period}
                        onAdd={addFile}
                        onRemove={removeFile}
                        required={false}
                      />
                    ))}
                  </div>
                </div>

                {/* Sumar */}
                {docFiles.length > 0 && (
                  <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                    <p className="text-sm font-semibold text-cyan-300 mb-2">Documente selectate ({docFiles.length}):</p>
                    <div className="space-y-1">
                      {docFiles.map(f => (
                        <div key={f.index} className="flex items-center justify-between text-xs text-slate-300">
                          <span>✓ {f.label} — {f.file.name}</span>
                          <button type="button" onClick={() => removeFile(f.index)} className="text-red-400 hover:text-red-300 ml-2">✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!hasAllRequired && docFiles.length > 0 && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/8 p-4 text-sm text-red-300">
                    ⚠️ Lipsesc documente obligatorii: {requiredTypes.filter(t => !docFiles.some(f => f.type === t)).map(t => DOC_TYPES.find(d => d.key === t)?.label).join(", ")}
                  </div>
                )}

                {uploadMsg && (
                  <div className={`rounded-xl border px-4 py-3 text-sm ${uploadMsg.startsWith("✓") ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-red-500/30 bg-red-500/10 text-red-300"}`}>
                    {uploadMsg}
                  </div>
                )}

                {uploadProgress && (
                  <p className="text-sm text-violet-300 animate-pulse">{uploadProgress}</p>
                )}

                <button
                  type="submit"
                  disabled={uploading || !hasAllRequired || !period}
                  className="w-full rounded-xl bg-violet-600 px-6 py-4 font-semibold transition hover:bg-violet-500 shadow-[0_0_25px_rgba(124,58,237,0.35)] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {uploading ? "Se trimite dosarul..." : "Trimite dosarul pentru verificare →"}
                </button>

                {!hasAllRequired && (
                  <p className="text-center text-xs text-slate-500">Completează toate documentele obligatorii pentru a putea trimite</p>
                )}
              </form>
            </div>

            {/* Info box */}
            <div className="mt-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5">
              <p className="text-sm font-semibold text-cyan-300 mb-3">📋 Cum funcționează verificarea?</p>
              <div className="space-y-2 text-xs text-slate-400">
                <p>1. Trimiți documentele pentru luna dorită (lista de plată, facturi, etc.)</p>
                <p>2. AI-ul analizează și corelează toate documentele între ele</p>
                <p>3. Se verifică dacă fiecare factură apare corect în lista de plată, explicații și distribuție</p>
                <p>4. Se generează un draft de raport de cenzor conform Legii 196/2018</p>
                <p>5. Cenzorul nostru verifică și aprobă raportul final</p>
                <p>6. Raportul apare în secțiunea <strong className="text-white">Rapoartele mele</strong>, gata de descărcat</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// Componentă pentru un rând de upload document
function DocUploadRow({
  docType, files, period, onAdd, onRemove, required
}: {
  docType: typeof DOC_TYPES[0];
  files: { type: string; label: string; file: File; period: string; index: number }[];
  period: string;
  onAdd: (type: string, label: string, file: File) => void;
  onRemove: (index: number) => void;
  required: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasFile = files.length > 0;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    if (docType.multiSelect) {
      // Facturi — adaugă toate fișierele selectate odată
      selectedFiles.forEach(file => {
        onAdd(docType.key, docType.label, file);
      });
    } else {
      // Un singur fișier (sau + per click pentru multiple)
      const file = selectedFiles[0];
      if (!docType.multiple) {
        files.forEach(f => onRemove(f.index));
      }
      onAdd(docType.key, docType.label, file);
    }
    e.target.value = "";
  }

  return (
    <div className={`rounded-2xl border p-4 transition ${hasFile ? "border-emerald-500/25 bg-emerald-500/5" : required ? "border-white/10 bg-white/[0.02] hover:border-violet-500/30" : "border-white/8 bg-white/[0.02] hover:border-white/15"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-white">
              {docType.label}
              {required && <span className="text-red-400 ml-1">*</span>}
            </span>
            {hasFile && <span className="text-emerald-400 text-xs font-medium">✓ {files.length} {files.length === 1 ? "fișier" : "fișiere"}</span>}
            {docType.multiSelect && (
              <span className="text-xs text-violet-400 bg-violet-500/10 rounded-full px-2 py-0.5">selecție multiplă</span>
            )}
            {docType.multiple && !docType.multiSelect && (
              <span className="text-xs text-cyan-400 bg-cyan-500/10 rounded-full px-2 py-0.5">+ mai multe</span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{docType.description}</p>

          {/* Fișierele adăugate */}
          {files.length > 0 && (
            <div className="mt-2 space-y-1">
              {files.map(f => (
                <div key={f.index} className="flex items-center gap-2 text-xs text-slate-300">
                  <span className="truncate max-w-[220px]">📎 {f.file.name}</span>
                  <button type="button" onClick={() => onRemove(f.index)}
                    className="text-red-400 hover:text-red-300 flex-shrink-0 ml-1">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={!period}
          className={`flex-shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition whitespace-nowrap
            ${!period ? "bg-white/5 text-slate-600 cursor-not-allowed" :
              hasFile && !docType.multiple && !docType.multiSelect ? "bg-white/10 text-slate-300 hover:bg-white/15" :
              "bg-violet-600/80 text-white hover:bg-violet-600"}`}
        >
          {!period ? "Alege luna mai întâi" :
           docType.multiSelect ? "📂 Selectează facturi" :
           docType.multiple ? "+ Adaugă" :
           hasFile ? "Înlocuiește" : "Selectează"}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        multiple={docType.multiSelect}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
        onChange={handleChange}
      />
    </div>
  );
}
