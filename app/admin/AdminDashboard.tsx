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
    currentPeriodEnd: string | null;
    _count: { associations: number };
    associations: Array<{ id: string; filesUploadedCount: number; _count: { documents: number } }>;
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

  // Confirmare stergere + dropdown actiuni
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Compose email modal
  const [emailTarget, setEmailTarget] = useState<{ email: string; name: string } | null>(null);
  const [emailSubject, setEmailSubject] = useState("Mesaj de la echipa VoSmart");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult] = useState<string | null>(null);

  async function sendClientEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!emailTarget) return;
    setEmailSending(true);
    setEmailResult(null);
    try {
      const res = await fetch("/api/admin/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: emailTarget.email, subject: emailSubject, message: emailMessage }),
      });
      const data = await res.json();
      if (res.ok) {
        setEmailResult("✓ Email trimis cu succes!");
        setTimeout(() => { setEmailTarget(null); setEmailMessage(""); setEmailResult(null); }, 2000);
      } else {
        setEmailResult("✗ " + (data.error || "Eroare la trimitere"));
      }
    } catch {
      setEmailResult("✗ Eroare de rețea");
    }
    setEmailSending(false);
  }

  // Colegi form
  const [colegNume, setColegNume] = useState("");
  const [colegFunctia, setColegFunctia] = useState("");
  const [colegEmail, setColegEmail] = useState("");
  const [colegTelefon, setColegTelefon] = useState("");
  const [colegParola, setColegParola] = useState("");
  const [creatingColeg, setCreatingColeg] = useState(false);
  const [colegMsg, setColegMsg] = useState("");

  // Navighează între tab-uri cu URL sync (fix buton Înapoi browser)
  function goTo(newTab: "overview" | "clienti" | "documente" | "cenzori", sub?: string) {
    setTab(newTab);
    if (sub) setClientiSubTab(sub as any);
    if (newTab === "overview") {
      window.history.pushState({ tab: "overview" }, "", "/admin");
    } else {
      window.history.pushState({ tab: newTab }, "", `/admin?t=${newTab}`);
    }
  }

  useEffect(() => {
    fetchAssociations();
    fetchCorporates();
    fetchDocuments();
    fetchCenzori();

    // Restore tab from URL on load
    const params = new URLSearchParams(window.location.search);
    const t = params.get("t") as typeof tab;
    if (t && ["clienti", "documente", "cenzori"].includes(t)) setTab(t);

    // Handle browser back/forward
    const handlePop = (e: PopStateEvent) => {
      setTab((e.state?.tab as typeof tab) || "overview");
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
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
    cenzori: "Colegi",
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
              {user.role === "admin" ? "Administrator" : "Admin"}
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
              <button onClick={() => goTo("overview")}
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
                { icon: "🏢", label: "Clienți Corporate", value: corporates.length, sub: "conturi înregistrate", color: "violet", action: () => goTo("clienti", "corporates") },
                { icon: "📄", label: "De revizuit", value: pendingDocs.length, sub: "documente analizate", color: "amber", action: () => goTo("documente") },
                { icon: "✅", label: "Rapoarte publicate", value: associations.reduce((a, c) => a + c.reports?.filter(r => r.status === "published").length, 0), sub: "rapoarte aprobate", color: "emerald", action: () => goTo("documente") },
                { icon: "⚡", label: "Se analizează", value: allDocs.filter(d => d.status === "analyzing").length, sub: "în procesare AI", color: "blue", action: () => goTo("documente") },
                { icon: "👫", label: "Colegi", value: cenzori.length, sub: "conturi colegi", color: "indigo", action: () => goTo("cenzori") },
                { icon: "⏳", label: "În așteptare", value: associations.filter(a => a.user.status === "pending").length, sub: "necesită aprobare", color: "rose", action: () => goTo("clienti", "associations") },
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
                        <button onClick={() => { setSelectedDoc(d); goTo("documente"); setMsg(""); setDraftText(""); }}
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
                    <p className="text-sm font-semibold mb-3">Raport de admin</p>
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
                            a.download = `Raport_Admin_${selectedDoc.title.replace(/\s+/g, "_")}.txt`;
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
            {/* Header + buton adaugă */}
            <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
              <div>
                <p className="text-slate-400 text-sm mt-1">
                  {corporates.length} {corporates.length === 1 ? "client înregistrat" : "clienți înregistrați"}
                </p>
              </div>
              <button
                onClick={() => setClientiSubTab(prev => prev === "adauga-corporate" ? "corporates" : "adauga-corporate")}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                  clientiSubTab === "adauga-corporate"
                    ? "bg-white/10 text-white border border-white/20"
                    : "bg-violet-600 text-white hover:bg-violet-500 shadow-[0_0_20px_rgba(124,58,237,0.35)]"
                }`}>
                {clientiSubTab === "adauga-corporate" ? "✕ Închide" : "➕ Adaugă client"}
              </button>
            </div>

            {/* Formular adaugă — expandabil */}
            {clientiSubTab === "adauga-corporate" && (
              <div className="mb-6 rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/8 to-violet-500/[0.02] p-6">
                <h2 className="text-base font-semibold mb-4">Cont corporate nou</h2>
                {createCorpMsg && (
                  <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${createCorpMsg.startsWith("✓") ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-red-500/30 bg-red-500/10 text-red-300"}`}>
                    {createCorpMsg}
                  </div>
                )}
                <form onSubmit={createCorporate} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <input type="text" required value={newCorpName} onChange={e => setNewCorpName(e.target.value)}
                    placeholder="Numele firmei *"
                    className="rounded-xl border border-white/10 bg-[#0d0d1a] px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition text-sm" />
                  <input type="email" required value={newCorpEmail} onChange={e => setNewCorpEmail(e.target.value)}
                    placeholder="Email *"
                    className="rounded-xl border border-white/10 bg-[#0d0d1a] px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition text-sm" />
                  <input type="password" required minLength={8} value={newCorpPass} onChange={e => setNewCorpPass(e.target.value)}
                    placeholder="Parolă *"
                    className="rounded-xl border border-white/10 bg-[#0d0d1a] px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition text-sm" />
                  <select value={newCorpPackage} onChange={e => setNewCorpPackage(e.target.value)}
                    className="rounded-xl border border-white/10 bg-[#0d0d1a] px-4 py-3 text-white outline-none focus:border-violet-500 transition text-sm">
                    <option value="trial">Trial (gratuit)</option>
                    <option value="starter">Starter — 250 lei</option>
                    <option value="business">Business — 500 lei</option>
                    <option value="professional">Professional — 900 lei</option>
                    <option value="enterprise">Enterprise — 1500 lei</option>
                  </select>
                  <button type="submit" disabled={creatingCorp}
                    className="sm:col-span-2 lg:col-span-4 rounded-xl bg-violet-600 px-6 py-3 font-semibold transition hover:bg-violet-500 disabled:opacity-50 text-sm">
                    {creatingCorp ? "Se creează..." : "Creează cont →"}
                  </button>
                </form>
              </div>
            )}

            {/* Overlay inchidere dropdown */}
            {openDropdownId && (
              <div className="fixed inset-0 z-40" onClick={() => setOpenDropdownId(null)} />
            )}

            {/* Lista clienți */}
            {corporates.length === 0 ? (
              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-16 text-center">
                <div className="text-5xl mb-4">🏢</div>
                <p className="text-slate-400 font-medium">Niciun client corporate înregistrat</p>
                <p className="text-slate-600 text-sm mt-1">Apasă „Adaugă client" pentru a crea primul cont</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/8 overflow-visible">
                {/* Header tabel */}
                <div className="grid items-center gap-0 border-b border-white/8 bg-white/[0.03] rounded-t-2xl"
                  style={{ gridTemplateColumns: "minmax(0,1fr) 200px 200px 140px 64px" }}>
                  {["Client", "Pachet", "Zile rămase", "Dosare AI", ""].map((h, i) => (
                    <div key={i} className={`px-5 py-3.5 text-xs font-semibold uppercase tracking-widest text-slate-500 ${i === 4 ? "text-right" : ""}`}>
                      {h}
                    </div>
                  ))}
                </div>

                {corporates.map((corp, idx) => {
                  const ca = corp.corporateAccount;
                  const assoc = ca?.associations?.[0];
                  const assocId = assoc?.id ?? null;
                  const docsCount = assoc?._count?.documents ?? 0;
                  const initials = (ca?.companyName || corp.name || "?").slice(0, 2).toUpperCase();
                  const isSuspended = corp.status === "rejected";
                  const isPending = corp.status === "pending";
                  const isDropOpen = openDropdownId === corp.id;
                  const isDeleting = confirmDeleteId === corp.id;

                  let daysLeft: number | null = null;
                  if (ca?.currentPeriodEnd) {
                    daysLeft = Math.ceil((new Date(ca.currentPeriodEnd).getTime() - Date.now()) / 86400000);
                  }
                  const daysColor = daysLeft === null ? "text-slate-500" : daysLeft <= 0 ? "text-red-400" : daysLeft <= 7 ? "text-amber-400" : "text-emerald-400";
                  const daysLabel = ca?.package === "trial" ? "∞" : daysLeft === null ? "—" : daysLeft <= 0 ? "Expirat" : `${daysLeft} zile`;

                  return (
                    <div key={corp.id}>
                      <div
                        className={`grid items-center gap-0 border-b border-white/5 last:border-0 transition-colors ${
                          isSuspended ? "bg-red-500/[0.03]" : isPending ? "bg-amber-500/[0.03]" : "hover:bg-white/[0.03]"
                        } ${idx === corporates.length - 1 ? "rounded-b-2xl" : ""}`}
                        style={{ gridTemplateColumns: "minmax(0,1fr) 200px 200px 140px 64px" }}>

                        {/* Col 1 — Client */}
                        <div className="flex items-center gap-3.5 px-5 py-4">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                            isSuspended ? "bg-red-500/15 text-red-300 border border-red-500/20" :
                            "bg-gradient-to-br from-violet-500/30 to-cyan-500/20 text-white border border-violet-500/20"
                          }`}>
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-white text-sm leading-tight">{ca?.companyName || corp.name || "—"}</span>
                              {isSuspended && <span className="rounded-full bg-red-500/15 text-red-400 border border-red-500/20 px-2 py-0.5 text-[10px] font-medium">⛔ Suspendat</span>}
                              {isPending && <span className="rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20 px-2 py-0.5 text-[10px] font-medium">⏳ Pending</span>}
                            </div>
                            <p className="text-xs text-slate-500 truncate mt-0.5">{corp.email}</p>
                          </div>
                        </div>

                        {/* Col 2 — Pachet */}
                        <div className="px-5 py-4">
                          {ca ? packageBadge(ca.package) : <span className="text-slate-600 text-xs">—</span>}
                        </div>

                        {/* Col 3 — Zile rămase */}
                        <div className="px-5 py-4">
                          {ca?.package === "trial" ? (
                            <span className="text-slate-400 text-sm">Trial permanent</span>
                          ) : (
                            <div>
                              <span className={`text-sm font-semibold ${daysColor}`}>{daysLabel}</span>
                              {daysLeft !== null && daysLeft > 0 && daysLeft <= 30 && (
                                <div className="mt-1.5 h-1 w-20 rounded-full bg-white/10 overflow-hidden">
                                  <div className={`h-full rounded-full ${daysLeft <= 7 ? "bg-red-500" : daysLeft <= 14 ? "bg-amber-500" : "bg-emerald-500"}`}
                                    style={{ width: `${Math.min(100, (daysLeft / 30) * 100)}%` }} />
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Col 4 — Dosare AI */}
                        <div className="px-5 py-4">
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-white">{docsCount}</span>
                            <span className="text-xs text-slate-500">doc</span>
                          </div>
                        </div>

                        {/* Col 5 — Dropdown buton */}
                        <div className="px-3 py-4 flex justify-center relative">
                          <button
                            onClick={() => setOpenDropdownId(isDropOpen ? null : corp.id)}
                            className={`w-9 h-9 rounded-xl border flex items-center justify-center text-lg font-bold transition ${
                              isDropOpen
                                ? "border-violet-500/50 bg-violet-500/15 text-violet-300"
                                : "border-white/10 bg-white/[0.04] text-slate-400 hover:border-white/20 hover:text-white"
                            }`}>
                            ⋯
                          </button>

                          {/* Dropdown menu */}
                          {isDropOpen && (
                            <div className="absolute right-2 top-full mt-1 z-50 w-48 rounded-xl border border-white/12 bg-[#0d0d1f] shadow-[0_8px_40px_rgba(0,0,0,0.6)] py-1.5 overflow-hidden">
                              {/* Email */}
                              <button
                                onClick={() => {
                                  setEmailTarget({ email: corp.email, name: ca?.companyName || corp.name || corp.email });
                                  setEmailSubject("Mesaj de la echipa VoSmart");
                                  setEmailMessage("");
                                  setEmailResult(null);
                                  setOpenDropdownId(null);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/[0.06] hover:text-white transition">
                                <span>✉️</span> Trimite email
                              </button>

                              {/* Reset contor — doar trial */}
                              {ca?.package === "trial" && assocId && (
                                <button
                                  onClick={() => { clientAction(assocId, "reset_docs"); setOpenDropdownId(null); }}
                                  disabled={actionWorking === assocId + "reset_docs"}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/[0.06] hover:text-white transition disabled:opacity-40">
                                  <span>🔄</span> Resetează contor
                                </button>
                              )}

                              <div className="h-px bg-white/8 my-1" />

                              {/* Suspendă / Activează */}
                              {assocId && (isSuspended ? (
                                <button
                                  onClick={() => { clientAction(assocId, "activate"); setOpenDropdownId(null); }}
                                  disabled={actionWorking === assocId + "activate"}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-emerald-300 hover:bg-emerald-500/10 transition disabled:opacity-40">
                                  <span>▶️</span> Activează cont
                                </button>
                              ) : (
                                <button
                                  onClick={() => { clientAction(assocId, "suspend"); setOpenDropdownId(null); }}
                                  disabled={actionWorking === assocId + "suspend"}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-amber-300 hover:bg-amber-500/10 transition disabled:opacity-40">
                                  <span>⏸️</span> Suspendă cont
                                </button>
                              ))}

                              <div className="h-px bg-white/8 my-1" />

                              {/* Șterge */}
                              <button
                                onClick={() => { setConfirmDeleteId(corp.id); setOpenDropdownId(null); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition">
                                <span>🗑️</span> Șterge client
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Confirmare ștergere — sub rând */}
                      {isDeleting && (
                        <div className="flex items-center gap-3 px-5 py-3 bg-red-500/[0.06] border-b border-red-500/15">
                          <span className="text-sm text-red-300 flex-1">Ștergi definitiv contul <strong>{ca?.companyName || corp.name}</strong>?</span>
                          <button
                            onClick={() => { if (assocId) clientAction(assocId, "delete"); setConfirmDeleteId(null); setTimeout(fetchCorporates, 500); }}
                            className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-500 transition">
                            Da, șterge
                          </button>
                          <button onClick={() => setConfirmDeleteId(null)}
                            className="rounded-lg border border-white/15 px-4 py-1.5 text-xs text-slate-300 hover:bg-white/[0.08] transition">
                            Anulează
                          </button>
                        </div>
                      )}

                      {/* Mesaj acțiune */}
                      {assocId && actionMsg[assocId] && (
                        <div className={`px-5 py-2 text-xs ${actionMsg[assocId].startsWith("✓") ? "text-emerald-400 bg-emerald-500/[0.06]" : "text-red-400 bg-red-500/[0.06]"}`}>
                          {actionMsg[assocId]}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ADMINI - doar admin */}
        {tab === "cenzori" && user.role === "admin" && (
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Formular creare coleg */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Adaugă coleg nou</h2>
              <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/8 to-indigo-500/[0.02] p-6">
                <form onSubmit={async e => {
                  e.preventDefault();
                  setCreatingColeg(true);
                  setColegMsg("");
                  const res = await fetch("/api/admin/create-corporate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      companyName: colegNume + (colegFunctia ? ` — ${colegFunctia}` : ""),
                      email: colegEmail,
                      password: colegParola,
                      packageType: "trial",
                      phone: colegTelefon,
                    }),
                  });
                  const data = await res.json();
                  if (res.ok) {
                    setColegMsg("✓ Cont creat! Colegul se poate loga la /corporate/login");
                    setColegNume(""); setColegFunctia(""); setColegEmail(""); setColegTelefon(""); setColegParola("");
                    fetchCorporates();
                  } else {
                    setColegMsg("✗ " + (data.error || "Eroare la creare"));
                  }
                  setCreatingColeg(false);
                }} className="space-y-3">
                  <input type="text" required value={colegNume} onChange={e => setColegNume(e.target.value)}
                    placeholder="Nume și prenume"
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition" />
                  <input type="text" value={colegFunctia} onChange={e => setColegFunctia(e.target.value)}
                    placeholder="Funcția (ex: Contabil, Director)"
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition" />
                  <input type="email" required value={colegEmail} onChange={e => setColegEmail(e.target.value)}
                    placeholder="Adresa de email"
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition" />
                  <input type="tel" value={colegTelefon} onChange={e => setColegTelefon(e.target.value)}
                    placeholder="Telefon"
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition" />
                  <input type="password" required minLength={8} value={colegParola} onChange={e => setColegParola(e.target.value)}
                    placeholder="Parolă (minim 8 caractere)"
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition" />
                  <button type="submit" disabled={creatingColeg}
                    className="w-full rounded-xl bg-indigo-600 px-6 py-3 font-semibold transition hover:bg-indigo-500 disabled:opacity-50">
                    {creatingColeg ? "Se creează..." : "Creează cont coleg"}
                  </button>
                  {colegMsg && (
                    <p className={`text-sm text-center ${colegMsg.startsWith("✓") ? "text-emerald-400" : "text-rose-400"}`}>
                      {colegMsg}
                    </p>
                  )}
                </form>
                <div className="mt-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-3 text-xs text-indigo-300">
                  Colegii creați se pot loga la <strong>/corporate/login</strong> și au aceleași drepturi ca un cont Corporate.
                </div>
              </div>
            </div>

            {/* Lista colegi existenți */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Colegi activi <span className="text-sm text-slate-500 font-normal ml-1">({cenzori.length})</span></h2>
              <div className="space-y-3">
                {cenzori.length === 0 && (
                  <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6 text-center text-slate-500 text-sm">
                    Niciun coleg adăugat încă
                  </div>
                )}
                {cenzori.map(c => (
                  <div key={c.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-sm flex-shrink-0">
                      {c.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{c.name}</p>
                      <p className="text-xs text-slate-400 truncate">{c.email}</p>
                    </div>
                    <span className="rounded-full bg-indigo-500/15 px-2.5 py-1 text-xs text-indigo-300 flex-shrink-0">Coleg</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal compunere email */}
      {emailTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEmailTarget(null)} />

          {/* Panel */}
          <div className="relative w-full max-w-lg rounded-2xl border border-violet-500/20 bg-[#0d0d1f] shadow-[0_0_80px_rgba(124,58,237,0.25)] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 bg-gradient-to-r from-violet-500/10 to-cyan-500/5">
              <div>
                <h3 className="font-semibold text-white">Trimite email</h3>
                <p className="text-xs text-slate-400 mt-0.5">Mesaj direct către client</p>
              </div>
              <button onClick={() => setEmailTarget(null)}
                className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.08] transition">
                ✕
              </button>
            </div>

            <form onSubmit={sendClientEmail} className="p-6 space-y-4">
              {/* Câtre */}
              <div>
                <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider">Către</label>
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-violet-500/[0.06] px-4 py-3">
                  <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center text-xs font-bold text-violet-300 flex-shrink-0">
                    {emailTarget.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{emailTarget.name}</p>
                    <p className="text-xs text-violet-300 truncate">{emailTarget.email}</p>
                  </div>
                </div>
              </div>

              {/* Subiect */}
              <div>
                <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider">Subiect</label>
                <input
                  type="text" required value={emailSubject} onChange={e => setEmailSubject(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a18] px-4 py-3 text-white text-sm placeholder-slate-500 outline-none focus:border-violet-500 transition" />
              </div>

              {/* Mesaj */}
              <div>
                <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider">Mesaj</label>
                <textarea
                  required rows={6} value={emailMessage} onChange={e => setEmailMessage(e.target.value)}
                  placeholder="Scrie mesajul tău aici..."
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a18] px-4 py-3 text-white text-sm placeholder-slate-500 outline-none focus:border-violet-500 transition resize-none" />
              </div>

              {emailResult && (
                <p className={`text-sm text-center font-medium ${emailResult.startsWith("✓") ? "text-emerald-400" : "text-red-400"}`}>
                  {emailResult}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEmailTarget(null)}
                  className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-300 hover:bg-white/[0.06] transition">
                  Anulează
                </button>
                <button type="submit" disabled={emailSending}
                  className="flex-1 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-500 transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {emailSending ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Se trimite...
                    </>
                  ) : (
                    <>✉ Trimite email</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
