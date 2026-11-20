/**
 * PDF Bondhu 2.0 - Future-Ready Modular Monetization & Premium Architecture
 *
 * Launch Policy:
 * - 100% FREE at launch. All features unlocked. Zero paywalls, zero subscription prompts.
 * - Non-intrusive AdMob bridge ready for future activation once Play Store release matures.
 * - Never renders ads during PDF/Image/Excel processing or inside editor canvases.
 * - Works gracefully offline or when no ad SDK is present.
 */
(function (global) {
  const STORAGE_KEY = 'pdfBondhuConsentConfig_v2';

  const defaultConfig = {
    appVersion: '2.0.0',
    launchFreeMode: true,
    adsEnabled: false,
    personalizedAdsConsent: false,
    consentRecordedAt: null,
    // Modular flags for future optional Premium tier (all free & unlocked at launch)
    featureModules: {
      advancedOcr: { enabled: true, tier: 'free_at_launch' },
      batchProcessing: { enabled: true, tier: 'free_at_launch' },
      encryptedVault: { enabled: true, tier: 'free_at_launch' },
      cloudSyncAdapter: { enabled: false, tier: 'future_optional' },
      adFreeMode: { enabled: true, tier: 'free_at_launch' }
    }
  };

  function loadConfig() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return Object.assign({}, defaultConfig, saved, { launchFreeMode: true });
    } catch {
      return Object.assign({}, defaultConfig);
    }
  }

  function saveConfig(patch) {
    const next = Object.assign(loadConfig(), patch || {});
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
    return next;
  }

  const PDFBondhuMonetization = {
    getConfig: loadConfig,
    setConsent(allowPersonalized) {
      return saveConfig({
        personalizedAdsConsent: Boolean(allowPersonalized),
        consentRecordedAt: new Date().toISOString()
      });
    },
    isProcessingSafeZone: false,
    enterProcessingSafeZone() {
      this.isProcessingSafeZone = true;
      this.hideBannerSafe();
    },
    exitProcessingSafeZone() {
      this.isProcessingSafeZone = false;
    },
    hideBannerSafe() {
      try {
        if (global.AndroidBridge && typeof global.AndroidBridge.hideBannerAd === 'function') {
          global.AndroidBridge.hideBannerAd();
        }
      } catch {}
    },
    requestSafePlacement(slotName) {
      const cfg = loadConfig();
      if (cfg.launchFreeMode || !cfg.adsEnabled || this.isProcessingSafeZone) {
        return { shown: false, reason: 'free_launch_or_processing_safe_zone', slot: slotName };
      }
      return { shown: false, reason: 'sdk_not_active', slot: slotName };
    }
  };

  global.PDFBondhuMonetization = PDFBondhuMonetization;
})(window);
