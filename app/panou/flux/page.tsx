import InConstructie from "../InConstructie";

export default function PaginaFlux() {
  return (
    <InConstructie
      titlu="Flux lunar"
      descriere="Toate contractele lunii, așezate pe etapa la care au ajuns. Ecranul la care te uiți dimineața ca să știi de unde să apuci."
      pasi={[
        "Alegi luna. Implicit e luna încheiată, cea la care se lucrează acum.",
        "Vezi coloane: fără documente, primite, se verifică, la expert, semnat, livrat.",
        "Fiecare contract e un card care se mută singur pe măsură ce dosarul înaintează.",
        "Apeși pe un card și intri direct în dosarul lunii, cu tot ce s-a strâns în el.",
      ]}
      urmatorul={{ text: "Înapoi la panou", cale: "/panou" }}
    />
  );
}
