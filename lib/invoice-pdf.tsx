import React from "react";
import path from "path";
import { Document, Page, Text, View, StyleSheet, renderToBuffer, Font } from "@react-pdf/renderer";

// Roboto suportă diacritice românești; înregistrat cu cale absolută
// pentru că pe server /fonts/... nu e o URL accesibilă.
Font.register({
  family: "Roboto",
  fonts: [
    { src: path.join(process.cwd(), "public", "fonts", "Roboto-Regular.ttf"), fontWeight: "normal" },
    { src: path.join(process.cwd(), "public", "fonts", "Roboto-Bold.ttf"),    fontWeight: "bold" },
  ],
});

export interface InvoicePDFData {
  invoiceNo: string;
  dateStr: string;
  perioadaStr: string;
  sellerName: string;
  sellerCui: string;
  sellerReg: string;
  sellerAddr: string;
  sellerIban: string;
  sellerBank: string;
  buyerName: string;
  buyerCui?: string | null;
  buyerReg?: string | null;
  buyerAddr?: string | null;
  buyerEmail: string;
  packageName: string;
  priceRon: number;
}

const S = StyleSheet.create({
  page: {
    fontFamily: "Roboto",
    fontSize: 9,
    paddingTop: 28,
    paddingBottom: 28,
    paddingLeft: 36,
    paddingRight: 36,
    backgroundColor: "#ffffff",
    color: "#1e293b",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#7c3aed",
  },
  sellerTitle: {
    fontSize: 16,
    fontFamily: "Roboto",
    fontWeight: "bold",
    color: "#7c3aed",
  },
  sellerSubtitle: {
    fontSize: 8,
    color: "#94a3b8",
    marginTop: 2,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  invoiceLabel: {
    fontSize: 22,
    fontFamily: "Roboto",
    fontWeight: "bold",
    color: "#1e293b",
  },
  invoiceNo: {
    fontSize: 9,
    color: "#7c3aed",
    marginTop: 2,
  },
  metaBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    padding: 10,
    marginBottom: 16,
  },
  metaLabel: {
    fontSize: 7,
    fontFamily: "Roboto",
    fontWeight: "bold",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  metaValue: {
    fontSize: 9,
    fontFamily: "Roboto",
    fontWeight: "bold",
    color: "#1e293b",
  },
  metaValueGreen: {
    fontSize: 9,
    fontFamily: "Roboto",
    fontWeight: "bold",
    color: "#16a34a",
  },
  partiesRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  partyBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    padding: 10,
  },
  partyBoxLeft: {
    marginRight: 8,
  },
  partyBoxRight: {
    marginLeft: 8,
  },
  partyLabel: {
    fontSize: 7,
    fontFamily: "Roboto",
    fontWeight: "bold",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  partyName: {
    fontSize: 11,
    fontFamily: "Roboto",
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 5,
  },
  partyLine: {
    fontSize: 8,
    color: "#64748b",
    marginBottom: 2,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  tableDataRow: {
    flexDirection: "row",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
  },
  thCell: {
    padding: 6,
    fontSize: 7,
    fontFamily: "Roboto",
    fontWeight: "bold",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  thRight: {
    textAlign: "right",
  },
  tdCell: {
    padding: 9,
    fontSize: 9,
    color: "#374151",
  },
  tdRight: {
    textAlign: "right",
  },
  tdBold: {
    fontFamily: "Roboto",
    fontWeight: "bold",
  },
  tdSub: {
    fontSize: 8,
    color: "#94a3b8",
    marginTop: 3,
  },
  colNr: { width: "6%" },
  colDesc: { flex: 1 },
  colTotal: { width: "24%" },
  totalsOuter: {
    alignItems: "flex-end",
    marginTop: 4,
    marginBottom: 16,
  },
  totalsInner: {
    width: "44%",
    borderTopWidth: 2,
    borderTopColor: "#7c3aed",
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalLabel: {
    fontSize: 11,
    fontFamily: "Roboto",
    fontWeight: "bold",
    color: "#1e293b",
  },
  totalValue: {
    fontSize: 11,
    fontFamily: "Roboto",
    fontWeight: "bold",
    color: "#7c3aed",
  },
  noteBox: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    padding: 10,
    marginBottom: 16,
  },
  noteText: {
    fontSize: 8,
    color: "#64748b",
    lineHeight: 1.6,
  },
  footer: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
    fontSize: 7,
    color: "#94a3b8",
  },
});

function InvoiceDocument({ d }: { d: InvoicePDFData }) {
  const fmt = (n: number) => n.toFixed(2).replace(".", ",") + " RON";

  return (
    <Document>
      <Page size="A4" style={S.page}>
        {/* Header */}
        <View style={S.header}>
          <View>
            <Text style={S.sellerTitle}>{d.sellerName}</Text>
            <Text style={S.sellerSubtitle}>Platformă pentru firme de cenzorat · vosmart.ro</Text>
          </View>
          <View style={S.headerRight}>
            <Text style={S.invoiceLabel}>FACTURĂ</Text>
            <Text style={S.invoiceNo}>Nr. {d.invoiceNo}</Text>
          </View>
        </View>

        {/* Metadata */}
        <View style={S.metaBox}>
          <View>
            <Text style={S.metaLabel}>Data emiterii</Text>
            <Text style={S.metaValue}>{d.dateStr}</Text>
          </View>
          <View>
            <Text style={S.metaLabel}>Perioadă</Text>
            <Text style={S.metaValue}>{d.perioadaStr}</Text>
          </View>
          <View>
            <Text style={S.metaLabel}>Status</Text>
            <Text style={S.metaValueGreen}>ACHITATĂ</Text>
          </View>
        </View>

        {/* Furnizor / Cumpărător */}
        <View style={S.partiesRow}>
          <View style={[S.partyBox, S.partyBoxLeft]}>
            <Text style={S.partyLabel}>Furnizor</Text>
            <Text style={S.partyName}>{d.sellerName}</Text>
            {d.sellerCui ? <Text style={S.partyLine}>CUI: {d.sellerCui}</Text> : null}
            {d.sellerReg ? <Text style={S.partyLine}>Reg. Com.: {d.sellerReg}</Text> : null}
            <Text style={S.partyLine}>{d.sellerAddr}</Text>
            {d.sellerIban ? <Text style={S.partyLine}>IBAN: {d.sellerIban}</Text> : null}
            {d.sellerBank ? <Text style={S.partyLine}>Bancă: {d.sellerBank}</Text> : null}
          </View>
          <View style={[S.partyBox, S.partyBoxRight]}>
            <Text style={S.partyLabel}>Cumpărător</Text>
            <Text style={S.partyName}>{d.buyerName}</Text>
            {d.buyerCui ? <Text style={S.partyLine}>CUI: {d.buyerCui}</Text> : null}
            {d.buyerReg ? <Text style={S.partyLine}>Reg. Com.: {d.buyerReg}</Text> : null}
            {d.buyerAddr ? <Text style={S.partyLine}>{d.buyerAddr}</Text> : null}
            <Text style={S.partyLine}>Email: {d.buyerEmail}</Text>
          </View>
        </View>

        {/* Tabel produse */}
        <View>
          <View style={S.tableHeaderRow}>
            <Text style={[S.thCell, S.colNr]}>#</Text>
            <Text style={[S.thCell, S.colDesc]}>Descriere</Text>
            <Text style={[S.thCell, S.colTotal, S.thRight]}>Total</Text>
          </View>
          <View style={S.tableDataRow}>
            <Text style={[S.tdCell, S.colNr]}>1</Text>
            <View style={[S.tdCell, S.colDesc]}>
              <Text style={S.tdBold}>Abonament VoSmart Corporate — {d.packageName}</Text>
              <Text style={S.tdSub}>Perioadă: {d.perioadaStr}</Text>
            </View>
            <Text style={[S.tdCell, S.colTotal, S.tdRight, S.tdBold]}>{fmt(d.priceRon)}</Text>
          </View>
        </View>

        {/* Total */}
        <View style={S.totalsOuter}>
          <View style={S.totalsInner}>
            <Text style={S.totalLabel}>TOTAL DE PLATĂ</Text>
            <Text style={S.totalValue}>{fmt(d.priceRon)}</Text>
          </View>
        </View>

        {/* Note */}
        <View style={S.noteBox}>
          <Text style={S.noteText}>
            {"Neplatitor de TVA conform art. 9 alin. (2) lit. a) din Directiva 112/2006/CE.\n"}
            {"Plata a fost procesată securizat prin Stripe. Documentul constituie confirmare a plății.\n"}
            {"Întrebări: office@vosmart.ro · 0756 362 828"}
          </Text>
        </View>

        {/* Footer */}
        <View style={S.footer}>
          <Text>
            {d.sellerName}
            {d.sellerCui ? ` · CUI ${d.sellerCui}` : ""}
            {d.sellerAddr ? ` · ${d.sellerAddr}` : ""}
          </Text>
          <Text style={{ marginTop: 2 }}>
            {"Document generat automat la data de "}
            {d.dateStr}
            {" · vosmart.ro"}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function generateInvoicePDF(d: InvoicePDFData): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument d={d} />);
}
