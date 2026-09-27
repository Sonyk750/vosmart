import { createHash } from "node:crypto";

/**
 * Amprenta unui raport semnat: sha256 al continutului, scris intr-o forma fixa.
 *
 * Copia raportului semnat sta in baza ca JSON, iar ordinea cheilor intr-un JSON
 * nu e garantata. Ca aceeasi copie sa dea mereu aceeasi amprenta, cheile se
 * sorteaza inainte de calcul. Amprenta se tipareste pe raport si pleaca in
 * emailul catre asociatie: la intrebarea „e acesta raportul pe care l-ati
 * semnat?" raspunsul se poate verifica, nu doar afirma.
 */
export function jsonCanonic(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v ?? null);
  if (Array.isArray(v)) return `[${v.map(jsonCanonic).join(",")}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o).sort().filter(k => o[k] !== undefined).map(k => `${JSON.stringify(k)}:${jsonCanonic(o[k])}`).join(",")}}`;
}

export function amprentaRaport(date: unknown): string {
  return createHash("sha256").update(jsonCanonic(date), "utf8").digest("hex");
}
