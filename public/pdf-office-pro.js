/**
 * PDF Bondhu 2.0 - Extended PDF Studio, Image Studio & Office Studio Modules
 * Includes:
 * - PDF Security: Authorized PDF Unlock & Real PDF Password Protection (RC4-128 Standard Security)
 * - PDF to Images (JPG/PNG + Bulk ZIP)
 * - PDF Comparison (Side-by-Side Visual + Text Diff)
 * - Image Cropper Studio (Cropper.js)
 * - CSV Viewer, Spreadsheet Preview & CSV <-> Excel Converter
 * - ZIP Creator & ZIP Extractor (JSZip)
 */
(function (global) {
  document.addEventListener('DOMContentLoaded', () => {
    initPdfReaderTool();
    initOfficeDocReader();
    initPdfSecurityTool();
    initPdfToImgTool();
    initPdfCompareTool();
    initImageCropStudio();
    initCsvSpreadsheetTool();
    initZipStudioTool();
  });

  /* ========================================================================
     Pure-JS PDF 1.4 Standard Security Handler (V=2, R=3, 128-bit RC4)
     Used to apply genuine user password protection to PDFs 100% locally.
     ======================================================================== */
  const PDFCrypto = (function () {
    const PADDING = new Uint8Array([
      0x28, 0xbf, 0x4e, 0x5e, 0x4e, 0x75, 0x8a, 0x41,
      0x64, 0x00, 0x4e, 0x56, 0xff, 0xfa, 0x01, 0x08,
      0x2e, 0x2e, 0x00, 0xb6, 0xd0, 0x68, 0x3e, 0x80,
      0x2f, 0x0c, 0xa9, 0xfe, 0x64, 0x53, 0x69, 0x7a
    ]);

    function md5(inputBytes) {
      const bytes = inputBytes instanceof Uint8Array ? inputBytes : new Uint8Array(inputBytes);
      const len = bytes.length;
      const bitLen = len * 8;
      const paddedLen = (((len + 8) >> 6) + 1) * 64;
      const buf = new Uint8Array(paddedLen);
      buf.set(bytes);
      buf[len] = 0x80;
      const dv = new DataView(buf.buffer);
      dv.setUint32(paddedLen - 8, bitLen >>> 0, true);
      dv.setUint32(paddedLen - 4, Math.floor(bitLen / 0x100000000) >>> 0, true);

      const s = [
        7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
        5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
        4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
        6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
      ];
      const K = new Uint32Array(64);
      for (let i = 0; i < 64; i++) {
        K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000) >>> 0;
      }

      let a0 = 0x67452301;
      let b0 = 0xefcdab89;
      let c0 = 0x98badcfe;
      let d0 = 0x10325476;

      for (let off = 0; off < paddedLen; off += 64) {
        const M = new Uint32Array(16);
        for (let j = 0; j < 16; j++) M[j] = dv.getUint32(off + j * 4, true);

        let A = a0, B = b0, C = c0, D = d0;
        for (let i = 0; i < 64; i++) {
          let F, g;
          if (i < 16) { F = (B & C) | (~B & D); g = i; }
          else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
          else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
          else { F = C ^ (B | ~D); g = (7 * i) % 16; }
          const tmp = D;
          D = C;
          C = B;
          const sum = (A + F + K[i] + M[g]) >>> 0;
          B = (B + (((sum << s[i]) | (sum >>> (32 - s[i]))) >>> 0)) >>> 0;
          A = tmp;
        }
        a0 = (a0 + A) >>> 0;
        b0 = (b0 + B) >>> 0;
        c0 = (c0 + C) >>> 0;
        d0 = (d0 + D) >>> 0;
      }

      const out = new Uint8Array(16);
      const outDv = new DataView(out.buffer);
      outDv.setUint32(0, a0, true);
      outDv.setUint32(4, b0, true);
      outDv.setUint32(8, c0, true);
      outDv.setUint32(12, d0, true);
      return out;
    }

    function rc4(key, data) {
      const S = new Uint8Array(256);
      for (let i = 0; i < 256; i++) S[i] = i;
      let j = 0;
      for (let i = 0; i < 256; i++) {
        j = (j + S[i] + key[i % key.length]) & 255;
        const t = S[i]; S[i] = S[j]; S[j] = t;
      }
      const out = new Uint8Array(data.length);
      let a = 0, b = 0;
      for (let idx = 0; idx < data.length; idx++) {
        a = (a + 1) & 255;
        b = (b + S[a]) & 255;
        const t = S[a]; S[a] = S[b]; S[b] = t;
        out[idx] = data[idx] ^ S[(S[a] + S[b]) & 255];
      }
      return out;
    }

    function padPassword(pwd) {
      const enc = new TextEncoder().encode(pwd || '');
      const out = new Uint8Array(32);
      const take = Math.min(32, enc.length);
      out.set(enc.subarray(0, take), 0);
      if (take < 32) out.set(PADDING.subarray(0, 32 - take), take);
      return out;
    }

    function concatBytes(...arrays) {
      const total = arrays.reduce((s, a) => s + a.length, 0);
      const out = new Uint8Array(total);
      let off = 0;
      for (const a of arrays) { out.set(a, off); off += a.length; }
      return out;
    }

    function toHex(bytes) {
      return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
    }

    function computeObjectKey(fileKey, objNum, genNum) {
      const extra = new Uint8Array([
        objNum & 0xff, (objNum >> 8) & 0xff, (objNum >> 16) & 0xff,
        genNum & 0xff, (genNum >> 8) & 0xff
      ]);
      const hash = md5(concatBytes(fileKey, extra));
      return hash.subarray(0, Math.min(fileKey.length + 5, 16));
    }

    // Encrypts a PDFDocument (pdf-lib) cleanly with Standard Security V=2 R=3 (128-bit RC4)
    async function encryptPdfLibDoc(pdfDoc, userPassword, ownerPassword) {
      const { PDFHexString, PDFName, PDFNumber, PDFString, PDFRawStream } = window.PDFLib;
      const uPwd = userPassword || '';
      const oPwd = ownerPassword || (uPwd + '_owner_pdfbondhu');
      const keyLen = 16; // 128-bit
      const P = -4; // Standard print + copy permissions flag (0xFFFFFFFC)

      // Generate deterministic 16-byte File ID
      const fileId = new Uint8Array(16);
      crypto.getRandomValues(fileId);

      // Compute O (Owner value, Algorithm 3)
      let oHash = md5(padPassword(oPwd));
      for (let i = 0; i < 50; i++) oHash = md5(oHash);
      const oRc4Key = oHash.subarray(0, keyLen);
      let O = rc4(oRc4Key, padPassword(uPwd));
      for (let i = 1; i <= 19; i++) {
        const k = new Uint8Array(oRc4Key.length);
        for (let j = 0; j < k.length; j++) k[j] = oRc4Key[j] ^ i;
        O = rc4(k, O);
      }

      // Compute File Encryption Key (Algorithm 2)
      const pBytes = new Uint8Array(4);
      new DataView(pBytes.buffer).setInt32(0, P, true);
      let fk = md5(concatBytes(padPassword(uPwd), O, pBytes, fileId));
      for (let i = 0; i < 50; i++) fk = md5(fk.subarray(0, keyLen));
      const fileKey = fk.subarray(0, keyLen);

      // Compute U (User value, Algorithm 5)
      const uHash = md5(concatBytes(PADDING, fileId));
      let U16 = rc4(fileKey, uHash);
      for (let i = 1; i <= 19; i++) {
        const k = new Uint8Array(fileKey.length);
        for (let j = 0; j < k.length; j++) k[j] = fileKey[j] ^ i;
        U16 = rc4(k, U16);
      }
      const U = concatBytes(U16, new Uint8Array(16));

      // Re-save cleanly with useObjectStreams: false so every indirect object is standard PDF 1.4
      const cleanBytes = await pdfDoc.save({ useObjectStreams: false });
      const freshDoc = await window.PDFLib.PDFDocument.load(cleanBytes);
      const context = freshDoc.context;

      // Encrypt every indirect PDFStream and PDFString/PDFHexString inside indirect objects
      function encryptObjectDeep(obj, objKey) {
        if (!obj) return;
        if (obj instanceof PDFRawStream) {
          obj.contents = rc4(objKey, obj.contents);
          encryptObjectDeep(obj.dict, objKey);
        } else if (obj instanceof PDFString) {
          const raw = obj.asBytes();
          const enc = rc4(objKey, raw);
          // Replace in-place via internal value hex representation
          obj.value = Array.from(enc).map((b) => String.fromCharCode(b)).join('');
        } else if (obj instanceof PDFHexString) {
          const raw = obj.asBytes();
          const enc = rc4(objKey, raw);
          obj.value = toHex(enc);
        } else if (obj.dict && obj.dict instanceof Map) {
          for (const [k, v] of obj.dict.entries()) {
            const keyName = k && typeof k.asString === 'function' ? k.asString() : '';
            if (keyName === '/ID' || keyName === '/Encrypt') continue;
            if (v instanceof PDFString) {
              obj.dict.set(k, PDFHexString.of(toHex(rc4(objKey, v.asBytes()))));
            } else if (v instanceof PDFHexString) {
              obj.dict.set(k, PDFHexString.of(toHex(rc4(objKey, v.asBytes()))));
            } else {
              encryptObjectDeep(v, objKey);
            }
          }
        } else if (obj.array && Array.isArray(obj.array)) {
          for (let i = 0; i < obj.array.length; i++) {
            const v = obj.array[i];
            if (v instanceof PDFString) {
              obj.array[i] = PDFHexString.of(toHex(rc4(objKey, v.asBytes())));
            } else if (v instanceof PDFHexString) {
              obj.array[i] = PDFHexString.of(toHex(rc4(objKey, v.asBytes())));
            } else {
              encryptObjectDeep(v, objKey);
            }
          }
        }
      }

      for (const [ref, obj] of context.enumerateIndirectObjects()) {
        const objKey = computeObjectKey(fileKey, ref.objectNumber, ref.generationNumber || 0);
        if (obj instanceof PDFString) {
          context.assign(ref, PDFHexString.of(toHex(rc4(objKey, obj.asBytes()))));
        } else if (obj instanceof PDFHexString) {
          context.assign(ref, PDFHexString.of(toHex(rc4(objKey, obj.asBytes()))));
        } else {
          encryptObjectDeep(obj, objKey);
        }
      }

      // Register /Encrypt dictionary in trailer
      const encryptDict = context.obj({
        Filter: PDFName.of('Standard'),
        V: PDFNumber.of(2),
        R: PDFNumber.of(3),
        Length: PDFNumber.of(128),
        P: PDFNumber.of(P),
        O: PDFHexString.of(toHex(O)),
        U: PDFHexString.of(toHex(U))
      });
      const encryptRef = context.register(encryptDict);
      context.trailerInfo.Encrypt = encryptRef;
      const idHex = PDFHexString.of(toHex(fileId));
      context.trailerInfo.ID = context.obj([idHex, idHex]);

      return freshDoc.save({ useObjectStreams: false });
    }

    return { encryptPdfLibDoc };
  })();

  /* ========================================================================
     1. PDF Security Studio: Password Protect & Authorized PDF Unlock
     ======================================================================== */
  function initPdfSecurityTool() {
    const modeProtectBtn = document.getElementById('pdfSecModeProtect');
    const modeUnlockBtn = document.getElementById('pdfSecModeUnlock');
    const protectPanel = document.getElementById('pdfSecProtectPanel');
    const unlockPanel = document.getElementById('pdfSecUnlockPanel');

    const lockFileInput = document.getElementById('pdfLockInput');
    const lockFileName = document.getElementById('pdfLockFileName');
    const lockPwdInput = document.getElementById('pdfLockPassword');
    const lockBtn = document.getElementById('pdfLockActionBtn');

    const unlockFileInput = document.getElementById('pdfUnlockInput');
    const unlockFileName = document.getElementById('pdfUnlockFileName');
    const unlockPwdInput = document.getElementById('pdfUnlockPassword');
    const unlockBtn = document.getElementById('pdfUnlockActionBtn');

    if (!modeProtectBtn || !lockBtn || !unlockBtn) return;

    let lockFile = null;
    let unlockFile = null;

    function setSecMode(mode) {
      const isProtect = mode === 'protect';
      modeProtectBtn.className = isProtect
        ? 'flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-[#293B80] text-white transition min-h-[42px]'
        : 'flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition min-h-[42px]';
      modeUnlockBtn.className = !isProtect
        ? 'flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-[#293B80] text-white transition min-h-[42px]'
        : 'flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition min-h-[42px]';
      protectPanel.classList.toggle('hidden', !isProtect);
      unlockPanel.classList.toggle('hidden', isProtect);
    }

    modeProtectBtn.addEventListener('click', () => setSecMode('protect'));
    modeUnlockBtn.addEventListener('click', () => setSecMode('unlock'));

    lockFileInput.addEventListener('change', (e) => {
      const f = e.target.files?.[0];
      lockFileInput.value = '';
      if (!f) return;
      lockFile = f;
      lockFileName.textContent = `${f.name} (${global.utils.formatBytes(f.size)})`;
      lockBtn.disabled = false;
    });

    lockBtn.addEventListener('click', async () => {
      if (!lockFile) return;
      const pwd = (lockPwdInput.value || '').trim();
      if (pwd.length < 3) {
        global.utils.showToast('Enter Password', 'Please enter a password of at least 3 characters.', 'error');
        return;
      }
      global.utils.showLoader('Encrypting PDF with 128-bit Password...', 'text-[#293B80]');
      try {
        const buf = await lockFile.arrayBuffer();
        const doc = await window.PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
        const encryptedBytes = await PDFCrypto.encryptPdfLibDoc(doc, pwd);
        const blob = new Blob([encryptedBytes], { type: 'application/pdf' });
        const outName = `${lockFile.name.replace(/\.pdf$/i, '')}_protected.pdf`;
        global.utils.downloadBlob(blob, outName);
        global.utils.showToast('PDF Protected!', `"${outName}" is now password-protected (128-bit RC4).`);
      } catch (err) {
        console.error(err);
        global.utils.showToast('Encryption Error', 'Could not encrypt this PDF file.', 'error');
      } finally {
        global.utils.hideLoader();
      }
    });

    unlockFileInput.addEventListener('change', (e) => {
      const f = e.target.files?.[0];
      unlockFileInput.value = '';
      if (!f) return;
      unlockFile = f;
      unlockFileName.textContent = `${f.name} (${global.utils.formatBytes(f.size)})`;
      unlockBtn.disabled = false;
    });

    unlockBtn.addEventListener('click', async () => {
      if (!unlockFile) return;
      const pwd = unlockPwdInput.value || '';
      global.utils.showLoader('Unlocking Authorized PDF...', 'text-[#20A779]');
      try {
        const raw = new Uint8Array(await unlockFile.arrayBuffer());
        const pdfJsDoc = await window.pdfjsLib.getDocument({ data: raw, password: pwd }).promise;
        const freshDoc = await window.PDFLib.PDFDocument.create();

        for (let p = 1; p <= pdfJsDoc.numPages; p++) {
          const page = await pdfJsDoc.getPage(p);
          const origVp = page.getViewport({ scale: 1.0 });
          const renderVp = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(renderVp.width);
          canvas.height = Math.round(renderVp.height);
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: ctx, viewport: renderVp }).promise;
          const jpgBlob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.93));
          const jpgImg = await freshDoc.embedJpg(await jpgBlob.arrayBuffer());
          const newPg = freshDoc.addPage([origVp.width, origVp.height]);
          newPg.drawImage(jpgImg, { x: 0, y: 0, width: origVp.width, height: origVp.height });
        }

        const base = unlockFile.name.replace(/\.pdf$/i, '');
        const res = await global.utils.savePdfWithMetadata(freshDoc, `${base}_unlocked.pdf`, `${base} (Unlocked)`);
        if (res && res.saved) {
          global.utils.showToast('PDF Unlocked!', `Saved "${res.filename}" cleanly without password.`);
        }
      } catch (err) {
        console.error(err);
        const msg = err && err.name === 'PasswordException'
          ? 'Incorrect password. Please enter the valid authorized PDF password.'
          : 'Could not unlock this PDF file.';
        global.utils.showToast('Unlock Failed', msg, 'error');
      } finally {
        global.utils.hideLoader();
      }
    });
  }

  /* ========================================================================
     2. PDF to Images (JPG / PNG + Bulk ZIP)
     ======================================================================== */
  function initPdfToImgTool() {
    const input = document.getElementById('pdfToImgInput');
    const fileLabel = document.getElementById('pdfToImgFileName');
    const formatSel = document.getElementById('pdfToImgFormat');
    const scaleSel = document.getElementById('pdfToImgScale');
    const renderBtn = document.getElementById('pdfToImgRenderBtn');
    const zipBtn = document.getElementById('pdfToImgZipBtn');
    const grid = document.getElementById('pdfToImgGrid');

    if (!input || !renderBtn) return;

    let sourceFile = null;
    let renderedPages = []; // { pageNum, blob, url, name }

    input.addEventListener('change', (e) => {
      const f = e.target.files?.[0];
      input.value = '';
      if (!f) return;
      sourceFile = f;
      fileLabel.textContent = `${f.name} (${global.utils.formatBytes(f.size)})`;
      renderBtn.disabled = false;
      zipBtn.disabled = true;
      renderedPages.forEach((p) => URL.revokeObjectURL(p.url));
      renderedPages = [];
      grid.innerHTML = '';
    });

    renderBtn.addEventListener('click', async () => {
      if (!sourceFile) return;
      const fmt = formatSel?.value || 'image/jpeg';
      const ext = fmt === 'image/png' ? 'png' : 'jpg';
      const scale = parseFloat(scaleSel?.value || '2') || 2;

      global.utils.showLoader('Rendering PDF Pages to HD Images...', 'text-[#293B80]');
      try {
        const raw = new Uint8Array(await sourceFile.arrayBuffer());
        const doc = await window.pdfjsLib.getDocument({ data: raw }).promise;
        renderedPages.forEach((p) => URL.revokeObjectURL(p.url));
        renderedPages = [];
        grid.innerHTML = '';

        const base = sourceFile.name.replace(/\.pdf$/i, '');
        for (let p = 1; p <= doc.numPages; p++) {
          const page = await doc.getPage(p);
          const vp = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(vp.width);
          canvas.height = Math.round(vp.height);
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: ctx, viewport: vp }).promise;

          const blob = await new Promise((r) => canvas.toBlob(r, fmt, 0.93));
          const url = URL.createObjectURL(blob);
          const name = `${base}_page_${p}.${ext}`;
          renderedPages.push({ pageNum: p, blob, url, name });

          const card = document.createElement('div');
          card.className = 'rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1C2438] overflow-hidden shadow-sm flex flex-col';
          card.innerHTML = `
            <div class="aspect-[3/4] bg-slate-100 dark:bg-slate-900 overflow-hidden flex items-center justify-center">
              <img src="${url}" alt="Page ${p}" class="w-full h-full object-contain" />
            </div>
            <div class="p-3 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
              <div class="text-xs font-bold text-slate-700 dark:text-slate-200 tabular-nums">Page ${p} · ${global.utils.formatBytes(blob.size)}</div>
              <button type="button" data-idx="${renderedPages.length - 1}" class="p2i-dl-btn px-3 py-1.5 rounded-lg bg-[#293B80] hover:bg-[#1e2c61] text-white text-xs font-bold min-h-[34px]">Save</button>
            </div>
          `;
          grid.appendChild(card);
        }

        grid.querySelectorAll('.p2i-dl-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            const item = renderedPages[parseInt(btn.getAttribute('data-idx'), 10)];
            if (item) global.utils.downloadBlob(item.blob, item.name);
          });
        });

        zipBtn.disabled = renderedPages.length === 0;
        global.utils.showToast('Images Ready!', `Converted ${renderedPages.length} PDF page(s) to ${ext.toUpperCase()}.`);
      } catch (err) {
        console.error(err);
        global.utils.showToast('Error', 'Could not render PDF pages.', 'error');
      } finally {
        global.utils.hideLoader();
      }
    });

    zipBtn.addEventListener('click', async () => {
      if (renderedPages.length === 0) return;
      if (typeof window.JSZip === 'undefined') {
        renderedPages.forEach((p) => global.utils.downloadBlob(p.blob, p.name));
        return;
      }
      global.utils.showLoader('Bundling Images into ZIP...', 'text-[#293B80]');
      try {
        const zip = new window.JSZip();
        renderedPages.forEach((p) => zip.file(p.name, p.blob));
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const base = (sourceFile?.name || 'PDF').replace(/\.pdf$/i, '');
        global.utils.downloadBlob(zipBlob, `${base}_images.zip`);
        global.utils.showToast('ZIP Downloaded!', `Saved all ${renderedPages.length} pages in one ZIP.`);
      } catch (err) {
        console.error(err);
        global.utils.showToast('Error', 'Failed to create ZIP archive.', 'error');
      } finally {
        global.utils.hideLoader();
      }
    });
  }

  /* ========================================================================
     3. PDF Comparison (Side-by-Side Visual + Text Diff)
     ======================================================================== */
  function initPdfCompareTool() {
    const inputA = document.getElementById('pdfCompareInputA');
    const inputB = document.getElementById('pdfCompareInputB');
    const nameA = document.getElementById('pdfCompareNameA');
    const nameB = document.getElementById('pdfCompareNameB');
    const runBtn = document.getElementById('pdfCompareRunBtn');
    const resultWrap = document.getElementById('pdfCompareResultWrap');
    const summaryEl = document.getElementById('pdfCompareSummary');
    const canvasA = document.getElementById('pdfCompareCanvasA');
    const canvasB = document.getElementById('pdfCompareCanvasB');
    const pageNumInput = document.getElementById('pdfComparePageNum');
    const diffList = document.getElementById('pdfCompareDiffList');

    if (!inputA || !inputB || !runBtn) return;

    let docA = null, docB = null, fileA = null, fileB = null;

    function checkReady() {
      runBtn.disabled = !(fileA && fileB);
    }

    inputA.addEventListener('change', (e) => {
      const f = e.target.files?.[0];
      inputA.value = '';
      if (!f) return;
      fileA = f;
      nameA.textContent = `${f.name} (${global.utils.formatBytes(f.size)})`;
      checkReady();
    });

    inputB.addEventListener('change', (e) => {
      const f = e.target.files?.[0];
      inputB.value = '';
      if (!f) return;
      fileB = f;
      nameB.textContent = `${f.name} (${global.utils.formatBytes(f.size)})`;
      checkReady();
    });

    async function renderComparePage(pageIdx) {
      if (!docA || !docB) return;
      const p = Math.max(1, pageIdx);

      const renderOne = async (doc, canvas) => {
        const ctx = canvas.getContext('2d');
        if (p > doc.numPages) {
          canvas.width = 400; canvas.height = 180;
          ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, 400, 180);
          ctx.fillStyle = '#64748b'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
          ctx.fillText(`Page ${p} does not exist in this PDF`, 200, 95);
          return '';
        }
        const page = await doc.getPage(p);
        const vp = page.getViewport({ scale: 1.25 });
        canvas.width = Math.round(vp.width);
        canvas.height = Math.round(vp.height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        const txt = await page.getTextContent();
        return txt.items.map((it) => it.str).join(' ').replace(/\s+/g, ' ').trim();
      };

      const [textA, textB] = await Promise.all([renderOne(docA, canvasA), renderOne(docB, canvasB)]);

      const wordsA = textA ? textA.split(' ') : [];
      const wordsB = textB ? textB.split(' ') : [];
      const setA = new Set(wordsA);
      const setB = new Set(wordsB);
      const onlyA = wordsA.filter((w) => !setB.has(w)).slice(0, 40);
      const onlyB = wordsB.filter((w) => !setA.has(w)).slice(0, 40);

      if (textA === textB) {
        diffList.innerHTML = `<div class="p-3 rounded-xl bg-[#20A779]/10 text-[#20A779] text-xs font-bold">Page ${p} text content is 100% identical across both PDFs.</div>`;
      } else {
        const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        diffList.innerHTML = `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div class="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60">
              <div class="font-bold text-rose-700 dark:text-rose-300 mb-1">Only in PDF A (${onlyA.length} unique terms)</div>
              <p class="text-slate-700 dark:text-slate-300 leading-relaxed">${esc(onlyA.join(' ') || 'No unique words detected')}</p>
            </div>
            <div class="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
              <div class="font-bold text-emerald-700 dark:text-emerald-300 mb-1">Only in PDF B (${onlyB.length} unique terms)</div>
              <p class="text-slate-700 dark:text-slate-300 leading-relaxed">${esc(onlyB.join(' ') || 'No unique words detected')}</p>
            </div>
          </div>
        `;
      }
    }

    runBtn.addEventListener('click', async () => {
      if (!fileA || !fileB) return;
      global.utils.showLoader('Comparing PDFs Side-by-Side...', 'text-[#293B80]');
      try {
        const [bufA, bufB] = await Promise.all([fileA.arrayBuffer(), fileB.arrayBuffer()]);
        docA = await window.pdfjsLib.getDocument({ data: new Uint8Array(bufA) }).promise;
        docB = await window.pdfjsLib.getDocument({ data: new Uint8Array(bufB) }).promise;

        const maxP = Math.max(docA.numPages, docB.numPages);
        pageNumInput.max = String(maxP);
        pageNumInput.value = '1';
        summaryEl.textContent = `PDF A: ${docA.numPages} page(s) (${global.utils.formatBytes(fileA.size)})  ·  PDF B: ${docB.numPages} page(s) (${global.utils.formatBytes(fileB.size)})`;
        resultWrap.classList.remove('hidden');

        await renderComparePage(1);
        global.utils.showToast('Comparison Ready', 'Inspect visual previews and text differences below.');
      } catch (err) {
        console.error(err);
        global.utils.showToast('Compare Error', 'Could not compare these PDF files.', 'error');
      } finally {
        global.utils.hideLoader();
      }
    });

    if (pageNumInput) {
      pageNumInput.addEventListener('change', () => {
        renderComparePage(parseInt(pageNumInput.value || '1', 10) || 1);
      });
    }
  }

  /* ========================================================================
     4. Dedicated Image Cropper Studio
     ======================================================================== */
  function initImageCropStudio() {
    const input = document.getElementById('imgCropToolInput');
    const imgEl = document.getElementById('imgCropToolPreview');
    const stage = document.getElementById('imgCropToolStage');
    const empty = document.getElementById('imgCropToolEmpty');
    const ratioBtns = document.querySelectorAll('.img-crop-ratio-btn');
    const rotLeftBtn = document.getElementById('imgCropRotLeft');
    const rotRightBtn = document.getElementById('imgCropRotRight');
    const flipHBtn = document.getElementById('imgCropFlipH');
    const formatSel = document.getElementById('imgCropFormat');
    const saveBtn = document.getElementById('imgCropSaveBtn');

    if (!input || !imgEl || !saveBtn) return;

    let cropper = null;
    let scaleX = 1;
    let origName = 'cropped_image';

    input.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      input.value = '';
      if (!file) return;
      origName = file.name.replace(/\.[^.]+$/, '');
      const url = URL.createObjectURL(file);
      if (cropper) { cropper.destroy(); cropper = null; }
      scaleX = 1;
      imgEl.onload = () => {
        empty.classList.add('hidden');
        stage.classList.remove('hidden');
        saveBtn.disabled = false;
        if (typeof window.Cropper !== 'undefined') {
          cropper = new window.Cropper(imgEl, {
            viewMode: 1,
            autoCropArea: 0.9,
            responsive: true,
            background: false
          });
        }
      };
      imgEl.src = url;
    });

    ratioBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const raw = btn.getAttribute('data-ratio');
        const ratio = raw === 'free' ? NaN : parseFloat(raw);
        if (cropper) cropper.setAspectRatio(ratio);
        ratioBtns.forEach((b) => {
          const act = b === btn;
          b.classList.toggle('bg-[#293B80]', act);
          b.classList.toggle('text-white', act);
          b.classList.toggle('bg-slate-100', !act);
          b.classList.toggle('dark:bg-slate-800', !act);
        });
      });
    });

    if (rotLeftBtn) rotLeftBtn.addEventListener('click', () => cropper && cropper.rotate(-90));
    if (rotRightBtn) rotRightBtn.addEventListener('click', () => cropper && cropper.rotate(90));
    if (flipHBtn) flipHBtn.addEventListener('click', () => {
      if (!cropper) return;
      scaleX = scaleX * -1;
      cropper.scaleX(scaleX);
    });

    saveBtn.addEventListener('click', async () => {
      if (!cropper) return;
      const fmt = formatSel?.value || 'image/jpeg';
      const ext = fmt === 'image/png' ? 'png' : fmt === 'image/webp' ? 'webp' : 'jpg';
      const canvas = cropper.getCroppedCanvas({ fillColor: fmt === 'image/jpeg' ? '#ffffff' : undefined });
      if (!canvas) return;
      const blob = await new Promise((r) => canvas.toBlob(r, fmt, 0.94));
      global.utils.downloadBlob(blob, `${origName}_cropped.${ext}`);
      global.utils.showToast('Cropped Image Saved!', `Exported ${canvas.width}×${canvas.height}px (${global.utils.formatBytes(blob.size)}).`);
    });
  }

  /* ========================================================================
     5. CSV Viewer, Spreadsheet Preview & CSV <-> Excel Converter
     ======================================================================== */
  function initCsvSpreadsheetTool() {
    const input = document.getElementById('csvToolInput');
    const fileLabel = document.getElementById('csvToolFileName');
    const searchInput = document.getElementById('csvToolSearch');
    const toXlsxBtn = document.getElementById('csvToXlsxBtn');
    const toCsvBtn = document.getElementById('xlsxToCsvBtn');
    const metaEl = document.getElementById('csvToolMeta');
    const tableHead = document.getElementById('csvToolTableHead');
    const tableBody = document.getElementById('csvToolTableBody');
    const tableWrap = document.getElementById('csvToolTableWrap');
    const emptyEl = document.getElementById('csvToolEmpty');

    if (!input || !tableBody) return;

    let currentWorkbook = null;
    let currentRows = [];
    let baseName = 'spreadsheet';

    function renderTable(filterTerm = '') {
      if (!currentRows.length) return;
      const headers = currentRows[0] || [];
      const dataRows = currentRows.slice(1);
      const q = filterTerm.trim().toLowerCase();
      const filtered = q
        ? dataRows.filter((row) => row.some((cell) => String(cell ?? '').toLowerCase().includes(q)))
        : dataRows;

      const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      tableHead.innerHTML = `<tr>${headers.map((h) => `<th class="px-3 py-2.5 text-left text-xs font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 whitespace-nowrap">${esc(h)}</th>`).join('')}</tr>`;

      const maxPreview = 250;
      const visible = filtered.slice(0, maxPreview);
      tableBody.innerHTML = visible
        .map(
          (row) =>
            `<tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800/70">${headers
              .map((_, cIdx) => `<td class="px-3 py-2 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap tabular-nums">${esc(row[cIdx] ?? '')}</td>`)
              .join('')}</tr>`
        )
        .join('');

      metaEl.textContent = `${filtered.length} row(s) × ${headers.length} column(s)${filtered.length > maxPreview ? ` (showing first ${maxPreview})` : ''}`;
    }

    input.addEventListener('change', async (e) => {
      const f = e.target.files?.[0];
      input.value = '';
      if (!f) return;
      if (typeof window.XLSX === 'undefined') {
        global.utils.showToast('Error', 'Spreadsheet engine is still loading.', 'error');
        return;
      }
      global.utils.showLoader('Loading Spreadsheet Preview...', 'text-[#20A779]');
      try {
        const ab = await f.arrayBuffer();
        currentWorkbook = window.XLSX.read(ab, { type: 'array' });
        const firstSheet = currentWorkbook.SheetNames[0];
        const ws = currentWorkbook.Sheets[firstSheet];
        currentRows = window.XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        baseName = f.name.replace(/\.[^.]+$/, '');
        fileLabel.textContent = `${f.name} · Sheet: ${firstSheet}`;

        emptyEl.classList.add('hidden');
        tableWrap.classList.remove('hidden');
        toXlsxBtn.disabled = false;
        toCsvBtn.disabled = false;
        renderTable(searchInput?.value || '');
        global.utils.showToast('Spreadsheet Loaded', `Opened "${f.name}" with ${Math.max(0, currentRows.length - 1)} data rows.`);
      } catch (err) {
        console.error(err);
        global.utils.showToast('Read Error', 'Could not parse this CSV/Excel file.', 'error');
      } finally {
        global.utils.hideLoader();
      }
    });

    if (searchInput) {
      searchInput.addEventListener('input', () => renderTable(searchInput.value));
    }

    if (toXlsxBtn) {
      toXlsxBtn.addEventListener('click', () => {
        if (!currentWorkbook) return;
        const out = window.XLSX.write(currentWorkbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        global.utils.downloadBlob(blob, `${baseName}.xlsx`);
        global.utils.showToast('Excel Saved!', `Converted to ${baseName}.xlsx.`);
      });
    }

    if (toCsvBtn) {
      toCsvBtn.addEventListener('click', () => {
        if (!currentWorkbook) return;
        const firstSheet = currentWorkbook.SheetNames[0];
        const csvStr = window.XLSX.utils.sheet_to_csv(currentWorkbook.Sheets[firstSheet]);
        const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8' });
        global.utils.downloadBlob(blob, `${baseName}.csv`);
        global.utils.showToast('CSV Saved!', `Converted to ${baseName}.csv.`);
      });
    }
  }

  /* ========================================================================
     6. ZIP Creator & ZIP Extractor Studio
     ======================================================================== */
  function initZipStudioTool() {
    const createInput = document.getElementById('zipCreateInput');
    const createList = document.getElementById('zipCreateList');
    const createName = document.getElementById('zipCreateName');
    const createBtn = document.getElementById('zipCreateActionBtn');

    const extractInput = document.getElementById('zipExtractInput');
    const extractList = document.getElementById('zipExtractList');
    const extractAllBtn = document.getElementById('zipExtractAllBtn');

    if (!createInput || !extractInput) return;

    let filesToZip = [];
    let loadedZipEntries = [];

    function renderZipQueue() {
      createBtn.disabled = filesToZip.length === 0;
      if (!filesToZip.length) {
        createList.innerHTML = '<li class="text-xs text-slate-400 py-3 text-center">No files added yet.</li>';
        return;
      }
      createList.innerHTML = filesToZip
        .map(
          (f, i) => `
          <li class="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs">
            <span class="truncate font-semibold text-slate-700 dark:text-slate-200">${f.name}</span>
            <div class="flex items-center gap-2 shrink-0">
              <span class="text-slate-400 tabular-nums">${global.utils.formatBytes(f.size)}</span>
              <button type="button" data-idx="${i}" class="zip-rm-btn text-rose-500 font-bold px-1.5">×</button>
            </div>
          </li>`
        )
        .join('');
      createList.querySelectorAll('.zip-rm-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          filesToZip.splice(parseInt(btn.getAttribute('data-idx'), 10), 1);
          renderZipQueue();
        });
      });
    }

    createInput.addEventListener('change', (e) => {
      filesToZip.push(...Array.from(e.target.files || []));
      createInput.value = '';
      renderZipQueue();
    });

    createBtn.addEventListener('click', async () => {
      if (!filesToZip.length || typeof window.JSZip === 'undefined') return;
      global.utils.showLoader('Creating ZIP Archive...', 'text-[#293B80]');
      try {
        const zip = new window.JSZip();
        for (const f of filesToZip) {
          zip.file(f.name, await f.arrayBuffer());
        }
        const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
        const rawName = (createName?.value || 'PDF_Bondhu_Archive').trim();
        const finalName = rawName.toLowerCase().endsWith('.zip') ? rawName : `${rawName}.zip`;
        global.utils.downloadBlob(blob, finalName);
        global.utils.showToast('ZIP Created!', `Saved "${finalName}" (${global.utils.formatBytes(blob.size)}).`);
      } catch (err) {
        console.error(err);
        global.utils.showToast('Error', 'Could not create ZIP archive.', 'error');
      } finally {
        global.utils.hideLoader();
      }
    });

    extractInput.addEventListener('change', async (e) => {
      const f = e.target.files?.[0];
      extractInput.value = '';
      if (!f || typeof window.JSZip === 'undefined') return;
      global.utils.showLoader('Inspecting ZIP Archive...', 'text-[#7666D8]');
      try {
        const zip = await window.JSZip.loadAsync(await f.arrayBuffer());
        loadedZipEntries = [];
        zip.forEach((relPath, entry) => {
          if (!entry.dir) loadedZipEntries.push({ relPath, entry });
        });
        extractAllBtn.disabled = loadedZipEntries.length === 0;
        if (!loadedZipEntries.length) {
          extractList.innerHTML = '<li class="text-xs text-slate-400 py-3 text-center">Archive is empty.</li>';
        } else {
          extractList.innerHTML = loadedZipEntries
            .map(
              (item, i) => `
              <li class="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs">
                <span class="truncate font-semibold text-slate-700 dark:text-slate-200">${item.relPath}</span>
                <button type="button" data-idx="${i}" class="zip-ext-one px-3 py-1 rounded-lg bg-[#293B80] text-white font-bold text-[11px] shrink-0">Extract</button>
              </li>`
            )
            .join('');
          extractList.querySelectorAll('.zip-ext-one').forEach((btn) => {
            btn.addEventListener('click', async () => {
              const item = loadedZipEntries[parseInt(btn.getAttribute('data-idx'), 10)];
              if (!item) return;
              const blob = await item.entry.async('blob');
              const cleanName = item.relPath.split('/').pop() || 'extracted_file';
              global.utils.downloadBlob(blob, cleanName);
            });
          });
        }
        global.utils.showToast('ZIP Opened', `Found ${loadedZipEntries.length} file(s) inside "${f.name}".`);
      } catch (err) {
        console.error(err);
        global.utils.showToast('Error', 'Invalid or corrupted ZIP archive.', 'error');
      } finally {
        global.utils.hideLoader();
      }
    });

    extractAllBtn.addEventListener('click', async () => {
      for (const item of loadedZipEntries) {
        const blob = await item.entry.async('blob');
        const cleanName = item.relPath.split('/').pop() || 'extracted_file';
        global.utils.downloadBlob(blob, cleanName);
      }
      global.utils.showToast('Extracted All', `Saved ${loadedZipEntries.length} extracted file(s).`);
    });
  }

  /* ========================================================================
     7. 100% Ad-Free True Full-Screen PDF Reader (Zero-Lag, Proper Transform)
     ======================================================================== */
  function initPdfReaderTool() {
    const overlay = document.getElementById('pdfReaderFullscreenOverlay');
    const topBar = document.getElementById('pdfReaderTopBar');
    const bottomBar = document.getElementById('pdfReaderBottomBar');
    const floatingPill = document.getElementById('pdfReaderFloatingPagePill');
    const closeBtn = document.getElementById('pdfReaderCloseBtn');

    const fileInput = document.getElementById('pdfReaderFileInput');
    const pickBtn = document.getElementById('pdfReaderPickBtn');
    const resumeBtn = document.getElementById('pdfReaderResumeBtn');
    const openAnotherBtn = document.getElementById('pdfReaderOpenAnotherBtn');
    const emptyState = document.getElementById('pdfReaderEmptyState');

    const fileNameEl = document.getElementById('pdfReaderFileName');
    const fileMetaEl = document.getElementById('pdfReaderFileMeta');

    const passBox = document.getElementById('pdfReaderPasswordBox');
    const passInput = document.getElementById('pdfReaderPasswordInput');
    const passSubmit = document.getElementById('pdfReaderPasswordSubmit');
    const passCancel = document.getElementById('pdfReaderPasswordCancel');
    const passErr = document.getElementById('pdfReaderPasswordErr');

    const stage = document.getElementById('pdfReaderStage');
    const pagesContainer = document.getElementById('pdfReaderPagesContainer');

    const prevBtn = document.getElementById('pdfReaderPrevBtn');
    const nextBtn = document.getElementById('pdfReaderNextBtn');
    const pageInput = document.getElementById('pdfReaderPageInput');
    const pageTotalEl = document.getElementById('pdfReaderPageTotal');
    const zoomOutBtn = document.getElementById('pdfReaderZoomOut');
    const zoomInBtn = document.getElementById('pdfReaderZoomIn');
    const zoomLabel = document.getElementById('pdfReaderZoomLabel');
    const fitBtn = document.getElementById('pdfReaderFitBtn');
    const rotateBtn = document.getElementById('pdfReaderRotateBtn');
    const modeToggleBtn = document.getElementById('pdfReaderModeToggle');
    const modeBadge = document.getElementById('pdfReaderModeBadge');
    const themeCycleBtn = document.getElementById('pdfReaderThemeCycleBtn');

    const searchToggleBtn = document.getElementById('pdfReaderSearchToggleBtn');
    const searchBar = document.getElementById('pdfReaderSearchBar');
    const searchCloseBtn = document.getElementById('pdfReaderSearchCloseBtn');
    const searchInput = document.getElementById('pdfReaderSearchInput');
    const searchBtn = document.getElementById('pdfReaderSearchBtn');
    const searchPrevBtn = document.getElementById('pdfReaderSearchPrevBtn');
    const searchNextBtn = document.getElementById('pdfReaderSearchNextBtn');
    const searchStatus = document.getElementById('pdfReaderSearchStatus');

    const moreBtn = document.getElementById('pdfReaderMoreBtn');
    const moreMenu = document.getElementById('pdfReaderMoreMenu');
    const copyTextBtn = document.getElementById('pdfReaderCopyTextBtn');
    const saveVaultBtn = document.getElementById('pdfReaderSaveVaultBtn');
    const shareBtn = document.getElementById('pdfReaderShareBtn');
    const printBtn = document.getElementById('pdfReaderPrintBtn');

    if (!overlay || !fileInput || !pagesContainer) return;

    let pdfDoc = null;
    let rawBytes = null;
    let currentFileName = 'Document.pdf';
    let currentPage = 1;
    let totalPages = 0;
    let zoomFactor = 1.0; // 1.0 = exact Fit-Width for every page
    let rotationDeg = 0;
    let viewMode = 'scroll'; // 'scroll' | 'single'
    let readingTheme = 'light'; // 'light' | 'sepia' | 'night'
    let barsHidden = false;

    // Virtualization & Pages-as-Needed Engine state
    const OVERSCAN_PAGES = 2;
    const PAGE_GAP = 10;
    let pageMetrics = []; // [{ pageNum, width, height, top, aspectRatio, measured }]
    let totalVirtualHeight = 0;
    let activeSlots = new Map(); // pageNum -> { el, canvas, placeholder, renderedSig }
    let currentRenderSig = '';
    let renderToken = 0;
    let activeRenderTask = null;
    let activeRenderPage = 0;
    let renderQueue = []; // array of pageNums prioritized by distance to centerPage
    let isProcessingQueue = false;
    let scrollRafId = null;
    let flingSettleTimer = null;
    let lastScrollTs = 0;
    let searchMatches = [];
    let searchIdx = -1;

    function computeRenderSig() {
      return `${zoomFactor.toFixed(2)}_${rotationDeg}_${getAvailableStageWidth()}`;
    }

    function cancelActiveTask() {
      if (activeRenderTask) {
        try { activeRenderTask.cancel(); } catch {}
        activeRenderTask = null;
        activeRenderPage = 0;
      }
    }

    function cancelAllRendering() {
      renderToken += 1;
      renderQueue = [];
      cancelActiveTask();
      isProcessingQueue = false;
      if (flingSettleTimer) {
        clearTimeout(flingSettleTimer);
        flingSettleTimer = null;
      }
    }

    function evictSlot(pageNum) {
      const slot = activeSlots.get(pageNum);
      if (!slot) return;
      if (activeRenderPage === pageNum) cancelActiveTask();
      try {
        slot.canvas.width = 0;
        slot.canvas.height = 0;
        slot.el.remove();
      } catch {}
      activeSlots.delete(pageNum);
      renderQueue = renderQueue.filter((p) => p !== pageNum);
    }

    function clearAllSlots() {
      cancelAllRendering();
      for (const pNum of Array.from(activeSlots.keys())) {
        evictSlot(pNum);
      }
      pagesContainer.innerHTML = '';
    }

    function openFullscreenOverlay() {
      overlay.classList.remove('hidden');
      overlay.classList.add('flex');
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      setBarsVisible(true);
    }

    function closeFullscreenOverlay() {
      clearAllSlots();
      overlay.classList.add('hidden');
      overlay.classList.remove('flex');
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      if (moreMenu) moreMenu.classList.add('hidden');
      if (searchBar) searchBar.classList.add('hidden');
      if (resumeBtn && pdfDoc) {
        global._lastOpenedReaderKind = 'pdf';
        resumeBtn.textContent = `Resume PDF: ${currentFileName.length > 20 ? currentFileName.slice(0, 20) + '…' : currentFileName}`;
        resumeBtn.classList.remove('hidden');
      }
    }

    global.closePdfReaderFullscreen = closeFullscreenOverlay;
    global.isPdfReaderFullscreenOpen = () => !overlay.classList.contains('hidden');
    global._resumePdfReader = () => {
      if (!pdfDoc) return;
      openFullscreenOverlay();
      requestAnimationFrame(() => renderPagesLayout(true));
    };

    function setBarsVisible(visible) {
      barsHidden = !visible;
      if (topBar) topBar.style.transform = visible ? 'translateY(0)' : 'translateY(-115%)';
      if (bottomBar) bottomBar.style.transform = visible ? 'translateY(0)' : 'translateY(115%)';
      if (!visible && moreMenu) moreMenu.classList.add('hidden');
      if (!visible && searchBar) searchBar.classList.add('hidden');
      if (floatingPill) {
        floatingPill.style.top = visible ? '60px' : '12px';
      }
      if (stage) {
        stage.style.paddingTop = visible ? '56px' : '6px';
        stage.style.paddingBottom = visible ? '60px' : '6px';
      }
    }

    function getThemeCanvasFilter() {
      if (readingTheme === 'sepia') return 'sepia(0.32) brightness(0.96) contrast(1.02)';
      if (readingTheme === 'night') return 'invert(0.92) hue-rotate(180deg) contrast(1.05)';
      return 'none';
    }

    function applyReadingTheme(theme) {
      readingTheme = theme;
      if (stage) {
        stage.classList.remove('bg-slate-800', 'bg-[#2B2418]', 'bg-[#090B10]');
        if (theme === 'sepia') stage.classList.add('bg-[#2B2418]');
        else if (theme === 'night') stage.classList.add('bg-[#090B10]');
        else stage.classList.add('bg-slate-800');
      }
      const flt = getThemeCanvasFilter();
      for (const slot of activeSlots.values()) {
        slot.canvas.style.filter = flt;
      }
      if (themeCycleBtn) {
        if (theme === 'sepia') themeCycleBtn.textContent = 'Sepia';
        else if (theme === 'night') themeCycleBtn.textContent = 'Night';
        else themeCycleBtn.textContent = '☀ Light';
      }
    }

    function updateNavUi() {
      if (pageInput && document.activeElement !== pageInput) pageInput.value = String(currentPage);
      if (pageTotalEl) pageTotalEl.textContent = String(totalPages);
      if (floatingPill) floatingPill.textContent = `${currentPage} / ${totalPages || 1}`;
      if (zoomLabel) zoomLabel.textContent = `${Math.round(zoomFactor * 100)}%`;
      if (prevBtn) prevBtn.disabled = currentPage <= 1;
      if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
      if (modeBadge) modeBadge.textContent = viewMode === 'scroll' ? 'Scroll' : 'Single Page';
    }

    function getAvailableStageWidth() {
      const w = (stage && stage.clientWidth) || window.innerWidth || 360;
      return Math.max(260, w - (window.innerWidth < 640 ? 8 : 28));
    }

    function recomputeVirtualOffsets(startIndex = 0) {
      let y = startIndex > 0
        ? pageMetrics[startIndex - 1].top + pageMetrics[startIndex - 1].height + PAGE_GAP
        : 0;
      for (let i = startIndex; i < pageMetrics.length; i++) {
        pageMetrics[i].top = y;
        y += pageMetrics[i].height + PAGE_GAP;
      }
      totalVirtualHeight = Math.max(0, y - PAGE_GAP);
      if (viewMode === 'scroll') {
        pagesContainer.style.height = `${totalVirtualHeight}px`;
        for (const [pNum, slot] of activeSlots.entries()) {
          const m = pageMetrics[pNum - 1];
          if (m) {
            slot.el.style.transform = `translate3d(-50%, ${m.top}px, 0)`;
            slot.el.style.width = `${m.width}px`;
            slot.el.style.height = `${m.height}px`;
          }
        }
      }
    }

    async function initVirtualMetrics(defaultRatio = 1.414) {
      const targetW = Math.floor(getAvailableStageWidth() * zoomFactor);
      let firstRatio = defaultRatio;
      try {
        const p1 = await pdfDoc.getPage(1);
        const effRot = ((p1.rotate || 0) + rotationDeg) % 360;
        const vp1 = p1.getViewport({ scale: 1.0, rotation: effRot });
        if (vp1.width > 0 && vp1.height > 0) {
          firstRatio = vp1.height / vp1.width;
        }
      } catch {}

      const prevMetrics = pageMetrics;
      pageMetrics = new Array(totalPages);
      for (let i = 0; i < totalPages; i++) {
        const prev = prevMetrics[i];
        const ratio = (prev && prev.measured && prev.rot === rotationDeg) ? prev.aspectRatio : firstRatio;
        pageMetrics[i] = {
          pageNum: i + 1,
          width: targetW,
          height: Math.max(120, Math.round(targetW * ratio)),
          top: 0,
          aspectRatio: ratio,
          rot: rotationDeg,
          measured: Boolean(prev && prev.measured && prev.rot === rotationDeg)
        };
      }
      recomputeVirtualOffsets(0);
    }

    // O(log N) binary search for first page whose bottom >= scrollTop
    function findFirstVisibleIndex(scrollTop) {
      let lo = 0;
      let hi = pageMetrics.length - 1;
      let ans = 0;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const m = pageMetrics[mid];
        if (m.top + m.height >= scrollTop) {
          ans = mid;
          hi = mid - 1;
        } else {
          lo = mid + 1;
        }
      }
      return ans;
    }

    function createVirtualSlot(pageNum) {
      const m = pageMetrics[pageNum - 1];
      const wrap = document.createElement('div');
      wrap.className = 'pb-reader-page-wrap bg-white shadow-lg overflow-hidden flex items-center justify-center';
      wrap.setAttribute('data-page-num', String(pageNum));
      wrap.style.contain = 'layout style paint';
      if (viewMode === 'scroll' && m) {
        wrap.style.position = 'absolute';
        wrap.style.top = '0';
        wrap.style.left = '50%';
        wrap.style.width = `${m.width}px`;
        wrap.style.height = `${m.height}px`;
        wrap.style.transform = `translate3d(-50%, ${m.top}px, 0)`;
      } else if (m) {
        wrap.style.position = 'relative';
        wrap.style.width = `${m.width}px`;
        wrap.style.height = `${m.height}px`;
        wrap.className += ' my-auto shadow-2xl';
      }

      const placeholder = document.createElement('div');
      placeholder.className = 'pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-400';
      placeholder.textContent = `Page ${pageNum}`;

      const cv = document.createElement('canvas');
      cv.className = 'pb-reader-canvas block max-w-none relative z-10';
      cv.style.filter = getThemeCanvasFilter();

      wrap.appendChild(placeholder);
      wrap.appendChild(cv);
      pagesContainer.appendChild(wrap);

      const slot = { el: wrap, canvas: cv, placeholder, renderedSig: '' };
      activeSlots.set(pageNum, slot);
      return slot;
    }

    function getVisiblePageWindow() {
      if (!pageMetrics.length || !stage) return { firstVis: 1, lastVis: 1, centerPage: 1 };
      const scrollTop = Math.max(0, stage.scrollTop - 56);
      const viewH = stage.clientHeight || window.innerHeight || 640;
      const scrollBottom = scrollTop + viewH;
      const centerY = scrollTop + viewH * 0.45;

      const startIdx = findFirstVisibleIndex(scrollTop);
      let endIdx = startIdx;
      let centerIdx = startIdx;
      let bestDist = Infinity;

      for (let i = startIdx; i < pageMetrics.length; i++) {
        const m = pageMetrics[i];
        if (m.top > scrollBottom && i > startIdx) break;
        endIdx = i;
        const midY = m.top + m.height * 0.5;
        const dist = Math.abs(midY - centerY);
        if (dist < bestDist) {
          bestDist = dist;
          centerIdx = i;
        }
      }
      return {
        firstVis: startIdx + 1,
        lastVis: endIdx + 1,
        centerPage: centerIdx + 1
      };
    }

    function syncVirtualWindow(immediateRender = false) {
      if (!pdfDoc || !pageMetrics.length || overlay.classList.contains('hidden')) return;

      if (viewMode === 'single') {
        for (const pNum of Array.from(activeSlots.keys())) {
          if (pNum !== currentPage) evictSlot(pNum);
        }
        const slot = activeSlots.get(currentPage) || createVirtualSlot(currentPage);
        if (slot.renderedSig !== currentRenderSig) {
          renderQueue = [currentPage];
          processRenderQueue();
        }
        updateNavUi();
        return;
      }

      const { firstVis, lastVis, centerPage } = getVisiblePageWindow();
      if (centerPage !== currentPage) {
        currentPage = centerPage;
        updateNavUi();
      }

      const winStart = Math.max(1, firstVis - OVERSCAN_PAGES);
      const winEnd = Math.min(totalPages, lastVis + OVERSCAN_PAGES);

      // 1. Immediately evict pages outside sliding window to keep GPU memory tiny (<25MB)
      for (const pNum of Array.from(activeSlots.keys())) {
        if (pNum < winStart || pNum > winEnd) {
          evictSlot(pNum);
        }
      }

      // 2. Mount lightweight DOM slots for pages inside window and collect unrendered ones
      const needed = [];
      for (let p = winStart; p <= winEnd; p++) {
        const slot = activeSlots.get(p) || createVirtualSlot(p);
        if (slot.renderedSig !== currentRenderSig) {
          needed.push(p);
        }
      }

      // 3. Prioritize centermost visible page first, then immediate neighbors, then overscan
      needed.sort((a, b) => Math.abs(a - centerPage) - Math.abs(b - centerPage));
      renderQueue = needed;

      if (!needed.length) return;

      // 4. Fling-aware scheduling: during rapid touch fling, defer rasterizing by 65ms so scrolling stays 60fps
      const now = performance.now();
      const isFlinging = !immediateRender && (now - lastScrollTs) < 60;
      if (flingSettleTimer) {
        clearTimeout(flingSettleTimer);
        flingSettleTimer = null;
      }
      if (isFlinging) {
        flingSettleTimer = setTimeout(() => {
          flingSettleTimer = null;
          processRenderQueue();
        }, 65);
      } else {
        processRenderQueue();
      }
    }

    // Renders a single virtual slot with official PDF.js transform + native page.rotate + capped pixel budget
    async function renderVirtualSlot(pageNum, token, sig) {
      if (!pdfDoc || token !== renderToken) return;
      const slot = activeSlots.get(pageNum);
      if (!slot || slot.renderedSig === sig) return;

      try {
        const page = await pdfDoc.getPage(pageNum);
        if (token !== renderToken || !activeSlots.has(pageNum)) return;

        const effectiveRot = ((page.rotate || 0) + rotationDeg) % 360;
        const baseVp = page.getViewport({ scale: 1.0, rotation: effectiveRot });
        const targetCssWidth = Math.floor(getAvailableStageWidth() * zoomFactor);
        const cssScale = Math.max(0.1, targetCssWidth / Math.max(1, baseVp.width));
        const viewport = page.getViewport({ scale: cssScale, rotation: effectiveRot });

        const cssW = Math.max(1, Math.floor(viewport.width));
        const cssH = Math.max(1, Math.floor(viewport.height));

        // Update exact measured geometry if this page differs from estimate (e.g. mixed landscape/portrait scans)
        const m = pageMetrics[pageNum - 1];
        if (m && (!m.measured || Math.abs(m.height - cssH) > 2 || Math.abs(m.width - cssW) > 2)) {
          const oldHeight = m.height;
          const wasAboveViewport = stage && viewMode === 'scroll' && (m.top + oldHeight < stage.scrollTop);
          m.width = cssW;
          m.height = cssH;
          m.aspectRatio = baseVp.height / Math.max(1, baseVp.width);
          m.rot = rotationDeg;
          m.measured = true;
          recomputeVirtualOffsets(pageNum - 1);
          if (wasAboveViewport && stage) {
            stage.scrollTop += (cssH - oldHeight);
          }
        }

        // Safe HiDPI outputScale capped to 1600x2400px so Android WebView never stalls
        const maxDpr = Math.min(window.devicePixelRatio || 1, 1.75);
        const outputScale = Math.max(
          1,
          Math.min(maxDpr, 1600 / Math.max(1, viewport.width), 2400 / Math.max(1, viewport.height))
        );

        const pixelW = Math.max(1, Math.floor(viewport.width * outputScale));
        const pixelH = Math.max(1, Math.floor(viewport.height * outputScale));

        const cv = slot.canvas;
        cv.width = pixelW;
        cv.height = pixelH;
        cv.style.width = `${cssW}px`;
        cv.style.height = `${cssH}px`;
        cv.style.filter = getThemeCanvasFilter();

        const ctx = cv.getContext('2d', { alpha: false });
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, pixelW, pixelH);

        activeRenderPage = pageNum;
        activeRenderTask = page.render({
          canvasContext: ctx,
          viewport,
          transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null
        });
        await activeRenderTask.promise;
        activeRenderTask = null;
        activeRenderPage = 0;

        if (token === renderToken && activeSlots.has(pageNum)) {
          slot.renderedSig = sig;
          if (slot.placeholder) slot.placeholder.style.display = 'none';
        }
      } catch (err) {
        activeRenderTask = null;
        activeRenderPage = 0;
        if (err && err.name !== 'RenderingCancelledException') {
          console.error('Reader render error on page', pageNum, err);
        }
      }
    }

    async function processRenderQueue() {
      if (isProcessingQueue || !pdfDoc) return;
      isProcessingQueue = true;
      const myToken = renderToken;
      const mySig = currentRenderSig;
      try {
        while (renderQueue.length > 0 && myToken === renderToken) {
          const pNum = renderQueue.shift();
          const slot = activeSlots.get(pNum);
          if (!slot || slot.renderedSig === mySig) continue;
          await renderVirtualSlot(pNum, myToken, mySig);
          // Yield one frame between page rasters so touch scrolling stays silky 60fps
          await new Promise((r) => requestAnimationFrame(r));
        }
      } finally {
        isProcessingQueue = false;
      }
    }

    async function renderPagesLayout(keepScrollRatio = false) {
      if (!pdfDoc) return;
      const prevRatio = keepScrollRatio && stage && totalVirtualHeight > 0
        ? stage.scrollTop / totalVirtualHeight
        : 0;

      clearAllSlots();
      currentRenderSig = computeRenderSig();
      await initVirtualMetrics();
      updateNavUi();

      const targetW = Math.floor(getAvailableStageWidth() * zoomFactor);
      if (viewMode === 'single') {
        pagesContainer.style.position = 'relative';
        pagesContainer.style.height = 'auto';
        pagesContainer.style.minWidth = `${targetW}px`;
        if (stage) stage.scrollTop = 0;
      } else {
        pagesContainer.style.position = 'relative';
        pagesContainer.style.height = `${totalVirtualHeight}px`;
        pagesContainer.style.minWidth = `${targetW}px`;
        if (keepScrollRatio && stage && prevRatio > 0) {
          stage.scrollTop = Math.floor(prevRatio * totalVirtualHeight);
        }
      }

      syncVirtualWindow(true);
    }

    function goToPage(pageNum) {
      if (!pdfDoc) return;
      const clamped = Math.max(1, Math.min(totalPages, parseInt(pageNum, 10) || 1));
      currentPage = clamped;
      updateNavUi();
      if (viewMode === 'single') {
        syncVirtualWindow(true);
        if (stage) stage.scrollTop = 0;
      } else {
        const m = pageMetrics[clamped - 1];
        if (m && stage) {
          stage.scrollTo({ top: m.top, behavior: 'smooth' });
          syncVirtualWindow(true);
        }
      }
    }

    // Passive rAF-throttled scroll listener drives the virtualized sliding window at 60fps
    if (stage) {
      stage.addEventListener('scroll', () => {
        if (!pdfDoc || viewMode !== 'scroll' || overlay.classList.contains('hidden')) return;
        lastScrollTs = performance.now();
        if (scrollRafId) return;
        scrollRafId = requestAnimationFrame(() => {
          scrollRafId = null;
          syncVirtualWindow(false);
        });
      }, { passive: true });
    }

    async function loadPdfBytes(bytes, name, password = '') {
      if (typeof window.pdfjsLib === 'undefined') {
        global.utils?.showToast?.('PDF Engine Missing', 'PDF.js library did not load. Please refresh the app.', 'error');
        return;
      }
      rawBytes = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      currentFileName = name || 'Document.pdf';
      if (fileNameEl) fileNameEl.textContent = currentFileName;
      if (passErr) { passErr.textContent = ''; passErr.classList.add('hidden'); }

      openFullscreenOverlay();
      global.utils?.showLoader?.('Opening PDF Full-Screen...', 'text-emerald-500');
      try {
        clearAllSlots();
        pageMetrics = [];
        if (pdfDoc) {
          try { await pdfDoc.destroy(); } catch {}
          pdfDoc = null;
        }
        const loadingTask = window.pdfjsLib.getDocument({
          data: rawBytes.slice(),
          password: password || undefined
        });
        pdfDoc = await loadingTask.promise;
        totalPages = pdfDoc.numPages;
        currentPage = 1;
        zoomFactor = 1.0;
        rotationDeg = 0;
        searchMatches = [];
        searchIdx = -1;
        if (searchStatus) searchStatus.textContent = '';
        if (searchPrevBtn) searchPrevBtn.classList.add('hidden');
        if (searchNextBtn) searchNextBtn.classList.add('hidden');
        if (passBox) passBox.classList.add('hidden');

        const sizeStr = global.utils?.formatBytes
          ? global.utils.formatBytes(rawBytes.byteLength)
          : `${Math.round(rawBytes.byteLength / 1024)} KB`;
        if (fileMetaEl) fileMetaEl.textContent = `${totalPages} page${totalPages > 1 ? 's' : ''} · ${sizeStr} · 100% Ad-Free`;

        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        await renderPagesLayout();
        if (stage) stage.scrollTop = 0;
      } catch (err) {
        console.error('PDF Reader open error:', err);
        if (err && (err.name === 'PasswordException' || String(err.message || '').toLowerCase().includes('password'))) {
          if (passBox) passBox.classList.remove('hidden');
          if (password && passErr) {
            passErr.textContent = 'Incorrect password. Please try again.';
            passErr.classList.remove('hidden');
          }
          if (passInput) {
            passInput.value = '';
            setTimeout(() => passInput.focus(), 60);
          }
        } else {
          closeFullscreenOverlay();
          global.utils?.showToast?.('Could Not Open PDF', 'File may be corrupted. Try Repair Corrupted PDF tool.', 'error');
        }
      } finally {
        global.utils?.hideLoader?.();
      }
    }

    global._openPdfBytesInReader = loadPdfBytes;

    const ALL_DOCS_ACCEPT = fileInput.getAttribute('accept') || '.pdf,.doc,.docx,.xls,.xlsx,.csv,.ods,.ppt,.pptx,.rtf,.txt';
    global._triggerUniversalFilePick = (acceptOverride) => {
      fileInput.setAttribute('accept', acceptOverride || ALL_DOCS_ACCEPT);
      fileInput.click();
    };

    async function handleFileObject(file) {
      if (!file) return;
      const ab = await file.arrayBuffer();
      const bytes = new Uint8Array(ab);
      if (typeof global.openUniversalDocumentFile === 'function') {
        await global.openUniversalDocumentFile(bytes, file.name || 'Document', file.type || '');
      } else {
        await loadPdfBytes(bytes, file.name || 'Document.pdf');
      }
    }

    if (closeBtn) closeBtn.addEventListener('click', closeFullscreenOverlay);
    if (pickBtn) pickBtn.addEventListener('click', () => global._triggerUniversalFilePick(ALL_DOCS_ACCEPT));
    document.querySelectorAll('.pb-doc-format-btn[data-doc-pick-accept]').forEach((btn) => {
      btn.addEventListener('click', () => {
        global._triggerUniversalFilePick(btn.getAttribute('data-doc-pick-accept') || ALL_DOCS_ACCEPT);
      });
    });
    if (resumeBtn) {
      resumeBtn.addEventListener('click', () => {
        if (global._lastOpenedReaderKind === 'office' && typeof global._resumeOfficeReader === 'function') {
          global._resumeOfficeReader();
        } else if (pdfDoc) {
          openFullscreenOverlay();
          requestAnimationFrame(() => renderPagesLayout(true));
        }
      });
    }
    if (openAnotherBtn) {
      openAnotherBtn.addEventListener('click', () => {
        if (moreMenu) moreMenu.classList.add('hidden');
        global._triggerUniversalFilePick(ALL_DOCS_ACCEPT);
      });
    }

    fileInput.addEventListener('change', async (e) => {
      const f = e.target.files?.[0];
      fileInput.value = '';
      fileInput.setAttribute('accept', ALL_DOCS_ACCEPT);
      if (f) await handleFileObject(f);
    });

    // More menu toggle & quick tool handoff
    if (moreBtn && moreMenu) {
      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        moreMenu.classList.toggle('hidden');
      });
      overlay.addEventListener('click', (e) => {
        if (!moreMenu.contains(e.target) && e.target !== moreBtn) {
          moreMenu.classList.add('hidden');
        }
      });
    }
    overlay.querySelectorAll('[data-reader-jump]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetTool = btn.getAttribute('data-reader-jump');
        closeFullscreenOverlay();
        if (targetTool && typeof global.openPdfBondhuTool === 'function') {
          global.openPdfBondhuTool(targetTool);
        }
      });
    });

    // Tap page to toggle Immersive Full-Screen & Double-Tap / Pinch to Zoom
    let lastTapTime = 0;
    let tapTimer = null;
    let touchMoved = false;
    let pinchStartDist = 0;
    let pinchStartFactor = 1.0;
    let pinchActive = false;

    function getTouchDist(touches) {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.hypot(dx, dy);
    }

    if (stage) {
      stage.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2 && pdfDoc) {
          pinchActive = true;
          pinchStartDist = getTouchDist(e.touches);
          pinchStartFactor = zoomFactor;
          if (tapTimer) { clearTimeout(tapTimer); tapTimer = null; }
        } else if (e.touches.length === 1) {
          touchMoved = false;
        }
      }, { passive: true });

      stage.addEventListener('touchmove', (e) => {
        if (pinchActive && e.touches.length === 2 && pinchStartDist > 0) {
          const curDist = getTouchDist(e.touches);
          const ratio = Math.max(0.5, Math.min(2.5, curDist / pinchStartDist));
          pagesContainer.style.transformOrigin = 'top center';
          pagesContainer.style.transform = `scale(${ratio.toFixed(3)})`;
        } else if (e.touches.length === 1) {
          touchMoved = true;
        }
      }, { passive: true });

      stage.addEventListener('touchend', (e) => {
        if (pinchActive && e.touches.length < 2) {
          pinchActive = false;
          const match = pagesContainer.style.transform.match(/scale\(([^)]+)\)/);
          const ratio = match ? parseFloat(match[1]) : 1;
          pagesContainer.style.transform = '';
          if (Math.abs(ratio - 1) > 0.08 && pdfDoc) {
            zoomFactor = Math.max(0.6, Math.min(3.0, Math.round(pinchStartFactor * ratio * 100) / 100));
            renderPagesLayout(true);
          }
        }
      }, { passive: true });

      stage.addEventListener('click', () => {
        if (!pdfDoc || touchMoved || pinchActive) return;
        if (moreMenu && !moreMenu.classList.contains('hidden')) return;
        const now = Date.now();
        if (now - lastTapTime < 270) {
          if (tapTimer) { clearTimeout(tapTimer); tapTimer = null; }
          lastTapTime = 0;
          zoomFactor = Math.abs(zoomFactor - 1.0) < 0.1 ? 1.65 : 1.0;
          renderPagesLayout(true);
        } else {
          lastTapTime = now;
          tapTimer = setTimeout(() => {
            setBarsVisible(barsHidden);
            tapTimer = null;
          }, 270);
        }
      });
    }

    // Re-fit smoothly on phone rotation / window resize
    let resizeDebounce = null;
    window.addEventListener('resize', () => {
      if (!pdfDoc || overlay.classList.contains('hidden')) return;
      clearTimeout(resizeDebounce);
      resizeDebounce = setTimeout(() => {
        renderPagesLayout(true);
      }, 240);
    });

    // Drag & Drop support (PDF, Word, Excel, PowerPoint, CSV, RTF, TXT)
    [emptyState, stage].forEach((zone) => {
      if (!zone) return;
      zone.addEventListener('dragover', (e) => e.preventDefault());
      zone.addEventListener('drop', async (e) => {
        e.preventDefault();
        const f = e.dataTransfer?.files?.[0];
        if (f) {
          await handleFileObject(f);
        }
      });
    });

    // Password prompt handlers
    if (passCancel) {
      passCancel.addEventListener('click', () => {
        if (passBox) passBox.classList.add('hidden');
        if (!pdfDoc) closeFullscreenOverlay();
      });
    }
    if (passSubmit && passInput) {
      const submitPass = () => {
        if (!rawBytes) return;
        loadPdfBytes(rawBytes, currentFileName, passInput.value);
      };
      passSubmit.addEventListener('click', submitPass);
      passInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); submitPass(); }
      });
    }

    // Navigation, Zoom, Rotate, Mode, Theme Cycle
    if (prevBtn) prevBtn.addEventListener('click', () => goToPage(currentPage - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => goToPage(currentPage + 1));
    if (pageInput) {
      pageInput.addEventListener('change', () => goToPage(pageInput.value));
      pageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); goToPage(pageInput.value); }
      });
    }

    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', () => {
        if (!pdfDoc) return;
        zoomFactor = Math.max(0.6, Math.round((zoomFactor - 0.2) * 100) / 100);
        renderPagesLayout(true);
      });
    }
    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', () => {
        if (!pdfDoc) return;
        zoomFactor = Math.min(3.0, Math.round((zoomFactor + 0.2) * 100) / 100);
        renderPagesLayout(true);
      });
    }
    if (fitBtn) {
      fitBtn.addEventListener('click', () => {
        if (!pdfDoc) return;
        zoomFactor = 1.0;
        renderPagesLayout(true);
      });
    }
    if (rotateBtn) {
      rotateBtn.addEventListener('click', () => {
        if (!pdfDoc) return;
        rotationDeg = (rotationDeg + 90) % 360;
        renderPagesLayout(true);
      });
    }
    if (modeToggleBtn) {
      modeToggleBtn.addEventListener('click', () => {
        if (moreMenu) moreMenu.classList.add('hidden');
        if (!pdfDoc) return;
        viewMode = viewMode === 'scroll' ? 'single' : 'scroll';
        renderPagesLayout();
      });
    }
    if (themeCycleBtn) {
      const order = ['light', 'sepia', 'night'];
      themeCycleBtn.addEventListener('click', () => {
        const next = order[(order.indexOf(readingTheme) + 1) % order.length];
        applyReadingTheme(next);
      });
    }

    // Search bar toggle & full-text search
    if (searchToggleBtn && searchBar) {
      searchToggleBtn.addEventListener('click', () => {
        const opening = searchBar.classList.contains('hidden');
        searchBar.classList.toggle('hidden');
        if (opening && searchInput) setTimeout(() => searchInput.focus(), 50);
      });
    }
    if (searchCloseBtn && searchBar) {
      searchCloseBtn.addEventListener('click', () => searchBar.classList.add('hidden'));
    }

    async function runPdfSearch() {
      if (!pdfDoc || !searchInput) return;
      const q = searchInput.value.trim().toLowerCase();
      if (!q) {
        searchMatches = [];
        searchIdx = -1;
        if (searchStatus) searchStatus.textContent = '';
        if (searchPrevBtn) searchPrevBtn.classList.add('hidden');
        if (searchNextBtn) searchNextBtn.classList.add('hidden');
        return;
      }
      if (searchStatus) searchStatus.textContent = 'Searching...';
      searchMatches = [];
      for (let p = 1; p <= totalPages; p++) {
        try {
          const page = await pdfDoc.getPage(p);
          const tc = await page.getTextContent();
          const text = tc.items.map((it) => it.str || '').join(' ').toLowerCase();
          if (text.includes(q)) searchMatches.push(p);
        } catch {}
      }
      if (!searchMatches.length) {
        searchIdx = -1;
        if (searchStatus) searchStatus.textContent = 'No match';
        if (searchPrevBtn) searchPrevBtn.classList.add('hidden');
        if (searchNextBtn) searchNextBtn.classList.add('hidden');
        return;
      }
      searchIdx = 0;
      if (searchPrevBtn) searchPrevBtn.classList.remove('hidden');
      if (searchNextBtn) searchNextBtn.classList.remove('hidden');
      if (searchStatus) searchStatus.textContent = `1/${searchMatches.length} (p.${searchMatches[0]})`;
      goToPage(searchMatches[0]);
    }

    if (searchBtn) searchBtn.addEventListener('click', runPdfSearch);
    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); runPdfSearch(); }
      });
    }
    if (searchPrevBtn) {
      searchPrevBtn.addEventListener('click', () => {
        if (!searchMatches.length) return;
        searchIdx = (searchIdx - 1 + searchMatches.length) % searchMatches.length;
        if (searchStatus) searchStatus.textContent = `${searchIdx + 1}/${searchMatches.length} (p.${searchMatches[searchIdx]})`;
        goToPage(searchMatches[searchIdx]);
      });
    }
    if (searchNextBtn) {
      searchNextBtn.addEventListener('click', () => {
        if (!searchMatches.length) return;
        searchIdx = (searchIdx + 1) % searchMatches.length;
        if (searchStatus) searchStatus.textContent = `${searchIdx + 1}/${searchMatches.length} (p.${searchMatches[searchIdx]})`;
        goToPage(searchMatches[searchIdx]);
      });
    }

    // Copy Current Page Text
    if (copyTextBtn) {
      copyTextBtn.addEventListener('click', async () => {
        if (moreMenu) moreMenu.classList.add('hidden');
        if (!pdfDoc) return;
        try {
          const page = await pdfDoc.getPage(currentPage);
          const tc = await page.getTextContent();
          const text = tc.items.map((it) => it.str || '').join(' ').trim();
          if (!text) {
            global.utils?.showToast?.('Scanned Page', 'No selectable text on this page. Use OCR Text Extractor instead.', 'info');
            return;
          }
          await navigator.clipboard.writeText(text);
          global.utils?.showToast?.('Copied!', `Copied text from Page ${currentPage}.`);
        } catch {
          global.utils?.showToast?.('Copy Failed', 'Could not copy page text to clipboard.', 'error');
        }
      });
    }

    // Save to Personal Document Center (Vault)
    if (saveVaultBtn) {
      saveVaultBtn.addEventListener('click', async () => {
        if (moreMenu) moreMenu.classList.add('hidden');
        if (!rawBytes) return;
        if (typeof global.saveBlobToPdfBondhuVault === 'function') {
          await global.saveBlobToPdfBondhuVault(rawBytes.slice().buffer, currentFileName, 'application/pdf', 'Personal');
        } else {
          global.utils?.downloadBlob?.(new Blob([rawBytes], { type: 'application/pdf' }), currentFileName);
        }
      });
    }

    // Share PDF
    if (shareBtn) {
      shareBtn.addEventListener('click', async () => {
        if (!rawBytes) return;
        const blob = new Blob([rawBytes], { type: 'application/pdf' });
        if (global.AndroidBridge && typeof global.AndroidBridge.shareBase64File === 'function') {
          const reader = new FileReader();
          reader.onloadend = () => {
            const b64 = String(reader.result || '').split(',')[1] || '';
            global.AndroidBridge.shareBase64File(b64, currentFileName, 'application/pdf');
          };
          reader.readAsDataURL(blob);
          return;
        }
        try {
          const fileObj = new File([blob], currentFileName, { type: 'application/pdf' });
          if (navigator.canShare && navigator.canShare({ files: [fileObj] })) {
            await navigator.share({ title: currentFileName, files: [fileObj] });
            return;
          }
        } catch {}
        global.utils?.downloadBlob?.(blob, currentFileName);
      });
    }

    // Print PDF (Native Android PrintManager inside APK, iframe print on Web)
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        if (moreMenu) moreMenu.classList.add('hidden');
        if (!rawBytes) return;
        if (global.AndroidBridge && typeof global.AndroidBridge.printDocument === 'function') {
          global.AndroidBridge.printDocument(currentFileName || 'PDF-Bondhu-Document');
          return;
        }
        const blob = new Blob([rawBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;
        document.body.appendChild(iframe);
        iframe.onload = () => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch {
            window.print();
          }
          setTimeout(() => {
            try { document.body.removeChild(iframe); } catch {}
            URL.revokeObjectURL(url);
          }, 60000);
        };
      });
    }

    // Android Native "Open With -> PDF Bondhu" Bridge -> Auto-detects PDF, Word, Excel, PPT & opens Full-Screen!
    global.openExternalDocFromAndroid = async function (localUrl, displayName, mimeType) {
      try {
        global.utils?.showLoader?.('Opening Document Full-Screen...', 'text-emerald-500');
        const resp = await fetch(localUrl, { cache: 'no-store' });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const ab = await resp.arrayBuffer();
        const bytes = new Uint8Array(ab);
        const headerMime = resp.headers.get('content-type') || '';
        const finalMime = mimeType || headerMime;
        if (typeof global.openUniversalDocumentFile === 'function') {
          await global.openUniversalDocumentFile(bytes, displayName || 'Phone-Document', finalMime);
        } else {
          await loadPdfBytes(bytes, displayName || 'Phone-Document.pdf');
        }
      } catch (err) {
        console.error('Failed to open external Android document:', err);
        global.utils?.hideLoader?.();
        closeFullscreenOverlay();
        if (typeof global.closeOfficeDocFullscreen === 'function') global.closeOfficeDocFullscreen();
        global.utils?.showToast?.('Open Failed', 'Could not read the selected document from device.', 'error');
      }
    };

    // Backward-compatible alias for older APKs
    global.openExternalPdfFromAndroid = function (localUrl, displayName) {
      return global.openExternalDocFromAndroid(localUrl, displayName, '');
    };

    // Multi-File Share Handler (Gallery multi-photos -> 1 Instant A4 PDF, or Multi-PDF -> Auto-Merged PDF)
    global.openExternalMultiDocsFromAndroid = async function (jsonStr) {
      try {
        const items = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
        if (!Array.isArray(items) || !items.length) return;
        if (items.length === 1) {
          return global.openExternalDocFromAndroid(items[0].url, items[0].name || 'Document', items[0].mime || '');
        }
        global.utils?.showLoader?.(`Combining ${items.length} shared files...`, 'text-emerald-500');
        const loaded = [];
        for (const it of items.slice(0, 40)) {
          try {
            const r = await fetch(it.url, { cache: 'no-store' });
            if (!r.ok) continue;
            const bytes = new Uint8Array(await r.arrayBuffer());
            const mime = it.mime || r.headers.get('content-type') || '';
            loaded.push({ bytes, name: it.name || 'File', mime });
          } catch {}
        }
        if (!loaded.length) throw new Error('No readable files');

        const isPdfBytes = (b) => b.length >= 5 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d;
        const pdfItems = loaded.filter((x) => isPdfBytes(x.bytes) || x.mime.includes('pdf') || x.name.toLowerCase().endsWith('.pdf'));

        if (pdfItems.length >= 2 && typeof window.PDFLib !== 'undefined') {
          const merged = await window.PDFLib.PDFDocument.create();
          for (const item of pdfItems) {
            try {
              const srcDoc = await window.PDFLib.PDFDocument.load(item.bytes, { ignoreEncryption: true });
              const pages = await merged.copyPages(srcDoc, srcDoc.getPageIndices());
              pages.forEach((p) => merged.addPage(p));
            } catch {}
          }
          const outBytes = await merged.save();
          global.utils?.hideLoader?.();
          if (typeof global._openPdfBytesInReader === 'function') {
            await global._openPdfBytesInReader(outBytes, `Merged_${pdfItems.length}_PDFs.pdf`);
            global.utils?.showToast?.('PDFs Merged!', `Combined ${pdfItems.length} PDFs into 1 file. Tap Share or Save.`);
            return;
          }
        }

        if (typeof global._convertImagesToA4PdfBytes === 'function' && typeof window.PDFLib !== 'undefined') {
          const imgItems = loaded.filter((x) => !isPdfBytes(x.bytes));
          if (imgItems.length >= 1) {
            const pdfBytes = await global._convertImagesToA4PdfBytes(imgItems);
            global.utils?.hideLoader?.();
            if (typeof global._openPdfBytesInReader === 'function') {
              await global._openPdfBytesInReader(pdfBytes, `Photos_${imgItems.length}_Pages.pdf`);
              global.utils?.showToast?.('Instant PDF Ready!', `Combined ${imgItems.length} photos into 1 clean PDF. Tap Share or Save.`);
              return;
            }
          }
        }

        global.utils?.hideLoader?.();
        if (typeof global.openUniversalDocumentFile === 'function') {
          await global.openUniversalDocumentFile(loaded[0].bytes, loaded[0].name, loaded[0].mime);
        }
      } catch (err) {
        console.error('Multi-doc share open failed:', err);
        global.utils?.hideLoader?.();
        global.utils?.showToast?.('Share Failed', 'Could not combine the shared files.', 'error');
      }
    };

    // Cold-start safety net for Android Document / Multi-Doc / PDF intent
    setTimeout(() => {
      try {
        const bridge = global.AndroidBridge;
        if (!bridge) return;
        if (typeof bridge.getPendingExternalMultiDocs === 'function') {
          const multiRaw = bridge.getPendingExternalMultiDocs();
          if (multiRaw) {
            global.openExternalMultiDocsFromAndroid(multiRaw);
            return;
          }
        }
        let raw = '';
        if (typeof bridge.getPendingExternalDoc === 'function') {
          raw = bridge.getPendingExternalDoc();
        } else if (typeof bridge.getPendingExternalPdf === 'function') {
          raw = bridge.getPendingExternalPdf();
        }
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.url) {
            global.openExternalDocFromAndroid(parsed.url, parsed.name || 'Document', parsed.mime || '');
          }
        }
      } catch (e) {
        console.warn('Pending external document check failed:', e);
      }
    }, 350);

    // PWA File Handler API (PDF, Word, Excel, PPT, CSV, RTF, TXT)
    if ('launchQueue' in window && window.launchQueue && typeof window.launchQueue.setConsumer === 'function') {
      window.launchQueue.setConsumer(async (launchParams) => {
        if (!launchParams || !launchParams.files || !launchParams.files.length) return;
        try {
          const fileHandle = launchParams.files[0];
          const file = await fileHandle.getFile();
          if (file) await handleFileObject(file);
        } catch (e) {
          console.error('PWA launchQueue document error:', e);
        }
      });
    }
  }

  /* ========================================================================
     8. Universal All-Document Auto-Router & Full-Screen Office Viewer
        Supports: Word (.docx/.doc/.rtf/.txt), Excel (.xlsx/.xls/.csv/.ods),
        PowerPoint (.pptx/.ppt) + seamless routing to PDF Reader (.pdf).
     ======================================================================== */
  function initOfficeDocReader() {
    const overlay = document.getElementById('officeDocFullscreenOverlay');
    const closeBtn = document.getElementById('officeDocCloseBtn');
    const typeBadge = document.getElementById('officeDocTypeBadge');
    const fileNameEl = document.getElementById('officeDocFileName');
    const fileMetaEl = document.getElementById('officeDocFileMeta');

    const searchToggleBtn = document.getElementById('officeDocSearchToggleBtn');
    const searchBar = document.getElementById('officeDocSearchBar');
    const searchInput = document.getElementById('officeDocSearchInput');
    const searchBtn = document.getElementById('officeDocSearchBtn');
    const searchPrevBtn = document.getElementById('officeDocSearchPrevBtn');
    const searchNextBtn = document.getElementById('officeDocSearchNextBtn');
    const searchStatus = document.getElementById('officeDocSearchStatus');
    const searchCloseBtn = document.getElementById('officeDocSearchCloseBtn');

    const shareBtn = document.getElementById('officeDocShareBtn');
    const moreBtn = document.getElementById('officeDocMoreBtn');
    const moreMenu = document.getElementById('officeDocMoreMenu');
    const openAnotherBtn = document.getElementById('officeDocOpenAnotherBtn');
    const saveVaultBtn = document.getElementById('officeDocSaveVaultBtn');
    const copyTextBtn = document.getElementById('officeDocCopyTextBtn');
    const exportBtn = document.getElementById('officeDocExportBtn');
    const printBtn = document.getElementById('officeDocPrintBtn');

    const stage = document.getElementById('officeDocStage');
    const wordView = document.getElementById('officeWordView');
    const wordNotice = document.getElementById('officeWordNotice');
    const wordPaper = document.getElementById('officeWordPaper');
    const excelView = document.getElementById('officeExcelView');
    const excelTableWrap = document.getElementById('officeExcelTableWrap');
    const excelTable = document.getElementById('officeExcelTable');
    const excelLoadMoreWrap = document.getElementById('officeExcelLoadMoreWrap');
    const excelLoadMoreBtn = document.getElementById('officeExcelLoadMoreBtn');
    const pptView = document.getElementById('officePptView');
    const pptNotice = document.getElementById('officePptNotice');
    const pptSlidesContainer = document.getElementById('officePptSlidesContainer');
    const imageView = document.getElementById('officeImageView');
    const imageEl = document.getElementById('officeImageEl');
    const zipView = document.getElementById('officeZipView');
    const zipHeaderInfo = document.getElementById('officeZipHeaderInfo');
    const zipFileList = document.getElementById('officeZipFileList');

    const wordControls = document.getElementById('officeWordControls');
    const wordZoomOut = document.getElementById('officeWordZoomOut');
    const wordZoomLabel = document.getElementById('officeWordZoomLabel');
    const wordZoomIn = document.getElementById('officeWordZoomIn');
    const wordStats = document.getElementById('officeWordStats');
    const wordThemeBtn = document.getElementById('officeWordThemeBtn');

    const excelControls = document.getElementById('officeExcelControls');
    const excelSheetTabs = document.getElementById('officeExcelSheetTabs');
    const excelStats = document.getElementById('officeExcelStats');
    const excelZoomOut = document.getElementById('officeExcelZoomOut');
    const excelZoomLabel = document.getElementById('officeExcelZoomLabel');
    const excelZoomIn = document.getElementById('officeExcelZoomIn');

    const pptControls = document.getElementById('officePptControls');
    const pptPrevBtn = document.getElementById('officePptPrevBtn');
    const pptCounter = document.getElementById('officePptCounter');
    const pptNextBtn = document.getElementById('officePptNextBtn');
    const pptZoomOut = document.getElementById('officePptZoomOut');
    const pptZoomLabel = document.getElementById('officePptZoomLabel');
    const pptZoomIn = document.getElementById('officePptZoomIn');
    const pptModeBtn = document.getElementById('officePptModeBtn');
    const pptNotesBtn = document.getElementById('officePptNotesBtn');

    const imgControls = document.getElementById('officeImageControls');
    const imgZoomOut = document.getElementById('officeImgZoomOut');
    const imgZoomLabel = document.getElementById('officeImgZoomLabel');
    const imgZoomIn = document.getElementById('officeImgZoomIn');
    const imgRotateBtn = document.getElementById('officeImgRotateBtn');
    const imgToPdfBtn = document.getElementById('officeImgToPdfBtn');

    const zipControls = document.getElementById('officeZipControls');
    const zipStats = document.getElementById('officeZipStats');
    const zipExtractAllBtn = document.getElementById('officeZipExtractAllBtn');

    const resumeBtn = document.getElementById('pdfReaderResumeBtn');

    if (!overlay || !stage) return;

    // Active Office Session State
    let activeKind = null; // 'word' | 'excel' | 'ppt' | 'image' | 'zip'
    let activeExt = '';
    let activeMime = 'application/octet-stream';
    let activeFileName = 'Document';
    let activeBytes = null;
    let activePlainText = '';
    let objectUrlsToRevoke = [];

    // Word state
    let wordZoom = 1.0;
    let wordTheme = 'light'; // 'light' | 'sepia' | 'night'

    // Excel state
    let excelWorkbook = null;
    let excelActiveSheet = '';
    let excelAllRows = [];
    let excelFilteredRows = [];
    let excelRenderedCount = 0;
    const EXCEL_CHUNK_SIZE = 200;
    let excelZoom = 1.0;
    let excelMaxCols = 0;

    // PowerPoint state
    let pptSlides = []; // [{ num, title, blocks: [{type, text, rows}], images: [url], notes }]
    let pptMode = 'scroll'; // 'scroll' | 'single'
    let pptCurrentSlide = 0;
    let pptShowNotes = false;
    let pptZoom = 1.0;

    // Photo state
    let imgZoom = 1.0;
    let imgRotation = 0;

    // ZIP state
    let activeZip = null;
    let activeZipEntries = [];

    // Search state (Word / PPT)
    let searchHitElements = [];
    let searchHitIndex = -1;

    function revokeTempUrls() {
      for (const u of objectUrlsToRevoke) {
        try { URL.revokeObjectURL(u); } catch {}
      }
      objectUrlsToRevoke = [];
    }

    function openOfficeOverlay() {
      if (typeof global.isPdfReaderFullscreenOpen === 'function' && global.isPdfReaderFullscreenOpen()) {
        if (typeof global.closePdfReaderFullscreen === 'function') global.closePdfReaderFullscreen();
      }
      overlay.classList.remove('hidden');
      overlay.classList.add('flex');
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    }

    function closeOfficeOverlay() {
      overlay.classList.add('hidden');
      overlay.classList.remove('flex');
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      if (moreMenu) moreMenu.classList.add('hidden');
      if (searchBar) searchBar.classList.add('hidden');
      if (resumeBtn && activeBytes && activeKind) {
        global._lastOpenedReaderKind = 'office';
        const labelMap = { word: 'Word', excel: 'Excel', ppt: 'PPT', image: 'Photo', zip: 'ZIP' };
        const label = labelMap[activeKind] || 'File';
        const shortName = activeFileName.length > 18 ? activeFileName.slice(0, 18) + '…' : activeFileName;
        resumeBtn.textContent = `Resume ${label}: ${shortName}`;
        resumeBtn.classList.remove('hidden');
      }
    }

    global.closeOfficeDocFullscreen = closeOfficeOverlay;
    global.isOfficeDocFullscreenOpen = () => !overlay.classList.contains('hidden');
    global._resumeOfficeReader = () => {
      if (!activeBytes || !activeKind) return;
      openOfficeOverlay();
    };

    // ---- Magic-Bytes + MIME + Extension Universal File Type Detector ----
    function bytesStartWith(bytes, sig) {
      if (!bytes || bytes.length < sig.length) return false;
      for (let i = 0; i < sig.length; i++) {
        if (bytes[i] !== sig[i]) return false;
      }
      return true;
    }

    function searchUtf16LeAscii(bytes, needle) {
      const maxScan = Math.min(bytes.length, 512 * 1024);
      const nLen = needle.length;
      if (nLen === 0 || maxScan < nLen * 2) return false;
      for (let i = 0; i <= maxScan - nLen * 2; i++) {
        let ok = true;
        for (let j = 0; j < nLen; j++) {
          if (bytes[i + j * 2] !== needle.charCodeAt(j) || bytes[i + j * 2 + 1] !== 0) {
            ok = false;
            break;
          }
        }
        if (ok) return true;
      }
      return false;
    }

    async function detectDocumentType(bytes, fileName, mimeType) {
      const lowerName = String(fileName || '').toLowerCase();
      const extMatch = lowerName.match(/\.([a-z0-9]{1,8})$/);
      const ext = extMatch ? extMatch[1] : '';
      const mime = String(mimeType || '').toLowerCase().split(';')[0].trim();

      // 1. Check PDF magic bytes (%PDF-)
      if (bytesStartWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
        return { kind: 'pdf', ext: 'pdf', mime: 'application/pdf' };
      }

      // 2. Check RTF magic bytes ({\rtf)
      if (bytesStartWith(bytes, [0x7b, 0x5c, 0x72, 0x74, 0x66])) {
        return { kind: 'word', ext: 'rtf', mime: 'application/rtf' };
      }

      // 2b. Check Image magic bytes (JPEG, PNG, GIF, WebP, BMP)
      if (bytesStartWith(bytes, [0xff, 0xd8, 0xff])) {
        return { kind: 'image', ext: 'jpg', mime: 'image/jpeg' };
      }
      if (bytesStartWith(bytes, [0x89, 0x50, 0x4e, 0x47])) {
        return { kind: 'image', ext: 'png', mime: 'image/png' };
      }
      if (bytesStartWith(bytes, [0x47, 0x49, 0x46, 0x38])) {
        return { kind: 'image', ext: 'gif', mime: 'image/gif' };
      }
      if (
        bytesStartWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
        bytes.length >= 12 &&
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
      ) {
        return { kind: 'image', ext: 'webp', mime: 'image/webp' };
      }
      if (bytesStartWith(bytes, [0x42, 0x4d]) && (ext === 'bmp' || mime === 'image/bmp')) {
        return { kind: 'image', ext: 'bmp', mime: 'image/bmp' };
      }

      // 3. Check OOXML / ZIP container (PK\x03\x04)
      if (bytesStartWith(bytes, [0x50, 0x4b, 0x03, 0x04])) {
        if (ext === 'docx' || mime.includes('wordprocessingml')) {
          return { kind: 'word', ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
        }
        if (ext === 'xlsx' || mime.includes('spreadsheetml')) {
          return { kind: 'excel', ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
        }
        if (ext === 'ods' || mime.includes('opendocument.spreadsheet')) {
          return { kind: 'excel', ext: 'ods', mime: 'application/vnd.oasis.opendocument.spreadsheet' };
        }
        if (ext === 'pptx' || mime.includes('presentationml')) {
          return { kind: 'ppt', ext: 'pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' };
        }
        // Ambiguous filename (or genuine .zip archive) -> peek inside ZIP!
        if (typeof window.JSZip !== 'undefined') {
          try {
            const zip = await window.JSZip.loadAsync(bytes);
            if (zip.file('word/document.xml')) {
              return { kind: 'word', ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
            }
            if (zip.file('xl/workbook.xml')) {
              return { kind: 'excel', ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
            }
            if (zip.file('ppt/presentation.xml')) {
              return { kind: 'ppt', ext: 'pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' };
            }
            if (zip.file('content.xml') && zip.file('mimetype')) {
              const mt = (await zip.file('mimetype').async('text')).trim();
              if (mt.includes('spreadsheet')) return { kind: 'excel', ext: 'ods', mime: mt };
            }
          } catch {}
        }
        return { kind: 'zip', ext: 'zip', mime: 'application/zip' };
      }

      // 4. Check legacy OLE2 Binary Office container (D0 CF 11 E0 A1 B1 1A E1) -> .doc / .xls / .ppt
      if (bytesStartWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
        if (ext === 'xls' || mime === 'application/vnd.ms-excel') {
          return { kind: 'excel', ext: 'xls', mime: 'application/vnd.ms-excel' };
        }
        if (ext === 'ppt' || mime === 'application/vnd.ms-powerpoint') {
          return { kind: 'ppt', ext: 'ppt', mime: 'application/vnd.ms-powerpoint' };
        }
        if (ext === 'doc' || mime === 'application/msword') {
          return { kind: 'word', ext: 'doc', mime: 'application/msword' };
        }
        // Inspect OLE2 directory stream names when filename/MIME is missing
        if (searchUtf16LeAscii(bytes, 'Workbook') || searchUtf16LeAscii(bytes, 'Book')) {
          return { kind: 'excel', ext: 'xls', mime: 'application/vnd.ms-excel' };
        }
        if (searchUtf16LeAscii(bytes, 'PowerPoint Document')) {
          return { kind: 'ppt', ext: 'ppt', mime: 'application/vnd.ms-powerpoint' };
        }
        return { kind: 'word', ext: 'doc', mime: 'application/msword' };
      }

      // 5. Fallback by extension & MIME
      if (ext === 'pdf' || mime === 'application/pdf') return { kind: 'pdf', ext: 'pdf', mime: 'application/pdf' };
      if (ext === 'docx' || mime.includes('wordprocessingml')) return { kind: 'word', ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
      if (ext === 'doc' || mime === 'application/msword') return { kind: 'word', ext: 'doc', mime: 'application/msword' };
      if (ext === 'rtf' || mime.includes('rtf')) return { kind: 'word', ext: 'rtf', mime: 'application/rtf' };
      if (ext === 'xlsx' || mime.includes('spreadsheetml')) return { kind: 'excel', ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
      if (ext === 'xls' || mime === 'application/vnd.ms-excel') return { kind: 'excel', ext: 'xls', mime: 'application/vnd.ms-excel' };
      if (ext === 'ods' || mime.includes('opendocument.spreadsheet')) return { kind: 'excel', ext: 'ods', mime: 'application/vnd.oasis.opendocument.spreadsheet' };
      if (ext === 'csv' || mime === 'text/csv' || mime === 'text/comma-separated-values') return { kind: 'excel', ext: 'csv', mime: 'text/csv' };
      if (ext === 'pptx' || mime.includes('presentationml')) return { kind: 'ppt', ext: 'pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' };
      if (ext === 'ppt' || mime === 'application/vnd.ms-powerpoint') return { kind: 'ppt', ext: 'ppt', mime: 'application/vnd.ms-powerpoint' };
      if (ext === 'txt' || mime === 'text/plain') return { kind: 'word', ext: 'txt', mime: 'text/plain' };
      if (ext === 'zip' || mime.includes('zip')) return { kind: 'zip', ext: 'zip', mime: 'application/zip' };
      if (/^(jpg|jpeg|png|webp|gif|bmp)$/.test(ext) || mime.startsWith('image/')) {
        return { kind: 'image', ext: ext || 'jpg', mime: mime.startsWith('image/') ? mime : 'image/jpeg' };
      }

      return { kind: 'unknown', ext: ext || 'bin', mime: mime || 'application/octet-stream' };
    }

    // ---- Strict DOM Whitelist Sanitizer for Mammoth HTML output (Zero XSS) ----
    const ALLOWED_TAGS = new Set([
      'p', 'div', 'span', 'br', 'hr',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins', 'sub', 'sup',
      'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
      'img', 'a'
    ]);

    function sanitizeNode(node, outDoc) {
      if (node.nodeType === Node.TEXT_NODE) {
        return outDoc.createTextNode(node.nodeValue || '');
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return null;

      const tag = node.tagName.toLowerCase();
      if (tag === 'script' || tag === 'style' || tag === 'iframe' || tag === 'object' || tag === 'embed' || tag === 'svg' || tag === 'form' || tag === 'meta' || tag === 'link') {
        return null;
      }

      if (!ALLOWED_TAGS.has(tag)) {
        const frag = outDoc.createDocumentFragment();
        for (const child of Array.from(node.childNodes)) {
          const cleanChild = sanitizeNode(child, outDoc);
          if (cleanChild) frag.appendChild(cleanChild);
        }
        return frag;
      }

      const el = outDoc.createElement(tag);
      if (tag === 'img') {
        const src = (node.getAttribute('src') || '').trim();
        if (/^data:image\/(png|jpeg|jpg|gif|webp|bmp);base64,[a-z0-9+/=\s]+$/i.test(src)) {
          el.setAttribute('src', src);
        } else {
          return null;
        }
        const alt = node.getAttribute('alt');
        if (alt) el.setAttribute('alt', alt.slice(0, 120));
      } else if (tag === 'a') {
        const href = (node.getAttribute('href') || '').trim();
        if (/^(https?:|mailto:)/i.test(href)) {
          el.setAttribute('href', href);
          el.setAttribute('target', '_blank');
          el.setAttribute('rel', 'noopener noreferrer');
        }
      } else if (tag === 'th' || tag === 'td') {
        const cs = parseInt(node.getAttribute('colspan') || '', 10);
        const rs = parseInt(node.getAttribute('rowspan') || '', 10);
        if (cs > 1 && cs <= 50) el.setAttribute('colspan', String(cs));
        if (rs > 1 && rs <= 50) el.setAttribute('rowspan', String(rs));
      }

      for (const child of Array.from(node.childNodes)) {
        const cleanChild = sanitizeNode(child, outDoc);
        if (cleanChild) el.appendChild(cleanChild);
      }
      return el;
    }

    function renderSanitizedHtmlInto(container, rawHtml) {
      container.textContent = '';
      const parser = new DOMParser();
      const parsed = parser.parseFromString(String(rawHtml || ''), 'text/html');
      const frag = document.createDocumentFragment();
      for (const child of Array.from(parsed.body.childNodes)) {
        const clean = sanitizeNode(child, document);
        if (clean) frag.appendChild(clean);
      }
      container.appendChild(frag);
    }

    // ---- Offline JSZip DOCX Fallback Parser (if Mammoth CDN not yet cached) ----
    async function parseDocxWithJsZipFallback(bytes) {
      const frag = document.createDocumentFragment();
      if (typeof window.JSZip === 'undefined') {
        const p = document.createElement('p');
        p.textContent = 'Offline Word engine unavailable. Connect once to cache full Word support.';
        frag.appendChild(p);
        return frag;
      }
      const zip = await window.JSZip.loadAsync(bytes);
      const docXmlFile = zip.file('word/document.xml');
      if (!docXmlFile) throw new Error('Invalid DOCX');
      const xmlText = await docXmlFile.async('text');
      const xmlDoc = new DOMParser().parseFromString(xmlText, 'application/xml');
      const body = xmlDoc.getElementsByTagNameNS('*', 'body')[0];
      if (!body) return frag;

      for (const child of Array.from(body.childNodes)) {
        const local = child.localName || '';
        if (local === 'p') {
          const texts = Array.from(child.getElementsByTagNameNS('*', 't')).map((t) => t.textContent || '');
          const line = texts.join('').trim();
          if (!line) continue;
          const pStyle = child.getElementsByTagNameNS('*', 'pStyle')[0]?.getAttribute('w:val') || '';
          const tag = /^Heading1/i.test(pStyle) ? 'h1' : /^Heading2/i.test(pStyle) ? 'h2' : /^Heading3/i.test(pStyle) ? 'h3' : 'p';
          const el = document.createElement(tag);
          el.textContent = line;
          frag.appendChild(el);
        } else if (local === 'tbl') {
          const table = document.createElement('table');
          const tbody = document.createElement('tbody');
          const rows = Array.from(child.getElementsByTagNameNS('*', 'tr'));
          rows.forEach((trNode, rIdx) => {
            const tr = document.createElement('tr');
            const cells = Array.from(trNode.getElementsByTagNameNS('*', 'tc'));
            cells.forEach((tcNode) => {
              const cell = document.createElement(rIdx === 0 ? 'th' : 'td');
              const txt = Array.from(tcNode.getElementsByTagNameNS('*', 't')).map((t) => t.textContent || '').join(' ').trim();
              cell.textContent = txt;
              tr.appendChild(cell);
            });
            tbody.appendChild(tr);
          });
          table.appendChild(tbody);
          frag.appendChild(table);
        }
      }
      return frag;
    }

    // ---- Legacy Binary .DOC / .PPT Text Recovery Parser ----
    function extractLegacyBinaryParagraphs(bytes) {
      const results = [];
      const seen = new Set();

      function pushLine(raw) {
        const clean = raw.replace(/\s+/g, ' ').trim();
        if (clean.length < 3) return;
        // Skip internal OLE2 stream/font/metadata noise
        if (/^(Root Entry|WordDocument|1Table|0Table|SummaryInformation|DocumentSummaryInformation|CompObj|MsoDataStore|PowerPoint Document|Current User|Pictures|Times New Roman|Calibri|Cambria|Arial|Normal|Default Paragraph Font|Heading \d|Microsoft Office|HYPERLINK|EMBED|PAGEREF|TOC \\o)$/i.test(clean)) return;
        if (/^[\d\W_]+$/.test(clean) && clean.length < 6) return;
        if (seen.has(clean)) return;
        seen.add(clean);
        results.push(clean);
      }

      // Pass 1: UTF-16LE text runs (supports English, Bengali U+0980-09FF, Hindi U+0900-097F & Unicode!)
      let buf = '';
      for (let i = 0; i + 1 < bytes.length; i += 2) {
        const code = bytes[i] | (bytes[i + 1] << 8);
        const isPrintable =
          (code >= 0x20 && code <= 0x7e) ||
          (code >= 0x0900 && code <= 0x09ff) ||
          (code >= 0x00a0 && code <= 0x024f) ||
          code === 0x2013 || code === 0x2014 || code === 0x2018 || code === 0x2019 || code === 0x201c || code === 0x201d || code === 0x2022 || code === 0x20b9;
        if (isPrintable) {
          buf += String.fromCharCode(code);
        } else if (code === 0x0d || code === 0x0a || code === 0x09) {
          if (buf.length >= 4) pushLine(buf);
          buf = '';
        } else {
          if (buf.length >= 8) pushLine(buf);
          buf = '';
        }
      }
      if (buf.length >= 4) pushLine(buf);

      // Pass 2: ASCII runs if UTF-16LE recovered very little (classic Word 97-2003 single-byte docs)
      if (results.length < 3) {
        let abuf = '';
        for (let i = 0; i < bytes.length; i++) {
          const b = bytes[i];
          if (b >= 0x20 && b <= 0x7e) {
            abuf += String.fromCharCode(b);
          } else if (b === 0x0d || b === 0x0a) {
            if (abuf.length >= 8) pushLine(abuf);
            abuf = '';
          } else {
            if (abuf.length >= 12) pushLine(abuf);
            abuf = '';
          }
        }
        if (abuf.length >= 8) pushLine(abuf);
      }

      return results;
    }

    // ---- RTF Text Extractor ----
    function parseRtfToParagraphs(bytes) {
      const raw = new TextDecoder('latin1').decode(bytes);
      let out = '';
      let depth = 0;
      let skipDepth = -1;
      const skipGroups = new Set(['fonttbl', 'colortbl', 'stylesheet', 'info', 'pict', 'object', 'header', 'footer', 'listtable', 'listoverridetable', 'revtbl', 'themedata', 'colorschememapping']);

      for (let i = 0; i < raw.length; i++) {
        const ch = raw[i];
        if (ch === '{') {
          depth++;
          if (skipDepth === -1) {
            const ahead = raw.slice(i + 1, i + 28);
            const m = ahead.match(/^\\\*?\\([a-z]+)/i);
            if (m && skipGroups.has(m[1].toLowerCase())) {
              skipDepth = depth;
            }
          }
        } else if (ch === '}') {
          if (depth === skipDepth) skipDepth = -1;
          depth = Math.max(0, depth - 1);
        } else if (skipDepth !== -1) {
          continue;
        } else if (ch === '\\') {
          const next = raw[i + 1] || '';
          if (next === '\'' && i + 3 < raw.length) {
            const hex = parseInt(raw.slice(i + 2, i + 4), 16);
            if (!Number.isNaN(hex)) out += String.fromCharCode(hex);
            i += 3;
          } else if (next === '\\' || next === '{' || next === '}') {
            out += next;
            i++;
          } else if (next === '\n' || next === '\r') {
            out += '\n';
            i++;
          } else {
            const m = raw.slice(i + 1).match(/^([a-z]+)(-?\d+)?\s?/i);
            if (m) {
              const word = m[1].toLowerCase();
              if (word === 'par' || word === 'line') out += '\n';
              else if (word === 'tab') out += '  ';
              else if (word === 'u' && m[2]) {
                let code = parseInt(m[2], 10);
                if (code < 0) code += 65536;
                out += String.fromCharCode(code);
              }
              i += m[0].length;
            }
          }
        } else if (ch !== '\r' && ch !== '\n') {
          out += ch;
        }
      }
      return out.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    }

    // ---- Shared Header Styling by Document Type ----
    function configureOfficeChrome(kind, name, metaText) {
      activeKind = kind;
      activeFileName = name || 'Document';
      if (fileNameEl) fileNameEl.textContent = activeFileName;
      if (fileMetaEl) fileMetaEl.textContent = metaText || '100% Ad-Free · Offline';

      if (typeBadge) {
        typeBadge.className = 'px-2 py-1 rounded-lg text-white text-[10px] font-black tracking-wide shrink-0 ';
        if (kind === 'word') {
          typeBadge.textContent = activeExt === 'txt' ? 'TXT' : activeExt === 'rtf' ? 'RTF' : 'WORD';
          typeBadge.className += 'bg-blue-600';
        } else if (kind === 'excel') {
          typeBadge.textContent = activeExt === 'csv' ? 'CSV' : 'EXCEL';
          typeBadge.className += 'bg-emerald-600';
        } else if (kind === 'image') {
          typeBadge.textContent = 'PHOTO';
          typeBadge.className += 'bg-pink-600';
        } else if (kind === 'zip') {
          typeBadge.textContent = 'ZIP';
          typeBadge.className += 'bg-violet-600';
        } else {
          typeBadge.textContent = 'PPT';
          typeBadge.className += 'bg-orange-500';
        }
      }

      if (wordView) wordView.classList.toggle('hidden', kind !== 'word');
      if (excelView) excelView.classList.toggle('hidden', kind !== 'excel');
      if (pptView) pptView.classList.toggle('hidden', kind !== 'ppt');
      if (imageView) imageView.classList.toggle('hidden', kind !== 'image');
      if (zipView) zipView.classList.toggle('hidden', kind !== 'zip');

      if (wordControls) wordControls.classList.toggle('hidden', kind !== 'word');
      if (excelControls) excelControls.classList.toggle('hidden', kind !== 'excel');
      if (pptControls) pptControls.classList.toggle('hidden', kind !== 'ppt');
      if (imgControls) imgControls.classList.toggle('hidden', kind !== 'image');
      if (zipControls) zipControls.classList.toggle('hidden', kind !== 'zip');

      if (searchToggleBtn) searchToggleBtn.classList.toggle('hidden', kind === 'image');
      if (copyTextBtn) copyTextBtn.classList.toggle('hidden', kind === 'image' || kind === 'zip');

      if (exportBtn) {
        if (kind === 'excel') exportBtn.textContent = activeExt === 'csv' ? 'Export as Excel (.XLSX)' : 'Export Sheet as CSV';
        else if (kind === 'image') exportBtn.textContent = 'Convert to PDF';
        else if (kind === 'zip') exportBtn.textContent = 'Extract All Files';
        else exportBtn.textContent = 'Export as PDF';
      }

      if (searchBar) searchBar.classList.add('hidden');
      if (searchInput) searchInput.value = '';
      if (searchStatus) searchStatus.textContent = '';
      if (searchPrevBtn) searchPrevBtn.classList.add('hidden');
      if (searchNextBtn) searchNextBtn.classList.add('hidden');
      searchHitElements = [];
      searchHitIndex = -1;
    }

    // ---- 1. WORD VIEWER (.docx / .doc / .rtf / .txt) ----
    function applyWordTheme(theme) {
      wordTheme = theme;
      if (!wordPaper || !stage) return;
      wordPaper.classList.remove('bg-white', 'text-slate-900', 'bg-[#F8F1E1]', 'text-[#3D2F1D]', 'bg-[#121826]', 'text-slate-100', 'pb-word-sepia', 'pb-word-night');
      stage.classList.remove('bg-slate-200', 'bg-[#2B2418]', 'bg-[#090D16]');
      if (theme === 'sepia') {
        stage.classList.add('bg-[#2B2418]');
        wordPaper.classList.add('bg-[#F8F1E1]', 'text-[#3D2F1D]', 'pb-word-sepia');
        if (wordThemeBtn) wordThemeBtn.textContent = 'Sepia';
      } else if (theme === 'night') {
        stage.classList.add('bg-[#090D16]');
        wordPaper.classList.add('bg-[#121826]', 'text-slate-100', 'pb-word-night');
        if (wordThemeBtn) wordThemeBtn.textContent = 'Night';
      } else {
        stage.classList.add('bg-slate-200');
        wordPaper.classList.add('bg-white', 'text-slate-900');
        if (wordThemeBtn) wordThemeBtn.textContent = '☀ Light';
      }
    }

    function applyWordZoom() {
      if (wordPaper) wordPaper.style.fontSize = `${Math.round(15 * wordZoom)}px`;
      if (wordZoomLabel) wordZoomLabel.textContent = `${Math.round(wordZoom * 100)}%`;
    }

    async function openWordDocument(bytes, name, ext, mime) {
      activeBytes = bytes;
      activeExt = ext;
      activeMime = mime;
      wordZoom = 1.0;

      const sizeStr = global.utils?.formatBytes ? global.utils.formatBytes(bytes.byteLength) : `${Math.round(bytes.byteLength / 1024)} KB`;
      configureOfficeChrome('word', name, `Word Document · ${sizeStr} · 100% Ad-Free`);
      applyWordTheme(wordTheme);
      applyWordZoom();
      if (wordNotice) { wordNotice.classList.add('hidden'); wordNotice.textContent = ''; }
      if (wordPaper) wordPaper.textContent = '';
      openOfficeOverlay();

      if (ext === 'docx') {
        if (typeof window.mammoth !== 'undefined' && typeof window.mammoth.convertToHtml === 'function') {
          const ab = bytes.slice().buffer;
          const res = await window.mammoth.convertToHtml({ arrayBuffer: ab });
          renderSanitizedHtmlInto(wordPaper, res.value || '<p>(Empty document)</p>');
        } else {
          const frag = await parseDocxWithJsZipFallback(bytes);
          wordPaper.appendChild(frag);
          if (wordNotice) {
            wordNotice.textContent = 'Offline lightweight Word view active. Reconnect once to cache full rich formatting & images.';
            wordNotice.classList.remove('hidden');
          }
        }
      } else if (ext === 'doc') {
        const lines = extractLegacyBinaryParagraphs(bytes);
        if (wordNotice) {
          wordNotice.textContent = 'Legacy Word (.doc) quick-read mode — extracted readable text offline.';
          wordNotice.classList.remove('hidden');
        }
        const frag = document.createDocumentFragment();
        if (!lines.length) {
          const p = document.createElement('p');
          p.textContent = 'This legacy .doc file appears to be password-protected or contains only embedded images.';
          frag.appendChild(p);
        } else {
          lines.forEach((line, idx) => {
            const el = document.createElement(idx === 0 && line.length < 90 ? 'h2' : 'p');
            el.textContent = line;
            frag.appendChild(el);
          });
        }
        wordPaper.appendChild(frag);
      } else if (ext === 'rtf') {
        const lines = parseRtfToParagraphs(bytes);
        const frag = document.createDocumentFragment();
        (lines.length ? lines : ['(Empty RTF document)']).forEach((line) => {
          const p = document.createElement('p');
          p.textContent = line;
          frag.appendChild(p);
        });
        wordPaper.appendChild(frag);
      } else {
        const txt = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
        const pre = document.createElement('pre');
        pre.className = 'whitespace-pre-wrap break-words font-sans text-[1em] leading-relaxed';
        pre.textContent = txt || '(Empty text file)';
        wordPaper.appendChild(pre);
      }

      activePlainText = (wordPaper.innerText || wordPaper.textContent || '').trim();
      const wordCount = activePlainText ? activePlainText.split(/\s+/).filter(Boolean).length : 0;
      if (wordStats) wordStats.textContent = `${wordCount.toLocaleString()} words`;
      if (fileMetaEl) fileMetaEl.textContent = `${wordCount.toLocaleString()} words · ${sizeStr} · 100% Ad-Free`;
      if (stage) stage.scrollTop = 0;
    }

    // ---- 2. EXCEL VIEWER (.xlsx / .xls / .csv / .ods) ----
    function colIndexToLetter(idx) {
      let s = '';
      let n = idx + 1;
      while (n > 0) {
        const rem = (n - 1) % 26;
        s = String.fromCharCode(65 + rem) + s;
        n = Math.floor((n - 1) / 26);
      }
      return s;
    }

    function applyExcelZoom() {
      if (excelTable) excelTable.style.fontSize = `${Math.round(13 * excelZoom)}px`;
      if (excelZoomLabel) excelZoomLabel.textContent = `${Math.round(excelZoom * 100)}%`;
    }

    function appendExcelRowsBatch(tbody) {
      const end = Math.min(excelFilteredRows.length, excelRenderedCount + EXCEL_CHUNK_SIZE);
      const frag = document.createDocumentFragment();
      for (let r = excelRenderedCount; r < end; r++) {
        const rowData = excelFilteredRows[r] || [];
        const tr = document.createElement('tr');
        const numTd = document.createElement('td');
        numTd.className = 'pb-excel-rownum tabular-nums';
        numTd.textContent = String(r + 1);
        tr.appendChild(numTd);

        for (let c = 0; c < excelMaxCols; c++) {
          const td = document.createElement('td');
          const val = rowData[c];
          td.textContent = val === null || val === undefined ? '' : String(val);
          tr.appendChild(td);
        }
        frag.appendChild(tr);
      }
      tbody.appendChild(frag);
      excelRenderedCount = end;

      const remaining = excelFilteredRows.length - excelRenderedCount;
      if (excelLoadMoreWrap && excelLoadMoreBtn) {
        if (remaining > 0) {
          excelLoadMoreWrap.classList.remove('hidden');
          excelLoadMoreBtn.textContent = `Load Next ${Math.min(EXCEL_CHUNK_SIZE, remaining)} Rows (${remaining.toLocaleString()} more)`;
        } else {
          excelLoadMoreWrap.classList.add('hidden');
        }
      }
    }

    function renderExcelGrid(filterQuery = '') {
      if (!excelTable) return;
      const q = filterQuery.trim().toLowerCase();
      if (q) {
        excelFilteredRows = excelAllRows.filter((row, idx) => {
          if (idx === 0) return true; // Keep header row visible
          return Array.isArray(row) && row.some((cell) => String(cell ?? '').toLowerCase().includes(q));
        });
      } else {
        excelFilteredRows = excelAllRows;
      }

      excelTable.textContent = '';
      excelRenderedCount = 0;

      // Determine column count safely (cap at 100 columns for crisp mobile scroll)
      let cols = 0;
      const scanLimit = Math.min(excelFilteredRows.length, 300);
      for (let i = 0; i < scanLimit; i++) {
        const row = excelFilteredRows[i];
        if (Array.isArray(row) && row.length > cols) cols = row.length;
      }
      excelMaxCols = Math.max(1, Math.min(cols, 100));

      const thead = document.createElement('thead');
      const headTr = document.createElement('tr');
      const cornerTh = document.createElement('th');
      cornerTh.className = 'pb-excel-rownum pb-excel-corner';
      cornerTh.textContent = '#';
      headTr.appendChild(cornerTh);
      for (let c = 0; c < excelMaxCols; c++) {
        const th = document.createElement('th');
        th.textContent = colIndexToLetter(c);
        headTr.appendChild(th);
      }
      thead.appendChild(headTr);

      const tbody = document.createElement('tbody');
      tbody.id = 'officeExcelTbody';
      excelTable.appendChild(thead);
      excelTable.appendChild(tbody);

      if (!excelFilteredRows.length) {
        const emptyTr = document.createElement('tr');
        const emptyTd = document.createElement('td');
        emptyTd.colSpan = excelMaxCols + 1;
        emptyTd.className = 'py-10 text-center text-slate-400 font-semibold';
        emptyTd.textContent = 'This sheet is empty.';
        emptyTr.appendChild(emptyTd);
        tbody.appendChild(emptyTr);
        if (excelLoadMoreWrap) excelLoadMoreWrap.classList.add('hidden');
      } else {
        appendExcelRowsBatch(tbody);
      }

      if (excelStats) {
        excelStats.textContent = q
          ? `${Math.max(0, excelFilteredRows.length - 1)} match · ${excelMaxCols} cols`
          : `${excelAllRows.length.toLocaleString()} rows · ${excelMaxCols} cols`;
      }
      if (q && searchStatus) {
        searchStatus.textContent = `${Math.max(0, excelFilteredRows.length - 1)} row(s)`;
      }
    }

    function selectExcelSheet(sheetName) {
      if (!excelWorkbook) return;
      excelActiveSheet = sheetName;
      const sheet = excelWorkbook.Sheets[sheetName];
      excelAllRows = sheet ? window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) : [];
      activePlainText = sheet ? window.XLSX.utils.sheet_to_csv(sheet) : '';

      // Update active sheet tab pill styling
      if (excelSheetTabs) {
        excelSheetTabs.querySelectorAll('button[data-sheet]').forEach((b) => {
          const isAct = b.getAttribute('data-sheet') === sheetName;
          b.className = isAct
            ? 'px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 text-[11px] font-extrabold whitespace-nowrap shrink-0'
            : 'px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-[11px] font-bold whitespace-nowrap shrink-0';
        });
      }

      renderExcelGrid(searchInput ? searchInput.value : '');
      if (excelTableWrap) { excelTableWrap.scrollTop = 0; excelTableWrap.scrollLeft = 0; }
      if (stage) { stage.scrollTop = 0; stage.scrollLeft = 0; }
    }

    async function openExcelDocument(bytes, name, ext, mime) {
      if (typeof window.XLSX === 'undefined') {
        global.utils?.showToast?.('Excel Engine Missing', 'SheetJS library did not load. Please refresh.', 'error');
        return;
      }
      activeBytes = bytes;
      activeExt = ext;
      activeMime = mime;
      excelZoom = 1.0;

      const sizeStr = global.utils?.formatBytes ? global.utils.formatBytes(bytes.byteLength) : `${Math.round(bytes.byteLength / 1024)} KB`;
      excelWorkbook = window.XLSX.read(bytes, { type: 'array' });
      const sheetNames = excelWorkbook.SheetNames || [];
      if (!sheetNames.length) throw new Error('No sheets found');

      configureOfficeChrome('excel', name, `${sheetNames.length} sheet${sheetNames.length > 1 ? 's' : ''} · ${sizeStr} · 100% Ad-Free`);
      if (stage) {
        stage.classList.remove('bg-slate-200', 'bg-[#2B2418]', 'bg-[#090D16]', 'bg-slate-900');
        stage.classList.add('bg-white');
      }
      applyExcelZoom();

      // Build bottom sheet tabs safely
      if (excelSheetTabs) {
        excelSheetTabs.textContent = '';
        sheetNames.forEach((sn) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.setAttribute('data-sheet', sn);
          btn.textContent = sn;
          btn.addEventListener('click', () => selectExcelSheet(sn));
          excelSheetTabs.appendChild(btn);
        });
      }

      openOfficeOverlay();
      selectExcelSheet(sheetNames[0]);
    }

    // ---- 3. POWERPOINT VIEWER (.pptx / .ppt) ----
    async function parsePptxSlides(bytes) {
      if (typeof window.JSZip === 'undefined') {
        throw new Error('JSZip engine missing');
      }
      const zip = await window.JSZip.loadAsync(bytes);
      const slidePaths = Object.keys(zip.files)
        .filter((p) => /^ppt\/slides\/slide\d+\.xml$/i.test(p))
        .sort((a, b) => {
          const na = parseInt(a.match(/slide(\d+)\.xml/i)[1], 10);
          const nb = parseInt(b.match(/slide(\d+)\.xml/i)[1], 10);
          return na - nb;
        });

      const parser = new DOMParser();
      const slides = [];

      for (let idx = 0; idx < slidePaths.length; idx++) {
        const sPath = slidePaths[idx];
        const slideNum = idx + 1;
        const xmlStr = await zip.file(sPath).async('text');
        const xml = parser.parseFromString(xmlStr, 'application/xml');

        let title = '';
        const blocks = [];
        const images = [];
        let notes = '';

        // Resolve slide relationships for embedded images & speaker notes
        const fileName = sPath.split('/').pop();
        const relsPath = `ppt/slides/_rels/${fileName}.rels`;
        const relMap = {};
        let notesRelTarget = '';
        if (zip.file(relsPath)) {
          try {
            const relXml = parser.parseFromString(await zip.file(relsPath).async('text'), 'application/xml');
            Array.from(relXml.getElementsByTagName('Relationship')).forEach((r) => {
              const id = r.getAttribute('Id') || '';
              const target = r.getAttribute('Target') || '';
              const type = r.getAttribute('Type') || '';
              if (id && target) relMap[id] = target;
              if (type.includes('notesSlide') && target) notesRelTarget = target;
            });
          } catch {}
        }

        // Extract images referenced by <a:blip r:embed="...">
        const blips = Array.from(xml.getElementsByTagNameNS('*', 'blip'));
        const seenEmbeds = new Set();
        for (const blip of blips) {
          const rId = blip.getAttribute('r:embed') || blip.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed') || '';
          if (!rId || seenEmbeds.has(rId) || !relMap[rId]) continue;
          seenEmbeds.add(rId);
          const normPath = ('ppt/slides/' + relMap[rId]).replace(/[^/]+\/\.\.\//g, '').replace(/^\.\//, '');
          const mediaFile = zip.file(normPath);
          if (mediaFile) {
            try {
              const mExt = normPath.split('.').pop().toLowerCase();
              const imgMime = mExt === 'png' ? 'image/png' : mExt === 'gif' ? 'image/gif' : mExt === 'webp' ? 'image/webp' : mExt === 'svg' ? 'image/svg+xml' : 'image/jpeg';
              if (imgMime !== 'image/svg+xml') { // Block untrusted SVG scripts
                const mBytes = await mediaFile.async('uint8array');
                const blobUrl = URL.createObjectURL(new Blob([mBytes], { type: imgMime }));
                objectUrlsToRevoke.push(blobUrl);
                images.push(blobUrl);
              }
            } catch {}
          }
        }

        // Extract shapes (<p:sp>) for title & bullet text
        const shapes = Array.from(xml.getElementsByTagNameNS('*', 'sp'));
        for (const sp of shapes) {
          const ph = sp.getElementsByTagNameNS('*', 'ph')[0];
          const phType = ph ? (ph.getAttribute('type') || '').toLowerCase() : '';
          const paras = Array.from(sp.getElementsByTagNameNS('*', 'p'));
          const lines = [];
          for (const p of paras) {
            const txt = Array.from(p.getElementsByTagNameNS('*', 't')).map((t) => t.textContent || '').join('').trim();
            if (txt) lines.push(txt);
          }
          if (!lines.length) continue;

          if (!title && (phType === 'title' || phType === 'ctrtitle')) {
            title = lines.join(' ');
          } else if (phType !== 'sldnum' && phType !== 'ftr' && phType !== 'dt') {
            lines.forEach((ln) => blocks.push({ type: 'bullet', text: ln }));
          }
        }

        // Extract tables (<a:tbl>)
        const tables = Array.from(xml.getElementsByTagNameNS('*', 'tbl'));
        for (const tbl of tables) {
          const rows = Array.from(tbl.getElementsByTagNameNS('*', 'tr')).map((tr) =>
            Array.from(tr.getElementsByTagNameNS('*', 'tc')).map((tc) =>
              Array.from(tc.getElementsByTagNameNS('*', 't')).map((t) => t.textContent || '').join(' ').trim()
            )
          );
          if (rows.length) blocks.push({ type: 'table', rows });
        }

        // Fallback if title empty but first block is short
        if (!title && blocks.length && blocks[0].type === 'bullet' && blocks[0].text.length <= 100) {
          title = blocks.shift().text;
        }

        // Speaker notes
        if (notesRelTarget) {
          const notesPath = ('ppt/slides/' + notesRelTarget).replace(/[^/]+\/\.\.\//g, '');
          const nFile = zip.file(notesPath);
          if (nFile) {
            try {
              const nXml = parser.parseFromString(await nFile.async('text'), 'application/xml');
              notes = Array.from(nXml.getElementsByTagNameNS('*', 't'))
                .map((t) => t.textContent || '')
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim();
            } catch {}
          }
        }

        slides.push({ num: slideNum, title, blocks, images, notes });
      }

      return slides;
    }

    function updatePptNavUi() {
      const total = pptSlides.length || 1;
      if (pptCounter) pptCounter.textContent = `${pptCurrentSlide + 1} / ${total}`;
      if (pptPrevBtn) pptPrevBtn.disabled = pptCurrentSlide <= 0;
      if (pptNextBtn) pptNextBtn.disabled = pptCurrentSlide >= total - 1;
      if (pptModeBtn) pptModeBtn.textContent = pptMode === 'scroll' ? 'Scroll' : 'Slide';
      if (pptZoomLabel) pptZoomLabel.textContent = `${Math.round(pptZoom * 100)}%`;
      if (pptNotesBtn) {
        pptNotesBtn.className = pptShowNotes
          ? 'px-2.5 h-8 rounded-xl bg-amber-400 text-slate-950 text-[11px] font-extrabold whitespace-nowrap'
          : 'px-2.5 h-8 rounded-xl bg-white/15 hover:bg-white/25 text-white text-[11px] font-extrabold whitespace-nowrap';
      }
    }

    function renderPptSlidesDom() {
      if (!pptSlidesContainer) return;
      pptSlidesContainer.textContent = '';

      const list = pptMode === 'single' ? [pptSlides[pptCurrentSlide]].filter(Boolean) : pptSlides;
      const frag = document.createDocumentFragment();

      list.forEach((slide) => {
        const card = document.createElement('section');
        card.className = 'pb-ppt-slide w-full bg-white text-slate-900 rounded-2xl shadow-xl border border-slate-300/80 overflow-hidden flex flex-col';
        card.setAttribute('data-slide-idx', String(slide.num - 1));
        card.style.fontSize = `${Math.round(15 * pptZoom)}px`;
        card.style.minHeight = pptMode === 'single' ? '62vh' : '240px';

        // Accent header strip
        const header = document.createElement('div');
        header.className = 'px-4 py-2.5 bg-gradient-to-r from-orange-600 via-amber-500 to-orange-500 text-white flex items-center justify-between gap-2';
        const badge = document.createElement('span');
        badge.className = 'text-[11px] font-black uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded-md tabular-nums';
        badge.textContent = `Slide ${slide.num} / ${pptSlides.length}`;
        header.appendChild(badge);
        card.appendChild(header);

        // Slide Body
        const body = document.createElement('div');
        body.className = 'p-5 sm:p-8 flex-1 space-y-4 select-text';

        if (slide.title) {
          const h = document.createElement('h2');
          h.className = 'text-[1.4em] font-extrabold text-slate-900 leading-snug border-b border-slate-200 pb-2';
          h.textContent = slide.title;
          body.appendChild(h);
        }

        if (slide.images.length) {
          const imgGrid = document.createElement('div');
          imgGrid.className = slide.images.length > 1 ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'flex justify-center';
          slide.images.forEach((url) => {
            const img = document.createElement('img');
            img.src = url;
            img.alt = `Slide ${slide.num} image`;
            img.className = 'max-h-[340px] max-w-full object-contain rounded-xl border border-slate-200 bg-slate-50 shadow-sm';
            imgGrid.appendChild(img);
          });
          body.appendChild(imgGrid);
        }

        const ul = document.createElement('ul');
        ul.className = 'space-y-2 list-disc pl-5 text-[0.98em] text-slate-800 leading-relaxed';
        let hasBullets = false;

        slide.blocks.forEach((blk) => {
          if (blk.type === 'bullet') {
            const li = document.createElement('li');
            li.textContent = blk.text;
            ul.appendChild(li);
            hasBullets = true;
          } else if (blk.type === 'table') {
            if (hasBullets) {
              body.appendChild(ul.cloneNode(true));
              ul.textContent = '';
              hasBullets = false;
            }
            const tWrap = document.createElement('div');
            tWrap.className = 'overflow-x-auto';
            const table = document.createElement('table');
            table.className = 'w-full border-collapse text-[0.88em]';
            blk.rows.forEach((row, rIdx) => {
              const tr = document.createElement('tr');
              row.forEach((cellVal) => {
                const cell = document.createElement(rIdx === 0 ? 'th' : 'td');
                cell.className = rIdx === 0
                  ? 'border border-slate-300 bg-orange-50 px-2.5 py-1.5 text-left font-bold text-slate-900'
                  : 'border border-slate-300 px-2.5 py-1.5 text-left text-slate-700';
                cell.textContent = cellVal;
                tr.appendChild(cell);
              });
              table.appendChild(tr);
            });
            tWrap.appendChild(table);
            body.appendChild(tWrap);
          }
        });
        if (hasBullets) body.appendChild(ul);

        if (!slide.title && !slide.blocks.length && !slide.images.length) {
          const emptyP = document.createElement('p');
          emptyP.className = 'text-xs text-slate-400 italic text-center py-6';
          emptyP.textContent = '(Visual or blank slide)';
          body.appendChild(emptyP);
        }

        card.appendChild(body);

        if (pptShowNotes && slide.notes) {
          const notesBox = document.createElement('div');
          notesBox.className = 'px-5 py-3 bg-amber-50 border-t border-amber-200 text-xs text-amber-950 leading-relaxed';
          const nLabel = document.createElement('strong');
          nLabel.className = 'block text-[10px] uppercase tracking-wider text-amber-700 mb-1';
          nLabel.textContent = 'Speaker Notes';
          const nText = document.createElement('p');
          nText.textContent = slide.notes;
          notesBox.appendChild(nLabel);
          notesBox.appendChild(nText);
          card.appendChild(notesBox);
        }

        frag.appendChild(card);
      });

      pptSlidesContainer.appendChild(frag);
      updatePptNavUi();
    }

    function goToPptSlide(index) {
      if (!pptSlides.length) return;
      pptCurrentSlide = Math.max(0, Math.min(pptSlides.length - 1, index));
      if (pptMode === 'single') {
        renderPptSlidesDom();
        if (stage) stage.scrollTop = 0;
      } else {
        updatePptNavUi();
        const el = pptSlidesContainer?.querySelector(`[data-slide-idx="${pptCurrentSlide}"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    async function openPptDocument(bytes, name, ext, mime) {
      revokeTempUrls();
      activeBytes = bytes;
      activeExt = ext;
      activeMime = mime;
      pptZoom = 1.0;
      pptCurrentSlide = 0;
      pptShowNotes = false;
      if (pptNotice) { pptNotice.classList.add('hidden'); pptNotice.textContent = ''; }

      const sizeStr = global.utils?.formatBytes ? global.utils.formatBytes(bytes.byteLength) : `${Math.round(bytes.byteLength / 1024)} KB`;

      if (ext === 'pptx') {
        pptSlides = await parsePptxSlides(bytes);
      } else {
        const lines = extractLegacyBinaryParagraphs(bytes);
        if (pptNotice) {
          pptNotice.textContent = 'Legacy PowerPoint (.ppt) quick-read mode — extracted presentation text offline.';
          pptNotice.classList.remove('hidden');
        }
        pptSlides = [];
        const perSlide = 7;
        for (let i = 0; i < lines.length; i += perSlide) {
          const chunk = lines.slice(i, i + perSlide);
          pptSlides.push({
            num: pptSlides.length + 1,
            title: chunk[0] || `Slide ${pptSlides.length + 1}`,
            blocks: chunk.slice(1).map((t) => ({ type: 'bullet', text: t })),
            images: [],
            notes: ''
          });
        }
        if (!pptSlides.length) {
          pptSlides.push({
            num: 1,
            title: name,
            blocks: [{ type: 'bullet', text: 'Could not find readable text in this legacy .ppt file.' }],
            images: [],
            notes: ''
          });
        }
      }

      activePlainText = pptSlides
        .map((s) => `--- Slide ${s.num} ---\n${s.title}\n${s.blocks.map((b) => (b.type === 'bullet' ? '• ' + b.text : b.rows.map((r) => r.join(' | ')).join('\n'))).join('\n')}`)
        .join('\n\n');

      configureOfficeChrome('ppt', name, `${pptSlides.length} slide${pptSlides.length > 1 ? 's' : ''} · ${sizeStr} · 100% Ad-Free`);
      if (stage) {
        stage.classList.remove('bg-slate-200', 'bg-[#2B2418]', 'bg-[#090D16]', 'bg-white');
        stage.classList.add('bg-slate-900');
      }
      openOfficeOverlay();
      renderPptSlidesDom();
      if (stage) stage.scrollTop = 0;
    }

    // ---- 4. FULL-SCREEN PHOTO VIEWER + 1-TAP PHOTO(S) TO A4 PDF ----
    function normalizeImageToJpegBytes(bytes, mime, rotationDeg = 0) {
      return new Promise((resolve, reject) => {
        const blobUrl = URL.createObjectURL(new Blob([bytes], { type: mime || 'image/jpeg' }));
        const img = new Image();
        img.onload = () => {
          try {
            const rot = ((rotationDeg % 360) + 360) % 360;
            const swap = rot === 90 || rot === 270;
            const maxDim = 2200;
            const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
            const drawW = Math.max(1, Math.round(img.naturalWidth * scale));
            const drawH = Math.max(1, Math.round(img.naturalHeight * scale));
            const canvas = document.createElement('canvas');
            canvas.width = swap ? drawH : drawW;
            canvas.height = swap ? drawW : drawH;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((rot * Math.PI) / 180);
            ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
            const bin = atob(dataUrl.split(',')[1]);
            const out = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
            URL.revokeObjectURL(blobUrl);
            resolve(out);
          } catch (e) {
            URL.revokeObjectURL(blobUrl);
            reject(e);
          }
        };
        img.onerror = (e) => {
          URL.revokeObjectURL(blobUrl);
          reject(e);
        };
        img.src = blobUrl;
      });
    }

    async function buildImagesToA4PdfBytes(imageItems) {
      const pdfDoc = await window.PDFLib.PDFDocument.create();
      const pageW = 595.28;
      const pageH = 841.89;
      const margin = 24;
      for (const item of imageItems) {
        try {
          const jpgBytes = await normalizeImageToJpegBytes(item.bytes, item.mime || 'image/jpeg', item.rotation || 0);
          const embedded = await pdfDoc.embedJpg(jpgBytes);
          const iw = embedded.width;
          const ih = embedded.height;
          const landscape = iw > ih * 1.15;
          const pw = landscape ? pageH : pageW;
          const ph = landscape ? pageW : pageH;
          const availW = pw - margin * 2;
          const availH = ph - margin * 2;
          const ratio = Math.min(availW / iw, availH / ih);
          const drawW = iw * ratio;
          const drawH = ih * ratio;
          const page = pdfDoc.addPage([pw, ph]);
          page.drawImage(embedded, {
            x: (pw - drawW) / 2,
            y: (ph - drawH) / 2,
            width: drawW,
            height: drawH
          });
        } catch (err) {
          console.warn('Skipped non-image item during PDF build:', err);
        }
      }
      if (pdfDoc.getPageCount() === 0) throw new Error('No valid images to convert');
      return await pdfDoc.save();
    }

    global._convertImagesToA4PdfBytes = buildImagesToA4PdfBytes;

    function applyImageTransform() {
      if (imageEl) {
        imageEl.style.transform = `scale(${imgZoom}) rotate(${imgRotation}deg)`;
      }
      if (imgZoomLabel) imgZoomLabel.textContent = `${Math.round(imgZoom * 100)}%`;
    }

    async function convertActiveImageToPdf() {
      if (!activeBytes || typeof window.PDFLib === 'undefined') {
        global.utils?.showToast?.('PDF Engine Missing', 'Could not convert photo to PDF right now.', 'error');
        return;
      }
      global.utils?.showLoader?.('Creating Crisp A4 PDF...', 'text-pink-500');
      try {
        const pdfBytes = await buildImagesToA4PdfBytes([{ bytes: activeBytes, mime: activeMime, rotation: imgRotation }]);
        const base = activeFileName.replace(/\.[^.]+$/, '') || 'Photo';
        global.utils?.hideLoader?.();
        if (typeof global._openPdfBytesInReader === 'function') {
          closeOfficeOverlay();
          await global._openPdfBytesInReader(pdfBytes, `${base}.pdf`);
          global.utils?.showToast?.('PDF Created!', 'Opened your new PDF full-screen. Tap Share or Save!');
        } else {
          global.utils?.downloadBlob?.(new Blob([pdfBytes], { type: 'application/pdf' }), `${base}.pdf`);
          global.utils?.showToast?.('PDF Saved!', `Saved as ${base}.pdf.`);
        }
      } catch (err) {
        console.error('Photo to PDF error:', err);
        global.utils?.hideLoader?.();
        global.utils?.showToast?.('Conversion Failed', 'Could not convert this image to PDF.', 'error');
      }
    }

    async function openImageDocument(bytes, name, ext, mime) {
      revokeTempUrls();
      activeBytes = bytes;
      activeExt = ext;
      activeMime = mime || 'image/jpeg';
      activePlainText = '';
      imgZoom = 1.0;
      imgRotation = 0;

      const sizeStr = global.utils?.formatBytes ? global.utils.formatBytes(bytes.byteLength) : `${Math.round(bytes.byteLength / 1024)} KB`;
      configureOfficeChrome('image', name, `Photo · ${sizeStr} · Tap Make PDF to convert`);
      if (stage) {
        stage.classList.remove('bg-slate-200', 'bg-[#2B2418]', 'bg-[#090D16]', 'bg-white');
        stage.classList.add('bg-slate-950');
      }

      const blobUrl = URL.createObjectURL(new Blob([bytes], { type: activeMime }));
      objectUrlsToRevoke.push(blobUrl);
      if (imageEl) {
        imageEl.src = blobUrl;
        imageEl.alt = name || 'Photo';
      }
      applyImageTransform();
      openOfficeOverlay();
      if (stage) { stage.scrollTop = 0; stage.scrollLeft = 0; }
    }

    // ---- 5. INTERACTIVE ZIP ARCHIVE EXPLORER (Open Any File Inside Full-Screen!) ----
    function safeZipDisplayName(rawPath) {
      return String(rawPath || '')
        .replace(/\\/g, '/')
        .replace(/^\/+/, '')
        .split('/')
        .filter((seg) => seg && seg !== '.' && seg !== '..')
        .join('/');
    }

    function zipEntryBadgeInfo(fileName) {
      const ext = (fileName.split('.').pop() || '').toLowerCase();
      if (ext === 'pdf') return { label: 'PDF', cls: 'bg-rose-600' };
      if (/^(doc|docx|rtf|txt)$/.test(ext)) return { label: ext.toUpperCase(), cls: 'bg-blue-600' };
      if (/^(xls|xlsx|csv|ods)$/.test(ext)) return { label: ext.toUpperCase(), cls: 'bg-emerald-600' };
      if (/^(ppt|pptx)$/.test(ext)) return { label: ext.toUpperCase(), cls: 'bg-orange-500' };
      if (/^(jpg|jpeg|png|webp|gif|bmp)$/.test(ext)) return { label: 'IMG', cls: 'bg-pink-600' };
      if (ext === 'zip') return { label: 'ZIP', cls: 'bg-violet-600' };
      return { label: (ext || 'FILE').slice(0, 4).toUpperCase(), cls: 'bg-slate-600' };
    }

    function renderZipEntryList(filterQuery = '') {
      if (!zipFileList) return;
      zipFileList.textContent = '';
      const q = filterQuery.trim().toLowerCase();
      const visible = q
        ? activeZipEntries.filter((e) => e.displayPath.toLowerCase().includes(q))
        : activeZipEntries;

      if (q && searchStatus) {
        searchStatus.textContent = `${visible.length} file${visible.length === 1 ? '' : 's'}`;
      }

      if (!visible.length) {
        const empty = document.createElement('div');
        empty.className = 'p-6 rounded-2xl bg-slate-800/80 border border-white/10 text-center text-xs text-slate-300 font-semibold';
        empty.textContent = q ? 'No matching files inside this ZIP.' : 'This ZIP archive has no readable files.';
        zipFileList.appendChild(empty);
        return;
      }

      const frag = document.createDocumentFragment();
      visible.forEach((entry) => {
        const row = document.createElement('div');
        row.className = 'p-3 rounded-2xl bg-slate-800/90 border border-white/10 flex items-center justify-between gap-2.5';

        const left = document.createElement('div');
        left.className = 'flex items-center gap-2.5 min-w-0 flex-1';

        const badge = document.createElement('span');
        const info = zipEntryBadgeInfo(entry.baseName);
        badge.className = `w-10 h-10 rounded-xl ${info.cls} text-white text-[10px] font-black flex items-center justify-center shrink-0 shadow`;
        badge.textContent = info.label;

        const meta = document.createElement('div');
        meta.className = 'min-w-0 flex-1';
        const title = document.createElement('p');
        title.className = 'text-xs font-extrabold text-white truncate';
        title.textContent = entry.baseName;
        const sub = document.createElement('p');
        sub.className = 'text-[10px] text-slate-400 truncate';
        const sizeLabel = entry.size > 0 && global.utils?.formatBytes ? global.utils.formatBytes(entry.size) : '';
        sub.textContent = sizeLabel ? `${entry.displayPath} · ${sizeLabel}` : entry.displayPath;
        meta.appendChild(title);
        meta.appendChild(sub);

        left.appendChild(badge);
        left.appendChild(meta);

        const actions = document.createElement('div');
        actions.className = 'flex items-center gap-1.5 shrink-0';

        const openBtn = document.createElement('button');
        openBtn.type = 'button';
        openBtn.className = 'px-3 h-8 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-extrabold';
        openBtn.textContent = 'Open';
        openBtn.addEventListener('click', async () => {
          try {
            global.utils?.showLoader?.(`Opening ${entry.baseName}...`, 'text-violet-400');
            const entryBytes = await entry.zipObj.async('uint8array');
            global.utils?.hideLoader?.();
            await global.openUniversalDocumentFile(entryBytes, entry.baseName, '');
          } catch (err) {
            console.error('ZIP entry open error:', err);
            global.utils?.hideLoader?.();
            global.utils?.showToast?.('Could Not Open', 'Unable to extract or preview this file.', 'error');
          }
        });

        const saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'px-2.5 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold';
        saveBtn.textContent = 'Save';
        saveBtn.addEventListener('click', async () => {
          try {
            const entryBytes = await entry.zipObj.async('uint8array');
            global.utils?.downloadBlob?.(new Blob([entryBytes]), entry.baseName);
            global.utils?.showToast?.('Extracted!', `Saved ${entry.baseName}.`);
          } catch {
            global.utils?.showToast?.('Extract Failed', 'Could not save this file.', 'error');
          }
        });

        actions.appendChild(openBtn);
        actions.appendChild(saveBtn);
        row.appendChild(left);
        row.appendChild(actions);
        frag.appendChild(row);
      });
      zipFileList.appendChild(frag);
    }

    async function extractAllZipEntries() {
      if (!activeZipEntries.length) return;
      const limit = Math.min(activeZipEntries.length, 25);
      global.utils?.showToast?.('Extracting Files...', `Downloading ${limit} file${limit > 1 ? 's' : ''} from ZIP...`, 'info');
      for (let i = 0; i < limit; i++) {
        const entry = activeZipEntries[i];
        try {
          const entryBytes = await entry.zipObj.async('uint8array');
          global.utils?.downloadBlob?.(new Blob([entryBytes]), entry.baseName);
          await new Promise((r) => setTimeout(r, 220));
        } catch {}
      }
    }

    async function openZipDocument(bytes, name, ext, mime) {
      if (typeof window.JSZip === 'undefined') {
        global.utils?.showToast?.('ZIP Engine Missing', 'JSZip library did not load. Please refresh.', 'error');
        return;
      }
      revokeTempUrls();
      activeBytes = bytes;
      activeExt = ext || 'zip';
      activeMime = mime || 'application/zip';
      activePlainText = '';

      activeZip = await window.JSZip.loadAsync(bytes);
      activeZipEntries = [];
      let totalUncompressed = 0;

      Object.keys(activeZip.files).forEach((rawKey) => {
        const zf = activeZip.files[rawKey];
        if (!zf || zf.dir) return;
        const cleanPath = safeZipDisplayName(rawKey);
        if (!cleanPath || cleanPath.startsWith('__MACOSX/') || cleanPath.endsWith('.DS_Store')) return;
        const baseName = cleanPath.split('/').pop() || cleanPath;
        const uncompSize = Number(zf._data?.uncompressedSize || 0);
        if (uncompSize > 0) totalUncompressed += uncompSize;
        activeZipEntries.push({
          rawKey,
          displayPath: cleanPath,
          baseName,
          size: uncompSize,
          zipObj: zf
        });
      });

      const sizeStr = global.utils?.formatBytes ? global.utils.formatBytes(bytes.byteLength) : `${Math.round(bytes.byteLength / 1024)} KB`;
      configureOfficeChrome('zip', name, `${activeZipEntries.length} file${activeZipEntries.length === 1 ? '' : 's'} · ${sizeStr} · 100% Ad-Free`);
      if (stage) {
        stage.classList.remove('bg-slate-200', 'bg-[#2B2418]', 'bg-[#090D16]', 'bg-white', 'bg-slate-950');
        stage.classList.add('bg-slate-900');
      }
      if (zipStats) {
        const extra = totalUncompressed > 0 && global.utils?.formatBytes ? ` (${global.utils.formatBytes(totalUncompressed)})` : '';
        zipStats.textContent = `${activeZipEntries.length} file${activeZipEntries.length === 1 ? '' : 's'}${extra}`;
      }
      if (zipHeaderInfo) {
        zipHeaderInfo.textContent = `Archive contains ${activeZipEntries.length} file${activeZipEntries.length === 1 ? '' : 's'}. Tap Open on any PDF, Word, Excel, PPT, or Photo to read it instantly.`;
      }
      openOfficeOverlay();
      renderZipEntryList('');
      if (stage) stage.scrollTop = 0;
    }

    // ---- Universal Document Auto-Router (Entry Point for Everything!) ----
    global.openUniversalDocumentFile = async function (bytesInput, fileName, mimeType) {
      const bytes = bytesInput instanceof Uint8Array ? bytesInput : new Uint8Array(bytesInput);
      const name = fileName || 'Document';
      global.utils?.showLoader?.('Detecting & Opening File...', 'text-emerald-500');
      try {
        const detected = await detectDocumentType(bytes, name, mimeType);
        if (detected.kind === 'pdf') {
          if (typeof global._openPdfBytesInReader === 'function') {
            global.utils?.hideLoader?.();
            await global._openPdfBytesInReader(bytes, name.toLowerCase().endsWith('.pdf') ? name : `${name}.pdf`);
            return;
          }
        }
        if (detected.kind === 'word') {
          await openWordDocument(bytes, name, detected.ext, detected.mime);
          return;
        }
        if (detected.kind === 'excel') {
          await openExcelDocument(bytes, name, detected.ext, detected.mime);
          return;
        }
        if (detected.kind === 'ppt') {
          await openPptDocument(bytes, name, detected.ext, detected.mime);
          return;
        }
        if (detected.kind === 'image') {
          await openImageDocument(bytes, name, detected.ext, detected.mime);
          return;
        }
        if (detected.kind === 'zip') {
          await openZipDocument(bytes, name, detected.ext, detected.mime);
          return;
        }
        global.utils?.showToast?.(
          'Unsupported File Format',
          'PDF Bondhu supports PDF, Word, Excel, PowerPoint, Photos (JPG/PNG/WebP) & ZIP archives.',
          'error'
        );
      } catch (err) {
        console.error('Universal Document open error:', err);
        closeOfficeOverlay();
        global.utils?.showToast?.('Could Not Open File', 'The file may be damaged or password-protected.', 'error');
      } finally {
        global.utils?.hideLoader?.();
      }
    };

    // ---- Wire All Office Overlay Controls ----
    if (closeBtn) closeBtn.addEventListener('click', closeOfficeOverlay);

    if (moreBtn && moreMenu) {
      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        moreMenu.classList.toggle('hidden');
      });
      overlay.addEventListener('click', (e) => {
        if (!moreMenu.contains(e.target) && e.target !== moreBtn) {
          moreMenu.classList.add('hidden');
        }
      });
    }

    if (openAnotherBtn) {
      openAnotherBtn.addEventListener('click', () => {
        if (moreMenu) moreMenu.classList.add('hidden');
        if (typeof global._triggerUniversalFilePick === 'function') {
          global._triggerUniversalFilePick();
        }
      });
    }

    // Word Controls
    if (wordZoomOut) wordZoomOut.addEventListener('click', () => { wordZoom = Math.max(0.7, Math.round((wordZoom - 0.1) * 10) / 10); applyWordZoom(); });
    if (wordZoomIn) wordZoomIn.addEventListener('click', () => { wordZoom = Math.min(1.9, Math.round((wordZoom + 0.1) * 10) / 10); applyWordZoom(); });
    if (wordThemeBtn) {
      const order = ['light', 'sepia', 'night'];
      wordThemeBtn.addEventListener('click', () => {
        applyWordTheme(order[(order.indexOf(wordTheme) + 1) % order.length]);
      });
    }

    // Excel Controls & Auto-Load-More on Scroll
    if (excelZoomOut) excelZoomOut.addEventListener('click', () => { excelZoom = Math.max(0.7, Math.round((excelZoom - 0.1) * 10) / 10); applyExcelZoom(); });
    if (excelZoomIn) excelZoomIn.addEventListener('click', () => { excelZoom = Math.min(1.6, Math.round((excelZoom + 0.1) * 10) / 10); applyExcelZoom(); });
    if (excelLoadMoreBtn) {
      excelLoadMoreBtn.addEventListener('click', () => {
        const tbody = document.getElementById('officeExcelTbody');
        if (tbody) appendExcelRowsBatch(tbody);
      });
    }
    if (stage) {
      stage.addEventListener('scroll', () => {
        if (activeKind !== 'excel' || overlay.classList.contains('hidden')) return;
        if (excelRenderedCount >= excelFilteredRows.length) return;
        if (stage.scrollTop + stage.clientHeight >= stage.scrollHeight - 260) {
          const tbody = document.getElementById('officeExcelTbody');
          if (tbody) appendExcelRowsBatch(tbody);
        }
      }, { passive: true });
    }

    // PowerPoint Controls
    if (pptPrevBtn) pptPrevBtn.addEventListener('click', () => goToPptSlide(pptCurrentSlide - 1));
    if (pptNextBtn) pptNextBtn.addEventListener('click', () => goToPptSlide(pptCurrentSlide + 1));
    if (pptZoomOut) pptZoomOut.addEventListener('click', () => { pptZoom = Math.max(0.75, Math.round((pptZoom - 0.1) * 10) / 10); renderPptSlidesDom(); });
    if (pptZoomIn) pptZoomIn.addEventListener('click', () => { pptZoom = Math.min(1.5, Math.round((pptZoom + 0.1) * 10) / 10); renderPptSlidesDom(); });
    if (pptModeBtn) {
      pptModeBtn.addEventListener('click', () => {
        pptMode = pptMode === 'scroll' ? 'single' : 'scroll';
        renderPptSlidesDom();
        if (stage) stage.scrollTop = 0;
      });
    }
    if (pptNotesBtn) {
      pptNotesBtn.addEventListener('click', () => {
        pptShowNotes = !pptShowNotes;
        renderPptSlidesDom();
      });
    }

    // Photo Controls (Zoom, Rotate, 1-Tap Make PDF)
    if (imgZoomOut) imgZoomOut.addEventListener('click', () => { imgZoom = Math.max(0.5, Math.round((imgZoom - 0.2) * 10) / 10); applyImageTransform(); });
    if (imgZoomIn) imgZoomIn.addEventListener('click', () => { imgZoom = Math.min(3.0, Math.round((imgZoom + 0.2) * 10) / 10); applyImageTransform(); });
    if (imgRotateBtn) imgRotateBtn.addEventListener('click', () => { imgRotation = (imgRotation + 90) % 360; applyImageTransform(); });
    if (imgToPdfBtn) imgToPdfBtn.addEventListener('click', convertActiveImageToPdf);

    // ZIP Controls
    if (zipExtractAllBtn) zipExtractAllBtn.addEventListener('click', extractAllZipEntries);

    // In-Document Search (Word, Excel, PPT, ZIP)
    function clearWordPptSearchHighlights() {
      searchHitElements.forEach((el) => el.classList.remove('pb-office-search-hit'));
      searchHitElements = [];
      searchHitIndex = -1;
    }

    function runOfficeSearch() {
      const q = (searchInput?.value || '').trim().toLowerCase();
      clearWordPptSearchHighlights();

      if (activeKind === 'excel') {
        if (searchPrevBtn) searchPrevBtn.classList.add('hidden');
        if (searchNextBtn) searchNextBtn.classList.add('hidden');
        if (!q && searchStatus) searchStatus.textContent = '';
        renderExcelGrid(q);
        return;
      }

      if (activeKind === 'zip') {
        if (searchPrevBtn) searchPrevBtn.classList.add('hidden');
        if (searchNextBtn) searchNextBtn.classList.add('hidden');
        if (!q && searchStatus) searchStatus.textContent = '';
        renderZipEntryList(q);
        return;
      }

      if (!q) {
        if (searchStatus) searchStatus.textContent = '';
        if (searchPrevBtn) searchPrevBtn.classList.add('hidden');
        if (searchNextBtn) searchNextBtn.classList.add('hidden');
        return;
      }

      const root = activeKind === 'word' ? wordPaper : pptSlidesContainer;
      if (!root) return;
      const nodes = Array.from(root.querySelectorAll('p, h1, h2, h3, li, td, th, pre'));
      searchHitElements = nodes.filter((el) => (el.textContent || '').toLowerCase().includes(q));

      if (!searchHitElements.length) {
        if (searchStatus) searchStatus.textContent = 'No match';
        if (searchPrevBtn) searchPrevBtn.classList.add('hidden');
        if (searchNextBtn) searchNextBtn.classList.add('hidden');
        return;
      }

      searchHitElements.forEach((el) => el.classList.add('pb-office-search-hit'));
      searchHitIndex = 0;
      if (searchPrevBtn) searchPrevBtn.classList.remove('hidden');
      if (searchNextBtn) searchNextBtn.classList.remove('hidden');
      if (searchStatus) searchStatus.textContent = `1 / ${searchHitElements.length}`;
      searchHitElements[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    if (searchToggleBtn && searchBar) {
      searchToggleBtn.addEventListener('click', () => {
        const opening = searchBar.classList.contains('hidden');
        searchBar.classList.toggle('hidden');
        if (opening && searchInput) setTimeout(() => searchInput.focus(), 50);
        if (!opening) {
          clearWordPptSearchHighlights();
          if (activeKind === 'excel' && searchInput?.value) {
            searchInput.value = '';
            renderExcelGrid('');
          } else if (activeKind === 'zip' && searchInput?.value) {
            searchInput.value = '';
            renderZipEntryList('');
          }
        }
      });
    }
    if (searchCloseBtn && searchBar) {
      searchCloseBtn.addEventListener('click', () => {
        searchBar.classList.add('hidden');
        clearWordPptSearchHighlights();
        if (activeKind === 'excel' && searchInput?.value) {
          searchInput.value = '';
          renderExcelGrid('');
        } else if (activeKind === 'zip' && searchInput?.value) {
          searchInput.value = '';
          renderZipEntryList('');
        }
      });
    }
    if (searchBtn) searchBtn.addEventListener('click', runOfficeSearch);
    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); runOfficeSearch(); }
      });
    }
    if (searchPrevBtn) {
      searchPrevBtn.addEventListener('click', () => {
        if (!searchHitElements.length) return;
        searchHitIndex = (searchHitIndex - 1 + searchHitElements.length) % searchHitElements.length;
        if (searchStatus) searchStatus.textContent = `${searchHitIndex + 1} / ${searchHitElements.length}`;
        searchHitElements[searchHitIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
    if (searchNextBtn) {
      searchNextBtn.addEventListener('click', () => {
        if (!searchHitElements.length) return;
        searchHitIndex = (searchHitIndex + 1) % searchHitElements.length;
        if (searchStatus) searchStatus.textContent = `${searchHitIndex + 1} / ${searchHitElements.length}`;
        searchHitElements[searchHitIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }

    // Copy Text
    if (copyTextBtn) {
      copyTextBtn.addEventListener('click', async () => {
        if (moreMenu) moreMenu.classList.add('hidden');
        if (!activePlainText) {
          global.utils?.showToast?.('Nothing to Copy', 'No readable text found in this file.', 'info');
          return;
        }
        try {
          await navigator.clipboard.writeText(activePlainText);
          global.utils?.showToast?.('Copied!', `Copied text from "${activeFileName}".`);
        } catch {
          global.utils?.showToast?.('Copy Failed', 'Could not access clipboard.', 'error');
        }
      });
    }

    // Save to Personal Vault
    if (saveVaultBtn) {
      saveVaultBtn.addEventListener('click', async () => {
        if (moreMenu) moreMenu.classList.add('hidden');
        if (!activeBytes) return;
        if (typeof global.saveBlobToPdfBondhuVault === 'function') {
          await global.saveBlobToPdfBondhuVault(activeBytes.slice().buffer, activeFileName, activeMime, 'Study & Office');
        } else {
          global.utils?.downloadBlob?.(new Blob([activeBytes], { type: activeMime }), activeFileName);
        }
      });
    }

    // Share Document (Native Android Bridge / Web Share / Download)
    if (shareBtn) {
      shareBtn.addEventListener('click', async () => {
        if (!activeBytes) return;
        const blob = new Blob([activeBytes], { type: activeMime });
        if (global.AndroidBridge && typeof global.AndroidBridge.shareBase64File === 'function') {
          const reader = new FileReader();
          reader.onloadend = () => {
            const b64 = String(reader.result || '').split(',')[1] || '';
            global.AndroidBridge.shareBase64File(b64, activeFileName, activeMime);
          };
          reader.readAsDataURL(blob);
          return;
        }
        try {
          const f = new File([blob], activeFileName, { type: activeMime });
          if (navigator.canShare && navigator.canShare({ files: [f] })) {
            await navigator.share({ title: activeFileName, files: [f] });
            return;
          }
        } catch {}
        global.utils?.downloadBlob?.(blob, activeFileName);
      });
    }

    // Export (Excel -> CSV/XLSX, Photo -> PDF, ZIP -> Extract All, Word/PPT -> Clean A4 PDF via PDF-Lib)
    if (exportBtn) {
      exportBtn.addEventListener('click', async () => {
        if (moreMenu) moreMenu.classList.add('hidden');
        const base = activeFileName.replace(/\.[^.]+$/, '') || 'Document';
        if (activeKind === 'image') {
          await convertActiveImageToPdf();
          return;
        }
        if (activeKind === 'zip') {
          await extractAllZipEntries();
          return;
        }
        if (activeKind === 'excel' && excelWorkbook && typeof window.XLSX !== 'undefined') {
          if (activeExt === 'csv') {
            const out = window.XLSX.write(excelWorkbook, { bookType: 'xlsx', type: 'array' });
            global.utils?.downloadBlob?.(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${base}.xlsx`);
            global.utils?.showToast?.('Excel Saved!', `Exported as ${base}.xlsx.`);
          } else {
            const sheet = excelWorkbook.Sheets[excelActiveSheet || excelWorkbook.SheetNames[0]];
            const csv = window.XLSX.utils.sheet_to_csv(sheet);
            global.utils?.downloadBlob?.(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${base}.csv`);
            global.utils?.showToast?.('CSV Saved!', `Exported active sheet as ${base}.csv.`);
          }
          return;
        }
        if (typeof window.PDFLib === 'undefined') {
          global.utils?.showToast?.('PDF Engine Missing', 'Could not export PDF offline right now.', 'error');
          return;
        }
        global.utils?.showLoader?.('Exporting Clean A4 PDF...', 'text-blue-500');
        try {
          const pdfDoc = await window.PDFLib.PDFDocument.create();
          const font = await pdfDoc.embedFont(window.PDFLib.StandardFonts.Helvetica);
          const boldFont = await pdfDoc.embedFont(window.PDFLib.StandardFonts.HelveticaBold);
          const safeAscii = (s) => String(s || '').replace(/[^\x20-\x7e\n]/g, ' ');
          const rawLines = safeAscii(activePlainText || activeFileName).split(/\r?\n/);
          const pageW = 595.28;
          const pageH = 841.89;
          const margin = 44;
          const maxChars = 84;
          const wrapped = [];
          rawLines.forEach((ln) => {
            if (!ln.trim()) { wrapped.push(''); return; }
            const words = ln.split(/\s+/);
            let cur = '';
            words.forEach((w) => {
              if ((cur + ' ' + w).trim().length > maxChars) {
                if (cur) wrapped.push(cur);
                cur = w;
              } else {
                cur = (cur + ' ' + w).trim();
              }
            });
            if (cur) wrapped.push(cur);
          });

          let page = pdfDoc.addPage([pageW, pageH]);
          let y = pageH - margin;
          page.drawText(safeAscii(activeFileName).slice(0, 70), { x: margin, y, size: 13, font: boldFont });
          y -= 24;
          for (const line of wrapped) {
            if (y < margin + 16) {
              page = pdfDoc.addPage([pageW, pageH]);
              y = pageH - margin;
            }
            if (line) {
              page.drawText(line, { x: margin, y, size: 10.5, font });
            }
            y -= 15;
          }
          const pdfBytes = await pdfDoc.save();
          global.utils?.downloadBlob?.(new Blob([pdfBytes], { type: 'application/pdf' }), `${base}.pdf`);
          global.utils?.showToast?.('PDF Exported!', `Saved as ${base}.pdf.`);
        } catch (err) {
          console.error('Office to PDF export error:', err);
          global.utils?.showToast?.('Export Failed', 'Could not convert this file to PDF.', 'error');
        } finally {
          global.utils?.hideLoader?.();
        }
      });
    }

    // Print Document (Native Android PrintManager inside APK, window.print on Web)
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        if (moreMenu) moreMenu.classList.add('hidden');
        if (global.AndroidBridge && typeof global.AndroidBridge.printDocument === 'function') {
          global.AndroidBridge.printDocument(activeFileName || 'PDF-Bondhu-Document');
          return;
        }
        window.print();
      });
    }
  }
})(window);
