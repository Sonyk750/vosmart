import { NextResponse } from "next/server"
import { rateLimit, clientIp } from "@/lib/rate-limit"
import nodemailer from "nodemailer"
import { track } from "@vercel/analytics/server"

function esc(s: string) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

// Numărarea cererilor (26.10.2026, planul SEO): fiecare mesaj trimis cu succes intră în
// Vercel Analytics ca eveniment „cerere_oferta”, cu pagina de pe care a plecat. Până
// atunci cererile ajungeau doar pe email, deci nu se putea spune dacă Google aduce clienți.
function paginaSursa(request: Request) {
  try { return new URL(request.headers.get("referer") ?? "").pathname } catch { return "necunoscut" }
}

// ── POST: formularul de contact / cerere de ofertă (prima pagină și FormularOferta) ──
// Trimite mesajul pe email la office@vosmart.ro. Formular public, fără gard de cont;
// apărat de limita pe IP (5 / minut).
export async function POST(request: Request) {
  const rl = rateLimit(`contact:${clientIp(request)}`, 5, 60_000)
  if (!rl.ok) return NextResponse.json({ error: `Prea multe încercări. Reîncearcă în ${rl.retryAfter}s.` }, { status: 429 })

  const { nume, email, telefon, mesaj } = await request.json()

  if (!nume || !email || !mesaj) {
    return NextResponse.json({ error: "Câmpuri obligatorii lipsă." }, { status: 400 })
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  try {
    await transporter.sendMail({
      from: `"VoSmart Contact" <${process.env.SMTP_USER}>`,
      to: "office@vosmart.ro",
      replyTo: email,
      subject: `[VoSmart] Mesaj nou de la ${esc(nume)}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <h2 style="color:#10b981;margin-bottom:24px">Mesaj nou din formularul VoSmart</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;width:120px">Nume</td>
              <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;font-weight:600">${esc(nume)}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280">Email</td>
              <td style="padding:10px 0;border-bottom:1px solid #e5e7eb">
                <a href="mailto:${esc(email)}" style="color:#10b981">${esc(email)}</a>
              </td>
            </tr>
            ${telefon ? `
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280">Telefon</td>
              <td style="padding:10px 0;border-bottom:1px solid #e5e7eb">${esc(telefon)}</td>
            </tr>
            ` : ""}
            <tr>
              <td style="padding:10px 0;color:#6b7280;vertical-align:top">Mesaj</td>
              <td style="padding:10px 0;white-space:pre-wrap">${esc(mesaj)}</td>
            </tr>
          </table>
        </div>
      `,
    })

    // O eroare la numărare nu are voie să strice un mesaj deja trimis.
    await track("cerere_oferta", { pagina: paginaSursa(request) }, { request }).catch(() => {})
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Eroare la trimitere." }, { status: 500 })
  }
}
