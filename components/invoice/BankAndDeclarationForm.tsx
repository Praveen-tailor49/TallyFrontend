import React from 'react';
import type { BankDetails } from '../../types/invoice';
import { LabeledInput, Section } from './formUi';

interface Props {
  bank: BankDetails;
  onBankChange: (b: BankDetails) => void;
  declaration: string;
  onDeclarationChange: (d: string) => void;
}

export default function BankAndDeclarationForm({
  bank,
  onBankChange,
  declaration,
  onDeclarationChange,
}: Props) {
  const set = (k: keyof BankDetails, v: string) => onBankChange({ ...bank, [k]: v });

  return (
    <>
      <Section title="Bank Details">
        <LabeledInput label="Bank Name" value={bank.bankName} onChangeText={(t) => set('bankName', t)} />
        <LabeledInput label="Account No" value={bank.accountNo} onChangeText={(t) => set('accountNo', t)} />
        <LabeledInput label="IFSC Code" value={bank.ifscCode} onChangeText={(t) => set('ifscCode', t)} autoCapitalize="characters" />
        <LabeledInput label="Branch" value={bank.bankBranch || ''} onChangeText={(t) => set('bankBranch', t)} />
      </Section>
      <Section title="Declaration">
        <LabeledInput
          label="Declaration Text"
          value={declaration}
          onChangeText={onDeclarationChange}
          multiline
        />
      </Section>
    </>
  );
}
