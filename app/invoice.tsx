import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchSellers, getDownloadCount, sendLoginStatus } from '../utils/invoiceApi';

import BankAndDeclarationForm from '../components/invoice/BankAndDeclarationForm';
import BuyerForm from '../components/invoice/BuyerForm';
import InvoicePreview from '../components/invoice/InvoicePreview';
import ItemsForm from '../components/invoice/ItemsForm';
import MetaForm from '../components/invoice/MetaForm';
import SellerForm from '../components/invoice/SellerForm';
import type {
  BankDetails,
  BuyerData,
  InvoiceItem,
  InvoiceMeta,
  InvoiceState,
  SellerData,
} from '../types/invoice';
import { generateAndShareInvoicePdf } from '../utils/generateInvoicePdf';

const DEFAULT_DECLARATION =
  'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.';

const DOWNLOAD_LIMIT = 250;

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const initialSeller: SellerData = {
  companyName: '',
  address: '',
  gstin: '',
  stateName: '',
  stateCode: '',
  contact: '',
  email: '',
};

const initialBuyer: BuyerData = {
  companyName: '',
  address: '',
  gstin: '  ',
  stateName: '',
  stateCode: '',
  placeOfSupply: '',
};

const initialMeta: InvoiceMeta = {
  invoiceNo: 'INV-001',
  invoiceDate: todayISO(),
};

const initialItems: InvoiceItem[] = [
  {
    slNo: 1,
    description: '',
    hsn: '',
    gstRate: 0,
    quantity: 0,
    unit: '',
    rate: 0,
    disc: 0,
  },
];

const initialBank: BankDetails = {
  bankName: '',
  accountNo: '',
  ifscCode: '',
  bankBranch: '',
};

export default function InvoiceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [checkingToken, setCheckingToken] = useState(true);
  const [checkingDownloads, setCheckingDownloads] = useState(true);
  const [downloadCount, setDownloadCount] = useState(0);

  const [seller, setSeller] = useState<SellerData>(initialSeller);
  const [buyer, setBuyer] = useState<BuyerData>(initialBuyer);
  const [meta, setMeta] = useState<InvoiceMeta>(initialMeta);
  const [items, setItems] = useState<InvoiceItem[]>(initialItems);
  const [bank, setBank] = useState<BankDetails>(initialBank);
  const [declaration, setDeclaration] = useState<string>(DEFAULT_DECLARATION);

  const [view, setView] = useState<'form' | 'preview'>('form');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/');
      }
      setCheckingToken(false);
    })();
  }, [router]);

  useEffect(() => {
    if (!checkingToken) {
      (async () => {
        const c = await getDownloadCount();
        setDownloadCount(c);
        setCheckingDownloads(false);
      })();
    }
  }, [checkingToken]);

  useEffect(() => {
    if (!checkingToken) {
      (async () => {
        const sellers = await fetchSellers();
        if (sellers.length > 0) {
          setSeller(sellers[0]);
        }
        // Set other fields to empty
        setBuyer({
          companyName: '',
          address: '',
          gstin: '',
          stateName: '',
          stateCode: '',
          placeOfSupply: '',
        });
        setMeta({
          invoiceNo: '',
          invoiceDate: todayISO(),
        });
        setItems([]);
        setBank({
          bankName: '',
          accountNo: '',
          ifscCode: '',
          bankBranch: '',
        });
        setDeclaration(DEFAULT_DECLARATION);
      })();
    }
  }, [checkingToken]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: string) => {
      if (nextAppState === 'active') {
        sendLoginStatus(true);
      } else if (nextAppState === 'background') {
        await sendLoginStatus(false);
        await AsyncStorage.removeItem('token');
      }
    });

    return () => {
      subscription.remove();
      sendLoginStatus(false);
      AsyncStorage.removeItem('token');
    };
  }, []);

  const invoiceState: InvoiceState = useMemo(
    () => ({ seller, buyer, meta, items, bank, declaration }),
    [seller, buyer, meta, items, bank, declaration],
  );

  const handleGenerate = () => setView('preview');
  const handleBack = () => setView('form');

  const handleDownload = async () => {
    try {
      setGenerating(true);
      await generateAndShareInvoicePdf(invoiceState);
      // refresh count
      const c = await getDownloadCount();
      setDownloadCount(c);
    } catch (e: any) {
      console.error('PDF error:', e);
      Alert.alert('PDF Error', e?.message || String(e));
    } finally {
      setGenerating(false);
    }
  };

  const handleReset = () => {
    Alert.alert('Reset', 'Are you sure you want to reset the form?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          // Don't reset seller, keep it as is
          setBuyer({
            companyName: '',
            address: '',
            gstin: '',
            stateName: '',
            stateCode: '',
            placeOfSupply: '',
          });
          setMeta({
            invoiceNo: '',
            invoiceDate: todayISO(),
          });
          setItems([]);
          setBank({
            bankName: '',
            accountNo: '',
            ifscCode: '',
            bankBranch: '',
          });
          setDeclaration(DEFAULT_DECLARATION);
        },
      },
    ]);
  };

  const handleLogout = async () => {
    try {
      await sendLoginStatus(false);
      await AsyncStorage.removeItem('token');
      router.replace('/');
    } catch (error) {
      Alert.alert('Error', 'Failed to logout');
    }
  };

  if (checkingToken || checkingDownloads) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (downloadCount > DOWNLOAD_LIMIT) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.upgradeContainer}>
          <View style={styles.upgradeHeader}>
            <Text style={styles.upgradeTitle}>Upgrade Plan</Text>
            <Text style={styles.upgradeSubtitle}>You&apos;ve reached your free download limit</Text>
          </View>
          <View style={styles.upgradeContent}>
            <Text style={styles.upgradeText}>
              You have downloaded {downloadCount} invoices. Your free plan allows up to {DOWNLOAD_LIMIT} downloads.
            </Text>
            <Text style={styles.upgradeText}>Upgrade to premium for unlimited downloads.</Text>
            <Pressable style={styles.upgradeButton}>
              <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {view === 'form' ? (
        <>
          <View style={styles.topBar}>
            <Text style={styles.topTitle}>Tax Invoice Generator</Text>
            <View style={styles.topActions}>
              <Pressable onPress={handleLogout} style={[styles.topBtn, styles.topBtnDanger]}>
                <Text style={styles.topBtnText}>Logout</Text>
              </Pressable>
              <Pressable onPress={handleGenerate} style={[styles.topBtn, styles.topBtnPrimary]}>
                <Text style={styles.topBtnText}>Generate Invoice</Text>
              </Pressable>
              <Pressable onPress={handleReset} style={[styles.topBtn, styles.topBtnSecondary]}>
                <Text style={styles.topBtnText}>Reset</Text>
              </Pressable>
            </View>
          </View>
          <ScrollView contentContainerStyle={styles.scroll}>
            <SellerForm value={seller} onChange={setSeller} />
            <BuyerForm value={buyer} onChange={setBuyer} />
            <MetaForm value={meta} onChange={setMeta} />
            <ItemsForm items={items} onChange={setItems} />
            <BankAndDeclarationForm
              bank={bank}
              onBankChange={setBank}
              declaration={declaration}
              onDeclarationChange={setDeclaration}
            />
          </ScrollView>
        </>
      ) : (
        <>
          <View style={styles.topBar}>
            <Text style={styles.topTitle}>Invoice Preview</Text>
            <View style={styles.topActions}>
              <Pressable onPress={handleBack} style={[styles.topBtn, styles.topBtnSecondary]}>
                <Text style={styles.topBtnText}>Edit</Text>
              </Pressable>
              <Pressable
                onPress={handleDownload}
                disabled={generating}
                style={[styles.topBtn, styles.topBtnSuccess, generating && { opacity: 0.6 }]}
              >
                <Text style={styles.topBtnText}>{generating ? 'Generating...' : 'Download PDF'}</Text>
              </Pressable>
            </View>
          </View>
          <ScrollView>
            <InvoicePreview state={invoiceState} />
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 12 },
  topBar: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
  },
  topTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 8 },
  topActions: { flexDirection: 'row', gap: 8 },
  topBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  topBtnPrimary: { backgroundColor: '#2563eb' },
  topBtnSecondary: { backgroundColor: '#475569' },
  topBtnSuccess: { backgroundColor: '#16a34a' },
  topBtnDanger: { backgroundColor: '#dc2626' },
  topBtnText: { color: '#fff', fontWeight: '700', fontSize: 12, letterSpacing: 0.3 },

  upgradeContainer: {
    margin: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  upgradeHeader: {
    backgroundColor: '#1e3a8a',
    padding: 20,
  },
  upgradeTitle: { color: '#fff', fontSize: 22, fontWeight: '700' },
  upgradeSubtitle: { color: '#cbd5e1', marginTop: 4 },
  upgradeContent: { padding: 20 },
  upgradeText: { fontSize: 14, color: '#374151', marginBottom: 10, lineHeight: 20 },
  upgradeButton: {
    marginTop: 12,
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  upgradeButtonText: { color: '#fff', fontWeight: '700' },
});
