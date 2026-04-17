import { Picker } from '@react-native-picker/picker';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { InvoiceItem } from '../../types/invoice';
import { calculateItemAmount } from '../../utils/invoiceHelpers';
import { LabeledInput, Section } from './formUi';

interface Props {
  items: InvoiceItem[];
  onChange: (items: InvoiceItem[]) => void;
}

const GST_OPTIONS = [0, 5, 12, 18, 28];

export default function ItemsForm({ items, onChange }: Props) {
  const update = (index: number, patch: Partial<InvoiceItem>) => {
    const next = items.map((it, i) => (i === index ? { ...it, ...patch } : it));
    onChange(next);
  };

  const addItem = () => {
    onChange([
      ...items,
      {
        slNo: items.length + 1,
        description: '',
        hsn: '',
        gstRate: 5,
        quantity: 1,
        unit: 'NOS',
        rate: 0,
        disc: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    const next = items.filter((_, i) => i !== index).map((it, i) => ({ ...it, slNo: i + 1 }));
    onChange(next);
  };

  return (
    <Section title="Items">
      {items.map((item, idx) => (
        <View key={idx} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Item #{item.slNo}</Text>
            <Pressable onPress={() => removeItem(idx)} style={styles.removeBtn}>
              <Text style={styles.removeBtnText}>Remove</Text>
            </Pressable>
          </View>
          <LabeledInput
            label="Description *"
            value={item.description}
            onChangeText={(t) => update(idx, { description: t })}
            placeholder="Enter item description"
          />
          <LabeledInput
            label="HSN/SAC"
            value={item.hsn}
            onChangeText={(t) => update(idx, { hsn: t })}
            placeholder="HSN Code"
          />
          <View style={styles.fieldGroup}>
            <Text style={styles.pickerLabel}>GST Rate %</Text>
            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={item.gstRate}
                onValueChange={(v) => update(idx, { gstRate: Number(v) })}
              >
                {GST_OPTIONS.map((g) => (
                  <Picker.Item key={g} label={`${g}%`} value={g} />
                ))}
              </Picker>
            </View>
          </View>
          <LabeledInput
            label="Quantity *"
            value={String(item.quantity)}
            onChangeText={(t) => update(idx, { quantity: parseFloat(t) || 0 })}
            keyboardType="numeric"
          />
          <LabeledInput
            label="Unit"
            value={item.unit}
            onChangeText={(t) => update(idx, { unit: t })}
            placeholder="NOS"
          />
          <LabeledInput
            label="Rate *"
            value={String(item.rate)}
            onChangeText={(t) => update(idx, { rate: parseFloat(t) || 0 })}
            keyboardType="decimal-pad"
          />
          <LabeledInput
            label="Disc %"
            value={String(item.disc)}
            onChangeText={(t) => update(idx, { disc: parseFloat(t) || 0 })}
            keyboardType="decimal-pad"
          />
          <View style={styles.fieldGroup}>
            <Text style={styles.pickerLabel}>Amount</Text>
            <View style={[styles.amountBox]}>
              <Text style={styles.amountText}>{calculateItemAmount(item).toFixed(2)}</Text>
            </View>
          </View>
        </View>
      ))}
      <Pressable onPress={addItem} style={styles.addBtn}>
        <Text style={styles.addBtnText}>+ Add Item</Text>
      </Pressable>
    </Section>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1f2937' },
  removeBtn: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  removeBtnText: { color: '#fff', fontWeight: '700', fontSize: 11, letterSpacing: 0.5 },
  fieldGroup: { marginBottom: 12 },
  pickerLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickerWrap: {
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  amountBox: {
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  amountText: { fontSize: 13, color: '#111827', fontWeight: '600' },
  addBtn: {
    marginTop: 8,
    backgroundColor: '#475569',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13, letterSpacing: 0.5 },
});
