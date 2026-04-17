import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { InvoiceState } from '../../types/invoice';
import {
  calculateItemAmount,
  computeTotals,
  formatCurrency,
  formatDate,
  isInterstateTransaction,
  numberToWords,
} from '../../utils/invoiceHelpers';

interface Props {
  state: InvoiceState;
}

// Column widths (match HTML template ratios)
const COLS = {
  sl: 28,
  desc: 0, // flex
  hsn: 65,
  gst: 45,
  qty: 60,
  rate: 55,
  per: 30,
  disc: 45,
  amount: 92,
};

const BORDER = '#000';

export default function InvoicePreview({ state }: Props) {
  const { seller, buyer, meta, items, bank, declaration } = state;
  const totals = computeTotals(items);
  const { subtotal, taxDetails, totalTax, roundOff, grandTotal, totalQty, qtyUnit } = totals;
  const isInterstate = isInterstateTransaction(seller.stateCode, buyer.stateCode);

  const rateKeys = Object.keys(taxDetails)
    .map((r) => parseFloat(r))
    .filter((r) => r > 0)
    .sort((a, b) => a - b);

  return (
    <ScrollView
      horizontal
      bounces={false}
      contentContainerStyle={styles.horizontalScroll}
      showsHorizontalScrollIndicator
    >
      <View style={styles.page}>
        {/* Title */}
        <View style={styles.titleBox}>
          <Text style={styles.title}>Tax Invoice</Text>
        </View>

        {/* Header section: seller/buyer + meta */}
        <View style={styles.headerSection}>
          <View style={styles.leftHeader}>
            <View style={styles.sellerBlock}>
              <Text style={styles.companyName}>{seller.companyName}</Text>
              {seller.address.split('\n').map((l, i) => (
                <Text key={i} style={styles.pSmall}>{l}</Text>
              ))}
              <Text style={styles.pSmall}>GSTIN/UIN : {seller.gstin}</Text>
              <Text style={styles.pSmall}>State Name : {seller.stateName}, Code : {seller.stateCode}</Text>
              {!!seller.contact && <Text style={styles.pSmall}>Contact : {seller.contact}</Text>}
              {!!seller.email && <Text style={styles.pSmall}>E-Mail : {seller.email}</Text>}
            </View>
            <View style={styles.buyerBlock}>
              <Text style={styles.buyerLabel}>Buyer (Bill to)</Text>
              <Text style={styles.companyName}>{buyer.companyName}</Text>
              {buyer.address.split('\n').map((l, i) => (
                <Text key={i} style={styles.pSmall}>{l}</Text>
              ))}
              {!!buyer.gstin && <Text style={styles.pSmall}>GSTIN/UIN : {buyer.gstin}</Text>}
              <Text style={styles.pSmall}>State Name : {buyer.stateName}, Code : {buyer.stateCode}</Text>
              {!!buyer.placeOfSupply && <Text style={styles.pSmall}>Place of Supply : {buyer.placeOfSupply}</Text>}
            </View>
          </View>
          <View style={styles.rightHeader}>
            <MetaRow l1="Invoice No." v1={meta.invoiceNo} l2="Dated" v2={formatDate(meta.invoiceDate)} />
            <MetaRow l1="Delivery Note" v1={meta.deliveryNote} l2="Mode/Terms of Payment" v2={meta.paymentTerms} />
            <MetaRow l1="Reference No. & Date." v1={meta.refNoDate} l2="Other References" v2={meta.otherRefs} />
            <MetaRow l1="Buyer's Order No." v1={meta.buyerOrderNo} l2="Dated" v2={formatDate(meta.deliveryNoteDate)} />
            <MetaRow l1="Dispatch Doc No." v1={meta.dispatchDocNo} l2="Delivery Note Date" v2={formatDate(meta.deliveryNoteDate)} />
            <MetaRow l1="Dispatched through" v1={meta.dispatchedThrough} l2="Destination" v2={meta.destination} />
            <View style={[styles.metaRow, styles.metaRowLast]}>
              <View style={[styles.metaCell, { borderRightWidth: 0, flex: 1 }]}>
                <Text style={styles.metaCellLabel}>Terms of Delivery</Text>
                <Text style={styles.metaCellValue}>{meta.termsOfDelivery || ''}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Items table header */}
        <View style={[styles.tableRow, styles.tableHeaderRow]}>
          <Cell w={COLS.sl} header align="center">Sl{'\n'}No</Cell>
          <Cell flex header align="center">Description of Goods</Cell>
          <Cell w={COLS.hsn} header align="center">HSN/SAC</Cell>
          <Cell w={COLS.gst} header align="center">GST{'\n'}Rate</Cell>
          <Cell w={COLS.qty} header align="center">Quantity</Cell>
          <Cell w={COLS.rate} header align="center">Rate</Cell>
          <Cell w={COLS.per} header align="center">per</Cell>
          <Cell w={COLS.disc} header align="center">Disc. %</Cell>
          <Cell w={COLS.amount} header align="center" last>Amount</Cell>
        </View>

        {/* Items */}
        {items.map((item, idx) => {
          const amount = calculateItemAmount(item);
          return (
            <View key={idx} style={styles.tableRow}>
              <Cell w={COLS.sl} align="center">{String(item.slNo)}</Cell>
              <Cell flex bold>{item.description}</Cell>
              <Cell w={COLS.hsn} align="center">{item.hsn}</Cell>
              <Cell w={COLS.gst} align="center">{item.gstRate} %</Cell>
              <Cell w={COLS.qty} align="center" bold>{item.quantity} {item.unit}</Cell>
              <Cell w={COLS.rate} align="right">{item.rate.toFixed(2)}</Cell>
              <Cell w={COLS.per} align="center">{item.unit}</Cell>
              <Cell w={COLS.disc} align="right">{item.disc ? `${item.disc} %` : ''}</Cell>
              <Cell w={COLS.amount} align="right" bold last>{amount.toFixed(2)}</Cell>
            </View>
          );
        })}

        {/* Subtotal row: left merged (no internal borders), amount cell only */}
        <View style={[styles.tableRow, { borderTopWidth: 1, borderTopColor: BORDER }]}>
          <View style={[styles.mergedLeft, { flex: 1, borderLeftWidth: 1, borderLeftColor: BORDER }]} />
          <View style={[styles.cellBase, { width: COLS.amount, borderLeftWidth: 1, borderRightWidth: 1, borderColor: BORDER, alignItems: 'flex-end' }]}>
            <Text style={[styles.cellText, styles.boldText]}>{subtotal.toFixed(2)}</Text>
          </View>
        </View>

        {/* Tax rows */}
        {rateKeys.map((rateNum) => {
          const t = taxDetails[String(rateNum)];
          if (isInterstate) {
            return (
              <TaxRow
                key={`igst-${rateNum}`}
                label={`OUTPUT IGST @${rateNum}%`}
                rate={rateNum}
                amount={t.igst}
              />
            );
          }
          return (
            <View key={`cgst-sgst-${rateNum}`}>
              {t.cgst > 0 && (
                <TaxRow label={`OUTPUT CGST @${rateNum / 2}%`} rate={rateNum / 2} amount={t.cgst} />
              )}
              {t.sgst > 0 && (
                <TaxRow label={`OUTPUT SGST @${rateNum / 2}%`} rate={rateNum / 2} amount={t.sgst} />
              )}
            </View>
          );
        })}

        {/* Round off */}
        {Math.abs(roundOff) >= 0.005 && (
          <RoundOffRow roundOff={roundOff} />
        )}

        {/* Empty spacer with continuous vertical borders */}
        <View style={[styles.tableRow, { height: 100 }]}>
          <CellEmpty w={COLS.sl} />
          <CellEmpty flex />
          <CellEmpty w={COLS.hsn} />
          <CellEmpty w={COLS.gst} />
          <CellEmpty w={COLS.qty} />
          <CellEmpty w={COLS.rate} />
          <CellEmpty w={COLS.per} />
          <CellEmpty w={COLS.disc} />
          <CellEmpty w={COLS.amount} last />
        </View>

        {/* Grand total row */}
        <View style={[styles.tableRow, { borderTopWidth: 1, borderBottomWidth: 1, borderColor: BORDER }]}>
          <View style={{ width: COLS.sl, borderLeftWidth: 1, borderColor: BORDER }} />
          <View style={{ flex: 1, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 8 }}>
            <Text style={[styles.cellText, styles.boldText]}>Total</Text>
          </View>
          <View style={{ width: COLS.hsn }} />
          <View style={{ width: COLS.gst }} />
          <View style={{ width: COLS.qty, borderLeftWidth: 1, borderRightWidth: 1, borderColor: BORDER, alignItems: 'center', paddingVertical: 4 }}>
            <Text style={[styles.cellText, styles.boldText]}>{totalQty} {qtyUnit}</Text>
          </View>
          <View style={{ width: COLS.rate }} />
          <View style={{ width: COLS.per }} />
          <View style={{ width: COLS.disc }} />
          <View style={{ width: COLS.amount, borderLeftWidth: 1, borderRightWidth: 1, borderColor: BORDER, alignItems: 'flex-end', paddingVertical: 4, paddingHorizontal: 4 }}>
            <Text style={[styles.cellText, styles.boldText]}>{formatCurrency(grandTotal)}</Text>
          </View>
        </View>

        {/* Amount in words */}
        <View style={styles.amountWordsRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.smallLabel}>Amount Chargeable (in words)</Text>
            <Text style={styles.boldText}>{numberToWords(grandTotal)}</Text>
          </View>
          <Text style={styles.smallLabel}>E. & O.E</Text>
        </View>

        {/* Tax summary table */}
        {isInterstate ? (
          <IgstSummary
            subtotal={subtotal}
            totalTax={totalTax}
            rateKeys={rateKeys}
            taxDetails={taxDetails}
          />
        ) : (
          <CgstSgstSummary
            subtotal={subtotal}
            totalTax={totalTax}
            rateKeys={rateKeys}
            taxDetails={taxDetails}
          />
        )}

        {/* Tax in words */}
        <View style={styles.taxWordsRow}>
          <Text style={styles.smallLabel}>Tax Amount (in words) : </Text>
          <Text style={styles.boldText}>{numberToWords(totalTax)}</Text>
        </View>

        {/* Declaration + Bank */}
        <View style={styles.footerSection}>
          <View style={styles.declarationBlock}>
            <Text style={styles.declTitle}>Declaration</Text>
            <Text style={styles.declText}>{declaration}</Text>
          </View>
          <View style={styles.signatureBlock}>
            <View>
              <Text style={styles.bankHeader}>Company&apos;s Bank Details</Text>
              <Text style={styles.bankLine}>Bank Name         : <Text style={styles.boldText}>{bank.bankName}</Text></Text>
              <Text style={styles.bankLine}>A/c No.              : <Text style={styles.boldText}>{bank.accountNo}</Text></Text>
              <Text style={styles.bankLine}>Branch & IFS Code : <Text style={styles.boldText}>{bank.ifscCode}</Text></Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.boldText, { fontSize: 11 }]}>for {seller.companyName}</Text>
              <Text style={styles.smallLabel}>Authorised Signatory</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.invoiceFooter}>
          <Text style={styles.smallLabel}>This is a Computer Generated Invoice</Text>
        </View>
      </View>
    </ScrollView>
  );
}

/* ------------ Sub-components ------------ */

function MetaRow({ l1, v1, l2, v2 }: { l1: string; v1?: string; l2: string; v2?: string }) {
  return (
    <View style={styles.metaRow}>
      <View style={styles.metaCell}>
        <Text style={styles.metaCellLabel}>{l1}</Text>
        <Text style={styles.metaCellValue}>{v1 || ''}</Text>
      </View>
      <View style={[styles.metaCell, { borderRightWidth: 0 }]}>
        <Text style={styles.metaCellLabel}>{l2}</Text>
        <Text style={styles.metaCellValue}>{v2 || ''}</Text>
      </View>
    </View>
  );
}

function Cell({
  children,
  w,
  flex,
  align = 'left',
  bold,
  header,
  last,
}: {
  children: React.ReactNode;
  w?: number;
  flex?: boolean;
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
  header?: boolean;
  last?: boolean;
}) {
  const alignMap: Record<string, any> = {
    left: 'flex-start',
    center: 'center',
    right: 'flex-end',
  };
  return (
    <View
      style={[
        styles.cellBase,
        flex ? { flex: 1 } : { width: w },
        header ? styles.headerCell : styles.bodyCell,
        { alignItems: alignMap[align] },
        last && { borderRightWidth: 1 },
      ]}
    >
      <Text style={[styles.cellText, bold && styles.boldText]}>{children}</Text>
    </View>
  );
}

function CellEmpty({ w, flex, last }: { w?: number; flex?: boolean; last?: boolean }) {
  return (
    <View
      style={[
        styles.bodyCell,
        flex ? { flex: 1 } : { width: w },
        last && { borderRightWidth: 1 },
      ]}
    />
  );
}

function TaxRow({ label, rate, amount }: { label: string; rate: number; amount: number }) {
  return (
    <View style={styles.tableRow}>
      <View style={{ width: COLS.sl, borderLeftWidth: 1, borderColor: BORDER }} />
      <View style={{ flex: 1, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 8 }}>
        <Text style={[styles.cellText, styles.italicText, styles.boldText]}>{label}</Text>
      </View>
      <View style={{ width: COLS.hsn }} />
      <View style={{ width: COLS.gst }} />
      <View style={{ width: COLS.qty }} />
      <View style={{ width: COLS.rate, borderLeftWidth: 1, borderColor: BORDER, alignItems: 'flex-end', paddingVertical: 2, paddingHorizontal: 4 }}>
        <Text style={styles.cellText}>{rate}</Text>
      </View>
      <View style={{ width: COLS.per, borderLeftWidth: 1, borderColor: BORDER, alignItems: 'center', paddingVertical: 2 }}>
        <Text style={styles.cellText}>%</Text>
      </View>
      <View style={{ width: COLS.disc, borderLeftWidth: 1, borderColor: BORDER }} />
      <View style={{ width: COLS.amount, borderLeftWidth: 1, borderRightWidth: 1, borderColor: BORDER, alignItems: 'flex-end', paddingVertical: 2, paddingHorizontal: 4 }}>
        <Text style={styles.cellText}>{amount.toFixed(2)}</Text>
      </View>
    </View>
  );
}

function RoundOffRow({ roundOff }: { roundOff: number }) {
  const sign = roundOff < 0 ? '(-)' : '';
  return (
    <View style={styles.tableRow}>
      <View style={{ width: COLS.sl, borderLeftWidth: 1, borderColor: BORDER }} />
      <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 }}>
        <Text style={[styles.cellText, styles.italicText]}>Less :</Text>
        <Text style={[styles.cellText, styles.italicText, styles.boldText]}>Round Off</Text>
      </View>
      <View style={{ width: COLS.hsn }} />
      <View style={{ width: COLS.gst }} />
      <View style={{ width: COLS.qty }} />
      <View style={{ width: COLS.rate, borderLeftWidth: 1, borderColor: BORDER }} />
      <View style={{ width: COLS.per, borderLeftWidth: 1, borderColor: BORDER }} />
      <View style={{ width: COLS.disc, borderLeftWidth: 1, borderColor: BORDER }} />
      <View style={{ width: COLS.amount, borderLeftWidth: 1, borderRightWidth: 1, borderColor: BORDER, alignItems: 'flex-end', paddingVertical: 2, paddingHorizontal: 4 }}>
        <Text style={styles.cellText}>{sign}{Math.abs(roundOff).toFixed(2)}</Text>
      </View>
    </View>
  );
}

function IgstSummary({
  subtotal,
  totalTax,
  rateKeys,
  taxDetails,
}: {
  subtotal: number;
  totalTax: number;
  rateKeys: number[];
  taxDetails: Record<string, { taxable: number; igst: number; cgst: number; sgst: number }>;
}) {
  return (
    <View style={styles.taxTableBox}>
      <View style={[styles.taxRow, styles.taxHeaderRow]}>
        <View style={[styles.taxCell, { flex: 2 }]}><Text style={styles.taxHeaderText}>Taxable{'\n'}Value</Text></View>
        <View style={[styles.taxCell, { flex: 2 }]}>
          <Text style={styles.taxHeaderText}>IGST</Text>
          <View style={[styles.taxRow, { borderTopWidth: 1, borderColor: BORDER, marginTop: 4, width: '100%' }]}>
            <View style={[styles.taxCell, { flex: 1 }]}><Text style={styles.taxHeaderText}>Rate</Text></View>
            <View style={[styles.taxCell, { flex: 1, borderRightWidth: 0 }]}><Text style={styles.taxHeaderText}>Amount</Text></View>
          </View>
        </View>
        <View style={[styles.taxCell, { flex: 2, borderRightWidth: 0 }]}><Text style={styles.taxHeaderText}>Total{'\n'}Tax Amount</Text></View>
      </View>
      {rateKeys.map((r) => {
        const t = taxDetails[String(r)];
        return (
          <View key={r} style={styles.taxRow}>
            <View style={[styles.taxCell, { flex: 2, alignItems: 'flex-end' }]}><Text style={styles.cellText}>{t.taxable.toFixed(2)}</Text></View>
            <View style={[styles.taxCell, { flex: 1, alignItems: 'center' }]}><Text style={styles.cellText}>{r}%</Text></View>
            <View style={[styles.taxCell, { flex: 1, alignItems: 'flex-end' }]}><Text style={styles.cellText}>{t.igst.toFixed(2)}</Text></View>
            <View style={[styles.taxCell, { flex: 2, alignItems: 'flex-end', borderRightWidth: 0 }]}><Text style={styles.cellText}>{t.igst.toFixed(2)}</Text></View>
          </View>
        );
      })}
      <View style={[styles.taxRow, { borderBottomWidth: 1, borderColor: BORDER }]}>
        <View style={[styles.taxCell, { flex: 2 }]}><Text style={[styles.cellText, styles.boldText]}>Total: {subtotal.toFixed(2)}</Text></View>
        <View style={[styles.taxCell, { flex: 1 }]} />
        <View style={[styles.taxCell, { flex: 1, alignItems: 'flex-end' }]}><Text style={[styles.cellText, styles.boldText]}>{totalTax.toFixed(2)}</Text></View>
        <View style={[styles.taxCell, { flex: 2, alignItems: 'flex-end', borderRightWidth: 0 }]}><Text style={[styles.cellText, styles.boldText]}>{totalTax.toFixed(2)}</Text></View>
      </View>
    </View>
  );
}

function CgstSgstSummary({
  subtotal,
  totalTax,
  rateKeys,
  taxDetails,
}: {
  subtotal: number;
  totalTax: number;
  rateKeys: number[];
  taxDetails: Record<string, { taxable: number; igst: number; cgst: number; sgst: number }>;
}) {
  const totalCgst = rateKeys.reduce((s, r) => s + (taxDetails[String(r)]?.cgst || 0), 0);
  const totalSgst = rateKeys.reduce((s, r) => s + (taxDetails[String(r)]?.sgst || 0), 0);
  return (
    <View style={styles.taxTableBox}>
      <View style={[styles.taxRow, styles.taxHeaderRow]}>
        <View style={[styles.taxCell, { flex: 2 }]}><Text style={styles.taxHeaderText}>Taxable{'\n'}Value</Text></View>
        <View style={[styles.taxCell, { flex: 2 }]}>
          <Text style={styles.taxHeaderText}>Central Tax</Text>
          <View style={[styles.taxRow, { borderTopWidth: 1, borderColor: BORDER, marginTop: 4, width: '100%' }]}>
            <View style={[styles.taxCell, { flex: 1 }]}><Text style={styles.taxHeaderText}>Rate</Text></View>
            <View style={[styles.taxCell, { flex: 1, borderRightWidth: 0 }]}><Text style={styles.taxHeaderText}>Amount</Text></View>
          </View>
        </View>
        <View style={[styles.taxCell, { flex: 2 }]}>
          <Text style={styles.taxHeaderText}>State Tax</Text>
          <View style={[styles.taxRow, { borderTopWidth: 1, borderColor: BORDER, marginTop: 4, width: '100%' }]}>
            <View style={[styles.taxCell, { flex: 1 }]}><Text style={styles.taxHeaderText}>Rate</Text></View>
            <View style={[styles.taxCell, { flex: 1, borderRightWidth: 0 }]}><Text style={styles.taxHeaderText}>Amount</Text></View>
          </View>
        </View>
        <View style={[styles.taxCell, { flex: 2, borderRightWidth: 0 }]}><Text style={styles.taxHeaderText}>Total{'\n'}Tax Amount</Text></View>
      </View>
      {rateKeys.map((r) => {
        const t = taxDetails[String(r)];
        const half = r / 2;
        return (
          <View key={r} style={styles.taxRow}>
            <View style={[styles.taxCell, { flex: 2, alignItems: 'flex-end' }]}><Text style={styles.cellText}>{t.taxable.toFixed(2)}</Text></View>
            <View style={[styles.taxCell, { flex: 1, alignItems: 'center' }]}><Text style={styles.cellText}>{half}%</Text></View>
            <View style={[styles.taxCell, { flex: 1, alignItems: 'flex-end' }]}><Text style={styles.cellText}>{t.cgst.toFixed(2)}</Text></View>
            <View style={[styles.taxCell, { flex: 1, alignItems: 'center' }]}><Text style={styles.cellText}>{half}%</Text></View>
            <View style={[styles.taxCell, { flex: 1, alignItems: 'flex-end' }]}><Text style={styles.cellText}>{t.sgst.toFixed(2)}</Text></View>
            <View style={[styles.taxCell, { flex: 2, alignItems: 'flex-end', borderRightWidth: 0 }]}><Text style={styles.cellText}>{(t.cgst + t.sgst).toFixed(2)}</Text></View>
          </View>
        );
      })}
      <View style={[styles.taxRow, { borderBottomWidth: 1, borderColor: BORDER }]}>
        <View style={[styles.taxCell, { flex: 2 }]}><Text style={[styles.cellText, styles.boldText]}>Total: {subtotal.toFixed(2)}</Text></View>
        <View style={[styles.taxCell, { flex: 1 }]} />
        <View style={[styles.taxCell, { flex: 1, alignItems: 'flex-end' }]}><Text style={[styles.cellText, styles.boldText]}>{totalCgst.toFixed(2)}</Text></View>
        <View style={[styles.taxCell, { flex: 1 }]} />
        <View style={[styles.taxCell, { flex: 1, alignItems: 'flex-end' }]}><Text style={[styles.cellText, styles.boldText]}>{totalSgst.toFixed(2)}</Text></View>
        <View style={[styles.taxCell, { flex: 2, alignItems: 'flex-end', borderRightWidth: 0 }]}><Text style={[styles.cellText, styles.boldText]}>{totalTax.toFixed(2)}</Text></View>
      </View>
    </View>
  );
}

/* ------------ Styles ------------ */

const styles = StyleSheet.create({
  horizontalScroll: {
    padding: 12,
    backgroundColor: '#f5f5f5',
  },
  page: {
    width: 740,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BORDER,
  },
  titleBox: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
  },
  title: { fontSize: 16, fontWeight: '700' },
  headerSection: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: BORDER,
  },
  leftHeader: {
    width: '55%',
    borderRightWidth: 1,
    borderColor: BORDER,
  },
  rightHeader: { width: '45%' },
  sellerBlock: {
    borderBottomWidth: 1,
    borderColor: BORDER,
    padding: 10,
  },
  buyerBlock: { padding: 10 },
  buyerLabel: { fontStyle: 'italic', fontSize: 11, color: '#333', marginBottom: 2 },
  companyName: { fontWeight: '700', fontSize: 13 },
  pSmall: { fontSize: 11, lineHeight: 16 },
  metaRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: BORDER,
    minHeight: 28,
  },
  metaRowLast: {
    borderBottomWidth: 0,
    minHeight: 40,
    flexGrow: 1,
  },
  metaCell: {
    flex: 1,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRightWidth: 1,
    borderColor: BORDER,
  },
  metaCellLabel: { fontSize: 10, color: '#333' },
  metaCellValue: { fontSize: 11, fontWeight: '700' },

  tableRow: { flexDirection: 'row' },
  tableHeaderRow: { backgroundColor: '#f5f5f5' },
  cellBase: {
    justifyContent: 'center',
    paddingHorizontal: 3,
    paddingVertical: 4,
  },
  headerCell: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderColor: BORDER,
  },
  bodyCell: {
    borderLeftWidth: 1,
    borderColor: BORDER,
  },
  cellText: { fontSize: 11 },
  boldText: { fontWeight: '700' },
  italicText: { fontStyle: 'italic' },
  mergedLeft: {},

  amountWordsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: BORDER,
    paddingVertical: 4,
    paddingHorizontal: 6,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  smallLabel: { fontSize: 10, color: '#333' },

  taxTableBox: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderColor: BORDER,
  },
  taxRow: { flexDirection: 'row' },
  taxHeaderRow: { backgroundColor: '#fafafa' },
  taxCell: {
    borderRightWidth: 1,
    borderColor: BORDER,
    paddingVertical: 4,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taxHeaderText: { fontSize: 11, fontWeight: '700', textAlign: 'center' },

  taxWordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: BORDER,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },

  footerSection: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: BORDER,
    minHeight: 90,
  },
  declarationBlock: {
    width: '55%',
    borderRightWidth: 1,
    borderColor: BORDER,
    padding: 8,
  },
  declTitle: { fontWeight: '700', fontSize: 11, marginBottom: 3 },
  declText: { fontSize: 10, lineHeight: 15 },
  signatureBlock: {
    width: '45%',
    padding: 8,
    justifyContent: 'space-between',
  },
  bankHeader: { fontWeight: '700', fontSize: 11, marginBottom: 2 },
  bankLine: { fontSize: 10, lineHeight: 16 },

  invoiceFooter: {
    alignItems: 'center',
    paddingVertical: 5,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER,
  },
});
