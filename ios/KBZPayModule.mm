#import "KBZPayModule.h"
#import <UIKit/UIKit.h>
#import <KBZPayAPPPay/PaymentViewController.h>

static KBZPayModule *sharedInstance = nil;
static RCTPromiseResolveBlock pendingResolve = nil;
static RCTPromiseRejectBlock pendingReject = nil;
static NSTimeInterval pendingStartedAt = 0;
static NSString *currentAppScheme = nil;
static const NSTimeInterval STALE_PENDING_TIMEOUT = 120.0;

@interface KBZPayModule ()
@property (nonatomic, assign) BOOL hasListeners;
@end

@implementation KBZPayModule

RCT_EXPORT_MODULE(KBZPayModule);

+ (BOOL)requiresMainQueueSetup {
  return YES;
}

- (instancetype)init {
  self = [super init];
  if (self) {
    sharedInstance = self;
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(onOpenURLNotification:)
                                                 name:@"KBZPayOpenURLNotification"
                                               object:nil];
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(onOpenURLNotification:)
                                                 name:@"RCTOpenURLNotification"
                                               object:nil];
  }
  return self;
}

- (void)dealloc {
  [[NSNotificationCenter defaultCenter] removeObserver:self];
  if (sharedInstance == self) {
    sharedInstance = nil;
  }
}

- (NSArray<NSString *> *)supportedEvents {
  return @[ @"KBZPayResult" ];
}

- (void)startObserving {
  self.hasListeners = YES;
}

- (void)stopObserving {
  self.hasListeners = NO;
}

- (NSDictionary *)constantsToExport {
  return @{
    @"COMPLETED": @(0),
    @"CANCEL": @(3),
    @"FAIL": @(-1)
  };
}

- (void)onOpenURLNotification:(NSNotification *)notification {
  id rawUrl = notification.userInfo[@"url"];
  NSURL *url = nil;
  if ([rawUrl isKindOfClass:[NSURL class]]) {
    url = (NSURL *)rawUrl;
  } else if ([rawUrl isKindOfClass:[NSString class]]) {
    url = [NSURL URLWithString:(NSString *)rawUrl];
  }
  if (url) {
    [KBZPayModule handleOpenURL:url];
  }
}

+ (NSString *)detectDefaultAppScheme {
  NSArray *urlTypes = [[NSBundle mainBundle] objectForInfoDictionaryKey:@"CFBundleURLTypes"];
  if (urlTypes && urlTypes.count > 0) {
    for (NSDictionary *dict in urlTypes) {
      NSArray *schemes = dict[@"CFBundleURLSchemes"];
      if (schemes && schemes.count > 0) {
        return schemes.firstObject;
      }
    }
  }
  return @"";
}

+ (NSString *)getParamByName:(NSString *)name fromURLString:(NSString *)urlString {
  if (!urlString || urlString.length == 0) return @"";
  NSError *error = nil;
  NSString *regTags = [NSString stringWithFormat:@"(^|[&\\?])+%@=+([^&]*)(&|$)", name];
  NSRegularExpression *regex = [NSRegularExpression regularExpressionWithPattern:regTags
                                                                         options:NSRegularExpressionCaseInsensitive
                                                                           error:&error];
  NSArray *matches = [regex matchesInString:urlString options:0 range:NSMakeRange(0, urlString.length)];
  for (NSTextCheckingResult *match in matches) {
    if (match.numberOfRanges >= 3) {
      NSRange range = [match rangeAtIndex:2];
      if (range.location != NSNotFound) {
        return [urlString substringWithRange:range];
      }
    }
  }
  return @"";
}

+ (void)handleOpenURL:(NSURL *)url {
  if (!url) return;

  NSString *urlString = url.absoluteString;
  NSString *resultCodeStr = [self getParamByName:@"EXTRA_RESULT" fromURLString:urlString];
  if (resultCodeStr.length == 0) {
    resultCodeStr = [self getParamByName:@"ETRA_RESULT" fromURLString:urlString];
  }
  if (resultCodeStr.length == 0) {
    resultCodeStr = [self getParamByName:@"result" fromURLString:urlString];
  }
  if (resultCodeStr.length == 0) {
    resultCodeStr = [self getParamByName:@"status" fromURLString:urlString];
  }

  // If this URL is not a KBZ Pay response, ignore it
  if (resultCodeStr.length == 0) {
    return;
  }

  NSString *orderId = [self getParamByName:@"EXTRA_ORDER_ID" fromURLString:urlString];
  if (orderId.length == 0) {
    orderId = [self getParamByName:@"ETRA_ORDER_ID" fromURLString:urlString];
  }
  if (orderId.length == 0) {
    orderId = [self getParamByName:@"merch_order_id" fromURLString:urlString];
  }

  NSInteger resultCode = -1;
  NSString *normalizedCode = [resultCodeStr lowercaseString];
  if ([normalizedCode isEqualToString:@"success"] || [normalizedCode isEqualToString:@"0"]) {
    resultCode = 0;
  } else if ([normalizedCode isEqualToString:@"cancel"] || [normalizedCode isEqualToString:@"3"]) {
    resultCode = 3;
  } else {
    resultCode = [resultCodeStr integerValue];
  }

  NSString *failMessage = nil;
  if (resultCode == 3) {
    failMessage = @"Payment cancelled";
  } else if (resultCode != 0) {
    failMessage = @"Payment failed";
  }

  NSMutableDictionary *payload = [NSMutableDictionary dictionary];
  payload[@"result"] = @(resultCode);
  if (orderId && orderId.length > 0) {
    payload[@"orderId"] = orderId;
  } else {
    payload[@"orderId"] = [NSNull null];
  }

  if (failMessage) {
    payload[@"failMessage"] = failMessage;
  } else {
    payload[@"failMessage"] = [NSNull null];
  }

  [self dispatchPaymentResult:payload];
}

+ (void)dispatchPaymentResult:(NSDictionary *)payload {
  RCTPromiseResolveBlock resolve = pendingResolve;
  pendingResolve = nil;
  pendingReject = nil;
  pendingStartedAt = 0;

  if (resolve) {
    resolve(payload);
    return;
  }

  if (sharedInstance && sharedInstance.hasListeners) {
    [sharedInstance sendEventWithName:@"KBZPayResult" body:payload];
  }
}

RCT_EXPORT_METHOD(startPay:(NSString *)orderInfo
                  sign:(NSString *)sign
                  signType:(NSString *)signType
                  appScheme:(NSString *)appScheme
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  if (!orderInfo || orderInfo.length == 0) {
    reject(@"E_INVALID_ORDER_INFO", @"orderInfo is required.", nil);
    return;
  }
  if (!sign || sign.length == 0) {
    reject(@"E_INVALID_SIGN", @"sign is required.", nil);
    return;
  }

  NSTimeInterval now = [[NSDate date] timeIntervalSince1970];
  if (pendingResolve != nil && (now - pendingStartedAt) < STALE_PENDING_TIMEOUT) {
    reject(@"E_IN_PROGRESS", @"A KBZ Pay transaction is already in progress.", nil);
    return;
  }

  pendingResolve = resolve;
  pendingReject = reject;
  pendingStartedAt = now;

  NSString *normalizedSignType = (signType && signType.length > 0) ? signType : @"SHA256";

  NSString *targetScheme = appScheme;
  if (!targetScheme || targetScheme.length == 0) {
    targetScheme = [KBZPayModule detectDefaultAppScheme];
  }
  currentAppScheme = targetScheme;

  dispatch_async(dispatch_get_main_queue(), ^{
    @try {
      PaymentViewController *vc = [[PaymentViewController alloc] init];
      [vc startPayWithOrderInfo:orderInfo
                       signType:normalizedSignType
                           sign:sign
                      appScheme:targetScheme];
    } @catch (NSException *exception) {
      RCTPromiseRejectBlock currentReject = pendingReject;
      pendingResolve = nil;
      pendingReject = nil;
      pendingStartedAt = 0;
      if (currentReject) {
        currentReject(@"E_START_PAY_FAILED", exception.reason, nil);
      }
    }
  });
}

RCT_EXPORT_METHOD(isKbzPayAppInstalled:(NSString *)target
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  dispatch_async(dispatch_get_main_queue(), ^{
    NSURL *url = [NSURL URLWithString:@"kbzpay://"];
    BOOL canOpen = [[UIApplication sharedApplication] canOpenURL:url];
    resolve(@(canOpen));
  });
}

RCT_EXPORT_METHOD(resetPendingState:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  RCTPromiseRejectBlock currentReject = pendingReject;
  pendingResolve = nil;
  pendingReject = nil;
  pendingStartedAt = 0;
  if (currentReject) {
    currentReject(@"E_FORCED_RESET", @"KBZ Pay pending state was reset.", nil);
  }
  resolve(@(YES));
}

@end
