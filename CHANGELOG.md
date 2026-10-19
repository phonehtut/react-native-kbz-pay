# Changelog

All notable changes to `react-native-kbz-pay` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
