import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { SellerData } from '../../types/invoice';
import { fetchSellers, saveSeller } from '../../utils/invoiceApi';
import { LabeledInput, Section } from './formUi';

interface Props {
  value: SellerData;
  onChange: (s: SellerData) => void;
}

export default function SellerForm({ value, onChange }: Props) {
  const [sellers, setSellers] = useState<SellerData[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');

  const load = async () => {
    const list = await fetchSellers();
    setSellers(list);
    if (list.length > 0 && !selectedId) {
      setSelectedId(list[0].id || '');
      onChange(list[0]);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPick = (id: string) => {
    setSelectedId(id);
    const s = sellers.find((x) => x.id === id);
    if (s) onChange(s);
  };

  const onSave = async () => {
    if (!value.companyName.trim()) {
      Alert.alert('Error', 'Company name is required');
      return;
    }
    const exists = sellers.some(
      (s) => s.companyName.toLowerCase() === value.companyName.toLowerCase(),
    );
    if (exists) {
      Alert.alert('Error', 'Seller with this company name already exists!');
      return;
    }
    const ok = await saveSeller({ ...value, id: Date.now().toString() });
    if (ok) {
      Alert.alert('Success', 'Seller data saved successfully!');
      load();
    } else {
      Alert.alert('Error', 'Failed to save seller data');
    }
  };

  const set = (k: keyof SellerData, v: string) => onChange({ ...value, [k]: v });

  return (
    <Section
      title="Seller Details"
      rightSlot={
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={selectedId}
            onValueChange={(v) => onPick(v as string)}
            style={styles.picker}
          >
            <Picker.Item label="-- Select Seller --" value="" />
            {sellers.map((s) => (
              <Picker.Item key={s.id} label={s.companyName} value={s.id || ''} />
            ))}
          </Picker>
        </View>
      }
    >
      <LabeledInput label="Company Name *" value={value.companyName} onChangeText={(t) => set('companyName', t)} />
      <LabeledInput label="Address" value={value.address} onChangeText={(t) => set('address', t)} multiline />
      <LabeledInput label="GSTIN *" value={value.gstin} onChangeText={(t) => set('gstin', t)} autoCapitalize="characters" />
      <LabeledInput label="State Name *" value={value.stateName} onChangeText={(t) => set('stateName', t)} />
      <LabeledInput label="State Code *" value={value.stateCode} onChangeText={(t) => set('stateCode', t)} keyboardType="numeric" />
      <LabeledInput label="Contact" value={value.contact || ''} onChangeText={(t) => set('contact', t)} keyboardType="phone-pad" />
      <LabeledInput label="Email" value={value.email || ''} onChangeText={(t) => set('email', t)} keyboardType="email-address" autoCapitalize="none" />
      <Pressable onPress={onSave} style={styles.saveBtn}>
        <Text style={styles.saveBtnText}>Save Seller Details</Text>
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
  picker: {width: 160 },
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
