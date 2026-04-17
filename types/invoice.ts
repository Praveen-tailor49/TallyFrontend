export interface SellerData {
  id?: string;
  companyName: string;
  address: string;
  gstin: string;
  stateName: string;
  stateCode: string;
  contact?: string;
  email?: string;
}

export interface BuyerData {
  id?: string;
  companyName: string;
  address: string;
  gstin?: string;
  stateName: string;
  stateCode: string;
  placeOfSupply?: string;
}

export interface InvoiceMeta {
  invoiceNo: string;
  invoiceDate: string; // ISO yyyy-mm-dd
  deliveryNote?: string;
  paymentTerms?: string;
  refNoDate?: string;
  otherRefs?: string;
  buyerOrderNo?: string;
  dispatchDocNo?: string;
  deliveryNoteDate?: string; // ISO
  dispatchedThrough?: string;
  destination?: string;
  termsOfDelivery?: string;
}

export interface InvoiceItem {
  slNo: number;
  description: string;
  hsn: string;
  gstRate: number;
  quantity: number;
  unit: string;
  rate: number;
  disc: number;
}

export interface BankDetails {
  bankName: string;
  accountNo: string;
  ifscCode: string;
  bankBranch?: string;
}

export interface InvoiceState {
  seller: SellerData;
  buyer: BuyerData;
  meta: InvoiceMeta;
  items: InvoiceItem[];
  bank: BankDetails;
  declaration: string;
}
