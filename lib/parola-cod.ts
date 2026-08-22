/**
 * Forma codului de resetare — partea PURA, fara baza de date.
 *
 * Sta separat de `parola-uitata.ts` dinadins: componenta cu cele 8 casute e cod
 * de browser, iar `parola-uitata.ts` importa Prisma si bcrypt. Un singur import
 * gresit ar fi tras tot serverul in pachetul trimis catre telefon.
 */

export const LUNGIME_COD = 8

/**
 * Alfabetul codului. Lipsesc intentionat 0/O, 1/I/L si literele mici: sunt exact
 * caracterele pe care oamenii le confunda cand transcriu un cod dintr-un email.
 * Raman 31 de simboluri, adica peste 850 de miliarde de combinatii pentru 8
 * caractere — mai mult decat suficient, fara sa transformam resetarea intr-un test.
 */
export const ALFABET_COD = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"

/**
 * Aducem la forma comparabila: fara spatii sau liniute, totul cu majuscule.
 * Omul poate tasta cu litere mici sau poate lipi codul cu spatii — merge la fel.
 */
export function normalizeazaCod(brut: string): string {
  return brut.replace(/[\s-]/g, "").toUpperCase()
}

/**
 * Regula parolei noi. E aceeasi cu cea de la inregistrare (/api/auth/register si
 * /api/corporate/register): minim 8 caractere. Sta aici ca sa n-o rescrie fiecare
 * ruta si ca ecranul s-o poata verifica inainte de a trimite ceva.
 */
export const LUNGIME_MINIMA_PAROLA = 8
export const REGULA_PAROLA = "Parola nouă trebuie să aibă minim 8 caractere."

export function parolaValida(parola: string): boolean {
  return parola.length >= LUNGIME_MINIMA_PAROLA
}

/**
 * Mesajul aratat omului cand codul nu trece. Sta aici, si nu in fiecare ruta,
 * pentru ca doua rute il verifica (`verifica-cod` si `parola-noua`) — altfel una
 * ar spune „cod gresit" si cealalta „cod invalid" pentru aceeasi situatie.
 */
export function mesajEsecCod(
  motiv: "lipsa" | "expirat" | "gresit" | "epuizat" | "parola-slaba",
  incercariRamase?: number,
  maxIncercari = 5,
): string {
  switch (motiv) {
    case "parola-slaba": return REGULA_PAROLA
    case "lipsa":        return "Nu există niciun cod activ pentru această adresă. Cere unul nou."
    case "expirat":      return "Codul a expirat. Cere un cod nou."
    case "epuizat":      return `Ai greșit codul de ${maxIncercari} ori. Cere un cod nou.`
    case "gresit":
      return incercariRamase
        ? `Cod greșit. Mai ai ${incercariRamase} ${incercariRamase === 1 ? "încercare" : "încercări"}.`
        : "Cod greșit."
  }
}
