import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

export default function InvoiceScreen() {
  const router = useRouter();
  const [hasToken, setHasToken] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);
  const [downloadCount, setDownloadCount] = useState(0);
  const [checkingDownloadCount, setCheckingDownloadCount] = useState(true);
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);

  // Change this based on your environment:
  // - Physical device: Use your machine's IP (e.g., 'http://192.168.1.5:5000')
  // - Android emulator: 'http://10.0.2.2:5000'
  // - iOS simulator: 'http://localhost:5000'
  const API_URL = 'https://tallybackend-rjib.onrender.com';

  useEffect(() => {
    checkToken();
  }, []);

  useEffect(() => {
    if (hasToken) {
      checkDownloadCount();
    }
  }, [hasToken]);

  const checkToken = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/');
      } else {
        setHasToken(true);
      }
    } catch (error) {
      console.error('Error checking token:', error);
    } finally {
      setCheckingToken(false);
    }
  };

  const checkDownloadCount = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        return;
      }

      // Decode JWT token to get userId
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      const userId = tokenPayload.userId;

      const response = await fetch(`${API_URL}/api/download-count?userId=${userId}`);
      const data = await response.json();
      setDownloadCount(data.count || 0);
    } catch (error) {
      console.error('Error checking download count:', error);
      setDownloadCount(0);
    } finally {
      setCheckingDownloadCount(false);
    }
  };

  const handleWebViewMessage = async (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);

      if (message.type === 'incrementDownloadCount') {
        // Increment download count in database
        try {
          const token = await AsyncStorage.getItem('token');
          if (!token) {
            console.error('No token found');
            return;
          }

          // Decode JWT token to get userId
          let userId = '';
          try {
            const tokenPayload = JSON.parse(atob(token.split('.')[1]));
            userId = tokenPayload.userId;
          } catch (decodeError) {
            console.error('Token decode error:', decodeError);
            return;
          }

          const response = await fetch(`${API_URL}/api/download-count`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId }),
          });

          const result = await response.json();
          console.log('Download count incremented:', result);

          // Re-fetch download count to update UI
          checkDownloadCount();
        } catch (error) {
          console.error('Error incrementing download count:', error);
        }
      } else if (message.type === 'saveSellerData') {

        console.log('Saving seller data:', message.sellerData);
        // Save seller data to database
        try {
          const token = await AsyncStorage.getItem('token');
          if (!token) {
            console.error('No token found');
            return;
          }

          // Decode JWT token to get userId
          const tokenPayload = JSON.parse(atob(token.split('.')[1]));
          const userId = tokenPayload.userId;

          const response = await fetch(`${API_URL}/api/seller`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              ...message.sellerData,
              userId,
            }),
          });

          const result = await response.json();
          console.log('Seller data saved:', result);

          // Reload sellers dropdown
          if (webViewRef.current) {
            webViewRef.current.injectJavaScript(`
              loadSellersDropdown();
            `);
          }
        } catch (error) {
          console.error('Error saving seller data:', error);
        }
      } else if (message.type === 'saveBuyerData') {
        // Save buyer data to database
        try {
          const token = await AsyncStorage.getItem('token');
          if (!token) {
            console.error('No token found');
            return;
          }

          // Decode JWT token to get userId
          const tokenPayload = JSON.parse(atob(token.split('.')[1]));
          const userId = tokenPayload.userId;

          const response = await fetch(`${API_URL}/api/buyer`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              ...message.buyerData,
              userId,
            }),
          });

          const result = await response.json();
          console.log('Buyer data saved:', result);

          // Reload buyers dropdown
          if (webViewRef.current) {
            webViewRef.current.injectJavaScript(`
              loadBuyersDropdown();
            `);
          }
        } catch (error) {
          console.error('Error saving buyer data:', error);
        }
      } else if (message.type === 'sharePDF') {
        const pdfData = message.data;
        const filename = message.filename;

        // Convert base64 to file
        const fileUri = `${FileSystem.documentDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(fileUri, pdfData.split(',')[1], {
          encoding: 'base64',
        });

        // Share the PDF
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Share Invoice PDF',
          });
        } else {
          console.log('Sharing is not available');
        }
      }
    } catch (error) {
      console.error('Error handling WebView message:', error);
    }
  };

  if (checkingToken || checkingDownloadCount) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (downloadCount > 15) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.upgradeContainer}>
          <View style={styles.upgradeHeader}>
            <Text style={styles.upgradeTitle}>Upgrade Plan</Text>
            <Text style={styles.upgradeSubtitle}>You've reached your free download limit</Text>
          </View>
          <View style={styles.upgradeContent}>
            <Text style={styles.upgradeText}>
              You have downloaded {downloadCount} invoices. Your free plan allows up to 15 downloads.
            </Text>
            <Text style={styles.upgradeText}>
              Upgrade to premium to get unlimited downloads and more features.
            </Text>
            <TouchableOpacity style={styles.upgradeButton}>
              <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <iframe
          src={require('../assets/images/invoice-generator.html')}
          style={styles.webview}
          title="Invoice Generator"
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <WebView
        ref={webViewRef}
        source={require('../assets/images/invoice-generator.html')}
        originWhitelist={['*']}
        allowUniversalAccessFromFileURLs={true}
        allowFileAccess={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        cacheEnabled={false}
        style={styles.webview}
        bounces={false}
        overScrollMode="never"
        onMessage={handleWebViewMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  webview: {
    flex: 1,
  },
  upgradeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  upgradeHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  upgradeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  upgradeSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  upgradeContent: {
    width: '100%',
    maxWidth: 400,
  },
  upgradeText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
    lineHeight: 24,
  },
  upgradeButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
