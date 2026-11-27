(function(global) {
  "use strict";

  var STORE_KEY = "oneora_khata_v1";
  var PIN_KEY = "oneora_khata_pin_v1";
  var MODAL_HOST_ID = "oneoraKhataModalHost";
  var FAB_ID = "oneoraKhataFab";
  var UNDO_BAR_ID = "oneoraKhataUndoBar";

  var state = {
    view: "home", // "home" | "ledger"
    selectedPartyId: null,
    search: "",
    sort: "recent", // "recent" | "highest" | "name"
    filter: "all", // "all" | "pending" | "receive" | "pay"
    pinUnlocked: false,
    pinBuffer: "",
    pinError: "",
    undoAction: null,
    undoTimer: null,
    lastGeneratedFile: null
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
    return (prefix || "kh") + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7);
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

  function daysAgoKey(days) {
    var d = new Date(Date.now() - days * 86400000);
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1);
    var day = String(d.getDate());
    if (m.length < 2) m = "0" + m;
    if (day.length < 2) day = "0" + day;
    return y + "-" + m + "-" + day;
  }

  function formatIndianDigits(num) {
    var absVal = Math.abs(Number(num) || 0);
    var rounded = Math.round(absVal * 100) / 100;
    try {
      return rounded.toLocaleString("en-IN", {
        minimumFractionDigits: rounded % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2
      });
    } catch (e) {
      var parts = rounded.toFixed(rounded % 1 === 0 ? 0 : 2).split(".");
      var intPart = parts[0];
      if (intPart.length > 3) {
        var lastThree = intPart.slice(-3);
        var rest = intPart.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
        intPart = rest + "," + lastThree;
      }
      return parts.length > 1 ? intPart + "." + parts[1] : intPart;
    }
  }

  function formatINR(num, showSign) {
    var n = Number(num) || 0;
    var prefix = n < 0 ? "-₹ " : (showSign && n > 0 ? "+₹ " : "₹ ");
    return prefix + formatIndianDigits(n);
  }

  function formatRsAscii(num) {
    var n = Number(num) || 0;
    return (n < 0 ? "-Rs. " : "Rs. ") + formatIndianDigits(n);
  }

  function formatDateDisplay(dateKey) {
    if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return String(dateKey || "");
    var parts = dateKey.split("-");
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    try {
      return d.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    } catch (e) {
      return dateKey;
    }
  }

  function getInitials(name) {
    var clean = String(name || "").trim();
    if (!clean) return "KH";
    var words = clean.split(/\s+/);
    if (words.length >= 2) {
      return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  }

  function normalizePhoneForWhatsApp(phone) {
    var digits = String(phone || "").replace(/\D+/g, "");
    if (!digits) return "";
    if (digits.length === 10) return "91" + digits;
    if (digits.length === 11 && digits.charAt(0) === "0") return "91" + digits.slice(1);
    return digits;
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

  // Phonetic Bengali -> ASCII fallback for PDF-Lib StandardFonts WinAnsi safety
  var BN_MAP = {
    "অ": "o", "আ": "a", "ই": "i", "ঈ": "i", "উ": "u", "ঊ": "u", "ঋ": "ri",
    "এ": "e", "ঐ": "oi", "ও": "o", "ঔ": "ou",
    "ক": "k", "খ": "kh", "গ": "g", "ঘ": "gh", "ঙ": "ng",
    "চ": "ch", "ছ": "chh", "জ": "j", "ঝ": "jh", "ঞ": "n",
    "ট": "t", "ঠ": "th", "ড": "d", "ঢ": "dh", "ণ": "n",
    "ত": "t", "থ": "th", "দ": "d", "ধ": "dh", "ন": "n",
    "প": "p", "ফ": "ph", "ব": "b", "ভ": "bh", "ম": "m",
    "য": "j", "র": "r", "ল": "l", "শ": "sh", "ষ": "sh", "স": "s", "হ": "h",
    "ড়": "r", "ঢ়": "rh", "য়": "y", "ৎ": "t", "ং": "ng", "ঃ": "h", "ঁ": "",
    "া": "a", "ি": "i", "ী": "i", "ু": "u", "ূ": "u", "ৃ": "ri",
    "ে": "e", "ৈ": "oi", "ো": "o", "ৌ": "ou", "্": "",
    "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
    "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9", "।": "."
  };

  function toPdfSafeText(str) {
    var input = String(str == null ? "" : str);
    var out = "";
    for (var i = 0; i < input.length; i++) {
      var ch = input.charAt(i);
      var code = input.charCodeAt(i);
      if (code >= 32 && code <= 126) {
        out += ch;
      } else if (ch === "₹") {
        out += "Rs.";
      } else if (BN_MAP[ch] !== undefined) {
        out += BN_MAP[ch];
      } else if (code === 10 || code === 13 || code === 9) {
        out += " ";
      }
    }
    out = out.replace(/\s+/g, " ").trim();
    return out || "-";
  }

  /* -------------------- Storage (IndexedDB via OneoraDB + localStorage) -------------------- */

  function defaultData() {
    return {
      version: 1,
      parties: [],
      entries: [],
      updatedAtMs: Date.now()
    };
  }

  function loadData() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return defaultData();
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return defaultData();
      return {
        version: 1,
        parties: Array.isArray(parsed.parties) ? parsed.parties : [],
        entries: Array.isArray(parsed.entries) ? parsed.entries : [],
        updatedAtMs: Number(parsed.updatedAtMs || Date.now())
      };
    } catch (e) {
      return defaultData();
    }
  }

  function saveData(data) {
    var payload = {
      version: 1,
      parties: Array.isArray(data.parties) ? data.parties : [],
      entries: Array.isArray(data.entries) ? data.entries : [],
      updatedAtMs: Date.now()
    };
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(payload));
    } catch (e) {
      notifyToast("Storage Full", "Could not save Khata locally. Please free some storage.", "error");
    }
    if (global.OneoraDB && typeof global.OneoraDB.syncKeyToIndexedDb === "function") {
      global.OneoraDB.syncKeyToIndexedDb(STORE_KEY).catch(function() {});
    }
    try {
      document.dispatchEvent(new CustomEvent("oneora:khatachange"));
      document.dispatchEvent(new CustomEvent("oneora:moneychange"));
    } catch (e) {}
    return payload;
  }

  /* -------------------- Secure PIN Hashing (Zero Plaintext) -------------------- */

  function loadPinMeta() {
    try {
      var raw = localStorage.getItem(PIN_KEY);
      if (!raw) return { enabled: false, hash: "", salt: "" };
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.enabled || !parsed.hash) return { enabled: false, hash: "", salt: "" };
      return {
        enabled: true,
        hash: String(parsed.hash),
        salt: String(parsed.salt || "oneora_khata_v1"),
        updatedAtMs: Number(parsed.updatedAtMs || Date.now())
      };
    } catch (e) {
      return { enabled: false, hash: "", salt: "" };
    }
  }

  function savePinMeta(meta) {
    try {
      if (!meta || !meta.enabled) {
        localStorage.setItem(PIN_KEY, JSON.stringify({ enabled: false, hash: "", salt: "", updatedAtMs: Date.now() }));
      } else {
        localStorage.setItem(PIN_KEY, JSON.stringify({
          enabled: true,
          hash: meta.hash,
          salt: meta.salt,
          updatedAtMs: Date.now()
        }));
      }
    } catch (e) {}
    if (global.OneoraDB && typeof global.OneoraDB.syncKeyToIndexedDb === "function") {
      global.OneoraDB.syncKeyToIndexedDb(PIN_KEY).catch(function() {});
    }
  }

  // Fallback pure-JS hash for non-HTTPS WebViews where crypto.subtle may be unavailable
  function fallbackHashHex(str) {
    var h1 = 0xdeadbeef ^ str.length;
    var h2 = 0x41c6ce57 ^ str.length;
    for (var i = 0; i < str.length; i++) {
      var ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return ("00000000" + (h2 >>> 0).toString(16)).slice(-8) + ("00000000" + (h1 >>> 0).toString(16)).slice(-8);
  }

  async function hashPin(pin, salt) {
    var payload = String(salt || "oneora_khata_v1") + "::" + String(pin || "");
    try {
      if (global.crypto && global.crypto.subtle && typeof TextEncoder !== "undefined") {
        var bytes = new TextEncoder().encode(payload);
        var buf = await global.crypto.subtle.digest("SHA-256", bytes);
        var arr = new Uint8Array(buf);
        var hex = "";
        for (var i = 0; i < arr.length; i++) {
          var b = arr[i].toString(16);
          hex += b.length < 2 ? "0" + b : b;
        }
        return "sha256:" + hex;
      }
    } catch (e) {}
    return "fb:" + fallbackHashHex(payload);
  }

  function isLocked() {
    var meta = loadPinMeta();
    return meta.enabled && !state.pinUnlocked;
  }

  /* -------------------- Ledger Computations -------------------- */

  function computePartyStats(data) {
    var entriesByParty = {};
    var i;
    for (i = 0; i < data.entries.length; i++) {
      var e = data.entries[i];
      if (!entriesByParty[e.partyId]) entriesByParty[e.partyId] = [];
      entriesByParty[e.partyId].push(e);
    }

    var toReceive = 0;
    var toPay = 0;
    var partyList = [];

    for (i = 0; i < data.parties.length; i++) {
      var p = data.parties[i];
      var list = entriesByParty[p.id] || [];
      var totalGave = 0;
      var totalGot = 0;
      var lastActivityMs = Number(p.updatedAtMs || p.createdAtMs || 0);
      var lastDateKey = "";

      for (var j = 0; j < list.length; j++) {
        var ent = list[j];
        var amt = Number(ent.amount || 0);
        if (ent.type === "gave") totalGave += amt;
        else totalGot += amt;
        var ts = Number(ent.updatedAtMs || ent.createdAtMs || 0);
        if (ts > lastActivityMs) lastActivityMs = ts;
        if (ent.dateKey && (!lastDateKey || ent.dateKey > lastDateKey)) lastDateKey = ent.dateKey;
      }

      var balance = Math.round((totalGave - totalGot) * 100) / 100;
      if (balance > 0) toReceive += balance;
      else if (balance < 0) toPay += Math.abs(balance);

      partyList.push({
        id: p.id,
        name: p.name,
        phone: p.phone || "",
        note: p.note || "",
        createdAtMs: p.createdAtMs,
        updatedAtMs: p.updatedAtMs,
        entryCount: list.length,
        totalGave: Math.round(totalGave * 100) / 100,
        totalGot: Math.round(totalGot * 100) / 100,
        balance: balance,
        lastActivityMs: lastActivityMs,
        lastDateKey: lastDateKey
      });
    }

    return {
      toReceive: Math.round(toReceive * 100) / 100,
      toPay: Math.round(toPay * 100) / 100,
      net: Math.round((toReceive - toPay) * 100) / 100,
      parties: partyList
    };
  }

  function getPartyRunningLedger(data, partyId, fromDate, toDate) {
    var raw = data.entries.filter(function(e) {
      return e.partyId === partyId;
    });
    // Sort chronologically ascending for accurate running balance
    raw.sort(function(a, b) {
      if (a.dateKey !== b.dateKey) return a.dateKey < b.dateKey ? -1 : 1;
      return Number(a.createdAtMs || 0) - Number(b.createdAtMs || 0);
    });

    var running = 0;
    var openingBalance = 0;
    var periodGave = 0;
    var periodGot = 0;
    var rows = [];

    for (var i = 0; i < raw.length; i++) {
      var ent = raw[i];
      var amt = Number(ent.amount || 0);
      var delta = ent.type === "gave" ? amt : -amt;
      running = Math.round((running + delta) * 100) / 100;

      if (fromDate && ent.dateKey < fromDate) {
        openingBalance = running;
        continue;
      }
      if (toDate && ent.dateKey > toDate) {
        continue;
      }
      if (ent.type === "gave") periodGave += amt;
      else periodGot += amt;

      rows.push({
        id: ent.id,
        partyId: ent.partyId,
        type: ent.type,
        amount: amt,
        dateKey: ent.dateKey,
        note: ent.note || "",
        createdAtMs: ent.createdAtMs,
        updatedAtMs: ent.updatedAtMs,
        runningBalance: running
      });
    }

    return {
      openingBalance: Math.round(openingBalance * 100) / 100,
      closingBalance: rows.length ? rows[rows.length - 1].runningBalance : openingBalance,
      totalGave: Math.round(periodGave * 100) / 100,
      totalGot: Math.round(periodGot * 100) / 100,
      rows: rows
    };
  }

  function groupRowsByDateDesc(rows) {
    var groupsMap = {};
    var dateOrder = [];
    for (var i = rows.length - 1; i >= 0; i--) {
      var r = rows[i];
      var dk = r.dateKey || todayKey();
      if (!groupsMap[dk]) {
        groupsMap[dk] = [];
        dateOrder.push(dk);
      }
      groupsMap[dk].push(r);
    }
    return dateOrder.map(function(dk) {
      return { dateKey: dk, label: formatDateDisplay(dk), items: groupsMap[dk] };
    });
  }

  /* -------------------- Undo Manager -------------------- */

  function registerUndo(label, prevSnapshot) {
    if (state.undoTimer) {
      clearTimeout(state.undoTimer);
      state.undoTimer = null;
    }
    state.undoAction = {
      label: label,
      snapshot: prevSnapshot
    };
    showUndoBar();
    state.undoTimer = setTimeout(function() {
      clearUndoBar();
    }, 7000);
  }

  function clearUndoBar() {
    if (state.undoTimer) {
      clearTimeout(state.undoTimer);
      state.undoTimer = null;
    }
    state.undoAction = null;
    var bar = document.getElementById(UNDO_BAR_ID);
    if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
  }

  function showUndoBar() {
    var existing = document.getElementById(UNDO_BAR_ID);
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
    if (!state.undoAction) return;

    var bar = document.createElement("div");
    bar.id = UNDO_BAR_ID;
    bar.className = "fixed left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-[95] rounded-[22px] px-4 py-3 bg-[#2B2236] dark:bg-[#E4D9FF] text-white dark:text-[#2B2236] shadow-2xl border border-white/15 flex items-center justify-between gap-3 animate-fade-in";
    bar.style.bottom = "86px";
    bar.innerHTML =
      '<span class="text-xs font-extrabold truncate">' + esc(state.undoAction.label) + "</span>" +
      '<div class="flex items-center gap-2 shrink-0">' +
      '<button type="button" id="khataUndoApplyBtn" class="px-3.5 py-2 rounded-full bg-[#FFE7C2] dark:bg-[#5B3FD0] text-[#2B2236] dark:text-white text-xs font-extrabold min-h-[38px]">Undo · ফিরিয়ে আনুন</button>' +
      '<button type="button" id="khataUndoDismissBtn" class="w-9 h-9 rounded-full bg-white/15 dark:bg-black/10 text-xs font-bold" aria-label="Dismiss">✕</button>' +
      "</div>";
    document.body.appendChild(bar);

    var applyBtn = document.getElementById("khataUndoApplyBtn");
    var dismissBtn = document.getElementById("khataUndoDismissBtn");
    if (applyBtn) {
      applyBtn.addEventListener("click", function() {
        if (!state.undoAction) return;
        saveData(state.undoAction.snapshot);
        haptic(12);
        clearUndoBar();
        notifyToast("Restored · পুনরুদ্ধার হয়েছে", "Previous Khata state restored.", "success");
        rerenderIfMounted();
      });
    }
    if (dismissBtn) {
      dismissBtn.addEventListener("click", clearUndoBar);
    }
  }

  /* -------------------- Floating Quick-Add Button -------------------- */

  function syncFab(isActive) {
    var existing = document.getElementById(FAB_ID);
    if (!isActive || isLocked()) {
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
      return;
    }
    if (!existing) {
      var btn = document.createElement("button");
      btn.id = FAB_ID;
      btn.type = "button";
      btn.setAttribute("aria-label", "Quick Add Khata Entry or Party");
      btn.className = "fixed z-[75] flex items-center gap-2 px-4 h-14 rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white shadow-xl border border-white/20 text-xs font-extrabold active:scale-95 transition";
      btn.style.right = "16px";
      btn.style.bottom = "84px";
      btn.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
        '<span>Quick Add</span>';
      btn.addEventListener("click", function() {
        haptic(10);
        if (state.view === "ledger" && state.selectedPartyId) {
          openEntryModal({ partyId: state.selectedPartyId, type: "gave" });
        } else {
          openQuickAddModal();
        }
      });
      document.body.appendChild(btn);
    }
  }

  /* -------------------- Modal Host -------------------- */

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

  function showSheet(title, subtitle, bodyHtml) {
    var host = getModalHost();
    host.innerHTML =
      '<div class="fixed inset-0 z-[112] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">' +
        '<div id="khataModalBackdrop" class="absolute inset-0 bg-[#2B2236]/55 dark:bg-black/75"></div>' +
        '<div class="relative z-10 w-full max-w-lg bg-white dark:bg-[#221C2E] text-[#2B2236] dark:text-[#F5EEFF] rounded-t-[30px] sm:rounded-[30px] border border-[var(--oneora-border)] p-5 sm:p-6 shadow-2xl space-y-4 max-h-[88vh] overflow-y-auto animate-fade-in" style="padding-bottom: max(1.5rem, env(safe-area-inset-bottom));">' +
          '<div class="flex items-start justify-between gap-3">' +
            '<div class="min-w-0">' +
              (subtitle ? '<p class="text-[11px] font-extrabold uppercase tracking-wider text-[#804800] dark:text-[#FCD34D]">' + esc(subtitle) + "</p>" : "") +
              '<h3 class="text-lg font-extrabold leading-snug">' + esc(title) + "</h3>" +
            "</div>" +
            '<button type="button" id="khataModalCloseBtn" aria-label="Close" class="w-11 h-11 rounded-full bg-[var(--oneora-bg)] font-extrabold inline-flex items-center justify-center shrink-0">✕</button>' +
          "</div>" +
          bodyHtml +
        "</div>" +
      "</div>";

    var bd = document.getElementById("khataModalBackdrop");
    var cb = document.getElementById("khataModalCloseBtn");
    if (bd) bd.addEventListener("click", closeModal);
    if (cb) cb.addEventListener("click", closeModal);
    return host;
  }

  /* -------------------- Modals: Quick Add, Party, Entry, Reminder, Reports, Backup, PIN -------------------- */

  function openQuickAddModal() {
    var data = loadData();
    var hasParties = data.parties.length > 0;
    var body =
      '<div class="grid grid-cols-1 gap-2.5">' +
        (hasParties
          ? '<button type="button" id="khQuickGaveBtn" class="w-full p-4 rounded-[22px] bg-[#CFF3E2] dark:bg-[#1B362E] text-[#115E42] dark:text-[#A7F3D0] text-left flex items-center justify-between min-h-[56px] font-extrabold">' +
              '<div><p class="text-sm font-extrabold">You gave · দিলাম (বাকি)</p><p class="text-[11px] opacity-85 font-semibold">Record credit given to a party</p></div>' +
              '<span class="text-lg">→</span>' +
            "</button>" +
            '<button type="button" id="khQuickGotBtn" class="w-full p-4 rounded-[22px] bg-[#FFD6D6] dark:bg-[#3D212B] text-[#8E1B3B] dark:text-[#FDA4AF] text-left flex items-center justify-between min-h-[56px] font-extrabold">' +
              '<div><p class="text-sm font-extrabold">You got · পেলাম (জমা)</p><p class="text-[11px] opacity-85 font-semibold">Record payment received from a party</p></div>' +
              '<span class="text-lg">→</span>' +
            "</button>"
          : "") +
        '<button type="button" id="khQuickNewPartyBtn" class="w-full p-4 rounded-[22px] bg-[#FFE7C2] dark:bg-[#3D2E1D] text-[#5C3400] dark:text-[#FDE68A] text-left flex items-center justify-between min-h-[56px] font-extrabold">' +
          '<div><p class="text-sm font-extrabold">Add New Party · নতুন পার্টি</p><p class="text-[11px] opacity-85 font-semibold">Customer or supplier with phone &amp; note</p></div>' +
          '<span class="text-lg">+</span>' +
        "</button>" +
      "</div>";

    showSheet("Quick Add · দ্রুত যোগ করুন", "Khata / Udhar", body);

    var gBtn = document.getElementById("khQuickGaveBtn");
    var gotBtn = document.getElementById("khQuickGotBtn");
    var pBtn = document.getElementById("khQuickNewPartyBtn");
    if (gBtn) gBtn.addEventListener("click", function() { openEntryModal({ type: "gave" }); });
    if (gotBtn) gotBtn.addEventListener("click", function() { openEntryModal({ type: "got" }); });
    if (pBtn) pBtn.addEventListener("click", function() { openPartyModal(null); });
  }

  function openPartyModal(existingParty) {
    var isEdit = Boolean(existingParty);
    var body =
      '<form id="khPartyForm" class="space-y-3">' +
        '<div>' +
          '<label for="khPartyName" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Party Name · পার্টির নাম *</label>' +
          '<input type="text" id="khPartyName" required maxlength="100" value="' + esc(isEdit ? existingParty.name : "") + '" placeholder="e.g. Rahim Store / রহিম স্টোর" class="pastel-pill-input w-full text-sm font-semibold" />' +
        "</div>" +
        '<div>' +
          '<label for="khPartyPhone" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Phone Number · ফোন নম্বর (WhatsApp / SMS)</label>' +
          '<input type="tel" id="khPartyPhone" maxlength="20" value="' + esc(isEdit ? existingParty.phone : "") + '" placeholder="e.g. 9876543210" class="pastel-pill-input w-full text-sm font-semibold tabular-nums" />' +
        "</div>" +
        '<div>' +
          '<label for="khPartyNote" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Note · নোট (Optional)</label>' +
          '<input type="text" id="khPartyNote" maxlength="200" value="' + esc(isEdit ? existingParty.note : "") + '" placeholder="e.g. Regular grocery customer, shop address" class="pastel-pill-input w-full text-xs font-semibold" />' +
        "</div>" +
        '<div class="flex items-center gap-2 pt-2">' +
          '<button type="submit" class="flex-1 py-3 rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white text-xs font-extrabold min-h-[48px] shadow-sm">' + (isEdit ? "Update Party · আপডেট" : "Save Party · সেভ করুন") + "</button>" +
          '<button type="button" id="khPartyCancelBtn" class="px-5 py-3 rounded-full bg-[var(--oneora-bg)] text-xs font-bold min-h-[48px]">Cancel</button>' +
        "</div>" +
      "</form>";

    showSheet(isEdit ? "Edit Party · পার্টি এডিট" : "Add Party · নতুন পার্টি", "Khata / Udhar", body);

    var cancelBtn = document.getElementById("khPartyCancelBtn");
    if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

    var form = document.getElementById("khPartyForm");
    if (form) {
      form.addEventListener("submit", function(ev) {
        ev.preventDefault();
        var name = String(document.getElementById("khPartyName").value || "").trim();
        var phone = String(document.getElementById("khPartyPhone").value || "").trim();
        var note = String(document.getElementById("khPartyNote").value || "").trim();
        if (!name) return;

        var data = loadData();
        if (isEdit) {
          var prev = JSON.parse(JSON.stringify(data));
          for (var i = 0; i < data.parties.length; i++) {
            if (data.parties[i].id === existingParty.id) {
              data.parties[i].name = name;
              data.parties[i].phone = phone;
              data.parties[i].note = note;
              data.parties[i].updatedAtMs = Date.now();
              break;
            }
          }
          saveData(data);
          registerUndo("Party updated (" + name + ")", prev);
          notifyToast("Party Updated", name + " details saved.", "success");
        } else {
          var newParty = {
            id: uid("pty"),
            name: name,
            phone: phone,
            note: note,
            createdAtMs: Date.now(),
            updatedAtMs: Date.now()
          };
          data.parties.push(newParty);
          saveData(data);
          state.view = "ledger";
          state.selectedPartyId = newParty.id;
          notifyToast("Party Added · পার্টি যোগ হয়েছে", name + " is ready for entries.", "success");
        }
        haptic(10);
        closeModal();
        rerenderIfMounted();
      });
    }
  }

  function openEntryModal(opts) {
    var options = opts || {};
    var data = loadData();
    if (!data.parties.length) {
      openPartyModal(null);
      return;
    }
    var existing = options.entry || null;
    var isEdit = Boolean(existing);
    var activeType = isEdit ? existing.type : (options.type || "gave");
    var partyId = isEdit ? existing.partyId : (options.partyId || state.selectedPartyId || data.parties[0].id);

    var partyOptionsHtml = data.parties.map(function(p) {
      var sel = p.id === partyId ? " selected" : "";
      return '<option value="' + esc(p.id) + '"' + sel + ">" + esc(p.name) + (p.phone ? " (" + esc(p.phone) + ")" : "") + "</option>";
    }).join("");

    var body =
      '<form id="khEntryForm" class="space-y-3.5">' +
        '<div>' +
          '<label for="khEntryParty" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Party · পার্টি</label>' +
          '<select id="khEntryParty" class="pastel-pill-input w-full text-sm font-bold">' +
            '<option value="" disabled>Select party...</option>' +
            partyOptionsHtml +
          "</select>" +
        "</div>" +
        '<div class="grid grid-cols-2 gap-2" role="group" aria-label="Entry Type">' +
          '<button type="button" id="khTypeGaveBtn" class="py-3 px-3 rounded-[20px] text-xs font-extrabold min-h-[48px] border-2 transition ' +
            (activeType === "gave"
              ? "bg-[#CFF3E2] dark:bg-[#1B362E] text-[#115E42] dark:text-[#A7F3D0] border-[#115E42] dark:border-[#6EE7B7]"
              : "bg-[var(--oneora-bg)] text-[#5C506B] dark:text-[#C5B9DA] border-transparent") +
            '">You gave · দিলাম</button>' +
          '<button type="button" id="khTypeGotBtn" class="py-3 px-3 rounded-[20px] text-xs font-extrabold min-h-[48px] border-2 transition ' +
            (activeType === "got"
              ? "bg-[#FFD6D6] dark:bg-[#3D212B] text-[#8E1B3B] dark:text-[#FDA4AF] border-[#8E1B3B] dark:border-[#FDA4AF]"
              : "bg-[var(--oneora-bg)] text-[#5C506B] dark:text-[#C5B9DA] border-transparent") +
            '">You got · পেলাম</button>' +
        "</div>" +
        '<input type="hidden" id="khEntryType" value="' + esc(activeType) + '" />' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">' +
          '<div>' +
            '<label for="khEntryAmount" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Amount (₹) · টাকা *</label>' +
            '<input type="number" id="khEntryAmount" step="0.01" min="0.01" required value="' + esc(isEdit ? existing.amount : "") + '" placeholder="0.00" class="pastel-pill-input w-full text-base font-extrabold tabular-nums" />' +
          "</div>" +
          '<div>' +
            '<label for="khEntryDate" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Date · তারিখ</label>' +
            '<input type="date" id="khEntryDate" required value="' + esc(isEdit ? existing.dateKey : todayKey()) + '" class="pastel-pill-input w-full text-xs font-bold tabular-nums" />' +
          "</div>" +
        "</div>" +
        '<div>' +
          '<label for="khEntryNote" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Note / Bill No · বিবরণ (Optional)</label>' +
          '<input type="text" id="khEntryNote" maxlength="220" value="' + esc(isEdit ? existing.note : "") + '" placeholder="e.g. Rice bag 25kg, Cash received, UPI..." class="pastel-pill-input w-full text-xs font-semibold" />' +
        "</div>" +
        '<div class="flex items-center gap-2 pt-2">' +
          '<button type="submit" class="flex-1 py-3 rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white text-xs font-extrabold min-h-[48px] shadow-sm">' + (isEdit ? "Update Entry · আপডেট" : "Save Entry · সেভ করুন") + "</button>" +
          '<button type="button" id="khEntryCancelBtn" class="px-5 py-3 rounded-full bg-[var(--oneora-bg)] text-xs font-bold min-h-[48px]">Cancel</button>' +
        "</div>" +
      "</form>";

    showSheet(isEdit ? "Edit Entry · হিসাব এডিট" : "New Khata Entry · নতুন হিসাব", "দিলাম / পেলাম", body);

    var typeInput = document.getElementById("khEntryType");
    var gaveBtn = document.getElementById("khTypeGaveBtn");
    var gotBtn = document.getElementById("khTypeGotBtn");

    function updateTypeButtons(t) {
      typeInput.value = t;
      if (t === "gave") {
        gaveBtn.className = "py-3 px-3 rounded-[20px] text-xs font-extrabold min-h-[48px] border-2 transition bg-[#CFF3E2] dark:bg-[#1B362E] text-[#115E42] dark:text-[#A7F3D0] border-[#115E42] dark:border-[#6EE7B7]";
        gotBtn.className = "py-3 px-3 rounded-[20px] text-xs font-extrabold min-h-[48px] border-2 transition bg-[var(--oneora-bg)] text-[#5C506B] dark:text-[#C5B9DA] border-transparent";
      } else {
        gotBtn.className = "py-3 px-3 rounded-[20px] text-xs font-extrabold min-h-[48px] border-2 transition bg-[#FFD6D6] dark:bg-[#3D212B] text-[#8E1B3B] dark:text-[#FDA4AF] border-[#8E1B3B] dark:border-[#FDA4AF]";
        gaveBtn.className = "py-3 px-3 rounded-[20px] text-xs font-extrabold min-h-[48px] border-2 transition bg-[var(--oneora-bg)] text-[#5C506B] dark:text-[#C5B9DA] border-transparent";
      }
    }

    if (gaveBtn) gaveBtn.addEventListener("click", function() { updateTypeButtons("gave"); });
    if (gotBtn) gotBtn.addEventListener("click", function() { updateTypeButtons("got"); });

    var cancelBtn = document.getElementById("khEntryCancelBtn");
    if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

    var form = document.getElementById("khEntryForm");
    if (form) {
      form.addEventListener("submit", function(ev) {
        ev.preventDefault();
        var selParty = String(document.getElementById("khEntryParty").value || "");
        var type = String(typeInput.value || "gave") === "got" ? "got" : "gave";
        var amount = Math.round(Number(document.getElementById("khEntryAmount").value || 0) * 100) / 100;
        var dateKey = String(document.getElementById("khEntryDate").value || todayKey());
        var note = String(document.getElementById("khEntryNote").value || "").trim();

        if (!selParty || !(amount > 0)) {
          notifyToast("Check Amount", "Please enter an amount greater than 0.", "error");
          return;
        }

        var latest = loadData();
        var prevSnapshot = JSON.parse(JSON.stringify(latest));

        if (isEdit) {
          for (var i = 0; i < latest.entries.length; i++) {
            if (latest.entries[i].id === existing.id) {
              latest.entries[i].partyId = selParty;
              latest.entries[i].type = type;
              latest.entries[i].amount = amount;
              latest.entries[i].dateKey = dateKey;
              latest.entries[i].note = note;
              latest.entries[i].updatedAtMs = Date.now();
              break;
            }
          }
          saveData(latest);
          registerUndo("Entry updated (" + formatINR(amount) + ")", prevSnapshot);
          notifyToast("Entry Updated", "Running balance recalculated.", "success");
        } else {
          latest.entries.push({
            id: uid("ent"),
            partyId: selParty,
            type: type,
            amount: amount,
            dateKey: dateKey,
            note: note,
            createdAtMs: Date.now(),
            updatedAtMs: Date.now()
          });
          saveData(latest);
          state.view = "ledger";
          state.selectedPartyId = selParty;
          notifyToast(
            type === "gave" ? "দিলাম · You Gave Saved" : "পেলাম · You Got Saved",
            formatINR(amount) + " recorded in Khata.",
            "success"
          );
        }

        haptic(10);
        closeModal();
        rerenderIfMounted();
      });
    }
  }

  function confirmDeleteParty(party) {
    var body =
      '<div class="space-y-4">' +
        '<p class="text-sm font-semibold text-[#5C506B] dark:text-[#C5B9DA]">Delete <strong>' + esc(party.name) + "</strong> and all " + party.entryCount + " entry(ies)? You can tap Undo right after if needed.</p>" +
        '<div class="flex items-center gap-2">' +
          '<button type="button" id="khConfirmDelPartyBtn" class="flex-1 py-3 rounded-full bg-[#B91C1C] text-white text-xs font-extrabold min-h-[48px]">Delete Party · মুছুন</button>' +
          '<button type="button" id="khCancelDelPartyBtn" class="px-5 py-3 rounded-full bg-[var(--oneora-bg)] text-xs font-bold min-h-[48px]">Cancel</button>' +
        "</div>" +
      "</div>";

    showSheet("Delete Party?", "Confirm Action", body);

    var cBtn = document.getElementById("khCancelDelPartyBtn");
    var dBtn = document.getElementById("khConfirmDelPartyBtn");
    if (cBtn) cBtn.addEventListener("click", closeModal);
    if (dBtn) {
      dBtn.addEventListener("click", function() {
        var data = loadData();
        var prev = JSON.parse(JSON.stringify(data));
        data.parties = data.parties.filter(function(p) { return p.id !== party.id; });
        data.entries = data.entries.filter(function(e) { return e.partyId !== party.id; });
        saveData(data);
        state.view = "home";
        state.selectedPartyId = null;
        registerUndo("Deleted party: " + party.name, prev);
        haptic(15);
        closeModal();
        rerenderIfMounted();
      });
    }
  }

  function openReminderModal(party) {
    var absBal = Math.abs(party.balance);
    var amtText = formatINR(absBal);
    var isReceivable = party.balance >= 0;

    function buildMsg(lang) {
      if (lang === "bn") {
        if (isReceivable) {
          return "নমস্কার " + party.name + ",\nআমাদের খাতায় আপনার " + amtText + " বাকি রয়েছে। অনুগ্রহ করে সুবিধামতো সময়ে পরিশোধ করবেন।\nধন্যবাদ।";
        }
        return "নমস্কার " + party.name + ",\nআমাদের খাতায় আপনার পাওনা " + amtText + " রয়েছে। শীঘ্রই হিসাব পরিশোধ করা হবে।\nধন্যবাদ।";
      }
      if (isReceivable) {
        return "Hello " + party.name + ",\nFriendly reminder: Your pending balance in our Khata is " + amtText + ". Kindly clear it at your convenience.\nThank you.";
      }
      return "Hello " + party.name + ",\nKhata update: Your credit balance with us is " + amtText + ". We will settle this shortly.\nThank you.";
    }

    var currentLang = "bn";
    var waPhone = normalizePhoneForWhatsApp(party.phone);

    var body =
      '<div class="space-y-3.5">' +
        '<div class="flex items-center justify-between gap-2">' +
          '<div class="flex items-center gap-2">' +
            '<button type="button" id="khRemLangBn" class="px-4 py-2 rounded-full bg-[#5B3FD0] text-white text-xs font-extrabold min-h-[44px]">বাংলা</button>' +
            '<button type="button" id="khRemLangEn" class="px-4 py-2 rounded-full bg-[var(--oneora-bg)] text-[#2B2236] dark:text-[#F5EEFF] text-xs font-extrabold min-h-[44px]">English</button>' +
          "</div>" +
          '<span class="px-3 py-1.5 rounded-full text-xs font-extrabold tabular-nums ' +
            (isReceivable
              ? "bg-[#CFF3E2] dark:bg-[#1B362E] text-[#115E42] dark:text-[#A7F3D0]"
              : "bg-[#FFD6D6] dark:bg-[#3D212B] text-[#8E1B3B] dark:text-[#FDA4AF]") +
            '">' + esc(amtText) + "</span>" +
        "</div>" +
        '<div>' +
          '<label for="khRemText" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Reminder Message · মেসেজ</label>' +
          '<textarea id="khRemText" rows="4" class="pastel-pill-input w-full text-sm font-medium">' + esc(buildMsg(currentLang)) + "</textarea>" +
        "</div>" +
        (!waPhone
          ? '<p class="text-[11px] font-bold text-[#804800] dark:text-[#FCD34D]">No phone number saved for this party — WhatsApp will let you pick a contact.</p>'
          : '<p class="text-[11px] font-bold text-[#5C506B] dark:text-[#C5B9DA]">Recipient: ' + esc(party.phone) + "</p>") +
        '<div class="grid grid-cols-2 gap-2.5 pt-1">' +
          '<a id="khRemWaLink" href="#" target="_blank" rel="noopener noreferrer" class="flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-[#15803D] hover:bg-[#166534] text-white text-xs font-extrabold min-h-[48px] shadow-sm text-center">WhatsApp</a>' +
          '<a id="khRemSmsLink" href="#" class="flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white text-xs font-extrabold min-h-[48px] shadow-sm text-center">SMS</a>' +
        "</div>" +
        '<div class="grid grid-cols-2 gap-2.5">' +
          '<button type="button" id="khRemCopyBtn" class="py-2.5 px-4 rounded-full bg-[var(--oneora-bg)] text-[#2B2236] dark:text-[#F5EEFF] text-xs font-extrabold min-h-[44px]">Copy Text</button>' +
          '<button type="button" id="khRemShareBtn" class="py-2.5 px-4 rounded-full bg-[#FFE7C2] dark:bg-[#3D2E1D] text-[#5C3400] dark:text-[#FDE68A] text-xs font-extrabold min-h-[44px]">Share</button>' +
        "</div>" +
      "</div>";

    showSheet("Send Reminder · রিমাইন্ডার পাঠান", party.name, body);

    var ta = document.getElementById("khRemText");
    var waLink = document.getElementById("khRemWaLink");
    var smsLink = document.getElementById("khRemSmsLink");
    var bnBtn = document.getElementById("khRemLangBn");
    var enBtn = document.getElementById("khRemLangEn");
    var copyBtn = document.getElementById("khRemCopyBtn");
    var shareBtn = document.getElementById("khRemShareBtn");

    function refreshLinks() {
      var text = ta ? ta.value : "";
      var encoded = encodeURIComponent(text);
      if (waLink) {
        waLink.href = waPhone
          ? "https://wa.me/" + encodeURIComponent(waPhone) + "?text=" + encoded
          : "https://wa.me/?text=" + encoded;
      }
      if (smsLink) {
        var smsTarget = party.phone ? String(party.phone).replace(/[^+\d]/g, "") : "";
        smsLink.href = "sms:" + smsTarget + "?body=" + encoded;
      }
    }

    refreshLinks();
    if (ta) ta.addEventListener("input", refreshLinks);

    if (bnBtn) {
      bnBtn.addEventListener("click", function() {
        currentLang = "bn";
        if (ta) ta.value = buildMsg("bn");
        bnBtn.className = "px-4 py-2 rounded-full bg-[#5B3FD0] text-white text-xs font-extrabold min-h-[44px]";
        enBtn.className = "px-4 py-2 rounded-full bg-[var(--oneora-bg)] text-[#2B2236] dark:text-[#F5EEFF] text-xs font-extrabold min-h-[44px]";
        refreshLinks();
      });
    }
    if (enBtn) {
      enBtn.addEventListener("click", function() {
        currentLang = "en";
        if (ta) ta.value = buildMsg("en");
        enBtn.className = "px-4 py-2 rounded-full bg-[#5B3FD0] text-white text-xs font-extrabold min-h-[44px]";
        bnBtn.className = "px-4 py-2 rounded-full bg-[var(--oneora-bg)] text-[#2B2236] dark:text-[#F5EEFF] text-xs font-extrabold min-h-[44px]";
        refreshLinks();
      });
    }
    if (copyBtn) {
      copyBtn.addEventListener("click", function() {
        var text = ta ? ta.value : "";
        if (global.OneoraCapabilities && typeof global.OneoraCapabilities.copyText === "function") {
          global.OneoraCapabilities.copyText(text);
        } else if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).catch(function() {});
        }
        notifyToast("Copied · কপি হয়েছে", "Reminder message copied to clipboard.", "success");
      });
    }
    if (shareBtn) {
      shareBtn.addEventListener("click", function() {
        var text = ta ? ta.value : "";
        if (navigator.share) {
          navigator.share({ title: "Khata Reminder", text: text }).catch(function() {});
        } else {
          if (global.OneoraCapabilities && typeof global.OneoraCapabilities.copyText === "function") {
            global.OneoraCapabilities.copyText(text);
          }
          notifyToast("Copied for Sharing", "Message copied so you can paste it anywhere.", "info");
        }
      });
    }
  }

  /* -------------------- Result / Share Sheet -------------------- */

  function showExportResultSheet(blob, filename, summaryTitle, summaryDetail) {
    state.lastGeneratedFile = { blob: blob, filename: filename };
    var sizeKb = Math.max(1, Math.round(blob.size / 1024));

    var body =
      '<div class="space-y-4">' +
        '<div class="rounded-[22px] p-4 bg-[#CFF3E2]/70 dark:bg-[#1B362E] border border-[#115E42]/15 space-y-1">' +
          '<p class="text-xs font-extrabold text-[#115E42] dark:text-[#A7F3D0]">' + esc(summaryTitle) + "</p>" +
          '<p class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF] break-all">' + esc(filename) + "</p>" +
          '<p class="text-xs font-semibold text-[#5C506B] dark:text-[#C5B9DA]">' + esc(summaryDetail) + " · " + sizeKb + " KB</p>" +
        "</div>" +
        '<div class="grid grid-cols-2 gap-2.5">' +
          '<button type="button" id="khResultDownloadBtn" class="py-3 px-4 rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white text-xs font-extrabold min-h-[48px] shadow-sm">Download · ডাউনলোড</button>' +
          '<button type="button" id="khResultShareBtn" class="py-3 px-4 rounded-full bg-[#FFE7C2] dark:bg-[#3D2E1D] text-[#5C3400] dark:text-[#FDE68A] text-xs font-extrabold min-h-[48px]">Share · শেয়ার</button>' +
        "</div>" +
      "</div>";

    showSheet("Report Ready · রিপোর্ট তৈরি", "Khata Export", body);

    var dlBtn = document.getElementById("khResultDownloadBtn");
    var shBtn = document.getElementById("khResultShareBtn");

    function doDownload() {
      if (global.utils && typeof global.utils.downloadBlob === "function") {
        global.utils.downloadBlob(blob, filename);
      } else {
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
      }
      notifyToast("Saved · সেভ হয়েছে", filename + " downloaded.", "success");
    }

    if (dlBtn) dlBtn.addEventListener("click", doDownload);
    if (shBtn) {
      shBtn.addEventListener("click", function() {
        try {
          var file = new File([blob], filename, { type: blob.type || "application/octet-stream" });
          if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
            navigator.share({
              title: summaryTitle,
              text: "ONEORA Khata Statement — " + filename,
              files: [file]
            }).catch(function() {
              doDownload();
            });
            return;
          }
        } catch (e) {}
        doDownload();
      });
    }
  }

  /* -------------------- PDF, Excel & CSV Reports -------------------- */

  function openReportsModal(singleParty) {
    var defaultFrom = daysAgoKey(30);
    var defaultTo = todayKey();
    var title = singleParty ? "Party Statement · পার্টির স্টেটমেন্ট" : "Full Khata Reports · খাতা রিপোর্ট";

    var body =
      '<div class="space-y-4">' +
        '<div class="grid grid-cols-2 gap-2.5">' +
          '<div>' +
            '<label for="khRepFrom" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">From Date · থেকে</label>' +
            '<input type="date" id="khRepFrom" value="' + esc(defaultFrom) + '" class="pastel-pill-input w-full text-xs font-bold tabular-nums" />' +
          "</div>" +
          '<div>' +
            '<label for="khRepTo" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">To Date · পর্যন্ত</label>' +
            '<input type="date" id="khRepTo" value="' + esc(defaultTo) + '" class="pastel-pill-input w-full text-xs font-bold tabular-nums" />' +
          "</div>" +
        "</div>" +
        '<div class="flex flex-wrap gap-2">' +
          '<button type="button" data-range-preset="all" class="px-3.5 py-2 rounded-full bg-[var(--oneora-bg)] text-xs font-bold min-h-[40px]">All Time · সব</button>' +
          '<button type="button" data-range-preset="30" class="px-3.5 py-2 rounded-full bg-[var(--oneora-bg)] text-xs font-bold min-h-[40px]">Last 30 Days</button>' +
          '<button type="button" data-range-preset="7" class="px-3.5 py-2 rounded-full bg-[var(--oneora-bg)] text-xs font-bold min-h-[40px]">Last 7 Days</button>' +
        "</div>" +
        '<div class="grid grid-cols-1 gap-2.5 pt-1">' +
          '<button type="button" id="khGenPdfBtn" class="w-full py-3.5 px-4 rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white text-xs font-extrabold min-h-[48px] shadow-sm">' +
            (singleParty ? "Generate Party Statement PDF" : "Generate Full Khata Report PDF") +
          "</button>" +
          '<div class="grid grid-cols-2 gap-2.5">' +
            '<button type="button" id="khGenXlsxBtn" class="py-3 px-4 rounded-full bg-[#CFF3E2] dark:bg-[#1B362E] text-[#115E42] dark:text-[#A7F3D0] text-xs font-extrabold min-h-[48px]">Export Excel (.xlsx)</button>' +
            '<button type="button" id="khGenCsvBtn" class="py-3 px-4 rounded-full bg-[#FFE7C2] dark:bg-[#3D2E1D] text-[#5C3400] dark:text-[#FDE68A] text-xs font-extrabold min-h-[48px]">Export CSV (.csv)</button>' +
          "</div>" +
        "</div>" +
      "</div>";

    showSheet(title, singleParty ? singleParty.name : "Date Range & Formats", body);

    var fromEl = document.getElementById("khRepFrom");
    var toEl = document.getElementById("khRepTo");

    var host = getModalHost();
    host.querySelectorAll("[data-range-preset]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var preset = btn.getAttribute("data-range-preset");
        if (preset === "all") {
          fromEl.value = "";
          toEl.value = "";
        } else {
          fromEl.value = daysAgoKey(Number(preset));
          toEl.value = todayKey();
        }
      });
    });

    var pdfBtn = document.getElementById("khGenPdfBtn");
    var xlsxBtn = document.getElementById("khGenXlsxBtn");
    var csvBtn = document.getElementById("khGenCsvBtn");

    if (pdfBtn) {
      pdfBtn.addEventListener("click", function() {
        pdfBtn.disabled = true;
        pdfBtn.textContent = "Building PDF...";
        generateKhataPdf(singleParty, fromEl.value || "", toEl.value || "").catch(function(err) {
          notifyToast("PDF Failed", err && err.message ? err.message : "Could not build PDF.", "error");
          pdfBtn.disabled = false;
          pdfBtn.textContent = singleParty ? "Generate Party Statement PDF" : "Generate Full Khata Report PDF";
        });
      });
    }
    if (xlsxBtn) {
      xlsxBtn.addEventListener("click", function() {
        xlsxBtn.disabled = true;
        xlsxBtn.textContent = "Building Excel...";
        generateKhataExcel(singleParty, fromEl.value || "", toEl.value || "").catch(function(err) {
          notifyToast("Excel Export Failed", err && err.message ? err.message : "Could not build Excel.", "error");
          xlsxBtn.disabled = false;
          xlsxBtn.textContent = "Export Excel (.xlsx)";
        });
      });
    }
    if (csvBtn) {
      csvBtn.addEventListener("click", function() {
        generateKhataCsv(singleParty, fromEl.value || "", toEl.value || "");
      });
    }
  }

  async function generateKhataPdf(singleParty, fromDate, toDate) {
    if (global.OneoraLoader && typeof global.OneoraLoader.load === "function") {
      await global.OneoraLoader.load("pdflib");
    }
    if (!global.PDFLib) {
      throw new Error("Offline PDF engine is unavailable.");
    }

    var data = loadData();
    var pdfDoc = await global.PDFLib.PDFDocument.create();
    var font = await pdfDoc.embedFont(global.PDFLib.StandardFonts.Helvetica);
    var bold = await pdfDoc.embedFont(global.PDFLib.StandardFonts.HelveticaBold);
    var page = pdfDoc.addPage([595.28, 841.89]);
    var y = 795;

    function addNewPageIfNeeded(minY) {
      if (y < (minY || 62)) {
        page = pdfDoc.addPage([595.28, 841.89]);
        y = 795;
      }
    }

    function drawLine(text, x, posY, size, f, color) {
      page.drawText(toPdfSafeText(text), {
        x: x,
        y: posY,
        size: size || 9.5,
        font: f || font,
        color: color || global.PDFLib.rgb(0.17, 0.13, 0.21)
      });
    }

    var rangeLabel = (fromDate || "Start") + " to " + (toDate || "Today");

    if (singleParty) {
      var ledger = getPartyRunningLedger(data, singleParty.id, fromDate, toDate);
      drawLine("ONEORA KHATA — PARTY STATEMENT", 42, y, 16, bold, global.PDFLib.rgb(0.36, 0.25, 0.82));
      y -= 20;
      drawLine("Party: " + singleParty.name + (singleParty.phone ? "  |  Phone: " + singleParty.phone : ""), 42, y, 10.5, bold);
      y -= 15;
      drawLine("Period: " + rangeLabel + "  |  Generated: " + todayKey(), 42, y, 9, font);
      y -= 20;
      drawLine(
        "Opening: " + formatRsAscii(ledger.openingBalance) +
        "   |   You Gave: " + formatRsAscii(ledger.totalGave) +
        "   |   You Got: " + formatRsAscii(ledger.totalGot),
        42, y, 9.5, bold
      );
      y -= 15;
      var closingLabel = ledger.closingBalance > 0
        ? "Net To Receive: " + formatRsAscii(ledger.closingBalance)
        : ledger.closingBalance < 0
          ? "Net To Pay: " + formatRsAscii(Math.abs(ledger.closingBalance))
          : "Settled (Rs. 0)";
      drawLine("Closing Balance: " + closingLabel, 42, y, 10.5, bold, global.PDFLib.rgb(0.07, 0.37, 0.26));
      y -= 22;

      drawLine("DATE", 42, y, 8.5, bold);
      drawLine("TYPE", 118, y, 8.5, bold);
      drawLine("AMOUNT", 195, y, 8.5, bold);
      drawLine("BALANCE", 285, y, 8.5, bold);
      drawLine("NOTE", 385, y, 8.5, bold);
      y -= 14;

      if (!ledger.rows.length) {
        drawLine("No entries in selected date range.", 42, y, 9.5, font);
      } else {
        for (var i = 0; i < ledger.rows.length; i++) {
          addNewPageIfNeeded(58);
          var r = ledger.rows[i];
          drawLine(r.dateKey, 42, y, 8.5, font);
          drawLine(r.type === "gave" ? "YOU GAVE" : "YOU GOT", 118, y, 8.5, bold);
          drawLine(formatRsAscii(r.amount), 195, y, 8.5, font);
          drawLine(formatRsAscii(r.runningBalance), 285, y, 8.5, font);
          drawLine(String(r.note || "-").slice(0, 32), 385, y, 8.5, font);
          y -= 14;
        }
      }

      var bytes = await pdfDoc.save();
      var blob = new Blob([bytes], { type: "application/pdf" });
      var safeName = toPdfSafeText(singleParty.name).replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 24) || "Party";
      var filename = "ONEORA_Khata_" + safeName + "_" + todayKey() + ".pdf";
      showExportResultSheet(blob, filename, "Party Statement PDF Ready", ledger.rows.length + " entry(ies) · " + closingLabel);
      return;
    }

    // Full Khata Report PDF
    var stats = computePartyStats(data);
    var filteredEntries = data.entries.filter(function(e) {
      if (fromDate && e.dateKey < fromDate) return false;
      if (toDate && e.dateKey > toDate) return false;
      return true;
    });
    filteredEntries.sort(function(a, b) {
      if (a.dateKey !== b.dateKey) return a.dateKey > b.dateKey ? -1 : 1;
      return Number(b.createdAtMs || 0) - Number(a.createdAtMs || 0);
    });

    var partyNameMap = {};
    for (var pIdx = 0; pIdx < data.parties.length; pIdx++) {
      partyNameMap[data.parties[pIdx].id] = data.parties[pIdx].name;
    }

    drawLine("ONEORA KHATA — FULL LEDGER REPORT", 42, y, 16, bold, global.PDFLib.rgb(0.36, 0.25, 0.82));
    y -= 18;
    drawLine("Period: " + rangeLabel + "   |   Generated: " + todayKey() + "   |   Parties: " + stats.parties.length, 42, y, 9, font);
    y -= 20;
    drawLine(
      "To Receive: " + formatRsAscii(stats.toReceive) +
      "   |   To Pay: " + formatRsAscii(stats.toPay) +
      "   |   Net: " + formatRsAscii(stats.net),
      42, y, 10, bold, global.PDFLib.rgb(0.07, 0.37, 0.26)
    );
    y -= 22;

    drawLine("PARTY BALANCES SUMMARY", 42, y, 10, bold);
    y -= 15;
    drawLine("PARTY", 42, y, 8.5, bold);
    drawLine("PHONE", 205, y, 8.5, bold);
    drawLine("GAVE", 300, y, 8.5, bold);
    drawLine("GOT", 385, y, 8.5, bold);
    drawLine("NET BALANCE", 470, y, 8.5, bold);
    y -= 14;

    for (var j = 0; j < stats.parties.length; j++) {
      addNewPageIfNeeded(62);
      var pt = stats.parties[j];
      drawLine(String(pt.name).slice(0, 26), 42, y, 8.5, font);
      drawLine(pt.phone || "-", 205, y, 8.5, font);
      drawLine(formatRsAscii(pt.totalGave), 300, y, 8.5, font);
      drawLine(formatRsAscii(pt.totalGot), 385, y, 8.5, font);
      drawLine(formatRsAscii(pt.balance), 470, y, 8.5, bold);
      y -= 14;
    }

    y -= 12;
    addNewPageIfNeeded(90);
    drawLine("ENTRIES IN SELECTED PERIOD (" + filteredEntries.length + ")", 42, y, 10, bold);
    y -= 15;
    drawLine("DATE", 42, y, 8.5, bold);
    drawLine("PARTY", 112, y, 8.5, bold);
    drawLine("TYPE", 245, y, 8.5, bold);
    drawLine("AMOUNT", 315, y, 8.5, bold);
    drawLine("NOTE", 405, y, 8.5, bold);
    y -= 14;

    var maxRows = Math.min(filteredEntries.length, 300);
    for (var k = 0; k < maxRows; k++) {
      addNewPageIfNeeded(58);
      var ent = filteredEntries[k];
      drawLine(ent.dateKey, 42, y, 8.5, font);
      drawLine(String(partyNameMap[ent.partyId] || "Party").slice(0, 22), 112, y, 8.5, font);
      drawLine(ent.type === "gave" ? "GAVE" : "GOT", 245, y, 8.5, bold);
      drawLine(formatRsAscii(ent.amount), 315, y, 8.5, font);
      drawLine(String(ent.note || "-").slice(0, 28), 405, y, 8.5, font);
      y -= 14;
    }

    var fullBytes = await pdfDoc.save();
    var fullBlob = new Blob([fullBytes], { type: "application/pdf" });
    var fullName = "ONEORA_Khata_Full_Report_" + todayKey() + ".pdf";
    showExportResultSheet(fullBlob, fullName, "Full Khata PDF Ready", stats.parties.length + " parties · " + filteredEntries.length + " entries");
  }

  async function generateKhataExcel(singleParty, fromDate, toDate) {
    if (global.OneoraLoader && typeof global.OneoraLoader.load === "function") {
      await global.OneoraLoader.load("xlsx");
    }
    if (!global.XLSX) {
      throw new Error("Offline Excel library is unavailable.");
    }

    var data = loadData();
    var wb = global.XLSX.utils.book_new();

    if (singleParty) {
      var ledger = getPartyRunningLedger(data, singleParty.id, fromDate, toDate);
      var rows = ledger.rows.map(function(r) {
        return {
          Date: r.dateKey,
          Party: singleParty.name,
          Type: r.type === "gave" ? "You Gave (দিলাম)" : "You Got (পেলাম)",
          "You Gave (INR)": r.type === "gave" ? r.amount : 0,
          "You Got (INR)": r.type === "got" ? r.amount : 0,
          "Running Balance (INR)": r.runningBalance,
          Note: r.note || ""
        };
      });
      var ws = global.XLSX.utils.json_to_sheet(rows.length ? rows : [{ Info: "No entries in selected range" }]);
      global.XLSX.utils.book_append_sheet(wb, ws, "Party Ledger");
      var out = global.XLSX.write(wb, { bookType: "xlsx", type: "array" });
      var blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      var safeName = toPdfSafeText(singleParty.name).replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 24) || "Party";
      showExportResultSheet(blob, "ONEORA_Khata_" + safeName + "_" + todayKey() + ".xlsx", "Party Excel Ready", ledger.rows.length + " entry(ies) exported");
      return;
    }

    var stats = computePartyStats(data);
    var summaryRows = stats.parties.map(function(p) {
      return {
        Party: p.name,
        Phone: p.phone,
        Note: p.note,
        "Total Gave (দিলাম)": p.totalGave,
        "Total Got (পেলাম)": p.totalGot,
        "Net Balance (INR)": p.balance,
        Status: p.balance > 0 ? "Will Get (পাবো)" : p.balance < 0 ? "Will Give (দেবো)" : "Settled"
      };
    });
    var pMap = {};
    for (var i = 0; i < data.parties.length; i++) pMap[data.parties[i].id] = data.parties[i].name;

    var entryRows = data.entries.filter(function(e) {
      if (fromDate && e.dateKey < fromDate) return false;
      if (toDate && e.dateKey > toDate) return false;
      return true;
    }).map(function(e) {
      return {
        Date: e.dateKey,
        Party: pMap[e.partyId] || "",
        Type: e.type === "gave" ? "You Gave (দিলাম)" : "You Got (পেলাম)",
        Amount: e.amount,
        Note: e.note || ""
      };
    });

    global.XLSX.utils.book_append_sheet(wb, global.XLSX.utils.json_to_sheet(summaryRows.length ? summaryRows : [{ Info: "No parties yet" }]), "Summary");
    global.XLSX.utils.book_append_sheet(wb, global.XLSX.utils.json_to_sheet(entryRows.length ? entryRows : [{ Info: "No entries" }]), "Entries");
    var fullOut = global.XLSX.write(wb, { bookType: "xlsx", type: "array" });
    var fullBlob = new Blob([fullOut], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    showExportResultSheet(fullBlob, "ONEORA_Khata_Full_" + todayKey() + ".xlsx", "Khata Excel Ready", stats.parties.length + " parties · " + entryRows.length + " entries");
  }

  function generateKhataCsv(singleParty, fromDate, toDate) {
    var data = loadData();
    var pMap = {};
    for (var i = 0; i < data.parties.length; i++) pMap[data.parties[i].id] = data.parties[i].name;

    var csvLines = [];
    if (singleParty) {
      var ledger = getPartyRunningLedger(data, singleParty.id, fromDate, toDate);
      csvLines.push(["Date", "Party", "Type", "Amount (INR)", "Running Balance (INR)", "Note"]);
      for (var j = 0; j < ledger.rows.length; j++) {
        var r = ledger.rows[j];
        csvLines.push([r.dateKey, singleParty.name, r.type === "gave" ? "You Gave (দিলাম)" : "You Got (পেলাম)", r.amount, r.runningBalance, r.note || ""]);
      }
    } else {
      csvLines.push(["Date", "Party", "Type", "Amount (INR)", "Note"]);
      var list = data.entries.filter(function(e) {
        if (fromDate && e.dateKey < fromDate) return false;
        if (toDate && e.dateKey > toDate) return false;
        return true;
      });
      for (var k = 0; k < list.length; k++) {
        var ent = list[k];
        csvLines.push([ent.dateKey, pMap[ent.partyId] || "", ent.type === "gave" ? "You Gave (দিলাম)" : "You Got (পেলাম)", ent.amount, ent.note || ""]);
      }
    }

    var csvBody = "\uFEFF" + csvLines.map(function(row) {
      return row.map(function(cell) {
        return '"' + String(cell == null ? "" : cell).replace(/"/g, '""') + '"';
      }).join(",");
    }).join("\n");

    var blob = new Blob([csvBody], { type: "text/csv;charset=utf-8;" });
    var filename = singleParty
      ? "ONEORA_Khata_" + (toPdfSafeText(singleParty.name).replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 24) || "Party") + "_" + todayKey() + ".csv"
      : "ONEORA_Khata_Full_" + todayKey() + ".csv";
    showExportResultSheet(blob, filename, "CSV Export Ready", (csvLines.length - 1) + " row(s) with UTF-8 Bengali support");
  }

  /* -------------------- Backup / Restore JSON -------------------- */

  function openBackupModal() {
    var data = loadData();
    var body =
      '<div class="space-y-4">' +
        '<div class="pastel-inset-tile p-4 space-y-1">' +
          '<p class="text-xs font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">Offline Local Storage (IndexedDB)</p>' +
          '<p class="text-xs font-semibold text-[#5C506B] dark:text-[#C5B9DA]">' + data.parties.length + " party(ies) · " + data.entries.length + " ledger entry(ies) stored privately on this device.</p>" +
        "</div>" +
        '<button type="button" id="khExportJsonBtn" class="w-full py-3.5 px-4 rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white text-xs font-extrabold min-h-[48px] shadow-sm">Download Khata Backup (.json)</button>' +
        '<label class="w-full cursor-pointer flex items-center justify-center gap-2 py-3.5 px-4 rounded-full border-2 border-dashed border-[#804800]/40 bg-[#FFE7C2]/50 dark:bg-[#3D2E1D] text-[#5C3400] dark:text-[#FDE68A] text-xs font-extrabold min-h-[48px]">' +
          '<span>Restore / Merge Backup (.json)</span>' +
          '<input type="file" id="khImportJsonInput" accept="application/json,.json" class="hidden" />' +
        "</label>" +
      "</div>";

    showSheet("Backup & Restore · ব্যাকআপ", "Offline JSON", body);

    var expBtn = document.getElementById("khExportJsonBtn");
    var impInput = document.getElementById("khImportJsonInput");

    if (expBtn) {
      expBtn.addEventListener("click", function() {
        var latest = loadData();
        var payload = {
          app: "ONEORA_KHATA",
          version: 1,
          exportedAt: new Date().toISOString(),
          parties: latest.parties,
          entries: latest.entries
        };
        var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        var filename = "ONEORA_Khata_Backup_" + todayKey() + ".json";
        showExportResultSheet(blob, filename, "Khata JSON Backup Ready", latest.parties.length + " parties · " + latest.entries.length + " entries");
      });
    }

    if (impInput) {
      impInput.addEventListener("change", function(ev) {
        var files = ev.target.files;
        var file = files && files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function() {
          try {
            var parsed = JSON.parse(String(reader.result || ""));
            var incParties = parsed && Array.isArray(parsed.parties) ? parsed.parties : null;
            var incEntries = parsed && Array.isArray(parsed.entries) ? parsed.entries : null;
            if (!incParties || !incEntries) {
              throw new Error("Invalid Khata backup JSON format.");
            }
            var cur = loadData();
            var prev = JSON.parse(JSON.stringify(cur));
            var pMap = {};
            var i;
            for (i = 0; i < cur.parties.length; i++) pMap[cur.parties[i].id] = cur.parties[i];
            for (i = 0; i < incParties.length; i++) {
              var ip = incParties[i];
              if (!ip || !ip.id || !ip.name) continue;
              var exP = pMap[ip.id];
              if (!exP || Number(ip.updatedAtMs || 0) >= Number(exP.updatedAtMs || 0)) {
                pMap[ip.id] = {
                  id: String(ip.id),
                  name: String(ip.name).slice(0, 100),
                  phone: String(ip.phone || "").slice(0, 20),
                  note: String(ip.note || "").slice(0, 200),
                  createdAtMs: Number(ip.createdAtMs || Date.now()),
                  updatedAtMs: Number(ip.updatedAtMs || Date.now())
                };
              }
            }
            var eMap = {};
            for (i = 0; i < cur.entries.length; i++) eMap[cur.entries[i].id] = cur.entries[i];
            for (i = 0; i < incEntries.length; i++) {
              var ie = incEntries[i];
              if (!ie || !ie.id || !ie.partyId || !(Number(ie.amount) > 0)) continue;
              var exE = eMap[ie.id];
              if (!exE || Number(ie.updatedAtMs || 0) >= Number(exE.updatedAtMs || 0)) {
                eMap[ie.id] = {
                  id: String(ie.id),
                  partyId: String(ie.partyId),
                  type: ie.type === "got" ? "got" : "gave",
                  amount: Math.round(Number(ie.amount) * 100) / 100,
                  dateKey: String(ie.dateKey || todayKey()),
                  note: String(ie.note || "").slice(0, 220),
                  createdAtMs: Number(ie.createdAtMs || Date.now()),
                  updatedAtMs: Number(ie.updatedAtMs || Date.now())
                };
              }
            }
            cur.parties = Object.keys(pMap).map(function(k) { return pMap[k]; });
            cur.entries = Object.keys(eMap).map(function(k) { return eMap[k]; });
            saveData(cur);
            registerUndo("Backup restored (" + incParties.length + " parties)", prev);
            notifyToast("Backup Restored · রিস্টোর সম্পন্ন", cur.parties.length + " parties & " + cur.entries.length + " entries synced.", "success");
            closeModal();
            rerenderIfMounted();
          } catch (err) {
            notifyToast("Restore Failed", err && err.message ? err.message : "Could not read backup JSON.", "error");
          }
        };
        reader.readAsText(file);
      });
    }
  }

  /* -------------------- Optional Khata PIN Lock Settings -------------------- */

  function openPinSettingsModal() {
    var meta = loadPinMeta();
    var body =
      '<form id="khPinSettingsForm" class="space-y-3.5">' +
        '<p class="text-xs font-semibold text-[#5C506B] dark:text-[#C5B9DA]">' +
          (meta.enabled
            ? "Khata PIN Lock is active. Enter a new 4–6 digit PIN to change it, or remove the lock below."
            : "Protect your Khata / Udhar records with a private 4–6 digit PIN (stored hashed offline — never plaintext).") +
        "</p>" +
        '<div>' +
          '<label for="khPinNew" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">New PIN (4–6 digits)</label>' +
          '<input type="password" inputmode="numeric" pattern="[0-9]{4,6}" maxlength="6" id="khPinNew" placeholder="Enter 4–6 digits" class="pastel-pill-input w-full text-center text-base font-extrabold tracking-[0.4em]" />' +
        "</div>" +
        '<div>' +
          '<label for="khPinConfirm" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Confirm PIN</label>' +
          '<input type="password" inputmode="numeric" pattern="[0-9]{4,6}" maxlength="6" id="khPinConfirm" placeholder="Re-enter PIN" class="pastel-pill-input w-full text-center text-base font-extrabold tracking-[0.4em]" />' +
        "</div>" +
        '<p id="khPinFormErr" class="text-xs font-extrabold text-[#B91C1C] dark:text-[#FDA4AF] hidden"></p>' +
        '<button type="submit" class="w-full py-3 rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white text-xs font-extrabold min-h-[48px] shadow-sm">' +
          (meta.enabled ? "Update PIN" : "Enable Khata PIN Lock") +
        "</button>" +
        (meta.enabled
          ? '<div class="grid grid-cols-2 gap-2 pt-1">' +
              '<button type="button" id="khLockNowBtn" class="py-3 rounded-full bg-[#FFE7C2] dark:bg-[#3D2E1D] text-[#5C3400] dark:text-[#FDE68A] text-xs font-extrabold min-h-[44px]">Lock Now</button>' +
              '<button type="button" id="khRemovePinBtn" class="py-3 rounded-full bg-[#FFD6D6] dark:bg-[#3D212B] text-[#8E1B3B] dark:text-[#FDA4AF] text-xs font-extrabold min-h-[44px]">Remove PIN</button>' +
            "</div>"
          : "") +
      "</form>";

    showSheet("Khata PIN Lock · পিন লক", "Privacy", body);

    var form = document.getElementById("khPinSettingsForm");
    var errEl = document.getElementById("khPinFormErr");
    var lockBtn = document.getElementById("khLockNowBtn");
    var remBtn = document.getElementById("khRemovePinBtn");

    if (lockBtn) {
      lockBtn.addEventListener("click", function() {
        state.pinUnlocked = false;
        state.pinBuffer = "";
        state.pinError = "";
        closeModal();
        rerenderIfMounted();
      });
    }
    if (remBtn) {
      remBtn.addEventListener("click", function() {
        savePinMeta({ enabled: false });
        state.pinUnlocked = true;
        notifyToast("PIN Removed", "Khata PIN lock has been turned off.", "info");
        closeModal();
        rerenderIfMounted();
      });
    }
    if (form) {
      form.addEventListener("submit", async function(ev) {
        ev.preventDefault();
        var p1 = String(document.getElementById("khPinNew").value || "").trim();
        var p2 = String(document.getElementById("khPinConfirm").value || "").trim();
        if (!/^\d{4,6}$/.test(p1)) {
          errEl.textContent = "Please enter 4 to 6 numeric digits.";
          errEl.classList.remove("hidden");
          return;
        }
        if (p1 !== p2) {
          errEl.textContent = "PINs do not match.";
          errEl.classList.remove("hidden");
          return;
        }
        var salt = uid("salt");
        var hash = await hashPin(p1, salt);
        savePinMeta({ enabled: true, salt: salt, hash: hash });
        state.pinUnlocked = true;
        notifyToast("Khata PIN Saved", "Your Khata is now protected with a PIN.", "success");
        closeModal();
        rerenderIfMounted();
      });
    }
  }

  /* -------------------- Views: PIN Lock Gate, Home, Party Ledger -------------------- */

  function renderPinGate(container) {
    syncFab(false);
    var dots = "";
    for (var i = 0; i < 6; i++) {
      var filled = i < state.pinBuffer.length;
      dots += '<span class="w-3.5 h-3.5 rounded-full border-2 ' +
        (filled ? "bg-[#5B3FD0] border-[#5B3FD0]" : "border-[#5C506B]/40 dark:border-[#C5B9DA]/40") +
        '"></span>';
    }

    container.innerHTML =
      '<div class="pastel-stage3-card p-6 sm:p-8 max-w-md mx-auto text-center space-y-5">' +
        '<div class="w-14 h-14 mx-auto rounded-[20px] bg-[#FFE7C2] dark:bg-[#3D2E1D] text-[#804800] dark:text-[#FCD34D] inline-flex items-center justify-center">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="3"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' +
        "</div>" +
        '<div>' +
          '<h3 class="text-lg font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">Khata Locked · খাতা লক করা</h3>' +
          '<p class="text-xs font-semibold text-[#5C506B] dark:text-[#C5B9DA] mt-1">Enter your 4–6 digit Khata PIN to unlock.</p>' +
        "</div>" +
        '<div class="flex items-center justify-center gap-3 py-1">' + dots + "</div>" +
        (state.pinError ? '<p class="text-xs font-extrabold text-[#B91C1C] dark:text-[#FDA4AF]">' + esc(state.pinError) + "</p>" : "") +
        '<div class="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto">' +
          ["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"].map(function(k) {
            return '<button type="button" data-kh-pin-key="' + k + '" class="h-12 rounded-[18px] bg-[var(--oneora-bg)] hover:bg-[#FFE7C2]/60 dark:hover:bg-[#3D2E1D] text-base font-extrabold text-[#2B2236] dark:text-[#F5EEFF] active:scale-95 transition">' + k + "</button>";
          }).join("") +
        "</div>" +
        '<button type="button" id="khPinUnlockBtn" class="w-full max-w-[260px] mx-auto py-3 rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white text-xs font-extrabold min-h-[48px] shadow-sm">Unlock Khata · আনলক</button>' +
      "</div>";

    container.querySelectorAll("[data-kh-pin-key]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var key = btn.getAttribute("data-kh-pin-key");
        haptic(6);
        state.pinError = "";
        if (key === "C") state.pinBuffer = "";
        else if (key === "⌫") state.pinBuffer = state.pinBuffer.slice(0, -1);
        else if (state.pinBuffer.length < 6) state.pinBuffer += key;
        renderPinGate(container);
      });
    });

    var unlockBtn = container.querySelector("#khPinUnlockBtn");
    if (unlockBtn) {
      unlockBtn.addEventListener("click", async function() {
        var meta = loadPinMeta();
        if (state.pinBuffer.length < 4) {
          state.pinError = "Enter at least 4 digits.";
          renderPinGate(container);
          return;
        }
        var attempt = await hashPin(state.pinBuffer, meta.salt);
        if (attempt === meta.hash) {
          state.pinUnlocked = true;
          state.pinBuffer = "";
          state.pinError = "";
          haptic(12);
          render(container);
        } else {
          state.pinBuffer = "";
          state.pinError = "Incorrect PIN. Try again.";
          haptic(25);
          renderPinGate(container);
        }
      });
    }
  }

  function renderHome(container, data) {
    var stats = computePartyStats(data);
    var pinMeta = loadPinMeta();
    var query = state.search.trim().toLowerCase();

    var filtered = stats.parties.filter(function(p) {
      if (state.filter === "pending" && p.balance === 0) return false;
      if (state.filter === "receive" && !(p.balance > 0)) return false;
      if (state.filter === "pay" && !(p.balance < 0)) return false;
      if (query) {
        var hay = (p.name + " " + p.phone + " " + p.note).toLowerCase();
        if (hay.indexOf(query) === -1) return false;
      }
      return true;
    });

    filtered.sort(function(a, b) {
      if (state.sort === "highest") {
        var diff = Math.abs(b.balance) - Math.abs(a.balance);
        if (diff !== 0) return diff;
      } else if (state.sort === "name") {
        return a.name.localeCompare(b.name);
      }
      return Number(b.lastActivityMs || 0) - Number(a.lastActivityMs || 0);
    });

    var partyCardsHtml = "";
    if (!stats.parties.length) {
      partyCardsHtml =
        '<div class="pastel-stage3-card p-7 text-center space-y-3.5">' +
          '<div class="w-14 h-14 mx-auto rounded-[20px] bg-[#FFE7C2] dark:bg-[#3D2E1D] text-[#804800] dark:text-[#FCD34D] inline-flex items-center justify-center">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="M8 7h8"/><path d="M8 11h6"/></svg>' +
          "</div>" +
          '<div>' +
            '<h4 class="text-base font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">Start Your Digital Khata · খাতা শুরু করুন</h4>' +
            '<p class="text-xs font-medium text-[#5C506B] dark:text-[#C5B9DA] mt-1 max-w-sm mx-auto">Track customer &amp; supplier udhar (দিলাম / পেলাম), send WhatsApp reminders, and export PDF statements — 100% offline.</p>' +
          "</div>" +
          '<button type="button" id="khEmptyAddPartyBtn" class="px-6 py-3 rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white text-xs font-extrabold min-h-[48px] shadow-sm">+ Add First Party · প্রথম পার্টি যোগ করুন</button>' +
        "</div>";
    } else if (!filtered.length) {
      partyCardsHtml =
        '<div class="pastel-stage3-card p-6 text-center space-y-2">' +
          '<p class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">No matching parties found</p>' +
          '<p class="text-xs font-medium text-[#5C506B] dark:text-[#C5B9DA]">Try clearing your search or switching the filter to "All".</p>' +
        "</div>";
    } else {
      partyCardsHtml = '<div class="space-y-2.5">' + filtered.map(function(p) {
        var chipClass = p.balance > 0
          ? "bg-[#CFF3E2] dark:bg-[#1B362E] text-[#115E42] dark:text-[#A7F3D0]"
          : p.balance < 0
            ? "bg-[#FFD6D6] dark:bg-[#3D212B] text-[#8E1B3B] dark:text-[#FDA4AF]"
            : "bg-[var(--oneora-bg)] text-[#5C506B] dark:text-[#C5B9DA]";
        var chipLabel = p.balance > 0
          ? "Will get · পাবো"
          : p.balance < 0
            ? "Will give · দেবো"
            : "Settled · শূন্য";

        return (
          '<div class="pastel-stage3-card p-4 flex items-center justify-between gap-3 hover:border-[#804800]/30 transition">' +
            '<button type="button" data-kh-open-party="' + esc(p.id) + '" class="flex items-center gap-3 min-w-0 flex-1 text-left min-h-[48px]">' +
              '<div class="w-11 h-11 rounded-[16px] bg-[#FFE7C2] dark:bg-[#3D2E1D] text-[#7C3E00] dark:text-[#FDE68A] font-extrabold text-sm flex items-center justify-center shrink-0">' + esc(getInitials(p.name)) + "</div>" +
              '<div class="min-w-0 flex-1">' +
                '<p class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF] truncate">' + esc(p.name) + "</p>" +
                '<p class="text-[11px] font-semibold text-[#5C506B] dark:text-[#C5B9DA] truncate">' +
                  esc(p.phone || (p.note ? p.note : p.entryCount + " entry(ies)")) +
                  (p.lastDateKey ? " · " + esc(formatDateDisplay(p.lastDateKey)) : "") +
                "</p>" +
              "</div>" +
            "</button>" +
            '<div class="flex items-center gap-2 shrink-0">' +
              '<button type="button" data-kh-open-party="' + esc(p.id) + '" class="px-3 py-1.5 rounded-[16px] text-right min-h-[44px] ' + chipClass + '">' +
                '<p class="text-xs sm:text-sm font-extrabold tabular-nums leading-tight">' + esc(formatINR(Math.abs(p.balance))) + "</p>" +
                '<p class="text-[10px] font-bold leading-tight opacity-90">' + chipLabel + "</p>" +
              "</button>" +
              (p.balance !== 0
                ? '<button type="button" data-kh-remind-party="' + esc(p.id) + '" title="Send Reminder" aria-label="Send reminder to ' + esc(p.name) + '" class="w-11 h-11 rounded-full bg-[#FFE7C2]/80 dark:bg-[#3D2E1D] text-[#7C3E00] dark:text-[#FDE68A] inline-flex items-center justify-center shrink-0">' +
                    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4 20-7Z"/></svg>' +
                  "</button>"
                : "") +
            "</div>" +
          "</div>"
        );
      }).join("") + "</div>";
    }

    container.innerHTML =
      '<div class="space-y-4 pb-20">' +
        '<!-- Khata Summary Cards (To Receive / To Pay / Net) -->' +
        '<div class="pastel-stage3-card p-4 sm:p-5 space-y-3.5">' +
          '<div class="flex flex-wrap items-center justify-between gap-2">' +
            '<div>' +
              '<p class="text-[11px] font-extrabold uppercase tracking-wider text-[#804800] dark:text-[#FCD34D]">Khata / Udhar · খাতা বই</p>' +
              '<h3 class="text-base sm:text-lg font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">' + stats.parties.length + " Parties · " + data.entries.length + " Entries</h3>" +
            "</div>" +
            '<div class="flex flex-wrap items-center gap-1.5">' +
              '<button type="button" id="khHomeAddPartyBtn" class="px-3.5 py-2 rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white text-xs font-extrabold min-h-[44px]">+ Party</button>' +
              '<button type="button" id="khHomeReportsBtn" class="px-3.5 py-2 rounded-full bg-[#FFE7C2] dark:bg-[#3D2E1D] text-[#5C3400] dark:text-[#FDE68A] text-xs font-extrabold min-h-[44px]">Reports</button>' +
              '<button type="button" id="khHomeBackupBtn" class="px-3.5 py-2 rounded-full bg-[var(--oneora-bg)] text-[#2B2236] dark:text-[#F5EEFF] text-xs font-extrabold min-h-[44px]">Backup</button>' +
              '<button type="button" id="khHomePinBtn" class="px-3.5 py-2 rounded-full bg-[var(--oneora-bg)] text-[#2B2236] dark:text-[#F5EEFF] text-xs font-extrabold min-h-[44px]">' + (pinMeta.enabled ? "PIN On" : "PIN") + "</button>" +
            "</div>" +
          "</div>" +
          '<div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">' +
            '<div class="rounded-[22px] p-3.5 bg-[#CFF3E2]/70 dark:bg-[#1B362E]">' +
              '<p class="text-[11px] font-extrabold text-[#115E42] dark:text-[#A7F3D0]">To receive · পাবো (বাকি)</p>' +
              '<p class="text-lg sm:text-xl font-extrabold tabular-nums mt-0.5 text-[#0F5132] dark:text-[#6EE7B7]">' + esc(formatINR(stats.toReceive)) + "</p>" +
            "</div>" +
            '<div class="rounded-[22px] p-3.5 bg-[#FFD6D6]/70 dark:bg-[#3D212B]">' +
              '<p class="text-[11px] font-extrabold text-[#8E1B3B] dark:text-[#FDA4AF]">To pay · দেবো</p>' +
              '<p class="text-lg sm:text-xl font-extrabold tabular-nums mt-0.5 text-[#881337] dark:text-[#FCA5A5]">' + esc(formatINR(stats.toPay)) + "</p>" +
            "</div>" +
            '<div class="rounded-[22px] p-3.5 bg-[#FFE7C2]/75 dark:bg-[#3D2E1D]">' +
              '<p class="text-[11px] font-extrabold text-[#7C3E00] dark:text-[#FDE68A]">Net · নেট ব্যালেন্স</p>' +
              '<p class="text-lg sm:text-xl font-extrabold tabular-nums mt-0.5 text-[#2B2236] dark:text-[#F5EEFF]">' + esc(formatINR(stats.net, true)) + "</p>" +
            "</div>" +
          "</div>" +
        "</div>" +

        '<!-- Search, Sort & Filter -->' +
        '<div class="pastel-stage3-card p-4 space-y-3">' +
          '<div class="grid grid-cols-1 sm:grid-cols-12 gap-2.5">' +
            '<input type="search" id="khSearchInput" value="' + esc(state.search) + '" placeholder="Search party name, phone or note · পার্টি খুঁজুন..." class="pastel-pill-input sm:col-span-8 w-full text-xs font-semibold" />' +
            '<select id="khSortSelect" aria-label="Sort parties" class="pastel-pill-input sm:col-span-4 w-full text-xs font-bold">' +
              '<option value="recent"' + (state.sort === "recent" ? " selected" : "") + ">Sort: Recent · সাম্প্রতিক</option>" +
              '<option value="highest"' + (state.sort === "highest" ? " selected" : "") + ">Sort: Highest Balance</option>" +
              '<option value="name"' + (state.sort === "name" ? " selected" : "") + ">Sort: Name (A–Z)</option>" +
            "</select>" +
          "</div>" +
          '<div class="flex items-center gap-2 overflow-x-auto hide-scrollbar">' +
            [
              { id: "all", label: "All · সব" },
              { id: "pending", label: "Pending only · বাকি আছে" },
              { id: "receive", label: "Will get · পাবো" },
              { id: "pay", label: "Will give · দেবো" }
            ].map(function(f) {
              return '<button type="button" data-kh-filter="' + f.id + '" class="pastel-pill-tab ' + (state.filter === f.id ? "is-active" : "") + '">' + f.label + "</button>";
            }).join("") +
          "</div>" +
        "</div>" +

        partyCardsHtml +
      "</div>";

    syncFab(true);

    // Bind Home events
    var addPartyBtn = container.querySelector("#khHomeAddPartyBtn");
    var emptyAddBtn = container.querySelector("#khEmptyAddPartyBtn");
    var repBtn = container.querySelector("#khHomeReportsBtn");
    var bkpBtn = container.querySelector("#khHomeBackupBtn");
    var pinBtn = container.querySelector("#khHomePinBtn");
    var searchInput = container.querySelector("#khSearchInput");
    var sortSelect = container.querySelector("#khSortSelect");

    if (addPartyBtn) addPartyBtn.addEventListener("click", function() { openPartyModal(null); });
    if (emptyAddBtn) emptyAddBtn.addEventListener("click", function() { openPartyModal(null); });
    if (repBtn) repBtn.addEventListener("click", function() { openReportsModal(null); });
    if (bkpBtn) bkpBtn.addEventListener("click", openBackupModal);
    if (pinBtn) pinBtn.addEventListener("click", openPinSettingsModal);

    if (searchInput) {
      searchInput.addEventListener("input", function() {
        state.search = searchInput.value || "";
        var pos = searchInput.selectionStart;
        renderHome(container, loadData());
        var re = container.querySelector("#khSearchInput");
        if (re) {
          re.focus();
          try { re.setSelectionRange(pos, pos); } catch (e) {}
        }
      });
    }
    if (sortSelect) {
      sortSelect.addEventListener("change", function() {
        state.sort = sortSelect.value || "recent";
        renderHome(container, loadData());
      });
    }
    container.querySelectorAll("[data-kh-filter]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        state.filter = btn.getAttribute("data-kh-filter") || "all";
        renderHome(container, loadData());
      });
    });
    container.querySelectorAll("[data-kh-open-party]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        state.selectedPartyId = btn.getAttribute("data-kh-open-party");
        state.view = "ledger";
        haptic(8);
        render(container);
      });
    });
    container.querySelectorAll("[data-kh-remind-party]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var pid = btn.getAttribute("data-kh-remind-party");
        var found = stats.parties.find(function(x) { return x.id === pid; });
        if (found) openReminderModal(found);
      });
    });
  }

  function renderLedger(container, data) {
    var stats = computePartyStats(data);
    var party = stats.parties.find(function(p) { return p.id === state.selectedPartyId; });
    if (!party) {
      state.view = "home";
      state.selectedPartyId = null;
      renderHome(container, data);
      return;
    }

    var ledger = getPartyRunningLedger(data, party.id, "", "");
    var groups = groupRowsByDateDesc(ledger.rows);

    var balBadgeClass = party.balance > 0
      ? "bg-[#CFF3E2] dark:bg-[#1B362E] text-[#115E42] dark:text-[#A7F3D0]"
      : party.balance < 0
        ? "bg-[#FFD6D6] dark:bg-[#3D212B] text-[#8E1B3B] dark:text-[#FDA4AF]"
        : "bg-[var(--oneora-bg)] text-[#5C506B] dark:text-[#C5B9DA]";
    var balHeading = party.balance > 0
      ? "You will get · আপনি পাবেন (বাকি)"
      : party.balance < 0
        ? "You will give · আপনাকে দিতে হবে"
        : "Settled · হিসাব মিটেছে";

    var groupsHtml = "";
    if (!groups.length) {
      groupsHtml =
        '<div class="pastel-stage3-card p-6 text-center space-y-2">' +
          '<p class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">No entries yet · কোনো হিসাব নেই</p>' +
          '<p class="text-xs font-medium text-[#5C506B] dark:text-[#C5B9DA]">Tap <strong>You gave (দিলাম)</strong> or <strong>You got (পেলাম)</strong> below to record the first entry.</p>' +
        "</div>";
    } else {
      groupsHtml = groups.map(function(g) {
        var itemsHtml = g.items.map(function(ent) {
          var isGave = ent.type === "gave";
          var tagClass = isGave
            ? "bg-[#CFF3E2] dark:bg-[#1B362E] text-[#115E42] dark:text-[#A7F3D0]"
            : "bg-[#FFD6D6] dark:bg-[#3D212B] text-[#8E1B3B] dark:text-[#FDA4AF]";
          var runClass = ent.runningBalance > 0
            ? "text-[#115E42] dark:text-[#6EE7B7]"
            : ent.runningBalance < 0
              ? "text-[#8E1B3B] dark:text-[#FDA4AF]"
              : "text-[#5C506B] dark:text-[#C5B9DA]";

          return (
            '<div class="pastel-inset-tile p-3.5 flex items-start justify-between gap-3">' +
              '<div class="min-w-0 flex-1 space-y-1">' +
                '<div class="flex flex-wrap items-center gap-2">' +
                  '<span class="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ' + tagClass + '">' +
                    (isGave ? "You gave · দিলাম" : "You got · পেলাম") +
                  "</span>" +
                  '<span class="text-sm sm:text-base font-extrabold tabular-nums text-[#2B2236] dark:text-[#F5EEFF]">' + esc(formatINR(ent.amount)) + "</span>" +
                "</div>" +
                (ent.note ? '<p class="text-xs font-medium text-[#5C506B] dark:text-[#C5B9DA] break-words">' + esc(ent.note) + "</p>" : "") +
                '<p class="text-[11px] font-extrabold tabular-nums ' + runClass + '">Running Bal · ব্যালেন্স: ' + esc(formatINR(ent.runningBalance, true)) + "</p>" +
              "</div>" +
              '<div class="flex items-center gap-1.5 shrink-0">' +
                '<button type="button" data-kh-edit-entry="' + esc(ent.id) + '" aria-label="Edit entry" class="w-11 h-11 rounded-full bg-white dark:bg-[#221C2E] text-[#5B3FD0] dark:text-[#CBBBFF] border border-black/5 dark:border-white/10 inline-flex items-center justify-center text-xs font-extrabold">Edit</button>' +
                '<button type="button" data-kh-del-entry="' + esc(ent.id) + '" aria-label="Delete entry" class="w-11 h-11 rounded-full bg-[#FFD6D6]/80 dark:bg-[#3D212B] text-[#8E1B3B] dark:text-[#FDA4AF] inline-flex items-center justify-center text-xs font-extrabold">✕</button>' +
              "</div>" +
            "</div>"
          );
        }).join("");

        return (
          '<div class="pastel-stage3-card p-4 space-y-2.5">' +
            '<div class="flex items-center justify-between px-1">' +
              '<span class="text-xs font-extrabold text-[#804800] dark:text-[#FCD34D]">' + esc(g.label) + "</span>" +
              '<span class="text-[11px] font-bold text-[#5C506B] dark:text-[#C5B9DA]">' + g.items.length + " entry(ies)</span>" +
            "</div>" +
            '<div class="space-y-2">' + itemsHtml + "</div>" +
          "</div>"
        );
      }).join("");
    }

    container.innerHTML =
      '<div class="space-y-4 pb-24">' +
        '<!-- Party Ledger Top Card -->' +
        '<div class="pastel-stage3-card p-4 sm:p-5 space-y-4">' +
          '<div class="flex items-start justify-between gap-2">' +
            '<button type="button" id="khBackToHomeBtn" class="px-3.5 py-2 rounded-full bg-[var(--oneora-bg)] text-[#2B2236] dark:text-[#F5EEFF] text-xs font-extrabold min-h-[44px] inline-flex items-center gap-1.5">← Back · খাতা</button>' +
            '<div class="flex items-center gap-1.5">' +
              '<button type="button" id="khEditPartyBtn" class="px-3.5 py-2 rounded-full bg-[var(--oneora-bg)] text-[#2B2236] dark:text-[#F5EEFF] text-xs font-extrabold min-h-[44px]">Edit</button>' +
              '<button type="button" id="khDelPartyBtn" class="px-3.5 py-2 rounded-full bg-[#FFD6D6] dark:bg-[#3D212B] text-[#8E1B3B] dark:text-[#FDA4AF] text-xs font-extrabold min-h-[44px]">Delete</button>' +
            "</div>" +
          "</div>" +

          '<div class="flex flex-wrap items-center justify-between gap-3">' +
            '<div class="flex items-center gap-3 min-w-0">' +
              '<div class="w-12 h-12 rounded-[18px] bg-[#FFE7C2] dark:bg-[#3D2E1D] text-[#7C3E00] dark:text-[#FDE68A] font-extrabold text-base flex items-center justify-center shrink-0">' + esc(getInitials(party.name)) + "</div>" +
              '<div class="min-w-0">' +
                '<h3 class="text-lg font-extrabold text-[#2B2236] dark:text-[#F5EEFF] truncate">' + esc(party.name) + "</h3>" +
                '<p class="text-xs font-semibold text-[#5C506B] dark:text-[#C5B9DA] truncate">' + esc(party.phone || "No phone saved") + (party.note ? " · " + esc(party.note) : "") + "</p>" +
              "</div>" +
            "</div>" +
            '<div class="px-4 py-2.5 rounded-[20px] ' + balBadgeClass + '">' +
              '<p class="text-[11px] font-bold opacity-90">' + balHeading + "</p>" +
              '<p class="text-lg sm:text-xl font-extrabold tabular-nums">' + esc(formatINR(Math.abs(party.balance))) + "</p>" +
            "</div>" +
          "</div>" +

          '<div class="grid grid-cols-2 gap-2.5">' +
            '<button type="button" id="khLedgerReminderBtn" class="py-3 px-4 rounded-full bg-[#FFE7C2] dark:bg-[#3D2E1D] text-[#5C3400] dark:text-[#FDE68A] text-xs font-extrabold min-h-[44px]">Send Reminder · রিমাইন্ডার</button>' +
            '<button type="button" id="khLedgerStatementBtn" class="py-3 px-4 rounded-full bg-[#E4D9FF] dark:bg-[#2D2347] text-[#3E26A0] dark:text-[#E4D9FF] text-xs font-extrabold min-h-[44px]">PDF / Excel Statement</button>' +
          "</div>" +

          '<div class="grid grid-cols-2 gap-2.5 pt-1">' +
            '<button type="button" id="khLedgerGaveBtn" class="py-3.5 px-4 rounded-full bg-[#115E42] hover:bg-[#0D4A34] text-white text-xs sm:text-sm font-extrabold min-h-[48px] shadow-sm">+ You gave · দিলাম</button>' +
            '<button type="button" id="khLedgerGotBtn" class="py-3.5 px-4 rounded-full bg-[#9F1D3A] hover:bg-[#82152E] text-white text-xs sm:text-sm font-extrabold min-h-[48px] shadow-sm">+ You got · পেলাম</button>' +
          "</div>" +
        "</div>" +

        groupsHtml +
      "</div>";

    syncFab(true);

    // Bind Ledger events
    var backBtn = container.querySelector("#khBackToHomeBtn");
    var editPBtn = container.querySelector("#khEditPartyBtn");
    var delPBtn = container.querySelector("#khDelPartyBtn");
    var remBtn = container.querySelector("#khLedgerReminderBtn");
    var stmtBtn = container.querySelector("#khLedgerStatementBtn");
    var gaveBtn = container.querySelector("#khLedgerGaveBtn");
    var gotBtn = container.querySelector("#khLedgerGotBtn");

    if (backBtn) {
      backBtn.addEventListener("click", function() {
        state.view = "home";
        state.selectedPartyId = null;
        render(container);
      });
    }
    if (editPBtn) editPBtn.addEventListener("click", function() { openPartyModal(party); });
    if (delPBtn) delPBtn.addEventListener("click", function() { confirmDeleteParty(party); });
    if (remBtn) remBtn.addEventListener("click", function() { openReminderModal(party); });
    if (stmtBtn) stmtBtn.addEventListener("click", function() { openReportsModal(party); });
    if (gaveBtn) gaveBtn.addEventListener("click", function() { openEntryModal({ partyId: party.id, type: "gave" }); });
    if (gotBtn) gotBtn.addEventListener("click", function() { openEntryModal({ partyId: party.id, type: "got" }); });

    container.querySelectorAll("[data-kh-edit-entry]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var eid = btn.getAttribute("data-kh-edit-entry");
        var fresh = loadData();
        var ent = fresh.entries.find(function(x) { return x.id === eid; });
        if (ent) openEntryModal({ entry: ent });
      });
    });

    container.querySelectorAll("[data-kh-del-entry]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var eid = btn.getAttribute("data-kh-del-entry");
        var fresh = loadData();
        var target = fresh.entries.find(function(x) { return x.id === eid; });
        if (!target) return;
        var prev = JSON.parse(JSON.stringify(fresh));
        fresh.entries = fresh.entries.filter(function(x) { return x.id !== eid; });
        saveData(fresh);
        registerUndo("Entry deleted (" + formatINR(target.amount) + ")", prev);
        haptic(12);
        render(container);
      });
    });
  }

  /* -------------------- Public Mount & Lifecycle -------------------- */

  function render(container) {
    var root = container || document.getElementById("oneoraKhataRoot");
    if (!root) {
      syncFab(false);
      return;
    }
    if (isLocked()) {
      renderPinGate(root);
      return;
    }
    var data = loadData();
    if (state.view === "ledger" && state.selectedPartyId) {
      renderLedger(root, data);
    } else {
      state.view = "home";
      renderHome(root, data);
    }
  }

  function rerenderIfMounted() {
    var root = document.getElementById("oneoraKhataRoot");
    if (root) render(root);
    else syncFab(false);
  }

  function unmount() {
    syncFab(false);
  }

  function search(q) {
    var clean = String(q || "").trim().toLowerCase();
    if (!clean) return [];
    var data = loadData();
    var stats = computePartyStats(data);
    return stats.parties.filter(function(p) {
      return (p.name + " " + p.phone + " " + p.note).toLowerCase().indexOf(clean) !== -1;
    }).slice(0, 5).map(function(p) {
      return {
        id: p.id,
        title: p.name + " (" + formatINR(Math.abs(p.balance)) + ")",
        subtitle: "KHATA · " + (p.balance > 0 ? "Will get · পাবো" : p.balance < 0 ? "Will give · দেবো" : "Settled"),
        action: function() {
          state.view = "ledger";
          state.selectedPartyId = p.id;
          if (global.OneoraMoney && typeof global.OneoraMoney.openSubTab === "function") {
            global.OneoraMoney.openSubTab("khata");
          }
        }
      };
    });
  }

  // Hide FAB whenever user navigates away from Money section
  document.addEventListener("oneora:sectionchange", function(ev) {
    var sec = ev && ev.detail ? ev.detail.sectionId : "";
    if (sec !== "oneoraMoneyTab") {
      syncFab(false);
    } else {
      var root = document.getElementById("oneoraKhataRoot");
      if (root) syncFab(true);
    }
  });

  // Re-render if IndexedDB hydration restores Khata records on startup
  document.addEventListener("oneora:moneychange", function() {
    var root = document.getElementById("oneoraKhataRoot");
    var modalHost = document.getElementById(MODAL_HOST_ID);
    if (root && (!modalHost || !modalHost.innerHTML)) {
      // Avoid interrupting typing in search
      if (document.activeElement && document.activeElement.id === "khSearchInput") return;
      render(root);
    }
  });

  global.OneoraKhata = {
    render: render,
    unmount: unmount,
    search: search,
    getSummary: function() {
      return computePartyStats(loadData());
    },
    openParty: function(partyId) {
      state.view = "ledger";
      state.selectedPartyId = partyId;
      rerenderIfMounted();
    },
    openHome: function() {
      state.view = "home";
      state.selectedPartyId = null;
      rerenderIfMounted();
    }
  };
})(window);
