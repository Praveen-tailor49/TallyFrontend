import React from 'react';
import type { InvoiceMeta } from '../../types/invoice';
import { LabeledInput, Section } from './formUi';

interface Props {
  value: InvoiceMeta;
  onChange: (m: InvoiceMeta) => void;
}

export default function MetaForm({ value, onChange }: Props) {
  const set = (k: keyof InvoiceMeta, v: string) => onChange({ ...value, [k]: v });

  return (
    <Section title="Invoice Details">
      <LabeledInput label="Invoice No *" value={value.invoiceNo} onChangeText={(t) => set('invoiceNo', t)} />
      <LabeledInput
        label="Dated * (YYYY-MM-DD)"
        value={value.invoiceDate}
        onChangeText={(t) => set('invoiceDate', t)}
        placeholder="2025-03-03"
      />
      <LabeledInput label="Delivery Note" value={value.deliveryNote || ''} onChangeText={(t) => set('deliveryNote', t)} />
      <LabeledInput label="Mode/Terms of Payment" value={value.paymentTerms || ''} onChangeText={(t) => set('paymentTerms', t)} />
      <LabeledInput label="Reference No & Date" value={value.refNoDate || ''} onChangeText={(t) => set('refNoDate', t)} />
      <LabeledInput label="Other References" value={value.otherRefs || ''} onChangeText={(t) => set('otherRefs', t)} />
      <LabeledInput label="Buyer's Order No" value={value.buyerOrderNo || ''} onChangeText={(t) => set('buyerOrderNo', t)} />
      <LabeledInput label="Dispatch Doc No" value={value.dispatchDocNo || ''} onChangeText={(t) => set('dispatchDocNo', t)} />
      <LabeledInput
        label="Delivery Note Date (YYYY-MM-DD)"
        value={value.deliveryNoteDate || ''}
        onChangeText={(t) => set('deliveryNoteDate', t)}
        placeholder="2025-03-03"
      />
      <LabeledInput label="Dispatched through" value={value.dispatchedThrough || ''} onChangeText={(t) => set('dispatchedThrough', t)} />
      <LabeledInput label="Destination" value={value.destination || ''} onChangeText={(t) => set('destination', t)} />
      <LabeledInput label="Terms of Delivery" value={value.termsOfDelivery || ''} onChangeText={(t) => set('termsOfDelivery', t)} />
    </Section>
  );
}
