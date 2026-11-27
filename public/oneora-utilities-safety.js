(function (global) {
  "use strict";

  var STORAGE_KEY = "oneora_utilities_safety_v1";

  var state = {
    tab: "land_converter", // "land_converter" | "password_safety" | "speed_test"
    // Land Converter & Plot Area
    landRegion: "wb", // wb | assam | bihar | up | south
    landVal: "1",
    landUnit: "katha",
    plotShape: "irregular4", // rect | irregular4 | triangle
    plotUnit: "ft", // ft | m | haat
    sideN: "60",
    sideS: "60",
    sideE: "48",
    sideW: "48",
    triA: "50",
    triB: "60",
    triC: "70",
    ratePerUnit: "450000",
    rateUnit: "katha",
    savedLand: [],
    // Password & PIN Generator
    pwdMode: "password", // password | passphrase | pin
    pwdLength: 16,
    pwdUpper: true,
    pwdLower: true,
    pwdDigits: true,
    pwdSymbols: true,
    pwdNoAmbiguous: true,
    phraseWords: 4,
    phraseSep: "-",
    phraseNum: true,
    phraseCap: true,
    pinLength: 6,
    pinNoWeak: true,
    generatedPwd: "",
    pwdVariants: [],
    checkPwdInput: "",
    // Internet Speed Test
    speedRunning: false,
    speedStage: "idle", // idle | ping | download | upload | done | error
    speedProgress: 0,
    speedPing: null,
    speedJitter: null,
    speedDown: null,
    speedUp: null,
    speedNetType: "",
    speedError: "",
    speedHistory: [],
    // Shared Result Sheet
    resultSheet: null
  };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function uid(prefix) {
    return (prefix || "us") + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7);
  }

  function haptic(ms) {
    try {
      if (typeof global.oneoraHaptic === "function") global.oneoraHaptic(ms || 10);
      else if (navigator && typeof navigator.vibrate === "function") navigator.vibrate(ms || 10);
    } catch (e) {}
  }

  function toast(title, msg, type) {
    if (global.utils && typeof global.utils.showToast === "function") {
      global.utils.showToast(title, msg || "", type || "success");
    }
  }

  function fmtIn(num, maxDec) {
    if (!isFinite(num)) return "0";
    var d = typeof maxDec === "number" ? maxDec : 2;
    try {
      return Number(num).toLocaleString("en-IN", { maximumFractionDigits: d });
    } catch (e) {
      return Number(num).toFixed(d);
    }
  }

  function fmtInr(num) {
    if (!isFinite(num)) return "₹ 0";
    return "₹ " + fmtIn(Math.round(num), 0);
  }

  function copyText(text) {
    if (global.OneoraCapabilities && typeof global.OneoraCapabilities.copyText === "function") {
      return global.OneoraCapabilities.copyText(text);
    }
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      return navigator.clipboard.writeText(text).then(function () { return true; }).catch(function () { return false; });
    }
    try {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return Promise.resolve(true);
    } catch (e) {
      return Promise.resolve(false);
    }
  }

  function downloadTextFile(text, filename) {
    var blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    if (global.utils && typeof global.utils.downloadBlob === "function") {
      global.utils.downloadBlob(blob, filename);
      return;
    }
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  function shareText(title, text) {
    if (navigator && typeof navigator.share === "function") {
      navigator.share({ title: title, text: text }).catch(function () {});
      return;
    }
    copyText(text).then(function () {
      toast("Copied to Share", "Result copied — paste in WhatsApp, Notes or Email.", "info");
    });
  }

  function loadStorage() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var p = JSON.parse(raw);
      if (p && typeof p === "object") {
        if (p.landRegion && LAND_REGIONS[p.landRegion]) state.landRegion = p.landRegion;
        if (Array.isArray(p.savedLand)) state.savedLand = p.savedLand.slice(0, 15);
        if (Array.isArray(p.speedHistory)) state.speedHistory = p.speedHistory.slice(0, 10);
      }
    } catch (e) {}
  }

  function saveStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        landRegion: state.landRegion,
        savedLand: state.savedLand.slice(0, 15),
        speedHistory: state.speedHistory.slice(0, 10),
        updatedAt: Date.now()
      }));
      document.dispatchEvent(new CustomEvent("oneora:utilssafetychange"));
    } catch (e) {}
  }

  // =========================================================================
  // 1. INDIAN LAND CONVERTER & PLOT AREA CALCULATOR (SQ FT BASE)
  // =========================================================================
  var LAND_REGIONS = {
    wb: {
      name: "West Bengal · পশ্চিমবঙ্গ",
      note: "1 Bigha = 20 Katha = 14,400 sq ft · 1 Katha = 720 sq ft (16 Chhatak) · 1 Shatak = 435.6 sq ft",
      bighaSqft: 14400,
      kathaSqft: 720,
      subLabel: "Chhatak · ছটাক",
      subSqft: 45
    },
    assam: {
      name: "Assam & Tripura · আসাম",
      note: "1 Bigha = 5 Katha = 14,400 sq ft · 1 Katha = 2,880 sq ft · 1 Lessa = 144 sq ft",
      bighaSqft: 14400,
      kathaSqft: 2880,
      subLabel: "Lessa · লেছা",
      subSqft: 144
    },
    bihar: {
      name: "Bihar & Jharkhand · বিহার",
      note: "1 Bigha = 20 Katha = 27,220 sq ft · 1 Katha = 1,361 sq ft · 1 Dhur = 68.05 sq ft",
      bighaSqft: 27220,
      kathaSqft: 1361,
      subLabel: "Dhur · ধুর",
      subSqft: 68.05
    },
    up: {
      name: "UP & Rajasthan (Pucca) · উত্তরপ্রদেশ",
      note: "1 Pucca Bigha = 20 Biswa = 27,225 sq ft · 1 Biswa = 1,361.25 sq ft",
      bighaSqft: 27225,
      kathaSqft: 1361.25,
      subLabel: "Biswansi",
      subSqft: 68.0625
    },
    south: {
      name: "South & West India (Cent/Guntha)",
      note: "1 Acre = 100 Cent = 40 Guntha = 43,560 sq ft · 1 Ground = 2,400 sq ft",
      bighaSqft: 14400,
      kathaSqft: 1089, // Guntha
      subLabel: "Ground",
      subSqft: 2400
    }
  };

  function getLandUnits(regionKey) {
    var r = LAND_REGIONS[regionKey] || LAND_REGIONS.wb;
    return [
      { key: "sqft", label: "Sq. Feet · বর্গফুট", sqft: 1 },
      { key: "sqm", label: "Sq. Meter · বর্গমিটার", sqft: 10.7639104 },
      { key: "sqyd", label: "Sq. Yard / Gaj · গজ", sqft: 9 },
      { key: "decimal", label: "Shatak / Decimal / Cent · শতক", sqft: 435.6 },
      { key: "katha", label: regionKey === "up" ? "Biswa · বিসওয়া" : (regionKey === "south" ? "Guntha · গুন্ঠা" : "Katha · কাঠা"), sqft: r.kathaSqft },
      { key: "bigha", label: "Bigha · বিঘা", sqft: r.bighaSqft },
      { key: "sub", label: r.subLabel, sqft: r.subSqft },
      { key: "acre", label: "Acre · একর", sqft: 43560 },
      { key: "hectare", label: "Hectare · হেক্টর", sqft: 107639.104 }
    ];
  }

  function convertToSqft(val, unitKey, regionKey) {
    var units = getLandUnits(regionKey);
    var v = parseFloat(val);
    if (!isFinite(v) || v < 0) return 0;
    for (var i = 0; i < units.length; i++) {
      if (units[i].key === unitKey) return v * units[i].sqft;
    }
    return v;
  }

  function toFeetFactor(unit) {
    if (unit === "m") return 3.2808399;
    if (unit === "haat") return 1.5; // 1 Bengali Haat = 18 inches = 1.5 ft
    return 1;
  }

  function computePlotArea() {
    var f = toFeetFactor(state.plotUnit);
    var areaSqft = 0;
    var perimeterFt = 0;
    var valid = true;
    var formulaText = "";

    if (state.plotShape === "rect") {
      var l = Math.max(0, parseFloat(state.sideN) || 0) * f;
      var w = Math.max(0, parseFloat(state.sideE) || 0) * f;
      areaSqft = l * w;
      perimeterFt = 2 * (l + w);
      formulaText = "Length × Width";
    } else if (state.plotShape === "irregular4") {
      var n = Math.max(0, parseFloat(state.sideN) || 0) * f;
      var s = Math.max(0, parseFloat(state.sideS) || 0) * f;
      var e = Math.max(0, parseFloat(state.sideE) || 0) * f;
      var w2 = Math.max(0, parseFloat(state.sideW) || 0) * f;
      areaSqft = ((n + s) / 2) * ((e + w2) / 2);
      perimeterFt = n + s + e + w2;
      formulaText = "((North + South) ÷ 2) × ((East + West) ÷ 2)";
    } else {
      var a = Math.max(0, parseFloat(state.triA) || 0) * f;
      var b = Math.max(0, parseFloat(state.triB) || 0) * f;
      var c = Math.max(0, parseFloat(state.triC) || 0) * f;
      var sp = (a + b + c) / 2;
      var inner = sp * (sp - a) * (sp - b) * (sp - c);
      if (a > 0 && b > 0 && c > 0 && inner > 0) {
        areaSqft = Math.sqrt(inner);
        perimeterFt = a + b + c;
      } else {
        valid = false;
      }
      formulaText = "Heron's Formula √(s(s−a)(s−b)(s−c))";
    }

    var reg = LAND_REGIONS[state.landRegion] || LAND_REGIONS.wb;
    var katha = areaSqft / reg.kathaSqft;
    var decimal = areaSqft / 435.6;
    var bigha = areaSqft / reg.bighaSqft;
    var rate = Math.max(0, parseFloat(state.ratePerUnit) || 0);
    var totalPrice = 0;
    if (rate > 0) {
      if (state.rateUnit === "katha") totalPrice = katha * rate;
      else if (state.rateUnit === "decimal") totalPrice = decimal * rate;
      else if (state.rateUnit === "bigha") totalPrice = bigha * rate;
      else totalPrice = areaSqft * rate;
    }

    return {
      valid: valid,
      areaSqft: areaSqft,
      areaSqm: areaSqft / 10.7639104,
      katha: katha,
      decimal: decimal,
      bigha: bigha,
      acre: areaSqft / 43560,
      perimeterFt: perimeterFt,
      totalPrice: totalPrice,
      formulaText: formulaText
    };
  }

  // =========================================================================
  // 2. CRYPTOGRAPHIC PASSWORD, PASSPHRASE & PIN GENERATOR
  // =========================================================================
  var WORD_LIST = [
    "River", "Lotus", "Mango", "Tiger", "Cloud", "Pearl", "Cedar", "Flame",
    "Stone", "Amber", "Spark", "Breeze", "Coral", "Orbit", "Maple", "Prism",
    "Delta", "Crown", "Falcon", "Olive", "Solar", "Frost", "Silver", "Bridge",
    "Summit", "Harbor", "Meadow", "Canyon", "Comet", "Velvet", "Saffron", "Banyan",
    "Monsoon", "Kaveri", "Ganga", "Himalaya", "Peacock", "Jasmine", "Sandal", "Emerald",
    "Anchor", "Beacon", "Cipher", "Signal", "Shield", "Vault", "Horizon", "Compass",
    "Quartz", "Timber", "Pebble", "Lantern", "Orchard", "Voyage", "Cactus", "Granite",
    "Willow", "Nebula", "Zephyr", "Topaz", "Marigold", "Bamboo", "Tulip", "Glacier"
  ];

  function secureRandInt(max) {
    if (max <= 1) return 0;
    try {
      if (global.crypto && typeof global.crypto.getRandomValues === "function") {
        var arr = new Uint32Array(1);
        var limit = Math.floor(0x100000000 / max) * max;
        var val = 0;
        do {
          global.crypto.getRandomValues(arr);
          val = arr[0];
        } while (val >= limit);
        return val % max;
      }
    } catch (e) {}
    return Math.floor(Math.random() * max);
  }

  function shuffleArray(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = secureRandInt(i + 1);
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function generateSingleSecret() {
    if (state.pwdMode === "pin") {
      var len = Math.max(4, Math.min(12, parseInt(state.pinLength, 10) || 6));
      for (var tries = 0; tries < 25; tries++) {
        var pin = "";
        for (var i = 0; i < len; i++) pin += String(secureRandInt(10));
        if (!state.pinNoWeak) return pin;
        var allSame = /^(\d)\1+$/.test(pin);
        var seqUp = "01234567890123".indexOf(pin) !== -1;
        var seqDown = "98765432109876".indexOf(pin) !== -1;
        if (!allSame && !seqUp && !seqDown) return pin;
      }
      return "482917".slice(0, len);
    }

    if (state.pwdMode === "passphrase") {
      var count = Math.max(3, Math.min(6, parseInt(state.phraseWords, 10) || 4));
      var parts = [];
      for (var w = 0; w < count; w++) {
        var word = WORD_LIST[secureRandInt(WORD_LIST.length)];
        parts.push(state.phraseCap ? word : word.toLowerCase());
      }
      if (state.phraseNum) {
        var pos = secureRandInt(parts.length);
        parts[pos] = parts[pos] + String(10 + secureRandInt(90));
      }
      return parts.join(state.phraseSep || "-");
    }

    // Standard Strong Password
    var upper = state.pwdNoAmbiguous ? "ABCDEFGHJKLMNPQRSTUVWXYZ" : "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var lower = state.pwdNoAmbiguous ? "abcdefghijkmnopqrstuvwxyz" : "abcdefghijklmnopqrstuvwxyz";
    var digits = state.pwdNoAmbiguous ? "23456789" : "0123456789";
    var symbols = "!@#$%^&*()-_=+[]{}?/";

    var pools = [];
    if (state.pwdUpper) pools.push(upper);
    if (state.pwdLower) pools.push(lower);
    if (state.pwdDigits) pools.push(digits);
    if (state.pwdSymbols) pools.push(symbols);
    if (!pools.length) pools.push(lower, digits);

    var targetLen = Math.max(8, Math.min(64, parseInt(state.pwdLength, 10) || 16));
    var chars = [];
    var combined = "";
    for (var p = 0; p < pools.length; p++) {
      combined += pools[p];
      if (chars.length < targetLen) {
        chars.push(pools[p].charAt(secureRandInt(pools[p].length)));
      }
    }
    while (chars.length < targetLen) {
      chars.push(combined.charAt(secureRandInt(combined.length)));
    }
    return shuffleArray(chars).join("");
  }

  function refreshGeneratedPasswords() {
    state.generatedPwd = generateSingleSecret();
    var variants = [];
    for (var i = 0; i < 4; i++) {
      variants.push(generateSingleSecret());
    }
    state.pwdVariants = variants;
  }

  function evaluateStrength(secret) {
    var s = String(secret || "");
    if (!s) return { bits: 0, label: "Empty", pct: 0, color: "#94A3B8", crack: "—" };
    var pool = 0;
    if (/[a-z]/.test(s)) pool += 26;
    if (/[A-Z]/.test(s)) pool += 26;
    if (/[0-9]/.test(s)) pool += 10;
    if (/[^A-Za-z0-9]/.test(s)) pool += 32;
    var bits = Math.round(s.length * (pool > 0 ? Math.log(pool) / Math.LN2 : 0));
    if (bits < 28) return { bits: bits, label: "Weak · দুর্বল", pct: 25, color: "#E11D48", crack: "Seconds – Minutes" };
    if (bits < 50) return { bits: bits, label: "Fair · মাঝারি", pct: 52, color: "#D97706", crack: "Hours – Days" };
    if (bits < 75) return { bits: bits, label: "Strong · শক্তিশালী", pct: 80, color: "#059669", crack: "Years – Centuries" };
    return { bits: bits, label: "Fortress · অতি সুরক্ষিত", pct: 100, color: "#5B3FD0", crack: "Millions of Years" };
  }

  // =========================================================================
  // 3. REAL INTERNET SPEED TEST (PING, JITTER, DOWNLOAD & UPLOAD)
  // =========================================================================
  function getConnectionLabel() {
    try {
      var c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (!c) return "";
      var parts = [];
      if (c.effectiveType) parts.push(String(c.effectiveType).toUpperCase());
      if (typeof c.downlink === "number" && c.downlink > 0) parts.push("Link ~" + c.downlink + " Mbps");
      return parts.join(" · ");
    } catch (e) {
      return "";
    }
  }

  function getSpeedVerdict(downMbps, pingMs) {
    if (downMbps == null) return "Run test to inspect streaming & video-call readiness.";
    if (downMbps >= 50 && pingMs <= 60) return "Ultra Fast · 4K streaming, HD calls & low-latency gaming ready.";
    if (downMbps >= 20) return "Fast · Smooth Full-HD streaming, Zoom/Meet & large downloads.";
    if (downMbps >= 5) return "Good · Ready for HD YouTube, WhatsApp video calls & browsing.";
    return "Basic · Suitable for WhatsApp chat, UPI payments & light browsing.";
  }

  function runSpeedTest(root) {
    if (state.speedRunning) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      state.speedError = "You are offline · ইন্টারনেট সংযোগ নেই। Connect to Wi-Fi or Mobile Data and retry.";
      state.speedStage = "error";
      render(root);
      return;
    }

    state.speedRunning = true;
    state.speedError = "";
    state.speedStage = "ping";
    state.speedProgress = 12;
    state.speedPing = null;
    state.speedJitter = null;
    state.speedDown = null;
    state.speedUp = null;
    state.speedNetType = getConnectionLabel();
    render(root);

    var pings = [];
    function probePing(idx) {
      if (idx >= 5) {
        var sum = 0;
        for (var i = 0; i < pings.length; i++) sum += pings[i];
        var avgPing = pings.length ? Math.round(sum / pings.length) : 0;
        var diffSum = 0;
        for (var j = 1; j < pings.length; j++) diffSum += Math.abs(pings[j] - pings[j - 1]);
        var jitter = pings.length > 1 ? Math.round(diffSum / (pings.length - 1)) : 0;
        state.speedPing = avgPing;
        state.speedJitter = jitter;
        state.speedStage = "download";
        state.speedProgress = 40;
        render(root);
        return measureDownload();
      }
      var t0 = performance.now();
      return fetch("/api/speedtest/ping?t=" + Date.now() + "_" + idx, { cache: "no-store" })
        .then(function (r) {
          if (!r.ok) throw new Error("Ping HTTP " + r.status);
          return r.text();
        })
        .then(function () {
          pings.push(Math.max(1, performance.now() - t0));
          state.speedProgress = 12 + idx * 5;
          return probePing(idx + 1);
        });
    }

    function measureDownload() {
      var dlBytes = 1024 * 1024; // 1 MB payload
      var t0 = performance.now();
      return fetch("/api/speedtest/download?bytes=" + dlBytes + "&t=" + Date.now(), { cache: "no-store" })
        .then(function (r) {
          if (!r.ok) throw new Error("Download HTTP " + r.status);
          return r.arrayBuffer();
        })
        .then(function (buf) {
          var sec = Math.max(0.01, (performance.now() - t0) / 1000);
          var mbps = (buf.byteLength * 8) / sec / 1000000;
          state.speedDown = Math.round(mbps * 100) / 100;
          state.speedStage = "upload";
          state.speedProgress = 72;
          render(root);
          return measureUpload();
        });
    }

    function measureUpload() {
      var upSize = 512 * 1024; // 512 KB binary upload
      var payload = new Uint8Array(upSize);
      for (var i = 0; i < upSize; i += 257) payload[i] = (i * 31) & 255;
      var t0 = performance.now();
      return fetch("/api/speedtest/upload?t=" + Date.now(), {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/octet-stream" },
        body: payload
      })
        .then(function (r) {
          if (!r.ok) throw new Error("Upload HTTP " + r.status);
          return r.json();
        })
        .then(function () {
          var sec = Math.max(0.01, (performance.now() - t0) / 1000);
          var upMbps = (upSize * 8) / sec / 1000000;
          state.speedUp = Math.round(upMbps * 100) / 100;
          state.speedStage = "done";
          state.speedProgress = 100;
          state.speedRunning = false;

          state.speedHistory.unshift({
            id: uid("spd"),
            ping: state.speedPing,
            jitter: state.speedJitter,
            down: state.speedDown,
            up: state.speedUp,
            net: state.speedNetType || "Network",
            at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " · " + new Date().toLocaleDateString()
          });
          if (state.speedHistory.length > 10) state.speedHistory = state.speedHistory.slice(0, 10);
          saveStorage();
          render(root);
          toast("Speed Test Done", "Down: " + state.speedDown + " Mbps · Up: " + state.speedUp + " Mbps");
        });
    }

    probePing(0).catch(function (err) {
      state.speedRunning = false;
      state.speedStage = "error";
      state.speedProgress = 0;
      state.speedError = !navigator.onLine
        ? "Offline — connect to Wi-Fi or Mobile Data to run the speed test."
        : "Could not complete speed test (" + (err && err.message ? err.message : "network error") + ").";
      render(root);
    });
  }

  // =========================================================================
  // 4. UI RENDERERS (DESIGN A · PASTEL SYSTEM)
  // =========================================================================
  function renderResultSheet() {
    if (!state.resultSheet) return "";
    var r = state.resultSheet;
    return (
      '<div class="fixed inset-0 z-[90] bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-3">' +
        '<div class="w-full max-w-lg rounded-[26px] bg-[#FFF7EE] dark:bg-[#1D1729] border border-black/10 dark:border-white/15 p-5 shadow-2xl space-y-4">' +
          '<div class="flex items-start justify-between gap-3">' +
            '<div>' +
              '<p class="text-[11px] font-extrabold uppercase tracking-wider text-[#5B3FD0] dark:text-[#C8B9FF]">ONEORA Result</p>' +
              '<h3 class="text-lg font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">' + esc(r.title) + '</h3>' +
              '<p class="text-xs text-[#6B5E7B] dark:text-[#B9AEC9]">' + esc(r.subtitle || "") + '</p>' +
            '</div>' +
            '<button type="button" data-us-act="closeSheet" class="min-w-[44px] min-h-[44px] rounded-2xl bg-black/5 dark:bg-white/10 text-[#2B2236] dark:text-[#F5EEFF] font-extrabold text-sm">✕</button>' +
          '</div>' +
          '<textarea readonly rows="7" class="w-full rounded-2xl p-3.5 bg-white dark:bg-[#14101D] border border-black/10 dark:border-white/15 text-xs sm:text-sm text-[#2B2236] dark:text-[#F5EEFF] font-mono leading-relaxed">' + esc(r.text) + '</textarea>' +
          '<div class="grid grid-cols-3 gap-2">' +
            '<button type="button" data-us-act="sheetCopy" class="min-h-[44px] rounded-2xl bg-[#5B3FD0] text-white text-xs font-extrabold">Copy</button>' +
            '<button type="button" data-us-act="sheetShare" class="min-h-[44px] rounded-2xl bg-[#CFF3E2] dark:bg-[#1B362E] text-[#115E42] dark:text-[#A7F3D0] text-xs font-extrabold">Share</button>' +
            '<button type="button" data-us-act="sheetDownload" class="min-h-[44px] rounded-2xl bg-[#E4D9FF] dark:bg-[#2D2347] text-[#3E26A0] dark:text-[#E4D9FF] text-xs font-extrabold">.TXT</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function renderLandTab() {
    var reg = LAND_REGIONS[state.landRegion] || LAND_REGIONS.wb;
    var units = getLandUnits(state.landRegion);
    var baseSqft = convertToSqft(state.landVal, state.landUnit, state.landRegion);
    var plot = computePlotArea();

    var unitRows = "";
    for (var i = 0; i < units.length; i++) {
      var u = units[i];
      var converted = baseSqft / u.sqft;
      var isSrc = u.key === state.landUnit;
      unitRows +=
        '<div class="rounded-[18px] p-3 border ' +
          (isSrc ? "bg-[#FFE7C2]/70 dark:bg-[#3D2E1D] border-[#9A5B00]/30" : "bg-[#FFF7EE] dark:bg-[#17131F] border-black/5 dark:border-white/10") + '">' +
          '<p class="text-[11px] font-bold text-[#6B5E7B] dark:text-[#B9AEC9]">' + esc(u.label) + '</p>' +
          '<p class="text-base font-extrabold text-[#2B2236] dark:text-[#F5EEFF] tabular-nums mt-0.5">' + esc(fmtIn(converted, converted < 10 ? 4 : 2)) + '</p>' +
        '</div>';
    }

    var shapeInputs = "";
    if (state.plotShape === "rect") {
      shapeInputs =
        '<div class="grid grid-cols-2 gap-2.5">' +
          '<div><label class="block text-[11px] font-bold text-[#6B5E7B] dark:text-[#B9AEC9] mb-1">Length · দৈর্ঘ্য</label>' +
          '<input type="number" step="any" id="usSideN" value="' + esc(state.sideN) + '" class="w-full min-h-[44px] px-3 rounded-xl bg-[#FFF7EE] dark:bg-[#17131F] border border-black/10 dark:border-white/15 text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]" /></div>' +
          '<div><label class="block text-[11px] font-bold text-[#6B5E7B] dark:text-[#B9AEC9] mb-1">Width · প্রস্থ</label>' +
          '<input type="number" step="any" id="usSideE" value="' + esc(state.sideE) + '" class="w-full min-h-[44px] px-3 rounded-xl bg-[#FFF7EE] dark:bg-[#17131F] border border-black/10 dark:border-white/15 text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]" /></div>' +
        '</div>';
    } else if (state.plotShape === "irregular4") {
      shapeInputs =
        '<div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">' +
          '<div><label class="block text-[11px] font-bold text-[#6B5E7B] dark:text-[#B9AEC9] mb-1">North · উত্তর</label>' +
          '<input type="number" step="any" id="usSideN" value="' + esc(state.sideN) + '" class="w-full min-h-[44px] px-3 rounded-xl bg-[#FFF7EE] dark:bg-[#17131F] border border-black/10 dark:border-white/15 text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]" /></div>' +
          '<div><label class="block text-[11px] font-bold text-[#6B5E7B] dark:text-[#B9AEC9] mb-1">South · দক্ষিণ</label>' +
          '<input type="number" step="any" id="usSideS" value="' + esc(state.sideS) + '" class="w-full min-h-[44px] px-3 rounded-xl bg-[#FFF7EE] dark:bg-[#17131F] border border-black/10 dark:border-white/15 text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]" /></div>' +
          '<div><label class="block text-[11px] font-bold text-[#6B5E7B] dark:text-[#B9AEC9] mb-1">East · পূর্ব</label>' +
          '<input type="number" step="any" id="usSideE" value="' + esc(state.sideE) + '" class="w-full min-h-[44px] px-3 rounded-xl bg-[#FFF7EE] dark:bg-[#17131F] border border-black/10 dark:border-white/15 text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]" /></div>' +
          '<div><label class="block text-[11px] font-bold text-[#6B5E7B] dark:text-[#B9AEC9] mb-1">West · পশ্চিম</label>' +
          '<input type="number" step="any" id="usSideW" value="' + esc(state.sideW) + '" class="w-full min-h-[44px] px-3 rounded-xl bg-[#FFF7EE] dark:bg-[#17131F] border border-black/10 dark:border-white/15 text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]" /></div>' +
        '</div>';
    } else {
      shapeInputs =
        '<div class="grid grid-cols-3 gap-2.5">' +
          '<div><label class="block text-[11px] font-bold text-[#6B5E7B] dark:text-[#B9AEC9] mb-1">Side A</label>' +
          '<input type="number" step="any" id="usTriA" value="' + esc(state.triA) + '" class="w-full min-h-[44px] px-3 rounded-xl bg-[#FFF7EE] dark:bg-[#17131F] border border-black/10 dark:border-white/15 text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]" /></div>' +
          '<div><label class="block text-[11px] font-bold text-[#6B5E7B] dark:text-[#B9AEC9] mb-1">Side B</label>' +
          '<input type="number" step="any" id="usTriB" value="' + esc(state.triB) + '" class="w-full min-h-[44px] px-3 rounded-xl bg-[#FFF7EE] dark:bg-[#17131F] border border-black/10 dark:border-white/15 text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]" /></div>' +
          '<div><label class="block text-[11px] font-bold text-[#6B5E7B] dark:text-[#B9AEC9] mb-1">Side C</label>' +
          '<input type="number" step="any" id="usTriC" value="' + esc(state.triC) + '" class="w-full min-h-[44px] px-3 rounded-xl bg-[#FFF7EE] dark:bg-[#17131F] border border-black/10 dark:border-white/15 text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]" /></div>' +
        '</div>';
    }

    var savedHtml = "";
    if (state.savedLand.length) {
      savedHtml = '<div class="space-y-2"><h3 class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">Saved Plot Measurements · সংরক্ষিত মাপ</h3><div class="space-y-2">';
      for (var j = 0; j < state.savedLand.length; j++) {
        var sl = state.savedLand[j];
        savedHtml +=
          '<div class="rounded-[18px] p-3 bg-white dark:bg-[#221C2E] border border-black/10 dark:border-white/10 flex items-center justify-between gap-2">' +
            '<div class="min-w-0 flex-1">' +
              '<p class="text-xs font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">' + esc(sl.title) + '</p>' +
              '<p class="text-[11px] text-[#6B5E7B] dark:text-[#B9AEC9]">' + esc(sl.summary) + '</p>' +
            '</div>' +
            '<button type="button" data-us-act="delSavedLand" data-id="' + esc(sl.id) + '" class="min-w-[40px] min-h-[40px] rounded-xl bg-[#FFD6D6] dark:bg-[#3D212B] text-[#8E1B3B] dark:text-[#FDA4AF] text-xs font-extrabold">✕</button>' +
          '</div>';
      }
      savedHtml += '</div></div>';
    }

    return (
      '<div class="space-y-4">' +
        // State Standard Selector
        '<div class="rounded-[24px] p-4 bg-[#FFE7C2]/70 dark:bg-[#3D2E1D]/80 border border-black/5 dark:border-white/10 space-y-2.5">' +
          '<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">' +
            '<div>' +
              '<p class="text-[11px] font-extrabold uppercase tracking-wider text-[#804900] dark:text-[#FDE68A]">State Land Standard · আঞ্চলিক মাপ</p>' +
              '<p class="text-xs font-semibold text-[#4A2D00] dark:text-[#FDE68A]/90 mt-0.5">' + esc(reg.note) + '</p>' +
            '</div>' +
            '<select id="usLandRegion" class="min-h-[44px] px-3 rounded-xl bg-white dark:bg-[#221C2E] border border-black/10 dark:border-white/15 text-xs font-extrabold text-[#2B2236] dark:text-[#F5EEFF] shrink-0">' +
              Object.keys(LAND_REGIONS).map(function (k) {
                return '<option value="' + k + '"' + (k === state.landRegion ? " selected" : "") + '>' + esc(LAND_REGIONS[k].name) + '</option>';
              }).join("") +
            '</select>' +
          '</div>' +
        '</div>' +

        // Instant Multi-Unit Converter
        '<div class="rounded-[24px] p-4 bg-white dark:bg-[#221C2E] border border-black/10 dark:border-white/10 space-y-3">' +
          '<h3 class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">Instant Land Unit Converter · জমি রূপান্তর</h3>' +
          '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">' +
            '<input type="number" step="any" id="usLandVal" value="' + esc(state.landVal) + '" placeholder="Enter area..." class="w-full min-h-[46px] px-3.5 rounded-2xl bg-[#FFF7EE] dark:bg-[#17131F] border border-black/10 dark:border-white/15 text-base font-extrabold text-[#2B2236] dark:text-[#F5EEFF]" />' +
            '<select id="usLandUnit" class="w-full min-h-[46px] px-3.5 rounded-2xl bg-[#FFF7EE] dark:bg-[#17131F] border border-black/10 dark:border-white/15 text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">' +
              units.map(function (u) {
                return '<option value="' + u.key + '"' + (u.key === state.landUnit ? " selected" : "") + '>' + esc(u.label) + '</option>';
              }).join("") +
            '</select>' +
          '</div>' +
          '<div id="usLandConvGrid" class="grid grid-cols-2 sm:grid-cols-3 gap-2">' + unitRows + '</div>' +
        '</div>' +

        // Plot Area & Valuation Calculator
        '<div class="rounded-[24px] p-4 bg-white dark:bg-[#221C2E] border border-black/10 dark:border-white/10 space-y-3">' +
          '<div class="flex flex-wrap items-center justify-between gap-2">' +
            '<div>' +
              '<p class="text-[11px] font-extrabold uppercase tracking-wider text-[#5B3FD0] dark:text-[#C8B9FF]">Amin / Plot Measurement · জমির ক্ষেত্রফল</p>' +
              '<h3 class="text-base font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">Plot Area &amp; Price Calculator</h3>' +
            '</div>' +
            '<select id="usPlotUnit" class="min-h-[40px] px-3 rounded-xl bg-[#FFF7EE] dark:bg-[#17131F] border border-black/10 dark:border-white/15 text-xs font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">' +
              '<option value="ft"' + (state.plotUnit === "ft" ? " selected" : "") + '>Feet · ফুট</option>' +
              '<option value="m"' + (state.plotUnit === "m" ? " selected" : "") + '>Meters · মিটার</option>' +
              '<option value="haat"' + (state.plotUnit === "haat" ? " selected" : "") + '>Haat · হাত (1.5 ft)</option>' +
            '</select>' +
          '</div>' +
          '<div class="grid grid-cols-3 gap-1.5">' +
            '<button type="button" data-us-act="setShape" data-shape="irregular4" class="min-h-[42px] px-2 rounded-xl text-xs font-extrabold ' + (state.plotShape === "irregular4" ? "bg-[#5B3FD0] text-white" : "bg-[#FFF7EE] dark:bg-[#17131F] text-[#2B2236] dark:text-[#F5EEFF]") + '">4-Side Plot</button>' +
            '<button type="button" data-us-act="setShape" data-shape="rect" class="min-h-[42px] px-2 rounded-xl text-xs font-extrabold ' + (state.plotShape === "rect" ? "bg-[#5B3FD0] text-white" : "bg-[#FFF7EE] dark:bg-[#17131F] text-[#2B2236] dark:text-[#F5EEFF]") + '">Rectangle</button>' +
            '<button type="button" data-us-act="setShape" data-shape="triangle" class="min-h-[42px] px-2 rounded-xl text-xs font-extrabold ' + (state.plotShape === "triangle" ? "bg-[#5B3FD0] text-white" : "bg-[#FFF7EE] dark:bg-[#17131F] text-[#2B2236] dark:text-[#F5EEFF]") + '">Triangle</button>' +
          '</div>' +
          shapeInputs +
          '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">' +
            '<div>' +
              '<label class="block text-[11px] font-bold text-[#6B5E7B] dark:text-[#B9AEC9] mb-1">Land Rate (₹) · জমির দর (ঐচ্ছিক)</label>' +
              '<input type="number" step="any" id="usLandRate" value="' + esc(state.ratePerUnit) + '" placeholder="e.g. 450000" class="w-full min-h-[44px] px-3 rounded-xl bg-[#FFF7EE] dark:bg-[#17131F] border border-black/10 dark:border-white/15 text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]" />' +
            '</div>' +
            '<div>' +
              '<label class="block text-[11px] font-bold text-[#6B5E7B] dark:text-[#B9AEC9] mb-1">Rate Per · প্রতি একক</label>' +
              '<select id="usRateUnit" class="w-full min-h-[44px] px-3 rounded-xl bg-[#FFF7EE] dark:bg-[#17131F] border border-black/10 dark:border-white/15 text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">' +
                '<option value="katha"' + (state.rateUnit === "katha" ? " selected" : "") + '>Per Katha · কাঠা প্রতি</option>' +
                '<option value="decimal"' + (state.rateUnit === "decimal" ? " selected" : "") + '>Per Shatak / Decimal · শতক প্রতি</option>' +
                '<option value="sqft"' + (state.rateUnit === "sqft" ? " selected" : "") + '>Per Sq. Ft · বর্গফুট প্রতি</option>' +
                '<option value="bigha"' + (state.rateUnit === "bigha" ? " selected" : "") + '>Per Bigha · বিঘা প্রতি</option>' +
              '</select>' +
            '</div>' +
          '</div>' +

          // Live Plot Results
          '<div id="usPlotResultBox" class="rounded-[22px] p-4 bg-[#CFF3E2]/70 dark:bg-[#1B362E]/80 space-y-2.5">' +
            (!plot.valid
              ? '<p class="text-xs font-extrabold text-[#8E1B3B] dark:text-[#FDA4AF]">Invalid triangle sides: sum of any two sides must be greater than the third side.</p>'
              : (
                '<div class="grid grid-cols-2 sm:grid-cols-4 gap-2">' +
                  '<div><span class="text-[10px] font-bold uppercase text-[#115E42] dark:text-[#A7F3D0]">Sq. Feet</span><p class="text-base font-extrabold text-[#113D2C] dark:text-[#F5EEFF] tabular-nums">' + esc(fmtIn(plot.areaSqft, 1)) + '</p></div>' +
                  '<div><span class="text-[10px] font-bold uppercase text-[#115E42] dark:text-[#A7F3D0]">Katha · কাঠা</span><p class="text-base font-extrabold text-[#113D2C] dark:text-[#F5EEFF] tabular-nums">' + esc(fmtIn(plot.katha, 3)) + '</p></div>' +
                  '<div><span class="text-[10px] font-bold uppercase text-[#115E42] dark:text-[#A7F3D0]">Shatak · শতক</span><p class="text-base font-extrabold text-[#113D2C] dark:text-[#F5EEFF] tabular-nums">' + esc(fmtIn(plot.decimal, 3)) + '</p></div>' +
                  '<div><span class="text-[10px] font-bold uppercase text-[#115E42] dark:text-[#A7F3D0]">Bigha · বিঘা</span><p class="text-base font-extrabold text-[#113D2C] dark:text-[#F5EEFF] tabular-nums">' + esc(fmtIn(plot.bigha, 4)) + '</p></div>' +
                '</div>' +
                '<div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-black/10 dark:border-white/15">' +
                  '<span class="text-xs font-bold text-[#115E42] dark:text-[#A7F3D0]">Perimeter: ' + esc(fmtIn(plot.perimeterFt, 1)) + ' ft · ' + esc(plot.formulaText) + '</span>' +
                  (plot.totalPrice > 0 ? '<span class="text-sm font-extrabold text-[#5B3FD0] dark:text-[#E4D9FF]">Est. Value: ' + esc(fmtInr(plot.totalPrice)) + '</span>' : '') +
                '</div>'
              )) +
          '</div>' +
          '<div class="grid grid-cols-3 gap-2">' +
            '<button type="button" data-us-act="saveLand" class="min-h-[44px] rounded-2xl bg-[#5B3FD0] text-white text-xs font-extrabold">Save · সেভ</button>' +
            '<button type="button" data-us-act="shareLand" class="min-h-[44px] rounded-2xl bg-[#CFF3E2] dark:bg-[#1B362E] text-[#115E42] dark:text-[#A7F3D0] text-xs font-extrabold">Share</button>' +
            '<button type="button" data-us-act="exportLandSheet" class="min-h-[44px] rounded-2xl bg-[#E4D9FF] dark:bg-[#2D2347] text-[#3E26A0] dark:text-[#E4D9FF] text-xs font-extrabold">Summary</button>' +
          '</div>' +
        '</div>' +
        savedHtml +
      '</div>'
    );
  }

  function renderPasswordTab() {
    if (!state.generatedPwd) refreshGeneratedPasswords();
    var str = evaluateStrength(state.generatedPwd);
    var chkStr = state.checkPwdInput ? evaluateStrength(state.checkPwdInput) : null;

    var optionsHtml = "";
    if (state.pwdMode === "password") {
      optionsHtml =
        '<div class="space-y-3">' +
          '<div class="flex items-center justify-between">' +
            '<label class="text-xs font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">Length · দৈর্ঘ্য: <span class="text-[#5B3FD0] dark:text-[#C8B9FF]">' + state.pwdLength + '</span></label>' +
            '<span class="text-[11px] font-bold text-[#6B5E7B] dark:text-[#B9AEC9]">8 – 64 chars</span>' +
          '</div>' +
          '<input type="range" id="usPwdLen" min="8" max="64" value="' + state.pwdLength + '" class="w-full accent-[#5B3FD0]" />' +
          '<div class="grid grid-cols-2 sm:grid-cols-3 gap-2">' +
            '<label class="flex items-center gap-2 text-xs font-bold p-2.5 rounded-xl bg-[#FFF7EE] dark:bg-[#17131F] min-h-[44px] cursor-pointer"><input type="checkbox" data-pwd-opt="pwdUpper" ' + (state.pwdUpper ? "checked" : "") + ' class="w-4 h-4 accent-[#5B3FD0]" /> A–Z Uppercase</label>' +
            '<label class="flex items-center gap-2 text-xs font-bold p-2.5 rounded-xl bg-[#FFF7EE] dark:bg-[#17131F] min-h-[44px] cursor-pointer"><input type="checkbox" data-pwd-opt="pwdLower" ' + (state.pwdLower ? "checked" : "") + ' class="w-4 h-4 accent-[#5B3FD0]" /> a–z Lowercase</label>' +
            '<label class="flex items-center gap-2 text-xs font-bold p-2.5 rounded-xl bg-[#FFF7EE] dark:bg-[#17131F] min-h-[44px] cursor-pointer"><input type="checkbox" data-pwd-opt="pwdDigits" ' + (state.pwdDigits ? "checked" : "") + ' class="w-4 h-4 accent-[#5B3FD0]" /> 0–9 Numbers</label>' +
            '<label class="flex items-center gap-2 text-xs font-bold p-2.5 rounded-xl bg-[#FFF7EE] dark:bg-[#17131F] min-h-[44px] cursor-pointer"><input type="checkbox" data-pwd-opt="pwdSymbols" ' + (state.pwdSymbols ? "checked" : "") + ' class="w-4 h-4 accent-[#5B3FD0]" /> !@# Symbols</label>' +
            '<label class="flex items-center gap-2 text-xs font-bold p-2.5 rounded-xl bg-[#FFF7EE] dark:bg-[#17131F] min-h-[44px] cursor-pointer col-span-2 sm:col-span-2"><input type="checkbox" data-pwd-opt="pwdNoAmbiguous" ' + (state.pwdNoAmbiguous ? "checked" : "") + ' class="w-4 h-4 accent-[#5B3FD0]" /> Avoid look-alikes (O/0, I/l/1)</label>' +
          '</div>' +
        '</div>';
    } else if (state.pwdMode === "passphrase") {
      optionsHtml =
        '<div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">' +
          '<div><label class="block text-[11px] font-bold text-[#6B5E7B] dark:text-[#B9AEC9] mb-1">Words · শব্দ সংখ্যা</label>' +
          '<select id="usPhraseWords" class="w-full min-h-[44px] px-3 rounded-xl bg-[#FFF7EE] dark:bg-[#17131F] border border-black/10 dark:border-white/15 text-sm font-extrabold">' +
            [3, 4, 5, 6].map(function (n) { return '<option value="' + n + '"' + (state.phraseWords === n ? " selected" : "") + '>' + n + ' Words</option>'; }).join("") +
          '</select></div>' +
          '<div><label class="block text-[11px] font-bold text-[#6B5E7B] dark:text-[#B9AEC9] mb-1">Separator</label>' +
          '<select id="usPhraseSep" class="w-full min-h-[44px] px-3 rounded-xl bg-[#FFF7EE] dark:bg-[#17131F] border border-black/10 dark:border-white/15 text-sm font-extrabold">' +
            ['-', '.', '_', ' '].map(function (sep) { return '<option value="' + esc(sep) + '"' + (state.phraseSep === sep ? " selected" : "") + '>' + (sep === " " ? "Space" : sep) + '</option>'; }).join("") +
          '</select></div>' +
          '<label class="flex items-center gap-2 text-xs font-bold p-2.5 rounded-xl bg-[#FFF7EE] dark:bg-[#17131F] min-h-[44px] self-end cursor-pointer"><input type="checkbox" data-pwd-opt="phraseNum" ' + (state.phraseNum ? "checked" : "") + ' class="w-4 h-4 accent-[#5B3FD0]" /> Add Number</label>' +
        '</div>';
    } else {
      optionsHtml =
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">' +
          '<div class="grid grid-cols-4 gap-1.5">' +
            [4, 6, 8, 12].map(function (d) {
              return '<button type="button" data-us-act="setPinLen" data-len="' + d + '" class="min-h-[44px] rounded-xl text-xs font-extrabold ' + (state.pinLength === d ? "bg-[#5B3FD0] text-white" : "bg-[#FFF7EE] dark:bg-[#17131F] text-[#2B2236] dark:text-[#F5EEFF]") + '">' + d + ' Digits</button>';
            }).join("") +
          '</div>' +
          '<label class="flex items-center gap-2 text-xs font-bold p-2.5 rounded-xl bg-[#FFF7EE] dark:bg-[#17131F] min-h-[44px] cursor-pointer"><input type="checkbox" data-pwd-opt="pinNoWeak" ' + (state.pinNoWeak ? "checked" : "") + ' class="w-4 h-4 accent-[#5B3FD0]" /> Block weak patterns (1111, 1234)</label>' +
        '</div>';
    }

    return (
      '<div class="space-y-4">' +
        // Mode Selector + Main Display
        '<div class="rounded-[24px] p-4 bg-white dark:bg-[#221C2E] border border-black/10 dark:border-white/10 space-y-3.5">' +
          '<div class="grid grid-cols-3 gap-1.5">' +
            '<button type="button" data-us-act="setPwdMode" data-mode="password" class="min-h-[44px] rounded-xl text-xs font-extrabold ' + (state.pwdMode === "password" ? "bg-[#5B3FD0] text-white" : "bg-[#FFF7EE] dark:bg-[#17131F] text-[#2B2236] dark:text-[#F5EEFF]") + '">Password</button>' +
            '<button type="button" data-us-act="setPwdMode" data-mode="passphrase" class="min-h-[44px] rounded-xl text-xs font-extrabold ' + (state.pwdMode === "passphrase" ? "bg-[#5B3FD0] text-white" : "bg-[#FFF7EE] dark:bg-[#17131F] text-[#2B2236] dark:text-[#F5EEFF]") + '">Passphrase</button>' +
            '<button type="button" data-us-act="setPwdMode" data-mode="pin" class="min-h-[44px] rounded-xl text-xs font-extrabold ' + (state.pwdMode === "pin" ? "bg-[#5B3FD0] text-white" : "bg-[#FFF7EE] dark:bg-[#17131F] text-[#2B2236] dark:text-[#F5EEFF]") + '">Secure PIN</button>' +
          '</div>' +

          '<div class="rounded-[22px] p-4 bg-[#E4D9FF]/60 dark:bg-[#2D2347] border border-[#5B3FD0]/20 space-y-2.5">' +
            '<p class="font-mono text-lg sm:text-xl font-extrabold text-[#2B2236] dark:text-[#F5EEFF] break-all select-all">' + esc(state.generatedPwd) + '</p>' +
            '<div class="w-full h-2 rounded-full bg-black/10 dark:bg-white/15 overflow-hidden">' +
              '<div class="h-full rounded-full transition-all duration-300" style="width:' + str.pct + '%;background:' + str.color + '"></div>' +
            '</div>' +
            '<div class="flex flex-wrap items-center justify-between gap-2 text-[11px] font-extrabold">' +
              '<span style="color:' + str.color + '">' + esc(str.label) + ' · ' + str.bits + ' bits</span>' +
              '<span class="text-[#6B5E7B] dark:text-[#B9AEC9]">Est. crack time: ' + esc(str.crack) + '</span>' +
            '</div>' +
          '</div>' +

          '<div class="grid grid-cols-3 gap-2">' +
            '<button type="button" data-us-act="regenPwd" class="min-h-[46px] rounded-2xl bg-[#5B3FD0] text-white text-xs font-extrabold">↻ Generate</button>' +
            '<button type="button" data-us-act="copyPwd" class="min-h-[46px] rounded-2xl bg-[#CFF3E2] dark:bg-[#1B362E] text-[#115E42] dark:text-[#A7F3D0] text-xs font-extrabold">Copy</button>' +
            '<button type="button" data-us-act="openPwdVault" class="min-h-[46px] rounded-2xl bg-[#FFE7C2] dark:bg-[#3D2E1D] text-[#6B3E00] dark:text-[#FDE68A] text-xs font-extrabold">AES Vault →</button>' +
          '</div>' +

          optionsHtml +
        '</div>' +

        // Quick 4 Alternatives
        '<div class="rounded-[24px] p-4 bg-white dark:bg-[#221C2E] border border-black/10 dark:border-white/10 space-y-2">' +
          '<h3 class="text-xs font-extrabold uppercase tracking-wider text-[#6B5E7B] dark:text-[#B9AEC9]">More Instant Options · আরও বিকল্প</h3>' +
          '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">' +
            state.pwdVariants.map(function (v) {
              return (
                '<button type="button" data-us-act="copyVariant" data-val="' + esc(v) + '" class="min-h-[44px] px-3 py-2 rounded-xl bg-[#FFF7EE] dark:bg-[#17131F] border border-black/5 dark:border-white/10 flex items-center justify-between gap-2 text-left">' +
                  '<code class="text-xs font-mono font-bold text-[#2B2236] dark:text-[#F5EEFF] truncate">' + esc(v) + '</code>' +
                  '<span class="text-[10px] font-extrabold text-[#5B3FD0] dark:text-[#C8B9FF] shrink-0">Copy</span>' +
                '</button>'
              );
            }).join("") +
          '</div>' +
        '</div>' +

        // Local Offline Strength Checker
        '<div class="rounded-[24px] p-4 bg-white dark:bg-[#221C2E] border border-black/10 dark:border-white/10 space-y-2.5">' +
          '<h3 class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">Offline Password Strength Checker · পাসওয়ার্ড যাচাই</h3>' +
          '<p class="text-[11px] text-[#6B5E7B] dark:text-[#B9AEC9]">Checked 100% inside your device — never sent over the internet or saved.</p>' +
          '<input type="password" id="usCheckPwdInput" value="' + esc(state.checkPwdInput) + '" placeholder="Type any password to test strength..." class="w-full min-h-[44px] px-3.5 rounded-xl bg-[#FFF7EE] dark:bg-[#17131F] border border-black/10 dark:border-white/15 text-sm font-bold text-[#2B2236] dark:text-[#F5EEFF]" />' +
          (chkStr
            ? '<div id="usCheckPwdRes" class="flex items-center justify-between text-xs font-extrabold"><span style="color:' + chkStr.color + '">' + esc(chkStr.label) + ' (' + chkStr.bits + ' bits)</span><span class="text-[#6B5E7B] dark:text-[#B9AEC9]">Crack: ' + esc(chkStr.crack) + '</span></div>'
            : '<div id="usCheckPwdRes" class="text-[11px] text-[#6B5E7B] dark:text-[#B9AEC9]">Use 12+ characters with mixed case, numbers &amp; symbols for banking/email.</div>') +
        '</div>' +
      '</div>'
    );
  }

  function renderSpeedTestTab() {
    var downVal = state.speedDown != null ? state.speedDown : 0;
    var pct = Math.min(100, Math.round((downVal / 100) * 100));
    var dashOffset = Math.round(251 - (251 * pct) / 100);
    var stageLabel =
      state.speedStage === "ping" ? "Measuring Ping & Jitter..." :
      state.speedStage === "download" ? "Testing Download Speed..." :
      state.speedStage === "upload" ? "Testing Upload Speed..." :
      state.speedStage === "done" ? "Measurement Complete" :
      state.speedStage === "error" ? "Connection Needed" :
      "Ready to measure real speed";

    var histHtml = "";
    if (!state.speedHistory.length) {
      histHtml =
        '<div class="rounded-[20px] p-4 text-center bg-white/75 dark:bg-[#221C2E]/80 border border-dashed border-black/10 dark:border-white/15">' +
          '<p class="text-xs font-bold text-[#2B2236] dark:text-[#F5EEFF]">No speed test history yet · এখনো কোনো টেস্ট হয়নি</p>' +
        '</div>';
    } else {
      histHtml = '<div class="space-y-2">';
      for (var i = 0; i < state.speedHistory.length; i++) {
        var h = state.speedHistory[i];
        histHtml +=
          '<div class="rounded-[18px] p-3 bg-white dark:bg-[#221C2E] border border-black/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">' +
            '<div>' +
              '<p class="font-extrabold text-[#2B2236] dark:text-[#F5EEFF] tabular-nums">↓ ' + esc(h.down) + ' Mbps · ↑ ' + esc(h.up) + ' Mbps</p>' +
              '<p class="text-[11px] text-[#6B5E7B] dark:text-[#B9AEC9]">Ping ' + esc(h.ping) + ' ms · Jitter ' + esc(h.jitter) + ' ms · ' + esc(h.at) + '</p>' +
            '</div>' +
            '<span class="text-[10px] font-extrabold px-2 py-1 rounded-lg bg-[#D6E8FF] dark:bg-[#1E2E4A] text-[#1A4B8C] dark:text-[#BFDBFE]">' + esc(h.net) + '</span>' +
          '</div>';
      }
      histHtml += '</div>';
    }

    return (
      '<div class="space-y-4">' +
        '<div class="rounded-[24px] p-5 bg-white dark:bg-[#221C2E] border border-black/10 dark:border-white/10 space-y-4 text-center">' +
          '<div class="flex items-center justify-between gap-2">' +
            '<span class="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-[#FFE7C2] dark:bg-[#3D2E1D] text-[#6B3E00] dark:text-[#FDE68A]">Needs internet · ইন্টারনেট প্রয়োজন</span>' +
            '<span class="text-[11px] font-bold text-[#6B5E7B] dark:text-[#B9AEC9]">' + esc(state.speedNetType || (navigator.onLine ? "Online" : "Offline")) + '</span>' +
          '</div>' +

          // SVG Semi-Circular Gauge
          '<div class="flex flex-col items-center justify-center pt-1">' +
            '<svg viewBox="0 0 200 118" class="w-56 h-32">' +
              '<path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(148,163,184,0.22)" stroke-width="14" stroke-linecap="round"/>' +
              '<path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#5B3FD0" stroke-width="14" stroke-linecap="round" stroke-dasharray="251" stroke-dashoffset="' + dashOffset + '" style="transition:stroke-dashoffset 0.45s ease"/>' +
              '<text x="100" y="80" text-anchor="middle" fill="currentColor" class="text-[#2B2236] dark:text-[#F5EEFF]" style="font-size:28px;font-weight:800">' + (state.speedDown != null ? esc(state.speedDown) : "—") + '</text>' +
              '<text x="100" y="99" text-anchor="middle" fill="#6B5E7B" style="font-size:11px;font-weight:700">Mbps Download</text>' +
            '</svg>' +
            '<p class="text-xs font-extrabold text-[#5B3FD0] dark:text-[#C8B9FF]">' + esc(stageLabel) + '</p>' +
          '</div>' +

          (state.speedError
            ? '<div class="rounded-2xl p-3 bg-[#FFD6D6]/80 dark:bg-[#3D212B] text-[#8E1B3B] dark:text-[#FDA4AF] text-xs font-bold">' + esc(state.speedError) + '</div>'
            : '') +

          '<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-left">' +
            '<div class="rounded-2xl p-3 bg-[#FFF7EE] dark:bg-[#17131F]"><span class="text-[10px] font-bold text-[#6B5E7B] dark:text-[#B9AEC9]">PING</span><p class="text-base font-extrabold text-[#2B2236] dark:text-[#F5EEFF] tabular-nums">' + (state.speedPing != null ? state.speedPing + " ms" : "—") + '</p></div>' +
            '<div class="rounded-2xl p-3 bg-[#FFF7EE] dark:bg-[#17131F]"><span class="text-[10px] font-bold text-[#6B5E7B] dark:text-[#B9AEC9]">JITTER</span><p class="text-base font-extrabold text-[#2B2236] dark:text-[#F5EEFF] tabular-nums">' + (state.speedJitter != null ? state.speedJitter + " ms" : "—") + '</p></div>' +
            '<div class="rounded-2xl p-3 bg-[#CFF3E2]/65 dark:bg-[#1B362E]"><span class="text-[10px] font-bold text-[#115E42] dark:text-[#A7F3D0]">DOWNLOAD</span><p class="text-base font-extrabold text-[#113D2C] dark:text-[#F5EEFF] tabular-nums">' + (state.speedDown != null ? state.speedDown + " Mbps" : "—") + '</p></div>' +
            '<div class="rounded-2xl p-3 bg-[#E4D9FF]/65 dark:bg-[#2D2347]"><span class="text-[10px] font-bold text-[#3E26A0] dark:text-[#E4D9FF]">UPLOAD</span><p class="text-base font-extrabold text-[#2B2236] dark:text-[#F5EEFF] tabular-nums">' + (state.speedUp != null ? state.speedUp + " Mbps" : "—") + '</p></div>' +
          '</div>' +

          '<p class="text-xs font-semibold text-[#6B5E7B] dark:text-[#B9AEC9]">' + esc(getSpeedVerdict(state.speedDown, state.speedPing || 0)) + '</p>' +

          '<div class="flex flex-wrap items-center justify-center gap-2">' +
            '<button type="button" data-us-act="startSpeed" ' + (state.speedRunning ? "disabled" : "") + ' class="flex-1 min-w-[180px] min-h-[48px] px-5 rounded-2xl bg-[#5B3FD0] text-white text-sm font-extrabold shadow-sm disabled:opacity-50">' +
              (state.speedRunning ? "Testing... (" + state.speedProgress + "%)" : "Start Speed Test · স্পিড মাপুন") +
            '</button>' +
            (state.speedDown != null
              ? '<button type="button" data-us-act="shareSpeed" class="min-h-[48px] px-4 rounded-2xl bg-[#CFF3E2] dark:bg-[#1B362E] text-[#115E42] dark:text-[#A7F3D0] text-xs font-extrabold">Share</button>'
              : '') +
          '</div>' +
        '</div>' +

        '<div class="space-y-2">' +
          '<div class="flex items-center justify-between">' +
            '<h3 class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">Last 10 Speed Tests · সাম্প্রতিক রিপোর্ট</h3>' +
            (state.speedHistory.length ? '<button type="button" data-us-act="clearSpeedHistory" class="text-xs font-bold text-[#8E1B3B] dark:text-[#FDA4AF] min-h-[36px] px-2">Clear</button>' : '') +
          '</div>' +
          histHtml +
        '</div>' +
      '</div>'
    );
  }

  function render(rootEl, forcedTab) {
    if (forcedTab === "land_converter" || forcedTab === "password_safety" || forcedTab === "speed_test") {
      state.tab = forcedTab;
    }
    var root = rootEl || document.getElementById("oneoraUtilitiesSafetyRoot");
    if (!root) return;

    var bannerBg =
      state.tab === "land_converter" ? "bg-[#FFE7C2] dark:bg-[#3D2E1D] text-[#6B3E00] dark:text-[#FDE68A]" :
      state.tab === "password_safety" ? "bg-[#E4D9FF] dark:bg-[#2D2347] text-[#3E26A0] dark:text-[#E4D9FF]" :
      "bg-[#D6E8FF] dark:bg-[#1E2E4A] text-[#1A4B8C] dark:text-[#BFDBFE]";

    var heading =
      state.tab === "land_converter" ? "Indian Land Converter & Plot Area · জমি পরিমাপ" :
      state.tab === "password_safety" ? "Password & PIN Generator · পাসওয়ার্ড নিরাপত্তা" :
      "Internet Speed Test · ইন্টারনেট স্পিড";

    var subHeading =
      state.tab === "land_converter" ? "Bigha, Katha, Shatak/Decimal, Sq Ft & 4-Side Amin Plot Valuation — 100% offline." :
      state.tab === "password_safety" ? "Cryptographically secure passwords, passphrases, PINs & local strength check." :
      "Real HTTP Ping, Jitter, Download & Upload speed test with offline history.";

    root.innerHTML =
      '<div class="space-y-4 pb-10">' +
        '<div class="rounded-[26px] p-4 sm:p-5 ' + bannerBg + '">' +
          '<p class="text-[11px] font-extrabold uppercase tracking-wider opacity-85">ONEORA Utilities &amp; Safety</p>' +
          '<h2 class="text-xl sm:text-2xl font-extrabold text-[#1E1729] dark:text-[#F5EEFF] mt-0.5">' + heading + '</h2>' +
          '<p class="text-xs opacity-90 mt-0.5">' + subHeading + '</p>' +
        '</div>' +

        // Sub-Tab Switcher
        '<div class="grid grid-cols-3 gap-1.5 p-1.5 rounded-[20px] bg-white/85 dark:bg-[#221C2E] border border-black/10 dark:border-white/10">' +
          '<button type="button" data-us-act="switchTab" data-tab="land_converter" class="min-h-[44px] px-2 rounded-2xl text-xs font-extrabold transition ' +
            (state.tab === "land_converter" ? "bg-[#5B3FD0] text-white shadow-xs" : "text-[#2B2236] dark:text-[#F5EEFF]") + '">Land · জমি</button>' +
          '<button type="button" data-us-act="switchTab" data-tab="password_safety" class="min-h-[44px] px-2 rounded-2xl text-xs font-extrabold transition ' +
            (state.tab === "password_safety" ? "bg-[#5B3FD0] text-white shadow-xs" : "text-[#2B2236] dark:text-[#F5EEFF]") + '">Password &amp; PIN</button>' +
          '<button type="button" data-us-act="switchTab" data-tab="speed_test" class="min-h-[44px] px-2 rounded-2xl text-xs font-extrabold transition ' +
            (state.tab === "speed_test" ? "bg-[#5B3FD0] text-white shadow-xs" : "text-[#2B2236] dark:text-[#F5EEFF]") + '">Speed Test</button>' +
        '</div>' +

        (state.tab === "land_converter" ? renderLandTab() :
         state.tab === "password_safety" ? renderPasswordTab() :
         renderSpeedTestTab()) +
        renderResultSheet() +
      '</div>';

    bindEvents(root);
  }

  function updateLandLiveOnly(root) {
    var gridEl = root.querySelector("#usLandConvGrid");
    if (gridEl) {
      var units = getLandUnits(state.landRegion);
      var baseSqft = convertToSqft(state.landVal, state.landUnit, state.landRegion);
      var html = "";
      for (var i = 0; i < units.length; i++) {
        var u = units[i];
        var converted = baseSqft / u.sqft;
        var isSrc = u.key === state.landUnit;
        html +=
          '<div class="rounded-[18px] p-3 border ' +
            (isSrc ? "bg-[#FFE7C2]/70 dark:bg-[#3D2E1D] border-[#9A5B00]/30" : "bg-[#FFF7EE] dark:bg-[#17131F] border-black/5 dark:border-white/10") + '">' +
            '<p class="text-[11px] font-bold text-[#6B5E7B] dark:text-[#B9AEC9]">' + esc(u.label) + '</p>' +
            '<p class="text-base font-extrabold text-[#2B2236] dark:text-[#F5EEFF] tabular-nums mt-0.5">' + esc(fmtIn(converted, converted < 10 ? 4 : 2)) + '</p>' +
          '</div>';
      }
      gridEl.innerHTML = html;
    }
    var plotBox = root.querySelector("#usPlotResultBox");
    if (plotBox) {
      var plot = computePlotArea();
      if (!plot.valid) {
        plotBox.innerHTML = '<p class="text-xs font-extrabold text-[#8E1B3B] dark:text-[#FDA4AF]">Invalid triangle sides: sum of any two sides must be greater than the third side.</p>';
      } else {
        plotBox.innerHTML =
          '<div class="grid grid-cols-2 sm:grid-cols-4 gap-2">' +
            '<div><span class="text-[10px] font-bold uppercase text-[#115E42] dark:text-[#A7F3D0]">Sq. Feet</span><p class="text-base font-extrabold text-[#113D2C] dark:text-[#F5EEFF] tabular-nums">' + esc(fmtIn(plot.areaSqft, 1)) + '</p></div>' +
            '<div><span class="text-[10px] font-bold uppercase text-[#115E42] dark:text-[#A7F3D0]">Katha · কাঠা</span><p class="text-base font-extrabold text-[#113D2C] dark:text-[#F5EEFF] tabular-nums">' + esc(fmtIn(plot.katha, 3)) + '</p></div>' +
            '<div><span class="text-[10px] font-bold uppercase text-[#115E42] dark:text-[#A7F3D0]">Shatak · শতক</span><p class="text-base font-extrabold text-[#113D2C] dark:text-[#F5EEFF] tabular-nums">' + esc(fmtIn(plot.decimal, 3)) + '</p></div>' +
            '<div><span class="text-[10px] font-bold uppercase text-[#115E42] dark:text-[#A7F3D0]">Bigha · বিঘা</span><p class="text-base font-extrabold text-[#113D2C] dark:text-[#F5EEFF] tabular-nums">' + esc(fmtIn(plot.bigha, 4)) + '</p></div>' +
          '</div>' +
          '<div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-black/10 dark:border-white/15">' +
            '<span class="text-xs font-bold text-[#115E42] dark:text-[#A7F3D0]">Perimeter: ' + esc(fmtIn(plot.perimeterFt, 1)) + ' ft · ' + esc(plot.formulaText) + '</span>' +
            (plot.totalPrice > 0 ? '<span class="text-sm font-extrabold text-[#5B3FD0] dark:text-[#E4D9FF]">Est. Value: ' + esc(fmtInr(plot.totalPrice)) + '</span>' : '') +
          '</div>';
      }
    }
  }

  function buildLandReportText() {
    var reg = LAND_REGIONS[state.landRegion] || LAND_REGIONS.wb;
    var plot = computePlotArea();
    return [
      "ONEORA Land & Plot Area Report",
      "Region: " + reg.name,
      "Method: " + plot.formulaText,
      "--------------------------------",
      "Area (Sq. Ft): " + fmtIn(plot.areaSqft, 2) + " sq ft",
      "Area (Sq. M) : " + fmtIn(plot.areaSqm, 2) + " sq m",
      "Katha        : " + fmtIn(plot.katha, 3),
      "Shatak/Dec.  : " + fmtIn(plot.decimal, 3),
      "Bigha        : " + fmtIn(plot.bigha, 4),
      "Acre         : " + fmtIn(plot.acre, 4),
      "Perimeter    : " + fmtIn(plot.perimeterFt, 1) + " ft",
      plot.totalPrice > 0 ? "Est. Value   : " + fmtInr(plot.totalPrice) : ""
    ].filter(Boolean).join("\n");
  }

  function bindEvents(root) {
    // Land inputs
    var selReg = root.querySelector("#usLandRegion");
    if (selReg) selReg.addEventListener("change", function () { state.landRegion = selReg.value; saveStorage(); render(root); });

    var selUnit = root.querySelector("#usLandUnit");
    if (selUnit) selUnit.addEventListener("change", function () { state.landUnit = selUnit.value; updateLandLiveOnly(root); });

    var selPlotUnit = root.querySelector("#usPlotUnit");
    if (selPlotUnit) selPlotUnit.addEventListener("change", function () { state.plotUnit = selPlotUnit.value; updateLandLiveOnly(root); });

    var selRateUnit = root.querySelector("#usRateUnit");
    if (selRateUnit) selRateUnit.addEventListener("change", function () { state.rateUnit = selRateUnit.value; updateLandLiveOnly(root); });

    var bindLandInput = function (id, prop) {
      var el = root.querySelector(id);
      if (!el) return;
      el.addEventListener("input", function () {
        state[prop] = el.value;
        updateLandLiveOnly(root);
      });
    };
    bindLandInput("#usLandVal", "landVal");
    bindLandInput("#usSideN", "sideN");
    bindLandInput("#usSideS", "sideS");
    bindLandInput("#usSideE", "sideE");
    bindLandInput("#usSideW", "sideW");
    bindLandInput("#usTriA", "triA");
    bindLandInput("#usTriB", "triB");
    bindLandInput("#usTriC", "triC");
    bindLandInput("#usLandRate", "ratePerUnit");

    // Password controls
    var pwdLen = root.querySelector("#usPwdLen");
    if (pwdLen) {
      pwdLen.addEventListener("input", function () {
        state.pwdLength = parseInt(pwdLen.value, 10) || 16;
        refreshGeneratedPasswords();
        render(root);
      });
    }
    var phraseWords = root.querySelector("#usPhraseWords");
    if (phraseWords) {
      phraseWords.addEventListener("change", function () {
        state.phraseWords = parseInt(phraseWords.value, 10) || 4;
        refreshGeneratedPasswords();
        render(root);
      });
    }
    var phraseSep = root.querySelector("#usPhraseSep");
    if (phraseSep) {
      phraseSep.addEventListener("change", function () {
        state.phraseSep = phraseSep.value;
        refreshGeneratedPasswords();
        render(root);
      });
    }
    var optChecks = root.querySelectorAll("[data-pwd-opt]");
    for (var c = 0; c < optChecks.length; c++) {
      (function (chk) {
        chk.addEventListener("change", function () {
          var key = chk.getAttribute("data-pwd-opt");
          state[key] = Boolean(chk.checked);
          refreshGeneratedPasswords();
          render(root);
        });
      })(optChecks[c]);
    }

    var chkPwdEl = root.querySelector("#usCheckPwdInput");
    if (chkPwdEl) {
      chkPwdEl.addEventListener("input", function () {
        state.checkPwdInput = chkPwdEl.value;
        var resEl = root.querySelector("#usCheckPwdRes");
        if (!resEl) return;
        if (!state.checkPwdInput) {
          resEl.innerHTML = 'Use 12+ characters with mixed case, numbers &amp; symbols for banking/email.';
          return;
        }
        var st = evaluateStrength(state.checkPwdInput);
        resEl.innerHTML = '<span style="color:' + st.color + '">' + esc(st.label) + ' (' + st.bits + ' bits)</span><span class="text-[#6B5E7B] dark:text-[#B9AEC9]">Crack: ' + esc(st.crack) + '</span>';
      });
    }

    // Delegated clicks
    root.onclick = function (e) {
      var btn = e.target && e.target.closest ? e.target.closest("[data-us-act]") : null;
      if (!btn) return;
      var act = btn.getAttribute("data-us-act");
      haptic(8);

      if (act === "switchTab") {
        state.tab = btn.getAttribute("data-tab") || "land_converter";
        render(root);
      } else if (act === "setShape") {
        state.plotShape = btn.getAttribute("data-shape") || "irregular4";
        render(root);
      } else if (act === "saveLand") {
        var plot = computePlotArea();
        if (!plot.valid || plot.areaSqft <= 0) { toast("Invalid Area", "Enter valid plot dimensions first.", "info"); return; }
        state.savedLand.unshift({
          id: uid("land"),
          title: fmtIn(plot.katha, 2) + " Katha · " + fmtIn(plot.decimal, 2) + " Shatak (" + fmtIn(plot.areaSqft, 0) + " sq ft)",
          summary: (LAND_REGIONS[state.landRegion] ? LAND_REGIONS[state.landRegion].name : "WB") + (plot.totalPrice > 0 ? " · Est. " + fmtInr(plot.totalPrice) : "") + " · " + new Date().toLocaleDateString()
        });
        if (state.savedLand.length > 15) state.savedLand = state.savedLand.slice(0, 15);
        saveStorage();
        render(root);
        toast("Measurement Saved", "Saved offline in Land history.");
      } else if (act === "delSavedLand") {
        var delId = btn.getAttribute("data-id");
        state.savedLand = state.savedLand.filter(function (x) { return x.id !== delId; });
        saveStorage();
        render(root);
      } else if (act === "shareLand") {
        shareText("ONEORA Land Area Report", buildLandReportText());
      } else if (act === "exportLandSheet") {
        state.resultSheet = {
          title: "Land & Plot Area Summary",
          subtitle: (LAND_REGIONS[state.landRegion] ? LAND_REGIONS[state.landRegion].name : ""),
          text: buildLandReportText(),
          filename: "ONEORA_Land_Report_" + Date.now() + ".txt"
        };
        render(root);
      } else if (act === "setPwdMode") {
        state.pwdMode = btn.getAttribute("data-mode") || "password";
        refreshGeneratedPasswords();
        render(root);
      } else if (act === "setPinLen") {
        state.pinLength = parseInt(btn.getAttribute("data-len"), 10) || 6;
        refreshGeneratedPasswords();
        render(root);
      } else if (act === "regenPwd") {
        refreshGeneratedPasswords();
        render(root);
      } else if (act === "copyPwd") {
        copyText(state.generatedPwd).then(function () { toast("Copied!", "Generated secret copied to clipboard."); });
      } else if (act === "copyVariant") {
        var v = btn.getAttribute("data-val") || "";
        copyText(v).then(function () { toast("Copied!", "Option copied to clipboard."); });
      } else if (act === "openPwdVault") {
        if (typeof global.openPdfBondhuTool === "function") {
          global.openPdfBondhuTool("documentCenter", { sub: "passwords", fromCat: "vault" });
        }
      } else if (act === "startSpeed") {
        runSpeedTest(root);
      } else if (act === "shareSpeed") {
        var txt = "ONEORA Internet Speed Test\nDownload: " + state.speedDown + " Mbps\nUpload: " + state.speedUp + " Mbps\nPing: " + state.speedPing + " ms (Jitter: " + state.speedJitter + " ms)\n" + getSpeedVerdict(state.speedDown, state.speedPing || 0);
        shareText("ONEORA Internet Speed Test", txt);
      } else if (act === "clearSpeedHistory") {
        state.speedHistory = [];
        saveStorage();
        render(root);
        toast("Cleared", "Speed test history cleared.");
      } else if (act === "closeSheet") {
        state.resultSheet = null;
        render(root);
      } else if (act === "sheetCopy" && state.resultSheet) {
        copyText(state.resultSheet.text).then(function () { toast("Copied!", "Summary copied."); });
      } else if (act === "sheetShare" && state.resultSheet) {
        shareText(state.resultSheet.title, state.resultSheet.text);
      } else if (act === "sheetDownload" && state.resultSheet) {
        downloadTextFile(state.resultSheet.text, state.resultSheet.filename || "ONEORA_Summary.txt");
        toast("Downloaded", state.resultSheet.filename || "File saved.");
      }
    };
  }

  function init() {
    loadStorage();
    refreshGeneratedPasswords();
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  global.OneoraUtilitiesSafety = {
    render: render,
    generateSecret: generateSingleSecret,
    evaluateStrength: evaluateStrength
  };
})(window);
