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
  const [clientiSubTab, setClientiSubTab] = useState<"corporates" | "associations" | "adauga-corporate">("corporates");
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

  // New corporate form
  const [newCorpName, setNewCorpName] = useState("");
  const [newCorpEmail, setNewCorpEmail] = useState("");
  const [newCorpPass, setNewCorpPass] = useState("");
  const [newCorpPackage, setNewCorpPackage] = useState("trial");
  const [creatingCorp, setCreatingCorp] = useState(false);
  const [createCorpMsg, setCreateCorpMsg] = useState("");

  useEffect(() => {
    // Încărcăm tot de la start ca cardurile overview să aibă date complete
    fetchAssociations();
    fetchCorporates();
    fetchDocuments();
    fetchCenzori();
  }, []);

  useEffect(() => {
    if (tab === "clienti") { fetchAssociations(); fetchCorporates(); }
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

  async function createCorporate(e: React.FormEvent) {
    e.preventDefault();
    setCreatingCorp(true);
    setCreateCorpMsg("");
    const res = await fetch("/api/admin/create-corporate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyName: newCorpName, email: newCorpEmail, password: newCorpPass, packageType: newCorpPackage }),
    });
    const data = await res.json();
    if (res.ok) {
      setCreateCorpMsg("✓ " + (data.message || "Cont creat cu succes!"));
      setNewCorpName(""); setNewCorpEmail(""); setNewCorpPass(""); setNewCorpPackage("trial");
      fetchCorporates();
    } else {
      setCreateCorpMsg("✗ " + (data.error || "Eroare la creare"));
    }
    setCreatingCorp(false);
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

  const sectionTitle: Record<string, string> = {
    clienti: "Clienți",
    documente: "Documente",
    cenzori: "Cenzori",
  };

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
        <div className="mb-8">
          {tab !== "overview" ? (
            <div>
              <button onClick={() => setTab("overview")}
                className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-4 transition group">
                <span className="text-lg group-hover:-translate-x-0.5 transition-transform">←</span>
                <span>Înapoi la panou</span>
              </button>
              <h1 className="text-3xl font-bold">{sectionTitle[tab]}</h1>
            </div>
          ) : (
            <div>
              <h1 className="text-3xl font-bold">Panou intern VoSmart</h1>
              <p className="text-slate-400 mt-1.5">Selectează o secțiune pentru a gestiona</p>
            </div>
          )}
        </div>

        {/* OVERVIEW */}
        {tab === "overview" && (
          <div>
            {/* Overview cards — click pentru navigare */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
              {[
                { icon: "🏢", label: "Admini Corporate", value: corporates.length, sub: "conturi înregistrate", color: "violet", action: () => { setTab("clienti"); setClientiSubTab("corporates"); } },
                { icon: "👥", label: "Asociații Clienți", value: totalClients, sub: "total asociații", color: "cyan", action: () => { setTab("clienti"); setClientiSubTab("associations"); } },
                { icon: "📄", label: "De revizuit", value: pendingDocs.length, sub: "documente analizate", color: "amber", action: () => setTab("documente") },
                { icon: "✅", label: "Rapoarte publicate", value: associations.reduce((a, c) => a + c.reports?.filter(r => r.status === "published").length, 0), sub: "rapoarte aprobate", color: "emerald", action: () => setTab("documente") },
                { icon: "⚡", label: "Se analizează", value: allDocs.filter(d => d.status === "analyzing").length, sub: "în procesare AI", color: "blue", action: () => setTab("documente") },
                { icon: "🔑", label: "Cenzori", value: cenzori.length, sub: "cenzori activi", color: "indigo", action: () => setTab("cenzori") },
                { icon: "⏳", label: "În așteptare", value: associations.filter(a => a.user.status === "pending").length, sub: "necesită aprobare", color: "rose", action: () => { setTab("clienti"); setClientiSubTab("associations"); } },
              ].map(card => {
                const colorMap: Record<string, { border: string; bg: string; badge: string; text: string; glow: string; ring: string }> = {
                  violet:  { border: "border-violet-500/20",  bg: "from-violet-500/10 to-violet-500/[0.03]",   badge: "bg-violet-500/15 text-violet-300",   text: "text-violet-200",   glow: "shadow-[0_0_30px_rgba(139,92,246,0.08)]",   ring: "hover:border-violet-500/50 hover:shadow-[0_0_40px_rgba(139,92,246,0.18)]" },
                  cyan:    { border: "border-cyan-500/20",    bg: "from-cyan-500/10 to-cyan-500/[0.03]",        badge: "bg-cyan-500/15 text-cyan-300",         text: "text-cyan-200",     glow: "shadow-[0_0_30px_rgba(6,182,212,0.08)]",    ring: "hover:border-cyan-500/50 hover:shadow-[0_0_40px_rgba(6,182,212,0.18)]" },
                  amber:   { border: "border-amber-500/20",   bg: "from-amber-500/10 to-amber-500/[0.03]",     badge: "bg-amber-500/15 text-amber-300",       text: "text-amber-200",    glow: "shadow-[0_0_30px_rgba(245,158,11,0.08)]",   ring: "hover:border-amber-500/50 hover:shadow-[0_0_40px_rgba(245,158,11,0.18)]" },
                  emerald: { border: "border-emerald-500/20", bg: "from-emerald-500/10 to-emerald-500/[0.03]", badge: "bg-emerald-500/15 text-emerald-300",   text: "text-emerald-200",  glow: "shadow-[0_0_30px_rgba(16,185,129,0.08)]",   ring: "hover:border-emerald-500/50 hover:shadow-[0_0_40px_rgba(16,185,129,0.18)]" },
                  blue:    { border: "border-blue-500/20",    bg: "from-blue-500/10 to-blue-500/[0.03]",        badge: "bg-blue-500/15 text-blue-300",         text: "text-blue-200",     glow: "shadow-[0_0_30px_rgba(59,130,246,0.08)]",   ring: "hover:border-blue-500/50 hover:shadow-[0_0_40px_rgba(59,130,246,0.18)]" },
                  indigo:  { border: "border-indigo-500/20",  bg: "from-indigo-500/10 to-indigo-500/[0.03]",   badge: "bg-indigo-500/15 text-indigo-300",     text: "text-indigo-200",   glow: "shadow-[0_0_30px_rgba(99,102,241,0.08)]",   ring: "hover:border-indigo-500/50 hover:shadow-[0_0_40px_rgba(99,102,241,0.18)]" },
                  rose:    { border: "border-rose-500/20",    bg: "from-rose-500/10 to-rose-500/[0.03]",        badge: "bg-rose-500/15 text-rose-300",         text: "text-rose-200",     glow: "shadow-[0_0_30px_rgba(244,63,94,0.08)]",    ring: "hover:border-rose-500/50 hover:shadow-[0_0_40px_rgba(244,63,94,0.18)]" },
                };
                const c = colorMap[card.color];
                return (
                  <button key={card.label} onClick={card.action}
                    className={`relative overflow-hidden rounded-2xl border ${c.border} bg-gradient-to-br ${c.bg} p-6 ${c.glow} ${c.ring} transition-all duration-200 hover:scale-[1.03] hover:-translate-y-0.5 cursor-pointer text-left group w-full`}>
                    <div className="flex items-start justify-between mb-5">
                      <div className="text-3xl">{card.icon}</div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${c.badge}`}>{card.sub}</span>
                    </div>
                    <div className={`text-5xl font-bold mb-1 ${c.text}`}>{card.value}</div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-sm text-slate-400">{card.label}</div>
                      <span className="text-slate-600 text-xs group-hover:text-slate-400 transition-colors">→</span>
                    </div>
                    <div className="pointer-events-none absolute -right-4 -bottom-4 text-9xl opacity-[0.04]">{card.icon}</div>
                  </button>
                );
              })}
            </div>

            {pendingClients.length > 0 && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-6 mb-6">
                <p className="text-base font-semibold text-emerald-300 mb-4 flex items-center gap-2">
                  <span className="text-xl">🟢</span> Clienți noi care așteaptă aprobare ({pendingClients.length})
                </p>
                <div className="space-y-3">
                  {pendingClients.slice(0, 5).map(a => (
                    <div key={a.id} className="flex items-center justify-between gap-4 rounded-xl bg-black/20 p-4">
                      <div>
                        <p className="font-medium">{a.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{a.user.email}</p>
                      </div>
                      <button onClick={() => approveClient(a.id)}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold transition hover:bg-emerald-500 flex-shrink-0">
                        Aprobă client
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pendingDocs.length > 0 && (
              <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/[0.05] p-6 mb-6">
                <p className="text-base font-semibold text-yellow-300 mb-4 flex items-center gap-2">
                  <span className="text-xl">⚠️</span> Documente care așteaptă revizuire ({pendingDocs.length})
                </p>
                <div className="space-y-3">
                  {pendingDocs.slice(0, 3).map(d => (
                    <div key={d.id} className="flex items-center justify-between gap-4 rounded-xl bg-black/20 p-4">
                      <div>
                        <p className="font-medium">{d.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{d.association?.name || ""}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {d.aiScore !== null && (
                          <span className={`text-sm font-bold ${d.aiScore >= 80 ? "text-emerald-400" : d.aiScore >= 60 ? "text-yellow-400" : "text-red-400"}`}>
                            {d.aiScore.toFixed(0)}%
                          </span>
                        )}
                        <button onClick={() => { setSelectedDoc(d); setTab("documente"); setMsg(""); setDraftText(""); }}
                          className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold transition hover:bg-violet-500">
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
            {/* Sub-tab switcher stilizat */}
            <div className="flex gap-2 mb-6 p-1 rounded-xl bg-white/[0.04] border border-white/8 w-fit flex-wrap">
              {[
                { key: "corporates" as const, label: "🏢 Admini Corporate", count: corporates.length },
                { key: "associations" as const, label: "👥 Asociații", count: associations.length },
                { key: "adauga-corporate" as const, label: "➕ Adaugă Corporate", count: null },
              ].map(t => (
                <button key={t.key} onClick={() => setClientiSubTab(t.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                    clientiSubTab === t.key
                      ? "bg-violet-600 text-white shadow-[0_2px_12px_rgba(124,58,237,0.4)]"
                      : "text-slate-400 hover:text-white"
                  }`}>
                  {t.label}
                  {t.count !== null && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${clientiSubTab === t.key ? "bg-white/20" : "bg-white/[0.08]"}`}>
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Sub-tab: Admini Corporate */}
            {clientiSubTab === "corporates" && (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {corporates.length === 0 && (
                  <div className="col-span-full rounded-2xl border border-white/8 bg-white/[0.03] p-8 text-center text-slate-400">
                    Nu există admini corporate înregistrați.
                  </div>
                )}
                {corporates.map(corp => {
                  const initials = (corp.corporateAccount?.companyName || corp.name || "?").slice(0, 2).toUpperCase();
                  return (
                    <div key={corp.id} className="rounded-2xl border border-white/8 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-6 flex flex-col gap-4 hover:border-violet-500/30 transition">
                      {/* Header cu avatar */}
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/30 to-cyan-500/30 flex items-center justify-center text-lg font-bold text-white border border-violet-500/20 flex-shrink-0">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white truncate">{corp.corporateAccount?.companyName || corp.name || "—"}</p>
                          <p className="text-xs text-slate-400 truncate">{corp.email}</p>
                        </div>
                        {corp.corporateAccount && packageBadge(corp.corporateAccount.package)}
                      </div>
                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 text-center">
                          <div className="text-2xl font-bold text-white">{corp.corporateAccount?._count.associations ?? 0}</div>
                          <div className="text-xs text-slate-500 mt-0.5">Clienți activi</div>
                        </div>
                        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 text-center">
                          <div className="text-2xl font-bold text-white">{corp.corporateAccount?.maxAssoc === 9999 ? "∞" : corp.corporateAccount?.maxAssoc ?? 0}</div>
                          <div className="text-xs text-slate-500 mt-0.5">Locuri max</div>
                        </div>
                      </div>
                      {/* Status */}
                      <div className="flex gap-2 flex-wrap">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                          corp.status === "active" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/20"
                          : corp.status === "rejected" ? "bg-red-500/15 text-red-300 border-red-500/20"
                          : "bg-yellow-500/15 text-yellow-300 border-yellow-500/20"
                        }`}>
                          {corp.status === "active" ? "✓ Activ" : corp.status === "rejected" ? "⛔ Suspendat" : "⏳ Pending"}
                        </span>
                        {corp.corporateAccount && corp.corporateAccount.status !== "active" && (
                          <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                            Cont: {corp.corporateAccount.status}
                          </span>
                        )}
                        <span className="text-xs text-slate-600 ml-auto">
                          {new Date(corp.createdAt).toLocaleDateString("ro-RO")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Sub-tab: Asociații */}
            {clientiSubTab === "associations" && (
              <div className="space-y-4">
                {associations.length === 0 && (
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-8 text-center text-slate-400">
                    Nu există asociații înregistrate.
                  </div>
                )}
                {associations.map(a => {
                  const initials = a.name.slice(0, 2).toUpperCase();
                  const docPercent = a.maxDocuments > 0 ? Math.round((a.filesUploadedCount / a.maxDocuments) * 100) : 0;
                  const isAtLimit = a.filesUploadedCount >= a.maxDocuments;
                  return (
                    <div key={a.id} className="rounded-2xl border border-white/8 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-5 hover:border-violet-500/20 transition">
                      {/* Header */}
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 flex items-center justify-center text-sm font-bold text-white border border-white/10 flex-shrink-0">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <a href={`/admin/client/${a.id}`} className="font-semibold text-white hover:text-violet-300 transition">{a.name}</a>
                            {packageBadge(a.corporate?.package || a.package)}
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium border ${
                              a.user.status === "active" ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                              : a.user.status === "rejected" ? "bg-red-500/10 text-red-300 border-red-500/20"
                              : "bg-yellow-500/10 text-yellow-300 border-yellow-500/20"
                            }`}>
                              {a.user.status === "active" ? "✓ Activ" : a.user.status === "rejected" ? "⛔ Suspendat" : "⏳ Pending"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            {a.corporate ? `🏢 ${a.corporate.companyName}` : `📧 ${a.user.email}`}
                          </p>
                        </div>
                        <div className="text-xs text-slate-500 text-right flex-shrink-0">
                          <div>{a._count?.reports || 0} rap.</div>
                        </div>
                      </div>

                      {/* Bara de progres documente */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-slate-500">Documente încărcate</span>
                          <span className={`text-xs font-semibold ${isAtLimit ? "text-red-400" : "text-slate-300"}`}>
                            {a.filesUploadedCount}/{a.maxDocuments}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${isAtLimit ? "bg-red-500" : docPercent > 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                            style={{ width: `${Math.min(100, docPercent)}%` }} />
                        </div>
                      </div>

                      {/* Butoane acțiune */}
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => clientAction(a.id, "reset_docs")} disabled={actionWorking === a.id + "reset_docs"}
                          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/[0.10] hover:border-white/20 disabled:opacity-40">
                          🔄 <span>Reset</span>
                        </button>

                        {a.user.status !== "rejected" ? (
                          <button onClick={() => clientAction(a.id, "suspend")} disabled={actionWorking === a.id + "suspend"}
                            className="flex items-center gap-1.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.08] px-3 py-2 text-xs font-medium text-amber-300 transition hover:bg-amber-500/15 disabled:opacity-40">
                            ⏸ <span>Suspendă</span>
                          </button>
                        ) : (
                          <button onClick={() => clientAction(a.id, "activate")} disabled={actionWorking === a.id + "activate"}
                            className="flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.08] px-3 py-2 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/15 disabled:opacity-40">
                            ▶ <span>Activează</span>
                          </button>
                        )}

                        <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs">
                          <span className="text-slate-400">📁</span>
                          <select onChange={e => e.target.value && clientAction(a.id, "set_max_docs", { maxDocuments: Number(e.target.value) })}
                            defaultValue="" className="bg-transparent text-white outline-none cursor-pointer text-xs">
                            <option value="" disabled>Dosare max</option>
                            <option value="5">1 dosar (5 doc)</option>
                            <option value="10">2 dosare (10 doc)</option>
                            <option value="15">3 dosare (15 doc)</option>
                            <option value="30">6 dosare (30 doc)</option>
                          </select>
                        </div>

                        <button onClick={() => { if (confirm(`Ștergi asociația "${a.name}"? Această acțiune este ireversibilă.`)) clientAction(a.id, "delete"); }}
                          disabled={actionWorking === a.id + "delete"}
                          className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-3 py-2 text-xs font-medium text-red-400 transition hover:bg-red-500/15 disabled:opacity-40 ml-auto">
                          🗑 <span>Șterge</span>
                        </button>
                      </div>

                      {actionMsg[a.id] && (
                        <p className={`text-xs mt-3 font-medium ${actionMsg[a.id].startsWith("✓") ? "text-emerald-400" : "text-red-400"}`}>
                          {actionMsg[a.id]}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {/* Sub-tab: Adaugă Corporate */}
            {clientiSubTab === "adauga-corporate" && (
              <div className="max-w-xl">
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
                  <h2 className="text-xl font-semibold mb-1">Adaugă cont corporate</h2>
                  <p className="text-sm text-slate-400 mb-6">Creează un cont corporate direct din panoul de admin. Contul va fi activ imediat.</p>

                  {createCorpMsg && (
                    <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${createCorpMsg.startsWith("✓") ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-red-500/30 bg-red-500/10 text-red-300"}`}>
                      {createCorpMsg}
                    </div>
                  )}

                  <form onSubmit={createCorporate} className="space-y-4">
                    <input type="text" required value={newCorpName} onChange={e => setNewCorpName(e.target.value)}
                      placeholder="Numele firmei *"
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />
                    <input type="email" required value={newCorpEmail} onChange={e => setNewCorpEmail(e.target.value)}
                      placeholder="Email *"
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />
                    <input type="password" required minLength={8} value={newCorpPass} onChange={e => setNewCorpPass(e.target.value)}
                      placeholder="Parolă (minim 8 caractere) *"
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />
                    <select value={newCorpPackage} onChange={e => setNewCorpPackage(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-violet-500 transition">
                      <option value="trial">Trial (gratuit, 1 dosar)</option>
                      <option value="starter">Starter (10 asociații, 250 lei/lună)</option>
                      <option value="business">Business (25 asociații, 500 lei/lună)</option>
                      <option value="professional">Professional (50 asociații, 900 lei/lună)</option>
                      <option value="enterprise">Enterprise (nelimitat, 1500 lei/lună)</option>
                    </select>
                    <button type="submit" disabled={creatingCorp}
                      className="w-full rounded-xl bg-violet-600 px-6 py-3.5 font-semibold transition hover:bg-violet-500 disabled:opacity-50">
                      {creatingCorp ? "Se creează..." : "Creează cont corporate →"}
                    </button>
                  </form>
                </div>
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
