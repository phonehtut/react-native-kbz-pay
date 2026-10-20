import {
  startKbzPay,
  pollPaymentStatus,
  KbzPayError,
  KbzPayErrorCode,
} from '../src';
import { NativeModules, Platform } from 'react-native';

describe('Payment Flow & Polling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as any).OS = 'android';
  });

  describe('startKbzPay validation', () => {
    it('throws UNSUPPORTED_PLATFORM on web or other platforms', async () => {
      (Platform as any).OS = 'web';
      await expect(
        startKbzPay({ orderInfo: 'appid=1', sign: 'sign1' })
      ).rejects.toMatchObject({
        code: KbzPayErrorCode.UNSUPPORTED_PLATFORM,
      });
    });

    it('throws INVALID_ORDER_INFO if orderInfo is missing or empty', async () => {
      await expect(
        startKbzPay({ orderInfo: '', sign: 'sign1' })
      ).rejects.toMatchObject({
        code: KbzPayErrorCode.INVALID_ORDER_INFO,
      });
    });

    it('throws INVALID_SIGNATURE if sign is missing or empty', async () => {
      await expect(
        startKbzPay({ orderInfo: 'appid=1', sign: '' })
      ).rejects.toMatchObject({
        code: KbzPayErrorCode.INVALID_SIGNATURE,
      });
    });

    it('calls NativeModules.KBZPayModule.startPay successfully', async () => {
      NativeModules.KBZPayModule.startPay.mockResolvedValueOnce({
        result: 0,
        orderId: 'ORD_999',
      });

      const res = await startKbzPay({
        orderInfo: 'appid=kp123&merch_order_id=ORD_999',
        sign: 'VALID_SIGN',
      });

      expect(res.code).toBe(0);
      expect(res.status).toBe('completed');
      expect(res.orderId).toBe('ORD_999');
      expect(NativeModules.KBZPayModule.startPay).toHaveBeenCalledWith(
        'appid=kp123&merch_order_id=ORD_999',
        'VALID_SIGN',
        'SHA256'
      );
    });

    it('maps cancelled result correctly', async () => {
      NativeModules.KBZPayModule.startPay.mockResolvedValueOnce({
        result: 3,
        orderId: 'ORD_CANCEL',
      });

      const res = await startKbzPay({
        orderInfo: 'appid=kp123',
        sign: 'SIGN',
      });

      expect(res.code).toBe(3);
      expect(res.status).toBe('cancelled');
      expect(res.errorCode).toBe(KbzPayErrorCode.USER_CANCELLED);
    });
  });

  describe('pollPaymentStatus', () => {
    it('resolves completed when verify returns true', async () => {
      const verify = jest.fn().mockResolvedValue(true);
      const res = await pollPaymentStatus({
        verify,
        context: { orderId: 'ORDER_1' },
        intervalMs: 10,
        maxAttempts: 3,
      });

      expect(res.code).toBe(0);
      expect(res.status).toBe('completed');
      expect(verify).toHaveBeenCalledTimes(1);
    });

    it('retries until completed if initially pending', async () => {
      const verify = jest
        .fn()
        .mockResolvedValueOnce('pending')
        .mockResolvedValueOnce('completed');

      const res = await pollPaymentStatus({
        verify,
        context: { orderId: 'ORDER_2' },
        intervalMs: 10,
        maxAttempts: 5,
      });

      expect(res.code).toBe(0);
      expect(res.status).toBe('completed');
      expect(verify).toHaveBeenCalledTimes(2);
    });

    it('returns failed when max attempts are exceeded', async () => {
      const verify = jest.fn().mockResolvedValue('pending');

      const res = await pollPaymentStatus({
        verify,
        context: { orderId: 'ORDER_TIMEOUT' },
        intervalMs: 5,
        maxAttempts: 2,
      });

      expect(res.code).toBe(-1);
      expect(res.status).toBe('failed');
      expect(res.errorCode).toBe(KbzPayErrorCode.PAYMENT_TIMEOUT);
      expect(verify).toHaveBeenCalledTimes(2);
    });
  });
});
