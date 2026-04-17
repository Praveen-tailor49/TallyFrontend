import type { InvoiceItem } from '../types/invoice';

export function calculateItemAmount(item: InvoiceItem): number {
  const amount = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
  const discount = amount * ((Number(item.disc) || 0) / 100);
  return amount - discount;
}

export function formatCurrency(amount: number): string {
  return '\u20B9 ' + amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

export function formatDate(dateStr: string | Date | undefined | null): string {
  if (!dateStr) return '';
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(date.getTime())) return '';
  const day = date.getDate();
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

export function numberToWords(num: number): string {
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
  ];

  if (num === 0) return 'Zero';

  function convertHundreds(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) {
      return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    }
    return (
      ones[Math.floor(n / 100)] +
      ' Hundred' +
      (n % 100 ? ' ' + convertHundreds(n % 100) : '')
    );
  }

  function convert(n: number): string {
    if (n < 1000) return convertHundreds(n);
    if (n < 100000) {
      return (
        convertHundreds(Math.floor(n / 1000)) +
        ' Thousand' +
        (n % 1000 ? ' ' + convertHundreds(n % 1000) : '')
      );
    }
    if (n < 10000000) {
      return (
        convertHundreds(Math.floor(n / 100000)) +
        ' Lakh' +
        (n % 100000 ? ' ' + convert(n % 100000) : '')
      );
    }
    return (
      convertHundreds(Math.floor(n / 10000000)) +
      ' Crore' +
      (n % 10000000 ? ' ' + convert(n % 10000000) : '')
    );
  }

  const whole = Math.floor(num);
  const paise = Math.round((num % 1) * 100);
  return (
    'INR ' +
    convert(whole) +
    (paise ? ' and ' + convertHundreds(paise) + ' Paise' : '') +
    ' Only'
  );
}

export function isInterstateTransaction(sellerStateCode: string, buyerStateCode: string): boolean {
  const a = (sellerStateCode || '').trim();
  const b = (buyerStateCode || '').trim();
  return !!(a && b && a !== b);
}

export interface TaxBucket {
  taxable: number;
  igst: number;
  cgst: number;
  sgst: number;
}

export interface InvoiceTotals {
  subtotal: number;
  taxDetails: Record<string, TaxBucket>;
  totalTax: number;
  roundOff: number;
  grandTotal: number;
  totalQty: number;
  qtyUnit: string;
}

export function computeTotals(items: InvoiceItem[]): InvoiceTotals {
  let subtotal = 0;
  const taxDetails: Record<string, TaxBucket> = {};

  items.forEach((item) => {
    const amount = calculateItemAmount(item);
    subtotal += amount;

    const gstKey = String(item.gstRate);
    if (!taxDetails[gstKey]) {
      taxDetails[gstKey] = { taxable: 0, igst: 0, cgst: 0, sgst: 0 };
    }
    taxDetails[gstKey].taxable += amount;
    taxDetails[gstKey].igst += amount * (Number(item.gstRate) / 100);
    taxDetails[gstKey].cgst += amount * (Number(item.gstRate) / 200);
    taxDetails[gstKey].sgst += amount * (Number(item.gstRate) / 200);
  });

  const totalTax = Object.values(taxDetails).reduce((s, t) => s + t.igst, 0);
  const roundOff = Math.round((subtotal + totalTax) * 100) / 100 - (subtotal + totalTax);
  const grandTotal = Math.round((subtotal + totalTax + roundOff) * 100) / 100;
  const totalQty = items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
  const qtyUnit = items[0] ? items[0].unit : '';

  return { subtotal, taxDetails, totalTax, roundOff, grandTotal, totalQty, qtyUnit };
}
