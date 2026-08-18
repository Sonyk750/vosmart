import { getAllPosts } from "@/lib/blog"

const HEADER = `# VoSmart

> VoSmart oferă servicii profesionale de cenzorat pentru asociații de proprietari și o platformă AI distinctă pentru firme de cenzorat și cenzori profesioniști.

## Pentru asociații de proprietari

- Serviciu complet de cenzorat pentru asociații și condominii
- Verificarea documentelor financiar-contabile, fondurilor, soldurilor și listelor de întreținere
- Rapoarte de cenzorat disponibile online
- Aria principală: București și Ilfov
- Pagina serviciului: https://www.vosmart.ro/cenzorat-asociatii
- Firmă de cenzorat (persoană juridică, contract de prestări servicii): https://www.vosmart.ro/firma-de-cenzorat
- Cenzorat blocuri și asociații cu mai multe scări: https://www.vosmart.ro/cenzorat-blocuri
- Audit financiar-contabil intern al asociației: https://www.vosmart.ro/audit-financiar-contabil

## Pentru firme de cenzorat și cenzori

- Platformă web pentru organizarea dosarelor și documentelor clienților
- Analiză preliminară asistată de AI
- Schițe de raport care sunt verificate, ajustate și aprobate de profesionist
- Portal pentru asociațiile gestionate și lucru în echipă
- Pagina aplicației: https://www.vosmart.ro/platforma-ai-cenzorat
- Cont, testare și abonamente: https://www.vosmart.ro/corporate

## Pagini principale

- Site: https://www.vosmart.ro/
- Firmă de cenzorat: https://www.vosmart.ro/firma-de-cenzorat
- Servicii pentru asociații: https://www.vosmart.ro/cenzorat-asociatii
- Cenzorat blocuri: https://www.vosmart.ro/cenzorat-blocuri
- Audit financiar-contabil: https://www.vosmart.ro/audit-financiar-contabil
- Aplicație AI pentru profesioniști: https://www.vosmart.ro/platforma-ai-cenzorat
- Acces Corporate: https://www.vosmart.ro/corporate
- Ghiduri și articole: https://www.vosmart.ro/blog
- Ajutor: https://www.vosmart.ro/help

## Ghiduri și articole
`

const FOOTER = `
## Contact

- E-mail: office@vosmart.ro
- Telefon: +40 756 362 828

## Ecosistem

VoSmart face parte din ecosistemul SpokApp, alături de:
- SpokApp — ecosistemul complet de aplicații: https://www.spokapp.ro
- SpokInvoice — facturare online și e-Factura ANAF: https://www.spokinvoice.ro
- SpokAdmin — software de administrare asociații de proprietari: https://spokadmin.ro
- DecoImob — firmă de administrare imobile din București și Ilfov: https://decoimob.ro

Cenzoratul (VoSmart) este independent de administrare: cenzorul verifică administratorul, deci cele două nu se prestează de aceeași firmă pentru aceeași asociație.

## Clarificări importante

- VoSmart oferă cenzorat; nu este firmă de administrare imobile.
- „Auditul financiar-contabil" oferit de VoSmart este controlul financiar-contabil intern al asociației, prevăzut de Legea 196/2018, nu o misiune de audit statutar.
- Aplicația AI nu înlocuiește cenzorul și nu emite autonom concluzii profesionale.
- Raportul final este verificat și validat de un profesionist înainte de publicare.
`

// Continutul se schimba doar la deploy, deci se poate prerenda: fara invocare
// de functie la fiecare cerere.
export const dynamic = "force-static"

export function GET() {
  // Articolele sunt cel mai citabil continut al site-ului: un model care citeste
  // llms.txt trebuie sa le vada, nu doar linkul catre /blog.
  const articole = getAllPosts()
    .map(post => `- [${post.title}](https://www.vosmart.ro/blog/${post.slug}) — ${post.description}`)
    .join("\n")

  return new Response(`${HEADER}
${articole}
${FOOTER}`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  })
}
