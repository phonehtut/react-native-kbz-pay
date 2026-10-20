# Changelog

All notable changes to `react-native-kbz-pay` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.0] - 2026-10-20

### 🔒 Security & Architecture Upgrade
- **Zero-Trust Pure Wrapper Architecture**: Removed pre-compiled proprietary binary blobs (`.aar`, `.xcframework`) from the npm distribution package and git tracking for total supply-chain security and license compliance.
- **Automated SDK Setup Utility (`bin/cli.js`)**:
  - Added `npx react-native-kbz-pay setup-sdk <path-to-sdk-download>` CLI command.
  - Automatically handles Android `.aar` linking.
  - Automatically merges official KBZ iOS frameworks (`framework/prod` + `framework/simulator`) into a clean `KBZPayAPPPay.xcframework` using `xcodebuild`.
  - Added `npx react-native-kbz-pay verify-sdk` command to inspect local binary SHA-256 hashes against official bank releases.
- **Fail-Fast Informative Build Errors**: If native SDKs have not been set up, Gradle and CocoaPods emit clean, step-by-step guidance linking to the official KBZ Pay portal and setup command.
- **Custom AAR Path Support**: Supported `kbzpay_custom_aar` property in Gradle for custom enterprise local paths.

---

## [1.1.0] - 2026-10-20

### 🚀 Added
- **`useKbzPay` Custom Hook**: Modern React hook for state management (`isPaying`, `isVerifying`, `isInstalled`, `result`, `error`), automatic verification handling, and callbacks (`onSuccess`, `onCancelled`, `onError`).
- **`openKbzPayStore(target)`**: Utility to redirect users directly to Google Play Store or Apple App Store if KBZ Pay app is not installed.
- **`validateOrderInfo(orderInfo)`**: Parameter validation helper to inspect prepay query strings and report missing or malformed params before launching payment.
- **`buildOrderInfo(params)`**: Query string builder that formats parameters in ASCII-sorted order compliant with KBZ Pay SDK requirements.
- **Typed Error Handling**:
  - `KbzPayError` class with error codes and causes.
  - `KbzPayErrorCode` enum (`APP_NOT_INSTALLED`, `USER_CANCELLED`, `PAYMENT_FAILED`, `PAYMENT_TIMEOUT`, `ALREADY_IN_PROGRESS`, etc.).
- **Jest Unit Test Suite**: Comprehensive tests covering utilities, order parsing/validation, URL parsing, and payment polling with 100% pass rate.
- **Enhanced Documentation & Examples**: Updated `example/CheckoutScreen.tsx` with modern hook patterns, added Keystore SHA-256 fingerprint troubleshooting guide in `README.md`.

---

## [1.0.0] - 2026-10-20

### 🚀 Initial Release
- **Official Bundled SDKs**:
  - Android: KBZ Pay SDK v1.1.0 (both UAT Sandbox and Production AARs).
  - iOS: `KBZPayAPPPay.xcframework` with CocoaPods autolinking support.
- **Expo Config Plugin**:
  - `app.plugin.js` for automatic iOS URL scheme and Android manifest `<queries>` setup.
  - Support for `"environment": "uat" | "prod"` in `app.json`.
- **TypeScript Client API**:
  - `startKbzPay({ orderInfo, sign, signType, verifyPayment })` with promise-based resolution.
  - `isKbzPayInstalled('prod' | 'uat' | 'any')` for checking app presence.
  - `resetKbzPayState()` for clearing stuck transactions.
  - `addKbzPayListener()` for listening to event emitter callbacks.
  - `parseKbzUrl()` for deep link result decoding.
- **Authoritative Backend Verification**:
  - `AppState` foreground detection automatically triggers `verifyPayment` polling loop when user returns from KBZ Pay app.
- **Multi-Backend Documentation**:
  - Sample SHA256 prepay parameter signing code for Node.js, PHP/Laravel, Python, and Go.
