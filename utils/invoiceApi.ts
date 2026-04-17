import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BuyerData, SellerData } from '../types/invoice';

export const API_URL = 'https://tallybackend-rjib.onrender.com';

async function getAuth(): Promise<{ token: string; userId: string } | null> {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return { token, userId: payload.userId };
  } catch (e) {
    console.error('getAuth error:', e);
    return null;
  }
}

export async function fetchSellers(): Promise<SellerData[]> {
  try {
    const res = await fetch(`${API_URL}/api/sellers`);
    const data = await res.json();
    return (data.sellers || []) as SellerData[];
  } catch (e) {
    console.error('fetchSellers error:', e);
    return [];
  }
}

export async function fetchBuyers(): Promise<BuyerData[]> {
  try {
    const res = await fetch(`${API_URL}/api/buyers`);
    const data = await res.json();
    return (data.buyers || []) as BuyerData[];
  } catch (e) {
    console.error('fetchBuyers error:', e);
    return [];
  }
}

export async function saveSeller(seller: SellerData): Promise<boolean> {
  const auth = await getAuth();
  if (!auth) return false;
  try {
    const res = await fetch(`${API_URL}/api/seller`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify({
        ...seller,
        id: seller.id || Date.now().toString(),
        name: seller.companyName,
        userId: auth.userId,
      }),
    });
    return res.ok;
  } catch (e) {
    console.error('saveSeller error:', e);
    return false;
  }
}

export async function saveBuyer(buyer: BuyerData): Promise<boolean> {
  const auth = await getAuth();
  if (!auth) return false;
  try {
    const res = await fetch(`${API_URL}/api/buyer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify({
        ...buyer,
        id: buyer.id || Date.now().toString(),
        name: buyer.companyName,
        userId: auth.userId,
      }),
    });
    return res.ok;
  } catch (e) {
    console.error('saveBuyer error:', e);
    return false;
  }
}

export async function getDownloadCount(): Promise<number> {
  const auth = await getAuth();
  if (!auth) return 0;
  try {
    const res = await fetch(`${API_URL}/api/download-count?userId=${auth.userId}`);
    const data = await res.json();
    return Number(data.count) || 0;
  } catch (e) {
    console.error('getDownloadCount error:', e);
    return 0;
  }
}

export async function incrementDownloadCount(): Promise<void> {
  const auth = await getAuth();
  if (!auth) return;
  try {
    await fetch(`${API_URL}/api/download-count`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: auth.userId }),
    });
  } catch (e) {
    console.error('incrementDownloadCount error:', e);
  }
}
