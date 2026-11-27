/**
 * ONEORA · Stage 2 Shared Pastel Tool Screen Template Controller (Design A · Pastel)
 * Enhances all existing PDF, Image, Office, India & Daily tool screens into one cohesive template:
 *  - Category pastel top bar + back + favourite pin (preserves category colour everywhere)
 *  - Big dashed rounded upload zones with drag-and-drop & white icon tiles
 *  - Clean collapsible <details> options sections (preserves ALL inner element IDs & listeners)
 *  - Sticky bottom primary button synced live with each tool's real action button
 *  - Friendly Result Screen with soft success animation + Open / Share / Save / Save to Vault
 */
(function (global) {
  'use strict';

  // Map every tool section to its Pastel Category, primary action button/input, and upload config
  const TOOL_CONFIG = {
    // PDF (#FFD6D6)
    pdfMerge:        { cat: 'pdf', actionId: 'pdfMergeActionBtn',         inputId: 'pdfMergeInput',       uploadTitle: 'Drop PDFs here or tap to browse',      uploadHint: 'Select 2 or more PDF files to merge offline',          dropzoneInject: true },
    pdfSplit:        { cat: 'pdf', actionId: 'pdfSplitActionBtn',         inputId: 'pdfSplitInput',       uploadTitle: 'Drop a PDF to extract pages',          uploadHint: 'Extract exact pages or ranges locally',                collapsibleSelectors: ['#pdfSplitRange'] },
    pdfCompress:     { cat: 'pdf', actionId: 'pdfCompressActionBtn',      inputId: 'pdfCompressInput',    uploadTitle: 'Choose PDF or drop it here',           uploadHint: 'Shrink to exact KB/MB or tune DPI offline',            collapsibleBlocks: [{ elId: 'pdfCompressAdvPanel', title: 'Advanced Compression Options', open: false }] },
    pdfOrganize:     { cat: 'pdf', actionId: 'pdfOrganizeActionBtn',      inputId: 'pdfOrganizeInput',    uploadTitle: 'Upload a PDF to organize pages',       uploadHint: 'Rotate, reorder, or remove pages visually',            dropzoneInject: true },
    pdfWatermark:    { cat: 'pdf', actionId: 'pdfWmActionBtn',            inputId: 'pdfWmInput',          uploadTitle: 'Choose a PDF to watermark',            uploadHint: 'Stamp custom watermark text & page numbers' },
    pdfScanner:      { cat: 'pdf', actionId: 'pdfScannerActionBtn',       inputId: 'pdfScannerInput',     uploadTitle: 'Scan or import document pages',        uploadHint: 'Auto 4-corner crop, Magic Color & instant PDF' },
    pdfSign:         { cat: 'pdf', actionId: 'pdfSignSaveBtn',            inputId: 'pdfSignInput',        uploadTitle: 'Select a PDF to sign & attest',        uploadHint: 'Draw or upload signature & place on any page' },
    textToPdf:       { cat: 'pdf', actionId: 'textPdfGenerateBtn',        inputId: null,                  uploadTitle: null },
    pdfMetadataTool: { cat: 'pdf', actionId: 'metaToolSaveBtn',           inputId: 'metaToolInput',       uploadTitle: 'Select a PDF to edit metadata',        uploadHint: 'Update Title, Author, Subject & Creation Date' },
    pdfSigVerify:    { cat: 'pdf', actionId: 'sigVerifyDownloadReportBtn',inputId: 'sigVerifyInput',      fallbackTriggerInput: true, primaryLabel: 'Choose PDF to Verify' },
    pdfRepair:       { cat: 'pdf', actionId: 'pdfRepairActionBtn',        inputId: 'pdfRepairInput',      uploadTitle: 'Select a damaged PDF to rescue',       uploadHint: 'Rebuilds broken XRef tables & recovers pages' },
    pdfEdit:         { cat: 'pdf', actionId: 'pdfEditSaveBtn',            inputId: 'pdfEditInput',        uploadTitle: 'Choose a PDF to edit & annotate',      uploadHint: 'Add text, highlight, whiteout, draw & insert images',  dropzoneInject: true },
    pdfSecurityTool: { cat: 'pdf', actionId: 'pdfLockActionBtn',          altActionId: 'pdfUnlockActionBtn', inputId: 'pdfLockInput' },
    pdfToImgTool:    { cat: 'pdf', actionId: 'pdfToImgRenderBtn',         altActionId: 'pdfToImgZipBtn',  inputId: 'pdfToImgInput',       uploadTitle: 'Choose a PDF to export as images',     uploadHint: 'Export crisp JPG or lossless PNG pages + ZIP',         dropzoneInject: true },
    pdfCompareTool:  { cat: 'pdf', actionId: 'pdfCompareRunBtn',          inputId: 'pdfCompareInputA' },
    pdfReaderTool:   { cat: 'pdf', actionId: 'pdfReaderPickBtn',          inputId: 'pdfReaderFileInput' },
    oneoraExtrasTab: { cat: 'pdf', actionId: null,                        inputId: null },

    // Image (#D6E8FF)
    passportMaker:   { cat: 'image', actionId: 'passportDownloadSheetPdfBtn', inputId: 'passportPhotoInput', uploadTitle: 'Upload a portrait photo',            uploadHint: '35×45mm India, PAN, Visa & printable A4 sheet' },
    imageCompress:   { cat: 'image', actionId: 'imgCompressActionBtn',    inputId: 'imgCompressInput',    uploadTitle: 'Drop photos here to shrink to KB',     uploadHint: 'Hit exact 20KB, 50KB, 100KB or custom target',         dropzoneInject: true },
    imgToPdf:        { cat: 'image', actionId: 'imgToPdfActionBtn',       inputId: 'imgToPdfInput',       uploadTitle: 'Add JPG, PNG, or WebP photos',         uploadHint: 'Combine photos into one clean paginated PDF',          dropzoneInject: true },
    imgResize:       { cat: 'image', actionId: 'imgResizeActionBtn',      inputId: 'imgResizeInput',      uploadTitle: 'Upload photo or signature to resize',  uploadHint: 'Exact px & KB presets for PAN, SSC & UPSC forms' },
    idCardMaker:     { cat: 'image', actionId: 'idCardGenerateBtn',       inputId: 'idFrontInput' },
    imgCropTool:     { cat: 'image', actionId: 'imgCropSaveBtn',          inputId: 'imgCropToolInput',    uploadTitle: 'Choose an image to crop or rotate',    uploadHint: 'Free, 1:1, 4:3, 16:9 & Passport ratios offline',       dropzoneInject: true },
    imgConvert:      { cat: 'image', actionId: 'imgConvertActionBtn',     inputId: 'imgConvertInput',     uploadTitle: 'Drop images to convert format',        uploadHint: 'Convert offline between JPG, PNG, and WebP',           dropzoneInject: true },
    ocrScanner:      { cat: 'image', actionId: 'ocrStartBtn',             inputId: 'ocrInput',            uploadTitle: 'Upload image or PDF for OCR',          uploadHint: 'Extract English & Bengali text 100% locally' },

    // Office (#CFF3E2)
    excelMerge:      { cat: 'office', actionId: 'excelMergeActionBtn',    inputId: 'excelMergeInput',     uploadTitle: 'Drop Excel or CSV files to merge',     uploadHint: 'Combine multiple spreadsheets cleanly offline',        dropzoneInject: true },
    excelCleaner:    { cat: 'office', actionId: null,                     inputId: 'excelCleanerInput',   fallbackTriggerInput: true, primaryLabel: 'Upload & Clean Spreadsheet' },
    pdfToExcel:      { cat: 'office', actionId: null,                     inputId: 'pdfToExcelInput',     fallbackTriggerInput: true, primaryLabel: 'Choose PDF to Convert (.xlsx)' },
    csvViewerTool:   { cat: 'office', actionId: 'csvToXlsxBtn',           inputId: 'csvToolInput',        uploadTitle: 'Open CSV or Excel spreadsheet',        uploadHint: 'Inspect, search & convert CSV ↔ XLSX locally',         dropzoneInject: true },
    zipStudioTool:   { cat: 'office', actionId: 'zipCreateActionBtn',     altActionId: 'zipExtractAllBtn', inputId: 'zipCreateInput' },

    // India (#FFF1A8) & Life/Daily (#FFE7C2)
    indiaEssentials:   { cat: 'india',     actionId: null, inputId: null },
    dailyUtilitiesHub: { cat: 'lifemoney', actionId: null, inputId: null }
  };

  let stickyObserver = null;
  let activeStickyTarget = null;
  let activeToolSectionId = 'homeDashboard';
  let lastResultCtx = null; // { blob, filename, catKey }
  let suppressResultOverlay = false;

  function haptic(pattern = 10) {
    if (typeof global.oneoraHaptic === 'function') global.oneoraHaptic(pattern);
  }

  /* ========================================================================
     1. Enhance Every Tool Section with Category Pastel, Upload Zone & Accordions
     ======================================================================== */
  function enhanceToolScreens() {
    Object.entries(TOOL_CONFIG).forEach(([secId, cfg]) => {
      const sec = document.getElementById(secId);
      if (!sec || sec.dataset.pastelEnhanced === '1') return;
      sec.dataset.pastelEnhanced = '1';
      sec.setAttribute('data-pastel-cat', cfg.cat);
      sec.classList.add('pastel-tool-screen');

      // Mark duplicate old top heading block so the Pastel Top Bar stays the single clean header
      const firstChild = sec.firstElementChild;
      if (firstChild && firstChild.tagName === 'DIV' && firstChild.querySelector('h2') && !firstChild.classList.contains('oneora-surface')) {
        firstChild.classList.add('pastel-legacy-tool-heading');
      }

      // Upgrade existing dashed upload zones & enable drag-and-drop file assignment
      sec.querySelectorAll('.border-dashed').forEach((dz) => {
        const fileInput = dz.querySelector('input[type="file"]');
        if (fileInput) {
          dz.classList.add('pastel-upload-zone');
          attachDragDrop(dz, fileInput);
        }
      });

      // For toolbar-style tools without a big dashed zone, inject a clean linked Pastel Upload Zone
      if (cfg.dropzoneInject && cfg.inputId) {
        injectLinkedUploadZone(sec, cfg);
      }

      // Convert secondary options blocks into smooth collapsible <details> sections
      enhanceCollapsibleOptions(sec, secId);
    });
  }

  function attachDragDrop(zoneEl, inputEl) {
    if (!zoneEl || !inputEl || zoneEl.dataset.dndBound === '1') return;
    zoneEl.dataset.dndBound = '1';

    ['dragenter', 'dragover'].forEach((ev) => {
      zoneEl.addEventListener(ev, (e) => {
        e.preventDefault();
        e.stopPropagation();
        zoneEl.classList.add('is-dragover');
      });
    });
    ['dragleave', 'drop'].forEach((ev) => {
      zoneEl.addEventListener(ev, (e) => {
        e.preventDefault();
        e.stopPropagation();
        zoneEl.classList.remove('is-dragover');
      });
    });
    zoneEl.addEventListener('drop', (e) => {
      const files = e.dataTransfer && e.dataTransfer.files;
      if (!files || !files.length) return;
      try {
        const dt = new DataTransfer();
        Array.from(files).forEach((f) => dt.items.add(f));
        inputEl.files = dt.files;
        inputEl.dispatchEvent(new Event('change', { bubbles: true }));
        haptic(12);
      } catch (err) {
        console.warn('Drag-and-drop assign skipped:', err);
      }
    });
  }

  function injectLinkedUploadZone(sec, cfg) {
    const realInput = document.getElementById(cfg.inputId);
    if (!realInput) return;

    // Find the main card container right inside the section
    const mainCard = Array.from(sec.children).find(
      (el) => el.tagName === 'DIV' && !el.classList.contains('pastel-legacy-tool-heading')
    );
    if (!mainCard) return;

    const zone = document.createElement('label');
    zone.setAttribute('for', cfg.inputId);
    zone.className = 'pastel-upload-zone pastel-injected-upload cursor-pointer';
    zone.innerHTML = `
      <span class="pastel-white-tile !w-14 !h-14 !rounded-[20px]">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      </span>
      <div class="space-y-1">
        <span class="block text-sm sm:text-base font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">${cfg.uploadTitle || 'Tap to choose files'}</span>
        <span class="block text-xs font-medium text-[#5C506B] dark:text-[#C5B9DA]">${cfg.uploadHint || '100% offline · Files stay private on your device'}</span>
      </div>
      <span class="pastel-upload-status text-xs font-extrabold text-[#5B3FD0] dark:text-[#CBBBFF] hidden"></span>
    `;

    attachDragDrop(zone, realInput);

    // Show live file-selected summary pill on the upload zone without touching existing handlers
    realInput.addEventListener('change', () => {
      const statusEl = zone.querySelector('.pastel-upload-status');
      const count = realInput.files ? realInput.files.length : 0;
      if (statusEl) {
        if (count > 0) {
          const firstName = realInput.files[0].name;
          statusEl.textContent = count === 1 ? `Selected: ${firstName}` : `${count} files selected`;
          statusEl.classList.remove('hidden');
          zone.classList.add('has-files');
        } else {
          statusEl.classList.add('hidden');
          zone.classList.remove('has-files');
        }
      }
      haptic(10);
      syncStickyBarState();
    });

    sec.insertBefore(zone, mainCard);
  }

  // Safely wrap existing option blocks into <details class="pastel-collapsible">
  // Moving existing DOM nodes via appendChild preserves ALL event listeners & JS references!
  function wrapInCollapsible(targetEl, title, subtitle = '', openByDefault = true) {
    if (!targetEl || !targetEl.parentNode || targetEl.closest('.pastel-collapsible')) return;
    const details = document.createElement('details');
    details.className = 'pastel-collapsible';
    if (openByDefault) details.setAttribute('open', '');

    const summary = document.createElement('summary');
    summary.className = 'pastel-collapsible-summary';
    summary.innerHTML = `
      <div class="flex items-center gap-3 min-w-0">
        <span class="pastel-collapsible-dot" aria-hidden="true"></span>
        <div class="min-w-0">
          <span class="block text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF] truncate">${title}</span>
          ${subtitle ? `<span class="block text-[11px] font-medium text-[#5C506B] dark:text-[#C5B9DA] truncate">${subtitle}</span>` : ''}
        </div>
      </div>
      <svg class="pastel-collapsible-chevron w-5 h-5 shrink-0 text-[#5C506B] dark:text-[#C5B9DA]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
    `;

    const body = document.createElement('div');
    body.className = 'pastel-collapsible-body';

    targetEl.parentNode.insertBefore(details, targetEl);
    body.appendChild(targetEl);
    details.appendChild(summary);
    details.appendChild(body);
  }

  function enhanceCollapsibleOptions(sec, secId) {
    if (secId === 'pdfCompress') {
      const targetPanel = document.getElementById('pdfCompressTargetPanel');
      const manualPanel = document.getElementById('pdfCompressManualPanel');
      const advPanel = document.getElementById('pdfCompressAdvPanel');
      if (targetPanel && targetPanel.parentNode) {
        const parent = targetPanel.parentNode;
        const modeBar = targetPanel.previousElementSibling;
        const group = document.createElement('div');
        group.className = 'space-y-4';
        parent.insertBefore(group, modeBar || targetPanel);
        if (modeBar) group.appendChild(modeBar);
        group.appendChild(targetPanel);
        if (manualPanel) group.appendChild(manualPanel);
        if (advPanel) group.appendChild(advPanel);
        wrapInCollapsible(group, 'Compression Options', 'Target KB/MB, DPI, quality & grayscale', true);
      }
    } else if (secId === 'pdfWatermark') {
      const wmText = document.getElementById('pdfWmText');
      const grid = wmText && wmText.closest('.grid');
      if (grid) wrapInCollapsible(grid, 'Watermark & Page Number Options', 'Text, opacity, position & numbering', true);
    } else if (secId === 'imageCompress') {
      const kbPanel = document.getElementById('imgReduceKbPanel');
      if (kbPanel) wrapInCollapsible(kbPanel, 'Target Size (KB) Options', 'Exact KB limit & quick exam presets', true);
    } else if (secId === 'imgResize') {
      const presetArea = sec.querySelector('.grid');
      if (presetArea && presetArea.querySelector('input[type="number"]')) {
        wrapInCollapsible(presetArea, 'Dimensions & Exam Presets', 'Width, height, DPI & KB limits', true);
      }
    } else if (secId === 'textToPdf') {
      const firstGrid = sec.querySelector('.grid');
      if (firstGrid) wrapInCollapsible(firstGrid, 'Document Formatting Options', 'Title, font size, margins & page layout', false);
    } else if (secId === 'pdfSecurityTool') {
      const lockPw = document.getElementById('pdfLockPassword')?.parentNode;
      if (lockPw) wrapInCollapsible(lockPw, 'Password Protection Settings', '128-bit local PDF open password', true);
    } else if (secId === 'pdfCompareTool') {
      const pageNum = document.getElementById('pdfComparePageNum')?.closest('.flex');
      if (pageNum) wrapInCollapsible(pageNum, 'Comparison Options', 'Select page preview & run diff', true);
    }
  }

  /* ========================================================================
     2. Sticky Bottom Primary Action Bar (Synced Live with Active Tool Button)
     ======================================================================== */
  function resolveActiveActionButton(secId) {
    const cfg = TOOL_CONFIG[secId];
    if (!cfg) return null;

    if (cfg.actionId) {
      const primary = document.getElementById(cfg.actionId);
      const alt = cfg.altActionId ? document.getElementById(cfg.altActionId) : null;

      // If primary is hidden (e.g. Unlock tab active in pdfSecurityTool) and alt is visible, use alt
      if (primary && !isElementHidden(primary)) {
        if (alt && !isElementHidden(alt) && primary.disabled && !alt.disabled) {
          return { el: alt, isInput: false, cfg };
        }
        return { el: primary, isInput: false, cfg };
      }
      if (alt && !isElementHidden(alt)) {
        return { el: alt, isInput: false, cfg };
      }
      if (primary && !cfg.fallbackTriggerInput) {
        return { el: primary, isInput: false, cfg };
      }
    }

    if (cfg.fallbackTriggerInput && cfg.inputId) {
      const inp = document.getElementById(cfg.inputId);
      if (inp) return { el: inp, isInput: true, cfg };
    }
    return null;
  }

  function isElementHidden(el) {
    if (!el) return true;
    if (el.classList.contains('hidden')) return true;
    let cur = el.parentElement;
    while (cur && cur.tagName !== 'SECTION') {
      if (cur.classList.contains('hidden')) return true;
      cur = cur.parentElement;
    }
    return false;
  }

  function syncStickyBarForSection(secId) {
    activeToolSectionId = secId;
    const bar = document.getElementById('pastelStickyActionBar');
    const btn = document.getElementById('pastelStickyPrimaryBtn');
    const labelEl = document.getElementById('pastelStickyPrimaryLabel');
    const hintEl = document.getElementById('pastelStickyHint');
    if (!bar || !btn || !labelEl) return;

    if (stickyObserver) {
      stickyObserver.disconnect();
      stickyObserver = null;
    }

    const resolved = resolveActiveActionButton(secId);
    if (!resolved) {
      bar.classList.add('hidden');
      document.body.classList.remove('has-pastel-sticky-bar');
      activeStickyTarget = null;
      return;
    }

    activeStickyTarget = resolved;
    bar.setAttribute('data-pastel-cat', resolved.cfg.cat);
    bar.classList.remove('hidden');
    document.body.classList.add('has-pastel-sticky-bar');

    syncStickyBarState();

    // Observe the real button/section for disabled/text/tab switches
    const sec = document.getElementById(secId);
    if (sec && typeof MutationObserver !== 'undefined') {
      stickyObserver = new MutationObserver(() => {
        activeStickyTarget = resolveActiveActionButton(activeToolSectionId);
        syncStickyBarState();
      });
      stickyObserver.observe(sec, {
        attributes: true,
        subtree: true,
        attributeFilter: ['disabled', 'class'],
        childList: true
      });
    }

    if (hintEl) {
      hintEl.textContent = resolved.isInput ? 'Select a file to run offline' : '100% offline processing';
    }
  }

  function syncStickyBarState() {
    const bar = document.getElementById('pastelStickyActionBar');
    const btn = document.getElementById('pastelStickyPrimaryBtn');
    const labelEl = document.getElementById('pastelStickyPrimaryLabel');
    if (!bar || !btn || !labelEl || !activeStickyTarget) return;

    if (activeStickyTarget.isInput) {
      btn.disabled = false;
      labelEl.textContent = activeStickyTarget.cfg.primaryLabel || 'Choose File';
    } else {
      const realBtn = activeStickyTarget.el;
      btn.disabled = Boolean(realBtn.disabled);
      const cleanText = (realBtn.textContent || '').replace(/\s+/g, ' ').trim();
      labelEl.textContent = cleanText || 'Continue';
    }
  }

  function initStickyBarControls() {
    const btn = document.getElementById('pastelStickyPrimaryBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (!activeStickyTarget || btn.disabled) return;
      haptic(14);
      activeStickyTarget.el.click();
    });
  }

  /* ========================================================================
     3. Friendly Result Screen (Soft Success Animation + Open / Share / Save)
     ======================================================================== */
  function openPastelResultScreen(blob, filename) {
    const modal = document.getElementById('pastelResultModal');
    if (!modal || !blob) return;

    const cfg = TOOL_CONFIG[activeToolSectionId];
    const catKey = (cfg && cfg.cat) || 'pdf';
    lastResultCtx = { blob, filename: filename || 'ONEORA_File', catKey };

    modal.setAttribute('data-pastel-cat', catKey);

    const nameEl = document.getElementById('pastelResultFileName');
    const metaEl = document.getElementById('pastelResultFileMeta');
    const badgeEl = document.getElementById('pastelResultFileExt');
    const checkRing = document.getElementById('pastelResultCheckRing');

    const safeName = lastResultCtx.filename;
    const ext = (safeName.split('.').pop() || 'FILE').toUpperCase().slice(0, 5);
    const sizeText = global.utils && typeof global.utils.formatBytes === 'function'
      ? global.utils.formatBytes(blob.size)
      : `${Math.max(1, Math.round((blob.size || 0) / 1024))} KB`;

    if (nameEl) nameEl.textContent = safeName;
    if (metaEl) metaEl.textContent = `${sizeText} · Saved offline on your device`;
    if (badgeEl) badgeEl.textContent = ext;

    // Retrigger soft checkmark pop animation
    if (checkRing) {
      checkRing.classList.remove('pastel-result-animate');
      void checkRing.offsetWidth;
      checkRing.classList.add('pastel-result-animate');
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    haptic([12, 30, 18]);
  }

  function closePastelResultScreen() {
    const modal = document.getElementById('pastelResultModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  global.closePastelResultScreen = closePastelResultScreen;

  function initResultScreen() {
    const modal = document.getElementById('pastelResultModal');
    const closeBtn = document.getElementById('pastelResultCloseBtn');
    const doneBtn = document.getElementById('pastelResultDoneBtn');
    const openBtn = document.getElementById('pastelResultOpenBtn');
    const shareBtn = document.getElementById('pastelResultShareBtn');
    const saveBtn = document.getElementById('pastelResultSaveBtn');
    const vaultBtn = document.getElementById('pastelResultVaultBtn');

    if (!modal) return;

    if (closeBtn) closeBtn.addEventListener('click', closePastelResultScreen);
    if (doneBtn) doneBtn.addEventListener('click', closePastelResultScreen);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closePastelResultScreen();
    });

    // OPEN right inside ONEORA's built-in Ad-Free Universal Document Reader
    if (openBtn) {
      openBtn.addEventListener('click', async () => {
        if (!lastResultCtx || !lastResultCtx.blob) return;
        haptic(10);
        const { blob, filename } = lastResultCtx;
        closePastelResultScreen();
        try {
          if (typeof global.openUniversalDocumentFile === 'function') {
            const bytes = new Uint8Array(await blob.arrayBuffer());
            await global.openUniversalDocumentFile(bytes, filename, blob.type || '');
            return;
          }
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.target = '_blank';
          a.rel = 'noopener';
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 10000);
        } catch (err) {
          console.error('Result open failed:', err);
          if (global.utils) global.utils.showToast('Open File', 'Saved in your Downloads folder.', 'info');
        }
      });
    }

    // SHARE via Web Share API (native Android/Mobile share sheet) with graceful fallback
    if (shareBtn) {
      shareBtn.addEventListener('click', async () => {
        if (!lastResultCtx || !lastResultCtx.blob) return;
        haptic(12);
        const { blob, filename } = lastResultCtx;
        try {
          const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
          if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
            await navigator.share({
              title: filename,
              text: `Created offline with ONEORA`,
              files: [file]
            });
            return;
          }
          if (navigator.share) {
            await navigator.share({ title: filename, text: `Created offline with ONEORA: ${filename}` });
            return;
          }
          if (global.utils) {
            global.utils.showToast('Share Ready', 'File is saved in your Downloads folder — attach it from WhatsApp or Mail.', 'info');
          }
        } catch (err) {
          if (err && err.name === 'AbortError') return;
          if (global.utils) {
            global.utils.showToast('Saved Locally', 'Share sheet unavailable here — use Save to download a copy.', 'info');
          }
        }
      });
    }

    // SAVE AGAIN without re-opening the result overlay
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        if (!lastResultCtx || !lastResultCtx.blob || !global.utils) return;
        haptic(12);
        suppressResultOverlay = true;
        try {
          global.utils.downloadBlob(lastResultCtx.blob, lastResultCtx.filename);
          global.utils.showToast('Saved Again', lastResultCtx.filename, 'success');
        } finally {
          setTimeout(() => { suppressResultOverlay = false; }, 120);
        }
      });
    }

    // SAVE TO VAULT (1-tap IndexedDB / AES-256 Personal Document Center)
    if (vaultBtn) {
      vaultBtn.addEventListener('click', async () => {
        if (!lastResultCtx || !lastResultCtx.blob) return;
        haptic(12);
        try {
          if (typeof global.saveBlobToPdfBondhuVault === 'function') {
            await global.saveBlobToPdfBondhuVault(
              lastResultCtx.blob,
              lastResultCtx.filename,
              lastResultCtx.blob.type || 'application/octet-stream',
              'Personal'
            );
          } else if (global.utils) {
            global.utils.showToast('Vault Ready', 'Open the Vault tab to organize your saved files.', 'info');
          }
        } catch (err) {
          console.error('Save to vault failed:', err);
          if (global.utils) global.utils.showToast('Vault Save Failed', 'Could not store file in Vault.', 'error');
        }
      });
    }

    // Hook into utils.downloadBlob cleanly AFTER india-vault.js hooks it
    hookResultScreenIntoDownload();

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        closePastelResultScreen();
      }
    });
  }

  function hookResultScreenIntoDownload() {
    if (!global.utils || typeof global.utils.downloadBlob !== 'function' || global.utils._pastelResultHooked) return;
    const prevDownload = global.utils.downloadBlob.bind(global.utils);
    global.utils.downloadBlob = function (blob, filename) {
      const res = prevDownload(blob, filename);
      try {
        if (!suppressResultOverlay && blob && TOOL_CONFIG[activeToolSectionId]) {
          // Slight delay so browser download prompt / loader hides smoothly first
          setTimeout(() => openPastelResultScreen(blob, filename), 220);
        }
      } catch (err) {
        console.warn('Result screen skipped:', err);
      }
      return res;
    };
    global.utils._pastelResultHooked = true;
  }

  /* ========================================================================
     4. Initialize Stage 2 Controller
     ======================================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    // Run right after app.js & india-vault.js finish binding their DOM listeners
    setTimeout(() => {
      enhanceToolScreens();
      initStickyBarControls();
      initResultScreen();
      hookResultScreenIntoDownload();
    }, 0);

    document.addEventListener('oneora:sectionchange', (e) => {
      const secId = e && e.detail ? e.detail.sectionId : 'homeDashboard';
      syncStickyBarForSection(secId);
    });
  });

  global.OneoraToolTemplate = {
    syncStickyBarForSection,
    openPastelResultScreen,
    closePastelResultScreen
  };
})(window);
