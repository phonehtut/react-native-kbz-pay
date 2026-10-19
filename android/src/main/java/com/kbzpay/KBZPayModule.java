package com.kbzpay;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.kbzbank.payment.KBZPay;

import java.util.HashMap;
import java.util.Map;

public class KBZPayModule extends ReactContextBaseJavaModule implements ActivityEventListener {
    public static final String MODULE_NAME = "KBZPayModule";
    public static final String EVENT_NAME = "KBZPayResult";

    private static final String KBZ_PACKAGE_PROD = "com.kbzbank.kpaycustomer";
    private static final String KBZ_PACKAGE_UAT = "com.kbzbank.kpaycustomer.uat";
    private static final long STALE_PENDING_MS = 120000L; // 2 minutes timeout

    private static ReactApplicationContext sharedContext;
    private static Promise pendingPromise;
    private static long pendingStartedAtMs;

    public KBZPayModule(ReactApplicationContext reactContext) {
        super(reactContext);
        sharedContext = reactContext;
        reactContext.addActivityEventListener(this);
    }

    @NonNull
    @Override
    public String getName() {
        return MODULE_NAME;
    }

    private static synchronized boolean hasActivePendingPromise() {
        if (pendingPromise == null) {
            return false;
        }

        if (pendingStartedAtMs > 0 && (System.currentTimeMillis() - pendingStartedAtMs > STALE_PENDING_MS)) {
            pendingPromise = null;
            pendingStartedAtMs = 0L;
            return false;
        }

        return true;
    }

    private static synchronized void setPendingPromise(Promise promise) {
        pendingPromise = promise;
        pendingStartedAtMs = System.currentTimeMillis();
    }

    private static synchronized Promise takePendingPromise() {
        Promise promise = pendingPromise;
        pendingPromise = null;
        pendingStartedAtMs = 0L;
        return promise;
    }

    @ReactMethod
    public void startPay(String orderInfo, String sign, @Nullable String signType, Promise promise) {
        Activity currentActivity = getCurrentActivity();
        if (currentActivity == null) {
            promise.reject("E_NO_ACTIVITY", "Current activity is not available.");
            return;
        }

        if (orderInfo == null || orderInfo.trim().isEmpty()) {
            promise.reject("E_INVALID_ORDER_INFO", "orderInfo is required.");
            return;
        }

        if (sign == null || sign.trim().isEmpty()) {
            promise.reject("E_INVALID_SIGN", "sign is required.");
            return;
        }

        if (hasActivePendingPromise()) {
            promise.reject("E_IN_PROGRESS", "A KBZ Pay transaction is already in progress.");
            return;
        }

        String normalizedSignType = (signType == null || signType.trim().isEmpty()) ? "SHA256" : signType;

        setPendingPromise(promise);

        try {
            KBZPay.startPay(currentActivity, orderInfo, sign, normalizedSignType);
        } catch (Exception exception) {
            Promise pending = takePendingPromise();
            if (pending != null) {
                pending.reject("E_START_PAY_FAILED", exception.getMessage(), exception);
            }
        }
    }

    @ReactMethod
    public void resetPendingState(Promise promise) {
        Promise pending = takePendingPromise();
        if (pending != null) {
            pending.reject("E_FORCED_RESET", "KBZ Pay pending state was reset.");
        }
        promise.resolve(true);
    }

    @ReactMethod
    public void isKbzPayAppInstalled(@Nullable String target, Promise promise) {
        try {
            PackageManager pm = getReactApplicationContext().getPackageManager();
            String env = (target != null && !target.trim().isEmpty()) ? target.trim().toLowerCase() : "any";

            if ("prod".equals(env)) {
                try {
                    pm.getPackageInfo(KBZ_PACKAGE_PROD, 0);
                    promise.resolve(true);
                } catch (PackageManager.NameNotFoundException ignored) {
                    promise.resolve(false);
                }
                return;
            }

            if ("uat".equals(env)) {
                try {
                    pm.getPackageInfo(KBZ_PACKAGE_UAT, 0);
                    promise.resolve(true);
                } catch (PackageManager.NameNotFoundException ignored) {
                    promise.resolve(false);
                }
                return;
            }

            // "any": Check Production first, then UAT
            try {
                pm.getPackageInfo(KBZ_PACKAGE_PROD, 0);
                promise.resolve(true);
                return;
            } catch (PackageManager.NameNotFoundException ignored) {}

            try {
                pm.getPackageInfo(KBZ_PACKAGE_UAT, 0);
                promise.resolve(true);
                return;
            } catch (PackageManager.NameNotFoundException ignored) {}

            promise.resolve(false);
        } catch (Exception e) {
            promise.resolve(false);
        }
    }

    @Override
    public Map<String, Object> getConstants() {
        Map<String, Object> constants = new HashMap<>();
        constants.put("COMPLETED", KBZPay.COMPLETED);
        constants.put("FAIL", KBZPay.FAIL);
        constants.put("CANCEL", KBZPay.CANCEL);
        return constants;
    }

    public static synchronized void notifyResult(int resultCode, @Nullable String failMessage, @Nullable String orderId) {
        WritableMap payload = Arguments.createMap();
        payload.putInt("result", resultCode);

        if (failMessage != null) {
            payload.putString("failMessage", failMessage);
        } else {
            payload.putNull("failMessage");
        }

        if (orderId != null) {
            payload.putString("orderId", orderId);
        } else {
            payload.putNull("orderId");
        }

        Promise promise = takePendingPromise();
        if (promise != null) {
            promise.resolve(payload);
            return;
        }

        if (sharedContext != null && sharedContext.hasActiveCatalystInstance()) {
            sharedContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(EVENT_NAME, payload);
        }
    }

    @ReactMethod
    public void addListener(String eventName) {
        // Keep for NativeEventEmitter compatibility
    }

    @ReactMethod
    public void removeListeners(double count) {
        // Keep for NativeEventEmitter compatibility
    }

    @Override
    public void onActivityResult(Activity activity, int requestCode, int resultCode, @Nullable Intent data) {
        // Callback is delivered by CallbackResultActivity
    }

    @Override
    public void onNewIntent(Intent intent) {
        // No-op
    }
}
