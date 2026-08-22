"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Buton, Card } from "@/app/components/ui";
import { Ic } from "@/app/components/icoane";
import FormularContract, { type ContractDeEditat } from "./FormularContract";

/**
 * Ce se poate face cu un contract deschis: modificat sau reziliat.
 *
 * Rezilierea nu sterge nimic. Un contract incheiat isi pastreaza dosarele si
 * rapoartele semnate — asociatia are dreptul la ele si dupa ce colaborarea se
 * termina. Se schimba doar starea, si odata cu ea locul lui in liste si in flux.
 * De aceea butonul spune „Reziliază", nu „Șterge", si de aceea confirmarea
 * explica ce ramane, nu ce se pierde.
 */
export default function ActiuniContract({ contract }: { contract: ContractDeEditat & { status: string } }) {
  const router = useRouter();
  const [editez, setEditez] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [lucrez, setLucrez] = useState(false);
  const [eroare, setEroare] = useState("");

  const incheiat = contract.status === "incheiat";

  async function schimbaStarea(status: string) {
    setLucrez(true);
    setEroare("");
    try {
      const r = await fetch(`/api/panou/contracte/${contract.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Starea nu a putut fi schimbată.");
      setConfirm(false);
      router.refresh();
    } catch (e) {
      setEroare(e instanceof Error ? e.message : "Starea nu a putut fi schimbată.");
    } finally {
      setLucrez(false);
    }
  }

  if (editez) {
    return (
      <div className="mb-5">
        <FormularContract
          deEditat={contract}
          peRenunt={() => setEditez(false)}
          peSalvat={() => { setEditez(false); router.refresh(); }}
        />
      </div>
    );
  }

  return (
    <div className="mb-5">
      <div className="flex flex-wrap items-center gap-2">
        <Buton fel="moale" marime="mic" onClick={() => setEditez(true)}>
          <Ic.contract className="h-3.5 w-3.5" /> Editează
        </Buton>

        {incheiat ? (
          <Buton fel="moale" marime="mic" incarca={lucrez} onClick={() => schimbaStarea("activ")}>
            <Ic.bifa className="h-3.5 w-3.5" /> Reactivează
          </Buton>
        ) : (
          <Buton fel="pericol" marime="mic" onClick={() => setConfirm(true)}>
            <Ic.x className="h-3.5 w-3.5" /> Reziliază
          </Buton>
        )}
      </div>

      {confirm && (
        <Card className="mt-3 border-warn/30 bg-warn-dim/40 px-4 py-3.5">
          <p className="text-[13px] leading-relaxed text-ink">
            Contractul trece în starea <strong>încheiat</strong> și iese din fluxul lunar.
          </p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
            Dosarele și rapoartele semnate rămân la locul lor și pot fi deschise oricând —
            asociația are dreptul la ele și după încheierea colaborării. Îl poți reactiva oricând.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Buton fel="pericol" marime="mic" incarca={lucrez} onClick={() => schimbaStarea("incheiat")}>
              Confirm rezilierea
            </Buton>
            <Buton fel="fantoma" marime="mic" onClick={() => setConfirm(false)}>Renunță</Buton>
          </div>
        </Card>
      )}

      {eroare && (
        <p className="mt-3 flex items-start gap-2 text-[12.5px] text-bad">
          <Ic.alerta className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {eroare}
        </p>
      )}
    </div>
  );
}
