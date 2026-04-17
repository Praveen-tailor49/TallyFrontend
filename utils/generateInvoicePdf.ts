import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  calculateItemAmount,
  computeTotals,
  formatCurrency,
  formatDate,
  isInterstateTransaction,
  numberToWords,
} from './invoiceHelpers';
import { incrementDownloadCount } from './invoiceApi';
import type { InvoiceState } from '../types/invoice';

function escapeHtml(s: string | number | null | undefined): string {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function nl2br(s: string | undefined | null): string {
  return escapeHtml(s || '').replace(/\n/g, '<br>');
}

export function buildInvoiceHtml(state: InvoiceState): string {
  const { seller, buyer, meta, items, bank } = state;
  const totals = computeTotals(items);
  const { subtotal, taxDetails, totalTax, roundOff, grandTotal, totalQty, qtyUnit } = totals;
  const isInterstate = isInterstateTransaction(seller.stateCode, buyer.stateCode);

  // Items rows
  let itemsHtml = '';
  items.forEach((item) => {
    const amount = calculateItemAmount(item);
    itemsHtml += `
      <tr>
        <td class="center">${escapeHtml(item.slNo)}</td>
        <td class="desc"><strong>${escapeHtml(item.description)}</strong></td>
        <td class="center">${escapeHtml(item.hsn)}</td>
        <td class="center">${escapeHtml(item.gstRate)} %</td>
        <td class="center"><strong>${escapeHtml(item.quantity)} ${escapeHtml(item.unit)}</strong></td>
        <td class="right">${Number(item.rate).toFixed(2)}</td>
        <td class="center">${escapeHtml(item.unit)}</td>
        <td class="right">${item.disc ? escapeHtml(item.disc) + ' %' : ''}</td>
        <td class="right"><strong>${amount.toFixed(2)}</strong></td>
      </tr>`;
  });

  // Subtotal row
  itemsHtml += `
    <tr class="subtotal-row">
      <td colspan="8" style="border:none;border-left:1px solid #000;border-top:1px solid #000;"></td>
      <td class="right" style="border-top:1px solid #000;border-left:1px solid #000;border-right:1px solid #000;font-weight:bold;">${subtotal.toFixed(2)}</td>
    </tr>`;

  // Tax rows
  Object.keys(taxDetails)
    .sort((a, b) => parseFloat(a) - parseFloat(b))
    .forEach((rate) => {
      const t = taxDetails[rate];
      const rateNum = parseFloat(rate);
      if (rateNum <= 0) return;
      if (isInterstate) {
        itemsHtml += taxRowHtml(`OUTPUT IGST @${rateNum}%`, rateNum, t.igst);
      } else {
        if (t.cgst > 0) itemsHtml += taxRowHtml(`OUTPUT CGST @${rateNum / 2}%`, rateNum / 2, t.cgst);
        if (t.sgst > 0) itemsHtml += taxRowHtml(`OUTPUT SGST @${rateNum / 2}%`, rateNum / 2, t.sgst);
      }
    });

  // Round off
  if (Math.abs(roundOff) >= 0.005) {
    const sign = roundOff < 0 ? '(-)' : '';
    itemsHtml += `
      <tr class="tax-row">
        <td style="border:none;border-left:1px solid #000;"></td>
        <td style="border:none;font-style:italic;">
          <span style="float:left;">Less :</span>
          <strong style="float:right;">Round Off</strong>
        </td>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td style="border:none;border-left:1px solid #000;"></td>
        <td style="border:none;border-left:1px solid #000;"></td>
        <td style="border:none;border-left:1px solid #000;"></td>
        <td class="right" style="border:none;border-left:1px solid #000;border-right:1px solid #000;">${sign}${Math.abs(roundOff).toFixed(2)}</td>
      </tr>`;
  }

  // Empty spacer
  itemsHtml += `
    <tr class="empty-spacer">
      <td></td><td></td><td></td><td></td><td></td>
      <td></td><td></td><td></td><td></td>
    </tr>`;

  // Total row
  itemsHtml += `
    <tr class="grand-total-row">
      <td style="border-top:1px solid #000;border-bottom:1px solid #000;border-left:1px solid #000;"></td>
      <td class="right" style="border-top:1px solid #000;border-bottom:1px solid #000;font-weight:bold;padding-right:8px;">Total</td>
      <td style="border-top:1px solid #000;border-bottom:1px solid #000;"></td>
      <td style="border-top:1px solid #000;border-bottom:1px solid #000;"></td>
      <td class="center" style="border:1px solid #000;font-weight:bold;">${totalQty} ${escapeHtml(qtyUnit)}</td>
      <td style="border-top:1px solid #000;border-bottom:1px solid #000;"></td>
      <td style="border-top:1px solid #000;border-bottom:1px solid #000;"></td>
      <td style="border-top:1px solid #000;border-bottom:1px solid #000;"></td>
      <td class="right" style="border:1px solid #000;font-weight:bold;">${formatCurrency(grandTotal)}</td>
    </tr>`;

  // Tax summary rows
  const rateKeys = Object.keys(taxDetails).sort((a, b) => parseFloat(a) - parseFloat(b));
  let taxSummaryHtml = '';
  rateKeys.forEach((rate) => {
    const t = taxDetails[rate];
    const rateNum = parseFloat(rate);
    if (isInterstate) {
      taxSummaryHtml += `
        <tr>
          <td>${t.taxable.toFixed(2)}</td>
          <td class="center">${rateNum}%</td>
          <td>${t.igst.toFixed(2)}</td>
          <td>${t.igst.toFixed(2)}</td>
        </tr>`;
    } else {
      taxSummaryHtml += `
        <tr>
          <td>${t.taxable.toFixed(2)}</td>
          <td class="center">${rateNum / 2}%</td>
          <td>${t.cgst.toFixed(2)}</td>
          <td class="center">${rateNum / 2}%</td>
          <td>${t.sgst.toFixed(2)}</td>
          <td>${(t.cgst + t.sgst).toFixed(2)}</td>
        </tr>`;
    }
  });
  if (isInterstate) {
    taxSummaryHtml += `
      <tr style="font-weight:bold;">
        <td>Total: ${subtotal.toFixed(2)}</td>
        <td></td>
        <td>${totalTax.toFixed(2)}</td>
        <td>${totalTax.toFixed(2)}</td>
      </tr>`;
  } else {
    const totalCgst = Object.values(taxDetails).reduce((s, t) => s + t.cgst, 0);
    const totalSgst = Object.values(taxDetails).reduce((s, t) => s + t.sgst, 0);
    taxSummaryHtml += `
      <tr style="font-weight:bold;">
        <td>Total: ${subtotal.toFixed(2)}</td>
        <td></td>
        <td>${totalCgst.toFixed(2)}</td>
        <td></td>
        <td>${totalSgst.toFixed(2)}</td>
        <td>${totalTax.toFixed(2)}</td>
      </tr>`;
  }

  const taxTheadHtml = isInterstate
    ? `<tr>
         <th rowspan="2">Taxable<br>Value</th>
         <th colspan="2">IGST</th>
         <th rowspan="2">Total<br>Tax Amount</th>
       </tr>
       <tr><th>Rate</th><th>Amount</th></tr>`
    : `<tr>
         <th rowspan="2">Taxable<br>Value</th>
         <th colspan="2">Central Tax</th>
         <th colspan="2">State Tax</th>
         <th rowspan="2">Total<br>Tax Amount</th>
       </tr>
       <tr><th>Rate</th><th>Amount</th><th>Rate</th><th>Amount</th></tr>`;

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size:11px; line-height:1.4; }
  .page { width:210mm; min-height:297mm; padding:0; }
  .wrapper { width:100%; border:1px solid #000; padding:1rem; }
  .invoice-title { text-align:center; font-size:18px; font-weight:bold; padding:8px 0; border-bottom:1px solid #000; }
  .header-section { display:flex; border-bottom:1px solid #000; }
  .left-header { width:55%; border-right:1px solid #000; }
  .right-header { width:45%; }
  .seller-block { border-bottom:1px solid #000; padding:10px 12px; }
  .seller-block .company-name, .buyer-block .company-name { font-weight:bold; font-size:14px; }
  .seller-block p, .buyer-block p { line-height:1.6; margin:0; font-size:11px; }
  .buyer-block { padding:10px 12px; }
  .buyer-block .buyer-label { font-style:italic; font-size:11px; color:#333; }
  .meta-block { width:100%; display:flex; flex-direction:column; height:100%; }
  .meta-row { display:flex; border-bottom:1px solid #000; min-height:22px; }
  .meta-row:last-child { border-bottom:none; min-height:36px; flex:1; }
  .meta-cell { flex:1; padding:3px 6px; border-right:1px solid #000; font-size:10px; line-height:1.4; }
  .meta-cell:last-child { border-right:none; }
  .meta-cell .label { font-size:10px; color:#333; }
  .meta-cell .value { font-weight:bold; font-size:11px; }
  .items-table { width:100%; border-collapse:collapse; }
  .items-table th { border:1px solid #000; padding:4px 2px; text-align:center; font-size:11px; font-weight:bold; background:#f5f5f5; }
  .items-table td { border-left:1px solid #000; border-right:1px solid #000; padding:4px 2px; font-size:11px; vertical-align:top; }
  .items-table td.desc { font-weight:bold; }
  .items-table td.right { text-align:right; }
  .items-table td.center { text-align:center; }
  .empty-spacer td { border-left:1px solid #000; border-right:1px solid #000; height:120px; }
  .amount-words-row { display:flex; border-bottom:1px solid #000; border-left:1px solid #000; border-right:1px solid #000; padding:4px 6px; justify-content:space-between; align-items:center; }
  .amount-words-row .label { font-size:10px; color:#333; }
  .amount-words-row .words { font-weight:bold; font-size:11px; }
  .amount-words-row .eoe { font-size:10px; color:#333; white-space:nowrap; margin-left:10px; }
  .tax-table { width:100%; border-collapse:collapse; }
  .tax-table th { border:1px solid #000; padding:4px 5px; text-align:center; font-size:11px; font-weight:bold; }
  .tax-table td { border:1px solid #000; padding:4px 5px; font-size:11px; text-align:right; }
  .tax-table td.center { text-align:center; }
  .tax-words-row { padding:4px 8px; border-bottom:1px solid #000; border-left:1px solid #000; border-right:1px solid #000; font-size:11px; }
  .tax-words-row span.label { font-size:10px; color:#333; }
  .footer-section { display:flex; border-bottom:1px solid #000; border-left:1px solid #000; border-right:1px solid #000; min-height:60px; }
  .declaration-block { width:55%; border-right:1px solid #000; padding:6px 8px; font-size:10px; line-height:1.5; }
  .declaration-block .decl-title { font-weight:bold; margin-bottom:3px; }
  .signature-block { width:45%; padding:6px 8px; display:flex; flex-direction:column; justify-content:space-between; }
  .bank-details { text-align:left; font-size:10px; line-height:1.5; margin-bottom:8px; }
  .signature-block .for-label { font-weight:bold; font-size:11px; text-align:right; }
  .signature-block .auth { font-size:10px; color:#333; text-align:right; }
  .invoice-footer { text-align:center; padding:5px; font-size:10px; color:#333; border-left:1px solid #000; border-right:1px solid #000; border-bottom:1px solid #000; }
  @page { size: A4; margin: 0; }
</style>
</head>
<body>
  <div class="page">
    <div class="wrapper">
      <div class="invoice-title">Tax Invoice</div>

      <div class="header-section">
        <div class="left-header">
          <div class="seller-block">
            <p class="company-name">${escapeHtml(seller.companyName)}</p>
            <p>${nl2br(seller.address)}</p>
            <p>GSTIN/UIN : ${escapeHtml(seller.gstin)}</p>
            <p>State Name : ${escapeHtml(seller.stateName)}, Code : ${escapeHtml(seller.stateCode)}</p>
            ${seller.contact ? `<p>Contact : ${escapeHtml(seller.contact)}</p>` : ''}
            ${seller.email ? `<p>E-Mail : ${escapeHtml(seller.email)}</p>` : ''}
          </div>
          <div class="buyer-block">
            <div class="buyer-label">Buyer (Bill to)</div>
            <p class="company-name">${escapeHtml(buyer.companyName)}</p>
            <p>${nl2br(buyer.address)}</p>
            ${buyer.gstin ? `<p>GSTIN/UIN : ${escapeHtml(buyer.gstin)}</p>` : ''}
            <p>State Name : ${escapeHtml(buyer.stateName)}, Code : ${escapeHtml(buyer.stateCode)}</p>
            ${buyer.placeOfSupply ? `<p>Place of Supply : ${escapeHtml(buyer.placeOfSupply)}</p>` : ''}
          </div>
        </div>
        <div class="right-header">
          <div class="meta-block">
            ${metaRow('Invoice No.', meta.invoiceNo, 'Dated', formatDate(meta.invoiceDate))}
            ${metaRow('Delivery Note', meta.deliveryNote, 'Mode/Terms of Payment', meta.paymentTerms)}
            ${metaRow('Reference No. & Date.', meta.refNoDate, 'Other References', meta.otherRefs)}
            ${metaRow("Buyer's Order No.", meta.buyerOrderNo, 'Dated', formatDate(meta.deliveryNoteDate))}
            ${metaRow('Dispatch Doc No.', meta.dispatchDocNo, 'Delivery Note Date', formatDate(meta.deliveryNoteDate))}
            ${metaRow('Dispatched through', meta.dispatchedThrough, 'Destination', meta.destination)}
            <div class="meta-row">
              <div class="meta-cell" style="border-right:none;">
                <div class="label">Terms of Delivery</div>
                <div class="value">${escapeHtml(meta.termsOfDelivery || '')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="width:25px;">Sl<br>No</th>
            <th>Description of Goods</th>
            <th style="width:65px;">HSN/SAC</th>
            <th style="width:45px;">GST<br>Rate</th>
            <th style="width:60px;">Quantity</th>
            <th style="width:55px;">Rate</th>
            <th style="width:30px;">per</th>
            <th style="width:45px;">Disc. %</th>
            <th style="width:90px;">Amount</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>

      <div class="amount-words-row">
        <div>
          <span class="label">Amount Chargeable (in words)</span><br>
          <span class="words">${escapeHtml(numberToWords(grandTotal))}</span>
        </div>
        <div class="eoe">E. &amp; O.E</div>
      </div>

      <table class="tax-table">
        <thead>${taxTheadHtml}</thead>
        <tbody>${taxSummaryHtml}</tbody>
      </table>

      <div class="tax-words-row">
        <span class="label">Tax Amount (in words) : </span>
        <strong>${escapeHtml(numberToWords(totalTax))}</strong>
      </div>

      <div class="footer-section">
        <div class="declaration-block">
          <div class="decl-title">Declaration</div>
          <p>${nl2br(state.declaration)}</p>
        </div>
        <div class="signature-block">
          <div class="bank-details">
            <div style="font-weight:bold;margin-bottom:2px;">Company's Bank Details</div>
            <div>Bank Name&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; : <strong>${escapeHtml(bank.bankName)}</strong></div>
            <div>A/c No.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; : <strong>${escapeHtml(bank.accountNo)}</strong></div>
            <div>Branch &amp; IFS Code : <strong>${escapeHtml(bank.ifscCode)}</strong></div>
          </div>
          <div class="for-label">for ${escapeHtml(seller.companyName)}</div>
          <div class="auth">Authorised Signatory</div>
        </div>
      </div>

      <div class="invoice-footer">This is a Computer Generated Invoice</div>
    </div>
  </div>
</body>
</html>`;
}

function metaRow(l1: string, v1: string | undefined, l2: string, v2: string | undefined): string {
  return `
    <div class="meta-row">
      <div class="meta-cell">
        <div class="label">${escapeHtml(l1)}</div>
        <div class="value">${escapeHtml(v1 || '')}</div>
      </div>
      <div class="meta-cell">
        <div class="label">${escapeHtml(l2)}</div>
        <div class="value">${escapeHtml(v2 || '')}</div>
      </div>
    </div>`;
}

function taxRowHtml(label: string, rateNum: number, amount: number): string {
  return `
    <tr class="tax-row">
      <td style="border:none;border-left:1px solid #000;"></td>
      <td class="right" style="border:none;font-style:italic;font-weight:bold;padding-right:8px;">${escapeHtml(label)}</td>
      <td style="border:none;"></td>
      <td style="border:none;"></td>
      <td style="border:none;"></td>
      <td class="right" style="border:none;border-left:1px solid #000;">${rateNum}</td>
      <td class="center" style="border:none;border-left:1px solid #000;">%</td>
      <td style="border:none;border-left:1px solid #000;"></td>
      <td class="right" style="border:none;border-left:1px solid #000;border-right:1px solid #000;">${amount.toFixed(2)}</td>
    </tr>`;
}

export async function generateAndShareInvoicePdf(state: InvoiceState): Promise<void> {
  const html = buildInvoiceHtml(state);
  const { uri } = await Print.printToFileAsync({
    html,
    width: 595, // A4 @ 72 dpi
    height: 842,
    base64: false,
  });
  // increment download count (best-effort, non-blocking)
  incrementDownloadCount().catch(() => {});
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Share Invoice PDF',
      UTI: 'com.adobe.pdf',
    });
  }
}
