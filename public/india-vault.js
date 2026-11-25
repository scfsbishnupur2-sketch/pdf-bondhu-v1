/**
 * PDF Bondhu 2.0 - Core Shell, Smart Search, Personal Document Center (IndexedDB + AES-GCM + PIN/Biometric),
 * India Essentials, Recent Activity, Favourites & Premium Settings Controller.
 */
(function (global) {
  const TOOL_CATALOG = [
    // PDF Studio
    { id: 'pdfReaderTool', cat: 'pdf', name: 'Ad-Free PDF Reader', desc: 'Open & read any phone PDF fast with zero ads, night mode & search', popular: true, keywords: 'read pdf viewer open pdf reader ad free night mode sepia search book' },
    { id: 'pdfScanner', cat: 'pdf', name: 'AI Document Scanner', desc: 'Auto 4-corner crop, Magic Color & instant PDF', popular: true, keywords: 'scan document camera adobe auto crop photo to pdf' },
    { id: 'pdfCompress', cat: 'pdf', name: 'Compress PDF', desc: 'Shrink PDF to exact KB or MB size locally', popular: true, keywords: 'compress pdf reduce pdf size shrink kb mb small' },
    { id: 'pdfMerge', cat: 'pdf', name: 'Merge PDF', desc: 'Combine two or more PDFs into one file', popular: true, keywords: 'merge pdf merge two pdfs combine join pdf' },
    { id: 'pdfSplit', cat: 'pdf', name: 'Split & Extract PDF', desc: 'Extract specific pages or page ranges cleanly', popular: false, keywords: 'split pdf extract pages cut remove pages' },
    { id: 'pdfEdit', cat: 'pdf', name: 'Edit PDF', desc: 'Add text, whiteout, highlight, draw & insert images', popular: true, keywords: 'edit pdf write text whiteout highlight draw annotate' },
    { id: 'pdfOrganize', cat: 'pdf', name: 'Rotate & Organize PDF', desc: 'Reorder, rotate or delete PDF pages visually', popular: false, keywords: 'rotate pdf organize reorder pages delete flip' },
    { id: 'pdfWatermark', cat: 'pdf', name: 'Watermark & Page Numbers', desc: 'Stamp custom watermarks & page numbering', popular: false, keywords: 'watermark stamp page numbers footer header pdf' },
    { id: 'pdfSign', cat: 'pdf', name: 'PDF E-Signature', desc: 'Draw or upload signature & attest PDF pages', popular: false, keywords: 'sign pdf e-signature attest draw signature' },
    { id: 'pdfSigVerify', cat: 'pdf', name: 'Verify Digital Signature', desc: 'Inspect e-Aadhaar, PAN & Govt PDF digital signs', popular: true, keywords: 'verify digital signature aadhaar pan certificate check' },
    { id: 'pdfSecurityTool', cat: 'pdf', name: 'Protect / Unlock PDF', desc: 'Add 128-bit password or unlock authorized PDFs', popular: false, keywords: 'password protect lock unlock decrypt remove password pdf' },
    { id: 'pdfToImgTool', cat: 'pdf', name: 'PDF to Images', desc: 'Export PDF pages to HD JPG/PNG or bulk ZIP', popular: false, keywords: 'pdf to image jpg png convert pages export zip' },
    { id: 'pdfCompareTool', cat: 'pdf', name: 'Compare Two PDFs', desc: 'Side-by-side visual preview & text diff checker', popular: false, keywords: 'compare pdf diff differences check two pdfs' },
    { id: 'pdfRepair', cat: 'pdf', name: 'Repair Corrupted PDF', desc: 'Fix damaged XRef tables & rescue broken pages', popular: false, keywords: 'repair pdf fix corrupted broken damaged recover' },
    { id: 'textToPdf', cat: 'pdf', name: 'Text & Notes to PDF', desc: 'Turn letters, applications or notes into A4 PDF', popular: false, keywords: 'text to pdf notes letter application write' },
    { id: 'pdfMetadataTool', cat: 'pdf', name: 'PDF Metadata Viewer & Editor', desc: 'Edit Title, Author, Subject & Creation Date', popular: false, keywords: 'metadata viewer editor author title date properties' },

    // Image Studio
    { id: 'passportMaker', cat: 'image', name: 'Passport Photo Maker', desc: '35×45mm India/PAN/Visa photo, BG color & A4 sheet', popular: true, keywords: 'make passport photo size maker sheet a4 4x6 background' },
    { id: 'imageCompress', cat: 'image', name: 'Image Size Reducer (KB)', desc: 'Shrink photo to exact 20KB, 50KB, 100KB or custom', popular: true, keywords: 'reduce image size kb compress photo shrink' },
    { id: 'imgToPdf', cat: 'image', name: 'JPG / Images to PDF', desc: 'Convert JPG, PNG & WebP photos to clean PDF', popular: true, keywords: 'convert image to pdf jpg to pdf photos album' },
    { id: 'imgResize', cat: 'image', name: 'Signature & ID Photo Resizer', desc: 'Exact px & KB presets for PAN, SSC, UPSC & Govt forms', popular: false, keywords: 'signature resizer id card photo resizer exam form' },
    { id: 'idCardMaker', cat: 'image', name: 'ID Card 2-in-1 A4 Maker', desc: 'Place Front & Back of Aadhaar/PAN/Voter on 1 A4 PDF', popular: false, keywords: 'id card front back aadhaar pan voter a4 pdf' },
    { id: 'imgCropTool', cat: 'image', name: 'Image Cropper', desc: 'Crop, rotate & flip images with aspect ratios', popular: false, keywords: 'image cropper crop photo cut aspect ratio rotate' },
    { id: 'imgConvert', cat: 'image', name: 'Image Format Converter', desc: 'Convert between JPG, PNG & WebP offline', popular: false, keywords: 'image converter format jpg png webp' },
    { id: 'ocrScanner', cat: 'image', name: 'OCR Text Extractor', desc: 'Extract English & Bengali text from images/PDFs', popular: false, keywords: 'ocr text extractor bengali english scan text' },

    // Office Studio
    { id: 'excelMerge', cat: 'office', name: 'Excel Merger', desc: 'Combine multiple Excel & CSV spreadsheets cleanly', popular: false, keywords: 'excel merger merge xlsx combine spreadsheets' },
    { id: 'excelCleaner', cat: 'office', name: 'Excel Cleaner', desc: 'Remove duplicate rows from spreadsheets automatically', popular: false, keywords: 'excel cleaner remove duplicates clean rows' },
    { id: 'pdfToExcel', cat: 'office', name: 'PDF to Excel', desc: 'Extract PDF tables & lines into Excel (.xlsx)', popular: false, keywords: 'pdf to excel table extract spreadsheet' },
    { id: 'csvViewerTool', cat: 'office', name: 'CSV & Spreadsheet Viewer', desc: 'Preview tables & convert CSV <-> Excel (.xlsx)', popular: false, keywords: 'csv viewer spreadsheet preview csv to excel' },
    { id: 'zipStudioTool', cat: 'office', name: 'ZIP Creator & Extractor', desc: 'Compress multiple files to ZIP or extract archives', popular: false, keywords: 'zip creator extractor archive compress unzip' },

    // Daily Utilities
    { id: 'dailyUtilitiesHub', sub: 'dailyPanelCalc', cat: 'daily', name: 'Calculators (GST, EMI, Scientific)', desc: 'Standard, Scientific, GST, EMI, % & Age calculators', popular: true, keywords: 'calculate gst calculate emi calculator scientific age percentage' },
    { id: 'dailyUtilitiesHub', sub: 'dailyPanelConv', cat: 'daily', name: 'Unit & Electricity Converters', desc: 'Length, Weight, Temp, Area, Data & Electricity Bill', popular: false, keywords: 'unit converter length weight bigha katha electricity bill' },
    { id: 'dailyUtilitiesHub', sub: 'dailyPanelProd', cat: 'daily', name: 'Notes, To-Do, Expenses & Timer', desc: 'Notes, Shopping List, Daily Expenses, Calendar, Reminders', popular: false, keywords: 'notes todo shopping list expense tracker calendar stopwatch timer reminders' },
    { id: 'dailyUtilitiesHub', sub: 'dailyPanelSmart', cat: 'daily', name: 'QR Scanner, QR Generator & Speed Test', desc: 'Scan QR/Barcode, make Wi-Fi QR & test internet speed', popular: true, keywords: 'create qr code qr scanner wifi qr barcode internet speed test' },

    // India Essentials & Vault
    { id: 'indiaEssentials', cat: 'india', name: 'India Essentials', desc: 'Official Govt Portals, PAN/Aadhaar/Passport checklists', popular: false, keywords: 'india government portal pan aadhaar voter passport checklist scholarship' },
    { id: 'documentCenter', cat: 'vault', name: 'Personal Document Center', desc: 'Folders, PIN Lock, Biometric & AES-GCM Encrypted Vault', popular: false, keywords: 'my files document center vault folders pin biometric encrypt' }
  ];

  const FAV_KEY = 'pdfBondhuFavs_v2';
  const RECENT_TOOLS_KEY = 'pdfBondhuRecentTools_v2';
  const RECENT_DOCS_KEY = 'pdfBondhuRecentDocs_v2';
  const RECENT_SEARCH_KEY = 'pdfBondhuRecentSearch_v2';
  const PROFILE_KEY = 'pdfBondhuProfile_v2';
  const THEME_MODE_KEY = 'pdfBondhuThemeMode_v2'; // 'light' | 'dark' | 'system'

  let activeToolId = 'homeDashboard';

  function loadJson(key, fb) {
    try { return JSON.parse(localStorage.getItem(key) || '') || fb; } catch { return fb; }
  }
  function saveJson(key, v) {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
  }
  function escHtml(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ========================================================================
     1. Navigation Engine (5 Bottom Tabs + Desktop Rail + Tool Router)
     ======================================================================== */
  function openSection(sectionId, options = {}) {
    const sections = document.querySelectorAll('.tab-content');
    const target = document.getElementById(sectionId);
    if (!target) return;

    sections.forEach((sec) => {
      sec.classList.add('hidden');
      sec.classList.remove('flex');
    });
    target.classList.remove('hidden');
    target.classList.add('flex', 'flex-col');
    activeToolId = sectionId;

    // Show/hide top tool back bar when inside an individual tool screen
    const topFive = ['homeDashboard', 'allToolsHub', 'documentCenter', 'recentActivityTab', 'profileSettingsTab'];
    const isTopTab = topFive.includes(sectionId);
    const backBar = document.getElementById('toolContextBackBar');
    const backTitle = document.getElementById('toolContextTitle');
    if (backBar) backBar.classList.toggle('hidden', isTopTab);
    if (!isTopTab && backTitle) {
      const meta = TOOL_CATALOG.find((t) => t.id === sectionId);
      backTitle.textContent = meta ? meta.name : 'PDF Bondhu';
    }

    // Highlight active bottom nav & desktop rail button
    const activeNavKey = isTopTab ? sectionId : 'allToolsHub';
    document.querySelectorAll('.pb-nav-btn').forEach((btn) => {
      const match = btn.getAttribute('data-nav-target') === activeNavKey;
      btn.setAttribute('aria-current', match ? 'page' : 'false');
      btn.classList.toggle('pb-nav-active', match);
    });

    // Record tool usage if it's a functional tool
    if (!isTopTab || sectionId === 'documentCenter') {
      recordRecentTool(sectionId, options.sub || '');
    }

    if (options.sub && typeof global.openDailyUtilitySubTab === 'function' && sectionId === 'dailyUtilitiesHub') {
      // Trigger subtab directly without recursion
      const subBtn = document.querySelector(`.daily-subtab-btn[data-subtab="${options.sub}"]`);
      if (subBtn) subBtn.click();
    }

    if (sectionId === 'recentActivityTab') renderRecentActivityTab();
    if (sectionId === 'homeDashboard') renderHomeDynamicWidgets();
    if (sectionId === 'allToolsHub') renderAllToolsGrid();
    if (sectionId === 'documentCenter') refreshVaultView();
    if (sectionId === 'profileSettingsTab') refreshStorageOverview();

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  global.openPdfBondhuTool = openSection;

  // Override legacy data-tab button routing smoothly so all old onclick handlers continue working
  function wireNavigation() {
    document.querySelectorAll('.pb-nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        openSection(btn.getAttribute('data-nav-target'));
      });
    });

    const backBtn = document.getElementById('toolContextBackBtn');
    if (backBtn) {
      backBtn.addEventListener('click', () => openSection('homeDashboard'));
    }

    // Support Android hardware back press smoothly
    const prevBack = global.handleAndroidBackPress;
    global.handleAndroidBackPress = () => {
      const previewModal = document.getElementById('vaultPreviewModal');
      if (previewModal && !previewModal.classList.contains('hidden')) {
        previewModal.classList.add('hidden');
        previewModal.classList.remove('flex');
        return true;
      }
      const infoModal = document.getElementById('settingsInfoModal');
      if (infoModal && !infoModal.classList.contains('hidden')) {
        infoModal.classList.add('hidden');
        infoModal.classList.remove('flex');
        return true;
      }
      const fbModal = document.getElementById('feedbackModal');
      if (fbModal && !fbModal.classList.contains('hidden')) {
        fbModal.classList.add('hidden');
        fbModal.classList.remove('flex');
        return true;
      }
      if (activeToolId !== 'homeDashboard') {
        openSection('homeDashboard');
        return true;
      }
      return typeof prevBack === 'function' ? prevBack() : false;
    };
  }

  /* ========================================================================
     2. Favourites, Recently Used Tools & Auto-Tracked Recent Documents
     ======================================================================== */
  function getFavourites() {
    return loadJson(FAV_KEY, ['pdfReaderTool', 'pdfScanner', 'pdfCompress', 'passportMaker', 'imageCompress']);
  }

  function toggleFavourite(toolKey) {
    const favs = getFavourites();
    const idx = favs.indexOf(toolKey);
    if (idx >= 0) favs.splice(idx, 1);
    else favs.unshift(toolKey);
    saveJson(FAV_KEY, favs.slice(0, 12));
    renderHomeDynamicWidgets();
    renderAllToolsGrid();
  }

  function recordRecentTool(toolId, sub = '') {
    const key = sub ? `${toolId}:${sub}` : toolId;
    const arr = loadJson(RECENT_TOOLS_KEY, []).filter((x) => x !== key);
    arr.unshift(key);
    saveJson(RECENT_TOOLS_KEY, arr.slice(0, 10));
  }

  function findToolByKey(key) {
    const [id, sub] = String(key).split(':');
    return TOOL_CATALOG.find((t) => t.id === id && (!sub || t.sub === sub)) || TOOL_CATALOG.find((t) => t.id === id);
  }

  // Hook into utils.downloadBlob to automatically record every processed document!
  function hookDownloadTracker() {
    if (!global.utils || typeof global.utils.downloadBlob !== 'function' || global.utils._pb2Hooked) return;
    const origDownload = global.utils.downloadBlob.bind(global.utils);
    global.utils.downloadBlob = function (blob, filename) {
      try {
        const docs = loadJson(RECENT_DOCS_KEY, []);
        docs.unshift({
          name: filename || 'Document',
          size: blob ? blob.size : 0,
          type: (blob && blob.type) || 'application/octet-stream',
          toolId: activeToolId,
          createdAt: new Date().toISOString()
        });
        saveJson(RECENT_DOCS_KEY, docs.slice(0, 25));
      } catch {}
      return origDownload(blob, filename);
    };
    global.utils._pb2Hooked = true;
  }

  const TOOL_VISUALS = {
    pdfReaderTool:    { bg: 'from-emerald-500 to-teal-600',   svg: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>' },
    pdfScanner:       { bg: 'from-cyan-500 to-teal-500',      svg: '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect x="7" y="6" width="10" height="12" rx="1.5"/>' },
    pdfCompress:      { bg: 'from-rose-500 to-pink-500',      svg: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 11v6"/><path d="m9 14 3 3 3-3"/>' },
    pdfMerge:         { bg: 'from-blue-600 to-violet-600',    svg: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M9 15h6"/>' },
    pdfSplit:         { bg: 'from-orange-500 to-amber-500',   svg: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/>' },
    pdfEdit:          { bg: 'from-indigo-600 to-purple-600',  svg: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>' },
    pdfOrganize:      { bg: 'from-emerald-500 to-green-500',  svg: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>' },
    pdfWatermark:     { bg: 'from-violet-600 to-fuchsia-600', svg: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>' },
    pdfSign:          { bg: 'from-sky-500 to-indigo-600',     svg: '<path d="M20 19H4"/><path d="M4 15c2-4 5-6 7-3s3 1 5-4 4-4 4-4"/>' },
    pdfSigVerify:     { bg: 'from-emerald-600 to-teal-500',   svg: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>' },
    pdfSecurityTool:  { bg: 'from-purple-600 to-indigo-700',  svg: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>' },
    pdfToImgTool:     { bg: 'from-pink-500 to-rose-500',      svg: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>' },
    pdfCompareTool:   { bg: 'from-blue-500 to-cyan-500',      svg: '<rect x="3" y="4" width="7" height="16" rx="1.5"/><rect x="14" y="4" width="7" height="16" rx="1.5"/>' },
    pdfRepair:        { bg: 'from-amber-500 to-orange-600',   svg: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>' },
    textToPdf:        { bg: 'from-indigo-500 to-blue-600',    svg: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/>' },
    pdfMetadataTool:  { bg: 'from-fuchsia-500 to-purple-600', svg: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>' },
    passportMaker:    { bg: 'from-sky-500 to-blue-600',       svg: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M7 21v-2a5 5 0 0 1 10 0v2"/>' },
    imageCompress:    { bg: 'from-green-500 to-emerald-500',  svg: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>' },
    imgToPdf:         { bg: 'from-red-500 to-rose-500',       svg: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 12h8"/><path d="M12 8v8"/>' },
    imgResize:        { bg: 'from-teal-500 to-cyan-600',      svg: '<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>' },
    idCardMaker:      { bg: 'from-blue-600 to-indigo-600',    svg: '<rect width="20" height="14" x="2" y="5" rx="2"/><circle cx="8" cy="12" r="2"/><line x1="13" y1="10" x2="18" y2="10"/><line x1="13" y1="14" x2="17" y2="14"/>' },
    imgCropTool:      { bg: 'from-amber-500 to-orange-500',   svg: '<path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/>' },
    imgConvert:       { bg: 'from-orange-500 to-rose-500',    svg: '<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/>' },
    ocrScanner:       { bg: 'from-indigo-500 to-violet-600',  svg: '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M8 12h8"/><path d="M8 9h5"/><path d="M8 15h6"/>' },
    excelMerge:       { bg: 'from-emerald-600 to-green-600',  svg: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/>' },
    excelCleaner:     { bg: 'from-lime-500 to-emerald-600',   svg: '<path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/>' },
    pdfToExcel:       { bg: 'from-green-600 to-emerald-700',  svg: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="m9 9 6 6"/><path d="m15 9-6 6"/>' },
    csvViewerTool:    { bg: 'from-teal-600 to-emerald-500',   svg: '<path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/>' },
    zipStudioTool:    { bg: 'from-violet-600 to-indigo-600',  svg: '<path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/>' },
    dailyPanelCalc:   { bg: 'from-amber-500 to-orange-500',   svg: '<rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><path d="M8 11h.01"/><path d="M12 11h.01"/><path d="M16 11h.01"/><path d="M8 15h.01"/><path d="M12 15h.01"/><path d="M16 15h.01"/>' },
    dailyPanelConv:   { bg: 'from-cyan-500 to-blue-600',      svg: '<path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/>' },
    dailyPanelProd:   { bg: 'from-pink-500 to-violet-600',    svg: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>' },
    dailyPanelSmart:  { bg: 'from-emerald-500 to-cyan-500',   svg: '<rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/>' },
    indiaEssentials:  { bg: 'from-orange-500 via-amber-500 to-emerald-600', svg: '<path d="M3 22h18"/><path d="M6 18v-7"/><path d="M10 18v-7"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="m12 2 9 5H3l9-5Z"/>' },
    documentCenter:   { bg: 'from-teal-500 to-emerald-600',   svg: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>' }
  };

  function getToolVisual(tool) {
    return TOOL_VISUALS[tool.sub || tool.id] || TOOL_VISUALS[tool.id] || {
      bg: 'from-blue-600 to-violet-600',
      svg: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>'
    };
  }

  function renderToolMiniCard(tool, showStar = true) {
    const key = tool.sub ? `${tool.id}:${tool.sub}` : tool.id;
    const isFav = getFavourites().includes(key);
    const vis = getToolVisual(tool);
    return `
      <div class="group relative bg-white dark:bg-[#1A2138] border border-indigo-100/90 dark:border-slate-800 rounded-2xl p-3.5 hover:border-indigo-400 dark:hover:border-violet-500 hover:-translate-y-0.5 transition-all flex items-center gap-3 shadow-[0_4px_16px_rgba(49,70,158,0.06)]">
        <button type="button" data-open-tool="${tool.id}" data-open-sub="${tool.sub || ''}" class="text-left flex items-center gap-3 flex-1 min-w-0 focus:outline-none">
          <span class="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br ${vis.bg} text-white shadow-md shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${vis.svg}</svg>
          </span>
          <div class="min-w-0 flex-1">
            <h4 class="text-sm font-bold text-[#151B2B] dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors truncate">${escHtml(tool.name)}</h4>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">${escHtml(tool.desc)}</p>
          </div>
        </button>
        ${showStar ? `<button type="button" data-fav-key="${key}" aria-label="Toggle Favourite" class="pb-fav-btn p-1.5 rounded-lg text-slate-300 hover:text-amber-500 transition min-h-[34px] min-w-[34px] flex items-center justify-center shrink-0 ${isFav ? 'text-amber-500' : ''}">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2.2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        </button>` : `<span class="text-slate-300 dark:text-slate-600 font-bold text-sm pr-1">›</span>`}
      </div>
    `;
  }

  function bindToolCards(container) {
    if (!container) return;
    container.querySelectorAll('[data-open-tool]').forEach((btn) => {
      btn.addEventListener('click', () => {
        openSection(btn.getAttribute('data-open-tool'), { sub: btn.getAttribute('data-open-sub') || '' });
      });
    });
    container.querySelectorAll('.pb-fav-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavourite(btn.getAttribute('data-fav-key'));
      });
    });
  }

  function renderHomeDynamicWidgets() {
    // 1. Favourite Tools Strip
    const favWrap = document.getElementById('homeFavToolsRow');
    if (favWrap) {
      const favTools = getFavourites().map(findToolByKey).filter(Boolean).slice(0, 6);
      favWrap.innerHTML = favTools
        .map((t) => {
          const vis = getToolVisual(t);
          return `
          <button type="button" data-open-tool="${t.id}" data-open-sub="${t.sub || ''}" class="pl-2 pr-3.5 py-1.5 rounded-xl bg-white dark:bg-[#1A2138] border border-indigo-100 dark:border-slate-800 hover:border-indigo-400 text-xs font-bold text-[#151B2B] dark:text-slate-100 whitespace-nowrap shrink-0 transition min-h-[42px] flex items-center gap-2 shadow-[0_3px_12px_rgba(49,70,158,0.06)]">
            <span class="w-7 h-7 rounded-lg bg-gradient-to-br ${vis.bg} text-white flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3">${vis.svg}</svg>
            </span>
            ${escHtml(t.name)}
          </button>`;
        })
        .join('');
      bindToolCards(favWrap);
    }

    // 2. Recently Used Tools Strip
    const recWrap = document.getElementById('homeRecentToolsRow');
    const recSec = document.getElementById('homeRecentToolsSection');
    if (recWrap && recSec) {
      const recTools = loadJson(RECENT_TOOLS_KEY, []).map(findToolByKey).filter(Boolean).slice(0, 6);
      recSec.classList.toggle('hidden', recTools.length === 0);
      recWrap.innerHTML = recTools
        .map((t) => {
          const vis = getToolVisual(t);
          return `
          <button type="button" data-open-tool="${t.id}" data-open-sub="${t.sub || ''}" class="pl-2 pr-3.5 py-1.5 rounded-xl bg-white dark:bg-[#1A2138] border border-indigo-100 dark:border-slate-800 hover:border-indigo-400 text-xs font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap shrink-0 transition min-h-[40px] flex items-center gap-2 shadow-[0_3px_12px_rgba(49,70,158,0.05)]">
            <span class="w-6 h-6 rounded-md bg-gradient-to-br ${vis.bg} text-white flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3">${vis.svg}</svg>
            </span>
            ${escHtml(t.name)}
          </button>`;
        })
        .join('');
      bindToolCards(recWrap);
    }

    // 3. Popular Tools Grid
    const popGrid = document.getElementById('homePopularToolsGrid');
    if (popGrid) {
      const popular = TOOL_CATALOG.filter((t) => t.popular).slice(0, 6);
      popGrid.innerHTML = popular.map((t) => renderToolMiniCard(t, true)).join('');
      bindToolCards(popGrid);
    }

    // 4. Recently Processed Documents (Home preview)
    const docsList = document.getElementById('homeRecentDocsList');
    if (docsList) {
      const docs = loadJson(RECENT_DOCS_KEY, []).slice(0, 4);
      if (!docs.length) {
        const emptyTxt = global.PDFBondhuI18n ? global.PDFBondhuI18n.t('recentDocsEmpty') : 'No processed documents yet.';
        docsList.innerHTML = `<div class="p-4 rounded-2xl bg-white dark:bg-[#1C2438] border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 text-center">${escHtml(emptyTxt)}</div>`;
      } else {
        docsList.innerHTML = docs
          .map(
            (d) => `
            <div class="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-[#1C2438] border border-slate-200 dark:border-slate-800">
              <div class="min-w-0">
                <div class="text-xs font-bold text-[#151B2B] dark:text-white truncate">${escHtml(d.name)}</div>
                <div class="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">${global.utils.formatBytes(d.size)} · ${new Date(d.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
              </div>
              <button type="button" data-open-tool="${d.toolId || 'homeDashboard'}" class="px-3 py-1.5 rounded-lg bg-[#293B80]/10 dark:bg-[#7666D8]/20 text-[#293B80] dark:text-[#c7beff] text-[11px] font-bold whitespace-nowrap min-h-[34px]">Repeat</button>
            </div>`
          )
          .join('');
        bindToolCards(docsList);
      }
    }
  }

  /* ========================================================================
     3. Universal Smart Search Engine ("What do you want to do today?")
     ======================================================================== */
  function initSmartSearch() {
    const input = document.getElementById('smartSearchInput');
    const panel = document.getElementById('smartSearchDropdown');
    const resultsEl = document.getElementById('smartSearchResults');
    const recentChips = document.getElementById('smartRecentSearches');
    const popularChips = document.querySelectorAll('.smart-popular-chip');

    if (!input || !panel || !resultsEl) return;

    function saveSearchTerm(q) {
      const clean = q.trim();
      if (clean.length < 2) return;
      const arr = loadJson(RECENT_SEARCH_KEY, []).filter((x) => x.toLowerCase() !== clean.toLowerCase());
      arr.unshift(clean);
      saveJson(RECENT_SEARCH_KEY, arr.slice(0, 6));
      renderRecentSearches();
    }

    function renderRecentSearches() {
      if (!recentChips) return;
      const arr = loadJson(RECENT_SEARCH_KEY, []);
      if (!arr.length) { recentChips.innerHTML = ''; return; }
      recentChips.innerHTML = arr
        .map((s) => `<button type="button" data-q="${escHtml(s)}" class="smart-rec-chip px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-[#293B80] hover:text-white transition">${escHtml(s)}</button>`)
        .join('');
      recentChips.querySelectorAll('.smart-rec-chip').forEach((b) => {
        b.addEventListener('click', () => {
          input.value = b.getAttribute('data-q');
          runSearch(input.value);
        });
      });
    }

    function runSearch(rawQuery) {
      const q = rawQuery.trim().toLowerCase();
      if (!q) {
        panel.classList.add('hidden');
        return;
      }
      const tokens = q.split(/\s+/).filter(Boolean);
      const scored = TOOL_CATALOG.map((tool) => {
        const hay = `${tool.name} ${tool.desc} ${tool.keywords} ${tool.cat}`.toLowerCase();
        let score = 0;
        if (hay.includes(q)) score += 10;
        tokens.forEach((tok) => {
          if (hay.includes(tok)) score += 3;
        });
        return { tool, score };
      })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 7);

      panel.classList.remove('hidden');
      if (!scored.length) {
        const emptyMsg = global.PDFBondhuI18n ? global.PDFBondhuI18n.t('noSearchResults') : 'No matching tool found.';
        resultsEl.innerHTML = `<div class="p-4 text-xs text-slate-500 dark:text-slate-400 text-center">${escHtml(emptyMsg)}</div>`;
        return;
      }

      resultsEl.innerHTML = scored
        .map(
          ({ tool }) => `
          <button type="button" data-open-tool="${tool.id}" data-open-sub="${tool.sub || ''}" class="w-full text-left px-4 py-3 hover:bg-[#F7F8FC] dark:hover:bg-slate-800/80 flex items-center justify-between gap-3 border-b last:border-b-0 border-slate-100 dark:border-slate-800 transition">
            <div class="min-w-0">
              <div class="text-sm font-bold text-[#151B2B] dark:text-white truncate">${escHtml(tool.name)}</div>
              <div class="text-xs text-slate-500 dark:text-slate-400 truncate">${escHtml(tool.desc)}</div>
            </div>
            <span class="text-[11px] font-bold text-[#293B80] dark:text-[#a69bff] shrink-0 uppercase">${tool.cat}</span>
          </button>`
        )
        .join('');

      resultsEl.querySelectorAll('[data-open-tool]').forEach((btn) => {
        btn.addEventListener('click', () => {
          saveSearchTerm(input.value);
          panel.classList.add('hidden');
          openSection(btn.getAttribute('data-open-tool'), { sub: btn.getAttribute('data-open-sub') || '' });
        });
      });
    }

    input.addEventListener('input', () => runSearch(input.value));
    input.addEventListener('focus', () => { if (input.value.trim()) runSearch(input.value); });
    document.addEventListener('click', (e) => {
      if (!panel.contains(e.target) && e.target !== input) panel.classList.add('hidden');
    });

    popularChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        input.value = chip.getAttribute('data-q') || chip.textContent;
        input.focus();
        runSearch(input.value);
      });
    });

    renderRecentSearches();
  }

  /* ========================================================================
     4. All Tools Hub & Recent Activity Tab
     ======================================================================== */
  let currentAllToolsCat = 'all';

  const ALL_TOOLS_GROUPS = [
    { key: 'pdf', label: 'PDF Studio', accent: 'from-rose-500 to-indigo-600' },
    { key: 'image', label: 'Image Studio', accent: 'from-sky-500 to-emerald-500' },
    { key: 'office', label: 'Office Studio', accent: 'from-emerald-500 to-teal-600' },
    { key: 'daily', label: 'Daily Utilities', accent: 'from-amber-500 to-orange-500' },
    { key: 'india', label: 'India Essentials', accent: 'from-orange-500 to-emerald-600' },
    { key: 'vault', label: 'Personal Document Vault', accent: 'from-teal-500 to-indigo-600' }
  ];

  function renderAllToolsGrid(filterCat = currentAllToolsCat) {
    currentAllToolsCat = filterCat;
    const grid = document.getElementById('allToolsHubGrid');
    const searchVal = (document.getElementById('allToolsSearchInput')?.value || '').trim().toLowerCase();
    if (!grid) return;

    document.querySelectorAll('.alltools-cat-btn').forEach((btn) => {
      const act = btn.getAttribute('data-cat') === filterCat;
      btn.className = act
        ? 'alltools-cat-btn px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-sm whitespace-nowrap min-h-[38px] transition'
        : 'alltools-cat-btn px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-[#151B2B] border border-indigo-100 dark:border-slate-700 hover:border-indigo-400 whitespace-nowrap min-h-[38px] transition';
    });

    const filtered = TOOL_CATALOG.filter((t) => {
      const catOk = filterCat === 'all' || t.cat === filterCat;
      const qOk = !searchVal || `${t.name} ${t.desc} ${t.keywords}`.toLowerCase().includes(searchVal);
      return catOk && qOk;
    });

    if (!filtered.length) {
      grid.innerHTML = '<div class="py-12 rounded-2xl bg-white dark:bg-[#1A2138] border border-indigo-100 dark:border-slate-800 text-center text-sm font-semibold text-slate-500">No tools match your search.</div>';
      return;
    }

    if (filterCat === 'all' && !searchVal) {
      grid.innerHTML = ALL_TOOLS_GROUPS.map((grp) => {
        const items = filtered.filter((t) => t.cat === grp.key);
        if (!items.length) return '';
        return `
          <div class="space-y-3">
            <div class="flex items-center justify-between px-1">
              <h3 class="flex items-center gap-2 text-sm sm:text-base font-extrabold text-[#151B2B] dark:text-white">
                <span class="w-1.5 h-5 rounded-full bg-gradient-to-b ${grp.accent}"></span>
                <span>${grp.label}</span>
              </h3>
              <span class="text-[11px] font-bold text-slate-400">${items.length} ${items.length === 1 ? 'tool' : 'tools'}</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              ${items.map((t) => renderToolMiniCard(t, true)).join('')}
            </div>
          </div>
        `;
      }).join('');
    } else {
      grid.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          ${filtered.map((t) => renderToolMiniCard(t, true)).join('')}
        </div>
      `;
    }
    bindToolCards(grid);
  }

  global.openAllToolsCategory = (cat) => {
    currentAllToolsCat = cat || 'all';
    openSection('allToolsHub');
    renderAllToolsGrid(currentAllToolsCat);
  };

  function renderRecentActivityTab() {
    const toolsWrap = document.getElementById('recentTabToolsList');
    const docsWrap = document.getElementById('recentTabDocsList');
    if (toolsWrap) {
      const rec = loadJson(RECENT_TOOLS_KEY, []).map(findToolByKey).filter(Boolean);
      toolsWrap.innerHTML = rec.length
        ? rec.map((t) => renderToolMiniCard(t, true)).join('')
        : '<div class="col-span-full p-6 rounded-2xl bg-white dark:bg-[#1C2438] border border-slate-200 dark:border-slate-800 text-xs text-slate-500 text-center">No recently used tools yet.</div>';
      bindToolCards(toolsWrap);
    }
    if (docsWrap) {
      const docs = loadJson(RECENT_DOCS_KEY, []);
      docsWrap.innerHTML = docs.length
        ? docs
            .map(
              (d) => `
              <div class="flex items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-[#1C2438] border border-slate-200 dark:border-slate-800">
                <div class="min-w-0">
                  <div class="text-sm font-bold text-[#151B2B] dark:text-white truncate">${escHtml(d.name)}</div>
                  <div class="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">${global.utils.formatBytes(d.size)} · ${new Date(d.createdAt).toLocaleString('en-IN')}</div>
                </div>
                <button type="button" data-open-tool="${d.toolId || 'homeDashboard'}" class="px-3.5 py-2 rounded-xl bg-[#293B80] text-white text-xs font-bold whitespace-nowrap min-h-[38px]">Open Tool</button>
              </div>`
            )
            .join('')
        : '<div class="p-6 rounded-2xl bg-white dark:bg-[#1C2438] border border-slate-200 dark:border-slate-800 text-xs text-slate-500 text-center">No processed documents recorded yet.</div>';
      bindToolCards(docsWrap);
    }
  }

  /* ========================================================================
     5. Personal Document Center (IndexedDB + Folders + AES-GCM + PIN/Biometric)
     ======================================================================== */
  const VAULT_DB_NAME = 'PDFBondhuVaultDB_v2';
  const VAULT_STORE = 'documents';
  const VAULT_FOLDERS_KEY = 'pdfBondhuVaultFolders_v2';
  const VAULT_PIN_HASH_KEY = 'pdfBondhuVaultPinHash_v2';

  let vaultUnlocked = false;
  let activeVaultKey = null; // CryptoKey when PIN is set
  let activeVaultFolder = 'All';

  function openVaultDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(VAULT_DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(VAULT_STORE)) {
          db.createObjectStore(VAULT_STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function vaultGetAll() {
    const db = await openVaultDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(VAULT_STORE, 'readonly');
      const req = tx.objectStore(VAULT_STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async function vaultPut(record) {
    const db = await openVaultDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(VAULT_STORE, 'readwrite');
      tx.objectStore(VAULT_STORE).put(record);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function vaultDelete(id) {
    const db = await openVaultDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(VAULT_STORE, 'readwrite');
      tx.objectStore(VAULT_STORE).delete(id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function sha256Hex(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async function deriveAesKey(pin) {
    const baseKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: new TextEncoder().encode('pdf-bondhu-vault-salt-v2'), iterations: 60000, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function encryptBuffer(arrayBuf, key) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, arrayBuf);
    return { encrypted: true, iv: Array.from(iv), data: enc };
  }

  async function decryptRecordToBlob(rec) {
    if (rec.encrypted && rec.iv && activeVaultKey) {
      const iv = new Uint8Array(rec.iv);
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, activeVaultKey, rec.data);
      return new Blob([plain], { type: rec.mimeType || 'application/octet-stream' });
    }
    return new Blob([rec.data], { type: rec.mimeType || 'application/octet-stream' });
  }

  function hasVaultPin() {
    try { return Boolean(localStorage.getItem(VAULT_PIN_HASH_KEY)); } catch { return false; }
  }

  async function refreshVaultView() {
    const lockGate = document.getElementById('vaultLockGate');
    const contentWrap = document.getElementById('vaultMainContent');
    const bioBtn = document.getElementById('vaultBiometricUnlockBtn');
    const pinStatus = document.getElementById('vaultPinStatusBadge');

    if (!lockGate || !contentWrap) return;

    const pinEnabled = hasVaultPin();
    if (pinStatus) {
      pinStatus.textContent = pinEnabled ? 'AES-GCM + PIN Protected' : 'Local Device Vault (Unlocked)';
    }

    if (pinEnabled && !vaultUnlocked) {
      lockGate.classList.remove('hidden');
      contentWrap.classList.add('hidden');
      const canBio = Boolean(global.AndroidBridge && global.AndroidBridge.isBiometricAvailable && global.AndroidBridge.isBiometricAvailable());
      if (bioBtn) bioBtn.classList.toggle('hidden', !canBio);
      return;
    }

    lockGate.classList.add('hidden');
    contentWrap.classList.remove('hidden');

    // Render folders
    const folders = loadJson(VAULT_FOLDERS_KEY, ['Personal', 'ID Cards', 'Bills & Receipts', 'Study & Office']);
    const folderBar = document.getElementById('vaultFoldersBar');
    if (folderBar) {
      const allFolders = ['All', 'Favourites', ...folders];
      folderBar.innerHTML = allFolders
        .map(
          (f) => `<button type="button" data-folder="${escHtml(f)}" class="vault-folder-btn px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap min-h-[36px] ${
            activeVaultFolder === f
              ? 'bg-[#293B80] text-white'
              : 'bg-white dark:bg-[#1C2438] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }">${escHtml(f)}</button>`
        )
        .join('');
      folderBar.querySelectorAll('.vault-folder-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          activeVaultFolder = btn.getAttribute('data-folder');
          refreshVaultView();
        });
      });
    }

    // Update target folder dropdown
    const targetFolderSel = document.getElementById('vaultUploadFolderSelect');
    if (targetFolderSel) {
      const currentVal = targetFolderSel.value;
      targetFolderSel.innerHTML = folders.map((f) => `<option value="${escHtml(f)}">${escHtml(f)}</option>`).join('');
      if (folders.includes(currentVal)) targetFolderSel.value = currentVal;
    }

    const docs = await vaultGetAll();
    const totalVaultBytes = docs.reduce((s, d) => s + (d.size || 0), 0);
    const storageLabel = document.getElementById('vaultStorageSummary');
    if (storageLabel) {
      storageLabel.textContent = `${docs.length} file(s) · ${global.utils.formatBytes(totalVaultBytes)} stored locally`;
    }

    const q = (document.getElementById('vaultSearchInput')?.value || '').trim().toLowerCase();
    const sortBy = document.getElementById('vaultSortSelect')?.value || 'date';

    let list = docs.filter((d) => {
      if (activeVaultFolder === 'Favourites' && !d.favourite) return false;
      if (activeVaultFolder !== 'All' && activeVaultFolder !== 'Favourites' && d.folder !== activeVaultFolder) return false;
      if (q && !d.name.toLowerCase().includes(q) && !(d.folder || '').toLowerCase().includes(q)) return false;
      return true;
    });

    if (sortBy === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'size') list.sort((a, b) => (b.size || 0) - (a.size || 0));
    else list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const listEl = document.getElementById('vaultFilesList');
    if (!listEl) return;

    if (!list.length) {
      listEl.innerHTML = '<div class="col-span-full p-8 rounded-2xl bg-white dark:bg-[#1C2438] border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-500">No documents in this folder yet. Tap <strong>Import Files</strong> above to save documents securely on your device.</div>';
      return;
    }

    listEl.innerHTML = list
      .map(
        (d) => `
        <div class="p-4 rounded-2xl bg-white dark:bg-[#1C2438] border border-slate-200 dark:border-slate-800 flex flex-col gap-3">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              <div class="text-sm font-bold text-[#151B2B] dark:text-white truncate">${escHtml(d.name)}</div>
              <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">${escHtml(d.folder || 'Personal')} · ${global.utils.formatBytes(d.size)}${d.encrypted ? ' · AES-256' : ''}</div>
            </div>
            <button type="button" data-id="${d.id}" class="vault-fav-btn p-1.5 rounded-lg ${d.favourite ? 'text-amber-500' : 'text-slate-300 hover:text-amber-500'}">★</button>
          </div>
          <div class="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button type="button" data-id="${d.id}" class="vault-preview-btn px-2.5 py-1.5 rounded-lg bg-[#293B80] text-white text-[11px] font-bold min-h-[32px]">Preview</button>
            <button type="button" data-id="${d.id}" class="vault-dl-btn px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-bold min-h-[32px]">Download</button>
            <button type="button" data-id="${d.id}" class="vault-share-btn px-2.5 py-1.5 rounded-lg bg-[#20A779]/15 text-[#20A779] text-[11px] font-bold min-h-[32px]">Share</button>
            <button type="button" data-id="${d.id}" class="vault-ren-btn px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-semibold min-h-[32px]">Rename</button>
            <button type="button" data-id="${d.id}" class="vault-del-btn ml-auto px-2.5 py-1.5 rounded-lg text-rose-500 text-[11px] font-bold min-h-[32px]">Delete</button>
          </div>
        </div>`
      )
      .join('');

    const byId = new Map(list.map((d) => [d.id, d]));

    listEl.querySelectorAll('.vault-fav-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const rec = byId.get(btn.getAttribute('data-id'));
        if (!rec) return;
        rec.favourite = !rec.favourite;
        await vaultPut(rec);
        refreshVaultView();
      });
    });

    listEl.querySelectorAll('.vault-dl-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const rec = byId.get(btn.getAttribute('data-id'));
        if (!rec) return;
        try {
          const blob = await decryptRecordToBlob(rec);
          global.utils.downloadBlob(blob, rec.name);
        } catch {
          global.utils.showToast('Locked File', 'Unlock with your Vault PIN first to decrypt this file.', 'error');
        }
      });
    });

    listEl.querySelectorAll('.vault-share-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const rec = byId.get(btn.getAttribute('data-id'));
        if (!rec) return;
        try {
          const blob = await decryptRecordToBlob(rec);
          if (global.AndroidBridge && typeof global.AndroidBridge.shareBase64File === 'function') {
            const reader = new FileReader();
            reader.onloadend = () => global.AndroidBridge.shareBase64File(String(reader.result || ''), rec.name, rec.mimeType || 'application/octet-stream');
            reader.readAsDataURL(blob);
          } else if (navigator.canShare && navigator.share) {
            const fileObj = new File([blob], rec.name, { type: rec.mimeType || 'application/octet-stream' });
            if (navigator.canShare({ files: [fileObj] })) {
              await navigator.share({ title: rec.name, files: [fileObj] });
              return;
            }
          } else {
            global.utils.downloadBlob(blob, rec.name);
          }
        } catch {}
      });
    });

    listEl.querySelectorAll('.vault-preview-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const rec = byId.get(btn.getAttribute('data-id'));
        if (!rec) return;
        const modal = document.getElementById('vaultPreviewModal');
        const titleEl = document.getElementById('vaultPreviewTitle');
        const bodyEl = document.getElementById('vaultPreviewBody');
        if (!modal || !bodyEl) return;
        try {
          const blob = await decryptRecordToBlob(rec);
          const url = URL.createObjectURL(blob);
          titleEl.textContent = rec.name;
          if ((rec.mimeType || '').startsWith('image/')) {
            bodyEl.innerHTML = `<img src="${url}" alt="${escHtml(rec.name)}" class="max-w-full max-h-[68vh] mx-auto rounded-xl shadow" />`;
          } else if (rec.mimeType === 'application/pdf' || rec.name.toLowerCase().endsWith('.pdf')) {
            bodyEl.innerHTML = `<canvas id="vaultPdfPreviewCanvas" class="max-w-full mx-auto rounded-lg shadow bg-white"></canvas>`;
            const pdfDoc = await window.pdfjsLib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
            const pg = await pdfDoc.getPage(1);
            const vp = pg.getViewport({ scale: 1.4 });
            const c = document.getElementById('vaultPdfPreviewCanvas');
            c.width = vp.width; c.height = vp.height;
            await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
          } else if ((rec.mimeType || '').startsWith('text/')) {
            const txt = await blob.text();
            bodyEl.innerHTML = `<pre class="text-xs font-mono whitespace-pre-wrap text-slate-800 dark:text-slate-200 p-3">${escHtml(txt.slice(0, 8000))}</pre>`;
          } else {
            bodyEl.innerHTML = `<p class="text-xs text-slate-500 text-center py-8">Preview not available for this file type. Use Download or Share.</p>`;
          }
          modal.classList.remove('hidden');
          modal.classList.add('flex');
        } catch {
          global.utils.showToast('Preview Failed', 'Could not decrypt or render this file.', 'error');
        }
      });
    });

    listEl.querySelectorAll('.vault-ren-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const rec = byId.get(btn.getAttribute('data-id'));
        if (!rec) return;
        const inlineWrap = document.getElementById('vaultRenameRow');
        const inlineInput = document.getElementById('vaultRenameInput');
        const inlineSave = document.getElementById('vaultRenameSaveBtn');
        if (!inlineWrap || !inlineInput || !inlineSave) return;
        inlineWrap.classList.remove('hidden');
        inlineInput.value = rec.name;
        inlineInput.focus();
        inlineSave.onclick = async () => {
          const next = inlineInput.value.trim();
          if (next) {
            rec.name = next;
            await vaultPut(rec);
            inlineWrap.classList.add('hidden');
            refreshVaultView();
            global.utils.showToast('Renamed', `File renamed to "${next}".`);
          }
        };
      });
    });

    listEl.querySelectorAll('.vault-del-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await vaultDelete(btn.getAttribute('data-id'));
        refreshVaultView();
        global.utils.showToast('Deleted', 'File removed from local Document Center.');
      });
    });
  }

  function initDocumentCenter() {
    const importInput = document.getElementById('vaultImportInput');
    const folderInput = document.getElementById('vaultNewFolderInput');
    const folderAddBtn = document.getElementById('vaultAddFolderBtn');
    const searchInput = document.getElementById('vaultSearchInput');
    const sortSel = document.getElementById('vaultSortSelect');
    const pinInput = document.getElementById('vaultUnlockPinInput');
    const pinUnlockBtn = document.getElementById('vaultUnlockPinBtn');
    const bioUnlockBtn = document.getElementById('vaultBiometricUnlockBtn');
    const setPinInput = document.getElementById('vaultSetupPinInput');
    const setPinBtn = document.getElementById('vaultSetupPinBtn');
    const lockNowBtn = document.getElementById('vaultLockNowBtn');
    const closePrev = document.getElementById('vaultPreviewCloseBtn');

    if (closePrev) {
      closePrev.addEventListener('click', () => {
        const m = document.getElementById('vaultPreviewModal');
        if (m) { m.classList.add('hidden'); m.classList.remove('flex'); }
      });
    }

    if (importInput) {
      importInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files || []);
        importInput.value = '';
        if (!files.length) return;
        const folder = document.getElementById('vaultUploadFolderSelect')?.value || 'Personal';
        global.utils.showLoader('Securing Files in Local Vault...', 'text-[#293B80]');
        try {
          for (const f of files) {
            const ab = await f.arrayBuffer();
            let payload = { encrypted: false, iv: null, data: ab };
            if (activeVaultKey) {
              payload = await encryptBuffer(ab, activeVaultKey);
            }
            await vaultPut({
              id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              name: f.name,
              size: f.size,
              mimeType: f.type || 'application/octet-stream',
              folder,
              favourite: false,
              createdAt: new Date().toISOString(),
              ...payload
            });
          }
          await refreshVaultView();
          global.utils.showToast('Saved to Document Center', `${files.length} file(s) stored locally${activeVaultKey ? ' with AES-256 encryption' : ''}.`);
        } catch (err) {
          console.error(err);
          global.utils.showToast('Import Failed', 'Could not save file to local storage.', 'error');
        } finally {
          global.utils.hideLoader();
        }
      });
    }

    // Expose 1-tap Vault save helper for the Ad-Free PDF Reader and other tools
    global.saveBlobToPdfBondhuVault = async function (blobOrBuffer, filename, mimeType = 'application/pdf', folder = 'Personal') {
      try {
        const ab = blobOrBuffer instanceof ArrayBuffer
          ? blobOrBuffer
          : (blobOrBuffer && typeof blobOrBuffer.arrayBuffer === 'function' ? await blobOrBuffer.arrayBuffer() : null);
        if (!ab) return false;
        let payload = { encrypted: false, iv: null, data: ab };
        if (activeVaultKey) {
          payload = await encryptBuffer(ab, activeVaultKey);
        }
        await vaultPut({
          id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: filename || 'Document.pdf',
          size: ab.byteLength,
          mimeType,
          folder,
          favourite: false,
          createdAt: new Date().toISOString(),
          ...payload
        });
        await refreshVaultView();
        global.utils?.showToast?.('Saved to Vault', `"${filename}" stored safely in My Files.`);
        return true;
      } catch (err) {
        console.error('Vault save helper error:', err);
        global.utils?.showToast?.('Vault Save Failed', 'Could not store file in My Files.', 'error');
        return false;
      }
    };

    if (folderAddBtn && folderInput) {
      folderAddBtn.addEventListener('click', () => {
        const name = folderInput.value.trim();
        if (!name) return;
        const folders = loadJson(VAULT_FOLDERS_KEY, ['Personal', 'ID Cards', 'Bills & Receipts', 'Study & Office']);
        if (!folders.includes(name)) {
          folders.push(name);
          saveJson(VAULT_FOLDERS_KEY, folders);
        }
        folderInput.value = '';
        activeVaultFolder = name;
        refreshVaultView();
      });
    }

    if (searchInput) searchInput.addEventListener('input', refreshVaultView);
    if (sortSel) sortSel.addEventListener('change', refreshVaultView);

    if (pinUnlockBtn && pinInput) {
      pinUnlockBtn.addEventListener('click', async () => {
        const pin = pinInput.value.trim();
        const savedHash = localStorage.getItem(VAULT_PIN_HASH_KEY);
        if (!pin || (await sha256Hex(pin)) !== savedHash) {
          global.utils.showToast('Wrong PIN', 'Please enter your 4-digit Vault PIN.', 'error');
          return;
        }
        activeVaultKey = await deriveAesKey(pin);
        vaultUnlocked = true;
        pinInput.value = '';
        refreshVaultView();
      });
    }

    if (bioUnlockBtn) {
      global.onAndroidBiometricResult = (ok, errMsg) => {
        if (ok) {
          vaultUnlocked = true;
          refreshVaultView();
          global.utils.showToast('Biometric Verified', 'Document Center unlocked.');
        } else if (errMsg) {
          global.utils.showToast('Biometric Cancelled', errMsg, 'info');
        }
      };
      bioUnlockBtn.addEventListener('click', () => {
        if (global.AndroidBridge && global.AndroidBridge.authenticateBiometric) {
          global.AndroidBridge.authenticateBiometric('Unlock PDF Bondhu Vault', 'Use fingerprint or device screen lock');
        }
      });
    }

    if (setPinBtn && setPinInput) {
      setPinBtn.addEventListener('click', async () => {
        const pin = setPinInput.value.trim();
        if (!/^\d{4,6}$/.test(pin)) {
          global.utils.showToast('Invalid PIN', 'Enter a 4 to 6 digit numeric PIN.', 'error');
          return;
        }
        localStorage.setItem(VAULT_PIN_HASH_KEY, await sha256Hex(pin));
        activeVaultKey = await deriveAesKey(pin);
        vaultUnlocked = true;
        setPinInput.value = '';
        refreshVaultView();
        global.utils.showToast('Vault PIN Enabled!', 'New files will be AES-256 encrypted locally.');
      });
    }

    if (lockNowBtn) {
      lockNowBtn.addEventListener('click', () => {
        if (!hasVaultPin()) {
          global.utils.showToast('Set PIN First', 'Set a 4-digit PIN below to lock your Document Center.', 'info');
          return;
        }
        vaultUnlocked = false;
        activeVaultKey = null;
        refreshVaultView();
      });
    }
  }

  /* ========================================================================
     6. India Essentials Checklists (Persisted Locally)
     ======================================================================== */
  function initIndiaEssentials() {
    const CHECK_KEY = 'pdfBondhuIndiaChecklist_v2';
    const saved = loadJson(CHECK_KEY, {});
    document.querySelectorAll('.india-check-item').forEach((chk) => {
      const id = chk.getAttribute('data-check-id');
      if (id && saved[id]) chk.checked = true;
      chk.addEventListener('change', () => {
        const cur = loadJson(CHECK_KEY, {});
        cur[id] = chk.checked;
        saveJson(CHECK_KEY, cur);
      });
    });
  }

  /* ========================================================================
     7. Profile, Appearance (Light/Dark/System), Storage & Info Modals
     ======================================================================== */
  async function refreshStorageOverview() {
    const el = document.getElementById('settingsStorageUsageText');
    if (!el) return;
    try {
      const docs = await vaultGetAll();
      const vaultBytes = docs.reduce((s, d) => s + (d.size || 0), 0);
      let quotaStr = '';
      if (navigator.storage && navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        if (est && est.usage !== undefined && est.quota) {
          quotaStr = ` · Total App Cache: ${global.utils.formatBytes(est.usage)}`;
        }
      }
      el.textContent = `Vault: ${docs.length} file(s) (${global.utils.formatBytes(vaultBytes)})${quotaStr}`;
    } catch {
      el.textContent = '100% Local On-Device Storage';
    }
  }

  function initProfileAndSettings() {
    const nameInput = document.getElementById('profileUserNameInput');
    const authorInput = document.getElementById('profileDefaultAuthorInput');
    const saveProfileBtn = document.getElementById('profileSaveBtn');
    const avatarInitials = document.querySelectorAll('.pb-user-initials');

    function syncProfileUi() {
      const prof = loadJson(PROFILE_KEY, { name: '', author: localStorage.getItem('pdfBondhuDefaultAuthor') || 'Suman Nayak' });
      if (nameInput) nameInput.value = prof.name || '';
      if (authorInput) authorInput.value = prof.author || '';
      const init = (prof.name || 'PB').trim().slice(0, 2).toUpperCase();
      avatarInitials.forEach((el) => (el.textContent = init));
      if (global.PDFBondhuI18n) global.PDFBondhuI18n.applyTranslations();
    }

    if (saveProfileBtn) {
      saveProfileBtn.addEventListener('click', () => {
        const name = (nameInput?.value || '').trim();
        const author = (authorInput?.value || '').trim();
        saveJson(PROFILE_KEY, { name, author });
        if (author) localStorage.setItem('pdfBondhuDefaultAuthor', author);
        syncProfileUi();
        global.utils.showToast('Profile Updated', 'Saved locally on your device.');
      });
    }
    syncProfileUi();

    // Appearance: Light / Dark / System Default
    function applyThemeMode(mode) {
      localStorage.setItem(THEME_MODE_KEY, mode);
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = mode === 'dark' || (mode === 'system' && prefersDark);
      document.documentElement.classList.toggle('dark', isDark);
      localStorage.setItem('pdfBondhuTheme', isDark ? 'dark' : 'light');
      const meta = document.getElementById('metaThemeColor');
      if (meta) meta.setAttribute('content', isDark ? '#151B2B' : '#293B80');

      document.querySelectorAll('[data-theme-mode]').forEach((btn) => {
        const act = btn.getAttribute('data-theme-mode') === mode;
        btn.classList.toggle('bg-[#293B80]', act);
        btn.classList.toggle('text-white', act);
        btn.classList.toggle('border-[#293B80]', act);
      });
    }

    document.querySelectorAll('[data-theme-mode]').forEach((btn) => {
      btn.addEventListener('click', () => applyThemeMode(btn.getAttribute('data-theme-mode')));
    });
    const savedMode = localStorage.getItem(THEME_MODE_KEY) || (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    applyThemeMode(savedMode);

    // Clear Recent History
    const clearHistBtn = document.getElementById('settingsClearHistoryBtn');
    if (clearHistBtn) {
      clearHistBtn.addEventListener('click', () => {
        localStorage.removeItem(RECENT_TOOLS_KEY);
        localStorage.removeItem(RECENT_DOCS_KEY);
        localStorage.removeItem(RECENT_SEARCH_KEY);
        renderHomeDynamicWidgets();
        renderRecentActivityTab();
        global.utils.showToast('History Cleared', 'Recent tools, documents & searches cleared.');
      });
    }

    // Settings Info Modal (Privacy Policy, Terms, Help & Support, About PDF Bondhu)
    const infoModal = document.getElementById('settingsInfoModal');
    const infoTitle = document.getElementById('settingsInfoModalTitle');
    const infoBody = document.getElementById('settingsInfoModalBody');
    const infoClose = document.getElementById('settingsInfoModalClose');

    const INFO_DOCS = {
      privacy: {
        title: 'Privacy Policy — PDF Bondhu 2.0',
        html: `<p><strong>100% On-Device Processing:</strong> Every PDF tool, image reducer, passport photo maker, OCR scan, Excel operation, and calculator runs strictly inside your device's browser or Android WebView.</p>
               <p><strong>Zero Server Uploads:</strong> We never upload, store, or inspect your personal PDFs, Aadhaar/PAN cards, photos, or notes on any external server.</p>
               <p><strong>Encrypted Local Vault:</strong> Files added to Personal Document Center with a Vault PIN are encrypted using Web Crypto PBKDF2 + AES-256-GCM before being stored in your device's local IndexedDB.</p>
               <p><strong>Minimal Permissions:</strong> Camera permission is requested strictly when you scan a document or QR code.</p>`
      },
      terms: {
        title: 'Terms & Conditions',
        html: `<p><strong>100% Free Utility Suite:</strong> PDF Bondhu 2.0 is provided free of charge for personal, educational, and everyday office productivity.</p>
               <p><strong>Independent Application:</strong> PDF Bondhu is an independent utility application created by Suman Nayak and is <strong>not affiliated with or endorsed by any Government of India agency</strong>. Official links in India Essentials open official .gov.in / .nic.in portals in your browser.</p>
               <p><strong>Authorized Use Only:</strong> PDF Password Removal must only be used on documents you own or are legally authorized to unlock.</p>`
      },
      help: {
        title: 'Help & Support',
        html: `<p><strong>Where are my saved files stored?</strong> On Android APK, saved files go directly to <code>Downloads/PDF Bondhu/</code>. On Web/Desktop, they save to your browser's default Downloads folder.</p>
               <p><strong>Does PDF Bondhu work offline?</strong> Yes! Once opened once, all core PDF, Image, Office, Calculator, Converter, Productivity, and Vault tools work smoothly without internet.</p>
               <p><strong>Need assistance?</strong> Tap Send Feedback in Settings to reach developer Suman Nayak.</p>`
      },
      about: {
        title: 'About PDF Bondhu 2.0',
        html: `<p><strong>PDF Bondhu 2.0 — One App. Everyday Solutions.</strong></p>
               <p>A lightweight, private, commercial-grade offline utility suite combining PDF Studio, Image Studio, Office Studio, Daily Utility Center, Personal Document Center, and India Essentials in English, বাংলা, and हिन्दी.</p>
               <p><strong>App Developer:</strong> Suman Nayak<br/><strong>Version:</strong> 2.0.0 (100% Free Launch Edition)</p>`
      }
    };

    document.querySelectorAll('[data-info-doc]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const doc = INFO_DOCS[btn.getAttribute('data-info-doc')];
        if (!doc || !infoModal) return;
        infoTitle.textContent = doc.title;
        infoBody.innerHTML = doc.html;
        infoModal.classList.remove('hidden');
        infoModal.classList.add('flex');
      });
    });

    if (infoClose && infoModal) {
      infoClose.addEventListener('click', () => {
        infoModal.classList.add('hidden');
        infoModal.classList.remove('flex');
      });
    }

    // Share & Feedback Buttons
    const shareBtn = document.getElementById('settingsShareAppBtn');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        const shareUrl = 'https://pdf-bondhu-v1.vercel.app';
        const shareMsg = 'Try PDF Bondhu 2.0 — One App. Everyday Solutions. 100% Free & Offline PDF, Image, Passport Photo, QR & Daily Utility Suite: ' + shareUrl;
        if (global.AndroidBridge && global.AndroidBridge.shareText) {
          global.AndroidBridge.shareText('PDF Bondhu 2.0', shareMsg);
        } else if (navigator.share) {
          navigator.share({ title: 'PDF Bondhu 2.0', text: shareMsg, url: shareUrl }).catch(() => {});
        } else {
          navigator.clipboard?.writeText(shareUrl).then(() => global.utils.showToast('Link Copied!', shareUrl));
        }
      });
    }

    const rateBtn = document.getElementById('settingsRateAppBtn');
    if (rateBtn) {
      rateBtn.addEventListener('click', () => {
        const openFb = document.getElementById('settingsFeedbackBtn');
        if (openFb) openFb.click();
        else global.utils.showToast('Thank You!', 'Thank you for supporting PDF Bondhu 2.0!', 'info');
      });
    }
  }

  /* ========================================================================
     8. Instant Live OTA Auto-Update Engine (APK + Web + Installed PWA)
     ======================================================================== */
  const CURRENT_BUILD = '20261125-1';
  const CURRENT_VERSION = '2.2.0';

  function initLiveAutoUpdater() {
    const banner = document.getElementById('liveUpdateBanner');
    const applyBtn = document.getElementById('liveUpdateApplyBtn');
    const dismissBtn = document.getElementById('liveUpdateDismissBtn');
    const headerRefreshBtn = document.getElementById('headerRefreshUpdateBtn');
    const settingsCheckBtn = document.getElementById('settingsCheckUpdateBtn');
    const versionText = document.getElementById('settingsAppVersionText');

    if (versionText) {
      versionText.textContent = `Version ${CURRENT_VERSION} · Build ${CURRENT_BUILD} · Auto-Updates Enabled`;
    }

    function showUpdateBanner(note) {
      if (!banner) return;
      const msgEl = document.getElementById('liveUpdateBannerText');
      if (msgEl && note) msgEl.textContent = note;
      banner.classList.remove('hidden');
      banner.classList.add('flex');
    }

    async function applyFreshReload() {
      // 1. Inside Android APK: clear WebView cache and reload updated ota_www
      if (global.AndroidBridge && typeof global.AndroidBridge.reloadApp === 'function') {
        global.AndroidBridge.reloadApp();
        return;
      }
      // 2. Inside Web / Installed PWA: clear stale SW shell cache then reload
      try {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg) {
            await reg.update().catch(() => {});
            const sw = reg.waiting || reg.active;
            if (sw) {
              sw.postMessage({ type: 'CLEAR_SHELL_CACHE' });
              sw.postMessage({ type: 'SKIP_WAITING' });
            }
          }
        }
        if (window.caches) {
          const names = await caches.keys();
          await Promise.all(names.filter((n) => n.startsWith('pdf-bondhu-shell')).map((n) => caches.delete(n)));
        }
      } catch {}
      const cleanUrl = window.location.href.split('#')[0].split('?')[0];
      window.location.replace(`${cleanUrl}?v=${Date.now()}`);
    }

    async function checkLiveUpdate(manual = false) {
      if (!navigator.onLine) {
        if (manual) global.utils.showToast('Offline Mode', 'Connect to internet once to check for new updates.', 'info');
        return;
      }

      // If running inside Android APK with native OTA bridge
      if (manual && global.AndroidBridge && typeof global.AndroidBridge.checkForUpdateNow === 'function') {
        global.utils.showToast('Checking Updates...', 'Syncing latest PDF Bondhu version from server...', 'info');
        global.AndroidBridge.checkForUpdateNow();
        return;
      }

      if (manual) {
        global.utils.showToast('Checking Updates...', 'Looking for the latest PDF Bondhu release...', 'info');
      }

      try {
        const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('offline');
        const info = await res.json();
        if (info && info.build && info.build !== CURRENT_BUILD) {
          if (manual) {
            global.utils.showToast('Update Found!', `Updating to v${info.version || 'Latest'}...`);
            setTimeout(() => applyFreshReload(), 600);
          } else {
            showUpdateBanner(`New update v${info.version || 'Latest'} ready! Tap Refresh to load instantly.`);
          }
        } else if (manual) {
          // Even if version.json matches, let manual refresh update SW & confirm latest
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistration().then((r) => r && r.update().catch(() => {}));
          }
          global.utils.showToast('You Are Up to Date!', `PDF Bondhu v${CURRENT_VERSION} is the latest version.`);
        }
      } catch {
        if (manual) {
          applyFreshReload();
        }
      }
    }

    // Native Android OTA callbacks
    global.onPdfBondhuUpdateReady = () => {
      showUpdateBanner('New PDF Bondhu update downloaded! Tap Refresh — no new APK needed.');
    };
    global.onPdfBondhuUpdateStatus = (status, message) => {
      global.utils.showToast(
        status === 'uptodate' ? 'Up to Date' : 'App Update',
        message || 'Update check complete.',
        status === 'error' ? 'error' : 'info'
      );
    };

    if (applyBtn) applyBtn.addEventListener('click', applyFreshReload);
    if (dismissBtn && banner) {
      dismissBtn.addEventListener('click', () => {
        banner.classList.add('hidden');
        banner.classList.remove('flex');
      });
    }
    if (headerRefreshBtn) headerRefreshBtn.addEventListener('click', () => checkLiveUpdate(true));
    if (settingsCheckBtn) settingsCheckBtn.addEventListener('click', () => checkLiveUpdate(true));

    // Silent auto-check on startup & whenever friend returns to the app
    setTimeout(() => checkLiveUpdate(false), 3500);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkLiveUpdate(false);
      }
    });
  }

  /* ========================================================================
     9. Friends Feedback Composer (WhatsApp + Direct Email + Copy)
     ======================================================================== */
  function initFeedbackComposer() {
    const modal = document.getElementById('feedbackModal');
    const closeBtn = document.getElementById('feedbackCloseBtn');
    const openBtns = [
      document.getElementById('homeFeedbackBtn'),
      document.getElementById('settingsFeedbackBtn')
    ].filter(Boolean);

    const starBtns = document.querySelectorAll('.fb-star-btn');
    const typeBtns = document.querySelectorAll('.fb-type-btn');
    const nameInput = document.getElementById('fbSenderName');
    const msgInput = document.getElementById('fbMessageInput');
    const waBtn = document.getElementById('fbSendWhatsappBtn');
    const mailBtn = document.getElementById('fbSendEmailBtn');
    const copyBtn = document.getElementById('fbCopyTextBtn');

    let rating = 5;
    let fbType = 'UI / Feature Idea';

    function paintStars() {
      starBtns.forEach((btn) => {
        const v = Number(btn.getAttribute('data-star'));
        btn.classList.toggle('text-amber-400', v <= rating);
        btn.classList.toggle('text-slate-300', v > rating);
        btn.classList.toggle('dark:text-slate-600', v > rating);
      });
    }
    paintStars();

    starBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        rating = Number(btn.getAttribute('data-star')) || 5;
        paintStars();
      });
    });

    typeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        fbType = btn.getAttribute('data-fb-type') || 'Feedback';
        typeBtns.forEach((b) => {
          const act = b === btn;
          b.className = act
            ? 'fb-type-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm'
            : 'fb-type-btn px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300';
        });
      });
    });

    function openModal() {
      if (!modal) return;
      const prof = loadJson(PROFILE_KEY, {});
      if (nameInput && !nameInput.value && prof.name) nameInput.value = prof.name;
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
    function closeModal() {
      if (!modal) return;
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }

    openBtns.forEach((b) => b.addEventListener('click', openModal));
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    function buildFeedbackPayload() {
      const sender = (nameInput?.value || '').trim() || 'A PDF Bondhu Friend';
      const msg = (msgInput?.value || '').trim();
      if (!msg) {
        global.utils.showToast('Write Your Feedback', 'Please type a short message or suggestion first.', 'error');
        return null;
      }
      const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
      const env = global.AndroidBridge ? 'Android APK' : 'Web / PWA';
      return `PDF Bondhu v${CURRENT_VERSION} Feedback\nFrom: ${sender}\nRating: ${stars} (${rating}/5)\nTopic: ${fbType}\nPlatform: ${env}\n\nMessage:\n${msg}`;
    }

    if (waBtn) {
      waBtn.addEventListener('click', () => {
        const text = buildFeedbackPayload();
        if (!text) return;
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.location.href = url;
        closeModal();
      });
    }

    if (mailBtn) {
      mailBtn.addEventListener('click', () => {
        const text = buildFeedbackPayload();
        if (!text) return;
        const subject = encodeURIComponent(`[PDF Bondhu Feedback] ${fbType} (${rating}/5)`);
        const body = encodeURIComponent(text);
        window.location.href = `mailto:suman.pba@gmail.com?subject=${subject}&body=${body}`;
        closeModal();
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const text = buildFeedbackPayload();
        if (!text) return;
        navigator.clipboard?.writeText(text).then(() => {
          global.utils.showToast('Feedback Copied!', 'Paste it in WhatsApp or chat to send to Suman.');
          closeModal();
        });
      });
    }
  }

  /* ========================================================================
     Initialize All PDF Bondhu 2.0 Controllers
     ======================================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    hookDownloadTracker();
    wireNavigation();
    initSmartSearch();
    initDocumentCenter();
    initIndiaEssentials();
    initProfileAndSettings();
    initLiveAutoUpdater();
    initFeedbackComposer();

    // Wire All Tools category buttons & search
    document.querySelectorAll('.alltools-cat-btn').forEach((btn) => {
      btn.addEventListener('click', () => renderAllToolsGrid(btn.getAttribute('data-cat')));
    });
    const allSearch = document.getElementById('allToolsSearchInput');
    if (allSearch) allSearch.addEventListener('input', () => renderAllToolsGrid(currentAllToolsCat));

    // Wire Quick Actions & Category Cards on Home
    document.querySelectorAll('[data-open-tool]').forEach((btn) => {
      btn.addEventListener('click', () => {
        openSection(btn.getAttribute('data-open-tool'), { sub: btn.getAttribute('data-open-sub') || '' });
      });
    });
    document.querySelectorAll('[data-open-cat]').forEach((btn) => {
      btn.addEventListener('click', () => global.openAllToolsCategory(btn.getAttribute('data-open-cat')));
    });

    renderHomeDynamicWidgets();
    renderAllToolsGrid('all');
    refreshStorageOverview();

    document.addEventListener('pdfbondhu:langchange', () => {
      renderHomeDynamicWidgets();
    });
  });
})(window);
