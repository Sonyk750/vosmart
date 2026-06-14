import nodemailer from "nodemailer";

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
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const to = process.env.ADMIN_NOTIFICATION_EMAIL || "office@vosmart.ro";
  const from = process.env.EMAIL_FROM || user;

  if (!host || !user || !pass || !from) {
    console.log("Client nou in asteptare aprobare:", data.email, data.associationName);
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE !== "false",
    auth: { user, pass },
  });

  const lines = [
    `Nume: ${data.name}`,
    `Email: ${data.email}`,
    `Asociatie: ${data.associationName}`,
    `CUI: ${data.cui || "-"}`,
    `Adresa: ${data.address || "-"}`,
    `Telefon: ${data.phone || "-"}`,
    `Pachet: ${data.packageName || "smart"}`,
  ];

  await transporter.sendMail({
    from,
    to,
    subject: "VoSmart - client nou asteapta aprobare",
    text: `A fost creat un cont nou de client in VoSmart.\n\n${lines.join("\n")}\n\nIntra in panoul admin pentru aprobare.`,
  });
}
