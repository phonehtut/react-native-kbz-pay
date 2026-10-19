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

- 📦 **Zero Native Config Hassle**: Pre-bundled with official KBZ Pay Android SDKs (`.aar`) and iOS SDK (`.xcframework`).
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

### 1. Check if KBZ Pay App is Installed

You can check for specific environments or either:

```typescript
import { isKbzPayInstalled } from '@phonehtut/react-native-kbz-pay';

// Check if UAT Sandbox app is installed
const hasUatApp = await isKbzPayInstalled('uat');

// Check if Live Production app is installed
const hasProdApp = await isKbzPayInstalled('prod');

// Check if either is installed (default)
const hasAnyApp = await isKbzPayInstalled('any');

if (!hasAnyApp) {
  // Show prompt to install KBZ Pay or provide web fallback
}
```

### 2. Start Payment (with Backend Verification)

In mobile payments, relying purely on native deep links/activity callbacks can fail if the user switches apps manually or if the OS terminates the activity.

You can supply the `verifyPayment` callback in `startKbzPay`. When the user returns to your app (`AppState` becomes `active`), the package automatically polls your backend to verify that the transaction was confirmed via KBZ Pay's server webhook:

```typescript
import { startKbzPay, type KbzPayResult } from '@phonehtut/react-native-kbz-pay';

try {
  // 1. Get prepay orderInfo and sign from your backend
  const { orderInfo, sign, merchOrderId } = await fetchPaymentPayloadFromYourBackend();

  // 2. Open KBZ Pay app with backend verification
  const result: KbzPayResult = await startKbzPay({
    orderInfo,
    sign,
    signType: 'SHA256',
    merchOrderId,

    // Authoritative Backend Verification Callback
    verifyPayment: async ({ merchOrderId }) => {
      const response = await fetch(`https://your-api.com/api/payment/status?orderId=${merchOrderId}`);
      const data = await response.json();

      // Return:
      // - 'completed' or true  => Payment confirmed
      // - 'failed' or false     => Payment failed
      // - 'pending'             => Still processing (will retry up to maxPollingAttempts)
      if (data.status === 'PAID') return 'completed';
      if (data.status === 'FAILED') return 'failed';
      return 'pending';
    },

    pollingIntervalMs: 2000, // Poll backend every 2s (default: 2000)
    maxPollingAttempts: 15,  // Try up to 15 times (~30s) (default: 15)
  });

  // 3. Handle confirmed result
  if (result.status === 'completed') {
    console.log('Payment confirmed by backend! Order ID:', result.orderId);
  } else if (result.status === 'cancelled') {
    console.log('User cancelled the payment.');
  } else {
    console.error('Payment failed:', result.failMessage);
  }
} catch (error) {
  console.error('Error during KBZ Pay checkout:', error);
}
```

### 3. Event Listener (Optional)

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
                                                      2. Call KBZ Prepay API
                                                      (/payment/gateway/prepay)
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

| API | UAT Sandbox URL | Production URL |
|-----|-----------------|----------------|
| **Prepay (Create Order)** | `http://api.kbzpay.com/payment/gateway/uat/prepay` | `https://api.kbzpay.com/payment/gateway/prepay` |
| **Query Order Status** | `http://api.kbzpay.com/payment/gateway/uat/queryorder` | `https://api.kbzpay.com/payment/gateway/queryorder` |
| **Refund** | `http://api.kbzpay.com/payment/gateway/uat/refund` | `https://api.kbzpay.com/payment/gateway/refund` |

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

### `pollPaymentStatus(options): Promise<KbzPayResult>`
Standalone helper function to poll any payment verification endpoint until success or timeout.

### Return Value: `KbzPayResult`

| Property | Type | Description |
|----------|------|-------------|
| `status` | `'completed' \| 'cancelled' \| 'failed'` | Normalized status string |
| `code` | `number` | Raw SDK return code (`0`: Completed, `3`: Cancelled, `-1`: Failed) |
| `orderId` | `string \| undefined` | Order ID returned from transaction |
| `failMessage` | `string \| undefined` | Error message if payment failed |

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

## ❓ FAQ & Troubleshooting

### 1. "KBZ Pay doesn't open on iOS simulator"
KBZ Pay app is not available on iOS Simulator. Test payment on a physical iOS device with the KBZ Pay app installed.

### 2. "Payment completed but app didn't receive callback on iOS"
Ensure your iOS app has registered a custom URL scheme in `CFBundleURLTypes` (e.g. `myapp://`). KBZ Pay returns to your app using this scheme.

### 3. "Android 11+ shows app not installed even though it is"
This package automatically bundles `<queries>` for both `com.kbzbank.kpaycustomer` (PROD) and `com.kbzbank.kpaycustomer.uat` (UAT). No manual changes to your `AndroidManifest.xml` are needed.

### 4. "Should I trust client-side status for delivering goods/services?"
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
