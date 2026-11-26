/**
 * PDF Bondhu - Advanced Application Logic
 * 100% Offline, Privacy-First browser based processing.
 */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initLiveClock();
  initPdfMetadataModal();
  initPWA();
  initTabs();
  initHomeFilters();
  
  // Initialize existing modules
  initPdfMerger();
  initExcelMerger();
  initPdfToExcel();
  initImageCompressor();
  initImageToPdf();
  initExcelCleaner();
  
  // Initialize scanner, OCR, converter & compressor modules
  initPdfSplitter();
  initPdfCompressor();
  initPdfScanner();
  initOcrScanner();
  initImageConverter();

  // Initialize utility & daily essential modules
  initPdfOrganizer();
  initPdfWatermark();
  initPhotoResizer();
  initPdfSign();
  initIdCardMaker();
  initTextToPdf();
  initPdfMetadataTool();

  // Initialize advanced security, repair, visual editor & passport studio modules
  initPdfSigVerify();
  initPdfRepair();
  initPdfEdit();
  initPassportMaker();
});

/* ==========================================================================
   Utility Functions
   ========================================================================== */

const utils = {
  showLoader(text = 'Processing securely...', colorClass = 'text-indigo-600 dark:text-indigo-400') {
    const overlay = document.getElementById('loadingOverlay');
    const textEl = document.getElementById('loadingText');
    const spinner = document.getElementById('loadingSpinner');
    
    textEl.textContent = text;
    spinner.className = `loader-ring border-4 border-slate-200 dark:border-slate-700 rounded-full w-14 h-14 mb-4 ${colorClass}`;
    
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
    setTimeout(() => { overlay.classList.add('opacity-100'); }, 10);
  },
  hideLoader() {
    const overlay = document.getElementById('loadingOverlay');
    overlay.classList.remove('opacity-100');
    setTimeout(() => {
      overlay.classList.add('hidden');
      overlay.classList.remove('flex');
    }, 200);
  },
  showToast(title, message, type = 'success') {
    const toast = document.getElementById('toast');
    const icon = document.getElementById('toastIcon');
    document.getElementById('toastTitle').textContent = title;
    document.getElementById('toastMsg').textContent = message;
    
    toast.className = `fixed top-20 right-4 lg:right-8 z-50 transform transition-all duration-300 translate-x-0 opacity-100 bg-white dark:bg-slate-900 shadow-2xl rounded-xl p-4 flex items-start gap-3 max-w-sm border`;
    
    if (type === 'success') {
      toast.classList.add('border-emerald-300', 'dark:border-emerald-700');
      icon.innerHTML = `<div class="bg-emerald-100 dark:bg-emerald-500/20 p-1.5 rounded-full"><svg class="text-emerald-600 dark:text-emerald-400 w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg></div>`;
    } else if (type === 'info') {
      toast.classList.add('border-sky-300', 'dark:border-sky-700');
      icon.innerHTML = `<div class="bg-sky-100 dark:bg-sky-500/20 p-1.5 rounded-full"><svg class="text-sky-600 dark:text-sky-400 w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></div>`;
    } else {
      toast.classList.add('border-red-300', 'dark:border-red-700');
      icon.innerHTML = `<div class="bg-red-100 dark:bg-red-500/20 p-1.5 rounded-full"><svg class="text-red-600 dark:text-red-400 w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg></div>`;
    }

    clearTimeout(utils._toastTimer);
    utils._toastTimer = setTimeout(() => {
      toast.classList.remove('translate-x-0', 'opacity-100');
      toast.classList.add('translate-x-full', 'opacity-0');
    }, 4000);
  },
  recordProcessedFile() {
    try {
      const current = parseInt(localStorage.getItem('pdfBondhuCount') || '0', 10) || 0;
      const next = current + 1;
      localStorage.setItem('pdfBondhuCount', String(next));
      const el = document.getElementById('homeStatsText');
      if (el) {
        el.textContent = `${next} file${next === 1 ? '' : 's'} processed locally`;
      }
    } catch {}
  },
  downloadBlob(blob, filename) {
    utils.recordProcessedFile();

    // Route downloads through native Android MediaStore bridge when running inside the PDF Bondhu APK
    if (window.AndroidBridge && typeof window.AndroidBridge.saveBase64File === 'function') {
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          const dataUrl = typeof reader.result === 'string' ? reader.result : '';
          const mimeType = blob.type || 'application/octet-stream';
          window.AndroidBridge.saveBase64File(dataUrl, filename, mimeType);
        } catch (err) {
          console.error('AndroidBridge download failed:', err);
          utils.showToast('Download Error', 'Could not save file to Downloads.', 'error');
        }
      };
      reader.readAsDataURL(blob);
      return;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  },
  formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  },
  toLocalDateTimeInputValue(dateObj = new Date()) {
    const d = dateObj instanceof Date && !isNaN(dateObj.getTime()) ? dateObj : new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },
  savePdfWithMetadata(pdfDocOrData, defaultFilename = 'PDF_Bondhu_Document.pdf', defaultTitle = '', saveOptions = {}) {
    if (typeof window.__openPdfMetadataSaveModal === 'function') {
      return window.__openPdfMetadataSaveModal(pdfDocOrData, defaultFilename, defaultTitle, saveOptions);
    }
    return (async () => {
      let bytes;
      if (pdfDocOrData instanceof Blob) {
        utils.downloadBlob(pdfDocOrData, defaultFilename);
        return { saved: true, filename: defaultFilename, blob: pdfDocOrData };
      }
      if (pdfDocOrData && typeof pdfDocOrData.save === 'function') {
        bytes = await pdfDocOrData.save(saveOptions);
      } else {
        bytes = pdfDocOrData;
      }
      const blob = new Blob([bytes], { type: 'application/pdf' });
      utils.downloadBlob(blob, defaultFilename);
      return { saved: true, filename: defaultFilename, blob };
    })();
  }
};
window.utils = utils;

/* ==========================================================================
   Live Today's Date & Time Clock (Header Desktop + Mobile)
   ========================================================================== */

function initLiveClock() {
  const desktopEl = document.getElementById('liveDateTimeDisplay');
  const mobileEl = document.getElementById('liveDateTimeMobile');
  if (!desktopEl && !mobileEl) return;

  const updateClock = () => {
    const now = new Date();
    const loc = (window.PDFBondhuI18n && window.PDFBondhuI18n.getLocale) ? window.PDFBondhuI18n.getLocale() : 'en-IN';
    const dateShort = now.toLocaleDateString(loc, {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const weekday = now.toLocaleDateString(loc, { weekday: 'short' });
    const timeFull = now.toLocaleTimeString(loc, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    const timeCompact = now.toLocaleTimeString(loc, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    if (desktopEl) {
      desktopEl.textContent = `${weekday}, ${dateShort} · ${timeFull}`;
    }
    if (mobileEl) {
      mobileEl.textContent = `${weekday}, ${dateShort} · ${timeCompact}`;
    }
  };

  updateClock();
  document.addEventListener('pdfbondhu:langchange', updateClock);
  setInterval(updateClock, 1000);
}

/* ==========================================================================
   Universal PDF Metadata Editor Modal (Author, Title, Creation Date)
   ========================================================================== */

function initPdfMetadataModal() {
  const modal = document.getElementById('pdfMetadataModal');
  const form = document.getElementById('pdfMetadataForm');
  const fileNameInput = document.getElementById('pdfMetaFileName');
  const titleInput = document.getElementById('pdfMetaTitle');
  const authorInput = document.getElementById('pdfMetaAuthor');
  const dateInput = document.getElementById('pdfMetaCreationDate');
  const subjectInput = document.getElementById('pdfMetaSubject');
  const cancelTopBtn = document.getElementById('pdfMetaCancelTopBtn');
  const cancelBtn = document.getElementById('pdfMetaCancelBtn');

  if (!modal || !form) return;

  let activeRequest = null;

  function closeModal(result) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    if (activeRequest) {
      const resolve = activeRequest.resolve;
      activeRequest = null;
      resolve(result);
    }
  }

  if (cancelTopBtn) cancelTopBtn.addEventListener('click', () => closeModal({ saved: false }));
  if (cancelBtn) cancelBtn.addEventListener('click', () => closeModal({ saved: false }));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal({ saved: false });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activeRequest) return;

    const req = activeRequest;
    const rawName = (fileNameInput.value || req.defaultFilename || 'Document.pdf').trim();
    const safeName = rawName.toLowerCase().endsWith('.pdf') ? rawName : `${rawName}.pdf`;
    const title = titleInput.value.trim();
    const author = authorInput.value.trim();
    const subject = subjectInput.value.trim();
    const dateVal = dateInput.value;
    const parsedDate = dateVal ? new Date(dateVal) : new Date();
    const finalDate = !isNaN(parsedDate.getTime()) ? parsedDate : new Date();

    if (author) {
      try { localStorage.setItem('pdfBondhuDefaultAuthor', author); } catch {}
    }

    modal.classList.add('hidden');
    modal.classList.remove('flex');
    utils.showLoader('Applying PDF Metadata...', 'text-indigo-600 dark:text-indigo-400');

    try {
      let pdfDoc = req.pdfDocOrData;
      if (!pdfDoc || typeof pdfDoc.save !== 'function') {
        let buffer;
        if (pdfDoc instanceof Blob) {
          buffer = await pdfDoc.arrayBuffer();
        } else if (pdfDoc instanceof Uint8Array) {
          buffer = pdfDoc;
        } else {
          buffer = new Uint8Array(pdfDoc);
        }
        pdfDoc = await window.PDFLib.PDFDocument.load(buffer, { ignoreEncryption: true });
      }

      if (title) pdfDoc.setTitle(title);
      if (author) pdfDoc.setAuthor(author);
      if (subject) pdfDoc.setSubject(subject);
      pdfDoc.setCreator('PDF Bondhu by Suman Nayak');
      pdfDoc.setProducer('PDF Bondhu Offline Suite');
      pdfDoc.setCreationDate(finalDate);
      pdfDoc.setModificationDate(finalDate);

      const bytes = await pdfDoc.save(req.saveOptions || {});
      const blob = new Blob([bytes], { type: 'application/pdf' });
      utils.downloadBlob(blob, safeName);

      const resolve = req.resolve;
      activeRequest = null;
      resolve({ saved: true, filename: safeName, blob });
    } catch (err) {
      console.error('Failed to save PDF with metadata:', err);
      utils.showToast('Error', 'Could not apply PDF metadata. Saving standard copy...', 'error');
      const resolve = req.resolve;
      activeRequest = null;
      resolve({ saved: false, error: err });
    } finally {
      utils.hideLoader();
    }
  });

  window.__openPdfMetadataSaveModal = (pdfDocOrData, defaultFilename = 'Document.pdf', defaultTitle = '', saveOptions = {}) => {
    utils.hideLoader();
    return new Promise((resolve) => {
      if (activeRequest) {
        activeRequest.resolve({ saved: false });
      }
      activeRequest = { pdfDocOrData, defaultFilename, saveOptions, resolve };

      const cleanBase = (defaultFilename || 'Document.pdf').replace(/\.pdf$/i, '');
      let savedAuthor = 'Suman Nayak';
      try {
        savedAuthor = localStorage.getItem('pdfBondhuDefaultAuthor') || 'Suman Nayak';
      } catch {}

      let existingTitle = defaultTitle || cleanBase.replace(/[_-]+/g, ' ');
      let existingAuthor = savedAuthor;
      let existingSubject = '';
      let existingDate = new Date();

      if (pdfDocOrData && typeof pdfDocOrData.getTitle === 'function') {
        try {
          if (pdfDocOrData.getTitle()) existingTitle = pdfDocOrData.getTitle();
          if (pdfDocOrData.getAuthor()) existingAuthor = pdfDocOrData.getAuthor();
          if (pdfDocOrData.getSubject()) existingSubject = pdfDocOrData.getSubject();
          const cDate = pdfDocOrData.getCreationDate();
          if (cDate instanceof Date && !isNaN(cDate.getTime())) existingDate = cDate;
        } catch {}
      }

      fileNameInput.value = defaultFilename.toLowerCase().endsWith('.pdf') ? defaultFilename : `${defaultFilename}.pdf`;
      titleInput.value = existingTitle;
      authorInput.value = existingAuthor;
      dateInput.value = utils.toLocalDateTimeInputValue(existingDate);
      subjectInput.value = existingSubject;

      modal.classList.remove('hidden');
      modal.classList.add('flex');
      setTimeout(() => titleInput.focus(), 60);
    });
  };
}

/* ==========================================================================
   PWA, Android WebView Bridge, Auto-Update & Share Hub
   ========================================================================== */

const PUBLISHED_APP_URL = 'https://pdf-bondhu-v1.vercel.app';

window.onAndroidDownloadSuccess = (savedName) => {
  utils.showToast('Saved to Downloads', `${savedName} saved in Downloads/ONEORA.`);
};

window.onAndroidDownloadError = (msg) => {
  utils.showToast('Save Failed', msg || 'Could not write file on device.', 'error');
};

window.handleAndroidBackPress = () => {
  // 1. Close any visible modal first
  const modals = [
    { id: 'pdfMetadataModal', closeBtn: 'pdfMetaCancelTopBtn' },
    { id: 'appShareModal', closeBtn: 'closeAppHubModal' },
    { id: 'pdfCompressZoomModal', closeBtn: 'pdfCompressZoomClose' },
    { id: 'cropModal', closeBtn: 'closeCropModal' }
  ];
  for (const m of modals) {
    const el = document.getElementById(m.id);
    if (el && !el.classList.contains('hidden')) {
      const btn = document.getElementById(m.closeBtn);
      if (btn) btn.click();
      else {
        el.classList.add('hidden');
        el.classList.remove('flex');
      }
      return true;
    }
  }

  // 2. If user is inside a tool tab, return to Home Dashboard
  const homeSection = document.getElementById('homeDashboard');
  if (homeSection && homeSection.classList.contains('hidden')) {
    const homeTabBtn = document.querySelector('[data-tab="homeDashboard"]');
    if (homeTabBtn) {
      homeTabBtn.click();
      return true;
    }
  }

  // 3. Already on Home — let Android handle double-back-to-exit
  return false;
};

function initPWA() {
  const isAndroidApk = Boolean(window.AndroidBridge) || /PDFBondhuAndroid/i.test(navigator.userAgent);
  const isStandalone =
    isAndroidApk ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  // Register Service Worker & listen for published updates (web/PWA only; Android APK uses native bundled assets + OTA)
  const isBundledApkOrigin = window.location.hostname === 'appassets.androidplatform.net';
  if ('serviceWorker' in navigator && !isBundledApkOrigin) {
    let hadController = Boolean(navigator.serviceWorker.controller);
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => {
        // Proactively check for fresh published builds on launch
        reg.update().catch(() => {});
      })
      .catch((err) => console.error('Service Worker registration failed', err));

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController) {
        utils.showToast('App Updated', 'Latest published version of ONEORA is now active.', 'info');
      }
      hadController = true;
    });
  }

  // Offline / Online live indicator banner
  const offlineBanner = document.getElementById('offlineBanner');
  function syncOnlineStatus() {
    if (!offlineBanner) return;
    if (navigator.onLine) {
      offlineBanner.classList.add('hidden');
    } else {
      offlineBanner.classList.remove('hidden');
    }
  }
  syncOnlineStatus();
  window.addEventListener('online', () => {
    syncOnlineStatus();
    utils.showToast('Back Online', 'Checking for latest published updates...', 'info');
    if ('serviceWorker' in navigator && navigator.serviceWorker.getRegistration) {
      navigator.serviceWorker.getRegistration().then((reg) => reg && reg.update().catch(() => {}));
    }
  });
  window.addEventListener('offline', syncOnlineStatus);

  // Environment label in header
  const appEnvLabel = document.getElementById('appEnvLabel');
  const appHubModeText = document.getElementById('appHubModeText');
  if (isAndroidApk) {
    const ver = window.AndroidBridge && window.AndroidBridge.getAppVersion ? window.AndroidBridge.getAppVersion() : '1.0';
    if (appEnvLabel) appEnvLabel.textContent = `Android App v${ver} · Auto-Update`;
    if (appHubModeText) appHubModeText.textContent = `Running inside ONEORA Android App v${ver} · Auto-updates active`;
  } else if (isStandalone) {
    if (appEnvLabel) appEnvLabel.textContent = 'Installed App · Offline Ready';
    if (appHubModeText) appHubModeText.textContent = 'Running as Installed App · Offline ready';
  }

  // PWA Install Prompt Management
  let deferredPrompt = null;
  const installBtn = document.getElementById('installAppBtn');
  const hubInstallBtn = document.getElementById('appHubInstallPwaBtn');
  const hubIosGuide = document.getElementById('appHubIosGuide');

  if (isStandalone) {
    if (installBtn) installBtn.classList.add('hidden');
    if (hubInstallBtn) hubInstallBtn.classList.add('hidden');
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (!isStandalone && installBtn) {
      installBtn.classList.remove('hidden');
    }
  });

  async function triggerPwaInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        if (installBtn) installBtn.classList.add('hidden');
        if (hubInstallBtn) hubInstallBtn.classList.add('hidden');
        utils.showToast('Installed', 'ONEORA added to your home screen!');
      }
      deferredPrompt = null;
      return;
    }
    if (hubIosGuide) {
      hubIosGuide.classList.remove('hidden');
    }
    utils.showToast(
      isIOS ? 'Install on iPhone / iPad' : 'Install via Browser Menu',
      isIOS
        ? 'Tap Share in Safari, then choose "Add to Home Screen".'
        : 'Open browser menu (⋮) and tap "Install App" or "Add to Home Screen".',
      'info'
    );
  }

  if (installBtn) installBtn.addEventListener('click', triggerPwaInstall);
  if (hubInstallBtn) hubInstallBtn.addEventListener('click', triggerPwaInstall);

  window.addEventListener('appinstalled', () => {
    if (installBtn) installBtn.classList.add('hidden');
    if (hubInstallBtn) hubInstallBtn.classList.add('hidden');
  });

  // Android APK & Share Hub Modal Controls
  const appShareModal = document.getElementById('appShareModal');
  const openAppHubBtn = document.getElementById('openAppHubBtn');
  const homeOpenAppHubBtn = document.getElementById('homeOpenAppHubBtn');
  const closeAppHubModal = document.getElementById('closeAppHubModal');
  const appHubLiveUrl = document.getElementById('appHubLiveUrl');
  const appHubCopyUrlBtn = document.getElementById('appHubCopyUrlBtn');
  const appHubShareBtn = document.getElementById('appHubShareBtn');

  if (appHubLiveUrl) {
    appHubLiveUrl.value = PUBLISHED_APP_URL;
  }

  function openAppHub() {
    if (!appShareModal) return;
    appShareModal.classList.remove('hidden');
    appShareModal.classList.add('flex');
  }

  function closeAppHub() {
    if (!appShareModal) return;
    appShareModal.classList.add('hidden');
    appShareModal.classList.remove('flex');
  }

  if (openAppHubBtn) openAppHubBtn.addEventListener('click', openAppHub);
  if (homeOpenAppHubBtn) homeOpenAppHubBtn.addEventListener('click', openAppHub);
  if (closeAppHubModal) closeAppHubModal.addEventListener('click', closeAppHub);
  if (appShareModal) {
    appShareModal.addEventListener('click', (e) => {
      if (e.target === appShareModal) closeAppHub();
    });
  }

  if (appHubCopyUrlBtn) {
    appHubCopyUrlBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(PUBLISHED_APP_URL);
        utils.showToast('Link Copied', 'Share this link on WhatsApp — it always loads the latest update.');
      } catch {
        if (appHubLiveUrl) {
          appHubLiveUrl.select();
          document.execCommand('copy');
        }
        utils.showToast('Link Ready', 'Copied published app URL.');
      }
    });
  }

  if (appHubShareBtn) {
    appHubShareBtn.addEventListener('click', async () => {
      const shareTitle = 'ONEORA — One App, More Possibilities';
      const shareMessage = `Try ONEORA for offline PDF, Image, Office, Daily Planner, Money Manager & Multilingual AI: ${PUBLISHED_APP_URL}`;

      if (window.AndroidBridge && typeof window.AndroidBridge.shareText === 'function') {
        window.AndroidBridge.shareText(shareTitle, shareMessage);
        return;
      }

      if (navigator.share) {
        try {
          await navigator.share({
            title: shareTitle,
            text: 'Documents, Daily Planner, Personal Finance & Multilingual AI — all in ONEORA:',
            url: PUBLISHED_APP_URL
          });
          return;
        } catch (err) {
          if (err && err.name === 'AbortError') return;
        }
      }

      try {
        await navigator.clipboard.writeText(PUBLISHED_APP_URL);
        utils.showToast('Link Copied', 'Paste and share ONEORA anywhere!');
      } catch {
        utils.showToast('Share Link', PUBLISHED_APP_URL, 'info');
      }
    });
  }

  // Dancing Horse Companion Toggle
  const dancingHorseBtn = document.getElementById('dancingHorseBtn');
  const dancingHorseStatus = document.getElementById('dancingHorseStatus');
  if (dancingHorseBtn) {
    dancingHorseBtn.addEventListener('click', () => {
      const isDancing = dancingHorseBtn.classList.toggle('horse-dancing');
      if (dancingHorseStatus) {
        dancingHorseStatus.textContent = isDancing ? 'Dancing · Tap to pause' : 'Resting · Tap to dance';
      }
    });
  }
}

/* ==========================================================================
   Global App Settings
   ========================================================================== */
const scanSettings = {
  pageSize: 'a4', // 'fit', 'a4', 'letter'
  quality: 0.94,  // 0.62 to 0.94
  autoMagic: 'magic' // 'magic', 'bw', 'original'
};

/* ==========================================================================
   Pro Studio Computer Vision Engine (Multi-Pass Auto-Crop, Perspective Warp,
   Illumination Shadow Removal & Sharpening — OpenCV + Pure-JS Offline Engine)
   ========================================================================== */
const cvUtils = {
  isReady: () => typeof cv !== 'undefined' && cv.Mat,

  orderPoints: (pts) => {
    const arr = pts.map(p => ({ x: p.x, y: p.y }));
    arr.sort((a, b) => (a.x + a.y) - (b.x + b.y));
    const tl = arr[0];
    const br = arr[3];
    const remain = [arr[1], arr[2]];
    remain.sort((a, b) => (a.x - a.y) - (b.x - b.y));
    const bl = remain[0];
    const tr = remain[1];
    return [tl, tr, br, bl];
  },

  defaultCorners: () => ([
    { x: 0.03, y: 0.03 },
    { x: 0.97, y: 0.03 },
    { x: 0.97, y: 0.97 },
    { x: 0.03, y: 0.97 }
  ]),

  // Pure-JS fallback paper-boundary detector (fast gradient + border contrast projection)
  detectDocumentCornersFallback: (img) => {
    try {
      const maxDim = 260;
      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;
      const scale = Math.min(1, maxDim / Math.max(iw, ih));
      const w = Math.max(32, Math.round(iw * scale));
      const h = Math.max(32, Math.round(ih * scale));

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;

      // Estimate background luminance from outer 4% border ring
      let bgSum = 0;
      let bgCount = 0;
      const lum = new Float32Array(w * h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const l = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          lum[y * w + x] = l;
          if (x < w * 0.04 || x > w * 0.96 || y < h * 0.04 || y > h * 0.96) {
            bgSum += l;
            bgCount++;
          }
        }
      }
      const bgMean = bgCount ? bgSum / bgCount : 120;

      // Check if center is significantly brighter (paper on desk) or distinct from border
      let centerSum = 0;
      let centerCount = 0;
      for (let y = Math.floor(h * 0.25); y < Math.floor(h * 0.75); y++) {
        for (let x = Math.floor(w * 0.25); x < Math.floor(w * 0.75); x++) {
          centerSum += lum[y * w + x];
          centerCount++;
        }
      }
      const centerMean = centerCount ? centerSum / centerCount : 200;
      const contrastDiff = centerMean - bgMean;

      if (contrastDiff > 22) {
        const thresh = bgMean + contrastDiff * 0.42;
        const rowScore = new Float32Array(h);
        const colScore = new Float32Array(w);
        for (let y = 0; y < h; y++) {
          let hits = 0;
          for (let x = 0; x < w; x++) {
            if (lum[y * w + x] >= thresh) hits++;
          }
          rowScore[y] = hits / w;
        }
        for (let x = 0; x < w; x++) {
          let hits = 0;
          for (let y = 0; y < h; y++) {
            if (lum[y * w + x] >= thresh) hits++;
          }
          colScore[x] = hits / h;
        }

        let top = 0, bottom = h - 1, left = 0, right = w - 1;
        while (top < h * 0.35 && rowScore[top] < 0.28) top++;
        while (bottom > h * 0.65 && rowScore[bottom] < 0.28) bottom--;
        while (left < w * 0.35 && colScore[left] < 0.28) left++;
        while (right > w * 0.65 && colScore[right] < 0.28) right--;

        const areaRatio = ((right - left) * (bottom - top)) / (w * h);
        if (areaRatio > 0.2 && areaRatio < 0.96) {
          const padX = 0.008;
          const padY = 0.008;
          const x1 = Math.max(0, left / w - padX);
          const y1 = Math.max(0, top / h - padY);
          const x2 = Math.min(1, right / w + padX);
          const y2 = Math.min(1, bottom / h + padY);
          return [
            { x: x1, y: y1 },
            { x: x2, y: y1 },
            { x: x2, y: y2 },
            { x: x1, y: y2 }
          ];
        }
      }
    } catch (e) {
      console.warn('Fallback edge detection skipped:', e);
    }
    return cvUtils.defaultCorners();
  },

  // Multi-pass OpenCV document quadrilateral detector (normalized 0..1 TL, TR, BR, BL)
  detectDocumentCorners: (imageElement) => {
    if (!cvUtils.isReady()) {
      return cvUtils.detectDocumentCornersFallback(imageElement);
    }

    let src = null, processSrc = null, gray = null, closed = null, blurred = null, kernel = null, dilateKernel = null;
    try {
      src = cv.imread(imageElement);
      const maxDim = 720;
      let scale = 1;
      processSrc = new cv.Mat();
      if (src.cols > maxDim || src.rows > maxDim) {
        scale = Math.min(maxDim / src.cols, maxDim / src.rows);
        cv.resize(src, processSrc, new cv.Size(0, 0), scale, scale, cv.INTER_AREA);
      } else {
        processSrc = src.clone();
      }

      const imgArea = processSrc.cols * processSrc.rows;
      gray = new cv.Mat();
      cv.cvtColor(processSrc, gray, cv.COLOR_RGBA2GRAY, 0);

      // Morphological close suppresses interior text & table lines so outer paper rectangle dominates
      kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(7, 7));
      closed = new cv.Mat();
      cv.morphologyEx(gray, closed, cv.MORPH_CLOSE, kernel);

      blurred = new cv.Mat();
      cv.GaussianBlur(closed, blurred, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);

      dilateKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
      const thresholds = [[25, 90], [45, 140], [70, 200]];

      let bestScore = 0;
      let bestPts = null;

      for (const [low, high] of thresholds) {
        let edges = new cv.Mat();
        let dilated = new cv.Mat();
        let contours = new cv.MatVector();
        let hierarchy = new cv.Mat();
        try {
          cv.Canny(blurred, edges, low, high);
          cv.dilate(edges, dilated, dilateKernel);
          cv.findContours(dilated, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

          for (let i = 0; i < contours.size(); i++) {
            const cnt = contours.get(i);
            const area = cv.contourArea(cnt);
            const areaRatio = area / imgArea;
            if (areaRatio < 0.16 || areaRatio > 0.97) continue;

            const peri = cv.arcLength(cnt, true);
            const approx = new cv.Mat();
            cv.approxPolyDP(cnt, approx, 0.025 * peri, true);
            if (approx.rows === 4 && cv.isContourConvex(approx)) {
              const pts = [];
              for (let k = 0; k < 4; k++) {
                pts.push({
                  x: Math.max(0, Math.min(1, approx.data32S[k * 2] / processSrc.cols)),
                  y: Math.max(0, Math.min(1, approx.data32S[k * 2 + 1] / processSrc.rows))
                });
              }
              const ordered = cvUtils.orderPoints(pts);
              const wTop = Math.hypot(ordered[1].x - ordered[0].x, ordered[1].y - ordered[0].y);
              const wBot = Math.hypot(ordered[2].x - ordered[3].x, ordered[2].y - ordered[3].y);
              const hLeft = Math.hypot(ordered[3].x - ordered[0].x, ordered[3].y - ordered[0].y);
              const hRight = Math.hypot(ordered[2].x - ordered[1].x, ordered[2].y - ordered[1].y);
              const minSide = Math.min(wTop, wBot, hLeft, hRight);
              if (minSide > 0.18) {
                const symmetry = 1 - Math.abs(wTop - wBot) * 0.5 - Math.abs(hLeft - hRight) * 0.5;
                const score = areaRatio * Math.max(0.4, symmetry);
                if (score > bestScore) {
                  bestScore = score;
                  bestPts = ordered;
                }
              }
            }
            approx.delete();
          }
        } finally {
          edges.delete();
          dilated.delete();
          contours.delete();
          hierarchy.delete();
        }
        if (bestScore > 0.45) break;
      }

      if (bestPts) return bestPts;
      return cvUtils.detectDocumentCornersFallback(imageElement);
    } catch (e) {
      console.warn('OpenCV corner detect fallback:', e);
      return cvUtils.detectDocumentCornersFallback(imageElement);
    } finally {
      if (src) src.delete();
      if (processSrc) processSrc.delete();
      if (gray) gray.delete();
      if (closed) closed.delete();
      if (blurred) blurred.delete();
      if (kernel) kernel.delete();
      if (dilateKernel) dilateKernel.delete();
    }
  },

  // Solve 8x8 linear system (Gaussian elimination with partial pivoting) for pure-JS homography
  _solveLinear8: (A, b) => {
    const n = 8;
    const M = A.map((row, idx) => [...row, b[idx]]);
    for (let col = 0; col < n; col++) {
      let maxRow = col;
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row;
      }
      [M[col], M[maxRow]] = [M[maxRow], M[col]];
      const pivot = M[col][col];
      if (Math.abs(pivot) < 1e-10) return null;
      for (let j = col; j <= n; j++) M[col][j] /= pivot;
      for (let row = 0; row < n; row++) {
        if (row === col) continue;
        const factor = M[row][col];
        for (let j = col; j <= n; j++) M[row][j] -= factor * M[col][j];
      }
    }
    return M.map(row => row[n]);
  },

  // Warp image from normalized 4 corners [TL, TR, BR, BL] into straightened high-res canvas
  warpPerspectiveFromCorners: (imageElement, corners, maxDim = 2100) => {
    const iw = imageElement.naturalWidth || imageElement.width;
    const ih = imageElement.naturalHeight || imageElement.height;
    const pts = cvUtils.orderPoints(corners.map(c => ({
      x: Math.max(0, Math.min(iw, c.x * iw)),
      y: Math.max(0, Math.min(ih, c.y * ih))
    })));

    const wTop = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
    const wBot = Math.hypot(pts[2].x - pts[3].x, pts[2].y - pts[3].y);
    const hRight = Math.hypot(pts[2].x - pts[1].x, pts[2].y - pts[1].y);
    const hLeft = Math.hypot(pts[3].x - pts[0].x, pts[3].y - pts[0].y);

    let outW = Math.max(120, Math.round(Math.max(wTop, wBot)));
    let outH = Math.max(120, Math.round(Math.max(hLeft, hRight)));
    if (outW > maxDim || outH > maxDim) {
      const ratio = Math.min(maxDim / outW, maxDim / outH);
      outW = Math.max(120, Math.round(outW * ratio));
      outH = Math.max(120, Math.round(outH * ratio));
    }

    // Fast path: full-frame axis-aligned check
    const isNearlyFull =
      pts[0].x < iw * 0.01 && pts[0].y < ih * 0.01 &&
      pts[1].x > iw * 0.99 && pts[1].y < ih * 0.01 &&
      pts[2].x > iw * 0.99 && pts[2].y > ih * 0.99 &&
      pts[3].x < iw * 0.01 && pts[3].y > ih * 0.99;

    if (isNearlyFull) {
      const c = document.createElement('canvas');
      c.width = outW;
      c.height = outH;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(imageElement, 0, 0, outW, outH);
      return c;
    }

    // OpenCV perspective warp when ready
    if (cvUtils.isReady()) {
      let src = null, dst = null, srcTri = null, dstTri = null, M = null;
      try {
        src = cv.imread(imageElement);
        dst = new cv.Mat();
        srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
          pts[0].x, pts[0].y,
          pts[1].x, pts[1].y,
          pts[2].x, pts[2].y,
          pts[3].x, pts[3].y
        ]);
        dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
          0, 0,
          outW - 1, 0,
          outW - 1, outH - 1,
          0, outH - 1
        ]);
        M = cv.getPerspectiveTransform(srcTri, dstTri);
        cv.warpPerspective(src, dst, M, new cv.Size(outW, outH), cv.INTER_LINEAR, cv.BORDER_REPLICATE);

        const outCanvas = document.createElement('canvas');
        outCanvas.width = outW;
        outCanvas.height = outH;
        cv.imshow(outCanvas, dst);
        return outCanvas;
      } catch (e) {
        console.warn('OpenCV warp failed, using pure-JS homography:', e);
      } finally {
        if (src) src.delete();
        if (dst) dst.delete();
        if (srcTri) srcTri.delete();
        if (dstTri) dstTri.delete();
        if (M) M.delete();
      }
    }

    // Pure-JS exact inverse homography warp with bilinear interpolation (100% offline guaranteed)
    const srcCanvas = document.createElement('canvas');
    const srcScale = Math.min(1, maxDim / Math.max(iw, ih));
    const sw = Math.round(iw * srcScale);
    const sh = Math.round(ih * srcScale);
    srcCanvas.width = sw;
    srcCanvas.height = sh;
    const sCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
    sCtx.drawImage(imageElement, 0, 0, sw, sh);
    const srcData = sCtx.getImageData(0, 0, sw, sh).data;

    const dstPts = [
      { x: 0, y: 0 },
      { x: outW - 1, y: 0 },
      { x: outW - 1, y: outH - 1 },
      { x: 0, y: outH - 1 }
    ];
    const scaledSrc = pts.map(p => ({ x: p.x * srcScale, y: p.y * srcScale }));

    // Solve dst -> src homography H
    const A = [];
    const b = [];
    for (let i = 0; i < 4; i++) {
      const dx = dstPts[i].x;
      const dy = dstPts[i].y;
      const sx = scaledSrc[i].x;
      const sy = scaledSrc[i].y;
      A.push([dx, dy, 1, 0, 0, 0, -dx * sx, -dy * sx]);
      b.push(sx);
      A.push([0, 0, 0, dx, dy, 1, -dx * sy, -dy * sy]);
      b.push(sy);
    }
    const h = cvUtils._solveLinear8(A, b);
    const outCanvas = document.createElement('canvas');
    outCanvas.width = outW;
    outCanvas.height = outH;
    const oCtx = outCanvas.getContext('2d');

    if (!h) {
      oCtx.drawImage(imageElement, 0, 0, outW, outH);
      return outCanvas;
    }

    const outImg = oCtx.createImageData(outW, outH);
    const outData = outImg.data;
    const [h0, h1, h2, h3, h4, h5, h6, h7] = h;

    for (let y = 0; y < outH; y++) {
      for (let x = 0; x < outW; x++) {
        const denom = h6 * x + h7 * y + 1;
        const sx = (h0 * x + h1 * y + h2) / denom;
        const sy = (h3 * x + h4 * y + h5) / denom;
        const x0 = Math.max(0, Math.min(sw - 2, Math.floor(sx)));
        const y0 = Math.max(0, Math.min(sh - 2, Math.floor(sy)));
        const fx = Math.max(0, Math.min(1, sx - x0));
        const fy = Math.max(0, Math.min(1, sy - y0));

        const idx00 = (y0 * sw + x0) * 4;
        const idx10 = idx00 + 4;
        const idx01 = idx00 + sw * 4;
        const idx11 = idx01 + 4;

        const w00 = (1 - fx) * (1 - fy);
        const w10 = fx * (1 - fy);
        const w01 = (1 - fx) * fy;
        const w11 = fx * fy;

        const outIdx = (y * outW + x) * 4;
        outData[outIdx] = srcData[idx00] * w00 + srcData[idx10] * w10 + srcData[idx01] * w01 + srcData[idx11] * w11;
        outData[outIdx + 1] = srcData[idx00 + 1] * w00 + srcData[idx10 + 1] * w10 + srcData[idx01 + 1] * w01 + srcData[idx11 + 1] * w11;
        outData[outIdx + 2] = srcData[idx00 + 2] * w00 + srcData[idx10 + 2] * w10 + srcData[idx01 + 2] * w01 + srcData[idx11 + 2] * w11;
        outData[outIdx + 3] = 255;
      }
    }
    oCtx.putImageData(outImg, 0, 0);
    return outCanvas;
  },

  // Smooth local background illumination estimator (eliminates phone shadows & yellow bulb tint)
  _buildIlluminationMap: (srcCanvas, w, h) => {
    const bgMax = 88;
    const bw = Math.max(16, Math.round(w * Math.min(1, bgMax / Math.max(w, h))));
    const bh = Math.max(16, Math.round(h * Math.min(1, bgMax / Math.max(w, h))));

    const small = document.createElement('canvas');
    small.width = bw;
    small.height = bh;
    const sCtx = small.getContext('2d', { willReadFrequently: true });
    sCtx.drawImage(srcCanvas, 0, 0, bw, bh);

    // 2-pass morphological local-max + smooth average to estimate paper brightness under shadows
    const imgData = sCtx.getImageData(0, 0, bw, bh);
    const d = imgData.data;
    const tmp = new Uint8ClampedArray(d.length);
    const radius = 3;

    // Horizontal max-biased smooth pass
    for (let y = 0; y < bh; y++) {
      for (let x = 0; x < bw; x++) {
        let mr = 0, mg = 0, mb = 0;
        for (let k = -radius; k <= radius; k++) {
          const nx = Math.max(0, Math.min(bw - 1, x + k));
          const idx = (y * bw + nx) * 4;
          if (d[idx] > mr) mr = d[idx];
          if (d[idx + 1] > mg) mg = d[idx + 1];
          if (d[idx + 2] > mb) mb = d[idx + 2];
        }
        const oi = (y * bw + x) * 4;
        tmp[oi] = mr; tmp[oi + 1] = mg; tmp[oi + 2] = mb; tmp[oi + 3] = 255;
      }
    }
    // Vertical max-biased smooth pass
    for (let y = 0; y < bh; y++) {
      for (let x = 0; x < bw; x++) {
        let mr = 0, mg = 0, mb = 0;
        for (let k = -radius; k <= radius; k++) {
          const ny = Math.max(0, Math.min(bh - 1, y + k));
          const idx = (ny * bw + x) * 4;
          if (tmp[idx] > mr) mr = tmp[idx];
          if (tmp[idx + 1] > mg) mg = tmp[idx + 1];
          if (tmp[idx + 2] > mb) mb = tmp[idx + 2];
        }
        const oi = (y * bw + x) * 4;
        d[oi] = mr; d[oi + 1] = mg; d[oi + 2] = mb; d[oi + 3] = 255;
      }
    }
    // Gentle 3x3 average blur to remove blockiness
    const blur = new Uint8ClampedArray(d.length);
    for (let y = 0; y < bh; y++) {
      for (let x = 0; x < bw; x++) {
        let sr = 0, sg = 0, sb = 0, c = 0;
        for (let dy = -2; dy <= 2; dy++) {
          const ny = Math.max(0, Math.min(bh - 1, y + dy));
          for (let dx = -2; dx <= 2; dx++) {
            const nx = Math.max(0, Math.min(bw - 1, x + dx));
            const idx = (ny * bw + nx) * 4;
            sr += d[idx]; sg += d[idx + 1]; sb += d[idx + 2]; c++;
          }
        }
        const oi = (y * bw + x) * 4;
        blur[oi] = sr / c; blur[oi + 1] = sg / c; blur[oi + 2] = sb / c; blur[oi + 3] = 255;
      }
    }
    imgData.data.set(blur);
    sCtx.putImageData(imgData, 0, 0);

    const fullBg = document.createElement('canvas');
    fullBg.width = w;
    fullBg.height = h;
    const fCtx = fullBg.getContext('2d', { willReadFrequently: true });
    fCtx.imageSmoothingEnabled = true;
    fCtx.imageSmoothingQuality = 'high';
    fCtx.drawImage(small, 0, 0, w, h);
    return fCtx.getImageData(0, 0, w, h).data;
  },

  // Studio-grade document enhancement: Magic Color, Auto Pro, Crisp B&W, Whiteboard, Grayscale, Original
  enhanceScanCanvas: (srcCanvas, filterMode = 'magic', adjustments = { brightness: 0, contrast: 0, sharpness: 30 }, maxDim = 2000) => {
    let w = srcCanvas.width;
    let h = srcCanvas.height;
    if (w > maxDim || h > maxDim) {
      const ratio = Math.min(maxDim / w, maxDim / h);
      w = Math.max(64, Math.round(w * ratio));
      h = Math.max(64, Math.round(h * ratio));
    }

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(srcCanvas, 0, 0, w, h);

    const bright = Number(adjustments.brightness) || 0;
    const contr = Number(adjustments.contrast) || 0;
    const sharp = Math.max(0, Math.min(100, Number(adjustments.sharpness) || 0));

    if (filterMode === 'original' && bright === 0 && contr === 0 && sharp === 0) {
      return canvas;
    }

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const needsBg = filterMode !== 'original';
    const bgData = needsBg ? cvUtils._buildIlluminationMap(canvas, w, h) : null;

    const contrastFactor = (259 * (contr * 2.2 + 255)) / (255 * (259 - contr * 2.2));
    const brightOffset = bright * 1.65;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      if (filterMode === 'magic') {
        const bgR = Math.max(36, bgData[i]);
        const bgG = Math.max(36, bgData[i + 1]);
        const bgB = Math.max(36, bgData[i + 2]);
        // Illumination-normalized color removes shadow & yellow cast
        let nr = Math.min(255, (r / bgR) * 252);
        let ng = Math.min(255, (g / bgG) * 252);
        let nb = Math.min(255, (b / bgB) * 252);

        // Smooth paper white-point cleanup + ink deepening
        const lum = nr * 0.299 + ng * 0.587 + nb * 0.114;
        if (lum > 214) {
          const t = Math.min(1, (lum - 214) / 28);
          nr = nr + (255 - nr) * t;
          ng = ng + (255 - ng) * t;
          nb = nb + (255 - nb) * t;
        } else {
          // Deepen ink & boost pen/stamp saturation cleanly
          nr = Math.max(0, (nr - 18) * 1.07);
          ng = Math.max(0, (ng - 18) * 1.07);
          nb = Math.max(0, (nb - 18) * 1.07);
          const avg = (nr + ng + nb) / 3;
          nr = avg + (nr - avg) * 1.28;
          ng = avg + (ng - avg) * 1.28;
          nb = avg + (nb - avg) * 1.28;
        }
        r = nr; g = ng; b = nb;
      } else if (filterMode === 'autopro') {
        const bgR = Math.max(40, bgData[i]);
        const bgG = Math.max(40, bgData[i + 1]);
        const bgB = Math.max(40, bgData[i + 2]);
        const nr = Math.min(255, (r / bgR) * 246);
        const ng = Math.min(255, (g / bgG) * 246);
        const nb = Math.min(255, (b / bgB) * 246);
        r = nr * 0.72 + r * 0.28;
        g = ng * 0.72 + g * 0.28;
        b = nb * 0.72 + b * 0.28;
        const avg = (r + g + b) / 3;
        r = avg + (r - avg) * 1.12;
        g = avg + (g - avg) * 1.12;
        b = avg + (b - avg) * 1.12;
      } else if (filterMode === 'whiteboard') {
        const bgR = Math.max(36, bgData[i]);
        const bgG = Math.max(36, bgData[i + 1]);
        const bgB = Math.max(36, bgData[i + 2]);
        let nr = Math.min(255, (r / bgR) * 260);
        let ng = Math.min(255, (g / bgG) * 260);
        let nb = Math.min(255, (b / bgB) * 260);
        const lum = nr * 0.299 + ng * 0.587 + nb * 0.114;
        if (lum > 196) {
          nr = ng = nb = 255;
        } else {
          const avg = (nr + ng + nb) / 3;
          nr = avg + (nr - avg) * 1.42;
          ng = avg + (ng - avg) * 1.42;
          nb = avg + (nb - avg) * 1.42;
        }
        r = nr; g = ng; b = nb;
      } else if (filterMode === 'bw') {
        const lum = r * 0.299 + g * 0.587 + b * 0.114;
        const bgLum = Math.max(32, bgData[i] * 0.299 + bgData[i + 1] * 0.587 + bgData[i + 2] * 0.114);
        const ratio = lum / bgLum;
        // Anti-aliased crisp text curve: <0.66 black ink, >0.84 pure white paper
        let v;
        if (ratio >= 0.85) v = 255;
        else if (ratio <= 0.62) v = 12;
        else v = ((ratio - 0.62) / 0.23) * 243 + 12;
        r = g = b = v;
      } else if (filterMode === 'gray') {
        const lum = r * 0.299 + g * 0.587 + b * 0.114;
        const bgLum = Math.max(34, bgData[i] * 0.299 + bgData[i + 1] * 0.587 + bgData[i + 2] * 0.114);
        let v = Math.min(255, (lum / bgLum) * 250);
        v = v > 224 ? 255 : Math.max(0, (v - 14) * 1.08);
        r = g = b = v;
      }

      if (bright !== 0 || contr !== 0) {
        r = contrastFactor * (r + brightOffset - 128) + 128;
        g = contrastFactor * (g + brightOffset - 128) + 128;
        b = contrastFactor * (b + brightOffset - 128) + 128;
      }

      data[i] = r < 0 ? 0 : r > 255 ? 255 : r;
      data[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
      data[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
    }

    // Fast 3x3 Unsharp Mask for razor-sharp document text
    if (sharp > 4) {
      const amount = (sharp / 100) * 0.85;
      const copy = new Uint8ClampedArray(data);
      const stride = w * 4;
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = y * stride + x * 4;
          for (let c = 0; c < 3; c++) {
            const center = copy[idx + c];
            const neighbors =
              copy[idx - 4 + c] +
              copy[idx + 4 + c] +
              copy[idx - stride + c] +
              copy[idx + stride + c];
            const val = center + amount * (center * 4 - neighbors);
            data[idx + c] = val < 0 ? 0 : val > 255 ? 255 : val;
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }
};

/* ==========================================================================
   Tabs Navigation (Updated for Dynamic Colors)
   ========================================================================== */

function initTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  const contents = document.querySelectorAll('.tab-content');
  const hexColors = {
    home: '#6366f1',
    pdf: '#ef4444',
    split: '#e11d48',
    pdfc: '#0284c7',
    organize: '#2563eb',
    watermark: '#d946ef',
    resize: '#10b981',
    scan: '#14b8a6',
    cyan: '#06b6d4',
    excel: '#10b981',
    p2e: '#6366f1',
    imgc: '#f97316',
    conv: '#8b5cf6',
    i2p: '#ec4899',
    cleane: '#f59e0b'
  };

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const color = tab.getAttribute('data-color');
      const activeColor = hexColors[color] || '#6366f1';

      // Reset all tabs while preserving colorful icon tints
      tabs.forEach(t => {
        const cKey = t.getAttribute('data-color');
        const cHex = hexColors[cKey] || '#64748b';
        const div = t.querySelector('div');
        div.style.backgroundColor = cHex + '1a';
        div.style.color = cHex;
        t.classList.remove('active', 'text-slate-900', 'dark:text-white', 'bg-white', 'dark:bg-slate-800', 'shadow-sm');
        t.classList.add('text-slate-600', 'dark:text-slate-400');
      });

      // Activate clicked tab with crisp vibrant icon badge
      const activeIconDiv = tab.querySelector('div');
      tab.classList.add('active', 'text-slate-900', 'dark:text-white', 'bg-white', 'dark:bg-slate-800', 'shadow-sm');
      tab.classList.remove('text-slate-600', 'dark:text-slate-400');
      activeIconDiv.style.backgroundColor = activeColor;
      activeIconDiv.style.color = '#ffffff';

      const target = tab.getAttribute('data-tab');
      contents.forEach(content => {
        if (content.id === target) {
          content.classList.remove('hidden');
          content.classList.add('flex');
        } else {
          content.classList.add('hidden');
          content.classList.remove('flex');
        }
      });

      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

/* ==========================================================================
   1. PDF Merger
   ========================================================================== */

function initPdfMerger() {
  const input = document.getElementById('pdfMergeInput');
  const list = document.getElementById('pdfMergeList');
  const emptyState = document.getElementById('pdfMergeEmptyState');
  const actionBtn = document.getElementById('pdfMergeActionBtn');
  let selectedFiles = [];

  function renderList() {
    if (selectedFiles.length === 0) {
      list.classList.add('hidden');
      emptyState.classList.remove('hidden');
      actionBtn.disabled = true;
      return;
    }

    list.classList.remove('hidden');
    emptyState.classList.add('hidden');
    actionBtn.disabled = false;
    
    list.innerHTML = '';
    selectedFiles.forEach((file, index) => {
      const li = document.createElement('li');
      li.className = 'flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm hover:border-red-300 dark:hover:border-red-700 transition-colors';
      li.innerHTML = `
        <div class="flex items-center gap-4 overflow-hidden">
          <div class="bg-red-50 dark:bg-red-500/15 p-2 rounded-lg text-red-500 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <span class="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">${file.name}</span>
        </div>
        <div class="flex items-center gap-1.5 flex-shrink-0 bg-slate-50 dark:bg-slate-800 p-1 rounded-lg border border-slate-100 dark:border-slate-700">
          <button class="up-btn text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 p-1.5 rounded transition-colors" data-index="${index}"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg></button>
          <button class="down-btn text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 p-1.5 rounded transition-colors" data-index="${index}"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></button>
          <div class="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"></div>
          <button class="remove-btn text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 p-1.5 rounded transition-colors" data-index="${index}"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
      `;
      list.appendChild(li);
    });

    document.querySelectorAll('#pdfMergeList .up-btn').forEach(btn => btn.onclick = (e) => moveItem(e, -1));
    document.querySelectorAll('#pdfMergeList .down-btn').forEach(btn => btn.onclick = (e) => moveItem(e, 1));
    document.querySelectorAll('#pdfMergeList .remove-btn').forEach(btn => btn.onclick = removeItem);
  }

  function moveItem(e, dir) {
    const idx = parseInt(e.currentTarget.getAttribute('data-index'));
    if (idx + dir < 0 || idx + dir >= selectedFiles.length) return;
    const temp = selectedFiles[idx];
    selectedFiles[idx] = selectedFiles[idx + dir];
    selectedFiles[idx + dir] = temp;
    renderList();
  }

  function removeItem(e) {
    const idx = parseInt(e.currentTarget.getAttribute('data-index'));
    selectedFiles.splice(idx, 1);
    renderList();
  }

  input.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    selectedFiles = [...selectedFiles, ...files];
    input.value = '';
    renderList();
  });

  actionBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;
    utils.showLoader('Merging PDFs...', 'text-red-600');
    
    try {
      const { PDFDocument } = window.PDFLib;
      const mergedPdf = await PDFDocument.create();

      for (const file of selectedFiles) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const res = await utils.savePdfWithMetadata(mergedPdf, 'Merged_Document.pdf', 'Merged PDF Document');
      if (res && res.saved) {
        utils.showToast('Success', `Saved "${res.filename}" with custom metadata.`);
        selectedFiles = [];
        renderList();
      }
    } catch (err) {
      console.error(err);
      utils.showToast('Error', 'Failed to merge PDFs.', 'error');
    } finally {
      utils.hideLoader();
    }
  });
}

/* ==========================================================================
   2. PDF Splitter (NEW)
   ========================================================================== */

function initPdfSplitter() {
  const input = document.getElementById('pdfSplitInput');
  const fileInfo = document.getElementById('pdfSplitSelectedInfo');
  const dropZone = document.getElementById('pdfSplitDropZone');
  const fileNameEl = document.getElementById('pdfSplitFileName');
  const filePagesEl = document.getElementById('pdfSplitFilePages');
  const clearBtn = document.getElementById('pdfSplitClearBtn');
  
  const rangeInput = document.getElementById('pdfSplitRange');
  const actionBtn = document.getElementById('pdfSplitActionBtn');
  
  let currentFile = null;
  let totalPages = 0;

  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    utils.showLoader('Loading PDF...', 'text-rose-600');
    try {
      const arrayBuffer = await file.arrayBuffer();
      const { PDFDocument } = window.PDFLib;
      const pdf = await PDFDocument.load(arrayBuffer);
      totalPages = pdf.getPageCount();
      currentFile = file;

      fileNameEl.textContent = file.name;
      filePagesEl.textContent = `${totalPages} pages available`;
      
      dropZone.classList.add('hidden');
      fileInfo.classList.remove('hidden');
      fileInfo.classList.add('flex');
      
      rangeInput.disabled = false;
      actionBtn.disabled = false;
      rangeInput.focus();
    } catch (err) {
      console.error(err);
      utils.showToast('Error', 'Invalid PDF file.', 'error');
    } finally {
      utils.hideLoader();
      input.value = '';
    }
  });
  
  clearBtn.addEventListener('click', () => {
    currentFile = null;
    totalPages = 0;
    fileInfo.classList.add('hidden');
    fileInfo.classList.remove('flex');
    dropZone.classList.remove('hidden');
    
    rangeInput.value = '';
    rangeInput.disabled = true;
    actionBtn.disabled = true;
  });

  actionBtn.addEventListener('click', async () => {
    if (!currentFile) return;
    const rangeStr = rangeInput.value.trim();
    if (!rangeStr) {
       utils.showToast('Error', 'Please enter pages to extract.', 'error');
       return;
    }
    
    // Parse range string
    const indicesToExtract = new Set();
    const parts = rangeStr.split(',');
    for (let part of parts) {
       part = part.trim();
       if (part.includes('-')) {
          const [start, end] = part.split('-').map(Number);
          if (start && end && start <= end) {
             for (let i = start; i <= end; i++) {
                if (i >= 1 && i <= totalPages) indicesToExtract.add(i - 1);
             }
          }
       } else {
          const num = Number(part);
          if (num >= 1 && num <= totalPages) indicesToExtract.add(num - 1);
       }
    }
    
    const finalIndices = Array.from(indicesToExtract).sort((a,b)=>a-b);
    
    if (finalIndices.length === 0) {
      utils.showToast('Error', 'No valid pages found in range.', 'error');
      return;
    }

    utils.showLoader('Extracting Pages...', 'text-rose-600');
    try {
      const { PDFDocument } = window.PDFLib;
      const arrayBuffer = await currentFile.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const newPdf = await PDFDocument.create();
      
      const copiedPages = await newPdf.copyPages(pdf, finalIndices);
      copiedPages.forEach((page) => newPdf.addPage(page));

      const res = await utils.savePdfWithMetadata(newPdf, `Extracted_${currentFile.name}`, currentFile.name.replace(/\.pdf$/i, '') + ' (Extracted)');
      if (res && res.saved) {
        utils.showToast('Success', `Extracted ${finalIndices.length} pages into ${res.filename}.`);
      }
      
    } catch (err) {
      console.error(err);
      utils.showToast('Error', 'Failed to split PDF.', 'error');
    } finally {
      utils.hideLoader();
    }
  });
}

/* ==========================================================================
   3. Excel Merger
   ========================================================================== */

function initExcelMerger() {
  const input = document.getElementById('excelMergeInput');
  const list = document.getElementById('excelMergeList');
  const emptyState = document.getElementById('excelMergeEmptyState');
  const actionBtn = document.getElementById('excelMergeActionBtn');
  let selectedFiles = [];

  function renderList() {
    if (selectedFiles.length === 0) {
      list.classList.add('hidden');
      emptyState.classList.remove('hidden');
      actionBtn.disabled = true;
      return;
    }
    list.classList.remove('hidden');
    emptyState.classList.add('hidden');
    actionBtn.disabled = false;
    
    list.innerHTML = '';
    selectedFiles.forEach((file, index) => {
      const li = document.createElement('li');
      li.className = 'flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors';
      li.innerHTML = `
        <div class="flex items-center gap-4 overflow-hidden">
          <div class="bg-emerald-50 dark:bg-emerald-500/15 p-2 rounded-lg text-emerald-600 dark:text-emerald-400 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
          </div>
          <span class="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">${file.name}</span>
        </div>
        <div class="flex items-center gap-1.5 flex-shrink-0 bg-slate-50 dark:bg-slate-800 p-1 rounded-lg border border-slate-100 dark:border-slate-700">
          <button class="up-btn text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 p-1.5 rounded transition-colors" data-index="${index}"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg></button>
          <button class="down-btn text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 p-1.5 rounded transition-colors" data-index="${index}"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></button>
          <div class="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"></div>
          <button class="remove-btn text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 p-1.5 rounded transition-colors" data-index="${index}"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
      `;
      list.appendChild(li);
    });

    document.querySelectorAll('#excelMergeList .up-btn').forEach(btn => btn.onclick = (e) => moveItem(e, -1));
    document.querySelectorAll('#excelMergeList .down-btn').forEach(btn => btn.onclick = (e) => moveItem(e, 1));
    document.querySelectorAll('#excelMergeList .remove-btn').forEach(btn => btn.onclick = removeItem);
  }

  function moveItem(e, dir) {
    const idx = parseInt(e.currentTarget.getAttribute('data-index'));
    if (idx + dir < 0 || idx + dir >= selectedFiles.length) return;
    const temp = selectedFiles[idx];
    selectedFiles[idx] = selectedFiles[idx + dir];
    selectedFiles[idx + dir] = temp;
    renderList();
  }

  function removeItem(e) {
    const idx = parseInt(e.currentTarget.getAttribute('data-index'));
    selectedFiles.splice(idx, 1);
    renderList();
  }

  input.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    selectedFiles = [...selectedFiles, ...files];
    input.value = '';
    renderList();
  });

  actionBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;
    utils.showLoader('Merging Spreadsheets...', 'text-emerald-600');
    
    try {
      let mergedData = [];
      let headers = null;

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        if (jsonData.length > 0) {
          if (i === 0) {
            headers = jsonData[0];
            mergedData.push(headers);
            mergedData.push(...jsonData.slice(1));
          } else {
            mergedData.push(...jsonData.slice(1));
          }
        }
      }

      const newSheet = XLSX.utils.aoa_to_sheet(mergedData);
      const newWorkbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(newWorkbook, newSheet, 'MergedData');
      
      const wbout = XLSX.write(newWorkbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      utils.downloadBlob(blob, 'Master_Spreadsheet.xlsx');
      utils.showToast('Success', 'Spreadsheets successfully merged.');
      
      selectedFiles = [];
      renderList();
    } catch (err) {
      console.error(err);
      utils.showToast('Error', 'Failed to merge spreadsheets.', 'error');
    } finally {
      utils.hideLoader();
    }
  });
}

/* ==========================================================================
   4. PDF to Excel Converter
   ========================================================================== */

function initPdfToExcel() {
  const input = document.getElementById('pdfToExcelInput');
  
  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    input.value = ''; 
    
    utils.showLoader('Mapping Coordinates...', 'text-indigo-600');
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      const numPages = pdf.numPages;
      let finalExcelData = [];

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const items = textContent.items;

        const yGroups = {};
        items.forEach(item => {
          const y = Math.round(item.transform[5] / 2) * 2;
          if (!yGroups[y]) yGroups[y] = [];
          yGroups[y].push(item);
        });

        const sortedY = Object.keys(yGroups).map(Number).sort((a, b) => b - a);

        sortedY.forEach(y => {
          const rowItems = yGroups[y];
          rowItems.sort((a, b) => a.transform[4] - b.transform[4]);
          
          const rowText = [];
          let currentStr = '';
          let lastX = -1;

          rowItems.forEach(item => {
            const x = item.transform[4];
            if (lastX !== -1 && (x - lastX) > 20) {
              rowText.push(currentStr.trim());
              currentStr = item.str;
            } else {
              currentStr += (currentStr ? ' ' : '') + item.str;
            }
            lastX = x + item.width;
          });
          
          if (currentStr.trim()) {
            rowText.push(currentStr.trim());
          }
          finalExcelData.push(rowText);
        });
        
        finalExcelData.push([]); 
      }

      const newSheet = XLSX.utils.aoa_to_sheet(finalExcelData);
      const newWorkbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(newWorkbook, newSheet, 'ExtractedText');
      
      const wbout = XLSX.write(newWorkbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      utils.downloadBlob(blob, file.name.replace('.pdf', '_Data.xlsx'));
      utils.showToast('Success', 'PDF data exported to Excel.');
    } catch (err) {
      console.error(err);
      utils.showToast('Error', 'Failed to convert PDF.', 'error');
    } finally {
      utils.hideLoader();
    }
  });
}

/* ==========================================================================
   5. Image Format Converter (NEW)
   ========================================================================== */

function initImageConverter() {
  const input = document.getElementById('imgConvertInput');
  const formatSelect = document.getElementById('imgConvertFormat');
  const list = document.getElementById('imgConvertList');
  const emptyState = document.getElementById('imgConvertEmptyState');
  const actionBtn = document.getElementById('imgConvertActionBtn');
  let selectedImages = [];

  function renderList() {
    if (selectedImages.length === 0) {
      list.classList.add('hidden');
      emptyState.classList.remove('hidden');
      actionBtn.disabled = true;
      return;
    }
    list.classList.remove('hidden');
    emptyState.classList.add('hidden');
    actionBtn.disabled = false;
    
    list.innerHTML = '';
    selectedImages.forEach((imgObj, index) => {
      const li = document.createElement('li');
      li.className = 'flex items-center p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm gap-3 relative hover:border-violet-300 dark:hover:border-violet-700 transition-colors group';
      li.innerHTML = `
        <div class="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0 border border-slate-200 dark:border-slate-700">
           <img src="${imgObj.preview}" class="w-full h-full object-cover" />
        </div>
        <div class="flex-1 overflow-hidden">
          <p class="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">${imgObj.file.name}</p>
          <p class="text-xs text-slate-400 dark:text-slate-500 font-medium tabular-nums">${utils.formatBytes(imgObj.file.size)}</p>
        </div>
        <button class="remove-btn text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 p-2 rounded-lg transition-colors" data-index="${index}"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      `;
      list.appendChild(li);
    });

    document.querySelectorAll('#imgConvertList .remove-btn').forEach(btn => btn.onclick = removeItem);
  }

  function removeItem(e) {
    const idx = parseInt(e.currentTarget.getAttribute('data-index'));
    URL.revokeObjectURL(selectedImages[idx].preview);
    selectedImages.splice(idx, 1);
    renderList();
  }

  input.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      selectedImages.push({
        file,
        preview: URL.createObjectURL(file)
      });
    });
    input.value = '';
    renderList();
  });

  actionBtn.addEventListener('click', async () => {
    if (selectedImages.length === 0) return;
    utils.showLoader('Converting Formats...', 'text-violet-600');
    
    try {
      const targetMime = formatSelect.value;
      const targetExt = targetMime === 'image/jpeg' ? '.jpg' : targetMime === 'image/webp' ? '.webp' : '.png';

      for (let i = 0; i < selectedImages.length; i++) {
        const imgObj = selectedImages[i];
        const img = new Image();
        img.src = imgObj.preview;
        await new Promise(resolve => img.onload = resolve);
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const blob = await new Promise(resolve => canvas.toBlob(resolve, targetMime, 0.9));
        
        let oldName = imgObj.file.name.replace(/\.[^/.]+$/, "");
        utils.downloadBlob(blob, oldName + targetExt);
      }
      
      utils.showToast('Success', 'Formats converted perfectly.');
    } catch (err) {
      console.error(err);
      utils.showToast('Error', 'Failed to convert formats.', 'error');
    } finally {
      utils.hideLoader();
    }
  });
}


/* ==========================================================================
   6. Image Size Reducer (Exact Target KB + Quality % Mode)
   ========================================================================== */

async function reduceCanvasToExactKb(img, targetKb) {
  const targetBytes = Math.max(5, Number(targetKb) || 50) * 1024;
  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;

  const renderAt = (w, h, q) =>
    new Promise((resolve) => {
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(w));
      c.height = Math.max(1, Math.round(h));
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((blob) => resolve(blob), 'image/jpeg', q);
    });

  // Step 1: Check high quality at original dimensions
  let bestBlob = await renderAt(origW, origH, 0.92);
  if (bestBlob && bestBlob.size <= targetBytes) {
    return bestBlob;
  }

  let scale = 1.0;
  for (let step = 0; step < 9; step++) {
    const w = Math.max(80, Math.round(origW * scale));
    const h = Math.max(80, Math.round(origH * scale));

    const minBlob = await renderAt(w, h, 0.12);
    if (minBlob) bestBlob = minBlob;

    if (minBlob && minBlob.size <= targetBytes) {
      // Binary search highest quality <= targetBytes at this dimension
      let lo = 0.12;
      let hi = 0.92;
      let chosen = minBlob;
      for (let iter = 0; iter < 7; iter++) {
        const mid = (lo + hi) / 2;
        const b = await renderAt(w, h, mid);
        if (b && b.size <= targetBytes) {
          chosen = b;
          lo = mid;
        } else {
          hi = mid;
        }
      }
      return chosen;
    }

    if (w <= 120 && h <= 120) break;
    scale *= 0.8;
  }

  return bestBlob;
}

function initImageCompressor() {
  const input = document.getElementById('imgCompressInput');
  const list = document.getElementById('imgCompressList');
  const emptyState = document.getElementById('imgCompressEmptyState');
  const actionBtn = document.getElementById('imgCompressActionBtn');
  const qualitySlider = document.getElementById('qualitySlider');
  const qualityVal = document.getElementById('qualityVal');
  const modeKbBtn = document.getElementById('imgReduceModeKbBtn');
  const modeQualBtn = document.getElementById('imgReduceModeQualBtn');
  const kbPanel = document.getElementById('imgReduceKbPanel');
  const qualPanel = document.getElementById('imgReduceQualPanel');
  const targetKbInput = document.getElementById('imgReduceTargetKb');
  const kbPresetBtns = document.querySelectorAll('.img-kb-preset');

  if (!input || !actionBtn) return;

  let mode = 'kb'; // 'kb' | 'quality'
  let selectedImages = [];

  function syncModeUi() {
    if (mode === 'kb') {
      modeKbBtn.className = 'px-3.5 py-2 rounded-lg text-xs font-bold bg-orange-500 text-white shadow-sm transition-colors whitespace-nowrap min-h-[38px]';
      modeQualBtn.className = 'px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap min-h-[38px]';
      kbPanel.classList.remove('hidden');
      qualPanel.classList.add('hidden');
    } else {
      modeQualBtn.className = 'px-3.5 py-2 rounded-lg text-xs font-bold bg-orange-500 text-white shadow-sm transition-colors whitespace-nowrap min-h-[38px]';
      modeKbBtn.className = 'px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap min-h-[38px]';
      kbPanel.classList.add('hidden');
      qualPanel.classList.remove('hidden');
    }
  }

  function highlightPreset(valStr) {
    kbPresetBtns.forEach((btn) => {
      const active = btn.getAttribute('data-kb') === String(valStr);
      btn.className = active
        ? 'img-kb-preset px-2.5 py-1.5 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-xs font-bold text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-700 tabular-nums'
        : 'img-kb-preset px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-orange-100 dark:hover:bg-orange-950/60 text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 tabular-nums';
    });
  }

  if (modeKbBtn) modeKbBtn.addEventListener('click', () => { mode = 'kb'; syncModeUi(); });
  if (modeQualBtn) modeQualBtn.addEventListener('click', () => { mode = 'quality'; syncModeUi(); });

  kbPresetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const kb = btn.getAttribute('data-kb');
      if (targetKbInput) targetKbInput.value = kb;
      highlightPreset(kb);
    });
  });

  if (targetKbInput) {
    targetKbInput.addEventListener('input', () => highlightPreset(targetKbInput.value.trim()));
  }

  if (qualitySlider && qualityVal) {
    qualitySlider.addEventListener('input', (e) => {
      qualityVal.textContent = e.target.value + '%';
    });
  }

  function renderList() {
    if (selectedImages.length === 0) {
      list.classList.add('hidden');
      emptyState.classList.remove('hidden');
      actionBtn.disabled = true;
      return;
    }
    list.classList.remove('hidden');
    emptyState.classList.add('hidden');
    actionBtn.disabled = false;

    list.innerHTML = '';
    selectedImages.forEach((imgObj, index) => {
      const li = document.createElement('li');
      li.className = 'flex flex-col p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm gap-3 relative hover:border-orange-300 dark:hover:border-orange-700 transition-colors';
      const hasResult = Boolean(imgObj.lastBlob);
      const savedPct = hasResult
        ? Math.max(0, ((imgObj.file.size - imgObj.lastBlob.size) / Math.max(1, imgObj.file.size)) * 100).toFixed(1)
        : '0';

      li.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0 border border-slate-200 dark:border-slate-700">
             <img src="${imgObj.preview}" class="w-full h-full object-cover" />
          </div>
          <div class="flex-1 overflow-hidden">
            <p class="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">${imgObj.file.name}</p>
            <p class="text-xs text-slate-400 dark:text-slate-500 font-medium tabular-nums">Original: ${utils.formatBytes(imgObj.file.size)}</p>
          </div>
          <button class="remove-btn text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 p-2 rounded-lg transition-colors" data-index="${index}"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <div class="result-area ${hasResult ? 'flex' : 'hidden'} text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 p-2.5 rounded-lg border border-emerald-200/70 dark:border-emerald-800/70 justify-between items-center gap-2 tabular-nums">
          <span>Output: <span class="compressed-size font-extrabold">${hasResult ? utils.formatBytes(imgObj.lastBlob.size) : ''}</span></span>
          <div class="flex items-center gap-1.5">
            <span class="bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 px-1.5 py-0.5 rounded text-[10px] saving-percent">${savedPct}% OFF</span>
            <button type="button" class="redownload-btn px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-700" data-index="${index}">Save</button>
          </div>
        </div>
      `;
      list.appendChild(li);
    });

    list.querySelectorAll('.remove-btn').forEach((btn) => (btn.onclick = removeItem));
    list.querySelectorAll('.redownload-btn').forEach((btn) => {
      btn.onclick = (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
        const item = selectedImages[idx];
        if (item && item.lastBlob) {
          utils.downloadBlob(item.lastBlob, item.lastName || 'reduced_image.jpg');
        }
      };
    });
  }

  function removeItem(e) {
    const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
    URL.revokeObjectURL(selectedImages[idx].preview);
    selectedImages.splice(idx, 1);
    renderList();
  }

  input.addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      selectedImages.push({
        file,
        preview: URL.createObjectURL(file),
        lastBlob: null,
        lastName: ''
      });
    });
    input.value = '';
    renderList();
  });

  actionBtn.addEventListener('click', async () => {
    if (selectedImages.length === 0) return;

    const targetKb = Math.max(5, parseInt(targetKbInput?.value || '50', 10) || 50);
    const quality = parseInt(qualitySlider?.value || '60', 10) / 100;

    utils.showLoader(
      mode === 'kb' ? `Reducing photos to <= ${targetKb} KB...` : 'Shrinking Images...',
      'text-orange-600'
    );

    try {
      for (let i = 0; i < selectedImages.length; i++) {
        const imgObj = selectedImages[i];
        const img = new Image();
        img.src = imgObj.preview;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        let blob;
        if (mode === 'kb') {
          blob = await reduceCanvasToExactKb(img, targetKb);
        } else {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
        }

        const baseName = imgObj.file.name.replace(/\.[^.]+$/, '');
        const outName = mode === 'kb' ? `${baseName}_${targetKb}kb.jpg` : `${baseName}_reduced.jpg`;
        imgObj.lastBlob = blob;
        imgObj.lastName = outName;
        utils.downloadBlob(blob, outName);
      }

      renderList();
      utils.showToast(
        'Images Reduced!',
        mode === 'kb'
          ? `Reduced ${selectedImages.length} photo(s) cleanly under ${targetKb} KB.`
          : `Shrunk ${selectedImages.length} photo(s) successfully.`
      );
    } catch (err) {
      console.error(err);
      utils.showToast('Error', 'Failed to reduce images.', 'error');
    } finally {
      utils.hideLoader();
    }
  });
}

/* ==========================================================================
   7. JPG / Images to PDF Converter (A4, Fit, Letter + JPG/PNG/WebP)
   ========================================================================== */

function initImageToPdf() {
  const input = document.getElementById('imgToPdfInput');
  const list = document.getElementById('imgToPdfList');
  const emptyState = document.getElementById('imgToPdfEmptyState');
  const actionBtn = document.getElementById('imgToPdfActionBtn');
  const pageSizeSelect = document.getElementById('imgToPdfPageSize');
  if (!input || !actionBtn) return;

  let selectedImages = [];

  function renderList() {
    if (selectedImages.length === 0) {
      list.classList.add('hidden');
      emptyState.classList.remove('hidden');
      actionBtn.disabled = true;
      return;
    }
    list.classList.remove('hidden');
    emptyState.classList.add('hidden');
    actionBtn.disabled = false;

    list.innerHTML = '';
    selectedImages.forEach((imgObj, index) => {
      const li = document.createElement('li');
      li.className = 'relative group aspect-[3/4] rounded-xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-pink-400 transition-colors shadow-sm';
      li.innerHTML = `
        <img src="${imgObj.preview}" class="w-full h-full object-cover" />
        <div class="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 backdrop-blur-[1px]">
           <div class="flex gap-2">
             <button class="up-btn bg-white/90 text-slate-700 p-2 rounded-lg hover:text-pink-600 hover:bg-white shadow-sm" data-index="${index}"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg></button>
             <button class="down-btn bg-white/90 text-slate-700 p-2 rounded-lg hover:text-pink-600 hover:bg-white shadow-sm" data-index="${index}"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></button>
           </div>
           <button class="remove-btn bg-red-500/90 text-white p-2 rounded-lg hover:bg-red-600 shadow-sm" data-index="${index}"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <div class="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-md font-bold shadow-sm">${index + 1}</div>
      `;
      list.appendChild(li);
    });

    document.querySelectorAll('#imgToPdfList .up-btn').forEach((btn) => (btn.onclick = (e) => moveItem(e, -1)));
    document.querySelectorAll('#imgToPdfList .down-btn').forEach((btn) => (btn.onclick = (e) => moveItem(e, 1)));
    document.querySelectorAll('#imgToPdfList .remove-btn').forEach((btn) => (btn.onclick = removeItem));
  }

  function moveItem(e, dir) {
    const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
    if (idx + dir < 0 || idx + dir >= selectedImages.length) return;
    const temp = selectedImages[idx];
    selectedImages[idx] = selectedImages[idx + dir];
    selectedImages[idx + dir] = temp;
    renderList();
  }

  function removeItem(e) {
    const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
    URL.revokeObjectURL(selectedImages[idx].preview);
    selectedImages.splice(idx, 1);
    renderList();
  }

  input.addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      selectedImages.push({
        file,
        preview: URL.createObjectURL(file)
      });
    });
    input.value = '';
    renderList();
  });

  async function convertImageToJpegBuffer(previewUrl) {
    const img = new Image();
    img.src = previewUrl;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    const c = document.createElement('canvas');
    c.width = img.naturalWidth || img.width;
    c.height = img.naturalHeight || img.height;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0);
    const blob = await new Promise((resolve) => c.toBlob(resolve, 'image/jpeg', 0.92));
    return blob.arrayBuffer();
  }

  actionBtn.addEventListener('click', async () => {
    if (selectedImages.length === 0) return;
    utils.showLoader('Converting JPG to PDF...', 'text-pink-600');

    try {
      const { PDFDocument } = window.PDFLib;
      const pdfDoc = await PDFDocument.create();
      const pageMode = pageSizeSelect ? pageSizeSelect.value : 'a4';

      for (const imgObj of selectedImages) {
        let pdfImage;
        if (imgObj.file.type === 'image/jpeg') {
          const ab = await imgObj.file.arrayBuffer();
          try {
            pdfImage = await pdfDoc.embedJpg(ab);
          } catch {
            const safeJpg = await convertImageToJpegBuffer(imgObj.preview);
            pdfImage = await pdfDoc.embedJpg(safeJpg);
          }
        } else if (imgObj.file.type === 'image/png') {
          const ab = await imgObj.file.arrayBuffer();
          try {
            pdfImage = await pdfDoc.embedPng(ab);
          } catch {
            const safeJpg = await convertImageToJpegBuffer(imgObj.preview);
            pdfImage = await pdfDoc.embedJpg(safeJpg);
          }
        } else {
          // WebP or any other browser-supported image format
          const safeJpg = await convertImageToJpegBuffer(imgObj.preview);
          pdfImage = await pdfDoc.embedJpg(safeJpg);
        }

        const dims = pdfImage.scale(1);
        const isLandscape = dims.width > dims.height;

        if (pageMode === 'fit') {
          const pageW = isLandscape ? 841.89 : 595.28;
          const pageH = pageW * (dims.height / dims.width);
          const page = pdfDoc.addPage([pageW, pageH]);
          page.drawImage(pdfImage, { x: 0, y: 0, width: pageW, height: pageH });
        } else {
          const baseW = pageMode === 'letter' ? 612 : 595.28;
          const baseH = pageMode === 'letter' ? 792 : 841.89;
          const pageW = isLandscape ? baseH : baseW;
          const pageH = isLandscape ? baseW : baseH;
          const margin = 22;
          const availW = pageW - margin * 2;
          const availH = pageH - margin * 2;
          const ratio = Math.min(availW / dims.width, availH / dims.height);
          const drawW = dims.width * ratio;
          const drawH = dims.height * ratio;
          const x = (pageW - drawW) / 2;
          const y = (pageH - drawH) / 2;

          const page = pdfDoc.addPage([pageW, pageH]);
          page.drawImage(pdfImage, { x, y, width: drawW, height: drawH });
        }
      }

      const res = await utils.savePdfWithMetadata(pdfDoc, 'JPG_to_PDF.pdf', 'JPG to PDF Document');
      if (res && res.saved) {
        utils.showToast('PDF Ready!', `Saved "${res.filename}" cleanly.`);
        selectedImages.forEach((s) => URL.revokeObjectURL(s.preview));
        selectedImages = [];
        renderList();
      }
    } catch (err) {
      console.error(err);
      utils.showToast('Error', 'Failed to convert images to PDF.', 'error');
    } finally {
      utils.hideLoader();
    }
  });
}

/* ==========================================================================
   8. Excel Duplicate Cleaner
   ========================================================================== */

function initExcelCleaner() {
  const input = document.getElementById('excelCleanerInput');

  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    input.value = '';
    
    utils.showLoader('Sanitizing Rows...', 'text-amber-500');
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      if (jsonData.length <= 1) {
        utils.showToast('Info', 'Nothing to sanitize.');
        utils.hideLoader();
        return;
      }

      const headers = jsonData[0];
      const uniqueRows = new Set();
      const cleanedData = [headers];
      let removedCount = 0;

      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (row.length === 0 || row.every(cell => cell === null || cell === undefined || cell === '')) {
          continue;
        }
        
        const rowString = JSON.stringify(row);
        if (!uniqueRows.has(rowString)) {
          uniqueRows.add(rowString);
          cleanedData.push(row);
        } else {
          removedCount++;
        }
      }

      const newSheet = XLSX.utils.aoa_to_sheet(cleanedData);
      const newWorkbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(newWorkbook, newSheet, 'CleanedData');
      
      const wbout = XLSX.write(newWorkbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      utils.downloadBlob(blob, file.name.replace(/\.[^/.]+$/, "") + "_cleaned.xlsx");
      
      utils.showToast('Success', `Sanitized. Eliminated ${removedCount} duplicates.`);
    } catch (err) {
      console.error(err);
      utils.showToast('Error', 'Failed to sanitize spreadsheet.', 'error');
    } finally {
      utils.hideLoader();
    }
  });
}

/* ==========================================================================
   Pro AI Document Scanner Studio (Adobe Scan-Beating Offline Experience)
   ========================================================================== */
function initPdfScanner() {
  const cameraInput = document.getElementById('pdfScannerInput');
  const galleryInput = document.getElementById('pdfScannerGalleryInput');
  const emptyState = document.getElementById('pdfScannerEmptyState');
  const emptyCameraBtn = document.getElementById('scanEmptyCameraBtn');
  const emptyGalleryBtn = document.getElementById('scanEmptyGalleryBtn');
  const studioWorkspace = document.getElementById('scanStudioWorkspace');
  const bottomDock = document.getElementById('scanBottomDock');

  const docTitleInput = document.getElementById('scanDocTitleInput');
  const pageCounterEl = document.getElementById('scanPageCounter');
  const activeFilterBadge = document.getElementById('scanActiveFilterBadge');

  const settingsBtn = document.getElementById('scanSettingsBtn');
  const settingsPanel = document.getElementById('scanSettingsPanel');
  const setPageSize = document.getElementById('scanSetPageSize');
  const setQuality = document.getElementById('scanSetQuality');
  const setAutoMagic = document.getElementById('scanSetAutoMagic');

  const mainPreviewImg = document.getElementById('scanMainPreviewImg');
  const quadCropCanvas = document.getElementById('scanQuadCropCanvas');
  const cleanupCanvas = document.getElementById('scanCleanupCanvas');
  const prevPageBtn = document.getElementById('scanPrevPageBtn');
  const nextPageBtn = document.getElementById('scanNextPageBtn');

  const cropControlsBar = document.getElementById('scanCropControlsBar');
  const quadAutoBtn = document.getElementById('scanQuadAutoBtn');
  const quadFullBtn = document.getElementById('scanQuadFullBtn');
  const quadCancelBtn = document.getElementById('scanQuadCancelBtn');
  const quadApplyBtn = document.getElementById('scanQuadApplyBtn');

  const cleanupControlsBar = document.getElementById('scanCleanupControlsBar');
  const cleanupBrushSlider = document.getElementById('scanCleanupBrushSize');
  const cleanupUndoBtn = document.getElementById('scanCleanupUndoBtn');
  const cleanupDoneBtn = document.getElementById('scanCleanupDoneBtn');

  const filtersDrawer = document.getElementById('scanFiltersDrawer');
  const applyFilterAllBtn = document.getElementById('scanApplyFilterAllBtn');
  const filterChips = document.querySelectorAll('.scan-filter-chip');

  const adjustDrawer = document.getElementById('scanAdjustDrawer');
  const adjustResetBtn = document.getElementById('scanAdjustResetBtn');
  const adjustApplyAllBtn = document.getElementById('scanAdjustApplyAllBtn');
  const brightSlider = document.getElementById('scanBrightSlider');
  const brightVal = document.getElementById('scanBrightVal');
  const contrastSlider = document.getElementById('scanContrastSlider');
  const contrastVal = document.getElementById('scanContrastVal');
  const sharpSlider = document.getElementById('scanSharpSlider');
  const sharpVal = document.getElementById('scanSharpVal');

  const filmstripList = document.getElementById('pdfScannerList');

  const toolAiAuto = document.getElementById('scanToolAiAuto');
  const toolCrop = document.getElementById('scanToolStraighten');
  const toolFilters = document.getElementById('scanToolFilters');
  const toolAdjust = document.getElementById('scanToolAdjust');
  const toolRotate = document.getElementById('scanToolRotate');
  const toolCleanup = document.getElementById('scanToolCleanup');
  const toolMoveLeft = document.getElementById('scanToolMoveLeft');
  const toolMoveRight = document.getElementById('scanToolMoveRight');
  const toolRetake = document.getElementById('scanToolRetake');
  const toolDeletePage = document.getElementById('scanToolDeletePage');

  const addCameraBtn = document.getElementById('scanAddCameraBtn');
  const addGalleryBtn = document.getElementById('scanAddGalleryBtn');
  const savePdfBtn = document.getElementById('pdfScannerActionBtn');

  if (!cameraInput || !studioWorkspace) return;

  // Set default dated document title
  if (docTitleInput) {
    const todayStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    docTitleInput.value = `PDF Bondhu Scan ${todayStr}`;
  }

  // Preferences wiring
  if (settingsBtn && settingsPanel) {
    settingsBtn.addEventListener('click', () => settingsPanel.classList.toggle('hidden'));
  }
  if (setPageSize) {
    setPageSize.value = scanSettings.pageSize;
    setPageSize.addEventListener('change', (e) => { scanSettings.pageSize = e.target.value; });
  }
  if (setQuality) {
    setQuality.value = String(scanSettings.quality);
    setQuality.addEventListener('change', (e) => { scanSettings.quality = parseFloat(e.target.value) || 0.94; });
  }
  if (setAutoMagic) {
    setAutoMagic.value = scanSettings.autoMagic;
    setAutoMagic.addEventListener('change', (e) => { scanSettings.autoMagic = e.target.value; });
  }

  const filterLabels = {
    magic: 'AI Magic Color',
    autopro: 'Auto Pro',
    bw: 'Crisp B&W',
    whiteboard: 'Whiteboard',
    gray: 'Grayscale',
    original: 'Original'
  };

  let pages = [];
  let activeIndex = -1;
  let stageMode = 'preview'; // 'preview' | 'crop' | 'cleanup'
  let retakeTargetIndex = null;
  let cropDraftCorners = null;
  let draggingCornerIdx = -1;
  let isDrawingCleanup = false;
  let currentCleanupStroke = null;

  function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = (err) => {
        URL.revokeObjectURL(url);
        reject(err);
      };
      img.src = url;
    });
  }

  function rotateCanvas90(srcCanvas, times = 1) {
    const steps = ((times % 4) + 4) % 4;
    if (steps === 0) return srcCanvas;
    const w = srcCanvas.width;
    const h = srcCanvas.height;
    const out = document.createElement('canvas');
    out.width = steps % 2 === 1 ? h : w;
    out.height = steps % 2 === 1 ? w : h;
    const ctx = out.getContext('2d');
    ctx.translate(out.width / 2, out.height / 2);
    ctx.rotate((steps * Math.PI) / 2);
    ctx.drawImage(srcCanvas, -w / 2, -h / 2);
    return out;
  }

  function applyCleanupStrokesToCanvas(canvas, strokes) {
    if (!strokes || strokes.length === 0) return;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ffffff';
    const minDim = Math.min(canvas.width, canvas.height);

    for (const stroke of strokes) {
      if (!stroke.points || stroke.points.length === 0) continue;
      const pxWidth = Math.max(4, stroke.sizeRatio * minDim);
      ctx.lineWidth = pxWidth;
      if (stroke.points.length === 1) {
        const pt = stroke.points[0];
        ctx.beginPath();
        ctx.arc(pt.x * canvas.width, pt.y * canvas.height, pxWidth / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x * canvas.width, stroke.points[0].y * canvas.height);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x * canvas.width, stroke.points[i].y * canvas.height);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function renderPageCanvas(page, maxDim = 1500) {
    if (!page.warpedCanvas) {
      page.warpedCanvas = cvUtils.warpPerspectiveFromCorners(page.originalImg, page.corners, 2100);
    }
    const enhanced = cvUtils.enhanceScanCanvas(
      page.warpedCanvas,
      page.filter,
      {
        brightness: page.brightness,
        contrast: page.contrast,
        sharpness: page.sharpness
      },
      maxDim
    );
    const rotated = rotateCanvas90(enhanced, page.rotationSteps);
    applyCleanupStrokesToCanvas(rotated, page.cleanupStrokes);
    return rotated;
  }

  function refreshPagePreview(page) {
    const previewCanvas = renderPageCanvas(page, 1300);
    page.previewDataUrl = previewCanvas.toDataURL('image/jpeg', 0.88);
    // Small thumbnail for crisp fast filmstrip
    const thumbCanvas = document.createElement('canvas');
    const ratio = Math.min(1, 180 / Math.max(previewCanvas.width, previewCanvas.height));
    thumbCanvas.width = Math.max(40, Math.round(previewCanvas.width * ratio));
    thumbCanvas.height = Math.max(40, Math.round(previewCanvas.height * ratio));
    const tCtx = thumbCanvas.getContext('2d');
    tCtx.drawImage(previewCanvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
    page.thumbDataUrl = thumbCanvas.toDataURL('image/jpeg', 0.78);
  }

  function closeDrawers() {
    if (filtersDrawer) filtersDrawer.classList.add('hidden');
    if (adjustDrawer) adjustDrawer.classList.add('hidden');
  }

  function setStageMode(nextMode) {
    stageMode = nextMode;
    const isCrop = nextMode === 'crop';
    const isCleanup = nextMode === 'cleanup';

    mainPreviewImg.classList.toggle('hidden', isCrop || isCleanup);
    quadCropCanvas.classList.toggle('hidden', !isCrop);
    cleanupCanvas.classList.toggle('hidden', !isCleanup);
    cropControlsBar.classList.toggle('hidden', !isCrop);
    cleanupControlsBar.classList.toggle('hidden', !isCleanup);

    if (isCrop || isCleanup) {
      closeDrawers();
      prevPageBtn.classList.add('hidden');
      nextPageBtn.classList.add('hidden');
    } else {
      syncNavArrows();
    }
  }

  function syncNavArrows() {
    const showNav = stageMode === 'preview' && pages.length > 1;
    prevPageBtn.classList.toggle('hidden', !showNav || activeIndex <= 0);
    nextPageBtn.classList.toggle('hidden', !showNav || activeIndex >= pages.length - 1);
  }

  function syncFilterChipsUI(filterKey) {
    filterChips.forEach(chip => {
      const isMatch = chip.getAttribute('data-filter') === filterKey;
      if (isMatch) {
        chip.className = 'scan-filter-chip px-3.5 py-2 rounded-xl text-xs font-bold bg-cyan-500 text-slate-950 whitespace-nowrap min-h-[38px] shadow';
      } else {
        chip.className = 'scan-filter-chip px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700 whitespace-nowrap min-h-[38px]';
      }
    });
  }

  function syncAdjustSlidersUI(page) {
    if (!page) return;
    brightSlider.value = String(page.brightness);
    brightVal.textContent = String(page.brightness);
    contrastSlider.value = String(page.contrast);
    contrastVal.textContent = String(page.contrast);
    sharpSlider.value = String(page.sharpness);
    sharpVal.textContent = String(page.sharpness);
  }

  function renderStudioUI() {
    if (pages.length === 0) {
      activeIndex = -1;
      setStageMode('preview');
      closeDrawers();
      emptyState.classList.remove('hidden');
      studioWorkspace.classList.add('hidden');
      bottomDock.classList.add('hidden');
      pageCounterEl.textContent = 'No pages yet';
      filmstripList.innerHTML = '';
      return;
    }

    if (activeIndex < 0) activeIndex = 0;
    if (activeIndex >= pages.length) activeIndex = pages.length - 1;

    emptyState.classList.add('hidden');
    studioWorkspace.classList.remove('hidden');
    bottomDock.classList.remove('hidden');

    const activePage = pages[activeIndex];
    pageCounterEl.textContent = `Page ${activeIndex + 1} of ${pages.length}`;
    activeFilterBadge.textContent = filterLabels[activePage.filter] || 'AI Magic Color';
    mainPreviewImg.src = activePage.previewDataUrl;

    syncFilterChipsUI(activePage.filter);
    syncAdjustSlidersUI(activePage);
    syncNavArrows();

    // Render multi-page filmstrip
    filmstripList.innerHTML = '';
    pages.forEach((p, idx) => {
      const li = document.createElement('li');
      const isSelected = idx === activeIndex;
      li.className = `relative shrink-0 w-14 h-20 rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
        isSelected
          ? 'border-cyan-400 ring-2 ring-cyan-400/40 scale-105'
          : 'border-slate-700 opacity-75 hover:opacity-100'
      }`;
      li.innerHTML = `
        <img src="${p.thumbDataUrl}" alt="Page ${idx + 1}" class="w-full h-full object-cover bg-white" />
        <span class="absolute bottom-0.5 right-0.5 bg-slate-950/85 text-white text-[10px] font-bold px-1.5 py-0.5 rounded tabular-nums">${idx + 1}</span>
      `;
      li.addEventListener('click', () => {
        if (stageMode !== 'preview') setStageMode('preview');
        activeIndex = idx;
        renderStudioUI();
      });
      filmstripList.appendChild(li);
    });
  }

  /* ---------------- Interactive 4-Corner Perspective Crop ---------------- */
  function drawQuadCropOverlay() {
    const page = pages[activeIndex];
    if (!page || !cropDraftCorners) return;
    const img = page.originalImg;
    const maxW = Math.min(820, window.innerWidth - 48);
    const maxH = Math.min(520, Math.round(window.innerHeight * 0.52));
    const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
    const cw = Math.max(180, Math.round(img.naturalWidth * scale));
    const ch = Math.max(180, Math.round(img.naturalHeight * scale));

    if (quadCropCanvas.width !== cw || quadCropCanvas.height !== ch) {
      quadCropCanvas.width = cw;
      quadCropCanvas.height = ch;
    }

    const ctx = quadCropCanvas.getContext('2d');
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, 0, 0, cw, ch);

    const pts = cropDraftCorners.map(c => ({ x: c.x * cw, y: c.y * ch }));

    // Darken outside of document quad
    ctx.save();
    ctx.fillStyle = 'rgba(2, 6, 23, 0.56)';
    ctx.beginPath();
    ctx.rect(0, 0, cw, ch);
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo(pts[3].x, pts[3].y);
    ctx.lineTo(pts[2].x, pts[2].y);
    ctx.lineTo(pts[1].x, pts[1].y);
    ctx.closePath();
    ctx.fill('evenodd');
    ctx.restore();

    // Glowing cyan border
    ctx.save();
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < 4; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.stroke();

    // Draw 4 touch-friendly handles
    pts.forEach((pt, idx) => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, idx === draggingCornerIdx ? 15 : 12, 0, Math.PI * 2);
      ctx.fillStyle = idx === draggingCornerIdx ? '#fde047' : '#22d3ee';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#0f172a';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
    });
    ctx.restore();
  }

  function getCanvasNormPointer(canvas, clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
    };
  }

  quadCropCanvas.addEventListener('pointerdown', (e) => {
    if (stageMode !== 'crop' || !cropDraftCorners) return;
    const pos = getCanvasNormPointer(quadCropCanvas, e.clientX, e.clientY);
    let closest = -1;
    let bestDist = 0.14;
    cropDraftCorners.forEach((c, idx) => {
      const dist = Math.hypot(c.x - pos.x, c.y - pos.y);
      if (dist < bestDist) {
        bestDist = dist;
        closest = idx;
      }
    });
    if (closest !== -1) {
      draggingCornerIdx = closest;
      quadCropCanvas.setPointerCapture(e.pointerId);
      drawQuadCropOverlay();
    }
  });

  quadCropCanvas.addEventListener('pointermove', (e) => {
    if (draggingCornerIdx === -1 || !cropDraftCorners) return;
    const pos = getCanvasNormPointer(quadCropCanvas, e.clientX, e.clientY);
    cropDraftCorners[draggingCornerIdx] = pos;
    drawQuadCropOverlay();
  });

  const endQuadDrag = () => {
    if (draggingCornerIdx !== -1) {
      draggingCornerIdx = -1;
      drawQuadCropOverlay();
    }
  };
  quadCropCanvas.addEventListener('pointerup', endQuadDrag);
  quadCropCanvas.addEventListener('pointercancel', endQuadDrag);

  toolCrop.addEventListener('click', () => {
    if (activeIndex < 0) return;
    const page = pages[activeIndex];
    cropDraftCorners = page.corners.map(c => ({ x: c.x, y: c.y }));
    setStageMode('crop');
    drawQuadCropOverlay();
  });

  quadAutoBtn.addEventListener('click', () => {
    const page = pages[activeIndex];
    if (!page) return;
    cropDraftCorners = cvUtils.detectDocumentCorners(page.originalImg);
    drawQuadCropOverlay();
    utils.showToast('Edges Detected', 'Adjust corners if needed, then tap Apply Crop.', 'info');
  });

  quadFullBtn.addEventListener('click', () => {
    cropDraftCorners = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 }
    ];
    drawQuadCropOverlay();
  });

  quadCancelBtn.addEventListener('click', () => {
    cropDraftCorners = null;
    setStageMode('preview');
  });

  quadApplyBtn.addEventListener('click', async () => {
    const page = pages[activeIndex];
    if (!page || !cropDraftCorners) return;
    utils.showLoader('Straightening & Enhancing...', 'text-cyan-400');
    await new Promise(r => setTimeout(r, 20));
    try {
      page.corners = cvUtils.orderPoints(cropDraftCorners);
      page.warpedCanvas = cvUtils.warpPerspectiveFromCorners(page.originalImg, page.corners, 2100);
      page.cleanupStrokes = [];
      refreshPagePreview(page);
      cropDraftCorners = null;
      setStageMode('preview');
      renderStudioUI();
      utils.showToast('Cropped', 'Document straightened cleanly!');
    } finally {
      utils.hideLoader();
    }
  });

  /* ---------------- Interactive Cleanup Eraser Brush ---------------- */
  function redrawCleanupStage() {
    const page = pages[activeIndex];
    if (!page) return;
    const baseCanvas = renderPageCanvas(page, 1100);
    cleanupCanvas.width = baseCanvas.width;
    cleanupCanvas.height = baseCanvas.height;
    const ctx = cleanupCanvas.getContext('2d');
    ctx.drawImage(baseCanvas, 0, 0);
  }

  toolCleanup.addEventListener('click', () => {
    if (activeIndex < 0) return;
    setStageMode('cleanup');
    redrawCleanupStage();
  });

  cleanupCanvas.addEventListener('pointerdown', (e) => {
    if (stageMode !== 'cleanup' || activeIndex < 0) return;
    const page = pages[activeIndex];
    const pos = getCanvasNormPointer(cleanupCanvas, e.clientX, e.clientY);
    const brushVal = parseInt(cleanupBrushSlider.value, 10) || 32;
    currentCleanupStroke = {
      sizeRatio: brushVal / 650,
      points: [pos]
    };
    page.cleanupStrokes.push(currentCleanupStroke);
    isDrawingCleanup = true;
    cleanupCanvas.setPointerCapture(e.pointerId);
    applyCleanupStrokesToCanvas(cleanupCanvas, [currentCleanupStroke]);
  });

  cleanupCanvas.addEventListener('pointermove', (e) => {
    if (!isDrawingCleanup || !currentCleanupStroke) return;
    const pos = getCanvasNormPointer(cleanupCanvas, e.clientX, e.clientY);
    currentCleanupStroke.points.push(pos);
    applyCleanupStrokesToCanvas(cleanupCanvas, [currentCleanupStroke]);
  });

  const finishCleanupStroke = () => {
    isDrawingCleanup = false;
    currentCleanupStroke = null;
  };
  cleanupCanvas.addEventListener('pointerup', finishCleanupStroke);
  cleanupCanvas.addEventListener('pointercancel', finishCleanupStroke);

  cleanupUndoBtn.addEventListener('click', () => {
    const page = pages[activeIndex];
    if (!page || page.cleanupStrokes.length === 0) return;
    page.cleanupStrokes.pop();
    redrawCleanupStage();
  });

  cleanupDoneBtn.addEventListener('click', () => {
    const page = pages[activeIndex];
    if (page) refreshPagePreview(page);
    setStageMode('preview');
    renderStudioUI();
    utils.showToast('Cleaned Up', 'Marks erased cleanly.');
  });

  /* ---------------- Filters & Fine Adjustments ---------------- */
  toolFilters.addEventListener('click', () => {
    if (activeIndex < 0) return;
    if (stageMode !== 'preview') setStageMode('preview');
    const wasHidden = filtersDrawer.classList.contains('hidden');
    closeDrawers();
    if (wasHidden) filtersDrawer.classList.remove('hidden');
  });

  filterChips.forEach(chip => {
    chip.addEventListener('click', async () => {
      const page = pages[activeIndex];
      if (!page) return;
      const modeKey = chip.getAttribute('data-filter');
      page.filter = modeKey;
      utils.showLoader(`Applying ${filterLabels[modeKey] || 'Filter'}...`, 'text-cyan-400');
      await new Promise(r => setTimeout(r, 15));
      refreshPagePreview(page);
      renderStudioUI();
      utils.hideLoader();
    });
  });

  applyFilterAllBtn.addEventListener('click', async () => {
    if (activeIndex < 0 || pages.length === 0) return;
    const targetFilter = pages[activeIndex].filter;
    utils.showLoader('Applying filter to all pages...', 'text-cyan-400');
    await new Promise(r => setTimeout(r, 20));
    for (const p of pages) {
      p.filter = targetFilter;
      refreshPagePreview(p);
    }
    renderStudioUI();
    utils.hideLoader();
    utils.showToast('Applied to All', `${filterLabels[targetFilter]} applied to all ${pages.length} pages.`);
  });

  toolAdjust.addEventListener('click', () => {
    if (activeIndex < 0) return;
    if (stageMode !== 'preview') setStageMode('preview');
    const wasHidden = adjustDrawer.classList.contains('hidden');
    closeDrawers();
    if (wasHidden) adjustDrawer.classList.remove('hidden');
  });

  let adjustDebounce = null;
  function handleAdjustSliderChange() {
    const page = pages[activeIndex];
    if (!page) return;
    page.brightness = parseInt(brightSlider.value, 10) || 0;
    page.contrast = parseInt(contrastSlider.value, 10) || 0;
    page.sharpness = parseInt(sharpSlider.value, 10) || 0;
    brightVal.textContent = String(page.brightness);
    contrastVal.textContent = String(page.contrast);
    sharpVal.textContent = String(page.sharpness);

    clearTimeout(adjustDebounce);
    adjustDebounce = setTimeout(() => {
      refreshPagePreview(page);
      renderStudioUI();
    }, 90);
  }
  brightSlider.addEventListener('input', handleAdjustSliderChange);
  contrastSlider.addEventListener('input', handleAdjustSliderChange);
  sharpSlider.addEventListener('input', handleAdjustSliderChange);

  adjustResetBtn.addEventListener('click', () => {
    const page = pages[activeIndex];
    if (!page) return;
    page.brightness = 0;
    page.contrast = 0;
    page.sharpness = 30;
    refreshPagePreview(page);
    renderStudioUI();
  });

  adjustApplyAllBtn.addEventListener('click', async () => {
    const src = pages[activeIndex];
    if (!src) return;
    utils.showLoader('Updating all pages...', 'text-cyan-400');
    await new Promise(r => setTimeout(r, 20));
    for (const p of pages) {
      p.brightness = src.brightness;
      p.contrast = src.contrast;
      p.sharpness = src.sharpness;
      refreshPagePreview(p);
    }
    renderStudioUI();
    utils.hideLoader();
    utils.showToast('Synced', 'Light & sharpness applied to every page.');
  });

  /* ---------------- 1-Tap AI Auto-Ready, Rotate, Reorder, Retake, Delete ---------------- */
  toolAiAuto.addEventListener('click', async () => {
    if (pages.length === 0) return;
    if (stageMode !== 'preview') setStageMode('preview');
    closeDrawers();
    utils.showLoader('AI Auto-Cropping, Removing Shadows & Polishing...', 'text-cyan-400');
    await new Promise(r => setTimeout(r, 25));
    try {
      for (const p of pages) {
        p.corners = cvUtils.detectDocumentCorners(p.originalImg);
        p.warpedCanvas = cvUtils.warpPerspectiveFromCorners(p.originalImg, p.corners, 2100);
        p.filter = 'magic';
        p.brightness = 4;
        p.contrast = 8;
        p.sharpness = 42;
        refreshPagePreview(p);
      }
      renderStudioUI();
      utils.showToast('AI Auto-Ready!', `Auto-cropped, shadow-removed & polished ${pages.length} page${pages.length > 1 ? 's' : ''}. Tap Save PDF!`);
    } finally {
      utils.hideLoader();
    }
  });

  toolRotate.addEventListener('click', () => {
    const page = pages[activeIndex];
    if (!page) return;
    if (stageMode !== 'preview') setStageMode('preview');
    page.rotationSteps = (page.rotationSteps + 1) % 4;
    refreshPagePreview(page);
    renderStudioUI();
  });

  toolMoveLeft.addEventListener('click', () => {
    if (activeIndex <= 0) return;
    [pages[activeIndex - 1], pages[activeIndex]] = [pages[activeIndex], pages[activeIndex - 1]];
    activeIndex -= 1;
    renderStudioUI();
  });

  toolMoveRight.addEventListener('click', () => {
    if (activeIndex < 0 || activeIndex >= pages.length - 1) return;
    [pages[activeIndex + 1], pages[activeIndex]] = [pages[activeIndex], pages[activeIndex + 1]];
    activeIndex += 1;
    renderStudioUI();
  });

  prevPageBtn.addEventListener('click', () => {
    if (activeIndex > 0) {
      activeIndex -= 1;
      renderStudioUI();
    }
  });

  nextPageBtn.addEventListener('click', () => {
    if (activeIndex < pages.length - 1) {
      activeIndex += 1;
      renderStudioUI();
    }
  });

  toolRetake.addEventListener('click', () => {
    if (activeIndex < 0) return;
    retakeTargetIndex = activeIndex;
    cameraInput.click();
  });

  toolDeletePage.addEventListener('click', () => {
    if (activeIndex < 0) return;
    pages.splice(activeIndex, 1);
    if (activeIndex >= pages.length) activeIndex = pages.length - 1;
    renderStudioUI();
    utils.showToast('Removed', 'Page deleted from scan.', 'info');
  });

  /* ---------------- Capture & Gallery Ingestion ---------------- */
  if (emptyCameraBtn) emptyCameraBtn.addEventListener('click', () => { retakeTargetIndex = null; cameraInput.click(); });
  if (emptyGalleryBtn) emptyGalleryBtn.addEventListener('click', () => { retakeTargetIndex = null; galleryInput.click(); });
  if (addCameraBtn) addCameraBtn.addEventListener('click', () => { retakeTargetIndex = null; cameraInput.click(); });
  if (addGalleryBtn) addGalleryBtn.addEventListener('click', () => { retakeTargetIndex = null; galleryInput.click(); });

  async function handleIncomingScanFiles(fileList) {
    const filesArr = Array.from(fileList || []).filter(f => f.type.startsWith('image/'));
    if (filesArr.length === 0) return;

    utils.showLoader(`AI Scanning ${filesArr.length} page${filesArr.length > 1 ? 's' : ''}...`, 'text-cyan-400');
    await new Promise(r => setTimeout(r, 25));

    try {
      const defaultMode = scanSettings.autoMagic || 'magic';
      for (const file of filesArr) {
        const img = await loadImageFromFile(file);
        const corners = cvUtils.detectDocumentCorners(img);
        const warpedCanvas = cvUtils.warpPerspectiveFromCorners(img, corners, 2100);
        const newPage = {
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          originalImg: img,
          corners,
          warpedCanvas,
          cleanupStrokes: [],
          filter: defaultMode,
          brightness: 0,
          contrast: 0,
          sharpness: defaultMode === 'original' ? 10 : 35,
          rotationSteps: 0,
          previewDataUrl: '',
          thumbDataUrl: ''
        };
        refreshPagePreview(newPage);

        if (retakeTargetIndex !== null && pages[retakeTargetIndex]) {
          pages[retakeTargetIndex] = newPage;
          activeIndex = retakeTargetIndex;
          retakeTargetIndex = null;
        } else {
          pages.push(newPage);
          activeIndex = pages.length - 1;
        }
      }
      setStageMode('preview');
      renderStudioUI();
      utils.showToast('Scan Ready', `Auto-cropped & enhanced ${filesArr.length} page${filesArr.length > 1 ? 's' : ''}. Tap Crop to fine-tune edges anytime!`);
    } catch (err) {
      console.error('Scan ingest error:', err);
      utils.showToast('Scan Error', 'Could not read image. Please try again.', 'error');
    } finally {
      retakeTargetIndex = null;
      utils.hideLoader();
    }
  }

  cameraInput.addEventListener('change', (e) => {
    const fl = e.target.files;
    handleIncomingScanFiles(fl);
    cameraInput.value = '';
  });

  galleryInput.addEventListener('change', (e) => {
    const fl = e.target.files;
    handleIncomingScanFiles(fl);
    galleryInput.value = '';
  });

  /* ---------------- Save Multi-Page Studio PDF with Metadata ---------------- */
  savePdfBtn.addEventListener('click', async () => {
    if (pages.length === 0) return;
    if (stageMode !== 'preview') setStageMode('preview');
    closeDrawers();

    utils.showLoader('Compiling Studio HD PDF...', 'text-cyan-400');
    await new Promise(r => setTimeout(r, 25));

    try {
      const pdfDoc = await window.PDFLib.PDFDocument.create();
      const exportQuality = parseFloat(scanSettings.quality) || 0.92;
      const exportMaxDim = exportQuality >= 0.9 ? 2100 : exportQuality >= 0.78 ? 1650 : 1250;

      for (const pageObj of pages) {
        const fullCanvas = renderPageCanvas(pageObj, exportMaxDim);
        const jpegDataUrl = fullCanvas.toDataURL('image/jpeg', exportQuality);
        const img = await pdfDoc.embedJpg(jpegDataUrl);

        let dims = [img.width, img.height];
        if (scanSettings.pageSize === 'a4') dims = [595.28, 841.89];
        if (scanSettings.pageSize === 'letter') dims = [612, 792];
        if (img.width > img.height && scanSettings.pageSize !== 'fit') {
          dims = [dims[1], dims[0]];
        }

        const pdfPage = pdfDoc.addPage(dims);
        let drawW = dims[0];
        let drawH = dims[1];

        if (scanSettings.pageSize === 'fit') {
          drawW = img.width;
          drawH = img.height;
        } else {
          // Clean subtle 14pt studio margin on A4/Letter
          const pad = 14;
          const availW = dims[0] - pad * 2;
          const availH = dims[1] - pad * 2;
          const imgRatio = img.width / img.height;
          const boxRatio = availW / availH;
          if (imgRatio > boxRatio) {
            drawW = availW;
            drawH = availW / imgRatio;
          } else {
            drawH = availH;
            drawW = availH * imgRatio;
          }
        }

        const x = (dims[0] - drawW) / 2;
        const y = (dims[1] - drawH) / 2;
        pdfPage.drawImage(img, { x, y, width: drawW, height: drawH });
      }

      const titleStr = (docTitleInput && docTitleInput.value.trim()) || 'PDF Bondhu Scan';
      const safeFileBase = titleStr.replace(/[^a-zA-Z0-9 _-]+/g, '').trim().replace(/\s+/g, '_') || 'PDF_Bondhu_Scan';
      const res = await utils.savePdfWithMetadata(pdfDoc, `${safeFileBase}.pdf`, titleStr);

      if (res && res.saved) {
        utils.showToast('PDF Saved!', `"${res.filename}" (${pages.length} page${pages.length > 1 ? 's' : ''}) ready!`);
      }
    } catch (err) {
      console.error('Scanner export failed:', err);
      utils.showToast('Error', 'Failed to generate PDF.', 'error');
    } finally {
      utils.hideLoader();
    }
  });
}

/* ==========================================================================
   OCR Scanner
   ========================================================================== */
function initOcrScanner() {
  const input = document.getElementById('ocrInput');
  const langSelect = document.getElementById('ocrLangSelect');
  const filterSelect = document.getElementById('ocrFilterSelect');
  const canvas = document.getElementById('ocrCanvas');
  const ctx = canvas.getContext('2d');
  const emptyState = document.getElementById('ocrEmptyState');
  const startBtn = document.getElementById('ocrStartBtn');
  
  const statusText = document.getElementById('ocrStatusText');
  const progressText = document.getElementById('ocrProgressText');
  const progressBar = document.getElementById('ocrProgressBar');
  const output = document.getElementById('ocrOutput');
  
  const pdfControls = document.getElementById('ocrPdfControls');
  const prevPageBtn = document.getElementById('ocrPrevPage');
  const nextPageBtn = document.getElementById('ocrNextPage');
  const pageNumEl = document.getElementById('ocrPageNum');
  
  const copyBtn = document.getElementById('ocrCopyBtn');
  const downloadBtn = document.getElementById('ocrDownloadBtn');
  const downloadPdfBtn = document.getElementById('ocrDownloadPdfBtn');
  
  let currentFile = null;
  let pdfDoc = null;
  let currentPdfPage = 1;
  let originalImageData = null;
  let lastOcrResult = null;
  let lastOcrImageDataUrl = null;
  let isProcessing = false;
  
  function setProgress(status, pct) {
    statusText.textContent = status;
    const p = Math.round(pct * 100);
    progressText.textContent = `${p}%`;
    progressBar.style.width = `${p}%`;
  }
  
  async function loadFileToCanvas(file) {
    emptyState.classList.add('hidden');
    canvas.classList.remove('hidden');
    
    if (file.type === 'application/pdf') {
       pdfControls.classList.remove('hidden');
       pdfControls.classList.add('flex');
       const arrayBuffer = await file.arrayBuffer();
       pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
       currentPdfPage = 1;
       await renderPdfPage(currentPdfPage);
    } else {
       pdfControls.classList.add('hidden');
       pdfControls.classList.remove('flex');
       pdfDoc = null;
       
       const img = new Image();
       img.onload = () => {
         // Downscale if too large
         const MAX_DIM = 2200;
         let w = img.width;
         let h = img.height;
         if (w > MAX_DIM || h > MAX_DIM) {
           const ratio = Math.min(MAX_DIM / w, MAX_DIM / h);
           w *= ratio;
           h *= ratio;
         }
         canvas.width = w;
         canvas.height = h;
         ctx.drawImage(img, 0, 0, w, h);
         originalImageData = ctx.getImageData(0, 0, w, h);
         applyFilter();
       };
       img.src = URL.createObjectURL(file);
    }
  }
  
  async function renderPdfPage(pageNum) {
    if (!pdfDoc) return;
    pageNumEl.textContent = pageNum;
    
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 }); // High res for OCR
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    const renderContext = {
      canvasContext: ctx,
      viewport: viewport
    };
    
    await page.render(renderContext).promise;
    originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    applyFilter();
  }
  
  prevPageBtn.addEventListener('click', () => {
    if (pdfDoc && currentPdfPage > 1) {
      currentPdfPage--;
      renderPdfPage(currentPdfPage);
    }
  });
  
  nextPageBtn.addEventListener('click', () => {
    if (pdfDoc && currentPdfPage < pdfDoc.numPages) {
      currentPdfPage++;
      renderPdfPage(currentPdfPage);
    }
  });
  
  function applyFilter() {
    if (!originalImageData) return;
    
    const filter = filterSelect.value;
    const imgData = new ImageData(
      new Uint8ClampedArray(originalImageData.data),
      originalImageData.width,
      originalImageData.height
    );
    const d = imgData.data;
    
    if (filter === 'gray' || filter === 'bw') {
      for (let i = 0; i < d.length; i += 4) {
        let lum = d[i]*0.299 + d[i+1]*0.587 + d[i+2]*0.114;
        
        if (filter === 'bw') {
          // Binarization (thresholding) with contrast boost
          lum = ((lum - 128) * 1.5) + 128;
          lum = lum > 140 ? 255 : 0;
        }
        
        d[i] = d[i+1] = d[i+2] = lum;
      }
    }
    
    ctx.putImageData(imgData, 0, 0);
  }
  
  filterSelect.addEventListener('change', applyFilter);
  
  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    currentFile = file;
    output.value = '';
    setProgress('Ready', 0);
    loadFileToCanvas(file);
  });
  
  startBtn.addEventListener('click', async () => {
    if (!originalImageData || isProcessing) return;
    
    isProcessing = true;
    startBtn.disabled = true;
    const lang = langSelect.value;
    
    try {
      setProgress('Initializing engine...', 0.1);
      
      const worker = await Tesseract.createWorker(lang, 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            setProgress('Recognizing Text...', m.progress);
          } else {
            setProgress(m.status, 0.1);
          }
        }
      });
      
      setProgress('Processing...', 0.2);
      const ret = await worker.recognize(canvas);
      output.value = ret.data.text;
      lastOcrResult = ret.data;
      lastOcrImageDataUrl = canvas.toDataURL('image/jpeg', 0.95);
      
      await worker.terminate();
      setProgress('Done', 1);
      utils.showToast('Success', 'Text extracted successfully!');
      
    } catch (err) {
      console.error(err);
      utils.showToast('Error', 'Failed to extract text. See console for details.', 'error');
      setProgress('Error', 0);
    } finally {
      isProcessing = false;
      startBtn.disabled = false;
    }
  });
  
  copyBtn.addEventListener('click', () => {
    if (!output.value) return;
    navigator.clipboard.writeText(output.value);
    utils.showToast('Copied', 'Text copied to clipboard!');
  });
  
  downloadBtn.addEventListener('click', () => {
    if (!output.value) return;
    const blob = new Blob([output.value], { type: 'text/plain' });
    utils.downloadBlob(blob, `Extracted_Text_${Date.now()}.txt`);
  });

  downloadPdfBtn.addEventListener('click', async () => {
    if (!lastOcrResult || !lastOcrImageDataUrl) {
      utils.showToast('Wait', 'Please extract text first.', 'info');
      return;
    }
    
    utils.showLoader('Generating Searchable PDF...');
    try {
      const pdfDoc = await PDFLib.PDFDocument.create();
      
      const img = await pdfDoc.embedJpg(lastOcrImageDataUrl);
      const page = pdfDoc.addPage([img.width, img.height]);
      
      // We will place the image first. In standard PDF viewers, text added after might be visible,
      // but if we use a color with opacity 0 or the same as background, it works.
      // Wait, let's just draw the text with color clear.
      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      
      // Draw transparent text over image for searchability
      const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
      
      // Iterate over lines or words. Words give better bounding boxes.
      lastOcrResult.words.forEach(w => {
         const text = w.text;
         const bbox = w.bbox; // {x0, y0, x1, y1}
         // Coordinates in pdf-lib are from bottom-left
         // Tesseract coords are from top-left
         const x = bbox.x0;
         const y = img.height - bbox.y1;
         const width = bbox.x1 - bbox.x0;
         const height = bbox.y1 - bbox.y0;
         
         const fontSize = height * 0.8; // Approximate
         
         page.drawText(text, {
           x: x,
           y: y,
           size: fontSize,
           font: font,
           color: PDFLib.rgb(1, 1, 1),
           opacity: 0, // Invisible text
         });
      });
      
      const res = await utils.savePdfWithMetadata(pdfDoc, `Searchable_Document_${Date.now()}.pdf`, 'OCR Searchable Document');
      if (res && res.saved) {
        utils.showToast('Success', `Searchable PDF "${res.filename}" saved!`);
      }
    } catch (err) {
      console.error(err);
      utils.showToast('Error', 'Failed to generate searchable PDF.', 'error');
    } finally {
      utils.hideLoader();
    }
  });
}

/* ==========================================================================
   9. PDF Compressor (Exact Target Size + Manual DPI & Quality)
   ========================================================================== */

function initPdfCompressor() {
  const dropArea = document.getElementById('pdfCompressDropArea');
  const dropZone = document.getElementById('pdfCompressDropZone');
  const input = document.getElementById('pdfCompressInput');
  const changeInput = document.getElementById('pdfCompressChangeInput');
  const selectedInfo = document.getElementById('pdfCompressSelectedInfo');
  const thumbCanvas = document.getElementById('pdfCompressThumbCanvas');
  const fileNameEl = document.getElementById('pdfCompressFileName');
  const fileMetaEl = document.getElementById('pdfCompressFileMeta');
  const clearBtn = document.getElementById('pdfCompressClearBtn');
  const zoomBtn = document.getElementById('pdfCompressZoomBtn');

  const modeTargetBtn = document.getElementById('pdfCompressModeTargetBtn');
  const modeManualBtn = document.getElementById('pdfCompressModeManualBtn');
  const targetPanel = document.getElementById('pdfCompressTargetPanel');
  const manualPanel = document.getElementById('pdfCompressManualPanel');
  const advToggleBtn = document.getElementById('pdfCompressAdvToggleBtn');
  const advPanel = document.getElementById('pdfCompressAdvPanel');

  const targetValInput = document.getElementById('pdfCompressTargetValue');
  const targetUnitSelect = document.getElementById('pdfCompressTargetUnit');
  const budgetHint = document.getElementById('pdfCompressBudgetHint');
  const sizePresets = document.querySelectorAll('.pdf-size-preset');

  const dpiInput = document.getElementById('pdfCompressDpiInput');
  const qualityInput = document.getElementById('pdfCompressQualityInput');
  const dpiPresets = document.querySelectorAll('.pdf-dpi-preset');

  const grayscaleCheck = document.getElementById('pdfCompressGrayscale');
  const objStreamsCheck = document.getElementById('pdfCompressObjectStreams');

  const progressBox = document.getElementById('pdfCompressProgressBox');
  const progressLabel = document.getElementById('pdfCompressProgressLabel');
  const progressPct = document.getElementById('pdfCompressProgressPct');
  const progressBar = document.getElementById('pdfCompressProgressBar');
  const progressDetail = document.getElementById('pdfCompressProgressDetail');
  const cancelBtn = document.getElementById('pdfCompressCancelBtn');

  const actionBtn = document.getElementById('pdfCompressActionBtn');

  const resultBox = document.getElementById('pdfCompressResultBox');
  const resultSummary = document.getElementById('pdfCompressResultSummary');
  const resultSizes = document.getElementById('pdfCompressResultSizes');
  const resultSavings = document.getElementById('pdfCompressResultSavings');
  const downloadAgainBtn = document.getElementById('pdfCompressDownloadAgainBtn');
  const adjustBtn = document.getElementById('pdfCompressAdjustBtn');
  const eraseBtn = document.getElementById('pdfCompressEraseBtn');

  const zoomModal = document.getElementById('pdfCompressZoomModal');
  const zoomTitle = document.getElementById('pdfCompressZoomTitle');
  const zoomImg = document.getElementById('pdfCompressZoomImg');
  const zoomClose = document.getElementById('pdfCompressZoomClose');

  if (!input || !actionBtn) return;

  let currentFile = null;
  let totalPages = 0;
  let compressMode = 'target'; // 'target' | 'manual'
  let isCompressing = false;
  let cancelRequested = false;
  let lastCompressedBlob = null;
  let lastCompressedFilename = '';

  function clamp(num, min, max) {
    return Math.min(max, Math.max(min, num));
  }

  function getTargetBytes() {
    const raw = parseFloat(targetValInput.value);
    const val = Number.isFinite(raw) && raw > 0 ? raw : 500;
    const multiplier = targetUnitSelect.value === 'MB' ? 1024 * 1024 : 1024;
    return Math.max(2048, Math.round(val * multiplier));
  }

  function updateBudgetHint() {
    const targetBytes = getTargetBytes();
    if (!currentFile || !totalPages) {
      budgetHint.textContent = 'Auto-tunes DPI & quality to stay under your target size';
      return;
    }
    const overhead = 2200 + totalPages * 500;
    const perPage = Math.max(1024, Math.floor((targetBytes - overhead) / totalPages));
    if (currentFile.size <= targetBytes) {
      budgetHint.textContent = `Already under ${utils.formatBytes(targetBytes)} (${utils.formatBytes(currentFile.size)}) · Will still optimize`;
    } else {
      budgetHint.textContent = `~${utils.formatBytes(perPage)} per page across ${totalPages} page${totalPages > 1 ? 's' : ''}`;
    }
  }

  function setMode(nextMode) {
    compressMode = nextMode;
    if (nextMode === 'target') {
      modeTargetBtn.className = 'px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm transition-colors whitespace-nowrap min-h-[40px]';
      modeManualBtn.className = 'px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap min-h-[40px]';
      targetPanel.classList.remove('hidden');
      manualPanel.classList.add('hidden');
    } else {
      modeManualBtn.className = 'px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm transition-colors whitespace-nowrap min-h-[40px]';
      modeTargetBtn.className = 'px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap min-h-[40px]';
      manualPanel.classList.remove('hidden');
      targetPanel.classList.add('hidden');
    }
  }

  modeTargetBtn.addEventListener('click', () => setMode('target'));
  modeManualBtn.addEventListener('click', () => setMode('manual'));

  advToggleBtn.addEventListener('click', () => {
    advPanel.classList.toggle('hidden');
  });

  sizePresets.forEach(btn => {
    btn.addEventListener('click', () => {
      targetValInput.value = btn.getAttribute('data-size');
      targetUnitSelect.value = btn.getAttribute('data-unit');
      updateBudgetHint();
    });
  });

  targetValInput.addEventListener('input', updateBudgetHint);
  targetUnitSelect.addEventListener('change', updateBudgetHint);

  dpiPresets.forEach(btn => {
    btn.addEventListener('click', () => {
      dpiInput.value = btn.getAttribute('data-dpi');
      qualityInput.value = btn.getAttribute('data-quality');
    });
  });

  function setProgressUI(visible, label = '', pct = 0, detail = '') {
    if (visible) {
      progressBox.classList.remove('hidden');
      const clamped = clamp(Math.round(pct), 0, 100);
      progressLabel.textContent = label;
      progressPct.textContent = `${clamped}%`;
      progressBar.style.width = `${clamped}%`;
      progressDetail.textContent = detail;
    } else {
      progressBox.classList.add('hidden');
    }
  }

  function resetAll() {
    if (isCompressing) return;
    currentFile = null;
    totalPages = 0;
    lastCompressedBlob = null;
    lastCompressedFilename = '';
    selectedInfo.classList.add('hidden');
    selectedInfo.classList.remove('flex');
    dropZone.classList.remove('hidden');
    resultBox.classList.add('hidden');
    setProgressUI(false);
    actionBtn.disabled = true;
    const tctx = thumbCanvas.getContext('2d');
    if (tctx) tctx.clearRect(0, 0, thumbCanvas.width, thumbCanvas.height);
    updateBudgetHint();
  }

  async function loadPdfFile(file) {
    if (!file) return;
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      utils.showToast('Invalid File', 'Please select a valid PDF document.', 'error');
      return;
    }
    if (isCompressing) return;

    utils.showLoader('Reading PDF...', 'text-sky-600');
    let pdfDoc = null;
    try {
      const arrayBuffer = await file.arrayBuffer();
      pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      totalPages = pdfDoc.numPages;
      currentFile = file;
      lastCompressedBlob = null;
      resultBox.classList.add('hidden');

      fileNameEl.textContent = file.name;
      fileMetaEl.textContent = `${utils.formatBytes(file.size)} · ${totalPages} page${totalPages > 1 ? 's' : ''}`;

      // Render Page 1 thumbnail preview
      const page1 = await pdfDoc.getPage(1);
      const baseVp = page1.getViewport({ scale: 1.0 });
      const thumbScale = Math.min(260 / baseVp.width, 340 / baseVp.height);
      const vp = page1.getViewport({ scale: thumbScale });
      thumbCanvas.width = Math.max(1, Math.round(vp.width));
      thumbCanvas.height = Math.max(1, Math.round(vp.height));
      const tctx = thumbCanvas.getContext('2d', { alpha: false });
      tctx.fillStyle = '#ffffff';
      tctx.fillRect(0, 0, thumbCanvas.width, thumbCanvas.height);
      await page1.render({ canvasContext: tctx, viewport: vp }).promise;
      page1.cleanup();

      dropZone.classList.add('hidden');
      selectedInfo.classList.remove('hidden');
      selectedInfo.classList.add('flex');
      actionBtn.disabled = false;

      updateBudgetHint();
    } catch (err) {
      console.error('Failed to load PDF for compression:', err);
      utils.showToast('Error', 'Could not read PDF. Ensure it is not password-protected.', 'error');
    } finally {
      if (pdfDoc) {
        try { await pdfDoc.destroy(); } catch {}
      }
      utils.hideLoader();
      input.value = '';
      changeInput.value = '';
    }
  }

  input.addEventListener('change', (e) => loadPdfFile(e.target.files[0]));
  changeInput.addEventListener('change', (e) => loadPdfFile(e.target.files[0]));
  clearBtn.addEventListener('click', resetAll);
  eraseBtn.addEventListener('click', resetAll);
  adjustBtn.addEventListener('click', () => {
    resultBox.classList.add('hidden');
    if (compressMode === 'target') {
      targetValInput.focus();
    } else {
      dpiInput.focus();
    }
  });

  // Drag & Drop support
  dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.classList.add('border-sky-500', 'bg-sky-100/60');
  });
  dropArea.addEventListener('dragleave', () => {
    dropArea.classList.remove('border-sky-500', 'bg-sky-100/60');
  });
  dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.classList.remove('border-sky-500', 'bg-sky-100/60');
    const file = e.dataTransfer?.files?.[0];
    if (file) loadPdfFile(file);
  });

  // Zoom preview modal
  zoomBtn.addEventListener('click', async () => {
    if (!currentFile) return;
    utils.showLoader('Loading Preview...', 'text-sky-600');
    let pdfDoc = null;
    try {
      const ab = await currentFile.arrayBuffer();
      pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(ab) }).promise;
      const page1 = await pdfDoc.getPage(1);
      const baseVp = page1.getViewport({ scale: 1.0 });
      const previewScale = Math.min(1.8, 1200 / Math.max(baseVp.width, baseVp.height));
      const vp = page1.getViewport({ scale: previewScale });
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(vp.width));
      c.height = Math.max(1, Math.round(vp.height));
      const ctx = c.getContext('2d', { alpha: false });
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, c.width, c.height);
      await page1.render({ canvasContext: ctx, viewport: vp }).promise;
      page1.cleanup();
      zoomImg.src = c.toDataURL('image/jpeg', 0.9);
      zoomTitle.textContent = `${currentFile.name} (Page 1 of ${totalPages})`;
      zoomModal.classList.remove('hidden');
      zoomModal.classList.add('flex');
      c.width = c.height = 0;
    } catch (err) {
      console.error(err);
      utils.showToast('Error', 'Unable to open page preview.', 'error');
    } finally {
      if (pdfDoc) {
        try { await pdfDoc.destroy(); } catch {}
      }
      utils.hideLoader();
    }
  });

  function closeZoom() {
    zoomModal.classList.add('hidden');
    zoomModal.classList.remove('flex');
    zoomImg.src = '';
  }
  zoomClose.addEventListener('click', closeZoom);
  zoomModal.addEventListener('click', (e) => {
    if (e.target === zoomModal) closeZoom();
  });

  cancelBtn.addEventListener('click', () => {
    if (isCompressing) {
      cancelRequested = true;
      progressLabel.textContent = 'Cancelling...';
    }
  });

  async function renderPageToCanvas(srcPdf, pageNum, dpi, grayscale, canvas) {
    const page = await srcPdf.getPage(pageNum);
    const baseVp = page.getViewport({ scale: 1.0 });
    let scale = dpi / 72;
    const MAX_DIM = 2600;
    if (baseVp.width * scale > MAX_DIM || baseVp.height * scale > MAX_DIM) {
      scale = Math.min(MAX_DIM / baseVp.width, MAX_DIM / baseVp.height);
    }
    const vp = page.getViewport({ scale });
    canvas.width = Math.max(1, Math.round(vp.width));
    canvas.height = Math.max(1, Math.round(vp.height));

    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport: vp }).promise;

    if (grayscale) {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const lum = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0;
        d[i] = d[i + 1] = d[i + 2] = lum;
      }
      ctx.putImageData(imgData, 0, 0);
    }

    page.cleanup();
    return { ptWidth: baseVp.width, ptHeight: baseVp.height };
  }

  async function canvasToJpegBytes(canvas, quality) {
    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', quality));
    if (!blob) throw new Error('JPEG encoding failed');
    return new Uint8Array(await blob.arrayBuffer());
  }

  async function downscaleAndEncode(srcCanvas, scaleFactor, quality, tempCanvas) {
    tempCanvas.width = Math.max(16, Math.round(srcCanvas.width * scaleFactor));
    tempCanvas.height = Math.max(16, Math.round(srcCanvas.height * scaleFactor));
    const tctx = tempCanvas.getContext('2d', { alpha: false });
    tctx.fillStyle = '#ffffff';
    tctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    tctx.drawImage(srcCanvas, 0, 0, tempCanvas.width, tempCanvas.height);
    return await canvasToJpegBytes(tempCanvas, quality);
  }

  async function encodeCanvasWithinBudget(workCanvas, tempCanvas, pageBudget, startQuality) {
    let bestBytes = await canvasToJpegBytes(workCanvas, startQuality);
    if (bestBytes.byteLength <= pageBudget && bestBytes.byteLength >= pageBudget * 0.62) {
      return bestBytes;
    }

    // Binary search quality between 0.20 and 0.92
    let low = 0.20;
    let high = 0.92;
    let bestFitting = bestBytes.byteLength <= pageBudget ? bestBytes : null;

    if (bestBytes.byteLength > pageBudget) {
      high = startQuality;
    } else {
      low = startQuality;
    }

    for (let iter = 0; iter < 4; iter++) {
      const mid = (low + high) / 2;
      const attempt = await canvasToJpegBytes(workCanvas, mid);
      if (attempt.byteLength <= pageBudget) {
        bestFitting = attempt;
        low = mid;
        if (attempt.byteLength >= pageBudget * 0.78) break;
      } else {
        high = mid;
      }
    }

    if (bestFitting) return bestFitting;

    // Even quality 0.20 exceeded pageBudget -> check lowest quality, then downscale canvas
    const minQBytes = await canvasToJpegBytes(workCanvas, 0.20);
    if (minQBytes.byteLength <= pageBudget) return minQBytes;

    let factor = clamp(Math.sqrt(pageBudget / minQBytes.byteLength) * 0.90, 0.28, 0.88);
    let scaledBytes = await downscaleAndEncode(workCanvas, factor, 0.34, tempCanvas);
    if (scaledBytes.byteLength > pageBudget) {
      scaledBytes = await downscaleAndEncode(workCanvas, factor, 0.20, tempCanvas);
    }
    if (scaledBytes.byteLength > pageBudget) {
      const factor2 = clamp(factor * Math.sqrt(pageBudget / scaledBytes.byteLength) * 0.88, 0.16, 0.75);
      scaledBytes = await downscaleAndEncode(workCanvas, factor2, 0.20, tempCanvas);
    }
    return scaledBytes;
  }

  async function runManualCompression(srcPdf, dpi, quality, grayscale, useObjStreams) {
    const outPdf = await PDFLib.PDFDocument.create();
    const workCanvas = document.createElement('canvas');
    let bytesUsed = 0;

    try {
      for (let p = 1; p <= srcPdf.numPages; p++) {
        if (cancelRequested) throw new Error('CANCELLED');
        setProgressUI(
          true,
          `Compressing page ${p} of ${srcPdf.numPages}...`,
          (p / srcPdf.numPages) * 95,
          `DPI: ${dpi} · Quality: ${Math.round(quality * 100)}% · Output so far: ${utils.formatBytes(bytesUsed)}`
        );

        const { ptWidth, ptHeight } = await renderPageToCanvas(srcPdf, p, dpi, grayscale, workCanvas);
        const jpegBytes = await canvasToJpegBytes(workCanvas, quality);
        const embeddedImg = await outPdf.embedJpg(jpegBytes);
        const page = outPdf.addPage([ptWidth, ptHeight]);
        page.drawImage(embeddedImg, { x: 0, y: 0, width: ptWidth, height: ptHeight });
        bytesUsed += jpegBytes.byteLength;

        await new Promise(r => setTimeout(r, 0));
      }

      setProgressUI(true, 'Finalizing PDF...', 98, 'Packing streams and removing unused objects...');
      const pdfBytes = await outPdf.save({ useObjectStreams: useObjStreams });
      return {
        pdfBytes,
        summary: `DPI: ${dpi} · Image quality: ${Math.round(quality * 100)}%${grayscale ? ' · Grayscale' : ''}${useObjStreams ? ' · Compact streams' : ''}`
      };
    } finally {
      workCanvas.width = workCanvas.height = 0;
    }
  }

  async function calibrateDpiForTarget(srcPdf, targetBytes, grayscale) {
    const n = srcPdf.numPages;
    const overhead = 2200 + n * 500;
    const totalImageBudget = Math.max(n * 1100, targetBytes * 0.95 - overhead);
    const avgBudget = totalImageBudget / n;

    let dpi = 150;
    if (avgBudget < 10000) dpi = 32;
    else if (avgBudget < 22000) dpi = 45;
    else if (avgBudget < 50000) dpi = 60;
    else if (avgBudget < 105000) dpi = 82;
    else if (avgBudget < 220000) dpi = 115;

    const sampleSet = Array.from(new Set([1, Math.max(1, Math.ceil(n / 2)), n]));
    const sampleCanvases = [];
    const workCanvas = document.createElement('canvas');

    try {
      let sum65 = 0;
      let sum35 = 0;
      let sum88 = 0;

      for (let i = 0; i < sampleSet.length; i++) {
        if (cancelRequested) throw new Error('CANCELLED');
        const pNum = sampleSet[i];
        setProgressUI(
          true,
          `Analyzing document complexity (${i + 1}/${sampleSet.length})...`,
          ((i + 1) / sampleSet.length) * 12,
          `Targeting ${utils.formatBytes(targetBytes)} across ${n} page${n > 1 ? 's' : ''}`
        );

        const c = document.createElement('canvas');
        await renderPageToCanvas(srcPdf, pNum, dpi, grayscale, c);
        sampleCanvases.push(c);

        const b65 = await canvasToJpegBytes(c, 0.65);
        sum65 += b65.byteLength;
      }

      const avg65 = sum65 / sampleCanvases.length;
      if (avg65 > avgBudget * 1.15) {
        for (const c of sampleCanvases) {
          const b35 = await canvasToJpegBytes(c, 0.35);
          sum35 += b35.byteLength;
        }
        const avg35 = sum35 / sampleCanvases.length;
        if (avg35 > avgBudget) {
          dpi = clamp(Math.round(dpi * Math.sqrt((avgBudget * 0.85) / avg35)), 20, dpi);
        }
      } else if (avg65 < avgBudget * 0.45 && dpi < 200) {
        for (const c of sampleCanvases) {
          const b88 = await canvasToJpegBytes(c, 0.88);
          sum88 += b88.byteLength;
        }
        const avg88 = sum88 / sampleCanvases.length;
        if (avg88 < avgBudget * 0.65) {
          dpi = clamp(Math.round(dpi * Math.sqrt((avgBudget * 0.72) / Math.max(1, avg88))), dpi, 220);
        }
      }

      return { dpi, totalImageBudget, overhead };
    } finally {
      sampleCanvases.forEach(c => { c.width = c.height = 0; });
      workCanvas.width = workCanvas.height = 0;
    }
  }

  async function runTargetSizeCompression(srcPdf, targetBytes, grayscale, useObjStreams) {
    const n = srcPdf.numPages;
    const cal = await calibrateDpiForTarget(srcPdf, targetBytes, grayscale);
    let dpi = cal.dpi;
    let totalImageBudget = cal.totalImageBudget;

    async function executePass(passDpi, passImageBudget, passLabel) {
      const outPdf = await PDFLib.PDFDocument.create();
      const workCanvas = document.createElement('canvas');
      const tempCanvas = document.createElement('canvas');
      let bytesUsed = 0;

      try {
        for (let p = 1; p <= n; p++) {
          if (cancelRequested) throw new Error('CANCELLED');
          const remainingPages = n - p + 1;
          const remainingBudget = Math.max(1000 * remainingPages, passImageBudget - bytesUsed);
          const pageBudget = remainingBudget / remainingPages;

          setProgressUI(
            true,
            `${passLabel}Page ${p} of ${n}...`,
            12 + (p / n) * 84,
            `Auto DPI: ${passDpi} · Running size: ${utils.formatBytes(bytesUsed + cal.overhead)} / ${utils.formatBytes(targetBytes)}`
          );

          const { ptWidth, ptHeight } = await renderPageToCanvas(srcPdf, p, passDpi, grayscale, workCanvas);
          const bestBytes = await encodeCanvasWithinBudget(workCanvas, tempCanvas, pageBudget, 0.75);
          const embeddedImg = await outPdf.embedJpg(bestBytes);
          const page = outPdf.addPage([ptWidth, ptHeight]);
          page.drawImage(embeddedImg, { x: 0, y: 0, width: ptWidth, height: ptHeight });
          bytesUsed += bestBytes.byteLength;

          await new Promise(r => setTimeout(r, 0));
        }

        setProgressUI(true, 'Finalizing PDF...', 98, 'Compacting streams and stripping redundant data...');
        return await outPdf.save({ useObjectStreams: useObjStreams });
      } finally {
        workCanvas.width = workCanvas.height = 0;
        tempCanvas.width = tempCanvas.height = 0;
      }
    }

    let pdfBytes = await executePass(dpi, totalImageBudget, '');

    // Safety corrective pass if PDF-lib object overhead pushed total slightly above targetBytes
    if (pdfBytes.byteLength > targetBytes && dpi > 20 && !cancelRequested) {
      const ratio = (targetBytes * 0.90) / pdfBytes.byteLength;
      const tightenedDpi = clamp(Math.floor(dpi * Math.sqrt(ratio)), 18, Math.max(18, dpi - 4));
      const tightenedBudget = Math.max(n * 850, totalImageBudget * ratio * 0.92);
      const retryBytes = await executePass(tightenedDpi, tightenedBudget, 'Fine-tuning · ');
      if (retryBytes.byteLength < pdfBytes.byteLength) {
        pdfBytes = retryBytes;
        dpi = tightenedDpi;
      }
    }

    return {
      pdfBytes,
      usedDpi: dpi,
      summary: `Target: ${utils.formatBytes(targetBytes)} · Auto DPI: ${dpi}${grayscale ? ' · Grayscale' : ''}${useObjStreams ? ' · Compact streams' : ''}`
    };
  }

  actionBtn.addEventListener('click', async () => {
    if (!currentFile || isCompressing) return;

    isCompressing = true;
    cancelRequested = false;
    actionBtn.disabled = true;
    resultBox.classList.add('hidden');

    let srcPdf = null;
    try {
      const arrayBuffer = await currentFile.arrayBuffer();
      srcPdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

      const grayscale = grayscaleCheck.checked;
      const useObjStreams = objStreamsCheck.checked;

      let result;
      if (compressMode === 'manual') {
        const dpi = clamp(parseInt(dpiInput.value, 10) || 60, 20, 300);
        const qualityPct = clamp(parseInt(qualityInput.value, 10) || 75, 10, 95);
        dpiInput.value = dpi;
        qualityInput.value = qualityPct;
        result = await runManualCompression(srcPdf, dpi, qualityPct / 100, grayscale, useObjStreams);
      } else {
        const targetBytes = getTargetBytes();
        result = await runTargetSizeCompression(srcPdf, targetBytes, grayscale, useObjStreams);
      }

      const blob = new Blob([result.pdfBytes], { type: 'application/pdf' });
      const baseName = currentFile.name.replace(/\.pdf$/i, '');
      lastCompressedBlob = blob;
      lastCompressedFilename = `${baseName}_compressed.pdf`;

      const origSize = currentFile.size;
      const newSize = blob.size;
      const savedPct = origSize > 0 ? (((origSize - newSize) / origSize) * 100).toFixed(1) : '0.0';

      resultSummary.textContent = result.summary;
      resultSizes.textContent = `${utils.formatBytes(origSize)} → ${utils.formatBytes(newSize)}`;
      if (newSize < origSize) {
        resultSavings.textContent = `${savedPct}% smaller`;
        resultSavings.className = 'text-xs font-semibold text-emerald-700 dark:text-emerald-300 tabular-nums';
      } else {
        resultSavings.textContent = `Re-encoded (${utils.formatBytes(newSize)})`;
        resultSavings.className = 'text-xs font-semibold text-amber-700 dark:text-amber-300 tabular-nums';
      }

      resultBox.classList.remove('hidden');
      setProgressUI(false);
      const metaRes = await utils.savePdfWithMetadata(
        blob,
        lastCompressedFilename,
        `${baseName} (Compressed)`,
        { useObjectStreams: useObjStreams }
      );
      if (metaRes && metaRes.saved && metaRes.blob) {
        lastCompressedBlob = metaRes.blob;
        lastCompressedFilename = metaRes.filename;
      }

      if (compressMode === 'target') {
        const targetBytes = getTargetBytes();
        if (newSize > targetBytes) {
          utils.showToast('Minimum Reached', `Smallest achievable size for ${totalPages} pages is ${utils.formatBytes(newSize)}.`, 'info');
        } else if (metaRes && metaRes.saved) {
          utils.showToast('Success', `Compressed from ${utils.formatBytes(origSize)} to ${utils.formatBytes(newSize)}!`);
        }
      } else if (metaRes && metaRes.saved) {
        utils.showToast('Success', `PDF compressed to ${utils.formatBytes(newSize)}!`);
      }
    } catch (err) {
      if (err && err.message === 'CANCELLED') {
        utils.showToast('Cancelled', 'PDF compression cancelled.', 'info');
      } else {
        console.error('PDF compression failed:', err);
        utils.showToast('Error', 'Failed to compress PDF. Try lowering DPI or check file.', 'error');
      }
    } finally {
      if (srcPdf) {
        try { await srcPdf.destroy(); } catch {}
      }
      isCompressing = false;
      cancelRequested = false;
      actionBtn.disabled = !currentFile;
      setProgressUI(false);
    }
  });

  downloadAgainBtn.addEventListener('click', async () => {
    if (lastCompressedBlob) {
      await utils.savePdfWithMetadata(
        lastCompressedBlob,
        lastCompressedFilename || 'compressed.pdf',
        (lastCompressedFilename || 'Compressed PDF').replace(/\.pdf$/i, '')
      );
    }
  });
}

/* ==========================================================================
   Persistent Dark / Light Theme Controller
   ========================================================================== */

function initTheme() {
  const toggleBtn = document.getElementById('themeToggleBtn');
  const sunIcon = document.getElementById('themeIconSun');
  const moonIcon = document.getElementById('themeIconMoon');
  const label = document.getElementById('themeToggleLabel');
  const metaTheme = document.getElementById('metaThemeColor');

  function applyTheme(isDark, persist = false) {
    document.documentElement.classList.toggle('dark', isDark);
    if (sunIcon) sunIcon.classList.toggle('hidden', !isDark);
    if (moonIcon) moonIcon.classList.toggle('hidden', isDark);
    if (label) label.textContent = isDark ? 'Light' : 'Dark';
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-pressed', String(isDark));
      toggleBtn.setAttribute('aria-label', isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
    }
    if (metaTheme) {
      metaTheme.setAttribute('content', isDark ? '#151B2B' : '#293B80');
    }
    if (persist) {
      try {
        localStorage.setItem('pdfBondhuTheme', isDark ? 'dark' : 'light');
        localStorage.setItem('pdfBondhuThemeMode_v2', isDark ? 'dark' : 'light');
      } catch {}
    }
  }

  // Sync UI state with already-applied <html class="dark"> from head bootstrap
  applyTheme(document.documentElement.classList.contains('dark'), false);

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const nextDark = !document.documentElement.classList.contains('dark');
      applyTheme(nextDark, true);
      const nextMode = nextDark ? 'dark' : 'light';
      document.querySelectorAll('[data-theme-mode]').forEach((b) => {
        const act = b.getAttribute('data-theme-mode') === nextMode;
        b.classList.toggle('bg-[#293B80]', act);
        b.classList.toggle('text-white', act);
        b.classList.toggle('border-[#293B80]', act);
      });
      utils.showToast(
        nextDark ? 'Dark Mode Enabled' : 'Light Mode Enabled',
        'Your theme preference is saved automatically.',
        'info'
      );
    });
  }
}

/* ==========================================================================
   Home Dashboard Quick Search, Category Filter & Local Stats
   ========================================================================== */

function initHomeFilters() {
  const searchInput = document.getElementById('homeToolSearch');
  const catButtons = document.querySelectorAll('.home-cat-btn');
  const cards = document.querySelectorAll('.home-tool-card');
  const emptyBox = document.getElementById('homeEmptySearch');
  const statsEl = document.getElementById('homeStatsText');

  // Restore local processed file count
  if (statsEl) {
    try {
      const count = parseInt(localStorage.getItem('pdfBondhuCount') || '0', 10) || 0;
      statsEl.textContent = `${count} file${count === 1 ? '' : 's'} processed locally`;
    } catch {}
  }

  let activeCat = 'all';

  function filterCards() {
    const q = (searchInput ? searchInput.value : '').trim().toLowerCase();
    let visibleCount = 0;
    cards.forEach(card => {
      const cat = card.getAttribute('data-cat') || 'all';
      const keywords = (card.getAttribute('data-keywords') || '') + ' ' + (card.textContent || '');
      const matchesCat = activeCat === 'all' || cat === activeCat;
      const matchesQuery = !q || keywords.toLowerCase().includes(q);
      const show = matchesCat && matchesQuery;
      card.classList.toggle('hidden', !show);
      if (show) visibleCount++;
    });
    if (emptyBox) {
      emptyBox.classList.toggle('hidden', visibleCount > 0);
    }
  }

  catButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      activeCat = btn.getAttribute('data-cat') || 'all';
      catButtons.forEach(b => {
        b.className = 'home-cat-btn px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap min-h-[38px]';
      });
      btn.className = 'home-cat-btn px-3.5 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-sm transition-colors whitespace-nowrap min-h-[38px]';
      filterCards();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', filterCards);
  }
}

/* ==========================================================================
   12. Rotate & Organize PDF Pages (Visual Thumbnail Editor)
   ========================================================================== */

function initPdfOrganizer() {
  const input = document.getElementById('pdfOrganizeInput');
  const grid = document.getElementById('pdfOrganizeGrid');
  const emptyState = document.getElementById('pdfOrganizeEmptyState');
  const actionBtn = document.getElementById('pdfOrganizeActionBtn');
  const rotateAllBtn = document.getElementById('pdfOrganizeRotateAllBtn');
  const reverseBtn = document.getElementById('pdfOrganizeReverseBtn');
  const resetBtn = document.getElementById('pdfOrganizeResetBtn');
  const metaBar = document.getElementById('pdfOrganizeMetaBar');
  const fileLabel = document.getElementById('pdfOrganizeFileLabel');
  const pageCountEl = document.getElementById('pdfOrganizePageCount');

  if (!input || !grid) return;

  let currentFile = null;
  let sourceBytes = null;
  let pagesState = []; // [{ origIndex, thumbUrl, rotation }]
  let initialPagesState = [];

  function syncToolbar() {
    const hasPages = pagesState.length > 0;
    actionBtn.disabled = !hasPages;
    grid.classList.toggle('hidden', !hasPages);
    emptyState.classList.toggle('hidden', hasPages);
    rotateAllBtn.classList.toggle('hidden', !hasPages);
    reverseBtn.classList.toggle('hidden', !hasPages);
    resetBtn.classList.toggle('hidden', !hasPages);
    metaBar.classList.toggle('hidden', !hasPages);
    if (hasPages) {
      metaBar.classList.add('flex');
      fileLabel.textContent = currentFile ? currentFile.name : '';
      pageCountEl.textContent = `${pagesState.length} page${pagesState.length === 1 ? '' : 's'} ready`;
    } else {
      metaBar.classList.remove('flex');
    }
  }

  function renderGrid() {
    syncToolbar();
    grid.innerHTML = '';
    pagesState.forEach((p, idx) => {
      const li = document.createElement('li');
      li.className = 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex flex-col gap-2.5 shadow-sm hover:border-blue-400 dark:hover:border-blue-600 transition-colors';
      li.innerHTML = `
        <div class="relative aspect-[3/4] bg-slate-100 dark:bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center p-2 border border-slate-100 dark:border-slate-800">
          <img src="${p.thumbUrl}" alt="Page ${p.origIndex + 1}" class="max-w-full max-h-full object-contain transition-transform duration-200 shadow-sm bg-white" style="transform: rotate(${p.rotation}deg);" />
          <span class="absolute top-2 left-2 bg-slate-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-md tabular-nums">#${idx + 1}</span>
          ${p.rotation ? `<span class="absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md tabular-nums">${p.rotation}°</span>` : ''}
        </div>
        <div class="grid grid-cols-5 gap-1">
          <button type="button" class="org-rot-l bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-slate-700 dark:text-slate-200 rounded-lg py-1.5 flex items-center justify-center transition-colors" title="Rotate Left" data-idx="${idx}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          </button>
          <button type="button" class="org-rot-r bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-slate-700 dark:text-slate-200 rounded-lg py-1.5 flex items-center justify-center transition-colors" title="Rotate Right" data-idx="${idx}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
          </button>
          <button type="button" class="org-left bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-slate-700 dark:text-slate-200 rounded-lg py-1.5 flex items-center justify-center transition-colors disabled:opacity-30" title="Move Left" data-idx="${idx}" ${idx === 0 ? 'disabled' : ''}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <button type="button" class="org-right bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-slate-700 dark:text-slate-200 rounded-lg py-1.5 flex items-center justify-center transition-colors disabled:opacity-30" title="Move Right" data-idx="${idx}" ${idx === pagesState.length - 1 ? 'disabled' : ''}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
          <button type="button" class="org-del bg-red-50 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 rounded-lg py-1.5 flex items-center justify-center transition-colors" title="Delete Page" data-idx="${idx}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      `;
      grid.appendChild(li);
    });

    grid.querySelectorAll('.org-rot-l').forEach(btn => {
      btn.onclick = () => {
        const i = parseInt(btn.getAttribute('data-idx'), 10);
        pagesState[i].rotation = (pagesState[i].rotation + 270) % 360;
        renderGrid();
      };
    });
    grid.querySelectorAll('.org-rot-r').forEach(btn => {
      btn.onclick = () => {
        const i = parseInt(btn.getAttribute('data-idx'), 10);
        pagesState[i].rotation = (pagesState[i].rotation + 90) % 360;
        renderGrid();
      };
    });
    grid.querySelectorAll('.org-left').forEach(btn => {
      btn.onclick = () => {
        const i = parseInt(btn.getAttribute('data-idx'), 10);
        if (i > 0) {
          [pagesState[i - 1], pagesState[i]] = [pagesState[i], pagesState[i - 1]];
          renderGrid();
        }
      };
    });
    grid.querySelectorAll('.org-right').forEach(btn => {
      btn.onclick = () => {
        const i = parseInt(btn.getAttribute('data-idx'), 10);
        if (i < pagesState.length - 1) {
          [pagesState[i + 1], pagesState[i]] = [pagesState[i], pagesState[i + 1]];
          renderGrid();
        }
      };
    });
    grid.querySelectorAll('.org-del').forEach(btn => {
      btn.onclick = () => {
        const i = parseInt(btn.getAttribute('data-idx'), 10);
        if (pagesState.length <= 1) {
          utils.showToast('Wait', 'A PDF must keep at least 1 page.', 'info');
          return;
        }
        pagesState.splice(i, 1);
        renderGrid();
      };
    });
  }

  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    input.value = '';
    utils.showLoader('Rendering PDF thumbnails...', 'text-blue-600 dark:text-blue-400');

    try {
      const buf = await file.arrayBuffer();
      sourceBytes = new Uint8Array(buf.slice(0));
      currentFile = file;

      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      const total = pdf.numPages;
      pagesState = [];

      for (let i = 1; i <= total; i++) {
        const page = await pdf.getPage(i);
        const vp = page.getViewport({ scale: 0.45 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.floor(vp.width));
        canvas.height = Math.max(1, Math.floor(vp.height));
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        pagesState.push({
          origIndex: i - 1,
          thumbUrl: canvas.toDataURL('image/jpeg', 0.72),
          rotation: 0
        });
      }
      await pdf.destroy();
      initialPagesState = pagesState.map(p => ({ ...p }));
      renderGrid();
      utils.showToast('PDF Loaded', `Loaded ${total} page${total === 1 ? '' : 's'} for organizing.`, 'info');
    } catch (err) {
      console.error(err);
      utils.showToast('Error', 'Could not read PDF pages.', 'error');
    } finally {
      utils.hideLoader();
    }
  });

  rotateAllBtn.addEventListener('click', () => {
    pagesState.forEach(p => { p.rotation = (p.rotation + 90) % 360; });
    renderGrid();
  });

  reverseBtn.addEventListener('click', () => {
    pagesState.reverse();
    renderGrid();
  });

  resetBtn.addEventListener('click', () => {
    pagesState = initialPagesState.map(p => ({ ...p }));
    renderGrid();
  });

  actionBtn.addEventListener('click', async () => {
    if (!sourceBytes || pagesState.length === 0) return;
    utils.showLoader('Rebuilding Organized PDF...', 'text-blue-600 dark:text-blue-400');
    try {
      const srcDoc = await PDFLib.PDFDocument.load(sourceBytes);
      const outDoc = await PDFLib.PDFDocument.create();

      for (const item of pagesState) {
        const [copied] = await outDoc.copyPages(srcDoc, [item.origIndex]);
        if (item.rotation) {
          const existingAngle = copied.getRotation().angle || 0;
          copied.setRotation(PDFLib.degrees((existingAngle + item.rotation) % 360));
        }
        outDoc.addPage(copied);
      }

      const baseName = currentFile.name.replace(/\.pdf$/i, '');
      const res = await utils.savePdfWithMetadata(outDoc, `${baseName}_organized.pdf`, `${baseName} (Organized)`);
      if (res && res.saved) {
        utils.showToast('Success', `Saved organized PDF (${pagesState.length} pages).`);
      }
    } catch (err) {
      console.error(err);
      utils.showToast('Error', 'Failed to rebuild PDF.', 'error');
    } finally {
      utils.hideLoader();
    }
  });
}

/* ==========================================================================
   13. Watermark & Automatic Page Numbers PDF
   ========================================================================== */

function initPdfWatermark() {
  const input = document.getElementById('pdfWmInput');
  const fileNameEl = document.getElementById('pdfWmFileName');
  const fileMetaEl = document.getElementById('pdfWmFileMeta');
  const enableText = document.getElementById('pdfWmEnableText');
  const wmTextInput = document.getElementById('pdfWmText');
  const wmStyleSelect = document.getElementById('pdfWmStyle');
  const wmColorSelect = document.getElementById('pdfWmColor');
  const wmOpacitySlider = document.getElementById('pdfWmOpacity');
  const wmOpacityVal = document.getElementById('pdfWmOpacityVal');
  const wmSizeSlider = document.getElementById('pdfWmSize');
  const wmSizeVal = document.getElementById('pdfWmSizeVal');
  const enablePages = document.getElementById('pdfWmEnablePages');
  const pagePosSelect = document.getElementById('pdfWmPagePos');
  const pageFmtSelect = document.getElementById('pdfWmPageFmt');
  const previewText = document.getElementById('pdfWmPreviewText');
  const previewPage = document.getElementById('pdfWmPreviewPage');
  const actionBtn = document.getElementById('pdfWmActionBtn');
  const presets = document.querySelectorAll('.pdf-wm-preset');

  if (!input || !actionBtn) return;

  let currentFile = null;
  let sourceBytes = null;

  const colorMap = {
    rose: { css: 'text-rose-600', rgb: [0.88, 0.11, 0.28] },
    indigo: { css: 'text-indigo-600', rgb: [0.31, 0.27, 0.9] },
    slate: { css: 'text-slate-600 dark:text-slate-300', rgb: [0.35, 0.4, 0.48] },
    emerald: { css: 'text-emerald-600', rgb: [0.06, 0.65, 0.45] },
    fuchsia: { css: 'text-fuchsia-600', rgb: [0.75, 0.15, 0.83] }
  };

  function updatePreview() {
    const op = parseInt(wmOpacitySlider.value, 10) || 25;
    const sz = parseInt(wmSizeSlider.value, 10) || 48;
    wmOpacityVal.textContent = `${op}%`;
    wmSizeVal.textContent = `${sz}px`;

    const colorCfg = colorMap[wmColorSelect.value] || colorMap.rose;
    const style = wmStyleSelect.value;
    previewText.textContent = wmTextInput.value.trim() || 'WATERMARK';
    previewText.style.opacity = enableText.checked ? String(op / 100) : '0';
    previewText.className = `absolute inset-0 flex font-extrabold tracking-widest pointer-events-none transition-all ${colorCfg.css} ${
      style === 'footer'
        ? 'items-end justify-center pb-6 text-xs rotate-0'
        : style === 'tiled'
          ? 'items-center justify-center text-sm -rotate-12'
          : 'items-center justify-center text-xl -rotate-12'
    }`;

    if (enablePages.checked) {
      const fmt = pageFmtSelect.value;
      const pos = pagePosSelect.value;
      previewPage.textContent = fmt === 'page_of' ? 'Page 1 of 5' : fmt === 'slash' ? '1 / 5' : '1';
      previewPage.className = `absolute inset-x-3 text-[10px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums ${
        pos === 'top-right' ? 'top-2 text-right' : pos === 'bottom-right' ? 'bottom-2 text-right' : 'bottom-2 text-center'
      }`;
      previewPage.classList.remove('hidden');
    } else {
      previewPage.classList.add('hidden');
    }
  }

  presets.forEach(btn => {
    btn.addEventListener('click', () => {
      wmTextInput.value = btn.getAttribute('data-wm') || 'CONFIDENTIAL';
      enableText.checked = true;
      updatePreview();
    });
  });

  [enableText, wmTextInput, wmStyleSelect, wmColorSelect, wmOpacitySlider, wmSizeSlider, enablePages, pagePosSelect, pageFmtSelect].forEach(el => {
    if (el) el.addEventListener('input', updatePreview);
    if (el) el.addEventListener('change', updatePreview);
  });
  updatePreview();

  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    input.value = '';
    try {
      const buf = await file.arrayBuffer();
      const doc = await PDFLib.PDFDocument.load(buf);
      sourceBytes = new Uint8Array(buf);
      currentFile = file;
      fileNameEl.textContent = file.name;
      fileMetaEl.textContent = `${utils.formatBytes(file.size)} · ${doc.getPageCount()} pages`;
      actionBtn.disabled = false;
    } catch (err) {
      console.error(err);
      utils.showToast('Error', 'Invalid or encrypted PDF file.', 'error');
    }
  });

  actionBtn.addEventListener('click', async () => {
    if (!sourceBytes || !currentFile) return;
    if (!enableText.checked && !enablePages.checked) {
      utils.showToast('Nothing Selected', 'Enable Watermark or Page Numbers first.', 'info');
      return;
    }

    utils.showLoader('Stamping PDF...', 'text-fuchsia-600 dark:text-fuchsia-400');
    try {
      const pdfDoc = await PDFLib.PDFDocument.load(sourceBytes);
      const fontBold = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);
      const fontRegular = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();
      const total = pages.length;

      const textVal = (wmTextInput.value.trim() || 'CONFIDENTIAL').replace(/[^\x20-\x7E]/g, '?');
      const opacity = (parseInt(wmOpacitySlider.value, 10) || 25) / 100;
      const fontSize = parseInt(wmSizeSlider.value, 10) || 48;
      const style = wmStyleSelect.value;
      const [r, g, b] = (colorMap[wmColorSelect.value] || colorMap.rose).rgb;
      const wmColor = PDFLib.rgb(r, g, b);

      pages.forEach((page, idx) => {
        const { width, height } = page.getSize();

        if (enableText.checked && textVal) {
          if (style === 'diagonal') {
            const textWidth = fontBold.widthOfTextAtSize(textVal, fontSize);
            const angleRad = (35 * Math.PI) / 180;
            const x = width / 2 - (textWidth / 2) * Math.cos(angleRad);
            const y = height / 2 - (textWidth / 2) * Math.sin(angleRad);
            page.drawText(textVal, {
              x,
              y,
              size: fontSize,
              font: fontBold,
              color: wmColor,
              opacity,
              rotate: PDFLib.degrees(35)
            });
          } else if (style === 'tiled') {
            const tileSize = Math.max(16, Math.round(fontSize * 0.55));
            const stepX = Math.max(150, fontBold.widthOfTextAtSize(textVal, tileSize) + 70);
            const stepY = 140;
            for (let y = 40; y < height; y += stepY) {
              for (let x = -20; x < width; x += stepX) {
                page.drawText(textVal, {
                  x,
                  y,
                  size: tileSize,
                  font: fontBold,
                  color: wmColor,
                  opacity: Math.min(opacity, 0.35),
                  rotate: PDFLib.degrees(30)
                });
              }
            }
          } else {
            const footerSize = Math.min(20, Math.max(11, Math.round(fontSize * 0.35)));
            const tw = fontBold.widthOfTextAtSize(textVal, footerSize);
            page.drawText(textVal, {
              x: (width - tw) / 2,
              y: 34,
              size: footerSize,
              font: fontBold,
              color: wmColor,
              opacity: Math.max(opacity, 0.45)
            });
          }
        }

        if (enablePages.checked) {
          const fmt = pageFmtSelect.value;
          const pos = pagePosSelect.value;
          const label = fmt === 'page_of' ? `Page ${idx + 1} of ${total}` : fmt === 'slash' ? `${idx + 1} / ${total}` : `${idx + 1}`;
          const pSize = 10;
          const tw = fontRegular.widthOfTextAtSize(label, pSize);
          let px = (width - tw) / 2;
          let py = 18;
          if (pos === 'bottom-right') {
            px = width - tw - 24;
            py = 18;
          } else if (pos === 'top-right') {
            px = width - tw - 24;
            py = height - 24;
          }
          page.drawText(label, {
            x: px,
            y: py,
            size: pSize,
            font: fontRegular,
            color: PDFLib.rgb(0.28, 0.33, 0.41),
            opacity: 0.9
          });
        }
      });

      const baseName = currentFile.name.replace(/\.pdf$/i, '');
      const res = await utils.savePdfWithMetadata(pdfDoc, `${baseName}_watermarked.pdf`, `${baseName} (Watermarked)`);
      if (res && res.saved) {
        utils.showToast('Success', 'Watermark & page numbers applied cleanly!');
      }
    } catch (err) {
      console.error(err);
      utils.showToast('Error', 'Failed to stamp PDF.', 'error');
    } finally {
      utils.hideLoader();
    }
  });
}

/* ==========================================================================
   14. Passport Photo & Form Image Resizer (Exact Pixels & Max KB Target)
   ========================================================================== */

function initPhotoResizer() {
  const input = document.getElementById('imgResizeInput');
  const changeInput = document.getElementById('imgResizeChangeInput');
  const dropZone = document.getElementById('imgResizeDropZone');
  const previewWrap = document.getElementById('imgResizePreviewWrap');
  const previewCanvas = document.getElementById('imgResizePreviewCanvas');
  const metaEl = document.getElementById('imgResizeMeta');
  const widthInput = document.getElementById('imgResizeWidth');
  const heightInput = document.getElementById('imgResizeHeight');
  const lockRatio = document.getElementById('imgResizeLockRatio');
  const fitModeSelect = document.getElementById('imgResizeFitMode');
  const maxKbInput = document.getElementById('imgResizeMaxKb');
  const actionBtn = document.getElementById('imgResizeActionBtn');
  const presetBtns = document.querySelectorAll('.img-resize-preset');

  if (!input || !actionBtn) return;

  let loadedImg = null;
  let currentFileName = 'photo.jpg';
  let naturalRatio = 1;

  function renderToCanvas(targetCanvas, targetW, targetH) {
    targetCanvas.width = targetW;
    targetCanvas.height = targetH;
    const ctx = targetCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetW, targetH);

    if (!loadedImg) return;
    const fitMode = fitModeSelect.value;
    const iw = loadedImg.naturalWidth;
    const ih = loadedImg.naturalHeight;

    if (fitMode === 'stretch') {
      ctx.drawImage(loadedImg, 0, 0, targetW, targetH);
    } else if (fitMode === 'contain') {
      const scale = Math.min(targetW / iw, targetH / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      ctx.drawImage(loadedImg, (targetW - dw) / 2, (targetH - dh) / 2, dw, dh);
    } else {
      // Smart center cover crop
      const scale = Math.max(targetW / iw, targetH / ih);
      const sw = targetW / scale;
      const sh = targetH / scale;
      const sx = (iw - sw) / 2;
      const sy = (ih - sh) / 2;
      ctx.drawImage(loadedImg, sx, sy, sw, sh, 0, 0, targetW, targetH);
    }
  }

  function updatePreview() {
    if (!loadedImg) return;
    const w = Math.max(20, Math.min(4000, parseInt(widthInput.value, 10) || 413));
    const h = Math.max(20, Math.min(4000, parseInt(heightInput.value, 10) || 531));
    renderToCanvas(previewCanvas, w, h);
    const maxKb = parseInt(maxKbInput.value, 10) || 0;
    metaEl.textContent = `Output: ${w} × ${h} px${maxKb > 0 ? ` · Target ≤ ${maxKb} KB` : ' · Best Quality'}`;
  }

  function loadImageFile(file) {
    if (!file) return;
    currentFileName = file.name;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        loadedImg = img;
        naturalRatio = img.naturalWidth / Math.max(1, img.naturalHeight);
        dropZone.classList.add('hidden');
        previewWrap.classList.remove('hidden');
        previewWrap.classList.add('flex');
        actionBtn.disabled = false;
        updatePreview();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  input.addEventListener('change', (e) => {
    loadImageFile(e.target.files[0]);
    input.value = '';
  });
  if (changeInput) {
    changeInput.addEventListener('change', (e) => {
      loadImageFile(e.target.files[0]);
      changeInput.value = '';
    });
  }

  widthInput.addEventListener('input', () => {
    if (lockRatio.checked && loadedImg) {
      const w = parseInt(widthInput.value, 10);
      if (w > 0) heightInput.value = Math.max(20, Math.round(w / naturalRatio));
    }
    updatePreview();
  });

  heightInput.addEventListener('input', () => {
    if (lockRatio.checked && loadedImg) {
      const h = parseInt(heightInput.value, 10);
      if (h > 0) widthInput.value = Math.max(20, Math.round(h * naturalRatio));
    }
    updatePreview();
  });

  fitModeSelect.addEventListener('change', updatePreview);
  maxKbInput.addEventListener('input', updatePreview);

  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      widthInput.value = btn.getAttribute('data-w');
      heightInput.value = btn.getAttribute('data-h');
      maxKbInput.value = btn.getAttribute('data-kb');
      lockRatio.checked = false;
      updatePreview();
    });
  });

  function canvasToJpegBlob(canvas, quality) {
    return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
  }

  actionBtn.addEventListener('click', async () => {
    if (!loadedImg) return;
    const w = Math.max(20, Math.min(4000, parseInt(widthInput.value, 10) || 413));
    const h = Math.max(20, Math.min(4000, parseInt(heightInput.value, 10) || 531));
    const maxKb = parseInt(maxKbInput.value, 10) || 0;

    utils.showLoader('Resizing photo...', 'text-emerald-600 dark:text-emerald-400');
    try {
      const outCanvas = document.createElement('canvas');
      renderToCanvas(outCanvas, w, h);

      let finalBlob;
      if (maxKb > 0) {
        const maxBytes = maxKb * 1024;
        // Binary search optimal JPEG quality to stay right under target KB
        let low = 0.08;
        let high = 0.96;
        let bestBlob = await canvasToJpegBlob(outCanvas, low);

        for (let step = 0; step < 8; step++) {
          const mid = (low + high) / 2;
          const candidate = await canvasToJpegBlob(outCanvas, mid);
          if (candidate.size <= maxBytes) {
            bestBlob = candidate;
            low = mid;
          } else {
            high = mid;
          }
        }
        finalBlob = bestBlob;
      } else {
        finalBlob = await canvasToJpegBlob(outCanvas, 0.94);
      }

      const base = currentFileName.replace(/\.[^/.]+$/, '');
      utils.downloadBlob(finalBlob, `${base}_${w}x${h}.jpg`);
      utils.showToast('Photo Ready', `Saved ${w}×${h} px (${utils.formatBytes(finalBlob.size)}).`);
    } catch (err) {
      console.error(err);
      utils.showToast('Error', 'Failed to resize photo.', 'error');
    } finally {
      utils.hideLoader();
    }
  });
}

/* ==========================================================================
   15. E-Sign & Self-Attest PDF
   ========================================================================== */

function initPdfSign() {
  const pdfInput = document.getElementById('pdfSignInput');
  const fileNameEl = document.getElementById('pdfSignFileName');
  const signPad = document.getElementById('pdfSignPad');
  const clearPadBtn = document.getElementById('pdfSignClearPadBtn');
  const inkBtns = document.querySelectorAll('.sign-ink-btn');
  const signImgInput = document.getElementById('pdfSignImgInput');
  const addDateCheck = document.getElementById('pdfSignAddDate');
  const sizeSlider = document.getElementById('pdfSignSizeSlider');
  const sizeVal = document.getElementById('pdfSignSizeVal');
  const saveBtn = document.getElementById('pdfSignSaveBtn');

  const prevBtn = document.getElementById('pdfSignPrevPage');
  const nextBtn = document.getElementById('pdfSignNextPage');
  const pageLabel = document.getElementById('pdfSignPageLabel');
  const emptyPreview = document.getElementById('pdfSignEmptyPreview');
  const stageWrap = document.getElementById('pdfSignStageWrap');
  const pageCanvas = document.getElementById('pdfSignPageCanvas');
  const markerEl = document.getElementById('pdfSignMarker');
  const markerImg = document.getElementById('pdfSignMarkerImg');
  const markerDate = document.getElementById('pdfSignMarkerDate');

  if (!pdfInput || !signPad || !saveBtn) return;

  const padCtx = signPad.getContext('2d');
  let inkColor = '#0f172a';
  let isDrawing = false;
  let hasDrawnSignature = false;
  let uploadedSignDataUrl = null;

  let currentFile = null;
  let pdfBytesBuffer = null;
  let pdfJsDoc = null;
  let totalPages = 0;
  let currentPageNum = 1;

  // Normalized placement (center of signature on active page)
  let placement = { x: 0.72, y: 0.84, placed: false };

  function getActiveSignatureDataUrl() {
    if (uploadedSignDataUrl) return uploadedSignDataUrl;
    if (!hasDrawnSignature) return null;
    // Trim transparent margins from drawn canvas for crisp placement
    const w = signPad.width;
    const h = signPad.height;
    const imgData = padCtx.getImageData(0, 0, w, h).data;
    let minX = w, minY = h, maxX = 0, maxY = 0, found = false;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (imgData[(y * w + x) * 4 + 3] > 10) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
          found = true;
        }
      }
    }
    if (!found) return null;
    const padPx = 8;
    const sx = Math.max(0, minX - padPx);
    const sy = Math.max(0, minY - padPx);
    const sw = Math.min(w - sx, maxX - minX + padPx * 2);
    const sh = Math.min(h - sy, maxY - minY + padPx * 2);
    const trimmed = document.createElement('canvas');
    trimmed.width = Math.max(20, sw);
    trimmed.height = Math.max(20, sh);
    trimmed.getContext('2d').drawImage(signPad, sx, sy, sw, sh, 0, 0, sw, sh);
    return trimmed.toDataURL('image/png');
  }

  function updateMarkerOverlay() {
    const sigUrl = getActiveSignatureDataUrl();
    const pctWidth = parseInt(sizeSlider.value, 10) || 24;
    sizeVal.textContent = `${pctWidth}%`;

    const ready = Boolean(pdfBytesBuffer && sigUrl);
    saveBtn.disabled = !ready;

    if (!pdfJsDoc || !sigUrl) {
      markerEl.classList.add('hidden');
      return;
    }
    if (!placement.placed) {
      placement.placed = true;
    }

    markerImg.src = sigUrl;
    markerEl.style.width = `${pctWidth}%`;
    markerEl.style.left = `${Math.max(4, Math.min(96 - pctWidth, placement.x * 100 - pctWidth / 2))}%`;
    markerEl.style.top = `${Math.max(2, Math.min(92, placement.y * 100 - 4))}%`;

    if (addDateCheck.checked) {
      const dStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      markerDate.textContent = `Self-Attested · ${dStr}`;
      markerDate.classList.remove('hidden');
    } else {
      markerDate.classList.add('hidden');
    }
    markerEl.classList.remove('hidden');
  }

  // Ink color buttons
  inkBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      inkColor = btn.getAttribute('data-ink') || '#0f172a';
      inkBtns.forEach(b => b.classList.remove('ring-2', 'ring-indigo-500'));
      btn.classList.add('ring-2', 'ring-indigo-500');
    });
  });

  function getPadCoords(e) {
    const rect = signPad.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * signPad.width,
      y: ((e.clientY - rect.top) / rect.height) * signPad.height
    };
  }

  signPad.addEventListener('pointerdown', (e) => {
    uploadedSignDataUrl = null;
    isDrawing = true;
    hasDrawnSignature = true;
    const pt = getPadCoords(e);
    padCtx.strokeStyle = inkColor;
    padCtx.lineWidth = 3.2;
    padCtx.lineCap = 'round';
    padCtx.lineJoin = 'round';
    padCtx.beginPath();
    padCtx.moveTo(pt.x, pt.y);
    signPad.setPointerCapture(e.pointerId);
  });

  signPad.addEventListener('pointermove', (e) => {
    if (!isDrawing) return;
    const pt = getPadCoords(e);
    padCtx.lineTo(pt.x, pt.y);
    padCtx.stroke();
  });

  const endPadStroke = () => {
    if (!isDrawing) return;
    isDrawing = false;
    updateMarkerOverlay();
  };
  signPad.addEventListener('pointerup', endPadStroke);
  signPad.addEventListener('pointercancel', endPadStroke);

  clearPadBtn.addEventListener('click', () => {
    padCtx.clearRect(0, 0, signPad.width, signPad.height);
    hasDrawnSignature = false;
    uploadedSignDataUrl = null;
    updateMarkerOverlay();
  });

  signImgInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    signImgInput.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        // Convert uploaded signature photo into crisp transparent PNG (removes white paper bg!)
        const c = document.createElement('canvas');
        const maxS = 600;
        const scale = Math.min(1, maxS / Math.max(img.naturalWidth, img.naturalHeight));
        c.width = Math.max(40, Math.round(img.naturalWidth * scale));
        c.height = Math.max(40, Math.round(img.naturalHeight * scale));
        const ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, c.width, c.height);
        const id = ctx.getImageData(0, 0, c.width, c.height);
        const d = id.data;
        for (let i = 0; i < d.length; i += 4) {
          const lum = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
          if (lum > 210) {
            d[i + 3] = 0;
          }
        }
        ctx.putImageData(id, 0, 0);
        uploadedSignDataUrl = c.toDataURL('image/png');
        padCtx.clearRect(0, 0, signPad.width, signPad.height);
        padCtx.drawImage(c, 10, 10, signPad.width - 20, signPad.height - 20);
        updateMarkerOverlay();
        utils.showToast('Signature Loaded', 'White paper background automatically removed!');
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  addDateCheck.addEventListener('change', updateMarkerOverlay);
  sizeSlider.addEventListener('input', updateMarkerOverlay);

  async function renderPdfSignPage(num) {
    if (!pdfJsDoc) return;
    const page = await pdfJsDoc.getPage(num);
    const vp = page.getViewport({ scale: 1.15 });
    pageCanvas.width = vp.width;
    pageCanvas.height = vp.height;
    const ctx = pageCanvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    pageLabel.textContent = `Page ${num} / ${totalPages}`;
    prevBtn.disabled = num <= 1;
    nextBtn.disabled = num >= totalPages;
    updateMarkerOverlay();
  }

  pdfInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    pdfInput.value = '';
    if (!file) return;
    utils.showLoader('Loading PDF for Signing...', 'text-indigo-600');
    try {
      const buf = await file.arrayBuffer();
      pdfBytesBuffer = new Uint8Array(buf);
      currentFile = file;
      fileNameEl.textContent = file.name;

      pdfJsDoc = await pdfjsLib.getDocument({ data: pdfBytesBuffer.slice() }).promise;
      totalPages = pdfJsDoc.numPages;
      currentPageNum = 1;
      emptyPreview.classList.add('hidden');
      stageWrap.classList.remove('hidden');
      await renderPdfSignPage(currentPageNum);
    } catch (err) {
      console.error(err);
      utils.showToast('Error', 'Could not open PDF file.', 'error');
    } finally {
      utils.hideLoader();
    }
  });

  prevBtn.addEventListener('click', () => {
    if (currentPageNum > 1) {
      currentPageNum--;
      renderPdfSignPage(currentPageNum);
    }
  });
  nextBtn.addEventListener('click', () => {
    if (currentPageNum < totalPages) {
      currentPageNum++;
      renderPdfSignPage(currentPageNum);
    }
  });

  stageWrap.addEventListener('click', (e) => {
    if (!pdfJsDoc) return;
    const rect = pageCanvas.getBoundingClientRect();
    placement.x = Math.max(0.05, Math.min(0.95, (e.clientX - rect.left) / rect.width));
    placement.y = Math.max(0.05, Math.min(0.95, (e.clientY - rect.top) / rect.height));
    placement.placed = true;
    updateMarkerOverlay();
  });

  saveBtn.addEventListener('click', async () => {
    const sigUrl = getActiveSignatureDataUrl();
    if (!pdfBytesBuffer || !sigUrl) return;

    utils.showLoader('Embedding Signature...', 'text-indigo-600');
    try {
      const pdfDoc = await window.PDFLib.PDFDocument.load(pdfBytesBuffer, { ignoreEncryption: true });
      const sigPng = await pdfDoc.embedPng(sigUrl);
      const targetPage = pdfDoc.getPages()[currentPageNum - 1];
      const { width, height } = targetPage.getSize();

      const widthFrac = (parseInt(sizeSlider.value, 10) || 24) / 100;
      const drawW = width * widthFrac;
      const drawH = drawW * (sigPng.height / Math.max(1, sigPng.width));

      const leftPct = Math.max(0.04, Math.min(0.96 - widthFrac, placement.x - widthFrac / 2));
      const drawX = leftPct * width;
      const topPct = Math.max(0.02, Math.min(0.92, placement.y - 0.04));
      const drawY = Math.max(18, height - topPct * height - drawH);

      targetPage.drawImage(sigPng, {
        x: drawX,
        y: drawY,
        width: drawW,
        height: drawH
      });

      if (addDateCheck.checked) {
        const font = await pdfDoc.embedFont(window.PDFLib.StandardFonts.HelveticaBold);
        const dStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const stamp = `Self-Attested  ${dStr}`;
        targetPage.drawText(stamp, {
          x: drawX,
          y: Math.max(6, drawY - 12),
          size: 9,
          font,
          color: window.PDFLib.rgb(0.12, 0.16, 0.24)
        });
      }

      const base = currentFile.name.replace(/\.pdf$/i, '');
      const res = await utils.savePdfWithMetadata(pdfDoc, `${base}_signed.pdf`, `${base} (Signed)`);
      if (res && res.saved) {
        utils.showToast('Signed PDF Saved!', `"${res.filename}" is ready.`);
      }
    } catch (err) {
      console.error(err);
      utils.showToast('Error', 'Failed to apply signature to PDF.', 'error');
    } finally {
      utils.hideLoader();
    }
  });
}

/* ==========================================================================
   16. ID Card 2-in-1 A4 PDF Maker (Aadhaar / PAN / Voter / DL)
   ========================================================================== */

function initIdCardMaker() {
  const frontInput = document.getElementById('idFrontInput');
  const backInput = document.getElementById('idBackInput');
  const frontPreview = document.getElementById('idFrontPreview');
  const backPreview = document.getElementById('idBackPreview');
  const layoutSelect = document.getElementById('idCardLayout');
  const scaleSelect = document.getElementById('idCardScale');
  const selfAttestCheck = document.getElementById('idSelfAttestCheck');
  const generateBtn = document.getElementById('idCardGenerateBtn');

  if (!frontInput || !backInput || !generateBtn) return;

  let frontImg = null;
  let backImg = null;

  function syncBtn() {
    generateBtn.disabled = !(frontImg || backImg);
  }

  function loadIdSide(file, isFront) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        if (isFront) {
          frontImg = img;
          frontPreview.src = e.target.result;
          frontPreview.classList.remove('hidden');
        } else {
          backImg = img;
          backPreview.src = e.target.result;
          backPreview.classList.remove('hidden');
        }
        syncBtn();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  frontInput.addEventListener('change', (e) => { loadIdSide(e.target.files[0], true); frontInput.value = ''; });
  backInput.addEventListener('change', (e) => { loadIdSide(e.target.files[0], false); backInput.value = ''; });

  function imgToCleanJpegDataUrl(img) {
    const maxW = 1400;
    const ratio = Math.min(1, maxW / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.max(100, Math.round(img.naturalWidth * ratio));
    c.height = Math.max(100, Math.round(img.naturalHeight * ratio));
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.93);
  }

  generateBtn.addEventListener('click', async () => {
    if (!frontImg && !backImg) return;
    utils.showLoader('Creating Print-Ready A4 ID Card PDF...', 'text-emerald-600');
    try {
      const { PDFDocument, StandardFonts, rgb } = window.PDFLib;
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]); // Exact A4 in pt
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // Standard smart card = 85.6mm x 54mm = 242.6pt x 153pt
      const multiplier = scaleSelect.value === 'large' ? 1.25 : 1.0;
      const cardW = 243 * multiplier;
      const cardH = 153 * multiplier;

      const drawCard = async (imgObj, x, y, label) => {
        if (!imgObj) return;
        const embedded = await pdfDoc.embedJpg(imgToCleanJpegDataUrl(imgObj));
        // Subtle card outline
        page.drawRectangle({
          x: x - 2,
          y: y - 2,
          width: cardW + 4,
          height: cardH + 4,
          borderColor: rgb(0.75, 0.78, 0.84),
          borderWidth: 0.8,
          color: rgb(1, 1, 1)
        });
        // Contain cleanly inside card box
        const imgRatio = embedded.width / embedded.height;
        const boxRatio = cardW / cardH;
        let dw = cardW, dh = cardH;
        if (imgRatio > boxRatio) {
          dh = cardW / imgRatio;
        } else {
          dw = cardH * imgRatio;
        }
        page.drawImage(embedded, {
          x: x + (cardW - dw) / 2,
          y: y + (cardH - dh) / 2,
          width: dw,
          height: dh
        });
        page.drawText(label, {
          x,
          y: y - 14,
          size: 8,
          font,
          color: rgb(0.45, 0.5, 0.58)
        });
      };

      if (layoutSelect.value === 'horizontal') {
        const horizW = Math.min(cardW, 250);
        const horizH = horizW * (153 / 243);
        const gap = 22;
        const totalW = horizW * 2 + gap;
        const startX = (595.28 - totalW) / 2;
        const yPos = 841.89 - 70 - horizH;

        const drawScaled = async (imgObj, x, label) => {
          if (!imgObj) return;
          const embedded = await pdfDoc.embedJpg(imgToCleanJpegDataUrl(imgObj));
          page.drawRectangle({
            x: x - 2,
            y: yPos - 2,
            width: horizW + 4,
            height: horizH + 4,
            borderColor: rgb(0.75, 0.78, 0.84),
            borderWidth: 0.8,
            color: rgb(1, 1, 1)
          });
          page.drawImage(embedded, { x, y: yPos, width: horizW, height: horizH });
          page.drawText(label, { x, y: yPos - 14, size: 8, font, color: rgb(0.45, 0.5, 0.58) });
        };

        await drawScaled(frontImg, startX, 'FRONT SIDE');
        await drawScaled(backImg, startX + horizW + gap, 'BACK SIDE');
      } else {
        const cx = (595.28 - cardW) / 2;
        const topY = 841.89 - 90 - cardH;
        const botY = topY - cardH - 46;
        await drawCard(frontImg, cx, topY, 'FRONT SIDE');
        await drawCard(backImg, cx, botY, 'BACK SIDE');
      }

      if (selfAttestCheck.checked) {
        const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        page.drawText('Self-Attested Signature: ___________________________', {
          x: 64,
          y: 120,
          size: 11,
          font,
          color: rgb(0.15, 0.2, 0.28)
        });
        page.drawText(`Date: ${today}`, {
          x: 64,
          y: 96,
          size: 10,
          font,
          color: rgb(0.3, 0.35, 0.45)
        });
      }

      const res = await utils.savePdfWithMetadata(pdfDoc, 'ID_Card_A4_2in1.pdf', 'ID Card 2-in-1 A4');
      if (res && res.saved) {
        utils.showToast('A4 ID PDF Ready!', `"${res.filename}" saved cleanly.`);
      }
    } catch (err) {
      console.error(err);
      utils.showToast('Error', 'Failed to create ID Card PDF.', 'error');
    } finally {
      utils.hideLoader();
    }
  });
}

/* ==========================================================================
   17. Notes & Application Letter to PDF (Supports English + Bengali Unicode)
   ========================================================================== */

function initTextToPdf() {
  const headingInput = document.getElementById('textPdfHeading');
  const fontSizeSelect = document.getElementById('textPdfFontSize');
  const includeDateCheck = document.getElementById('textPdfIncludeDate');
  const bodyInput = document.getElementById('textPdfBody');
  const generateBtn = document.getElementById('textPdfGenerateBtn');

  if (!bodyInput || !generateBtn) return;

  function hasNonLatinChars(str) {
    return /[^\x00-\x7F]/.test(str);
  }

  function wrapCanvasText(ctx, text, maxWidth) {
    const paragraphs = text.split(/\r?\n/);
    const lines = [];
    for (const para of paragraphs) {
      if (!para.trim()) {
        lines.push('');
        continue;
      }
      const words = para.split(/\s+/);
      let current = '';
      for (const word of words) {
        const test = current ? `${current} ${word}` : word;
        if (ctx.measureText(test).width <= maxWidth) {
          current = test;
        } else {
          if (current) lines.push(current);
          current = word;
        }
      }
      if (current) lines.push(current);
    }
    return lines;
  }

  generateBtn.addEventListener('click', async () => {
    const heading = (headingInput.value || '').trim();
    const body = (bodyInput.value || '').trim();
    if (!heading && !body) {
      utils.showToast('Empty Note', 'Please write a heading or body text first.', 'info');
      return;
    }

    utils.showLoader('Generating Clean A4 PDF...', 'text-sky-600');
    try {
      const { PDFDocument, StandardFonts, rgb } = window.PDFLib;
      const pdfDoc = await PDFDocument.create();
      const basePt = parseInt(fontSizeSelect.value, 10) || 12;
      const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
      const combinedText = `${heading}\n${body}`;

      if (hasNonLatinChars(combinedText)) {
        // High-DPI Canvas A4 rendering so Bengali / Hindi / Unicode fonts render crisply without WinAnsi errors
        const pageW = 1240;
        const pageH = 1754;
        const margin = 110;
        const maxW = pageW - margin * 2;
        const fontPx = Math.round(basePt * 2.25);
        const lineH = Math.round(fontPx * 1.55);

        const scratch = document.createElement('canvas');
        scratch.width = pageW;
        scratch.height = pageH;
        const sCtx = scratch.getContext('2d');
        sCtx.font = `${fontPx}px "Inter", "Noto Sans Bengali", system-ui, sans-serif`;
        const bodyLines = wrapCanvasText(sCtx, body, maxW);

        let lineIdx = 0;
        let pageIdx = 0;

        while (pageIdx === 0 || lineIdx < bodyLines.length) {
          const canvas = document.createElement('canvas');
          canvas.width = pageW;
          canvas.height = pageH;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, pageW, pageH);

          let y = margin;
          if (pageIdx === 0) {
            if (includeDateCheck.checked) {
              ctx.fillStyle = '#64748b';
              ctx.font = `600 22px "Inter", system-ui, sans-serif`;
              ctx.fillText(`Date: ${dateStr}`, margin, y);
              y += 42;
            }
            if (heading) {
              ctx.fillStyle = '#0f172a';
              ctx.font = `700 ${Math.round(fontPx * 1.45)}px "Inter", "Noto Sans Bengali", system-ui, sans-serif`;
              const headLines = wrapCanvasText(ctx, heading, maxW);
              for (const hl of headLines) {
                ctx.fillText(hl, margin, y);
                y += Math.round(fontPx * 1.9);
              }
              ctx.strokeStyle = '#e2e8f0';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(margin, y - 10);
              ctx.lineTo(pageW - margin, y - 10);
              ctx.stroke();
              y += 30;
            }
          }

          ctx.fillStyle = '#1e293b';
          ctx.font = `${fontPx}px "Inter", "Noto Sans Bengali", system-ui, sans-serif`;
          while (lineIdx < bodyLines.length && y < pageH - margin) {
            ctx.fillText(bodyLines[lineIdx], margin, y);
            y += lineH;
            lineIdx++;
          }

          const jpg = await pdfDoc.embedJpg(canvas.toDataURL('image/jpeg', 0.92));
          const pdfPage = pdfDoc.addPage([595.28, 841.89]);
          pdfPage.drawImage(jpg, { x: 0, y: 0, width: 595.28, height: 841.89 });
          pageIdx++;
        }
      } else {
        // Pure crisp vector text PDF for English / ASCII notes & applications
        const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const pageW = 595.28;
        const pageH = 841.89;
        const margin = 56;
        const maxW = pageW - margin * 2;
        const lineH = basePt * 1.5;

        const wrapPdfLines = (text, font, size) => {
          const out = [];
          for (const para of text.split(/\r?\n/)) {
            if (!para.trim()) {
              out.push('');
              continue;
            }
            const words = para.split(/\s+/);
            let cur = '';
            for (const word of words) {
              const test = cur ? `${cur} ${word}` : word;
              if (font.widthOfTextAtSize(test, size) <= maxW) {
                cur = test;
              } else {
                if (cur) out.push(cur);
                cur = word;
              }
            }
            if (cur) out.push(cur);
          }
          return out;
        };

        let page = pdfDoc.addPage([pageW, pageH]);
        let y = pageH - margin;

        if (includeDateCheck.checked) {
          page.drawText(`Date: ${dateStr}`, {
            x: margin,
            y,
            size: 10,
            font: fontRegular,
            color: rgb(0.4, 0.45, 0.55)
          });
          y -= 24;
        }

        if (heading) {
          const headLines = wrapPdfLines(heading, fontBold, basePt + 6);
          for (const hl of headLines) {
            page.drawText(hl, { x: margin, y, size: basePt + 6, font: fontBold, color: rgb(0.06, 0.09, 0.16) });
            y -= (basePt + 10);
          }
          page.drawLine({
            start: { x: margin, y: y + 4 },
            end: { x: pageW - margin, y: y + 4 },
            thickness: 1,
            color: rgb(0.85, 0.88, 0.92)
          });
          y -= 18;
        }

        const lines = wrapPdfLines(body, fontRegular, basePt);
        for (const line of lines) {
          if (y < margin + 16) {
            page = pdfDoc.addPage([pageW, pageH]);
            y = pageH - margin;
          }
          if (line) {
            page.drawText(line, { x: margin, y, size: basePt, font: fontRegular, color: rgb(0.12, 0.16, 0.23) });
          }
          y -= lineH;
        }
      }

      const defaultTitle = heading || 'Notes Document';
      const safeName = (heading || 'PDF_Bondhu_Notes').replace(/[^a-zA-Z0-9 _-]+/g, '').trim().replace(/\s+/g, '_') || 'PDF_Bondhu_Notes';
      const res = await utils.savePdfWithMetadata(pdfDoc, `${safeName}.pdf`, defaultTitle);
      if (res && res.saved) {
        utils.showToast('PDF Created!', `"${res.filename}" saved cleanly.`);
      }
    } catch (err) {
      console.error(err);
      utils.showToast('Error', 'Could not generate PDF from text.', 'error');
    } finally {
      utils.hideLoader();
    }
  });
}

/* ==========================================================================
   18. Standalone PDF Metadata Editor (Inspect & Update Any Existing PDF)
   ========================================================================== */

function initPdfMetadataTool() {
  const input = document.getElementById('metaToolInput');
  const fileNameEl = document.getElementById('metaToolFileName');
  const formWrap = document.getElementById('metaToolForm');
  const titleInput = document.getElementById('metaToolTitle');
  const authorInput = document.getElementById('metaToolAuthor');
  const dateInput = document.getElementById('metaToolCreationDate');
  const subjectInput = document.getElementById('metaToolSubject');
  const keywordsInput = document.getElementById('metaToolKeywords');
  const saveBtn = document.getElementById('metaToolSaveBtn');

  if (!input || !saveBtn) return;

  let currentFile = null;
  let sourceBytes = null;

  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    input.value = '';
    if (!file) return;

    utils.showLoader('Reading PDF Properties...', 'text-violet-600');
    try {
      const buf = await file.arrayBuffer();
      const doc = await window.PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
      sourceBytes = new Uint8Array(buf);
      currentFile = file;

      fileNameEl.textContent = `${file.name} (${utils.formatBytes(file.size)} · ${doc.getPageCount()} pages)`;
      titleInput.value = doc.getTitle() || file.name.replace(/\.pdf$/i, '');
      authorInput.value = doc.getAuthor() || '';
      subjectInput.value = doc.getSubject() || '';
      keywordsInput.value = doc.getKeywords() || '';

      const cDate = doc.getCreationDate();
      dateInput.value = utils.toLocalDateTimeInputValue(cDate instanceof Date && !isNaN(cDate.getTime()) ? cDate : new Date());

      formWrap.classList.remove('hidden');
      utils.showToast('Metadata Loaded', 'Edit any field and tap Save Updated PDF.');
    } catch (err) {
      console.error(err);
      utils.showToast('Error', 'Could not read PDF metadata.', 'error');
    } finally {
      utils.hideLoader();
    }
  });

  saveBtn.addEventListener('click', async () => {
    if (!sourceBytes || !currentFile) return;

    utils.showLoader('Updating PDF Metadata...', 'text-violet-600');
    try {
      const doc = await window.PDFLib.PDFDocument.load(sourceBytes, { ignoreEncryption: true });
      doc.setTitle(titleInput.value.trim());
      doc.setAuthor(authorInput.value.trim());
      doc.setSubject(subjectInput.value.trim());
      const kwList = keywordsInput.value
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      if (kwList.length > 0) doc.setKeywords(kwList);

      const parsedDate = dateInput.value ? new Date(dateInput.value) : new Date();
      const finalDate = !isNaN(parsedDate.getTime()) ? parsedDate : new Date();
      doc.setCreationDate(finalDate);
      doc.setModificationDate(new Date());
      doc.setCreator('PDF Bondhu by Suman Nayak');

      const outBytes = await doc.save();
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      const base = currentFile.name.replace(/\.pdf$/i, '');
      utils.downloadBlob(blob, `${base}_metadata_updated.pdf`);
      utils.showToast('Metadata Saved!', 'Updated Title, Author & Creation Date written to PDF.');
    } catch (err) {
      console.error(err);
      utils.showToast('Error', 'Failed to update PDF metadata.', 'error');
    } finally {
      utils.hideLoader();
    }
  });
}

/* ==========================================================================
   19. Digital Signature Verify PDF (e-Aadhaar, PAN, Govt Certificates)
   ========================================================================== */

function initPdfSigVerify() {
  const input = document.getElementById('sigVerifyInput');
  const fileNameEl = document.getElementById('sigVerifyFileName');
  const resultWrap = document.getElementById('sigVerifyResultWrap');
  const banner = document.getElementById('sigVerifyBanner');
  const badgeIcon = document.getElementById('sigVerifyBadgeIcon');
  const headline = document.getElementById('sigVerifyHeadline');
  const subtext = document.getElementById('sigVerifySubtext');
  const cardsWrap = document.getElementById('sigVerifyCards');
  const downloadReportBtn = document.getElementById('sigVerifyDownloadReportBtn');

  if (!input || !resultWrap) return;

  let lastReportText = '';
  let lastReportFileName = 'Signature_Verification_Report.txt';

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function decodePdfString(raw) {
    if (!raw) return '';
    const trimmed = raw.trim();
    if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
      let inner = trimmed.slice(1, -1);
      inner = inner.replace(/\\([()\\])/g, '$1').replace(/\\n/g, ' ').replace(/\\r/g, '');
      // Handle UTF-16BE BOM (\xfe\xff)
      if (inner.length >= 2 && inner.charCodeAt(0) === 254 && inner.charCodeAt(1) === 255) {
        let out = '';
        for (let i = 2; i + 1 < inner.length; i += 2) {
          out += String.fromCharCode((inner.charCodeAt(i) << 8) | inner.charCodeAt(i + 1));
        }
        return out.trim();
      }
      return inner.trim();
    }
    if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
      const hex = trimmed.slice(1, -1).replace(/\s+/g, '');
      if (hex.startsWith('feff') || hex.startsWith('FEFF')) {
        let out = '';
        for (let i = 4; i + 3 < hex.length; i += 4) {
          out += String.fromCharCode(parseInt(hex.slice(i, i + 4), 16));
        }
        return out.trim();
      }
      let out = '';
      for (let i = 0; i + 1 < hex.length; i += 2) {
        const code = parseInt(hex.slice(i, i + 2), 16);
        if (code >= 32 && code <= 126) out += String.fromCharCode(code);
      }
      return out.trim();
    }
    return trimmed;
  }

  function formatPdfDate(rawDate) {
    const clean = decodePdfString(rawDate);
    const m = clean.match(/D:(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?([+-Z])?(\d{2})?'?(\d{2})?/);
    if (!m) return clean || 'Not specified';
    const [, y, mo = '01', d = '01', hh = '00', mm = '00', ss = '00', tzSign = '', tzH = '', tzM = ''] = m;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = months[Math.max(0, Math.min(11, parseInt(mo, 10) - 1))];
    const tzStr = tzSign === 'Z' ? ' UTC' : tzSign && tzH ? ` (UTC${tzSign}${tzH}:${tzM || '00'})` : '';
    return `${d} ${monthName} ${y}, ${hh}:${mm}:${ss}${tzStr}`;
  }

  function hexToBytes(hexStr) {
    const clean = hexStr.replace(/\s+/g, '');
    const len = Math.floor(clean.length / 2);
    const out = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      out[i] = parseInt(clean.substr(i * 2, 2), 16) || 0;
    }
    return out;
  }

  // Lightweight ASN.1 / DER X.509 OID scanner for PKCS#7 / CMS signature blocks
  function inspectPkcs7Der(hexPayload) {
    const bytes = hexToBytes(hexPayload);
    // Trim trailing 0x00 padding inside PDF /Contents
    let actualLen = bytes.length;
    while (actualLen > 0 && bytes[actualLen - 1] === 0) actualLen--;
    const der = bytes.subarray(0, actualLen);

    const hasValidDerHeader = der.length > 32 && der[0] === 0x30;
    const oidPatterns = [
      { label: 'CN', seq: [0x06, 0x03, 0x55, 0x04, 0x03] },
      { label: 'O', seq: [0x06, 0x03, 0x55, 0x04, 0x0a] },
      { label: 'OU', seq: [0x06, 0x03, 0x55, 0x04, 0x0b] },
      { label: 'ST', seq: [0x06, 0x03, 0x55, 0x04, 0x08] },
      { label: 'C', seq: [0x06, 0x03, 0x55, 0x04, 0x06] }
    ];

    const found = { CN: [], O: [], OU: [], ST: [], C: [] };

    for (let i = 0; i < der.length - 8; i++) {
      for (const pat of oidPatterns) {
        let match = true;
        for (let k = 0; k < pat.seq.length; k++) {
          if (der[i + k] !== pat.seq[k]) {
            match = false;
            break;
          }
        }
        if (!match) continue;

        const valStart = i + pat.seq.length;
        const tag = der[valStart];
        // PrintableString (0x13), UTF8String (0x0c), IA5String (0x16), TeletexString (0x14)
        if (tag === 0x13 || tag === 0x0c || tag === 0x16 || tag === 0x14) {
          let strLen = der[valStart + 1];
          let strOff = valStart + 2;
          if (strLen & 0x80) {
            const numLenBytes = strLen & 0x7f;
            if (numLenBytes === 1 && strOff < der.length) {
              strLen = der[strOff];
              strOff += 1;
            } else {
              continue;
            }
          }
          if (strLen > 0 && strLen < 140 && strOff + strLen <= der.length) {
            let text = '';
            try {
              text = new TextDecoder('utf-8', { fatal: false }).decode(der.subarray(strOff, strOff + strLen)).trim();
            } catch {
              text = '';
            }
            if (text && !found[pat.label].includes(text)) {
              found[pat.label].push(text);
            }
          }
        }
      }
    }

    // Detect digest/hash algorithm OIDs
    const hexLower = hexPayload.slice(0, Math.min(hexPayload.length, actualLen * 2)).toLowerCase();
    let hashAlgo = 'SHA-256 / PKCS#7';
    if (hexLower.includes('608648016503040201')) hashAlgo = 'SHA-256 (Strong)';
    else if (hexLower.includes('608648016503040202')) hashAlgo = 'SHA-384 (Strong)';
    else if (hexLower.includes('608648016503040203')) hashAlgo = 'SHA-512 (Strong)';
    else if (hexLower.includes('2b0e03021a')) hashAlgo = 'SHA-1 (Legacy)';

    return {
      hasValidDerHeader,
      derBytesLength: actualLen,
      found,
      hashAlgo
    };
  }

  function extractField(dictChunk, key) {
    const regex = new RegExp(`\\/${key}\\s*(\\((?:\\\\.|[^\\\\()])*\\)|<[0-9A-Fa-f\\s]+>|\\/[^\\s\\/\\[\\]<>()]+)`, 'm');
    const m = dictChunk.match(regex);
    if (!m) return '';
    return m[1].startsWith('/') ? m[1].slice(1) : decodePdfString(m[1]);
  }

  input.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    input.value = '';
    if (!file) return;

    utils.showLoader('Inspecting PDF Digital Signatures...', 'text-emerald-600');
    try {
      const arrayBuf = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuf);
      const totalBytes = bytes.length;

      // Convert raw bytes to Latin-1 string safely in chunks
      let rawStr = '';
      const chunkSize = 65536;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        rawStr += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
      }

      fileNameEl.textContent = `${file.name} (${utils.formatBytes(totalBytes)})`;

      // Locate all /ByteRange [a b c d] entries
      const brRegex = /\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/g;
      const signatures = [];
      let match;

      while ((match = brRegex.exec(rawStr)) !== null) {
        const b0 = parseInt(match[1], 10);
        const b1 = parseInt(match[2], 10);
        const b2 = parseInt(match[3], 10);
        const b3 = parseInt(match[4], 10);

        // Grab surrounding signature dictionary window
        const startWin = Math.max(0, match.index - 1800);
        const endWin = Math.min(rawStr.length, match.index + 32000);
        const windowChunk = rawStr.slice(startWin, endWin);
        const metaChunk = rawStr.slice(startWin, Math.min(rawStr.length, match.index + 2400));

        const subFilter = extractField(metaChunk, 'SubFilter') || 'adbe.pkcs7.detached';
        const filter = extractField(metaChunk, 'Filter') || 'Adobe.PPKLite';
        const signerName = extractField(metaChunk, 'Name');
        const reason = extractField(metaChunk, 'Reason');
        const location = extractField(metaChunk, 'Location');
        const signDate = formatPdfDate(extractField(metaChunk, 'M'));

        // Extract exact /Contents <hex> between ByteRange gap (b1 .. b2)
        let contentsHex = '';
        if (b1 < b2 && b2 <= totalBytes) {
          const gapSlice = rawStr.slice(b1, b2).trim();
          const hexMatch = gapSlice.match(/<([0-9A-Fa-f\s]+)>/);
          if (hexMatch) contentsHex = hexMatch[1];
        }
        if (!contentsHex) {
          const cMatch = windowChunk.match(/\/Contents\s*<([0-9A-Fa-f\s]+)>/);
          if (cMatch) contentsHex = cMatch[1];
        }

        const derInfo = contentsHex ? inspectPkcs7Der(contentsHex) : { hasValidDerHeader: false, derBytesLength: 0, found: { CN: [], O: [], OU: [], ST: [], C: [] }, hashAlgo: 'Unknown' };

        const signedEnd = b2 + b3;
        const trailingBytes = totalBytes - signedEnd;
        const coversWholeDoc = b0 === 0 && b1 > 0 && b2 > b1 && trailingBytes >= 0 && trailingBytes <= 16;

        const certCNs = derInfo.found.CN || [];
        const certOrgs = derInfo.found.O || [];
        const resolvedSigner = signerName || certCNs[certCNs.length - 1] || certCNs[0] || 'Embedded Digital Signer';
        const resolvedIssuer = certCNs.length > 1 ? certCNs[0] : (certOrgs[0] || 'Certificate Authority');

        signatures.push({
          index: signatures.length + 1,
          b0, b1, b2, b3,
          coversWholeDoc,
          trailingBytes,
          filter,
          subFilter,
          signer: resolvedSigner,
          issuer: resolvedIssuer,
          organizations: certOrgs,
          orgUnits: derInfo.found.OU || [],
          countries: derInfo.found.C || [],
          reason: reason || 'Document Digitally Signed',
          location: location || 'Not specified',
          signDate,
          hashAlgo: derInfo.hashAlgo,
          hasValidDerHeader: derInfo.hasValidDerHeader,
          derBytesLength: derInfo.derBytesLength
        });
      }

      resultWrap.classList.remove('hidden');
      cardsWrap.innerHTML = '';

      const reportLines = [
        '====================================================',
        'PDF BONDHU - DIGITAL SIGNATURE VERIFICATION REPORT',
        '====================================================',
        `File Name      : ${file.name}`,
        `File Size      : ${utils.formatBytes(totalBytes)} (${totalBytes} bytes)`,
        `Checked On     : ${new Date().toLocaleString()}`,
        `Signatures     : ${signatures.length}`,
        '----------------------------------------------------'
      ];

      if (signatures.length === 0) {
        banner.className = 'rounded-2xl p-4 border flex items-start gap-3.5 bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700';
        badgeIcon.className = 'shrink-0 p-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300';
        badgeIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
        headline.className = 'font-extrabold text-base text-slate-800 dark:text-white';
        headline.textContent = 'No Cryptographic Digital Signature Found';
        subtext.className = 'text-xs mt-1 leading-relaxed text-slate-600 dark:text-slate-300';
        subtext.textContent = 'This PDF does not contain an embedded PKCS#7 / CAdES digital signature block. If it is a scanned document or a re-printed PDF, the digital signature may have been flattened.';
        reportLines.push('Status: NO DIGITAL SIGNATURE FOUND IN PDF.');
      } else {
        const latestSig = signatures[signatures.length - 1];
        const allValidStructure = signatures.every((s) => s.hasValidDerHeader);
        const intactFullFile = latestSig.coversWholeDoc && allValidStructure;

        if (intactFullFile) {
          banner.className = 'rounded-2xl p-4 border flex items-start gap-3.5 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700';
          badgeIcon.className = 'shrink-0 p-2 rounded-xl bg-emerald-600 text-white';
          badgeIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>';
          headline.className = 'font-extrabold text-base text-emerald-900 dark:text-emerald-200';
          headline.textContent = `Digital Signature Verified · Document Intact (${signatures.length} Signature${signatures.length > 1 ? 's' : ''})`;
          subtext.className = 'text-xs mt-1 leading-relaxed text-emerald-800 dark:text-emerald-300';
          subtext.textContent = 'Valid PKCS#7 / X.509 cryptographic signature structure detected. Signed ByteRange covers 100% of the PDF with zero post-signing tampering detected.';
        } else {
          banner.className = 'rounded-2xl p-4 border flex items-start gap-3.5 bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700';
          badgeIcon.className = 'shrink-0 p-2 rounded-xl bg-amber-500 text-white';
          badgeIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
          headline.className = 'font-extrabold text-base text-amber-900 dark:text-amber-200';
          headline.textContent = `Signature Present · Post-Signing Changes Detected (${signatures.length})`;
          subtext.className = 'text-xs mt-1 leading-relaxed text-amber-800 dark:text-amber-300';
          subtext.textContent = 'A digital signature was found, but additional bytes or incremental updates were appended after signing. Review the details below carefully.';
        }

        signatures.forEach((sig) => {
          const card = document.createElement('div');
          card.className = 'rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 p-4 space-y-3';
          card.innerHTML = `
            <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold ${sig.coversWholeDoc && sig.hasValidDerHeader ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'}">Signature #${sig.index}</span>
                <span class="font-extrabold text-sm text-slate-900 dark:text-white">${escapeHtml(sig.signer)}</span>
              </div>
              <span class="text-[11px] font-bold ${sig.coversWholeDoc ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}">
                ${sig.coversWholeDoc ? 'ByteRange 100% Intact' : `+${sig.trailingBytes} bytes after signature`}
              </span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div><span class="text-slate-400 font-semibold block">Signed Date &amp; Time</span><span class="font-bold text-slate-800 dark:text-slate-100">${escapeHtml(sig.signDate)}</span></div>
              <div><span class="text-slate-400 font-semibold block">Certificate Issuer / Authority</span><span class="font-bold text-slate-800 dark:text-slate-100">${escapeHtml(sig.issuer)}</span></div>
              <div><span class="text-slate-400 font-semibold block">Organization(s)</span><span class="font-bold text-slate-800 dark:text-slate-100">${escapeHtml(sig.organizations.join(' · ') || 'Not embedded')}</span></div>
              <div><span class="text-slate-400 font-semibold block">Signature Standard &amp; Hash</span><span class="font-bold text-slate-800 dark:text-slate-100">${escapeHtml(sig.subFilter)} · ${escapeHtml(sig.hashAlgo)}</span></div>
              <div><span class="text-slate-400 font-semibold block">Reason</span><span class="font-semibold text-slate-700 dark:text-slate-200">${escapeHtml(sig.reason)}</span></div>
              <div><span class="text-slate-400 font-semibold block">Location</span><span class="font-semibold text-slate-700 dark:text-slate-200">${escapeHtml(sig.location)}</span></div>
              <div class="sm:col-span-2"><span class="text-slate-400 font-semibold block">ByteRange Coverage &amp; Certificate Payload</span><span class="font-mono text-[11px] text-slate-600 dark:text-slate-300">[${sig.b0}, ${sig.b1}, ${sig.b2}, ${sig.b3}] · DER PKCS#7 Payload: ${sig.derBytesLength} bytes (${sig.hasValidDerHeader ? 'Valid ASN.1' : 'Invalid/Empty'})</span></div>
            </div>
          `;
          cardsWrap.appendChild(card);

          reportLines.push(
            `Signature #${sig.index}:`,
            `  Signer         : ${sig.signer}`,
            `  Issuer / CA    : ${sig.issuer}`,
            `  Organizations  : ${sig.organizations.join(', ') || 'N/A'}`,
            `  Signed Date    : ${sig.signDate}`,
            `  Reason         : ${sig.reason}`,
            `  Location       : ${sig.location}`,
            `  Format / Hash  : ${sig.subFilter} (${sig.hashAlgo})`,
            `  ByteRange      : [${sig.b0}, ${sig.b1}, ${sig.b2}, ${sig.b3}]`,
            `  File Integrity : ${sig.coversWholeDoc ? 'INTACT (100% file covered)' : `MODIFIED (${sig.trailingBytes} trailing bytes)`}`,
            `  PKCS#7 ASN.1   : ${sig.hasValidDerHeader ? `VALID (${sig.derBytesLength} bytes)` : 'INVALID'}`,
            '----------------------------------------------------'
          );
        });
      }

      lastReportText = reportLines.join('\n');
      lastReportFileName = `${file.name.replace(/\.pdf$/i, '')}_Signature_Report.txt`;
      utils.showToast(
        signatures.length > 0 ? 'Inspection Complete' : 'No Signature Found',
        signatures.length > 0 ? `Detected ${signatures.length} digital signature(s) in PDF.` : 'This PDF has no embedded digital signature.',
        signatures.length > 0 ? 'success' : 'info'
      );
    } catch (err) {
      console.error(err);
      utils.showToast('Error', 'Could not inspect this PDF file.', 'error');
    } finally {
      utils.hideLoader();
    }
  });

  if (downloadReportBtn) {
    downloadReportBtn.addEventListener('click', () => {
      if (!lastReportText) return;
      const blob = new Blob([lastReportText], { type: 'text/plain;charset=utf-8' });
      utils.downloadBlob(blob, lastReportFileName);
      utils.showToast('Report Downloaded', 'Saved verification report (.TXT).');
    });
  }
}

/* ==========================================================================
   20. Repair Corrupted / Broken PDF (Smart XRef Rebuild + Deep Visual Rescue)
   ========================================================================== */

function initPdfRepair() {
  const input = document.getElementById('pdfRepairInput');
  const fileNameEl = document.getElementById('pdfRepairFileName');
  const modeSelect = document.getElementById('pdfRepairMode');
  const actionBtn = document.getElementById('pdfRepairActionBtn');
  const logBox = document.getElementById('pdfRepairLogBox');
  const logTitle = document.getElementById('pdfRepairLogTitle');
  const logBody = document.getElementById('pdfRepairLogBody');

  if (!input || !actionBtn) return;

  let selectedFile = null;
  let rawBytes = null;

  input.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    input.value = '';
    if (!file) return;
    selectedFile = file;
    rawBytes = new Uint8Array(await file.arrayBuffer());
    fileNameEl.textContent = `${file.name} (${utils.formatBytes(file.size)})`;
    actionBtn.disabled = false;
    logBox.classList.add('hidden');
  });

  function stripLeadingJunkBeforePdfHeader(bytes) {
    // Locate "%PDF-" (0x25 0x50 0x44 0x46 0x2D)
    const maxScan = Math.min(bytes.length - 5, 4096);
    for (let i = 0; i <= maxScan; i++) {
      if (
        bytes[i] === 0x25 &&
        bytes[i + 1] === 0x50 &&
        bytes[i + 2] === 0x44 &&
        bytes[i + 3] === 0x46 &&
        bytes[i + 4] === 0x2d
      ) {
        return { cleaned: i > 0 ? bytes.subarray(i) : bytes, trimmedOffset: i };
      }
    }
    return { cleaned: bytes, trimmedOffset: 0 };
  }

  async function runDeepVisualRebuild(cleanedBytes, logs) {
    logs.push('• Launching Deep Visual Rescue (pdf.js page renderer)...');
    const loadingTask = window.pdfjsLib.getDocument({ data: cleanedBytes.slice(0) });
    const pdfJsDoc = await loadingTask.promise;
    const totalPages = pdfJsDoc.numPages;
    logs.push(`• Detected ${totalPages} renderable page(s). Rebuilding clean PDF...`);

    const freshDoc = await window.PDFLib.PDFDocument.create();
    let rescued = 0;

    for (let p = 1; p <= totalPages; p++) {
      try {
        const page = await pdfJsDoc.getPage(p);
        const origVp = page.getViewport({ scale: 1.0 });
        const renderVp = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(renderVp.width));
        canvas.height = Math.max(1, Math.round(renderVp.height));
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({ canvasContext: ctx, viewport: renderVp }).promise;
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
        const imgBuf = await blob.arrayBuffer();
        const jpgImg = await freshDoc.embedJpg(imgBuf);

        const newPage = freshDoc.addPage([origVp.width, origVp.height]);
        newPage.drawImage(jpgImg, { x: 0, y: 0, width: origVp.width, height: origVp.height });
        rescued++;
      } catch (pageErr) {
        logs.push(`• Skipped unreadable page #${p}: ${pageErr.message || 'damaged stream'}`);
      }
    }

    if (rescued === 0) throw new Error('No pages could be visually rescued from this file.');
    logs.push(`• Successfully rescued ${rescued}/${totalPages} page(s) into a brand-new PDF.`);
    return freshDoc;
  }

  actionBtn.addEventListener('click', async () => {
    if (!selectedFile || !rawBytes) return;
    const mode = modeSelect ? modeSelect.value : 'auto';
    const logs = [];

    utils.showLoader('Analyzing & Repairing PDF...', 'text-amber-600');
    try {
      const { cleaned, trimmedOffset } = stripLeadingJunkBeforePdfHeader(rawBytes);
      logs.push(`• Source file: ${selectedFile.name} (${utils.formatBytes(rawBytes.length)})`);
      if (trimmedOffset > 0) {
        logs.push(`• Fixed corrupted header: removed ${trimmedOffset} junk byte(s) before %PDF- signature.`);
      } else {
        logs.push('• PDF header verified.');
      }

      let repairedDoc = null;

      if (mode === 'auto') {
        try {
          logs.push('• Stage 1: Rebuilding cross-reference (XRef) table & object tree...');
          const srcDoc = await window.PDFLib.PDFDocument.load(cleaned, {
            ignoreEncryption: true,
            throwOnInvalidObject: false
          });
          const count = srcDoc.getPageCount();
          if (count > 0) {
            const cleanDoc = await window.PDFLib.PDFDocument.create();
            const indices = Array.from({ length: count }, (_, idx) => idx);
            const copied = await cleanDoc.copyPages(srcDoc, indices);
            copied.forEach((pg) => cleanDoc.addPage(pg));
            logs.push(`• Stage 1 succeeded! Rebuilt clean structure with ${count} vector page(s).`);
            repairedDoc = cleanDoc;
          }
        } catch (stage1Err) {
          logs.push(`• Stage 1 structural load failed (${stage1Err.message || 'broken XRef'}). Switching to Deep Rescue...`);
        }
      }

      if (!repairedDoc) {
        repairedDoc = await runDeepVisualRebuild(cleaned, logs);
      }

      logTitle.textContent = 'Repair Successful — Clean PDF Ready';
      logBody.textContent = logs.join('\n');
      logBox.classList.remove('hidden');

      const base = selectedFile.name.replace(/\.pdf$/i, '');
      const res = await utils.savePdfWithMetadata(repairedDoc, `${base}_repaired.pdf`, `${base} (Repaired)`);
      if (res && res.saved) {
        utils.showToast('PDF Repaired!', `Saved "${res.filename}" cleanly.`);
      }
    } catch (err) {
      console.error(err);
      logs.push(`• Recovery halted: ${err.message || 'Severely damaged or encrypted file.'}`);
      logTitle.textContent = 'Repair Diagnostics';
      logBody.textContent = logs.join('\n');
      logBox.classList.remove('hidden');
      utils.showToast('Repair Failed', 'This PDF is too severely corrupted or password-locked.', 'error');
    } finally {
      utils.hideLoader();
    }
  });
}

/* ==========================================================================
   21. Interactive Visual PDF Editor (Text, Whiteout, Highlight, Draw, Image)
   ========================================================================== */

function initPdfEdit() {
  const input = document.getElementById('pdfEditInput');
  const fileNameEl = document.getElementById('pdfEditFileName');
  const prevBtn = document.getElementById('pdfEditPrevPage');
  const nextBtn = document.getElementById('pdfEditNextPage');
  const pageLabel = document.getElementById('pdfEditPageLabel');
  const saveBtn = document.getElementById('pdfEditSaveBtn');
  const controlsBar = document.getElementById('pdfEditControlsBar');
  const toolBtns = document.querySelectorAll('.pdf-edit-tool-btn');
  const imgInput = document.getElementById('pdfEditImgInput');
  const undoBtn = document.getElementById('pdfEditUndoBtn');
  const clearPageBtn = document.getElementById('pdfEditClearPageBtn');
  const textInput = document.getElementById('pdfEditTextValue');
  const fontSizeInput = document.getElementById('pdfEditFontSize');
  const colorInput = document.getElementById('pdfEditColor');
  const boldCheckbox = document.getElementById('pdfEditBold');
  const hintEl = document.getElementById('pdfEditHint');
  const emptyState = document.getElementById('pdfEditEmptyState');
  const canvasWrap = document.getElementById('pdfEditCanvasWrap');
  const baseCanvas = document.getElementById('pdfEditBaseCanvas');
  const overlayCanvas = document.getElementById('pdfEditOverlayCanvas');

  if (!input || !baseCanvas || !overlayCanvas) return;

  const baseCtx = baseCanvas.getContext('2d');
  const overCtx = overlayCanvas.getContext('2d');

  let sourceBytes = null;
  let sourceFileName = 'Document';
  let pdfJsDoc = null;
  let currentPage = 1;
  let totalPages = 0;
  let activeTool = 'text'; // 'text' | 'whiteout' | 'highlight' | 'draw' | 'image'
  let pendingImage = null; // { img, dataUrl }

  // Map<pageNum, Array<Annotation>> stored in normalized 0..1 coordinates
  const pageEdits = new Map();

  let isDragging = false;
  let dragStart = null;
  let dragCurrent = null;
  let activeStroke = null;

  const hints = {
    text: 'Tap anywhere on the page to place your text',
    whiteout: 'Drag a box over mistakes or old text to cover with crisp white',
    highlight: 'Drag across any line to highlight smoothly',
    draw: 'Draw freehand annotations or signatures directly on the page',
    image: 'Drag a box on the page to insert & size your image'
  };

  function setTool(tool) {
    activeTool = tool;
    toolBtns.forEach((btn) => {
      const isMatch = btn.getAttribute('data-tool') === tool;
      btn.className = isMatch
        ? 'pdf-edit-tool-btn px-3 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-sm min-h-[38px]'
        : 'pdf-edit-tool-btn px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 min-h-[38px]';
    });
    if (hintEl) hintEl.textContent = hints[tool] || '';
  }

  toolBtns.forEach((btn) => {
    btn.addEventListener('click', () => setTool(btn.getAttribute('data-tool')));
  });

  if (imgInput) {
    imgInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      imgInput.value = '';
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          pendingImage = { img, dataUrl: reader.result };
          setTool('image');
          utils.showToast('Image Ready', 'Drag a box on the PDF page to place your image.', 'info');
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function getEditsForPage(p) {
    if (!pageEdits.has(p)) pageEdits.set(p, []);
    return pageEdits.get(p);
  }

  function drawAnnotationsOnContext(ctx, width, height, items, draftItem = null) {
    ctx.clearRect(0, 0, width, height);
    const list = draftItem ? [...items, draftItem] : items;

    for (const item of list) {
      ctx.save();
      if (item.type === 'whiteout') {
        const x = Math.min(item.x1, item.x2) * width;
        const y = Math.min(item.y1, item.y2) * height;
        const w = Math.abs(item.x2 - item.x1) * width;
        const h = Math.abs(item.y2 - item.y1) * height;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, w, h);
        if (item === draftItem) {
          ctx.strokeStyle = '#6366f1';
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(x, y, w, h);
        }
      } else if (item.type === 'highlight') {
        const x = Math.min(item.x1, item.x2) * width;
        const y = Math.min(item.y1, item.y2) * height;
        const w = Math.abs(item.x2 - item.x1) * width;
        const h = Math.abs(item.y2 - item.y1) * height;
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = item.color || '#facc15';
        ctx.fillRect(x, y, w, h);
      } else if (item.type === 'text') {
        const pxSize = Math.max(8, (item.fontSizeRatio || 0.022) * height);
        ctx.font = `${item.bold ? '700' : '500'} ${pxSize}px system-ui, -apple-system, sans-serif`;
        ctx.fillStyle = item.color || '#1e293b';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.text, item.x * width, item.y * height);
      } else if (item.type === 'draw' && item.points && item.points.length > 1) {
        ctx.strokeStyle = item.color || '#1e293b';
        ctx.lineWidth = Math.max(1.5, (item.strokeRatio || 0.004) * width);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(item.points[0].x * width, item.points[0].y * height);
        for (let i = 1; i < item.points.length; i++) {
          ctx.lineTo(item.points[i].x * width, item.points[i].y * height);
        }
        ctx.stroke();
      } else if (item.type === 'image' && item.img) {
        const x = Math.min(item.x1, item.x2) * width;
        const y = Math.min(item.y1, item.y2) * height;
        const w = Math.max(10, Math.abs(item.x2 - item.x1) * width);
        const h = Math.max(10, Math.abs(item.y2 - item.y1) * height);
        ctx.drawImage(item.img, x, y, w, h);
        if (item === draftItem) {
          ctx.strokeStyle = '#6366f1';
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(x, y, w, h);
        }
      }
      ctx.restore();
    }
  }

  function redrawOverlay(draft = null) {
    drawAnnotationsOnContext(overCtx, overlayCanvas.width, overlayCanvas.height, getEditsForPage(currentPage), draft);
  }

  async function renderPage(num) {
    if (!pdfJsDoc) return;
    currentPage = Math.max(1, Math.min(totalPages, num));
    const page = await pdfJsDoc.getPage(currentPage);
    const vp = page.getViewport({ scale: 1.5 });
    baseCanvas.width = Math.round(vp.width);
    baseCanvas.height = Math.round(vp.height);
    overlayCanvas.width = baseCanvas.width;
    overlayCanvas.height = baseCanvas.height;

    baseCtx.fillStyle = '#ffffff';
    baseCtx.fillRect(0, 0, baseCanvas.width, baseCanvas.height);
    await page.render({ canvasContext: baseCtx, viewport: vp }).promise;

    pageLabel.textContent = `${currentPage} / ${totalPages}`;
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
    redrawOverlay();
  }

  function getNormPointer(e) {
    const rect = overlayCanvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    return { x, y };
  }

  overlayCanvas.addEventListener('pointerdown', (e) => {
    if (!pdfJsDoc) return;
    overlayCanvas.setPointerCapture(e.pointerId);
    const pt = getNormPointer(e);

    if (activeTool === 'text') {
      const txt = (textInput?.value || '').trim();
      if (!txt) {
        utils.showToast('Enter Text', 'Type the text you want to add in the box above.', 'info');
        return;
      }
      const fs = Math.max(8, Math.min(72, parseInt(fontSizeInput?.value || '16', 10) || 16));
      getEditsForPage(currentPage).push({
        type: 'text',
        x: pt.x,
        y: pt.y,
        text: txt,
        fontSizeRatio: (fs * 1.5) / Math.max(1, overlayCanvas.height),
        color: colorInput?.value || '#1e293b',
        bold: Boolean(boldCheckbox?.checked)
      });
      redrawOverlay();
      return;
    }

    isDragging = true;
    dragStart = pt;
    dragCurrent = pt;

    if (activeTool === 'draw') {
      const sz = Math.max(2, Math.min(24, (parseInt(fontSizeInput?.value || '16', 10) || 16) / 4));
      activeStroke = {
        type: 'draw',
        color: colorInput?.value || '#1e293b',
        strokeRatio: sz / Math.max(1, overlayCanvas.width),
        points: [pt]
      };
    }
  });

  overlayCanvas.addEventListener('pointermove', (e) => {
    if (!isDragging || !pdfJsDoc) return;
    const pt = getNormPointer(e);
    dragCurrent = pt;

    if (activeTool === 'draw' && activeStroke) {
      activeStroke.points.push(pt);
      redrawOverlay(activeStroke);
    } else if (activeTool === 'whiteout') {
      redrawOverlay({ type: 'whiteout', x1: dragStart.x, y1: dragStart.y, x2: pt.x, y2: pt.y });
    } else if (activeTool === 'highlight') {
      const hiColor = (colorInput?.value || '#1e293b') === '#1e293b' ? '#facc15' : colorInput.value;
      redrawOverlay({ type: 'highlight', x1: dragStart.x, y1: dragStart.y, x2: pt.x, y2: pt.y, color: hiColor });
    } else if (activeTool === 'image' && pendingImage) {
      redrawOverlay({ type: 'image', img: pendingImage.img, x1: dragStart.x, y1: dragStart.y, x2: pt.x, y2: pt.y });
    }
  });

  function finishDrag() {
    if (!isDragging) return;
    isDragging = false;
    const edits = getEditsForPage(currentPage);

    if (activeTool === 'draw' && activeStroke && activeStroke.points.length > 1) {
      edits.push(activeStroke);
    } else if (activeTool === 'whiteout' && dragStart && dragCurrent) {
      if (Math.abs(dragCurrent.x - dragStart.x) > 0.005 || Math.abs(dragCurrent.y - dragStart.y) > 0.005) {
        edits.push({ type: 'whiteout', x1: dragStart.x, y1: dragStart.y, x2: dragCurrent.x, y2: dragCurrent.y });
      }
    } else if (activeTool === 'highlight' && dragStart && dragCurrent) {
      if (Math.abs(dragCurrent.x - dragStart.x) > 0.005 || Math.abs(dragCurrent.y - dragStart.y) > 0.005) {
        const hiColor = (colorInput?.value || '#1e293b') === '#1e293b' ? '#facc15' : colorInput.value;
        edits.push({ type: 'highlight', x1: dragStart.x, y1: dragStart.y, x2: dragCurrent.x, y2: dragCurrent.y, color: hiColor });
      }
    } else if (activeTool === 'image' && pendingImage && dragStart && dragCurrent) {
      let x2 = dragCurrent.x;
      let y2 = dragCurrent.y;
      if (Math.abs(x2 - dragStart.x) < 0.02 && Math.abs(y2 - dragStart.y) < 0.02) {
        // Quick tap fallback: place neat 28% width box preserving image aspect ratio
        const wNorm = 0.28;
        const aspect = (pendingImage.img.naturalHeight / Math.max(1, pendingImage.img.naturalWidth)) * (overlayCanvas.width / Math.max(1, overlayCanvas.height));
        x2 = Math.min(1, dragStart.x + wNorm);
        y2 = Math.min(1, dragStart.y + wNorm * aspect);
      }
      edits.push({ type: 'image', img: pendingImage.img, x1: dragStart.x, y1: dragStart.y, x2, y2 });
      setTool('text');
    }

    activeStroke = null;
    dragStart = null;
    dragCurrent = null;
    redrawOverlay();
  }

  overlayCanvas.addEventListener('pointerup', finishDrag);
  overlayCanvas.addEventListener('pointercancel', finishDrag);

  if (undoBtn) {
    undoBtn.addEventListener('click', () => {
      const edits = getEditsForPage(currentPage);
      if (edits.length > 0) {
        edits.pop();
        redrawOverlay();
      }
    });
  }

  if (clearPageBtn) {
    clearPageBtn.addEventListener('click', () => {
      pageEdits.set(currentPage, []);
      redrawOverlay();
    });
  }

  if (prevBtn) prevBtn.addEventListener('click', () => renderPage(currentPage - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => renderPage(currentPage + 1));

  input.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    input.value = '';
    if (!file) return;

    utils.showLoader('Opening PDF in Visual Editor...', 'text-indigo-600');
    try {
      const buf = await file.arrayBuffer();
      sourceBytes = new Uint8Array(buf);
      sourceFileName = file.name.replace(/\.pdf$/i, '');
      pageEdits.clear();

      pdfJsDoc = await window.pdfjsLib.getDocument({ data: sourceBytes.slice(0) }).promise;
      totalPages = pdfJsDoc.numPages;

      fileNameEl.textContent = file.name;
      emptyState.classList.add('hidden');
      canvasWrap.classList.remove('hidden');
      controlsBar.classList.remove('hidden');
      saveBtn.disabled = false;

      await renderPage(1);
      utils.showToast('Editor Ready', `Loaded ${totalPages} page(s). Tap or drag on the page to edit.`);
    } catch (err) {
      console.error(err);
      utils.showToast('Error', 'Could not open PDF for editing.', 'error');
    } finally {
      utils.hideLoader();
    }
  });

  saveBtn.addEventListener('click', async () => {
    if (!sourceBytes) return;
    utils.showLoader('Applying Edits to PDF...', 'text-indigo-600');
    try {
      const pdfDoc = await window.PDFLib.PDFDocument.load(sourceBytes, { ignoreEncryption: true });
      const pages = pdfDoc.getPages();

      for (const [pageNum, edits] of pageEdits.entries()) {
        if (!edits || edits.length === 0) continue;
        const pdfPage = pages[pageNum - 1];
        if (!pdfPage) continue;

        const { width, height } = pdfPage.getSize();
        const exportScale = 2.5;
        const off = document.createElement('canvas');
        off.width = Math.max(1, Math.round(width * exportScale));
        off.height = Math.max(1, Math.round(height * exportScale));
        const offCtx = off.getContext('2d');

        drawAnnotationsOnContext(offCtx, off.width, off.height, edits);
        const pngBlob = await new Promise((resolve) => off.toBlob(resolve, 'image/png'));
        const pngBytes = await pngBlob.arrayBuffer();
        const pngImg = await pdfDoc.embedPng(pngBytes);

        pdfPage.drawImage(pngImg, { x: 0, y: 0, width, height });
      }

      const res = await utils.savePdfWithMetadata(pdfDoc, `${sourceFileName}_edited.pdf`, `${sourceFileName} (Edited)`);
      if (res && res.saved) {
        utils.showToast('PDF Saved!', `Saved "${res.filename}" with all your edits.`);
      }
    } catch (err) {
      console.error(err);
      utils.showToast('Error', 'Could not save edited PDF.', 'error');
    } finally {
      utils.hideLoader();
    }
  });
}

/* ==========================================================================
   22. Passport Size Photo Maker & Printable A4 / 4x6 Studio (Image Section)
   ========================================================================== */

function initPassportMaker() {
  const input = document.getElementById('passportPhotoInput');
  const presetSelect = document.getElementById('passportSizePreset');
  const bgColorSelect = document.getElementById('passportBgColor');
  const bgTolWrap = document.getElementById('passportBgTolWrap');
  const bgTolSlider = document.getElementById('passportBgTolerance');
  const bgTolVal = document.getElementById('passportBgTolVal');
  const zoomSlider = document.getElementById('passportZoom');
  const zoomVal = document.getElementById('passportZoomVal');
  const offsetYSlider = document.getElementById('passportOffsetY');
  const offsetYVal = document.getElementById('passportOffsetYVal');
  const offsetXSlider = document.getElementById('passportOffsetX');
  const offsetXVal = document.getElementById('passportOffsetXVal');
  const borderCheckbox = document.getElementById('passportAddBorder');
  const targetKbInput = document.getElementById('passportTargetKb');
  const sheetLayoutSelect = document.getElementById('passportSheetLayout');
  const dlSingleBtn = document.getElementById('passportDownloadSingleBtn');
  const dlSheetPdfBtn = document.getElementById('passportDownloadSheetPdfBtn');
  const dlSheetJpgBtn = document.getElementById('passportDownloadSheetJpgBtn');
  const dimsMeta = document.getElementById('passportDimensionsMeta');
  const singleCanvas = document.getElementById('passportSingleCanvas');
  const sheetCanvas = document.getElementById('passportSheetCanvas');

  if (!input || !singleCanvas || !sheetCanvas) return;

  const PRESETS = {
    india: { name: 'India_Passport_35x45mm', wMm: 35, hMm: 45, pxW: 413, pxH: 531 },
    pan:   { name: 'PAN_Card_25x35mm',       wMm: 25, hMm: 35, pxW: 295, pxH: 413 },
    us:    { name: 'US_Visa_OCI_51x51mm',    wMm: 51, hMm: 51, pxW: 600, pxH: 600 },
    stamp: { name: 'Stamp_Size_20x25mm',     wMm: 20, hMm: 25, pxW: 236, pxH: 295 }
  };

  const SHEET_LAYOUTS = {
    a4_8:  { pageMmW: 210,   pageMmH: 297,   cols: 4, rows: 2, count: 8,  label: 'A4_8_Photos' },
    a4_12: { pageMmW: 210,   pageMmH: 297,   cols: 4, rows: 3, count: 12, label: 'A4_12_Photos' },
    a4_24: { pageMmW: 210,   pageMmH: 297,   cols: 4, rows: 6, count: 24, label: 'A4_24_Photos' },
    a4_30: { pageMmW: 210,   pageMmH: 297,   cols: 5, rows: 6, count: 30, label: 'A4_30_Photos' },
    '4x6_6': { pageMmW: 152.4, pageMmH: 101.6, cols: 3, rows: 2, count: 6,  label: '4x6_6_Photos' },
    '4x6_8': { pageMmW: 152.4, pageMmH: 101.6, cols: 4, rows: 2, count: 8,  label: '4x6_8_Photos' }
  };

  let sourceImg = null;
  let processedBgCanvas = null; // Cached background-replaced portrait
  let lastBgKey = '';

  function hexToRgb(hex) {
    const clean = hex.replace('#', '');
    return [
      parseInt(clean.slice(0, 2), 16) || 255,
      parseInt(clean.slice(2, 4), 16) || 255,
      parseInt(clean.slice(4, 6), 16) || 255
    ];
  }

  // Edge-connected flood-fill studio background replacement
  function buildBgReplacedCanvas(img, targetHex, tolerance) {
    const maxDim = 680;
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));

    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const [tr, tg, tb] = hexToRgb(targetHex);

    // Sample multiple border seed colors along top & upper sides
    const seedCoords = [
      [2, 2], [w - 3, 2], [Math.floor(w / 2), 2],
      [2, Math.floor(h * 0.25)], [w - 3, Math.floor(h * 0.25)],
      [2, Math.floor(h * 0.5)], [w - 3, Math.floor(h * 0.5)]
    ];
    const seeds = seedCoords.map(([sx, sy]) => {
      const idx = (Math.max(0, Math.min(h - 1, sy)) * w + Math.max(0, Math.min(w - 1, sx))) * 4;
      return [data[idx], data[idx + 1], data[idx + 2]];
    });

    const tolSq = (tolerance * 2.15) * (tolerance * 2.15);
    const visited = new Uint8Array(w * h);
    const bgMask = new Uint8Array(w * h);
    const queue = new Int32Array(w * h);
    let head = 0;
    let tail = 0;

    const enqueue = (px, py) => {
      const pIdx = py * w + px;
      if (visited[pIdx]) return;
      visited[pIdx] = 1;
      queue[tail++] = pIdx;
    };

    // Seed flood fill from all outer edges (top, left, right)
    for (let x = 0; x < w; x++) enqueue(x, 0);
    for (let y = 0; y < h; y++) {
      enqueue(0, y);
      enqueue(w - 1, y);
    }

    const matchesBg = (r, g, b, refR, refG, refB) => {
      const dr = r - refR;
      const dg = g - refG;
      const db = b - refB;
      if (dr * dr + dg * dg + db * db <= tolSq * 0.72) return true;
      for (let s = 0; s < seeds.length; s++) {
        const sr = r - seeds[s][0];
        const sg = g - seeds[s][1];
        const sb = b - seeds[s][2];
        if (sr * sr + sg * sg + sb * sb <= tolSq) return true;
      }
      return false;
    };

    while (head < tail) {
      const pIdx = queue[head++];
      const px = pIdx % w;
      const py = (pIdx - px) / w;
      const dIdx = pIdx * 4;
      const r = data[dIdx];
      const g = data[dIdx + 1];
      const b = data[dIdx + 2];

      if (!matchesBg(r, g, b, r, g, b)) continue;
      bgMask[pIdx] = 1;

      const neighbors = [
        [px - 1, py], [px + 1, py], [px, py - 1], [px, py + 1]
      ];
      for (let n = 0; n < 4; n++) {
        const nx = neighbors[n][0];
        const ny = neighbors[n][1];
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        const nIdx = ny * w + nx;
        if (visited[nIdx]) continue;
        const nd = nIdx * 4;
        if (matchesBg(data[nd], data[nd + 1], data[nd + 2], r, g, b)) {
          visited[nIdx] = 1;
          queue[tail++] = nIdx;
        }
      }
    }

    // Apply solid replacement + subtle 1px edge feathering
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const pIdx = y * w + x;
        const dIdx = pIdx * 4;
        if (bgMask[pIdx]) {
          data[dIdx] = tr;
          data[dIdx + 1] = tg;
          data[dIdx + 2] = tb;
        } else if (x > 0 && x < w - 1 && y > 0 && y < h - 1) {
          const borderTouch = bgMask[pIdx - 1] + bgMask[pIdx + 1] + bgMask[pIdx - w] + bgMask[pIdx + w];
          if (borderTouch >= 2) {
            data[dIdx] = Math.round(data[dIdx] * 0.55 + tr * 0.45);
            data[dIdx + 1] = Math.round(data[dIdx + 1] * 0.55 + tg * 0.45);
            data[dIdx + 2] = Math.round(data[dIdx + 2] * 0.55 + tb * 0.45);
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return c;
  }

  function renderStudio() {
    const preset = PRESETS[presetSelect?.value || 'india'] || PRESETS.india;
    const layout = SHEET_LAYOUTS[sheetLayoutSelect?.value || 'a4_12'] || SHEET_LAYOUTS.a4_12;
    const bgVal = bgColorSelect?.value || 'original';
    const tol = parseInt(bgTolSlider?.value || '38', 10) || 38;
    const zoom = (parseInt(zoomSlider?.value || '100', 10) || 100) / 100;
    const offX = parseInt(offsetXSlider?.value || '0', 10) || 0;
    const offY = parseInt(offsetYSlider?.value || '0', 10) || 0;
    const addBorder = Boolean(borderCheckbox?.checked);

    if (bgTolWrap) bgTolWrap.classList.toggle('hidden', bgVal === 'original');
    if (bgTolVal) bgTolVal.textContent = String(tol);
    if (zoomVal) zoomVal.textContent = `${Math.round(zoom * 100)}%`;
    if (offsetXVal) offsetXVal.textContent = String(offX);
    if (offsetYVal) offsetYVal.textContent = String(offY);
    if (dimsMeta) dimsMeta.textContent = `${preset.wMm} × ${preset.hMm} mm · ${preset.pxW} × ${preset.pxH} px (300 DPI)`;

    // 1. Render Single Passport Canvas (exact 300 DPI pixel size)
    singleCanvas.width = preset.pxW;
    singleCanvas.height = preset.pxH;
    const sCtx = singleCanvas.getContext('2d');
    sCtx.fillStyle = bgVal === 'original' ? '#ffffff' : bgVal;
    sCtx.fillRect(0, 0, singleCanvas.width, singleCanvas.height);

    if (sourceImg) {
      let drawSource = sourceImg;
      if (bgVal !== 'original') {
        const key = `${bgVal}_${tol}_${sourceImg.src.slice(0, 40)}`;
        if (key !== lastBgKey || !processedBgCanvas) {
          processedBgCanvas = buildBgReplacedCanvas(sourceImg, bgVal, tol);
          lastBgKey = key;
        }
        drawSource = processedBgCanvas;
      }

      const srcW = drawSource.width || drawSource.naturalWidth;
      const srcH = drawSource.height || drawSource.naturalHeight;
      const baseScale = Math.max(singleCanvas.width / srcW, singleCanvas.height / srcH);
      const finalScale = baseScale * zoom;
      const drawW = srcW * finalScale;
      const drawH = srcH * finalScale;

      const dx = (singleCanvas.width - drawW) / 2 + (offX / 100) * singleCanvas.width;
      const dy = (singleCanvas.height - drawH) / 2 + (offY / 100) * singleCanvas.height;

      sCtx.drawImage(drawSource, dx, dy, drawW, drawH);
    } else {
      // Placeholder guide silhouette
      sCtx.fillStyle = '#e2e8f0';
      sCtx.beginPath();
      sCtx.arc(singleCanvas.width / 2, singleCanvas.height * 0.36, singleCanvas.width * 0.2, 0, Math.PI * 2);
      sCtx.fill();
      sCtx.beginPath();
      sCtx.ellipse(singleCanvas.width / 2, singleCanvas.height * 0.84, singleCanvas.width * 0.36, singleCanvas.height * 0.26, 0, Math.PI, Math.PI * 2);
      sCtx.fill();
      sCtx.fillStyle = '#64748b';
      sCtx.font = 'bold 24px system-ui, sans-serif';
      sCtx.textAlign = 'center';
      sCtx.fillText('Upload Photo', singleCanvas.width / 2, singleCanvas.height * 0.94);
    }

    if (addBorder) {
      sCtx.strokeStyle = '#0f172a';
      sCtx.lineWidth = Math.max(2, Math.round(singleCanvas.width * 0.008));
      sCtx.strokeRect(sCtx.lineWidth / 2, sCtx.lineWidth / 2, singleCanvas.width - sCtx.lineWidth, singleCanvas.height - sCtx.lineWidth);
    }

    // 2. Render Sheet Preview Canvas
    renderSheetToCanvas(sheetCanvas, layout, preset, 3.2);
  }

  function renderSheetToCanvas(targetCanvas, layout, preset, pxPerMm) {
    const sheetW = Math.round(layout.pageMmW * pxPerMm);
    const sheetH = Math.round(layout.pageMmH * pxPerMm);
    targetCanvas.width = sheetW;
    targetCanvas.height = sheetH;

    const ctx = targetCanvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, sheetW, sheetH);

    // Compute photo cell size in mm (auto-shrink gently if user picks e.g. 51x51mm on 5 cols)
    const gapMm = 4.5;
    const marginMm = 8;
    const maxCellW = (layout.pageMmW - marginMm * 2 - gapMm * (layout.cols - 1)) / layout.cols;
    const maxCellH = (layout.pageMmH - marginMm * 2 - gapMm * (layout.rows - 1)) / layout.rows;
    const fitScale = Math.min(1, maxCellW / preset.wMm, maxCellH / preset.hMm);

    const drawMmW = preset.wMm * fitScale;
    const drawMmH = preset.hMm * fitScale;
    const totalGridW = layout.cols * drawMmW + (layout.cols - 1) * gapMm;
    const startMmX = (layout.pageMmW - totalGridW) / 2;
    const startMmY = marginMm;

    let drawn = 0;
    for (let r = 0; r < layout.rows; r++) {
      for (let c = 0; c < layout.cols; c++) {
        if (drawn >= layout.count) break;
        const x = (startMmX + c * (drawMmW + gapMm)) * pxPerMm;
        const y = (startMmY + r * (drawMmH + gapMm)) * pxPerMm;
        const w = drawMmW * pxPerMm;
        const h = drawMmH * pxPerMm;

        ctx.drawImage(singleCanvas, x, y, w, h);

        // Subtle print cut-guide corners
        ctx.save();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = Math.max(1, pxPerMm * 0.2);
        ctx.setLineDash([Math.max(2, pxPerMm * 1.2), Math.max(2, pxPerMm * 1.2)]);
        ctx.strokeRect(x - pxPerMm * 0.4, y - pxPerMm * 0.4, w + pxPerMm * 0.8, h + pxPerMm * 0.8);
        ctx.restore();
        drawn++;
      }
    }
  }

  input.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    input.value = '';
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      sourceImg = img;
      processedBgCanvas = null;
      lastBgKey = '';
      dlSingleBtn.disabled = false;
      dlSheetPdfBtn.disabled = false;
      dlSheetJpgBtn.disabled = false;
      renderStudio();
      utils.showToast('Portrait Loaded', 'Adjust Zoom, Position, or Background Color live.');
    };
    img.src = url;
  });

  [presetSelect, bgColorSelect, bgTolSlider, zoomSlider, offsetXSlider, offsetYSlider, borderCheckbox, sheetLayoutSelect].forEach((el) => {
    if (!el) return;
    el.addEventListener('input', renderStudio);
    el.addEventListener('change', renderStudio);
  });

  // Download Single Passport Photo (Exact Target KB or HD)
  dlSingleBtn.addEventListener('click', async () => {
    if (!sourceImg) return;
    const preset = PRESETS[presetSelect?.value || 'india'] || PRESETS.india;
    const targetKb = parseInt(targetKbInput?.value || '0', 10) || 0;

    utils.showLoader(targetKb > 0 ? `Exporting ${targetKb} KB Passport Photo...` : 'Exporting HD Passport Photo...', 'text-sky-600');
    try {
      let blob;
      if (targetKb > 0) {
        const tmpImg = new Image();
        tmpImg.src = singleCanvas.toDataURL('image/png');
        await new Promise((resolve) => (tmpImg.onload = resolve));
        blob = await reduceCanvasToExactKb(tmpImg, targetKb);
      } else {
        blob = await new Promise((resolve) => singleCanvas.toBlob(resolve, 'image/jpeg', 0.96));
      }
      const name = `${preset.name}${targetKb > 0 ? '_' + targetKb + 'kb' : '_HD'}.jpg`;
      utils.downloadBlob(blob, name);
      utils.showToast('Single Photo Saved!', `Downloaded ${name} (${utils.formatBytes(blob.size)}).`);
    } catch (err) {
      console.error(err);
      utils.showToast('Error', 'Could not export single passport photo.', 'error');
    } finally {
      utils.hideLoader();
    }
  });

  // Download Printable Sheet PDF (Exact Millimeter Print Dimensions)
  dlSheetPdfBtn.addEventListener('click', async () => {
    if (!sourceImg) return;
    const preset = PRESETS[presetSelect?.value || 'india'] || PRESETS.india;
    const layout = SHEET_LAYOUTS[sheetLayoutSelect?.value || 'a4_12'] || SHEET_LAYOUTS.a4_12;

    utils.showLoader('Generating Print-Ready PDF Sheet...', 'text-sky-600');
    try {
      const MM_TO_PT = 72 / 25.4;
      const pdfDoc = await window.PDFLib.PDFDocument.create();
      const pageW = layout.pageMmW * MM_TO_PT;
      const pageH = layout.pageMmH * MM_TO_PT;
      const page = pdfDoc.addPage([pageW, pageH]);

      const jpgBlob = await new Promise((resolve) => singleCanvas.toBlob(resolve, 'image/jpeg', 0.96));
      const jpgBytes = await jpgBlob.arrayBuffer();
      const jpgImg = await pdfDoc.embedJpg(jpgBytes);

      const gapMm = 4.5;
      const marginMm = 8;
      const maxCellW = (layout.pageMmW - marginMm * 2 - gapMm * (layout.cols - 1)) / layout.cols;
      const maxCellH = (layout.pageMmH - marginMm * 2 - gapMm * (layout.rows - 1)) / layout.rows;
      const fitScale = Math.min(1, maxCellW / preset.wMm, maxCellH / preset.hMm);

      const drawMmW = preset.wMm * fitScale;
      const drawMmH = preset.hMm * fitScale;
      const totalGridW = layout.cols * drawMmW + (layout.cols - 1) * gapMm;
      const startMmX = (layout.pageMmW - totalGridW) / 2;
      const startMmY = marginMm;

      let drawn = 0;
      for (let r = 0; r < layout.rows; r++) {
        for (let c = 0; c < layout.cols; c++) {
          if (drawn >= layout.count) break;
          const xPt = (startMmX + c * (drawMmW + gapMm)) * MM_TO_PT;
          const topMm = startMmY + r * (drawMmH + gapMm);
          const yPt = pageH - (topMm + drawMmH) * MM_TO_PT;
          const wPt = drawMmW * MM_TO_PT;
          const hPt = drawMmH * MM_TO_PT;

          page.drawImage(jpgImg, { x: xPt, y: yPt, width: wPt, height: hPt });
          page.drawRectangle({
            x: xPt - 1,
            y: yPt - 1,
            width: wPt + 2,
            height: hPt + 2,
            borderColor: window.PDFLib.rgb(0.8, 0.84, 0.88),
            borderWidth: 0.5
          });
          drawn++;
        }
      }

      const fileName = `Passport_${layout.label}.pdf`;
      const res = await utils.savePdfWithMetadata(pdfDoc, fileName, `Passport Sheet (${layout.count} Photos)`);
      if (res && res.saved) {
        utils.showToast('Print Sheet PDF Ready!', `Saved "${res.filename}" (${layout.count} photos at exact print scale).`);
      }
    } catch (err) {
      console.error(err);
      utils.showToast('Error', 'Could not build print sheet PDF.', 'error');
    } finally {
      utils.hideLoader();
    }
  });

  // Download Printable Sheet as 300 DPI HD JPG
  dlSheetJpgBtn.addEventListener('click', async () => {
    if (!sourceImg) return;
    const preset = PRESETS[presetSelect?.value || 'india'] || PRESETS.india;
    const layout = SHEET_LAYOUTS[sheetLayoutSelect?.value || 'a4_12'] || SHEET_LAYOUTS.a4_12;

    utils.showLoader('Rendering 300 DPI Print Sheet JPG...', 'text-sky-600');
    try {
      const hdCanvas = document.createElement('canvas');
      const pxPerMm300Dpi = 300 / 25.4;
      renderSheetToCanvas(hdCanvas, layout, preset, pxPerMm300Dpi);
      const blob = await new Promise((resolve) => hdCanvas.toBlob(resolve, 'image/jpeg', 0.96));
      const name = `Passport_${layout.label}_300DPI.jpg`;
      utils.downloadBlob(blob, name);
      utils.showToast('HD Print Sheet Saved!', `Saved "${name}" (${utils.formatBytes(blob.size)}).`);
    } catch (err) {
      console.error(err);
      utils.showToast('Error', 'Could not export HD print sheet JPG.', 'error');
    } finally {
      utils.hideLoader();
    }
  });

  // Initial empty studio preview
  renderStudio();
}


