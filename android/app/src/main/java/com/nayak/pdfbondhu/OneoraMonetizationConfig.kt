package com.nayak.pdfbondhu

/**
 * Central Android Monetization & Feature Flag Configuration for ONEORA.
 *
 * Free-First Launch Defaults:
 * - MONETIZATION_ENABLED = false
 * - ADS_ENABLED = false
 * - SUBSCRIPTION_ENABLED = false
 *
 * Production AdMob IDs and Play Billing credentials are NEVER hardcoded here.
 * Provide them via Gradle properties or CI secrets when ready to activate.
 */
object OneoraMonetizationConfig {
    val monetizationEnabled: Boolean = BuildConfig.MONETIZATION_ENABLED
    val adsEnabled: Boolean = BuildConfig.MONETIZATION_ENABLED && BuildConfig.ADS_ENABLED
    val subscriptionEnabled: Boolean = BuildConfig.MONETIZATION_ENABLED && BuildConfig.SUBSCRIPTION_ENABLED

    // Official Google AdMob TEST unit IDs (used ONLY in debug builds when explicitly testing ads)
    private const val GOOGLE_TEST_BANNER_ID = "ca-app-pub-3940256099942544/6300978111"
    private const val GOOGLE_TEST_NATIVE_ID = "ca-app-pub-3940256099942544/2247696110"
    private const val GOOGLE_TEST_REWARDED_ID = "ca-app-pub-3940256099942544/5224354917"

    fun bannerUnitId(): String =
        if (BuildConfig.DEBUG) GOOGLE_TEST_BANNER_ID else BuildConfig.ADMOB_BANNER_UNIT_ID

    fun nativeUnitId(): String =
        if (BuildConfig.DEBUG) GOOGLE_TEST_NATIVE_ID else BuildConfig.ADMOB_NATIVE_UNIT_ID

    fun rewardedUnitId(): String =
        if (BuildConfig.DEBUG) GOOGLE_TEST_REWARDED_ID else BuildConfig.ADMOB_REWARDED_UNIT_ID

    // Future Google Play Console product IDs (inactive until subscriptionEnabled = true)
    const val PRODUCT_PLUS_MONTHLY = "oneora_plus_monthly"
    const val PRODUCT_PLUS_YEARLY = "oneora_plus_yearly"
    const val PRODUCT_PRO_MONTHLY = "oneora_pro_monthly"
    const val PRODUCT_PRO_YEARLY = "oneora_pro_yearly"
    const val PRODUCT_AI_PACK_100 = "oneora_ai_pack_100"
    const val PRODUCT_AI_PACK_500 = "oneora_ai_pack_500"

    val criticalBlockedZones: Set<String> = setOf(
        "pdf_edit",
        "file_save",
        "digital_sign",
        "payment",
        "vault",
        "onboarding"
    )
}
