# ONEORA Future Monetization & Play Store Activation Guide

ONEORA ships in **Free-First Launch Mode**:
- `MONETIZATION_ENABLED = false`
- `ADS_ENABLED = false`
- `SUBSCRIPTION_ENABLED = false`
- `FREE_PLAN_ENABLED = true`

No AdMob IDs, Play Billing product IDs, or payment gateway secrets are required to build, test, share APKs with friends, or push OTA updates.

---

## 1. When You Are Ready to Enable Backend Monetization (Later)

Add these variables to your production server environment (never commit real secrets to Git):

- `APP_ENV=production`
- `MONETIZATION_ENABLED=true`
- `ADS_ENABLED=true` (optional, only after AdMob approval)
- `SUBSCRIPTION_ENABLED=true` (optional, only after Play Console products are active)
- `ONEORA_PLUS_MONTHLY_INR=49`
- `ONEORA_PLUS_YEARLY_INR=399`
- `ONEORA_PRO_MONTHLY_INR=99`
- `ONEORA_PRO_YEARLY_INR=799`
- `ONEORA_AI_PACK_100_INR=29`
- `ONEORA_AI_PACK_500_INR=99`
- `GOOGLE_PLAY_PACKAGE_NAME=com.nayak.pdfbondhu`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=<service-account-json>`
- `WEB_PAYMENT_PROVIDER=razorpay` (or `stripe`)
- `WEB_PAYMENT_SECRET_KEY=<server-secret>`
- `WEB_PAYMENT_WEBHOOK_SECRET=<webhook-secret>`
- `ADMOB_APP_ID=<your-admob-app-id>`

## 2. When You Are Ready to Enable Android AdMob & Play Billing (Later)

1. In `android/app/build.gradle.kts`, add:
   - `implementation("com.google.android.gms:play-services-ads:<latest>")`
   - `implementation("com.android.billingclient:billing-ktx:7.1.1")`
2. Pass release flags via Gradle properties in GitHub Actions (stored as GitHub Secrets):
   - `-PMONETIZATION_ENABLED=true`
   - `-PADS_ENABLED=true`
   - `-PSUBSCRIPTION_ENABLED=true`
   - `-PADMOB_BANNER_UNIT_ID=<real-banner-unit-id>`
   - `-PADMOB_NATIVE_UNIT_ID=<real-native-unit-id>`
   - `-PADMOB_REWARDED_UNIT_ID=<real-rewarded-unit-id>`
3. Create these matching products in Google Play Console:
   - `oneora_plus_monthly`, `oneora_plus_yearly`
   - `oneora_pro_monthly`, `oneora_pro_yearly`
   - `oneora_ai_pack_100`, `oneora_ai_pack_500`
