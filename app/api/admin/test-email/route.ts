import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  const { to } = await req.json().catch(() => ({ to: "office@vosmart.ro" }));

  const config = {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    user: process.env.SMTP_USER,
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    hasPass: !!process.env.SMTP_PASS,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
  };

  if (!config.host || !config.user || !config.hasPass) {
    return NextResponse.json({ error: "SMTP neconfigurat", config }, { status: 500 });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: { user: config.user, pass: process.env.SMTP_PASS },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

    await transporter.verify();

    await transporter.sendMail({
      from: config.from!,
      to: to || config.user,
      subject: "VoSmart — Test SMTP ✓",
      html: `<div style="font-family:sans-serif;padding:24px;background:#0a0e1f;color:#e2e8f0;border-radius:12px">
        <h2 style="color:#34d399">✓ Email de test VoSmart</h2>
        <p>Serverul SMTP funcționează corect.</p>
        <table style="margin-top:16px;border-collapse:collapse;width:100%">
          <tr><td style="color:#64748b;padding:6px 0">Host:</td><td>${config.host}:${config.port}</td></tr>
          <tr><td style="color:#64748b;padding:6px 0">User:</td><td>${config.user}</td></tr>
          <tr><td style="color:#64748b;padding:6px 0">Trimis la:</td><td>${new Date().toISOString()}</td></tr>
        </table>
      </div>`,
    });

    return NextResponse.json({ success: true, config, sentTo: to || config.user });
  } catch (e: any) {
    return NextResponse.json({
      error: e?.message || "Eroare necunoscuta",
      code: e?.code,
      config,
    }, { status: 500 });
  }
}
