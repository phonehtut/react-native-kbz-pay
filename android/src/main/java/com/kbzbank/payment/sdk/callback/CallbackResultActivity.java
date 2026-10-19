package com.kbzbank.payment.sdk.callback;

import android.content.Intent;
import android.os.Bundle;

import androidx.appcompat.app.AppCompatActivity;

import com.kbzbank.payment.KBZPay;
import com.kbzpay.KBZPayModule;

public class CallbackResultActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Intent intent = getIntent();
        if (intent != null) {
            int result = intent.getIntExtra(KBZPay.EXTRA_RESULT, KBZPay.FAIL);
            String failMsg = intent.getStringExtra(KBZPay.EXTRA_FAIL_MSG);
            String orderId = intent.getStringExtra(KBZPay.EXTRA_ORDER_ID);

            KBZPayModule.notifyResult(result, failMsg, orderId);
        }
        finish();
    }
}
