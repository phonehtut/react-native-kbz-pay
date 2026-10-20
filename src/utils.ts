import { Linking, Platform } from 'react-native';
import {
  type KbzEnvironment,
  KbzPayError,
  KbzPayErrorCode,
  type KbzPayValidationResult,
} from './types';

/**
 * Official KBZ Pay Payment Gateway API Endpoints.
 * Use these URLs on your backend to communicate with KBZ Pay servers.
 */
export const KBZ_PAY_GATEWAY_URLS = {
  uat: {
    precreate: 'http://api-uat.kbzpay.com/payment/gateway/uat/precreate',
    queryOrder: 'http://api-uat.kbzpay.com/payment/gateway/uat/queryorder',
    refund: 'http://api-uat.kbzpay.com/payment/gateway/uat/refund',
    closeOrder: 'http://api-uat.kbzpay.com/payment/gateway/uat/closeorder',
  },
  prod: {
    precreate: 'https://api.kbzpay.com/payment/gateway/precreate',
    queryOrder: 'https://api.kbzpay.com/payment/gateway/queryorder',
    refund: 'https://api.kbzpay.com/payment/gateway/refund',
    closeOrder: 'https://api.kbzpay.com/payment/gateway/closeorder',
  },
} as const;

/**
 * Required parameter keys for a standard KBZ Pay orderInfo string.
 */
export const REQUIRED_KBZ_ORDER_PARAMS = [
  'appid',
  'merch_code',
  'nonce_str',
  'prepay_id',
  'timestamp',
] as const;

/**
 * Parse an orderInfo query string or JSON string into a key-value dictionary.
 */
export function parseOrderInfo(orderInfo: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!orderInfo || typeof orderInfo !== 'string') {
    return result;
  }

  const trimmed = orderInfo.trim();

  // Handle potential JSON format
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'object' && parsed !== null) {
        for (const [key, value] of Object.entries(parsed)) {
          if (value !== undefined && value !== null) {
            result[key] = String(value);
          }
        }
        return result;
      }
    } catch {
      // Fall through to query string parser
    }
  }

  // Parse standard query string: "key=value&key2=value2"
  const clean = trimmed.replace(/^[?&]/, '');
  const pairs = clean.split('&');
  for (const pair of pairs) {
    if (!pair) continue;
    const eqIdx = pair.indexOf('=');
    if (eqIdx !== -1) {
      const rawKey = pair.substring(0, eqIdx).trim();
      const rawVal = pair.substring(eqIdx + 1).trim();
      try {
        result[rawKey] = decodeURIComponent(rawVal);
      } catch {
        result[rawKey] = rawVal;
      }
    }
  }

  return result;
}

/**
 * Validates whether an orderInfo string contains all required fields for KBZ Pay payment.
 * Useful for debugging and verifying backend API responses before calling startKbzPay.
 */
export function validateOrderInfo(orderInfo: string): KbzPayValidationResult {
  const errors: string[] = [];
  const missingParams: string[] = [];

  if (!orderInfo || typeof orderInfo !== 'string' || orderInfo.trim().length === 0) {
    return {
      isValid: false,
      missingParams: [...REQUIRED_KBZ_ORDER_PARAMS],
      errors: ['orderInfo is empty or not a valid string.'],
      params: {},
    };
  }

  const params = parseOrderInfo(orderInfo);

  for (const requiredKey of REQUIRED_KBZ_ORDER_PARAMS) {
    const value = params[requiredKey];
    if (!value || value.trim().length === 0) {
      missingParams.push(requiredKey);
      errors.push(`Missing required parameter: '${requiredKey}' in orderInfo.`);
    }
  }

  // Check timestamp format (should be unix timestamp, typically 10 or 13 digits)
  if (params.timestamp && !/^\d+$/.test(params.timestamp)) {
    errors.push(`Invalid timestamp format in orderInfo: '${params.timestamp}'. Expected numeric Unix timestamp.`);
  }

  // Warn if 'sign' is embedded inside orderInfo
  if (params.sign) {
    errors.push("Notice: 'sign' parameter is found inside orderInfo. It should be passed separately to startKbzPay to avoid duplicate params.");
  }

  return {
    isValid: missingParams.length === 0 && errors.filter((e) => !e.startsWith('Notice:')).length === 0,
    missingParams,
    errors,
    params,
  };
}

/**
 * Build a query string from key-value parameters sorted alphabetically by ASCII order.
 * This matches KBZ Pay's standard ASCII sorting requirement for signature calculation and query construction.
 *
 * @param params Object containing key-value pairs
 * @returns Query string (e.g. "appid=...&merch_code=...&nonce_str=...")
 */
export function buildOrderInfo(params: Record<string, string | number | boolean | undefined | null>): string {
  const keys = Object.keys(params)
    .filter((key) => {
      const val = params[key];
      return val !== undefined && val !== null && String(val).trim().length > 0 && key !== 'sign';
    })
    .sort();

  return keys.map((key) => `${key}=${String(params[key]).trim()}`).join('&');
}

/**
 * Open the official Google Play Store or Apple App Store page to download the KBZ Pay app.
 *
 * @param target 'prod' (default: Production KBZPay app) or 'uat' (UAT testing app on Android)
 */
export async function openKbzPayStore(target: KbzEnvironment = 'prod'): Promise<void> {
  const isUat = target === 'uat';

  const url = Platform.select({
    ios: 'https://apps.apple.com/mm/app/kbzpay-customer/id1382483648',
    android: isUat
      ? 'market://details?id=com.kbzbank.kpaycustomer.uat'
      : 'market://details?id=com.kbzbank.kpaycustomer',
    default: isUat
      ? 'https://play.google.com/store/apps/details?id=com.kbzbank.kpaycustomer.uat'
      : 'https://play.google.com/store/apps/details?id=com.kbzbank.kpaycustomer',
  });

  if (!url) {
    throw new KbzPayError('Unsupported platform for store redirection.', KbzPayErrorCode.UNSUPPORTED_PLATFORM);
  }

  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
      return;
    }
  } catch {
    // If market:// scheme failed on Android, fallback to web Play Store link
  }

  if (Platform.OS === 'android') {
    const webFallback = isUat
      ? 'https://play.google.com/store/apps/details?id=com.kbzbank.kpaycustomer.uat'
      : 'https://play.google.com/store/apps/details?id=com.kbzbank.kpaycustomer';
    try {
      await Linking.openURL(webFallback);
      return;
    } catch (err: any) {
      throw new KbzPayError(
        `Failed to open store: ${err?.message || 'Unknown error'}`,
        KbzPayErrorCode.STORE_REDIRECT_FAILED,
        { cause: err }
      );
    }
  }

  throw new KbzPayError(
    `Cannot open store URL: ${url}`,
    KbzPayErrorCode.STORE_REDIRECT_FAILED
  );
}
