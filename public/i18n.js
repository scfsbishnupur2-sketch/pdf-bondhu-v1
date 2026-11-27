(function(global) {
  const LANG_KEY = "pdfBondhuLang_v2";
  const DICT = {
    en: {
      brandTagline: "One App. Everyday Solutions.",
      navHome: "Home",
      navAllTools: "All Tools",
      navMyFiles: "My Files",
      navRecent: "Recent",
      navProfile: "Profile",
      welcomeMorning: "Good Morning",
      welcomeAfternoon: "Good Afternoon",
      welcomeEvening: "Good Evening",
      welcomeSubtitle: "All your documents, images & daily tools — 100% free and private on your device.",
      searchPlaceholder: "Search tools or ask AI",
      quickActionsTitle: "Quick Actions",
      qaScan: "Scan",
      qaCompress: "Compress",
      qaMerge: "Merge",
      qaQr: "QR Scanner",
      popularTools: "Popular Tools",
      recentTools: "Recently Used",
      favouriteTools: "Favourite Tools",
      browseCategories: "Explore Categories",
      catPdfStudio: "PDF Studio",
      catPdfSub: "Compress, Merge, Scan, Edit, Verify & more",
      catImageStudio: "Image Studio",
      catImageSub: "Exact KB Reducer, Passport Photo, Crop, OCR",
      catOfficeStudio: "Office Studio",
      catOfficeSub: "Excel Merge/Clean, CSV Viewer, ZIP Studio",
      catDailyUtils: "Daily Utilities",
      catDailySub: "Calculators, Converters, Notes, Expenses, QR",
      catIndiaEss: "India Essentials",
      catIndiaSub: "Official Portals, Checklists, GST, Calendar",
      catDocCenter: "Personal Document Center",
      catDocSub: "Folders, PIN & AES-GCM Encrypted Local Vault",
      recentDocsTitle: "Recently Processed Documents",
      recentDocsEmpty: "No processed documents yet. Any PDF, image, or spreadsheet you save will appear here.",
      dailyRecsTitle: "Useful Daily Recommendations",
      rec1Title: "Apply for Govt Exam or PAN?",
      rec1Sub: "Resize photo to exact 20KB–50KB or make a 35×45mm Passport Photo sheet.",
      rec2Title: "Check e-Aadhaar or Certificate",
      rec2Sub: "Verify embedded PDF digital signature & tamper integrity offline.",
      rec3Title: "Calculate GST, EMI & Monthly Bills",
      rec3Sub: "Open Daily Utilities for instant GST, Loan EMI & Electricity Bill calculators.",
      allToolsTitle: "All Tools Directory",
      allToolsSub: "Every tool is 100% free, fast, and works locally without uploading your private files.",
      tabAll: "All",
      tabPdf: "PDF Studio",
      tabImage: "Image Studio",
      tabOffice: "Office Studio",
      tabDaily: "Daily Utilities",
      tabIndia: "India Essentials",
      myFilesTitle: "Personal Document Center",
      myFilesSub: "Store, organize, preview, and encrypt personal documents locally on your device.",
      recentTabTitle: "Recent Activity",
      recentTabSub: "Jump back into your recently used tools and saved documents with one tap.",
      profileTitle: "Profile & Settings",
      profileSub: "Personalize language, theme, vault security, and local storage preferences.",
      langModalTitle: "Choose Your Language",
      langModalSub: "Select your preferred language for PDF Bondhu. You can switch anytime in Settings.",
      langContinue: "Continue to PDF Bondhu",
      appearanceTitle: "Appearance",
      themeLight: "Light",
      themeDark: "Dark",
      themeSystem: "System",
      languageTitle: "Language",
      privacyGuaranteeTitle: "100% Private & Local",
      privacyGuaranteeText: "Your files never leave your phone or browser. Zero cloud uploads, zero subscriptions, 100% free.",
      clearHistoryBtn: "Clear Recent History",
      shareAppBtn: "Share PDF Bondhu",
      rateAppBtn: "Rate App",
      feedbackBtn: "Send Feedback",
      helpBtn: "Help & Support",
      privacyPolicyBtn: "Privacy Policy",
      termsBtn: "Terms & Conditions",
      aboutBtn: "About PDF Bondhu",
      backHome: "Back",
      offlineNotice: "Offline Mode — Running locally. All core PDF, Image, Office & Utility tools continue working.",
      noSearchResults: 'No matching tool found. Try "compress pdf", "passport photo", "gst", "qr", or "merge".',
      popularSearchesLabel: "Popular:",
      recentSearchesLabel: "Recent:"
    },
    bn: {
      brandTagline: "একটি অ্যাপ। প্রতিদিনের সমাধান।",
      navHome: "হোম",
      navAllTools: "সব টুলস",
      navMyFiles: "আমার ফাইল",
      navRecent: "সাম্প্রতিক",
      navProfile: "প্রোফাইল",
      welcomeMorning: "শুভ সকাল",
      welcomeAfternoon: "শুভ দুপুর",
      welcomeEvening: "শুভ সন্ধ্যা",
      welcomeSubtitle: "আপনার সব ডকুমেন্ট, ছবি ও প্রতিদিনের টুলস — ১০০% ফ্রি এবং সম্পূর্ণ প্রাইভেট।",
      searchPlaceholder: "টুলস খুঁজুন বা AI-কে জিজ্ঞেস করুন",
      quickActionsTitle: "দ্রুত কাজ",
      qaScan: "স্ক্যান",
      qaCompress: "কম্প্রেস",
      qaMerge: "মার্জ",
      qaQr: "QR স্ক্যানার",
      popularTools: "জনপ্রিয় টুলস",
      recentTools: "সম্প্রতি ব্যবহৃত",
      favouriteTools: "পছন্দের টুলস",
      browseCategories: "বিভাগসমূহ দেখুন",
      catPdfStudio: "পিডিএফ স্টুডিও",
      catPdfSub: "কম্প্রেস, মার্জ, স্ক্যান, এডিট, ভেরিফাই ও আরও অনেক",
      catImageStudio: "ইমেজ স্টুডিও",
      catImageSub: "সঠিক KB সাইজ, পাসপোর্ট ফটো, ক্রপ, OCR",
      catOfficeStudio: "অফিস স্টুডিও",
      catOfficeSub: "এক্সেল মার্জ/ক্লিন, CSV ভিউয়ার, ZIP স্টুডিও",
      catDailyUtils: "দৈনন্দিন টুলস",
      catDailySub: "ক্যালকুলেটর, কনভার্টার, নোটস, খরচ, QR",
      catIndiaEss: "ইন্ডিয়া এসেনশিয়ালস",
      catIndiaSub: "সরকারি পোর্টাল, চেকলিস্ট, GST, ক্যালেন্ডার",
      catDocCenter: "পার্সোনাল ডকুমেন্ট সেন্টার",
      catDocSub: "ফোল্ডার, PIN ও AES-GCM এনক্রিপ্টেড লোকাল ভল্ট",
      recentDocsTitle: "সম্প্রতি তৈরি ডকুমেন্ট",
      recentDocsEmpty: "এখনো কোনো ডকুমেন্ট সেভ করা হয়নি। আপনি যেকোনো PDF বা ছবি সেভ করলে এখানে দেখা যাবে।",
      dailyRecsTitle: "প্রতিদিনের প্রয়োজনীয় পরামর্শ",
      rec1Title: "সরকারি ফর্ম বা PAN আবেদন করছেন?",
      rec1Sub: "ছবিকে ঠিক ২০KB–৫০KB করুন অথবা ৩৫×৪৫মিমি পাসপোর্ট ফটো শিট বানান।",
      rec2Title: "ই-আধার বা সার্টিফিকেট যাচাই করুন",
      rec2Sub: "অফলাইনেই PDF ডিজিটাল সিগনেচার ও ফাইলের সত্যতা যাচাই করুন।",
      rec3Title: "GST, EMI এবং বিদ্যুৎ বিল হিসাব করুন",
      rec3Sub: "দৈনন্দিন টুলস থেকে মুহূর্তেই GST, লোনের EMI ও বিদ্যুৎ বিল হিসাব করুন।",
      allToolsTitle: "সকল টুলস তালিকা",
      allToolsSub: "সব টুলস ১০০% ফ্রি, দ্রুতগতির এবং আপনার ডিভাইসেই নিরাপদে কাজ করে।",
      tabAll: "সব",
      tabPdf: "পিডিএফ",
      tabImage: "ইমেজ",
      tabOffice: "অফিস",
      tabDaily: "দৈনন্দিন",
      tabIndia: "ইন্ডিয়া",
      myFilesTitle: "পার্সোনাল ডকুমেন্ট সেন্টার",
      myFilesSub: "নিজের ডকুমেন্ট ফোল্ডারে সাজান, প্রিভিউ করুন এবং PIN ও এনক্রিপশন দিয়ে নিরাপদ রাখুন।",
      recentTabTitle: "সাম্প্রতিক কার্যক্রম",
      recentTabSub: "সম্প্রতি ব্যবহৃত টুলস এবং তৈরি ফাইলগুলোতে এক ট্যাপেই ফিরে যান।",
      profileTitle: "প্রোফাইল ও সেটিংস",
      profileSub: "ভাষা, থিম, ভল্ট সিকিউরিটি এবং লোকাল স্টোরেজ নিজের মতো সেট করুন।",
      langModalTitle: "আপনার ভাষা বেছে নিন",
      langModalSub: "PDF Bondhu ব্যবহারের জন্য পছন্দের ভাষা নির্বাচন করুন। সেটিংস থেকে যেকোনো সময় বদলানো যাবে।",
      langContinue: "PDF Bondhu শুরু করুন",
      appearanceTitle: "থিম ও ডিজাইন",
      themeLight: "লাইট",
      themeDark: "ডার্ক",
      themeSystem: "সিস্টেম",
      languageTitle: "ভাষা নির্বাচন",
      privacyGuaranteeTitle: "১০০% প্রাইভেট ও অফলাইন",
      privacyGuaranteeText: "আপনার কোনো ফাইল সার্ভারে আপলোড হয় না। কোনো সাবস্ক্রিপশন নেই, সম্পূর্ণ ফ্রি।",
      clearHistoryBtn: "সাম্প্রতিক ইতিহাস মুছুন",
      shareAppBtn: "অ্যাপ শেয়ার করুন",
      rateAppBtn: "রেটিং দিন",
      feedbackBtn: "মতামত পাঠান",
      helpBtn: "সাহায্য ও সাপোর্ট",
      privacyPolicyBtn: "প্রাইভেসি পলিসি",
      termsBtn: "শর্তাবলী",
      aboutBtn: "PDF Bondhu সম্পর্কে",
      backHome: "ফিরে যান",
      offlineNotice: "অফলাইন মোড চালু আছে — সব PDF, ইমেজ, অফিস ও দৈনন্দিন টুলস স্বাভাবিকভাবেই কাজ করবে।",
      noSearchResults: 'কোনো টুল পাওয়া যায়নি। "compress pdf", "passport", "gst", বা "qr" লিখে খুঁজুন।',
      popularSearchesLabel: "জনপ্রিয়:",
      recentSearchesLabel: "সাম্প্রতিক:"
    },
    hi: {
      brandTagline: "एक ऐप। हर दिन का समाधान।",
      navHome: "होम",
      navAllTools: "सभी टूल्स",
      navMyFiles: "मेरी फाइलें",
      navRecent: "हाल का",
      navProfile: "प्रोफ़ाइल",
      welcomeMorning: "सुप्रभात",
      welcomeAfternoon: "शुभ दोपहर",
      welcomeEvening: "शुभ संध्या",
      welcomeSubtitle: "आपके सभी डॉक्यूमेंट, इमेज और दैनिक टूल्स — 100% मुफ़्त और पूरी तरह सुरक्षित।",
      searchPlaceholder: "टूल्स खोजें या AI से पूछें",
      quickActionsTitle: "त्वरित कार्य",
      qaScan: "स्कैन",
      qaCompress: "कम्प्रेस",
      qaMerge: "मर्ज",
      qaQr: "QR स्कैनर",
      popularTools: "लोकप्रिय टूल्स",
      recentTools: "हाल ही में प्रयुक्त",
      favouriteTools: "पसंदीदा टूल्स",
      browseCategories: "श्रेणियां देखें",
      catPdfStudio: "पीडीएफ स्टूडियो",
      catPdfSub: "कम्प्रेस, मर्ज, स्कैन, एडिट, वेरिफाई व अन्य",
      catImageStudio: "इमेज स्टूडियो",
      catImageSub: "सटीक KB साइज़, पासपोर्ट फोटो, क्रॉप, OCR",
      catOfficeStudio: "ऑफिस स्टूडियो",
      catOfficeSub: "एक्सेल मर्ज/क्लीन, CSV व्यूअर, ZIP स्टूडियो",
      catDailyUtils: "दैनिक उपयोगिताएँ",
      catDailySub: "कैलकुलेटर, कन्वर्टर, नोट्स, खर्च, QR",
      catIndiaEss: "इंडिया एसेंशियल्स",
      catIndiaSub: "सरकारी पोर्टल, चेकलिस्ट, GST, कैलेंडर",
      catDocCenter: "पर्सनल डॉक्यूमेंट सेंटर",
      catDocSub: "फ़ोल्डर, PIN और AES-GCM एन्क्रिप्टेड वॉल्ट",
      recentDocsTitle: "हाल ही में प्रोसेस किए गए डॉक्यूमेंट",
      recentDocsEmpty: "अभी कोई डॉक्यूमेंट सेव नहीं हुआ है। आपके द्वारा सेव की गई PDF या फोटो यहाँ दिखाई देंगी।",
      dailyRecsTitle: "उपयोगी दैनिक सुझाव",
      rec1Title: "सरकारी फॉर्म या PAN भर रहे हैं?",
      rec1Sub: "फोटो को ठीक 20KB–50KB करें या 35×45mm पासपोर्ट फोटो शीट बनाएँ।",
      rec2Title: "ई-आधार या प्रमाणपत्र जाँचें",
      rec2Sub: "ऑफ़लाइन PDF डिजिटल सिग्नेचर और फाइल की प्रामाणिकता सत्यापित करें।",
      rec3Title: "GST, EMI और बिजली बिल निकालें",
      rec3Sub: "दैनिक उपयोगिताओं में तुरंत GST, लोन EMI और बिजली बिल की गणना करें।",
      allToolsTitle: "सभी टूल्स निर्देशिका",
      allToolsSub: "हर टूल 100% मुफ़्त है और आपकी फाइलों को अपलोड किए बिना सीधे डिवाइस पर काम करता है।",
      tabAll: "सभी",
      tabPdf: "पीडीएफ",
      tabImage: "इमेज",
      tabOffice: "ऑफिस",
      tabDaily: "दैनिक",
      tabIndia: "इंडिया",
      myFilesTitle: "पर्सनल डॉक्यूमेंट सेंटर",
      myFilesSub: "अपने डॉक्यूमेंट को फ़ोल्डर में व्यवस्थित करें, प्रीव्यू देखें और PIN से सुरक्षित रखें।",
      recentTabTitle: "हाल की गतिविधि",
      recentTabSub: "अपने हाल के टूल्स और सेव की गई फाइलों को एक टैप में दोबारा खोलें।",
      profileTitle: "प्रोफ़ाइल और सेटिंग्स",
      profileSub: "भाषा, थीम, वॉल्ट सुरक्षा और लोकल स्टोरेज प्राथमिकताएँ प्रबंधित करें।",
      langModalTitle: "अपनी भाषा चुनें",
      langModalSub: "PDF Bondhu के लिए अपनी पसंदीदा भाषा चुनें। आप सेटिंग्स से कभी भी बदल सकते हैं।",
      langContinue: "PDF Bondhu शुरू करें",
      appearanceTitle: "थीम और स्वरूप",
      themeLight: "लाइट",
      themeDark: "डार्क",
      themeSystem: "सिस्टम",
      languageTitle: "भाषा",
      privacyGuaranteeTitle: "100% प्राइवेट और ऑफ़लाइन",
      privacyGuaranteeText: "आपकी फाइलें कभी किसी सर्वर पर अपलोड नहीं होतीं। कोई सब्सक्रिप्शन नहीं, पूरी तरह मुफ़्त।",
      clearHistoryBtn: "हाल का इतिहास साफ़ करें",
      shareAppBtn: "ऐप शेयर करें",
      rateAppBtn: "ऐप को रेट करें",
      feedbackBtn: "सुझाव भेजें",
      helpBtn: "सहायता और समर्थन",
      privacyPolicyBtn: "गोपनीयता नीति",
      termsBtn: "नियम और शर्तें",
      aboutBtn: "PDF Bondhu के बारे में",
      backHome: "वापस",
      offlineNotice: "ऑफ़लाइन मोड सक्रिय है — सभी PDF, इमेज, ऑफिस और दैनिक टूल्स सामान्य रूप से काम कर रहे हैं।",
      noSearchResults: 'कोई टूल नहीं मिला। "compress pdf", "passport", "gst", या "qr" खोजें।',
      popularSearchesLabel: "लोकप्रिय:",
      recentSearchesLabel: "हाल की:"
    }
  };
  function getLang() {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved && DICT[saved]) return saved;
    } catch (e) {
    }
    return "en";
  }
  function hasExplicitLang() {
    try {
      return Boolean(localStorage.getItem(LANG_KEY));
    } catch (e) {
      return true;
    }
  }
  function getLocale(lang = getLang()) {
    if (lang === "bn") return "bn-IN";
    if (lang === "hi") return "hi-IN";
    return "en-IN";
  }
  function t(key, fallback = "") {
    const lang = getLang();
    return DICT[lang] && DICT[lang][key] || DICT.en[key] || fallback || key;
  }
  function applyTranslations(lang = getLang()) {
    document.documentElement.lang = lang;
    if (lang === "bn") {
      document.body.style.fontFamily = '"Noto Sans Bengali", "Plus Jakarta Sans", system-ui, sans-serif';
    } else if (lang === "hi") {
      document.body.style.fontFamily = '"Noto Sans Devanagari", "Plus Jakarta Sans", system-ui, sans-serif';
    } else {
      document.body.style.fontFamily = '"Plus Jakarta Sans", "Noto Sans Bengali", "Noto Sans Devanagari", system-ui, sans-serif';
    }
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const k = el.getAttribute("data-i18n");
      if (k) el.textContent = t(k, el.textContent);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const k = el.getAttribute("data-i18n-placeholder");
      if (k) el.setAttribute("placeholder", t(k, el.getAttribute("placeholder") || ""));
    });
    const greetEl = document.getElementById("homeGreetingText");
    if (greetEl) {
      const hr = (/* @__PURE__ */ new Date()).getHours();
      const greetKey = hr < 12 ? "welcomeMorning" : hr < 17 ? "welcomeAfternoon" : "welcomeEvening";
      let userName = "";
      try {
        const prof = JSON.parse(localStorage.getItem("pdfBondhuProfile_v2") || "{}");
        userName = (prof.name || "").trim();
      } catch (e) {
      }
      greetEl.textContent = userName ? `${t(greetKey)}, ${userName}` : t(greetKey);
    }
    document.querySelectorAll("[data-set-lang]").forEach((btn) => {
      const isAct = btn.getAttribute("data-set-lang") === lang;
      btn.setAttribute("aria-pressed", isAct ? "true" : "false");
      btn.classList.toggle("bg-[#293B80]", isAct);
      btn.classList.toggle("text-white", isAct);
      btn.classList.toggle("border-[#293B80]", isAct);
      btn.classList.toggle("bg-white", !isAct);
      btn.classList.toggle("dark:bg-[#1C2438]", !isAct);
      btn.classList.toggle("text-slate-700", !isAct);
      btn.classList.toggle("dark:text-slate-200", !isAct);
    });
    document.dispatchEvent(new CustomEvent("pdfbondhu:langchange", { detail: { lang, locale: getLocale(lang) } }));
  }
  function setLang(lang) {
    if (!DICT[lang]) return;
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch (e) {
    }
    applyTranslations(lang);
  }
  function formatNumber(val, opts = {}) {
    try {
      return new Intl.NumberFormat(getLocale(), opts).format(val);
    } catch (e) {
      return String(val);
    }
  }
  function formatDate(dateObj, opts = { day: "2-digit", month: "short", year: "numeric" }) {
    try {
      return new Intl.DateTimeFormat(getLocale(), opts).format(dateObj instanceof Date ? dateObj : new Date(dateObj));
    } catch (e) {
      return String(dateObj);
    }
  }
  function initLanguageSystem() {
    applyTranslations(getLang());
    document.querySelectorAll("[data-set-lang]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const chosen = btn.getAttribute("data-set-lang");
        setLang(chosen);
      });
    });
    const modal = document.getElementById("firstLaunchLangModal");
    const confirmBtn = document.getElementById("firstLaunchLangContinueBtn");
    if (modal && !hasExplicitLang()) {
      modal.classList.remove("hidden");
      modal.classList.add("flex");
      let selectedOnModal = "en";
      modal.querySelectorAll("[data-modal-lang]").forEach((btn) => {
        btn.addEventListener("click", () => {
          selectedOnModal = btn.getAttribute("data-modal-lang") || "en";
          setLang(selectedOnModal);
          modal.querySelectorAll("[data-modal-lang]").forEach((b) => {
            const active = b.getAttribute("data-modal-lang") === selectedOnModal;
            b.classList.toggle("border-[#293B80]", active);
            b.classList.toggle("bg-[#293B80]/10", active);
            b.classList.toggle("dark:bg-[#7666D8]/20", active);
          });
        });
      });
      if (confirmBtn) {
        confirmBtn.addEventListener("click", () => {
          setLang(selectedOnModal);
          modal.classList.add("hidden");
          modal.classList.remove("flex");
        });
      }
    }
  }
  global.PDFBondhuI18n = {
    t,
    getLang,
    setLang,
    getLocale,
    formatNumber,
    formatDate,
    applyTranslations,
    initLanguageSystem
  };
  document.addEventListener("DOMContentLoaded", initLanguageSystem);
})(window);
