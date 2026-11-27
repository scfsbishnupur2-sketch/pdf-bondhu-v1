(function(global) {
  "use strict";

  var STORE_KEY = "oneora_fin_calc_v1";
  var MODAL_HOST_ID = "oneoraFinCalcModalHost";

  var CALC_TABS = [
    { id: "sip", label: "SIP + Lumpsum", bn: "এসআইপি ও লাম্পসাম" },
    { id: "gold", label: "Gold Price", bn: "সোনার দাম" },
    { id: "emi", label: "Loan & EMI", bn: "ইএমআই ও লোন" },
    { id: "gst", label: "GST & Discount", bn: "জিএসটি ও ছাড়" },
    { id: "trading", label: "Option / Brokerage", bn: "ব্রোকারেজ ও রিস্ক" }
  ];

  var state = {
    activeCalc: "sip",
    sipMode: "combined", // "sip" | "lumpsum" | "combined"
    goldUnit: "gram", // "gram" | "vori"
    goldRateBasis: "10g", // "10g" | "1g"
    goldMakingMode: "pct", // "pct" | "pergram" | "flat"
    emiTenureUnit: "years", // "years" | "months"
    gstSubMode: "gst", // "gst" | "discount"
    gstDirection: "add", // "add" | "remove"
    gstTaxType: "intra", // "intra" (CGST+SGST) | "inter" (IGST)
    tradingSubMode: "brokerage", // "brokerage" | "rr"
    showHistory: false,
    lastResult: null // { calcId, title, lines: [], copyText: "" }
  };

  /* -------------------- Utilities (Strict ES2017) -------------------- */

  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function uid(prefix) {
    return (prefix || "fc") + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
  }

  function todayKey() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1);
    var day = String(d.getDate());
    if (m.length < 2) m = "0" + m;
    if (day.length < 2) day = "0" + day;
    return y + "-" + m + "-" + day;
  }

  function fmtIndian(num, decimals) {
    var n = Number(num);
    if (!isFinite(n)) n = 0;
    var dec = typeof decimals === "number" ? decimals : (Math.abs(n % 1) < 0.005 ? 0 : 2);
    var rounded = Math.round(Math.abs(n) * Math.pow(10, dec)) / Math.pow(10, dec);
    try {
      return rounded.toLocaleString("en-IN", {
        minimumFractionDigits: dec,
        maximumFractionDigits: dec
      });
    } catch (e) {
      var parts = rounded.toFixed(dec).split(".");
      var ip = parts[0];
      if (ip.length > 3) {
        ip = ip.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + ip.slice(-3);
      }
      return parts.length > 1 ? ip + "." + parts[1] : ip;
    }
  }

  function fmtINR(num, showSign, decimals) {
    var n = Number(num);
    if (!isFinite(n)) n = 0;
    var prefix = n < 0 ? "-₹ " : (showSign && n > 0 ? "+₹ " : "₹ ");
    return prefix + fmtIndian(n, decimals);
  }

  function fmtRsAscii(num, decimals) {
    var n = Number(num);
    if (!isFinite(n)) n = 0;
    return (n < 0 ? "-Rs. " : "Rs. ") + fmtIndian(n, decimals);
  }

  function toAsciiSafe(str) {
    return String(str == null ? "" : str)
      .replace(/₹/g, "Rs.")
      .replace(/[^\x20-\x7E]/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "-";
  }

  function notifyToast(title, msg, type) {
    if (global.utils && typeof global.utils.showToast === "function") {
      global.utils.showToast(title, msg, type || "info");
    }
  }

  function haptic(ms) {
    if (typeof global.oneoraHaptic === "function") {
      global.oneoraHaptic(ms || 8);
    } else if (global.OneoraCapabilities && typeof global.OneoraCapabilities.vibrate === "function") {
      global.OneoraCapabilities.vibrate(ms || 8);
    }
  }

  function copyPlainText(text) {
    if (global.OneoraCapabilities && typeof global.OneoraCapabilities.copyText === "function") {
      global.OneoraCapabilities.copyText(text);
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function() {});
    }
    notifyToast("Copied · কপি হয়েছে", "Calculation summary copied to clipboard.", "success");
  }

  /* -------------------- IndexedDB-Backed Storage -------------------- */

  function defaultStore() {
    return {
      version: 1,
      prefs: {
        goldRate22k10g: 72500,
        goldRate24k10g: 79000,
        brokerageFlat: 20
      },
      history: [],
      updatedAtMs: Date.now()
    };
  }

  function loadStore() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return defaultStore();
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return defaultStore();
      var def = defaultStore();
      return {
        version: 1,
        prefs: Object.assign({}, def.prefs, parsed.prefs || {}),
        history: Array.isArray(parsed.history) ? parsed.history : [],
        updatedAtMs: Number(parsed.updatedAtMs || Date.now())
      };
    } catch (e) {
      return defaultStore();
    }
  }

  function saveStore(store) {
    var payload = {
      version: 1,
      prefs: store.prefs || defaultStore().prefs,
      history: Array.isArray(store.history) ? store.history.slice(0, 30) : [],
      updatedAtMs: Date.now()
    };
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(payload));
    } catch (e) {}
    if (global.OneoraDB && typeof global.OneoraDB.syncKeyToIndexedDb === "function") {
      global.OneoraDB.syncKeyToIndexedDb(STORE_KEY).catch(function() {});
    }
    try {
      document.dispatchEvent(new CustomEvent("oneora:fincalcchange"));
      document.dispatchEvent(new CustomEvent("oneora:moneychange"));
    } catch (e) {}
    return payload;
  }

  function saveResultToHistory(res) {
    if (!res) return;
    var store = loadStore();
    store.history.unshift({
      id: uid("hist"),
      calcId: res.calcId,
      title: res.title,
      headline: res.headline,
      copyText: res.copyText,
      dateKey: todayKey(),
      createdAtMs: Date.now()
    });
    if (store.history.length > 25) store.history = store.history.slice(0, 25);
    saveStore(store);
    haptic(10);
    notifyToast("Saved · সেভ হয়েছে", "Calculation saved to offline history.", "success");
  }

  /* -------------------- Shared SVG Visual Bar & Result/Share Sheet -------------------- */

  function renderSplitBar(leftLabel, leftPct, leftColor, rightLabel, rightPct, rightColor) {
    var lp = Math.max(0, Math.min(100, Math.round(leftPct)));
    var rp = 100 - lp;
    return (
      '<div class="space-y-1.5">' +
        '<div class="flex items-center justify-between text-[11px] font-extrabold">' +
          '<span class="text-[#2B2236] dark:text-[#F5EEFF]">' + esc(leftLabel) + " (" + lp + "%)</span>" +
          '<span class="text-[#5C506B] dark:text-[#C5B9DA]">' + esc(rightLabel) + " (" + rp + "%)</span>" +
        "</div>" +
        '<div class="h-3 w-full rounded-full overflow-hidden flex bg-[#2B2236]/10 dark:bg-[#F5EEFF]/12">' +
          '<div style="width:' + lp + "%;background:" + leftColor + ';" class="h-full transition-all duration-300"></div>' +
          '<div style="width:' + rp + "%;background:" + rightColor + ';" class="h-full transition-all duration-300"></div>' +
        "</div>" +
      "</div>"
    );
  }

  function getModalHost() {
    var host = document.getElementById(MODAL_HOST_ID);
    if (!host) {
      host = document.createElement("div");
      host.id = MODAL_HOST_ID;
      document.body.appendChild(host);
    }
    return host;
  }

  function closeModal() {
    var host = document.getElementById(MODAL_HOST_ID);
    if (host) host.innerHTML = "";
  }

  async function openSharePdfSheet(res) {
    if (!res) return;
    var host = getModalHost();
    host.innerHTML =
      '<div class="fixed inset-0 z-[112] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">' +
        '<div id="fcModalBackdrop" class="absolute inset-0 bg-[#2B2236]/55 dark:bg-black/75"></div>' +
        '<div class="relative z-10 w-full max-w-lg bg-white dark:bg-[#221C2E] text-[#2B2236] dark:text-[#F5EEFF] rounded-t-[30px] sm:rounded-[30px] border border-[var(--oneora-border)] p-5 sm:p-6 shadow-2xl space-y-4 max-h-[88vh] overflow-y-auto animate-fade-in" style="padding-bottom: max(1.5rem, env(safe-area-inset-bottom));">' +
          '<div class="flex items-start justify-between gap-3">' +
            '<div>' +
              '<p class="text-[11px] font-extrabold uppercase tracking-wider text-[#804800] dark:text-[#FCD34D]">Calculation Result · রিপোর্ট</p>' +
              '<h3 class="text-lg font-extrabold">' + esc(res.title) + "</h3>" +
            "</div>" +
            '<button type="button" id="fcModalCloseBtn" aria-label="Close" class="w-11 h-11 rounded-full bg-[var(--oneora-bg)] font-extrabold inline-flex items-center justify-center shrink-0">✕</button>' +
          "</div>" +
          '<div class="rounded-[22px] p-4 bg-[#FFE7C2]/65 dark:bg-[#3D2E1D] space-y-1.5">' +
            '<p class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">' + esc(res.headline) + "</p>" +
            '<pre class="text-xs font-semibold text-[#4C3F5E] dark:text-[#E2D9F3] whitespace-pre-wrap font-sans">' + esc(res.copyText) + "</pre>" +
          "</div>" +
          '<div class="grid grid-cols-2 gap-2.5">' +
            '<button type="button" id="fcSheetPdfBtn" class="py-3 px-4 rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white text-xs font-extrabold min-h-[48px] shadow-sm">Download PDF</button>' +
            '<button type="button" id="fcSheetShareBtn" class="py-3 px-4 rounded-full bg-[#CFF3E2] dark:bg-[#1B362E] text-[#115E42] dark:text-[#A7F3D0] text-xs font-extrabold min-h-[48px]">Share Summary</button>' +
          "</div>" +
          '<button type="button" id="fcSheetCopyBtn" class="w-full py-3 px-4 rounded-full bg-[var(--oneora-bg)] text-xs font-extrabold min-h-[44px]">Copy Text · কপি করুন</button>' +
        "</div>" +
      "</div>";

    var bd = document.getElementById("fcModalBackdrop");
    var cb = document.getElementById("fcModalCloseBtn");
    if (bd) bd.addEventListener("click", closeModal);
    if (cb) cb.addEventListener("click", closeModal);

    var copyBtn = document.getElementById("fcSheetCopyBtn");
    var shareBtn = document.getElementById("fcSheetShareBtn");
    var pdfBtn = document.getElementById("fcSheetPdfBtn");

    if (copyBtn) copyBtn.addEventListener("click", function() { copyPlainText(res.copyText); });
    if (shareBtn) {
      shareBtn.addEventListener("click", function() {
        if (navigator.share) {
          navigator.share({ title: "ONEORA — " + res.title, text: res.copyText }).catch(function() {});
        } else {
          copyPlainText(res.copyText);
        }
      });
    }
    if (pdfBtn) {
      pdfBtn.addEventListener("click", async function() {
        pdfBtn.disabled = true;
        pdfBtn.textContent = "Building PDF...";
        try {
          if (global.OneoraLoader && typeof global.OneoraLoader.load === "function") {
            await global.OneoraLoader.load("pdflib");
          }
          if (!global.PDFLib) throw new Error("Offline PDF engine unavailable.");
          var pdfDoc = await global.PDFLib.PDFDocument.create();
          var font = await pdfDoc.embedFont(global.PDFLib.StandardFonts.Helvetica);
          var bold = await pdfDoc.embedFont(global.PDFLib.StandardFonts.HelveticaBold);
          var page = pdfDoc.addPage([595.28, 841.89]);
          var y = 795;

          page.drawText(toAsciiSafe("ONEORA FINANCE — " + res.title.toUpperCase()), {
            x: 42, y: y, size: 15, font: bold, color: global.PDFLib.rgb(0.36, 0.25, 0.82)
          });
          y -= 20;
          page.drawText("Generated Offline: " + todayKey(), {
            x: 42, y: y, size: 9, font: font, color: global.PDFLib.rgb(0.36, 0.31, 0.42)
          });
          y -= 24;
          page.drawText(toAsciiSafe(res.headline), {
            x: 42, y: y, size: 12, font: bold, color: global.PDFLib.rgb(0.07, 0.37, 0.26)
          });
          y -= 22;

          var lines = res.pdfLines && res.pdfLines.length ? res.pdfLines : res.copyText.split("\n");
          for (var i = 0; i < lines.length; i++) {
            if (y < 60) {
              page = pdfDoc.addPage([595.28, 841.89]);
              y = 795;
            }
            page.drawText(toAsciiSafe(lines[i]), {
              x: 42, y: y, size: 9.5, font: i === 0 ? bold : font, color: global.PDFLib.rgb(0.17, 0.13, 0.21)
            });
            y -= 16;
          }

          var bytes = await pdfDoc.save();
          var blob = new Blob([bytes], { type: "application/pdf" });
          var fname = "ONEORA_" + res.calcId.toUpperCase() + "_" + todayKey() + ".pdf";
          if (global.utils && typeof global.utils.downloadBlob === "function") {
            global.utils.downloadBlob(blob, fname);
          } else {
            var url = URL.createObjectURL(blob);
            var a = document.createElement("a");
            a.href = url;
            a.download = fname;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
          }
          notifyToast("PDF Saved", fname + " downloaded.", "success");
        } catch (err) {
          notifyToast("PDF Failed", err && err.message ? err.message : "Could not build PDF.", "error");
        } finally {
          pdfBtn.disabled = false;
          pdfBtn.textContent = "Download PDF";
        }
      });
    }
  }

  /* -------------------- 1. SIP + LUMPSUM CALCULATOR -------------------- */

  function computeSip(params) {
    var monthly = params.mode === "lumpsum" ? 0 : Math.max(0, Number(params.monthly || 0));
    var lumpsum = params.mode === "sip" ? 0 : Math.max(0, Number(params.lumpsum || 0));
    var rate = Math.max(0, Number(params.rate || 0)) / 100;
    var years = Math.max(1, Math.min(50, Math.round(Number(params.years || 1))));
    var stepUp = Math.max(0, Math.min(50, Number(params.stepUp || 0))) / 100;
    var inflation = params.adjustInflation ? Math.max(0, Math.min(20, Number(params.inflation || 0))) / 100 : 0;

    var monthlyRate = rate / 12;
    var totalValue = lumpsum;
    var totalInvested = lumpsum;
    var currentMonthly = monthly;
    var schedule = [];

    for (var yr = 1; yr <= years; yr++) {
      for (var m = 1; m <= 12; m++) {
        totalValue = (totalValue + currentMonthly) * (1 + monthlyRate);
        totalInvested += currentMonthly;
      }
      var gain = totalValue - totalInvested;
      schedule.push({
        year: yr,
        invested: Math.round(totalInvested),
        gain: Math.round(gain),
        value: Math.round(totalValue)
      });
      if (stepUp > 0) {
        currentMonthly = currentMonthly * (1 + stepUp);
      }
    }

    var realValue = inflation > 0 ? totalValue / Math.pow(1 + inflation, years) : totalValue;
    return {
      invested: Math.round(totalInvested),
      gain: Math.round(totalValue - totalInvested),
      total: Math.round(totalValue),
      realValue: Math.round(realValue),
      years: years,
      schedule: schedule
    };
  }

  function renderSipPanel() {
    return (
      '<div class="space-y-4">' +
        '<div class="pastel-stage3-card p-5 space-y-4">' +
          '<div class="flex flex-wrap items-center justify-between gap-2">' +
            '<div>' +
              '<p class="text-[11px] font-extrabold uppercase tracking-wider text-[#804800] dark:text-[#FCD34D]">Wealth Planner · এসআইপি ও লাম্পসাম</p>' +
              '<h3 class="text-base sm:text-lg font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">SIP + Lumpsum Calculator</h3>' +
            "</div>" +
            '<div class="flex items-center gap-1.5">' +
              [
                { id: "sip", label: "SIP" },
                { id: "lumpsum", label: "Lumpsum" },
                { id: "combined", label: "SIP + Lump" }
              ].map(function(m) {
                return '<button type="button" data-fc-sip-mode="' + m.id + '" class="pastel-pill-tab ' + (state.sipMode === m.id ? "is-active" : "") + '">' + m.label + "</button>";
              }).join("") +
            "</div>" +
          "</div>" +

          '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">' +
            (state.sipMode !== "lumpsum"
              ? '<div>' +
                  '<label for="fcSipMonthly" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Monthly SIP (₹) · মাসিক বিনিয়োগ</label>' +
                  '<input type="number" id="fcSipMonthly" value="5000" min="0" step="500" class="pastel-pill-input w-full text-sm font-extrabold tabular-nums" />' +
                "</div>"
              : "") +
            (state.sipMode !== "sip"
              ? '<div>' +
                  '<label for="fcSipLump" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Lumpsum Amount (₹) · এককালীন</label>' +
                  '<input type="number" id="fcSipLump" value="100000" min="0" step="5000" class="pastel-pill-input w-full text-sm font-extrabold tabular-nums" />' +
                "</div>"
              : "") +
            '<div>' +
              '<label for="fcSipRate" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Expected Return (% p.a.) · বার্ষিক রিটার্ন</label>' +
              '<input type="number" id="fcSipRate" value="12" min="0" max="50" step="0.5" class="pastel-pill-input w-full text-sm font-extrabold tabular-nums" />' +
            "</div>" +
            '<div>' +
              '<label for="fcSipYears" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Duration (Years) · সময়কাল (বছর)</label>' +
              '<input type="number" id="fcSipYears" value="10" min="1" max="50" class="pastel-pill-input w-full text-sm font-extrabold tabular-nums" />' +
            "</div>" +
            (state.sipMode !== "lumpsum"
              ? '<div>' +
                  '<label for="fcSipStepUp" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Annual Step-Up % (Optional)</label>' +
                  '<input type="number" id="fcSipStepUp" value="0" min="0" max="50" step="1" class="pastel-pill-input w-full text-sm font-bold tabular-nums" />' +
                "</div>"
              : "") +
            '<div>' +
              '<label for="fcSipInfl" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Inflation % (0 = Off · মুদ্রাস্ফীতি)</label>' +
              '<input type="number" id="fcSipInfl" value="0" min="0" max="20" step="0.5" class="pastel-pill-input w-full text-sm font-bold tabular-nums" />' +
            "</div>" +
          "</div>" +

          '<button type="button" id="fcSipCalcBtn" class="w-full py-3.5 rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white text-xs sm:text-sm font-extrabold min-h-[48px] shadow-sm">Calculate Wealth · হিসাব করুন</button>' +
        "</div>" +
        '<div id="fcSipResultBox"></div>' +
      "</div>"
    );
  }

  /* -------------------- 2. GOLD PRICE CALCULATOR -------------------- */

  function computeGold(params) {
    var rateVal = Math.max(0, Number(params.rate || 0));
    var ratePerGram = params.rateBasis === "10g" ? rateVal / 10 : rateVal;
    var grams = 0;
    if (params.unit === "vori") {
      var vori = Math.max(0, Number(params.vori || 0));
      var ana = Math.max(0, Number(params.ana || 0));
      var roti = Math.max(0, Number(params.roti || 0));
      grams = (vori + ana / 16 + roti / 96) * 11.664;
    } else {
      grams = Math.max(0, Number(params.grams || 0));
    }

    var baseGold = grams * ratePerGram;
    var wastagePct = Math.max(0, Number(params.wastagePct || 0));
    var wastageAmt = baseGold * wastagePct / 100;

    var makingInput = Math.max(0, Number(params.making || 0));
    var makingAmt = 0;
    if (params.makingMode === "pct") makingAmt = baseGold * makingInput / 100;
    else if (params.makingMode === "pergram") makingAmt = grams * makingInput;
    else makingAmt = makingInput;

    var subtotal = baseGold + wastageAmt + makingAmt;
    var gstPct = Math.max(0, Number(params.gstPct || 0));
    var gstAmt = subtotal * gstPct / 100;
    var grandTotal = subtotal + gstAmt;
    var exchangeDed = Math.max(0, Number(params.exchangeAmt || 0));
    var netPayable = Math.max(0, grandTotal - exchangeDed);

    return {
      grams: Math.round(grams * 1000) / 1000,
      ratePerGram: Math.round(ratePerGram * 100) / 100,
      baseGold: Math.round(baseGold),
      wastageAmt: Math.round(wastageAmt),
      makingAmt: Math.round(makingAmt),
      gstAmt: Math.round(gstAmt),
      grandTotal: Math.round(grandTotal),
      exchangeDed: Math.round(exchangeDed),
      netPayable: Math.round(netPayable),
      effectivePerGram: grams > 0 ? Math.round(grandTotal / grams) : 0
    };
  }

  function renderGoldPanel(store) {
    var savedRate = store.prefs && store.prefs.goldRate22k10g ? store.prefs.goldRate22k10g : 72500;
    return (
      '<div class="space-y-4">' +
        '<div class="pastel-stage3-card p-5 space-y-4">' +
          '<div class="flex flex-wrap items-center justify-between gap-2">' +
            '<div>' +
              '<p class="text-[11px] font-extrabold uppercase tracking-wider text-[#804800] dark:text-[#FCD34D]">Jewellery Estimator · সোনার গহনার দাম</p>' +
              '<h3 class="text-base sm:text-lg font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">Gold Price Calculator</h3>' +
            "</div>" +
            '<div class="flex items-center gap-1.5">' +
              '<button type="button" data-fc-gold-unit="gram" class="pastel-pill-tab ' + (state.goldUnit === "gram" ? "is-active" : "") + '">Grams · গ্রাম</button>' +
              '<button type="button" data-fc-gold-unit="vori" class="pastel-pill-tab ' + (state.goldUnit === "vori" ? "is-active" : "") + '">Vori · ভরি-আনা</button>' +
            "</div>" +
          "</div>" +

          '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">' +
            '<div>' +
              '<label for="fcGoldPurity" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Purity · ক্যারেট</label>' +
              '<select id="fcGoldPurity" class="pastel-pill-input w-full text-xs font-extrabold">' +
                '<option value="22K (91.6% Hallmark)" selected>22K · 91.6% Hallmark Jewellery</option>' +
                '<option value="24K (99.9% Pure)">24K · 99.9% Pure Coin / Bar</option>' +
                '<option value="18K (75.0%)">18K · 75.0% Studded Jewellery</option>' +
                '<option value="14K (58.5%)">14K · 58.5% Light Jewellery</option>' +
              "</select>" +
            "</div>" +
            '<div>' +
              '<label for="fcGoldRateBasis" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Rate Basis · দরের হিসাব</label>' +
              '<select id="fcGoldRateBasis" class="pastel-pill-input w-full text-xs font-extrabold">' +
                '<option value="10g"' + (state.goldRateBasis === "10g" ? " selected" : "") + ">Per 10 Grams (১০ গ্রাম)</option>" +
                '<option value="1g"' + (state.goldRateBasis === "1g" ? " selected" : "") + ">Per 1 Gram (১ গ্রাম)</option>" +
              "</select>" +
            "</div>" +
            '<div>' +
              '<label for="fcGoldRate" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Today\'s Gold Rate (₹) · আজকের দর</label>' +
              '<input type="number" id="fcGoldRate" value="' + esc(state.goldRateBasis === "10g" ? savedRate : Math.round(savedRate / 10)) + '" min="0" class="pastel-pill-input w-full text-sm font-extrabold tabular-nums" />' +
            "</div>" +
            (state.goldUnit === "gram"
              ? '<div>' +
                  '<label for="fcGoldGrams" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Weight in Grams · ওজন (গ্রাম)</label>' +
                  '<input type="number" id="fcGoldGrams" value="10" min="0" step="0.01" class="pastel-pill-input w-full text-sm font-extrabold tabular-nums" />' +
                "</div>"
              : '<div class="grid grid-cols-3 gap-2">' +
                  '<div>' +
                    '<label for="fcGoldVori" class="block text-[11px] font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Vori · ভরি</label>' +
                    '<input type="number" id="fcGoldVori" value="1" min="0" step="1" class="pastel-pill-input w-full text-sm font-extrabold tabular-nums" />' +
                  "</div>" +
                  '<div>' +
                    '<label for="fcGoldAna" class="block text-[11px] font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Ana · আনা</label>' +
                    '<input type="number" id="fcGoldAna" value="0" min="0" max="15" step="1" class="pastel-pill-input w-full text-sm font-extrabold tabular-nums" />' +
                  "</div>" +
                  '<div>' +
                    '<label for="fcGoldRoti" class="block text-[11px] font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Roti · রতি</label>' +
                    '<input type="number" id="fcGoldRoti" value="0" min="0" max="5" step="0.5" class="pastel-pill-input w-full text-sm font-extrabold tabular-nums" />' +
                  "</div>" +
                "</div>") +
            '<div>' +
              '<label for="fcGoldMakingMode" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Making Charge Type · মজুরি</label>' +
              '<select id="fcGoldMakingMode" class="pastel-pill-input w-full text-xs font-bold">' +
                '<option value="pct"' + (state.goldMakingMode === "pct" ? " selected" : "") + ">Percentage (% of gold)</option>" +
                '<option value="pergram"' + (state.goldMakingMode === "pergram" ? " selected" : "") + ">Flat per gram (₹/g)</option>" +
                '<option value="flat"' + (state.goldMakingMode === "flat" ? " selected" : "") + ">Flat total (₹)</option>" +
              "</select>" +
            "</div>" +
            '<div>' +
              '<label for="fcGoldMakingVal" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Making Charge Value</label>' +
              '<input type="number" id="fcGoldMakingVal" value="' + (state.goldMakingMode === "pct" ? "12" : state.goldMakingMode === "pergram" ? "650" : "5000") + '" min="0" step="0.5" class="pastel-pill-input w-full text-sm font-extrabold tabular-nums" />' +
            "</div>" +
            '<div>' +
              '<label for="fcGoldGst" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">GST % (India Standard 3%)</label>' +
              '<input type="number" id="fcGoldGst" value="3" min="0" max="28" step="0.5" class="pastel-pill-input w-full text-sm font-bold tabular-nums" />' +
            "</div>" +
            '<div>' +
              '<label for="fcGoldExchange" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Old Gold Exchange Deduction (₹)</label>' +
              '<input type="number" id="fcGoldExchange" value="0" min="0" class="pastel-pill-input w-full text-sm font-bold tabular-nums" />' +
            "</div>" +
          "</div>" +

          '<button type="button" id="fcGoldCalcBtn" class="w-full py-3.5 rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white text-xs sm:text-sm font-extrabold min-h-[48px] shadow-sm">Calculate Gold Price · দাম হিসাব করুন</button>' +
        "</div>" +
        '<div id="fcGoldResultBox"></div>' +
      "</div>"
    );
  }

  /* -------------------- 3. LOAN & EMI CALCULATOR -------------------- */

  function computeEmi(params) {
    var principal = Math.max(0, Number(params.principal || 0));
    var annualRate = Math.max(0, Number(params.rate || 0));
    var months = params.tenureUnit === "months"
      ? Math.max(1, Math.min(600, Math.round(Number(params.tenure || 1))))
      : Math.max(1, Math.min(50, Number(params.tenure || 1))) * 12;
    months = Math.round(months);
    var extraMonthly = Math.max(0, Number(params.extraMonthly || 0));

    var r = annualRate / 100 / 12;
    var emi = r > 0
      ? principal * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1)
      : (months > 0 ? principal / months : 0);

    var baseTotalPayment = emi * months;
    var baseTotalInterest = Math.max(0, baseTotalPayment - principal);

    // Simulate amortization with optional monthly prepayment
    var balance = principal;
    var actualMonths = 0;
    var actualInterest = 0;
    var yearly = [];
    var curYearP = 0;
    var curYearI = 0;

    while (balance > 0.5 && actualMonths < months + 12) {
      actualMonths += 1;
      var interestForMonth = balance * r;
      var principalFromEmi = Math.min(balance, Math.max(0, emi - interestForMonth));
      var extraP = Math.min(Math.max(0, balance - principalFromEmi), extraMonthly);
      var totalP = principalFromEmi + extraP;
      if (totalP <= 0 && r > 0) break;
      balance = Math.max(0, balance - totalP);
      actualInterest += interestForMonth;
      curYearP += totalP;
      curYearI += interestForMonth;

      if (actualMonths % 12 === 0 || balance <= 0.5) {
        yearly.push({
          year: Math.ceil(actualMonths / 12),
          principalPaid: Math.round(curYearP),
          interestPaid: Math.round(curYearI),
          balanceLeft: Math.round(balance)
        });
        curYearP = 0;
        curYearI = 0;
      }
    }

    return {
      principal: Math.round(principal),
      emi: Math.round(emi),
      months: months,
      actualMonths: actualMonths,
      totalInterest: Math.round(actualInterest),
      totalPayment: Math.round(principal + actualInterest),
      interestSaved: Math.max(0, Math.round(baseTotalInterest - actualInterest)),
      monthsSaved: Math.max(0, months - actualMonths),
      yearly: yearly
    };
  }

  function renderEmiPanel() {
    return (
      '<div class="space-y-4">' +
        '<div class="pastel-stage3-card p-5 space-y-4">' +
          '<div class="flex flex-wrap items-center justify-between gap-2">' +
            '<div>' +
              '<p class="text-[11px] font-extrabold uppercase tracking-wider text-[#804800] dark:text-[#FCD34D]">Home / Car / Personal Loan · ইএমআই</p>' +
              '<h3 class="text-base sm:text-lg font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">Loan &amp; EMI Calculator</h3>' +
            "</div>" +
            '<div class="flex items-center gap-1.5">' +
              '<button type="button" data-fc-emi-unit="years" class="pastel-pill-tab ' + (state.emiTenureUnit === "years" ? "is-active" : "") + '">Years · বছর</button>' +
              '<button type="button" data-fc-emi-unit="months" class="pastel-pill-tab ' + (state.emiTenureUnit === "months" ? "is-active" : "") + '">Months · মাস</button>' +
            "</div>" +
          "</div>" +

          '<div class="flex flex-wrap gap-1.5">' +
            [
              { amt: 200000, lbl: "₹ 2L" },
              { amt: 500000, lbl: "₹ 5L" },
              { amt: 1000000, lbl: "₹ 10L" },
              { amt: 2500000, lbl: "₹ 25L" },
              { amt: 5000000, lbl: "₹ 50L" }
            ].map(function(p) {
              return '<button type="button" data-fc-emi-preset="' + p.amt + '" class="px-3 py-1.5 rounded-full bg-[var(--oneora-bg)] text-xs font-extrabold min-h-[38px]">' + p.lbl + "</button>";
            }).join("") +
          "</div>" +

          '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">' +
            '<div>' +
              '<label for="fcEmiAmt" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Loan Amount (₹) · ঋণের পরিমাণ</label>' +
              '<input type="number" id="fcEmiAmt" value="500000" min="1000" step="10000" class="pastel-pill-input w-full text-sm font-extrabold tabular-nums" />' +
            "</div>" +
            '<div>' +
              '<label for="fcEmiRate" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Interest Rate (% p.a.) · সুদের হার</label>' +
              '<input type="number" id="fcEmiRate" value="9.5" min="0" max="40" step="0.1" class="pastel-pill-input w-full text-sm font-extrabold tabular-nums" />' +
            "</div>" +
            '<div>' +
              '<label for="fcEmiTenure" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Loan Tenure (' + (state.emiTenureUnit === "years" ? "Years · বছর" : "Months · মাস") + ")</label>" +
              '<input type="number" id="fcEmiTenure" value="' + (state.emiTenureUnit === "years" ? "5" : "60") + '" min="1" class="pastel-pill-input w-full text-sm font-extrabold tabular-nums" />' +
            "</div>" +
            '<div>' +
              '<label for="fcEmiPrepay" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Extra Monthly Prepay (₹ · Optional)</label>' +
              '<input type="number" id="fcEmiPrepay" value="0" min="0" step="500" class="pastel-pill-input w-full text-sm font-bold tabular-nums" />' +
            "</div>" +
          "</div>" +

          '<button type="button" id="fcEmiCalcBtn" class="w-full py-3.5 rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white text-xs sm:text-sm font-extrabold min-h-[48px] shadow-sm">Calculate EMI · কিস্তি হিসাব করুন</button>' +
        "</div>" +
        '<div id="fcEmiResultBox"></div>' +
      "</div>"
    );
  }

  /* -------------------- 4. GST & DISCOUNT CALCULATOR -------------------- */

  function renderGstPanel() {
    return (
      '<div class="space-y-4">' +
        '<div class="pastel-stage3-card p-5 space-y-4">' +
          '<div class="flex flex-wrap items-center justify-between gap-2">' +
            '<div>' +
              '<p class="text-[11px] font-extrabold uppercase tracking-wider text-[#804800] dark:text-[#FCD34D]">Shop &amp; Billing · জিএসটি ও ছাড়</p>' +
              '<h3 class="text-base sm:text-lg font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">GST &amp; Discount Calculator</h3>' +
            "</div>" +
            '<div class="flex items-center gap-1.5">' +
              '<button type="button" data-fc-gst-sub="gst" class="pastel-pill-tab ' + (state.gstSubMode === "gst" ? "is-active" : "") + '">GST · জিএসটি</button>' +
              '<button type="button" data-fc-gst-sub="discount" class="pastel-pill-tab ' + (state.gstSubMode === "discount" ? "is-active" : "") + '">Discount · ডিসকাউন্ট</button>' +
            "</div>" +
          "</div>" +

          (state.gstSubMode === "gst"
            ? '<div class="space-y-3.5">' +
                '<div class="grid grid-cols-2 gap-2">' +
                  '<button type="button" data-fc-gst-dir="add" class="py-2.5 px-3 rounded-[18px] text-xs font-extrabold min-h-[44px] border-2 ' +
                    (state.gstDirection === "add"
                      ? "bg-[#FFE7C2] dark:bg-[#3D2E1D] text-[#5C3400] dark:text-[#FDE68A] border-[#804800]/50"
                      : "bg-[var(--oneora-bg)] text-[#5C506B] dark:text-[#C5B9DA] border-transparent") +
                    '">+ Add GST (Exclusive)</button>' +
                  '<button type="button" data-fc-gst-dir="remove" class="py-2.5 px-3 rounded-[18px] text-xs font-extrabold min-h-[44px] border-2 ' +
                    (state.gstDirection === "remove"
                      ? "bg-[#FFE7C2] dark:bg-[#3D2E1D] text-[#5C3400] dark:text-[#FDE68A] border-[#804800]/50"
                      : "bg-[var(--oneora-bg)] text-[#5C506B] dark:text-[#C5B9DA] border-transparent") +
                    '">− Remove GST (Inclusive)</button>' +
                "</div>" +
                '<div class="flex flex-wrap items-center gap-1.5">' +
                  [3, 5, 12, 18, 28].map(function(slab) {
                    return '<button type="button" data-fc-gst-slab="' + slab + '" class="px-3.5 py-2 rounded-full bg-[var(--oneora-bg)] text-xs font-extrabold min-h-[40px]">' + slab + "%</button>";
                  }).join("") +
                "</div>" +
                '<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">' +
                  '<div>' +
                    '<label for="fcGstAmt" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Amount (₹) · মূল্য</label>' +
                    '<input type="number" id="fcGstAmt" value="1000" min="0" step="0.01" class="pastel-pill-input w-full text-sm font-extrabold tabular-nums" />' +
                  "</div>" +
                  '<div>' +
                    '<label for="fcGstPct" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">GST Rate (%) · হার</label>' +
                    '<input type="number" id="fcGstPct" value="18" min="0" max="100" step="0.5" class="pastel-pill-input w-full text-sm font-extrabold tabular-nums" />' +
                  "</div>" +
                  '<div>' +
                    '<label for="fcGstQty" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Quantity · সংখ্যা</label>' +
                    '<input type="number" id="fcGstQty" value="1" min="1" step="1" class="pastel-pill-input w-full text-sm font-extrabold tabular-nums" />' +
                  "</div>" +
                "</div>" +
                '<div class="flex items-center gap-2">' +
                  '<button type="button" data-fc-gst-tax="intra" class="pastel-pill-tab ' + (state.gstTaxType === "intra" ? "is-active" : "") + '">CGST + SGST (Same State)</button>' +
                  '<button type="button" data-fc-gst-tax="inter" class="pastel-pill-tab ' + (state.gstTaxType === "inter" ? "is-active" : "") + '">IGST (Inter-State)</button>' +
                "</div>" +
                '<button type="button" id="fcGstCalcBtn" class="w-full py-3.5 rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white text-xs sm:text-sm font-extrabold min-h-[48px] shadow-sm">Calculate GST · জিএসটি হিসাব করুন</button>' +
              "</div>"
            : '<div class="space-y-3.5">' +
                '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">' +
                  '<div>' +
                    '<label for="fcDiscMrp" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Original MRP (₹) · আসল দাম</label>' +
                    '<input type="number" id="fcDiscMrp" value="2499" min="0" step="1" class="pastel-pill-input w-full text-sm font-extrabold tabular-nums" />' +
                  "</div>" +
                  '<div>' +
                    '<label for="fcDiscPct1" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Primary Discount (%) · ছাড়</label>' +
                    '<input type="number" id="fcDiscPct1" value="20" min="0" max="100" step="0.5" class="pastel-pill-input w-full text-sm font-extrabold tabular-nums" />' +
                  "</div>" +
                  '<div>' +
                    '<label for="fcDiscPct2" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Extra / Coupon Discount (%) · অতিরিক্ত ছাড়</label>' +
                    '<input type="number" id="fcDiscPct2" value="10" min="0" max="100" step="0.5" class="pastel-pill-input w-full text-sm font-bold tabular-nums" />' +
                  "</div>" +
                  '<div>' +
                    '<label for="fcDiscTax" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">GST % After Discount (Optional)</label>' +
                    '<input type="number" id="fcDiscTax" value="0" min="0" max="28" step="0.5" class="pastel-pill-input w-full text-sm font-bold tabular-nums" />' +
                  "</div>" +
                "</div>" +
                '<button type="button" id="fcDiscCalcBtn" class="w-full py-3.5 rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white text-xs sm:text-sm font-extrabold min-h-[48px] shadow-sm">Calculate Final Price · চূড়ান্ত দাম</button>' +
              "</div>") +
        "</div>" +
        '<div id="fcGstResultBox"></div>' +
      "</div>"
    );
  }

  /* -------------------- 5. OPTION / SCALPING BROKERAGE & RISK-REWARD -------------------- */

  function computeBrokerage(params) {
    var segment = params.segment || "options_nse";
    var buy = Math.max(0, Number(params.buy || 0));
    var sell = Math.max(0, Number(params.sell || 0));
    var qty = Math.max(1, Number(params.qty || 1));
    var flatPerOrder = Math.max(0, Number(params.flatBrokerage || 20));

    var buyVal = buy * qty;
    var sellVal = sell * qty;
    var turnover = buyVal + sellVal;
    var grossPnl = sellVal - buyVal;

    var brokerage = 0;
    var stt = 0;
    var exchRate = 0;
    var stampRate = 0.00003; // 0.003% on buy

    if (segment === "options_nse" || segment === "options_bse") {
      brokerage = flatPerOrder * 2;
      stt = sellVal * 0.001; // 0.1% on sell premium
      exchRate = segment === "options_nse" ? 0.0003503 : 0.000325;
      stampRate = 0.00003;
    } else if (segment === "futures_nse") {
      brokerage = Math.min(flatPerOrder, buyVal * 0.0003) + Math.min(flatPerOrder, sellVal * 0.0003);
      stt = sellVal * 0.0002; // 0.02% on sell
      exchRate = 0.0000173;
      stampRate = 0.00002;
    } else if (segment === "intraday") {
      brokerage = Math.min(flatPerOrder, buyVal * 0.0003) + Math.min(flatPerOrder, sellVal * 0.0003);
      stt = sellVal * 0.00025; // 0.025% on sell
      exchRate = 0.0000297;
      stampRate = 0.00003;
    } else {
      // Equity Delivery
      brokerage = 0;
      stt = turnover * 0.001; // 0.1% on buy & sell
      exchRate = 0.0000297;
      stampRate = 0.00015; // 0.015% on buy
    }

    var exchangeTxn = turnover * exchRate;
    var sebiFee = turnover * 0.000001; // Rs 10 per crore
    var stampDuty = buyVal * stampRate;
    var gst = (brokerage + exchangeTxn + sebiFee) * 0.18;
    var totalCharges = brokerage + stt + exchangeTxn + sebiFee + stampDuty + gst;
    var netPnl = grossPnl - totalCharges;
    var breakevenPts = qty > 0 ? totalCharges / qty : 0;

    return {
      turnover: turnover,
      grossPnl: grossPnl,
      brokerage: brokerage,
      stt: stt,
      exchangeTxn: exchangeTxn,
      sebiFee: sebiFee,
      stampDuty: stampDuty,
      gst: gst,
      totalCharges: totalCharges,
      netPnl: netPnl,
      breakevenPts: breakevenPts,
      qty: qty
    };
  }

  function renderTradingPanel(store) {
    var savedFlat = store.prefs && store.prefs.brokerageFlat != null ? store.prefs.brokerageFlat : 20;
    return (
      '<div class="space-y-4">' +
        '<div class="pastel-stage3-card p-5 space-y-4">' +
          '<div class="flex flex-wrap items-center justify-between gap-2">' +
            '<div>' +
              '<p class="text-[11px] font-extrabold uppercase tracking-wider text-[#804800] dark:text-[#FCD34D]">NSE / BSE F&amp;O · ব্রোকারেজ ও রিস্ক</p>' +
              '<h3 class="text-base sm:text-lg font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">Option / Scalping &amp; Risk-Reward</h3>' +
            "</div>" +
            '<div class="flex items-center gap-1.5">' +
              '<button type="button" data-fc-tr-sub="brokerage" class="pastel-pill-tab ' + (state.tradingSubMode === "brokerage" ? "is-active" : "") + '">Brokerage · চার্জ</button>' +
              '<button type="button" data-fc-tr-sub="rr" class="pastel-pill-tab ' + (state.tradingSubMode === "rr" ? "is-active" : "") + '">Risk-Reward · রিস্ক</button>' +
            "</div>" +
          "</div>" +

          (state.tradingSubMode === "brokerage"
            ? '<div class="space-y-3.5">' +
                '<div class="flex flex-wrap items-center gap-1.5">' +
                  [
                    { lbl: "NIFTY (75)", qty: 75 },
                    { lbl: "BANKNIFTY (30)", qty: 30 },
                    { lbl: "FINNIFTY (65)", qty: 65 },
                    { lbl: "SENSEX (20)", qty: 20 }
                  ].map(function(lot) {
                    return '<button type="button" data-fc-lot-preset="' + lot.qty + '" class="px-3 py-1.5 rounded-full bg-[var(--oneora-bg)] text-xs font-extrabold min-h-[38px]">' + lot.lbl + "</button>";
                  }).join("") +
                "</div>" +
                '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">' +
                  '<div class="sm:col-span-2">' +
                    '<label for="fcTrSegment" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Segment · সেগমেন্ট</label>' +
                    '<select id="fcTrSegment" class="pastel-pill-input w-full text-xs font-extrabold">' +
                      '<option value="options_nse" selected>F&amp;O Options (NSE)</option>' +
                      '<option value="options_bse">F&amp;O Options (BSE)</option>' +
                      '<option value="futures_nse">F&amp;O Futures (NSE)</option>' +
                      '<option value="intraday">Equity Intraday</option>' +
                      '<option value="delivery">Equity Delivery (₹0 Brokerage)</option>' +
                    "</select>" +
                  "</div>" +
                  '<div>' +
                    '<label for="fcTrBuy" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Buy Price (₹) · কেনা দাম</label>' +
                    '<input type="number" id="fcTrBuy" value="120" min="0" step="0.05" class="pastel-pill-input w-full text-sm font-extrabold tabular-nums" />' +
                  "</div>" +
                  '<div>' +
                    '<label for="fcTrSell" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Sell Price (₹) · বেচা দাম</label>' +
                    '<input type="number" id="fcTrSell" value="135" min="0" step="0.05" class="pastel-pill-input w-full text-sm font-extrabold tabular-nums" />' +
                  "</div>" +
                  '<div>' +
                    '<label for="fcTrQty" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Total Quantity (Lots × Size)</label>' +
                    '<input type="number" id="fcTrQty" value="75" min="1" step="1" class="pastel-pill-input w-full text-sm font-extrabold tabular-nums" />' +
                  "</div>" +
                  '<div>' +
                    '<label for="fcTrBrok" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Flat Brokerage / Order (₹)</label>' +
                    '<input type="number" id="fcTrBrok" value="' + esc(savedFlat) + '" min="0" step="1" class="pastel-pill-input w-full text-sm font-bold tabular-nums" />' +
                  "</div>" +
                "</div>" +
                '<button type="button" id="fcTrBrokCalcBtn" class="w-full py-3.5 rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white text-xs sm:text-sm font-extrabold min-h-[48px] shadow-sm">Calculate Net P&amp;L &amp; Charges</button>' +
              "</div>"
            : '<div class="space-y-3.5">' +
                '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">' +
                  '<div>' +
                    '<label for="fcRrCap" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Trading Capital (₹) · মূলধন</label>' +
                    '<input type="number" id="fcRrCap" value="100000" min="100" step="1000" class="pastel-pill-input w-full text-sm font-extrabold tabular-nums" />' +
                  "</div>" +
                  '<div>' +
                    '<label for="fcRrRiskPct" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Max Risk per Trade (%) · ঝুঁকি</label>' +
                    '<input type="number" id="fcRrRiskPct" value="2" min="0.1" max="50" step="0.5" class="pastel-pill-input w-full text-sm font-extrabold tabular-nums" />' +
                  "</div>" +
                  '<div>' +
                    '<label for="fcRrEntry" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Entry Price (₹)</label>' +
                    '<input type="number" id="fcRrEntry" value="150" min="0.05" step="0.5" class="pastel-pill-input w-full text-sm font-extrabold tabular-nums" />' +
                  "</div>" +
                  '<div>' +
                    '<label for="fcRrSl" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Stop-Loss Price (₹)</label>' +
                    '<input type="number" id="fcRrSl" value="138" min="0.05" step="0.5" class="pastel-pill-input w-full text-sm font-extrabold tabular-nums" />' +
                  "</div>" +
                  '<div>' +
                    '<label for="fcRrTarget" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Target Price (₹)</label>' +
                    '<input type="number" id="fcRrTarget" value="180" min="0.05" step="0.5" class="pastel-pill-input w-full text-sm font-extrabold tabular-nums" />' +
                  "</div>" +
                  '<div>' +
                    '<label for="fcRrLot" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Lot Size (1 for Stocks, 75 NIFTY)</label>' +
                    '<input type="number" id="fcRrLot" value="75" min="1" step="1" class="pastel-pill-input w-full text-sm font-bold tabular-nums" />' +
                  "</div>" +
                "</div>" +
                '<button type="button" id="fcRrCalcBtn" class="w-full py-3.5 rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white text-xs sm:text-sm font-extrabold min-h-[48px] shadow-sm">Calculate Risk-Reward &amp; Safe Lots</button>' +
              "</div>") +
        "</div>" +
        '<div id="fcTradingResultBox"></div>' +
      "</div>"
    );
  }

  /* -------------------- Shared Action Bar for Result Cards -------------------- */

  function renderResultActionsHtml(prefix) {
    return (
      '<div class="grid grid-cols-3 gap-2 pt-2">' +
        '<button type="button" id="' + prefix + 'SaveBtn" class="py-2.5 px-3 rounded-full bg-[#FFE7C2] dark:bg-[#3D2E1D] text-[#5C3400] dark:text-[#FDE68A] text-xs font-extrabold min-h-[44px]">Save · সেভ</button>' +
        '<button type="button" id="' + prefix + 'CopyBtn" class="py-2.5 px-3 rounded-full bg-[var(--oneora-bg)] text-[#2B2236] dark:text-[#F5EEFF] text-xs font-extrabold min-h-[44px]">Copy · কপি</button>' +
        '<button type="button" id="' + prefix + 'ShareBtn" class="py-2.5 px-3 rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white text-xs font-extrabold min-h-[44px]">PDF / Share</button>' +
      "</div>"
    );
  }

  function bindResultActions(root, prefix, resultObj) {
    state.lastResult = resultObj;
    var sBtn = root.querySelector("#" + prefix + "SaveBtn");
    var cBtn = root.querySelector("#" + prefix + "CopyBtn");
    var shBtn = root.querySelector("#" + prefix + "ShareBtn");
    if (sBtn) sBtn.addEventListener("click", function() { saveResultToHistory(resultObj); });
    if (cBtn) cBtn.addEventListener("click", function() { copyPlainText(resultObj.copyText); });
    if (shBtn) shBtn.addEventListener("click", function() { openSharePdfSheet(resultObj); });
  }

  /* -------------------- Compute + Render Each Output Box -------------------- */

  function runSipCalculation(root) {
    var box = root.querySelector("#fcSipResultBox");
    if (!box) return;
    var mEl = root.querySelector("#fcSipMonthly");
    var lEl = root.querySelector("#fcSipLump");
    var rEl = root.querySelector("#fcSipRate");
    var yEl = root.querySelector("#fcSipYears");
    var suEl = root.querySelector("#fcSipStepUp");
    var infEl = root.querySelector("#fcSipInfl");

    var params = {
      mode: state.sipMode,
      monthly: mEl ? Number(mEl.value || 0) : 0,
      lumpsum: lEl ? Number(lEl.value || 0) : 0,
      rate: rEl ? Number(rEl.value || 0) : 12,
      years: yEl ? Number(yEl.value || 10) : 10,
      stepUp: suEl ? Number(suEl.value || 0) : 0,
      inflation: infEl ? Number(infEl.value || 0) : 0,
      adjustInflation: infEl && Number(infEl.value || 0) > 0
    };

    var res = computeSip(params);
    var invPct = res.total > 0 ? (res.invested / res.total) * 100 : 100;

    var rowsHtml = res.schedule.map(function(row) {
      return (
        '<tr class="border-t border-[var(--oneora-border)]">' +
          '<td class="py-2 pr-2 font-extrabold">Yr ' + row.year + "</td>" +
          '<td class="py-2 px-2 text-right tabular-nums">' + esc(fmtINR(row.invested)) + "</td>" +
          '<td class="py-2 px-2 text-right tabular-nums text-[#115E42] dark:text-[#6EE7B7]">' + esc(fmtINR(row.gain)) + "</td>" +
          '<td class="py-2 pl-2 text-right font-extrabold tabular-nums">' + esc(fmtINR(row.value)) + "</td>" +
        "</tr>"
      );
    }).join("");

    box.innerHTML =
      '<div class="pastel-stage3-card p-5 space-y-4 animate-fade-in">' +
        '<div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">' +
          '<div class="rounded-[20px] p-3.5 bg-[#FFE7C2]/70 dark:bg-[#3D2E1D]">' +
            '<p class="text-[11px] font-extrabold text-[#7C3E00] dark:text-[#FDE68A]">Total Invested · মোট বিনিয়োগ</p>' +
            '<p class="text-lg font-extrabold tabular-nums mt-0.5 text-[#2B2236] dark:text-[#F5EEFF]">' + esc(fmtINR(res.invested)) + "</p>" +
          "</div>" +
          '<div class="rounded-[20px] p-3.5 bg-[#CFF3E2]/70 dark:bg-[#1B362E]">' +
            '<p class="text-[11px] font-extrabold text-[#115E42] dark:text-[#A7F3D0]">Est. Returns · আনুমানিক লাভ</p>' +
            '<p class="text-lg font-extrabold tabular-nums mt-0.5 text-[#0F5132] dark:text-[#6EE7B7]">' + esc(fmtINR(res.gain)) + "</p>" +
          "</div>" +
          '<div class="rounded-[20px] p-3.5 bg-[#E4D9FF]/80 dark:bg-[#2D2347]">' +
            '<p class="text-[11px] font-extrabold text-[#3E26A0] dark:text-[#D5C7FF]">Total Value · মোট সম্পদ</p>' +
            '<p class="text-lg font-extrabold tabular-nums mt-0.5 text-[#2B2236] dark:text-[#F5EEFF]">' + esc(fmtINR(res.total)) + "</p>" +
          "</div>" +
        "</div>" +
        (params.adjustInflation
          ? '<p class="text-xs font-extrabold text-[#804800] dark:text-[#FCD34D] bg-[#FFE7C2]/50 dark:bg-[#3D2E1D]/60 px-3.5 py-2 rounded-[16px]">Inflation-Adjusted Real Value (' + params.inflation + "%): " + esc(fmtINR(res.realValue)) + "</p>"
          : "") +
        renderSplitBar("Invested", invPct, "#5B3FD0", "Wealth Gain", 100 - invPct, "#15803D") +
        '<details class="pastel-inset-tile p-3.5">' +
          '<summary class="text-xs font-extrabold cursor-pointer select-none min-h-[36px] flex items-center justify-between">Year-by-Year Growth Schedule (' + res.years + " yrs)<span>▾</span></summary>" +
          '<div class="overflow-x-auto mt-2.5">' +
            '<table class="w-full text-[11px] font-semibold">' +
              '<thead><tr class="text-[#5C506B] dark:text-[#C5B9DA]">' +
                '<th class="text-left pb-1.5">Year</th><th class="text-right pb-1.5">Invested</th><th class="text-right pb-1.5">Gain</th><th class="text-right pb-1.5">Total</th>' +
              "</tr></thead>" +
              "<tbody>" + rowsHtml + "</tbody>" +
            "</table>" +
          "</div>" +
        "</details>" +
        renderResultActionsHtml("fcSip") +
      "</div>";

    var summaryLines = [
      "SIP + Lumpsum Wealth Estimate (" + res.years + " Years @ " + params.rate + "% p.a.)",
      "Monthly SIP: " + fmtINR(params.monthly) + (params.stepUp > 0 ? " (Step-Up " + params.stepUp + "%/yr)" : ""),
      "Lumpsum: " + fmtINR(params.lumpsum),
      "Total Invested: " + fmtINR(res.invested),
      "Estimated Returns: " + fmtINR(res.gain),
      "Final Corpus Value: " + fmtINR(res.total)
    ];
    if (params.adjustInflation) summaryLines.push("Inflation-Adjusted (" + params.inflation + "%): " + fmtINR(res.realValue));

    bindResultActions(root, "fcSip", {
      calcId: "sip",
      title: "SIP + Lumpsum Plan",
      headline: "Total Value: " + fmtINR(res.total) + " (Gain: " + fmtINR(res.gain) + ")",
      copyText: summaryLines.join("\n"),
      pdfLines: summaryLines
    });
  }

  function runGoldCalculation(root) {
    var box = root.querySelector("#fcGoldResultBox");
    if (!box) return;
    var purity = (root.querySelector("#fcGoldPurity") || {}).value || "22K";
    var rateBasis = (root.querySelector("#fcGoldRateBasis") || {}).value || "10g";
    var rate = Number((root.querySelector("#fcGoldRate") || {}).value || 0);
    var grams = Number((root.querySelector("#fcGoldGrams") || {}).value || 0);
    var vori = Number((root.querySelector("#fcGoldVori") || {}).value || 0);
    var ana = Number((root.querySelector("#fcGoldAna") || {}).value || 0);
    var roti = Number((root.querySelector("#fcGoldRoti") || {}).value || 0);
    var makingMode = (root.querySelector("#fcGoldMakingMode") || {}).value || "pct";
    var making = Number((root.querySelector("#fcGoldMakingVal") || {}).value || 0);
    var gstPct = Number((root.querySelector("#fcGoldGst") || {}).value || 3);
    var exchangeAmt = Number((root.querySelector("#fcGoldExchange") || {}).value || 0);

    // Remember user's local gold rate offline
    if (rate > 0) {
      var st = loadStore();
      st.prefs.goldRate22k10g = rateBasis === "10g" ? rate : Math.round(rate * 10);
      saveStore(st);
    }

    var res = computeGold({
      rate: rate,
      rateBasis: rateBasis,
      unit: state.goldUnit,
      grams: grams,
      vori: vori,
      ana: ana,
      roti: roti,
      makingMode: makingMode,
      making: making,
      gstPct: gstPct,
      exchangeAmt: exchangeAmt
    });

    box.innerHTML =
      '<div class="pastel-stage3-card p-5 space-y-4 animate-fade-in">' +
        '<div class="rounded-[22px] p-4 bg-[#FFE7C2]/80 dark:bg-[#3D2E1D] flex flex-wrap items-center justify-between gap-2">' +
          '<div>' +
            '<p class="text-[11px] font-extrabold text-[#7C3E00] dark:text-[#FDE68A]">Final Payable · মোট দেয় টাকা (' + esc(purity) + ")</p>" +
            '<p class="text-2xl font-extrabold tabular-nums text-[#2B2236] dark:text-[#F5EEFF]">' + esc(fmtINR(res.netPayable)) + "</p>" +
          "</div>" +
          '<div class="text-right">' +
            '<p class="text-[11px] font-bold text-[#5C506B] dark:text-[#C5B9DA]">Net Weight: ' + res.grams + " g</p>" +
            '<p class="text-xs font-extrabold text-[#804800] dark:text-[#FCD34D] tabular-nums">Effective: ' + esc(fmtINR(res.effectivePerGram)) + " / g</p>" +
          "</div>" +
        "</div>" +

        '<div class="pastel-inset-tile p-4 space-y-2 text-xs font-semibold">' +
          '<div class="flex justify-between"><span>Base Gold Value (' + res.grams + "g × " + esc(fmtINR(res.ratePerGram)) + '/g)</span><strong class="tabular-nums">' + esc(fmtINR(res.baseGold)) + "</strong></div>" +
          '<div class="flex justify-between"><span>Making Charges · মজুরি</span><strong class="tabular-nums">' + esc(fmtINR(res.makingAmt)) + "</strong></div>" +
          '<div class="flex justify-between"><span>GST (' + gstPct + '%)</span><strong class="tabular-nums">' + esc(fmtINR(res.gstAmt)) + "</strong></div>" +
          (res.exchangeDed > 0
            ? '<div class="flex justify-between text-[#115E42] dark:text-[#6EE7B7]"><span>Old Gold Exchange Deduction</span><strong class="tabular-nums">-' + esc(fmtINR(res.exchangeDed)) + "</strong></div>"
            : "") +
          '<div class="flex justify-between pt-2 border-t border-[var(--oneora-border)] text-sm font-extrabold"><span>Net Payable · মোট</span><span class="tabular-nums">' + esc(fmtINR(res.netPayable)) + "</span></div>" +
        "</div>" +
        renderResultActionsHtml("fcGold") +
      "</div>";

    var lines = [
      "Gold Jewellery Price Estimate (" + purity + ")",
      "Weight: " + res.grams + " grams | Rate: " + fmtINR(res.ratePerGram) + "/g",
      "Base Gold Value: " + fmtINR(res.baseGold),
      "Making Charges: " + fmtINR(res.makingAmt),
      "GST (" + gstPct + "%): " + fmtINR(res.gstAmt),
      res.exchangeDed > 0 ? "Old Gold Deduction: -" + fmtINR(res.exchangeDed) : "Gross Total: " + fmtINR(res.grandTotal),
      "Net Payable: " + fmtINR(res.netPayable) + " (Effective " + fmtINR(res.effectivePerGram) + "/g)"
    ];

    bindResultActions(root, "fcGold", {
      calcId: "gold",
      title: "Gold Price Estimate",
      headline: "Payable: " + fmtINR(res.netPayable) + " (" + res.grams + " g · " + purity + ")",
      copyText: lines.join("\n"),
      pdfLines: lines
    });
  }

  function runEmiCalculation(root) {
    var box = root.querySelector("#fcEmiResultBox");
    if (!box) return;
    var principal = Number((root.querySelector("#fcEmiAmt") || {}).value || 0);
    var rate = Number((root.querySelector("#fcEmiRate") || {}).value || 0);
    var tenure = Number((root.querySelector("#fcEmiTenure") || {}).value || 1);
    var extraMonthly = Number((root.querySelector("#fcEmiPrepay") || {}).value || 0);

    var res = computeEmi({
      principal: principal,
      rate: rate,
      tenure: tenure,
      tenureUnit: state.emiTenureUnit,
      extraMonthly: extraMonthly
    });

    var pPct = res.totalPayment > 0 ? (res.principal / res.totalPayment) * 100 : 100;
    var rowsHtml = res.yearly.map(function(row) {
      return (
        '<tr class="border-t border-[var(--oneora-border)]">' +
          '<td class="py-2 pr-2 font-extrabold">Yr ' + row.year + "</td>" +
          '<td class="py-2 px-2 text-right tabular-nums">' + esc(fmtINR(row.principalPaid)) + "</td>" +
          '<td class="py-2 px-2 text-right tabular-nums text-[#8E1B3B] dark:text-[#FDA4AF]">' + esc(fmtINR(row.interestPaid)) + "</td>" +
          '<td class="py-2 pl-2 text-right font-extrabold tabular-nums">' + esc(fmtINR(row.balanceLeft)) + "</td>" +
        "</tr>"
      );
    }).join("");

    box.innerHTML =
      '<div class="pastel-stage3-card p-5 space-y-4 animate-fade-in">' +
        '<div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">' +
          '<div class="rounded-[20px] p-3.5 bg-[#E4D9FF]/80 dark:bg-[#2D2347]">' +
            '<p class="text-[11px] font-extrabold text-[#3E26A0] dark:text-[#D5C7FF]">Monthly EMI · মাসিক কিস্তি</p>' +
            '<p class="text-lg sm:text-xl font-extrabold tabular-nums mt-0.5 text-[#2B2236] dark:text-[#F5EEFF]">' + esc(fmtINR(res.emi)) + "</p>" +
          "</div>" +
          '<div class="rounded-[20px] p-3.5 bg-[#FFD6D6]/75 dark:bg-[#3D212B]">' +
            '<p class="text-[11px] font-extrabold text-[#8E1B3B] dark:text-[#FDA4AF]">Total Interest · মোট সুদ</p>' +
            '<p class="text-lg font-extrabold tabular-nums mt-0.5 text-[#881337] dark:text-[#FCA5A5]">' + esc(fmtINR(res.totalInterest)) + "</p>" +
          "</div>" +
          '<div class="rounded-[20px] p-3.5 bg-[#FFE7C2]/75 dark:bg-[#3D2E1D]">' +
            '<p class="text-[11px] font-extrabold text-[#7C3E00] dark:text-[#FDE68A]">Total Payment · মোট পরিশোধ</p>' +
            '<p class="text-lg font-extrabold tabular-nums mt-0.5 text-[#2B2236] dark:text-[#F5EEFF]">' + esc(fmtINR(res.totalPayment)) + "</p>" +
          "</div>" +
        "</div>" +
        (res.interestSaved > 0
          ? '<p class="text-xs font-extrabold text-[#115E42] dark:text-[#A7F3D0] bg-[#CFF3E2]/70 dark:bg-[#1B362E] px-3.5 py-2.5 rounded-[16px]">Prepayment saves ' + esc(fmtINR(res.interestSaved)) + " in interest &amp; finishes " + res.monthsSaved + " month(s) early!</p>"
          : "") +
        renderSplitBar("Principal", pPct, "#5B3FD0", "Interest", 100 - pPct, "#BE123C") +
        '<details class="pastel-inset-tile p-3.5">' +
          '<summary class="text-xs font-extrabold cursor-pointer select-none min-h-[36px] flex items-center justify-between">Yearly Amortization Schedule (' + res.yearly.length + " yrs)<span>▾</span></summary>" +
          '<div class="overflow-x-auto mt-2.5">' +
            '<table class="w-full text-[11px] font-semibold">' +
              '<thead><tr class="text-[#5C506B] dark:text-[#C5B9DA]">' +
                '<th class="text-left pb-1.5">Year</th><th class="text-right pb-1.5">Principal</th><th class="text-right pb-1.5">Interest</th><th class="text-right pb-1.5">Balance</th>' +
              "</tr></thead>" +
              "<tbody>" + rowsHtml + "</tbody>" +
            "</table>" +
          "</div>" +
        "</details>" +
        renderResultActionsHtml("fcEmi") +
      "</div>";

    var lines = [
      "Loan EMI Calculation (" + fmtINR(res.principal) + " @ " + rate + "% for " + res.months + " months)",
      "Monthly EMI: " + fmtINR(res.emi),
      "Total Interest Payable: " + fmtINR(res.totalInterest),
      "Total Payment (Principal + Interest): " + fmtINR(res.totalPayment)
    ];
    if (res.interestSaved > 0) lines.push("Prepayment Savings: " + fmtINR(res.interestSaved) + " (" + res.monthsSaved + " months saved)");

    bindResultActions(root, "fcEmi", {
      calcId: "emi",
      title: "Loan & EMI Breakdown",
      headline: "Monthly EMI: " + fmtINR(res.emi) + " | Total: " + fmtINR(res.totalPayment),
      copyText: lines.join("\n"),
      pdfLines: lines
    });
  }

  function runGstCalculation(root) {
    var box = root.querySelector("#fcGstResultBox");
    if (!box) return;

    if (state.gstSubMode === "gst") {
      var unitAmt = Math.max(0, Number((root.querySelector("#fcGstAmt") || {}).value || 0));
      var pct = Math.max(0, Number((root.querySelector("#fcGstPct") || {}).value || 0));
      var qty = Math.max(1, Number((root.querySelector("#fcGstQty") || {}).value || 1));
      var rawTotal = unitAmt * qty;

      var baseAmt = 0;
      var gstAmt = 0;
      var finalAmt = 0;
      if (state.gstDirection === "add") {
        baseAmt = rawTotal;
        gstAmt = rawTotal * pct / 100;
        finalAmt = baseAmt + gstAmt;
      } else {
        finalAmt = rawTotal;
        baseAmt = rawTotal / (1 + pct / 100);
        gstAmt = finalAmt - baseAmt;
      }

      var halfTax = gstAmt / 2;
      box.innerHTML =
        '<div class="pastel-stage3-card p-5 space-y-4 animate-fade-in">' +
          '<div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">' +
            '<div class="rounded-[20px] p-3.5 bg-[#FFE7C2]/70 dark:bg-[#3D2E1D]">' +
              '<p class="text-[11px] font-extrabold text-[#7C3E00] dark:text-[#FDE68A]">Base Amount · আসল মূল্য</p>' +
              '<p class="text-lg font-extrabold tabular-nums mt-0.5">' + esc(fmtINR(baseAmt, false, 2)) + "</p>" +
            "</div>" +
            '<div class="rounded-[20px] p-3.5 bg-[#E4D9FF]/80 dark:bg-[#2D2347]">' +
              '<p class="text-[11px] font-extrabold text-[#3E26A0] dark:text-[#D5C7FF]">Total GST (' + pct + "%)</p>" +
              '<p class="text-lg font-extrabold tabular-nums mt-0.5">' + esc(fmtINR(gstAmt, false, 2)) + "</p>" +
            "</div>" +
            '<div class="rounded-[20px] p-3.5 bg-[#CFF3E2]/75 dark:bg-[#1B362E]">' +
              '<p class="text-[11px] font-extrabold text-[#115E42] dark:text-[#A7F3D0]">Grand Total · মোট</p>' +
              '<p class="text-lg font-extrabold tabular-nums mt-0.5 text-[#0F5132] dark:text-[#6EE7B7]">' + esc(fmtINR(finalAmt, false, 2)) + "</p>" +
            "</div>" +
          "</div>" +
          '<div class="pastel-inset-tile p-4 space-y-1.5 text-xs font-semibold">' +
            (state.gstTaxType === "intra"
              ? '<div class="flex justify-between"><span>CGST (' + (pct / 2) + '%)</span><strong class="tabular-nums">' + esc(fmtINR(halfTax, false, 2)) + "</strong></div>" +
                '<div class="flex justify-between"><span>SGST (' + (pct / 2) + '%)</span><strong class="tabular-nums">' + esc(fmtINR(halfTax, false, 2)) + "</strong></div>"
              : '<div class="flex justify-between"><span>IGST (' + pct + '%)</span><strong class="tabular-nums">' + esc(fmtINR(gstAmt, false, 2)) + "</strong></div>") +
          "</div>" +
          renderResultActionsHtml("fcGst") +
        "</div>";

      var lines = [
        "GST Calculation (" + (state.gstDirection === "add" ? "Add GST" : "Remove GST") + " @ " + pct + "% × Qty " + qty + ")",
        "Base Amount: " + fmtINR(baseAmt, false, 2),
        state.gstTaxType === "intra"
          ? "CGST (" + (pct / 2) + "%): " + fmtINR(halfTax, false, 2) + " | SGST (" + (pct / 2) + "%): " + fmtINR(halfTax, false, 2)
          : "IGST (" + pct + "%): " + fmtINR(gstAmt, false, 2),
        "Total GST: " + fmtINR(gstAmt, false, 2),
        "Grand Total: " + fmtINR(finalAmt, false, 2)
      ];

      bindResultActions(root, "fcGst", {
        calcId: "gst",
        title: "GST Calculation",
        headline: "Grand Total: " + fmtINR(finalAmt, false, 2) + " (GST: " + fmtINR(gstAmt, false, 2) + ")",
        copyText: lines.join("\n"),
        pdfLines: lines
      });
      return;
    }

    // Discount Mode
    var mrp = Math.max(0, Number((root.querySelector("#fcDiscMrp") || {}).value || 0));
    var d1 = Math.max(0, Math.min(100, Number((root.querySelector("#fcDiscPct1") || {}).value || 0)));
    var d2 = Math.max(0, Math.min(100, Number((root.querySelector("#fcDiscPct2") || {}).value || 0)));
    var tax = Math.max(0, Number((root.querySelector("#fcDiscTax") || {}).value || 0));

    var afterD1 = mrp * (1 - d1 / 100);
    var afterD2 = afterD1 * (1 - d2 / 100);
    var totalSave = mrp - afterD2;
    var effPct = mrp > 0 ? (totalSave / mrp) * 100 : 0;
    var taxAmt = afterD2 * tax / 100;
    var finalPrice = afterD2 + taxAmt;

    box.innerHTML =
      '<div class="pastel-stage3-card p-5 space-y-4 animate-fade-in">' +
        '<div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">' +
          '<div class="rounded-[20px] p-3.5 bg-[#CFF3E2]/75 dark:bg-[#1B362E]">' +
            '<p class="text-[11px] font-extrabold text-[#115E42] dark:text-[#A7F3D0]">Final Price · চূড়ান্ত দাম</p>' +
            '<p class="text-lg font-extrabold tabular-nums mt-0.5 text-[#0F5132] dark:text-[#6EE7B7]">' + esc(fmtINR(finalPrice, false, 2)) + "</p>" +
          "</div>" +
          '<div class="rounded-[20px] p-3.5 bg-[#FFE7C2]/75 dark:bg-[#3D2E1D]">' +
            '<p class="text-[11px] font-extrabold text-[#7C3E00] dark:text-[#FDE68A]">You Save · মোট সাশ্রয়</p>' +
            '<p class="text-lg font-extrabold tabular-nums mt-0.5">' + esc(fmtINR(totalSave, false, 2)) + "</p>" +
          "</div>" +
          '<div class="rounded-[20px] p-3.5 bg-[#E4D9FF]/80 dark:bg-[#2D2347]">' +
            '<p class="text-[11px] font-extrabold text-[#3E26A0] dark:text-[#D5C7FF]">Effective Discount</p>' +
            '<p class="text-lg font-extrabold tabular-nums mt-0.5">' + effPct.toFixed(2) + "% OFF</p>" +
          "</div>" +
        "</div>" +
        (tax > 0 ? '<p class="text-xs font-bold text-[#5C506B] dark:text-[#C5B9DA]">Includes GST (' + tax + "%): " + esc(fmtINR(taxAmt, false, 2)) + "</p>" : "") +
        renderResultActionsHtml("fcDisc") +
      "</div>";

    var dLines = [
      "Discount Calculation (MRP " + fmtINR(mrp, false, 2) + ")",
      "Discount: " + d1 + "%" + (d2 > 0 ? " + Extra " + d2 + "% (Effective " + effPct.toFixed(2) + "%)" : ""),
      "Total Savings: " + fmtINR(totalSave, false, 2),
      tax > 0 ? "GST (" + tax + "%): " + fmtINR(taxAmt, false, 2) : "GST: Rs. 0",
      "Final Payable Price: " + fmtINR(finalPrice, false, 2)
    ];

    bindResultActions(root, "fcDisc", {
      calcId: "discount",
      title: "Discount Breakdown",
      headline: "Final Price: " + fmtINR(finalPrice, false, 2) + " (Saved " + fmtINR(totalSave, false, 2) + ")",
      copyText: dLines.join("\n"),
      pdfLines: dLines
    });
  }

  function runTradingCalculation(root) {
    var box = root.querySelector("#fcTradingResultBox");
    if (!box) return;

    if (state.tradingSubMode === "brokerage") {
      var seg = (root.querySelector("#fcTrSegment") || {}).value || "options_nse";
      var buy = Number((root.querySelector("#fcTrBuy") || {}).value || 0);
      var sell = Number((root.querySelector("#fcTrSell") || {}).value || 0);
      var qty = Math.max(1, Number((root.querySelector("#fcTrQty") || {}).value || 1));
      var flatBrokerage = Math.max(0, Number((root.querySelector("#fcTrBrok") || {}).value || 20));

      var st = loadStore();
      st.prefs.brokerageFlat = flatBrokerage;
      saveStore(st);

      var res = computeBrokerage({ segment: seg, buy: buy, sell: sell, qty: qty, flatBrokerage: flatBrokerage });
      var isProfit = res.netPnl >= 0;

      box.innerHTML =
        '<div class="pastel-stage3-card p-5 space-y-4 animate-fade-in">' +
          '<div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">' +
            '<div class="rounded-[20px] p-3.5 ' + (isProfit ? "bg-[#CFF3E2]/80 dark:bg-[#1B362E]" : "bg-[#FFD6D6]/80 dark:bg-[#3D212B]") + '">' +
              '<p class="text-[11px] font-extrabold ' + (isProfit ? "text-[#115E42] dark:text-[#A7F3D0]" : "text-[#8E1B3B] dark:text-[#FDA4AF]") + '">Net P&amp;L · নেট লাভ/ক্ষতি</p>' +
              '<p class="text-lg sm:text-xl font-extrabold tabular-nums mt-0.5">' + esc(fmtINR(res.netPnl, true, 2)) + "</p>" +
            "</div>" +
            '<div class="rounded-[20px] p-3.5 bg-[#FFE7C2]/75 dark:bg-[#3D2E1D]">' +
              '<p class="text-[11px] font-extrabold text-[#7C3E00] dark:text-[#FDE68A]">Total Charges · মোট চার্জ</p>' +
              '<p class="text-lg font-extrabold tabular-nums mt-0.5">' + esc(fmtINR(res.totalCharges, false, 2)) + "</p>" +
            "</div>" +
            '<div class="rounded-[20px] p-3.5 bg-[#E4D9FF]/80 dark:bg-[#2D2347]">' +
              '<p class="text-[11px] font-extrabold text-[#3E26A0] dark:text-[#D5C7FF]">Breakeven Points</p>' +
              '<p class="text-lg font-extrabold tabular-nums mt-0.5">+' + res.breakevenPts.toFixed(2) + " pts</p>" +
            "</div>" +
          "</div>" +

          '<div class="pastel-inset-tile p-4 space-y-1.5 text-xs font-semibold">' +
            '<div class="flex justify-between"><span>Turnover</span><strong class="tabular-nums">' + esc(fmtINR(res.turnover, false, 2)) + "</strong></div>" +
            '<div class="flex justify-between"><span>Gross P&amp;L</span><strong class="tabular-nums">' + esc(fmtINR(res.grossPnl, true, 2)) + "</strong></div>" +
            '<div class="flex justify-between"><span>Brokerage</span><strong class="tabular-nums">' + esc(fmtINR(res.brokerage, false, 2)) + "</strong></div>" +
            '<div class="flex justify-between"><span>STT (Securities Transaction Tax)</span><strong class="tabular-nums">' + esc(fmtINR(res.stt, false, 2)) + "</strong></div>" +
            '<div class="flex justify-between"><span>Exchange Txn + SEBI Fee</span><strong class="tabular-nums">' + esc(fmtINR(res.exchangeTxn + res.sebiFee, false, 2)) + "</strong></div>" +
            '<div class="flex justify-between"><span>Stamp Duty</span><strong class="tabular-nums">' + esc(fmtINR(res.stampDuty, false, 2)) + "</strong></div>" +
            '<div class="flex justify-between"><span>GST (18% on Brokerage &amp; Txn)</span><strong class="tabular-nums">' + esc(fmtINR(res.gst, false, 2)) + "</strong></div>" +
          "</div>" +
          renderResultActionsHtml("fcBrok") +
        "</div>";

      var lines = [
        "Option / Trading Brokerage Report (" + seg.toUpperCase() + ")",
        "Buy: " + fmtINR(buy, false, 2) + " | Sell: " + fmtINR(sell, false, 2) + " | Qty: " + qty,
        "Gross P&L: " + fmtINR(res.grossPnl, true, 2),
        "Total Charges: " + fmtINR(res.totalCharges, false, 2) + " (Brok " + fmtINR(res.brokerage, false, 2) + ", STT " + fmtINR(res.stt, false, 2) + ", GST " + fmtINR(res.gst, false, 2) + ")",
        "Breakeven Points: +" + res.breakevenPts.toFixed(2) + " pts",
        "Net P&L: " + fmtINR(res.netPnl, true, 2)
      ];

      bindResultActions(root, "fcBrok", {
        calcId: "brokerage",
        title: "Brokerage & Net P&L",
        headline: "Net P&L: " + fmtINR(res.netPnl, true, 2) + " (Charges: " + fmtINR(res.totalCharges, false, 2) + ")",
        copyText: lines.join("\n"),
        pdfLines: lines
      });
      return;
    }

    // Risk-Reward & Position Sizing
    var capital = Math.max(0, Number((root.querySelector("#fcRrCap") || {}).value || 0));
    var riskPct = Math.max(0.1, Number((root.querySelector("#fcRrRiskPct") || {}).value || 1));
    var entry = Math.max(0, Number((root.querySelector("#fcRrEntry") || {}).value || 0));
    var sl = Math.max(0, Number((root.querySelector("#fcRrSl") || {}).value || 0));
    var target = Math.max(0, Number((root.querySelector("#fcRrTarget") || {}).value || 0));
    var lotSize = Math.max(1, Math.round(Number((root.querySelector("#fcRrLot") || {}).value || 1)));

    var riskPerUnit = Math.abs(entry - sl);
    var rewardPerUnit = Math.abs(target - entry);
    var rrRatio = riskPerUnit > 0 ? rewardPerUnit / riskPerUnit : 0;
    var maxRiskAmt = capital * riskPct / 100;
    var rawQty = riskPerUnit > 0 ? Math.floor(maxRiskAmt / riskPerUnit) : 0;
    var safeLots = lotSize > 1 ? Math.floor(rawQty / lotSize) : rawQty;
    var safeQty = lotSize > 1 ? safeLots * lotSize : rawQty;
    var actualRisk = safeQty * riskPerUnit;
    var expectedProfit = safeQty * rewardPerUnit;
    var minWinRate = rrRatio > 0 ? (100 / (1 + rrRatio)) : 100;

    box.innerHTML =
      '<div class="pastel-stage3-card p-5 space-y-4 animate-fade-in">' +
        '<div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">' +
          '<div class="rounded-[20px] p-3.5 bg-[#E4D9FF]/80 dark:bg-[#2D2347]">' +
            '<p class="text-[11px] font-extrabold text-[#3E26A0] dark:text-[#D5C7FF]">Risk : Reward Ratio</p>' +
            '<p class="text-lg sm:text-xl font-extrabold tabular-nums mt-0.5">1 : ' + rrRatio.toFixed(2) + "</p>" +
          "</div>" +
          '<div class="rounded-[20px] p-3.5 bg-[#FFE7C2]/75 dark:bg-[#3D2E1D]">' +
            '<p class="text-[11px] font-extrabold text-[#7C3E00] dark:text-[#FDE68A]">Safe Position Size</p>' +
            '<p class="text-lg font-extrabold tabular-nums mt-0.5">' + (lotSize > 1 ? safeLots + " Lots (" + safeQty + " qty)" : safeQty + " Qty") + "</p>" +
          "</div>" +
          '<div class="rounded-[20px] p-3.5 bg-[#CFF3E2]/75 dark:bg-[#1B362E]">' +
            '<p class="text-[11px] font-extrabold text-[#115E42] dark:text-[#A7F3D0]">Target Profit · লাভ</p>' +
            '<p class="text-lg font-extrabold tabular-nums mt-0.5 text-[#0F5132] dark:text-[#6EE7B7]">+' + esc(fmtINR(expectedProfit)) + "</p>" +
          "</div>" +
        "</div>" +
        '<div class="pastel-inset-tile p-4 space-y-1.5 text-xs font-semibold">' +
          '<div class="flex justify-between"><span>Risk per Unit (Entry − SL)</span><strong class="tabular-nums">' + esc(fmtINR(riskPerUnit, false, 2)) + "</strong></div>" +
          '<div class="flex justify-between"><span>Reward per Unit (Target − Entry)</span><strong class="tabular-nums">' + esc(fmtINR(rewardPerUnit, false, 2)) + "</strong></div>" +
          '<div class="flex justify-between"><span>Actual Max Loss (' + riskPct + "% cap = " + esc(fmtINR(maxRiskAmt)) + ')</span><strong class="tabular-nums text-[#8E1B3B] dark:text-[#FDA4AF]">-' + esc(fmtINR(actualRisk)) + "</strong></div>" +
          '<div class="flex justify-between"><span>Win-Rate Needed to Break Even</span><strong class="tabular-nums">' + minWinRate.toFixed(1) + "%</strong></div>" +
        "</div>" +
        renderResultActionsHtml("fcRr") +
      "</div>";

    var rrLines = [
      "Scalping Risk-Reward & Position Size Plan",
      "Capital: " + fmtINR(capital) + " | Max Risk: " + riskPct + "% (" + fmtINR(maxRiskAmt) + ")",
      "Entry: " + fmtINR(entry, false, 2) + " | SL: " + fmtINR(sl, false, 2) + " | Target: " + fmtINR(target, false, 2),
      "Risk : Reward Ratio: 1 : " + rrRatio.toFixed(2) + " (Breakeven Win-Rate: " + minWinRate.toFixed(1) + "%)",
      "Safe Size: " + (lotSize > 1 ? safeLots + " lots (" + safeQty + " qty)" : safeQty + " qty"),
      "Max Loss: -" + fmtINR(actualRisk) + " | Target Profit: +" + fmtINR(expectedProfit)
    ];

    bindResultActions(root, "fcRr", {
      calcId: "risk_reward",
      title: "Risk-Reward Trade Plan",
      headline: "R:R 1:" + rrRatio.toFixed(2) + " | Safe Size: " + safeQty + " qty",
      copyText: rrLines.join("\n"),
      pdfLines: rrLines
    });
  }

  /* -------------------- Saved History Section -------------------- */

  function renderHistoryPanel(store) {
    if (!state.showHistory) return "";
    var list = store.history || [];
    if (!list.length) {
      return (
        '<div class="pastel-stage3-card p-6 text-center space-y-1.5">' +
          '<p class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">No saved calculations yet</p>' +
          '<p class="text-xs font-medium text-[#5C506B] dark:text-[#C5B9DA]">Tap <strong>Save · সেভ</strong> on any calculator result to keep it offline.</p>' +
        "</div>"
      );
    }
    return (
      '<div class="pastel-stage3-card p-4 sm:p-5 space-y-2.5">' +
        '<div class="flex items-center justify-between">' +
          '<h4 class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">Saved Calculations (' + list.length + ")</h4>" +
          '<button type="button" id="fcClearHistBtn" class="px-3 py-1.5 rounded-full bg-[#FFD6D6] dark:bg-[#3D212B] text-[#8E1B3B] dark:text-[#FDA4AF] text-xs font-extrabold min-h-[36px]">Clear All</button>' +
        "</div>" +
        '<div class="space-y-2">' +
          list.map(function(item) {
            return (
              '<div class="pastel-inset-tile p-3.5 flex items-center justify-between gap-2.5">' +
                '<div class="min-w-0 flex-1">' +
                  '<p class="text-xs font-extrabold text-[#2B2236] dark:text-[#F5EEFF] truncate">' + esc(item.title) + " · " + esc(item.dateKey) + "</p>" +
                  '<p class="text-xs font-semibold text-[#5C506B] dark:text-[#C5B9DA] truncate">' + esc(item.headline) + "</p>" +
                "</div>" +
                '<div class="flex items-center gap-1.5 shrink-0">' +
                  '<button type="button" data-fc-hist-copy="' + esc(item.id) + '" class="px-3 py-2 rounded-full bg-white dark:bg-[#221C2E] text-[#5B3FD0] dark:text-[#CBBBFF] text-xs font-extrabold min-h-[40px]">Copy</button>' +
                  '<button type="button" data-fc-hist-del="' + esc(item.id) + '" aria-label="Delete" class="w-10 h-10 rounded-full bg-[#FFD6D6]/80 dark:bg-[#3D212B] text-[#8E1B3B] dark:text-[#FDA4AF] text-xs font-extrabold">✕</button>' +
                "</div>" +
              "</div>"
            );
          }).join("") +
        "</div>" +
      "</div>"
    );
  }

  /* -------------------- Main Renderer -------------------- */

  function render(container, subCalc, opts) {
    var options = opts || {};
    var root = container || document.getElementById("oneoraFinCalcRoot");
    if (!root) return;

    if (subCalc && CALC_TABS.some(function(t) { return t.id === subCalc; })) {
      state.activeCalc = subCalc;
    }

    var store = loadStore();
    var isEmbedded = Boolean(options.embedded);

    var headerHtml = isEmbedded
      ? '<div class="pastel-stage3-card p-4 flex flex-wrap items-center justify-between gap-2">' +
          '<div class="flex items-center gap-1.5 overflow-x-auto hide-scrollbar">' +
            CALC_TABS.map(function(t) {
              return '<button type="button" data-fc-tab="' + t.id + '" class="pastel-pill-tab ' + (state.activeCalc === t.id ? "is-active" : "") + '">' + esc(t.label) + "</button>";
            }).join("") +
          "</div>" +
          '<button type="button" id="fcToggleHistBtn" class="px-3.5 py-2 rounded-full bg-[var(--oneora-bg)] text-xs font-extrabold min-h-[44px]">' +
            (state.showHistory ? "Hide Saved" : "Saved (" + store.history.length + ")") +
          "</button>" +
        "</div>"
      : '<div class="pastel-cat-header p-5 sm:p-6 space-y-4">' +
          '<div class="flex flex-wrap items-start justify-between gap-3">' +
            '<div class="flex items-start gap-3.5">' +
              '<div class="pastel-icon-tile !w-12 !h-12 !rounded-2xl shrink-0">' +
                '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8" y2="10.01"/><line x1="12" y1="10" x2="12" y2="10.01"/><line x1="16" y1="10" x2="16" y2="10.01"/><line x1="8" y1="14" x2="8" y2="14.01"/><line x1="12" y1="14" x2="12" y2="14.01"/><line x1="16" y1="14" x2="16" y2="14.01"/><line x1="8" y1="18" x2="16" y2="18"/></svg>' +
              "</div>" +
              '<div>' +
                '<p class="text-[11px] font-extrabold uppercase tracking-wider text-[#804800] dark:text-[#FCD34D]">Life &amp; Money · 100% Offline</p>' +
                '<h2 class="text-2xl sm:text-[28px] font-extrabold tracking-tight text-[#2B2236] dark:text-[#F5EEFF] leading-tight">Finance Calculators · আর্থিক ক্যালকুলেটর</h2>' +
              "</div>" +
            "</div>" +
            '<button type="button" id="fcToggleHistBtn" class="px-4 py-2 rounded-full bg-white/90 dark:bg-[#17131F]/80 text-[#2B2236] dark:text-[#F5EEFF] border border-black/5 dark:border-white/10 text-xs font-extrabold min-h-[44px]">' +
              (state.showHistory ? "Hide Saved" : "Saved (" + store.history.length + ")") +
            "</button>" +
          "</div>" +
          '<div class="flex items-center gap-2 overflow-x-auto hide-scrollbar pt-1">' +
            CALC_TABS.map(function(t) {
              return '<button type="button" data-fc-tab="' + t.id + '" class="pastel-pill-tab ' + (state.activeCalc === t.id ? "is-active" : "") + '">' + esc(t.label) + " · " + esc(t.bn) + "</button>";
            }).join("") +
          "</div>" +
        "</div>";

    var panelHtml = "";
    if (state.activeCalc === "sip") panelHtml = renderSipPanel();
    else if (state.activeCalc === "gold") panelHtml = renderGoldPanel(store);
    else if (state.activeCalc === "emi") panelHtml = renderEmiPanel();
    else if (state.activeCalc === "gst") panelHtml = renderGstPanel();
    else panelHtml = renderTradingPanel(store);

    root.innerHTML =
      '<div class="space-y-4" data-pastel-cat="lifemoney">' +
        headerHtml +
        renderHistoryPanel(store) +
        panelHtml +
      "</div>";

    bindEvents(root, options);

    // Auto-compute initial preview for instant delight
    if (state.activeCalc === "sip") runSipCalculation(root);
    else if (state.activeCalc === "gold") runGoldCalculation(root);
    else if (state.activeCalc === "emi") runEmiCalculation(root);
    else if (state.activeCalc === "gst") runGstCalculation(root);
    else runTradingCalculation(root);
  }

  function bindEvents(root, options) {
    root.querySelectorAll("[data-fc-tab]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        state.activeCalc = btn.getAttribute("data-fc-tab") || "sip";
        haptic(6);
        render(root, null, options);
      });
    });

    var histBtn = root.querySelector("#fcToggleHistBtn");
    if (histBtn) {
      histBtn.addEventListener("click", function() {
        state.showHistory = !state.showHistory;
        render(root, null, options);
      });
    }

    var clearHistBtn = root.querySelector("#fcClearHistBtn");
    if (clearHistBtn) {
      clearHistBtn.addEventListener("click", function() {
        var st = loadStore();
        st.history = [];
        saveStore(st);
        notifyToast("History Cleared", "Saved calculations removed.", "info");
        render(root, null, options);
      });
    }

    root.querySelectorAll("[data-fc-hist-copy]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var id = btn.getAttribute("data-fc-hist-copy");
        var found = loadStore().history.find(function(x) { return x.id === id; });
        if (found) copyPlainText(found.copyText);
      });
    });

    root.querySelectorAll("[data-fc-hist-del]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var id = btn.getAttribute("data-fc-hist-del");
        var st = loadStore();
        st.history = st.history.filter(function(x) { return x.id !== id; });
        saveStore(st);
        render(root, null, options);
      });
    });

    // SIP events
    root.querySelectorAll("[data-fc-sip-mode]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        state.sipMode = btn.getAttribute("data-fc-sip-mode") || "combined";
        render(root, null, options);
      });
    });
    var sipBtn = root.querySelector("#fcSipCalcBtn");
    if (sipBtn) sipBtn.addEventListener("click", function() { haptic(8); runSipCalculation(root); });

    // Gold events
    root.querySelectorAll("[data-fc-gold-unit]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        state.goldUnit = btn.getAttribute("data-fc-gold-unit") || "gram";
        render(root, null, options);
      });
    });
    var gBasis = root.querySelector("#fcGoldRateBasis");
    if (gBasis) {
      gBasis.addEventListener("change", function() {
        state.goldRateBasis = gBasis.value || "10g";
        render(root, null, options);
      });
    }
    var gMaking = root.querySelector("#fcGoldMakingMode");
    if (gMaking) {
      gMaking.addEventListener("change", function() {
        state.goldMakingMode = gMaking.value || "pct";
        render(root, null, options);
      });
    }
    var goldBtn = root.querySelector("#fcGoldCalcBtn");
    if (goldBtn) goldBtn.addEventListener("click", function() { haptic(8); runGoldCalculation(root); });

    // EMI events
    root.querySelectorAll("[data-fc-emi-unit]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        state.emiTenureUnit = btn.getAttribute("data-fc-emi-unit") || "years";
        render(root, null, options);
      });
    });
    root.querySelectorAll("[data-fc-emi-preset]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var amtEl = root.querySelector("#fcEmiAmt");
        if (amtEl) amtEl.value = btn.getAttribute("data-fc-emi-preset");
        runEmiCalculation(root);
      });
    });
    var emiBtn = root.querySelector("#fcEmiCalcBtn");
    if (emiBtn) emiBtn.addEventListener("click", function() { haptic(8); runEmiCalculation(root); });

    // GST & Discount events
    root.querySelectorAll("[data-fc-gst-sub]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        state.gstSubMode = btn.getAttribute("data-fc-gst-sub") || "gst";
        render(root, null, options);
      });
    });
    root.querySelectorAll("[data-fc-gst-dir]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        state.gstDirection = btn.getAttribute("data-fc-gst-dir") || "add";
        render(root, null, options);
      });
    });
    root.querySelectorAll("[data-fc-gst-tax]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        state.gstTaxType = btn.getAttribute("data-fc-gst-tax") || "intra";
        render(root, null, options);
      });
    });
    root.querySelectorAll("[data-fc-gst-slab]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var pctEl = root.querySelector("#fcGstPct");
        if (pctEl) pctEl.value = btn.getAttribute("data-fc-gst-slab");
        runGstCalculation(root);
      });
    });
    var gstBtn = root.querySelector("#fcGstCalcBtn");
    if (gstBtn) gstBtn.addEventListener("click", function() { haptic(8); runGstCalculation(root); });
    var discBtn = root.querySelector("#fcDiscCalcBtn");
    if (discBtn) discBtn.addEventListener("click", function() { haptic(8); runGstCalculation(root); });

    // Trading events
    root.querySelectorAll("[data-fc-tr-sub]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        state.tradingSubMode = btn.getAttribute("data-fc-tr-sub") || "brokerage";
        render(root, null, options);
      });
    });
    root.querySelectorAll("[data-fc-lot-preset]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var qEl = root.querySelector("#fcTrQty");
        if (qEl) qEl.value = btn.getAttribute("data-fc-lot-preset");
        runTradingCalculation(root);
      });
    });
    var trBtn = root.querySelector("#fcTrBrokCalcBtn");
    if (trBtn) trBtn.addEventListener("click", function() { haptic(8); runTradingCalculation(root); });
    var rrBtn = root.querySelector("#fcRrCalcBtn");
    if (rrBtn) rrBtn.addEventListener("click", function() { haptic(8); runTradingCalculation(root); });
  }

  global.OneoraFinCalc = {
    render: render,
    open: function(calcId) {
      if (calcId) state.activeCalc = calcId;
      if (typeof global.openPdfBondhuTool === "function") {
        global.openPdfBondhuTool("oneoraFinCalcTool", { sub: state.activeCalc });
      } else {
        render(null, state.activeCalc);
      }
    }
  };
})(window);
