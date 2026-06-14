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
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_NOTIFICATION_EMAIL || "office@vosmart.ro";
  const from = process.env.EMAIL_FROM || "VoSmart <onboarding@resend.dev>";

  if (!apiKey) {
    console.log("Client nou in asteptare aprobare:", data.email, data.associationName);
    return;
  }

  const lines = [
    `Nume: ${data.name}`,
    `Email: ${data.email}`,
    `Asociatie: ${data.associationName}`,
    `CUI: ${data.cui || "-"}`,
    `Adresa: ${data.address || "-"}`,
    `Telefon: ${data.phone || "-"}`,
    `Pachet: ${data.packageName || "smart"}`,
  ];

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: "VoSmart - client nou asteapta aprobare",
      text: `A fost creat un cont nou de client in VoSmart.\n\n${lines.join("\n")}\n\nIntra in panoul admin pentru aprobare.`,
    }),
  });

  if (!response.ok) {
    console.error("Eroare trimitere email aprobare client:", await response.text());
  }
}
