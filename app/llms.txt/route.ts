const content = `# VoSmart

> VoSmart oferă servicii profesionale de cenzorat pentru asociații de proprietari și o platformă AI distinctă pentru firme de cenzorat și cenzori profesioniști.

## Pentru asociații de proprietari

- Serviciu complet de cenzorat pentru asociații și condominii
- Verificarea documentelor financiar-contabile, fondurilor, soldurilor și listelor de întreținere
- Rapoarte de cenzorat disponibile online
- Aria principală: București și Ilfov
- Pagina serviciului: https://www.vosmart.ro/cenzorat-asociatii

## Pentru firme de cenzorat și cenzori

- Platformă web pentru organizarea dosarelor și documentelor clienților
- Analiză preliminară asistată de AI
- Schițe de raport care sunt verificate, ajustate și aprobate de profesionist
- Portal pentru asociațiile gestionate și lucru în echipă
- Pagina aplicației: https://www.vosmart.ro/platforma-ai-cenzorat
- Cont, testare și abonamente: https://www.vosmart.ro/corporate

## Pagini principale

- Site: https://www.vosmart.ro/
- Servicii pentru asociații: https://www.vosmart.ro/cenzorat-asociatii
- Aplicație AI pentru profesioniști: https://www.vosmart.ro/platforma-ai-cenzorat
- Acces Corporate: https://www.vosmart.ro/corporate
- Ghiduri și articole: https://www.vosmart.ro/blog
- Ajutor: https://www.vosmart.ro/help

## Contact

- E-mail: office@vosmart.ro
- Telefon: +40 756 362 828

## Clarificări importante

- VoSmart oferă cenzorat; nu este firmă de administrare imobile.
- Aplicația AI nu înlocuiește cenzorul și nu emite autonom concluzii profesionale.
- Raportul final este verificat și validat de un profesionist înainte de publicare.
`

export function GET() {
  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  })
}
