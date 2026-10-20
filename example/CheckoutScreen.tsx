import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import {
  useKbzPay,
  validateOrderInfo,
  type KbzPayResult,
} from '@phonehtut/react-native-kbz-pay';

export default function CheckoutScreen() {
  // Use the modern, ergonomic React hook
  const {
    pay,
    isPaying,
    isVerifying,
    isInstalled,
    result,
    openStore,
  } = useKbzPay({
    // Optional: Backend verification callback to confirm authoritative transaction status
    verifyPayment: async ({ merchOrderId }) => {
      // Example: Query your backend server to confirm status
      /*
      const res = await fetch(`https://your-api.com/api/payment/verify?orderId=${merchOrderId}`);
      const json = await res.json();
      if (json.status === 'PAID') return 'completed';
      if (json.status === 'FAILED') return 'failed';
      return 'pending';
      */
      return 'completed';
    },
    onSuccess: (res: KbzPayResult) => {
      Alert.alert('Payment Successful!', `Transaction completed.\nOrder ID: ${res.orderId ?? 'N/A'}`);
    },
    onCancelled: () => {
      Alert.alert('Cancelled', 'You cancelled the KBZ Pay transaction.');
    },
    onError: (err) => {
      Alert.alert('Payment Error', err.message);
    },
  });

  const handlePay = async () => {
    // Sample prepay payload returned from your backend prepay API
    const sampleBackendResponse = {
      orderInfo:
        'appid=kp1234567890abcdef&merch_code=100001&nonce_str=5K8264ILTKCH16CQ2502SI8ZNMTM67VS&prepay_id=KBZ001234567890&timestamp=1700000000&merch_order_id=ORDER_1024',
      sign: 'B18C06DC1C0E473F470EBF89A6B971B7C9BCE2B1A6E7D2E240FEA9292CEBEB42',
      signType: 'SHA256',
    };

    // Optional: Validate payload before launching
    const validation = validateOrderInfo(sampleBackendResponse.orderInfo);
    if (!validation.isValid) {
      Alert.alert('Validation Error', validation.errors.join('\n'));
      return;
    }

    // Launch payment
    await pay({
      orderInfo: sampleBackendResponse.orderInfo,
      sign: sampleBackendResponse.sign,
      signType: sampleBackendResponse.signType,
    });
  };

  const getButtonText = () => {
    if (isVerifying) return 'Verifying with Backend...';
    if (isPaying) return 'Processing Payment...';
    return 'Pay with KBZ Pay';
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
              { color: isInstalled ? '#16a34a' : '#dc2626' },
            ]}
          >
            {isInstalled === null
              ? 'Checking...'
              : isInstalled
              ? 'Yes'
              : 'No (Install required)'}
          </Text>
        </View>

        {isInstalled === false && (
          <TouchableOpacity style={styles.installButton} onPress={() => openStore('prod')}>
            <Text style={styles.installButtonText}>Download KBZ Pay App</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.payButton, (isPaying || isVerifying) && styles.disabledButton]}
          disabled={isPaying || isVerifying}
          onPress={handlePay}
        >
          {isPaying || isVerifying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.payButtonText}>{getButtonText()}</Text>
          )}
        </TouchableOpacity>

        {result && (
          <View style={styles.resultBox}>
            <Text style={styles.resultStatus}>
              Status: <Text style={{ fontWeight: '700' }}>{result.status.toUpperCase()}</Text>
            </Text>
            {result.orderId && <Text style={styles.resultText}>Order ID: {result.orderId}</Text>}
            {result.failMessage && (
              <Text style={styles.resultError}>Error: {result.failMessage}</Text>
            )}
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
  resultStatus: {
    fontSize: 14,
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 4,
  },
  resultText: {
    fontSize: 13,
    color: '#334155',
    textAlign: 'center',
  },
  resultError: {
    fontSize: 13,
    color: '#dc2626',
    textAlign: 'center',
    marginTop: 4,
  },
});
