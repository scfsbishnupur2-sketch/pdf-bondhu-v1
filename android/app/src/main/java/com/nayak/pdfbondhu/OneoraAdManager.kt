package com.nayak.pdfbondhu

import android.content.Context
import org.json.JSONObject

/**
 * Policy-Compliant Google AdMob Preparation Manager for ONEORA.
 *
 * Guarantees:
 * - Zero live ad requests while ADS_ENABLED = false.
 * - Zero ads for active Premium (PLUS / PRO) subscribers.
 * - Zero ads during critical PDF editing, file saving, digital signing, payment, or Vault access.
 * - Never sends private document contents or financial records to advertising SDKs.
 * - Respects user consent (non-personalized ads by default).
 *
 * Activation Guide (when ready):
 * 1. Add implementation("com.google.android.gms:play-services-ads:<version>") to build.gradle.kts.
 * 2. Add real APPLICATION_ID meta-data in AndroidManifest.xml via manifestPlaceholders.
 * 3. Pass -PADS_ENABLED=true -PMONETIZATION_ENABLED=true and real unit IDs in CI release build.
 */
class OneoraAdManager(context: Context) {
    private val prefs = context.getSharedPreferences("oneora_monetization_prefs", Context.MODE_PRIVATE)

    @Volatile
    private var inCriticalSafeZone: Boolean = false

    @Volatile
    private var activeSafeZoneName: String = ""

    @Volatile
    private var isPremiumAdFree: Boolean = false

    fun setSafeZone(active: Boolean, zoneName: String) {
        inCriticalSafeZone = active
        activeSafeZoneName = if (active) zoneName else ""
    }

    fun setPremiumAdFree(adFree: Boolean) {
        isPremiumAdFree = adFree
    }

    fun setPersonalizedConsent(allowed: Boolean) {
        prefs.edit().putBoolean("personalized_ads_consent", allowed).apply()
    }

    fun isPersonalizedConsentAllowed(): Boolean {
        return prefs.getBoolean("personalized_ads_consent", false)
    }

    fun hideBanner() {
        // Safe no-op while AdMob SDK is inactive; will hide Adaptive Banner AdView once SDK is enabled.
    }

    fun requestPlacement(slotType: String, zoneName: String): JSONObject {
        val result = JSONObject()
        result.put("slotType", slotType)
        result.put("zone", zoneName)

        if (!OneoraMonetizationConfig.adsEnabled) {
            result.put("shown", false)
            result.put("reason", "ads_disabled_free_launch")
            return result
        }
        if (isPremiumAdFree) {
            result.put("shown", false)
            result.put("reason", "premium_ad_free")
            return result
        }
        if (inCriticalSafeZone || OneoraMonetizationConfig.criticalBlockedZones.contains(zoneName)) {
            result.put("shown", false)
            result.put("reason", "critical_user_action_protected")
            return result
        }

        val unitId = when (slotType.lowercase()) {
            "banner" -> OneoraMonetizationConfig.bannerUnitId()
            "native" -> OneoraMonetizationConfig.nativeUnitId()
            "rewarded" -> OneoraMonetizationConfig.rewardedUnitId()
            else -> ""
        }
        if (unitId.isBlank()) {
            result.put("shown", false)
            result.put("reason", "missing_ad_unit_id")
            return result
        }

        result.put("shown", false)
        result.put("reason", "admob_sdk_not_linked_yet")
        result.put("personalized", isPersonalizedConsentAllowed())
        return result
    }
}
