/**
 * PDF Bondhu - Advanced Application Logic
 * 100% Offline, Privacy-First browser based processing.
 */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
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

  // Initialize new utility modules
  initPdfOrganizer();
  initPdfWatermark();
  initPhotoResizer();
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
  }
};

/* ==========================================================================
   PWA, Android WebView Bridge, Auto-Update & Share Hub
   ========================================================================== */

const PUBLISHED_APP_URL = 'https://ais-pre-djeap3venq5kotpetnutp7-304175076052.asia-southeast1.run.app';

window.onAndroidDownloadSuccess = (savedName) => {
  utils.showToast('Saved to Downloads', `${savedName} saved in Downloads/PDF Bondhu.`);
};

window.onAndroidDownloadError = (msg) => {
  utils.showToast('Save Failed', msg || 'Could not write file on device.', 'error');
};

window.handleAndroidBackPress = () => {
  // 1. Close any visible modal first
  const modals = [
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
        utils.showToast('App Updated', 'Latest published version of PDF Bondhu is now active.', 'info');
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
    if (appHubModeText) appHubModeText.textContent = `Running inside PDF Bondhu Android App v${ver} · Auto-updates active`;
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
        utils.showToast('Installed', 'PDF Bondhu added to your home screen!');
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
      const shareTitle = 'PDF Bondhu - Offline PDF & Document Utility App';
      const shareMessage = `Use PDF Bondhu to Scan, Merge, Split, Compress PDFs, OCR, and Excel tools 100% privately: ${PUBLISHED_APP_URL}`;

      if (window.AndroidBridge && typeof window.AndroidBridge.shareText === 'function') {
        window.AndroidBridge.shareText(shareTitle, shareMessage);
        return;
      }

      if (navigator.share) {
        try {
          await navigator.share({
            title: shareTitle,
            text: 'Scan, Merge, Split & Compress PDFs offline with PDF Bondhu:',
            url: PUBLISHED_APP_URL
          });
          return;
        } catch (err) {
          if (err && err.name === 'AbortError') return;
        }
      }

      try {
        await navigator.clipboard.writeText(PUBLISHED_APP_URL);
        utils.showToast('Link Copied', 'Paste and share PDF Bondhu anywhere!');
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
  quality: 0.95   // 0.1 to 1.0
};

/* ==========================================================================
   Computer Vision Utilities (Auto Crop, Perspective)
   ========================================================================== */
const cvUtils = {
  isReady: () => typeof cv !== 'undefined' && cv.Mat,
  orderPoints: (pts) => {
    // Sort by sum of x+y to find Top-Left and Bottom-Right
    pts.sort((a, b) => (a.x + a.y) - (b.x + b.y));
    const tl = pts[0];
    const br = pts[3];
    
    // Sort remaining by diff of x-y to find Top-Right and Bottom-Left
    const remain = [pts[1], pts[2]];
    remain.sort((a, b) => (a.x - a.y) - (b.x - b.y));
    const bl = remain[0];
    const tr = remain[1];
    
    return [tl, tr, br, bl];
  },
  autoCrop: (imageElement) => {
    return new Promise((resolve, reject) => {
      if (!cvUtils.isReady()) return reject("OpenCV not ready");
      try {
        let src = cv.imread(imageElement);
        
        // Downscale for performance
        const maxDim = 800;
        let scale = 1;
        let processSrc = new cv.Mat();
        if (src.cols > maxDim || src.rows > maxDim) {
          scale = Math.min(maxDim / src.cols, maxDim / src.rows);
          cv.resize(src, processSrc, new cv.Size(0, 0), scale, scale, cv.INTER_AREA);
        } else {
          processSrc = src.clone();
        }

        // Grayscale & Blur
        let gray = new cv.Mat();
        cv.cvtColor(processSrc, gray, cv.COLOR_RGBA2GRAY, 0);
        let blurred = new cv.Mat();
        cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
        
        // Edge Detection
        let edges = new cv.Mat();
        cv.Canny(blurred, edges, 75, 200);

        // Find Contours
        let contours = new cv.MatVector();
        let hierarchy = new cv.Mat();
        cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

        let maxArea = 0;
        let bestCnt = null;
        for (let i = 0; i < contours.size(); ++i) {
          let cnt = contours.get(i);
          let area = cv.contourArea(cnt);
          if (area > (processSrc.cols * processSrc.rows * 0.1)) {
            let peri = cv.arcLength(cnt, true);
            let approx = new cv.Mat();
            cv.approxPolyDP(cnt, approx, 0.02 * peri, true);
            if (approx.rows === 4 && area > maxArea) {
              maxArea = area;
              if (bestCnt) bestCnt.delete();
              bestCnt = approx;
            } else {
              approx.delete();
            }
          }
        }

        let finalMat = new cv.Mat();
        if (bestCnt) {
          // Found document. Apply Perspective Transform to original hi-res image
          let pts = [];
          for(let i=0; i<4; i++) {
            pts.push({
              x: bestCnt.data32S[i*2] / scale,
              y: bestCnt.data32S[i*2+1] / scale
            });
          }
          let orderedPts = cvUtils.orderPoints(pts);

          let w1 = Math.hypot(orderedPts[2].x - orderedPts[3].x, orderedPts[2].y - orderedPts[3].y);
          let w2 = Math.hypot(orderedPts[1].x - orderedPts[0].x, orderedPts[1].y - orderedPts[0].y);
          let maxWidth = Math.max(w1, w2);

          let h1 = Math.hypot(orderedPts[1].x - orderedPts[2].x, orderedPts[1].y - orderedPts[2].y);
          let h2 = Math.hypot(orderedPts[0].x - orderedPts[3].x, orderedPts[0].y - orderedPts[3].y);
          let maxHeight = Math.max(h1, h2);

          let srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
            orderedPts[0].x, orderedPts[0].y,
            orderedPts[1].x, orderedPts[1].y,
            orderedPts[2].x, orderedPts[2].y,
            orderedPts[3].x, orderedPts[3].y
          ]);

          let dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
            0, 0,
            maxWidth - 1, 0,
            maxWidth - 1, maxHeight - 1,
            0, maxHeight - 1
          ]);

          let M = cv.getPerspectiveTransform(srcTri, dstTri);
          cv.warpPerspective(src, finalMat, M, new cv.Size(maxWidth, maxHeight));

          srcTri.delete(); dstTri.delete(); M.delete(); bestCnt.delete();
        } else {
          finalMat = src.clone();
        }

        src.delete(); processSrc.delete(); gray.delete(); blurred.delete(); edges.delete();
        contours.delete(); hierarchy.delete();

        // Resolve canvas
        const outCanvas = document.createElement('canvas');
        cv.imshow(outCanvas, finalMat);
        finalMat.delete();
        resolve(outCanvas);
      } catch (e) {
        console.error("OpenCV AutoCrop Failed", e);
        reject(e);
      }
    });
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

      const mergedPdfFile = await mergedPdf.save();
      const blob = new Blob([mergedPdfFile], { type: 'application/pdf' });
      utils.downloadBlob(blob, 'Merged_Document.pdf');
      utils.showToast('Success', 'PDFs successfully bound together.');
      
      selectedFiles = [];
      renderList();
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

      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      utils.downloadBlob(blob, `Extracted_${currentFile.name}`);
      utils.showToast('Success', `Extracted ${finalIndices.length} pages.`);
      
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
   6. Image Compressor & Resizer
   ========================================================================== */

function initImageCompressor() {
  const input = document.getElementById('imgCompressInput');
  const list = document.getElementById('imgCompressList');
  const emptyState = document.getElementById('imgCompressEmptyState');
  const actionBtn = document.getElementById('imgCompressActionBtn');
  const qualitySlider = document.getElementById('qualitySlider');
  const qualityVal = document.getElementById('qualityVal');
  let selectedImages = [];
  
  qualitySlider.addEventListener('input', (e) => {
    qualityVal.textContent = e.target.value + '%';
  });

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
      li.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0 border border-slate-200 dark:border-slate-700">
             <img src="${imgObj.preview}" class="w-full h-full object-cover" />
          </div>
          <div class="flex-1 overflow-hidden">
            <p class="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">${imgObj.file.name}</p>
            <p class="text-xs text-slate-400 dark:text-slate-500 font-medium tabular-nums">${utils.formatBytes(imgObj.file.size)}</p>
          </div>
          <button class="remove-btn text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 p-2 rounded-lg transition-colors" data-index="${index}"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <div class="result-area hidden text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 p-2.5 rounded-lg border border-emerald-200/70 dark:border-emerald-800/70 flex justify-between items-center tabular-nums">
          <span>Output: <span class="compressed-size font-extrabold"></span></span>
          <span class="bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 px-1.5 py-0.5 rounded text-[10px] saving-percent"></span>
        </div>
      `;
      list.appendChild(li);
    });

    document.querySelectorAll('#imgCompressList .remove-btn').forEach(btn => btn.onclick = removeItem);
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
    utils.showLoader('Shrinking Images...', 'text-orange-600');
    
    try {
      const quality = parseInt(qualitySlider.value) / 100;
      const listItems = list.querySelectorAll('li');

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
        
        const outType = imgObj.file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const blob = await new Promise(resolve => canvas.toBlob(resolve, outType, quality));
        
        utils.downloadBlob(blob, 'min_' + imgObj.file.name);
        
        const li = listItems[i];
        const resArea = li.querySelector('.result-area');
        const cSize = li.querySelector('.compressed-size');
        const sPerc = li.querySelector('.saving-percent');
        
        resArea.classList.remove('hidden');
        resArea.classList.add('flex');
        cSize.textContent = utils.formatBytes(blob.size);
        const saved = ((imgObj.file.size - blob.size) / imgObj.file.size * 100).toFixed(1);
        sPerc.textContent = saved > 0 ? saved + '% OFF' : '0%';
      }
      
      utils.showToast('Success', 'Images efficiently shrunk.');
    } catch (err) {
      console.error(err);
      utils.showToast('Error', 'Failed to compress images.', 'error');
    } finally {
      utils.hideLoader();
    }
  });
}

/* ==========================================================================
   7. Image to PDF Converter
   ========================================================================== */

function initImageToPdf() {
  const input = document.getElementById('imgToPdfInput');
  const list = document.getElementById('imgToPdfList');
  const emptyState = document.getElementById('imgToPdfEmptyState');
  const actionBtn = document.getElementById('imgToPdfActionBtn');
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

    document.querySelectorAll('#imgToPdfList .up-btn').forEach(btn => btn.onclick = (e) => moveItem(e, -1));
    document.querySelectorAll('#imgToPdfList .down-btn').forEach(btn => btn.onclick = (e) => moveItem(e, 1));
    document.querySelectorAll('#imgToPdfList .remove-btn').forEach(btn => btn.onclick = removeItem);
  }

  function moveItem(e, dir) {
    const idx = parseInt(e.currentTarget.getAttribute('data-index'));
    if (idx + dir < 0 || idx + dir >= selectedImages.length) return;
    const temp = selectedImages[idx];
    selectedImages[idx] = selectedImages[idx + dir];
    selectedImages[idx + dir] = temp;
    renderList();
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
    utils.showLoader('Rendering Document...', 'text-pink-600');
    
    try {
      const { PDFDocument } = window.PDFLib;
      const pdfDoc = await PDFDocument.create();

      for (const imgObj of selectedImages) {
        const arrayBuffer = await imgObj.file.arrayBuffer();
        let pdfImage;
        if (imgObj.file.type === 'image/jpeg') {
          pdfImage = await pdfDoc.embedJpg(arrayBuffer);
        } else if (imgObj.file.type === 'image/png') {
          pdfImage = await pdfDoc.embedPng(arrayBuffer);
        } else {
          continue;
        }

        const dims = pdfImage.scale(1);
        
        // Scale to A4 width, but match exact aspect ratio
        let pageDrawWidth = 595.28;
        let pageDrawHeight = pageDrawWidth * (dims.height / dims.width);
        if (dims.width > dims.height) {
          pageDrawWidth = 841.89;
          pageDrawHeight = pageDrawWidth * (dims.height / dims.width);
        }
        
        const page = pdfDoc.addPage([pageDrawWidth, pageDrawHeight]);
        page.drawImage(pdfImage, {
          x: 0,
          y: 0,
          width: pageDrawWidth,
          height: pageDrawHeight,
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      utils.downloadBlob(blob, 'Photo_Album.pdf');
      utils.showToast('Success', 'PDF beautifully compiled.');
      
      selectedImages = [];
      renderList();
    } catch (err) {
      console.error(err);
      utils.showToast('Error', 'Failed to render PDF.', 'error');
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
   PDF Scanner
   ========================================================================== */
function initPdfScanner() {
  const input = document.getElementById('pdfScannerInput');
  const list = document.getElementById('pdfScannerList');
  const emptyState = document.getElementById('pdfScannerEmptyState');
  const actionBtn = document.getElementById('pdfScannerActionBtn');
  
  // Settings Logic
  const settingsBtn = document.getElementById('scanSettingsBtn');
  const settingsPanel = document.getElementById('scanSettingsPanel');
  const setPageSize = document.getElementById('scanSetPageSize');
  const setQuality = document.getElementById('scanSetQuality');
  
  if (settingsBtn) {
     settingsBtn.addEventListener('click', () => {
        settingsPanel.classList.toggle('hidden');
     });
  }
  if (setPageSize) {
     setPageSize.value = scanSettings.pageSize;
     setPageSize.addEventListener('change', (e) => { scanSettings.pageSize = e.target.value; });
  }
  if (setQuality) {
     setQuality.value = scanSettings.quality.toString();
     setQuality.addEventListener('change', (e) => { scanSettings.quality = parseFloat(e.target.value); });
  }
  
  const modes = ['Original', 'Colour', 'BW', 'Gray', 'Ink'];
  const modeBtns = modes.reduce((acc, mode) => {
    const btn = document.getElementById(`scanMode${mode}`);
    if (btn) acc[mode.toLowerCase()] = btn;
    return acc;
  }, {});
  
  let files = [];
  let mode = 'original'; // original, colour, bw, gray, ink
  
  function updateModeUI() {
    Object.keys(modeBtns).forEach(key => {
      const btn = modeBtns[key];
      if (!btn) return;
      if (key === mode) {
        btn.classList.add('border-teal-400', 'bg-white', 'dark:bg-slate-900', 'shadow-sm');
        btn.classList.remove('border-transparent', 'bg-slate-50', 'dark:bg-slate-800');
      } else {
        btn.classList.remove('border-teal-400', 'bg-white', 'dark:bg-slate-900', 'shadow-sm');
        btn.classList.add('border-transparent', 'bg-slate-50', 'dark:bg-slate-800');
      }
    });
    renderList();
  }
  
  Object.keys(modeBtns).forEach(key => {
    if (modeBtns[key]) {
      modeBtns[key].addEventListener('click', () => { mode = key; updateModeUI(); });
    }
  });
  
  const retakeBtn = document.getElementById('scanToolRetake');
  if (retakeBtn) {
    retakeBtn.addEventListener('click', () => {
      if (files.length === 0) {
        utils.showToast('Wait', 'No image to retake.', 'info');
        return;
      }
      files.pop(); // Remove the last one
      renderList();
      input.click(); // Open file picker
    });
  }

  const rotateBtn = document.getElementById('scanToolRotate');
  if (rotateBtn) {
    rotateBtn.addEventListener('click', async () => {
      if (files.length === 0) return;
      utils.showLoader('Rotating...');
      try {
        const file = files[files.length - 1];
        const imgUrl = URL.createObjectURL(file);
        const img = new Image();
        await new Promise(r => { img.onload = r; img.src = imgUrl; });
        
        const canvas = document.createElement('canvas');
        canvas.width = img.height; // Swap width and height for 90deg rotation
        canvas.height = img.width;
        const ctx = canvas.getContext('2d');
        
        // Rotate 90 degrees clockwise
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(90 * Math.PI / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        
        const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', parseFloat(scanSettings.quality)));
        files[files.length - 1] = new File([blob], file.name, { type: 'image/jpeg' });
        
        URL.revokeObjectURL(imgUrl);
        renderList();
      } catch (err) {
        console.error("Rotate failed", err);
      } finally {
        utils.hideLoader();
      }
    });
  }

  const shadowBtn = document.getElementById('scanToolShadow');
  if (shadowBtn) {
    shadowBtn.addEventListener('click', () => {
      mode = 'colour';
      updateModeUI();
      renderList();
      utils.showToast('Shadow Removed', 'Auto-enhancement applied via Colour filter.', 'info');
    });
  }

  // Smart Crop Logic
  let cropper = null;
  const cropModal = document.getElementById('cropModal');
  const cropperImage = document.getElementById('cropperImage');
  const closeCropModal = document.getElementById('closeCropModal');
  const cancelCropBtn = document.getElementById('cancelCropBtn');
  const applyCropBtn = document.getElementById('applyCropBtn');
  const scanToolStraighten = document.getElementById('scanToolStraighten');

  function openCropModal() {
    if (files.length === 0) {
      utils.showToast('Wait', 'Please capture or select an image first.', 'info');
      return;
    }
    // Crop the currently visible/latest file (or we could crop all, let's just do the last one for now or the first one)
    // Actually, we should crop the raw file, but we don't have a selection UI for which file to crop if there are multiple.
    // For simplicity, let's let them crop the last captured document
    const fileToCrop = files[files.length - 1];
    const reader = new FileReader();
    reader.onload = (e) => {
      cropperImage.src = e.target.result;
      cropModal.classList.remove('hidden');
      cropModal.classList.add('flex');
      
      if (cropper) cropper.destroy();
      cropper = new Cropper(cropperImage, {
        viewMode: 2,
        autoCropArea: 1,
        background: false,
      });
    };
    reader.readAsDataURL(fileToCrop);
  }

  function closeCrop() {
    cropModal.classList.add('hidden');
    cropModal.classList.remove('flex');
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
  }

  if (scanToolStraighten) scanToolStraighten.addEventListener('click', openCropModal);
  if (closeCropModal) closeCropModal.addEventListener('click', closeCrop);
  if (cancelCropBtn) cancelCropBtn.addEventListener('click', closeCrop);
  
  if (applyCropBtn) {
    applyCropBtn.addEventListener('click', () => {
      if (!cropper) return;
      cropper.getCroppedCanvas({
        maxWidth: 2400,
        maxHeight: 2400
      }).toBlob((blob) => {
         // Replace the last file with cropped version
         const oldFile = files[files.length - 1];
         const newFile = new File([blob], oldFile.name, { type: 'image/jpeg' });
         files[files.length - 1] = newFile;
         closeCrop();
         renderList();
         utils.showToast('Success', 'Image cropped successfully!');
      }, 'image/jpeg', parseFloat(scanSettings.quality));
    });
  }

  input.addEventListener('change', async (e) => {
    const newFiles = Array.from(e.target.files);
    if (newFiles.length === 0) return;
    
    input.value = ''; // Reset input
    
    if (cvUtils.isReady()) {
       utils.showLoader('Auto Scanning...', 'text-cyan-600');
       for (let file of newFiles) {
           if (file.type.startsWith('image/')) {
               try {
                   // Read file to image
                   const img = new Image();
                   const imgUrl = URL.createObjectURL(file);
                   await new Promise(r => { img.onload = r; img.src = imgUrl; });
                   
                   // Auto crop
                   const croppedCanvas = await cvUtils.autoCrop(img);
                   URL.revokeObjectURL(imgUrl);
                   
                   // Convert back to file
                   const blob = await new Promise(r => croppedCanvas.toBlob(r, 'image/jpeg', parseFloat(scanSettings.quality)));
                   files.push(new File([blob], file.name, { type: 'image/jpeg' }));
               } catch (err) {
                   console.error("Auto crop failed, using original", err);
                   files.push(file);
               }
           } else {
               files.push(file);
           }
       }
       utils.hideLoader();
    } else {
       files = [...files, ...newFiles];
    }
    
    renderList();
  });

  function applyFilter(imageElement, currentMode) {
    return new Promise((resolve) => {
      // Prevent mobile canvas crashes by limiting max dimension
      const MAX_DIM = 2400;
      let w = imageElement.naturalWidth;
      let h = imageElement.naturalHeight;
      if (w > MAX_DIM || h > MAX_DIM) {
         const ratio = Math.min(MAX_DIM / w, MAX_DIM / h);
         w = Math.floor(w * ratio);
         h = Math.floor(h * ratio);
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imageElement, 0, 0, w, h);
      
      if (currentMode === 'original') {
        resolve(canvas.toDataURL('image/jpeg', 1.0));
        return;
      }
      
      if (typeof cv !== 'undefined' && cv.Mat) {
         try {
            let src = cv.imread(canvas);
            let dst = new cv.Mat();
            
            if (currentMode === 'colour' || currentMode === 'ink') {
                // CLAHE in LAB color space to preserve colors while enhancing contrast
                let rgb = new cv.Mat();
                cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB, 0);
                
                let lab = new cv.Mat();
                cv.cvtColor(rgb, lab, cv.COLOR_RGB2Lab, 0);
                
                let labPlanes = new cv.MatVector();
                cv.split(lab, labPlanes);
                
                let L = labPlanes.get(0);
                let clahe = new cv.CLAHE(3.0, new cv.Size(8, 8)); // Clip limit 3.0
                let L_clahe = new cv.Mat();
                clahe.apply(L, L_clahe);
                
                labPlanes.set(0, L_clahe);
                cv.merge(labPlanes, lab);
                
                cv.cvtColor(lab, rgb, cv.COLOR_Lab2RGB, 0);
                cv.cvtColor(rgb, dst, cv.COLOR_RGB2RGBA, 0);
                
                // Cleanup
                rgb.delete(); lab.delete(); labPlanes.delete(); L.delete(); L_clahe.delete(); clahe.delete();
                
                if (currentMode === 'ink') {
                   // Custom post-process to blow out the light background for ink saving
                   let dstData = dst.data;
                   for (let i = 0; i < dstData.length; i += 4) {
                       let avg = (dstData[i] + dstData[i+1] + dstData[i+2]) / 3;
                       if (avg > 180) {
                           dstData[i] = dstData[i+1] = dstData[i+2] = 255;
                       }
                   }
                }
            } else if (currentMode === 'bw' || currentMode === 'gray') {
                let gray = new cv.Mat();
                cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
                
                // Calculate average brightness
                let mean = cv.mean(gray);
                // Dynamically adjust clip limit based on brightness (darker image = higher clip limit needed)
                let clipLimit = mean[0] < 128 ? 4.0 : 2.5; 
                
                let clahe = new cv.CLAHE(clipLimit, new cv.Size(8, 8));
                let enhancedGray = new cv.Mat();
                clahe.apply(gray, enhancedGray);
                
                if (currentMode === 'bw') {
                    // Adaptive threshold for clean black and white document scan
                    cv.adaptiveThreshold(enhancedGray, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 21, 10);
                } else {
                    cv.cvtColor(enhancedGray, dst, cv.COLOR_GRAY2RGBA, 0);
                }
                
                gray.delete(); clahe.delete(); enhancedGray.delete();
            }
            
            cv.imshow(canvas, dst);
            src.delete(); dst.delete();
            resolve(canvas.toDataURL('image/jpeg', 0.95));
            return;
         } catch (e) {
            console.error("OpenCV CLAHE failed, falling back", e);
         }
      }
      
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i+1];
        let b = data[i+2];
        let gray = (r * 0.299 + g * 0.587 + b * 0.114);
        
        if (currentMode === 'bw') {
          gray = ((gray - 128) * 2.0) + 128;
          gray = gray > 140 ? 255 : 0; 
          data[i] = data[i+1] = data[i+2] = gray;
        } else if (currentMode === 'gray') {
          gray = ((gray - 128) * 1.5) + 128;
          data[i] = data[i+1] = data[i+2] = Math.max(0, Math.min(255, gray));
        } else if (currentMode === 'colour' || currentMode === 'ink') {
           data[i] = Math.max(0, Math.min(255, ((r - 128) * 1.2) + 128));
           data[i+1] = Math.max(0, Math.min(255, ((g - 128) * 1.2) + 128));
           data[i+2] = Math.max(0, Math.min(255, ((b - 128) * 1.2) + 128));
        }
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 1.0));
    });
  }

  function renderList() {
    if (files.length === 0) {
      emptyState.classList.remove('hidden');
      list.classList.add('hidden');
      actionBtn.classList.add('hidden');
      return;
    }
    
    emptyState.classList.add('hidden');
    list.classList.remove('hidden');
    actionBtn.classList.remove('hidden');
    
    list.innerHTML = '';
    
    files.forEach((file, index) => {
      const li = document.createElement('li');
      li.className = 'relative group bg-slate-50 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 aspect-[3/4] h-48 flex-shrink-0 snap-center flex flex-col cursor-move';
      
      const imgContainer = document.createElement('div');
      imgContainer.className = 'flex-1 bg-slate-200 dark:bg-slate-900 overflow-hidden relative';
      
      const img = document.createElement('img');
      img.className = 'w-full h-full object-cover';
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        const tempImg = new Image();
        tempImg.onload = async () => {
           img.src = await applyFilter(tempImg, mode);
        };
        tempImg.src = e.target.result;
      };
      reader.readAsDataURL(file);
      
      const removeBtn = document.createElement('button');
      removeBtn.className = 'absolute top-2 right-2 bg-white/90 text-red-500 p-1.5 rounded-lg shadow-sm opacity-80 sm:opacity-0 group-hover:opacity-100 transition hover:bg-red-50';
      removeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
      removeBtn.onclick = (e) => {
        e.stopPropagation();
        files.splice(index, 1);
        renderList();
      };
      
      const pageNum = document.createElement('div');
      pageNum.className = 'absolute bottom-2 right-2 bg-slate-900/70 text-white text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-sm pointer-events-none';
      pageNum.textContent = `Page ${index + 1}`;
      
      const controlsDiv = document.createElement('div');
      controlsDiv.className = 'absolute inset-0 bg-slate-900/40 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 backdrop-blur-[1px]';
      
      const shiftButtons = document.createElement('div');
      shiftButtons.className = 'flex gap-2';
      
      const leftBtn = document.createElement('button');
      leftBtn.className = 'bg-white/90 text-slate-700 p-2 rounded-lg hover:text-teal-600 hover:bg-white shadow-sm';
      leftBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>';
      leftBtn.onclick = (e) => {
        e.stopPropagation();
        if (index > 0) {
          const temp = files[index - 1];
          files[index - 1] = files[index];
          files[index] = temp;
          renderList();
        }
      };
      
      const rightBtn = document.createElement('button');
      rightBtn.className = 'bg-white/90 text-slate-700 p-2 rounded-lg hover:text-teal-600 hover:bg-white shadow-sm';
      rightBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';
      rightBtn.onclick = (e) => {
        e.stopPropagation();
        if (index < files.length - 1) {
          const temp = files[index + 1];
          files[index + 1] = files[index];
          files[index] = temp;
          renderList();
        }
      };
      
      if (index > 0) shiftButtons.appendChild(leftBtn);
      if (index < files.length - 1) shiftButtons.appendChild(rightBtn);
      
      controlsDiv.appendChild(shiftButtons);

      imgContainer.appendChild(img);
      imgContainer.appendChild(controlsDiv);
      imgContainer.appendChild(removeBtn);
      imgContainer.appendChild(pageNum);
      
      li.appendChild(imgContainer);
      
      // Basic drag and drop
      li.draggable = true;
      li.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', index); });
      li.addEventListener('dragover', (e) => { e.preventDefault(); li.classList.add('border-teal-500', 'border-2'); });
      li.addEventListener('dragleave', () => { li.classList.remove('border-teal-500', 'border-2'); });
      li.addEventListener('drop', (e) => {
        e.preventDefault();
        li.classList.remove('border-teal-500', 'border-2');
        const draggedIdx = parseInt(e.dataTransfer.getData('text/plain'));
        if (draggedIdx !== index) {
          const [draggedFile] = files.splice(draggedIdx, 1);
          files.splice(index, 0, draggedFile);
          renderList();
        }
      });
      
      list.appendChild(li);
    });
  }

  actionBtn.addEventListener('click', async () => {
    if (files.length === 0) return;
    
    utils.showLoader('Generating PDF...', 'text-teal-600');
    try {
      const pdfDoc = await PDFLib.PDFDocument.create();
      
      for (const file of files) {
        const dataUrl = await new Promise((resolve) => {
           const reader = new FileReader();
           reader.onload = async (e) => {
             const tempImg = new Image();
             tempImg.onload = async () => resolve(await applyFilter(tempImg, mode));
             tempImg.src = e.target.result;
           };
           reader.readAsDataURL(file);
        });
        
        let img;
        if (dataUrl.includes('image/png')) {
          img = await pdfDoc.embedPng(dataUrl);
        } else {
          img = await pdfDoc.embedJpg(dataUrl);
        }
        
        let dims = [img.width, img.height];
        if (scanSettings.pageSize === 'a4') dims = [595.28, 841.89];
        if (scanSettings.pageSize === 'letter') dims = [612, 792];
        
        // If the image is landscape and we are using standard page size, rotate dimensions
        if (img.width > img.height && scanSettings.pageSize !== 'fit') {
            dims = [dims[1], dims[0]];
        }
        
        const page = pdfDoc.addPage(dims);
        
        let drawW = dims[0];
        let drawH = dims[1];
        
        if (scanSettings.pageSize === 'fit') {
            drawW = img.width; 
            drawH = img.height;
        } else {
            const imgRatio = img.width / img.height;
            const pageRatio = dims[0] / dims[1];
            if (imgRatio > pageRatio) {
                drawW = dims[0];
                drawH = dims[0] / imgRatio;
            } else {
                drawH = dims[1];
                drawW = dims[1] * imgRatio;
            }
        }
        
        const x = (dims[0] - drawW) / 2;
        const y = (dims[1] - drawH) / 2;
        
        page.drawImage(img, { x, y, width: drawW, height: drawH });
      }
      
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      utils.downloadBlob(blob, `scanned_document_${Date.now()}.pdf`);
      
      utils.showToast('Success', 'PDF generated successfully!');
      files = [];
      renderList();
    } catch (err) {
      console.error(err);
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
      
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      utils.downloadBlob(blob, `Searchable_Document_${Date.now()}.pdf`);
      utils.showToast('Success', 'Searchable PDF generated!');
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
      utils.downloadBlob(blob, lastCompressedFilename);

      if (compressMode === 'target') {
        const targetBytes = getTargetBytes();
        if (newSize > targetBytes) {
          utils.showToast('Minimum Reached', `Smallest achievable size for ${totalPages} pages is ${utils.formatBytes(newSize)}.`, 'info');
        } else {
          utils.showToast('Success', `Compressed from ${utils.formatBytes(origSize)} to ${utils.formatBytes(newSize)}!`);
        }
      } else {
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

  downloadAgainBtn.addEventListener('click', () => {
    if (lastCompressedBlob) {
      utils.downloadBlob(lastCompressedBlob, lastCompressedFilename || 'compressed.pdf');
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
      metaTheme.setAttribute('content', isDark ? '#0f172a' : '#4338ca');
    }
    if (persist) {
      try {
        localStorage.setItem('pdfBondhuTheme', isDark ? 'dark' : 'light');
      } catch {}
    }
  }

  // Sync UI state with already-applied <html class="dark"> from head bootstrap
  applyTheme(document.documentElement.classList.contains('dark'), false);

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const nextDark = !document.documentElement.classList.contains('dark');
      applyTheme(nextDark, true);
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

      const bytes = await outDoc.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const baseName = currentFile.name.replace(/\.pdf$/i, '');
      utils.downloadBlob(blob, `${baseName}_organized.pdf`);
      utils.showToast('Success', `Saved organized PDF (${pagesState.length} pages).`);
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

      const outBytes = await pdfDoc.save();
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      const baseName = currentFile.name.replace(/\.pdf$/i, '');
      utils.downloadBlob(blob, `${baseName}_watermarked.pdf`);
      utils.showToast('Success', 'Watermark & page numbers applied cleanly!');
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
