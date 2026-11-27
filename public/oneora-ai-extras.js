(function(global) {
  const AI_HISTORY_KEY = "oneoraAiHistory_v1";
  const AI_PRIVACY_KEY = "oneoraAiSaveHistory_v1";
  const LINKS_KEY = "oneoraSavedLinks_v1";
  const EXPIRY_KEY = "oneoraDocExpiries_v1";
  function esc(s) {
    return String(s != null ? s : "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function toast(title, msg, type = "info") {
    if (global.utils && typeof global.utils.showToast === "function") {
      global.utils.showToast(title, msg, type);
    }
  }
  let aiLang = localStorage.getItem("pdfBondhuLang_v2") || "en";
  let aiSending = false;
  let aiDocContext = "";
  let aiDocName = "";
  let aiImageBase64 = "";
  let aiImageMime = "";
  let aiImageName = "";
  function getAiSaveEnabled() {
    return localStorage.getItem(AI_PRIVACY_KEY) !== "false";
  }
  function loadAiHistory() {
    try {
      const arr = JSON.parse(localStorage.getItem(AI_HISTORY_KEY) || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }
  function saveAiHistory(arr) {
    if (!getAiSaveEnabled()) return;
    try {
      localStorage.setItem(AI_HISTORY_KEY, JSON.stringify(arr.slice(-30)));
    } catch (e) {
    }
  }
  let memHistory = loadAiHistory();
  async function extractFileForAi(file) {
    if (!file) return;
    const name = file.name || "Document";
    const ext = name.split(".").pop().toLowerCase();
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        aiImageBase64 = String(reader.result || "");
        aiImageMime = file.type;
        aiImageName = name;
        aiDocContext = "";
        aiDocName = "";
        renderAi();
        toast("Image Attached", `${name} is ready for ONEORA AI analysis.`, "success");
      };
      reader.readAsDataURL(file);
      return;
    }
    if (ext === "pdf" && global.pdfjsLib) {
      toast("Reading PDF", "Extracting text locally for ONEORA AI...", "info");
      const buf = await file.arrayBuffer();
      const pdf = await global.pdfjsLib.getDocument({ data: buf }).promise;
      const maxPages = Math.min(pdf.numPages, 15);
      let fullText = "";
      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += `
--- Page ${i} ---
` + content.items.map((it) => it.str).join(" ");
      }
      aiDocContext = fullText.trim().slice(0, 22e3);
      aiDocName = `${name} (${pdf.numPages} pages)`;
      aiImageBase64 = "";
      aiImageName = "";
      renderAi();
      toast("PDF Ready for AI", `Extracted text from ${maxPages} page(s). Ask anything!`, "success");
      return;
    }
    if (ext === "docx" && global.mammoth) {
      const buf = await file.arrayBuffer();
      const res = await global.mammoth.extractRawText({ arrayBuffer: buf });
      aiDocContext = String(res.value || "").trim().slice(0, 22e3);
      aiDocName = name;
      aiImageBase64 = "";
      aiImageName = "";
      renderAi();
      toast("Word Doc Ready", `Extracted text from ${name}.`, "success");
      return;
    }
    const txt = await file.text();
    aiDocContext = txt.trim().slice(0, 22e3);
    aiDocName = name;
    aiImageBase64 = "";
    aiImageName = "";
    renderAi();
    toast("File Attached", `${name} attached for AI Q&A.`, "success");
  }
  async function sendAiPrompt(message, template = "") {
    const clean = String(message || "").trim();
    if (!clean || aiSending) return;
    aiSending = true;
    memHistory.push({ role: "user", text: clean, at: (/* @__PURE__ */ new Date()).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) });
    saveAiHistory(memHistory);
    renderAi();
    try {
      const resp = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: clean,
          language: aiLang,
          template,
          docContext: aiDocContext,
          docName: aiDocName,
          imageBase64: aiImageBase64,
          imageMimeType: aiImageMime,
          history: memHistory.slice(-8).map((m) => ({ role: m.role, text: m.text }))
        })
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data.error || `Server responded with status ${resp.status}`);
      }
      memHistory.push({
        role: "assistant",
        text: data.reply || "No response generated.",
        at: (/* @__PURE__ */ new Date()).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
      });
      saveAiHistory(memHistory);
    } catch (err) {
      const errMsg = !navigator.onLine ? "You are currently offline. ONEORA AI needs an internet connection, while all PDF, Planner, Finance, and Utility tools work offline." : err instanceof Error ? err.message : "Could not reach ONEORA AI right now.";
      memHistory.push({ role: "error", text: errMsg, at: (/* @__PURE__ */ new Date()).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) });
    } finally {
      aiSending = false;
      renderAi();
      const box = document.getElementById("oneoraAiMessages");
      if (box) box.scrollTop = box.scrollHeight;
    }
  }
  function renderAi() {
    var _a, _b, _c, _d, _e, _f, _g;
    const root = document.getElementById("oneoraAiRoot");
    if (!root) return;
    const saveOn = getAiSaveEnabled();
    const templates = [
      { label: "Summarize Doc", prompt: "Summarize the attached document in clear bullet points with key dates and action items." },
      { label: "Formal Letter", prompt: "Help me draft a polite, well-structured formal letter for an official request." },
      { label: "Job Application", prompt: "Write a crisp, professional job application email with placeholders I can fill in." },
      { label: "Translate BN/EN/HI", prompt: "Translate the following text accurately into Bengali, English, and Hindi: " },
      { label: "Fix Grammar", prompt: "Correct the grammar, clarity, and tone of this text while keeping my meaning: " },
      { label: "Analyze My Expenses", action: "expenses" },
      { label: "Plan My Day", action: "planner" }
    ];
    root.innerHTML = `
      <div class="pastel-stage3-card !rounded-[30px] overflow-hidden flex flex-col">
        <!-- Lavender Pastel Header (#CBBBFF / #2F244D) -->
        <div class="pastel-hero-card !rounded-none !shadow-none p-5 sm:p-6 flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-3.5 relative z-10">
            <div class="w-12 h-12 rounded-2xl bg-white dark:bg-[#221C2E] p-1.5 shadow-sm flex items-center justify-center shrink-0">
              <img src="./icon.svg" alt="ONEORA" class="w-full h-full rounded-xl object-contain" />
            </div>
            <div>
              <p class="text-[11px] font-extrabold uppercase tracking-wider text-[#432B9F] dark:text-[#DDD0FF]">Multilingual Assistant · EN · বাংলা · हिन्दी</p>
              <h2 class="text-2xl sm:text-[26px] font-extrabold tracking-tight text-[#2B2236] dark:text-[#F5EEFF] leading-tight">ONEORA AI</h2>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2 relative z-10">
            <select id="aiLangSelect" aria-label="AI language" class="px-3.5 py-2 rounded-full bg-white/90 dark:bg-[#17131F]/80 border border-[#2B2236]/10 dark:border-[#F5EEFF]/12 text-[#2B2236] dark:text-[#F5EEFF] text-xs font-extrabold min-h-[44px]">
              <option value="en" ${aiLang === "en" ? "selected" : ""}>English</option>
              <option value="bn" ${aiLang === "bn" ? "selected" : ""}>বাংলা (Bengali)</option>
              <option value="hi" ${aiLang === "hi" ? "selected" : ""}>हिन्दी (Hindi)</option>
            </select>
            <button type="button" id="aiPrivacyToggleBtn" class="px-3.5 py-2 rounded-full bg-white/90 dark:bg-[#17131F]/80 hover:bg-white border border-[#2B2236]/10 dark:border-[#F5EEFF]/12 text-[#2B2236] dark:text-[#F5EEFF] text-xs font-extrabold min-h-[44px] transition">${saveOn ? "History: On" : "Private Mode"}</button>
            <button type="button" id="aiClearChatBtn" class="px-3.5 py-2 rounded-full bg-[#FFD6D6] dark:bg-[#3D212B] text-[#8E1B3B] dark:text-[#FDA4AF] text-xs font-extrabold min-h-[44px] transition">Clear</button>
          </div>
        </div>

        <!-- 1-Tap Template Pills -->
        <div class="px-4 py-3 border-b border-[#2B2236]/8 dark:border-[#F5EEFF]/10 bg-[#FFF7EE] dark:bg-[#17131F] flex items-center gap-2 overflow-x-auto hide-scrollbar">
          ${templates.map((t, i) => `
            <button type="button" data-ai-tpl="${i}" class="px-4 py-2 rounded-full bg-white dark:bg-[#221C2E] border border-[#2B2236]/10 dark:border-[#F5EEFF]/12 text-[#2B2236] dark:text-[#F5EEFF] text-xs font-bold whitespace-nowrap hover:border-[#5B3FD0] hover:text-[#5B3FD0] dark:hover:text-[#CBBBFF] min-h-[44px] shadow-xs transition">${esc(t.label)}</button>
          `).join("")}
        </div>

        <!-- Active Context Bar -->
        ${aiDocName || aiImageName ? `
          <div class="px-4 py-2.5 bg-[#CFF3E2] dark:bg-[#1B362E] border-b border-[#115E42]/15 flex items-center justify-between gap-2 text-xs">
            <span class="font-extrabold text-[#115E42] dark:text-[#A7F3D0] truncate">Attached: ${esc(aiDocName || aiImageName)}</span>
            <button type="button" id="aiClearContextBtn" class="px-3 py-1 rounded-full bg-white/80 dark:bg-[#17131F]/70 text-[#8E1B3B] dark:text-[#FDA4AF] font-extrabold shrink-0 min-h-[36px]">Remove ✕</button>
          </div>
        ` : ""}

        <!-- Chat Messages -->
        <div id="oneoraAiMessages" class="p-4 sm:p-5 space-y-3 min-h-[320px] max-h-[52vh] overflow-y-auto bg-[#FFF7EE] dark:bg-[#17131F]">
          ${memHistory.length ? memHistory.map((m, idx) => `
            <div class="flex ${m.role === "user" ? "justify-end" : "justify-start"}">
              <div class="max-w-[88%] px-4 py-3.5 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${m.role === "user" ? "rounded-[24px] rounded-br-md bg-[#5B3FD0] text-white shadow-sm" : m.role === "error" ? "rounded-[24px] rounded-bl-md bg-[#FFD6D6] dark:bg-[#3D212B] text-[#8E1B3B] dark:text-[#FDA4AF] font-semibold" : "rounded-[24px] rounded-bl-md bg-white dark:bg-[#221C2E] border border-[#2B2236]/8 dark:border-[#F5EEFF]/10 text-[#2B2236] dark:text-[#F5EEFF] shadow-xs"}">
                <div>${esc(m.text)}</div>
                <div class="flex items-center justify-between gap-3 mt-2 text-[11px] opacity-80">
                  <span class="tabular-nums">${esc(m.at || "")}</span>
                  ${m.role === "assistant" ? `<div class="flex items-center gap-2"><button type="button" data-ai-copy="${idx}" class="px-2.5 py-1 rounded-full bg-[#E4D9FF]/60 dark:bg-[#2D2347] text-[#3E26A0] dark:text-[#E4D9FF] font-extrabold">Copy</button><button type="button" data-ai-speak="${idx}" class="px-2.5 py-1 rounded-full bg-[#CFF3E2]/70 dark:bg-[#1B362E] text-[#115E42] dark:text-[#A7F3D0] font-extrabold">Speak</button></div>` : ""}
                </div>
              </div>
            </div>
          `).join("") : `
            <div class="pastel-empty-state my-4 max-w-md mx-auto">
              <div class="w-16 h-16 rounded-[22px] bg-[#CBBBFF] dark:bg-[#2F244D] text-[#3E26A0] dark:text-[#E4D9FF] flex items-center justify-center shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
              </div>
              <p class="text-base font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">Ask ONEORA AI anything</p>
              <p class="text-xs text-[#5C506B] dark:text-[#C5B9DA]">Attach a PDF, Word doc, or photo to summarize, translate between বাংলা, English &amp; हिन्दी, analyze monthly spending, or draft formal letters.</p>
            </div>
          `}
          ${aiSending ? '<div class="flex justify-start"><div class="px-4 py-2.5 rounded-full bg-[#E4D9FF] dark:bg-[#2D2347] text-[#3E26A0] dark:text-[#E4D9FF] text-xs font-extrabold animate-pulse">ONEORA AI is thinking…</div></div>' : ""}
        </div>

        <!-- Pill Composer -->
        <form id="oneoraAiForm" class="p-3 sm:p-4 bg-white dark:bg-[#221C2E] border-t border-[#2B2236]/8 dark:border-[#F5EEFF]/10 flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <label class="cursor-pointer w-11 h-11 rounded-full bg-[#FFF7EE] dark:bg-[#17131F] border border-[#2B2236]/12 dark:border-[#F5EEFF]/12 hover:border-[#5B3FD0] text-[#2B2236] dark:text-[#F5EEFF] flex items-center justify-center shrink-0 transition" title="Attach PDF, DOCX, TXT, or Image">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              <input type="file" id="aiAttachFileInput" accept=".pdf,.docx,.txt,.csv,image/*" class="hidden" />
            </label>
            <button type="button" id="aiVoiceInputBtn" class="w-11 h-11 rounded-full bg-[#FFF7EE] dark:bg-[#17131F] border border-[#2B2236]/12 dark:border-[#F5EEFF]/12 hover:border-[#5B3FD0] text-[#2B2236] dark:text-[#F5EEFF] flex items-center justify-center shrink-0 transition" title="Voice Input">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
            </button>
            <input type="text" id="aiPromptInput" autocomplete="off" maxlength="4000" placeholder="Ask in English, বাংলা, or हिन्दी..." class="pastel-pill-input !rounded-full flex-1 min-w-0 text-sm font-medium" />
            <button type="submit" ${aiSending ? "disabled" : ""} class="px-5 h-11 rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white text-xs font-extrabold shrink-0 disabled:opacity-50 shadow-sm transition">Send</button>
          </div>
        </form>
      </div>
    `;
    (_a = root.querySelector("#aiLangSelect")) == null ? void 0 : _a.addEventListener("change", (e) => {
      aiLang = e.target.value;
    });
    (_b = root.querySelector("#aiPrivacyToggleBtn")) == null ? void 0 : _b.addEventListener("click", () => {
      const next = !getAiSaveEnabled();
      localStorage.setItem(AI_PRIVACY_KEY, String(next));
      if (!next) localStorage.removeItem(AI_HISTORY_KEY);
      renderAi();
      toast("Privacy Updated", next ? "Chat history saving enabled locally." : "Private mode enabled — chat history will not be stored.", "info");
    });
    (_c = root.querySelector("#aiClearChatBtn")) == null ? void 0 : _c.addEventListener("click", () => {
      memHistory = [];
      localStorage.removeItem(AI_HISTORY_KEY);
      renderAi();
    });
    (_d = root.querySelector("#aiClearContextBtn")) == null ? void 0 : _d.addEventListener("click", () => {
      aiDocContext = "";
      aiDocName = "";
      aiImageBase64 = "";
      aiImageMime = "";
      aiImageName = "";
      renderAi();
    });
    (_e = root.querySelector("#aiAttachFileInput")) == null ? void 0 : _e.addEventListener("change", (e) => {
      var _a2;
      const f = (_a2 = e.target.files) == null ? void 0 : _a2[0];
      if (f) extractFileForAi(f).catch((err) => toast("Attach Error", err.message, "error"));
    });
    (_f = root.querySelector("#aiVoiceInputBtn")) == null ? void 0 : _f.addEventListener("click", () => {
      const SpeechRec = global.SpeechRecognition || global.webkitSpeechRecognition;
      if (!SpeechRec) {
        toast("Voice Input", "Speech recognition not available in this browser.", "info");
        return;
      }
      const rec = new SpeechRec();
      rec.lang = aiLang === "bn" ? "bn-IN" : aiLang === "hi" ? "hi-IN" : "en-IN";
      rec.onresult = (ev) => {
        var _a2, _b2, _c2;
        const txt = ((_c2 = (_b2 = (_a2 = ev.results) == null ? void 0 : _a2[0]) == null ? void 0 : _b2[0]) == null ? void 0 : _c2.transcript) || "";
        const inp = root.querySelector("#aiPromptInput");
        if (inp) {
          inp.value = txt;
          inp.focus();
        }
      };
      rec.start();
    });
    root.querySelectorAll("[data-ai-tpl]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tpl = templates[Number(btn.getAttribute("data-ai-tpl"))];
        if (!tpl) return;
        const inp = root.querySelector("#aiPromptInput");
        if (tpl.action === "expenses" && global.OneoraMoney) {
          const s = global.OneoraMoney.getSummary();
          const summaryTxt = `Analyze my monthly spending and suggest 3 realistic ways to save more. This Month Income: ₹${s.monthIncome}, Expense: ₹${s.monthExpense}, Savings: ₹${s.monthSavings}. Top categories: ${JSON.stringify(s.catSpend)}`;
          sendAiPrompt(summaryTxt, "Expense Analysis");
        } else if (tpl.action === "planner" && global.OneoraPlanner) {
          const p = global.OneoraPlanner.getSummary();
          const planTxt = `Create a calm, practical time-blocked daily schedule for today (${p.todayKey}). Today's events/tasks: ${p.todayEvents.map((e) => e.title).join(", ") || "None added yet"}. Upcoming reminders: ${p.upcomingReminders.slice(0, 4).map((r) => `${r.title} at ${r.timeStr}`).join(", ") || "None"}.`;
          sendAiPrompt(planTxt, "Daily Plan");
        } else if (inp) {
          inp.value = tpl.prompt;
          inp.focus();
        }
      });
    });
    root.querySelectorAll("[data-ai-copy]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = memHistory[Number(btn.getAttribute("data-ai-copy"))];
        if (item && navigator.clipboard) {
          navigator.clipboard.writeText(item.text).then(() => toast("Copied", "AI response copied to clipboard.", "success"));
        }
      });
    });
    root.querySelectorAll("[data-ai-speak]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = memHistory[Number(btn.getAttribute("data-ai-speak"))];
        if (item && "speechSynthesis" in global) {
          global.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(item.text.slice(0, 1200));
          u.lang = aiLang === "bn" ? "bn-IN" : aiLang === "hi" ? "hi-IN" : "en-IN";
          global.speechSynthesis.speak(u);
        }
      });
    });
    (_g = root.querySelector("#oneoraAiForm")) == null ? void 0 : _g.addEventListener("submit", (e) => {
      e.preventDefault();
      const inp = root.querySelector("#aiPromptInput");
      if (!inp || !inp.value.trim()) return;
      const val = inp.value;
      inp.value = "";
      sendAiPrompt(val);
    });
  }
  let extraSubTab = "redact";
  let redactPdfBytes = null;
  let redactPdfDoc = null;
  let redactPageNum = 1;
  let redactBoxes = [];
  let worldClockInterval = null;
  function loadLinks() {
    try {
      return JSON.parse(localStorage.getItem(LINKS_KEY) || "[]") || [];
    } catch (e) {
      return [];
    }
  }
  function saveLinks(arr) {
    try {
      localStorage.setItem(LINKS_KEY, JSON.stringify(arr));
    } catch (e) {
    }
  }
  function loadExpiries() {
    try {
      return JSON.parse(localStorage.getItem(EXPIRY_KEY) || "[]") || [];
    } catch (e) {
      return [];
    }
  }
  function saveExpiries(arr) {
    try {
      localStorage.setItem(EXPIRY_KEY, JSON.stringify(arr));
    } catch (e) {
    }
    document.dispatchEvent(new CustomEvent("oneora:plannerchange"));
  }
  function renderExtras() {
    const root = document.getElementById("oneoraExtrasRoot");
    if (!root) return;
    const tabs = [
      { id: "redact", label: "PDF Redact & Flatten" },
      { id: "imgpro", label: "Collage, Watermark & BG" },
      { id: "smartpro", label: "Password, Clock & Text" },
      { id: "indiadir", label: "Emergency, Holidays & Expiry" }
    ];
    root.innerHTML = `
      <div class="space-y-5">
        <div class="bg-white dark:bg-[#151B2F] rounded-[24px] border border-[#E8EAF2] dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-wider text-[#7457E8] dark:text-[#648BFF]">ONEORA Pro Offline Tools</p>
            <h2 class="text-xl sm:text-2xl font-extrabold text-[#171B2C] dark:text-[#F5F6FC] tracking-tight mt-0.5">Extra Privacy, Image &amp; Smart Utilities</h2>
          </div>
          <div class="flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
            ${tabs.map((t) => `
              <button type="button" data-extra-tab="${t.id}" class="px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap min-h-[40px] transition ${extraSubTab === t.id ? "bg-[#7457E8] text-white shadow-sm" : "bg-[#F6F7FB] dark:bg-[#1D2540] text-[#777F91] dark:text-[#A5ADC2] hover:text-[#171B2C] dark:hover:text-white"}">${t.label}</button>
            `).join("")}
          </div>
        </div>

        <div id="oneoraExtrasBody">
          ${extraSubTab === "redact" ? renderRedactPanel() : ""}
          ${extraSubTab === "imgpro" ? renderImgProPanel() : ""}
          ${extraSubTab === "smartpro" ? renderSmartProPanel() : ""}
          ${extraSubTab === "indiadir" ? renderIndiaDirPanel() : ""}
        </div>
      </div>
    `;
    bindExtrasEvents(root);
  }
  function renderRedactPanel() {
    return `
      <div class="bg-white dark:bg-[#151B2F] rounded-3xl border border-[#E6E9F2] dark:border-[#232C4A] p-5 shadow-sm space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 class="text-base font-extrabold text-[#14182B] dark:text-[#F5F6FC]">Permanent PDF Redaction &amp; Flattening</h3>
            <p class="text-xs text-[#647087] dark:text-[#A5ADC2] mt-0.5">Draw black boxes over sensitive Aadhaar, phone, or bank info. Pages are raster-flattened so hidden text is permanently destroyed.</p>
          </div>
          <label class="cursor-pointer px-4 py-2.5 rounded-xl bg-[#7457E8] hover:bg-[#5E42D4] text-white text-xs font-bold min-h-[42px] inline-flex items-center transition">
            Select PDF
            <input type="file" id="redactPdfInput" accept="application/pdf" class="hidden" />
          </label>
        </div>

        <div id="redactWorkspace" class="${redactPdfDoc ? "" : "hidden"} space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div class="flex items-center gap-1.5">
              <button type="button" id="redactPrevPage" class="px-3 py-1.5 rounded-lg bg-[#F6F7FB] dark:bg-[#0C1020] font-bold">‹ Prev</button>
              <span id="redactPageLabel" class="font-extrabold tabular-nums">Page ${redactPageNum}</span>
              <button type="button" id="redactNextPage" class="px-3 py-1.5 rounded-lg bg-[#F6F7FB] dark:bg-[#0C1020] font-bold">Next ›</button>
            </div>
            <div class="flex items-center gap-2">
              <button type="button" id="redactUndoBtn" class="px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-bold">Undo Box</button>
              <button type="button" id="redactExportBtn" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">Export Permanently Redacted PDF</button>
            </div>
          </div>
          <div class="overflow-auto rounded-2xl border border-[#E6E9F2] dark:border-[#232C4A] bg-[#F6F7FB] dark:bg-[#0C1020] p-3 flex justify-center">
            <canvas id="redactCanvas" class="max-w-full shadow-lg cursor-crosshair touch-none rounded"></canvas>
          </div>
        </div>
      </div>
    `;
  }
  function renderImgProPanel() {
    return `
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <!-- Photo Collage Maker -->
        <div class="bg-white dark:bg-[#151B2F] rounded-3xl border border-[#E6E9F2] dark:border-[#232C4A] p-5 shadow-sm space-y-3">
          <h3 class="text-base font-extrabold text-[#14182B] dark:text-[#F5F6FC]">Offline Photo Collage Maker</h3>
          <p class="text-xs text-[#647087] dark:text-[#A5ADC2]">Pick 2 to 4 photos to build a crisp HD grid collage locally.</p>
          <input type="file" id="collageFilesInput" accept="image/*" multiple class="block w-full text-xs text-[#647087] dark:text-[#A5ADC2]" />
          <div class="flex items-center gap-2">
            <select id="collageLayoutSelect" class="px-3 py-2 rounded-xl border border-[#E6E9F2] dark:border-[#232C4A] bg-[#F6F7FB] dark:bg-[#0C1020] text-xs font-bold min-h-[40px]">
              <option value="2h">2 Photos Side-by-Side</option>
              <option value="2v">2 Photos Vertical</option>
              <option value="4g">4 Photos 2×2 Grid</option>
            </select>
            <button type="button" id="collageBuildBtn" class="px-4 py-2 rounded-xl bg-[#7457E8] hover:bg-[#5E42D4] text-white text-xs font-bold min-h-[40px]">Build &amp; Download Collage</button>
          </div>
          <canvas id="collagePreviewCanvas" class="hidden w-full rounded-xl border border-[#E6E9F2] dark:border-[#232C4A]"></canvas>
        </div>

        <!-- Image Watermark, BG Color & Metadata -->
        <div class="bg-white dark:bg-[#151B2F] rounded-3xl border border-[#E6E9F2] dark:border-[#232C4A] p-5 shadow-sm space-y-3">
          <h3 class="text-base font-extrabold text-[#14182B] dark:text-[#F5F6FC]">Image Watermark, BG Fill &amp; Metadata</h3>
          <input type="file" id="imgWmFileInput" accept="image/*" class="block w-full text-xs text-[#647087] dark:text-[#A5ADC2]" />
          <div id="imgMetaInfo" class="text-[11px] font-semibold text-[#7457E8] dark:text-[#C4B5FD]"></div>
          <div class="grid grid-cols-2 gap-2">
            <input type="text" id="imgWmTextInput" value="ONEORA" placeholder="Watermark text" class="px-3 py-2 rounded-xl border border-[#E6E9F2] dark:border-[#232C4A] bg-[#F6F7FB] dark:bg-[#0C1020] text-xs font-bold min-h-[40px]" />
            <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#E6E9F2] dark:border-[#232C4A] bg-[#F6F7FB] dark:bg-[#0C1020]">
              <span class="text-[11px] font-bold">BG Color</span>
              <input type="color" id="imgBgColorInput" value="#ffffff" class="w-7 h-7 rounded border-0 cursor-pointer" />
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <button type="button" id="imgApplyWmBtn" class="px-4 py-2 rounded-xl bg-[#7457E8] hover:bg-[#5E42D4] text-white text-xs font-bold min-h-[40px]">Apply Watermark &amp; Save</button>
            <button type="button" id="imgApplyBgBtn" class="px-4 py-2 rounded-xl bg-[#10152A] dark:bg-[#1D2540] text-white text-xs font-bold min-h-[40px]">Fill Transparent BG &amp; Save</button>
          </div>
        </div>
      </div>
    `;
  }
  function renderSmartProPanel() {
    const links = loadLinks();
    return `
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <!-- Password Generator + Device Shortcuts -->
        <div class="bg-white dark:bg-[#151B2F] rounded-3xl border border-[#E6E9F2] dark:border-[#232C4A] p-5 shadow-sm space-y-4">
          <h3 class="text-base font-extrabold text-[#14182B] dark:text-[#F5F6FC]">Strong Password Generator</h3>
          <div class="flex items-center gap-2">
            <input type="text" id="pwGenOutput" readonly placeholder="Click Generate..." class="flex-1 px-3.5 py-2.5 rounded-xl border border-[#E6E9F2] dark:border-[#232C4A] bg-[#F6F7FB] dark:bg-[#0C1020] font-mono text-sm font-bold text-[#14182B] dark:text-[#F5F6FC] min-h-[44px]" />
            <button type="button" id="pwGenBtn" class="px-4 py-2.5 rounded-xl bg-[#7457E8] hover:bg-[#5E42D4] text-white text-xs font-bold min-h-[44px]">Generate</button>
            <button type="button" id="pwCopyBtn" class="px-3 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold min-h-[44px]">Copy</button>
          </div>
          <div class="flex items-center gap-3 text-xs font-bold text-[#647087] dark:text-[#A5ADC2]">
            <label>Length: <input type="number" id="pwLenInput" value="16" min="8" max="48" class="w-16 px-2 py-1 rounded-lg border border-[#E6E9F2] dark:border-[#232C4A] bg-[#F6F7FB] dark:bg-[#0C1020] ml-1" /></label>
            <label class="flex items-center gap-1"><input type="checkbox" id="pwSymbolsCheck" checked class="accent-[#7457E8]" /> Symbols</label>
          </div>

          <!-- World Clock -->
          <div class="pt-3 border-t border-[#E6E9F2] dark:border-[#232C4A] space-y-2">
            <h4 class="text-sm font-extrabold text-[#14182B] dark:text-[#F5F6FC]">World Clock</h4>
            <div id="worldClockGrid" class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs"></div>
          </div>

          <!-- Android Hardware Shortcuts -->
          <div class="pt-3 border-t border-[#E6E9F2] dark:border-[#232C4A] flex flex-wrap gap-2">
            <button type="button" id="androidFlashBtn" class="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold min-h-[40px]">Flashlight Toggle</button>
            <button type="button" id="androidAlarmBtn" class="px-3.5 py-2 rounded-xl bg-[#F3F0FF] dark:bg-[#7457E8]/20 text-[#7457E8] dark:text-[#C4B5FD] border border-[#7457E8]/25 text-xs font-bold min-h-[40px]">Open System Alarm</button>
          </div>
        </div>

        <!-- Text Formatter / Word Counter + Link Saver -->
        <div class="bg-white dark:bg-[#151B2F] rounded-3xl border border-[#E6E9F2] dark:border-[#232C4A] p-5 shadow-sm space-y-4">
          <h3 class="text-base font-extrabold text-[#14182B] dark:text-[#F5F6FC]">Text Formatter, Case &amp; Word Counter</h3>
          <textarea id="txtFmtInput" rows="4" placeholder="Paste or type text here to count words, clean spaces, or change case..." class="w-full px-3.5 py-2.5 rounded-xl border border-[#E6E9F2] dark:border-[#232C4A] bg-[#F6F7FB] dark:bg-[#0C1020] text-xs text-[#14182B] dark:text-[#F5F6FC]"></textarea>
          <div id="txtFmtStats" class="text-[11px] font-bold text-[#7457E8] dark:text-[#C4B5FD] tabular-nums">0 words · 0 characters · 0 lines</div>
          <div class="flex flex-wrap gap-1.5">
            <button type="button" data-txt-op="upper" class="px-3 py-1.5 rounded-lg bg-[#F6F7FB] dark:bg-[#0C1020] text-xs font-bold">UPPER</button>
            <button type="button" data-txt-op="lower" class="px-3 py-1.5 rounded-lg bg-[#F6F7FB] dark:bg-[#0C1020] text-xs font-bold">lower</button>
            <button type="button" data-txt-op="title" class="px-3 py-1.5 rounded-lg bg-[#F6F7FB] dark:bg-[#0C1020] text-xs font-bold">Title Case</button>
            <button type="button" data-txt-op="clean" class="px-3 py-1.5 rounded-lg bg-[#F6F7FB] dark:bg-[#0C1020] text-xs font-bold">Clean Spaces</button>
            <button type="button" data-txt-op="copy" class="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold">Copy</button>
          </div>

          <!-- Link Saver -->
          <div class="pt-3 border-t border-[#E6E9F2] dark:border-[#232C4A] space-y-2">
            <h4 class="text-sm font-extrabold text-[#14182B] dark:text-[#F5F6FC]">Saved Links &amp; Bookmarks</h4>
            <form id="linkSaverForm" class="flex gap-2">
              <input type="text" id="linkTitleInp" required placeholder="Label" class="w-1/3 px-3 py-2 rounded-xl border border-[#E6E9F2] dark:border-[#232C4A] bg-[#F6F7FB] dark:bg-[#0C1020] text-xs" />
              <input type="url" id="linkUrlInp" required placeholder="https://..." class="flex-1 px-3 py-2 rounded-xl border border-[#E6E9F2] dark:border-[#232C4A] bg-[#F6F7FB] dark:bg-[#0C1020] text-xs" />
              <button type="submit" class="px-3 py-2 rounded-xl bg-[#7457E8] hover:bg-[#5E42D4] text-white text-xs font-bold">Save</button>
            </form>
            <div class="space-y-1.5 max-h-36 overflow-y-auto">
              ${links.map((l, idx) => `
                <div class="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#F6F7FB] dark:bg-[#0C1020] text-xs">
                  <a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer" class="font-bold text-[#7457E8] dark:text-[#C4B5FD] hover:underline truncate">${esc(l.title)}</a>
                  <button type="button" data-link-del="${idx}" class="text-rose-500 font-bold">✕</button>
                </div>
              `).join("")}
            </div>
          </div>
        </div>
      </div>
    `;
  }
  function renderIndiaDirPanel() {
    const expiries = loadExpiries();
    const emergency = [
      ["112", "National Emergency (All-in-One)"],
      ["100", "Police Control Room"],
      ["101", "Fire Brigade"],
      ["102 / 108", "Ambulance & Medical"],
      ["1091", "Women Helpline"],
      ["1098", "Childline India"],
      ["1930", "National Cyber Crime Helpline"],
      ["139", "Indian Railways Enquiry & PNR"]
    ];
    const portals = [
      ["DigiLocker Official", "https://www.digilocker.gov.in"],
      ["IRCTC / PNR Enquiry", "https://www.indianrail.gov.in/enquiry/PNR/PnrEnquiry.html"],
      ["India Post Pincode Finder", "https://www.indiapost.gov.in/VAS/Pages/findpincode.aspx"],
      ["EPFO Member Passbook", "https://unifiedportal-mem.epfindia.gov.in/memberinterface/"],
      ["Income Tax e-Filing", "https://www.incometax.gov.in"],
      ["IMD Official Weather", "https://mausam.imd.gov.in"]
    ];
    return `
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <!-- Document Expiry Tracker -->
        <div class="bg-white dark:bg-[#151B2F] rounded-3xl border border-[#E6E9F2] dark:border-[#232C4A] p-5 shadow-sm space-y-4">
          <h3 class="text-base font-extrabold text-[#14182B] dark:text-[#F5F6FC]">Document Vault Expiry Tracker</h3>
          <p class="text-xs text-[#647087] dark:text-[#A5ADC2]">Track Passport, Driving License, Vehicle Insurance, PUC, or Policy renewal dates.</p>
          <form id="docExpiryForm" class="grid grid-cols-12 gap-2">
            <input type="text" id="expDocName" required placeholder="Document (e.g. Car Insurance)" class="col-span-6 px-3 py-2 rounded-xl border border-[#E6E9F2] dark:border-[#232C4A] bg-[#F6F7FB] dark:bg-[#0C1020] text-xs font-semibold min-h-[40px]" />
            <input type="date" id="expDocDate" required class="col-span-4 px-2 py-2 rounded-xl border border-[#E6E9F2] dark:border-[#232C4A] bg-[#F6F7FB] dark:bg-[#0C1020] text-xs font-bold min-h-[40px]" />
            <button type="submit" class="col-span-2 rounded-xl bg-[#7457E8] hover:bg-[#5E42D4] text-white text-xs font-bold min-h-[40px]">Add</button>
          </form>
          <div class="space-y-2">
            ${expiries.length ? expiries.map((ex, idx) => {
      const daysLeft = Math.ceil(((/* @__PURE__ */ new Date(`${ex.date}T00:00:00`)).getTime() - Date.now()) / 864e5);
      const badgeCls = daysLeft < 0 ? "text-rose-600" : daysLeft <= 30 ? "text-amber-600" : "text-emerald-600";
      return `
                <div class="flex items-center justify-between p-3 rounded-2xl bg-[#F6F7FB] dark:bg-[#0C1020] border border-[#E6E9F2] dark:border-[#232C4A] text-xs">
                  <div>
                    <p class="font-bold text-[#14182B] dark:text-[#F5F6FC]">${esc(ex.name)}</p>
                    <p class="text-[11px] font-bold ${badgeCls} tabular-nums">Expires ${esc(ex.date)} (${daysLeft < 0 ? "Expired" : `${daysLeft} days left`})</p>
                  </div>
                  <button type="button" data-exp-del="${idx}" class="text-rose-500 font-bold px-2">✕</button>
                </div>
              `;
    }).join("") : '<p class="text-xs text-[#647087] dark:text-[#A5ADC2] text-center py-4">No document expiry alerts added yet.</p>'}
          </div>
        </div>

        <!-- India Emergency Numbers & Official Portals -->
        <div class="bg-white dark:bg-[#151B2F] rounded-3xl border border-[#E6E9F2] dark:border-[#232C4A] p-5 shadow-sm space-y-4">
          <h3 class="text-base font-extrabold text-[#14182B] dark:text-[#F5F6FC]">India Emergency Numbers (Offline)</h3>
          <div class="grid grid-cols-2 gap-2">
            ${emergency.map(([num, label]) => `
              <a href="tel:${esc(num.split("/")[0].trim())}" class="p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900 flex flex-col">
                <span class="text-sm font-black text-rose-700 dark:text-rose-300 tabular-nums">${esc(num)}</span>
                <span class="text-[11px] font-semibold text-[#647087] dark:text-[#A5ADC2]">${esc(label)}</span>
              </a>
            `).join("")}
          </div>

          <div class="pt-3 border-t border-[#E6E9F2] dark:border-[#232C4A] space-y-2">
            <h4 class="text-sm font-extrabold text-[#14182B] dark:text-[#F5F6FC]">Verified Official Portals</h4>
            <div class="grid grid-cols-2 gap-2">
              ${portals.map(([name, url]) => `
                <a href="${esc(url)}" target="_blank" rel="noopener noreferrer" class="px-3 py-2.5 rounded-xl bg-[#F3F0FF]/70 dark:bg-[#0C1020] border border-[#E6E9F2] dark:border-[#232C4A] text-xs font-bold text-[#7457E8] dark:text-[#C4B5FD] hover:border-[#7457E8] truncate transition">${esc(name)} ↗</a>
              `).join("")}
            </div>
          </div>
        </div>
      </div>
    `;
  }
  async function renderRedactPage() {
    if (!redactPdfDoc) return;
    const canvas = document.getElementById("redactCanvas");
    const lbl = document.getElementById("redactPageLabel");
    if (!canvas) return;
    const page = await redactPdfDoc.getPage(redactPageNum);
    const vp = page.getViewport({ scale: 1.35 });
    canvas.width = vp.width;
    canvas.height = vp.height;
    const ctx = canvas.getContext("2d");
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    ctx.fillStyle = "#000000";
    redactBoxes.filter((b) => b.page === redactPageNum).forEach((b) => {
      ctx.fillRect(b.x * canvas.width, b.y * canvas.height, b.w * canvas.width, b.h * canvas.height);
    });
    if (lbl) lbl.textContent = `Page ${redactPageNum} / ${redactPdfDoc.numPages}`;
  }
  function bindExtrasEvents(root) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n;
    root.querySelectorAll("[data-extra-tab]").forEach((b) => {
      b.addEventListener("click", () => {
        extraSubTab = b.getAttribute("data-extra-tab") || "redact";
        renderExtras();
      });
    });
    const redactInp = root.querySelector("#redactPdfInput");
    if (redactInp) {
      redactInp.addEventListener("change", async (e) => {
        var _a2, _b2;
        const file = (_a2 = e.target.files) == null ? void 0 : _a2[0];
        if (!file || !global.pdfjsLib) return;
        redactPdfBytes = await file.arrayBuffer();
        redactPdfDoc = await global.pdfjsLib.getDocument({ data: redactPdfBytes.slice(0) }).promise;
        redactPageNum = 1;
        redactBoxes = [];
        (_b2 = root.querySelector("#redactWorkspace")) == null ? void 0 : _b2.classList.remove("hidden");
        await renderRedactPage();
      });
    }
    const canvas = root.querySelector("#redactCanvas");
    if (canvas) {
      let dragging = false;
      let startX = 0;
      let startY = 0;
      const getPos = (ev) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
        const clientY = ev.touches ? ev.touches[0].clientY : ev.clientY;
        return {
          x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
          y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
        };
      };
      const onDown = (ev) => {
        ev.preventDefault();
        dragging = true;
        const p = getPos(ev);
        startX = p.x;
        startY = p.y;
      };
      const onUp = (ev) => {
        if (!dragging) return;
        dragging = false;
        const p = getPos(ev.changedTouches ? { touches: ev.changedTouches } : ev);
        const x = Math.min(startX, p.x);
        const y = Math.min(startY, p.y);
        const w = Math.abs(p.x - startX);
        const h = Math.abs(p.y - startY);
        if (w > 0.01 && h > 0.01) {
          redactBoxes.push({ page: redactPageNum, x, y, w, h });
          renderRedactPage();
        }
      };
      canvas.addEventListener("mousedown", onDown);
      canvas.addEventListener("mouseup", onUp);
      canvas.addEventListener("touchstart", onDown, { passive: false });
      canvas.addEventListener("touchend", onUp);
      if (redactPdfDoc) renderRedactPage();
    }
    (_a = root.querySelector("#redactPrevPage")) == null ? void 0 : _a.addEventListener("click", () => {
      if (redactPdfDoc && redactPageNum > 1) {
        redactPageNum -= 1;
        renderRedactPage();
      }
    });
    (_b = root.querySelector("#redactNextPage")) == null ? void 0 : _b.addEventListener("click", () => {
      if (redactPdfDoc && redactPageNum < redactPdfDoc.numPages) {
        redactPageNum += 1;
        renderRedactPage();
      }
    });
    (_c = root.querySelector("#redactUndoBtn")) == null ? void 0 : _c.addEventListener("click", () => {
      redactBoxes.pop();
      renderRedactPage();
    });
    (_d = root.querySelector("#redactExportBtn")) == null ? void 0 : _d.addEventListener("click", async () => {
      if (!redactPdfDoc || !global.PDFLib) return;
      global.utils.showLoader("Flattening & permanently redacting PDF...");
      try {
        const outPdf = await global.PDFLib.PDFDocument.create();
        const off = document.createElement("canvas");
        const ctx = off.getContext("2d");
        for (let p = 1; p <= redactPdfDoc.numPages; p++) {
          const page = await redactPdfDoc.getPage(p);
          const vp = page.getViewport({ scale: 1.8 });
          off.width = vp.width;
          off.height = vp.height;
          await page.render({ canvasContext: ctx, viewport: vp }).promise;
          ctx.fillStyle = "#000000";
          redactBoxes.filter((b) => b.page === p).forEach((b) => {
            ctx.fillRect(b.x * off.width, b.y * off.height, b.w * off.width, b.h * off.height);
          });
          const jpgUrl = off.toDataURL("image/jpeg", 0.9);
          const img = await outPdf.embedJpg(jpgUrl);
          const newPage = outPdf.addPage([vp.width * 0.5, vp.height * 0.5]);
          newPage.drawImage(img, { x: 0, y: 0, width: vp.width * 0.5, height: vp.height * 0.5 });
        }
        const bytes = await outPdf.save();
        global.utils.downloadBlob(new Blob([bytes], { type: "application/pdf" }), `ONEORA_Redacted_Flattened_${Date.now()}.pdf`);
        toast("Permanent Redaction Complete", "All redacted areas were permanently raster-flattened.", "success");
      } catch (err) {
        toast("Redaction Failed", err instanceof Error ? err.message : "Error flattening PDF.", "error");
      } finally {
        global.utils.hideLoader();
      }
    });
    (_e = root.querySelector("#collageBuildBtn")) == null ? void 0 : _e.addEventListener("click", async () => {
      var _a2;
      const files = Array.from(((_a2 = root.querySelector("#collageFilesInput")) == null ? void 0 : _a2.files) || []).slice(0, 4);
      if (files.length < 2) {
        toast("Select Photos", "Pick at least 2 photos to create a collage.", "info");
        return;
      }
      const layout = root.querySelector("#collageLayoutSelect").value;
      const imgs = await Promise.all(files.map((f) => new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => {
          const im = new Image();
          im.onload = () => res(im);
          im.onerror = rej;
          im.src = String(r.result);
        };
        r.readAsDataURL(f);
      })));
      const c = root.querySelector("#collagePreviewCanvas");
      const gap = 20;
      const cols = layout === "2v" ? 1 : 2;
      const rows = layout === "2h" ? 1 : 2;
      const cellW = 700;
      const cellH = 700;
      c.width = cols * cellW + (cols + 1) * gap;
      c.height = rows * cellH + (rows + 1) * gap;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, c.width, c.height);
      imgs.slice(0, cols * rows).forEach((im, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const dx = gap + col * (cellW + gap);
        const dy = gap + row * (cellH + gap);
        const scale = Math.max(cellW / im.width, cellH / im.height);
        const sw = cellW / scale;
        const sh = cellH / scale;
        ctx.drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2, sw, sh, dx, dy, cellW, cellH);
      });
      c.classList.remove("hidden");
      c.toBlob((blob) => {
        if (blob) global.utils.downloadBlob(blob, `ONEORA_Collage_${Date.now()}.jpg`);
        toast("Collage Saved", "HD photo collage downloaded.", "success");
      }, "image/jpeg", 0.92);
    });
    let loadedWmImg = null;
    (_f = root.querySelector("#imgWmFileInput")) == null ? void 0 : _f.addEventListener("change", (e) => {
      var _a2;
      const f = (_a2 = e.target.files) == null ? void 0 : _a2[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        const im = new Image();
        im.onload = () => {
          loadedWmImg = im;
          const metaEl = root.querySelector("#imgMetaInfo");
          if (metaEl) metaEl.textContent = `${f.name} · ${im.width}×${im.height}px · ${(f.size / 1024).toFixed(1)} KB · ${f.type}`;
        };
        im.src = String(r.result);
      };
      r.readAsDataURL(f);
    });
    (_g = root.querySelector("#imgApplyWmBtn")) == null ? void 0 : _g.addEventListener("click", () => {
      if (!loadedWmImg) {
        toast("Pick Image", "Choose an image first.", "info");
        return;
      }
      const txt = root.querySelector("#imgWmTextInput").value || "ONEORA";
      const c = document.createElement("canvas");
      c.width = loadedWmImg.width;
      c.height = loadedWmImg.height;
      const ctx = c.getContext("2d");
      ctx.drawImage(loadedWmImg, 0, 0);
      ctx.save();
      ctx.translate(c.width / 2, c.height / 2);
      ctx.rotate(-Math.PI / 6);
      ctx.font = `bold ${Math.max(24, Math.round(c.width / 14))}px Plus Jakarta Sans, sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.textAlign = "center";
      ctx.fillText(txt, 0, 0);
      ctx.restore();
      c.toBlob((blob) => {
        if (blob) global.utils.downloadBlob(blob, `ONEORA_Watermarked_${Date.now()}.jpg`);
      }, "image/jpeg", 0.92);
    });
    (_h = root.querySelector("#imgApplyBgBtn")) == null ? void 0 : _h.addEventListener("click", () => {
      if (!loadedWmImg) {
        toast("Pick Image", "Choose an image first.", "info");
        return;
      }
      const bg = root.querySelector("#imgBgColorInput").value || "#ffffff";
      const c = document.createElement("canvas");
      c.width = loadedWmImg.width;
      c.height = loadedWmImg.height;
      const ctx = c.getContext("2d");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(loadedWmImg, 0, 0);
      c.toBlob((blob) => {
        if (blob) global.utils.downloadBlob(blob, `ONEORA_BG_${Date.now()}.jpg`);
      }, "image/jpeg", 0.92);
    });
    const genPw = () => {
      var _a2, _b2;
      const len = Math.max(8, Math.min(48, Number(((_a2 = root.querySelector("#pwLenInput")) == null ? void 0 : _a2.value) || 16)));
      const useSym = ((_b2 = root.querySelector("#pwSymbolsCheck")) == null ? void 0 : _b2.checked) !== false;
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789" + (useSym ? "!@#$%^&*()-_=+" : "");
      const arr = new Uint32Array(len);
      crypto.getRandomValues(arr);
      let out = "";
      for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
      const el = root.querySelector("#pwGenOutput");
      if (el) el.value = out;
    };
    (_i = root.querySelector("#pwGenBtn")) == null ? void 0 : _i.addEventListener("click", genPw);
    (_j = root.querySelector("#pwCopyBtn")) == null ? void 0 : _j.addEventListener("click", () => {
      var _a2;
      const val = (_a2 = root.querySelector("#pwGenOutput")) == null ? void 0 : _a2.value;
      if (val && navigator.clipboard) navigator.clipboard.writeText(val).then(() => toast("Password Copied", "Copied safely to clipboard.", "success"));
    });
    if (root.querySelector("#pwGenOutput")) genPw();
    if (worldClockInterval) clearInterval(worldClockInterval);
    const wcGrid = root.querySelector("#worldClockGrid");
    if (wcGrid) {
      const zones = [
        ["Kolkata (IST)", "Asia/Kolkata"],
        ["London", "Europe/London"],
        ["New York", "America/New_York"],
        ["Dubai", "Asia/Dubai"],
        ["Singapore", "Asia/Singapore"],
        ["Tokyo", "Asia/Tokyo"]
      ];
      const tick = () => {
        const now = /* @__PURE__ */ new Date();
        wcGrid.innerHTML = zones.map(([label, tz]) => {
          const t = now.toLocaleTimeString("en-IN", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: true });
          return `<div class="p-2.5 rounded-xl bg-slate-50 dark:bg-[#151B2B] border border-slate-200 dark:border-slate-800"><div class="text-[10px] font-bold text-slate-400">${label}</div><div class="text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">${t}</div></div>`;
        }).join("");
      };
      tick();
      worldClockInterval = setInterval(tick, 1e4);
    }
    (_k = root.querySelector("#androidFlashBtn")) == null ? void 0 : _k.addEventListener("click", () => {
      if (global.AndroidBridge && typeof global.AndroidBridge.toggleFlashlight === "function") {
        global.AndroidBridge.toggleFlashlight();
      } else {
        toast("Android Device Feature", "Flashlight toggle works natively inside the ONEORA Android APK.", "info");
      }
    });
    (_l = root.querySelector("#androidAlarmBtn")) == null ? void 0 : _l.addEventListener("click", () => {
      if (global.AndroidBridge && typeof global.AndroidBridge.openSystemAlarm === "function") {
        global.AndroidBridge.openSystemAlarm();
      } else {
        toast("Android Device Feature", "System Alarm shortcut opens Android Clock inside the ONEORA APK.", "info");
      }
    });
    const txtInp = root.querySelector("#txtFmtInput");
    const txtStats = root.querySelector("#txtFmtStats");
    const updateStats = () => {
      if (!txtInp || !txtStats) return;
      const v = txtInp.value;
      const words = v.trim() ? v.trim().split(/\s+/).length : 0;
      const lines = v ? v.split(/\n/).length : 0;
      txtStats.textContent = `${words} words · ${v.length} characters · ${lines} lines`;
    };
    txtInp == null ? void 0 : txtInp.addEventListener("input", updateStats);
    root.querySelectorAll("[data-txt-op]").forEach((b) => {
      b.addEventListener("click", () => {
        if (!txtInp) return;
        const op = b.getAttribute("data-txt-op");
        if (op === "upper") txtInp.value = txtInp.value.toUpperCase();
        else if (op === "lower") txtInp.value = txtInp.value.toLowerCase();
        else if (op === "title") txtInp.value = txtInp.value.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
        else if (op === "clean") txtInp.value = txtInp.value.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
        else if (op === "copy" && navigator.clipboard) navigator.clipboard.writeText(txtInp.value).then(() => toast("Copied", "Formatted text copied.", "success"));
        updateStats();
      });
    });
    (_m = root.querySelector("#linkSaverForm")) == null ? void 0 : _m.addEventListener("submit", (e) => {
      e.preventDefault();
      const title = root.querySelector("#linkTitleInp").value.trim();
      const url = root.querySelector("#linkUrlInp").value.trim();
      if (!title || !/^https?:\/\//i.test(url)) {
        toast("Invalid URL", "Use a valid https:// URL.", "error");
        return;
      }
      const links = loadLinks();
      links.unshift({ title, url });
      saveLinks(links.slice(0, 50));
      renderExtras();
    });
    root.querySelectorAll("[data-link-del]").forEach((b) => {
      b.addEventListener("click", () => {
        const idx = Number(b.getAttribute("data-link-del"));
        const links = loadLinks();
        links.splice(idx, 1);
        saveLinks(links);
        renderExtras();
      });
    });
    (_n = root.querySelector("#docExpiryForm")) == null ? void 0 : _n.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = root.querySelector("#expDocName").value.trim();
      const date = root.querySelector("#expDocDate").value;
      if (!name || !date) return;
      const list = loadExpiries();
      list.unshift({ name, date });
      saveExpiries(list);
      toast("Expiry Tracked", `Renewal alert added for ${name}.`, "success");
      renderExtras();
    });
    root.querySelectorAll("[data-exp-del]").forEach((b) => {
      b.addEventListener("click", () => {
        const idx = Number(b.getAttribute("data-exp-del"));
        const list = loadExpiries();
        list.splice(idx, 1);
        saveExpiries(list);
        renderExtras();
      });
    });
  }
  const OneoraExtras = {
    init() {
      renderAi();
      renderExtras();
    },
    renderAi,
    renderExtras,
    openAi() {
      if (typeof global.openPdfBondhuTool === "function") global.openPdfBondhuTool("oneoraAiTab");
      renderAi();
    },
    openExtraSubTab(tab) {
      extraSubTab = tab || "redact";
      if (typeof global.openPdfBondhuTool === "function") global.openPdfBondhuTool("oneoraExtrasTab");
      renderExtras();
    },
    getUpcomingExpiries() {
      return loadExpiries().filter((e) => {
        const days = Math.ceil(((/* @__PURE__ */ new Date(`${e.date}T00:00:00`)).getTime() - Date.now()) / 864e5);
        return days <= 45;
      });
    }
  };
  global.OneoraExtras = OneoraExtras;
  document.addEventListener("DOMContentLoaded", () => OneoraExtras.init());
})(window);
