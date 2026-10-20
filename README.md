# @phonehtut/react-native-kbz-pay

[![npm version](https://img.shields.io/npm/v/@phonehtut/react-native-kbz-pay.svg)](https://www.npmjs.com/package/@phonehtut/react-native-kbz-pay)
[![platform](https://img.shields.io/badge/platform-ios%20%7C%20android-lightgrey.svg)](https://reactnative.dev)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![docs](https://img.shields.io/badge/docs-KBZPay%20Official-blue.svg)](https://wap.kbzpay.com/pgw/uat/api/#/en/docs/Distributor%20BuyGoods%20InApp/scenes-distributor-in-app-en)

Developer-friendly, production-ready KBZ Pay mobile payment integration for **React Native** and **Expo** (iOS & Android).

Designed to be completely **backend-agnostic** with full **UAT Sandbox** and **Production** support.

> 📖 **Official KBZPay Documentation**: [KBZPay Distributor BuyGoods In-App Payment Guide](https://wap.kbzpay.com/pgw/uat/api/#/en/docs/Distributor%20BuyGoods%20InApp/scenes-distributor-in-app-en)

---

## 🌟 Highlights

- 🔒 **Zero-Trust & Pure Wrapper Architecture**: No proprietary bank binaries (`.aar`, `.xcframework`) are bundled inside the npm package. You download the official SDK directly from KBZ Bank and link with a single automated CLI command.
- ⚡ **1-Command Automated SDK Setup**: `npx react-native-kbz-pay setup-sdk` handles Android AAR linking and converts KBZ iOS frameworks into a modern `.xcframework` seamlessly.
- 🔄 **Full UAT & Production Support**: Easily switch between UAT Sandbox testing and Live Production with a single config flag.
- 🚀 **Expo Ready**: Includes official Expo Config Plugin (`app.plugin.js`) for seamless `npx expo prebuild` support.
- 📱 **Dynamic iOS URL Scheme**: Automatically detects your app's return URL scheme from `Info.plist` (no hardcoding needed).
- 🛡️ **Android 11+ Ready**: Auto-merges `<queries>` visibility tags so `isKbzPayInstalled()` works seamlessly on Android 11, 12, 13, 14+.
- ⏱️ **Automatic Timeout Protection**: Prevents hung promises if the user abandons the payment or switches apps.
- 💡 **Fully Typed**: Written in TypeScript with clean interfaces (`KbzPayResult`, `KbzPayStatus`, `KbzEnvironment`).

---

## 🔄 UAT vs Production Configuration

KBZ Pay provides two environments:
1. **UAT Sandbox**: Used during development and testing with KBZ Pay test accounts and the KBZPay UAT Android app (`com.kbzbank.kpaycustomer.uat`).
2. **Production (PROD)**: Live environment with real money transactions and the official KBZPay app (`com.kbzbank.kpaycustomer`).

### Setting the Environment

#### In Expo (`app.json`)

Pass `"environment": "uat"` or `"environment": "prod"` in your `app.json` plugin config (defaults to `"prod"`):

```json
{
  "expo": {
    "plugins": [
      [
        "@phonehtut/react-native-kbz-pay",
        {
          "environment": "uat"
        }
      ]
    ]
  }
}
```

#### In Bare React Native (`android/gradle.properties`)

Add `kbzpay_environment` to your `android/gradle.properties`:

```properties
# Set to 'uat' for sandbox testing or 'prod' for live release
kbzpay_environment=uat
```

---

## 📥 Installation

```bash
# Using npm
npm install @phonehtut/react-native-kbz-pay

# Using yarn
yarn add @phonehtut/react-native-kbz-pay

# Using bun
bun add @phonehtut/react-native-kbz-pay
```

### ⚡ Official SDK Setup (1-Minute Setup)

For security, supply-chain safety, and licensing compliance, this package follows a **zero-trust wrapper approach**: official bank binaries are not redistributed in the npm package. You download the official SDKs directly from the bank portal and configure them in one command:

1. **Download the official SDKs** from the KBZ Bank Developer Portal:
   - 👉 [Official KBZPay SDK Download Center](https://wap.kbzpay.com/pgw/uat/api/#/en/docs/Distributor%20BuyGoods%20InApp/in-app-download-en)
   - **Android**: `kbzsdk_1.1.0.aar`
   - **iOS**: `KBZPay_sdk_ios_v1.3.0.zip`

2. **Run the automated setup utility**:
   ```bash
   # Point to your downloaded folder or unzipped directory (e.g. ~/Downloads/1.3):
   npx react-native-kbz-pay setup-sdk ~/Downloads/1.3

   # Or point to a folder containing both Android .aar and iOS files:
   npx react-native-kbz-pay setup-sdk ~/Downloads/my-kbz-sdk-folder
   ```

   **What the setup utility does automatically:**
   - Detects and links Android `.aar` files to `android/libs/`.
   - On iOS, KBZ distributes separate device (`framework/prod`) and simulator (`framework/simulator`) frameworks. The utility automatically merges them into a clean, modern `KBZPayAPPPay.xcframework` using `xcodebuild` so it builds on both real devices and Apple Silicon/Intel simulators without manual effort.
   - Computes SHA-256 hashes so you can verify SDK integrity immediately.

3. **Verify anytime**:
   ```bash
   npx react-native-kbz-pay verify-sdk
   ```

### Expo Projects

Add the plugin to your `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "@phonehtut/react-native-kbz-pay",
        {
          "environment": "uat"
        }
      ]
    ]
  }
}
```

> **Note**: KBZ Pay uses native SDKs, so it requires Expo Prebuild (`npx expo run:ios` or `npx expo run:android`) or an EAS Dev Client. It cannot run in standard Expo Go.

### Bare React Native Projects

#### iOS Setup
Install CocoaPods:
```bash
cd ios && pod install
```

Make sure your iOS app has a custom URL Scheme registered in `Info.plist` so KBZ Pay can return to your app after payment:
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>yourcustomscheme</string>
    </array>
  </dict>
</array>
<key>LSApplicationQueriesSchemes</key>
<array>
  <string>kbzpay</string>
</array>
```

#### Android Setup
Add the environment to `android/gradle.properties`:
```properties
kbzpay_environment=uat # or prod
```
React Native autolinking will automatically link `KBZPayPackage` and merge the callback Activity into your Android Manifest. No manual Java/Kotlin code edits required!

---

## 💻 Client Usage

### 1. Modern React Hook (`useKbzPay`) — Recommended

The easiest and most idiomatic way in React Native / Expo:

```tsx
import React from 'react';
import { View, Button, Alert } from 'react-native';
import { useKbzPay, validateOrderInfo } from '@phonehtut/react-native-kbz-pay';

export default function CheckoutScreen() {
  const { pay, isPaying, isVerifying, isInstalled, openStore } = useKbzPay({
    // Optional: Authoritative backend status verification
    verifyPayment: async ({ merchOrderId }) => {
      const res = await fetch(`https://your-api.com/api/payment/verify?orderId=${merchOrderId}`);
      const data = await res.json();
      return data.status === 'PAID';
    },
    onSuccess: (result) => {
      Alert.alert('Success', `Payment confirmed! Order ID: ${result.orderId}`);
    },
    onCancelled: () => {
      Alert.alert('Cancelled', 'You cancelled the KBZ Pay transaction.');
    },
    onError: (err) => {
      Alert.alert('Payment Error', err.message);
    },
  });

  const handleCheckout = async () => {
    // 1. Fetch prepay parameters from your backend
    const { orderInfo, sign } = await fetchPrepayFromBackend();

    // 2. (Optional) Validate parameters before launching
    const validation = validateOrderInfo(orderInfo);
    if (!validation.isValid) {
      console.warn('Malformed orderInfo:', validation.errors);
      return;
    }

    // 3. Launch payment
    await pay({ orderInfo, sign });
  };

  if (isInstalled === false) {
    return (
      <View>
        <Button title="Install KBZ Pay" onPress={() => openStore('prod')} />
      </View>
    );
  }

  return (
    <View>
      <Button
        title={isVerifying ? "Verifying..." : isPaying ? "Processing..." : "Pay with KBZ Pay"}
        disabled={isPaying || isVerifying}
        onPress={handleCheckout}
      />
    </View>
  );
}
```

---

### 2. Imperative Usage (`startKbzPay`)

You can also use the promise-based `startKbzPay` function directly:

```typescript
import {
  startKbzPay,
  isKbzPayInstalled,
  openKbzPayStore,
  type KbzPayResult,
} from '@phonehtut/react-native-kbz-pay';

// Check if app is installed
const hasKbzPay = await isKbzPayInstalled('any');
if (!hasKbzPay) {
  await openKbzPayStore('prod'); // Redirect to App Store / Google Play
  return;
}

try {
  const result: KbzPayResult = await startKbzPay({
    orderInfo: 'appid=...&merch_code=...&nonce_str=...&prepay_id=...&timestamp=...',
    sign: 'YOUR_SHA256_SIGNATURE',
    signType: 'SHA256',
    verifyPayment: async ({ merchOrderId }) => {
      const res = await checkBackendStatus(merchOrderId);
      return res.isPaid;
    },
  });

  if (result.status === 'completed') {
    console.log('Payment successful! Order ID:', result.orderId);
  } else if (result.status === 'cancelled') {
    console.log('Payment cancelled by user.');
  } else {
    console.error('Payment failed:', result.failMessage);
  }
} catch (error) {
  console.error('Payment flow error:', error);
}
```

---

### 3. Utility Helpers

#### Check & Open Store
```typescript
import { isKbzPayInstalled, openKbzPayStore } from '@phonehtut/react-native-kbz-pay';

const installed = await isKbzPayInstalled('any'); // 'prod' | 'uat' | 'any'
if (!installed) {
  await openKbzPayStore('prod'); // Opens Play Store on Android or App Store on iOS
}
```

#### Validate & Build Order Info
```typescript
import { validateOrderInfo, buildOrderInfo } from '@phonehtut/react-native-kbz-pay';

// Validate orderInfo query string
const check = validateOrderInfo(orderInfo);
if (!check.isValid) {
  console.error('Missing fields:', check.missingParams);
}

// Build ASCII sorted query string
const queryString = buildOrderInfo({
  appid: 'kp123',
  merch_code: '1001',
  nonce_str: 'xyz',
  prepay_id: 'KBZ01',
  timestamp: '1700000000',
});
```

---

### 4. Event Listener (Optional)

You can also listen to payment events via event emitter:

```typescript
import { addKbzPayListener } from '@phonehtut/react-native-kbz-pay';

const subscription = addKbzPayListener((result) => {
  console.log('Payment result event:', result);
});

// Remove listener when component unmounts
subscription?.remove();
```

---

## 🛠️ Backend Integration Guide (Any Backend)

> 💡 **Official Documentation**: For full API specifications, parameter lists, and security guidelines, refer to the [KBZPay Official In-App Payment API Guide](https://wap.kbzpay.com/pgw/uat/api/#/en/docs/Distributor%20BuyGoods%20InApp/scenes-distributor-in-app-en).

KBZ Pay mobile payment flow follows a standard 3-step process:

```
[Mobile App] ------------ 1. Request Order ------------> [Your Backend]
                                                                |
                                                      2. Call KBZ Precreate API
                                                      (/payment/gateway/precreate)
                                                                |
[Mobile App] <--- 3. Return { orderInfo, sign } <------- [Your Backend]
     |
4. startKbzPay({ orderInfo, sign })
     |
[KBZ Pay App opens & user enters PIN]
     |
     +--------------> 5. Server-to-Server Webhook -----> [Your Backend]
     |
[Mobile App] <------- 6. Return Callback with Result
```

### KBZ Pay Gateway Endpoints

Exported as `KBZ_PAY_GATEWAY_URLS` in TypeScript for easy reference:

| API | UAT Sandbox URL | Production URL |
|-----|-----------------|----------------|
| **Precreate (Create Order)** | `http://api-uat.kbzpay.com/payment/gateway/uat/precreate` | `https://api.kbzpay.com/payment/gateway/precreate` |
| **Query Order Status** | `http://api-uat.kbzpay.com/payment/gateway/uat/queryorder` | `https://api.kbzpay.com/payment/gateway/queryorder` |
| **Refund** | `http://api-uat.kbzpay.com/payment/gateway/uat/refund` | `https://api.kbzpay.com/payment/gateway/refund` |
| **Close Order** | `http://api-uat.kbzpay.com/payment/gateway/uat/closeorder` | `https://api.kbzpay.com/payment/gateway/closeorder` |

---

### Backend Implementation Examples

#### Option A: Node.js / Express
```javascript
import crypto from 'crypto';

export function createKbzOrderPayload({ prepayId, appId, merchCode, merchOrderId, merchantKey }) {
  const nonceStr = crypto.randomBytes(16).toString('hex').toUpperCase();
  const timestamp = Math.floor(Date.now() / 1000).toString();

  // 1. Order parameters alphabetically
  const params = {
    appid: appId,
    merch_code: merchCode,
    merch_order_id: merchOrderId,
    nonce_str: nonceStr,
    prepay_id: prepayId,
    timestamp: timestamp,
  };

  // 2. Build orderInfo string: key1=value1&key2=value2
  const orderInfo = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  // 3. Generate SHA256 Signature
  const stringToSign = `${orderInfo}&key=${merchantKey}`;
  const sign = crypto
    .createHash('sha256')
    .update(stringToSign, 'utf8')
    .digest('hex')
    .toUpperCase();

  return {
    orderInfo,
    sign,
    signType: 'SHA256',
  };
}
```

#### Option B: PHP / Laravel
```php
<?php

namespace App\Services;

class KbzPayService
{
    public function generatePaymentPayload(string $prepayId, string $orderId): array
    {
        $appId = config('kbzpay.app_id');
        $merchCode = config('kbzpay.merch_code');
        $merchantKey = config('kbzpay.merchant_key');

        $params = [
            'appid'          => $appId,
            'merch_code'     => $merchCode,
            'merch_order_id' => $orderId,
            'nonce_str'      => strtoupper(bin2hex(random_bytes(16))),
            'prepay_id'      => $prepayId,
            'timestamp'      => (string) time(),
        ];

        // 1. Sort alphabetically
        ksort($params);

        // 2. Build query string
        $orderInfo = http_build_query($params);

        // 3. Generate SHA256 signature
        $stringToSign = $orderInfo . "&key=" . $merchantKey;
        $sign = strtoupper(hash('sha256', $stringToSign));

        return [
            'orderInfo' => $orderInfo,
            'sign'      => $sign,
            'signType'  => 'SHA256',
        ];
    }
}
```

#### Option C: Python
```python
import hashlib
import time
import uuid

def create_kbz_order_payload(prepay_id: str, order_id: str, app_id: str, merch_code: str, merchant_key: str):
    params = {
        'appid': app_id,
        'merch_code': merch_code,
        'merch_order_id': order_id,
        'nonce_str': uuid.uuid4().hex.upper(),
        'prepay_id': prepay_id,
        'timestamp': str(int(time.time())),
    }

    // 1. Sort alphabetically & build string
    sorted_items = sorted(params.items(), key=lambda x: x[0])
    order_info = '&'.join([f"{k}={v}" for k, v in sorted_items])

    // 2. SHA256 sign
    string_to_sign = f"{order_info}&key={merchant_key}"
    sign = hashlib.sha256(string_to_sign.encode('utf-8')).hexdigest().upper()

    return {
        'orderInfo': order_info,
        'sign': sign,
        'signType': 'SHA256'
    }
```

#### Option D: Go
```go
package kbzpay

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"sort"
	"strings"
	"time"
)

func CreateOrderPayload(prepayID, orderID, appID, merchCode, merchKey, nonceStr string) (string, string) {
	params := map[string]string{
		"appid":          appID,
		"merch_code":     merchCode,
		"merch_order_id": orderID,
		"nonce_str":      nonceStr,
		"prepay_id":      prepayID,
		"timestamp":      fmt.Sprintf("%d", time.Now().Unix()),
	}

	keys := make([]string, 0, len(params))
	for k := range params {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	var parts []string
	for _, k := range keys {
		parts = append(parts, fmt.Sprintf("%s=%s", k, params[k]))
	}
	orderInfo := strings.Join(parts, "&")

	stringToSign := fmt.Sprintf("%s&key=%s", orderInfo, merchKey)
	hash := sha256.Sum256([]byte(stringToSign))
	sign := strings.ToUpper(hex.EncodeToString(hash[:]))

	return orderInfo, sign
}
```

---

## 📖 API Reference

### `useKbzPay(options?: UseKbzPayOptions): UseKbzPayReturn`
Modern React Hook managing payment status, background verification, and store redirects.

| Return Property | Type | Description |
|-----------------|------|-------------|
| `pay` | `(options) => Promise<KbzPayResult>` | Launch KBZ Pay payment flow |
| `isPaying` | `boolean` | True while payment is active in KBZ Pay app |
| `isVerifying` | `boolean` | True while verifying authoritative status with backend |
| `isInstalled` | `boolean \| null` | True if KBZ Pay app is installed on device |
| `result` | `KbzPayResult \| null` | Latest transaction result |
| `error` | `KbzPayError \| Error \| null` | Latest error encountered |
| `openStore` | `(target?) => Promise<void>` | Redirect user to download KBZ Pay from App Store / Play Store |
| `checkInstalled` | `(target?) => Promise<boolean>` | Re-checks if KBZ Pay app is installed |
| `resetState` | `() => void` | Clears current state (result and error) |

### `startKbzPay(options: StartKbzPayOptions): Promise<KbzPayResult>`
Initiates the KBZ Pay payment flow by opening the KBZ Pay app.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `orderInfo` | `string` | **Yes** | Alphabetically sorted query string containing `appid`, `merch_code`, `prepay_id`, etc. |
| `sign` | `string` | **Yes** | Uppercase SHA256 signature generated with merchant secret key |
| `signType` | `string` | No | Signature algorithm. Defaults to `'SHA256'`. |
| `merchOrderId` | `string` | No | Merchant Order ID (auto-extracted from `orderInfo` if omitted). |
| `verifyPayment` | `(context) => Promise<boolean \| 'completed' \| 'failed' \| 'pending'>` | No | Authoritative backend status verification function. |
| `pollingIntervalMs` | `number` | No | Polling interval for `verifyPayment` (default: `2000` ms). |
| `maxPollingAttempts` | `number` | No | Maximum attempts for `verifyPayment` (default: `15` attempts). |
| `appScheme` | `string` | No | (iOS only) Return URL scheme. Auto-detected from `CFBundleURLTypes` if omitted. |
| `timeoutMs` | `number` | No | Callback timeout in milliseconds. Defaults to `120000` (2 minutes). |

### `validateOrderInfo(orderInfo: string): KbzPayValidationResult`
Validates that required parameters (`appid`, `merch_code`, `nonce_str`, `prepay_id`, `timestamp`) exist in the query string and alerts on potential format issues.

### `buildOrderInfo(params: Record<string, any>): string`
Helper that takes an object and converts it to an ASCII-alphabetically-sorted query string compatible with KBZ Pay API requirements.

### `openKbzPayStore(target?: 'prod' | 'uat'): Promise<void>`
Opens Google Play Store or Apple App Store directly to the KBZ Pay download page.

### `pollPaymentStatus(options): Promise<KbzPayResult>`
Standalone helper function to poll any payment verification endpoint until success or timeout.

### Return Value: `KbzPayResult`

| Property | Type | Description |
|----------|------|-------------|
| `status` | `'completed' \| 'cancelled' \| 'failed'` | Normalized status string |
| `code` | `number` | Raw SDK return code (`0`: Completed, `3`: Cancelled, `-1`: Failed) |
| `orderId` | `string \| undefined` | Order ID returned from transaction |
| `failMessage` | `string \| undefined` | Error message if payment failed |
| `errorCode` | `KbzPayErrorCode \| undefined` | Standardized error code |

### Error Codes: `KbzPayErrorCode`
- `APP_NOT_INSTALLED`: KBZ Pay app is not installed on device
- `USER_CANCELLED`: User cancelled the transaction inside KBZ Pay
- `PAYMENT_FAILED`: Payment transaction failed
- `PAYMENT_TIMEOUT`: Timed out waiting for completion or backend verification
- `ALREADY_IN_PROGRESS`: A transaction is currently already underway
- `INVALID_ORDER_INFO`: `orderInfo` parameter was invalid or empty
- `INVALID_SIGNATURE`: `sign` parameter was invalid or empty
- `ACTIVITY_UNAVAILABLE`: Android activity or iOS root controller is not currently active
- `UNSUPPORTED_PLATFORM`: Attempted to run on Web or unsupported platform

### `isKbzPayInstalled(target?: 'prod' | 'uat' | 'any'): Promise<boolean>`
Checks whether the KBZ Pay application is installed on the user's device.
- `'prod'`: Checks Production app (`com.kbzbank.kpaycustomer`)
- `'uat'`: Checks UAT Sandbox app (`com.kbzbank.kpaycustomer.uat`)
- `'any'`: Returns true if either is installed (default)

### `resetKbzPayState(): Promise<boolean>`
Resets any stuck pending transaction state in the native bridge.

### `parseKbzUrl(urlString: string): KbzPayResult | null`
Utility to manually parse a deep link callback URL.

---

## 🔐 Security & SDK Integrity Verification

We prioritize supply-chain security and transparency. The npm package contains **zero pre-compiled proprietary binary blobs**. All developers link directly from official KBZ Bank releases.

### Official KBZ Pay Release Checksums (SHA-256)

You can verify that the binaries you downloaded from the [Official KBZPay Portal](https://wap.kbzpay.com/pgw/uat/api/#/en/docs/Distributor%20BuyGoods%20InApp/in-app-download-en) match known official bank releases:

| Platform | Target | Official File / Component | SHA-256 Checksum |
| :--- | :--- | :--- | :--- |
| **Android** | Production | `kbzsdk_1.1.0.aar` | `d2ae7189d6bd635f208c5f850cb73ae0098a0fef61200b33810668b96967bb6a` |
| **Android** | UAT Sandbox | `kbzsdk_1.1.0.aar` (UAT) | `b83fc469509d5dd97b992cfe0a4aa820b029144f906d439e10b37d3a78370ebf` |
| **iOS** | Device (`arm64`, `armv7`) | `framework/prod/.../KBZPayAPPPay` | `94437a1db1a7d65d37d7ab47aeca535e9f20e1083c0ca7b1f04b6c32b533394c` |
| **iOS** | Simulator (`arm64`, `x86_64`) | `framework/simulator/.../KBZPayAPPPay` | `f91d19b3daa14fb72980b6509a57d7ed0ccc8459024cd266aa583ab753ade147` |

### Manual Verification Command
To verify any file locally on macOS / Linux:
```bash
# Android
shasum -a 256 path/to/kbzsdk_1.1.0.aar

# iOS Device binary
shasum -a 256 path/to/1.3/framework/prod/KBZPayAPPPay.framework/KBZPayAPPPay

# Or run the built-in validator
npx react-native-kbz-pay verify-sdk
```

---

## ❓ FAQ & Troubleshooting

### 1. "KBZ Pay doesn't open on iOS simulator"
KBZ Pay app is not available on iOS Simulator. Test payment on a physical iOS device with the KBZ Pay app installed.

### 2. "Payment completed but app didn't receive callback on iOS"
Ensure your iOS app has registered a custom URL scheme in `CFBundleURLTypes` (e.g. `myapp://`). KBZ Pay returns to your app using this scheme.

### 3. "Android 11+ shows app not installed even though it is"
This package automatically bundles `<queries>` for both `com.kbzbank.kpaycustomer` (PROD) and `com.kbzbank.kpaycustomer.uat` (UAT). No manual changes to your `AndroidManifest.xml` are needed.

### 4. "Android payment screen opens and closes immediately or shows error"
Make sure your Android APK signing keystore's **SHA-256 fingerprint** matches the fingerprint registered with the KBZ Pay Merchant Portal. If the keystore signature does not match your registered `appid`, KBZ Pay's native SDK will automatically reject the payment request.

### 5. "Should I trust client-side status for delivering goods/services?"
**NO**. Always verify the transaction with your backend server using KBZ Pay's server-to-server callback notification (webhook) or query order API before fulfilling paid services.

---

## 📚 Official Resources & Documentation

- [KBZPay Official In-App Payment Developer Documentation](https://wap.kbzpay.com/pgw/uat/api/#/en/docs/Distributor%20BuyGoods%20InApp/scenes-distributor-in-app-en)

---

## 👨‍💻 Author

**Phone Htut Khaung**
- 🌐 Portfolio / Website: [https://yamm.newway-solutions.tech](https://yamm.newway-solutions.tech)
- 🐙 GitHub: [@phonehtut](https://github.com/phonehtut)
- 📧 Email: [phonehtutkhaung.dev@gmail.com](mailto:phonehtutkhaung.dev@gmail.com)

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
