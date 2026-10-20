import {
  parseOrderInfo,
  validateOrderInfo,
  buildOrderInfo,
  extractMerchOrderId,
  parseKbzUrl,
  KbzPayError,
  KbzPayErrorCode,
  KBZ_PAY_GATEWAY_URLS,
} from '../src';

describe('Order Info Utilities', () => {
  describe('parseOrderInfo', () => {
    it('parses standard query string correctly', () => {
      const qs = 'appid=kp12345&merch_code=10001&nonce_str=abc123xyz&prepay_id=KBZ001&timestamp=1700000000';
      const result = parseOrderInfo(qs);
      expect(result.appid).toBe('kp12345');
      expect(result.merch_code).toBe('10001');
      expect(result.nonce_str).toBe('abc123xyz');
      expect(result.prepay_id).toBe('KBZ001');
      expect(result.timestamp).toBe('1700000000');
    });

    it('parses json string correctly', () => {
      const json = JSON.stringify({
        appid: 'kp12345',
        merch_code: '10001',
        nonce_str: 'abc',
        prepay_id: 'KBZ002',
        timestamp: '1700000000',
      });
      const result = parseOrderInfo(json);
      expect(result.appid).toBe('kp12345');
      expect(result.prepay_id).toBe('KBZ002');
    });

    it('handles encoded query params and leading ? or &', () => {
      const qs = '?merch_order_id=ORD%20123&appid=kp999';
      const result = parseOrderInfo(qs);
      expect(result.merch_order_id).toBe('ORD 123');
      expect(result.appid).toBe('kp999');
    });

    it('returns empty object for empty or invalid input', () => {
      expect(parseOrderInfo('')).toEqual({});
      expect(parseOrderInfo(null as any)).toEqual({});
    });
  });

  describe('validateOrderInfo', () => {
    it('returns valid: true when all required params are present', () => {
      const qs = 'appid=kp123&merch_code=1001&nonce_str=xyz&prepay_id=KBZ99&timestamp=1700000000';
      const validation = validateOrderInfo(qs);
      expect(validation.isValid).toBe(true);
      expect(validation.missingParams).toHaveLength(0);
      expect(validation.errors).toHaveLength(0);
    });

    it('detects missing params', () => {
      const qs = 'appid=kp123&merch_code=1001';
      const validation = validateOrderInfo(qs);
      expect(validation.isValid).toBe(false);
      expect(validation.missingParams).toContain('prepay_id');
      expect(validation.missingParams).toContain('nonce_str');
      expect(validation.missingParams).toContain('timestamp');
    });

    it('flags non-numeric timestamp', () => {
      const qs = 'appid=kp123&merch_code=1001&nonce_str=xyz&prepay_id=KBZ99&timestamp=invalid_time';
      const validation = validateOrderInfo(qs);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.includes('Invalid timestamp'))).toBe(true);
    });

    it('warns about embedded sign parameter', () => {
      const qs = 'appid=kp123&merch_code=1001&nonce_str=xyz&prepay_id=KBZ99&timestamp=1700000000&sign=abc';
      const validation = validateOrderInfo(qs);
      expect(validation.errors.some((e) => e.includes('Notice:'))).toBe(true);
      expect(validation.isValid).toBe(true); // notice does not invalidate
    });
  });

  describe('buildOrderInfo', () => {
    it('sorts parameters alphabetically by ASCII key order', () => {
      const params = {
        timestamp: '1700000000',
        appid: 'kp123',
        nonce_str: 'nonce1',
        merch_code: '1001',
        prepay_id: 'KBZ001',
      };
      const built = buildOrderInfo(params);
      expect(built).toBe('appid=kp123&merch_code=1001&nonce_str=nonce1&prepay_id=KBZ001&timestamp=1700000000');
    });

    it('filters out sign, undefined, null, and empty values', () => {
      const params = {
        sign: 'SIGN_TO_FILTER',
        emptyVal: '',
        nullVal: null,
        undefinedVal: undefined,
        appid: 'kp123',
        merch_code: '1001',
      };
      const built = buildOrderInfo(params);
      expect(built).toBe('appid=kp123&merch_code=1001');
    });
  });

  describe('extractMerchOrderId', () => {
    it('extracts merch_order_id from query string', () => {
      const qs = 'appid=kp123&merch_order_id=ORDER_9876&prepay_id=KBZ1';
      expect(extractMerchOrderId(qs)).toBe('ORDER_9876');
    });

    it('extracts decoded merch_order_id', () => {
      const qs = 'merch_order_id=MY%20ORD%20123';
      expect(extractMerchOrderId(qs)).toBe('MY ORD 123');
    });

    it('extracts merch_order_id from JSON', () => {
      const json = JSON.stringify({ merch_order_id: 'JSON_ORD_55' });
      expect(extractMerchOrderId(json)).toBe('JSON_ORD_55');
    });

    it('returns undefined when not found', () => {
      expect(extractMerchOrderId('appid=kp123')).toBeUndefined();
      expect(extractMerchOrderId('')).toBeUndefined();
    });
  });

  describe('parseKbzUrl', () => {
    it('parses successful iOS deep link URL', () => {
      const url = 'myapp://kbzpay?EXTRA_RESULT=0&EXTRA_ORDER_ID=KBZ_TX_123';
      const result = parseKbzUrl(url);
      expect(result).not.toBeNull();
      expect(result?.code).toBe(0);
      expect(result?.status).toBe('completed');
      expect(result?.orderId).toBe('KBZ_TX_123');
    });

    it('parses cancelled iOS deep link URL', () => {
      const url = 'myapp://kbzpay?EXTRA_RESULT=3&merch_order_id=MY_ORD_1';
      const result = parseKbzUrl(url);
      expect(result).not.toBeNull();
      expect(result?.code).toBe(3);
      expect(result?.status).toBe('cancelled');
      expect(result?.errorCode).toBe(KbzPayErrorCode.USER_CANCELLED);
      expect(result?.orderId).toBe('MY_ORD_1');
    });

    it('parses failed iOS deep link URL', () => {
      const url = 'myapp://kbzpay?EXTRA_RESULT=-1';
      const result = parseKbzUrl(url);
      expect(result).not.toBeNull();
      expect(result?.code).toBe(-1);
      expect(result?.status).toBe('failed');
      expect(result?.errorCode).toBe(KbzPayErrorCode.PAYMENT_FAILED);
    });

    it('returns null on invalid url', () => {
      expect(parseKbzUrl('')).toBeNull();
      expect(parseKbzUrl('myapp://kbzpay?no_result_here=1')).toBeNull();
    });
  });

  describe('KbzPayError', () => {
    it('creates an instance with proper error code and inheritance', () => {
      const err = new KbzPayError('App not found', KbzPayErrorCode.APP_NOT_INSTALLED, {
        orderId: 'ORD_123',
        nativeCode: -1,
      });
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(KbzPayError);
      expect(err.name).toBe('KbzPayError');
      expect(err.code).toBe(KbzPayErrorCode.APP_NOT_INSTALLED);
      expect(err.orderId).toBe('ORD_123');
      expect(err.nativeCode).toBe(-1);
      expect(err.message).toBe('App not found');
    });
  });

  describe('KBZ_PAY_GATEWAY_URLS', () => {
    it('exports official gateway endpoints', () => {
      expect(KBZ_PAY_GATEWAY_URLS.uat.precreate).toBe(
        'http://api-uat.kbzpay.com/payment/gateway/uat/precreate'
      );
      expect(KBZ_PAY_GATEWAY_URLS.prod.precreate).toBe(
        'https://api.kbzpay.com/payment/gateway/precreate'
      );
    });
  });
});
