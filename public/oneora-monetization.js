/**
 * ONEORA — Central Monetization Manager, Entitlement Service, AdMob Safe-Zone Guard,
 * Premium Membership & Subscription Management UI, and Privacy & Consent Dashboard.
 *
 * Launch Policy (Strict):
 * - Free-First Launch: MONETIZATION_ENABLED = false, ADS_ENABLED = false, SUBSCRIPTION_ENABLED = false.
 * - Never activates live advertisements or real payments until real credentials & server flags are enabled.
 * - Never trusts frontend-only premium flags; entitlements always resolve from /api/entitlements/status.
 * - Never shows ads during PDF editing, file saving, digital signing, payments, or vault access.
 * - Never sends private document contents or financial records to advertising networks.
 */
(function (global) {
  const CONSENT_STORAGE_KEY = 'oneora_privacy_consent_v1';
  const CRITICAL_ZONES = new Set(['pdf_edit', 'file_save', 'digital_sign', 'payment', 'vault', 'onboarding']);

  const DEFAULT_CONSENT = {
    personalizedAdsAllowed: false,
    aiDocumentContextConsent: true,
    cloudSyncConsent: false,
    updatedAt: null
  };

  // Safe offline fallback configuration (Free-First Launch, zero hardcoded secrets)
  let remoteConfig = {
    environment: 'development',
    flags: {
      MONETIZATION_ENABLED: false,
      ADS_ENABLED: false,
      SUBSCRIPTION_ENABLED: false,
      FREE_PLAN_ENABLED: true,
      AI_ENABLED: true,
      CLOUD_SYNC_ENABLED: true
    },
    providers: {
      androidPlayBillingConfigured: false,
      webPaymentProvider: 'none',
      webPaymentsConfigured: false,
      adMobConfigured: false
    },
    adPolicy: {
      allowAdaptiveBanner: false,
      allowNative: false,
      allowRewarded: false,
      allowInterstitial: false,
      criticalBlockedZones: Array.from(CRITICAL_ZONES),
      requireConsent: true,
      neverUsePrivateDocsOrFinanceForAds: true
    },
    catalog: {
      currency: 'INR',
      symbol: '₹',
      note: 'Launch prices are configurable placeholders. All core offline tools remain free.',
      plans: {
        free: {
          id: 'free',
          name: 'ONEORA Free',
          monthlyPrice: 0,
          yearlyPrice: 0,
          aiDailyLimit: 20,
          features: [
            'Core PDF tools (Reader, Merge, Split, Compress, Sign)',
            'Basic Image tools & Passport Photo Maker',
            'Universal Office Reader (Word, Excel, PPT, ZIP)',
            'Calendar, Daily Planner, Notes, Reminders & Habits',
            'Expense Tracker, Monthly Budget & Calculators',
            'AES-256 Encrypted Local Vault & Daily Utilities'
          ]
        },
        plus: {
          id: 'plus',
          name: 'ONEORA PLUS',
          monthlyPrice: 49,
          yearlyPrice: 399,
          androidProductIds: { monthly: 'oneora_plus_monthly', yearly: 'oneora_plus_yearly' },
          aiDailyLimit: 100,
          features: [
            'Everything in ONEORA Free',
            'Ad-free experience across all screens',
            'Advanced PDF & batch processing workflows',
            'Advanced financial reports & exports',
            'Additional AI usage credits',
            'Premium themes & extra home widgets'
          ]
        },
        pro: {
          id: 'pro',
          name: 'ONEORA PRO',
          monthlyPrice: 99,
          yearlyPrice: 799,
          androidProductIds: { monthly: 'oneora_pro_monthly', yearly: 'oneora_pro_yearly' },
          aiDailyLimit: 500,
          features: [
            'Everything in ONEORA PLUS',
            'Highest AI Assistant & Document Intelligence limits',
            'Automated multi-device Cloud Backup & Sync',
            'Advanced Smart Hub cross-module automation',
            'Priority batch OCR & large-file workflows'
          ]
        }
      },
      aiCreditPacks: [
        { id: 'oneora_ai_pack_100', name: '100 AI Credits', credits: 100, priceInr: 29 },
        { id: 'oneora_ai_pack_500', name: '500 AI Credits', credits: 500, priceInr: 99 }
      ]
    }
  };

  let currentEntitlement = {
    plan: 'free',
    tierRank: 0,
    status: 'active_free_launch',
    billingCycle: null,
    provider: 'none',
    monetizationEnabled: false,
    adsEnabled: false,
    subscriptionEnabled: false,
    playBillingConfigured: false,
    webPaymentsConfigured: false,
    adsDisabled: true,
    expiresAt: null,
    gracePeriodEndsAt: null,
    aiCreditsBalance: 20,
    aiDailyLimit: 20,
    purchaseHistory: [],
    entitlements: {
      coreOfflinePdf: true,
      coreImageTools: true,
      coreOfficeReader: true,
      plannerAndNotes: true,
      expenseTracking: true,
      localVault: true,
      dailyUtilities: true,
      smartHub: true,
      advancedPdfBatch: true,
      advancedFinanceReports: true,
      premiumThemes: true,
      cloudBackupSync: true,
      advancedDocumentAi: true
    },
    note: 'ONEORA is currently in Free-First Launch mode. Live ads and paid billing are disabled.'
  };

  let activeSafeZone = null;
  let billingCycleUi = 'yearly';
  let activeModalTab = 'plans'; // plans | manage | privacy
  let lastBillingFeedback = null;

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function toast(title, msg, type = 'info') {
    if (global.utils && typeof global.utils.showToast === 'function') {
      global.utils.showToast(title, msg, type);
    }
  }

  function loadConsent() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) || '{}');
      return Object.assign({}, DEFAULT_CONSENT, parsed);
    } catch {
      return Object.assign({}, DEFAULT_CONSENT);
    }
  }

  function saveConsent(patch) {
    const next = Object.assign(loadConsent(), patch || {}, { updatedAt: new Date().toISOString() });
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(next));
    } catch {}
    if (global.OneoraDB) global.OneoraDB.syncKeyToIndexedDb(CONSENT_STORAGE_KEY);
    if (global.PDFBondhuMonetization && typeof global.PDFBondhuMonetization.setConsent === 'function') {
      global.PDFBondhuMonetization.setConsent(Boolean(next.personalizedAdsAllowed));
    }
    try {
      if (global.AndroidBridge && typeof global.AndroidBridge.updateAdConsent === 'function') {
        global.AndroidBridge.updateAdConsent(Boolean(next.personalizedAdsAllowed));
      }
    } catch {}
    return next;
  }

  async function refreshFromServer() {
    if (!navigator.onLine) return { offline: true, config: remoteConfig, entitlement: currentEntitlement };
    try {
      const [cfgRes, entRes] = await Promise.all([
        fetch('/api/config/monetization', { cache: 'no-store' }),
        fetch('/api/entitlements/status', { cache: 'no-store' })
      ]);
      if (cfgRes.ok) {
        const cfg = await cfgRes.json();
        if (cfg && cfg.flags && cfg.catalog) remoteConfig = cfg;
      }
      if (entRes.ok) {
        const ent = await entRes.json();
        if (ent && ent.plan) currentEntitlement = ent;
      }
      updateProfileSummaryCard();
      document.dispatchEvent(new CustomEvent('oneora:entitlementchange', { detail: currentEntitlement }));
    } catch {
      // Offline or local WebView assets: remain cleanly in Free-First Launch offline mode
    }
    return { offline: !navigator.onLine, config: remoteConfig, entitlement: currentEntitlement };
  }

  // Central Feature Access System — never locks essential offline functionality
  function canAccess(featureKey) {
    const coreFreeFeatures = new Set([
      'coreOfflinePdf', 'coreImageTools', 'coreOfficeReader', 'digitalSignature',
      'plannerAndNotes', 'reminders', 'expenseTracking', 'localVault',
      'dailyUtilities', 'smartHub'
    ]);
    if (coreFreeFeatures.has(featureKey)) return { allowed: true, reason: 'core_free' };
    if (!remoteConfig.flags.MONETIZATION_ENABLED) {
      return { allowed: true, reason: 'free_launch_mode' };
    }
    const allowed = Boolean(currentEntitlement.entitlements && currentEntitlement.entitlements[featureKey]);
    return {
      allowed,
      reason: allowed ? `entitled_${currentEntitlement.plan}` : 'upgrade_required',
      requiredPlan: featureKey === 'cloudBackupSync' || featureKey === 'advancedDocumentAi' ? 'pro' : 'plus'
    };
  }

  // Policy-Compliant AdMob Gate
  function shouldShowAds(slotType = 'banner', zoneName = 'general') {
    if (!remoteConfig.flags.MONETIZATION_ENABLED || !remoteConfig.flags.ADS_ENABLED) {
      return { allowed: false, reason: 'ads_disabled_in_config' };
    }
    if (currentEntitlement.adsDisabled || currentEntitlement.plan === 'plus' || currentEntitlement.plan === 'pro') {
      return { allowed: false, reason: 'premium_ad_free' };
    }
    if (!navigator.onLine) {
      return { allowed: false, reason: 'offline' };
    }
    if (activeSafeZone || CRITICAL_ZONES.has(zoneName)) {
      return { allowed: false, reason: 'critical_user_action_protected' };
    }
    if (slotType === 'interstitial' && !remoteConfig.adPolicy.allowInterstitial) {
      return { allowed: false, reason: 'interstitial_disabled' };
    }
    return { allowed: true, reason: 'eligible', slotType, personalized: loadConsent().personalizedAdsAllowed };
  }

  function enterCriticalZone(zoneName) {
    activeSafeZone = zoneName || 'pdf_edit';
    if (global.PDFBondhuMonetization) global.PDFBondhuMonetization.enterProcessingSafeZone();
    try {
      if (global.AndroidBridge && typeof global.AndroidBridge.setAdSafeZone === 'function') {
        global.AndroidBridge.setAdSafeZone(true, activeSafeZone);
      }
    } catch {}
  }

  function exitCriticalZone() {
    activeSafeZone = null;
    if (global.PDFBondhuMonetization) global.PDFBondhuMonetization.exitProcessingSafeZone();
    try {
      if (global.AndroidBridge && typeof global.AndroidBridge.setAdSafeZone === 'function') {
        global.AndroidBridge.setAdSafeZone(false, '');
      }
    } catch {}
  }

  // Honest Purchase Request — Never simulates success or unlocks paid plans without server verification
  async function requestPlanAction(planId, billingCycle) {
    const isAndroid = Boolean(global.AndroidBridge && typeof global.AndroidBridge.isAndroidApp === 'function' && global.AndroidBridge.isAndroidApp());
    const cycle = billingCycle || billingCycleUi;

    if (!remoteConfig.flags.SUBSCRIPTION_ENABLED) {
      lastBillingFeedback = {
        type: 'info',
        title: 'Free-First Launch Active',
        message: 'Live billing is intentionally disabled right now. All core ONEORA offline tools are unlocked free of charge — no payment is collected.'
      };
      renderModal();
      return lastBillingFeedback;
    }

    if (isAndroid && typeof global.AndroidBridge.requestPlayPurchase === 'function') {
      const productId = planId.startsWith('oneora_ai_pack')
        ? planId
        : `oneora_${planId}_${cycle}`;
      try {
        const raw = global.AndroidBridge.requestPlayPurchase(productId);
        const parsed = JSON.parse(raw || '{}');
        lastBillingFeedback = {
          type: parsed.ok ? 'info' : 'error',
          title: parsed.ok ? 'Google Play Billing' : 'Billing Not Activated',
          message: parsed.message || 'Configure Google Play Billing products and service credentials before activating live purchases.'
        };
      } catch {
        lastBillingFeedback = {
          type: 'error',
          title: 'Play Billing Unavailable',
          message: 'Unable to contact Google Play Billing service on this device.'
        };
      }
      renderModal();
      return lastBillingFeedback;
    }

    // Web checkout path (server-gated)
    try {
      const resp = await fetch('/api/billing/web-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, billingCycle: cycle })
      });
      const data = await resp.json().catch(() => ({}));
      lastBillingFeedback = {
        type: resp.ok ? 'success' : 'info',
        title: resp.ok ? 'Checkout Ready' : 'Web Billing Not Active Yet',
        message: data.error || data.message || 'Web billing requires server payment provider credentials.'
      };
    } catch {
      lastBillingFeedback = {
        type: 'error',
        title: 'Offline',
        message: 'An internet connection is required to verify billing status.'
      };
    }
    renderModal();
    return lastBillingFeedback;
  }

  async function restorePurchases() {
    const isAndroid = Boolean(global.AndroidBridge && typeof global.AndroidBridge.isAndroidApp === 'function' && global.AndroidBridge.isAndroidApp());

    if (isAndroid && typeof global.AndroidBridge.restorePlayPurchases === 'function') {
      try {
        const raw = global.AndroidBridge.restorePlayPurchases();
        const parsed = JSON.parse(raw || '{}');
        lastBillingFeedback = {
          type: 'info',
          title: 'Restore Purchases',
          message: parsed.message || 'No active Google Play purchases found.'
        };
        renderModal();
        return lastBillingFeedback;
      } catch {}
    }

    try {
      const resp = await fetch('/api/billing/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: isAndroid ? 'android' : 'web' })
      });
      const data = await resp.json().catch(() => ({}));
      lastBillingFeedback = {
        type: 'info',
        title: 'Restore Purchases',
        message: data.message || 'Checked purchase status with server.'
      };
    } catch {
      lastBillingFeedback = {
        type: 'error',
        title: 'Offline',
        message: 'Connect to the internet to check or restore cloud/Play Store purchases.'
      };
    }
    renderModal();
    return lastBillingFeedback;
  }

  /* ========================================================================
     PREMIUM MEMBERSHIP, SUBSCRIPTION MANAGEMENT & PRIVACY DASHBOARD UI
     ======================================================================== */
  function ensureModalRoot() {
    let el = document.getElementById('oneoraMonetizationModal');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'oneoraMonetizationModal';
    el.className = 'fixed inset-0 z-[95] hidden items-center justify-center bg-black/55 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto';
    el.addEventListener('click', (e) => {
      if (e.target === el) closeModal();
    });
    document.body.appendChild(el);
    return el;
  }

  function openModal(tab = 'plans') {
    activeModalTab = tab;
    lastBillingFeedback = null;
    const modal = ensureModalRoot();
    renderModal();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    refreshFromServer().then(() => {
      if (!modal.classList.contains('hidden')) renderModal();
    });
  }

  function closeModal() {
    const modal = document.getElementById('oneoraMonetizationModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }

  function renderPlansTab() {
    const cat = remoteConfig.catalog;
    const plus = cat.plans.plus;
    const pro = cat.plans.pro;
    const free = cat.plans.free;
    const isYearly = billingCycleUi === 'yearly';
    const subLive = remoteConfig.flags.SUBSCRIPTION_ENABLED;

    const plusPrice = isYearly ? plus.yearlyPrice : plus.monthlyPrice;
    const proPrice = isYearly ? pro.yearlyPrice : pro.monthlyPrice;
    const suffix = isYearly ? '/ year' : '/ month';

    return `
      <div class="space-y-5">
        <!-- Free-First Launch Status Banner -->
        <div class="rounded-2xl p-4 bg-[#EEF2FF] dark:bg-[#1D2540] border border-[#D8DEFA] dark:border-[#2C375E] flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-xs font-bold text-[#252B55] dark:text-[#C4B5FD]">Free-First Launch Mode</p>
            <p class="text-xs text-[#4C5570] dark:text-[#A5ADC2] mt-0.5">Live payments and ads are currently off. Enjoy all core offline PDF, Office, Planner, Finance &amp; Vault tools free of charge.</p>
          </div>
          <div class="inline-flex items-center p-1 rounded-xl bg-white dark:bg-[#10152A] border border-[#E8EAF2] dark:border-[#232C4A]">
            <button type="button" data-cycle="monthly" class="px-3 py-1.5 rounded-lg text-xs font-semibold transition ${!isYearly ? 'bg-[#7457E8] text-white' : 'text-[#777F91] dark:text-[#A5ADC2]'}">Monthly</button>
            <button type="button" data-cycle="yearly" class="px-3 py-1.5 rounded-lg text-xs font-semibold transition ${isYearly ? 'bg-[#7457E8] text-white' : 'text-[#777F91] dark:text-[#A5ADC2]'}">Yearly · Save 32%</button>
          </div>
        </div>

        <!-- 3-Tier Plan Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- FREE -->
          <div class="rounded-2xl p-5 bg-[#F6F7FB] dark:bg-[#0C1020] border border-[#E8EAF2] dark:border-[#232C4A] flex flex-col justify-between gap-4">
            <div class="space-y-2">
              <p class="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Active Plan</p>
              <h3 class="text-lg font-extrabold text-[#171B2C] dark:text-[#F5F6FC]">${esc(free.name)}</h3>
              <p class="text-2xl font-extrabold text-[#171B2C] dark:text-[#F5F6FC] tabular-nums">₹0 <span class="text-xs font-medium text-[#777F91]">/ forever</span></p>
              <ul class="space-y-1.5 pt-2 text-xs text-[#4C5570] dark:text-[#A5ADC2]">
                ${free.features.map((f) => `<li class="flex items-start gap-2"><span class="text-emerald-600 font-bold">✓</span><span>${esc(f)}</span></li>`).join('')}
              </ul>
            </div>
            <div class="w-full py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-bold text-center">Current Active Plan</div>
          </div>

          <!-- PLUS -->
          <div class="rounded-2xl p-5 bg-white dark:bg-[#151B2F] border-2 border-[#7457E8] flex flex-col justify-between gap-4 shadow-sm">
            <div class="space-y-2">
              <p class="text-[11px] font-bold uppercase tracking-wider text-[#7457E8] dark:text-[#B4A5FF]">Future Tier · Popular</p>
              <h3 class="text-lg font-extrabold text-[#171B2C] dark:text-[#F5F6FC]">${esc(plus.name)}</h3>
              <p class="text-2xl font-extrabold text-[#171B2C] dark:text-[#F5F6FC] tabular-nums">₹${esc(plusPrice)} <span class="text-xs font-medium text-[#777F91]">${suffix}</span></p>
              <p class="text-[11px] text-[#777F91] dark:text-[#A5ADC2] tabular-nums">Planned placeholder · ${esc(plus.aiDailyLimit)} AI credits/day</p>
              <ul class="space-y-1.5 pt-2 text-xs text-[#4C5570] dark:text-[#A5ADC2]">
                ${plus.features.map((f) => `<li class="flex items-start gap-2"><span class="text-[#7457E8] font-bold">✓</span><span>${esc(f)}</span></li>`).join('')}
              </ul>
            </div>
            <button type="button" data-plan-action="plus" class="w-full py-2.5 px-4 rounded-xl bg-[#7457E8] hover:bg-[#5E42D4] text-white text-xs font-bold min-h-[44px] transition">
              ${subLive ? `Upgrade to PLUS (₹${plusPrice})` : 'Planned for Future Release'}
            </button>
          </div>

          <!-- PRO -->
          <div class="rounded-2xl p-5 oneora-hero-card text-white flex flex-col justify-between gap-4">
            <div class="space-y-2 relative z-10">
              <p class="text-[11px] font-bold uppercase tracking-wider text-[#93C5FD]">Future Tier · Power &amp; Cloud</p>
              <h3 class="text-lg font-extrabold text-white">${esc(pro.name)}</h3>
              <p class="text-2xl font-extrabold text-white tabular-nums">₹${esc(proPrice)} <span class="text-xs font-medium text-[#CBD5E1]">${suffix}</span></p>
              <p class="text-[11px] text-[#A5ADC2] tabular-nums">Planned placeholder · ${esc(pro.aiDailyLimit)} AI credits/day</p>
              <ul class="space-y-1.5 pt-2 text-xs text-[#CBD5E1]">
                ${pro.features.map((f) => `<li class="flex items-start gap-2"><span class="text-[#93C5FD] font-bold">✓</span><span>${esc(f)}</span></li>`).join('')}
              </ul>
            </div>
            <button type="button" data-plan-action="pro" class="relative z-10 w-full py-2.5 px-4 rounded-xl bg-white text-[#10152A] hover:bg-[#F1F3FA] text-xs font-bold min-h-[44px] transition">
              ${subLive ? `Upgrade to PRO (₹${proPrice})` : 'Planned for Future Release'}
            </button>
          </div>
        </div>

        <!-- Optional AI Credit Packs -->
        <div class="rounded-2xl p-4 bg-[#F6F7FB] dark:bg-[#0C1020] border border-[#E8EAF2] dark:border-[#232C4A] space-y-3">
          <div class="flex items-center justify-between gap-2">
            <div>
              <h4 class="text-xs font-bold text-[#171B2C] dark:text-[#F5F6FC]">Future One-Time AI Credit Packs</h4>
              <p class="text-[11px] text-[#777F91] dark:text-[#A5ADC2]">Top up extra multilingual AI &amp; Document Intelligence credits without a recurring plan.</p>
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            ${cat.aiCreditPacks.map((pack) => `
              <div class="p-3.5 rounded-xl bg-white dark:bg-[#151B2F] border border-[#E8EAF2] dark:border-[#232C4A] flex items-center justify-between gap-3">
                <div>
                  <p class="text-xs font-bold text-[#171B2C] dark:text-[#F5F6FC]">${esc(pack.name)}</p>
                  <p class="text-[11px] text-[#777F91] dark:text-[#A5ADC2] tabular-nums">Planned ₹${esc(pack.priceInr)} · No expiry</p>
                </div>
                <button type="button" data-plan-action="${esc(pack.id)}" class="px-3.5 py-2 rounded-xl border border-[#E8EAF2] dark:border-[#232C4A] text-xs font-semibold text-[#171B2C] dark:text-[#F5F6FC] hover:border-[#7457E8] min-h-[38px]">
                  ${subLive ? `Buy ₹${pack.priceInr}` : 'Preview'}
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function renderManageTab() {
    const ent = currentEntitlement;
    const flags = remoteConfig.flags;
    const providers = remoteConfig.providers;

    return `
      <div class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="p-4 rounded-2xl bg-[#F6F7FB] dark:bg-[#0C1020] border border-[#E8EAF2] dark:border-[#232C4A]">
            <p class="text-[11px] font-semibold text-[#777F91] dark:text-[#A5ADC2]">Current Plan</p>
            <p class="text-base font-extrabold text-[#171B2C] dark:text-[#F5F6FC] mt-1 uppercase">${esc(ent.plan)}</p>
            <p class="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">${flags.MONETIZATION_ENABLED ? 'Verified via Server' : 'Free-First Launch Active'}</p>
          </div>
          <div class="p-4 rounded-2xl bg-[#F6F7FB] dark:bg-[#0C1020] border border-[#E8EAF2] dark:border-[#232C4A]">
            <p class="text-[11px] font-semibold text-[#777F91] dark:text-[#A5ADC2]">Renewal &amp; Grace Period</p>
            <p class="text-base font-extrabold text-[#171B2C] dark:text-[#F5F6FC] mt-1 tabular-nums">${ent.expiresAt ? esc(ent.expiresAt) : 'No Expiry'}</p>
            <p class="text-[11px] text-[#777F91] dark:text-[#A5ADC2] mt-0.5">${ent.gracePeriodEndsAt ? 'Grace until ' + esc(ent.gracePeriodEndsAt) : 'No active paid billing cycle'}</p>
          </div>
          <div class="p-4 rounded-2xl bg-[#F6F7FB] dark:bg-[#0C1020] border border-[#E8EAF2] dark:border-[#232C4A]">
            <p class="text-[11px] font-semibold text-[#777F91] dark:text-[#A5ADC2]">AI Daily Allowance</p>
            <p class="text-base font-extrabold text-[#171B2C] dark:text-[#F5F6FC] mt-1 tabular-nums">${esc(ent.aiCreditsBalance)} / ${esc(ent.aiDailyLimit)}</p>
            <p class="text-[11px] text-[#777F91] dark:text-[#A5ADC2] mt-0.5">${flags.AI_ENABLED ? 'Server AI Proxy Ready' : 'AI Key Not Configured'}</p>
          </div>
        </div>

        <!-- Restore Purchases & Server Verification -->
        <div class="p-4 rounded-2xl bg-white dark:bg-[#151B2F] border border-[#E8EAF2] dark:border-[#232C4A] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 class="text-xs font-bold text-[#171B2C] dark:text-[#F5F6FC]">Restore Purchases &amp; Entitlement Sync</h4>
            <p class="text-xs text-[#777F91] dark:text-[#A5ADC2] mt-0.5">Subscriptions are always verified server-side via Google Play Developer API or verified web webhooks.</p>
          </div>
          <button type="button" id="monetizationRestoreBtn" class="px-4 py-2.5 rounded-xl bg-[#10152A] dark:bg-[#7457E8] text-white text-xs font-bold min-h-[42px]">Restore Purchases</button>
        </div>

        <!-- Purchase History -->
        <div class="p-4 rounded-2xl bg-[#F6F7FB] dark:bg-[#0C1020] border border-[#E8EAF2] dark:border-[#232C4A] space-y-2">
          <h4 class="text-xs font-bold text-[#171B2C] dark:text-[#F5F6FC]">Purchase History</h4>
          ${Array.isArray(ent.purchaseHistory) && ent.purchaseHistory.length
            ? ent.purchaseHistory.map((p) => `<div class="text-xs flex justify-between py-1.5 border-b border-[#E8EAF2] dark:border-[#232C4A]"><span>${esc(p.productId)}</span><span class="tabular-nums">${esc(p.status)}</span></div>`).join('')
            : '<p class="text-xs text-[#777F91] dark:text-[#A5ADC2]">No purchases recorded. ONEORA is currently running in Free-First Launch mode.</p>'}
        </div>

        <!-- Cancellation & Billing Guidance -->
        <div class="p-4 rounded-2xl bg-white dark:bg-[#151B2F] border border-[#E8EAF2] dark:border-[#232C4A] space-y-2 text-xs text-[#777F91] dark:text-[#A5ADC2]">
          <h4 class="text-xs font-bold text-[#171B2C] dark:text-[#F5F6FC]">Cancellation, Billing Errors &amp; Configuration Status</h4>
          <p><strong class="text-[#171B2C] dark:text-[#F5F6FC]">Android Subscriptions:</strong> Once Play Billing is live, manage or cancel anytime from Google Play Store → Payments &amp; Subscriptions → ONEORA. Core offline files always remain yours even after cancellation.</p>
          <p><strong class="text-[#171B2C] dark:text-[#F5F6FC]">Billing Readiness:</strong> Play Billing: ${providers.androidPlayBillingConfigured ? 'Configured' : 'Prepared (Inactive)'} · Web Billing: ${providers.webPaymentsConfigured ? esc(providers.webPaymentProvider) : 'Prepared (Inactive)'} · AdMob: ${providers.adMobConfigured ? 'Configured' : 'Disabled (ADS_ENABLED=false)'}.</p>
        </div>
      </div>
    `;
  }

  function renderPrivacyTab() {
    const consent = loadConsent();
    return `
      <div class="space-y-4">
        <div class="p-4 rounded-2xl bg-[#EEF2FF] dark:bg-[#1D2540] border border-[#D8DEFA] dark:border-[#2C375E] text-xs text-[#252B55] dark:text-[#CBD5E1] space-y-1">
          <p class="font-bold">Strict Privacy Guarantee</p>
          <p>ONEORA never reads, uploads, or shares your private PDFs, vault files, notes, or financial records for advertising. All core tools run offline on your device.</p>
        </div>

        <!-- Consent Toggles -->
        <div class="space-y-2.5">
          <label class="flex items-center justify-between gap-4 p-4 rounded-2xl bg-[#F6F7FB] dark:bg-[#0C1020] border border-[#E8EAF2] dark:border-[#232C4A] cursor-pointer">
            <div>
              <p class="text-xs font-bold text-[#171B2C] dark:text-[#F5F6FC]">Personalized Ads Preference (Future AdMob)</p>
              <p class="text-[11px] text-[#777F91] dark:text-[#A5ADC2] mt-0.5">Live ads are currently OFF. When disabled, only non-personalized ads can ever be requested if ads are later enabled.</p>
            </div>
            <input type="checkbox" id="privacyPersonalizedAdsChk" ${consent.personalizedAdsAllowed ? 'checked' : ''} class="w-5 h-5 accent-[#7457E8] shrink-0" />
          </label>

          <label class="flex items-center justify-between gap-4 p-4 rounded-2xl bg-[#F6F7FB] dark:bg-[#0C1020] border border-[#E8EAF2] dark:border-[#232C4A] cursor-pointer">
            <div>
              <p class="text-xs font-bold text-[#171B2C] dark:text-[#F5F6FC]">AI Document Excerpt Consent</p>
              <p class="text-[11px] text-[#777F91] dark:text-[#A5ADC2] mt-0.5">Allow sending explicitly attached PDF/DOCX text excerpts to ONEORA AI over HTTPS when you click Send.</p>
            </div>
            <input type="checkbox" id="privacyAiConsentChk" ${consent.aiDocumentContextConsent ? 'checked' : ''} class="w-5 h-5 accent-[#7457E8] shrink-0" />
          </label>
        </div>

        <!-- Local IndexedDB Backup & Data Deletion -->
        <div class="p-4 rounded-2xl bg-white dark:bg-[#151B2F] border border-[#E8EAF2] dark:border-[#232C4A] space-y-3">
          <div>
            <h4 class="text-xs font-bold text-[#171B2C] dark:text-[#F5F6FC]">Local Database Backup, Restore &amp; Deletion</h4>
            <p id="privacyDbStatsText" class="text-[11px] text-[#777F91] dark:text-[#A5ADC2] mt-0.5">Checking IndexedDB local storage...</p>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button type="button" id="privacyExportBackupBtn" class="py-2.5 px-3 rounded-xl bg-[#10152A] dark:bg-[#7457E8] text-white text-xs font-bold min-h-[42px]">Export JSON Backup</button>
            <label class="cursor-pointer py-2.5 px-3 rounded-xl bg-[#F6F7FB] dark:bg-[#1D2540] border border-[#E8EAF2] dark:border-[#232C4A] text-[#171B2C] dark:text-[#F5F6FC] text-xs font-bold min-h-[42px] inline-flex items-center justify-center">
              Restore Backup
              <input type="file" id="privacyImportBackupInput" accept="application/json,.json" class="hidden" />
            </label>
            <button type="button" id="privacyDeleteLocalBtn" class="py-2.5 px-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-bold min-h-[42px]">Delete Local Data</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderModal() {
    const modal = ensureModalRoot();
    modal.innerHTML = `
      <div class="w-full max-w-4xl bg-white dark:bg-[#151B2F] rounded-[26px] border border-[#E8EAF2] dark:border-[#232C4A] shadow-2xl overflow-hidden my-auto">
        <!-- Header -->
        <div class="px-5 py-4 border-b border-[#E8EAF2] dark:border-[#232C4A] flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <img src="./icon.svg" alt="ONEORA" class="w-9 h-9 rounded-xl" />
            <div>
              <h2 class="text-base sm:text-lg font-extrabold text-[#171B2C] dark:text-[#F5F6FC] tracking-tight">ONEORA Plans &amp; Privacy</h2>
              <p class="text-[11px] text-[#777F91] dark:text-[#A5ADC2]">Free-First Launch · Server-Verified Architecture</p>
            </div>
          </div>
          <button type="button" id="monetizationCloseBtn" class="w-10 h-10 rounded-xl bg-[#F6F7FB] dark:bg-[#1D2540] border border-[#E8EAF2] dark:border-[#232C4A] text-[#171B2C] dark:text-[#F5F6FC] font-bold flex items-center justify-center">✕</button>
        </div>

        <!-- Tabs -->
        <div class="px-5 py-3 bg-[#F6F7FB] dark:bg-[#0C1020] border-b border-[#E8EAF2] dark:border-[#232C4A] flex items-center gap-2 overflow-x-auto hide-scrollbar">
          <button type="button" data-m-tab="plans" class="px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap min-h-[38px] ${activeModalTab === 'plans' ? 'bg-[#7457E8] text-white' : 'bg-white dark:bg-[#151B2F] text-[#777F91] dark:text-[#A5ADC2] border border-[#E8EAF2] dark:border-[#232C4A]'}">Compare Plans</button>
          <button type="button" data-m-tab="manage" class="px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap min-h-[38px] ${activeModalTab === 'manage' ? 'bg-[#7457E8] text-white' : 'bg-white dark:bg-[#151B2F] text-[#777F91] dark:text-[#A5ADC2] border border-[#E8EAF2] dark:border-[#232C4A]'}">Subscription &amp; Restore</button>
          <button type="button" data-m-tab="privacy" class="px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap min-h-[38px] ${activeModalTab === 'privacy' ? 'bg-[#7457E8] text-white' : 'bg-white dark:bg-[#151B2F] text-[#777F91] dark:text-[#A5ADC2] border border-[#E8EAF2] dark:border-[#232C4A]'}">Privacy &amp; Data Controls</button>
        </div>

        <!-- Feedback Banner -->
        ${lastBillingFeedback ? `
          <div class="mx-5 mt-4 p-3.5 rounded-xl border text-xs ${
            lastBillingFeedback.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200'
              : 'bg-[#EEF2FF] dark:bg-[#1D2540] border-[#D8DEFA] dark:border-[#2C375E] text-[#252B55] dark:text-[#E2E8F0]'
          }">
            <p class="font-bold">${esc(lastBillingFeedback.title)}</p>
            <p class="mt-0.5">${esc(lastBillingFeedback.message)}</p>
          </div>
        ` : ''}

        <!-- Body -->
        <div class="p-5 max-h-[72vh] overflow-y-auto">
          ${activeModalTab === 'plans' ? renderPlansTab() : ''}
          ${activeModalTab === 'manage' ? renderManageTab() : ''}
          ${activeModalTab === 'privacy' ? renderPrivacyTab() : ''}
        </div>
      </div>
    `;

    // Wire events
    modal.querySelector('#monetizationCloseBtn')?.addEventListener('click', closeModal);
    modal.querySelectorAll('[data-m-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeModalTab = btn.getAttribute('data-m-tab');
        lastBillingFeedback = null;
        renderModal();
      });
    });
    modal.querySelectorAll('[data-cycle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        billingCycleUi = btn.getAttribute('data-cycle');
        renderModal();
      });
    });
    modal.querySelectorAll('[data-plan-action]').forEach((btn) => {
      btn.addEventListener('click', () => requestPlanAction(btn.getAttribute('data-plan-action'), billingCycleUi));
    });
    modal.querySelector('#monetizationRestoreBtn')?.addEventListener('click', () => restorePurchases());

    // Privacy controls
    modal.querySelector('#privacyPersonalizedAdsChk')?.addEventListener('change', (e) => {
      saveConsent({ personalizedAdsAllowed: Boolean(e.target.checked) });
      toast('Preference Saved', e.target.checked ? 'Personalized ad consent saved (live ads remain OFF).' : 'Non-personalized ads only preference saved.', 'success');
    });
    modal.querySelector('#privacyAiConsentChk')?.addEventListener('change', (e) => {
      saveConsent({ aiDocumentContextConsent: Boolean(e.target.checked) });
      toast('AI Consent Updated', e.target.checked ? 'Explicit document attachment to AI is enabled.' : 'Document attachment to AI is disabled.', 'info');
    });

    if (activeModalTab === 'privacy' && global.OneoraDB) {
      global.OneoraDB.getStorageSummary().then((sum) => {
        const el = modal.querySelector('#privacyDbStatsText');
        if (el) {
          el.textContent = `${sum.engine} · ${sum.totalRecords} local records protected offline.`;
        }
      });
    }

    modal.querySelector('#privacyExportBackupBtn')?.addEventListener('click', async () => {
      if (!global.OneoraDB) return;
      const res = await global.OneoraDB.exportFullBackup();
      toast('Backup Exported', `Saved ${res.filename} to your device.`, 'success');
    });

    modal.querySelector('#privacyImportBackupInput')?.addEventListener('change', async (e) => {
      const f = e.target.files?.[0];
      if (!f || !global.OneoraDB) return;
      try {
        const res = await global.OneoraDB.importFullBackup(f);
        toast('Backup Restored', `Merged ${res.restoredModules} module(s) safely without losing newer items.`, 'success');
        renderModal();
      } catch (err) {
        toast('Restore Failed', err instanceof Error ? err.message : 'Invalid backup file.', 'error');
      }
      e.target.value = '';
    });

    const delLocalBtn = modal.querySelector('#privacyDeleteLocalBtn');
    delLocalBtn?.addEventListener('click', async () => {
      if (!delLocalBtn.dataset.armed) {
        delLocalBtn.dataset.armed = '1';
        delLocalBtn.textContent = 'Tap again to confirm wipe';
        setTimeout(() => {
          if (delLocalBtn) {
            delete delLocalBtn.dataset.armed;
            delLocalBtn.textContent = 'Delete Local Data';
          }
        }, 4500);
        return;
      }
      delete delLocalBtn.dataset.armed;
      if (global.OneoraDB) await global.OneoraDB.clearAllLocalRecords();
      toast('Local Data Cleared', 'Planner, Money, and local IndexedDB records have been removed.', 'info');
      renderModal();
    });
  }

  function updateProfileSummaryCard() {
    const planLabel = document.getElementById('profilePlanStatusText');
    const netLabel = document.getElementById('profileNetworkStatusText');
    if (planLabel) {
      planLabel.textContent = remoteConfig.flags.MONETIZATION_ENABLED
        ? `${currentEntitlement.plan.toUpperCase()} Plan · Server-Verified`
        : 'Free Forever Launch · All Core Offline Tools Unlocked';
    }
    if (netLabel) {
      netLabel.textContent = navigator.onLine
        ? 'Online · Offline PDF, Planner, Money & Vault ready · AI & Cloud Sync available'
        : 'Offline Mode · All core PDF, Image, Office, Planner, Money & Vault tools work normally';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    refreshFromServer();
    updateProfileSummaryCard();
    window.addEventListener('online', updateProfileSummaryCard);
    window.addEventListener('offline', updateProfileSummaryCard);

    document.getElementById('openMembershipModalBtn')?.addEventListener('click', () => openModal('plans'));
    document.getElementById('openSubscriptionManageBtn')?.addEventListener('click', () => openModal('manage'));
    document.getElementById('openPrivacyDashboardBtn')?.addEventListener('click', () => openModal('privacy'));

    // Deep link from website /?open=membership or /?open=privacy
    const params = new URLSearchParams(window.location.search);
    const openParam = params.get('open');
    if (openParam === 'membership') setTimeout(() => openModal('plans'), 350);
    if (openParam === 'manage') setTimeout(() => openModal('manage'), 350);
    if (openParam === 'privacy') setTimeout(() => openModal('privacy'), 350);
  });

  global.OneoraMonetization = {
    getConfig: () => remoteConfig,
    getEntitlement: () => currentEntitlement,
    getConsent: loadConsent,
    saveConsent,
    refreshFromServer,
    canAccess,
    shouldShowAds,
    enterCriticalZone,
    exitCriticalZone,
    requestPlanAction,
    restorePurchases,
    openMembershipModal: () => openModal('plans'),
    openSubscriptionManager: () => openModal('manage'),
    openPrivacyDashboard: () => openModal('privacy'),
    closeModal
  };
})(window);
