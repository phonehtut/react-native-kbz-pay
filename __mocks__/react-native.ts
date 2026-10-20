export const Platform = {
  OS: 'android',
  select: (objs: any) => objs[Platform.OS] ?? objs.default,
};

export const Linking = {
  canOpenURL: jest.fn().mockResolvedValue(true),
  openURL: jest.fn().mockResolvedValue(true),
  addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  getInitialURL: jest.fn().mockResolvedValue(null),
};

export const AppState = {
  addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  currentState: 'active',
};

export const NativeModules = {
  KBZPayModule: {
    COMPLETED: 0,
    CANCEL: 3,
    FAIL: -1,
    startPay: jest.fn(),
    isKbzPayAppInstalled: jest.fn().mockResolvedValue(true),
    resetPendingState: jest.fn().mockResolvedValue(true),
  },
};

export class NativeEventEmitter {
  addListener = jest.fn().mockReturnValue({ remove: jest.fn() });
  removeAllListeners = jest.fn();
}
