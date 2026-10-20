import { useState, useEffect, useCallback, useRef } from 'react';
import {
  type KbzEnvironment,
  KbzPayError,
  KbzPayErrorCode,
  type KbzPayResult,
  type StartKbzPayOptions,
  type UseKbzPayOptions,
  type UseKbzPayReturn,
  type VerifyPaymentContext,
} from './types';
import { isKbzPayInstalled, startKbzPay } from './index';
import { openKbzPayStore } from './utils';

/**
 * Custom React Hook to manage KBZ Pay payment flow, loading states, and backend verification.
 *
 * @example
 * ```tsx
 * const { pay, isPaying, isVerifying, isInstalled, openStore } = useKbzPay({
 *   verifyPayment: async ({ orderId }) => {
 *     const res = await checkBackendOrderStatus(orderId);
 *     return res.status === 'PAID';
 *   },
 *   onSuccess: (result) => navigation.navigate('OrderSuccess', { result }),
 *   onCancelled: () => Alert.alert('Payment cancelled'),
 *   onError: (error) => Alert.alert('Payment failed', error.message),
 * });
 * ```
 */
export function useKbzPay(options: UseKbzPayOptions = {}): UseKbzPayReturn {
  const {
    appScheme: defaultAppScheme,
    timeoutMs: defaultTimeoutMs,
    verifyPayment: defaultVerifyPayment,
    pollingIntervalMs: defaultPollingIntervalMs,
    maxPollingAttempts: defaultMaxPollingAttempts,
    onSuccess,
    onCancelled,
    onError,
  } = options;

  const [isPaying, setIsPaying] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<KbzPayResult | null>(null);
  const [error, setError] = useState<KbzPayError | Error | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean | null>(null);

  // Keep latest callbacks in refs to prevent unnecessary re-creations
  const callbacksRef = useRef({ onSuccess, onCancelled, onError });
  useEffect(() => {
    callbacksRef.current = { onSuccess, onCancelled, onError };
  });

  // Check app installation on mount
  useEffect(() => {
    let isMounted = true;
    isKbzPayInstalled('any')
      .then((installed) => {
        if (isMounted) setIsInstalled(installed);
      })
      .catch(() => {
        if (isMounted) setIsInstalled(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const checkInstalled = useCallback(async (target: KbzEnvironment = 'any') => {
    try {
      const installed = await isKbzPayInstalled(target);
      setIsInstalled(installed);
      return installed;
    } catch {
      setIsInstalled(false);
      return false;
    }
  }, []);

  const openStore = useCallback(async (target: KbzEnvironment = 'prod') => {
    await openKbzPayStore(target);
  }, []);

  const resetState = useCallback(() => {
    setIsPaying(false);
    setIsVerifying(false);
    setResult(null);
    setError(null);
  }, []);

  const pay = useCallback(
    async (payOptions: StartKbzPayOptions): Promise<KbzPayResult> => {
      setIsPaying(true);
      setIsVerifying(false);
      setError(null);
      setResult(null);

      const verifyCallback = payOptions.verifyPayment || defaultVerifyPayment;

      // Wrap verification callback to update isVerifying state
      const wrappedVerify = verifyCallback
        ? async (ctx: VerifyPaymentContext) => {
            setIsVerifying(true);
            try {
              return await verifyCallback(ctx);
            } finally {
              // remains true until startKbzPay settles
            }
          }
        : undefined;

      try {
        const paymentResult = await startKbzPay({
          appScheme: defaultAppScheme,
          timeoutMs: defaultTimeoutMs,
          pollingIntervalMs: defaultPollingIntervalMs,
          maxPollingAttempts: defaultMaxPollingAttempts,
          ...payOptions,
          verifyPayment: wrappedVerify,
        });

        setResult(paymentResult);

        if (paymentResult.status === 'completed') {
          callbacksRef.current.onSuccess?.(paymentResult);
        } else if (paymentResult.status === 'cancelled') {
          callbacksRef.current.onCancelled?.(paymentResult);
        } else {
          const failErr = new KbzPayError(
            paymentResult.failMessage || 'Payment failed',
            paymentResult.errorCode || KbzPayErrorCode.PAYMENT_FAILED,
            { nativeCode: paymentResult.code, orderId: paymentResult.orderId }
          );
          setError(failErr);
          callbacksRef.current.onError?.(failErr);
        }

        return paymentResult;
      } catch (err: any) {
        const wrappedError =
          err instanceof KbzPayError
            ? err
            : new KbzPayError(
                err?.message || 'Payment encountered an unexpected error',
                KbzPayErrorCode.UNKNOWN,
                { cause: err }
              );

        setError(wrappedError);
        callbacksRef.current.onError?.(wrappedError);
        throw wrappedError;
      } finally {
        setIsPaying(false);
        setIsVerifying(false);
      }
    },
    [
      defaultAppScheme,
      defaultTimeoutMs,
      defaultVerifyPayment,
      defaultPollingIntervalMs,
      defaultMaxPollingAttempts,
    ]
  );

  return {
    pay,
    isPaying,
    isVerifying,
    result,
    error,
    isInstalled,
    checkInstalled,
    openStore,
    resetState,
  };
}
