'use client';

import { Document, Page, Text, View, StyleSheet, pdf, Font } from '@react-pdf/renderer';

Font.register({
  family: 'Roboto',
  fonts: [
    { src: '/fonts/Roboto-Regular.ttf', fontWeight: 'normal', fontStyle: 'normal' },
    { src: '/fonts/Roboto-Bold.ttf',    fontWeight: 'bold',   fontStyle: 'normal' },
    { src: '/fonts/Roboto-Italic.ttf',  fontWeight: 'normal', fontStyle: 'italic' },
  ],
});

type Plan = 'smart' | 'premium';

const PLANS = {
  smart: {
    name: 'VoSmart Smart',
    tagline: 'Verificare asistată digital',
    color: '#0891B2',
    colorLight: '#ECFEFF',
    colorMid: '#A5F3FC',
    badge: 'PACHET SMART',
    price: 3.3,
    priceDisplay: '3,3 RON',
    timeline: '30 – 60 min',
    timelineSub: 'de la încărcarea documentelor',
    features: [
      'Upload documente online – simplu, de pe orice dispozitiv',
      'Analiză automată asistată de inteligență artificială',
      'Generare automată draft raport de cenzor',
      'Verificare finală și validare de specialist autorizat',
      'Publicare raport în portalul asociației de proprietari',
      'Notificări automate pentru membrii asociației',
      'Arhivă digitală securizată a tuturor rapoartelor',
      'Acces online 24/7 la toate documentele',
    ],
    highlight:
      'Soluția ideală pentru asociații care doresc digitalizare rapidă, rapoarte lunare de calitate și costuri minime.',
    tableRows: [
      { ap: 50, luna: 165, an: 1980 },
      { ap: 100, luna: 330, an: 3960 },
      { ap: 150, luna: 495, an: 5940 },
      { ap: 200, luna: 660, an: 7920 },
      { ap: 300, luna: 990, an: 11880 },
    ],
  },
  premium: {
    name: 'VoSmart Premium',
    tagline: 'Cenzorat profesional complet',
    color: '#6D28D9',
    colorLight: '#F5F3FF',
    colorMid: '#C4B5FD',
    badge: 'PACHET PREMIUM - RECOMANDAT',
    price: 4.7,
    priceDisplay: '4,7 RON',
    timeline: 'Expert',
    timelineSub: 'pentru rapoarte lunare, anuale sau adunări generale',
    features: [
      'Tot ce include pachetul Smart (AI + verificare specialist)',
      'Verificare aprofundată de cenzor uman autorizat',
      'Observații și recomandări personalizate per asociație',
      'Rapoarte lunare, anuale sau pentru adunări generale (AG)',
      'Prioritate la procesare – răspuns garantat în 24 ore',
      'Asistență dedicată și linie directă cu cenzorul',
      'Consultanță financiar-contabilă inclusă',
      'Rapoarte de conformitate cu legislația în vigoare',
    ],
    highlight:
      'Ales de asociațiile cu nevoi complexe sau care doresc un cenzor dedicat și implicare activă.',
    tableRows: [
      { ap: 50, luna: 235, an: 2820 },
      { ap: 100, luna: 470, an: 5640 },
      { ap: 150, luna: 705, an: 8460 },
      { ap: 200, luna: 940, an: 11280 },
      { ap: 300, luna: 1410, an: 16920 },
    ],
  },
};

function fmt(n: number) {
  return n.toLocaleString('ro-RO') + ' RON';
}

function OfertaDocument({ plan }: { plan: Plan }) {
  const p = PLANS[plan];
  const today = new Date();
  const validUntil = new Date(today);
  validUntil.setDate(today.getDate() + 30);
  const dateStr = today.toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' });
  const validStr = validUntil.toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' });
  const refNumber = Math.floor(100000 + Math.random() * 900000);

  const s = StyleSheet.create({
    page: { backgroundColor: '#FFFFFF', fontFamily: 'Roboto', fontSize: 10, color: '#1E293B' },
    // Header
    header: { backgroundColor: p.color, paddingHorizontal: 40, paddingTop: 32, paddingBottom: 24 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    brandName: { fontSize: 22, fontFamily: 'Roboto', color: '#FFFFFF', letterSpacing: 1 },
    brandSub: { fontSize: 9, color: 'rgba(255,255,255,0.75)', marginTop: 2, letterSpacing: 2 },
    ofertaBadge: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 4, paddingHorizontal: 10, paddingVertical: 4 },
    ofertaBadgeText: { fontSize: 9, color: '#FFFFFF', fontFamily: 'Roboto', letterSpacing: 1.5 },
    headerTitle: { fontSize: 28, fontFamily: 'Roboto', color: '#FFFFFF', marginBottom: 4 },
    headerTagline: { fontSize: 13, color: 'rgba(255,255,255,0.88)' },
    // Meta row
    metaRow: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderBottom: '2px solid ' + p.color, paddingHorizontal: 40, paddingVertical: 12, gap: 0 },
    metaItem: { flex: 1, paddingRight: 16 },
    metaLabel: { fontSize: 8, color: '#94A3B8', fontFamily: 'Roboto', letterSpacing: 1.5, marginBottom: 3 },
    metaValue: { fontSize: 10, color: '#334155', fontFamily: 'Roboto' },
    // Body
    body: { paddingHorizontal: 40, paddingTop: 24, paddingBottom: 20 },
    // Price hero
    priceHero: { flexDirection: 'row', backgroundColor: p.colorLight, borderRadius: 10, padding: 20, marginBottom: 20, alignItems: 'center', borderLeft: '4px solid ' + p.color },
    priceLeft: { flex: 1 },
    priceTitle: { fontSize: 12, fontFamily: 'Roboto', color: p.color, marginBottom: 4 },
    priceAmount: { fontSize: 36, fontFamily: 'Roboto', color: p.color },
    priceUnit: { fontSize: 13, color: '#475569', marginTop: 2 },
    priceRight: { width: 160, borderLeft: '1px solid ' + p.colorMid, paddingLeft: 20 },
    timingLabel: { fontSize: 8, color: '#94A3B8', fontFamily: 'Roboto', letterSpacing: 1.5, marginBottom: 4 },
    timingValue: { fontSize: 20, fontFamily: 'Roboto', color: '#1E293B', marginBottom: 3 },
    timingSub: { fontSize: 9, color: '#64748B', lineHeight: 1.4 },
    // Section titles
    sectionTitle: { fontSize: 12, fontFamily: 'Roboto', color: '#0F172A', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid #E2E8F0' },
    // Features
    featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 0 },
    featureItem: { width: '50%', flexDirection: 'row', paddingRight: 12, marginBottom: 7 },
    featureBullet: { width: 16, height: 16, backgroundColor: p.color, borderRadius: 8, marginRight: 8, marginTop: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    featureBulletText: { fontSize: 9, color: '#FFFFFF', fontFamily: 'Roboto' },
    featureText: { fontSize: 9.5, color: '#334155', lineHeight: 1.45, flex: 1 },
    // Table
    table: { marginBottom: 20 },
    tableHeader: { flexDirection: 'row', backgroundColor: p.color, borderRadius: '6px 6px 0 0', paddingHorizontal: 12, paddingVertical: 8 },
    tableHeaderCell: { flex: 1, fontSize: 9, fontFamily: 'Roboto', color: '#FFFFFF', textAlign: 'center' },
    tableRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 7, borderBottom: '1px solid #F1F5F9' },
    tableRowAlt: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 7, borderBottom: '1px solid #F1F5F9', backgroundColor: '#F8FAFC' },
    tableCell: { flex: 1, fontSize: 9.5, color: '#334155', textAlign: 'center' },
    tableCellBold: { flex: 1, fontSize: 9.5, fontFamily: 'Roboto', color: p.color, textAlign: 'center' },
    tableCellHighlight: { flex: 1, fontSize: 9.5, fontFamily: 'Roboto', color: '#0F172A', textAlign: 'center' },
    // Highlight box
    highlightBox: { backgroundColor: p.colorLight, borderRadius: 8, padding: 14, marginBottom: 20, flexDirection: 'row' },
    highlightIcon: { fontSize: 9, marginRight: 8, color: p.color, fontFamily: 'Roboto', fontWeight: 'bold' },
    highlightText: { fontSize: 9.5, color: '#334155', lineHeight: 1.5, flex: 1, fontFamily: 'Roboto' },
    // Benefits
    benefitsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    benefitCard: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 8, padding: 12, borderTop: '3px solid ' + p.color },
    benefitTitle: { fontSize: 10, fontFamily: 'Roboto', color: '#0F172A', marginBottom: 4 },
    benefitText: { fontSize: 8.5, color: '#64748B', lineHeight: 1.5 },
    // Terms
    termsBox: { backgroundColor: '#F8FAFC', borderRadius: 8, padding: 14, marginBottom: 20 },
    termsTitle: { fontSize: 10, fontFamily: 'Roboto', color: '#334155', marginBottom: 8 },
    termItem: { flexDirection: 'row', marginBottom: 4 },
    termBullet: { fontSize: 9, color: p.color, marginRight: 6, fontFamily: 'Roboto' },
    termText: { fontSize: 9, color: '#475569', lineHeight: 1.4, flex: 1 },
    // CTA
    ctaBox: { backgroundColor: p.color, borderRadius: 10, padding: 18, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    ctaLeft: {},
    ctaTitle: { fontSize: 13, fontFamily: 'Roboto', color: '#FFFFFF', marginBottom: 4 },
    ctaSub: { fontSize: 9.5, color: 'rgba(255,255,255,0.88)' },
    ctaRight: { alignItems: 'flex-end' },
    ctaContact: { fontSize: 11, fontFamily: 'Roboto', color: '#FFFFFF', marginBottom: 2 },
    ctaContactSub: { fontSize: 9, color: 'rgba(255,255,255,0.8)' },
    // Footer
    footer: { backgroundColor: '#0F172A', paddingHorizontal: 40, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    footerLeft: {},
    footerBrand: { fontSize: 11, fontFamily: 'Roboto', color: '#FFFFFF' },
    footerSub: { fontSize: 8, color: '#64748B', marginTop: 2 },
    footerRight: { alignItems: 'flex-end' },
    footerText: { fontSize: 8, color: '#94A3B8' },
    // Sections spacing
    section: { marginBottom: 20 },
  });

  return (
    <Document title={`Oferta ${p.name}`} author="VoSmart" subject="Ofertă comercială">
      <Page size="A4" style={s.page}>
        {/* HEADER */}
        <View style={s.header}>
          <View style={s.headerTop}>
            <View>
              <Text style={s.brandName}>Vosmart Cenzorat</Text>
              <Text style={s.brandSub}>CENZORAT DIGITAL PENTRU ASOCIATII DE PROPRIETARI</Text>
            </View>
            <View style={s.ofertaBadge}>
              <Text style={s.ofertaBadgeText}>{p.badge}</Text>
            </View>
          </View>
          <Text style={s.headerTitle}>{p.tagline}</Text>
          <Text style={s.headerTagline}>Ofertă comercială pentru asociații de proprietari</Text>
        </View>

        {/* META ROW */}
        <View style={s.metaRow}>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>DATA EMITERII</Text>
            <Text style={s.metaValue}>{dateStr}</Text>
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>VALABILITATE</Text>
            <Text style={s.metaValue}>30 zile · pana la {validStr}</Text>
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>REFERINTA OFERTA</Text>
            <Text style={s.metaValue}>VS-{String(refNumber)}</Text>
          </View>
          <View style={[s.metaItem, { paddingRight: 0 }]}>
            <Text style={s.metaLabel}>CONTACT</Text>
            <Text style={s.metaValue}>office@vosmart.ro</Text>
          </View>
        </View>

        <View style={s.body}>
          {/* PRICE HERO */}
          <View style={s.priceHero}>
            <View style={s.priceLeft}>
              <Text style={s.priceTitle}>PREȚ PER APARTAMENT</Text>
              <Text style={s.priceAmount}>{p.priceDisplay}</Text>
              <Text style={s.priceUnit}>/ apartament / lună</Text>
            </View>
            <View style={s.priceRight}>
              <Text style={s.timingLabel}>{p.timeline === 'Expert' ? 'NIVEL VERIFICARE' : 'TIMP ESTIMATIV'}</Text>
              <Text style={s.timingValue}>{p.timeline}</Text>
              <Text style={s.timingSub}>{p.timelineSub}</Text>
            </View>
          </View>

          {/* FEATURES */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Ce primești cu {p.name}</Text>
            <View style={s.featuresGrid}>
              {p.features.map((f, i) => (
                <View key={i} style={s.featureItem}>
                  <View style={s.featureBullet}>
                    <Text style={s.featureBulletText}>✓</Text>
                  </View>
                  <Text style={s.featureText}>{f}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* HIGHLIGHT */}
          <View style={s.highlightBox}>
            <Text style={s.highlightIcon}>NOTE:</Text>
            <Text style={s.highlightText}>{p.highlight}</Text>
          </View>

          {/* PRICING TABLE */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Estimare cost lunar și anual</Text>
            <View style={s.table}>
              <View style={s.tableHeader}>
                <Text style={s.tableHeaderCell}>Nr. apartamente</Text>
                <Text style={s.tableHeaderCell}>Cost / lună</Text>
                <Text style={s.tableHeaderCell}>Cost / an</Text>
                <Text style={s.tableHeaderCell}>Cost pe apartament / an</Text>
              </View>
              {p.tableRows.map((row, i) => (
                <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                  <Text style={s.tableCellHighlight}>{row.ap} apartamente</Text>
                  <Text style={s.tableCellBold}>{fmt(row.luna)}</Text>
                  <Text style={s.tableCell}>{fmt(row.an)}</Text>
                  <Text style={s.tableCell}>{(p.price * 12).toFixed(2).replace('.', ',')} RON</Text>
                </View>
              ))}
            </View>
            <Text style={{ fontSize: 8, color: '#94A3B8', marginTop: 4 }}>
              * Formula de calcul: nr. apartamente × {p.priceDisplay} / lună.
            </Text>
          </View>

          {/* BENEFITS */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>De ce Vosmart Cenzorat?</Text>
            <View style={s.benefitsRow}>
              <View style={s.benefitCard}>
                <Text style={s.benefitTitle}>Rapoarte legale garantate</Text>
                <Text style={s.benefitText}>
                  Fiecare raport este verificat și semnat de un cenzor autorizat, conform Legii nr. 196/2018.
                </Text>
              </View>
              <View style={s.benefitCard}>
                <Text style={s.benefitTitle}>Platforma 100% digitală</Text>
                <Text style={s.benefitText}>
                  Documente încărcate online, rapoarte disponibile instant, fără deplasări sau birocrație fizică.
                </Text>
              </View>
              <View style={s.benefitCard}>
                <Text style={s.benefitTitle}>Cost transparent, fără surprize</Text>
                <Text style={s.benefitText}>
                  Prețul este fix per apartament, fără taxe ascunse. Plata lunară, fără contract pe termen lung.
                </Text>
              </View>
            </View>
          </View>

          {/* TERMS */}
          <View style={s.termsBox}>
            <Text style={s.termsTitle}>Termeni și condiții ofertă</Text>
            <View style={s.termItem}>
              <Text style={s.termBullet}>›</Text>
              <Text style={s.termText}>Prețul este de {p.priceDisplay} / apartament / lună. Acesta este prețul final facturat.</Text>
            </View>
            <View style={s.termItem}>
              <Text style={s.termBullet}>›</Text>
              <Text style={s.termText}>Plata se efectuează lunar, pe baza facturii emise de Vosmart Cenzorat.</Text>
            </View>
            <View style={s.termItem}>
              <Text style={s.termBullet}>›</Text>
              <Text style={s.termText}>Contractul de prestări servicii se încheie fără perioadă minimă obligatorie. Reziliere cu 30 zile preaviz.</Text>
            </View>
            <View style={s.termItem}>
              <Text style={s.termBullet}>›</Text>
              <Text style={s.termText}>Oferta este valabilă 30 de zile de la data emiterii, sub rezerva modificărilor de preț.</Text>
            </View>
            <View style={s.termItem}>
              <Text style={s.termBullet}>›</Text>
              <Text style={s.termText}>Datele asociației sunt prelucrate conform GDPR și stocate securizat în infrastructura Vosmart Cenzorat.</Text>
            </View>
          </View>

          {/* CTA */}
          <View style={s.ctaBox}>
            <View style={s.ctaLeft}>
              <Text style={s.ctaTitle}>Gata să începeți?</Text>
              <Text style={s.ctaSub}>Contactați-ne astăzi și activăm contul în mai puțin de 24 de ore.</Text>
            </View>
            <View style={s.ctaRight}>
              <Text style={s.ctaContact}>office@vosmart.ro</Text>
              <Text style={s.ctaContactSub}>vosmart.ro  ·  disponibil online 24/7</Text>
            </View>
          </View>
        </View>

        {/* FOOTER */}
        <View style={s.footer} fixed>
          <View style={s.footerLeft}>
            <Text style={s.footerBrand}>Vosmart Cenzorat</Text>
            <Text style={s.footerSub}>Cenzorat pentru asociatii de proprietari · vosmart.ro</Text>
          </View>
          <View style={s.footerRight}>
            <Text style={s.footerText}>Ofertă comercială confidențială</Text>
            <Text style={s.footerText}>Emis: {dateStr}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function downloadOferta(plan: Plan) {
  const blob = await pdf(<OfertaDocument plan={plan} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Oferta-VoSmart-${plan === 'smart' ? 'Smart' : 'Premium'}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
