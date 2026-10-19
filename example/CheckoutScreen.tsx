import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  SafeAreaView,
  Linking,
  Platform,
} from 'react-native';
import {
  startKbzPay,
  isKbzPayInstalled,
  type KbzPayResult,
} from 'react-native-kbz-pay';

export default function CheckoutScreen() {
  const [isAppInstalled, setIsAppInstalled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);

  useEffect(() => {
    // Check if KBZ Pay is installed on the user's device
    checkApp();
  }, []);

  const checkApp = async () => {
    // Check if either UAT or Production app is installed
    // You can also pass 'uat' to check UAT Sandbox only, or 'prod' for Production only
    const installed = await isKbzPayInstalled('any');
    setIsAppInstalled(installed);
  };

  const openAppStore = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('https://apps.apple.com/mm/app/kbzpay-customer/id1439265902');
    } else {
      Linking.openURL('https://play.google.com/store/apps/details?id=com.kbzbank.kpaycustomer');
    }
  };

  const handlePay = async () => {
    try {
      setLoading(true);
      setPaymentStatus(null);

      // 1. Fetch prepay order parameters from YOUR backend server
      // (Your backend calls KBZ Pay Prepay API, generates orderInfo and SHA256 sign)
      /*
      const response = await fetch('https://your-api.com/api/payment/kbz/prepay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 50000,
          currency: 'MMK',
          orderTitle: 'Hotel Booking #1024',
        }),
      });
      const data = await response.json();
      */

      // Sample payload returned from backend:
      const sampleBackendResponse = {
        orderInfo: 'appid=kp1234567890abcdef&merch_code=100001&nonce_str=5K8264ILTKCH16CQ2502SI8ZNMTM67VS&prepay_id=KBZ001234567890&timestamp=1700000000',
        sign: 'B18C06DC1C0E473F470EBF89A6B971B7C9BCE2B1A6E7D2E240FEA9292CEBEB42',
        signType: 'SHA256',
      };

      // 2. Call startKbzPay with backend payload and optional verifyPayment callback
      const result: KbzPayResult = await startKbzPay({
        orderInfo: sampleBackendResponse.orderInfo,
        sign: sampleBackendResponse.sign,
        signType: sampleBackendResponse.signType,
        // Optional: Provide backend transaction verification callback
        // When user returns from KBZ Pay app (AppState active), this callback is
        // called to verify with your backend that the payment was truly confirmed.
        verifyPayment: async ({ merchOrderId }) => {
          /*
          const res = await fetch(`https://your-api.com/api/payment/verify?orderId=${merchOrderId}`);
          const json = await res.json();
          // Return 'completed' | 'failed' | 'pending' (to retry)
          if (json.status === 'PAID') return 'completed';
          if (json.status === 'FAILED') return 'failed';
          return 'pending';
          */
          return 'completed';
        },
        // Optional iOS return scheme:
        // appScheme: 'myhotelapp',
      });

      // 3. Handle the result
      if (result.status === 'completed') {
        setPaymentStatus('Payment completed successfully!');
        Alert.alert('Success', `KBZ Pay payment successful!\nOrder ID: ${result.orderId ?? 'N/A'}`);

        // Notify your backend to verify transaction status (recommended)
        // await verifyOnBackend(result.orderId);
      } else if (result.status === 'cancelled') {
        setPaymentStatus('Payment was cancelled by user.');
        Alert.alert('Cancelled', 'You cancelled the KBZ Pay transaction.');
      } else {
        setPaymentStatus(`Payment failed: ${result.failMessage ?? 'Unknown error'}`);
        Alert.alert('Failed', result.failMessage ?? 'Payment transaction failed.');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to start KBZ Pay.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>KBZ Pay Checkout Example</Text>
        <Text style={styles.subtitle}>Order Amount: 50,000 MMK</Text>

        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>KBZ Pay App Installed:</Text>
          <Text
            style={[
              styles.statusValue,
              { color: isAppInstalled ? '#16a34a' : '#dc2626' },
            ]}
          >
            {isAppInstalled === null
              ? 'Checking...'
              : isAppInstalled
              ? 'Yes'
              : 'No (Install required)'}
          </Text>
        </View>

        {!isAppInstalled && isAppInstalled !== null && (
          <TouchableOpacity style={styles.installButton} onPress={openAppStore}>
            <Text style={styles.installButtonText}>Download KBZ Pay App</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.payButton, loading && styles.disabledButton]}
          disabled={loading}
          onPress={handlePay}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.payButtonText}>Pay with KBZ Pay</Text>
          )}
        </TouchableOpacity>

        {paymentStatus && (
          <View style={styles.resultBox}>
            <Text style={styles.resultText}>{paymentStatus}</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#475569',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  installButton: {
    backgroundColor: '#e0f2fe',
    borderRadius: 10,
    paddingVertical: 10,
    marginBottom: 16,
    alignItems: 'center',
  },
  installButtonText: {
    color: '#0284c7',
    fontWeight: '600',
    fontSize: 14,
  },
  payButton: {
    backgroundColor: '#005bac', // KBZ Brand Blue
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  payButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  resultBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  resultText: {
    fontSize: 13,
    color: '#334155',
    textAlign: 'center',
  },
});
