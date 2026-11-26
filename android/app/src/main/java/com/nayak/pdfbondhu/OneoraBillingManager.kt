package com.nayak.pdfbondhu

import android.content.Context
import org.json.JSONObject

/**
 * Google Play Billing Preparation Manager for ONEORA.
 *
 * Security Rules:
 * - Never trusts client-only premium flags.
 * - Never simulates successful purchases.
 * - All future purchases must send purchaseToken to /api/billing/verify-android for
 *   server-side verification via Google Play Developer API before unlocking PLUS/PRO.
 *
 * Activation Guide (when ready):
 * 1. Add implementation("com.android.billingclient:billing-ktx:7.1.1") to build.gradle.kts.
 * 2. Configure subscriptions (oneora_plus_monthly/yearly, oneora_pro_monthly/yearly)
 *    and consumable packs (oneora_ai_pack_100/500) in Google Play Console.
 * 3. Provide GOOGLE_PLAY_SERVICE_ACCOUNT_JSON on the backend and enable SUBSCRIPTION_ENABLED=true.
 */
class OneoraBillingManager(@Suppress("UNUSED_PARAMETER") context: Context) {

    fun getStatusJson(): String {
        return JSONObject().apply {
            put("monetizationEnabled", OneoraMonetizationConfig.monetizationEnabled)
            put("adsEnabled", OneoraMonetizationConfig.adsEnabled)
            put("subscriptionEnabled", OneoraMonetizationConfig.subscriptionEnabled)
            put("playBillingSdkLinked", false)
            put("activePlan", "free")
            put("environment", if (BuildConfig.DEBUG) "development" else "production")
        }.toString()
    }

    fun requestPurchase(productId: String): String {
        val allowedProducts = setOf(
            OneoraMonetizationConfig.PRODUCT_PLUS_MONTHLY,
            OneoraMonetizationConfig.PRODUCT_PLUS_YEARLY,
            OneoraMonetizationConfig.PRODUCT_PRO_MONTHLY,
            OneoraMonetizationConfig.PRODUCT_PRO_YEARLY,
            OneoraMonetizationConfig.PRODUCT_AI_PACK_100,
            OneoraMonetizationConfig.PRODUCT_AI_PACK_500
        )

        if (!allowedProducts.contains(productId)) {
            return JSONObject().apply {
                put("ok", false)
                put("code", "UNKNOWN_PRODUCT")
                put("message", "Unknown product identifier.")
            }.toString()
        }

        if (!OneoraMonetizationConfig.subscriptionEnabled) {
            return JSONObject().apply {
                put("ok", false)
                put("code", "FREE_LAUNCH_MODE")
                put("message", "ONEORA is in Free-First Launch mode. Live Google Play Billing is disabled until activated.")
            }.toString()
        }

        return JSONObject().apply {
            put("ok", false)
            put("code", "PLAY_BILLING_SDK_PENDING")
            put("message", "Link com.android.billingclient:billing-ktx and configure Play Console products to initiate checkout.")
        }.toString()
    }

    fun restorePurchases(): String {
        if (!OneoraMonetizationConfig.subscriptionEnabled) {
            return JSONObject().apply {
                put("ok", true)
                put("restored", false)
                put("plan", "free")
                put("message", "Live subscriptions are not activated yet — all core ONEORA tools are already free.")
            }.toString()
        }

        return JSONObject().apply {
            put("ok", false)
            put("restored", false)
            put("plan", "free")
            put("message", "Google Play Billing client is not linked yet.")
        }.toString()
    }
}
