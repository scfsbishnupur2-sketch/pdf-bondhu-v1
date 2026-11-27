(function(global) {
  "use strict";
  const FEEDBACK_ENDPOINT = "";
  const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.oneora.app";
  const SUPPORT_EMAIL = "suman.pba@gmail.com";
  const APP_VERSION = "3.0.0";
  const REVIEW_TASK_THRESHOLD = 3;
  const SNOOZE_MS = 14 * 24 * 60 * 60 * 1e3;
  const KEY_CONTACT = "oneora_profile_contact";
  const KEY_USAGE_DAYS = "oneora_profile_usage_days";
  const KEY_TASK_COUNT = "oneora_profile_task_count";
  const KEY_RATING = "oneora_profile_rating";
  const KEY_REVIEW_DONE = "oneora_profile_review_done";
  const KEY_REVIEW_SNOOZE = "oneora_profile_review_snooze_until";
  const KEY_FEEDBACK_QUEUE = "oneora_profile_feedback_queue";
  const LEGACY_PROFILE_KEY = "pdfBondhuProfile_v2";
  const LEGACY_ONBOARD_KEY = "oneoraOnboarding_v1";
  const LEGACY_RECENT_DOCS = "pdfBondhuRecentDocs_v2";
  const LEGACY_VAULT_PIN = "pdfBondhuVaultPinHash_v2";
  const PERSONA_LABELS = {
    student: "Student",
    shop_owner: "Shop Owner",
    job_seeker: "Job Seeker",
    general: "General"
  };
  let selectedStars = 0;
  let selectedRateTags = /* @__PURE__ */ new Set();
  let selectedFbType = "Bug";
  let pendingScreenshotDataUrl = "";
  let reviewPromptShownThisSession = false;
  function loadJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function saveJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
    }
  }
  function esc(str) {
    return String(str != null ? str : "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function todayKey(d = /* @__PURE__ */ new Date()) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  function haptic(ms = 10) {
    if (typeof global.oneoraHaptic === "function") global.oneoraHaptic(ms);
  }
  function toast(title, msg, type = "success") {
    if (global.utils && typeof global.utils.showToast === "function") {
      global.utils.showToast(title, msg, type);
    }
  }
  function openExternalLink(url) {
    try {
      if (global.AndroidBridge && typeof global.AndroidBridge.openExternalUrl === "function") {
        global.AndroidBridge.openExternalUrl(url);
        return;
      }
      const a = document.createElement("a");
      a.href = url;
      if (/^https?:\/\//i.test(url)) {
        a.target = "_blank";
        a.rel = "noopener noreferrer";
      }
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      try {
        window.location.href = url;
      } catch (e2) {
      }
    }
  }
  function getNonPersonalDeviceInfo() {
    const runtime = global.AndroidBridge ? "Android WebView" : "Mobile/Web Browser";
    const lang = document.documentElement.lang || navigator.language || "en";
    const vw = window.screen ? `${window.screen.width}x${window.screen.height}` : "unknown";
    const theme = document.documentElement.classList.contains("dark") ? "Dark" : "Light";
    const net = navigator.onLine ? "Online" : "Offline";
    return `ONEORA v${APP_VERSION} · ${runtime} · ${vw} · ${theme} · ${lang} · ${net}`;
  }
  function recordUsageToday() {
    const days = loadJson(KEY_USAGE_DAYS, []);
    const list = Array.isArray(days) ? days.filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x)) : [];
    const today = todayKey();
    if (!list.includes(today)) {
      list.push(today);
      list.sort();
      saveJson(KEY_USAGE_DAYS, list.slice(-400));
    }
    return list;
  }
  function computeCurrentStreak(days) {
    const set = new Set(days);
    let streak = 0;
    const cursor = /* @__PURE__ */ new Date();
    cursor.setHours(12, 0, 0, 0);
    while (set.has(todayKey(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return Math.max(1, streak);
  }
  function getFilesProcessedCount() {
    const profileCount = parseInt(localStorage.getItem(KEY_TASK_COUNT) || "0", 10) || 0;
    const legacyCount = parseInt(localStorage.getItem("pdfBondhuCount") || "0", 10) || 0;
    const recentDocs = loadJson(LEGACY_RECENT_DOCS, []);
    const docsLen = Array.isArray(recentDocs) ? recentDocs.length : 0;
    return Math.max(profileCount, legacyCount, docsLen);
  }
  function computeInitials(name) {
    const clean = String(name || "").trim();
    if (!clean) return "ON";
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return clean.slice(0, 2).toUpperCase();
  }
  function refreshProfileUI() {
    const days = recordUsageToday();
    const filesProcessed = getFilesProcessedCount();
    const daysUsed = Math.max(1, days.length);
    const streak = computeCurrentStreak(days);
    const legacyProf = loadJson(LEGACY_PROFILE_KEY, {});
    const nameInput = document.getElementById("profileUserNameInput");
    const displayName = nameInput && nameInput.value.trim() || legacyProf.name || "ONEORA User";
    const initials = computeInitials(displayName);
    const contact = localStorage.getItem(KEY_CONTACT) || "";
    const onboard = loadJson(LEGACY_ONBOARD_KEY, {});
    const personaKey = onboard.persona || "general";
    const personaLabel = PERSONA_LABELS[personaKey] || "General";
    const avatarEl = document.getElementById("oneoraProfileAvatar");
    const nameHeading = document.getElementById("oneoraProfileDisplayName");
    const contactSub = document.getElementById("oneoraProfileContactSub");
    const personaBadge = document.getElementById("oneoraProfilePersonaBadge");
    const contactInput = document.getElementById("oneoraProfileContactInput");
    const fbContactInput = document.getElementById("oneoraFbContactInput");
    if (avatarEl) avatarEl.textContent = initials;
    if (nameHeading) nameHeading.textContent = displayName;
    if (contactSub) {
      contactSub.textContent = contact ? `${contact} · Stored locally on this device` : "Stored privately on this device only";
    }
    if (personaBadge) personaBadge.textContent = personaLabel;
    if (contactInput && document.activeElement !== contactInput) contactInput.value = contact;
    if (fbContactInput && !fbContactInput.value && contact) fbContactInput.value = contact;
    const filesEl = document.getElementById("oneoraStatFilesProcessed");
    const daysEl = document.getElementById("oneoraStatDaysUsed");
    const streakEl = document.getElementById("oneoraStatCurrentStreak");
    if (filesEl) filesEl.textContent = String(filesProcessed);
    if (daysEl) daysEl.textContent = String(daysUsed);
    if (streakEl) streakEl.textContent = streak === 1 ? "1 day" : `${streak} days`;
    const appLockBadge = document.getElementById("oneoraProfileAppLockStatus");
    if (appLockBadge) {
      const hasPin = Boolean(localStorage.getItem(LEGACY_VAULT_PIN));
      appLockBadge.textContent = hasPin ? "On · PIN & Fingerprint" : "Off";
      appLockBadge.className = hasPin ? "text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-[#CFF3E2] dark:bg-[#1B362E] text-[#115E42] dark:text-[#A7F3D0]" : "text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#FFF7EE] dark:bg-[#17131F] text-[#5C506B] dark:text-[#C5B9DA]";
    }
    const savedRating = loadJson(KEY_RATING, null);
    if (savedRating && savedRating.stars) {
      selectedStars = savedRating.stars;
      renderStarRow(".oneora-rate-star", selectedStars);
      const rateHint = document.getElementById("oneoraRateCardHint");
      if (rateHint) {
        rateHint.textContent = `You rated ONEORA ${selectedStars}/5 · Tap any star to update or share feedback.`;
      }
    }
    renderMyFeedbackList();
  }
  function renderStarRow(selector, count, animateStar = 0) {
    document.querySelectorAll(selector).forEach((btn) => {
      const val = parseInt(btn.getAttribute("data-star") || "0", 10);
      const active = val <= count;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
      if (animateStar && val === animateStar) {
        btn.classList.remove("is-pop");
        void btn.offsetWidth;
        btn.classList.add("is-pop");
      }
    });
  }
  function openRateSheet(stars) {
    const sheet = document.getElementById("oneoraRateSheet");
    if (!sheet) return;
    if (stars >= 1 && stars <= 5) selectedStars = stars;
    const saved = loadJson(KEY_RATING, null);
    const commentInp = document.getElementById("oneoraRateCommentInput");
    renderStarRow(".oneora-rate-star", selectedStars);
    renderStarRow(".oneora-sheet-star", selectedStars, selectedStars);
    const headline = document.getElementById("oneoraRateSheetHeadline");
    if (headline) {
      const labels = {
        1: "Sorry it fell short — tell us how to improve",
        2: "Thanks for telling us — we want to make it better",
        3: "Thanks for rating ONEORA — what can we improve?",
        4: "Glad you like ONEORA!",
        5: "Thank you for loving ONEORA!"
      };
      headline.textContent = labels[selectedStars] || "Share your experience with ONEORA";
    }
    selectedRateTags = new Set(Array.isArray(saved == null ? void 0 : saved.tags) ? saved.tags : []);
    syncRateTagChips();
    if (commentInp && !commentInp.value && (saved == null ? void 0 : saved.comment)) {
      commentInp.value = saved.comment;
    }
    sheet.classList.remove("hidden");
    haptic(12);
  }
  function closeRateSheet() {
    var _a;
    (_a = document.getElementById("oneoraRateSheet")) == null ? void 0 : _a.classList.add("hidden");
  }
  function syncRateTagChips() {
    document.querySelectorAll(".oneora-rate-tag").forEach((chip) => {
      const tag = chip.getAttribute("data-rate-tag") || "";
      const active = selectedRateTags.has(tag);
      chip.classList.toggle("is-active", active);
      chip.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }
  function persistCurrentRating() {
    var _a;
    const comment = (((_a = document.getElementById("oneoraRateCommentInput")) == null ? void 0 : _a.value) || "").trim();
    const payload = {
      stars: selectedStars,
      tags: Array.from(selectedRateTags),
      comment,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    saveJson(KEY_RATING, payload);
    return payload;
  }
  function openPlayStoreReview() {
    if (selectedStars > 0) persistCurrentRating();
    localStorage.setItem(KEY_REVIEW_DONE, "1");
    closeRateSheet();
    closeReviewPromptModal();
    haptic(14);
    openExternalLink(PLAY_STORE_URL);
    toast("Opening Play Store", "Thank you for sharing your honest review!", "success");
    refreshProfileUI();
  }
  function openReviewPromptModal() {
    const modal = document.getElementById("oneoraReviewPromptModal");
    if (!modal) return;
    reviewPromptShownThisSession = true;
    modal.classList.remove("hidden");
    haptic(10);
  }
  function closeReviewPromptModal() {
    var _a;
    (_a = document.getElementById("oneoraReviewPromptModal")) == null ? void 0 : _a.classList.add("hidden");
  }
  function maybeTriggerReviewPromptAfterTask() {
    if (reviewPromptShownThisSession) return;
    if (localStorage.getItem(KEY_REVIEW_DONE) === "1") return;
    const snoozeUntil = parseInt(localStorage.getItem(KEY_REVIEW_SNOOZE) || "0", 10) || 0;
    if (Date.now() < snoozeUntil) return;
    const total = getFilesProcessedCount();
    if (total < REVIEW_TASK_THRESHOLD) return;
    reviewPromptShownThisSession = true;
    setTimeout(() => {
      if (localStorage.getItem(KEY_REVIEW_DONE) === "1") return;
      openReviewPromptModal();
    }, 1100);
  }
  function loadFeedbackQueue() {
    const q = loadJson(KEY_FEEDBACK_QUEUE, []);
    return Array.isArray(q) ? q : [];
  }
  function saveFeedbackQueue(list) {
    saveJson(KEY_FEEDBACK_QUEUE, list.slice(0, 40));
  }
  function compressScreenshotFile(file) {
    return new Promise((resolve) => {
      if (!file || !file.type.startsWith("image/")) {
        resolve("");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const maxSide = 440;
          const scale = Math.min(1, maxSide / Math.max(img.width || 1, img.height || 1));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const c = document.createElement("canvas");
          c.width = w;
          c.height = h;
          const ctx = c.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          try {
            resolve(c.toDataURL("image/jpeg", 0.72));
          } catch (e) {
            resolve("");
          }
        };
        img.onerror = () => resolve("");
        img.src = String(reader.result || "");
      };
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });
  }
  async function trySendSingleFeedback(item) {
    if (!FEEDBACK_ENDPOINT || !navigator.onLine) return false;
    try {
      const res = await fetch(FEEDBACK_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          type: item.type,
          message: item.message,
          contact: item.contact || "",
          appVersion: item.appVersion,
          deviceInfo: item.deviceInfo,
          hasScreenshot: Boolean(item.hasScreenshot),
          screenshot: item.screenshotThumb || "",
          createdAt: item.createdAt
        })
      });
      return Boolean(res && res.ok);
    } catch (e) {
      return false;
    }
  }
  async function flushFeedbackQueue() {
    if (!FEEDBACK_ENDPOINT || !navigator.onLine) return;
    const queue = loadFeedbackQueue();
    let changed = false;
    for (const item of queue) {
      if (item.status === "queued") {
        const ok = await trySendSingleFeedback(item);
        if (ok) {
          item.status = "sent";
          item.sentAt = (/* @__PURE__ */ new Date()).toISOString();
          changed = true;
        }
      }
    }
    if (changed) {
      saveFeedbackQueue(queue);
      renderMyFeedbackList();
    }
  }
  async function submitFeedbackEntry({ type, message, contact, screenshotThumb }) {
    const item = {
      id: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: type || "Other",
      message: String(message || "").trim(),
      contact: String(contact || "").trim(),
      hasScreenshot: Boolean(screenshotThumb),
      screenshotThumb: screenshotThumb || "",
      appVersion: APP_VERSION,
      deviceInfo: getNonPersonalDeviceInfo(),
      status: "queued",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      sentAt: null
    };
    if (FEEDBACK_ENDPOINT && navigator.onLine) {
      const ok = await trySendSingleFeedback(item);
      if (ok) {
        item.status = "sent";
        item.sentAt = (/* @__PURE__ */ new Date()).toISOString();
      }
    }
    const queue = loadFeedbackQueue();
    queue.unshift(item);
    saveFeedbackQueue(queue);
    renderMyFeedbackList();
    showFeedbackThankYou(item.status === "sent");
    return item;
  }
  function showFeedbackThankYou(wasSentNow) {
    const box = document.getElementById("oneoraFbThankYou");
    const titleEl = document.getElementById("oneoraFbThankYouTitle");
    const subEl = document.getElementById("oneoraFbThankYouSub");
    if (!box) return;
    if (titleEl) {
      titleEl.textContent = wasSentNow ? "Thank you! Feedback sent." : "Saved. Will send when you’re online.";
    }
    if (subEl) {
      subEl.textContent = wasSentNow ? "Your feedback has been delivered. You can track it below under My feedback." : "Stored safely on your phone. You can also send it right now via WhatsApp or Email below.";
    }
    box.classList.remove("hidden");
    box.classList.remove("oneora-thanks-pop");
    void box.offsetWidth;
    box.classList.add("oneora-thanks-pop");
    haptic(14);
  }
  function buildFallbackMessage() {
    var _a, _b;
    const msg = (((_a = document.getElementById("oneoraFbMessageInput")) == null ? void 0 : _a.value) || "").trim();
    const contact = (((_b = document.getElementById("oneoraFbContactInput")) == null ? void 0 : _b.value) || "").trim();
    const latest = loadFeedbackQueue()[0];
    const bodyText = msg || (latest ? latest.message : "");
    const typeText = msg ? selectedFbType : latest ? latest.type : selectedFbType;
    const lines = [
      `ONEORA Feedback (${typeText})`,
      "",
      bodyText || "Hello ONEORA team, here is my feedback:",
      ""
    ];
    if (contact) lines.push(`Contact: ${contact}`);
    lines.push(`App & Device: ${getNonPersonalDeviceInfo()}`);
    return lines.join("\n");
  }
  function renderMyFeedbackList() {
    const listEl = document.getElementById("oneoraMyFeedbackList");
    const countEl = document.getElementById("oneoraMyFeedbackCount");
    if (!listEl) return;
    const queue = loadFeedbackQueue();
    if (countEl) countEl.textContent = `${queue.length} item${queue.length === 1 ? "" : "s"}`;
    if (!queue.length) {
      listEl.innerHTML = `
        <div class="pastel-inset-tile p-4 text-center">
          <p class="text-xs font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">No feedback submitted yet</p>
          <p class="text-[11px] text-[#5C506B] dark:text-[#C5B9DA] mt-0.5">Messages you send appear here with Sent or Queued status.</p>
        </div>
      `;
      return;
    }
    listEl.innerHTML = queue.map((item) => {
      const isSent = item.status === "sent";
      const statusBadge = isSent ? '<span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#CFF3E2] dark:bg-[#1B362E] text-[#115E42] dark:text-[#A7F3D0]">Sent</span>' : '<span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#FFE7C2] dark:bg-[#3D2E1D] text-[#6B3E00] dark:text-[#FDE68A]">Queued</span>';
      const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";
      return `
        <div class="pastel-inset-tile p-3.5 space-y-2">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#E4D9FF] dark:bg-[#2D2347] text-[#432B9F] dark:text-[#E4D9FF] shrink-0">${esc(item.type)}</span>
              <span class="text-[11px] font-semibold text-[#5C506B] dark:text-[#C5B9DA] truncate tabular-nums">${esc(dateStr)}</span>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              ${statusBadge}
              <button type="button" data-fb-del="${esc(item.id)}" aria-label="Remove feedback entry" class="w-9 h-9 rounded-full text-xs font-extrabold text-[#8E1B3B] dark:text-[#FDA4AF] hover:bg-[#FFD6D6]/60 dark:hover:bg-[#3D212B] flex items-center justify-center">✕</button>
            </div>
          </div>
          <p class="text-xs font-medium text-[#2B2236] dark:text-[#F5EEFF] whitespace-pre-wrap break-words">${esc(item.message)}</p>
          ${item.hasScreenshot && item.screenshotThumb ? `
            <img src="${item.screenshotThumb}" alt="Attached screenshot" class="w-20 h-14 object-cover rounded-xl border border-black/10 dark:border-white/15" />
          ` : ""}
          <p class="text-[10px] text-[#5C506B] dark:text-[#C5B9DA] opacity-80">${esc(item.deviceInfo || "")}</p>
        </div>
      `;
    }).join("");
    listEl.querySelectorAll("[data-fb-del]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-fb-del");
        const next = loadFeedbackQueue().filter((x) => x.id !== id);
        saveFeedbackQueue(next);
        renderMyFeedbackList();
        haptic(8);
      });
    });
  }
  async function shareApp(mode = "share") {
    haptic(10);
    const text = mode === "invite" ? `Hey! I use ONEORA for offline PDF tools, Document Scanner, Money Manager & Daily Planner — 100% private on your phone with zero ads. Try it here: ${PLAY_STORE_URL}` : `Try ONEORA — Offline-first PDF, Image, Office, Daily Planner, Money Manager & Vault app: ${PLAY_STORE_URL}`;
    if (global.AndroidBridge && typeof global.AndroidBridge.shareText === "function") {
      global.AndroidBridge.shareText("ONEORA — One App, More Possibilities", text);
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({
          title: "ONEORA — Offline PDF, Money & Life Toolkit",
          text,
          url: PLAY_STORE_URL
        });
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      toast("Invite Copied!", "Share link copied to clipboard — paste it anywhere.", "success");
    } catch (e) {
      toast("Share ONEORA", PLAY_STORE_URL, "info");
    }
  }
  function openChangelogSheet() {
    var _a;
    (_a = document.getElementById("oneoraChangelogSheet")) == null ? void 0 : _a.classList.remove("hidden");
    haptic(8);
  }
  function closeChangelogSheet() {
    var _a;
    (_a = document.getElementById("oneoraChangelogSheet")) == null ? void 0 : _a.classList.add("hidden");
  }
  function initProfileController() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s;
    recordUsageToday();
    const nameInput = document.getElementById("profileUserNameInput");
    const contactInput = document.getElementById("oneoraProfileContactInput");
    const saveBtn = document.getElementById("profileSaveBtn");
    if (nameInput) {
      nameInput.addEventListener("input", () => {
        const avatarEl = document.getElementById("oneoraProfileAvatar");
        const nameHeading = document.getElementById("oneoraProfileDisplayName");
        const val = nameInput.value.trim() || "ONEORA User";
        if (avatarEl) avatarEl.textContent = computeInitials(val);
        if (nameHeading) nameHeading.textContent = val;
      });
    }
    function saveLocalContact() {
      if (!contactInput) return;
      const val = contactInput.value.trim();
      if (val) localStorage.setItem(KEY_CONTACT, val);
      else localStorage.removeItem(KEY_CONTACT);
      refreshProfileUI();
    }
    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        saveLocalContact();
      });
    }
    if (contactInput) {
      contactInput.addEventListener("change", saveLocalContact);
    }
    (_a = document.getElementById("oneoraProfilePersonaBadge")) == null ? void 0 : _a.addEventListener("click", () => {
      var _a2;
      haptic(8);
      (_a2 = document.getElementById("settingsActivePersonaLabel")) == null ? void 0 : _a2.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    document.querySelectorAll("[data-set-persona]").forEach((btn) => {
      btn.addEventListener("click", () => setTimeout(refreshProfileUI, 60));
    });
    document.querySelectorAll(".oneora-rate-star").forEach((btn) => {
      btn.addEventListener("click", () => {
        const star = parseInt(btn.getAttribute("data-star") || "5", 10);
        selectedStars = star;
        renderStarRow(".oneora-rate-star", star, star);
        openRateSheet(star);
      });
    });
    document.querySelectorAll(".oneora-sheet-star").forEach((btn) => {
      btn.addEventListener("click", () => {
        const star = parseInt(btn.getAttribute("data-star") || "5", 10);
        openRateSheet(star);
      });
    });
    document.querySelectorAll(".oneora-rate-tag").forEach((chip) => {
      chip.addEventListener("click", () => {
        const tag = chip.getAttribute("data-rate-tag") || "";
        if (!tag) return;
        if (selectedRateTags.has(tag)) selectedRateTags.delete(tag);
        else selectedRateTags.add(tag);
        haptic(6);
        syncRateTagChips();
      });
    });
    (_b = document.getElementById("oneoraRatePlayStoreBtn")) == null ? void 0 : _b.addEventListener("click", openPlayStoreReview);
    (_c = document.getElementById("oneoraRatePrivateFeedbackBtn")) == null ? void 0 : _c.addEventListener("click", async () => {
      var _a2, _b2;
      const saved = persistCurrentRating();
      const summaryParts = [];
      if (saved.stars) summaryParts.push(`Rating: ${saved.stars}/5`);
      if (saved.tags.length) summaryParts.push(`Tags: ${saved.tags.join(", ")}`);
      if (saved.comment) summaryParts.push(saved.comment);
      closeRateSheet();
      if (saved.comment || saved.tags.length) {
        const fbType = saved.stars <= 2 ? "Bug" : saved.stars === 3 ? "Feature request" : "Compliment";
        await submitFeedbackEntry({
          type: fbType,
          message: summaryParts.join("\n"),
          contact: localStorage.getItem(KEY_CONTACT) || "",
          screenshotThumb: ""
        });
        (_a2 = document.getElementById("oneoraFeedbackCard")) == null ? void 0 : _a2.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        const fbInput = document.getElementById("oneoraFbMessageInput");
        (_b2 = document.getElementById("oneoraFeedbackCard")) == null ? void 0 : _b2.scrollIntoView({ behavior: "smooth", block: "center" });
        if (fbInput) {
          fbInput.placeholder = `Tell us what made ONEORA a ${saved.stars}-star experience...`;
          setTimeout(() => fbInput.focus(), 250);
        }
      }
      refreshProfileUI();
    });
    (_d = document.getElementById("oneoraRateSheetCloseBtn")) == null ? void 0 : _d.addEventListener("click", closeRateSheet);
    (_e = document.getElementById("oneoraRateSheetBackdrop")) == null ? void 0 : _e.addEventListener("click", closeRateSheet);
    (_f = document.getElementById("oneoraReviewPromptNowBtn")) == null ? void 0 : _f.addEventListener("click", openPlayStoreReview);
    (_g = document.getElementById("oneoraReviewPromptFeedbackBtn")) == null ? void 0 : _g.addEventListener("click", () => {
      localStorage.setItem(KEY_REVIEW_SNOOZE, String(Date.now() + SNOOZE_MS));
      closeReviewPromptModal();
      if (typeof global.openPdfBondhuTool === "function") global.openPdfBondhuTool("profileSettingsTab");
      setTimeout(() => {
        var _a2, _b2;
        (_a2 = document.getElementById("oneoraFeedbackCard")) == null ? void 0 : _a2.scrollIntoView({ behavior: "smooth", block: "center" });
        (_b2 = document.getElementById("oneoraFbMessageInput")) == null ? void 0 : _b2.focus();
      }, 220);
    });
    (_h = document.getElementById("oneoraReviewMaybeLaterBtn")) == null ? void 0 : _h.addEventListener("click", () => {
      localStorage.setItem(KEY_REVIEW_SNOOZE, String(Date.now() + SNOOZE_MS));
      closeReviewPromptModal();
      haptic(6);
      toast("No Problem", "We won’t ask again for at least 14 days.", "info");
    });
    (_i = document.getElementById("oneoraReviewPromptBackdrop")) == null ? void 0 : _i.addEventListener("click", () => {
      localStorage.setItem(KEY_REVIEW_SNOOZE, String(Date.now() + SNOOZE_MS));
      closeReviewPromptModal();
    });
    document.querySelectorAll(".oneora-fb-type-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        selectedFbType = chip.getAttribute("data-fb-type") || "Bug";
        haptic(6);
        document.querySelectorAll(".oneora-fb-type-chip").forEach((c) => {
          const act = c === chip;
          c.classList.toggle("is-active", act);
          c.setAttribute("aria-pressed", act ? "true" : "false");
        });
      });
    });
    const ssInput = document.getElementById("oneoraFbScreenshotInput");
    const ssWrap = document.getElementById("oneoraFbScreenshotPreviewWrap");
    const ssImg = document.getElementById("oneoraFbScreenshotPreview");
    const ssClear = document.getElementById("oneoraFbScreenshotClearBtn");
    if (ssInput) {
      ssInput.addEventListener("change", async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        pendingScreenshotDataUrl = await compressScreenshotFile(file);
        if (pendingScreenshotDataUrl && ssImg && ssWrap) {
          ssImg.src = pendingScreenshotDataUrl;
          ssWrap.classList.remove("hidden");
        }
      });
    }
    if (ssClear) {
      ssClear.addEventListener("click", () => {
        pendingScreenshotDataUrl = "";
        if (ssInput) ssInput.value = "";
        if (ssWrap) ssWrap.classList.add("hidden");
      });
    }
    const fbForm = document.getElementById("oneoraFeedbackForm");
    if (fbForm) {
      fbForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const msgInput = document.getElementById("oneoraFbMessageInput");
        const contactInp = document.getElementById("oneoraFbContactInput");
        const message = ((msgInput == null ? void 0 : msgInput.value) || "").trim();
        if (!message) {
          toast("Write a Message", "Please describe your bug, idea, or comment first.", "info");
          msgInput == null ? void 0 : msgInput.focus();
          return;
        }
        const contact = ((contactInp == null ? void 0 : contactInp.value) || "").trim();
        await submitFeedbackEntry({
          type: selectedFbType,
          message,
          contact,
          screenshotThumb: pendingScreenshotDataUrl
        });
        if (msgInput) msgInput.value = "";
        pendingScreenshotDataUrl = "";
        if (ssInput) ssInput.value = "";
        if (ssWrap) ssWrap.classList.add("hidden");
      });
    }
    (_j = document.getElementById("oneoraFbWhatsappBtn")) == null ? void 0 : _j.addEventListener("click", () => {
      haptic(8);
      const body = buildFallbackMessage();
      const waUrl = `https://wa.me/?text=${encodeURIComponent(body)}`;
      openExternalLink(waUrl);
    });
    (_k = document.getElementById("oneoraFbEmailBtn")) == null ? void 0 : _k.addEventListener("click", () => {
      haptic(8);
      const body = buildFallbackMessage();
      const subject = `ONEORA v${APP_VERSION} Feedback (${selectedFbType})`;
      const mailUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      openExternalLink(mailUrl);
    });
    (_l = document.getElementById("settingsShareAppBtn")) == null ? void 0 : _l.addEventListener("click", () => shareApp("share"));
    (_m = document.getElementById("oneoraInviteFriendsBtn")) == null ? void 0 : _m.addEventListener("click", () => shareApp("invite"));
    (_n = document.getElementById("settingsRateAppBtn")) == null ? void 0 : _n.addEventListener("click", () => openRateSheet(selectedStars || 5));
    (_o = document.getElementById("oneoraProfileAppLockBtn")) == null ? void 0 : _o.addEventListener("click", () => {
      haptic(8);
      if (typeof global.openPdfBondhuTool === "function") {
        global.openPdfBondhuTool("documentCenter");
        setTimeout(() => {
          var _a2;
          (_a2 = document.getElementById("vaultSetupPinInput")) == null ? void 0 : _a2.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 200);
      }
    });
    (_p = document.getElementById("oneoraProfileBackupBtn")) == null ? void 0 : _p.addEventListener("click", () => {
      haptic(8);
      const privBtn = document.getElementById("openPrivacyDashboardBtn");
      if (privBtn) privBtn.click();
    });
    (_q = document.getElementById("oneoraWhatsNewBtn")) == null ? void 0 : _q.addEventListener("click", openChangelogSheet);
    (_r = document.getElementById("oneoraChangelogCloseBtn")) == null ? void 0 : _r.addEventListener("click", closeChangelogSheet);
    (_s = document.getElementById("oneoraChangelogBackdrop")) == null ? void 0 : _s.addEventListener("click", closeChangelogSheet);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeRateSheet();
        closeReviewPromptModal();
        closeChangelogSheet();
      }
    });
    document.addEventListener("oneora:taskcompleted", () => {
      const next = getFilesProcessedCount() + 1;
      localStorage.setItem(KEY_TASK_COUNT, String(next));
      refreshProfileUI();
      maybeTriggerReviewPromptAfterTask();
    });
    window.addEventListener("online", () => {
      flushFeedbackQueue();
    });
    refreshProfileUI();
    flushFeedbackQueue();
  }
  document.addEventListener("DOMContentLoaded", initProfileController);
  global.OneoraProfile = {
    refresh: refreshProfileUI,
    shareApp,
    openRateSheet,
    openChangelogSheet,
    flushFeedbackQueue
  };
})(window);
