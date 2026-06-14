"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";

interface Document {
  id: string; title: string; type: string; fileName: string;
  status: string; aiScore: number | null; aiFindings: string | null;
  aiSummary: string | null; month: string | null; year: number | null; createdAt: string;
}
interface Report {
  id: string; title: string; status: string; aiDraft: string | null;
  month: string | null; year: number | null; createdAt: string;
}
interface Association {
  id: string; name: string; package: string; cui: string | null; address: string | null; phone: string | null;
  user: { name: string | null; email: string };
  documents: Document[];
  reports: Report[];
}

export default function ClientDetailAdmin({ association, adminUser }: {
  association: Association;
  adminUser: { id: string; name: string | null; email: string; role: string };
}) {
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [draftText, setDraftText] = useState("");
  const [draftHtml, setDraftHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [draftProgress, setDraftProgress] = useState(0);
  const progressRef = useRef<NodeJS.Timeout | null>(null);

  function startDraftProgress() {
    setDraftProgress(5);
    let current = 5;
    progressRef.current = setInterval(() => {
      current += Math.random() * 5 + 2;
      if (current >= 90) { current = 90; if (progressRef.current) clearInterval(progressRef.current); }
      setDraftProgress(Math.min(90, current));
    }, 800);
  }

  function stopDraftProgress(success: boolean) {
    if (progressRef.current) { clearInterval(progressRef.current); progressRef.current = null; }
    setDraftProgress(success ? 100 : 0);
    if (success) setTimeout(() => setDraftProgress(0), 1500);
  }

  useEffect(() => () => { if (progressRef.current) clearInterval(progressRef.current); }, []);

  async function loadDraft(doc: Document) {
    setLoading(true);
    setMsg("");
    setSelectedDoc(doc);
    setDraftText("");
    const res = await fetch(`/api/admin/reports/draft?documentId=${doc.id}`);
    if (res.ok) {
      const data = await res.json();
      if (data.draft) setDraftText(data.draft);
    }
    setLoading(false);
  }

  async function generateDraft(doc: Document) {
    setLoading(true);
    setMsg("");
    setDraftText("");
    setDraftHtml("");
    startDraftProgress();
    const res = await fetch("/api/admin/reports/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: doc.id, forceNew: true }),
    });
    const data = await res.json();
    if (res.ok) {
      stopDraftProgress(true);
      // Arătăm un rezumat lizibil în textarea, nu JSON brut
      const rd = data.reportData;
      const summary = rd ? `RAPORT DE CENZOR — ${rd.association?.name || ""}
Perioada: ${rd.association?.period || ""}
Scor: ${rd.score || 0}% — ${rd.score_label || ""}

CONSTATĂRI (${(rd.findings||[]).length}):
${(rd.findings||[]).map((f: any, i: number) => `${i+1}. ${f.title}: ${f.description}`).join("\n")}

RECOMANDĂRI:
${(rd.recommendations||[]).map((r: string, i: number) => `${i+1}. ${r}`).join("\n")}

CONCLUZIE:
${rd.conclusion || ""}` : (data.draft || "Draft generat");
      setDraftText(summary);
      if (data.html) setDraftHtml(data.html);
      setMsg("✓ Draft generat");
    } else {
      stopDraftProgress(false);
      setMsg("✗ " + (data.error || "Eroare"));
    }
    setLoading(false);
  }

  async function publishDraft(doc: Document) {
    if (!draftText) return;
    setLoading(true);
    const res = await fetch("/api/admin/reports/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: doc.id, draft: draftText, associationId: association.id }),
    });
    if (res.ok) {
      setMsg("✓ Raport publicat! Clientul îl poate vedea acum.");
      window.location.reload();
    } else {
      const data = await res.json();
      setMsg("✗ " + (data.error || "Eroare"));
    }
    setLoading(false);
  }

  function downloadPdf(text: string, doc: Document) {
    const htmlContent = draftHtml || `<!DOCTYPE html>
<html lang="ro"><head><meta charset="UTF-8"><title>Raport Cenzor</title>
<style>body{font-family:Arial,sans-serif;font-size:12pt;line-height:1.6;margin:2cm;color:#000;}pre{white-space:pre-wrap;font-family:Arial,sans-serif;}</style>
</head><body><pre>${text.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</pre></body></html>`;
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (win) win.onload = () => setTimeout(() => win.print(), 800);
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  }

  const statusBadge = (status: string) => {
    const map: Record<string, [string, string]> = {
      published: ["bg-emerald-500/15 text-emerald-300", "Publicat"],
      draft: ["bg-slate-500/15 text-slate-300", "Draft"],
      analyzing: ["bg-violet-500/15 text-violet-300 animate-pulse", "Se analizează"],
      analyzed: ["bg-cyan-500/15 text-cyan-300", "Analizat"],
      uploaded: ["bg-slate-500/15 text-slate-300", "Încărcat"],
      error: ["bg-red-500/15 text-red-300", "Eroare"],
      pending_approval: ["bg-yellow-500/15 text-yellow-300", "Așteaptă"],
    };
    const [cls, label] = map[status] || ["bg-slate-500/15 text-slate-300", status];
    return <span className={`rounded-full px-3 py-1 text-xs font-medium ${cls}`}>{label}</span>;
  };

  return (
    <main className="min-h-screen bg-[#050814] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(124,58,237,0.20),transparent_40%)]" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#050814]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <a href="/admin" className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300 transition hover:bg-white/[0.08]">
              ← Înapoi
            </a>
            <Image src="/logo-vosmart.png" alt="VoSmart" width={80} height={35}
              className="h-auto hidden sm:block" style={{ mixBlendMode: "screen", width: "65px" }} />
          </div>
          <div className="flex items-center gap-3">
            <a href="/" className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300 transition hover:bg-white/[0.08]">← Site</a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6">
        {/* Header asociatie */}
        <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold">{association.name}</h1>
              <p className="text-slate-400 mt-1">{association.user.email}</p>
              {association.cui && <p className="text-sm text-slate-500 mt-0.5">CUI: {association.cui}</p>}
              {association.address && <p className="text-sm text-slate-500 mt-0.5">📍 {association.address}</p>}
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`rounded-full px-4 py-1.5 text-sm font-medium ${association.package === "premium" ? "bg-violet-500/15 text-violet-300" : "bg-cyan-500/15 text-cyan-300"}`}>
                {association.package === "premium" ? "Premium" : "Smart"}
              </span>
              <div className="flex gap-3 text-sm text-slate-400">
                <span>📁 {association.documents.length} doc.</span>
                <span>📋 {association.reports.length} rapoarte</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Documente */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Dosare trimise de client</h2>
            {association.documents.length === 0 ? (
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-8 text-center text-slate-400">
                <div className="text-4xl mb-3">📁</div>
                <p>Clientul nu a trimis documente încă.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {association.documents.map(d => (
                  <div key={d.id}
                    onClick={() => loadDraft(d)}
                    className={`rounded-2xl border p-5 cursor-pointer transition ${selectedDoc?.id === d.id ? "border-violet-500/50 bg-violet-500/8" : "border-white/8 bg-white/[0.03] hover:bg-white/[0.06]"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{d.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{d.fileName}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{new Date(d.createdAt).toLocaleDateString("ro-RO")}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        {statusBadge(d.status)}
                        {d.aiScore !== null && (
                          <span className={`text-sm font-bold ${d.aiScore >= 80 ? "text-emerald-400" : d.aiScore >= 60 ? "text-yellow-400" : "text-red-400"}`}>
                            {d.aiScore.toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Rapoarte publicate */}
            {association.reports.length > 0 && (
              <div className="mt-6">
                <h2 className="text-lg font-semibold mb-4">Rapoarte</h2>
                <div className="space-y-3">
                  {association.reports.map(r => (
                    <div key={r.id}
                      onClick={() => setSelectedReport(selectedReport?.id === r.id ? null : r)}
                      className={`rounded-2xl border p-4 cursor-pointer transition ${selectedReport?.id === r.id ? "border-emerald-500/40 bg-emerald-500/5" : "border-white/8 bg-white/[0.03] hover:bg-white/[0.06]"}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-sm">{r.title}</p>
                          <p className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleDateString("ro-RO")}</p>
                        </div>
                        {statusBadge(r.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Panou detalii/raport */}
          <div className="sticky top-24">
            {selectedReport && selectedReport.aiDraft && (
              <div className="rounded-2xl border border-emerald-500/20 bg-white/[0.03] p-6 mb-4">
                <h3 className="font-semibold text-emerald-300 mb-3">📋 {selectedReport.title}</h3>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4 max-h-96 overflow-y-auto">
                  <pre className="text-xs text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">{selectedReport.aiDraft}</pre>
                </div>
              </div>
            )}

            {selectedDoc && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <h3 className="text-lg font-semibold mb-1">{selectedDoc.title}</h3>
                <p className="text-sm text-slate-400 mb-4">{selectedDoc.fileName}</p>

                {selectedDoc.aiScore !== null && (
                  <div className="mb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm text-slate-400">Scor AI:</span>
                      <span className={`text-xl font-bold ${selectedDoc.aiScore >= 80 ? "text-emerald-400" : selectedDoc.aiScore >= 60 ? "text-yellow-400" : "text-red-400"}`}>
                        {selectedDoc.aiScore.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div className={`h-2 rounded-full ${selectedDoc.aiScore >= 80 ? "bg-emerald-400" : selectedDoc.aiScore >= 60 ? "bg-yellow-400" : "bg-red-400"}`}
                        style={{ width: `${selectedDoc.aiScore}%` }} />
                    </div>
                  </div>
                )}

                {selectedDoc.aiFindings && (() => {
                  try {
                    const findings = JSON.parse(selectedDoc.aiFindings);
                    return findings.length > 0 ? (
                      <div className="mb-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
                        <p className="text-xs font-semibold text-yellow-300 mb-2">Probleme găsite ({findings.length}):</p>
                        <ul className="space-y-1.5">
                          {findings.map((f: string, i: number) => (
                            <li key={i} className="text-xs text-slate-300 flex gap-2">
                              <span className="text-yellow-400 flex-shrink-0">▸</span>{f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null;
                  } catch { return null; }
                })()}

                <div className="border-t border-white/5 pt-4">
                  <p className="text-sm font-semibold mb-3">Raport de cenzor</p>

                  {loading && !draftText && (
                    <div className="mb-4 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-violet-300">
                          <svg className="animate-spin h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                          <span className="text-sm font-medium">AI generează raportul de cenzor...</span>
                        </div>
                        <span className="text-xs text-violet-300 font-mono">{Math.round(draftProgress)}%</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-700"
                          style={{ width: `${draftProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-1.5">Poate dura 20-40 secunde</p>
                    </div>
                  )}

                  <textarea
                    value={draftText}
                    onChange={e => setDraftText(e.target.value)}
                    rows={10}
                    placeholder="Apasă 'Draft AI' pentru a încărca raportul generat automat..."
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-violet-500 transition resize-none"
                  />
                  {msg && (
                    <p className={`text-xs mt-2 ${msg.startsWith("✓") ? "text-emerald-400" : "text-red-400"}`}>{msg}</p>
                  )}
                  <div className="flex gap-3 mt-3">
                    <button onClick={() => generateDraft(selectedDoc)} disabled={loading}
                      className="flex-1 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
                      {loading && !draftText ? (
                        <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Se generează...</>
                      ) : "✨ Draft AI"}
                    </button>
                    <button onClick={() => publishDraft(selectedDoc)} disabled={loading || !draftText}
                      className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold transition hover:bg-emerald-500 disabled:opacity-50">
                      {loading && draftText ? "Se publică..." : "✅ Aprobă & Publică"}
                    </button>
                  </div>

                  {(draftText || draftHtml) && (
                    <button
                      onClick={() => downloadPdf(draftText, selectedDoc)}
                      className="mt-3 w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08] hover:text-white flex items-center justify-center gap-2"
                    >
                      ⬇️ Descarcă PDF
                    </button>
                  )}
                </div>
              </div>
            )}

            {!selectedDoc && !selectedReport && (
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-12 text-center text-slate-400">
                <div className="text-4xl mb-3">👆</div>
                <p>Selectează un dosar din stânga</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
