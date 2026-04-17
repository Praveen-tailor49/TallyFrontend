import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { BuyerData } from '../../types/invoice';
import { fetchBuyers, saveBuyer } from '../../utils/invoiceApi';
import { LabeledInput, Section } from './formUi';

interface Props {
  value: BuyerData;
  onChange: (b: BuyerData) => void;
}

export default function BuyerForm({ value, onChange }: Props) {
  const [buyers, setBuyers] = useState<BuyerData[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');

  const load = async () => {
    const list = await fetchBuyers();
    setBuyers(list);
    if (list.length > 0 && !selectedId) {
      setSelectedId(list[0].id || '');
      onChange({ ...list[0], placeOfSupply: list[0].placeOfSupply || list[0].stateName });
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPick = (id: string) => {
    setSelectedId(id);
    const b = buyers.find((x) => x.id === id);
    if (b) onChange({ ...b, placeOfSupply: b.placeOfSupply || b.stateName });
  };

  const onSave = async () => {
    if (!value.companyName.trim()) {
      Alert.alert('Error', 'Company name is required');
      return;
    }
    const exists = buyers.some(
      (b) => b.companyName.toLowerCase() === value.companyName.toLowerCase(),
    );
    if (exists) {
      Alert.alert('Error', 'Buyer with this company name already exists!');
      return;
    }
    const ok = await saveBuyer({ ...value, id: Date.now().toString() });
    if (ok) {
      Alert.alert('Success', 'Buyer data saved successfully!');
      load();
    } else {
      Alert.alert('Error', 'Failed to save buyer data');
    }
  };

  const set = (k: keyof BuyerData, v: string) => onChange({ ...value, [k]: v });

  return (
    <Section
      title="Buyer Details"
      rightSlot={
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={selectedId}
            onValueChange={(v) => onPick(v as string)}
            style={styles.picker}
          >
            <Picker.Item label="-- Select Buyer --" value="" />
            {buyers.map((b) => (
              <Picker.Item key={b.id} label={b.companyName} value={b.id || ''} />
            ))}
          </Picker>
        </View>
      }
    >
      <LabeledInput label="Company Name *" value={value.companyName} onChangeText={(t) => set('companyName', t)} />
      <LabeledInput label="Address" value={value.address} onChangeText={(t) => set('address', t)} multiline />
      <LabeledInput label="GSTIN" value={value.gstin || ''} onChangeText={(t) => set('gstin', t)} autoCapitalize="characters" />
      <LabeledInput label="State Name" value={value.stateName} onChangeText={(t) => set('stateName', t)} />
      <LabeledInput label="State Code" value={value.stateCode} onChangeText={(t) => set('stateCode', t)} keyboardType="numeric" />
      <LabeledInput label="Place of Supply" value={value.placeOfSupply || ''} onChangeText={(t) => set('placeOfSupply', t)} />
      <Pressable onPress={onSave} style={styles.saveBtn}>
        <Text style={styles.saveBtnText}>Save Buyer Details</Text>
      </Pressable>
    </Section>
  );
}

const styles = StyleSheet.create({
  pickerWrap: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fafafa',
    minWidth: 160,
    maxWidth: 200,
  },
  picker: { width: 160 },
  saveBtn: {
    marginTop: 8,
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 13, letterSpacing: 0.5 },
});
