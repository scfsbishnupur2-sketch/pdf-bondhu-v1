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
    let zoomFactor = 1.0; // Relative multiplier: 1.0 = exact Fit-Width for EVERY page!
    let rotationDeg = 0;
    let viewMode = 'scroll'; // 'scroll' | 'single'
    let readingTheme = 'light'; // 'light' | 'sepia' | 'night'
    let barsHidden = false;
    let renderToken = 0;
    let pageObserver = null;
    let renderedPages = new Set();
    let activeRenderTask = null;
    let renderQueue = [];
    let isProcessingQueue = false;
    let searchMatches = [];
    let searchIdx = -1;

    function cancelAllRendering() {
      renderToken += 1;
      renderQueue = [];
      if (activeRenderTask) {
        try { activeRenderTask.cancel(); } catch {}
        activeRenderTask = null;
      }
      isProcessingQueue = false;
    }

    function openFullscreenOverlay() {
      overlay.classList.remove('hidden');
      overlay.classList.add('flex');
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      setBarsVisible(true);
    }

    function closeFullscreenOverlay() {
      cancelAllRendering();
      overlay.classList.add('hidden');
      overlay.classList.remove('flex');
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      if (moreMenu) moreMenu.classList.add('hidden');
      if (searchBar) searchBar.classList.add('hidden');
      if (resumeBtn && pdfDoc) {
        resumeBtn.textContent = `Resume: ${currentFileName.length > 22 ? currentFileName.slice(0, 22) + '…' : currentFileName}`;
        resumeBtn.classList.remove('hidden');
      }
    }

    global.closePdfReaderFullscreen = closeFullscreenOverlay;
    global.isPdfReaderFullscreenOpen = () => !overlay.classList.contains('hidden');

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
      pagesContainer.querySelectorAll('canvas.pb-reader-canvas').forEach((cv) => {
        cv.style.filter = flt;
      });
      if (themeCycleBtn) {
        if (theme === 'sepia') themeCycleBtn.textContent = 'Sepia';
        else if (theme === 'night') themeCycleBtn.textContent = 'Night';
        else themeCycleBtn.textContent = '☀ Light';
      }
    }

    function updateNavUi() {
      if (pageInput) pageInput.value = String(currentPage);
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

    // Properly renders a PDF page using PDF.js official `transform` (NEVER ctx.scale, preventing Y-flip bugs!)
    // Preserves each page's native `/Rotate` + applies per-page Fit-Width normalization + caps GPU RAM for 60fps!
    async function renderSingleCanvas(pageNum, canvas, token) {
      if (!pdfDoc || token !== renderToken) return;
      try {
        const page = await pdfDoc.getPage(pageNum);
        if (token !== renderToken) return;

        // Combine PDF's own native rotation with user's manual rotation so scanned pages are NEVER upside-down!
        const effectiveRot = ((page.rotate || 0) + rotationDeg) % 360;
        const baseVp = page.getViewport({ scale: 1.0, rotation: effectiveRot });

        // Per-page fit-to-screen width so mixed-size PDFs (e.g. A4 + 3000px photo scan) fit cleanly edge-to-edge!
        const targetCssWidth = getAvailableStageWidth() * zoomFactor;
        const cssScale = Math.max(0.1, targetCssWidth / Math.max(1, baseVp.width));
        const viewport = page.getViewport({ scale: cssScale, rotation: effectiveRot });

        // Safe HiDPI outputScale capped to max 1600x2400px backing buffer to guarantee zero lag on Android WebView
        const maxDpr = Math.min(window.devicePixelRatio || 1, 1.75);
        const maxPixelW = 1600;
        const maxPixelH = 2400;
        const safeScaleW = maxPixelW / Math.max(1, viewport.width);
        const safeScaleH = maxPixelH / Math.max(1, viewport.height);
        const outputScale = Math.max(1, Math.min(maxDpr, safeScaleW, safeScaleH));

        const pixelW = Math.max(1, Math.floor(viewport.width * outputScale));
        const pixelH = Math.max(1, Math.floor(viewport.height * outputScale));
        const cssW = Math.max(1, Math.floor(viewport.width));
        const cssH = Math.max(1, Math.floor(viewport.height));

        const wrap = canvas.parentElement;
        if (wrap) {
          wrap.style.width = `${cssW}px`;
          wrap.style.minHeight = `${cssH}px`;
        }

        canvas.width = pixelW;
        canvas.height = pixelH;
        canvas.style.width = `${cssW}px`;
        canvas.style.height = `${cssH}px`;
        canvas.style.filter = getThemeCanvasFilter();

        const ctx = canvas.getContext('2d', { alpha: false });
        // Reset identity matrix cleanly before PDF.js draws
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, pixelW, pixelH);

        // Pass `transform` inside renderContext — PDF.js composes this properly without Y-axis inversion!
        const renderContext = {
          canvasContext: ctx,
          viewport,
          transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null
        };

        activeRenderTask = page.render(renderContext);
        await activeRenderTask.promise;
        activeRenderTask = null;
        if (token === renderToken) {
          renderedPages.add(pageNum);
        }
      } catch (err) {
        activeRenderTask = null;
        if (err && err.name !== 'RenderingCancelledException') {
          console.error('Reader render error on page', pageNum, err);
        }
      }
    }

    function enqueuePageRender(pageNum, canvas, token, priority = false) {
      if (renderedPages.has(pageNum)) return;
      if (renderQueue.some((item) => item.pageNum === pageNum && item.token === token)) return;
      const job = { pageNum, canvas, token };
      if (priority) renderQueue.unshift(job);
      else renderQueue.push(job);
      processRenderQueue();
    }

    async function processRenderQueue() {
      if (isProcessingQueue) return;
      isProcessingQueue = true;
      try {
        while (renderQueue.length > 0) {
          const job = renderQueue.shift();
          if (!job || job.token !== renderToken) continue;
          if (renderedPages.has(job.pageNum)) continue;
          await renderSingleCanvas(job.pageNum, job.canvas, job.token);
          // Yield 1 animation frame between pages so touch scrolling stays silky 60fps
          await new Promise((r) => requestAnimationFrame(r));
        }
      } finally {
        isProcessingQueue = false;
      }
    }

    async function renderPagesLayout(keepScrollRatio = false) {
      if (!pdfDoc) return;
      const prevRatio = keepScrollRatio && stage && stage.scrollHeight > 0
        ? stage.scrollTop / stage.scrollHeight
        : 0;

      cancelAllRendering();
      const myToken = renderToken;
      renderedPages.clear();
      if (pageObserver) {
        pageObserver.disconnect();
        pageObserver = null;
      }
      pagesContainer.innerHTML = '';
      updateNavUi();

      const availW = getAvailableStageWidth();
      const estW = Math.floor(availW * zoomFactor);
      const estH = Math.floor(estW * 1.414); // Clean A4 placeholder ratio until each page measures itself

      if (viewMode === 'single') {
        const wrap = document.createElement('div');
        wrap.className = 'bg-white shadow-2xl overflow-hidden relative my-auto';
        wrap.setAttribute('data-page-num', String(currentPage));
        wrap.style.width = `${estW}px`;
        wrap.style.minHeight = `${estH}px`;
        const cv = document.createElement('canvas');
        cv.className = 'pb-reader-canvas block max-w-none';
        wrap.appendChild(cv);
        pagesContainer.appendChild(wrap);
        enqueuePageRender(currentPage, cv, myToken, true);
        if (stage) stage.scrollTop = 0;
        return;
      }

      const frag = document.createDocumentFragment();
      for (let p = 1; p <= totalPages; p++) {
        const wrap = document.createElement('div');
        wrap.className = 'pb-reader-page-wrap bg-white shadow-lg overflow-hidden relative flex flex-col items-center';
        wrap.setAttribute('data-page-num', String(p));
        wrap.style.width = `${estW}px`;
        wrap.style.minHeight = `${estH}px`;

        const cv = document.createElement('canvas');
        cv.className = 'pb-reader-canvas block max-w-none';
        cv.style.filter = getThemeCanvasFilter();

        wrap.appendChild(cv);
        frag.appendChild(wrap);
      }
      pagesContainer.appendChild(frag);

      pageObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const pNum = parseInt(entry.target.getAttribute('data-page-num'), 10);
            if (!pNum) return;
            if (!renderedPages.has(pNum)) {
              const cv = entry.target.querySelector('canvas.pb-reader-canvas');
              if (cv) enqueuePageRender(pNum, cv, myToken, entry.intersectionRatio >= 0.2);
            }
            if (entry.intersectionRatio >= 0.35) {
              currentPage = pNum;
              if (pageInput && document.activeElement !== pageInput) {
                pageInput.value = String(currentPage);
              }
              if (floatingPill) floatingPill.textContent = `${currentPage} / ${totalPages}`;
              if (prevBtn) prevBtn.disabled = currentPage <= 1;
              if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
            }
          });
        },
        { root: stage, rootMargin: '250px 0px', threshold: [0.05, 0.35] }
      );

      pagesContainer.querySelectorAll('.pb-reader-page-wrap').forEach((el) => pageObserver.observe(el));

      if (keepScrollRatio && stage && prevRatio > 0) {
        stage.scrollTop = Math.floor(prevRatio * stage.scrollHeight);
      }

      const targetWrap = pagesContainer.querySelector(`.pb-reader-page-wrap[data-page-num="${currentPage}"]`);
      if (targetWrap) {
        const cv = targetWrap.querySelector('canvas.pb-reader-canvas');
        if (cv) enqueuePageRender(currentPage, cv, myToken, true);
      }
    }

    function goToPage(pageNum) {
      if (!pdfDoc) return;
      const clamped = Math.max(1, Math.min(totalPages, parseInt(pageNum, 10) || 1));
      currentPage = clamped;
      updateNavUi();
      if (viewMode === 'single') {
        renderPagesLayout();
      } else {
        const target = pagesContainer.querySelector(`.pb-reader-page-wrap[data-page-num="${clamped}"]`);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          if (!renderedPages.has(clamped)) {
            const cv = target.querySelector('canvas.pb-reader-canvas');
            if (cv) enqueuePageRender(clamped, cv, renderToken, true);
          }
        }
      }
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
        cancelAllRendering();
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

    async function handleFileObject(file) {
      if (!file) return;
      const ab = await file.arrayBuffer();
      await loadPdfBytes(new Uint8Array(ab), file.name || 'Document.pdf');
    }

    if (closeBtn) closeBtn.addEventListener('click', closeFullscreenOverlay);
    if (pickBtn) pickBtn.addEventListener('click', () => fileInput.click());
    if (resumeBtn) resumeBtn.addEventListener('click', () => { if (pdfDoc) openFullscreenOverlay(); });
    if (openAnotherBtn) {
      openAnotherBtn.addEventListener('click', () => {
        if (moreMenu) moreMenu.classList.add('hidden');
        fileInput.click();
      });
    }

    fileInput.addEventListener('change', async (e) => {
      const f = e.target.files?.[0];
      fileInput.value = '';
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

    // Drag & Drop support
    [emptyState, stage].forEach((zone) => {
      if (!zone) return;
      zone.addEventListener('dragover', (e) => e.preventDefault());
      zone.addEventListener('drop', async (e) => {
        e.preventDefault();
        const f = e.dataTransfer?.files?.[0];
        if (f && (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))) {
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

    // Print PDF
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        if (moreMenu) moreMenu.classList.add('hidden');
        if (!rawBytes) return;
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

    // Android Native "Open With -> PDF Bondhu" Bridge -> Opens directly in Full-Screen Overlay!
    global.openExternalPdfFromAndroid = async function (localUrl, displayName) {
      try {
        openFullscreenOverlay();
        global.utils?.showLoader?.('Opening PDF Full-Screen...', 'text-emerald-500');
        const resp = await fetch(localUrl, { cache: 'no-store' });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const ab = await resp.arrayBuffer();
        await loadPdfBytes(new Uint8Array(ab), displayName || 'Phone-Document.pdf');
      } catch (err) {
        console.error('Failed to open external Android PDF:', err);
        global.utils?.hideLoader?.();
        closeFullscreenOverlay();
        global.utils?.showToast?.('Open Failed', 'Could not read the selected PDF from device.', 'error');
      }
    };

    // Cold-start safety net for Android PDF intent
    setTimeout(() => {
      try {
        if (global.AndroidBridge && typeof global.AndroidBridge.getPendingExternalPdf === 'function') {
          const raw = global.AndroidBridge.getPendingExternalPdf();
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.url) {
              global.openExternalPdfFromAndroid(parsed.url, parsed.name || 'Document.pdf');
            }
          }
        }
      } catch (e) {
        console.warn('Pending PDF check failed:', e);
      }
    }, 350);

    // PWA File Handler API
    if ('launchQueue' in window && window.launchQueue && typeof window.launchQueue.setConsumer === 'function') {
      window.launchQueue.setConsumer(async (launchParams) => {
        if (!launchParams || !launchParams.files || !launchParams.files.length) return;
        try {
          const fileHandle = launchParams.files[0];
          const file = await fileHandle.getFile();
          if (file) await handleFileObject(file);
        } catch (e) {
          console.error('PWA launchQueue PDF error:', e);
        }
      });
    }
  }
})(window);
