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

export async function notifyApplicantCorporateWelcome(data: { name: string; email: string; packageName: string; companyName: string; isTrial?: boolean }) {
  if (!canSendEmail()) {
    console.log("Welcome email pentru:", data.email);
    return;
  }

  const from = process.env.EMAIL_FROM || process.env.SMTP_USER!;

  const subject = data.isTrial
    ? "Bun venit pe VoSmart — Contul Trial a fost activat!"
    : "Vă mulțumim pentru înregistrarea pe platforma VoSmart Corporate";

  const bodyText = data.isTrial
    ? `Contul Trial este activ și poate fi accesat imediat.`
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

  await createTransporter().sendMail({
    from,
    to: data.email,
    subject: "VoSmart — Confirmați adresa de email pentru a activa contul Trial",
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:0;background:#0a0e1f;color:#e2e8f0">
        <div style="background:linear-gradient(135deg,#d97706,#f59e0b);padding:40px 32px;border-radius:16px 16px 0 0;text-align:center">
          <div style="font-size:48px;margin-bottom:12px">✉️</div>
          <h1 style="margin:0;font-size:24px;color:#ffffff;font-weight:700">Confirmați adresa de email</h1>
          <p style="margin:8px 0 0;color:#fef3c7;font-size:14px">VoSmart Corporate — Trial Gratuit</p>
        </div>
        <div style="padding:32px;background:#0f1629;border-radius:0 0 16px 16px">
          <p style="font-size:16px;margin:0 0 16px">Bună ziua, <strong style="color:#fbbf24">${data.name}</strong>,</p>
          <p style="color:#94a3b8;line-height:1.7;margin:0 0 24px">
            Ați solicitat activarea unui cont Trial Gratuit pe platforma VoSmart Corporate pentru firma
            <strong style="color:#f1f5f9">${data.companyName}</strong>.
          </p>
          <p style="color:#94a3b8;line-height:1.7;margin:0 0 28px">
            Pentru a vă activa contul, vă rugăm să confirmați adresa de email apăsând butonul de mai jos.
            Linkul este valabil <strong style="color:#fbbf24">48 de ore</strong>.
          </p>
          <div style="text-align:center;margin:32px 0">
            <a href="${data.verificationLink}"
              style="display:inline-block;background:linear-gradient(135deg,#d97706,#f59e0b);color:#000;text-decoration:none;padding:16px 36px;border-radius:12px;font-weight:700;font-size:16px;letter-spacing:0.01em">
              ✓ Activează contul Trial
            </a>
          </div>
          <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:16px;margin-bottom:24px">
            <p style="margin:0 0 8px;font-size:12px;color:#64748b">Contul Trial include:</p>
            <ul style="margin:0;padding-left:16px;color:#94a3b8;font-size:14px;line-height:1.8">
              <li>1 asociație clientă</li>
              <li>Upload documente (max 5 fișiere: listă, explicații, distribuție, 2 facturi, extras cont)</li>
              <li>1 raport de cenzor generat cu AI</li>
            </ul>
          </div>
          <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0 0 16px">
            Dacă nu ați solicitat acest cont, ignorați acest email. Dacă linkul nu funcționează, copiați URL-ul:<br>
            <span style="color:#94a3b8;word-break:break-all;font-size:12px">${data.verificationLink}</span>
          </p>
          <p style="color:#64748b;font-size:13px;margin:0;border-top:1px solid #1e293b;padding-top:16px">
            Cu stimă,<br>
            <strong style="color:#94a3b8">Echipa VoSmart</strong> · office@vosmart.ro · 0756 362 828
          </p>
        </div>
      </div>
    `,
  });
}

export async function notifyAdminForTrialRegistration(data: {
  name: string;
  email: string;
  companyName: string;
  phone?: string | null;
  address?: string | null;
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
    subject: `VoSmart Trial — înregistrare nouă: ${data.companyName}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0a0e1f;color:#e2e8f0">
        <div style="background:linear-gradient(135deg,#92400e22,#d9770622);border:1px solid #d9770644;border-radius:16px;padding:24px;margin-bottom:24px">
          <h2 style="color:#fbbf24;margin:0 0 4px">Trial Gratuit — Cont nou neconfirmat</h2>
          <p style="color:#94a3b8;margin:0;font-size:13px">Utilizatorul trebuie să confirme emailul pentru activare</p>
        </div>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:#64748b;width:140px">Firmă</td><td style="padding:10px 0;border-bottom:1px solid #1e293b;font-weight:600;color:#f1f5f9">${data.companyName}</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:#64748b">Nume</td><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:#f1f5f9">${data.name}</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:#64748b">Email</td><td style="padding:10px 0;border-bottom:1px solid #1e293b"><a href="mailto:${data.email}" style="color:#fbbf24">${data.email}</a></td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:#64748b">Pachet</td><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:#fbbf24;font-weight:600">Trial Gratuit</td></tr>
          ${data.phone ? `<tr><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:#64748b">Telefon</td><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:#f1f5f9">${data.phone}</td></tr>` : ""}
          ${data.address ? `<tr><td style="padding:10px 0;color:#64748b">Adresă</td><td style="padding:10px 0;color:#f1f5f9">${data.address}</td></tr>` : ""}
        </table>
      </div>
    `,
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
