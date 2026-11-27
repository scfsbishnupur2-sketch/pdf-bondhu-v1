/* ==========================================================================
   ONEORA — Stage 4 Pastel 3-Screen Onboarding, Home Persona & Font Scaling
   Design A · Pastel (#FFF7EE / #17131F · Violet #5B3FD0 · Lavender #CBBBFF)
   Personalises Home for: Student / Shop Owner / Job Seeker / General
   Accessibility: 44px touch targets · AA contrast · Font Scaling (100/112/124%)
   ========================================================================== */
(function (global) {
  'use strict';

  const DONE_KEY = 'oneoraOnboardingDone_v1';
  const PERSONA_KEY = 'oneoraUserPersona_v1';
  const FONT_SCALE_KEY = 'oneoraFontScale_v1';

  const PERSONAS = {
    student: {
      id: 'student',
      label: 'Student',
      subtitle: 'Notes, PDF merge, scanner & exam photos first',
      pastelCat: 'pdf',
      categoryOrder: ['pdf', 'office', 'image', 'india', 'lifemoney', 'vault'],
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>'
    },
    shop_owner: {
      id: 'shop_owner',
      label: 'Shop Owner',
      subtitle: 'Bills, expenses, Udhar & PDF receipts first',
      pastelCat: 'lifemoney',
      categoryOrder: ['lifemoney', 'pdf', 'india', 'office', 'image', 'vault'],
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/></svg>'
    },
    job_seeker: {
      id: 'job_seeker',
      label: 'Job Seeker',
      subtitle: 'Govt exam KB photos, IDs, resumes & Vault first',
      pastelCat: 'india',
      categoryOrder: ['india', 'pdf', 'image', 'office', 'vault', 'lifemoney'],
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>'
    },
    general: {
      id: 'general',
      label: 'General',
      subtitle: 'Balanced access to PDF, Image, Office & Vault',
      pastelCat: 'vault',
      categoryOrder: ['pdf', 'image', 'office', 'lifemoney', 'india', 'vault'],
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1.5"/><rect width="7" height="7" x="14" y="3" rx="1.5"/><rect width="7" height="7" x="14" y="14" rx="1.5"/><rect width="7" height="7" x="3" y="14" rx="1.5"/></svg>'
    }
  };

  const FONT_SCALES = {
    normal: { id: 'normal', label: 'Normal', pct: '100%' },
    large: { id: 'large', label: 'Large', pct: '112%' },
    xl: { id: 'xl', label: 'Extra Large', pct: '124%' }
  };

  function haptic(ms) {
    try {
      if (navigator.vibrate) navigator.vibrate(ms || 10);
    } catch (_) {}
  }

  function getPersona() {
    try {
      const saved = localStorage.getItem(PERSONA_KEY);
      if (saved && PERSONAS[saved]) return saved;
    } catch (_) {}
    return 'general';
  }

  function getFontScale() {
    try {
      const saved = localStorage.getItem(FONT_SCALE_KEY);
      if (saved && FONT_SCALES[saved]) return saved;
    } catch (_) {}
    return 'normal';
  }

  function applyFontScale(scaleId, silent) {
    const prevScale = getFontScale();
    const cfg = FONT_SCALES[scaleId] || FONT_SCALES.normal;
    try {
      localStorage.setItem(FONT_SCALE_KEY, cfg.id);
    } catch (_) {}
    document.documentElement.style.fontSize = cfg.pct;
    document.documentElement.setAttribute('data-font-scale', cfg.id);

    document.querySelectorAll('[data-font-scale]').forEach((btn) => {
      const active = btn.getAttribute('data-font-scale') === cfg.id;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    if (silent === false && cfg.id !== prevScale) {
      haptic(8);
      if (global.utils && typeof global.utils.showToast === 'function') {
        global.utils.showToast('Text Size Updated', `Display text set to ${cfg.label} (${cfg.pct}).`, 'success', 2000);
      }
    }
  }

  function applyHomePersona(personaId) {
    const p = PERSONAS[personaId] || PERSONAS.general;
    const grid = document.getElementById('pastelHomeCategoriesGrid');
    if (grid) {
      const cardsByCat = {};
      Array.from(grid.querySelectorAll('[data-pastel-cat]')).forEach((el) => {
        const key = el.getAttribute('data-pastel-cat');
        if (key) cardsByCat[key] = el;
      });
      p.categoryOrder.forEach((catKey, idx) => {
        const card = cardsByCat[catKey];
        if (card) {
          card.style.setProperty('--stagger-i', String(idx));
          grid.appendChild(card);
        }
      });
    }

    // Sync Profile & Settings persona buttons
    document.querySelectorAll('[data-set-persona]').forEach((btn) => {
      const active = btn.getAttribute('data-set-persona') === p.id;
      btn.classList.toggle('is-selected', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    const summaryEl = document.getElementById('settingsActivePersonaLabel');
    if (summaryEl) {
      summaryEl.textContent = `${p.label} · ${p.subtitle}`;
    }

    document.documentElement.setAttribute('data-oneora-persona', p.id);
  }

  function setPersona(personaId, silent) {
    const p = PERSONAS[personaId] || PERSONAS.general;
    try {
      localStorage.setItem(PERSONA_KEY, p.id);
    } catch (_) {}
    applyHomePersona(p.id);
    document.dispatchEvent(new CustomEvent('oneora:personachange', { detail: { persona: p.id } }));
    if (!silent) {
      haptic(12);
      if (global.utils && typeof global.utils.showToast === 'function') {
        global.utils.showToast('Home Personalised', `Categories arranged for ${p.label}.`, 'success');
      }
    }
  }

  function isDone() {
    try {
      return localStorage.getItem(DONE_KEY) === '1';
    } catch (_) {
      return true;
    }
  }

  function markDone() {
    try {
      localStorage.setItem(DONE_KEY, '1');
    } catch (_) {}
  }

  function getWelcomeIllustration() {
    return `
      <svg viewBox="0 0 280 170" class="w-full max-w-[260px] h-auto mx-auto" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="14" y="14" width="252" height="142" rx="30" fill="#CBBBFF"/>
        <circle cx="222" cy="48" r="24" fill="#FFE7C2" opacity="0.9"/>
        <circle cx="58" cy="126" r="20" fill="#CFF3E2" opacity="0.9"/>
        <rect x="44" y="34" width="122" height="94" rx="22" fill="#FFFFFF"/>
        <rect x="58" y="50" width="38" height="38" rx="14" fill="#FFD6D6"/>
        <path d="M72 62h10M72 69h10M72 76h6" stroke="#B91C47" stroke-width="2.6" stroke-linecap="round"/>
        <rect x="106" y="54" width="46" height="8" rx="4" fill="#2B2236" opacity="0.85"/>
        <rect x="106" y="68" width="34" height="6" rx="3" fill="#5C506B" opacity="0.5"/>
        <rect x="58" y="98" width="94" height="16" rx="8" fill="#5B3FD0"/>
        <rect x="174" y="68" width="66" height="64" rx="20" fill="#FFF7EE"/>
        <path d="M195 100l8 8 16-18" stroke="#5B3FD0" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
  }

  function getPrivacyIllustration() {
    return `
      <svg viewBox="0 0 280 156" class="w-full max-w-[250px] h-auto mx-auto" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="16" y="12" width="248" height="132" rx="30" fill="#E4D9FF"/>
        <circle cx="64" cy="48" r="18" fill="#CFF3E2"/>
        <circle cx="220" cy="112" r="20" fill="#D6E8FF"/>
        <path d="M140 30l44 16v30c0 28-18 48-44 58-26-10-44-30-44-58V46l44-16z" fill="#FFFFFF"/>
        <path d="M140 42l32 12v22c0 20-13 35-32 43-19-8-32-23-32-43V54l32-12z" fill="#5B3FD0"/>
        <path d="M126 78l10 10 20-22" stroke="#FFFFFF" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
  }

  let currentSlide = 0;
  let selectedPersona = getPersona();
  let selectedScale = getFontScale();
  let overlayEl = null;

  function renderOnboardingOverlay() {
    if (overlayEl) return overlayEl;
    overlayEl = document.createElement('div');
    overlayEl.id = 'oneoraOnboardingOverlay';
    overlayEl.className = 'oneora-ob-overlay animate-fade-in';
    overlayEl.setAttribute('role', 'dialog');
    overlayEl.setAttribute('aria-modal', 'true');
    overlayEl.setAttribute('aria-label', 'Welcome to ONEORA');
    document.body.appendChild(overlayEl);
    return overlayEl;
  }

  function getCurrentLang() {
    try {
      return localStorage.getItem('pdfBondhuLang_v1') || localStorage.getItem('oneoraLang_v1') || 'en';
    } catch (_) {
      return 'en';
    }
  }

  function updateSlideUI() {
    if (!overlayEl) return;
    const totalSlides = 3;
    const isLast = currentSlide === totalSlides - 1;
    const activeLang = getCurrentLang();

    const dots = [0, 1, 2]
      .map(
        (i) =>
          `<span class="h-2 rounded-full transition-all duration-300 ${
            i === currentSlide ? 'w-8 bg-[#5B3FD0] dark:bg-[#CBBBFF]' : 'w-2 bg-[#D9CEE8] dark:bg-[#3A2F52]'
          }"></span>`
      )
      .join('');

    let bodyHtml = '';

    if (currentSlide === 0) {
      // Screen 1: Welcome + Language
      bodyHtml = `
        <div class="space-y-6 text-center animate-fade-in">
          <div class="pt-1">${getWelcomeIllustration()}</div>
          <div class="space-y-2">
            <span class="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-extrabold bg-[#E4D9FF] dark:bg-[#2D2347] text-[#3E26A0] dark:text-[#D7C9FF]">Welcome to ONEORA</span>
            <h2 class="text-[28px] font-extrabold tracking-tight leading-tight text-[#2B2236] dark:text-[#F5EEFF]">Every daily tool, calm &amp; offline</h2>
            <p class="text-sm font-medium text-[#5C506B] dark:text-[#C5B9DA] leading-relaxed max-w-sm mx-auto">Scan documents, edit PDFs, size passport photos, track money &amp; lock personal IDs — all on your device.</p>
          </div>
          <div class="pastel-ob-card p-4 space-y-2.5 text-left">
            <div class="text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] px-1">Choose your language</div>
            <div class="grid grid-cols-3 gap-2">
              ${[
                { code: 'en', label: 'English' },
                { code: 'bn', label: 'বাংলা' },
                { code: 'hi', label: 'हिन्दी' }
              ]
                .map(
                  (l) => `
                  <button type="button" data-ob-lang="${l.code}" class="pastel-scale-btn text-xs ${activeLang === l.code ? 'is-active' : ''}">${l.label}</button>`
                )
                .join('')}
            </div>
          </div>
        </div>`;
    } else if (currentSlide === 1) {
      // Screen 2: Persona Selection (Personalises Home)
      bodyHtml = `
        <div class="space-y-5 animate-fade-in">
          <div class="text-center space-y-1.5">
            <span class="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-extrabold bg-[#FFE7C2] dark:bg-[#3D2E1D] text-[#6B3E08] dark:text-[#FFE0B2]">Step 2 of 3 · Personalise</span>
            <h2 class="text-[26px] font-extrabold tracking-tight leading-tight text-[#2B2236] dark:text-[#F5EEFF]">How will you use ONEORA?</h2>
            <p class="text-sm font-medium text-[#5C506B] dark:text-[#C5B9DA]">We’ll arrange your Home categories to put your favourite tools first.</p>
          </div>
          <div class="grid grid-cols-2 gap-3">
            ${Object.values(PERSONAS)
              .map(
                (p) => `
                <button type="button" data-ob-persona="${p.id}" data-pastel-cat="${p.pastelCat}" class="pastel-persona-card ${selectedPersona === p.id ? 'is-selected' : ''}" aria-pressed="${selectedPersona === p.id ? 'true' : 'false'}">
                  <div class="flex items-start justify-between gap-2">
                    <span class="pastel-white-tile !w-11 !h-11 !rounded-[16px]">${p.icon}</span>
                    ${
                      selectedPersona === p.id
                        ? '<span class="w-6 h-6 rounded-full bg-[#5B3FD0] text-white inline-flex items-center justify-center shrink-0"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></span>'
                        : ''
                    }
                  </div>
                  <div class="mt-3.5">
                    <div class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">${p.label}</div>
                    <p class="text-[11px] font-semibold text-[#4C3F5E] dark:text-[#D6CAF0] mt-1 leading-snug">${p.subtitle}</p>
                  </div>
                </button>`
              )
              .join('')}
          </div>
        </div>`;
    } else {
      // Screen 3: Private Offline + Font Scaling Accessibility
      bodyHtml = `
        <div class="space-y-5 text-center animate-fade-in">
          <div>${getPrivacyIllustration()}</div>
          <div class="space-y-1.5">
            <span class="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-extrabold bg-[#CFF3E2] dark:bg-[#1B362E] text-[#0F5137] dark:text-[#B9F2D9]">100% On-Device Privacy</span>
            <h2 class="text-[26px] font-extrabold tracking-tight leading-tight text-[#2B2236] dark:text-[#F5EEFF]">Your files never leave your phone</h2>
            <p class="text-sm font-medium text-[#5C506B] dark:text-[#C5B9DA] leading-relaxed max-w-sm mx-auto">Lock your Vault with PIN or fingerprint, and share files from any app using “Open with ONEORA”.</p>
          </div>
          <div class="pastel-ob-card p-4 space-y-2.5 text-left">
            <div class="flex items-center justify-between px-1">
              <span class="text-xs font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">Comfortable Text Size</span>
              <span class="text-[11px] font-bold text-[#5C506B] dark:text-[#C5B9DA]">Change anytime in Settings</span>
            </div>
            <div class="grid grid-cols-3 gap-2">
              ${Object.values(FONT_SCALES)
                .map(
                  (s) => `
                  <button type="button" data-ob-scale="${s.id}" class="pastel-scale-btn text-xs ${selectedScale === s.id ? 'is-active' : ''}">
                    ${s.label}
                  </button>`
                )
                .join('')}
            </div>
          </div>
        </div>`;
    }

    overlayEl.innerHTML = `
      <div class="flex items-center justify-between max-w-md w-full mx-auto">
        <div class="flex items-center gap-2.5">
          <img src="./icon.svg" alt="ONEORA" class="w-9 h-9 rounded-2xl shadow-sm" />
          <span class="text-sm font-extrabold tracking-tight text-[#2B2236] dark:text-[#F5EEFF]">ONEORA</span>
        </div>
        <button type="button" id="oneoraObSkipBtn" class="px-4 py-2 rounded-full text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] hover:bg-black/5 dark:hover:bg-white/10 min-h-[44px] transition">
          Skip
        </button>
      </div>

      <div class="oneora-ob-stage py-4">${bodyHtml}</div>

      <div class="max-w-md w-full mx-auto space-y-4">
        <div class="flex items-center justify-center gap-2" aria-label="Step ${currentSlide + 1} of ${totalSlides}">${dots}</div>
        <div class="flex items-center gap-2.5">
          ${
            currentSlide > 0
              ? '<button type="button" id="oneoraObBackBtn" class="px-5 rounded-full bg-white dark:bg-[#221C2E] border border-[var(--oneora-border)] text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF] min-h-[52px] shadow-sm transition">Back</button>'
              : ''
          }
          <button type="button" id="oneoraObNextBtn" class="flex-1 rounded-full bg-[#5B3FD0] hover:bg-[#4B2FC0] text-white text-sm font-extrabold min-h-[52px] px-6 shadow-[0_14px_28px_-14px_rgba(91,63,208,0.65)] transition">
            ${isLast ? 'Start Using ONEORA →' : 'Continue'}
          </button>
        </div>
      </div>
    `;

    // Bind interactive controls inside onboarding
    const skipBtn = overlayEl.querySelector('#oneoraObSkipBtn');
    const backBtn = overlayEl.querySelector('#oneoraObBackBtn');
    const nextBtn = overlayEl.querySelector('#oneoraObNextBtn');

    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        haptic(8);
        closeOnboarding(true);
      });
    }
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        haptic(8);
        currentSlide = Math.max(0, currentSlide - 1);
        updateSlideUI();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        haptic(12);
        if (currentSlide < totalSlides - 1) {
          currentSlide += 1;
          updateSlideUI();
        } else {
          setPersona(selectedPersona, true);
          applyFontScale(selectedScale, true);
          closeOnboarding(true);
          if (global.utils && typeof global.utils.showToast === 'function') {
            const p = PERSONAS[selectedPersona] || PERSONAS.general;
            global.utils.showToast('Welcome to ONEORA', `Home personalised for ${p.label}.`, 'success');
          }
        }
      });
    }

    overlayEl.querySelectorAll('[data-ob-lang]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const lang = btn.getAttribute('data-ob-lang') || 'en';
        haptic(8);
        if (typeof global.setAppLanguage === 'function') {
          global.setAppLanguage(lang);
        } else {
          try {
            localStorage.setItem('pdfBondhuLang_v1', lang);
          } catch (_) {}
          const langBtn = document.querySelector(`[data-set-lang="${lang}"]`);
          if (langBtn) langBtn.click();
        }
        updateSlideUI();
      });
    });

    overlayEl.querySelectorAll('[data-ob-persona]').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedPersona = btn.getAttribute('data-ob-persona') || 'general';
        setPersona(selectedPersona, true);
        haptic(10);
        updateSlideUI();
      });
    });

    overlayEl.querySelectorAll('[data-ob-scale]').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedScale = btn.getAttribute('data-ob-scale') || 'normal';
        applyFontScale(selectedScale, true);
        haptic(8);
        updateSlideUI();
      });
    });
  }

  function openOnboarding(startIndex) {
    currentSlide = typeof startIndex === 'number' ? startIndex : 0;
    selectedPersona = getPersona();
    selectedScale = getFontScale();
    renderOnboardingOverlay();
    overlayEl.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    updateSlideUI();
  }

  function closeOnboarding(persist) {
    if (persist) markDone();
    if (overlayEl) {
      overlayEl.remove();
      overlayEl = null;
    }
    document.body.style.overflow = '';
  }

  function initSettingsBindings() {
    document.querySelectorAll('[data-set-persona]').forEach((btn) => {
      if (btn.dataset.personaWired) return;
      btn.dataset.personaWired = '1';
      btn.addEventListener('click', () => {
        setPersona(btn.getAttribute('data-set-persona') || 'general', false);
      });
    });

    document.querySelectorAll('[data-font-scale]').forEach((btn) => {
      if (btn.dataset.scaleWired) return;
      btn.dataset.scaleWired = '1';
      btn.addEventListener('click', (e) => {
        if (e && e.isTrusted === false) return;
        applyFontScale(btn.getAttribute('data-font-scale') || 'normal', false);
      });
    });

    const replayBtn = document.getElementById('settingsReplayOnboardingBtn');
    if (replayBtn && !replayBtn.dataset.obWired) {
      replayBtn.dataset.obWired = '1';
      replayBtn.addEventListener('click', () => {
        haptic(10);
        openOnboarding(0);
      });
    }
  }

  // Apply saved font scaling immediately to avoid layout jump
  applyFontScale(getFontScale(), true);

  document.addEventListener('DOMContentLoaded', () => {
    applyFontScale(getFontScale(), true);
    applyHomePersona(getPersona());
    initSettingsBindings();

    // First-launch onboarding check (skip if existing user upgraded or deep-linked via shortcut/share)
    const params = new URLSearchParams(window.location.search);
    const hasDeepLink = params.has('shortcut') || params.has('shared') || params.has('open');
    const hasExistingData = Boolean(
      localStorage.getItem('pdfBondhuRecentTools_v2') ||
        localStorage.getItem('pdfBondhuProfile_v2') ||
        localStorage.getItem('oneoraProfile_v1')
    );

    if (!isDone() && !hasExistingData && !hasDeepLink) {
      setTimeout(() => openOnboarding(0), 260);
    } else if (hasExistingData && !isDone()) {
      markDone();
    }
  });

  global.OneoraOnboarding = {
    open: openOnboarding,
    close: () => closeOnboarding(true),
    isDone
  };

  global.OneoraPersonalization = {
    PERSONAS,
    FONT_SCALES,
    getPersona,
    setPersona,
    applyHomePersona,
    getFontScale,
    applyFontScale
  };
})(window);
