import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

export const formColors = {
  border: '#d1d5db',
  borderFocus: '#3b82f6',
  sectionBorder: '#e5e7eb',
  label: '#374151',
  heading: '#1f2937',
  bg: '#ffffff',
  bgAlt: '#f9fafb',
};

export const formStyles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  section: {
    marginBottom: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: formColors.sectionBorder,
    borderRadius: 8,
    backgroundColor: formColors.bg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: formColors.borderFocus,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: formColors.heading,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    color: formColors.label,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: formColors.border,
    borderRadius: 8,
    fontSize: 13,
    backgroundColor: '#fff',
    color: '#000',
  },
  textarea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  col: {
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  fieldGroup: { marginBottom: 12 },
});

interface LabeledInputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  multiline?: boolean;
}

export function LabeledInput({ label, multiline, ...rest }: LabeledInputProps) {
  return (
    <View style={formStyles.fieldGroup}>
      <Text style={formStyles.label}>{label}</Text>
      <TextInput
        {...rest}
        multiline={multiline}
        style={[formStyles.input, multiline && formStyles.textarea]}
        placeholderTextColor="#9ca3af"
      />
    </View>
  );
}

interface SectionProps {
  title: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
}

export function Section({ title, rightSlot, children }: SectionProps) {
  return (
    <View style={formStyles.section}>
      <View style={formStyles.sectionHeaderRow}>
        <Text style={formStyles.sectionTitle}>{title}</Text>
        {rightSlot}
      </View>
      {children}
    </View>
  );
}
