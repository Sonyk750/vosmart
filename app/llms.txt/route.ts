const content = `# VoSmart

> VoSmart este o firmă și o platformă digitală de cenzorat pentru asociații de proprietari din România.

## Servicii și capabilități

- Cenzorat pentru asociații de proprietari și condominii
- Verificarea documentelor financiar-contabile, a fondurilor, soldurilor și listelor de întreținere
- Rapoarte de cenzorat disponibile online
- Portal securizat pentru clienți și firme de cenzorat
- Analiză preliminară asistată de AI, urmată de verificare și validare umană

## Aria principală

- București și Ilfov

## Pagini principale

- Site: https://www.vosmart.ro/
- Platformă corporate: https://www.vosmart.ro/corporate
- Ghiduri și articole: https://www.vosmart.ro/blog
- Ajutor: https://www.vosmart.ro/help

## Contact

- E-mail: office@vosmart.ro
- Telefon: +40 756 362 828

## Clarificări

- VoSmart oferă servicii de cenzorat; nu este firmă de administrare imobile.
- AI-ul asistă analiza documentelor. Raportul final este verificat și validat înainte de publicare.
`

export function GET() {
  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  })
}
