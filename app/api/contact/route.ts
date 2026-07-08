import { NextResponse } from "next/server"
import { rateLimit, clientIp } from "@/lib/rate-limit"
import nodemailer from "nodemailer"

function esc(s: string) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

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

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Eroare la trimitere." }, { status: 500 })
  }
}
