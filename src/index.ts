import {
  AppState,
  type AppStateStatus,
  NativeEventEmitter,
  NativeModules,
  Platform,
  Linking,
  type EmitterSubscription,
} from 'react-native';
import {
  type KbzEnvironment,
  KbzPayError,
  KbzPayErrorCode,
  type KbzPayResult,
  type KbzPayStatus,
  type KbzVerificationStatus,
  type StartKbzPayOptions,
  type VerifyPaymentContext,
} from './types';

export * from './types';
export * from './utils';
export * from './useKbzPay';

interface NativeRawResult {
  result: number;
  failMessage?: string | null;
  orderId?: string | null;
}

interface NativeKbzPayModuleType {
  COMPLETED: number;
  FAIL: number;
  CANCEL: number;
  startPay(
    orderInfo: string,
    sign: string,
    signType?: string,
    appScheme?: string
  ): Promise<NativeRawResult>;
  isKbzPayAppInstalled(target?: string): Promise<boolean>;
  resetPendingState(): Promise<boolean>;
}

const LINKING_ERROR =
  `The package '@phonehtut/react-native-kbz-pay' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go (use Expo Prebuild or development client)\n';

const NativeKbzPayModule: NativeKbzPayModuleType = NativeModules.KBZPayModule
  ? NativeModules.KBZPayModule
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

const eventEmitter = NativeModules.KBZPayModule
  ? new NativeEventEmitter(NativeModules.KBZPayModule as any)
  : null;

const DEFAULT_TIMEOUT_MS = 120000; // 2 minutes
const DEFAULT_POLL_INTERVAL_MS = 2000; // 2 seconds
const DEFAULT_MAX_POLL_ATTEMPTS = 15; // 15 attempts (~30 seconds)

function toStatus(resultCode: number): KbzPayStatus {
  if (resultCode === 0) return 'completed';
  if (resultCode === 3) return 'cancelled';
  return 'failed';
}

function toErrorCode(resultCode: number): KbzPayErrorCode | undefined {
  if (resultCode === 3) return KbzPayErrorCode.USER_CANCELLED;
  if (resultCode !== 0) return KbzPayErrorCode.PAYMENT_FAILED;
  return undefined;
}

function normalizeResult(raw: NativeRawResult): KbzPayResult {
  return {
    code: raw.result,
    status: toStatus(raw.result),
    errorCode: toErrorCode(raw.result),
    orderId: raw.orderId ?? undefined,
    failMessage: raw.failMessage ?? undefined,
  };
}

/**
 * Extracts merch_order_id from an orderInfo string or JSON payload.
 */
export function extractMerchOrderId(orderInfo?: string): string | undefined {
  if (!orderInfo) return undefined;
  const match = orderInfo.match(/(?:^|[?&])merch_order_id=([^&#]+)/i);
  if (match) {
    try {
      return decodeURIComponent(match[1].trim());
    } catch {
      return match[1].trim();
    }
  }
  try {
    const parsed = JSON.parse(orderInfo);
    if (parsed?.merch_order_id) {
      return String(parsed.merch_order_id).trim();
    }
  } catch {
    // not JSON
  }
  return undefined;
}

/**
 * Check whether KBZ Pay app is installed on the device.
 * @param target - 'prod' (check production app), 'uat' (check UAT sandbox app), or 'any' (default: returns true if either is installed).
 */
export async function isKbzPayInstalled(
  target: KbzEnvironment = 'any'
): Promise<boolean> {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    return false;
  }
  try {
    return await NativeKbzPayModule.isKbzPayAppInstalled(target);
  } catch {
    return false;
  }
}

/**
 * Resets any pending in-progress transaction state in the native module.
 */
export async function resetKbzPayState(): Promise<boolean> {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    return false;
  }
  try {
    return await NativeKbzPayModule.resetPendingState();
  } catch {
    return false;
  }
}

/**
 * Subscribe to KBZ Pay transaction result events.
 */
export function addKbzPayListener(
  listener: (result: KbzPayResult) => void
): EmitterSubscription | null {
  if (!eventEmitter) return null;
  return eventEmitter.addListener('KBZPayResult', (payload: any) => {
    listener(normalizeResult(payload as NativeRawResult));
  });
}

/**
 * Helper utility to parse a deep link URL returned from KBZ Pay app.
 */
export function parseKbzUrl(urlString: string): KbzPayResult | null {
  if (!urlString) return null;
  try {
    const decoded = decodeURIComponent(urlString);
    const resMatch =
      decoded.match(/[?&](?:E(?:X)?TRA_)?RESULT=([^&#]+)/i) ||
      decoded.match(/[?&]status=([^&#]+)/i) ||
      decoded.match(/[?&]result=([^&#]+)/i);

    const orderMatch =
      decoded.match(/[?&](?:E(?:X)?TRA_)?ORDER_ID=([^&#]+)/i) ||
      decoded.match(/[?&]merch_order_id=([^&#]+)/i) ||
      decoded.match(/[?&]orderId=([^&#]+)/i);

    if (resMatch) {
      const rawCode = resMatch[1].trim().toLowerCase();
      let code = -1;
      if (rawCode === '0' || rawCode === 'success') {
        code = 0;
      } else if (rawCode === '3' || rawCode === 'cancel') {
        code = 3;
      } else {
        const parsed = parseInt(rawCode, 10);
        if (!isNaN(parsed)) code = parsed;
      }

      const orderId = orderMatch ? orderMatch[1].trim() : undefined;
      let failMessage: string | undefined;
      if (code === 3) failMessage = 'Payment cancelled';
      else if (code !== 0) failMessage = 'Payment failed';

      return {
        code,
        status: toStatus(code),
        errorCode: toErrorCode(code),
        orderId,
        failMessage,
      };
    }
  } catch {
    // Malformed url
  }
  return null;
}

/**
 * Helper utility to poll a verification function until completion, failure, or timeout.
 */
export async function pollPaymentStatus(options: {
  verify: (context: VerifyPaymentContext) => Promise<KbzVerificationStatus>;
  context: VerifyPaymentContext;
  intervalMs?: number;
  maxAttempts?: number;
}): Promise<KbzPayResult> {
  const {
    verify,
    context,
    intervalMs = DEFAULT_POLL_INTERVAL_MS,
    maxAttempts = DEFAULT_MAX_POLL_ATTEMPTS,
  } = options;

  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      const status = await verify(context);
      if (status === true || status === 'completed') {
        return {
          code: 0,
          status: 'completed',
          orderId: context.merchOrderId || context.orderId,
        };
      }
      if (status === false || status === 'failed') {
        return {
          code: -1,
          status: 'failed',
          errorCode: KbzPayErrorCode.PAYMENT_FAILED,
          failMessage: 'Payment marked as failed by backend verification.',
          orderId: context.merchOrderId || context.orderId,
        };
      }
    } catch {
      // Ignored and retried until maxAttempts
    }

    if (attempts < maxAttempts) {
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }

  return {
    code: -1,
    status: 'failed',
    errorCode: KbzPayErrorCode.PAYMENT_TIMEOUT,
    failMessage: 'Payment status verification timed out while querying backend.',
    orderId: context.merchOrderId || context.orderId,
  };
}

function mapNativeError(err: any): KbzPayError {
  const code = err?.code || '';
  const message = err?.message || 'Native KBZ Pay call failed.';
  if (code === 'E_IN_PROGRESS') {
    return new KbzPayError(message, KbzPayErrorCode.ALREADY_IN_PROGRESS, { cause: err });
  }
  if (code === 'E_NO_ACTIVITY') {
    return new KbzPayError(message, KbzPayErrorCode.ACTIVITY_UNAVAILABLE, { cause: err });
  }
  if (code === 'E_INVALID_ORDER_INFO') {
    return new KbzPayError(message, KbzPayErrorCode.INVALID_ORDER_INFO, { cause: err });
  }
  if (code === 'E_INVALID_SIGN') {
    return new KbzPayError(message, KbzPayErrorCode.INVALID_SIGNATURE, { cause: err });
  }
  return new KbzPayError(message, KbzPayErrorCode.UNKNOWN, { cause: err });
}

/**
 * Start KBZ Pay mobile payment flow.
 *
 * Supports:
 * 1. Native Activity / ViewController bridge
 * 2. Deep linking fallback
 * 3. AppState foreground detection + Backend Transaction Status Polling (verifyPayment)
 *
 * @param options.orderInfo - The order query string returned from backend prepay API
 * @param options.sign - The SHA256 signature generated by backend
 * @param options.signType - Signature algorithm, defaults to 'SHA256'
 * @param options.merchOrderId - Optional merchant order ID (auto-extracted from orderInfo if omitted)
 * @param options.verifyPayment - Optional backend verification callback to confirm transaction on backend
 * @param options.pollingIntervalMs - Polling interval for backend verification (default: 2000ms)
 * @param options.maxPollingAttempts - Max attempts for backend verification (default: 15)
 * @param options.appScheme - (iOS only) Custom URL scheme for app return
 * @param options.timeoutMs - Timeout duration in milliseconds (default 120,000ms)
 *
 * @returns Promise<KbzPayResult>
 */
export async function startKbzPay(options: StartKbzPayOptions): Promise<KbzPayResult> {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    throw new KbzPayError(
      `KBZ Pay is not supported on platform: ${Platform.OS}`,
      KbzPayErrorCode.UNSUPPORTED_PLATFORM
    );
  }

  const {
    orderInfo,
    sign,
    signType = 'SHA256',
    merchOrderId,
    verifyPayment,
    pollingIntervalMs = DEFAULT_POLL_INTERVAL_MS,
    maxPollingAttempts = DEFAULT_MAX_POLL_ATTEMPTS,
    appScheme,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

  if (!orderInfo || typeof orderInfo !== 'string' || orderInfo.trim().length === 0) {
    throw new KbzPayError(
      'orderInfo is required and must be a valid non-empty string.',
      KbzPayErrorCode.INVALID_ORDER_INFO
    );
  }

  if (!sign || typeof sign !== 'string' || sign.trim().length === 0) {
    throw new KbzPayError(
      'sign is required and must be a valid non-empty string.',
      KbzPayErrorCode.INVALID_SIGNATURE
    );
  }

  // Strip duplicate sign in orderInfo if already included to prevent duplicate params
  const cleanOrderInfo = orderInfo.replace(/[?&]sign=[^&]*/g, '').replace(/^[&?]/, '').trim();

  // Resolve merchant order id
  const resolvedOrderId = merchOrderId || extractMerchOrderId(orderInfo);

  return new Promise<KbzPayResult>((resolve, reject) => {
    let isSettled = false;
    let overallTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let linkingSubscription: { remove: () => void } | null = null;
    let eventSubscription: EmitterSubscription | null = null;
    let appStateSubscription: { remove: () => void } | null = null;
    let isPolling = false;

    const cleanup = () => {
      if (overallTimeoutTimer) {
        clearTimeout(overallTimeoutTimer);
        overallTimeoutTimer = null;
      }
      if (pollTimer) {
        clearTimeout(pollTimer);
        pollTimer = null;
      }
      if (linkingSubscription) {
        linkingSubscription.remove();
        linkingSubscription = null;
      }
      if (eventSubscription) {
        eventSubscription.remove();
        eventSubscription = null;
      }
      if (appStateSubscription) {
        appStateSubscription.remove();
        appStateSubscription = null;
      }
    };

    const settleResolve = (result: KbzPayResult) => {
      if (isSettled) return;
      isSettled = true;
      cleanup();
      resolve(result);
    };

    const settleReject = (error: Error | KbzPayError) => {
      if (isSettled) return;
      isSettled = true;
      cleanup();
      reject(error);
    };

    // Backend verification polling runner
    const triggerBackendVerification = async (nativeCode?: number) => {
      if (isSettled || isPolling || !verifyPayment) return;
      isPolling = true;

      const context: VerifyPaymentContext = {
        orderId: resolvedOrderId,
        merchOrderId: resolvedOrderId,
        nativeCode,
      };

      try {
        const verifiedResult = await pollPaymentStatus({
          verify: verifyPayment,
          context,
          intervalMs: pollingIntervalMs,
          maxAttempts: maxPollingAttempts,
        });

        if (!isSettled) {
          settleResolve(verifiedResult);
        }
      } catch (err: any) {
        if (!isSettled) {
          settleResolve({
            code: -1,
            status: 'failed',
            errorCode: KbzPayErrorCode.PAYMENT_FAILED,
            failMessage: err?.message || 'Error occurred while verifying payment with backend.',
            orderId: resolvedOrderId,
          });
        }
      } finally {
        isPolling = false;
      }
    };

    // Overall timeout timer
    overallTimeoutTimer = setTimeout(() => {
      resetKbzPayState().catch(() => {});
      settleReject(
        new KbzPayError(
          'KBZ Pay payment timed out. The user may have abandoned the transaction or closed the app.',
          KbzPayErrorCode.PAYMENT_TIMEOUT,
          { orderId: resolvedOrderId }
        )
      );
    }, timeoutMs);

    // 1. Native Event Listener
    if (eventEmitter) {
      eventSubscription = eventEmitter.addListener('KBZPayResult', (payload: any) => {
        const normalized = normalizeResult(payload as NativeRawResult);
        if (verifyPayment) {
          triggerBackendVerification(normalized.code);
        } else {
          settleResolve(normalized);
        }
      });
    }

    // 2. iOS Deep Linking fallback listener
    if (Platform.OS === 'ios') {
      const handleUrl = (event: { url: string }) => {
        const parsed = parseKbzUrl(event.url);
        if (parsed) {
          if (verifyPayment) {
            triggerBackendVerification(parsed.code);
          } else {
            settleResolve(parsed);
          }
        }
      };
      linkingSubscription = Linking.addEventListener('url', handleUrl);
    }

    // 3. AppState Foreground Listener (When user switches back from KBZ Pay app)
    appStateSubscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (isSettled) return;
      if (nextState === 'active') {
        Linking.getInitialURL().then((url: string | null | undefined) => {
          if (isSettled) return;
          if (url) {
            const parsed = parseKbzUrl(url);
            if (parsed && parsed.code === 0) {
              if (verifyPayment) {
                triggerBackendVerification(parsed.code);
              } else {
                settleResolve(parsed);
              }
              return;
            }
          }

          if (verifyPayment) {
            if (pollTimer) clearTimeout(pollTimer);
            pollTimer = setTimeout(() => {
              triggerBackendVerification();
            }, 500);
          }
        });
      }
    });

    // 4. Trigger Native startPay
    const onNativeDone = (raw: NativeRawResult) => {
      const normalized = normalizeResult(raw);
      if (verifyPayment) {
        triggerBackendVerification(normalized.code);
      } else {
        settleResolve(normalized);
      }
    };

    if (Platform.OS === 'android') {
      NativeKbzPayModule.startPay(cleanOrderInfo, sign, signType)
        .then(onNativeDone)
        .catch((err) => {
          if (verifyPayment) {
            triggerBackendVerification(-1);
          } else {
            settleReject(mapNativeError(err));
          }
        });
    } else {
      NativeKbzPayModule.startPay(cleanOrderInfo, sign, signType, appScheme)
        .then(onNativeDone)
        .catch((err) => {
          if (verifyPayment) {
            triggerBackendVerification(-1);
          } else {
            settleReject(mapNativeError(err));
          }
        });
    }
  });
}
