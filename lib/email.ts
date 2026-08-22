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
/**
 * Ruta de resetare vrea sa stie daca are pe unde trimite emailul, ca sa nu se
 * apuce sa genereze coduri care n-ajung nicaieri. `canSendEmail` e privat, deci
 * il expunem aici sub numele folosit de rute.
 */
export function emailConfigured(): boolean {
  return canSendEmail();
}

/**
 * Codul din 8 caractere cu care omul isi pune parola noua fara sa fie autentificat.
 *
 * Codul se scrie cu spatiu la mijloc (ABCD EFGH) doar aici, ca sa se citeasca
 * usor; forma tastata nu conteaza — `normalizeazaCod()` scoate spatiile.
 */
export async function sendCodResetareParola(data: {
  to: string;
  cod: string;
  nume?: string | null;
  minute: number;
}) {
  if (!canSendEmail()) return;

  const from = process.env.EMAIL_FROM || process.env.SMTP_USER!;
  const codAfisat = `${data.cod.slice(0, 4)} ${data.cod.slice(4)}`;

  await createTransporter().sendMail({
    from,
    to: data.to,
    subject: `Cod pentru parola nouă: ${data.cod}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:0;background:#0a0e1f;color:#e2e8f0">
        <div style="background:linear-gradient(135deg,#7c3aed,#06b6d4);padding:32px;border-radius:16px 16px 0 0;text-align:center">
          <h1 style="margin:0;font-size:24px;color:#ffffff;font-weight:700">VoSmart</h1>
          <p style="margin:8px 0 0;color:#ddd6fe;font-size:14px">Codul pentru parola nouă</p>
        </div>
        <div style="padding:32px;background:#0f1629;border-radius:0 0 16px 16px">
          <p style="font-size:15px;line-height:1.7;margin:0 0 24px">
            ${data.nume ? `Bună, <strong style="color:#a78bfa">${data.nume}</strong>. ` : ""}Ai cerut o parolă nouă pentru contul
            <strong style="color:#f1f5f9">${data.to}</strong>. Introdu codul de mai jos în pagina rămasă deschisă:
          </p>

          <div style="background:#050814;border:1px solid #312e81;border-radius:12px;padding:20px;margin:0 0 24px;text-align:center">
            <div style="font-family:'Courier New',monospace;font-size:30px;font-weight:700;color:#ffffff;letter-spacing:9px">
              ${codAfisat}
            </div>
          </div>

          <div style="background:#131a33;border:1px solid #1e293b;border-radius:12px;padding:20px;margin:0 0 24px">
            <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#a78bfa;text-transform:uppercase;letter-spacing:.5px">Ce ai de făcut</p>
            <ol style="margin:0;padding-left:20px;font-size:14px;color:#cbd5e1;line-height:1.9">
              <li>Întoarce-te în pagina VoSmart rămasă deschisă, unde sunt cele 8 căsuțe goale.</li>
              <li>Scrie acolo codul de mai sus, câte un caracter în fiecare căsuță.</li>
              <li>Îți alegi apoi parola nouă și o scrii de două ori.</li>
            </ol>
            <p style="margin:12px 0 0;font-size:13px;color:#64748b">
              Ai închis pagina? Intră din nou pe
              <a href="https://www.vosmart.ro/login" style="color:#a78bfa">pagina de autentificare</a>,
              scrie-ți emailul și apasă „Am uitat parola" — îți trimitem alt cod.
            </p>
          </div>

          <p style="font-size:13px;color:#64748b;margin:0 0 20px;line-height:1.7">
            Codul este valabil <strong style="color:#94a3b8">${data.minute} de minute</strong> și poate fi folosit o singură dată.
            În cod nu există niciodată 0, 1, O, I sau L, tocmai ca să nu le confunzi.
          </p>

          <div style="background:#2a1215;border:1px solid #7f1d1d;border-radius:10px;padding:14px 16px;margin:0 0 20px">
            <p style="margin:0;font-size:13px;line-height:1.6;color:#fca5a5">
              Dacă nu tu ai cerut schimbarea parolei, ignoră acest email — parola ta rămâne neschimbată.
              Nu da acest cod nimănui; nici noi nu ți-l cerem niciodată.
            </p>
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
