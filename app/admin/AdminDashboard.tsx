"use client";
import { useState, useEffect } from "react";
import Image from "next/image";

interface User { id: string; name: string | null; email: string; role: string; }
interface Association {
  id: string; name: string; package: string; cui: string | null;
  filesUploadedCount: number;
  maxDocuments: number;
  user: { name: string | null; email: string; status: string; };
  documents: Document[];
  reports: Report[];
  _count: { documents: number; reports: number; };
  corporate?: { package: string; companyName: string } | null;
}
interface CorporateAdmin {
  id: string; name: string | null; email: string; status: string; createdAt: string;
  corporateAccount: {
    id: string; companyName: string; package: string; status: string;
    subscriptionStatus: string | null; maxAssoc: number;
    _count: { associations: number };
  } | null;
}
interface Document {
  id: string; title: string; fileName: string; status: string;
  aiScore: number | null; aiFindings: string | null; aiSummary: string | null;
  createdAt: string; associationId: string;
  association?: { name: string; };
}
interface Report {
  id: string; title: string; status: string; aiDraft: string | null;
  month: string | null; year: number | null; fileUrl: string | null; createdAt: string;
}
interface Cenzor {
  id: string; name: string | null; email: string;
  allocatedClients: { associationId: string; association: { name: string; } }[];
}

export default function AdminDashboard({ user }: { user: User }) {
  const [tab, setTab] = useState<"overview" | "clienti" | "documente" | "cenzori">("overview");
  const [associations, setAssociations] = useState<Association[]>([]);
  const [allDocs, setAllDocs] = useState<Document[]>([]);
  const [cenzori, setCenzori] = useState<Cenzor[]>([]);
  const [corporates, setCorporates] = useState<CorporateAdmin[]>([]);
  const [clientiSubTab, setClientiSubTab] = useState<"corporates" | "associations">("corporates");
  const [actionMsg, setActionMsg] = useState<Record<string, string>>({});
  const [actionWorking, setActionWorking] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [selectedAssoc, setSelectedAssoc] = useState<Association | null>(null);
  const [draftText, setDraftText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [msg, setMsg] = useState("");

  // New cenzor form
  const [newCenzorName, setNewCenzorName] = useState("");
  const [newCenzorEmail, setNewCenzorEmail] = useState("");
  const [newCenzorPass, setNewCenzorPass] = useState("");
  const [creatingCenzor, setCreatingCenzor] = useState(false);

  useEffect(() => {
    if (tab === "overview" || tab === "clienti") { fetchAssociations(); fetchCorporates(); }
    if (tab === "documente") fetchDocuments();
    if (tab === "cenzori") fetchCenzori();
  }, [tab]);

  async function fetchAssociations() {
    const res = await fetch("/api/admin/clients");
    if (res.ok) setAssociations(await res.json());
  }
  async function fetchCorporates() {
    const res = await fetch("/api/admin/corporates");
    if (res.ok) setCorporates(await res.json());
  }
  async function fetchDocuments() {
    const res = await fetch("/api/admin/documents");
    if (res.ok) setAllDocs(await res.json());
  }
  async function fetchCenzori() {
    const res = await fetch("/api/admin/cenzori");
    if (res.ok) setCenzori(await res.json());
  }

  async function clientAction(associationId: string, action: string, extra?: object) {
    setActionWorking(associationId + action);
    setActionMsg(prev => ({ ...prev, [associationId]: "" }));
    const res = await fetch("/api/admin/clients/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ associationId, action, ...extra }),
    });
    const data = await res.json();
    setActionMsg(prev => ({ ...prev, [associationId]: res.ok ? "✓ " + data.message : "✗ " + (data.error || "Eroare") }));
    if (res.ok) fetchAssociations();
    setActionWorking(null);
  }

  async function generateDraft(doc: Document) {
    setGenerating(true);
    setDraftText("");
    setMsg("");
    // Verificam daca exista deja un draft din analiza AI
    const res = await fetch(`/api/admin/reports/draft?documentId=${doc.id}`);
    if (res.ok) {
      const data = await res.json();
      if (data.draft) {
        setDraftText(data.draft);
        setMsg("✓ Draft încărcat din analiza AI");
        setGenerating(false);
        return;
      }
    }
    // Altfel generăm unul nou
    const res2 = await fetch("/api/admin/reports/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: doc.id }),
    });
    const data = await res2.json();
    if (res2.ok) {
      setDraftText(data.draft);
      setMsg("✓ Draft generat de AI");
    } else {
      setMsg("✗ " + (data.error || "Eroare"));
    }
    setGenerating(false);
  }

  async function approveReport(reportId: string) {
    setApproving(true);
    const res = await fetch("/api/admin/reports/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId }),
    });
    if (res.ok) {
      setMsg("✓ Raport aprobat și publicat la client!");
      fetchDocuments();
    } else {
      setMsg("✗ Eroare la aprobare");
    }
    setApproving(false);
  }

  async function publishDraft(doc: Document) {
    if (!draftText) return;
    setApproving(true);
    const res = await fetch("/api/admin/reports/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: doc.id, draft: draftText, associationId: doc.associationId }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg("✓ Raport publicat! Clientul îl poate vedea acum.");
      setSelectedDoc(null);
      setDraftText("");
      fetchDocuments();
    } else {
      setMsg("✗ " + (data.error || "Eroare"));
    }
    setApproving(false);
  }

  async function createCenzor(e: React.FormEvent) {
    e.preventDefault();
    setCreatingCenzor(true);
    const res = await fetch("/api/admin/cenzori", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCenzorName, email: newCenzorEmail, password: newCenzorPass }),
    });
    if (res.ok) {
      setNewCenzorName(""); setNewCenzorEmail(""); setNewCenzorPass("");
      fetchCenzori();
    }
    setCreatingCenzor(false);
  }

  async function allocateCenzor(cenzorId: string, associationId: string) {
    await fetch("/api/admin/cenzori/allocate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cenzorId, associationId }),
    });
    fetchCenzori();
  }

  async function approveClient(associationId: string) {
    const res = await fetch("/api/admin/clients/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ associationId }),
    });
    if (res.ok) {
      setMsg("Client aprobat. Acum se poate loga.");
      fetchAssociations();
    } else {
      setMsg("Eroare la aprobarea clientului");
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  function packageBadge(pkg: string) {
    const map: Record<string, [string, string]> = {
      trial: ["bg-amber-500/15 text-amber-300", "Trial Gratuit"],
      starter: ["bg-cyan-500/15 text-cyan-300", "Starter"],
      business: ["bg-violet-500/15 text-violet-300", "Business"],
      professional: ["bg-emerald-500/15 text-emerald-300", "Professional"],
      enterprise: ["bg-emerald-500/15 text-emerald-300 border border-emerald-500/30", "Enterprise"],
      premium: ["bg-violet-500/15 text-violet-300", "Premium"],
      smart: ["bg-cyan-500/15 text-cyan-300", "Smart"],
    };
    const [cls, label] = map[pkg] || ["bg-slate-500/15 text-slate-300", pkg];
    return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
  }

  const statusBadge = (status: string) => {
    const map: Record<string, [string, string]> = {
      published: ["bg-emerald-500/15 text-emerald-300", "Publicat"],
      approved: ["bg-cyan-500/15 text-cyan-300", "Aprobat"],
      pending_approval: ["bg-yellow-500/15 text-yellow-300", "Așteaptă"],
      draft: ["bg-slate-500/15 text-slate-300", "Draft"],
      analyzing: ["bg-violet-500/15 text-violet-300 animate-pulse", "Se analizează"],
      analyzed: ["bg-cyan-500/15 text-cyan-300", "Analizat"],
      uploaded: ["bg-slate-500/15 text-slate-300", "Încărcat"],
      error: ["bg-red-500/15 text-red-300", "Eroare"],
    };
    const [cls, label] = map[status] || ["bg-slate-500/15 text-slate-300", status];
    return <span className={`rounded-full px-3 py-1 text-xs font-medium ${cls}`}>{label}</span>;
  };

  const pendingDocs = allDocs.filter(d => d.status === "analyzed");
  const totalClients = associations.length;
  const pendingClients = associations.filter(a => a.user.status === "pending");

  return (
    <main className="min-h-screen bg-[#050814] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(124,58,237,0.20),transparent_40%)]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#050814]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <Image src="/logo-vosmart.png" alt="VoSmart" width={90} height={40}
              className="h-auto" style={{ mixBlendMode: "screen", width: "75px" }} />
            <span className="rounded-full bg-violet-600/20 border border-violet-500/30 px-3 py-1 text-xs text-violet-300 font-medium">
              {user.role === "admin" ? "Administrator" : "Cenzor"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300 transition hover:bg-white/[0.08]">
              ← Site
            </a>
            <span className="text-sm text-slate-400 hidden sm:block">{user.email}</span>
            <button onClick={handleLogout}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300 transition hover:bg-white/[0.08]">
              Ieșire
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Panou intern VoSmart</h1>
          <p className="text-slate-400 mt-1">Gestionare clienți, documente și rapoarte</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-white/5 pb-1 flex-wrap">
          {[
            { key: "overview", label: "📊 Prezentare generală" },
            { key: "documente", label: `📋 Documente${pendingDocs.length > 0 ? ` (${pendingDocs.length})` : ""}` },
            { key: "clienti", label: "👥 Clienți" },
            ...(user.role === "admin" ? [{ key: "cenzori", label: "🔑 Cenzori" }] : []),
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition ${tab === t.key ? "bg-violet-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.3)]" : "text-slate-400 hover:text-white hover:bg-white/[0.05]"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab === "overview" && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              {[
                ["🏢", "Admini Corporate", corporates.length.toString()],
                ["👥", "Asociații (Clienți)", totalClients.toString()],
                ["📄", "Doc. de revizuit", pendingDocs.length.toString()],
                ["✅", "Rapoarte publicate", associations.reduce((a, c) => a + c.reports?.filter(r => r.status === "published").length, 0).toString()],
                ["⚡", "Se analizează", allDocs.filter(d => d.status === "analyzing").length.toString()],
                ["⏳", "Clienți în așteptare", associations.filter(a => a.user.status === "pending").length.toString()],
              ].map(([icon, label, value]) => (
                <div key={label} className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                  <div className="text-2xl mb-2">{icon}</div>
                  <div className="text-3xl font-bold">{value}</div>
                  <div className="text-xs text-slate-500 mt-1">{label}</div>
                </div>
              ))}
            </div>

            {pendingClients.length > 0 && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 mb-6">
                <p className="text-sm font-semibold text-emerald-300 mb-3">Clienti noi care asteapta aprobare ({pendingClients.length})</p>
                <div className="space-y-2">
                  {pendingClients.slice(0, 5).map(a => (
                    <div key={a.id} className="flex items-center justify-between gap-4 rounded-xl bg-black/20 p-3">
                      <div>
                        <p className="text-sm font-medium">{a.name}</p>
                        <p className="text-xs text-slate-400">{a.user.email}</p>
                      </div>
                      <button onClick={() => approveClient(a.id)}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold transition hover:bg-emerald-500">
                        Aproba client
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pendingDocs.length > 0 && (
              <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5 mb-6">
                <p className="text-sm font-semibold text-yellow-300 mb-3">⚠️ Documente care așteaptă revizuire ({pendingDocs.length})</p>
                <div className="space-y-2">
                  {pendingDocs.slice(0, 3).map(d => (
                    <div key={d.id} className="flex items-center justify-between gap-4 rounded-xl bg-black/20 p-3">
                      <div>
                        <p className="text-sm font-medium">{d.title}</p>
                        <p className="text-xs text-slate-400">{d.association?.name || ""}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {d.aiScore !== null && (
                          <span className={`text-sm font-bold ${d.aiScore >= 80 ? "text-emerald-400" : d.aiScore >= 60 ? "text-yellow-400" : "text-red-400"}`}>
                            {d.aiScore.toFixed(0)}%
                          </span>
                        )}
                        <button onClick={() => { setSelectedDoc(d); setTab("documente"); setMsg(""); setDraftText(""); }}
                          className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold transition hover:bg-violet-500">
                          Revizuiește
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* DOCUMENTE */}
        {tab === "documente" && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Lista documente */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold mb-4">Toate documentele</h2>
              {allDocs.length === 0 ? (
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-8 text-center text-slate-400">
                  Nu există documente încă.
                </div>
              ) : allDocs.map(d => (
                <div key={d.id}
                  onClick={() => { setSelectedDoc(d); setDraftText(""); setMsg(""); }}
                  className={`rounded-2xl border p-5 cursor-pointer transition ${selectedDoc?.id === d.id ? "border-violet-500/50 bg-violet-500/8" : "border-white/8 bg-white/[0.03] hover:bg-white/[0.06]"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{d.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{d.association?.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{d.fileName}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
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

            {/* Detalii document selectat */}
            <div>
              {selectedDoc ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sticky top-24">
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
                          <p className="text-xs font-semibold text-yellow-300 mb-2">Probleme găsite de AI:</p>
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

                  {selectedDoc.aiSummary && (
                    <div className="mb-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                      <p className="text-xs font-semibold text-cyan-300 mb-1">Rezumat AI:</p>
                      <p className="text-xs text-slate-300">{selectedDoc.aiSummary}</p>
                    </div>
                  )}

                  {/* Draft raport */}
                  <div className="border-t border-white/5 pt-4 mt-4">
                    <p className="text-sm font-semibold mb-3">Raport de cenzor</p>
                    <textarea
                      value={draftText}
                      onChange={e => setDraftText(e.target.value)}
                      rows={8}
                      placeholder="Generează draft-ul cu AI sau scrie manual raportul..."
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-violet-500 transition resize-none"
                    />
                    {msg && (
                      <p className={`text-xs mt-2 ${msg.startsWith("✓") ? "text-emerald-400" : "text-red-400"}`}>{msg}</p>
                    )}
                    <div className="flex gap-3 mt-3">
                      <button onClick={() => generateDraft(selectedDoc)} disabled={generating}
                        className="flex-1 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/20 disabled:opacity-50">
                        {generating ? "Generează..." : "✨ Draft AI"}
                      </button>
                      {draftText && (
                        <button
                          onClick={() => {
                            const blob = new Blob([draftText], { type: "text/plain;charset=utf-8" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `Raport_Cenzor_${selectedDoc.title.replace(/\s+/g, "_")}.txt`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="flex-1 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2.5 text-sm font-semibold text-violet-300 transition hover:bg-violet-500/20">
                          📄 Descarcă PDF
                        </button>
                      )}
                      <button onClick={() => publishDraft(selectedDoc)} disabled={approving || !draftText}
                        className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold transition hover:bg-emerald-500 disabled:opacity-50">
                        {approving ? "Se publică..." : "✅ Aprobă & Publică"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-12 text-center text-slate-400">
                  <div className="text-4xl mb-3">📄</div>
                  <p>Selectează un document din stânga pentru a-l revizui</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CLIENȚI */}
        {tab === "clienti" && (
          <div>
            {/* Sub-tab-uri */}
            <div className="flex gap-2 mb-6">
              {[
                { key: "corporates" as const, label: "🏢 Admini Corporate" },
                { key: "associations" as const, label: "👥 Asociații (Clienți)" },
              ].map(t => (
                <button key={t.key} onClick={() => setClientiSubTab(t.key)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition ${clientiSubTab === t.key ? "bg-violet-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.3)]" : "text-slate-400 hover:text-white hover:bg-white/[0.05]"}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Sub-tab: Admini Corporate */}
            {clientiSubTab === "corporates" && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {corporates.length === 0 && (
                  <div className="col-span-full rounded-2xl border border-white/8 bg-white/[0.03] p-8 text-center text-slate-400">
                    Nu există admini corporate înregistrați.
                  </div>
                )}
                {corporates.map(corp => (
                  <div key={corp.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{corp.corporateAccount?.companyName || corp.name || "—"}</p>
                        <p className="text-xs text-slate-400 truncate">{corp.email}</p>
                      </div>
                      <div className="flex-shrink-0">
                        {corp.corporateAccount ? packageBadge(corp.corporateAccount.package) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span>👥 {corp.corporateAccount?._count.associations ?? 0} clienți</span>
                      <span>📦 max {corp.corporateAccount?.maxAssoc ?? 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        corp.status === "active" ? "bg-emerald-500/15 text-emerald-300"
                        : corp.status === "rejected" ? "bg-red-500/15 text-red-300"
                        : "bg-yellow-500/15 text-yellow-300"
                      }`}>
                        {corp.status === "active" ? "Activ" : corp.status === "rejected" ? "Suspendat" : "Pending"}
                      </span>
                      {corp.corporateAccount && (
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          corp.corporateAccount.status === "active" ? "bg-emerald-500/15 text-emerald-300"
                          : corp.corporateAccount.status === "suspended" ? "bg-red-500/15 text-red-300"
                          : "bg-yellow-500/15 text-yellow-300"
                        }`}>
                          Cont: {corp.corporateAccount.status === "active" ? "activ" : corp.corporateAccount.status === "suspended" ? "suspendat" : "pending"}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Sub-tab: Asociații */}
            {clientiSubTab === "associations" && (
              <div className="space-y-3">
                {associations.length === 0 && (
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-8 text-center text-slate-400">
                    Nu există asociații înregistrate.
                  </div>
                )}
                {associations.map(a => (
                  <div key={a.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <a href={`/admin/client/${a.id}`} className="font-semibold hover:text-violet-300 transition">{a.name}</a>
                          {packageBadge(a.corporate?.package || a.package)}
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            a.user.status === "active" ? "bg-emerald-500/15 text-emerald-300"
                            : a.user.status === "rejected" ? "bg-red-500/15 text-red-300"
                            : "bg-yellow-500/15 text-yellow-300"
                          }`}>
                            {a.user.status === "active" ? "Activ" : a.user.status === "rejected" ? "Suspendat" : "Pending"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {a.corporate ? `Admin: ${a.corporate.companyName}` : a.user.email}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          📁 Documente: <span className={`font-semibold ${a.filesUploadedCount >= a.maxDocuments ? "text-red-400" : "text-slate-300"}`}>{a.filesUploadedCount}/{a.maxDocuments}</span>
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-xs text-slate-400 text-right">
                        <div>📋 {a._count?.reports || 0} rap.</div>
                      </div>
                    </div>

                    {/* Butoane acțiune */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => clientAction(a.id, "reset_docs")}
                        disabled={actionWorking === a.id + "reset_docs"}
                        title="Resetează contor documente"
                        className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/[0.10] disabled:opacity-50">
                        🔄 Reset
                      </button>

                      {a.user.status !== "rejected" ? (
                        <button
                          onClick={() => clientAction(a.id, "suspend")}
                          disabled={actionWorking === a.id + "suspend"}
                          title="Suspendă cont"
                          className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-500/20 disabled:opacity-50">
                          ⏸ Suspendă
                        </button>
                      ) : (
                        <button
                          onClick={() => clientAction(a.id, "activate")}
                          disabled={actionWorking === a.id + "activate"}
                          title="Activează cont"
                          className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50">
                          ▶ Activează
                        </button>
                      )}

                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-400">📁 Dosare max:</span>
                        <select
                          onChange={e => e.target.value && clientAction(a.id, "set_max_docs", { maxDocuments: Number(e.target.value) })}
                          defaultValue=""
                          className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white outline-none focus:border-violet-500">
                          <option value="" disabled>—</option>
                          <option value="5">1 dosar (5 doc)</option>
                          <option value="10">2 dosare (10 doc)</option>
                          <option value="15">3 dosare (15 doc)</option>
                          <option value="30">6 dosare (30 doc)</option>
                        </select>
                      </div>

                      <button
                        onClick={() => {
                          if (confirm(`Ștergi asociația "${a.name}"? Această acțiune este ireversibilă.`)) {
                            clientAction(a.id, "delete");
                          }
                        }}
                        disabled={actionWorking === a.id + "delete"}
                        title="Șterge asociația"
                        className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/20 disabled:opacity-50">
                        🗑 Șterge
                      </button>
                    </div>

                    {actionMsg[a.id] && (
                      <p className={`text-xs mt-2 ${actionMsg[a.id].startsWith("✓") ? "text-emerald-400" : "text-red-400"}`}>
                        {actionMsg[a.id]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CENZORI - doar admin */}
        {tab === "cenzori" && user.role === "admin" && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Lista cenzori */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Cenzori activi</h2>
              <div className="space-y-4">
                {cenzori.map(c => (
                  <div key={c.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-semibold">{c.name}</p>
                        <p className="text-sm text-slate-400">{c.email}</p>
                      </div>
                      <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-xs text-cyan-300">Cenzor</span>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-2">Asociații alocate:</p>
                      <div className="flex flex-wrap gap-2">
                        {c.allocatedClients.map(al => (
                          <span key={al.associationId} className="rounded-lg bg-white/[0.05] px-2 py-1 text-xs text-slate-300">
                            {al.association.name}
                          </span>
                        ))}
                        {c.allocatedClients.length === 0 && <span className="text-xs text-slate-500">Nicio asociație alocată</span>}
                      </div>
                    </div>
                    {/* Alocare */}
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <p className="text-xs text-slate-500 mb-2">Alocă asociație:</p>
                      <select onChange={e => e.target.value && allocateCenzor(c.id, e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-violet-500">
                        <option value="">Selectează asociație...</option>
                        {associations
                          .filter(a => !c.allocatedClients.find(al => al.associationId === a.id))
                          .map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Creare cenzor nou */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Adaugă cenzor nou</h2>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <form onSubmit={createCenzor} className="space-y-4">
                  <input type="text" required value={newCenzorName} onChange={e => setNewCenzorName(e.target.value)}
                    placeholder="Nume complet"
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />
                  <input type="email" required value={newCenzorEmail} onChange={e => setNewCenzorEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />
                  <input type="password" required minLength={8} value={newCenzorPass} onChange={e => setNewCenzorPass(e.target.value)}
                    placeholder="Parolă (minim 8 caractere)"
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />
                  <button type="submit" disabled={creatingCenzor}
                    className="w-full rounded-xl bg-violet-600 px-6 py-3 font-semibold transition hover:bg-violet-500 disabled:opacity-50">
                    {creatingCenzor ? "Se creează..." : "Creează cont cenzor"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
