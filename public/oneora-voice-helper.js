(function(global) {
  "use strict";

  var STORE_KEY = "oneora_voice_helper_v1";
  var PLANNER_STORE_KEY = "oneoraPlannerItems_v1";

  var HELPER_TABS = [
    { id: "voice_notes", label: "Voice to Text", bn: "ভয়েস টু টেক্সট" },
    { id: "letter_drafts", label: "Letter & Application", bn: "দরখাস্ত ও চিঠি" },
    { id: "quick_reminders", label: "Offline Reminders", bn: "রিমাইন্ডার" }
  ];

  var VOICE_LANGS = [
    { code: "bn-IN", label: "বাংলা (ভারত · Bengali India)" },
    { code: "bn-BD", label: "বাংলা (বাংলাদেশ · Bengali BD)" },
    { code: "en-IN", label: "English (India)" },
    { code: "hi-IN", label: "हिन्दी (Hindi)" }
  ];

  var LETTER_TEMPLATES = [
    {
      id: "leave_school",
      title: "School / College Leave",
      bnTitle: "স্কুল / কলেজে ছুটির দরখাস্ত",
      build: function(lang, f) {
        var name = f.sender || "[আপনার নাম / Your Name]";
        var to = f.recipient || (lang === "bn" ? "মাননীয় প্রধান শিক্ষক মহাশয় / অধ্যক্ষ মহাশয়" : "The Principal / Headmaster");
        var reason = f.reason || (lang === "bn" ? "অসুস্থতা / পারিবারিক কারণ" : "personal / medical reasons");
        var dt = f.date || todayKey();
        if (lang === "bn") {
          return [
            "তারিখ: " + dt,
            "",
            "প্রতি,",
            to + ",",
            (f.org || "[বিদ্যালয় / কলেজের নাম]"),
            "",
            "বিষয়: " + (f.subject || "ছুটির জন্য আবেদনপত্র।"),
            "",
            "মহাশয় / মহাশয়া,",
            "বিনীত নিবেদন এই যে, আমি " + name + "। " + reason + "-এর কারণে আমি উপস্থিত থাকতে পারব না।",
            "",
            "অতএব, আপনার নিকট একান্ত অনুরোধ, আমাকে উক্ত দিনগুলির জন্য ছুটি মঞ্জুর করে বাধিত করবেন।",
            "",
            "ইতি,",
            "আপনার একান্ত অনুগত,",
            name
          ].join("\n");
        }
        return [
          "Date: " + dt,
          "",
          "To,",
          to + ",",
          (f.org || "[School / College Name]"),
          "",
          "Subject: " + (f.subject || "Application for Leave"),
          "",
          "Respected Sir/Madam,",
          "I am " + name + ". Due to " + reason + ", I will be unable to attend classes.",
          "",
          "Kindly grant me leave for the mentioned period. I shall be grateful for your kind approval.",
          "",
          "Yours obediently,",
          name
        ].join("\n");
      }
    },
    {
      id: "bank_request",
      title: "Bank KYC / Mobile / Account",
      bnTitle: "ব্যাঙ্ক কেওয়াইসি / মোবাইল নম্বর আপডেট",
      build: function(lang, f) {
        var name = f.sender || "[Account Holder Name]";
        var to = f.recipient || (lang === "bn" ? "মাননীয় শাখা প্রবন্ধক (Branch Manager)" : "The Branch Manager");
        var reason = f.reason || (lang === "bn" ? "আকাউন্টে মোবাইল নম্বর আপডেট ও কেওয়াইসি (KYC) সম্পন্ন করা" : "updating mobile number & completing KYC");
        var dt = f.date || todayKey();
        if (lang === "bn") {
          return [
            "তারিখ: " + dt,
            "",
            "প্রতি,",
            to + ",",
            (f.org || "[ব্যাঙ্ক ও শাখার নাম]"),
            "",
            "বিষয়: " + (f.subject || "ব্যাঙ্ক অ্যাকাউন্ট সংক্রান্ত আবেদন।"),
            "",
            "মহাশয়,",
            "বিনীত নিবেদন এই যে, আমি " + name + ", আপনার শাখার একজন নিয়মিত গ্রাহক। আমি আমার অ্যাকাউন্টে " + reason + "-এর জন্য আবেদন করছি।",
            "আবেদনের সাথে প্রয়োজনীয় পরিচয়পত্রের (Aadhaar / PAN) প্রতিলিপি সংযুক্ত করা হলো।",
            "",
            "অনুগ্রহ করে বিষয়টি দ্রুত কার্যকরী করে বাধিত করবেন।",
            "",
            "ধন্যবাদান্তে,",
            name,
            "অ্যাকাউন্ট নং: [এখানে লিখুন]",
            "মোবাইল নং: [এখানে লিখুন]"
          ].join("\n");
        }
        return [
          "Date: " + dt,
          "",
          "To,",
          to + ",",
          (f.org || "[Bank Name & Branch]"),
          "",
          "Subject: " + (f.subject || "Request for Account Service / KYC Update"),
          "",
          "Dear Sir/Madam,",
          "I, " + name + ", hold a savings account at your branch. I request your kind assistance regarding " + reason + ".",
          "Self-attested copies of my KYC documents (Aadhaar/PAN) are attached herewith.",
          "",
          "Kindly process this request at the earliest.",
          "",
          "Thanking you,",
          name,
          "Account No: [Enter Account No]",
          "Mobile No: [Enter Mobile No]"
        ].join("\n");
      }
    },
    {
      id: "job_apply",
      title: "Job Application",
      bnTitle: "চাকরির আবেদনপত্র",
      build: function(lang, f) {
        var name = f.sender || "[Your Full Name]";
        var to = f.recipient || (lang === "bn" ? "মাননীয় নিয়োগ আধিকারিক (HR Manager)" : "The Hiring Manager");
        var reason = f.reason || (lang === "bn" ? "সংশ্লিষ্ট পদে কাজের অভিজ্ঞতা ও যোগ্যতা" : "relevant qualifications and strong dedication");
        var dt = f.date || todayKey();
        if (lang === "bn") {
          return [
            "তারিখ: " + dt,
            "",
            "প্রতি,",
            to + ",",
            (f.org || "[কোম্পানি / প্রতিষ্ঠানের নাম]"),
            "",
            "বিষয়: " + (f.subject || "পদের জন্য চাকরির আবেদনপত্র।"),
            "",
            "মহাশয় / মহাশয়া,",
            "সবিনয় নিবেদন এই যে, আপনার প্রতিষ্ঠানে শূন্যপদের বিজ্ঞপ্তি দেখে আমি " + name + " উক্ত পদের জন্য আবেদন করছি। আমার " + reason + " রয়েছে।",
            "আমার জীবনপঞ্জী (Resume/CV) এই আবেদনপত্রের সাথে সংযুক্ত করা হলো।",
            "",
            "সাক্ষাৎকারের সুযোগ দিলে আমি আমার যোগ্যতা প্রমাণ করতে পারব বলে আশা রাখি।",
            "",
            "বিনীত,",
            name
          ].join("\n");
        }
        return [
          "Date: " + dt,
          "",
          "To,",
          to + ",",
          (f.org || "[Company / Organization Name]"),
          "",
          "Subject: " + (f.subject || "Application for Job Opening"),
          "",
          "Dear Hiring Manager,",
          "I am writing to express my interest in the open role at your organization. I bring " + reason + " and am eager to contribute to your team.",
          "My resume is attached for your review.",
          "",
          "I would welcome the opportunity to discuss my application in an interview.",
          "",
          "Sincerely,",
          name
        ].join("\n");
      }
    },
    {
      id: "civic_complaint",
      title: "Electricity / Civic Service",
      bnTitle: "বিদ্যুৎ / পুরসভা / পঞ্চায়েত আবেদন",
      build: function(lang, f) {
        var name = f.sender || "[আপনার নাম]";
        var to = f.recipient || (lang === "bn" ? "মাননীয় আধিকারিক / স্টেশন ম্যানেজার" : "The Concerned Officer / Station Manager");
        var reason = f.reason || (lang === "bn" ? "মিটার / বিদ্যুৎ সংযোগ / পানীয় জল সংক্রান্ত সমস্যা" : "electricity / civic utility issue in our locality");
        var dt = f.date || todayKey();
        if (lang === "bn") {
          return [
            "তারিখ: " + dt,
            "",
            "প্রতি,",
            to + ",",
            (f.org || "[অফিস / পুরসভা / বিদ্যুৎ দপ্তরের নাম]"),
            "",
            "বিষয়: " + (f.subject || "জরুরি পরিষেবা সংক্রান্ত আবেদন।"),
            "",
            "মহাশয়,",
            "আমি " + name + ", এই এলাকার একজন বাসিন্দা। আপনাকে জানাচ্ছি যে, বর্তমানে আমাদের এলাকায় " + reason + " দেখা দিয়েছে।",
            "",
            "অনুগ্রহ করে দ্রুত তদন্ত ও প্রয়োজনীয় ব্যবস্থা গ্রহণ করলে আমরা উপকৃত হব।",
            "",
            "ধন্যবাদান্তে,",
            name,
            "ঠিকানা / কনজিউমার আইডি: [এখানে লিখুন]"
          ].join("\n");
        }
        return [
          "Date: " + dt,
          "",
          "To,",
          to + ",",
          (f.org || "[Office / Municipality / Electricity Board]"),
          "",
          "Subject: " + (f.subject || "Request for Urgent Civic Service / Resolution"),
          "",
          "Respected Sir/Madam,",
          "I am " + name + ", a resident of this area. I wish to bring to your kind notice the issue of " + reason + ".",
          "",
          "Kindly inspect and resolve the matter at the earliest convenience.",
          "",
          "Yours faithfully,",
          name,
          "Address / Consumer ID: [Enter Details]"
        ].join("\n");
      }
    },
    {
      id: "office_leave",
      title: "Office Sick / Casual Leave",
      bnTitle: "অফিসে ছুটি / অসুস্থতার আবেদন",
      build: function(lang, f) {
        var name = f.sender || "[Employee Name]";
        var to = f.recipient || (lang === "bn" ? "মাননীয় ম্যানেজার মহাশয়" : "The Manager");
        var reason = f.reason || (lang === "bn" ? "হঠাৎ জ্বর ও শারীরিক অসুস্থতা" : "sudden fever and medical rest advised by doctor");
        var dt = f.date || todayKey();
        if (lang === "bn") {
          return [
            "তারিখ: " + dt,
            "",
            "প্রতি,",
            to + ",",
            (f.org || "[অফিসের নাম]"),
            "",
            "বিষয়: " + (f.subject || "অসুস্থতাজনিত ছুটির আবেদন।"),
            "",
            "মহাশয়,",
            "সবিনয় নিবেদন, " + reason + "-এর কারণে আমি অফিসে উপস্থিত থাকতে পারছি না। জরুরি কাজের জন্য আমি ফোনে উপলব্ধ থাকব।",
            "",
            "অনুগ্রহ করে আমার ছুটি মঞ্জুর করে বাধিত করবেন।",
            "",
            "ধন্যবাদ,",
            name
          ].join("\n");
        }
        return [
          "Date: " + dt,
          "",
          "To,",
          to + ",",
          (f.org || "[Company Name]"),
          "",
          "Subject: " + (f.subject || "Leave Request"),
          "",
          "Dear Sir/Madam,",
          "Due to " + reason + ", I will not be able to attend work today. I will ensure my pending tasks are updated once I resume.",
          "",
          "Kindly approve my leave.",
          "",
          "Regards,",
          name
        ].join("\n");
      }
    }
  ];

  var REMINDER_PRESETS = [
    { label: "ওষুধ · Medicine", title: "Take Medicine · ওষুধ খাওয়া", cat: "Medicine", time: "09:00", repeat: "daily" },
    { label: "বিল · Bill Due", title: "Pay Electricity / Mobile Bill", cat: "Bill", time: "10:00", repeat: "monthly" },
    { label: "ফোন · Call", title: "Important Phone Call · ফোন করা", cat: "Personal", time: "18:00", repeat: "none" },
    { label: "কিস্তি · EMI", title: "Monthly EMI / Rent Payment", cat: "Finance", time: "10:00", repeat: "monthly" },
    { label: "হাঁটা · Walk", title: "Morning / Evening Walk · হাঁটা", cat: "Health", time: "07:00", repeat: "daily" }
  ];

  var recognition = null;

  var state = {
    activeTab: "voice_notes",
    // Voice-to-Text state
    voiceLang: "bn-IN",
    voiceListening: false,
    voiceInterim: "",
    voiceText: "",
    voiceNoteTitle: "",
    voiceError: "",
    voiceSearch: "",
    // Letter Drafts state
    letterTplId: "leave_school",
    letterLang: "bn",
    letterSender: "",
    letterRecipient: "",
    letterOrg: "",
    letterSubject: "",
    letterReason: "",
    letterDate: todayKey(),
    letterBody: "",
    // Quick Reminder form state
    remTitle: "",
    remDate: todayKey(),
    remTime: "09:00",
    remRepeat: "none",
    remCat: "Personal",
    remVoiceListening: false
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
    return (prefix || "vh") + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
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

  function formatDateHuman(dateKey) {
    if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return String(dateKey || "");
    var parts = dateKey.split("-");
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    try {
      return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
    } catch (e) {
      return dateKey;
    }
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

  function copyPlainText(text, label) {
    if (global.OneoraCapabilities && typeof global.OneoraCapabilities.copyText === "function") {
      global.OneoraCapabilities.copyText(text);
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function() {});
    }
    notifyToast("Copied · কপি হয়েছে", (label || "Text") + " copied to clipboard.", "success");
  }

  function getSpeechRecognitionCtor() {
    return global.SpeechRecognition || global.webkitSpeechRecognition || null;
  }

  /* -------------------- IndexedDB Storage (Voice Notes & Letter Drafts) -------------------- */

  function defaultStore() {
    return {
      version: 1,
      voiceNotes: [],
      letterDrafts: [],
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
        voiceNotes: Array.isArray(parsed.voiceNotes) ? parsed.voiceNotes : [],
        letterDrafts: Array.isArray(parsed.letterDrafts) ? parsed.letterDrafts : [],
        updatedAtMs: Number(parsed.updatedAtMs || Date.now())
      };
    } catch (e) {
      return defaultStore();
    }
  }

  function saveStore(store) {
    var payload = {
      version: 1,
      voiceNotes: Array.isArray(store.voiceNotes) ? store.voiceNotes.slice(0, 40) : [],
      letterDrafts: Array.isArray(store.letterDrafts) ? store.letterDrafts.slice(0, 30) : [],
      updatedAtMs: Date.now()
    };
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(payload));
    } catch (e) {}
    if (global.OneoraDB && typeof global.OneoraDB.syncKeyToIndexedDb === "function") {
      global.OneoraDB.syncKeyToIndexedDb(STORE_KEY).catch(function() {});
    }
    try {
      document.dispatchEvent(new CustomEvent("oneora:voicehelperchange"));
    } catch (e) {}
    return payload;
  }

  /* -------------------- Shared Planner Storage for Offline Reminders (Zero Duplicates) -------------------- */

  function loadPlannerItems() {
    try {
      var arr = JSON.parse(localStorage.getItem(PLANNER_STORE_KEY) || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function savePlannerItems(items) {
    try {
      localStorage.setItem(PLANNER_STORE_KEY, JSON.stringify(items));
    } catch (e) {}
    try {
      document.dispatchEvent(new CustomEvent("oneora:plannerchange"));
    } catch (e) {}
    if (global.OneoraPlanner && typeof global.OneoraPlanner.render === "function") {
      try { global.OneoraPlanner.render(); } catch (e) {}
    }
  }

  function addOfflineReminder(item) {
    var all = loadPlannerItems();
    var rec = {
      id: "rem_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      kind: "reminder",
      title: String(item.title || "").trim().slice(0, 140),
      body: String(item.body || "").trim().slice(0, 400),
      category: String(item.category || "Personal"),
      dateKey: item.dateKey || todayKey(),
      timeStr: item.timeStr || "09:00",
      repeat: item.repeat || "none",
      status: "active",
      updatedAtMs: Date.now()
    };
    all.unshift(rec);
    savePlannerItems(all);
    // Schedule native Android reminder bridge if running in APK
    try {
      if (global.AndroidBridge && typeof global.AndroidBridge.scheduleReminder === "function") {
        var dt = new Date(rec.dateKey + "T" + rec.timeStr + ":00");
        var triggerMs = isNaN(dt.getTime()) ? Date.now() + 60000 : dt.getTime();
        global.AndroidBridge.scheduleReminder(rec.id, rec.title, rec.body || rec.category, triggerMs);
      }
    } catch (e) {}
    return rec;
  }

  /* -------------------- Voice Recognition Control -------------------- */

  function stopSpeechRecognition() {
    if (recognition) {
      try { recognition.onend = null; recognition.stop(); } catch (e) {}
      recognition = null;
    }
    state.voiceListening = false;
    state.remVoiceListening = false;
    state.voiceInterim = "";
  }

  function startVoiceDictation(root, onResultCallback, isReminderField) {
    var Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      state.voiceError = "Live browser speech recognition is unavailable on this WebView. Tip: Tap the text box and use your phone keyboard's Bengali Voice Mic (Gboard) — works completely offline!";
      render(root);
      return;
    }

    stopSpeechRecognition();
    state.voiceError = "";

    try {
      var rec = new Ctor();
      rec.lang = state.voiceLang || "bn-IN";
      rec.continuous = !isReminderField;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onstart = function() {
        if (isReminderField) state.remVoiceListening = true;
        else state.voiceListening = true;
        haptic(12);
        render(root);
      };

      rec.onresult = function(event) {
        var finalPart = "";
        var interimPart = "";
        for (var i = event.resultIndex; i < event.results.length; i++) {
          var transcript = event.results[i][0] ? event.results[i][0].transcript : "";
          if (event.results[i].isFinal) finalPart += transcript;
          else interimPart += transcript;
        }
        state.voiceInterim = interimPart;
        if (finalPart) {
          onResultCallback(finalPart.trim());
        }
        // Lightweight live preview update without losing textarea focus
        var interimEl = root.querySelector("#vhInterimPreview");
        if (interimEl) interimEl.textContent = interimPart;
        var ta = root.querySelector("#vhVoiceTextarea");
        if (ta && !isReminderField && finalPart) {
          ta.value = state.voiceText;
        }
        var remIn = root.querySelector("#vhRemTitle");
        if (remIn && isReminderField && finalPart) {
          remIn.value = state.remTitle;
        }
      };

      rec.onerror = function(ev) {
        var code = ev && ev.error ? ev.error : "unknown";
        if (code === "not-allowed" || code === "service-not-allowed") {
          state.voiceError = "Microphone permission denied. Please allow Mic access in settings or use your keyboard's voice mic.";
        } else if (code === "network") {
          state.voiceError = "Speech engine needs an internet connection or offline Bengali voice pack on your device. You can still type or use Gboard offline voice typing inside the box.";
        } else if (code !== "no-speech" && code !== "aborted") {
          state.voiceError = "Voice input stopped (" + code + "). Tap Mic to try again.";
        }
        stopSpeechRecognition();
        render(root);
      };

      rec.onend = function() {
        stopSpeechRecognition();
        render(root);
      };

      recognition = rec;
      rec.start();
    } catch (e) {
      state.voiceError = "Could not start voice dictation. Please type or use keyboard voice input.";
      stopSpeechRecognition();
      render(root);
    }
  }

  /* -------------------- Bengali-Safe A4 PDF Export (Canvas -> PDF-Lib) -------------------- */

  async function exportUnicodeLetterPdf(title, bodyText) {
    if (!bodyText || !bodyText.trim()) {
      notifyToast("Empty Draft", "Write or generate a letter first.", "error");
      return;
    }
    try {
      if (global.OneoraLoader && typeof global.OneoraLoader.load === "function") {
        await global.OneoraLoader.load("pdflib");
      }
      if (!global.PDFLib) throw new Error("Offline PDF engine is unavailable.");

      // Render Bengali + English faithfully on high-DPI A4 canvas so Unicode glyphs NEVER break
      var pageW = 1240;
      var pageH = 1754;
      var marginX = 96;
      var marginY = 110;
      var maxLineW = pageW - marginX * 2;
      var lineH = 42;

      var measureCanvas = document.createElement("canvas");
      var mctx = measureCanvas.getContext("2d");
      mctx.font = '500 26px "Plus Jakarta Sans", "Noto Sans Bengali", "Nirmala UI", sans-serif';

      var rawParagraphs = String(bodyText).replace(/\r\n/g, "\n").split("\n");
      var wrappedLines = [];
      for (var p = 0; p < rawParagraphs.length; p++) {
        var para = rawParagraphs[p];
        if (!para.trim()) {
          wrappedLines.push("");
          continue;
        }
        var words = para.split(/\s+/);
        var current = "";
        for (var w = 0; w < words.length; w++) {
          var test = current ? current + " " + words[w] : words[w];
          if (mctx.measureText(test).width > maxLineW && current) {
            wrappedLines.push(current);
            current = words[w];
          } else {
            current = test;
          }
        }
        if (current) wrappedLines.push(current);
      }

      var linesPerPage = Math.floor((pageH - marginY * 2) / lineH);
      var totalPages = Math.max(1, Math.ceil(wrappedLines.length / linesPerPage));

      var pdfDoc = await global.PDFLib.PDFDocument.create();
      for (var pg = 0; pg < totalPages; pg++) {
        var canvas = document.createElement("canvas");
        canvas.width = pageW;
        canvas.height = pageH;
        var ctx = canvas.getContext("2d");
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, pageW, pageH);
        ctx.fillStyle = "#1E1B24";
        ctx.font = '500 26px "Plus Jakarta Sans", "Noto Sans Bengali", "Nirmala UI", sans-serif';
        ctx.textBaseline = "top";

        var slice = wrappedLines.slice(pg * linesPerPage, (pg + 1) * linesPerPage);
        var y = marginY;
        for (var i = 0; i < slice.length; i++) {
          ctx.fillText(slice[i], marginX, y);
          y += lineH;
        }

        // Subtle footer page number
        ctx.fillStyle = "#7A7485";
        ctx.font = '500 18px "Plus Jakarta Sans", sans-serif';
        ctx.fillText("Page " + (pg + 1) + " / " + totalPages, pageW - marginX - 110, pageH - 64);

        var dataUrl = canvas.toDataURL("image/png");
        var binStr = atob(dataUrl.split(",")[1]);
        var imgBytes = new Uint8Array(binStr.length);
        for (var b = 0; b < binStr.length; b++) imgBytes[b] = binStr.charCodeAt(b);

        var embedded = await pdfDoc.embedPng(imgBytes);
        var pdfPage = pdfDoc.addPage([595.28, 841.89]);
        pdfPage.drawImage(embedded, { x: 0, y: 0, width: 595.28, height: 841.89 });
      }

      var outBytes = await pdfDoc.save();
      var blob = new Blob([outBytes], { type: "application/pdf" });
      var safeTitle = String(title || "Letter").replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 24) || "Draft";
      var fname = "ONEORA_" + safeTitle + "_" + todayKey() + ".pdf";

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
      notifyToast("A4 PDF Ready · পিডিএফ তৈরি", fname + " saved with Bengali & English support.", "success");
    } catch (err) {
      notifyToast("PDF Export Failed", err && err.message ? err.message : "Could not export PDF.", "error");
    }
  }

  /* -------------------- Panel 1: Bengali & English Voice-to-Text -------------------- */

  function renderVoicePanel(store) {
    var hasSpeech = Boolean(getSpeechRecognitionCtor());
    var words = state.voiceText.trim() ? state.voiceText.trim().split(/\s+/).length : 0;
    var q = state.voiceSearch.trim().toLowerCase();
    var notes = store.voiceNotes.filter(function(n) {
      if (!q) return true;
      return (n.title + " " + n.text).toLowerCase().indexOf(q) !== -1;
    });

    return (
      '<div class="space-y-4">' +
        '<div class="pastel-stage3-card p-5 space-y-4">' +
          '<div class="flex flex-wrap items-center justify-between gap-2">' +
            '<div>' +
              '<p class="text-[11px] font-extrabold uppercase tracking-wider text-[#804800] dark:text-[#FCD34D]">Bengali &amp; English Dictation · বাংলা ভয়েস টাইপিং</p>' +
              '<h3 class="text-base sm:text-lg font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">Voice-to-Text Studio</h3>' +
            "</div>" +
            '<select id="vhVoiceLang" aria-label="Voice dictation language" class="pastel-pill-input text-xs font-extrabold">' +
              VOICE_LANGS.map(function(l) {
                return '<option value="' + l.code + '"' + (state.voiceLang === l.code ? " selected" : "") + ">" + esc(l.label) + "</option>";
              }).join("") +
            "</select>" +
          "</div>" +

          '<div class="flex flex-col sm:flex-row items-center gap-3 p-4 rounded-[24px] bg-[#FFE7C2]/55 dark:bg-[#3D2E1D]/75">' +
            '<button type="button" id="vhMicToggleBtn" class="w-full sm:w-auto px-6 py-3.5 rounded-full text-xs sm:text-sm font-extrabold min-h-[52px] shadow-sm inline-flex items-center justify-center gap-2 transition ' +
              (state.voiceListening
                ? "bg-[#B91C1C] text-white animate-pulse"
                : "bg-[#5B3FD0] hover:bg-[#4A30B8] text-white") +
              '">' +
              '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>' +
              "<span>" + (state.voiceListening ? "Stop Listening · থামুন" : "Tap to Speak · বলুন") + "</span>" +
            "</button>" +
            '<div class="flex-1 min-w-0 text-center sm:text-left">' +
              '<p class="text-xs font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">' +
                (state.voiceListening
                  ? "Listening (" + esc(state.voiceLang) + ")... Speak clearly"
                  : hasSpeech
                    ? "Ready to dictate in Bengali, English or Hindi"
                    : "Tap the box below to type or use Gboard offline Bengali voice mic") +
              "</p>" +
              '<p id="vhInterimPreview" class="text-xs font-semibold text-[#5B3FD0] dark:text-[#CBBBFF] mt-0.5 truncate">' + esc(state.voiceInterim || "") + "</p>" +
            "</div>" +
          "</div>" +

          (state.voiceError
            ? '<p class="text-xs font-bold text-[#8E1B3B] dark:text-[#FDA4AF] bg-[#FFD6D6]/65 dark:bg-[#3D212B] p-3 rounded-[16px]">' + esc(state.voiceError) + "</p>"
            : "") +

          '<div class="space-y-2">' +
            '<input type="text" id="vhVoiceTitle" maxlength="90" value="' + esc(state.voiceNoteTitle) + '" placeholder="Note title (optional) · নোটের নাম..." class="pastel-pill-input w-full text-xs font-bold" />' +
            '<textarea id="vhVoiceTextarea" rows="5" placeholder="আপনার বলা কথা এখানে লেখা হবে... বা সরাসরি টাইপ করুন..." class="pastel-pill-input w-full text-sm font-medium leading-relaxed">' + esc(state.voiceText) + "</textarea>" +
            '<div class="flex flex-wrap items-center justify-between gap-2">' +
              '<div class="flex flex-wrap gap-1.5">' +
                [
                  { lbl: "। (দাড়ি)", val: "। " },
                  { lbl: ", ", val: ", " },
                  { lbl: "?", val: "? " },
                  { lbl: "↵ New Line", val: "\n" }
                ].map(function(p, idx) {
                  return '<button type="button" data-vh-punct="' + idx + '" class="px-3 py-1.5 rounded-full bg-[var(--oneora-bg)] text-xs font-extrabold min-h-[38px]">' + esc(p.lbl) + "</button>";
                }).join("") +
              "</div>" +
              '<span class="text-[11px] font-bold text-[#5C506B] dark:text-[#C5B9DA] tabular-nums">' + words + " words · " + state.voiceText.length + " chars</span>" +
            "</div>" +
          "</div>" +

          '<div class="grid grid-cols-2 sm:grid-cols-4 gap-2">' +
            '<button type="button" id="vhVoiceSaveBtn" class="py-3 px-3 rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white text-xs font-extrabold min-h-[44px]">Save Note · সেভ</button>' +
            '<button type="button" id="vhVoiceCopyBtn" class="py-3 px-3 rounded-full bg-[#FFE7C2] dark:bg-[#3D2E1D] text-[#5C3400] dark:text-[#FDE68A] text-xs font-extrabold min-h-[44px]">Copy · কপি</button>' +
            '<button type="button" id="vhVoiceSpeakBtn" class="py-3 px-3 rounded-full bg-[#CFF3E2] dark:bg-[#1B362E] text-[#115E42] dark:text-[#A7F3D0] text-xs font-extrabold min-h-[44px]">Read Aloud</button>' +
            '<button type="button" id="vhVoiceClearBtn" class="py-3 px-3 rounded-full bg-[var(--oneora-bg)] text-[#8E1B3B] dark:text-[#FDA4AF] text-xs font-extrabold min-h-[44px]">Clear</button>' +
          "</div>" +

          '<div class="grid grid-cols-2 gap-2">' +
            '<button type="button" id="vhVoiceToLetterBtn" class="py-2.5 px-3 rounded-full bg-[#E4D9FF]/80 dark:bg-[#2D2347] text-[#3E26A0] dark:text-[#E4D9FF] text-xs font-extrabold min-h-[44px]">Use in Letter Draft →</button>' +
            '<button type="button" id="vhVoiceToRemBtn" class="py-2.5 px-3 rounded-full bg-[#E4D9FF]/80 dark:bg-[#2D2347] text-[#3E26A0] dark:text-[#E4D9FF] text-xs font-extrabold min-h-[44px]">Set as Reminder →</button>' +
          "</div>" +
        "</div>" +

        '<div class="pastel-stage3-card p-4 sm:p-5 space-y-3">' +
          '<div class="flex flex-wrap items-center justify-between gap-2">' +
            '<h4 class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">Saved Voice Notes (' + store.voiceNotes.length + ")</h4>" +
            (store.voiceNotes.length > 2
              ? '<input type="search" id="vhVoiceSearch" value="' + esc(state.voiceSearch) + '" placeholder="Search notes..." class="pastel-pill-input text-xs font-semibold sm:w-52" />'
              : "") +
          "</div>" +
          (notes.length
            ? '<div class="space-y-2">' +
                notes.map(function(n) {
                  return (
                    '<div class="pastel-inset-tile p-3.5 flex items-start justify-between gap-2.5">' +
                      '<button type="button" data-vh-load-note="' + esc(n.id) + '" class="min-w-0 flex-1 text-left">' +
                        '<p class="text-xs font-extrabold text-[#2B2236] dark:text-[#F5EEFF] truncate">' + esc(n.title || "Voice Note") + " · " + esc(n.dateKey) + "</p>" +
                        '<p class="text-xs font-medium text-[#5C506B] dark:text-[#C5B9DA] line-clamp-2 mt-0.5">' + esc(n.text) + "</p>" +
                      "</button>" +
                      '<div class="flex items-center gap-1.5 shrink-0">' +
                        '<button type="button" data-vh-copy-note="' + esc(n.id) + '" class="px-3 py-2 rounded-full bg-white dark:bg-[#221C2E] text-[#5B3FD0] dark:text-[#CBBBFF] text-xs font-extrabold min-h-[40px]">Copy</button>' +
                        '<button type="button" data-vh-del-note="' + esc(n.id) + '" aria-label="Delete note" class="w-10 h-10 rounded-full bg-[#FFD6D6]/80 dark:bg-[#3D212B] text-[#8E1B3B] dark:text-[#FDA4AF] text-xs font-extrabold">✕</button>' +
                      "</div>" +
                    "</div>"
                  );
                }).join("") +
              "</div>"
            : '<p class="text-xs font-semibold text-[#5C506B] dark:text-[#C5B9DA] text-center py-3">No saved voice notes yet. Speak or type above and tap Save.</p>') +
        "</div>" +
      "</div>"
    );
  }

  /* -------------------- Panel 2: Letter & Application Drafts -------------------- */

  function rebuildLetterFromTemplate() {
    var tpl = LETTER_TEMPLATES.find(function(t) { return t.id === state.letterTplId; }) || LETTER_TEMPLATES[0];
    state.letterBody = tpl.build(state.letterLang, {
      sender: state.letterSender,
      recipient: state.letterRecipient,
      org: state.letterOrg,
      subject: state.letterSubject,
      reason: state.letterReason,
      date: state.letterDate
    });
  }

  function renderLetterPanel(store) {
    if (!state.letterBody) rebuildLetterFromTemplate();
    return (
      '<div class="space-y-4">' +
        '<div class="pastel-stage3-card p-5 space-y-4">' +
          '<div class="flex flex-wrap items-center justify-between gap-2">' +
            '<div>' +
              '<p class="text-[11px] font-extrabold uppercase tracking-wider text-[#804800] dark:text-[#FCD34D]">100% Offline Templates · দরখাস্ত ও চিঠি</p>' +
              '<h3 class="text-base sm:text-lg font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">Letter &amp; Application Drafts</h3>' +
            "</div>" +
            '<div class="flex items-center gap-1.5">' +
              '<button type="button" data-vh-let-lang="bn" class="pastel-pill-tab ' + (state.letterLang === "bn" ? "is-active" : "") + '">বাংলা</button>' +
              '<button type="button" data-vh-let-lang="en" class="pastel-pill-tab ' + (state.letterLang === "en" ? "is-active" : "") + '">English</button>' +
            "</div>" +
          "</div>" +

          '<div class="flex flex-wrap gap-1.5">' +
            LETTER_TEMPLATES.map(function(t) {
              var lbl = state.letterLang === "bn" ? t.bnTitle : t.title;
              return '<button type="button" data-vh-let-tpl="' + t.id + '" class="pastel-pill-tab ' + (state.letterTplId === t.id ? "is-active" : "") + '">' + esc(lbl) + "</button>";
            }).join("") +
          "</div>" +

          '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">' +
            '<input type="text" id="vhLetSender" value="' + esc(state.letterSender) + '" placeholder="Your Name · আপনার নাম" class="pastel-pill-input text-xs font-semibold" />' +
            '<input type="text" id="vhLetRecipient" value="' + esc(state.letterRecipient) + '" placeholder="Recipient · প্রাপক (e.g. Principal / Manager)" class="pastel-pill-input text-xs font-semibold" />' +
            '<input type="text" id="vhLetOrg" value="' + esc(state.letterOrg) + '" placeholder="School / Bank / Office Name · প্রতিষ্ঠানের নাম" class="pastel-pill-input text-xs font-semibold" />' +
            '<input type="date" id="vhLetDate" value="' + esc(state.letterDate) + '" class="pastel-pill-input text-xs font-bold tabular-nums" />' +
            '<input type="text" id="vhLetSubject" value="' + esc(state.letterSubject) + '" placeholder="Subject (Optional) · বিষয়" class="pastel-pill-input text-xs font-semibold" />' +
            '<input type="text" id="vhLetReason" value="' + esc(state.letterReason) + '" placeholder="Main Reason / Request · মূল কারণ" class="pastel-pill-input text-xs font-semibold" />' +
          "</div>" +

          '<button type="button" id="vhLetBuildBtn" class="w-full py-3 rounded-full bg-[#FFE7C2] dark:bg-[#3D2E1D] text-[#5C3400] dark:text-[#FDE68A] text-xs font-extrabold min-h-[44px]">Apply Details to Draft · ড্রাফট আপডেট করুন</button>' +

          '<div>' +
            '<label for="vhLetBody" class="block text-xs font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1">Editable Letter Preview · চিঠির খসড়া</label>' +
            '<textarea id="vhLetBody" rows="10" class="pastel-pill-input w-full text-xs sm:text-sm font-medium leading-relaxed">' + esc(state.letterBody) + "</textarea>" +
          "</div>" +

          '<div class="grid grid-cols-2 sm:grid-cols-4 gap-2">' +
            '<button type="button" id="vhLetPdfBtn" class="py-3 px-3 rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white text-xs font-extrabold min-h-[48px] shadow-sm">Export A4 PDF</button>' +
            '<button type="button" id="vhLetCopyBtn" class="py-3 px-3 rounded-full bg-[#FFE7C2] dark:bg-[#3D2E1D] text-[#5C3400] dark:text-[#FDE68A] text-xs font-extrabold min-h-[48px]">Copy · কপি</button>' +
            '<button type="button" id="vhLetShareBtn" class="py-3 px-3 rounded-full bg-[#CFF3E2] dark:bg-[#1B362E] text-[#115E42] dark:text-[#A7F3D0] text-xs font-extrabold min-h-[48px]">Share</button>' +
            '<button type="button" id="vhLetSaveBtn" class="py-3 px-3 rounded-full bg-[var(--oneora-bg)] text-[#2B2236] dark:text-[#F5EEFF] text-xs font-extrabold min-h-[48px]">Save Draft</button>' +
          "</div>" +
        "</div>" +

        (store.letterDrafts.length
          ? '<div class="pastel-stage3-card p-4 sm:p-5 space-y-2.5">' +
              '<h4 class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">Saved Letter Drafts (' + store.letterDrafts.length + ")</h4>" +
              '<div class="space-y-2">' +
                store.letterDrafts.map(function(d) {
                  return (
                    '<div class="pastel-inset-tile p-3.5 flex items-center justify-between gap-2">' +
                      '<button type="button" data-vh-load-draft="' + esc(d.id) + '" class="min-w-0 flex-1 text-left">' +
                        '<p class="text-xs font-extrabold text-[#2B2236] dark:text-[#F5EEFF] truncate">' + esc(d.title) + " · " + esc(d.dateKey) + "</p>" +
                        '<p class="text-[11px] font-medium text-[#5C506B] dark:text-[#C5B9DA] truncate">' + esc(d.body.slice(0, 80)) + "</p>" +
                      "</button>" +
                      '<button type="button" data-vh-del-draft="' + esc(d.id) + '" aria-label="Delete draft" class="w-10 h-10 rounded-full bg-[#FFD6D6]/80 dark:bg-[#3D212B] text-[#8E1B3B] dark:text-[#FDA4AF] text-xs font-extrabold shrink-0">✕</button>' +
                    "</div>"
                  );
                }).join("") +
              "</div>" +
            "</div>"
          : "") +
      "</div>"
    );
  }

  /* -------------------- Panel 3: Offline Reminders (Reuses Planner Storage) -------------------- */

  function renderRemindersPanel() {
    var allItems = loadPlannerItems();
    var reminders = allItems.filter(function(i) { return i && i.kind === "reminder"; });
    var active = reminders.filter(function(r) { return r.status !== "done"; }).sort(function(a, b) {
      var ka = (a.dateKey || "") + " " + (a.timeStr || "");
      var kb = (b.dateKey || "") + " " + (b.timeStr || "");
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    });
    var done = reminders.filter(function(r) { return r.status === "done"; }).slice(0, 10);

    var notifSupported = "Notification" in global;
    var notifPerm = notifSupported ? Notification.permission : "unsupported";

    return (
      '<div class="space-y-4">' +
        '<div class="pastel-stage3-card p-5 space-y-4">' +
          '<div class="flex flex-wrap items-start justify-between gap-2">' +
            '<div>' +
              '<p class="text-[11px] font-extrabold uppercase tracking-wider text-[#804800] dark:text-[#FCD34D]">Synced with Life Planner · অফলাইন রিমাইন্ডার</p>' +
              '<h3 class="text-base sm:text-lg font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">Daily Offline Reminders</h3>' +
            "</div>" +
            '<div class="flex items-center gap-1.5">' +
              (notifSupported && notifPerm === "default"
                ? '<button type="button" id="vhReqNotifBtn" class="px-3.5 py-2 rounded-full bg-[#FFE7C2] dark:bg-[#3D2E1D] text-[#5C3400] dark:text-[#FDE68A] text-xs font-extrabold min-h-[40px]">Enable Alerts</button>'
                : "") +
              '<button type="button" id="vhOpenPlannerBtn" class="px-3.5 py-2 rounded-full bg-[var(--oneora-bg)] text-xs font-extrabold min-h-[40px]">Full Planner →</button>' +
            "</div>" +
          "</div>" +

          '<div class="flex flex-wrap gap-1.5">' +
            REMINDER_PRESETS.map(function(p, idx) {
              return '<button type="button" data-vh-rem-preset="' + idx + '" class="px-3 py-1.5 rounded-full bg-[var(--oneora-bg)] text-xs font-extrabold min-h-[38px]">' + esc(p.label) + "</button>";
            }).join("") +
          "</div>" +

          '<form id="vhRemForm" class="space-y-3">' +
            '<div class="flex items-center gap-2">' +
              '<input type="text" id="vhRemTitle" required maxlength="140" value="' + esc(state.remTitle) + '" placeholder="What should I remind you? · কী মনে করাতে হবে?" class="pastel-pill-input flex-1 text-sm font-semibold" />' +
              '<button type="button" id="vhRemMicBtn" aria-label="Speak reminder" class="w-12 h-12 rounded-full inline-flex items-center justify-center shrink-0 ' +
                (state.remVoiceListening
                  ? "bg-[#B91C1C] text-white animate-pulse"
                  : "bg-[#E4D9FF] dark:bg-[#2D2347] text-[#3E26A0] dark:text-[#E4D9FF]") +
                '">' +
                '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>' +
              "</button>" +
            "</div>" +

            '<div class="grid grid-cols-2 sm:grid-cols-4 gap-2">' +
              '<input type="date" id="vhRemDate" value="' + esc(state.remDate) + '" class="pastel-pill-input text-xs font-bold tabular-nums" />' +
              '<input type="time" id="vhRemTime" value="' + esc(state.remTime) + '" class="pastel-pill-input text-xs font-bold tabular-nums" />' +
              '<select id="vhRemRepeat" class="pastel-pill-input text-xs font-bold">' +
                '<option value="none"' + (state.remRepeat === "none" ? " selected" : "") + ">Once · একবার</option>" +
                '<option value="daily"' + (state.remRepeat === "daily" ? " selected" : "") + ">Daily · প্রতিদিন</option>" +
                '<option value="weekly"' + (state.remRepeat === "weekly" ? " selected" : "") + ">Weekly · সাপ্তাহিক</option>" +
                '<option value="monthly"' + (state.remRepeat === "monthly" ? " selected" : "") + ">Monthly · মাসিক</option>" +
              "</select>" +
              '<select id="vhRemCat" class="pastel-pill-input text-xs font-bold">' +
                ["Personal", "Medicine", "Bill", "Finance", "Health", "Work"].map(function(c) {
                  return '<option value="' + c + '"' + (state.remCat === c ? " selected" : "") + ">" + c + "</option>";
                }).join("") +
              "</select>" +
            "</div>" +

            '<button type="submit" class="w-full py-3.5 rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white text-xs sm:text-sm font-extrabold min-h-[48px] shadow-sm">+ Add Offline Reminder · রিমাইন্ডার সেভ করুন</button>' +
          "</form>" +
        "</div>" +

        '<div class="pastel-stage3-card p-4 sm:p-5 space-y-3">' +
          '<h4 class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">Upcoming Reminders · আসন্ন (' + active.length + ")</h4>" +
          (active.length
            ? '<div class="space-y-2">' +
                active.map(function(r) {
                  return (
                    '<div class="pastel-inset-tile p-3.5 flex items-center justify-between gap-2.5">' +
                      '<div class="min-w-0 flex-1">' +
                        '<p class="text-xs sm:text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF] truncate">' + esc(r.title) + "</p>" +
                        '<p class="text-[11px] font-semibold text-[#5C506B] dark:text-[#C5B9DA]">' +
                          esc(formatDateHuman(r.dateKey)) + " · " + esc(r.timeStr || "09:00") +
                          (r.repeat && r.repeat !== "none" ? " · " + esc(r.repeat) : "") +
                          " · " + esc(r.category || "Personal") +
                        "</p>" +
                      "</div>" +
                      '<div class="flex items-center gap-1.5 shrink-0">' +
                        '<button type="button" data-vh-rem-done="' + esc(r.id) + '" class="px-3 py-2 rounded-full bg-[#CFF3E2] dark:bg-[#1B362E] text-[#115E42] dark:text-[#A7F3D0] text-xs font-extrabold min-h-[40px]">Done</button>' +
                        '<button type="button" data-vh-rem-del="' + esc(r.id) + '" aria-label="Delete reminder" class="w-10 h-10 rounded-full bg-[#FFD6D6]/80 dark:bg-[#3D212B] text-[#8E1B3B] dark:text-[#FDA4AF] text-xs font-extrabold">✕</button>' +
                      "</div>" +
                    "</div>"
                  );
                }).join("") +
              "</div>"
            : '<p class="text-xs font-semibold text-[#5C506B] dark:text-[#C5B9DA] text-center py-4">No active reminders. Tap a quick preset or add one above!</p>') +
        "</div>" +

        (done.length
          ? '<div class="pastel-stage3-card p-4 sm:p-5 space-y-2">' +
              '<h4 class="text-xs font-extrabold uppercase tracking-wider text-[#5C506B] dark:text-[#C5B9DA]">Completed (' + done.length + ")</h4>" +
              done.map(function(r) {
                return (
                  '<div class="pastel-inset-tile p-3 flex items-center justify-between gap-2 opacity-75">' +
                    '<span class="text-xs font-bold line-through truncate">' + esc(r.title) + " (" + esc(r.dateKey) + ")</span>" +
                    '<button type="button" data-vh-rem-del="' + esc(r.id) + '" aria-label="Delete" class="w-9 h-9 rounded-full bg-[#FFD6D6]/70 dark:bg-[#3D212B] text-[#8E1B3B] dark:text-[#FDA4AF] text-xs font-extrabold shrink-0">✕</button>' +
                  "</div>"
                );
              }).join("") +
            "</div>"
          : "") +
      "</div>"
    );
  }

  /* -------------------- Main Renderer & Events -------------------- */

  function render(container, subTab) {
    var root = container || document.getElementById("oneoraVoiceHelperRoot");
    if (!root) return;

    if (subTab && HELPER_TABS.some(function(t) { return t.id === subTab; })) {
      state.activeTab = subTab;
    }

    var store = loadStore();
    var bodyHtml = "";
    if (state.activeTab === "voice_notes") bodyHtml = renderVoicePanel(store);
    else if (state.activeTab === "letter_drafts") bodyHtml = renderLetterPanel(store);
    else bodyHtml = renderRemindersPanel();

    root.innerHTML =
      '<div class="space-y-4" data-pastel-cat="lifemoney">' +
        '<div class="pastel-cat-header p-5 sm:p-6 space-y-4">' +
          '<div class="flex items-start gap-3.5">' +
            '<div class="pastel-icon-tile !w-12 !h-12 !rounded-2xl shrink-0">' +
              '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>' +
            "</div>" +
            '<div>' +
              '<p class="text-[11px] font-extrabold uppercase tracking-wider text-[#804800] dark:text-[#FCD34D]">Bengali Voice &amp; Daily Helper · দৈনন্দিন সহায়ক</p>' +
              '<h2 class="text-2xl sm:text-[26px] font-extrabold tracking-tight text-[#2B2236] dark:text-[#F5EEFF] leading-tight">Voice, Letters &amp; Reminders</h2>' +
            "</div>" +
          "</div>" +
          '<div class="flex items-center gap-2 overflow-x-auto hide-scrollbar pt-1">' +
            HELPER_TABS.map(function(t) {
              return '<button type="button" data-vh-tab="' + t.id + '" class="pastel-pill-tab ' + (state.activeTab === t.id ? "is-active" : "") + '">' +
                esc(t.label) + " · " + esc(t.bn) +
              "</button>";
            }).join("") +
          "</div>" +
        "</div>" +
        bodyHtml +
      "</div>";

    bindEvents(root);
  }

  function bindEvents(root) {
    root.querySelectorAll("[data-vh-tab]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        stopSpeechRecognition();
        state.activeTab = btn.getAttribute("data-vh-tab") || "voice_notes";
        haptic(6);
        render(root);
      });
    });

    // Voice-to-Text events
    var langSel = root.querySelector("#vhVoiceLang");
    var micBtn = root.querySelector("#vhMicToggleBtn");
    var titleEl = root.querySelector("#vhVoiceTitle");
    var textEl = root.querySelector("#vhVoiceTextarea");
    var saveNoteBtn = root.querySelector("#vhVoiceSaveBtn");
    var copyNoteBtn = root.querySelector("#vhVoiceCopyBtn");
    var speakBtn = root.querySelector("#vhVoiceSpeakBtn");
    var clearBtn = root.querySelector("#vhVoiceClearBtn");
    var toLetterBtn = root.querySelector("#vhVoiceToLetterBtn");
    var toRemBtn = root.querySelector("#vhVoiceToRemBtn");
    var searchEl = root.querySelector("#vhVoiceSearch");

    if (langSel) langSel.addEventListener("change", function() { state.voiceLang = langSel.value; });
    if (titleEl) titleEl.addEventListener("input", function() { state.voiceNoteTitle = titleEl.value; });
    if (textEl) textEl.addEventListener("input", function() { state.voiceText = textEl.value; });

    if (micBtn) {
      micBtn.addEventListener("click", function() {
        if (state.voiceListening) {
          stopSpeechRecognition();
          render(root);
        } else {
          startVoiceDictation(root, function(chunk) {
            state.voiceText = state.voiceText ? state.voiceText + " " + chunk : chunk;
          }, false);
        }
      });
    }

    var punctVals = ["। ", ", ", "? ", "\n"];
    root.querySelectorAll("[data-vh-punct]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var idx = Number(btn.getAttribute("data-vh-punct"));
        state.voiceText += punctVals[idx] || "";
        render(root);
      });
    });

    if (saveNoteBtn) {
      saveNoteBtn.addEventListener("click", function() {
        var txt = String(state.voiceText || "").trim();
        if (!txt) {
          notifyToast("Nothing to Save", "Speak or type some text first.", "error");
          return;
        }
        var st = loadStore();
        st.voiceNotes.unshift({
          id: uid("vn"),
          title: String(state.voiceNoteTitle || txt.slice(0, 36)).trim(),
          text: txt,
          lang: state.voiceLang,
          dateKey: todayKey(),
          atMs: Date.now()
        });
        saveStore(st);
        haptic(10);
        notifyToast("Note Saved · সেভ হয়েছে", "Voice note saved offline.", "success");
        render(root);
      });
    }
    if (copyNoteBtn) copyNoteBtn.addEventListener("click", function() { if (state.voiceText.trim()) copyPlainText(state.voiceText, "Voice text"); });
    if (speakBtn) {
      speakBtn.addEventListener("click", function() {
        if (!state.voiceText.trim()) return;
        if (!("speechSynthesis" in global)) {
          notifyToast("TTS Unavailable", "Text-to-speech is not supported on this device.", "info");
          return;
        }
        try {
          global.speechSynthesis.cancel();
          var u = new SpeechSynthesisUtterance(state.voiceText);
          u.lang = state.voiceLang || "bn-IN";
          global.speechSynthesis.speak(u);
        } catch (e) {}
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener("click", function() {
        stopSpeechRecognition();
        state.voiceText = "";
        state.voiceNoteTitle = "";
        state.voiceInterim = "";
        render(root);
      });
    }
    if (toLetterBtn) {
      toLetterBtn.addEventListener("click", function() {
        if (state.voiceText.trim()) state.letterBody = state.voiceText.trim();
        state.activeTab = "letter_drafts";
        render(root);
      });
    }
    if (toRemBtn) {
      toRemBtn.addEventListener("click", function() {
        if (state.voiceText.trim()) state.remTitle = state.voiceText.trim().slice(0, 120);
        state.activeTab = "quick_reminders";
        render(root);
      });
    }
    if (searchEl) {
      searchEl.addEventListener("input", function() {
        state.voiceSearch = searchEl.value || "";
        var pos = searchEl.selectionStart;
        render(root);
        var re = root.querySelector("#vhVoiceSearch");
        if (re) { re.focus(); try { re.setSelectionRange(pos, pos); } catch (e) {} }
      });
    }
    root.querySelectorAll("[data-vh-load-note]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var id = btn.getAttribute("data-vh-load-note");
        var found = loadStore().voiceNotes.find(function(x) { return x.id === id; });
        if (found) {
          state.voiceNoteTitle = found.title || "";
          state.voiceText = found.text || "";
          render(root);
        }
      });
    });
    root.querySelectorAll("[data-vh-copy-note]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var id = btn.getAttribute("data-vh-copy-note");
        var found = loadStore().voiceNotes.find(function(x) { return x.id === id; });
        if (found) copyPlainText(found.text, "Saved voice note");
      });
    });
    root.querySelectorAll("[data-vh-del-note]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var id = btn.getAttribute("data-vh-del-note");
        var st = loadStore();
        st.voiceNotes = st.voiceNotes.filter(function(x) { return x.id !== id; });
        saveStore(st);
        render(root);
      });
    });

    // Letter Drafts events
    root.querySelectorAll("[data-vh-let-lang]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        state.letterLang = btn.getAttribute("data-vh-let-lang") || "bn";
        rebuildLetterFromTemplate();
        render(root);
      });
    });
    root.querySelectorAll("[data-vh-let-tpl]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        state.letterTplId = btn.getAttribute("data-vh-let-tpl") || "leave_school";
        rebuildLetterFromTemplate();
        render(root);
      });
    });

    function syncLetterInputs() {
      var s = root.querySelector("#vhLetSender");
      var r = root.querySelector("#vhLetRecipient");
      var o = root.querySelector("#vhLetOrg");
      var d = root.querySelector("#vhLetDate");
      var sb = root.querySelector("#vhLetSubject");
      var rs = root.querySelector("#vhLetReason");
      if (s) state.letterSender = s.value;
      if (r) state.letterRecipient = r.value;
      if (o) state.letterOrg = o.value;
      if (d) state.letterDate = d.value;
      if (sb) state.letterSubject = sb.value;
      if (rs) state.letterReason = rs.value;
    }

    var letBuildBtn = root.querySelector("#vhLetBuildBtn");
    var letBodyEl = root.querySelector("#vhLetBody");
    var letPdfBtn = root.querySelector("#vhLetPdfBtn");
    var letCopyBtn = root.querySelector("#vhLetCopyBtn");
    var letShareBtn = root.querySelector("#vhLetShareBtn");
    var letSaveBtn = root.querySelector("#vhLetSaveBtn");

    if (letBuildBtn) {
      letBuildBtn.addEventListener("click", function() {
        syncLetterInputs();
        rebuildLetterFromTemplate();
        haptic(8);
        render(root);
      });
    }
    if (letBodyEl) letBodyEl.addEventListener("input", function() { state.letterBody = letBodyEl.value; });
    if (letPdfBtn) {
      letPdfBtn.addEventListener("click", function() {
        var tpl = LETTER_TEMPLATES.find(function(t) { return t.id === state.letterTplId; });
        exportUnicodeLetterPdf(tpl ? tpl.title : "Letter", state.letterBody);
      });
    }
    if (letCopyBtn) letCopyBtn.addEventListener("click", function() { copyPlainText(state.letterBody, "Letter draft"); });
    if (letShareBtn) {
      letShareBtn.addEventListener("click", function() {
        if (navigator.share) {
          navigator.share({ title: "ONEORA Letter Draft", text: state.letterBody }).catch(function() {});
        } else {
          copyPlainText(state.letterBody, "Letter draft");
        }
      });
    }
    if (letSaveBtn) {
      letSaveBtn.addEventListener("click", function() {
        if (!state.letterBody.trim()) return;
        syncLetterInputs();
        var tpl = LETTER_TEMPLATES.find(function(t) { return t.id === state.letterTplId; });
        var st = loadStore();
        st.letterDrafts.unshift({
          id: uid("dr"),
          title: state.letterSubject || (tpl ? (state.letterLang === "bn" ? tpl.bnTitle : tpl.title) : "Letter Draft"),
          body: state.letterBody,
          dateKey: todayKey(),
          atMs: Date.now()
        });
        saveStore(st);
        notifyToast("Draft Saved · সেভ হয়েছে", "Letter draft stored offline.", "success");
        render(root);
      });
    }
    root.querySelectorAll("[data-vh-load-draft]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var id = btn.getAttribute("data-vh-load-draft");
        var found = loadStore().letterDrafts.find(function(x) { return x.id === id; });
        if (found) {
          state.letterBody = found.body || "";
          render(root);
        }
      });
    });
    root.querySelectorAll("[data-vh-del-draft]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var id = btn.getAttribute("data-vh-del-draft");
        var st = loadStore();
        st.letterDrafts = st.letterDrafts.filter(function(x) { return x.id !== id; });
        saveStore(st);
        render(root);
      });
    });

    // Offline Reminders events (Shared Planner Storage)
    var reqNotifBtn = root.querySelector("#vhReqNotifBtn");
    var openPlanBtn = root.querySelector("#vhOpenPlannerBtn");
    var remMicBtn = root.querySelector("#vhRemMicBtn");
    var remForm = root.querySelector("#vhRemForm");

    if (reqNotifBtn) {
      reqNotifBtn.addEventListener("click", function() {
        if ("Notification" in global && Notification.requestPermission) {
          Notification.requestPermission().then(function() { render(root); }).catch(function() {});
        }
      });
    }
    if (openPlanBtn) {
      openPlanBtn.addEventListener("click", function() {
        if (global.OneoraPlanner && typeof global.OneoraPlanner.openSubTab === "function") {
          global.OneoraPlanner.openSubTab("reminders");
        } else if (typeof global.openPdfBondhuTool === "function") {
          global.openPdfBondhuTool("oneoraPlannerTab");
        }
      });
    }
    root.querySelectorAll("[data-vh-rem-preset]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var idx = Number(btn.getAttribute("data-vh-rem-preset"));
        var p = REMINDER_PRESETS[idx];
        if (p) {
          state.remTitle = p.title;
          state.remTime = p.time;
          state.remRepeat = p.repeat;
          state.remCat = p.cat;
          render(root);
        }
      });
    });
    if (remMicBtn) {
      remMicBtn.addEventListener("click", function() {
        if (state.remVoiceListening) {
          stopSpeechRecognition();
          render(root);
        } else {
          startVoiceDictation(root, function(chunk) {
            state.remTitle = state.remTitle ? state.remTitle + " " + chunk : chunk;
          }, true);
        }
      });
    }
    if (remForm) {
      remForm.addEventListener("submit", function(ev) {
        ev.preventDefault();
        var title = String((root.querySelector("#vhRemTitle") || {}).value || "").trim();
        var dateKey = String((root.querySelector("#vhRemDate") || {}).value || todayKey());
        var timeStr = String((root.querySelector("#vhRemTime") || {}).value || "09:00");
        var repeat = String((root.querySelector("#vhRemRepeat") || {}).value || "none");
        var cat = String((root.querySelector("#vhRemCat") || {}).value || "Personal");
        if (!title) return;
        addOfflineReminder({ title: title, dateKey: dateKey, timeStr: timeStr, repeat: repeat, category: cat });
        state.remTitle = "";
        haptic(10);
        notifyToast("Reminder Set · রিমাইন্ডার সেট হয়েছে", title + " (" + dateKey + " " + timeStr + ")", "success");
        render(root);
      });
    }
    root.querySelectorAll("[data-vh-rem-done]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var id = btn.getAttribute("data-vh-rem-done");
        var all = loadPlannerItems().map(function(it) {
          if (it && it.id === id) {
            return Object.assign({}, it, { status: "done", updatedAtMs: Date.now() });
          }
          return it;
        });
        savePlannerItems(all);
        haptic(10);
        render(root);
      });
    });
    root.querySelectorAll("[data-vh-rem-del]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var id = btn.getAttribute("data-vh-rem-del");
        var all = loadPlannerItems().filter(function(it) { return !it || it.id !== id; });
        savePlannerItems(all);
        render(root);
      });
    });
  }

  document.addEventListener("oneora:sectionchange", function(ev) {
    var sec = ev && ev.detail ? ev.detail.sectionId : "";
    if (sec !== "oneoraVoiceHelperTool") stopSpeechRecognition();
  });

  global.OneoraVoiceHelper = {
    render: render,
    open: function(subTab) {
      if (subTab) state.activeTab = subTab;
      if (typeof global.openPdfBondhuTool === "function") {
        global.openPdfBondhuTool("oneoraVoiceHelperTool", { sub: state.activeTab });
      } else {
        render(null, state.activeTab);
      }
    }
  };
})(window);
