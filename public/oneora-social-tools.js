(function(global) {
  "use strict";

  var STORE_KEY = "oneora_social_tools_v1";
  var MODAL_HOST_ID = "oneoraSocialModalHost";
  var RATE_LIMIT_MAX = 8;
  var RATE_LIMIT_WINDOW_MS = 60000;

  // Single configurable AI proxy endpoint (ZERO API keys inside client app)
  if (!global.AI_PROXY_URL) {
    global.AI_PROXY_URL = "/api/ai/chat";
  }

  var SOCIAL_TABS = [
    { id: "wa_direct", label: "Direct WhatsApp", bn: "ডিরেক্ট হোয়াটসঅ্যাপ", needsNet: false },
    { id: "social_img", label: "Social Image", bn: "সোশ্যাল ইমেজ", needsNet: false },
    { id: "ai_social", label: "AI Caption & Bio", bn: "ক্যাপশন ও বায়ো", needsNet: true }
  ];

  var COUNTRY_CODES = [
    { code: "91", label: "+91 India" },
    { code: "880", label: "+880 Bangladesh" },
    { code: "971", label: "+971 UAE" },
    { code: "966", label: "+966 Saudi" },
    { code: "1", label: "+1 US / Canada" },
    { code: "44", label: "+44 UK" },
    { code: "65", label: "+65 Singapore" },
    { code: "61", label: "+61 Australia" }
  ];

  var WA_TEMPLATES = [
    { label: "নমস্কার (BN)", text: "নমস্কার! আশা করি ভালো আছেন।" },
    { label: "Location (BN)", text: "দয়া করে আপনার লোকেশনটি এখানে পাঠান।" },
    { label: "Order Update", text: "Hello! Your order is ready. Please let us know a good time for delivery." },
    { label: "Payment Info", text: "Hello, sharing the payment details as requested. Thank you!" },
    { label: "Callback", text: "Hi, I tried calling you earlier. Please call back when free." }
  ];

  var IMAGE_PRESETS = [
    { id: "wa_dp", label: "WhatsApp DP", w: 640, h: 640, crop: true, desc: "640×640 (1:1)" },
    { id: "wa_status", label: "WA Status / Reel", w: 1080, h: 1920, crop: true, desc: "1080×1920 (9:16)" },
    { id: "ig_sq", label: "Instagram Post", w: 1080, h: 1080, crop: true, desc: "1080×1080 (1:1)" },
    { id: "ig_port", label: "IG Portrait", w: 1080, h: 1350, crop: true, desc: "1080×1350 (4:5)" },
    { id: "yt_thumb", label: "YouTube Thumb", w: 1280, h: 720, crop: true, desc: "1280×720 (16:9)" },
    { id: "fb_cover", label: "Facebook Cover", w: 1640, h: 624, crop: true, desc: "1640×624" },
    { id: "custom", label: "Keep Ratio", w: 1280, h: 0, crop: false, desc: "Max 1280px" }
  ];

  var state = {
    activeTab: "wa_direct",
    waCountry: "91",
    waPhone: "",
    waLabel: "",
    waMsg: "",
    // Social image compressor state
    imgFile: null,
    imgDataUrl: "",
    imgOrigW: 0,
    imgOrigH: 0,
    imgOrigBytes: 0,
    imgPreset: "wa_dp",
    imgFitMode: "cover", // "cover" | "contain"
    imgFormat: "image/jpeg",
    imgQuality: 82,
    imgTargetKb: 0,
    imgOutBlob: null,
    imgOutUrl: "",
    imgOutW: 0,
    imgOutH: 0,
    imgBusy: false,
    // AI Caption/Bio/Hashtag state
    aiPlatform: "Instagram",
    aiType: "All-in-One Pack",
    aiTone: "Friendly",
    aiLang: "bn",
    aiTopic: "",
    aiBusy: false,
    aiOutput: "",
    aiError: "",
    aiOfflineUsed: false,
    aiTimestamps: []
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
    return (prefix || "soc") + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
  }

  function formatBytes(bytes) {
    var b = Number(bytes || 0);
    if (b < 1024) return b + " B";
    if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
    return (b / 1048576).toFixed(2) + " MB";
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

  function copyText(text, label) {
    if (global.OneoraCapabilities && typeof global.OneoraCapabilities.copyText === "function") {
      global.OneoraCapabilities.copyText(text);
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function() {});
    }
    notifyToast("Copied · কপি হয়েছে", (label || "Text") + " copied to clipboard.", "success");
  }

  function cleanDigits(str) {
    return String(str || "").replace(/\D+/g, "");
  }

  function buildFullWaNumber(countryCode, rawPhone) {
    var cc = cleanDigits(countryCode || "91");
    var ph = cleanDigits(rawPhone || "");
    if (!ph) return "";
    if (ph.charAt(0) === "0") ph = ph.replace(/^0+/, "");
    if (ph.length > 10 && ph.indexOf(cc) === 0) return ph;
    return cc + ph;
  }

  function getAiProxyUrl() {
    try {
      var custom = localStorage.getItem("oneora_ai_proxy_url");
      if (custom && (/^https?:\/\//i.test(custom) || custom.charAt(0) === "/")) {
        return custom;
      }
    } catch (e) {}
    return String(global.AI_PROXY_URL || "/api/ai/chat");
  }

  function checkClientRateLimit() {
    var now = Date.now();
    state.aiTimestamps = state.aiTimestamps.filter(function(ts) {
      return now - ts < RATE_LIMIT_WINDOW_MS;
    });
    if (state.aiTimestamps.length >= RATE_LIMIT_MAX) {
      var waitSec = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - state.aiTimestamps[0])) / 1000);
      return { ok: false, waitSec: Math.max(1, waitSec) };
    }
    state.aiTimestamps.push(now);
    return { ok: true, waitSec: 0 };
  }

  /* -------------------- IndexedDB Storage -------------------- */

  function defaultStore() {
    return {
      version: 1,
      recentWa: [],
      savedCaptions: [],
      updatedAtMs: Date.now()
    };
  }

  function loadStore() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return defaultStore();
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return defaultStore();
      return {
        version: 1,
        recentWa: Array.isArray(parsed.recentWa) ? parsed.recentWa : [],
        savedCaptions: Array.isArray(parsed.savedCaptions) ? parsed.savedCaptions : [],
        updatedAtMs: Number(parsed.updatedAtMs || Date.now())
      };
    } catch (e) {
      return defaultStore();
    }
  }

  function saveStore(store) {
    var payload = {
      version: 1,
      recentWa: Array.isArray(store.recentWa) ? store.recentWa.slice(0, 15) : [],
      savedCaptions: Array.isArray(store.savedCaptions) ? store.savedCaptions.slice(0, 25) : [],
      updatedAtMs: Date.now()
    };
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(payload));
    } catch (e) {}
    if (global.OneoraDB && typeof global.OneoraDB.syncKeyToIndexedDb === "function") {
      global.OneoraDB.syncKeyToIndexedDb(STORE_KEY).catch(function() {});
    }
    try {
      document.dispatchEvent(new CustomEvent("oneora:socialchange"));
    } catch (e) {}
    return payload;
  }

  function recordRecentWa(country, phone, label, msg) {
    var digits = cleanDigits(phone);
    if (digits.length < 7) return;
    var st = loadStore();
    var full = buildFullWaNumber(country, digits);
    st.recentWa = st.recentWa.filter(function(item) { return item.full !== full; });
    st.recentWa.unshift({
      id: uid("wa"),
      country: country,
      phone: digits,
      full: full,
      label: String(label || "").trim().slice(0, 40),
      lastMsg: String(msg || "").trim().slice(0, 100),
      atMs: Date.now()
    });
    saveStore(st);
  }

  /* -------------------- Modal Host (QR & Result/Share Sheets) -------------------- */

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

  function openModal(title, subtitle, bodyHtml) {
    var host = getModalHost();
    host.innerHTML =
      '<div class="fixed inset-0 z-[112] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">' +
        '<div id="socModalBackdrop" class="absolute inset-0 bg-[#2B2236]/55 dark:bg-black/75"></div>' +
        '<div class="relative z-10 w-full max-w-md bg-white dark:bg-[#221C2E] text-[#2B2236] dark:text-[#F5EEFF] rounded-t-[30px] sm:rounded-[30px] border border-[var(--oneora-border)] p-5 sm:p-6 shadow-2xl space-y-4 max-h-[88vh] overflow-y-auto animate-fade-in" style="padding-bottom: max(1.5rem, env(safe-area-inset-bottom));">' +
          '<div class="flex items-start justify-between gap-3">' +
            '<div class="min-w-0">' +
              (subtitle ? '<p class="text-[11px] font-extrabold uppercase tracking-wider text-[#804800] dark:text-[#FCD34D]">' + esc(subtitle) + "</p>" : "") +
              '<h3 class="text-lg font-extrabold leading-snug">' + esc(title) + "</h3>" +
            "</div>" +
            '<button type="button" id="socModalCloseBtn" aria-label="Close" class="w-11 h-11 rounded-full bg-[var(--oneora-bg)] font-extrabold inline-flex items-center justify-center shrink-0">✕</button>' +
          "</div>" +
          bodyHtml +
        "</div>" +
      "</div>";

    var bd = document.getElementById("socModalBackdrop");
    var cb = document.getElementById("socModalCloseBtn");
    if (bd) bd.addEventListener("click", closeModal);
    if (cb) cb.addEventListener("click", closeModal);
  }

  async function openWaQrModal(waUrl, displayPhone) {
    openModal(
      "WhatsApp Chat QR",
      "+" + displayPhone,
      '<div class="space-y-4 text-center">' +
        '<div id="socWaQrBox" class="w-56 h-56 mx-auto rounded-[22px] bg-white p-3 border border-black/10 flex items-center justify-center">' +
          '<span class="text-xs font-bold text-[#5C506B]">Generating QR...</span>' +
        "</div>" +
        '<p class="text-xs font-semibold text-[#5C506B] dark:text-[#C5B9DA] break-all">' + esc(waUrl) + "</p>" +
        '<button type="button" id="socQrCopyBtn" class="w-full py-3 rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white text-xs font-extrabold min-h-[48px]">Copy WhatsApp Link</button>' +
      "</div>"
    );

    var copyBtn = document.getElementById("socQrCopyBtn");
    if (copyBtn) copyBtn.addEventListener("click", function() { copyText(waUrl, "WhatsApp link"); });

    try {
      if (global.OneoraLoader && typeof global.OneoraLoader.load === "function") {
        await global.OneoraLoader.load("qrcode");
      }
      var box = document.getElementById("socWaQrBox");
      if (box && global.QRCode) {
        box.innerHTML = "";
        new global.QRCode(box, {
          text: waUrl,
          width: 196,
          height: 196,
          colorDark: "#2B2236",
          colorLight: "#FFFFFF"
        });
      }
    } catch (e) {
      var b = document.getElementById("socWaQrBox");
      if (b) b.innerHTML = '<span class="text-xs font-bold text-[#8E1B3B]">Could not render QR offline.</span>';
    }
  }

  /* -------------------- 1. DIRECT WHATSAPP CHAT -------------------- */

  function renderWaDirectPanel(store) {
    var fullNum = buildFullWaNumber(state.waCountry, state.waPhone);
    var isValid = cleanDigits(state.waPhone).length >= 7;
    var waUrl = isValid
      ? "https://wa.me/" + encodeURIComponent(fullNum) + (state.waMsg.trim() ? "?text=" + encodeURIComponent(state.waMsg.trim()) : "")
      : "";

    var recentHtml = "";
    if (store.recentWa.length) {
      recentHtml =
        '<div class="pastel-stage3-card p-4 sm:p-5 space-y-2.5">' +
          '<div class="flex items-center justify-between">' +
            '<h4 class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">Recent Numbers · সাম্প্রতিক নম্বর</h4>' +
            '<button type="button" id="socWaClearRecentBtn" class="px-3 py-1.5 rounded-full bg-[#FFD6D6] dark:bg-[#3D212B] text-[#8E1B3B] dark:text-[#FDA4AF] text-xs font-extrabold min-h-[36px]">Clear</button>' +
          "</div>" +
          '<div class="space-y-2">' +
            store.recentWa.map(function(item) {
              return (
                '<div class="pastel-inset-tile p-3 flex items-center justify-between gap-2">' +
                  '<button type="button" data-wa-reuse="' + esc(item.id) + '" class="flex-1 min-w-0 text-left min-h-[44px]">' +
                    '<p class="text-xs sm:text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF] tabular-nums truncate">+' + esc(item.full) + (item.label ? " · " + esc(item.label) : "") + "</p>" +
                    (item.lastMsg ? '<p class="text-[11px] font-medium text-[#5C506B] dark:text-[#C5B9DA] truncate">' + esc(item.lastMsg) + "</p>" : "") +
                  "</button>" +
                  '<a href="https://wa.me/' + encodeURIComponent(item.full) + '" target="_blank" rel="noopener noreferrer" class="px-3.5 py-2 rounded-full bg-[#CFF3E2] dark:bg-[#1B362E] text-[#115E42] dark:text-[#A7F3D0] text-xs font-extrabold min-h-[40px] inline-flex items-center">Chat</a>' +
                  '<button type="button" data-wa-del="' + esc(item.id) + '" aria-label="Remove" class="w-10 h-10 rounded-full bg-[#FFD6D6]/80 dark:bg-[#3D212B] text-[#8E1B3B] dark:text-[#FDA4AF] text-xs font-extrabold">✕</button>' +
                "</div>"
              );
            }).join("") +
          "</div>" +
        "</div>";
    }

    return (
      '<div class="space-y-4">' +
        '<div class="pastel-stage3-card p-5 space-y-4">' +
          '<div>' +
            '<p class="text-[11px] font-extrabold uppercase tracking-wider text-[#115E42] dark:text-[#6EE7B7]">Zero Contact Clutter · সেভ না করেই চ্যাট</p>' +
            '<h3 class="text-base sm:text-lg font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">Direct WhatsApp Chat</h3>' +
            '<p class="text-xs font-medium text-[#5C506B] dark:text-[#C5B9DA] mt-0.5">Message any phone number on WhatsApp without saving it to your phone contacts.</p>' +
          "</div>" +

          '<div class="grid grid-cols-1 sm:grid-cols-12 gap-2.5">' +
            '<div class="sm:col-span-4">' +
              '<label for="socWaCountry" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Country · দেশ</label>' +
              '<select id="socWaCountry" class="pastel-pill-input w-full text-xs font-extrabold">' +
                COUNTRY_CODES.map(function(c) {
                  return '<option value="' + c.code + '"' + (state.waCountry === c.code ? " selected" : "") + ">" + esc(c.label) + "</option>";
                }).join("") +
              "</select>" +
            "</div>" +
            '<div class="sm:col-span-5">' +
              '<label for="socWaPhone" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Mobile Number · মোবাইল নম্বর *</label>' +
              '<input type="tel" id="socWaPhone" value="' + esc(state.waPhone) + '" placeholder="e.g. 98765 43210" class="pastel-pill-input w-full text-sm font-extrabold tabular-nums" />' +
            "</div>" +
            '<div class="sm:col-span-3">' +
              '<label for="socWaLabel" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Label (Optional)</label>' +
              '<input type="text" id="socWaLabel" maxlength="40" value="' + esc(state.waLabel) + '" placeholder="e.g. Delivery" class="pastel-pill-input w-full text-xs font-semibold" />' +
            "</div>" +
          "</div>" +

          '<div class="space-y-2">' +
            '<label for="socWaMsg" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA]">Prefilled Message · মেসেজ (Optional)</label>' +
            '<textarea id="socWaMsg" rows="3" maxlength="1000" placeholder="Type message or tap a quick template below..." class="pastel-pill-input w-full text-sm font-medium">' + esc(state.waMsg) + "</textarea>" +
            '<div class="flex flex-wrap gap-1.5">' +
              WA_TEMPLATES.map(function(t, idx) {
                return '<button type="button" data-wa-tpl="' + idx + '" class="px-3 py-1.5 rounded-full bg-[var(--oneora-bg)] text-xs font-bold min-h-[38px]">' + esc(t.label) + "</button>";
              }).join("") +
            "</div>" +
          "</div>" +

          '<div class="space-y-2.5 pt-1">' +
            (isValid
              ? '<a id="socWaOpenLink" href="' + esc(waUrl) + '" target="_blank" rel="noopener noreferrer" class="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-full bg-[#15803D] hover:bg-[#166534] text-white text-sm font-extrabold min-h-[48px] shadow-sm transition">Open WhatsApp Chat · হোয়াটসঅ্যাপ খুলুন →</a>' +
                '<div class="grid grid-cols-2 gap-2.5">' +
                  '<button type="button" id="socWaCopyLinkBtn" class="py-3 px-4 rounded-full bg-[#FFE7C2] dark:bg-[#3D2E1D] text-[#5C3400] dark:text-[#FDE68A] text-xs font-extrabold min-h-[44px]">Copy wa.me Link</button>' +
                  '<button type="button" id="socWaQrBtn" class="py-3 px-4 rounded-full bg-[#E4D9FF] dark:bg-[#2D2347] text-[#3E26A0] dark:text-[#E4D9FF] text-xs font-extrabold min-h-[44px]">Generate Chat QR</button>' +
                "</div>"
              : '<button type="button" disabled class="w-full py-3.5 px-5 rounded-full bg-[#2B2236]/15 dark:bg-[#F5EEFF]/15 text-[#5C506B] dark:text-[#C5B9DA] text-xs sm:text-sm font-extrabold min-h-[48px] cursor-not-allowed">Enter at least 7 digits to open WhatsApp</button>') +
          "</div>" +
        "</div>" +
        recentHtml +
      "</div>"
    );
  }

  /* -------------------- 2. SOCIAL IMAGE COMPRESSOR & RESIZER -------------------- */

  function loadSocialImageFile(file, root) {
    if (!file || !file.type || file.type.indexOf("image/") !== 0) {
      notifyToast("Invalid File", "Please choose a JPG, PNG, or WebP image.", "error");
      return;
    }
    var reader = new FileReader();
    reader.onload = function() {
      var dataUrl = String(reader.result || "");
      var img = new Image();
      img.onload = function() {
        state.imgFile = file;
        state.imgDataUrl = dataUrl;
        state.imgOrigW = img.naturalWidth || img.width;
        state.imgOrigH = img.naturalHeight || img.height;
        state.imgOrigBytes = file.size || 0;
        if (state.imgOutUrl) {
          try { URL.revokeObjectURL(state.imgOutUrl); } catch (e) {}
        }
        state.imgOutBlob = null;
        state.imgOutUrl = "";
        render(root);
        processSocialImage(root);
      };
      img.onerror = function() {
        notifyToast("Image Error", "Could not decode this image file.", "error");
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  function canvasToBlob(canvas, mime, quality) {
    return new Promise(function(resolve) {
      if (canvas.toBlob) {
        canvas.toBlob(function(blob) { resolve(blob); }, mime, quality);
      } else {
        var dataUrl = canvas.toDataURL(mime, quality);
        var parts = dataUrl.split(",");
        var bin = atob(parts[1] || "");
        var arr = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        resolve(new Blob([arr], { type: mime }));
      }
    });
  }

  async function processSocialImage(root) {
    if (!state.imgDataUrl) return;
    state.imgBusy = true;

    try {
      var img = await new Promise(function(resolve, reject) {
        var el = new Image();
        el.onload = function() { resolve(el); };
        el.onerror = function() { reject(new Error("Image load failed")); };
        el.src = state.imgDataUrl;
      });

      var preset = IMAGE_PRESETS.find(function(p) { return p.id === state.imgPreset; }) || IMAGE_PRESETS[0];
      var targetW = preset.w;
      var targetH = preset.h;

      if (!preset.crop || targetH === 0) {
        var scale = Math.min(1, targetW / Math.max(img.width, img.height));
        targetW = Math.max(1, Math.round(img.width * scale));
        targetH = Math.max(1, Math.round(img.height * scale));
      }

      var canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      var ctx = canvas.getContext("2d");

      // Warm cream background when fitting inside aspect ratio (never harsh black bars)
      ctx.fillStyle = "#FFF7EE";
      ctx.fillRect(0, 0, targetW, targetH);

      if (!preset.crop || state.imgFitMode === "contain") {
        var fitScale = Math.min(targetW / img.width, targetH / img.height);
        var dw = img.width * fitScale;
        var dh = img.height * fitScale;
        ctx.drawImage(img, (targetW - dw) / 2, (targetH - dh) / 2, dw, dh);
      } else {
        // Smart center cover crop
        var covScale = Math.max(targetW / img.width, targetH / img.height);
        var sw = targetW / covScale;
        var sh = targetH / covScale;
        var sx = (img.width - sw) / 2;
        var sy = (img.height - sh) / 2;
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
      }

      var q = Math.max(0.25, Math.min(0.96, Number(state.imgQuality || 82) / 100));
      var mime = state.imgFormat || "image/jpeg";
      var blob = await canvasToBlob(canvas, mime, q);

      // Optional Target KB binary reduction
      var targetBytes = Number(state.imgTargetKb || 0) * 1024;
      if (targetBytes > 0 && blob && blob.size > targetBytes) {
        var low = 0.15;
        var high = q;
        var best = blob;
        for (var iter = 0; iter < 6; iter++) {
          var mid = (low + high) / 2;
          var candidate = await canvasToBlob(canvas, mime, mid);
          if (candidate && candidate.size <= targetBytes) {
            best = candidate;
            low = mid;
          } else {
            high = mid;
          }
        }
        blob = best;
      }

      if (state.imgOutUrl) {
        try { URL.revokeObjectURL(state.imgOutUrl); } catch (e) {}
      }
      state.imgOutBlob = blob;
      state.imgOutUrl = blob ? URL.createObjectURL(blob) : "";
      state.imgOutW = targetW;
      state.imgOutH = targetH;
    } catch (err) {
      notifyToast("Compression Failed", err && err.message ? err.message : "Could not process image.", "error");
    } finally {
      state.imgBusy = false;
      render(root);
    }
  }

  function renderSocialImgPanel() {
    var savedPct = state.imgOutBlob && state.imgOrigBytes > 0
      ? Math.round((1 - state.imgOutBlob.size / state.imgOrigBytes) * 100)
      : 0;

    return (
      '<div class="space-y-4">' +
        '<div class="pastel-stage3-card p-5 space-y-4">' +
          '<div>' +
            '<p class="text-[11px] font-extrabold uppercase tracking-wider text-[#804800] dark:text-[#FCD34D]">100% Offline · অন-ডিভাইস ইমেজ অপ্টিমাইজার</p>' +
            '<h3 class="text-base sm:text-lg font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">Social Image Compressor &amp; Resizer</h3>' +
            '<p class="text-xs font-medium text-[#5C506B] dark:text-[#C5B9DA] mt-0.5">Resize &amp; compress photos for WhatsApp DP, Status, Instagram, YouTube &amp; Facebook without uploading anywhere.</p>' +
          "</div>" +

          '<label class="w-full cursor-pointer flex flex-col items-center justify-center gap-2 p-6 rounded-[24px] border-2 border-dashed border-[#804800]/35 bg-[#FFE7C2]/35 dark:bg-[#3D2E1D]/60 text-center min-h-[116px] hover:bg-[#FFE7C2]/55 transition">' +
            '<span class="w-11 h-11 rounded-[16px] bg-white dark:bg-[#221C2E] text-[#804800] dark:text-[#FCD34D] inline-flex items-center justify-center shadow-xs">' +
              '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect width="18" height="18" x="3" y="3" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>' +
            "</span>" +
            '<span class="text-xs sm:text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">' +
              (state.imgFile ? esc(state.imgFile.name) + " (" + state.imgOrigW + "×" + state.imgOrigH + " · " + formatBytes(state.imgOrigBytes) + ")" : "Tap to choose photo · ছবি নির্বাচন করুন") +
            "</span>" +
            '<span class="text-[11px] font-semibold text-[#5C506B] dark:text-[#C5B9DA]">JPG, PNG, WebP · Private offline processing</span>' +
            '<input type="file" id="socImgInput" accept="image/*" class="hidden" />' +
          "</label>" +

          '<div class="space-y-2">' +
            '<p class="text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA]">Social Presets · সাইজ প্রিসেট</p>' +
            '<div class="flex flex-wrap gap-1.5">' +
              IMAGE_PRESETS.map(function(p) {
                return '<button type="button" data-soc-preset="' + p.id + '" class="pastel-pill-tab ' + (state.imgPreset === p.id ? "is-active" : "") + '">' + esc(p.label) + " (" + esc(p.desc) + ")</button>";
              }).join("") +
            "</div>" +
          "</div>" +

          '<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">' +
            '<div>' +
              '<label for="socImgFit" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Crop / Fit Mode</label>' +
              '<select id="socImgFit" class="pastel-pill-input w-full text-xs font-bold">' +
                '<option value="cover"' + (state.imgFitMode === "cover" ? " selected" : "") + ">Smart Center Crop (Fill)</option>" +
                '<option value="contain"' + (state.imgFitMode === "contain" ? " selected" : "") + ">Fit Whole Photo (No Crop)</option>" +
              "</select>" +
            "</div>" +
            '<div>' +
              '<label for="socImgFmt" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Format</label>' +
              '<select id="socImgFmt" class="pastel-pill-input w-full text-xs font-bold">' +
                '<option value="image/jpeg"' + (state.imgFormat === "image/jpeg" ? " selected" : "") + ">JPG (Best Compatibility)</option>" +
                '<option value="image/webp"' + (state.imgFormat === "image/webp" ? " selected" : "") + ">WebP (Smallest File)</option>" +
              "</select>" +
            "</div>" +
            '<div>' +
              '<label for="socImgTargetKb" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Target Max KB (0 = Auto)</label>' +
              '<select id="socImgTargetKb" class="pastel-pill-input w-full text-xs font-bold">' +
                '<option value="0"' + (state.imgTargetKb === 0 ? " selected" : "") + ">Auto (Use Quality Slider)</option>" +
                '<option value="100"' + (state.imgTargetKb === 100 ? " selected" : "") + ">Under 100 KB</option>" +
                '<option value="200"' + (state.imgTargetKb === 200 ? " selected" : "") + ">Under 200 KB</option>" +
                '<option value="500"' + (state.imgTargetKb === 500 ? " selected" : "") + ">Under 500 KB</option>" +
              "</select>" +
            "</div>" +
          "</div>" +

          '<div class="space-y-1">' +
            '<div class="flex justify-between text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA]"><span>Quality · কোয়ালিটি</span><span class="tabular-nums">' + state.imgQuality + "%</span></div>" +
            '<input type="range" id="socImgQuality" min="35" max="95" value="' + state.imgQuality + '" class="w-full accent-[#5B3FD0]" />' +
          "</div>" +

          (state.imgFile
            ? '<button type="button" id="socImgApplyBtn" class="w-full py-3.5 rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white text-xs sm:text-sm font-extrabold min-h-[48px] shadow-sm">' + (state.imgBusy ? "Compressing..." : "Compress & Resize Now") + "</button>"
            : "") +
        "</div>" +

        (state.imgOutBlob && state.imgOutUrl
          ? '<div class="pastel-stage3-card p-5 space-y-4 animate-fade-in">' +
              '<div class="flex flex-wrap items-center justify-between gap-2">' +
                '<div>' +
                  '<p class="text-[11px] font-extrabold uppercase tracking-wider text-[#115E42] dark:text-[#6EE7B7]">Optimized Ready · তৈরি</p>' +
                  '<p class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF] tabular-nums">' +
                    state.imgOutW + "×" + state.imgOutH + " · " + formatBytes(state.imgOutBlob.size) +
                    (savedPct > 0 ? " (Saved " + savedPct + "%)" : "") +
                  "</p>" +
                "</div>" +
                '<span class="px-3 py-1 rounded-full bg-[#CFF3E2] dark:bg-[#1B362E] text-[#115E42] dark:text-[#A7F3D0] text-xs font-extrabold tabular-nums">Was ' + formatBytes(state.imgOrigBytes) + "</span>" +
              "</div>" +
              '<div class="rounded-[22px] overflow-hidden bg-[#FFF7EE] dark:bg-[#17131F] border border-[var(--oneora-border)] flex items-center justify-center p-2 max-h-72">' +
                '<img src="' + esc(state.imgOutUrl) + '" alt="Compressed preview" class="max-h-64 w-auto object-contain rounded-[16px]" />' +
              "</div>" +
              '<div class="grid grid-cols-2 gap-2.5">' +
                '<button type="button" id="socImgDownloadBtn" class="py-3 px-4 rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white text-xs font-extrabold min-h-[48px] shadow-sm">Download · ডাউনলোড</button>' +
                '<button type="button" id="socImgShareBtn" class="py-3 px-4 rounded-full bg-[#FFE7C2] dark:bg-[#3D2E1D] text-[#5C3400] dark:text-[#FDE68A] text-xs font-extrabold min-h-[48px]">Share · শেয়ার</button>' +
              "</div>" +
            "</div>"
          : "") +
      "</div>"
    );
  }

  /* -------------------- 3. AI CAPTION, BIO & HASHTAG GENERATOR -------------------- */

  function buildOfflineStarterOutput(topic, platform, contentType, tone, lang) {
    var cleanTopic = String(topic || "my day").trim();
    var slug = cleanTopic.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 18) || "oneora";

    if (lang === "bn") {
      return [
        "✨ অফলাইন স্টার্টার আইডিয়া (" + platform + " · " + tone + "):",
        "",
        "📝 ক্যাপশন (Captions):",
        "1. " + cleanTopic + " — প্রতিটি ছোট্ট মুহূর্তেই লুকিয়ে থাকে বড় আনন্দ! ✨",
        "2. আজকের গল্পটা একটু আলাদা — " + cleanTopic + " 💛",
        "3. সরলতা আর ভালোবাসায় ভরা সময়: " + cleanTopic + "। আপনার কেমন লাগলো কমেন্টে জানান!",
        "",
        "👤 প্রোফাইল বায়ো (Bio):",
        "✨ " + cleanTopic + " প্রেমী | প্রতিদিন নতুন কিছু শেখার পথে | Kolkata · India",
        "",
        "#️⃣ হ্যাশট্যাগ (Hashtags):",
        "#Bangla #Kolkata #" + slug + " #BanglaCaption #DailyVibes #ONEORA #WestBengal #TrendingNow"
      ].join("\n");
    }

    if (lang === "banglish") {
      return [
        "✨ Offline Starter Pack (" + platform + " · " + tone + "):",
        "",
        "📝 Captions:",
        "1. " + cleanTopic + " — chhoto muhurto, boro hashi! ✨",
        "2. Ajker vibe ekdom alada: " + cleanTopic + " 💛",
        "3. Simple moments make the best memories — " + cleanTopic + "!",
        "",
        "👤 Bio:",
        "✨ Creating & exploring " + cleanTopic + " | Good vibes only | India",
        "",
        "#️⃣ Hashtags:",
        "#Banglish #KolkataVibes #" + slug + " #DesiVibes #DailyMood #TrendingIndia #InstaBangla"
      ].join("\n");
    }

    return [
      "✨ Offline Starter Pack (" + platform + " · " + tone + "):",
      "",
      "📝 Captions (" + contentType + "):",
      "1. Keeping it real with " + cleanTopic + " — small moments, big smiles. ✨",
      "2. Today's highlight: " + cleanTopic + ". Drop a 💛 if you feel this vibe!",
      "3. Built with passion & patience — " + cleanTopic + ".",
      "",
      "👤 Profile Bio:",
      "✨ " + cleanTopic + " | Sharing everyday stories & ideas | DM for collabs",
      "",
      "#️⃣ Hashtags:",
      "#" + slug + " #DailyVibes #IndiaCreators #Trending #GoodVibesOnly #ContentCreator #ExplorePage"
    ].join("\n");
  }

  async function runAiSocialGenerator(root) {
    var topic = String(state.aiTopic || "").trim();
    if (!topic) {
      notifyToast("Add a Topic", "Describe your post, shop offer, or vibe first.", "error");
      return;
    }

    state.aiError = "";
    state.aiOfflineUsed = false;

    if (!navigator.onLine) {
      state.aiError = "You are offline. AI Caption Generator needs internet — tap \"Use Offline Starter Templates\" below to keep working offline.";
      render(root);
      return;
    }

    var rl = checkClientRateLimit();
    if (!rl.ok) {
      state.aiError = "Rate limit reached. Please wait " + rl.waitSec + " second(s) before generating again.";
      render(root);
      return;
    }

    state.aiBusy = true;
    render(root);

    var langName = state.aiLang === "bn" ? "Bengali (বাংলা)" : state.aiLang === "banglish" ? "Banglish (Bengali written in English letters)" : state.aiLang === "hi" ? "Hindi (हिन्दी)" : "English";
    var prompt =
      "Create " + state.aiType + " for " + state.aiPlatform + " in " + langName + " with a " + state.aiTone + " tone.\n" +
      "Topic / Context: " + topic + "\n" +
      "Format cleanly with short numbered options (3 captions, 2 concise bios if requested, and 10 relevant hashtags). Keep it natural, engaging, and copy-paste ready.";

    try {
      var resp = await fetch(getAiProxyUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: prompt,
          language: state.aiLang === "banglish" ? "en" : state.aiLang,
          template: "social_caption_bio"
        })
      });
      var data = await resp.json().catch(function() { return {}; });
      if (!resp.ok) {
        throw new Error(data.error || "AI service returned status " + resp.status);
      }
      state.aiOutput = String(data.reply || "").trim();
      if (!state.aiOutput) throw new Error("Empty response from AI proxy.");
      haptic(10);
    } catch (err) {
      state.aiError = (err && err.message ? err.message : "Could not reach AI service.") + " You can still use Offline Starter Templates below.";
    } finally {
      state.aiBusy = false;
      render(root);
    }
  }

  function renderAiSocialPanel(store) {
    var online = navigator.onLine;
    return (
      '<div class="space-y-4">' +
        '<div class="pastel-stage3-card p-5 space-y-4">' +
          '<div class="flex flex-wrap items-start justify-between gap-2">' +
            '<div>' +
              '<div class="flex items-center gap-2 flex-wrap">' +
                '<p class="text-[11px] font-extrabold uppercase tracking-wider text-[#5B3FD0] dark:text-[#CBBBFF]">Creator Studio · ক্যাপশন ও বায়ো</p>' +
                '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ' +
                  (online
                    ? "bg-[#E4D9FF] dark:bg-[#2D2347] text-[#3E26A0] dark:text-[#E4D9FF]"
                    : "bg-[#FFD6D6] dark:bg-[#3D212B] text-[#8E1B3B] dark:text-[#FDA4AF]") +
                  '">Needs internet · ' + (online ? "Online" : "Offline") + "</span>" +
              "</div>" +
              '<h3 class="text-base sm:text-lg font-extrabold text-[#2B2236] dark:text-[#F5EEFF] mt-0.5">AI Caption, Bio &amp; Hashtag Generator</h3>' +
            "</div>" +
          "</div>" +

          (!online
            ? '<div class="rounded-[18px] p-3.5 bg-[#FFE7C2]/80 dark:bg-[#3D2E1D] text-xs font-bold text-[#5C3400] dark:text-[#FDE68A]">You are currently offline. Live AI generation needs internet, or use <strong>Offline Starter Templates</strong> below right away.</div>'
            : "") +

          '<div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">' +
            '<div>' +
              '<label for="socAiPlatform" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Platform</label>' +
              '<select id="socAiPlatform" class="pastel-pill-input w-full text-xs font-bold">' +
                ["Instagram", "Facebook", "WhatsApp Status", "YouTube Shorts", "LinkedIn"].map(function(pl) {
                  return '<option value="' + pl + '"' + (state.aiPlatform === pl ? " selected" : "") + ">" + pl + "</option>";
                }).join("") +
              "</select>" +
            "</div>" +
            '<div>' +
              '<label for="socAiType" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Generate</label>' +
              '<select id="socAiType" class="pastel-pill-input w-full text-xs font-bold">' +
                ["All-in-One Pack", "Captions Only", "Profile Bio", "Hashtags Only"].map(function(tp) {
                  return '<option value="' + tp + '"' + (state.aiType === tp ? " selected" : "") + ">" + tp + "</option>";
                }).join("") +
              "</select>" +
            "</div>" +
            '<div>' +
              '<label for="socAiLang" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Language · ভাষা</label>' +
              '<select id="socAiLang" class="pastel-pill-input w-full text-xs font-bold">' +
                '<option value="bn"' + (state.aiLang === "bn" ? " selected" : "") + ">বাংলা (Bengali)</option>" +
                '<option value="en"' + (state.aiLang === "en" ? " selected" : "") + ">English</option>" +
                '<option value="banglish"' + (state.aiLang === "banglish" ? " selected" : "") + ">Banglish (বাংলিশ)</option>" +
                '<option value="hi"' + (state.aiLang === "hi" ? " selected" : "") + ">हिन्दी (Hindi)</option>" +
              "</select>" +
            "</div>" +
          "</div>" +

          '<div class="space-y-1.5">' +
            '<p class="text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA]">Tone · ধরন</p>' +
            '<div class="flex flex-wrap gap-1.5">' +
              ["Friendly", "Professional", "Funny / Desi", "Inspirational", "Shop / Offer", "Festival / Pujo"].map(function(tn) {
                return '<button type="button" data-soc-tone="' + esc(tn) + '" class="pastel-pill-tab ' + (state.aiTone === tn ? "is-active" : "") + '">' + esc(tn) + "</button>";
              }).join("") +
            "</div>" +
          "</div>" +

          '<div>' +
            '<label for="socAiTopic" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Topic or Post Idea · বিষয় লিখুন *</label>' +
            '<textarea id="socAiTopic" rows="3" maxlength="500" placeholder="e.g. Evening tea with rain in Kolkata, New festive saree collection 20% off..." class="pastel-pill-input w-full text-sm font-medium">' + esc(state.aiTopic) + "</textarea>" +
          "</div>" +

          '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">' +
            '<button type="button" id="socAiGenBtn" ' + (state.aiBusy ? "disabled" : "") + ' class="py-3.5 px-4 rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white text-xs sm:text-sm font-extrabold min-h-[48px] shadow-sm">' +
              (state.aiBusy ? "Generating with AI..." : "Generate with AI · তৈরি করুন") +
            "</button>" +
            '<button type="button" id="socAiOfflineBtn" class="py-3.5 px-4 rounded-full bg-[#FFE7C2] dark:bg-[#3D2E1D] text-[#5C3400] dark:text-[#FDE68A] text-xs font-extrabold min-h-[48px]">Use Offline Starter Templates</button>' +
          "</div>" +

          (state.aiError
            ? '<p class="text-xs font-bold text-[#8E1B3B] dark:text-[#FDA4AF] bg-[#FFD6D6]/60 dark:bg-[#3D212B] p-3 rounded-[16px]">' + esc(state.aiError) + "</p>"
            : "") +
        "</div>" +

        (state.aiOutput
          ? '<div class="pastel-stage3-card p-5 space-y-3.5 animate-fade-in">' +
              '<div class="flex items-center justify-between gap-2">' +
                '<p class="text-xs font-extrabold text-[#115E42] dark:text-[#6EE7B7]">' + (state.aiOfflineUsed ? "Offline Starter Result" : "AI Generated Result") + "</p>" +
                '<span class="text-[11px] font-bold text-[#5C506B] dark:text-[#C5B9DA]">' + esc(state.aiPlatform) + " · " + esc(state.aiTone) + "</span>" +
              "</div>" +
              '<div class="pastel-inset-tile p-4 text-xs sm:text-sm font-medium whitespace-pre-wrap leading-relaxed text-[#2B2236] dark:text-[#F5EEFF]">' + esc(state.aiOutput) + "</div>" +
              '<div class="grid grid-cols-3 gap-2">' +
                '<button type="button" id="socAiCopyBtn" class="py-3 px-3 rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white text-xs font-extrabold min-h-[44px]">Copy · কপি</button>' +
                '<button type="button" id="socAiSaveBtn" class="py-3 px-3 rounded-full bg-[#FFE7C2] dark:bg-[#3D2E1D] text-[#5C3400] dark:text-[#FDE68A] text-xs font-extrabold min-h-[44px]">Save · সেভ</button>' +
                '<button type="button" id="socAiShareBtn" class="py-3 px-3 rounded-full bg-[#CFF3E2] dark:bg-[#1B362E] text-[#115E42] dark:text-[#A7F3D0] text-xs font-extrabold min-h-[44px]">Share</button>' +
              "</div>" +
            "</div>"
          : "") +

        (store.savedCaptions.length
          ? '<div class="pastel-stage3-card p-4 sm:p-5 space-y-2.5">' +
              '<h4 class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">Saved Captions &amp; Bios (' + store.savedCaptions.length + ")</h4>" +
              '<div class="space-y-2">' +
                store.savedCaptions.map(function(item) {
                  return (
                    '<div class="pastel-inset-tile p-3.5 flex items-start justify-between gap-2">' +
                      '<div class="min-w-0 flex-1">' +
                        '<p class="text-[11px] font-extrabold text-[#5B3FD0] dark:text-[#CBBBFF]">' + esc(item.platform) + " · " + esc(item.topic) + "</p>" +
                        '<p class="text-xs font-medium text-[#2B2236] dark:text-[#F5EEFF] line-clamp-2 mt-0.5">' + esc(item.text) + "</p>" +
                      "</div>" +
                      '<div class="flex items-center gap-1.5 shrink-0">' +
                        '<button type="button" data-cap-copy="' + esc(item.id) + '" class="px-3 py-2 rounded-full bg-white dark:bg-[#221C2E] text-[#5B3FD0] dark:text-[#CBBBFF] text-xs font-extrabold min-h-[40px]">Copy</button>' +
                        '<button type="button" data-cap-del="' + esc(item.id) + '" aria-label="Delete" class="w-10 h-10 rounded-full bg-[#FFD6D6]/80 dark:bg-[#3D212B] text-[#8E1B3B] dark:text-[#FDA4AF] text-xs font-extrabold">✕</button>' +
                      "</div>" +
                    "</div>"
                  );
                }).join("") +
              "</div>" +
            "</div>"
          : "") +
      "</div>"
    );
  }

  /* -------------------- Main Renderer & Event Wiring -------------------- */

  function render(container, subTab) {
    var root = container || document.getElementById("oneoraSocialRoot");
    if (!root) return;

    if (subTab && SOCIAL_TABS.some(function(t) { return t.id === subTab; })) {
      state.activeTab = subTab;
    }

    var store = loadStore();
    var panelHtml = "";
    if (state.activeTab === "wa_direct") panelHtml = renderWaDirectPanel(store);
    else if (state.activeTab === "social_img") panelHtml = renderSocialImgPanel();
    else panelHtml = renderAiSocialPanel(store);

    root.innerHTML =
      '<div class="space-y-4" data-pastel-cat="lifemoney">' +
        '<div class="pastel-cat-header p-5 sm:p-6 space-y-4">' +
          '<div class="flex items-start gap-3.5">' +
            '<div class="pastel-icon-tile !w-12 !h-12 !rounded-2xl shrink-0">' +
              '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>' +
            "</div>" +
            '<div>' +
              '<p class="text-[11px] font-extrabold uppercase tracking-wider text-[#804800] dark:text-[#FCD34D]">WhatsApp &amp; Social · সোশ্যাল টুলস</p>' +
              '<h2 class="text-2xl sm:text-[26px] font-extrabold tracking-tight text-[#2B2236] dark:text-[#F5EEFF] leading-tight">WhatsApp &amp; Social Studio</h2>' +
            "</div>" +
          "</div>" +
          '<div class="flex items-center gap-2 overflow-x-auto hide-scrollbar pt-1">' +
            SOCIAL_TABS.map(function(t) {
              return '<button type="button" data-soc-tab="' + t.id + '" class="pastel-pill-tab ' + (state.activeTab === t.id ? "is-active" : "") + '">' +
                esc(t.label) + (t.needsNet ? " · Net" : "") +
              "</button>";
            }).join("") +
          "</div>" +
        "</div>" +
        panelHtml +
      "</div>";

    bindEvents(root);
  }

  function bindEvents(root) {
    root.querySelectorAll("[data-soc-tab]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        state.activeTab = btn.getAttribute("data-soc-tab") || "wa_direct";
        haptic(6);
        render(root);
      });
    });

    // Direct WhatsApp events
    var ccEl = root.querySelector("#socWaCountry");
    var phEl = root.querySelector("#socWaPhone");
    var lbEl = root.querySelector("#socWaLabel");
    var msgEl = root.querySelector("#socWaMsg");
    var openWaLink = root.querySelector("#socWaOpenLink");
    var copyWaBtn = root.querySelector("#socWaCopyLinkBtn");
    var qrWaBtn = root.querySelector("#socWaQrBtn");
    var clearRecBtn = root.querySelector("#socWaClearRecentBtn");

    if (ccEl) ccEl.addEventListener("change", function() { state.waCountry = ccEl.value; render(root); });
    if (phEl) {
      phEl.addEventListener("input", function() {
        state.waPhone = phEl.value;
        var pos = phEl.selectionStart;
        render(root);
        var re = root.querySelector("#socWaPhone");
        if (re) {
          re.focus();
          try { re.setSelectionRange(pos, pos); } catch (e) {}
        }
      });
    }
    if (lbEl) lbEl.addEventListener("input", function() { state.waLabel = lbEl.value; });
    if (msgEl) {
      msgEl.addEventListener("input", function() {
        state.waMsg = msgEl.value;
        var link = root.querySelector("#socWaOpenLink");
        if (link) {
          var full = buildFullWaNumber(state.waCountry, state.waPhone);
          link.href = "https://wa.me/" + encodeURIComponent(full) + (state.waMsg.trim() ? "?text=" + encodeURIComponent(state.waMsg.trim()) : "");
        }
      });
    }
    root.querySelectorAll("[data-wa-tpl]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var idx = Number(btn.getAttribute("data-wa-tpl"));
        if (WA_TEMPLATES[idx]) {
          state.waMsg = WA_TEMPLATES[idx].text;
          render(root);
        }
      });
    });
    if (openWaLink) {
      openWaLink.addEventListener("click", function() {
        recordRecentWa(state.waCountry, state.waPhone, state.waLabel, state.waMsg);
      });
    }
    if (copyWaBtn) {
      copyWaBtn.addEventListener("click", function() {
        var full = buildFullWaNumber(state.waCountry, state.waPhone);
        var url = "https://wa.me/" + encodeURIComponent(full) + (state.waMsg.trim() ? "?text=" + encodeURIComponent(state.waMsg.trim()) : "");
        recordRecentWa(state.waCountry, state.waPhone, state.waLabel, state.waMsg);
        copyText(url, "WhatsApp link");
      });
    }
    if (qrWaBtn) {
      qrWaBtn.addEventListener("click", function() {
        var full = buildFullWaNumber(state.waCountry, state.waPhone);
        var url = "https://wa.me/" + encodeURIComponent(full) + (state.waMsg.trim() ? "?text=" + encodeURIComponent(state.waMsg.trim()) : "");
        recordRecentWa(state.waCountry, state.waPhone, state.waLabel, state.waMsg);
        openWaQrModal(url, full);
      });
    }
    if (clearRecBtn) {
      clearRecBtn.addEventListener("click", function() {
        var st = loadStore();
        st.recentWa = [];
        saveStore(st);
        render(root);
      });
    }
    root.querySelectorAll("[data-wa-reuse]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var id = btn.getAttribute("data-wa-reuse");
        var found = loadStore().recentWa.find(function(x) { return x.id === id; });
        if (found) {
          state.waCountry = found.country || "91";
          state.waPhone = found.phone || "";
          state.waLabel = found.label || "";
          state.waMsg = found.lastMsg || "";
          render(root);
        }
      });
    });
    root.querySelectorAll("[data-wa-del]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var id = btn.getAttribute("data-wa-del");
        var st = loadStore();
        st.recentWa = st.recentWa.filter(function(x) { return x.id !== id; });
        saveStore(st);
        render(root);
      });
    });

    // Social Image Compressor events
    var imgInput = root.querySelector("#socImgInput");
    if (imgInput) {
      imgInput.addEventListener("change", function(ev) {
        var files = ev.target.files;
        if (files && files[0]) loadSocialImageFile(files[0], root);
      });
    }
    root.querySelectorAll("[data-soc-preset]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        state.imgPreset = btn.getAttribute("data-soc-preset") || "wa_dp";
        if (state.imgDataUrl) processSocialImage(root);
        else render(root);
      });
    });
    var fitEl = root.querySelector("#socImgFit");
    var fmtEl = root.querySelector("#socImgFmt");
    var kbEl = root.querySelector("#socImgTargetKb");
    var qEl = root.querySelector("#socImgQuality");
    var applyImgBtn = root.querySelector("#socImgApplyBtn");
    var dlImgBtn = root.querySelector("#socImgDownloadBtn");
    var shImgBtn = root.querySelector("#socImgShareBtn");

    if (fitEl) fitEl.addEventListener("change", function() { state.imgFitMode = fitEl.value; if (state.imgDataUrl) processSocialImage(root); });
    if (fmtEl) fmtEl.addEventListener("change", function() { state.imgFormat = fmtEl.value; if (state.imgDataUrl) processSocialImage(root); });
    if (kbEl) kbEl.addEventListener("change", function() { state.imgTargetKb = Number(kbEl.value || 0); if (state.imgDataUrl) processSocialImage(root); });
    if (qEl) qEl.addEventListener("change", function() { state.imgQuality = Number(qEl.value || 82); if (state.imgDataUrl) processSocialImage(root); });
    if (applyImgBtn) applyImgBtn.addEventListener("click", function() { haptic(8); processSocialImage(root); });

    function getImgFilename() {
      var ext = state.imgFormat === "image/webp" ? "webp" : "jpg";
      return "ONEORA_" + state.imgPreset + "_" + state.imgOutW + "x" + state.imgOutH + "." + ext;
    }

    if (dlImgBtn) {
      dlImgBtn.addEventListener("click", function() {
        if (!state.imgOutBlob) return;
        var fname = getImgFilename();
        if (global.utils && typeof global.utils.downloadBlob === "function") {
          global.utils.downloadBlob(state.imgOutBlob, fname);
        } else {
          var a = document.createElement("a");
          a.href = state.imgOutUrl;
          a.download = fname;
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
        notifyToast("Saved · সেভ হয়েছে", fname + " downloaded.", "success");
      });
    }
    if (shImgBtn) {
      shImgBtn.addEventListener("click", function() {
        if (!state.imgOutBlob) return;
        var fname = getImgFilename();
        try {
          var file = new File([state.imgOutBlob], fname, { type: state.imgFormat });
          if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
            navigator.share({ title: "ONEORA Social Image", files: [file] }).catch(function() {});
            return;
          }
        } catch (e) {}
        if (dlImgBtn) dlImgBtn.click();
      });
    }

    // AI Caption / Bio / Hashtag events
    var plEl = root.querySelector("#socAiPlatform");
    var tpEl = root.querySelector("#socAiType");
    var lgEl = root.querySelector("#socAiLang");
    var topicEl = root.querySelector("#socAiTopic");
    var genBtn = root.querySelector("#socAiGenBtn");
    var offBtn = root.querySelector("#socAiOfflineBtn");
    var capCopyBtn = root.querySelector("#socAiCopyBtn");
    var capSaveBtn = root.querySelector("#socAiSaveBtn");
    var capShareBtn = root.querySelector("#socAiShareBtn");

    if (plEl) plEl.addEventListener("change", function() { state.aiPlatform = plEl.value; });
    if (tpEl) tpEl.addEventListener("change", function() { state.aiType = tpEl.value; });
    if (lgEl) lgEl.addEventListener("change", function() { state.aiLang = lgEl.value; });
    if (topicEl) topicEl.addEventListener("input", function() { state.aiTopic = topicEl.value; });

    root.querySelectorAll("[data-soc-tone]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        state.aiTone = btn.getAttribute("data-soc-tone") || "Friendly";
        render(root);
      });
    });
    if (genBtn) genBtn.addEventListener("click", function() { runAiSocialGenerator(root); });
    if (offBtn) {
      offBtn.addEventListener("click", function() {
        state.aiError = "";
        state.aiOfflineUsed = true;
        state.aiOutput = buildOfflineStarterOutput(state.aiTopic, state.aiPlatform, state.aiType, state.aiTone, state.aiLang);
        haptic(8);
        render(root);
      });
    }
    if (capCopyBtn) capCopyBtn.addEventListener("click", function() { copyText(state.aiOutput, "Captions & Hashtags"); });
    if (capSaveBtn) {
      capSaveBtn.addEventListener("click", function() {
        if (!state.aiOutput) return;
        var st = loadStore();
        st.savedCaptions.unshift({
          id: uid("cap"),
          platform: state.aiPlatform,
          topic: String(state.aiTopic || state.aiTone).slice(0, 60),
          text: state.aiOutput,
          atMs: Date.now()
        });
        saveStore(st);
        notifyToast("Saved · সেভ হয়েছে", "Caption saved to offline library.", "success");
        render(root);
      });
    }
    if (capShareBtn) {
      capShareBtn.addEventListener("click", function() {
        if (navigator.share) {
          navigator.share({ title: state.aiPlatform + " Captions", text: state.aiOutput }).catch(function() {});
        } else {
          copyText(state.aiOutput, "Captions");
        }
      });
    }
    root.querySelectorAll("[data-cap-copy]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var id = btn.getAttribute("data-cap-copy");
        var found = loadStore().savedCaptions.find(function(x) { return x.id === id; });
        if (found) copyText(found.text, "Saved caption");
      });
    });
    root.querySelectorAll("[data-cap-del]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var id = btn.getAttribute("data-cap-del");
        var st = loadStore();
        st.savedCaptions = st.savedCaptions.filter(function(x) { return x.id !== id; });
        saveStore(st);
        render(root);
      });
    });
  }

  global.OneoraSocialTools = {
    render: render,
    open: function(subTab) {
      if (subTab) state.activeTab = subTab;
      if (typeof global.openPdfBondhuTool === "function") {
        global.openPdfBondhuTool("oneoraSocialTool", { sub: state.activeTab });
      } else {
        render(null, state.activeTab);
      }
    }
  };
})(window);
