#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

NS_ASSUME_NONNULL_BEGIN

@interface KBZPayModule : RCTEventEmitter <RCTBridgeModule>

+ (void)handleOpenURL:(NSURL *)url;

@end

NS_ASSUME_NONNULL_END
