// Unde ajunge fiecare rol dupa autentificare. O singura sursa de adevar: pagina
// de login, portarul din proxy.ts si redirectarile din panouri citesc toate de
// aici, ca sa nu ajunga sa se contrazica intre ele.

export const RUTA_LOGIN = "/login";

export function acasaDupaRol(role: string | null | undefined): string {
  switch (role) {
    case "admin":
    case "cenzor":
      // Spatiul de lucru al firmei — singurul.
      return "/panou";
    default:
      // Persoana desemnata prin contract isi vede rapoartele semnate. Ecranul
      // ei nu e inca scris; pana atunci o lasam pe pagina de prezentare, nu
      // intr-una care ar arunca-o inapoi la login.
      return "/";
  }
}

/**
 * `?next=` vine din URL, deci din mana oricui. Acceptam doar cai interne:
 * fara `//host` si fara `http://...`, altfel linkul de login ar putea trimite
 * omul logat pe un site strain.
 */
export function caleInterna(next: string | null | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}
