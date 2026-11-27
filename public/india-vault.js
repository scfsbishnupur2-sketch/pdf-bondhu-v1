/**
 * PDF Bondhu 2.0 - Core Shell, Smart Search, Personal Document Center (IndexedDB + AES-GCM + PIN/Biometric),
 * India Essentials, Recent Activity, Favourites & Premium Settings Controller.
 */
(function (global) {
  const TOOL_CATALOG = [
    // PDF Studio
    { id: 'pdfReaderTool', cat: 'pdf', name: 'Document Reader', desc: 'All-Document Reader — PDF, Word, Excel, PPT, Photo & ZIP full-screen, ad-free', popular: true, keywords: 'read pdf viewer open word doc docx excel xls xlsx csv ppt pptx powerpoint rtf txt photo image zip extract reader ad free night mode sepia search' },
    { id: 'pdfScanner', cat: 'pdf', name: 'Document Scanner', desc: 'AI Document Scanner — Auto 4-corner crop, Magic Color & instant PDF', popular: true, keywords: 'scan document camera adobe auto crop photo to pdf' },
    { id: 'pdfCompress', cat: 'pdf', name: 'Compress PDF', desc: 'Shrink PDF to exact KB or MB size locally', popular: true, keywords: 'compress pdf reduce pdf size shrink kb mb small' },
    { id: 'pdfMerge', cat: 'pdf', name: 'Merge PDF', desc: 'Combine two or more PDFs into one file', popular: true, keywords: 'merge pdf merge two pdfs combine join pdf' },
    { id: 'pdfSplit', cat: 'pdf', name: 'Split PDF', desc: 'Split & Extract specific pages or page ranges cleanly', popular: false, keywords: 'split pdf extract pages cut remove pages' },
    { id: 'pdfEdit', cat: 'pdf', name: 'Edit PDF', desc: 'Add text, whiteout, highlight, draw & insert images', popular: true, keywords: 'edit pdf write text whiteout highlight draw annotate' },
    { id: 'pdfOrganize', cat: 'pdf', name: 'Organize PDF', desc: 'Rotate, reorder or delete PDF pages visually', popular: false, keywords: 'rotate pdf organize reorder pages delete flip' },
    { id: 'pdfWatermark', cat: 'pdf', name: 'Watermark PDF', desc: 'Stamp custom watermarks & page numbering on PDFs', popular: false, keywords: 'watermark stamp page numbers footer header pdf' },
    { id: 'pdfSign', cat: 'pdf', name: 'Sign PDF', desc: 'PDF E-Signature — Draw or upload signature & attest pages', popular: false, keywords: 'sign pdf e-signature attest draw signature' },
    { id: 'pdfSigVerify', cat: 'pdf', name: 'Verify Signature', desc: 'Verify Digital Signature on e-Aadhaar, PAN & Govt PDFs', popular: true, keywords: 'verify digital signature aadhaar pan certificate check' },
    { id: 'pdfSecurityTool', cat: 'pdf', name: 'Lock / Unlock PDF', desc: 'Protect with 128-bit password or unlock authorized PDFs', popular: false, keywords: 'password protect lock unlock decrypt remove password pdf' },
    { id: 'pdfToImgTool', cat: 'pdf', name: 'PDF to Images', desc: 'Export PDF pages to HD JPG/PNG or bulk ZIP', popular: false, keywords: 'pdf to image jpg png convert pages export zip' },
    { id: 'pdfCompareTool', cat: 'pdf', name: 'Compare PDFs', desc: 'Side-by-side visual preview & text diff checker for two PDFs', popular: false, keywords: 'compare pdf diff differences check two pdfs' },
    { id: 'pdfRepair', cat: 'pdf', name: 'Repair PDF', desc: 'Repair Corrupted PDF — fix damaged XRef tables & rescue pages', popular: false, keywords: 'repair pdf fix corrupted broken damaged recover' },
    { id: 'textToPdf', cat: 'pdf', name: 'Text to PDF', desc: 'Turn letters, applications or notes into clean A4 PDF', popular: false, keywords: 'text to pdf notes letter application write' },
    { id: 'pdfMetadataTool', cat: 'pdf', name: 'PDF Metadata', desc: 'PDF Metadata Viewer & Editor — Title, Author, Subject & Date', popular: false, keywords: 'metadata viewer editor author title date properties' },

    // Image Studio
    { id: 'passportMaker', cat: 'image', name: 'Passport Photo', desc: 'Passport Photo Maker — 35×45mm India/PAN/Visa photo & A4 sheet', popular: true, keywords: 'make passport photo size maker sheet a4 4x6 background' },
    { id: 'imageCompress', cat: 'image', name: 'KB Size Reducer', desc: 'Image Size Reducer (KB) — shrink photo to 20KB, 50KB, 100KB or custom', popular: true, keywords: 'reduce image size kb compress photo shrink' },
    { id: 'imgToPdf', cat: 'image', name: 'Images to PDF', desc: 'Convert JPG, PNG & WebP photos into a clean PDF', popular: true, keywords: 'convert image to pdf jpg to pdf photos album' },
    { id: 'imgResize', cat: 'image', name: 'Signature Resizer', desc: 'Signature & ID Photo Resizer — exact px & KB for PAN, SSC, UPSC', popular: false, keywords: 'signature resizer id card photo resizer exam form' },
    { id: 'idCardMaker', cat: 'image', name: 'ID Card Maker', desc: 'ID Card 2-in-1 A4 Maker — Front & Back Aadhaar/PAN/Voter on 1 page', popular: false, keywords: 'id card front back aadhaar pan voter a4 pdf' },
    { id: 'imgCropTool', cat: 'image', name: 'Image Cropper', desc: 'Crop, rotate & flip images with exact aspect ratios', popular: false, keywords: 'image cropper crop photo cut aspect ratio rotate' },
    { id: 'imgConvert', cat: 'image', name: 'Image Converter', desc: 'Image Format Converter — switch between JPG, PNG & WebP offline', popular: false, keywords: 'image converter format jpg png webp' },
    { id: 'ocrScanner', cat: 'image', name: 'OCR Text', desc: 'OCR Text Extractor — extract English & Bengali text from images/PDFs', popular: false, keywords: 'ocr text extractor bengali english scan text' },

    // Office Studio
    { id: 'excelMerge', cat: 'office', name: 'Excel Merger', desc: 'Combine multiple Excel & CSV spreadsheets cleanly', popular: false, keywords: 'excel merger merge xlsx combine spreadsheets' },
    { id: 'excelCleaner', cat: 'office', name: 'Excel Cleaner', desc: 'Remove duplicate rows from spreadsheets automatically', popular: false, keywords: 'excel cleaner remove duplicates clean rows' },
    { id: 'pdfToExcel', cat: 'office', name: 'PDF to Excel', desc: 'Extract PDF tables & lines into Excel (.xlsx)', popular: false, keywords: 'pdf to excel table extract spreadsheet' },
    { id: 'csvViewerTool', cat: 'office', name: 'CSV Viewer', desc: 'CSV & Spreadsheet Viewer — preview tables & convert CSV to Excel', popular: false, keywords: 'csv viewer spreadsheet preview csv to excel' },
    { id: 'zipStudioTool', cat: 'office', name: 'ZIP Studio', desc: 'ZIP Creator & Extractor — compress files to ZIP or unzip archives', popular: false, keywords: 'zip creator extractor archive compress unzip' },

    // Daily Utilities
    { id: 'dailyUtilitiesHub', sub: 'dailyPanelCalc', cat: 'daily', name: 'Calculators', desc: 'GST, EMI, Scientific, Percentage & Age calculators', popular: true, keywords: 'calculate gst calculate emi calculator scientific age percentage' },
    { id: 'dailyUtilitiesHub', sub: 'dailyPanelConv', cat: 'daily', name: 'Unit Converters', desc: 'Unit & Electricity Converters — Length, Weight, Area & Electricity Bill', popular: false, keywords: 'unit converter length weight bigha katha electricity bill' },
    { id: 'dailyUtilitiesHub', sub: 'dailyPanelProd', cat: 'daily', name: 'Notes & Timer', desc: 'Notes, To-Do, Shopping List, Daily Expenses, Calendar & Reminders', popular: false, keywords: 'notes todo shopping list expense tracker calendar stopwatch timer reminders' },
    { id: 'dailyUtilitiesHub', sub: 'dailyPanelSmart', cat: 'daily', name: 'QR & Speed Test', desc: 'QR Scanner, QR Generator, Wi-Fi QR & Internet Speed Test', popular: true, keywords: 'create qr code qr scanner wifi qr barcode internet speed test' },

    // India Essentials, Vault, Planner, Money, AI & Pro Extras
    { id: 'indiaEssentials', cat: 'india', name: 'India Essentials', desc: 'Official Govt Portals, PAN/Aadhaar/Passport checklists', popular: false, keywords: 'india government portal pan aadhaar voter passport checklist scholarship' },
    { id: 'documentCenter', cat: 'vault', name: 'Document Vault', desc: 'Personal Document Center — Folders, PIN, Biometric & AES-256 Vault', popular: false, keywords: 'my files document center vault folders pin biometric encrypt' },
    { id: 'oneoraPlannerTab', cat: 'life', name: 'Life Planner', desc: 'My Daily Life Planner — Calendar, Date Notes, Reminders, Tasks & Habits', popular: true, keywords: 'planner calendar date notes reminders medicine birthday tasks habits daily schedule' },
    { id: 'oneoraCompanionTab', sub: 'lifeplus', cat: 'life', name: 'Life+ Hub', desc: 'Shopping Lists, Birthday Countdowns & Daily Routine Builder', popular: true, keywords: 'shopping list grocery birthday anniversary countdown daily routine morning evening' },
    { id: 'oneoraCompanionTab', sub: 'doctemplates', cat: 'pdf', name: 'Doc Templates', desc: 'Document Templates Studio — Offline Resume, GST Invoice, Quotation & Letters', popular: true, keywords: 'resume cv maker invoice gst quotation receipt official letter template a4 pdf' },
    { id: 'oneoraCompanionTab', sub: 'lifestyle', cat: 'lifestyle', name: 'Wellness Hub', desc: 'Lifestyle & Wellness — Exercise, Sleep Notes, Medicine & Personal Goals', popular: false, keywords: 'exercise workout sleep notes medicine tracker personal goals wellness health' },
    { id: 'oneoraCompanionTab', sub: 'securityplus', cat: 'vault', name: 'Password Vault', desc: 'AES-256 Password Vault & Secure Notes — zero-plaintext offline', popular: true, keywords: 'password vault manager secure notes aes 256 encryption secret pin generator' },
    { id: 'oneoraMoneyTab', cat: 'finance', name: 'Money Manager', desc: 'Money & Expense Manager — Income, Budgets, Goals, Bills, SIP & Reports', popular: true, keywords: 'money expense income budget savings goals bills debt sip fuel split salary report' },
    { id: 'oneoraAiTab', cat: 'ai', name: 'ONEORA AI', desc: 'Multilingual Bengali/English/Hindi AI Chat, Voice & Document Q&A', popular: true, keywords: 'ai assistant chat summarize pdf letter email translate grammar voice' },
    { id: 'oneoraExtrasTab', cat: 'pdf', name: 'Redact & Pro', desc: 'PDF Redact, Collage, Watermark, Password Gen, World Clock & Expiry', popular: false, keywords: 'redact flatten pdf collage watermark background color password generator world clock text formatter links emergency helpline expiry' }
  ];

  const FAV_KEY = 'pdfBondhuFavs_v2';
  const RECENT_TOOLS_KEY = 'pdfBondhuRecentTools_v2';
  const RECENT_DOCS_KEY = 'pdfBondhuRecentDocs_v2';
  const RECENT_SEARCH_KEY = 'pdfBondhuRecentSearch_v2';
  const PROFILE_KEY = 'pdfBondhuProfile_v2';
  const THEME_MODE_KEY = 'pdfBondhuThemeMode_v2'; // 'light' | 'dark' | 'system'

  let activeToolId = 'homeDashboard';
  let activePastelCat = null; // 'pdf' | 'image' | 'office' | 'lifemoney' | 'india' | 'vault'
  let toolOriginCat = null;   // Tracks category screen that launched the current tool
  let sheetToolCtx = null;    // { tool, catKey } currently previewed in #pastelToolSheet

  // Gentle haptic feedback helper (respects browser capability & silently no-ops if unavailable)
  function oneoraHaptic(pattern = 10) {
    try {
      if (navigator && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch {}
  }
  global.oneoraHaptic = oneoraHaptic;

  // 6 Pastel Categories (exact Design A · Pastel identity propagated everywhere)
  const PASTEL_CATEGORIES = {
    pdf: {
      key: 'pdf',
      label: 'PDF',
      subtitle: 'Reader, Scanner, Compress, Merge, Sign & Templates',
      svg: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/>',
      match: (t) => t.cat === 'pdf'
    },
    image: {
      key: 'image',
      label: 'Image',
      subtitle: 'Passport Photo, KB Reducer, Crop, Convert & OCR',
      svg: '<rect width="18" height="18" x="3" y="3" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
      match: (t) => t.cat === 'image'
    },
    office: {
      key: 'office',
      label: 'Office',
      subtitle: 'Excel Merger, Cleaner, PDF to Excel, CSV & ZIP',
      svg: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/>',
      match: (t) => t.cat === 'office'
    },
    lifemoney: {
      key: 'lifemoney',
      label: 'Life & Money',
      subtitle: 'Planner, Expenses, Budgets, Calculators & Daily Tools',
      svg: '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>',
      match: (t) => t.cat === 'life' || t.cat === 'finance' || t.cat === 'lifestyle' || t.cat === 'daily'
    },
    india: {
      key: 'india',
      label: 'India',
      subtitle: 'PAN, Aadhaar, Govt Portals, ID Card & Digital Verify',
      svg: '<path d="M3 22h18"/><path d="M6 18v-7"/><path d="M10 18v-7"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="m12 2 9 5H3l9-5Z"/>',
      match: (t) => t.cat === 'india' || t.id === 'idCardMaker' || t.id === 'imgResize' || t.id === 'pdfSigVerify'
    },
    vault: {
      key: 'vault',
      label: 'Vault',
      subtitle: 'Encrypted Document Center, Passwords & PDF Security',
      svg: '<rect x="3" y="11" width="18" height="11" rx="3"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
      match: (t) => t.cat === 'vault' || t.id === 'pdfSecurityTool' || t.id === 'oneoraExtrasTab'
    }
  };

  function getPastelCatForTool(tool) {
    if (!tool) return 'pdf';
    if (tool.cat === 'pdf') return 'pdf';
    if (tool.cat === 'image') return 'image';
    if (tool.cat === 'office') return 'office';
    if (tool.cat === 'india') return 'india';
    if (tool.cat === 'vault' || tool.cat === 'ai') return 'vault';
    if (tool.cat === 'life' || tool.cat === 'finance' || tool.cat === 'lifestyle' || tool.cat === 'daily') return 'lifemoney';
    return 'pdf';
  }

  function normalizePastelCat(cat) {
    if (!cat) return 'all';
    if (PASTEL_CATEGORIES[cat]) return cat;
    if (cat === 'life' || cat === 'finance' || cat === 'lifestyle' || cat === 'daily') return 'lifemoney';
    if (cat === 'ai') return 'vault';
    return 'all';
  }

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
     1. Navigation Engine (4 Pastel Bottom Tabs + Category Screens + Sheet)
     ======================================================================== */
  function openSection(sectionId, options = {}) {
    const sections = document.querySelectorAll('.tab-content');
    const target = document.getElementById(sectionId);
    if (!target) return;

    const prevToolId = activeToolId;
    // Re-lock Vault when leaving it while App Lock (PIN) is enabled
    if (prevToolId === 'documentCenter' && sectionId !== 'documentCenter' && hasVaultPin()) {
      vaultUnlocked = false;
      activeVaultKey = null;
      vaultBioAutoPrompted = false;
    }

    sections.forEach((sec) => {
      sec.classList.add('hidden');
      sec.classList.remove('flex');
    });
    target.classList.remove('hidden');
    target.classList.add('flex', 'flex-col');
    activeToolId = sectionId;

    // 4 primary bottom tabs (Home, Tools, AI, Vault)
    const topTabs = ['homeDashboard', 'allToolsHub', 'oneoraAiTab', 'documentCenter'];
    const isTopTab = topTabs.includes(sectionId);
    const isCategoryScreen = sectionId === 'pastelCategoryScreen';

    if (isTopTab) {
      toolOriginCat = null;
      if (sectionId === 'homeDashboard') activePastelCat = null;
    } else if (!isCategoryScreen) {
      toolOriginCat = options.fromCat || null;
    }

    // Show/hide pastel tool top bar when inside an individual tool screen
    const backBar = document.getElementById('toolContextBackBar');
    const backTitle = document.getElementById('toolContextTitle');
    const backSub = document.getElementById('toolContextSub');
    const backLabel = document.getElementById('toolContextBackLabel');
    const backIcon = document.getElementById('toolContextIconTile');
    const backPinBtn = document.getElementById('toolContextPinBtn');
    if (backBar) {
      const hideBackBar = isTopTab || isCategoryScreen;
      backBar.classList.toggle('hidden', hideBackBar);
      if (!hideBackBar) {
        const meta = TOOL_CATALOG.find((t) => t.id === sectionId && (!options.sub || t.sub === options.sub))
          || TOOL_CATALOG.find((t) => t.id === sectionId);
        const catKey = options.fromCat || getPastelCatForTool(meta);
        const catCfg = PASTEL_CATEGORIES[catKey];
        backBar.setAttribute('data-pastel-cat', catKey);
        if (backTitle) {
          backTitle.textContent = meta ? meta.name : (sectionId === 'profileSettingsTab' ? 'Profile & Settings' : 'ONEORA');
        }
        if (backSub) {
          backSub.textContent = meta
            ? `${catCfg ? catCfg.label + ' · ' : ''}${meta.desc}`
            : '100% offline · Private on device';
        }
        if (backIcon) {
          const vis = meta ? getToolVisual(meta) : { svg: (catCfg && catCfg.svg) || '<circle cx="12" cy="12" r="9"/>' };
          backIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${vis.svg}</svg>`;
        }
        if (backPinBtn) {
          const favKey = meta ? (meta.sub ? `${meta.id}:${meta.sub}` : meta.id) : '';
          backPinBtn.classList.toggle('hidden', !favKey);
          backPinBtn.setAttribute('data-active-fav-key', favKey);
          const isFav = favKey ? getFavourites().includes(favKey) : false;
          const svg = backPinBtn.querySelector('svg');
          if (svg) svg.setAttribute('fill', isFav ? 'currentColor' : 'none');
          backPinBtn.classList.toggle('!text-[#5B3FD0]', isFav);
        }
        if (backLabel) {
          backLabel.textContent = toolOriginCat && PASTEL_CATEGORIES[toolOriginCat]
            ? `Back to ${PASTEL_CATEGORIES[toolOriginCat].label}`
            : 'Back';
        }
      }
    }

    // Highlight active bottom nav & desktop rail button
    let activeNavKey = 'allToolsHub';
    if (isTopTab) activeNavKey = sectionId;
    else if (isCategoryScreen) activeNavKey = 'homeDashboard';
    document.querySelectorAll('.pb-nav-btn').forEach((btn) => {
      const match = btn.getAttribute('data-nav-target') === activeNavKey;
      btn.setAttribute('aria-current', match ? 'page' : 'false');
      btn.classList.toggle('pb-nav-active', match);
    });

    // Subtle haptic tap feedback on navigation
    if (!options.silent) oneoraHaptic(8);

    // Record tool usage if it's a functional tool
    if ((!isTopTab && !isCategoryScreen) || sectionId === 'documentCenter' || sectionId === 'oneoraPlannerTab' || sectionId === 'oneoraMoneyTab') {
      recordRecentTool(sectionId, options.sub || '');
    }

    if (options.sub && typeof global.openDailyUtilitySubTab === 'function' && sectionId === 'dailyUtilitiesHub') {
      const subBtn = document.querySelector(`.daily-subtab-btn[data-subtab="${options.sub}"]`);
      if (subBtn) subBtn.click();
    }

    if (sectionId === 'recentActivityTab') renderRecentActivityTab();
    if (sectionId === 'homeDashboard') renderHomeDynamicWidgets();
    if (sectionId === 'allToolsHub') renderAllToolsGrid();
    if (sectionId === 'documentCenter') refreshVaultView();
    if (sectionId === 'profileSettingsTab') refreshStorageOverview();
    if (sectionId === 'oneoraPlannerTab' && global.OneoraPlanner) global.OneoraPlanner.render();
    if (sectionId === 'oneoraMoneyTab' && global.OneoraMoney) global.OneoraMoney.render();
    if (sectionId === 'oneoraAiTab' && global.OneoraExtras) global.OneoraExtras.renderAi();
    if (sectionId === 'oneoraExtrasTab' && global.OneoraExtras) global.OneoraExtras.renderExtras();
    if (sectionId === 'oneoraCompanionTab' && global.OneoraCompanion) global.OneoraCompanion.render(options.sub || '');

    // Notify Stage 2 Shared Tool Template Controller
    document.dispatchEvent(new CustomEvent('oneora:sectionchange', {
      detail: { sectionId, sub: options.sub || '', fromCat: toolOriginCat || '' }
    }));

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  global.openPdfBondhuTool = openSection;

  // Dedicated Pastel Category Screen (Header + Back + Search + White-Tile Tool List)
  function openPastelCategory(catKey) {
    const resolved = PASTEL_CATEGORIES[catKey] ? catKey : normalizePastelCat(catKey);
    const cfg = PASTEL_CATEGORIES[resolved];
    if (!cfg) {
      openSection('allToolsHub');
      return;
    }

    activePastelCat = cfg.key;
    const screen = document.getElementById('pastelCategoryScreen');
    const iconEl = document.getElementById('pastelCatIconTile');
    const titleEl = document.getElementById('pastelCatTitle');
    const subEl = document.getElementById('pastelCatSubtitle');
    const searchEl = document.getElementById('pastelCatSearchInput');

    if (screen) screen.setAttribute('data-pastel-cat', cfg.key);
    if (iconEl) {
      iconEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${cfg.svg}</svg>`;
    }
    if (titleEl) titleEl.textContent = cfg.label;
    if (subEl) subEl.textContent = cfg.subtitle;
    if (searchEl) searchEl.value = '';

    renderPastelCategoryList(cfg.key, '');
    openSection('pastelCategoryScreen');
  }
  global.openPastelCategory = openPastelCategory;

  function renderPastelCategoryList(catKey, query = '') {
    const cfg = PASTEL_CATEGORIES[catKey];
    const listEl = document.getElementById('pastelCatToolsList');
    const countEl = document.getElementById('pastelCatCountText');
    if (!cfg || !listEl) return;

    const q = String(query || '').trim().toLowerCase();
    const allInCat = TOOL_CATALOG.filter((t) => cfg.match(t));
    const filtered = allInCat.filter((t) => !q || `${t.name} ${t.desc} ${t.keywords}`.toLowerCase().includes(q));

    if (countEl) {
      countEl.textContent = `${filtered.length} ${filtered.length === 1 ? 'tool' : 'tools'}`;
    }

    if (!filtered.length) {
      listEl.innerHTML = `
        <div class="oneora-empty-state flex flex-col items-center gap-2 py-10">
          <div class="pastel-white-tile !w-12 !h-12 mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
          <p class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">No matching tools in ${escHtml(cfg.label)}</p>
          <p class="text-xs text-[#5C506B] dark:text-[#C5B9DA]">Try another keyword or clear the filter.</p>
        </div>`;
      return;
    }

    const favs = getFavourites();
    listEl.innerHTML = filtered
      .map((tool, idx) => {
        const key = tool.sub ? `${tool.id}:${tool.sub}` : tool.id;
        const isFav = favs.includes(key);
        const vis = getToolVisual(tool);
        return `
          <div class="pastel-tool-row pastel-stagger" style="--stagger-i:${Math.min(idx, 12)}" data-sheet-tool="${tool.id}" data-sheet-sub="${tool.sub || ''}" data-sheet-cat="${cfg.key}" data-longpress-fav="${key}">
            <button type="button" class="pastel-row-open text-left flex items-center gap-3.5 flex-1 min-w-0 focus:outline-none min-h-[44px]">
              <span class="pastel-tool-row-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${vis.svg}</svg>
              </span>
              <div class="min-w-0 flex-1">
                <h3 class="text-sm sm:text-[15px] font-extrabold text-[#2B2236] dark:text-[#F5EEFF] truncate">${escHtml(tool.name)}</h3>
                <p class="text-xs text-[#5C506B] dark:text-[#C5B9DA] mt-0.5 line-clamp-1">${escHtml(tool.desc)}</p>
              </div>
            </button>
            <button type="button" data-fav-key="${key}" aria-label="${isFav ? 'Unpin favourite' : 'Pin favourite'}" class="pb-fav-btn w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition ${isFav ? 'text-[#5B3FD0] dark:text-[#CBBBFF] bg-white/85 dark:bg-[#17131F]/60 shadow-xs' : 'text-[#5C506B]/60 dark:text-[#C5B9DA]/50 hover:text-[#5B3FD0]'}">
              <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2.2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </button>
            <span class="text-[#5C506B] dark:text-[#C5B9DA] opacity-70 pr-0.5 pointer-events-none" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </span>
          </div>`;
      })
      .join('');

    bindPastelSheetRows(listEl);
  }

  // Bottom Sheet Preview (Tap tool -> Pastel Sheet -> Open real existing tool screen)
  function openPastelToolSheet(tool, catKey) {
    const sheet = document.getElementById('pastelToolSheet');
    if (!sheet || !tool) {
      if (tool) openSection(tool.id, { sub: tool.sub || '', fromCat: catKey || '' });
      return;
    }

    const resolvedCat = PASTEL_CATEGORIES[catKey] ? catKey : getPastelCatForTool(tool);
    const cfg = PASTEL_CATEGORIES[resolvedCat] || PASTEL_CATEGORIES.pdf;
    const vis = getToolVisual(tool);
    const key = tool.sub ? `${tool.id}:${tool.sub}` : tool.id;
    const isFav = getFavourites().includes(key);

    sheetToolCtx = { tool, catKey: resolvedCat, key };
    sheet.setAttribute('data-pastel-cat', resolvedCat);

    const iconEl = document.getElementById('pastelSheetIcon');
    const catLabelEl = document.getElementById('pastelSheetCatLabel');
    const titleEl = document.getElementById('pastelSheetTitle');
    const descEl = document.getElementById('pastelSheetDesc');
    const pinTextEl = document.getElementById('pastelSheetPinText');
    const pinBtn = document.getElementById('pastelSheetPinBtn');

    if (iconEl) {
      iconEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${vis.svg}</svg>`;
    }
    if (catLabelEl) catLabelEl.textContent = cfg.label;
    if (titleEl) titleEl.textContent = tool.name;
    if (descEl) descEl.textContent = tool.desc;
    if (pinTextEl) pinTextEl.textContent = isFav ? 'Pinned' : 'Pin';
    if (pinBtn) {
      const starSvg = pinBtn.querySelector('svg');
      if (starSvg) starSvg.setAttribute('fill', isFav ? 'currentColor' : 'none');
      pinBtn.classList.toggle('!text-[#5B3FD0]', isFav);
    }

    sheet.classList.remove('hidden');
    sheet.classList.add('flex');
    oneoraHaptic(12);
  }

  function closePastelToolSheet() {
    const sheet = document.getElementById('pastelToolSheet');
    if (!sheet) return;
    sheet.classList.add('hidden');
    sheet.classList.remove('flex');
  }
  global.closePastelToolSheet = closePastelToolSheet;

  function wirePastelSheetAndCategories() {
    // Home 6 Pastel Category Cards + Desktop Sidebar Pastel Links
    document.querySelectorAll('[data-open-pastel-cat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        oneoraHaptic(10);
        openPastelCategory(btn.getAttribute('data-open-pastel-cat'));
      });
    });

    // Category Screen Back Button & Live Filter
    const catBackBtn = document.getElementById('pastelCatBackBtn');
    if (catBackBtn) {
      catBackBtn.addEventListener('click', () => openSection('homeDashboard'));
    }
    const catSearch = document.getElementById('pastelCatSearchInput');
    if (catSearch) {
      catSearch.addEventListener('input', () => {
        if (activePastelCat) renderPastelCategoryList(activePastelCat, catSearch.value);
      });
    }

    // Tool Preview Bottom Sheet Controls
    const sheet = document.getElementById('pastelToolSheet');
    const closeBtn = document.getElementById('pastelSheetCloseBtn');
    const pinBtn = document.getElementById('pastelSheetPinBtn');
    const openBtn = document.getElementById('pastelSheetOpenBtn');

    if (closeBtn) closeBtn.addEventListener('click', closePastelToolSheet);
    if (sheet) {
      sheet.addEventListener('click', (e) => {
        if (e.target === sheet) closePastelToolSheet();
      });
    }
    if (pinBtn) {
      pinBtn.addEventListener('click', () => {
        if (!sheetToolCtx) return;
        const added = toggleFavourite(sheetToolCtx.key);
        const pinTextEl = document.getElementById('pastelSheetPinText');
        if (pinTextEl) pinTextEl.textContent = added ? 'Pinned' : 'Pin';
        const starSvg = pinBtn.querySelector('svg');
        if (starSvg) starSvg.setAttribute('fill', added ? 'currentColor' : 'none');
        pinBtn.classList.toggle('!text-[#5B3FD0]', added);
      });
    }
    if (openBtn) {
      openBtn.addEventListener('click', () => {
        if (!sheetToolCtx) return;
        const { tool, catKey } = sheetToolCtx;
        closePastelToolSheet();
        openSection(tool.id, { sub: tool.sub || '', fromCat: activeToolId === 'pastelCategoryScreen' ? catKey : '' });
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sheet && !sheet.classList.contains('hidden')) {
        closePastelToolSheet();
      }
    });
  }

  // Override legacy data-tab button routing smoothly so all old onclick handlers continue working
  function wireNavigation() {
    document.querySelectorAll('.pb-nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        openSection(btn.getAttribute('data-nav-target'));
      });
    });

    const backBtn = document.getElementById('toolContextBackBtn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (toolOriginCat && PASTEL_CATEGORIES[toolOriginCat]) {
          openPastelCategory(toolOriginCat);
        } else {
          openSection('homeDashboard');
        }
      });
    }

    const backPinBtn = document.getElementById('toolContextPinBtn');
    if (backPinBtn) {
      backPinBtn.addEventListener('click', () => {
        const favKey = backPinBtn.getAttribute('data-active-fav-key');
        if (!favKey) return;
        const added = toggleFavourite(favKey, true);
        const svg = backPinBtn.querySelector('svg');
        if (svg) svg.setAttribute('fill', added ? 'currentColor' : 'none');
        backPinBtn.classList.toggle('!text-[#5B3FD0]', added);
      });
    }

    // Support Android hardware back press smoothly
    const prevBack = global.handleAndroidBackPress;
    global.handleAndroidBackPress = () => {
      const resultModal = document.getElementById('pastelResultModal');
      if (resultModal && !resultModal.classList.contains('hidden')) {
        if (typeof global.closePastelResultScreen === 'function') global.closePastelResultScreen();
        return true;
      }
      const sheet = document.getElementById('pastelToolSheet');
      if (sheet && !sheet.classList.contains('hidden')) {
        closePastelToolSheet();
        return true;
      }
      if (typeof global.isOfficeDocFullscreenOpen === 'function' && global.isOfficeDocFullscreenOpen()) {
        if (typeof global.closeOfficeDocFullscreen === 'function') global.closeOfficeDocFullscreen();
        return true;
      }
      if (typeof global.isPdfReaderFullscreenOpen === 'function' && global.isPdfReaderFullscreenOpen()) {
        if (typeof global.closePdfReaderFullscreen === 'function') global.closePdfReaderFullscreen();
        return true;
      }
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
      if (activeToolId !== 'homeDashboard' && activeToolId !== 'pastelCategoryScreen' && toolOriginCat && PASTEL_CATEGORIES[toolOriginCat]) {
        openPastelCategory(toolOriginCat);
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
     2. Favourites (Tap Star + Long-Press Pin), Recent Tools & Docs
     ======================================================================== */
  function getFavourites() {
    return loadJson(FAV_KEY, ['pdfReaderTool', 'pdfScanner', 'pdfCompress', 'passportMaker', 'imageCompress']);
  }

  function toggleFavourite(toolKey, announce = false) {
    const favs = getFavourites();
    const idx = favs.indexOf(toolKey);
    const added = idx < 0;
    if (added) favs.unshift(toolKey);
    else favs.splice(idx, 1);
    saveJson(FAV_KEY, favs.slice(0, 12));
    oneoraHaptic(added ? [12, 24, 14] : 10);
    if (announce && global.utils && typeof global.utils.showToast === 'function') {
      const meta = findToolByKey(toolKey);
      global.utils.showToast(
        added ? 'Pinned to Favourites' : 'Removed from Favourites',
        meta ? meta.name : 'Updated your favourites list'
      );
    }
    renderHomeDynamicWidgets();
    renderAllToolsGrid();
    if (activeToolId === 'pastelCategoryScreen' && activePastelCat) {
      const q = document.getElementById('pastelCatSearchInput')?.value || '';
      renderPastelCategoryList(activePastelCat, q);
    }
    return added;
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
    documentCenter:   { bg: 'from-teal-500 to-emerald-600',   svg: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>' },
    oneoraPlannerTab: { bg: 'from-indigo-600 to-cyan-500',    svg: '<rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>' },
    oneoraMoneyTab:   { bg: 'from-emerald-600 to-teal-500',   svg: '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>' },
    oneoraAiTab:      { tone: 'tone-violet',  svg: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>' },
    oneoraExtrasTab:  { tone: '',             svg: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="9" y1="12" x2="15" y2="12"/>' },
    lifeplus:         { tone: 'tone-violet',  svg: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>' },
    doctemplates:     { tone: 'tone-blue',    svg: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/>' },
    lifestyle:        { tone: 'tone-emerald', svg: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>' },
    securityplus:     { tone: 'tone-emerald', svg: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>' }
  };

  function getToolTone(tool) {
    const vis = TOOL_VISUALS[tool.sub || tool.id] || TOOL_VISUALS[tool.id];
    if (vis && vis.tone !== undefined) return vis.tone;
    if (tool.cat === 'pdf') return 'tone-rose';
    if (tool.cat === 'image') return 'tone-blue';
    if (tool.cat === 'office' || tool.cat === 'finance' || tool.cat === 'vault' || tool.cat === 'lifestyle') return 'tone-emerald';
    if (tool.cat === 'daily' || tool.cat === 'india') return 'tone-amber';
    return 'tone-violet';
  }

  function getToolVisual(tool) {
    const vis = TOOL_VISUALS[tool.sub || tool.id] || TOOL_VISUALS[tool.id] || {
      svg: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>'
    };
    return { svg: vis.svg, tone: getToolTone(tool) };
  }

  function renderToolMiniCard(tool, showStar = true, explicitCat = '') {
    const key = tool.sub ? `${tool.id}:${tool.sub}` : tool.id;
    const isFav = getFavourites().includes(key);
    const vis = getToolVisual(tool);
    const catKey = explicitCat || getPastelCatForTool(tool);
    return `
      <div data-pastel-cat="${catKey}" data-sheet-tool="${tool.id}" data-sheet-sub="${tool.sub || ''}" data-sheet-cat="${catKey}" data-longpress-fav="${key}" class="pastel-tool-row group relative">
        <button type="button" class="pastel-row-open text-left flex items-center gap-3 flex-1 min-w-0 focus:outline-none min-h-[44px]">
          <span class="pastel-tool-row-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${vis.svg}</svg>
          </span>
          <div class="min-w-0 flex-1">
            <h4 class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF] group-hover:text-[#5B3FD0] dark:group-hover:text-[#CBBBFF] transition-colors truncate">${escHtml(tool.name)}</h4>
            <p class="text-xs text-[#5C506B] dark:text-[#C5B9DA] mt-0.5 line-clamp-1">${escHtml(tool.desc)}</p>
          </div>
        </button>
        ${showStar ? `<button type="button" data-fav-key="${key}" aria-label="${isFav ? 'Unpin favourite' : 'Pin favourite'}" class="pb-fav-btn w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition ${isFav ? 'text-[#5B3FD0] dark:text-[#CBBBFF]' : 'text-[#5C506B]/50 dark:text-[#C5B9DA]/45 hover:text-[#5B3FD0]'}">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2.2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        </button>` : `<span class="text-[#5C506B] font-bold text-sm pr-1">›</span>`}
      </div>
    `;
  }

  // Bind pastel tool rows: tap opens Bottom Sheet -> real tool; long-press (500ms) pins to favourites
  function bindPastelSheetRows(container) {
    if (!container) return;
    container.querySelectorAll('[data-sheet-tool]').forEach((row) => {
      const toolId = row.getAttribute('data-sheet-tool');
      const sub = row.getAttribute('data-sheet-sub') || '';
      const catKey = row.getAttribute('data-sheet-cat') || '';
      const favKey = row.getAttribute('data-longpress-fav') || (sub ? `${toolId}:${sub}` : toolId);
      const openBtn = row.querySelector('.pastel-row-open');

      let pressTimer = null;
      let didLongPress = false;

      const startLongPress = () => {
        didLongPress = false;
        clearTimeout(pressTimer);
        pressTimer = setTimeout(() => {
          didLongPress = true;
          toggleFavourite(favKey, true);
        }, 520);
      };
      const cancelLongPress = () => clearTimeout(pressTimer);

      if (openBtn) {
        openBtn.addEventListener('pointerdown', startLongPress);
        openBtn.addEventListener('pointerup', cancelLongPress);
        openBtn.addEventListener('pointerleave', cancelLongPress);
        openBtn.addEventListener('pointercancel', cancelLongPress);
        openBtn.addEventListener('click', (e) => {
          if (didLongPress) {
            e.preventDefault();
            didLongPress = false;
            return;
          }
          const tool = TOOL_CATALOG.find((t) => t.id === toolId && (!sub || t.sub === sub))
            || TOOL_CATALOG.find((t) => t.id === toolId);
          if (tool) openPastelToolSheet(tool, catKey);
        });
      }
    });

    container.querySelectorAll('.pb-fav-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavourite(btn.getAttribute('data-fav-key'), true);
      });
    });
  }

  function bindToolCards(container) {
    if (!container) return;
    bindPastelSheetRows(container);
    container.querySelectorAll('[data-open-tool]').forEach((btn) => {
      btn.addEventListener('click', () => {
        openSection(btn.getAttribute('data-open-tool'), { sub: btn.getAttribute('data-open-sub') || '' });
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
          <button type="button" data-open-tool="${t.id}" data-open-sub="${t.sub || ''}" class="pl-2 pr-3.5 py-1.5 rounded-xl bg-white dark:bg-[#151B2F] border border-[#E8EAF2] dark:border-[#232C4A] hover:border-[#7457E8] text-xs font-semibold text-[#171B2C] dark:text-[#F5F6FC] whitespace-nowrap shrink-0 transition min-h-[42px] flex items-center gap-2">
            <span class="oneora-icon-well ${vis.tone} !w-7 !h-7 !rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${vis.svg}</svg>
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
          <button type="button" data-open-tool="${t.id}" data-open-sub="${t.sub || ''}" class="pl-2 pr-3.5 py-1.5 rounded-xl bg-white dark:bg-[#151B2F] border border-[#E8EAF2] dark:border-[#232C4A] hover:border-[#7457E8] text-xs font-semibold text-[#171B2C] dark:text-[#F5F6FC] whitespace-nowrap shrink-0 transition min-h-[40px] flex items-center gap-2">
            <span class="oneora-icon-well ${vis.tone} !w-6 !h-6 !rounded-md">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${vis.svg}</svg>
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
        docsList.innerHTML = `
          <div class="oneora-empty-state flex flex-col items-center gap-2">
            <p class="text-xs font-semibold text-[#171B2C] dark:text-[#F5F6FC]">${escHtml(emptyTxt)}</p>
            <p class="text-[11px] text-[#777F91] dark:text-[#A5ADC2]">PDFs, invoices, resumes, and photos you process offline appear right here.</p>
            <button type="button" data-open-tool="pdfScanner" class="mt-1 px-3.5 py-2 rounded-xl bg-[#7457E8] hover:bg-[#5E42D4] text-white text-xs font-bold min-h-[36px] transition">Scan or Open a Document</button>
          </div>`;
        bindToolCards(docsList);
      } else {
        docsList.innerHTML = docs
          .map(
            (d) => `
            <div class="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-[#151B2F] border border-[#E8EAF2] dark:border-[#232C4A]">
              <div class="min-w-0">
                <div class="text-xs font-bold text-[#171B2C] dark:text-[#F5F6FC] truncate">${escHtml(d.name)}</div>
                <div class="text-[11px] text-[#777F91] dark:text-[#A5ADC2] tabular-nums mt-0.5">${global.utils.formatBytes(d.size)} · ${new Date(d.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
              </div>
              <button type="button" data-open-tool="${d.toolId || 'homeDashboard'}" class="px-3 py-1.5 rounded-lg bg-[#F3F0FF] dark:bg-[#7457E8]/20 text-[#7457E8] dark:text-[#C4B5FD] text-[11px] font-bold whitespace-nowrap min-h-[34px]">Repeat</button>
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
          ({ tool }) => {
            const pCat = getPastelCatForTool(tool);
            const vis = getToolVisual(tool);
            const label = PASTEL_CATEGORIES[pCat]?.label || tool.cat;
            return `
            <button type="button" data-open-tool="${tool.id}" data-open-sub="${tool.sub || ''}" data-pastel-cat="${pCat}" class="w-full text-left px-4 py-3 hover:bg-[#FFF7EE] dark:hover:bg-[#2B233B] flex items-center justify-between gap-3 border-b last:border-b-0 border-[var(--oneora-border)] min-h-[54px] transition">
              <div class="flex items-center gap-3 min-w-0">
                <span class="pastel-tool-row-icon !w-9 !h-9 !rounded-xl shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">${vis.svg}</svg>
                </span>
                <div class="min-w-0">
                  <div class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF] truncate">${escHtml(tool.name)}</div>
                  <div class="text-xs text-[#5C506B] dark:text-[#C5B9DA] truncate">${escHtml(tool.desc)}</div>
                </div>
              </div>
              <span class="text-[11px] font-extrabold text-[#5B3FD0] dark:text-[#CBBBFF] shrink-0">${escHtml(label)}</span>
            </button>`;
          }
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
     4. All Tools Hub (Pastel Filter Pills + Pinned Favourites + Grouped List)
     ======================================================================== */
  let currentAllToolsCat = 'all';

  const ALL_TOOLS_PASTEL_GROUPS = [
    { key: 'pdf',       label: 'PDF Studio' },
    { key: 'image',     label: 'Image & Photo Studio' },
    { key: 'office',    label: 'Office & Spreadsheets' },
    { key: 'lifemoney', label: 'Life & Money' },
    { key: 'india',     label: 'India Essentials' },
    { key: 'vault',     label: 'Vault & Security' }
  ];

  function renderAllToolsFavourites() {
    const block = document.getElementById('allToolsFavBlock');
    const row = document.getElementById('allToolsFavRow');
    if (!block || !row) return;
    const favTools = getFavourites().map(findToolByKey).filter(Boolean).slice(0, 8);
    block.classList.toggle('hidden', favTools.length === 0);
    row.innerHTML = favTools
      .map((t) => {
        const pCat = getPastelCatForTool(t);
        const vis = getToolVisual(t);
        return `
          <button type="button" data-open-tool="${t.id}" data-open-sub="${t.sub || ''}" data-pastel-cat="${pCat}" class="pl-2 pr-4 py-1.5 rounded-full bg-white dark:bg-[#221C2E] border border-[var(--oneora-border)] hover:border-[#5B3FD0] text-xs font-extrabold text-[#2B2236] dark:text-[#F5EEFF] whitespace-nowrap shrink-0 transition min-h-[44px] flex items-center gap-2 shadow-xs">
            <span class="pastel-tool-row-icon !w-7 !h-7 !rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">${vis.svg}</svg>
            </span>
            <span>${escHtml(t.name)}</span>
          </button>`;
      })
      .join('');
    bindToolCards(row);
  }

  function renderAllToolsGrid(filterCat = currentAllToolsCat) {
    currentAllToolsCat = normalizePastelCat(filterCat);
    const grid = document.getElementById('allToolsHubGrid');
    const searchVal = (document.getElementById('allToolsSearchInput')?.value || '').trim().toLowerCase();
    renderAllToolsFavourites();
    if (!grid) return;

    document.querySelectorAll('.alltools-cat-btn').forEach((btn) => {
      const act = btn.getAttribute('data-cat') === currentAllToolsCat;
      btn.className = act
        ? 'alltools-cat-btn px-4 py-2 rounded-full text-xs font-extrabold bg-[#5B3FD0] text-white whitespace-nowrap min-h-[44px] shadow-sm transition'
        : 'alltools-cat-btn px-4 py-2 rounded-full text-xs font-bold text-[#5C506B] dark:text-[#C5B9DA] bg-white dark:bg-[#221C2E] border border-[var(--oneora-border)] hover:border-[#5B3FD0] whitespace-nowrap min-h-[44px] transition';
    });

    const catCfg = PASTEL_CATEGORIES[currentAllToolsCat];
    const filtered = TOOL_CATALOG.filter((t) => {
      const catOk = currentAllToolsCat === 'all' || (catCfg ? catCfg.match(t) : t.cat === currentAllToolsCat);
      const qOk = !searchVal || `${t.name} ${t.desc} ${t.keywords}`.toLowerCase().includes(searchVal);
      return catOk && qOk;
    });

    if (!filtered.length) {
      grid.innerHTML = `
        <div class="oneora-empty-state py-10 flex flex-col items-center gap-1.5">
          <p class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">No tools match your search</p>
          <p class="text-xs text-[#5C506B] dark:text-[#C5B9DA]">Try another keyword like PDF, Passport, EMI, or Vault.</p>
        </div>`;
      return;
    }

    if (currentAllToolsCat === 'all' && !searchVal) {
      grid.innerHTML = ALL_TOOLS_PASTEL_GROUPS.map((grp) => {
        const cfg = PASTEL_CATEGORIES[grp.key];
        const items = TOOL_CATALOG.filter((t) => cfg && cfg.match(t));
        if (!items.length) return '';
        return `
          <div class="space-y-3" data-pastel-cat="${grp.key}">
            <div class="flex items-center justify-between px-1">
              <div class="flex items-center gap-2.5">
                <span class="w-3.5 h-3.5 rounded-full shrink-0" style="background:var(--cat-bg);border:1.5px solid var(--cat-accent);"></span>
                <h3 class="text-base font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">${grp.label}</h3>
              </div>
              <button type="button" data-open-pastel-cat-inline="${grp.key}" class="text-xs font-extrabold text-[#5B3FD0] dark:text-[#CBBBFF] min-h-[36px] px-2 flex items-center">${items.length} tools →</button>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              ${items.map((t) => renderToolMiniCard(t, true, grp.key)).join('')}
            </div>
          </div>
        `;
      }).join('');
    } else {
      const explicitCat = currentAllToolsCat === 'all' ? '' : currentAllToolsCat;
      grid.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          ${filtered.map((t) => renderToolMiniCard(t, true, explicitCat)).join('')}
        </div>
      `;
    }
    bindToolCards(grid);
    grid.querySelectorAll('[data-open-pastel-cat-inline]').forEach((b) => {
      b.addEventListener('click', () => openPastelCategory(b.getAttribute('data-open-pastel-cat-inline')));
    });
  }

  global.openAllToolsCategory = (cat) => {
    const resolved = normalizePastelCat(cat);
    if (resolved !== 'all' && PASTEL_CATEGORIES[resolved]) {
      openPastelCategory(resolved);
      return;
    }
    currentAllToolsCat = 'all';
    openSection('allToolsHub');
    renderAllToolsGrid('all');
  };

  function bindRecentSwipeRows(container) {
    if (!container) return;
    const rows = Array.from(container.querySelectorAll('.pastel-swipe-row'));

    function closeAllExcept(exceptRow) {
      rows.forEach((r) => {
        if (r !== exceptRow) {
          r.classList.remove('is-open', 'is-dragging');
          const c = r.querySelector('.pastel-swipe-card');
          if (c) c.style.transform = '';
        }
      });
    }

    rows.forEach((row) => {
      const card = row.querySelector('.pastel-swipe-card');
      const toggleBtn = row.querySelector('[data-swipe-toggle]');
      if (!card) return;

      if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          oneoraHaptic(8);
          const willOpen = !row.classList.contains('is-open');
          closeAllExcept(row);
          row.classList.toggle('is-open', willOpen);
          card.style.transform = '';
        });
      }

      let startX = 0;
      let startY = 0;
      let currentOffset = 0;
      let dragging = false;
      let lockedAxis = null;

      card.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button')) return;
        startX = e.clientX;
        startY = e.clientY;
        currentOffset = row.classList.contains('is-open') ? -196 : 0;
        dragging = true;
        lockedAxis = null;
      });

      card.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (!lockedAxis) {
          if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
          lockedAxis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
          if (lockedAxis === 'y') {
            dragging = false;
            return;
          }
          closeAllExcept(row);
          row.classList.add('is-dragging');
        }
        const nextX = Math.max(-210, Math.min(0, currentOffset + dx));
        card.style.transform = `translateX(${nextX}px)`;
      });

      function endDrag(e) {
        if (!dragging) return;
        dragging = false;
        row.classList.remove('is-dragging');
        if (lockedAxis !== 'x') return;
        const dx = e.clientX - startX;
        const finalX = currentOffset + dx;
        card.style.transform = '';
        if (finalX < -64) {
          row.classList.add('is-open');
          oneoraHaptic(8);
        } else {
          row.classList.remove('is-open');
        }
      }

      card.addEventListener('pointerup', endDrag);
      card.addEventListener('pointercancel', endDrag);
    });

    container.querySelectorAll('[data-recent-action]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const action = btn.getAttribute('data-recent-action');
        const idx = Number(btn.getAttribute('data-recent-idx'));
        const docs = loadJson(RECENT_DOCS_KEY, []);
        const item = docs[idx];
        if (!item) return;

        oneoraHaptic(10);
        if (action === 'open') {
          const target = item.toolId && document.getElementById(item.toolId) ? item.toolId : 'documentCenter';
          openSection(target);
        } else if (action === 'share') {
          const summary = `${item.name} (${global.utils.formatBytes(item.size)}) — processed offline with ONEORA`;
          if (navigator.share) {
            try {
              await navigator.share({ title: item.name, text: summary });
              return;
            } catch (_) {}
          }
          try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              await navigator.clipboard.writeText(summary);
              global.utils.showToast('Details Copied', 'Document summary copied to clipboard.', 'success');
              return;
            }
          } catch (_) {}
          global.utils.showToast('Ready in Vault', 'Open Vault to share the saved document file directly.', 'info');
        } else if (action === 'delete') {
          docs.splice(idx, 1);
          saveJson(RECENT_DOCS_KEY, docs);
          renderRecentActivityTab();
          global.utils.showToast('Removed from Recent', `"${item.name}" cleared from recent history.`, 'info');
        }
      });
    });
  }

  function renderRecentActivityTab() {
    const toolsWrap = document.getElementById('recentTabToolsList');
    const docsWrap = document.getElementById('recentTabDocsList');
    if (toolsWrap) {
      const rec = loadJson(RECENT_TOOLS_KEY, []).map(findToolByKey).filter(Boolean);
      toolsWrap.innerHTML = rec.length
        ? rec.map((t) => renderToolMiniCard(t, true)).join('')
        : `<div class="col-span-full pastel-empty-state">
            <span class="pastel-white-tile !w-12 !h-12 !rounded-[18px] !text-[#5B3FD0] dark:!text-[#CBBBFF]">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </span>
            <p class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">No recent tools yet</p>
            <p class="text-xs font-medium text-[#5C506B] dark:text-[#C5B9DA]">Open any PDF, Image, or India tool and it will appear here.</p>
          </div>`;
      bindToolCards(toolsWrap);
    }
    if (docsWrap) {
      const docs = loadJson(RECENT_DOCS_KEY, []);
      docsWrap.innerHTML = docs.length
        ? docs
            .map((d, idx) => {
              const safeName = escHtml(d.name || 'Document');
              const toolObj = findToolByKey(d.toolId);
              const cat = toolObj ? normalizePastelCat(toolObj.cat) : 'pdf';
              return `
              <div class="pastel-swipe-row pastel-stagger" style="--stagger-i:${Math.min(idx, 10)}" data-pastel-cat="${cat}">
                <div class="pastel-swipe-actions" aria-label="Document actions">
                  <button type="button" data-recent-action="open" data-recent-idx="${idx}" class="pastel-swipe-btn is-open" aria-label="Open tool for ${safeName}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    <span>Open</span>
                  </button>
                  <button type="button" data-recent-action="share" data-recent-idx="${idx}" class="pastel-swipe-btn is-share" aria-label="Share ${safeName}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                    <span>Share</span>
                  </button>
                  <button type="button" data-recent-action="delete" data-recent-idx="${idx}" class="pastel-swipe-btn is-delete" aria-label="Remove ${safeName}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                    <span>Remove</span>
                  </button>
                </div>
                <div class="pastel-swipe-card">
                  <div class="flex items-center gap-3 min-w-0 flex-1">
                    <span class="pastel-white-tile !w-11 !h-11 !rounded-[16px] shrink-0" style="background:var(--cat-bg, #E4D9FF);color:var(--cat-accent, #5B3FD0);">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    </span>
                    <div class="min-w-0 flex-1">
                      <div class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF] truncate">${safeName}</div>
                      <div class="text-xs font-semibold text-[#5C506B] dark:text-[#C5B9DA] tabular-nums mt-0.5">${global.utils.formatBytes(d.size)} · ${new Date(d.createdAt).toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                  <div class="flex items-center gap-1.5 shrink-0">
                    <button type="button" data-open-tool="${d.toolId || 'homeDashboard'}" class="px-3.5 py-2 rounded-full bg-[#E4D9FF] dark:bg-[#2D2347] text-[#3E26A0] dark:text-[#D7C9FF] text-xs font-extrabold whitespace-nowrap min-h-[44px]">Open</button>
                    <button type="button" data-swipe-toggle="1" aria-label="Show swipe actions for ${safeName}" title="Swipe actions" class="w-11 h-11 rounded-full bg-[var(--oneora-bg)] border border-[var(--oneora-border)] text-[#5C506B] dark:text-[#C5B9DA] inline-flex items-center justify-center shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/><circle cx="5" cy="12" r="1.3"/></svg>
                    </button>
                  </div>
                </div>
              </div>`;
            })
            .join('')
        : `<div class="pastel-empty-state">
            <span class="pastel-white-tile !w-12 !h-12 !rounded-[18px] !text-[#5B3FD0] dark:!text-[#CBBBFF]">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </span>
            <p class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">No processed documents yet</p>
            <p class="text-xs font-medium text-[#5C506B] dark:text-[#C5B9DA]">Scan, merge, or compress a file and swipe left here for quick actions.</p>
          </div>`;
      bindToolCards(docsWrap);
      bindRecentSwipeRows(docsWrap);
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
  let vaultBioAutoPrompted = false;
  let activeVaultKey = null; // CryptoKey when PIN is set
  let activeVaultFolder = 'All';
  let activeVaultTag = 'All';
  const VAULT_EXPIRY_KEY = 'oneoraDocExpiries_v1';

  function parseTagString(raw) {
    return Array.from(
      new Set(
        String(raw || '')
          .split(',')
          .map((t) => t.replace(/^#/, '').trim())
          .filter(Boolean)
          .map((t) => t.slice(0, 24))
      )
    ).slice(0, 8);
  }

  function loadVaultExpiries() {
    try {
      const arr = JSON.parse(localStorage.getItem(VAULT_EXPIRY_KEY) || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function saveVaultExpiries(arr) {
    try { localStorage.setItem(VAULT_EXPIRY_KEY, JSON.stringify(arr)); } catch {}
    document.dispatchEvent(new CustomEvent('oneora:plannerchange'));
  }

  function renderVaultExpiries() {
    const listEl = document.getElementById('vaultExpiryList');
    const badgeEl = document.getElementById('vaultExpiryCountBadge');
    if (!listEl) return;

    const list = loadVaultExpiries().sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
    if (badgeEl) {
      const urgentCount = list.filter((it) => {
        const days = Math.ceil((new Date(`${it.date}T00:00:00`).getTime() - Date.now()) / 86_400_000);
        return days <= 30;
      }).length;
      badgeEl.textContent = urgentCount > 0
        ? `${urgentCount} due soon · ${list.length} total`
        : `${list.length} tracked`;
    }

    if (!list.length) {
      listEl.innerHTML = `
        <div class="pastel-empty-state !py-6">
          <div class="w-12 h-12 rounded-2xl bg-[#FFF1A8] dark:bg-[#3A3219] text-[#6B5000] dark:text-[#FDE68A] flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <p class="text-xs font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">No expiry reminders yet</p>
          <p class="text-[11px] text-[#5C506B] dark:text-[#C5B9DA] max-w-xs">Tap <strong>+ Add reminder</strong> to track Passport, Driving Licence, Insurance, PAN/KYC, or Warranty dates.</p>
        </div>`;
      return;
    }

    listEl.innerHTML = list.map((it) => {
      const days = Math.ceil((new Date(`${it.date}T00:00:00`).getTime() - Date.now()) / 86_400_000);
      let badgeCls = 'bg-[#CFF3E2] dark:bg-[#1B362E] text-[#115E42] dark:text-[#A7F3D0]';
      let statusLabel = `${days}d left`;
      if (days < 0) {
        badgeCls = 'bg-[#FFD6D6] dark:bg-[#3D212B] text-[#8E1B3B] dark:text-[#FDA4AF]';
        statusLabel = `Expired ${Math.abs(days)}d ago`;
      } else if (days <= 30) {
        badgeCls = 'bg-[#FFF1A8] dark:bg-[#3A3219] text-[#6B5000] dark:text-[#FDE68A]';
        statusLabel = days === 0 ? 'Expires today' : `Due in ${days}d`;
      }
      return `
        <div class="pastel-inset-tile p-3.5 flex flex-wrap items-center justify-between gap-2.5">
          <div class="min-w-0 flex-1">
            <p class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF] truncate">${escHtml(it.title || it.doc || 'Document')}</p>
            <p class="text-[11px] font-semibold text-[#5C506B] dark:text-[#C5B9DA] tabular-nums mt-0.5">
              Expires ${escHtml(it.date || '')}${it.note ? ` · ${escHtml(it.note)}` : ''}
            </p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span class="px-3 py-1 rounded-full text-[11px] font-extrabold tabular-nums ${badgeCls}">${escHtml(statusLabel)}</span>
            <button type="button" data-vault-exp-del="${escHtml(it.id)}" aria-label="Delete expiry reminder" class="w-11 h-11 rounded-full bg-[#FFD6D6]/70 dark:bg-[#3D212B] text-[#8E1B3B] dark:text-[#FDA4AF] text-xs font-extrabold flex items-center justify-center transition">✕</button>
          </div>
        </div>`;
    }).join('');

    listEl.querySelectorAll('[data-vault-exp-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-vault-exp-del');
        const next = loadVaultExpiries().filter((x) => String(x.id) !== String(id));
        saveVaultExpiries(next);
        renderVaultExpiries();
        if (global.oneoraHaptic) global.oneoraHaptic(8);
        global.utils?.showToast?.('Removed', 'Expiry reminder deleted.', 'info');
      });
    });
  }

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
    const lockNowBtn = document.getElementById('vaultLockNowBtn');

    if (!lockGate || !contentWrap) return;

    const pinEnabled = hasVaultPin();
    if (pinStatus) {
      pinStatus.textContent = pinEnabled ? 'App Lock On · PIN & Fingerprint' : 'On-Device Vault · Unlocked';
    }
    if (lockNowBtn) {
      lockNowBtn.classList.toggle('hidden', !pinEnabled || !vaultUnlocked);
    }

    if (pinEnabled && !vaultUnlocked) {
      lockGate.classList.remove('hidden');
      contentWrap.classList.add('hidden');
      const canAndroidBio = Boolean(global.AndroidBridge && global.AndroidBridge.isBiometricAvailable && global.AndroidBridge.isBiometricAvailable());
      if (bioBtn) {
        bioBtn.classList.toggle('hidden', !canAndroidBio);
        if (!canAndroidBio && global.PublicKeyCredential && typeof global.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
          global.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
            .then((ok) => { if (ok) bioBtn.classList.remove('hidden'); })
            .catch(() => {});
        }
      }
      if (canAndroidBio && !vaultBioAutoPrompted && activeToolId === 'documentCenter') {
        vaultBioAutoPrompted = true;
        setTimeout(() => {
          try {
            if (!vaultUnlocked && global.AndroidBridge && global.AndroidBridge.authenticateBiometric) {
              global.AndroidBridge.authenticateBiometric('Unlock ONEORA Vault', 'Use fingerprint or device screen lock');
            }
          } catch {}
        }, 120);
      } else if (activeToolId === 'documentCenter') {
        setTimeout(() => { document.getElementById('vaultUnlockPinInput')?.focus(); }, 100);
      }
      return;
    }

    lockGate.classList.add('hidden');
    contentWrap.classList.remove('hidden');

    // Always keep expiry reminders synced inside Vault
    renderVaultExpiries();

    const folders = loadJson(VAULT_FOLDERS_KEY, ['Personal', 'ID Cards', 'Bills & Receipts', 'Study & Office']);

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

    const filterCard = document.getElementById('vaultFilterCard');
    const foldersRow = document.getElementById('vaultFoldersRow');
    const tagsRow = document.getElementById('vaultTagsRow');
    const searchSortRow = document.getElementById('vaultSearchSortRow');

    // Hide Folders/Tags filter card completely when Vault has no files
    if (filterCard) filterCard.classList.toggle('hidden', docs.length === 0);

    // Render Folders row only when there are files
    const folderBar = document.getElementById('vaultFoldersBar');
    const showFolders = docs.length > 0 && folders.length > 0;
    if (foldersRow) foldersRow.classList.toggle('hidden', !showFolders);
    if (folderBar && showFolders) {
      const allFolders = ['All', 'Favourites', ...folders];
      folderBar.innerHTML = allFolders
        .map(
          (f) => `<button type="button" data-folder="${escHtml(f)}" class="vault-folder-btn pastel-pill-tab ${
            activeVaultFolder === f ? 'is-active' : ''
          }">${escHtml(f)}</button>`
        )
        .join('');
      folderBar.querySelectorAll('.vault-folder-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          activeVaultFolder = btn.getAttribute('data-folder');
          if (global.oneoraHaptic) global.oneoraHaptic(8);
          refreshVaultView();
        });
      });
    }

    // Render Tag Filter Pills ONLY from real tags on stored documents; hide row when empty
    const tagsBar = document.getElementById('vaultTagsBar');
    const discoveredTags = new Set();
    docs.forEach((d) => {
      if (Array.isArray(d.tags)) d.tags.forEach((t) => t && discoveredTags.add(t));
    });
    const showTags = docs.length > 0 && discoveredTags.size > 0;
    if (tagsRow) tagsRow.classList.toggle('hidden', !showTags);
    if (searchSortRow) {
      searchSortRow.classList.toggle('border-t', showFolders || showTags);
      searchSortRow.classList.toggle('pt-2', showFolders || showTags);
    }
    if (tagsBar) {
      if (!showTags) {
        activeVaultTag = 'All';
        tagsBar.innerHTML = '';
      } else {
        const allTags = ['All', ...Array.from(discoveredTags)];
        if (!allTags.includes(activeVaultTag)) activeVaultTag = 'All';
        tagsBar.innerHTML = allTags
          .map(
            (t) => `<button type="button" data-vault-tag="${escHtml(t)}" class="px-3.5 py-2 rounded-full text-xs font-extrabold whitespace-nowrap min-h-[44px] transition ${
              activeVaultTag === t
                ? 'bg-[#5B3FD0] text-white shadow-sm'
                : 'bg-[#FFF7EE] dark:bg-[#17131F] text-[#5C506B] dark:text-[#C5B9DA] border border-[#2B2236]/10 dark:border-[#F5EEFF]/12'
            }">${t === 'All' ? 'All Tags' : '#' + escHtml(t)}</button>`
          )
          .join('');
        tagsBar.querySelectorAll('[data-vault-tag]').forEach((btn) => {
          btn.addEventListener('click', () => {
            activeVaultTag = btn.getAttribute('data-vault-tag') || 'All';
            if (global.oneoraHaptic) global.oneoraHaptic(6);
            refreshVaultView();
          });
        });
      }
    }

    const q = (document.getElementById('vaultSearchInput')?.value || '').trim().toLowerCase().replace(/^#/, '');
    const sortBy = document.getElementById('vaultSortSelect')?.value || 'date_desc';

    let list = docs.filter((d) => {
      const tags = Array.isArray(d.tags) ? d.tags : [];
      if (activeVaultFolder === 'Favourites' && !d.favourite) return false;
      if (activeVaultFolder !== 'All' && activeVaultFolder !== 'Favourites' && d.folder !== activeVaultFolder) return false;
      if (activeVaultTag !== 'All' && !tags.some((t) => t.toLowerCase() === activeVaultTag.toLowerCase())) return false;
      if (q) {
        const hay = `${d.name} ${d.folder || ''} ${tags.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sortBy === 'name' || sortBy === 'name_asc') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'size' || sortBy === 'size_desc') list.sort((a, b) => (b.size || 0) - (a.size || 0));
    else if (sortBy === 'fav') list.sort((a, b) => Number(Boolean(b.favourite)) - Number(Boolean(a.favourite)) || new Date(b.createdAt) - new Date(a.createdAt));
    else list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const listEl = document.getElementById('vaultFilesList');
    if (!listEl) return;

    if (!list.length) {
      listEl.innerHTML = `
        <div class="col-span-full pastel-empty-state">
          <div class="w-16 h-16 rounded-[22px] bg-[#E4D9FF] dark:bg-[#2D2347] text-[#5B3FD0] dark:text-[#CBBBFF] flex items-center justify-center shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="M9 12h6"/><path d="M12 9v6"/></svg>
          </div>
          <p class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">No documents found here</p>
          <p class="text-xs text-[#5C506B] dark:text-[#C5B9DA] max-w-sm">Tap <strong>Import Files</strong> above to keep IDs, bills, PDFs, or certificates privately encrypted on your device.</p>
        </div>`;
      return;
    }

    listEl.innerHTML = list
      .map((d) => {
        const ext = (String(d.name || '').split('.').pop() || 'FILE').toUpperCase().slice(0, 4);
        const tags = Array.isArray(d.tags) ? d.tags : [];
        return `
        <div class="pastel-stage3-card p-4 sm:p-5 flex flex-col gap-3.5">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-start gap-3 min-w-0 flex-1">
              <div class="w-12 h-12 rounded-2xl bg-[#E4D9FF] dark:bg-[#2D2347] text-[#432B9F] dark:text-[#E4D9FF] flex items-center justify-center text-[11px] font-extrabold shrink-0">
                ${escHtml(ext)}
              </div>
              <div class="min-w-0 flex-1">
                <div class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF] truncate">${escHtml(d.name)}</div>
                <div class="text-[11px] font-semibold text-[#5C506B] dark:text-[#C5B9DA] mt-0.5 tabular-nums">${escHtml(d.folder || 'Personal')} · ${global.utils.formatBytes(d.size)}${d.encrypted ? ' · AES-256' : ''}</div>
                ${tags.length ? `<div class="flex flex-wrap items-center gap-1.5 mt-2">${tags.map((t) => `<span class="pastel-tag-chip">#${escHtml(t)}</span>`).join('')}</div>` : ''}
              </div>
            </div>
            <button type="button" data-id="${d.id}" aria-label="Toggle favourite" class="vault-fav-btn w-11 h-11 rounded-full flex items-center justify-center text-lg transition ${d.favourite ? 'bg-[#FFF1A8] dark:bg-[#3A3219] text-[#A16207] dark:text-[#FDE68A]' : 'bg-[#FFF7EE] dark:bg-[#17131F] text-[#9A8FA8] hover:text-[#A16207]'}">★</button>
          </div>
          <div class="flex flex-wrap items-center gap-1.5 pt-3 border-t border-[#2B2236]/8 dark:border-[#F5EEFF]/10">
            <button type="button" data-id="${d.id}" class="vault-preview-btn px-3.5 py-2 rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white text-xs font-extrabold min-h-[44px] transition">Preview</button>
            <button type="button" data-id="${d.id}" class="vault-dl-btn px-3.5 py-2 rounded-full bg-[#FFF7EE] dark:bg-[#17131F] text-[#2B2236] dark:text-[#F5EEFF] border border-[#2B2236]/10 dark:border-[#F5EEFF]/12 text-xs font-bold min-h-[44px]">Save</button>
            <button type="button" data-id="${d.id}" class="vault-share-btn px-3.5 py-2 rounded-full bg-[#CFF3E2] dark:bg-[#1B362E] text-[#115E42] dark:text-[#A7F3D0] text-xs font-extrabold min-h-[44px]">Share</button>
            <button type="button" data-id="${d.id}" class="vault-tag-btn px-3.5 py-2 rounded-full bg-[#E4D9FF]/80 dark:bg-[#2D2347] text-[#3E26A0] dark:text-[#E4D9FF] text-xs font-bold min-h-[44px]">+ Tag</button>
            <button type="button" data-id="${d.id}" class="vault-ren-btn px-3 py-2 rounded-full bg-[#FFF7EE] dark:bg-[#17131F] text-[#5C506B] dark:text-[#C5B9DA] text-xs font-bold min-h-[44px]">Rename</button>
            <button type="button" data-id="${d.id}" class="vault-del-btn ml-auto px-3 py-2 rounded-full bg-[#FFD6D6]/70 dark:bg-[#3D212B] text-[#8E1B3B] dark:text-[#FDA4AF] text-xs font-extrabold min-h-[44px]">Delete</button>
          </div>
        </div>`;
      })
      .join('');

    const byId = new Map(list.map((d) => [d.id, d]));

    listEl.querySelectorAll('.vault-fav-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const rec = byId.get(btn.getAttribute('data-id'));
        if (!rec) return;
        rec.favourite = !rec.favourite;
        await vaultPut(rec);
        if (global.oneoraHaptic) global.oneoraHaptic(8);
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
            bodyEl.innerHTML = `<img src="${url}" alt="${escHtml(rec.name)}" class="max-w-full max-h-[68vh] mx-auto rounded-2xl shadow" />`;
          } else if (rec.mimeType === 'application/pdf' || rec.name.toLowerCase().endsWith('.pdf')) {
            bodyEl.innerHTML = `<canvas id="vaultPdfPreviewCanvas" class="max-w-full mx-auto rounded-xl shadow bg-white"></canvas>`;
            const pdfDoc = await window.pdfjsLib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
            const pg = await pdfDoc.getPage(1);
            const vp = pg.getViewport({ scale: 1.4 });
            const c = document.getElementById('vaultPdfPreviewCanvas');
            c.width = vp.width; c.height = vp.height;
            await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
          } else if ((rec.mimeType || '').startsWith('text/')) {
            const txt = await blob.text();
            bodyEl.innerHTML = `<pre class="text-xs font-mono whitespace-pre-wrap text-[#2B2236] dark:text-[#F5EEFF] p-3">${escHtml(txt.slice(0, 8000))}</pre>`;
          } else {
            bodyEl.innerHTML = `<p class="text-xs text-[#5C506B] dark:text-[#C5B9DA] text-center py-8">Preview not available for this file type. Use Save or Share.</p>`;
          }
          modal.classList.remove('hidden');
          modal.classList.add('flex');
        } catch {
          global.utils.showToast('Preview Failed', 'Could not decrypt or render this file.', 'error');
        }
      });
    });

    listEl.querySelectorAll('.vault-tag-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const rec = byId.get(btn.getAttribute('data-id'));
        if (!rec) return;
        const row = document.getElementById('vaultTagEditRow');
        const label = document.getElementById('vaultTagEditLabel');
        const input = document.getElementById('vaultTagEditInput');
        const saveBtn = document.getElementById('vaultTagEditSaveBtn');
        if (!row || !input || !saveBtn) return;
        row.classList.remove('hidden');
        if (label) label.textContent = `Tags for ${rec.name}`;
        input.value = Array.isArray(rec.tags) ? rec.tags.join(', ') : '';
        input.focus();
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        saveBtn.onclick = async () => {
          rec.tags = parseTagString(input.value);
          await vaultPut(rec);
          row.classList.add('hidden');
          if (global.oneoraHaptic) global.oneoraHaptic(10);
          refreshVaultView();
          global.utils.showToast('Tags Saved', rec.tags.length ? `Tagged with ${rec.tags.map((t) => '#' + t).join(' ')}` : 'Tags cleared.');
        };
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
        inlineWrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
        if (global.oneoraHaptic) global.oneoraHaptic(8);
        refreshVaultView();
        global.utils.showToast('Deleted', 'File removed from local Vault.');
      });
    });
  }

  function initDocumentCenter() {
    const importInput = document.getElementById('vaultImportInput');
    const importTagsInput = document.getElementById('vaultImportTagsInput');
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
    const renameCancelBtn = document.getElementById('vaultRenameCancelBtn');
    const tagCancelBtn = document.getElementById('vaultTagEditCancelBtn');
    const expiryForm = document.getElementById('vaultExpiryForm');

    if (closePrev) {
      closePrev.addEventListener('click', () => {
        const m = document.getElementById('vaultPreviewModal');
        if (m) { m.classList.add('hidden'); m.classList.remove('flex'); }
      });
    }

    if (renameCancelBtn) {
      renameCancelBtn.addEventListener('click', () => {
        document.getElementById('vaultRenameRow')?.classList.add('hidden');
      });
    }

    if (tagCancelBtn) {
      tagCancelBtn.addEventListener('click', () => {
        document.getElementById('vaultTagEditRow')?.classList.add('hidden');
      });
    }

    // Expiry "Add reminder" bottom sheet controls
    const expirySheet = document.getElementById('vaultExpirySheet');
    const openExpirySheetBtn = document.getElementById('vaultOpenExpirySheetBtn');
    const closeExpirySheetBtn = document.getElementById('vaultExpirySheetCloseBtn');
    const expirySheetBackdrop = document.getElementById('vaultExpirySheetBackdrop');

    function openExpirySheet() {
      if (!expirySheet) return;
      expirySheet.classList.remove('hidden');
      if (global.oneoraHaptic) global.oneoraHaptic(8);
      setTimeout(() => document.getElementById('vaultExpiryTypeSelect')?.focus(), 80);
    }

    function closeExpirySheet() {
      if (!expirySheet) return;
      expirySheet.classList.add('hidden');
    }

    if (openExpirySheetBtn) openExpirySheetBtn.addEventListener('click', openExpirySheet);
    if (closeExpirySheetBtn) closeExpirySheetBtn.addEventListener('click', closeExpirySheet);
    if (expirySheetBackdrop) expirySheetBackdrop.addEventListener('click', closeExpirySheet);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && expirySheet && !expirySheet.classList.contains('hidden')) {
        closeExpirySheet();
      }
    });

    if (expiryForm) {
      expiryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const typeSelect = document.getElementById('vaultExpiryTypeSelect');
        const docInput = document.getElementById('vaultExpiryDocInput');
        const dateInput = document.getElementById('vaultExpiryDateInput');
        const noteInput = document.getElementById('vaultExpiryNoteInput');
        const docType = String(typeSelect?.value || '').trim();
        const customTitle = String(docInput?.value || '').trim();
        const date = String(dateInput?.value || '').trim();
        const note = String(noteInput?.value || '').trim();
        if (!docType || !date) {
          global.utils?.showToast?.('Select Details', 'Choose a document type and expiry date.', 'info');
          return;
        }
        const title = customTitle ? (docType === 'Other' ? customTitle : `${docType} · ${customTitle}`) : docType;
        const list = loadVaultExpiries();
        list.unshift({
          id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          type: docType,
          title,
          date,
          note
        });
        saveVaultExpiries(list);
        if (typeSelect) typeSelect.value = '';
        if (docInput) docInput.value = '';
        if (dateInput) dateInput.value = '';
        if (noteInput) noteInput.value = '';
        closeExpirySheet();
        if (global.oneoraHaptic) global.oneoraHaptic(10);
        renderVaultExpiries();
        global.utils?.showToast?.('Expiry Saved', `Tracking "${title}" for ${date}.`, 'success');
      });
    }

    if (importInput) {
      importInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files || []);
        importInput.value = '';
        if (!files.length) return;
        const folder = document.getElementById('vaultUploadFolderSelect')?.value || 'Personal';
        const initialTags = parseTagString(importTagsInput?.value || '');
        global.utils.showLoader('Securing Files in Local Vault...', 'text-[#5B3FD0]');
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
              tags: initialTags,
              favourite: false,
              createdAt: new Date().toISOString(),
              ...payload
            });
          }
          if (importTagsInput) importTagsInput.value = '';
          await refreshVaultView();
          global.utils.showToast('Saved to Vault', `${files.length} file(s) stored locally${activeVaultKey ? ' with AES-256 encryption' : ''}.`);
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
          tags: [],
          favourite: false,
          createdAt: new Date().toISOString(),
          ...payload
        });
        await refreshVaultView();
        global.utils?.showToast?.('Saved to Vault', `"${filename}" stored safely in My Vault.`);
        return true;
      } catch (err) {
        console.error('Vault save helper error:', err);
        global.utils?.showToast?.('Vault Save Failed', 'Could not store file in My Vault.', 'error');
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
        if (global.oneoraHaptic) global.oneoraHaptic(8);
        refreshVaultView();
      });
    }

    if (searchInput) searchInput.addEventListener('input', refreshVaultView);
    if (sortSel) sortSel.addEventListener('change', refreshVaultView);

    if (pinUnlockBtn && pinInput) {
      const tryUnlockPin = async () => {
        const pin = pinInput.value.trim();
        const savedHash = localStorage.getItem(VAULT_PIN_HASH_KEY);
        if (!pin || (await sha256Hex(pin)) !== savedHash) {
          global.utils.showToast('Wrong PIN', 'Please enter your Vault PIN.', 'error');
          return;
        }
        activeVaultKey = await deriveAesKey(pin);
        vaultUnlocked = true;
        pinInput.value = '';
        if (global.oneoraHaptic) global.oneoraHaptic(12);
        refreshVaultView();
      };
      pinUnlockBtn.addEventListener('click', tryUnlockPin);
      pinInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); tryUnlockPin(); }
      });
    }

    if (bioUnlockBtn) {
      global.onAndroidBiometricResult = (ok, errMsg) => {
        if (ok) {
          vaultUnlocked = true;
          vaultBioAutoPrompted = false;
          refreshVaultView();
          global.utils.showToast('Biometric Verified', 'Personal Vault unlocked.');
        } else if (errMsg) {
          global.utils.showToast('Biometric Cancelled', errMsg, 'info');
        }
      };
      bioUnlockBtn.addEventListener('click', () => {
        if (global.AndroidBridge && global.AndroidBridge.authenticateBiometric) {
          global.AndroidBridge.authenticateBiometric('Unlock ONEORA Vault', 'Use fingerprint or device screen lock');
        } else {
          global.utils.showToast('Use Vault PIN', 'Fingerprint unlock runs inside the ONEORA Android app; enter your PIN above on web.', 'info');
          pinInput?.focus();
        }
      });
    }

    if (setPinBtn && setPinInput) {
      setPinBtn.addEventListener('click', async () => {
        const pin = setPinInput.value.trim();
        if (!pin) {
          if (hasVaultPin()) {
            localStorage.removeItem(VAULT_PIN_HASH_KEY);
            activeVaultKey = null;
            vaultUnlocked = true;
            vaultBioAutoPrompted = false;
            refreshVaultView();
            global.utils.showToast('Vault PIN Removed', 'Your Vault is now unlocked without a PIN.', 'info');
          } else {
            global.utils.showToast('Enter a PIN', 'Type a 4 to 8 digit numeric PIN to enable protection.', 'info');
          }
          return;
        }
        if (!/^\d{4,8}$/.test(pin)) {
          global.utils.showToast('Invalid PIN', 'Enter a 4 to 8 digit numeric PIN.', 'error');
          return;
        }
        localStorage.setItem(VAULT_PIN_HASH_KEY, await sha256Hex(pin));
        activeVaultKey = await deriveAesKey(pin);
        vaultUnlocked = true;
        vaultBioAutoPrompted = false;
        setPinInput.value = '';
        if (global.oneoraHaptic) global.oneoraHaptic(12);
        refreshVaultView();
        global.utils.showToast('Vault App Lock Enabled', 'Vault will ask for Fingerprint or PIN when reopened.');
      });
    }

    if (lockNowBtn) {
      lockNowBtn.addEventListener('click', () => {
        if (!hasVaultPin()) {
          global.utils.showToast('Set PIN First', 'Set a 4–8 digit PIN below to lock your Vault.', 'info');
          return;
        }
        vaultUnlocked = false;
        activeVaultKey = null;
        vaultBioAutoPrompted = false;
        if (global.oneoraHaptic) global.oneoraHaptic(10);
        refreshVaultView();
      });
    }

    // Re-lock Vault automatically when app moves to background while App Lock is enabled
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && hasVaultPin() && vaultUnlocked) {
        vaultUnlocked = false;
        activeVaultKey = null;
        vaultBioAutoPrompted = false;
        if (activeToolId === 'documentCenter') refreshVaultView();
      }
    });

    document.addEventListener('oneora:plannerchange', renderVaultExpiries);
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
      const init = (prof.name || 'ON').trim().slice(0, 2).toUpperCase();
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
      if (meta) meta.setAttribute('content', isDark ? '#0C1020' : '#10152A');

      document.querySelectorAll('[data-theme-mode]').forEach((btn) => {
        const act = btn.getAttribute('data-theme-mode') === mode;
        btn.classList.toggle('bg-[#7457E8]', act);
        btn.classList.toggle('text-white', act);
        btn.classList.toggle('border-[#7457E8]', act);
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
        title: 'Privacy Policy — ONEORA',
        html: `<p><strong>Offline-First On-Device Processing:</strong> Every PDF tool, image reducer, passport photo maker, OCR scan, Excel operation, planner entry, expense ledger, and encrypted vault runs locally on your device.</p>
               <p><strong>Optional Cloud Sync &amp; AI:</strong> Your documents are never uploaded unless you explicitly attach one to ONEORA AI or sign in with Google to sync Planner &amp; Money data to your private owner-only Firebase Firestore database.</p>
               <p><strong>Encrypted Local Vault:</strong> Files added to Personal Document Center with a Vault PIN are encrypted using Web Crypto PBKDF2 + AES-256-GCM in local IndexedDB.</p>
               <p><strong>Minimal Permissions:</strong> Camera, Notification, and Alarm permissions are requested strictly when you scan a document, scan QR, or set a reminder.</p>`
      },
      terms: {
        title: 'Terms & Conditions — ONEORA',
        html: `<p><strong>Personal &amp; Everyday Productivity:</strong> ONEORA (formerly PDF Bondhu) provides free offline-first document, planner, finance, and utility tools.</p>
               <p><strong>Independent Application:</strong> ONEORA is created by Suman Nayak and is <strong>not affiliated with or endorsed by any Government of India agency</strong>. Official links in India Essentials open official .gov.in / .nic.in portals.</p>
               <p><strong>Authorized Use Only:</strong> PDF Password Removal must only be used on documents you own or are legally authorized to unlock.</p>`
      },
      help: {
        title: 'Help & Support — ONEORA',
        html: `<p><strong>Where are my saved files stored?</strong> On Android APK, saved files go to <code>Downloads/ONEORA/</code> (or <code>Downloads/PDF Bondhu/</code>). On Web/Desktop, they save to your browser Downloads folder.</p>
               <p><strong>Does ONEORA work offline?</strong> Yes! Core PDF, Image, Office, Planner, Money Manager, Calculators, and Document Vault tools run completely offline in Airplane Mode.</p>
               <p><strong>Need assistance?</strong> Tap Send Feedback in Profile to reach developer Suman Nayak.</p>`
      },
      about: {
        title: 'About ONEORA v3.0.0',
        html: `<p><strong>ONEORA — One App, More Possibilities.</strong></p>
               <p>The next-generation evolution of PDF Bondhu: combining PDF Studio, Image Studio, Office Suite, My Daily Life Planner, Personal Finance Money Manager, Encrypted Document Vault, India Essentials, and Multilingual ONEORA AI in English, বাংলা, and हिन्दी.</p>
               <p><strong>App Developer:</strong> Suman Nayak<br/><strong>Version:</strong> 3.0.0 (ONEORA Super App Edition)</p>`
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
        const shareUrl = window.location.origin;
        const shareMsg = 'Try ONEORA — One App, More Possibilities. Offline-first PDF, Image, Office, Daily Planner, Money Manager & AI Super App: ' + shareUrl;
        if (global.AndroidBridge && global.AndroidBridge.shareText) {
          global.AndroidBridge.shareText('ONEORA — One App, More Possibilities', shareMsg);
        } else if (navigator.share) {
          navigator.share({ title: 'ONEORA', text: shareMsg, url: shareUrl }).catch(() => {});
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
        else global.utils.showToast('Thank You!', 'Thank you for supporting ONEORA!', 'info');
      });
    }
  }

  /* ========================================================================
     8. Instant Live OTA Auto-Update Engine (APK + Web + Installed PWA)
     ======================================================================== */
  const CURRENT_BUILD = '20261126-7';
  const CURRENT_VERSION = '3.0.0';

  function initLiveAutoUpdater() {
    const banner = document.getElementById('liveUpdateBanner');
    const applyBtn = document.getElementById('liveUpdateApplyBtn');
    const dismissBtn = document.getElementById('liveUpdateDismissBtn');
    const headerRefreshBtn = document.getElementById('headerRefreshUpdateBtn');
    const settingsCheckBtn = document.getElementById('settingsCheckUpdateBtn');
    const versionText = document.getElementById('settingsAppVersionText');

    if (versionText) {
      versionText.textContent = `ONEORA v${CURRENT_VERSION} · Build ${CURRENT_BUILD} · Auto-Updates Enabled`;
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
        global.utils.showToast('Checking Updates...', 'Syncing latest ONEORA version from server...', 'info');
        global.AndroidBridge.checkForUpdateNow();
        return;
      }

      if (manual) {
        global.utils.showToast('Checking Updates...', 'Looking for the latest ONEORA release...', 'info');
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
          global.utils.showToast('You Are Up to Date!', `ONEORA v${CURRENT_VERSION} is the latest version.`);
        }
      } catch {
        if (manual) {
          applyFreshReload();
        }
      }
    }

    // Native Android OTA callbacks
    global.onPdfBondhuUpdateReady = () => {
      showUpdateBanner('New ONEORA update downloaded! Tap Refresh — no new APK needed.');
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
            ? 'fb-type-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-[#7457E8] text-white shadow-sm'
            : 'fb-type-btn px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#F6F7FB] dark:bg-[#1D2540] text-[#647087] dark:text-[#A5ADC2]';
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
      const sender = (nameInput?.value || '').trim() || 'An ONEORA User';
      const msg = (msgInput?.value || '').trim();
      if (!msg) {
        global.utils.showToast('Write Your Feedback', 'Please type a short message or suggestion first.', 'error');
        return null;
      }
      const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
      const env = global.AndroidBridge ? 'Android APK' : 'Web / PWA';
      return `ONEORA v${CURRENT_VERSION} Feedback\nFrom: ${sender}\nRating: ${stars} (${rating}/5)\nTopic: ${fbType}\nPlatform: ${env}\n\nMessage:\n${msg}`;
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
        const subject = encodeURIComponent(`[ONEORA Feedback] ${fbType} (${rating}/5)`);
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
    wirePastelSheetAndCategories();
    initSmartSearch();
    initDocumentCenter();
    initIndiaEssentials();
    initProfileAndSettings();
    initLiveAutoUpdater();
    initFeedbackComposer();

    // Wire All Tools category buttons & search
    document.querySelectorAll('.alltools-cat-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        oneoraHaptic(8);
        renderAllToolsGrid(btn.getAttribute('data-cat'));
      });
    });
    const allSearch = document.getElementById('allToolsSearchInput');
    if (allSearch) allSearch.addEventListener('input', () => renderAllToolsGrid(currentAllToolsCat));

    // Wire Quick Actions & Legacy Category Triggers
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

    // In-App PWA Install Prompt (Chromium beforeinstallprompt + iOS Safari Guide)
    (function initPwaInstallUi() {
      let deferredInstallPrompt = null;
      const card = document.getElementById('settingsPwaInstallCard');
      const btn = document.getElementById('settingsInstallPwaBtn');
      const hint = document.getElementById('settingsPwaInstallHint');
      if (!btn || !card) return;

      const isStandalone =
        (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
        window.navigator.standalone === true ||
        Boolean(global.AndroidBridge);
      const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent || '');

      if (isStandalone) {
        btn.classList.add('hidden');
        if (hint) {
          hint.textContent = 'ONEORA is installed! Long-press the app icon for Scan, Merge PDF & Add Expense shortcuts, or share files directly to ONEORA.';
        }
        return;
      }

      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredInstallPrompt = e;
        btn.textContent = 'Install ONEORA App';
      });

      window.addEventListener('appinstalled', () => {
        deferredInstallPrompt = null;
        btn.classList.add('hidden');
        if (hint) hint.textContent = 'ONEORA is now installed on your device!';
        global.utils?.showToast?.('ONEORA Installed', 'App shortcuts & offline mode are ready.', 'success');
      });

      btn.addEventListener('click', async () => {
        oneoraHaptic(10);
        if (deferredInstallPrompt) {
          try {
            await deferredInstallPrompt.prompt();
            const choice = await deferredInstallPrompt.userChoice;
            if (choice && choice.outcome === 'accepted') {
              deferredInstallPrompt = null;
            }
          } catch (_) {}
          return;
        }
        if (isIos) {
          global.utils?.showToast?.('Install on iPhone / iPad', 'Tap the Share icon in Safari, then choose "Add to Home Screen".', 'info');
        } else {
          global.utils?.showToast?.('Install ONEORA', 'Open your browser menu (⋮) and tap "Install app" or "Add to Home screen".', 'info');
        }
      });
    })();

    // Handle "Open with ONEORA" PWA Share Target (?shared=1)
    async function consumePwaShareTarget() {
      try {
        if (!('caches' in window)) return;
        const cache = await caches.open('oneora-share-target-v1');
        const metaRes = await cache.match('./__oneora_shared_meta.json');
        if (!metaRes) return;

        const meta = await metaRes.json();
        const fileEntries = Array.isArray(meta.files) ? meta.files : [];
        const loadedFiles = [];

        for (let i = 0; i < fileEntries.length; i++) {
          const fMeta = fileEntries[i];
          const res = await cache.match(fMeta.key);
          if (!res) continue;
          const bytes = new Uint8Array(await res.arrayBuffer());
          loadedFiles.push({
            name: fMeta.name || `shared_${i + 1}`,
            mime: fMeta.type || res.headers.get('Content-Type') || 'application/octet-stream',
            bytes
          });
        }

        // Clear cache after reading so refreshes don't replay
        const keys = await cache.keys();
        await Promise.all(keys.map((k) => cache.delete(k)));

        if (loadedFiles.length > 1 && loadedFiles.every((f) => f.mime.startsWith('image/')) && typeof global._convertImagesToA4PdfBytes === 'function') {
          const pdfBytes = await global._convertImagesToA4PdfBytes(loadedFiles);
          if (typeof global._openPdfBytesInReader === 'function') {
            await global._openPdfBytesInReader(pdfBytes, `Shared_Photos_${loadedFiles.length}_Pages.pdf`);
            global.utils?.showToast?.('Opened in ONEORA', `Combined ${loadedFiles.length} shared photos into 1 clean PDF.`, 'success');
            return;
          }
        }

        if (loadedFiles.length >= 1 && typeof global.openUniversalDocumentFile === 'function') {
          const first = loadedFiles[0];
          await global.openUniversalDocumentFile(first.bytes, first.name, first.mime);
          global.utils?.showToast?.('Opened with ONEORA', `Loaded "${first.name}" offline on your device.`, 'success');
          return;
        }

        const sharedSnippet = [meta.title, meta.text, meta.url].filter(Boolean).join(' — ');
        if (sharedSnippet) {
          openSection('oneoraAiTab');
          const aiInput = document.getElementById('oneoraAiInput');
          if (aiInput) aiInput.value = sharedSnippet;
          global.utils?.showToast?.('Shared Text Received', 'Pasted into ONEORA workspace.', 'success');
        }
      } catch (err) {
        console.warn('PWA share target consume error:', err);
      }
    }

    // Route Home-Screen App Shortcuts (Scan, Merge PDF, Add Expense, Reader) & Share Target
    setTimeout(() => {
      try {
        const params = new URLSearchParams(window.location.search);
        const isShared = params.get('shared') === '1';
        const actionParam = params.get('action') || '';

        if (isShared) {
          consumePwaShareTarget();
          try {
            window.history.replaceState({}, document.title, window.location.pathname);
          } catch (_) {}
          return;
        }

        let shortcutTool = '';
        if (global.AndroidBridge && typeof global.AndroidBridge.getPendingShortcutTool === 'function') {
          shortcutTool = global.AndroidBridge.getPendingShortcutTool() || '';
        }
        if (!shortcutTool) {
          shortcutTool = params.get('shortcut') || '';
        }
        if (shortcutTool && document.getElementById(shortcutTool)) {
          openSection(shortcutTool);
          if (shortcutTool === 'oneoraMoneyTab' && actionParam === 'add_expense') {
            setTimeout(() => {
              const amountInput = document.getElementById('moneyTxAmount') || document.querySelector('#oneoraMoneyTab input[type="number"]');
              if (amountInput) {
                amountInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                amountInput.focus();
              }
              global.utils?.showToast?.('Add Expense Shortcut', 'Enter amount & category to record offline.', 'info');
            }, 260);
          }
          try {
            window.history.replaceState({}, document.title, window.location.pathname);
          } catch (_) {}
        }
      } catch (e) {
        console.warn('Shortcut route check failed:', e);
      }
    }, 220);
  });
})(window);
