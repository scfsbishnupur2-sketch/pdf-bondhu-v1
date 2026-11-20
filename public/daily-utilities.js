/**
 * PDF Bondhu 2.0 - Daily Utility Center
 * 100% Real, Functional Offline Utilities (Zero Mock/Fake Results):
 * 1. Calculators: Standard & Scientific, Indian GST, EMI, Percentage, Age & Date Diff
 * 2. Unit Converters: Length, Weight, Temp, Area (Indian Bigha/Katha), Volume, Electricity + Bill, Data, Time
 * 3. Productivity: Notes (Export PDF), To-Do, Shopping List, Expense Tracker (Export CSV), Indian Calendar, Stopwatch, Timer, Reminders
 * 4. Smart Tools: QR & Barcode Scanner (Camera + Image), QR & Wi-Fi/UPI QR Generator, Real Internet Speed Test
 */
(function (global) {
  document.addEventListener('DOMContentLoaded', () => {
    initDailyUtilitySubTabs();
    initCalculators();
    initUnitConverters();
    initProductivitySuite();
    initSmartTools();
  });

  function escHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ========================================================================
     Sub-Tab Switcher inside Daily Utilities Hub
     ======================================================================== */
  function initDailyUtilitySubTabs() {
    const subBtns = document.querySelectorAll('.daily-subtab-btn');
    const panels = document.querySelectorAll('.daily-subtab-panel');
    if (!subBtns.length) return;

    function openSubTab(targetId) {
      panels.forEach((p) => p.classList.toggle('hidden', p.id !== targetId));
      subBtns.forEach((b) => {
        const act = b.getAttribute('data-subtab') === targetId;
        b.className = act
          ? 'daily-subtab-btn py-2.5 px-3 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-sm whitespace-nowrap min-h-[42px] transition'
          : 'daily-subtab-btn py-2.5 px-3 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-[#1C2438] border border-slate-200 dark:border-slate-700 hover:border-indigo-400 whitespace-nowrap min-h-[42px] transition';
      });
    }

    subBtns.forEach((btn) => {
      btn.addEventListener('click', () => openSubTab(btn.getAttribute('data-subtab')));
    });

    global.openDailyUtilitySubTab = (subId) => {
      if (typeof global.openPdfBondhuTool === 'function') {
        global.openPdfBondhuTool('dailyUtilitiesHub');
      }
      openSubTab(subId);
    };
  }

  /* ========================================================================
     1. CALCULATORS (Standard/Scientific, GST, EMI, Percentage, Age/Date)
     ======================================================================== */
  function initCalculators() {
    // --- A. Standard & Scientific Calculator ---
    const exprEl = document.getElementById('calcExprDisplay');
    const resEl = document.getElementById('calcResultDisplay');
    const sciToggle = document.getElementById('calcSciToggle');
    const sciRow = document.getElementById('calcSciKeys');
    const keyBtns = document.querySelectorAll('.calc-key');

    let expr = '';

    function safeEvalMath(raw) {
      if (!raw || !raw.trim()) return 0;
      const sanitized = raw
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/−/g, '-')
        .replace(/(\d)\s*(pi|π|\()/gi, '$1*$2')
        .replace(/\)\s*(\d|pi|π|\()/gi, ')*$1')
        .replace(/π/g, 'Math.PI')
        .replace(/\bpi\b/gi, 'Math.PI')
        .replace(/\be\b/g, 'Math.E')
        .replace(/√\(/g, 'Math.sqrt(')
        .replace(/\bsqrt\(/gi, 'Math.sqrt(')
        .replace(/\bsin\(/gi, 'Math.sin((Math.PI/180)*')
        .replace(/\bcos\(/gi, 'Math.cos((Math.PI/180)*')
        .replace(/\btan\(/gi, 'Math.tan((Math.PI/180)*')
        .replace(/\blog\(/gi, 'Math.log10(')
        .replace(/\bln\(/gi, 'Math.log(')
        .replace(/\^/g, '**');

      // Validate only safe math tokens exist
      const stripped = sanitized.replace(/Math\.(PI|E|sqrt|sin|cos|tan|log10|log)/g, '');
      if (/[^0-9+\-*/().,%\s]/.test(stripped)) {
        throw new Error('Invalid expression');
      }
      // Auto-close unmatched parentheses
      const opens = (sanitized.match(/\(/g) || []).length;
      const closes = (sanitized.match(/\)/g) || []).length;
      const finalExpr = sanitized + ')'.repeat(Math.max(0, opens - closes));
      const val = Function('"use strict"; return (' + finalExpr + ');')();
      if (typeof val !== 'number' || !isFinite(val)) throw new Error('Math error');
      return Math.round(val * 1e10) / 1e10;
    }

    function updateCalcScreen(finalVal = null) {
      if (exprEl) exprEl.textContent = expr || '0';
      if (resEl) {
        if (finalVal !== null) {
          resEl.textContent = String(finalVal);
        } else if (!expr) {
          resEl.textContent = '0';
        } else {
          try {
            resEl.textContent = String(safeEvalMath(expr));
          } catch {
            // Keep previous preview while typing incomplete expression
          }
        }
      }
    }

    if (sciToggle && sciRow) {
      sciToggle.addEventListener('click', () => {
        sciRow.classList.toggle('hidden');
        sciToggle.textContent = sciRow.classList.contains('hidden') ? 'Scientific' : 'Standard';
      });
    }

    keyBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-val');
        if (val === 'AC' || val === 'C') {
          expr = '';
          updateCalcScreen('0');
        } else if (val === 'DEL') {
          expr = expr.slice(0, -1);
          updateCalcScreen();
        } else if (val === '=') {
          try {
            const out = safeEvalMath(expr);
            expr = String(out);
            updateCalcScreen(out);
          } catch {
            if (resEl) resEl.textContent = 'Error';
          }
        } else if (val === '%') {
          try {
            const out = safeEvalMath(expr) / 100;
            expr = String(out);
            updateCalcScreen(out);
          } catch {}
        } else {
          expr += val;
          updateCalcScreen();
        }
      });
    });

    // --- B. Indian GST Calculator ---
    const gstAmt = document.getElementById('gstAmountInput');
    const gstRate = document.getElementById('gstRateSelect');
    const gstMode = document.getElementById('gstModeSelect');
    const gstOutBase = document.getElementById('gstOutBase');
    const gstOutTax = document.getElementById('gstOutTax');
    const gstOutSplit = document.getElementById('gstOutSplit');
    const gstOutTotal = document.getElementById('gstOutTotal');

    function calcGst() {
      if (!gstAmt || !gstOutTotal) return;
      const amt = Math.max(0, parseFloat(gstAmt.value) || 0);
      const rate = parseFloat(gstRate?.value || '18') || 18;
      const mode = gstMode?.value || 'add';
      let base = amt, tax = 0, total = amt;
      if (mode === 'add') {
        tax = (amt * rate) / 100;
        total = amt + tax;
      } else {
        base = amt / (1 + rate / 100);
        tax = amt - base;
        total = amt;
      }
      const fmt = (n) => '₹ ' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      gstOutBase.textContent = fmt(base);
      gstOutTax.textContent = fmt(tax);
      gstOutSplit.textContent = `CGST ${(rate / 2).toFixed(1)}%: ${fmt(tax / 2)}  ·  SGST ${(rate / 2).toFixed(1)}%: ${fmt(tax / 2)}`;
      gstOutTotal.textContent = fmt(total);
    }
    [gstAmt, gstRate, gstMode].forEach((el) => el && el.addEventListener('input', calcGst));
    [gstRate, gstMode].forEach((el) => el && el.addEventListener('change', calcGst));
    calcGst();

    // --- C. Loan EMI Calculator ---
    const emiP = document.getElementById('emiPrincipal');
    const emiR = document.getElementById('emiRate');
    const emiN = document.getElementById('emiMonths');
    const emiMonthlyOut = document.getElementById('emiMonthlyOut');
    const emiInterestOut = document.getElementById('emiInterestOut');
    const emiTotalOut = document.getElementById('emiTotalOut');
    const emiPrincipalBar = document.getElementById('emiPrincipalBar');

    function calcEmi() {
      if (!emiP || !emiMonthlyOut) return;
      const P = Math.max(0, parseFloat(emiP.value) || 0);
      const annualR = Math.max(0, parseFloat(emiR?.value) || 0);
      const N = Math.max(1, parseInt(emiN?.value || '12', 10) || 12);
      const r = annualR / 12 / 100;
      const emi = r === 0 ? P / N : (P * r * Math.pow(1 + r, N)) / (Math.pow(1 + r, N) - 1);
      const total = emi * N;
      const interest = Math.max(0, total - P);
      const fmt = (n) => '₹ ' + Math.round(n).toLocaleString('en-IN');

      emiMonthlyOut.textContent = fmt(emi);
      emiInterestOut.textContent = fmt(interest);
      emiTotalOut.textContent = fmt(total);
      if (emiPrincipalBar && total > 0) {
        emiPrincipalBar.style.width = `${Math.round((P / total) * 100)}%`;
      }
    }
    [emiP, emiR, emiN].forEach((el) => el && el.addEventListener('input', calcEmi));
    calcEmi();

    // --- D. Percentage Calculator ---
    const pctA = document.getElementById('pctInputA');
    const pctB = document.getElementById('pctInputB');
    const pctMode = document.getElementById('pctModeSelect');
    const pctResult = document.getElementById('pctResultOut');

    function calcPct() {
      if (!pctA || !pctResult) return;
      const a = parseFloat(pctA.value) || 0;
      const b = parseFloat(pctB?.value) || 0;
      const m = pctMode?.value || 'of';
      let out = '';
      if (m === 'of') out = `${a}% of ${b} = ${((a / 100) * b).toFixed(2)}`;
      else if (m === 'is' || m === 'isWhat') out = b === 0 ? 'Cannot divide by 0' : `${a} is ${((a / b) * 100).toFixed(2)}% of ${b}`;
      else if (m === 'change') out = a === 0 ? 'Base cannot be 0' : `Change: ${(((b - a) / a) * 100).toFixed(2)}%`;
      pctResult.textContent = out;
    }
    [pctA, pctB, pctMode].forEach((el) => el && el.addEventListener('input', calcPct));
    if (pctMode) pctMode.addEventListener('change', calcPct);
    calcPct();

    // --- E. Age & Date Difference Calculator ---
    const dateStart = document.getElementById('ageStartDate');
    const dateEnd = document.getElementById('ageEndDate');
    const ageOut = document.getElementById('ageResultOut');
    const ageMetaOut = document.getElementById('ageResultMeta');

    if (dateEnd && !dateEnd.value) {
      dateEnd.value = new Date().toISOString().slice(0, 10);
    }

    function calcDateDiff() {
      if (!dateStart || !dateEnd || !ageOut) return;
      if (!dateStart.value || !dateEnd.value) {
        ageOut.textContent = 'Select both dates';
        if (ageMetaOut) ageMetaOut.textContent = '';
        return;
      }
      let d1 = new Date(dateStart.value + 'T00:00:00');
      let d2 = new Date(dateEnd.value + 'T00:00:00');
      if (d1 > d2) [d1, d2] = [d2, d1];

      let years = d2.getFullYear() - d1.getFullYear();
      let months = d2.getMonth() - d1.getMonth();
      let days = d2.getDate() - d1.getDate();

      if (days < 0) {
        months -= 1;
        const prevMonthDays = new Date(d2.getFullYear(), d2.getMonth(), 0).getDate();
        days += prevMonthDays;
      }
      if (months < 0) {
        years -= 1;
        months += 12;
      }

      const totalDays = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
      const totalWeeks = Math.floor(totalDays / 7);
      ageOut.textContent = `${years} Years, ${months} Months, ${days} Days`;
      if (ageMetaOut) {
        ageMetaOut.textContent = `Total: ${totalDays.toLocaleString('en-IN')} days · ${totalWeeks.toLocaleString('en-IN')} weeks · ${(years * 12 + months).toLocaleString('en-IN')} months`;
      }
    }
    [dateStart, dateEnd].forEach((el) => el && el.addEventListener('change', calcDateDiff));
    calcDateDiff();
  }

  /* ========================================================================
     2. UNIT CONVERTERS (8 Categories + Indian Electricity Bill Estimator)
     ======================================================================== */
  function initUnitConverters() {
    const catSel = document.getElementById('convCategorySelect');
    const valInput = document.getElementById('convValueInput');
    const fromSel = document.getElementById('convFromSelect');
    const toSel = document.getElementById('convToSelect');
    const swapBtn = document.getElementById('convSwapBtn');
    const outEl = document.getElementById('convResultOut');

    const UNITS = {
      length: {
        m: { label: 'Meter (m)', factor: 1 },
        km: { label: 'Kilometer (km)', factor: 1000 },
        cm: { label: 'Centimeter (cm)', factor: 0.01 },
        mm: { label: 'Millimeter (mm)', factor: 0.001 },
        ft: { label: 'Foot (ft)', factor: 0.3048 },
        in: { label: 'Inch (in)', factor: 0.0254 },
        mi: { label: 'Mile (mi)', factor: 1609.344 }
      },
      weight: {
        kg: { label: 'Kilogram (kg)', factor: 1 },
        g: { label: 'Gram (g)', factor: 0.001 },
        mg: { label: 'Milligram (mg)', factor: 0.000001 },
        lb: { label: 'Pound (lb)', factor: 0.45359237 },
        oz: { label: 'Ounce (oz)', factor: 0.0283495 },
        t: { label: 'Metric Ton (t)', factor: 1000 }
      },
      temperature: {
        c: { label: 'Celsius (°C)' },
        f: { label: 'Fahrenheit (°F)' },
        k: { label: 'Kelvin (K)' }
      },
      area: {
        sqm: { label: 'Sq. Meter (m²)', factor: 1 },
        sqft: { label: 'Sq. Foot (ft²)', factor: 0.092903 },
        acre: { label: 'Acre', factor: 4046.8564 },
        hectare: { label: 'Hectare', factor: 10000 },
        bigha: { label: 'Bigha (WB Standard ~1337.8 m²)', factor: 1337.8037 },
        katha: { label: 'Katha (WB ~66.89 m²)', factor: 66.8902 }
      },
      volume: {
        l: { label: 'Liter (L)', factor: 1 },
        ml: { label: 'Milliliter (mL)', factor: 0.001 },
        cum: { label: 'Cubic Meter (m³)', factor: 1000 },
        gal: { label: 'US Gallon', factor: 3.78541 }
      },
      electricity: {
        kwh: { label: 'Unit / kWh', factor: 1000 },
        wh: { label: 'Watt-hour (Wh)', factor: 1 },
        mwh: { label: 'Megawatt-hour (MWh)', factor: 1000000 },
        kj: { label: 'Kilojoule (kJ)', factor: 0.277778 }
      },
      data: {
        mb: { label: 'Megabyte (MB)', factor: 1048576 },
        kb: { label: 'Kilobyte (KB)', factor: 1024 },
        gb: { label: 'Gigabyte (GB)', factor: 1073741824 },
        tb: { label: 'Terabyte (TB)', factor: 1099511627776 },
        b: { label: 'Byte (B)', factor: 1 }
      },
      time: {
        s: { label: 'Second (s)', factor: 1 },
        min: { label: 'Minute (min)', factor: 60 },
        hr: { label: 'Hour (hr)', factor: 3600 },
        day: { label: 'Day', factor: 86400 },
        wk: { label: 'Week', factor: 604800 }
      }
    };

    function populateUnits() {
      if (!catSel || !fromSel || !toSel) return;
      const map = UNITS[catSel.value] || UNITS.length;
      const keys = Object.keys(map);
      const opts = keys.map((k) => `<option value="${k}">${map[k].label}</option>`).join('');
      fromSel.innerHTML = opts;
      toSel.innerHTML = opts;
      if (keys.length > 1) toSel.value = keys[1];
      computeConvert();
    }

    function computeConvert() {
      if (!catSel || !valInput || !outEl) return;
      const cat = catSel.value;
      const v = parseFloat(valInput.value);
      if (isNaN(v)) { outEl.textContent = '0'; return; }

      const f = fromSel.value;
      const t = toSel.value;
      let res = 0;

      if (cat === 'temperature') {
        let c = v;
        if (f === 'f') c = (v - 32) * (5 / 9);
        else if (f === 'k') c = v - 273.15;
        if (t === 'c') res = c;
        else if (t === 'f') res = c * (9 / 5) + 32;
        else res = c + 273.15;
      } else {
        const map = UNITS[cat];
        res = (v * map[f].factor) / map[t].factor;
      }

      const formatted = Math.abs(res) >= 100000 || (Math.abs(res) > 0 && Math.abs(res) < 0.0001)
        ? res.toExponential(4)
        : Number(res.toFixed(6)).toString();
      outEl.textContent = `${formatted} ${UNITS[cat][t].label}`;
    }

    if (catSel) {
      catSel.addEventListener('change', populateUnits);
      valInput.addEventListener('input', computeConvert);
      fromSel.addEventListener('change', computeConvert);
      toSel.addEventListener('change', computeConvert);
      if (swapBtn) {
        swapBtn.addEventListener('click', () => {
          const tmp = fromSel.value;
          fromSel.value = toSel.value;
          toSel.value = tmp;
          computeConvert();
        });
      }
      populateUnits();
    }

    // --- Indian Electricity Bill Calculator ---
    const elecUnits = document.getElementById('elecBillUnits');
    const elecRate = document.getElementById('elecBillRate');
    const elecFixed = document.getElementById('elecBillFixed');
    const elecOut = document.getElementById('elecBillOut');
    const elecBreakdown = document.getElementById('elecBillBreakdown');

    function calcElecBill() {
      if (!elecUnits || !elecOut) return;
      const u = Math.max(0, parseFloat(elecUnits.value) || 0);
      const customRate = parseFloat(elecRate?.value || '0') || 0;
      const fixed = Math.max(0, parseFloat(elecFixed?.value || '50') || 0);

      let energyCharge = 0;
      if (customRate > 0) {
        energyCharge = u * customRate;
      } else {
        // Indicative Indian domestic slab estimate
        const s1 = Math.min(u, 100);
        const s2 = Math.min(Math.max(0, u - 100), 100);
        const s3 = Math.min(Math.max(0, u - 200), 100);
        const s4 = Math.max(0, u - 300);
        energyCharge = s1 * 5.2 + s2 * 6.8 + s3 * 7.8 + s4 * 8.9;
      }
      const total = energyCharge + fixed;
      elecOut.textContent = '₹ ' + total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      if (elecBreakdown) {
        elecBreakdown.textContent = `Energy Charge: ₹${energyCharge.toFixed(2)} + Fixed Charge: ₹${fixed.toFixed(2)} (${customRate > 0 ? `Flat ₹${customRate}/unit` : 'Standard Indian Domestic Slab Estimate'})`;
      }
    }
    [elecUnits, elecRate, elecFixed].forEach((el) => el && el.addEventListener('input', calcElecBill));
    calcElecBill();
  }

  /* ========================================================================
     3. PRODUCTIVITY SUITE (Notes, To-Do, Shopping, Expenses, Calendar, Timer, Reminders)
     ======================================================================== */
  function initProductivitySuite() {
    // --- A. Persistent Notes (Create, Edit/Update, Copy & Unicode Multi-Page PDF Export) ---
    const noteTitle = document.getElementById('prodNoteTitle');
    const noteBody = document.getElementById('prodNoteBody');
    const noteSaveBtn = document.getElementById('prodNoteSaveBtn');
    const noteNewBtn = document.getElementById('prodNoteNewBtn');
    const noteCopyBtn = document.getElementById('prodNoteCopyBtn');
    const notePdfBtn = document.getElementById('prodNoteExportPdfBtn');
    const noteEditBadge = document.getElementById('prodNoteEditBadge');
    const noteCountEl = document.getElementById('prodNoteCount');
    const noteList = document.getElementById('prodNoteList');
    const NOTES_KEY = 'pdfBondhuNotes_v2';
    let editingNoteId = null;

    function loadJson(key, fallback) {
      try { return JSON.parse(localStorage.getItem(key) || '') || fallback; } catch { return fallback; }
    }
    function saveJson(key, val) {
      try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
    }

    function loadNotesNormalized() {
      const raw = loadJson(NOTES_KEY, []);
      let changed = false;
      const items = raw.map((n, i) => {
        if (!n.id) {
          changed = true;
          return { ...n, id: `note_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}` };
        }
        return n;
      });
      if (changed) saveJson(NOTES_KEY, items);
      return items;
    }

    function setNoteEditorMode(noteObj) {
      if (noteObj) {
        editingNoteId = noteObj.id;
        if (noteTitle) noteTitle.value = noteObj.title || '';
        if (noteBody) noteBody.value = noteObj.body || '';
        if (noteSaveBtn) noteSaveBtn.textContent = 'Update Saved Note';
        if (noteEditBadge) {
          noteEditBadge.textContent = 'Editing Note';
          noteEditBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300';
        }
      } else {
        editingNoteId = null;
        if (noteTitle) noteTitle.value = '';
        if (noteBody) noteBody.value = '';
        if (noteSaveBtn) noteSaveBtn.textContent = 'Save Note';
        if (noteEditBadge) {
          noteEditBadge.textContent = 'New Note';
          noteEditBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300';
        }
      }
    }

    async function exportSingleNoteToPdf(titleRaw, bodyRaw) {
      const title = (titleRaw || 'My Note').trim();
      const body = (bodyRaw || '').trim();
      if (!title && !body) {
        global.utils.showToast('Empty Note', 'Write something before exporting to PDF.', 'info');
        return;
      }
      try {
        const { PDFDocument, StandardFonts, rgb } = window.PDFLib;
        const doc = await PDFDocument.create();
        const combined = `${title}\n${body}`;
        const hasUnicode = /[^\x00-\x7F]/.test(combined);
        const dateLabel = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

        if (hasUnicode) {
          // High-DPI A4 Canvas renderer for crisp Bengali / Hindi / Unicode multi-page PDF
          const pageW = 1240;
          const pageH = 1754;
          const margin = 100;
          const maxW = pageW - margin * 2;
          const bodyFont = '26px "Plus Jakarta Sans", "Noto Sans Bengali", "Noto Sans Devanagari", system-ui, sans-serif';
          const lineH = 42;

          const measureCanvas = document.createElement('canvas');
          const mCtx = measureCanvas.getContext('2d');
          mCtx.font = bodyFont;

          const wrappedLines = [];
          for (const para of body.split(/\r?\n/)) {
            if (!para.trim()) { wrappedLines.push(''); continue; }
            const words = para.split(/\s+/);
            let cur = '';
            for (const w of words) {
              const test = cur ? `${cur} ${w}` : w;
              if (mCtx.measureText(test).width <= maxW) {
                cur = test;
              } else {
                if (cur) wrappedLines.push(cur);
                cur = w;
              }
            }
            if (cur) wrappedLines.push(cur);
          }

          let idx = 0;
          let pageNum = 0;
          while (pageNum === 0 || idx < wrappedLines.length) {
            const c = document.createElement('canvas');
            c.width = pageW;
            c.height = pageH;
            const ctx = c.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, pageW, pageH);

            let y = margin;
            if (pageNum === 0) {
              ctx.fillStyle = '#64748b';
              ctx.font = '600 20px "Plus Jakarta Sans", system-ui, sans-serif';
              ctx.fillText(`PDF Bondhu Notes  ·  ${dateLabel}`, margin, y);
              y += 48;
              ctx.fillStyle = '#1e3a8a';
              ctx.font = '800 36px "Plus Jakarta Sans", "Noto Sans Bengali", "Noto Sans Devanagari", system-ui, sans-serif';
              ctx.fillText(title, margin, y, maxW);
              y += 22;
              ctx.strokeStyle = '#c7d2fe';
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.moveTo(margin, y);
              ctx.lineTo(pageW - margin, y);
              ctx.stroke();
              y += 46;
            }

            ctx.fillStyle = '#151b2b';
            ctx.font = bodyFont;
            while (idx < wrappedLines.length && y < pageH - margin) {
              ctx.fillText(wrappedLines[idx], margin, y);
              y += lineH;
              idx++;
            }

            const jpgUrl = c.toDataURL('image/jpeg', 0.92);
            const jpgBytes = await fetch(jpgUrl).then((r) => r.arrayBuffer());
            const img = await doc.embedJpg(jpgBytes);
            const pdfPage = doc.addPage([595.28, 841.89]);
            pdfPage.drawImage(img, { x: 0, y: 0, width: 595.28, height: 841.89 });
            pageNum++;
          }
        } else {
          // Crisp vector multi-page PDF with automatic word wrapping
          const font = await doc.embedFont(StandardFonts.Helvetica);
          const bold = await doc.embedFont(StandardFonts.HelveticaBold);
          const pageW = 595.28;
          const pageH = 841.89;
          const margin = 48;
          const maxW = pageW - margin * 2;
          const fontSize = 11.5;
          const lineH = 17.5;

          const wrappedLines = [];
          for (const para of body.split(/\r?\n/)) {
            if (!para.trim()) { wrappedLines.push(''); continue; }
            const words = para.split(/\s+/);
            let cur = '';
            for (const w of words) {
              const test = cur ? `${cur} ${w}` : w;
              if (font.widthOfTextAtSize(test, fontSize) <= maxW) {
                cur = test;
              } else {
                if (cur) wrappedLines.push(cur);
                cur = w;
              }
            }
            if (cur) wrappedLines.push(cur);
          }

          let idx = 0;
          let pageNum = 0;
          while (pageNum === 0 || idx < wrappedLines.length) {
            const page = doc.addPage([pageW, pageH]);
            let y = pageH - margin;
            if (pageNum === 0) {
              page.drawText(`PDF Bondhu Notes  |  ${dateLabel}`, { x: margin, y, size: 9.5, font, color: rgb(0.45, 0.5, 0.6) });
              y -= 24;
              page.drawText(title.slice(0, 72), { x: margin, y, size: 16, font: bold, color: rgb(0.14, 0.23, 0.54) });
              y -= 12;
              page.drawLine({ start: { x: margin, y }, end: { x: pageW - margin, y }, thickness: 1, color: rgb(0.8, 0.84, 0.96) });
              y -= 22;
            }
            while (idx < wrappedLines.length && y > margin) {
              page.drawText(wrappedLines[idx], { x: margin, y, size: fontSize, font, color: rgb(0.1, 0.13, 0.2) });
              y -= lineH;
              idx++;
            }
            pageNum++;
          }
        }

        const safeFile = title.replace(/[^a-zA-Z0-9_\- ]/g, '').trim().replace(/\s+/g, '_') || 'PDF_Bondhu_Note';
        await global.utils.savePdfWithMetadata(doc, `${safeFile}.pdf`, title);
      } catch (err) {
        console.error(err);
        global.utils.showToast('Error', 'Could not export note to PDF.', 'error');
      }
    }

    function renderNotes() {
      if (!noteList) return;
      const items = loadNotesNormalized();
      if (noteCountEl) noteCountEl.textContent = `${items.length} saved`;
      if (!items.length) {
        noteList.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">No saved notes yet. Write one above and tap Save Note.</p>';
        return;
      }
      noteList.innerHTML = items
        .map((n) => {
          const isEditing = editingNoteId === n.id;
          const dt = n.updatedAt ? new Date(n.updatedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
          return `
          <div class="p-3 rounded-xl ${isEditing ? 'bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-400' : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'} border flex items-start justify-between gap-2 transition">
            <div class="min-w-0 flex-1 cursor-pointer prod-note-open" data-id="${escHtml(n.id)}">
              <div class="text-xs font-extrabold text-slate-800 dark:text-white truncate">${escHtml(n.title || 'Untitled Note')}</div>
              <div class="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">${escHtml(n.body)}</div>
              ${dt ? `<div class="text-[10px] text-slate-400 mt-1 tabular-nums">${escHtml(dt)}</div>` : ''}
            </div>
            <div class="flex flex-col gap-1 shrink-0">
              <button type="button" data-id="${escHtml(n.id)}" class="prod-note-pdf text-[10px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold px-2 py-1 rounded-md">PDF</button>
              <button type="button" data-id="${escHtml(n.id)}" class="prod-note-del text-[10px] bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 font-bold px-2 py-1 rounded-md">Delete</button>
            </div>
          </div>`;
        })
        .join('');

      noteList.querySelectorAll('.prod-note-open').forEach((el) => {
        el.addEventListener('click', () => {
          const id = el.getAttribute('data-id');
          const item = loadNotesNormalized().find((x) => x.id === id);
          if (item) {
            setNoteEditorMode(item);
            renderNotes();
          }
        });
      });
      noteList.querySelectorAll('.prod-note-pdf').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-id');
          const item = loadNotesNormalized().find((x) => x.id === id);
          if (item) exportSingleNoteToPdf(item.title, item.body);
        });
      });
      noteList.querySelectorAll('.prod-note-del').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-id');
          const arr = loadNotesNormalized().filter((x) => x.id !== id);
          saveJson(NOTES_KEY, arr);
          if (editingNoteId === id) setNoteEditorMode(null);
          renderNotes();
          global.utils.showToast('Deleted', 'Note removed.');
        });
      });
    }

    if (noteNewBtn) {
      noteNewBtn.addEventListener('click', () => {
        setNoteEditorMode(null);
        renderNotes();
        if (noteTitle) noteTitle.focus();
      });
    }

    if (noteCopyBtn) {
      noteCopyBtn.addEventListener('click', () => {
        const title = (noteTitle?.value || '').trim();
        const body = (noteBody?.value || '').trim();
        const full = [title, body].filter(Boolean).join('\n\n');
        if (!full) {
          global.utils.showToast('Nothing to Copy', 'Write or open a note first.', 'info');
          return;
        }
        navigator.clipboard?.writeText(full).then(() => {
          global.utils.showToast('Copied!', 'Note copied to clipboard.');
        });
      });
    }

    if (noteSaveBtn) {
      noteSaveBtn.addEventListener('click', () => {
        const title = (noteTitle?.value || '').trim();
        const body = (noteBody?.value || '').trim();
        if (!title && !body) {
          global.utils.showToast('Empty Note', 'Please enter a note title or text first.', 'info');
          return;
        }
        const arr = loadNotesNormalized();
        const nowIso = new Date().toISOString();
        if (editingNoteId) {
          const idx = arr.findIndex((x) => x.id === editingNoteId);
          if (idx >= 0) {
            arr[idx] = { ...arr[idx], title: title || 'Quick Note', body, updatedAt: nowIso };
            const updated = arr.splice(idx, 1)[0];
            arr.unshift(updated);
          } else {
            arr.unshift({ id: `note_${Date.now()}`, title: title || 'Quick Note', body, updatedAt: nowIso });
          }
          saveJson(NOTES_KEY, arr);
          setNoteEditorMode(null);
          renderNotes();
          global.utils.showToast('Note Updated', 'Changes saved privately on your device.');
        } else {
          arr.unshift({ id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, title: title || 'Quick Note', body, updatedAt: nowIso });
          saveJson(NOTES_KEY, arr);
          setNoteEditorMode(null);
          renderNotes();
          global.utils.showToast('Note Saved', 'Stored privately on your device.');
        }
      });
    }

    if (notePdfBtn) {
      notePdfBtn.addEventListener('click', () => {
        exportSingleNoteToPdf(noteTitle?.value || 'My Note', noteBody?.value || '');
      });
    }
    renderNotes();

    // --- B. To-Do List ---
    const todoInput = document.getElementById('prodTodoInput');
    const todoAddBtn = document.getElementById('prodTodoAddBtn');
    const todoList = document.getElementById('prodTodoList');
    const TODO_KEY = 'pdfBondhuTodo_v2';

    function renderTodos() {
      if (!todoList) return;
      const items = loadJson(TODO_KEY, []);
      if (!items.length) {
        todoList.innerHTML = '<li class="text-xs text-slate-400 text-center py-3">No tasks yet. Add your first task above.</li>';
        return;
      }
      todoList.innerHTML = items
        .map(
          (it, idx) => `
          <li class="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <label class="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer">
              <input type="checkbox" data-idx="${idx}" class="todo-chk rounded accent-[#20A779]" ${it.done ? 'checked' : ''} />
              <span class="text-xs font-semibold truncate ${it.done ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'}">${escHtml(it.text)}</span>
            </label>
            <button type="button" data-idx="${idx}" class="todo-del text-xs text-rose-500 font-bold px-1.5">×</button>
          </li>`
        )
        .join('');
      todoList.querySelectorAll('.todo-chk').forEach((chk) => {
        chk.addEventListener('change', () => {
          const arr = loadJson(TODO_KEY, []);
          const i = parseInt(chk.getAttribute('data-idx'), 10);
          if (arr[i]) arr[i].done = chk.checked;
          saveJson(TODO_KEY, arr);
          renderTodos();
        });
      });
      todoList.querySelectorAll('.todo-del').forEach((btn) => {
        btn.addEventListener('click', () => {
          const arr = loadJson(TODO_KEY, []);
          arr.splice(parseInt(btn.getAttribute('data-idx'), 10), 1);
          saveJson(TODO_KEY, arr);
          renderTodos();
        });
      });
    }
    if (todoAddBtn && todoInput) {
      const addTodo = () => {
        const text = todoInput.value.trim();
        if (!text) return;
        const arr = loadJson(TODO_KEY, []);
        arr.unshift({ text, done: false });
        saveJson(TODO_KEY, arr);
        todoInput.value = '';
        renderTodos();
      };
      todoAddBtn.addEventListener('click', addTodo);
      todoInput.addEventListener('keydown', (e) => e.key === 'Enter' && addTodo());
    }
    renderTodos();

    // --- C. Shopping List ---
    const shopName = document.getElementById('prodShopItem');
    const shopPrice = document.getElementById('prodShopPrice');
    const shopAddBtn = document.getElementById('prodShopAddBtn');
    const shopList = document.getElementById('prodShopList');
    const shopTotal = document.getElementById('prodShopTotal');
    const SHOP_KEY = 'pdfBondhuShop_v2';

    function renderShopping() {
      if (!shopList) return;
      const items = loadJson(SHOP_KEY, []);
      const sum = items.reduce((acc, it) => acc + (Number(it.price) || 0), 0);
      if (shopTotal) shopTotal.textContent = `Est. Total: ₹ ${sum.toLocaleString('en-IN')}`;
      if (!items.length) {
        shopList.innerHTML = '<li class="text-xs text-slate-400 text-center py-3">Shopping list is empty.</li>';
        return;
      }
      shopList.innerHTML = items
        .map(
          (it, idx) => `
          <li class="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
            <label class="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
              <input type="checkbox" data-idx="${idx}" class="shop-chk rounded accent-[#20A779]" ${it.done ? 'checked' : ''} />
              <span class="font-semibold truncate ${it.done ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'}">${escHtml(it.name)}</span>
            </label>
            <div class="flex items-center gap-2 shrink-0">
              <span class="font-bold text-slate-600 dark:text-slate-300 tabular-nums">₹${Number(it.price || 0).toLocaleString('en-IN')}</span>
              <button type="button" data-idx="${idx}" class="shop-del text-rose-500 font-bold">×</button>
            </div>
          </li>`
        )
        .join('');
      shopList.querySelectorAll('.shop-chk').forEach((chk) => {
        chk.addEventListener('change', () => {
          const arr = loadJson(SHOP_KEY, []);
          arr[parseInt(chk.getAttribute('data-idx'), 10)].done = chk.checked;
          saveJson(SHOP_KEY, arr);
          renderShopping();
        });
      });
      shopList.querySelectorAll('.shop-del').forEach((btn) => {
        btn.addEventListener('click', () => {
          const arr = loadJson(SHOP_KEY, []);
          arr.splice(parseInt(btn.getAttribute('data-idx'), 10), 1);
          saveJson(SHOP_KEY, arr);
          renderShopping();
        });
      });
    }
    if (shopAddBtn && shopName) {
      const addShopItem = () => {
        const name = shopName.value.trim();
        if (!name) return;
        const price = Math.max(0, parseFloat(shopPrice?.value || '0') || 0);
        const arr = loadJson(SHOP_KEY, []);
        arr.unshift({ name, price, done: false });
        saveJson(SHOP_KEY, arr);
        shopName.value = '';
        if (shopPrice) shopPrice.value = '';
        renderShopping();
      };
      shopAddBtn.addEventListener('click', addShopItem);
      shopName.addEventListener('keydown', (e) => e.key === 'Enter' && addShopItem());
      if (shopPrice) shopPrice.addEventListener('keydown', (e) => e.key === 'Enter' && addShopItem());
    }
    renderShopping();

    // --- D. Daily Expense Tracker + CSV Export ---
    const expNote = document.getElementById('prodExpNote');
    const expAmt = document.getElementById('prodExpAmount');
    const expCat = document.getElementById('prodExpCat');
    const expAddBtn = document.getElementById('prodExpAddBtn');
    const expCsvBtn = document.getElementById('prodExpExportCsvBtn');
    const expTotalEl = document.getElementById('prodExpTotal');
    const expList = document.getElementById('prodExpList');
    const EXP_KEY = 'pdfBondhuExpenses_v2';

    function renderExpenses() {
      if (!expList) return;
      const items = loadJson(EXP_KEY, []);
      const total = items.reduce((s, x) => s + (Number(x.amount) || 0), 0);
      if (expTotalEl) expTotalEl.textContent = `₹ ${total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      if (!items.length) {
        expList.innerHTML = '<li class="text-xs text-slate-400 text-center py-3">No expenses recorded yet.</li>';
        return;
      }
      expList.innerHTML = items
        .slice(0, 30)
        .map(
          (x, idx) => `
          <li class="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
            <div class="min-w-0">
              <div class="font-bold text-slate-800 dark:text-slate-100 truncate">${escHtml(x.note)}</div>
              <div class="text-[10px] text-slate-400">${escHtml(x.category)} · ${escHtml(x.date)}</div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span class="font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">₹${Number(x.amount).toLocaleString('en-IN')}</span>
              <button type="button" data-idx="${idx}" class="exp-del text-slate-400 hover:text-rose-500 font-bold">×</button>
            </div>
          </li>`
        )
        .join('');
      expList.querySelectorAll('.exp-del').forEach((btn) => {
        btn.addEventListener('click', () => {
          const arr = loadJson(EXP_KEY, []);
          arr.splice(parseInt(btn.getAttribute('data-idx'), 10), 1);
          saveJson(EXP_KEY, arr);
          renderExpenses();
        });
      });
    }
    if (expAddBtn) {
      expAddBtn.addEventListener('click', () => {
        const note = (expNote?.value || '').trim();
        const amount = parseFloat(expAmt?.value || '0') || 0;
        if (!note || amount <= 0) return;
        const arr = loadJson(EXP_KEY, []);
        arr.unshift({ note, amount, category: expCat?.value || 'General', date: new Date().toLocaleDateString('en-IN') });
        saveJson(EXP_KEY, arr);
        expNote.value = '';
        expAmt.value = '';
        renderExpenses();
      });
    }
    if (expCsvBtn) {
      expCsvBtn.addEventListener('click', () => {
        const arr = loadJson(EXP_KEY, []);
        if (!arr.length) return;
        const rows = [['Date', 'Category', 'Description', 'Amount (INR)'], ...arr.map((x) => [x.date, x.category, `"${String(x.note).replace(/"/g, '""')}"`, x.amount])];
        const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
        global.utils.downloadBlob(blob, 'PDF_Bondhu_Expenses.csv');
      });
    }
    renderExpenses();

    // --- E. Interactive Indian Calendar (with Major National Holidays) ---
    const calMonthLabel = document.getElementById('prodCalMonthLabel');
    const calGrid = document.getElementById('prodCalGrid');
    const calPrev = document.getElementById('prodCalPrev');
    const calNext = document.getElementById('prodCalNext');
    const calHolidayBox = document.getElementById('prodCalHolidays');

    const INDIAN_HOLIDAYS = {
      '01-26': 'Republic Day',
      '05-01': 'May Day / Labour Day',
      '08-15': 'Independence Day',
      '10-02': 'Gandhi Jayanti',
      '11-14': "Children's Day",
      '12-25': 'Christmas Day'
    };

    let calDate = new Date();
    function renderCalendar() {
      if (!calGrid || !calMonthLabel) return;
      const y = calDate.getFullYear();
      const m = calDate.getMonth();
      const today = new Date();
      const firstDay = new Date(y, m, 1).getDay();
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      const monthName = new Date(y, m, 1).toLocaleDateString(global.PDFBondhuI18n ? global.PDFBondhuI18n.getLocale() : 'en-IN', { month: 'long', year: 'numeric' });
      calMonthLabel.textContent = monthName;

      const cells = [];
      for (let i = 0; i < firstDay; i++) cells.push('<div></div>');
      const monthHolidays = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const key = `${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const hol = INDIAN_HOLIDAYS[key];
        if (hol) monthHolidays.push(`${d} ${monthName.split(' ')[0]} — ${hol}`);
        const isToday = y === today.getFullYear() && m === today.getMonth() && d === today.getDate();
        const isSun = new Date(y, m, d).getDay() === 0;
        cells.push(
          `<div class="h-8 rounded-lg flex items-center justify-center text-xs font-bold tabular-nums ${
            isToday
              ? 'bg-[#293B80] text-white'
              : hol
              ? 'bg-[#20A779]/15 text-[#20A779]'
              : isSun
              ? 'text-rose-500'
              : 'text-slate-700 dark:text-slate-200'
          }" title="${hol || ''}">${d}</div>`
        );
      }
      calGrid.innerHTML = cells.join('');
      if (calHolidayBox) {
        calHolidayBox.textContent = monthHolidays.length
          ? `Key Dates: ${monthHolidays.join('  ·  ')}`
          : 'No fixed national holiday in this month.';
      }
    }
    if (calPrev) calPrev.addEventListener('click', () => { calDate.setMonth(calDate.getMonth() - 1); renderCalendar(); });
    if (calNext) calNext.addEventListener('click', () => { calDate.setMonth(calDate.getMonth() + 1); renderCalendar(); });
    renderCalendar();

    // --- F. Stopwatch & Countdown Timer ---
    const swDisplay = document.getElementById('prodSwDisplay');
    const swStartBtn = document.getElementById('prodSwStartBtn');
    const swResetBtn = document.getElementById('prodSwResetBtn');
    let swElapsed = 0, swRunning = false, swTimer = null, swStartTs = 0;

    function fmtMs(ms) {
      const totalSec = Math.floor(ms / 1000);
      const mins = String(Math.floor(totalSec / 60)).padStart(2, '0');
      const secs = String(totalSec % 60).padStart(2, '0');
      const cs = String(Math.floor((ms % 1000) / 10)).padStart(2, '0');
      return `${mins}:${secs}.${cs}`;
    }

    if (swStartBtn && swDisplay) {
      swStartBtn.addEventListener('click', () => {
        if (!swRunning) {
          swRunning = true;
          swStartTs = Date.now() - swElapsed;
          swStartBtn.textContent = 'Pause';
          swTimer = setInterval(() => {
            swElapsed = Date.now() - swStartTs;
            swDisplay.textContent = fmtMs(swElapsed);
          }, 50);
        } else {
          swRunning = false;
          clearInterval(swTimer);
          swStartBtn.textContent = 'Resume';
        }
      });
    }
    if (swResetBtn && swDisplay) {
      swResetBtn.addEventListener('click', () => {
        swRunning = false;
        clearInterval(swTimer);
        swElapsed = 0;
        swDisplay.textContent = '00:00.00';
        if (swStartBtn) swStartBtn.textContent = 'Start';
      });
    }

    const tmMinInput = document.getElementById('prodTimerMins');
    const tmDisplay = document.getElementById('prodTimerDisplay');
    const tmStartBtn = document.getElementById('prodTimerStartBtn');
    let tmInterval = null, tmRemaining = 0;

    function beepTone() {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        const ctx = new AC();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 880;
        gain.gain.value = 0.15;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      } catch {}
    }

    if (tmStartBtn && tmDisplay) {
      tmStartBtn.addEventListener('click', () => {
        if (tmInterval) {
          clearInterval(tmInterval);
          tmInterval = null;
          tmStartBtn.textContent = 'Start Timer';
          return;
        }
        tmRemaining = Math.max(1, (parseInt(tmMinInput?.value || '5', 10) || 5)) * 60;
        tmStartBtn.textContent = 'Stop';
        const tick = () => {
          const m = String(Math.floor(tmRemaining / 60)).padStart(2, '0');
          const s = String(tmRemaining % 60).padStart(2, '0');
          tmDisplay.textContent = `${m}:${s}`;
          if (tmRemaining <= 0) {
            clearInterval(tmInterval);
            tmInterval = null;
            tmStartBtn.textContent = 'Start Timer';
            beepTone();
            global.utils.showToast('Timer Complete!', 'Your countdown timer has finished.');
          }
          tmRemaining--;
        };
        tick();
        tmInterval = setInterval(tick, 1000);
      });
    }

    // --- G. Local Daily Reminders (Proper HH:MM Target Timestamp) ---
    const remTitle = document.getElementById('prodRemTitle');
    const remTime = document.getElementById('prodRemTime');
    const remAddBtn = document.getElementById('prodRemAddBtn');
    const remList = document.getElementById('prodRemList');
    const REM_KEY = 'pdfBondhuReminders_v2';

    function computeNextTriggerMs(timeStr) {
      if (!timeStr) return Date.now() + 60000;
      if (timeStr.includes('T')) {
        const parsed = new Date(timeStr).getTime();
        if (!isNaN(parsed)) return parsed;
      }
      const parts = String(timeStr).split(':');
      const hh = parseInt(parts[0], 10);
      const mm = parseInt(parts[1], 10);
      if (isNaN(hh) || isNaN(mm)) return Date.now() + 60000;
      const target = new Date();
      target.setSeconds(0, 0);
      target.setHours(hh, mm, 0, 0);
      if (target.getTime() <= Date.now()) {
        target.setDate(target.getDate() + 1);
      }
      return target.getTime();
    }

    function formatRemTimeLabel(r) {
      if (r.triggerAt) {
        return new Date(r.triggerAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
      }
      return String(r.when || '').replace('T', ' ');
    }

    function renderReminders() {
      if (!remList) return;
      const items = loadJson(REM_KEY, []);
      if (!items.length) {
        remList.innerHTML = '<li class="text-xs text-slate-400 text-center py-2">No active reminders.</li>';
        return;
      }
      remList.innerHTML = items
        .map(
          (r, i) => `
          <li class="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
            <div class="min-w-0">
              <div class="font-bold ${r.fired ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'} truncate">${escHtml(r.title)}</div>
              <div class="text-[10px] text-slate-400 tabular-nums">${escHtml(formatRemTimeLabel(r))}${r.fired ? ' · Done' : ''}</div>
            </div>
            <button type="button" data-idx="${i}" class="rem-del text-rose-500 font-bold px-1.5">×</button>
          </li>`
        )
        .join('');
      remList.querySelectorAll('.rem-del').forEach((b) => {
        b.addEventListener('click', () => {
          const arr = loadJson(REM_KEY, []);
          arr.splice(parseInt(b.getAttribute('data-idx'), 10), 1);
          saveJson(REM_KEY, arr);
          renderReminders();
        });
      });
    }
    if (remAddBtn) {
      const addRem = () => {
        const title = (remTitle?.value || '').trim();
        const when = remTime?.value || '';
        if (!title || !when) {
          global.utils.showToast('Missing Info', 'Enter a reminder message and time.', 'info');
          return;
        }
        const triggerAt = computeNextTriggerMs(when);
        const arr = loadJson(REM_KEY, []);
        arr.unshift({ title, when, triggerAt, fired: false });
        saveJson(REM_KEY, arr);
        remTitle.value = '';
        renderReminders();
        global.utils.showToast('Reminder Set', `"${title}" scheduled for ${new Date(triggerAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}.`);
      };
      remAddBtn.addEventListener('click', addRem);
      if (remTitle) remTitle.addEventListener('keydown', (e) => e.key === 'Enter' && addRem());
    }
    renderReminders();

    // Check due reminders gently every 15 seconds while app is open
    setInterval(() => {
      const arr = loadJson(REM_KEY, []);
      const nowMs = Date.now();
      let changed = false;
      arr.forEach((r) => {
        const dueMs = r.triggerAt || new Date(r.when).getTime();
        if (!r.fired && !isNaN(dueMs) && dueMs <= nowMs) {
          r.fired = true;
          changed = true;
          beepTone();
          global.utils.showToast('Reminder Due!', r.title, 'info');
        }
      });
      if (changed) {
        saveJson(REM_KEY, arr);
        renderReminders();
      }
    }, 15000);
  }

  /* ========================================================================
     4. SMART TOOLS (QR & Barcode Scanner, QR & Wi-Fi Generator, Speed Test)
     ======================================================================== */
  function initSmartTools() {
    // --- A. QR & Barcode Scanner (Camera + Image Upload) ---
    const startCamBtn = document.getElementById('qrScanCamBtn');
    const stopCamBtn = document.getElementById('qrScanStopBtn');
    const fileInput = document.getElementById('qrScanFileInput');
    const videoEl = document.getElementById('qrScanVideo');
    const resultBox = document.getElementById('qrScanResultBox');
    const resultText = document.getElementById('qrScanResultText');
    const copyBtn = document.getElementById('qrScanCopyBtn');

    let camStream = null;
    let scanRaf = null;
    const scanCanvas = document.createElement('canvas');
    const scanCtx = scanCanvas.getContext('2d', { willReadFrequently: true });

    function showScanResult(val) {
      if (!resultBox || !resultText) return;
      resultBox.classList.remove('hidden');
      resultText.textContent = val;
      global.utils.showToast('Code Detected!', val.slice(0, 60));
    }

    function stopScannerCam() {
      if (scanRaf) { cancelAnimationFrame(scanRaf); scanRaf = null; }
      if (camStream) {
        camStream.getTracks().forEach((t) => t.stop());
        camStream = null;
      }
      if (videoEl) videoEl.classList.add('hidden');
      if (stopCamBtn) stopCamBtn.classList.add('hidden');
      if (startCamBtn) startCamBtn.classList.remove('hidden');
    }

    async function decodeFromImageSource(source, w, h) {
      // 1. Native BarcodeDetector (supports QR + EAN/Code128/UPC barcodes on Android Chrome/WebView)
      if ('BarcodeDetector' in window) {
        try {
          const detector = new window.BarcodeDetector({
            formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e']
          });
          const codes = await detector.detect(source);
          if (codes && codes.length > 0 && codes[0].rawValue) {
            return codes[0].rawValue;
          }
        } catch {}
      }
      // 2. Pure-JS jsQR fallback (works everywhere offline!)
      if (typeof window.jsQR === 'function' && w > 0 && h > 0) {
        scanCanvas.width = w;
        scanCanvas.height = h;
        scanCtx.drawImage(source, 0, 0, w, h);
        const imgData = scanCtx.getImageData(0, 0, w, h);
        const code = window.jsQR(imgData.data, w, h);
        if (code && code.data) return code.data;
      }
      return null;
    }

    if (startCamBtn && videoEl) {
      startCamBtn.addEventListener('click', async () => {
        try {
          camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          videoEl.srcObject = camStream;
          videoEl.classList.remove('hidden');
          await videoEl.play();
          startCamBtn.classList.add('hidden');
          if (stopCamBtn) stopCamBtn.classList.remove('hidden');

          const loop = async () => {
            if (!camStream) return;
            if (videoEl.readyState >= 2) {
              const found = await decodeFromImageSource(videoEl, videoEl.videoWidth, videoEl.videoHeight);
              if (found) {
                showScanResult(found);
                stopScannerCam();
                return;
              }
            }
            scanRaf = requestAnimationFrame(loop);
          };
          scanRaf = requestAnimationFrame(loop);
        } catch (err) {
          console.error(err);
          global.utils.showToast('Camera Unavailable', 'Grant camera permission or upload a QR/Barcode image below.', 'error');
        }
      });
    }

    if (stopCamBtn) stopCamBtn.addEventListener('click', stopScannerCam);

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const f = e.target.files?.[0];
        fileInput.value = '';
        if (!f) return;
        const img = new Image();
        img.onload = async () => {
          const found = await decodeFromImageSource(img, img.naturalWidth, img.naturalHeight);
          if (found) showScanResult(found);
          else global.utils.showToast('No Code Found', 'Could not detect a clear QR code or barcode in this image.', 'error');
        };
        img.src = URL.createObjectURL(f);
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const txt = resultText?.textContent || '';
        if (!txt) return;
        navigator.clipboard?.writeText(txt).then(() => global.utils.showToast('Copied', 'Scanned value copied to clipboard.'));
      });
    }

    // --- B. QR Code & Wi-Fi QR Generator ---
    const qrTypeSel = document.getElementById('qrGenType');
    const qrTextWrap = document.getElementById('qrGenTextWrap');
    const qrWifiWrap = document.getElementById('qrGenWifiWrap');
    const qrTextInput = document.getElementById('qrGenTextInput');
    const qrWifiSsid = document.getElementById('qrWifiSsid');
    const qrWifiPass = document.getElementById('qrWifiPass');
    const qrWifiSec = document.getElementById('qrWifiSec');
    const qrGenBtn = document.getElementById('qrGenCreateBtn');
    const qrDlBtn = document.getElementById('qrGenDownloadBtn');
    const qrPreviewBox = document.getElementById('qrGenCanvasBox');

    if (qrTypeSel && qrTextWrap && qrWifiWrap) {
      qrTypeSel.addEventListener('change', () => {
        const isWifi = qrTypeSel.value === 'wifi';
        qrTextWrap.classList.toggle('hidden', isWifi);
        qrWifiWrap.classList.toggle('hidden', !isWifi);
      });
    }

    function generateQr() {
      if (!qrPreviewBox) return;
      let payload = '';
      if (qrTypeSel?.value === 'wifi') {
        const ssid = (qrWifiSsid?.value || '').trim();
        const pass = qrWifiPass?.value || '';
        const sec = qrWifiSec?.value || 'WPA';
        if (!ssid) {
          global.utils.showToast('Enter Wi-Fi Name', 'Please enter the Wi-Fi SSID.', 'info');
          return;
        }
        payload = `WIFI:T:${sec};S:${ssid};P:${pass};;`;
      } else {
        payload = (qrTextInput?.value || '').trim();
        if (!payload) {
          global.utils.showToast('Enter Content', 'Type text, URL, UPI ID, or phone number.', 'info');
          return;
        }
      }

      qrPreviewBox.innerHTML = '';
      if (typeof window.QRCode !== 'undefined') {
        new window.QRCode(qrPreviewBox, {
          text: payload,
          width: 210,
          height: 210,
          colorDark: '#151B2B',
          colorLight: '#FFFFFF',
          correctLevel: window.QRCode.CorrectLevel.M
        });
        if (qrDlBtn) qrDlBtn.disabled = false;
      } else {
        qrPreviewBox.innerHTML = '<p class="text-xs text-rose-500">QR library offline — connect once to cache it.</p>';
      }
    }

    if (qrGenBtn) qrGenBtn.addEventListener('click', generateQr);
    if (qrDlBtn) {
      qrDlBtn.addEventListener('click', () => {
        const canvas = qrPreviewBox?.querySelector('canvas');
        const img = qrPreviewBox?.querySelector('img');
        if (canvas) {
          canvas.toBlob((b) => b && global.utils.downloadBlob(b, 'PDF_Bondhu_QR.png'), 'image/png');
        } else if (img && img.src) {
          fetch(img.src).then((r) => r.blob()).then((b) => global.utils.downloadBlob(b, 'PDF_Bondhu_QR.png'));
        }
      });
    }

    // --- C. Real Internet Speed Test (Actual Timed Network Probe) ---
    const speedBtn = document.getElementById('speedTestStartBtn');
    const speedStatus = document.getElementById('speedTestStatus');
    const speedPingEl = document.getElementById('speedTestPing');
    const speedMbpsEl = document.getElementById('speedTestMbps');

    if (speedBtn) {
      speedBtn.addEventListener('click', async () => {
        if (!navigator.onLine) {
          speedStatus.textContent = 'Offline — Connect to Wi-Fi or Mobile Data to measure real internet speed.';
          speedPingEl.textContent = '-- ms';
          speedMbpsEl.textContent = '0.00 Mbps';
          return;
        }
        speedBtn.disabled = true;
        speedStatus.textContent = 'Measuring latency & real download throughput...';
        try {
          // Real latency ping probe
          const pingStart = performance.now();
          await fetch(`./manifest.json?ping=${Date.now()}`, { cache: 'no-store' });
          const pingMs = Math.max(1, Math.round(performance.now() - pingStart));
          speedPingEl.textContent = `${pingMs} ms`;

          // Real download probe (app.js ~280KB fetched uncached to measure true transfer rate)
          const dlStart = performance.now();
          const resp = await fetch(`./app.js?speedtest=${Date.now()}`, { cache: 'no-store' });
          const buf = await resp.arrayBuffer();
          const dlSec = Math.max(0.01, (performance.now() - dlStart) / 1000);
          const mbps = ((buf.byteLength * 8) / (dlSec * 1000000));
          const netInfo = navigator.connection && navigator.connection.downlink
            ? ` · Browser Link Est: ~${navigator.connection.downlink} Mbps (${navigator.connection.effectiveType || '4g'})`
            : '';
          speedMbpsEl.textContent = `${mbps.toFixed(2)} Mbps`;
          speedStatus.textContent = `Measured ${global.utils.formatBytes(buf.byteLength)} in ${Math.round(dlSec * 1000)} ms${netInfo}`;
        } catch (err) {
          speedStatus.textContent = 'Could not reach network host (offline or blocked).';
          speedPingEl.textContent = '-- ms';
          speedMbpsEl.textContent = '-- Mbps';
        } finally {
          speedBtn.disabled = false;
        }
      });
    }
  }
})(window);
