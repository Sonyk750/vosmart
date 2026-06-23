import nodemailer from "nodemailer";

function createTransporter() {
  const port = Number(process.env.SMTP_PORT || 465);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465, // 465 = SSL, 587 = STARTTLS
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    tls: { rejectUnauthorized: false }, // permite certificate self-signed
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

function canSendEmail() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

type ClientApprovalEmail = {
  name: string;
  email: string;
  associationName: string;
  cui?: string | null;
  address?: string | null;
  phone?: string | null;
  packageName?: string | null;
};

export async function notifyAdminForClientApproval(data: ClientApprovalEmail) {
  if (!canSendEmail()) {
    console.log("Client nou in asteptare aprobare:", data.email, data.associationName);
    return;
  }

  const to = process.env.ADMIN_NOTIFICATION_EMAIL || "office@vosmart.ro";
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER!;

  const lines = [
    `Nume: ${data.name}`,
    `Email: ${data.email}`,
    `Asociatie: ${data.associationName}`,
    `CUI: ${data.cui || "-"}`,
    `Adresa: ${data.address || "-"}`,
    `Telefon: ${data.phone || "-"}`,
    `Pachet: ${data.packageName || "smart"}`,
  ];

  await createTransporter().sendMail({
    from,
    to,
    subject: "VoSmart - client nou asteapta aprobare",
    text: `A fost creat un cont nou de client in VoSmart.\n\n${lines.join("\n")}\n\nIntra in panoul admin pentru aprobare.`,
  });
}

type CorporateRegistrationData = {
  companyName: string;
  name: string;
  email: string;
  packageName: string;
  phone?: string | null;
  address?: string | null;
  isTrial?: boolean;
};

export async function notifyAdminForCorporateRegistration(data: CorporateRegistrationData) {
  if (!canSendEmail()) {
    console.log("Corporate inregistrat:", data.email, data.companyName, data.packageName);
    return;
  }

  const to = process.env.ADMIN_NOTIFICATION_EMAIL || "office@vosmart.ro";
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER!;

  await createTransporter().sendMail({
    from,
    to,
    subject: `VoSmart Corporate - înregistrare nouă${data.isTrial ? " (Trial)" : ""}: ${data.companyName}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0a0e1f;color:#e2e8f0">
        <div style="background:linear-gradient(135deg,#7c3aed22,#06b6d422);border:1px solid #7c3aed44;border-radius:16px;padding:24px;margin-bottom:24px">
          <h2 style="color:#a78bfa;margin:0 0 8px">VoSmart Corporate</h2>
          <p style="color:#94a3b8;margin:0;font-size:14px">Înregistrare nouă${data.isTrial ? " — <strong style='color:#fbbf24'>TRIAL GRATUIT</strong>" : ""}</p>
        </div>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:#64748b;width:140px">Firmă</td><td style="padding:10px 0;border-bottom:1px solid #1e293b;font-weight:600;color:#f1f5f9">${data.companyName}</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:#64748b">Nume</td><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:#f1f5f9">${data.name}</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:#64748b">Email</td><td style="padding:10px 0;border-bottom:1px solid #1e293b"><a href="mailto:${data.email}" style="color:#a78bfa">${data.email}</a></td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:#64748b">Pachet ales</td><td style="padding:10px 0;border-bottom:1px solid #1e293b;font-weight:600;color:#34d399">${data.packageName}</td></tr>
          ${data.phone ? `<tr><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:#64748b">Telefon</td><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:#f1f5f9">${data.phone}</td></tr>` : ""}
          ${data.address ? `<tr><td style="padding:10px 0;color:#64748b">Adresă</td><td style="padding:10px 0;color:#f1f5f9">${data.address}</td></tr>` : ""}
        </table>
      </div>
    `,
  });
}

export async function notifyApplicantCorporateWelcome(data: { name: string; email: string; packageName: string; companyName: string; isTrial?: boolean; paymentUrl?: string; isCustomQuote?: boolean }) {
  if (!canSendEmail()) {
    console.log("Welcome email pentru:", data.email);
    return;
  }

  const from = process.env.EMAIL_FROM || process.env.SMTP_USER!;

  const subject = data.isTrial
    ? "Bun venit pe VoSmart — Contul Trial a fost activat!"
    : data.isCustomQuote
    ? `Cererea pentru pachetul ${data.packageName} a fost înregistrată`
    : "Vă mulțumim pentru înregistrarea pe platforma VoSmart Corporate";

  const bodyText = data.isTrial
    ? `Contul Trial este activ și poate fi accesat imediat.`
    : data.isCustomQuote
    ? `Cererea dumneavoastră pentru pachetul ${data.packageName} (preț personalizat) a fost înregistrată. Echipa noastră vă va contacta în cel mai scurt timp cu o ofertă adaptată nevoilor dumneavoastră.`
    : `Cererea dumneavoastră de abonament ${data.packageName} a fost înregistrată. Vă rugăm să finalizați plata pentru activarea contului.`;

  await createTransporter().sendMail({
    from,
    to: data.email,
    subject,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:0;background:#0a0e1f;color:#e2e8f0">
        <div style="background:linear-gradient(135deg,#7c3aed,#06b6d4);padding:40px 32px;border-radius:16px 16px 0 0;text-align:center">
          <h1 style="margin:0;font-size:28px;color:#ffffff;font-weight:700">VoSmart Corporate</h1>
          <p style="margin:8px 0 0;color:#e0e7ff;font-size:15px">Platforma pentru firme de cenzorat</p>
        </div>
        <div style="padding:32px;background:#0f1629;border-radius:0 0 16px 16px">
          <p style="font-size:16px;margin:0 0 16px">Stimate/Stimată <strong style="color:#a78bfa">${data.name}</strong>,</p>
          <p style="color:#94a3b8;line-height:1.7;margin:0 0 24px">${bodyText}</p>

          <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:20px;margin-bottom:24px">
            <p style="margin:0 0 12px;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em">Detalii cont</p>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:6px 0;color:#64748b;font-size:14px;width:120px">Firmă:</td><td style="padding:6px 0;font-size:14px;color:#f1f5f9;font-weight:500">${data.companyName}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;font-size:14px">Pachet ales:</td><td style="padding:6px 0;font-size:14px;color:#34d399;font-weight:600">${data.packageName}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;font-size:14px">Email cont:</td><td style="padding:6px 0;font-size:14px;color:#f1f5f9">${data.email}</td></tr>
            </table>
          </div>

          ${!data.isTrial && data.paymentUrl ? `
          <div style="text-align:center;margin:8px 0 28px">
            <a href="${data.paymentUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#06b6d4);color:#ffffff;text-decoration:none;padding:15px 38px;border-radius:10px;font-weight:700;font-size:16px">
              Finalizează plata →
            </a>
            <p style="margin:12px 0 0;font-size:12px;color:#64748b">Apăsați butonul pentru a finaliza plata securizat prin Stripe. Linkul este valabil 24 de ore.</p>
          </div>
          ` : ""}

          ${data.isTrial ? `
          <div style="background:#14532d22;border:1px solid #16a34a44;border-radius:12px;padding:16px;margin-bottom:24px">
            <p style="margin:0;color:#86efac;font-size:14px;line-height:1.6">
              <strong>Contul Trial include:</strong><br>
              • 1 asociație clientă<br>
              • 1 sesiune de încărcare documente<br>
              • 1 raport de cenzor generat cu AI<br>
              <br>
              Pentru a extinde capacitățile, puteți oricând alege un pachet plătit.
            </p>
          </div>
          ` : data.isCustomQuote ? `
          <div style="background:#1e1b4b22;border:1px solid #4c1d9544;border-radius:12px;padding:16px;margin-bottom:24px">
            <p style="margin:0;color:#c4b5fd;font-size:14px;line-height:1.6">
              Pachetul ${data.packageName} are preț personalizat. Un consultant VoSmart vă va contacta în curând pentru a stabili oferta și pașii de activare.
            </p>
          </div>
          ` : `
          <div style="background:#1e1b4b22;border:1px solid #4c1d9544;border-radius:12px;padding:16px;margin-bottom:24px">
            <p style="margin:0;color:#c4b5fd;font-size:14px;line-height:1.6">
              Contul dumneavoastră va fi activat imediat după confirmarea plății. Veți primi o notificare de confirmare pe acest email.
            </p>
          </div>
          `}

          <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 24px">
            Echipa noastră este disponibilă pentru orice întrebări la adresa
            <a href="mailto:office@vosmart.ro" style="color:#a78bfa">office@vosmart.ro</a>
            sau la numărul <strong style="color:#e2e8f0">0756 362 828</strong>.
          </p>

          <p style="color:#64748b;font-size:13px;margin:0;border-top:1px solid #1e293b;padding-top:16px">
            Cu stimă,<br>
            <strong style="color:#94a3b8">Echipa VoSmart</strong><br>
            Str. Constantin Dobrogeanu Gherea 89, Sector 1, București
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendTrialVerificationEmail(data: {
  name: string;
  email: string;
  companyName: string;
  verificationLink: string;
}) {
  if (!canSendEmail()) {
    console.log("Trial verification link pentru:", data.email, data.verificationLink);
    return;
  }

  const from = process.env.EMAIL_FROM || process.env.SMTP_USER!;

  const textBody = `Buna ziua, ${data.name},

Ati solicitat activarea unui cont Trial Gratuit pe platforma VoSmart Corporate pentru firma ${data.companyName}.

Apasati butonul din email sau accesati linkul de mai jos pentru a va activa contul (valabil 48 de ore):

${data.verificationLink}

Contul Trial include:
- 1 asociatie clienta
- Upload documente (max 5 fisiere: lista, explicatii, distributie, 2 facturi, extras cont)
- 1 raport de cenzor generat cu AI

Cu stima,
Echipa VoSmart
office@vosmart.ro | 0756 362 828`;

  await createTransporter().sendMail({
    from,
    to: data.email,
    subject: "VoSmart - Activati contul Trial Gratuit",
    text: textBody,
    html: `<!DOCTYPE html>
<html lang="ro"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:20px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e0e0e0">
  <tr><td style="background:#f59e0b;padding:24px 32px;text-align:center">
    <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700">VoSmart Corporate</h1>
    <p style="margin:6px 0 0;color:#fff8e1;font-size:14px">Activare cont Trial Gratuit</p>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 16px;font-size:16px;color:#333333">Buna ziua, <strong>${data.name}</strong>,</p>
    <p style="margin:0 0 16px;color:#555555;line-height:1.6">
      Ati solicitat activarea unui cont <strong>Trial Gratuit</strong> pe platforma VoSmart Corporate
      pentru firma <strong>${data.companyName}</strong>.
    </p>
    <p style="margin:0 0 24px;color:#555555;line-height:1.6">
      Apasati butonul de mai jos pentru a va confirma adresa de email si a activa contul.
      Linkul este valabil <strong>48 de ore</strong>.
    </p>
    <table cellpadding="0" cellspacing="0" width="100%">
    <tr><td align="center" style="padding:8px 0 28px">
      <a href="${data.verificationLink}"
        style="display:inline-block;background:#f59e0b;color:#000000;text-decoration:none;padding:14px 32px;border-radius:6px;font-weight:700;font-size:16px">
        Activeaza contul Trial
      </a>
    </td></tr>
    </table>
    <table cellpadding="0" cellspacing="0" width="100%" style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;margin-bottom:24px">
    <tr><td style="padding:16px">
      <p style="margin:0 0 8px;font-size:13px;color:#92400e;font-weight:700">Contul Trial include:</p>
      <ul style="margin:0;padding-left:18px;color:#78350f;font-size:14px;line-height:1.8">
        <li>1 asociatie clienta</li>
        <li>Upload documente (max 5 fisiere)</li>
        <li>1 raport de cenzor generat cu AI</li>
      </ul>
    </td></tr>
    </table>
    <p style="margin:0;color:#888888;font-size:13px;border-top:1px solid #eeeeee;padding-top:16px">
      Daca nu ati solicitat acest cont, ignorati acest email.<br><br>
      Cu stima,<br>
      <strong style="color:#555555">Echipa VoSmart</strong><br>
      office@vosmart.ro &nbsp;|&nbsp; 0756 362 828
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`,
  });
}

export async function notifyAdminForTrialRegistration(data: {
  name: string;
  email: string;
  companyName: string;
  phone?: string | null;
  address?: string | null;
  verificationLink?: string;
}) {
  if (!canSendEmail()) {
    console.log("Trial inregistrat:", data.email, data.companyName);
    return;
  }

  const to = process.env.ADMIN_NOTIFICATION_EMAIL || "office@vosmart.ro";
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER!;

  await createTransporter().sendMail({
    from,
    to,
    subject: `VoSmart Trial - inregistrare noua: ${data.companyName}`,
    text: `VoSmart Trial Gratuit - cont nou neconfirmat

Firma: ${data.companyName}
Nume: ${data.name}
Email: ${data.email}
Pachet: Trial Gratuit
${data.phone ? `Telefon: ${data.phone}` : ""}
${data.address ? `Adresa: ${data.address}` : ""}

Utilizatorul trebuie sa confirme emailul pentru activare.
${data.verificationLink ? `\nLink activare (backup daca emailul clientului nu a ajuns):\n${data.verificationLink}` : ""}`,
    html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:20px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e0e0e0">
  <tr><td style="background:#d97706;padding:20px 32px">
    <h2 style="margin:0;color:#ffffff;font-size:18px">Trial Gratuit — Cont nou neconfirmat</h2>
    <p style="margin:4px 0 0;color:#fff8e1;font-size:13px">Utilizatorul trebuie sa confirme emailul pentru activare</p>
  </td></tr>
  <tr><td style="padding:24px 32px">
    <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse">
      <tr><td style="padding:9px 0;border-bottom:1px solid #eeeeee;color:#888888;width:130px;font-size:14px">Firma</td><td style="padding:9px 0;border-bottom:1px solid #eeeeee;font-weight:700;color:#333333;font-size:14px">${data.companyName}</td></tr>
      <tr><td style="padding:9px 0;border-bottom:1px solid #eeeeee;color:#888888;font-size:14px">Nume</td><td style="padding:9px 0;border-bottom:1px solid #eeeeee;color:#333333;font-size:14px">${data.name}</td></tr>
      <tr><td style="padding:9px 0;border-bottom:1px solid #eeeeee;color:#888888;font-size:14px">Email</td><td style="padding:9px 0;border-bottom:1px solid #eeeeee;font-size:14px"><a href="mailto:${data.email}" style="color:#d97706">${data.email}</a></td></tr>
      <tr><td style="padding:9px 0;border-bottom:1px solid #eeeeee;color:#888888;font-size:14px">Pachet</td><td style="padding:9px 0;border-bottom:1px solid #eeeeee;color:#d97706;font-weight:700;font-size:14px">Trial Gratuit</td></tr>
      ${data.phone ? `<tr><td style="padding:9px 0;border-bottom:1px solid #eeeeee;color:#888888;font-size:14px">Telefon</td><td style="padding:9px 0;border-bottom:1px solid #eeeeee;color:#333333;font-size:14px">${data.phone}</td></tr>` : ""}
      ${data.address ? `<tr><td style="padding:9px 0;color:#888888;font-size:14px">Adresa</td><td style="padding:9px 0;color:#333333;font-size:14px">${data.address}</td></tr>` : ""}
    </table>
    ${data.verificationLink ? `
    <table cellpadding="0" cellspacing="0" width="100%" style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;margin-top:20px">
    <tr><td style="padding:16px">
      <p style="margin:0 0 8px;font-size:13px;color:#92400e;font-weight:700">Link activare client (backup)</p>
      <p style="margin:0 0 10px;font-size:12px;color:#78350f">Daca emailul clientului nu a ajuns, puteti trimite acest link manual:</p>
      <p style="margin:0 0 12px;word-break:break-all;font-size:12px;color:#555555">${data.verificationLink}</p>
      <a href="${data.verificationLink}" style="display:inline-block;background:#d97706;color:#ffffff;text-decoration:none;padding:8px 16px;border-radius:4px;font-size:13px;font-weight:700">Deschide link activare</a>
    </td></tr>
    </table>` : ""}
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`,
  });
}

export async function sendPaymentInvoiceEmail(data: {
  name: string;
  email: string;
  companyName: string;
  cui?: string | null;
  address?: string | null;
  packageName: string;
  priceRon: number;
}) {
  if (!canSendEmail()) return;

  const from = process.env.EMAIL_FROM || process.env.SMTP_USER!;
  const now = new Date();

  // Numar factura: VOS-YYYYMMDD-XXXXX
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  const invoiceNo = `VOS-${datePart}-${rand}`;

  const dateStr = now.toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric" });

  // TVA 19% — presupunem ca pretul afisat include TVA
  const totalCuTva = data.priceRon;
  const totalFaraTva = Math.round((totalCuTva / 1.19) * 100) / 100;
  const tvaValoare = Math.round((totalCuTva - totalFaraTva) * 100) / 100;

  // Perioada de abonament (luna urmatoare)
  const perioadaStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const perioadaEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);
  const perioadaStr = `${perioadaStart.toLocaleDateString("ro-RO", { day: "2-digit", month: "long", year: "numeric" })} — ${perioadaEnd.toLocaleDateString("ro-RO", { day: "2-digit", month: "long", year: "numeric" })}`;

  // Date furnizor din env
  const sellerName  = process.env.COMPANY_NAME  || "VoSmart SRL";
  const sellerCui   = process.env.COMPANY_CUI   || "";
  const sellerReg   = process.env.COMPANY_REG_COM || "";
  const sellerAddr  = process.env.COMPANY_ADDRESS || "Str. Constantin Dobrogeanu Gherea 89, Sector 1, București";
  const sellerIban  = process.env.COMPANY_IBAN   || "";
  const sellerBank  = process.env.COMPANY_BANK   || "";

  const fmt = (n: number) => n.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  await createTransporter().sendMail({
    from,
    to: data.email,
    subject: `Factură VoSmart #${invoiceNo} — Abonament ${data.packageName}`,
    html: `<!DOCTYPE html>
<html lang="ro"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{margin:0;padding:0;background:#f0f2f5;font-family:Arial,Helvetica,sans-serif}
  .wrap{max-width:680px;margin:24px auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0}
  .hdr{background:#0a0e1f;padding:28px 36px;border-bottom:4px solid #7c3aed}
  .hdr h1{margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px}
  .hdr p{margin:4px 0 0;color:#94a3b8;font-size:13px}
  .meta{background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:16px 36px}
  .meta table{width:100%;border-collapse:collapse}
  .meta td{padding:3px 0;font-size:13px;color:#64748b}
  .meta td b{color:#1e293b}
  .body{padding:28px 36px}
  .parties{width:100%;border-collapse:collapse;margin-bottom:24px}
  .parties td{width:50%;padding:0;vertical-align:top}
  .party-box{border:1px solid #e2e8f0;border-radius:6px;padding:14px 16px}
  .party-label{font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;margin-bottom:8px;font-weight:700}
  .party-name{font-size:15px;font-weight:700;color:#1e293b;margin-bottom:6px}
  .party-line{font-size:12px;color:#64748b;margin:2px 0;line-height:1.5}
  .items-table{width:100%;border-collapse:collapse;margin-bottom:20px}
  .items-table th{background:#f1f5f9;padding:9px 12px;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;text-align:left;border:1px solid #e2e8f0}
  .items-table th.right{text-align:right}
  .items-table td{padding:12px 12px;font-size:13px;color:#374151;border:1px solid #e2e8f0;vertical-align:top}
  .items-table td.right{text-align:right;white-space:nowrap}
  .totals{width:100%;border-collapse:collapse;margin-bottom:24px}
  .totals td{padding:5px 12px;font-size:13px}
  .totals td.label{color:#64748b;text-align:right;width:70%}
  .totals td.val{color:#374151;text-align:right;white-space:nowrap;width:30%}
  .totals tr.total-row td{font-size:16px;font-weight:700;color:#1e293b;border-top:2px solid #7c3aed;padding-top:10px}
  .badge{display:inline-block;background:#dcfce7;color:#16a34a;font-size:12px;font-weight:700;padding:4px 12px;border-radius:999px;margin-bottom:20px}
  .footer{background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 36px;font-size:12px;color:#94a3b8;line-height:1.6}
</style>
</head>
<body>
<div class="wrap">
  <!-- Header -->
  <div class="hdr">
    <h1>VoSmart — Factură</h1>
    <p>Platformă pentru firme de cenzorat · vosmart.ro</p>
  </div>

  <!-- Metadata factura -->
  <div class="meta">
    <table>
      <tr>
        <td><b>Nr. factură:</b> ${invoiceNo}</td>
        <td style="text-align:right"><b>Data emiterii:</b> ${dateStr}</td>
      </tr>
      <tr>
        <td><b>Tip:</b> Factură abonament lunar</td>
        <td style="text-align:right"><b>Perioadă:</b> ${perioadaStr}</td>
      </tr>
    </table>
  </div>

  <div class="body">
    <span class="badge">✓ Plată confirmată</span>

    <!-- Furnizor / Cumparator -->
    <table class="parties">
      <tr>
        <td style="padding-right:12px">
          <div class="party-box">
            <div class="party-label">Furnizor</div>
            <div class="party-name">${sellerName}</div>
            ${sellerCui   ? `<div class="party-line">CUI: ${sellerCui}</div>` : ""}
            ${sellerReg   ? `<div class="party-line">Reg. Com.: ${sellerReg}</div>` : ""}
            <div class="party-line">${sellerAddr}</div>
            ${sellerIban  ? `<div class="party-line">IBAN: ${sellerIban}</div>` : ""}
            ${sellerBank  ? `<div class="party-line">Bancă: ${sellerBank}</div>` : ""}
          </div>
        </td>
        <td style="padding-left:12px">
          <div class="party-box">
            <div class="party-label">Cumpărător</div>
            <div class="party-name">${data.companyName}</div>
            ${data.cui     ? `<div class="party-line">CUI: ${data.cui}</div>` : ""}
            ${data.address ? `<div class="party-line">${data.address}</div>` : ""}
            <div class="party-line">Email: ${data.email}</div>
          </div>
        </td>
      </tr>
    </table>

    <!-- Tabel produse -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width:5%">#</th>
          <th>Descriere</th>
          <th class="right" style="width:18%">Preț fără TVA</th>
          <th class="right" style="width:10%">TVA %</th>
          <th class="right" style="width:18%">Total</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td>
            <strong>Abonament VoSmart Corporate — ${data.packageName}</strong><br>
            <span style="font-size:12px;color:#94a3b8">Perioadă: ${perioadaStr}</span>
          </td>
          <td class="right">${fmt(totalFaraTva)} RON</td>
          <td class="right">19%</td>
          <td class="right"><strong>${fmt(totalCuTva)} RON</strong></td>
        </tr>
      </tbody>
    </table>

    <!-- Totaluri -->
    <table class="totals">
      <tr>
        <td class="label">Subtotal (fără TVA)</td>
        <td class="val">${fmt(totalFaraTva)} RON</td>
      </tr>
      <tr>
        <td class="label">TVA 19%</td>
        <td class="val">${fmt(tvaValoare)} RON</td>
      </tr>
      <tr class="total-row">
        <td class="label">TOTAL DE PLATĂ</td>
        <td class="val">${fmt(totalCuTva)} RON</td>
      </tr>
    </table>

    <p style="font-size:13px;color:#64748b;margin:0 0 8px">
      Plata a fost procesată securizat prin <strong>Stripe</strong>.
      Documentul de mai sus reprezintă confirmarea plății dvs. și poate fi folosit în evidența contabilă.
    </p>
    <p style="font-size:13px;color:#64748b;margin:0">
      Pentru orice nelamuriri legate de facturare contactați:<br>
      <a href="mailto:office@vosmart.ro" style="color:#7c3aed">office@vosmart.ro</a> &nbsp;·&nbsp; 0756 362 828
    </p>
  </div>

  <div class="footer">
    <strong style="color:#475569">${sellerName}</strong>${sellerCui ? ` · CUI ${sellerCui}` : ""}${sellerAddr ? ` · ${sellerAddr}` : ""}<br>
    Acest document a fost generat automat la data de ${dateStr}.
  </div>
</div>
</body></html>`,
  });
}

export async function notifyApplicantCorporateActivated(data: { name: string; email: string; packageName: string; companyName: string }) {
  if (!canSendEmail()) return;

  const from = process.env.EMAIL_FROM || process.env.SMTP_USER!;

  await createTransporter().sendMail({
    from,
    to: data.email,
    subject: "Contul VoSmart Corporate a fost activat — puteți începe!",
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:0;background:#0a0e1f;color:#e2e8f0">
        <div style="background:linear-gradient(135deg,#059669,#06b6d4);padding:40px 32px;border-radius:16px 16px 0 0;text-align:center">
          <div style="font-size:48px;margin-bottom:12px">✅</div>
          <h1 style="margin:0;font-size:26px;color:#ffffff;font-weight:700">Cont activat cu succes!</h1>
        </div>
        <div style="padding:32px;background:#0f1629;border-radius:0 0 16px 16px">
          <p style="font-size:16px;margin:0 0 16px">Stimate/Stimată <strong style="color:#34d399">${data.name}</strong>,</p>
          <p style="color:#94a3b8;line-height:1.7;margin:0 0 24px">
            Plata a fost confirmată și contul VoSmart Corporate pentru firma
            <strong style="color:#f1f5f9">${data.companyName}</strong>
            (pachet <strong style="color:#34d399">${data.packageName}</strong>) este acum activ.
          </p>
          <p style="color:#94a3b8;line-height:1.7;margin:0 0 24px">
            Puteți accesa portalul corporate și puteți adăuga asociațiile dvs. cliente pentru a începe să emiteți rapoarte.
          </p>
          <div style="text-align:center;margin:32px 0">
            <a href="https://vosmart.ro/corporate/login" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:600;font-size:15px">
              Accesează Portalul Corporate →
            </a>
          </div>
          <p style="color:#64748b;font-size:13px;margin:0;border-top:1px solid #1e293b;padding-top:16px">
            Cu stimă,<br>
            <strong style="color:#94a3b8">Echipa VoSmart</strong><br>
            office@vosmart.ro · 0756 362 828
          </p>
        </div>
      </div>
    `,
  });
}
