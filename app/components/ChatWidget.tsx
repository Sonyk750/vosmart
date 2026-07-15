"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";

interface Msg { role: "user" | "assistant"; content: string }

const SALUT =
  "Salut! 👋 Sunt asistentul VoSmart — primul cenzorat cu AI. Întreabă-mă orice despre serviciu — " +
  "ce facem, prețuri, cum îți faci cont, ce documente trebuie, cum obții raportul de cenzor etc.";

// ─── Randare minimală: **bold**, [text](/ruta) → link clickabil ─────────────
function renderInline(text: string, onNavigate: () => void): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const re = /(\[[^\]]+\]\([^)]+\))|(\*\*[^*]+\*\*)/g;
  let last = 0, m: RegExpExecArray | null, k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("[")) {
      const mm = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(tok)!;
      const [, label, href] = mm;
      if (href.startsWith("/")) {
        nodes.push(<Link key={k++} href={href} onClick={onNavigate} style={linkStyle}>{label}</Link>);
      } else {
        nodes.push(<a key={k++} href={href} target="_blank" rel="noopener noreferrer" style={linkStyle}>{label}</a>);
      }
    } else {
      nodes.push(<strong key={k++}>{tok.slice(2, -2)}</strong>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function MsgBody({ text, onNavigate }: { text: string; onNavigate: () => void }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((ln, i) => (
        <React.Fragment key={i}>
          {renderInline(ln, onNavigate)}
          {i < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </>
  );
}

export default function ChatWidget() {
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: SALUT }]);
  const [input, setInput]       = useState("");
  const [busy, setBusy]         = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  async function send() {
    const q = input.trim();
    if (!q || busy) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setBusy(true);
    try {
      const res = await fetch("/api/asistent", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.filter((_, i) => i > 0 || next[0].role === "user") }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? "Eroare");
      }
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
    } catch (e: any) {
      setMessages(prev => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: "assistant", content: `⚠️ ${e?.message ?? "Eroare la asistent."}` };
        return copy;
      });
    } finally {
      setBusy(false);
    }
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <>
      {!open && (
        <button className="asist-fab" onClick={() => setOpen(true)} aria-label="Asistent ajutor" title="Asistent ajutor">💬</button>
      )}

      {open && (
        <div className="asist-panel" role="dialog" aria-label="Asistent VoSmart">
          <div className="asist-head">
            <div className="asist-head__title"><span className="asist-head__dot" /> Asistent VoSmart</div>
            <button className="asist-head__close" onClick={() => setOpen(false)} aria-label="Închide">×</button>
          </div>

          <div className="asist-body" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={`asist-msg asist-msg--${m.role}`}>
                {m.role === "assistant" && m.content === "" && busy
                  ? <span className="asist-typing">Scriu…</span>
                  : <MsgBody text={m.content} onNavigate={() => setOpen(false)} />}
              </div>
            ))}
          </div>

          <div className="asist-input">
            <textarea
              ref={inputRef} rows={1} value={input} placeholder="Scrie o întrebare…"
              onChange={e => setInput(e.target.value)} onKeyDown={onKey} disabled={busy}
            />
            <button onClick={send} disabled={busy || !input.trim()} aria-label="Trimite">➤</button>
          </div>
        </div>
      )}

      <style>{`
        .asist-fab {
          position: fixed; right: 20px; bottom: 20px; z-index: 900;
          width: 56px; height: 56px; border-radius: 50%; border: none; cursor: pointer;
          font-size: 1.5rem; color: #fff;
          background: linear-gradient(135deg, #06b6d4, #3b82f6);
          box-shadow: 0 8px 24px -6px rgba(6,182,212,0.6);
          transition: transform .15s ease, box-shadow .15s ease;
        }
        .asist-fab:hover { transform: translateY(-2px); box-shadow: 0 12px 30px -6px rgba(6,182,212,0.7); }
        .asist-panel {
          position: fixed; right: 20px; bottom: 20px; z-index: 901;
          width: min(400px, calc(100vw - 32px)); height: min(560px, calc(100vh - 40px));
          display: flex; flex-direction: column;
          background: #0b1220; border: 1px solid rgba(148,163,184,0.2);
          border-radius: 16px; overflow: hidden;
          box-shadow: 0 24px 60px -20px rgba(0,0,0,0.75);
        }
        .asist-head {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0.85rem 1rem; border-bottom: 1px solid rgba(148,163,184,0.15);
          background: linear-gradient(135deg, rgba(6,182,212,0.22), rgba(59,130,246,0.12));
        }
        .asist-head__title { display: flex; align-items: center; gap: 0.5rem; font-weight: 800; color: #e2e8f0; font-size: 0.95rem; }
        .asist-head__dot { width: 9px; height: 9px; border-radius: 50%; background: #4ade80; box-shadow: 0 0 8px #4ade80; }
        .asist-head__close { background: none; border: none; color: #94a3b8; font-size: 1.4rem; line-height: 1; cursor: pointer; padding: 0 0.25rem; }
        .asist-head__close:hover { color: #e2e8f0; }
        .asist-body { flex: 1; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: 0.6rem; }
        .asist-msg { max-width: 88%; padding: 0.6rem 0.8rem; border-radius: 14px; font-size: 0.86rem; line-height: 1.5; word-wrap: break-word; }
        .asist-msg--user { align-self: flex-end; background: #0891b2; color: #fff; border-bottom-right-radius: 4px; }
        .asist-msg--assistant { align-self: flex-start; background: rgba(255,255,255,0.06); color: #e2e8f0; border: 1px solid rgba(148,163,184,0.12); border-bottom-left-radius: 4px; }
        .asist-typing { color: #94a3b8; font-style: italic; }
        .asist-input { display: flex; gap: 0.5rem; padding: 0.75rem; border-top: 1px solid rgba(148,163,184,0.15); align-items: flex-end; }
        .asist-input textarea {
          flex: 1; resize: none; max-height: 120px; padding: 0.55rem 0.7rem;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(148,163,184,0.2);
          border-radius: 10px; color: #e2e8f0; font-size: 0.86rem; font-family: inherit; line-height: 1.4;
        }
        .asist-input textarea:focus { outline: none; border-color: #06b6d4; }
        .asist-input button {
          flex: 0 0 auto; width: 38px; height: 38px; border-radius: 10px; border: none; cursor: pointer;
          background: linear-gradient(135deg, #06b6d4, #3b82f6); color: #fff; font-size: 1rem;
        }
        .asist-input button:disabled { opacity: 0.45; cursor: not-allowed; }
      `}</style>
    </>
  );
}

const linkStyle: React.CSSProperties = { color: "#67e8f9", fontWeight: 700, textDecoration: "underline" };
