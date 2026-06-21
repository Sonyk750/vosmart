"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

interface PendingAccount {
  id: string;
  name: string | null;
  email: string;
  status: string;
  createdAt: string;
  corporateAccount: {
    id: string;
    companyName: string;
    package: string;
    status: string;
    phone: string | null;
  } | null;
}

export default function ConturiTrialPage() {
  const [accounts, setAccounts] = useState<PendingAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; type: "ok" | "err" } | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);

  useEffect(() => { loadAccounts(); }, []);

  async function loadAccounts() {
    setLoading(true);
    const res = await fetch("/api/admin/conturi-trial");
    if (res.ok) setAccounts(await res.json());
    setLoading(false);
  }

  async function doAction(email: string, action: string) {
    setWorking(email + action);
    setMsg(null);
    setLink(null);
    const res = await fetch("/api/admin/activate-trial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, action }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg({ text: data.message || "OK", type: "ok" });
      if (data.link) setLink(data.link);
      if (action !== "get_link") loadAccounts();
    } else {
      setMsg({ text: data.error || "Eroare", type: "err" });
    }
    setWorking(null);
  }

  return (
    <div className="min-h-screen bg-[#080b18] text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin" className="text-slate-400 hover:text-white text-sm">← Admin</Link>
          <h1 className="text-xl font-bold">Conturi Trial — Gestionare</h1>
        </div>

        {msg && (
          <div className={`mb-4 rounded-lg p-3 text-sm ${msg.type === "ok" ? "bg-green-500/15 border border-green-500/30 text-green-300" : "bg-red-500/15 border border-red-500/30 text-red-300"}`}>
            {msg.text}
          </div>
        )}
        {link && (
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="text-xs text-amber-400 mb-2 font-semibold">Link de activare generat (valabil 48h):</p>
            <p className="text-xs text-slate-300 break-all mb-3">{link}</p>
            <a href={link} target="_blank" rel="noreferrer"
              className="inline-block bg-amber-500 text-black px-4 py-2 rounded text-xs font-bold mr-2">
              Activează acum
            </a>
            <button onClick={() => { navigator.clipboard.writeText(link); setMsg({ text: "Link copiat!", type: "ok" }); }}
              className="inline-block border border-amber-500/40 text-amber-300 px-4 py-2 rounded text-xs">
              Copiază link
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-slate-400">Se încarcă...</p>
        ) : accounts.length === 0 ? (
          <p className="text-slate-400">Nu există conturi Trial pending.</p>
        ) : (
          <div className="space-y-3">
            {accounts.map(acc => (
              <div key={acc.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-semibold">{acc.corporateAccount?.companyName || "—"}</p>
                    <p className="text-sm text-slate-400">{acc.name} · <a href={`mailto:${acc.email}`} className="text-violet-400">{acc.email}</a></p>
                    {acc.corporateAccount?.phone && <p className="text-xs text-slate-500">{acc.corporateAccount.phone}</p>}
                    <p className="text-xs text-slate-600 mt-1">
                      Înregistrat: {new Date(acc.createdAt).toLocaleString("ro-RO")}
                      &nbsp;· Status: <span className={acc.status === "active" ? "text-green-400" : "text-amber-400"}>{acc.status}</span>
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {acc.status !== "active" && (
                      <>
                        <button disabled={!!working} onClick={() => doAction(acc.email, "activate")}
                          className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-3 py-1.5 rounded text-xs font-semibold">
                          {working === acc.email + "activate" ? "..." : "Activează"}
                        </button>
                        <button disabled={!!working} onClick={() => doAction(acc.email, "get_link")}
                          className="border border-amber-500/40 hover:bg-amber-500/10 disabled:opacity-50 text-amber-300 px-3 py-1.5 rounded text-xs font-semibold">
                          {working === acc.email + "get_link" ? "..." : "Link activare"}
                        </button>
                      </>
                    )}
                    <button disabled={!!working} onClick={() => doAction(acc.email, "reset_docs")}
                      className="border border-blue-500/40 hover:bg-blue-500/10 disabled:opacity-50 text-blue-300 px-3 py-1.5 rounded text-xs font-semibold">
                      {working === acc.email + "reset_docs" ? "..." : "Reset documente"}
                    </button>
                    <button disabled={!!working} onClick={() => { if (confirm(`Șterge contul ${acc.email}?`)) doAction(acc.email, "delete"); }}
                      className="border border-red-500/30 hover:bg-red-500/10 disabled:opacity-50 text-red-400 px-3 py-1.5 rounded text-xs font-semibold">
                      {working === acc.email + "delete" ? "..." : "Șterge"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
