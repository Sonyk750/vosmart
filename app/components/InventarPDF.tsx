'use client';

import { Document, Page, Text, View, StyleSheet, pdf, Font } from '@react-pdf/renderer';

/**
 * Inventarul dosarului, pe hârtie.
 *
 * E o piesă de dosar, nu un ecran salvat: spune ce documente s-au primit pentru
 * o lună, cum se numesc ele CITITE DIN CONȚINUT (nu după numele fișierului), de
 * la cine vin și ce amprentă are fiecare. Cu el, întrebarea „ce mi-ați predat?"
 * are un răspuns semnabil, care se poate anexa la raportul de cenzor.
 *
 * Se face în browser, nu pe server, din același motiv ca oferta: fonturile stau
 * în `/public/fonts` și se servesc static. Pe server ar trebui băgate în pachetul
 * funcției, iar fără ele diacriticele românești cu virgulă (ș, ț) ies goale —
 * Helvetica, fontul implicit, nu le are.
 */

Font.register({
  family: 'Roboto',
  fonts: [
    { src: '/fonts/Roboto-Regular.ttf', fontWeight: 'normal' },
    { src: '/fonts/Roboto-Bold.ttf', fontWeight: 'bold' },
  ],
});

export type FisierInventar = {
  numeFisier: string;
  tip: string;
  eticheta: string;
  denumireAi: string | null;
  emitentAi: string | null;
  perioadaAi: string | null;
  tipSursa: string;
  marime: number;
  marimeOriginala: number | null;
  amprenta: string | null;
};

export type DateInventar = {
  contract: { denumire: string; cui: string; numar: string | null };
  luna: string;
  an: number;
  fisiere: FisierInventar[];
  /** Ce lipsește dintr-un dosar complet, în cuvintele omului. */
  lipsa: string[];
  /** Cine a scos inventarul. */
  intocmitDe: string;
};

const C = {
  cerneala: '#111827',
  sters: '#6B7280',
  linie: '#E5E7EB',
  banda: '#F9FAFB',
  marca: '#7C3AED',
};

const s = StyleSheet.create({
  pagina: { paddingTop: 34, paddingBottom: 46, paddingHorizontal: 34, fontFamily: 'Roboto', fontSize: 8.5, color: C.cerneala },

  cap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  marca: { fontSize: 15, fontWeight: 'bold', color: C.marca, letterSpacing: 0.4 },
  submarca: { fontSize: 7, color: C.sters, marginTop: 1 },
  titlu: { fontSize: 13, fontWeight: 'bold', marginTop: 12 },
  subtitlu: { fontSize: 9, color: C.sters, marginTop: 2 },
  rigla: { height: 2, backgroundColor: C.marca, marginTop: 10, marginBottom: 12 },

  fise: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  fisa: { width: '33.33%', marginBottom: 7 },
  fisaEticheta: { fontSize: 6.5, color: C.sters, textTransform: 'uppercase', letterSpacing: 0.5 },
  fisaValoare: { fontSize: 9.5, marginTop: 1.5 },

  antet: { flexDirection: 'row', backgroundColor: C.marca, paddingVertical: 5, paddingHorizontal: 5 },
  antetText: { color: '#FFFFFF', fontSize: 7, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.4 },
  rand: { flexDirection: 'row', paddingVertical: 4.5, paddingHorizontal: 5, borderBottomWidth: 0.5, borderBottomColor: C.linie },
  randPar: { backgroundColor: C.banda },

  cNr: { width: '4%' },
  cDenumire: { width: '31%', paddingRight: 4 },
  cTip: { width: '17%', paddingRight: 4 },
  cEmitent: { width: '20%', paddingRight: 4 },
  cFisier: { width: '20%', paddingRight: 4 },
  cMarime: { width: '8%', textAlign: 'right' },

  denumire: { fontSize: 8.5 },
  marunt: { fontSize: 6.5, color: C.sters, marginTop: 1 },

  total: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 5, borderTopWidth: 1.5, borderTopColor: C.cerneala, marginTop: 2 },
  totalText: { fontSize: 8.5, fontWeight: 'bold' },

  caseta: { marginTop: 14, padding: 9, backgroundColor: C.banda, borderLeftWidth: 2.5, borderLeftColor: C.marca },
  casetaTitlu: { fontSize: 8, fontWeight: 'bold', marginBottom: 3 },
  casetaText: { fontSize: 7.5, color: C.sters, lineHeight: 1.5 },

  semnaturi: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 26 },
  semnatura: { width: '45%' },
  linieSemnatura: { borderTopWidth: 0.5, borderTopColor: C.cerneala, marginTop: 26, paddingTop: 3 },

  subsol: {
    position: 'absolute', bottom: 22, left: 34, right: 34,
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 0.5, borderTopColor: C.linie, paddingTop: 5,
    fontSize: 6.5, color: C.sters,
  },
});

const kb = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);
const cuMajuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** Exportat ca sa poata fi randat si intr-o proba, nu doar din browser. */
export function InventarDocument({ date }: { date: DateInventar }) {
  const { contract, luna, an, fisiere, lipsa, intocmitDe } = date;
  const primit = fisiere.reduce((t, f) => t + (f.marimeOriginala ?? f.marime), 0);
  const pastrat = fisiere.reduce((t, f) => t + f.marime, 0);
  const citite = fisiere.filter(f => f.tipSursa === 'ai').length;
  const emisLa = new Date().toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <Document
      title={`Inventar dosar ${luna} ${an} — ${contract.denumire}`}
      author="VoSmart"
      subject="Inventarul documentelor primite pentru verificarea de cenzorat"
    >
      <Page size="A4" style={s.pagina}>
        <View style={s.cap}>
          <View>
            <Text style={s.marca}>VoSmart</Text>
            <Text style={s.submarca}>Primul cenzorat cu AI</Text>
          </View>
          <Text style={{ fontSize: 7, color: C.sters }}>Emis: {emisLa}</Text>
        </View>

        <Text style={s.titlu}>INVENTARUL DOSARULUI</Text>
        <Text style={s.subtitlu}>Documentele primite pentru {luna} {an}</Text>
        <View style={s.rigla} />

        <View style={s.fise}>
          <View style={s.fisa}>
            <Text style={s.fisaEticheta}>Asociația</Text>
            <Text style={s.fisaValoare}>{contract.denumire}</Text>
          </View>
          <View style={s.fisa}>
            <Text style={s.fisaEticheta}>CUI</Text>
            <Text style={s.fisaValoare}>{contract.cui}</Text>
          </View>
          <View style={s.fisa}>
            <Text style={s.fisaEticheta}>Contract</Text>
            <Text style={s.fisaValoare}>{contract.numar || '—'}</Text>
          </View>
          <View style={s.fisa}>
            <Text style={s.fisaEticheta}>Perioada verificată</Text>
            <Text style={s.fisaValoare}>{cuMajuscula(luna)} {an}</Text>
          </View>
          <View style={s.fisa}>
            <Text style={s.fisaEticheta}>Documente primite</Text>
            <Text style={s.fisaValoare}>{fisiere.length}</Text>
          </View>
          <View style={s.fisa}>
            <Text style={s.fisaEticheta}>Citite din conținut</Text>
            <Text style={s.fisaValoare}>{citite} din {fisiere.length}</Text>
          </View>
        </View>

        <View style={s.antet} fixed>
          <Text style={[s.antetText, s.cNr]}>#</Text>
          <Text style={[s.antetText, s.cDenumire]}>Denumirea documentului</Text>
          <Text style={[s.antetText, s.cTip]}>Tip</Text>
          <Text style={[s.antetText, s.cEmitent]}>Emitent</Text>
          <Text style={[s.antetText, s.cFisier]}>Fișier primit</Text>
          <Text style={[s.antetText, s.cMarime]}>Mărime</Text>
        </View>

        {fisiere.map((f, i) => (
          <View key={i} style={[s.rand, ...(i % 2 === 1 ? [s.randPar] : [])]} wrap={false}>
            <Text style={s.cNr}>{i + 1}</Text>
            <View style={s.cDenumire}>
              <Text style={s.denumire}>{f.denumireAi || f.eticheta}</Text>
              {f.amprenta && <Text style={s.marunt}>sha256 {f.amprenta.slice(0, 24)}…</Text>}
            </View>
            <View style={s.cTip}>
              <Text>{f.eticheta}</Text>
              {f.tipSursa !== 'ai' && <Text style={s.marunt}>după numele fișierului</Text>}
            </View>
            <View style={s.cEmitent}>
              <Text>{f.emitentAi || '—'}</Text>
              {f.perioadaAi && <Text style={s.marunt}>{f.perioadaAi}</Text>}
            </View>
            <Text style={s.cFisier}>{f.numeFisier}</Text>
            <Text style={s.cMarime}>{kb(f.marime)}</Text>
          </View>
        ))}

        <View style={s.total}>
          <Text style={[s.totalText, s.cNr]}> </Text>
          <Text style={[s.totalText, { width: '68%' }]}>
            Total: {fisiere.length} {fisiere.length === 1 ? 'document' : 'documente'}
            {primit > pastrat ? ` · ${kb(primit)} primite, ${kb(pastrat)} păstrate` : ''}
          </Text>
          <Text style={[s.totalText, s.cMarime]}>{kb(pastrat)}</Text>
        </View>

        {lipsa.length > 0 && (
          <View style={s.caseta}>
            <Text style={s.casetaTitlu}>Lipsesc din dosar</Text>
            <Text style={s.casetaText}>{lipsa.join(' · ')}</Text>
          </View>
        )}

        <View style={s.caseta}>
          <Text style={s.casetaTitlu}>Despre acest inventar</Text>
          <Text style={s.casetaText}>
            Denumirile din prima coloană sunt citite din conținutul documentelor, nu preluate din
            numele fișierelor. Amprenta sha256 este calculată pe fișierul original, așa cum a fost
            primit, înainte de orice prelucrare: cu ea se poate dovedi oricând că documentul aflat
            la asociație și cel din dosar sunt unul și același. Scanările se păstrează recodate, la
            o rezoluție mai mică, ceea ce explică diferența dintre mărimea primită și cea păstrată.
          </Text>
        </View>

        <View style={s.semnaturi}>
          <View style={s.semnatura}>
            <Text style={{ fontSize: 7.5, color: C.sters }}>Întocmit</Text>
            <View style={s.linieSemnatura}>
              <Text style={{ fontSize: 8 }}>{intocmitDe}</Text>
              <Text style={{ fontSize: 6.5, color: C.sters }}>VoSmart — cenzor</Text>
            </View>
          </View>
          <View style={s.semnatura}>
            <Text style={{ fontSize: 7.5, color: C.sters }}>Predat de asociație</Text>
            <View style={s.linieSemnatura}>
              <Text style={{ fontSize: 6.5, color: C.sters }}>nume, funcție, semnătură</Text>
            </View>
          </View>
        </View>

        <View style={s.subsol} fixed>
          <Text>VoSmart · vosmart.ro · Inventar dosar {luna} {an}</Text>
          <Text render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} din ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function descarcaInventarul(date: DateInventar) {
  const blob = await pdf(<InventarDocument date={date} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Inventar-${date.contract.denumire.replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 40)}-${date.luna}-${date.an}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
