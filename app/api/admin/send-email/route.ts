import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
  }

  const { to, subject, message } = await req.json();
  if (!to || !subject || !message) {
    return NextResponse.json({ error: "Câmpuri lipsă" }, { status: 400 });
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return NextResponse.json({ error: "Email neconfigurat pe server" }, { status: 503 });
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    tls: { rejectUnauthorized: false },
  });

  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

  await transporter.sendMail({
    from: `"VoSmart Admin" <${from}>`,
    to,
    replyTo: from,
    subject,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0e1f;color:#e2e8f0;border-radius:16px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#7c3aed,#06b6d4);padding:32px;text-align:center">
          <h1 style="margin:0;font-size:22px;color:#fff;font-weight:700">VoSmart</h1>
          <p style="margin:6px 0 0;color:#e0e7ff;font-size:13px">Mesaj de la echipa administrativă</p>
        </div>
        <div style="padding:32px;background:#0f1629">
          <div style="white-space:pre-wrap;line-height:1.8;color:#cbd5e1;font-size:15px">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
          <hr style="border:none;border-top:1px solid #1e293b;margin:28px 0"/>
          <p style="margin:0;color:#64748b;font-size:13px">
            Cu stimă,<br/>
            <strong style="color:#94a3b8">Echipa VoSmart</strong><br/>
            office@vosmart.ro · 0756 362 828
          </p>
        </div>
      </div>
    `,
  });

  return NextResponse.json({ success: true });
}
