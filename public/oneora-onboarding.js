/**
 * ONEORA — Three-Screen Premium First-Launch Onboarding Experience
 * - Exact 3 screens:
 *   1. "Everything You Need. One App."
 *   2. "Make Every Day Simpler."
 *   3. "Your World. Your Control."
 * - Skip, Next, Back, 3-page progress indicator, Language quick-select, Get Started
 * - Automatically detects existing upgraded users so it NEVER blocks or resets their data
 * - Replayable anytime from Profile & Settings via window.OneoraOnboarding.open()
 */
(function (global) {
  const DONE_KEY = 'oneoraOnboardingDone_v1';

  const SLIDES = [
    {
      kicker: 'Everything in One Place',
      title: 'Everything You Need. One App.',
      description: 'Your documents, photos, productivity and everyday tools, all organised in ONEORA.',
      showLang: true,
      svg: `
        <svg viewBox="0 0 320 220" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full max-w-[300px] mx-auto h-auto" aria-hidden="true">
          <defs>
            <linearGradient id="ob1Card" x1="20" y1="20" x2="300" y2="200" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#10152A"/>
              <stop offset="100%" stop-color="#252B55"/>
            </linearGradient>
            <linearGradient id="ob1Accent" x1="120" y1="70" x2="200" y2="150" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#648BFF"/>
              <stop offset="100%" stop-color="#7457E8"/>
            </linearGradient>
          </defs>
          <rect x="16" y="14" width="288" height="192" rx="28" fill="url(#ob1Card)"/>
          <path d="M96 70L160 110M224 70L160 110M96 152L160 110M224 152L160 110" stroke="#648BFF" stroke-opacity="0.35" stroke-width="2" stroke-dasharray="4 4"/>
          <!-- Document Node -->
          <rect x="44" y="42" width="66" height="52" rx="14" fill="#1D2540" stroke="#648BFF" stroke-opacity="0.35"/>
          <rect x="58" y="56" width="24" height="4" rx="2" fill="#FFFFFF"/>
          <rect x="58" y="65" width="38" height="3.5" rx="1.75" fill="#9EB4FF" fill-opacity="0.7"/>
          <rect x="58" y="74" width="28" height="3.5" rx="1.75" fill="#7457E8"/>
          <!-- Image Node -->
          <rect x="210" y="42" width="66" height="52" rx="14" fill="#1D2540" stroke="#7457E8" stroke-opacity="0.4"/>
          <circle cx="231" cy="60" r="5" fill="#648BFF"/>
          <path d="M222 82L236 69L246 78L254 71L264 82H222Z" fill="#7457E8"/>
          <!-- Calendar Node -->
          <rect x="44" y="126" width="66" height="52" rx="14" fill="#1D2540" stroke="#7457E8" stroke-opacity="0.4"/>
          <rect x="56" y="138" width="42" height="7" rx="3.5" fill="#7457E8"/>
          <rect x="56" y="151" width="10" height="8" rx="2.5" fill="#FFFFFF" fill-opacity="0.85"/>
          <rect x="72" y="151" width="10" height="8" rx="2.5" fill="#648BFF"/>
          <rect x="88" y="151" width="10" height="8" rx="2.5" fill="#FFFFFF" fill-opacity="0.4"/>
          <!-- Utility / Vault Node -->
          <rect x="210" y="126" width="66" height="52" rx="14" fill="#1D2540" stroke="#648BFF" stroke-opacity="0.35"/>
          <rect x="231" y="146" width="24" height="19" rx="5" fill="#648BFF"/>
          <path d="M237 146V142C237 138.7 239.7 136 243 136C246.3 136 249 138.7 249 142V146" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
          <!-- Central ONEORA Prism Hub -->
          <circle cx="160" cy="110" r="36" fill="#10152A" stroke="url(#ob1Accent)" stroke-width="2.5"/>
          <path d="M160 85L137 108C135.4 109.6 135.4 112.1 137 113.7L157 133.7C158.6 135.3 161.1 135.3 162.7 133.7L167.5 128.9L153.8 115.2C151.7 113.1 151.7 109.7 153.8 107.6L166.2 95.2L160 85Z" fill="#648BFF"/>
          <path d="M157.3 85C158.9 83.4 161.4 83.4 163 85L183 105C184.6 106.6 184.6 109.1 183 110.7L160 133.7L153.8 123.5L166.2 111.1C168.3 109 168.3 105.6 166.2 103.5L152.5 89.8L157.3 85Z" fill="#FFFFFF"/>
          <path d="M160 103.5L166.5 110L160 116.5L153.5 110L160 103.5Z" fill="#7457E8"/>
        </svg>
      `
    },
    {
      kicker: 'Your Life, Organised',
      title: 'Make Every Day Simpler.',
      description: 'Manage your calendar, reminders, notes, expenses and important documents from one place.',
      showLang: false,
      svg: `
        <svg viewBox="0 0 320 220" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full max-w-[300px] mx-auto h-auto" aria-hidden="true">
          <defs>
            <linearGradient id="ob2Bg" x1="20" y1="20" x2="300" y2="200" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#10152A"/>
              <stop offset="100%" stop-color="#252B55"/>
            </linearGradient>
          </defs>
          <rect x="16" y="14" width="288" height="192" rx="28" fill="url(#ob2Bg)"/>
          <!-- Fintech Balance Card -->
          <rect x="36" y="34" width="142" height="84" rx="16" fill="#1D2540" stroke="#7457E8" stroke-opacity="0.45"/>
          <rect x="50" y="48" width="52" height="5" rx="2.5" fill="#A5ADC2"/>
          <rect x="50" y="61" width="84" height="12" rx="4" fill="#FFFFFF"/>
          <path d="M50 102L74 90L94 96L118 82L144 88L164 74" stroke="#34D399" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          <!-- Calendar Card -->
          <rect x="190" y="34" width="94" height="84" rx="16" fill="#1D2540" stroke="#648BFF" stroke-opacity="0.38"/>
          <rect x="204" y="47" width="46" height="6" rx="3" fill="#648BFF"/>
          <circle cx="212" cy="70" r="5" fill="#FFFFFF" fill-opacity="0.8"/>
          <circle cx="232" cy="70" r="5" fill="#7457E8"/>
          <circle cx="252" cy="70" r="5" fill="#FFFFFF" fill-opacity="0.35"/>
          <circle cx="212" cy="90" r="5" fill="#FFFFFF" fill-opacity="0.35"/>
          <circle cx="232" cy="90" r="5" fill="#34D399"/>
          <circle cx="252" cy="90" r="5" fill="#FFFFFF" fill-opacity="0.8"/>
          <!-- Bottom Schedule & Reminder Strip -->
          <rect x="36" y="130" width="248" height="56" rx="16" fill="#151B2F" stroke="#FFFFFF" stroke-opacity="0.1"/>
          <rect x="50" y="146" width="24" height="24" rx="8" fill="#7457E8"/>
          <path d="M58 158L61 161L67 154" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
          <rect x="86" y="148" width="106" height="6" rx="3" fill="#FFFFFF"/>
          <rect x="86" y="161" width="74" height="4.5" rx="2.25" fill="#A5ADC2"/>
          <rect x="218" y="148" width="52" height="20" rx="8" fill="#648BFF" fill-opacity="0.22"/>
          <rect x="230" y="156" width="28" height="4.5" rx="2.25" fill="#648BFF"/>
        </svg>
      `
    },
    {
      kicker: 'Smart. Private. Powerful.',
      title: 'Your World. Your Control.',
      description: 'Enjoy powerful tools, offline productivity and intelligent assistance in one seamless experience.',
      showLang: false,
      svg: `
        <svg viewBox="0 0 320 220" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full max-w-[300px] mx-auto h-auto" aria-hidden="true">
          <defs>
            <linearGradient id="ob3Bg" x1="20" y1="20" x2="300" y2="200" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#10152A"/>
              <stop offset="100%" stop-color="#252B55"/>
            </linearGradient>
            <linearGradient id="ob3Shield" x1="125" y1="54" x2="195" y2="162" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#7457E8"/>
              <stop offset="100%" stop-color="#648BFF"/>
            </linearGradient>
          </defs>
          <rect x="16" y="14" width="288" height="192" rx="28" fill="url(#ob3Bg)"/>
          <!-- Concentric Orbital Precision Rings -->
          <circle cx="160" cy="110" r="72" stroke="#648BFF" stroke-opacity="0.18" stroke-width="1.5"/>
          <circle cx="160" cy="110" r="52" stroke="#7457E8" stroke-opacity="0.3" stroke-width="1.5" stroke-dasharray="6 5"/>
          <!-- Shield Core -->
          <path d="M160 58L202 74V112C202 138 183.6 158.6 160 166C136.4 158.6 118 138 118 112V74L160 58Z" fill="url(#ob3Shield)"/>
          <path d="M146 111L156 121L176 99" stroke="#FFFFFF" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
          <!-- Offline & AI Orbit Satellites -->
          <rect x="44" y="88" width="54" height="44" rx="14" fill="#1D2540" stroke="#34D399" stroke-opacity="0.45"/>
          <rect x="57" y="102" width="28" height="5" rx="2.5" fill="#34D399"/>
          <rect x="57" y="113" width="20" height="4" rx="2" fill="#A5ADC2"/>
          <rect x="222" y="88" width="54" height="44" rx="14" fill="#1D2540" stroke="#648BFF" stroke-opacity="0.5"/>
          <path d="M249 99L252.2 106.8L260 110L252.2 113.2L249 121L245.8 113.2L238 110L245.8 106.8L249 99Z" fill="#FFFFFF"/>
        </svg>
      `
    }
  ];

  let currentIndex = 0;
  let overlayEl = null;

  function isExistingUserUpgrade() {
    const legacyKeys = [
      'pdfBondhuRecentTools',
      'pdfBondhuVault',
      'pdfBondhuUserName',
      'oneoraPlannerData_v1',
      'oneoraMoneyData_v1',
      'pdfBondhuThemeMode_v2'
    ];
    return legacyKeys.some((k) => {
      try { return localStorage.getItem(k) !== null; } catch { return false; }
    });
  }

  function closeOnboarding(markDone = true) {
    if (markDone) {
      try { localStorage.setItem(DONE_KEY, '1'); } catch {}
    }
    if (overlayEl) {
      overlayEl.remove();
      overlayEl = null;
    }
    document.body.style.overflow = '';
  }

  function renderSlide() {
    if (!overlayEl) return;
    const slide = SLIDES[currentIndex];
    const isLast = currentIndex === SLIDES.length - 1;
    const activeLang = (() => {
      try { return localStorage.getItem('pdfBondhuLang') || 'en'; } catch { return 'en'; }
    })();

    overlayEl.innerHTML = `
      <div class="w-full max-w-md mx-auto flex items-center justify-between pt-1">
        <div class="flex items-center gap-2.5">
          <img src="./icon.svg" alt="ONEORA" class="w-8 h-8 rounded-xl shadow-sm" />
          <span class="text-sm font-extrabold tracking-tight text-[#171B2C] dark:text-[#F5F6FC]">ONEORA</span>
        </div>
        <button type="button" id="oneoraObSkipBtn" class="px-3.5 py-2 rounded-xl text-xs font-bold text-[#777F91] dark:text-[#A5ADC2] hover:text-[#7457E8] min-h-[40px]">Skip</button>
      </div>

      <div class="oneora-ob-stage py-6 flex flex-col items-center text-center oneora-ob-slide">
        <div class="w-full mb-7">${slide.svg}</div>
        <p class="text-xs font-bold tracking-wide text-[#7457E8] dark:text-[#9FAFFF] mb-2">${slide.kicker}</p>
        <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#171B2C] dark:text-[#F5F6FC] leading-tight mb-3">${slide.title}</h1>
        <p class="text-sm text-[#777F91] dark:text-[#A5ADC2] leading-relaxed max-w-sm">${slide.description}</p>

        ${slide.showLang ? `
          <div class="mt-6 w-full max-w-xs">
            <p class="text-[11px] font-semibold text-[#777F91] dark:text-[#A5ADC2] mb-2">Choose your preferred language</p>
            <div class="grid grid-cols-3 gap-2">
              <button type="button" data-ob-lang="en" class="py-2 rounded-xl text-xs font-bold border min-h-[40px] ${activeLang === 'en' ? 'bg-[#7457E8] text-white border-[#7457E8]' : 'bg-white dark:bg-[#151B2F] text-[#171B2C] dark:text-[#F5F6FC] border-[#E8EAF2] dark:border-[#232C4A]'}">English</button>
              <button type="button" data-ob-lang="bn" class="py-2 rounded-xl text-xs font-bold border min-h-[40px] ${activeLang === 'bn' ? 'bg-[#7457E8] text-white border-[#7457E8]' : 'bg-white dark:bg-[#151B2F] text-[#171B2C] dark:text-[#F5F6FC] border-[#E8EAF2] dark:border-[#232C4A]'}">বাংলা</button>
              <button type="button" data-ob-lang="hi" class="py-2 rounded-xl text-xs font-bold border min-h-[40px] ${activeLang === 'hi' ? 'bg-[#7457E8] text-white border-[#7457E8]' : 'bg-white dark:bg-[#151B2F] text-[#171B2C] dark:text-[#F5F6FC] border-[#E8EAF2] dark:border-[#232C4A]'}">हिन्दी</button>
            </div>
          </div>
        ` : ''}
      </div>

      <div class="w-full max-w-md mx-auto space-y-5 pb-2">
        <!-- 3-Page Progress Indicator -->
        <div class="flex items-center justify-center gap-2" role="tablist" aria-label="Onboarding progress">
          ${SLIDES.map((_, idx) => `
            <button type="button" data-ob-dot="${idx}" aria-label="Step ${idx + 1} of 3" class="h-2 rounded-full transition-all ${idx === currentIndex ? 'w-8 bg-[#7457E8]' : 'w-2 bg-[#D6DAEA] dark:bg-[#313D63]'}"></button>
          `).join('')}
        </div>

        <div class="flex items-center gap-2.5">
          ${currentIndex > 0 ? `
            <button type="button" id="oneoraObPrevBtn" class="px-5 py-3.5 rounded-2xl bg-white dark:bg-[#151B2F] border border-[#E8EAF2] dark:border-[#232C4A] text-sm font-bold text-[#171B2C] dark:text-[#F5F6FC] min-h-[48px]">Back</button>
          ` : ''}
          <button type="button" id="oneoraObNextBtn" class="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#252B55] via-[#7457E8] to-[#648BFF] text-white text-sm font-extrabold shadow-lg min-h-[48px]">
            ${isLast ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    `;

    overlayEl.querySelector('#oneoraObSkipBtn')?.addEventListener('click', () => closeOnboarding(true));
    overlayEl.querySelector('#oneoraObPrevBtn')?.addEventListener('click', () => {
      if (currentIndex > 0) {
        currentIndex--;
        renderSlide();
      }
    });
    overlayEl.querySelector('#oneoraObNextBtn')?.addEventListener('click', () => {
      if (isLast) {
        closeOnboarding(true);
      } else {
        currentIndex++;
        renderSlide();
      }
    });
    overlayEl.querySelectorAll('[data-ob-dot]').forEach((dot) => {
      dot.addEventListener('click', () => {
        currentIndex = Number(dot.getAttribute('data-ob-dot')) || 0;
        renderSlide();
      });
    });
    overlayEl.querySelectorAll('[data-ob-lang]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const lang = btn.getAttribute('data-ob-lang');
        if (!lang) return;
        try { localStorage.setItem('pdfBondhuLang', lang); } catch {}
        if (global.pdfBondhuI18n && typeof global.pdfBondhuI18n.setLanguage === 'function') {
          global.pdfBondhuI18n.setLanguage(lang);
        }
        renderSlide();
      });
    });
  }

  function openOnboarding(startAt = 0) {
    if (overlayEl) overlayEl.remove();
    currentIndex = Math.max(0, Math.min(SLIDES.length - 1, startAt));
    overlayEl = document.createElement('div');
    overlayEl.id = 'oneoraOnboardingOverlay';
    overlayEl.className = 'oneora-onboarding-overlay';
    overlayEl.setAttribute('role', 'dialog');
    overlayEl.setAttribute('aria-modal', 'true');
    overlayEl.setAttribute('aria-label', 'Welcome to ONEORA');
    document.body.appendChild(overlayEl);
    document.body.style.overflow = 'hidden';
    renderSlide();
  }

  global.OneoraOnboarding = {
    open: () => openOnboarding(0),
    close: () => closeOnboarding(true)
  };

  document.addEventListener('DOMContentLoaded', () => {
    // Wire Replay Onboarding button in Profile & Settings
    document.getElementById('settingsReplayOnboardingBtn')?.addEventListener('click', () => {
      openOnboarding(0);
    });

    // Never block existing users upgrading from PDF Bondhu; only show on true first launch
    let alreadyDone = false;
    try { alreadyDone = localStorage.getItem(DONE_KEY) === '1'; } catch {}
    if (!alreadyDone) {
      if (isExistingUserUpgrade()) {
        try { localStorage.setItem(DONE_KEY, '1'); } catch {}
      } else {
        openOnboarding(0);
      }
    }
  });
})(window);
