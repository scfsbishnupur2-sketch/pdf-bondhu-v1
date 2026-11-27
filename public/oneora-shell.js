(function(global) {
  const QA_STORAGE_KEY = "oneoraQuickActions_v1";
  const WIDGETS_STORAGE_KEY = "oneoraHomeWidgets_v1";
  const HOME_WIDGET_DEFS = [
    { id: "homeLiveWidgetsBlock", label: "Live Planner, Reminders & Money Cards" },
    { id: "homeSmartHubContainer", label: "ONEORA Smart Hub Insights" },
    { id: "homePdfShowcaseBlock", label: "PDF Studio Showcase" },
    { id: "homeImageShowcaseBlock", label: "Image & Office Showcase" },
    { id: "homeEverydayShowcaseBlock", label: "Everyday Studios & Vault" },
    { id: "homeFavRecentBlock", label: "Favourites & Recently Used" }
  ];
  const ALL_QUICK_ACTIONS = [
    { id: "pdfScanner", label: "Scan Doc", tint: "bg-[#EEF2FF] text-[#252B55] dark:bg-[#1D2540] dark:text-[#9FAFFF]", icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect x="7" y="7" width="10" height="10" rx="1.5"/></svg>' },
    { id: "pdfReaderTool", label: "Read PDF", tint: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300", icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>' },
    { id: "pdfCompress", label: "Compress", tint: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300", icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 11v6"/><path d="m9 14 3 3 3-3"/></svg>' },
    { id: "pdfMerge", label: "Merge PDF", tint: "bg-[#F3F0FF] text-[#7457E8] dark:bg-[#7457E8]/20 dark:text-[#C4B5FD]", icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="12" height="14" rx="2"/><path d="M4 8v12a2 2 0 0 0 2 2h10"/></svg>' },
    { id: "passportMaker", label: "Passport", tint: "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300", icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M7 21v-2a5 5 0 0 1 10 0v2"/></svg>' },
    { id: "pdfSign", label: "Signature", tint: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300", icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>' },
    { id: "oneoraMoneyTab", label: "Add Expense", tint: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300", icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>' },
    { id: "oneoraPlannerTab:notes", label: "Create Note", tint: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300", icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>' },
    { id: "oneoraPlannerTab:reminders", label: "Reminder", tint: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300", icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>' },
    { id: "dailyUtilitiesHub:dailyPanelSmart", label: "QR Scanner", tint: "bg-[#F3F0FF] text-[#7457E8] dark:bg-[#7457E8]/20 dark:text-[#C4B5FD]", icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/></svg>' },
    { id: "oneoraCompanionTab:doctemplates", label: "Templates", tint: "bg-[#EEF2FF] text-[#252B55] dark:bg-[#1D2540] dark:text-[#9FAFFF]", icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>' },
    { id: "documentCenter:passwords", label: "Pass Vault", tint: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300", icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' }
  ];
  const DEFAULT_QA_IDS = ["pdfScanner", "pdfReaderTool", "pdfCompress", "pdfMerge", "passportMaker", "oneoraMoneyTab", "oneoraPlannerTab:reminders", "dailyUtilitiesHub:dailyPanelSmart"];
  function esc(s) {
    return String(s != null ? s : "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function toast(title, msg, type = "info") {
    if (global.utils && typeof global.utils.showToast === "function") {
      global.utils.showToast(title, msg, type);
    }
  }
  function getSavedQuickActions() {
    try {
      const arr = JSON.parse(localStorage.getItem(QA_STORAGE_KEY) || "");
      if (Array.isArray(arr) && arr.length >= 2) return arr;
    } catch (e) {
    }
    return DEFAULT_QA_IDS;
  }
  function getSavedWidgets() {
    try {
      const obj = JSON.parse(localStorage.getItem(WIDGETS_STORAGE_KEY) || "");
      if (obj && typeof obj === "object") return obj;
    } catch (e) {
    }
    const def = {};
    HOME_WIDGET_DEFS.forEach((w) => {
      def[w.id] = true;
    });
    return def;
  }
  function applyHomeWidgetsVisibility() {
    const prefs = getSavedWidgets();
    HOME_WIDGET_DEFS.forEach((w) => {
      const el = document.getElementById(w.id);
      if (el) el.classList.toggle("hidden", prefs[w.id] === false);
    });
  }
  function openActionTarget(key) {
    if (key === "oneoraPlannerTab:notes" && global.OneoraPlanner) {
      global.OneoraPlanner.openSubTab("notes");
      return;
    }
    if (key === "oneoraPlannerTab:reminders" && global.OneoraPlanner) {
      global.OneoraPlanner.openSubTab("reminders");
      return;
    }
    if (String(key).startsWith("oneoraCompanionTab:") && global.OneoraCompanion) {
      global.OneoraCompanion.openSubTab(String(key).split(":")[1]);
      return;
    }
    const [toolId, sub] = String(key).split(":");
    if (typeof global.openPdfBondhuTool === "function") {
      global.openPdfBondhuTool(toolId, sub ? { sub } : {});
    }
  }
  function renderQuickActions() {
    const grid = document.getElementById("oneoraQuickActionsGrid");
    if (!grid) return;
    const ids = getSavedQuickActions();
    const list = ids.map((id) => ALL_QUICK_ACTIONS.find((a) => a.id === id)).filter(Boolean).slice(0, 8);
    grid.innerHTML = list.map((qa) => `
      <button type="button" data-oneora-qa="${esc(qa.id)}" class="oneora-qa-tile rounded-2xl p-3 flex flex-col items-center justify-center gap-2 transition">
        <span class="oneora-qa-icon ${qa.tint}">${qa.icon}</span>
        <span class="text-[11px] sm:text-xs font-semibold text-center leading-tight text-[#171B2C] dark:text-[#F5F6FC]">${esc(qa.label)}</span>
      </button>
    `).join("");
    grid.querySelectorAll("[data-oneora-qa]").forEach((btn) => {
      btn.addEventListener("click", () => openActionTarget(btn.getAttribute("data-oneora-qa")));
    });
  }
  function initQuickActionsCustomizer() {
    const openBtn = document.getElementById("customizeQuickActionsBtn");
    const modal = document.getElementById("oneoraQaModal");
    const listEl = document.getElementById("oneoraQaOptionsList");
    const saveBtn = document.getElementById("oneoraQaSaveBtn");
    const closeBtn = document.getElementById("oneoraQaCloseBtn");
    if (!openBtn || !modal || !listEl) return;
    openBtn.addEventListener("click", () => {
      const current = new Set(getSavedQuickActions());
      const widgetPrefs = getSavedWidgets();
      listEl.innerHTML = `
        <p class="text-[11px] font-bold uppercase tracking-wider text-[#777F91] pb-1">Pinned Quick Actions (up to 8)</p>
        ${ALL_QUICK_ACTIONS.map((qa) => `
          <label class="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#F6F7FB] dark:bg-[#1D2540]/70 border border-[#E8EAF2] dark:border-[#232C4A] cursor-pointer">
            <span class="text-xs font-semibold text-[#171B2C] dark:text-[#F5F6FC]">${esc(qa.label)}</span>
            <input type="checkbox" value="${esc(qa.id)}" ${current.has(qa.id) ? "checked" : ""} class="oneora-qa-chk w-4 h-4 rounded accent-[#7457E8]" />
          </label>
        `).join("")}
        <p class="text-[11px] font-bold uppercase tracking-wider text-[#777F91] pt-3 pb-1">Home Dashboard Sections</p>
        ${HOME_WIDGET_DEFS.map((w) => `
          <label class="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#F6F7FB] dark:bg-[#1D2540]/70 border border-[#E8EAF2] dark:border-[#232C4A] cursor-pointer">
            <span class="text-xs font-semibold text-[#171B2C] dark:text-[#F5F6FC]">${esc(w.label)}</span>
            <input type="checkbox" value="${esc(w.id)}" ${widgetPrefs[w.id] !== false ? "checked" : ""} class="oneora-widget-chk w-4 h-4 rounded accent-[#7457E8]" />
          </label>
        `).join("")}
      `;
      modal.classList.remove("hidden");
      modal.classList.add("flex");
    });
    const close = () => {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    };
    closeBtn == null ? void 0 : closeBtn.addEventListener("click", close);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) close();
    });
    saveBtn == null ? void 0 : saveBtn.addEventListener("click", () => {
      const checked = Array.from(listEl.querySelectorAll(".oneora-qa-chk:checked")).map((el) => el.value);
      if (checked.length < 2) {
        toast("Select at least 2", "Keep at least 2 quick actions pinned.", "info");
        return;
      }
      localStorage.setItem(QA_STORAGE_KEY, JSON.stringify(checked.slice(0, 8)));
      const newWidgets = {};
      listEl.querySelectorAll(".oneora-widget-chk").forEach((el) => {
        newWidgets[el.value] = el.checked;
      });
      localStorage.setItem(WIDGETS_STORAGE_KEY, JSON.stringify(newWidgets));
      document.dispatchEvent(new CustomEvent("oneora:companionchange"));
      renderQuickActions();
      applyHomeWidgetsVisibility();
      close();
      toast("Home Customized", "Your shortcuts and dashboard widgets have been updated.", "success");
    });
  }
  function renderHomeLifeCards() {
    var _a, _b, _c;
    const plannerEl = document.getElementById("homeTodayPlannerCard");
    const remEl = document.getElementById("homeUpcomingRemindersCard");
    const expEl = document.getElementById("homeTodayExpensesCard");
    const budgetEl = document.getElementById("homeMonthlyBudgetCard");
    const notifBadge = document.getElementById("headerNotifCount");
    const plannerSummary = ((_a = global.OneoraPlanner) == null ? void 0 : _a.getSummary) ? global.OneoraPlanner.getSummary() : null;
    const moneySummary = ((_b = global.OneoraMoney) == null ? void 0 : _b.getSummary) ? global.OneoraMoney.getSummary() : null;
    const expiries = ((_c = global.OneoraExtras) == null ? void 0 : _c.getUpcomingExpiries) ? global.OneoraExtras.getUpcomingExpiries() : [];
    if (plannerEl && plannerSummary) {
      const topEvents = plannerSummary.todayEvents.slice(0, 2);
      plannerEl.innerHTML = `
        <div class="flex items-center justify-between gap-2 w-full">
          <div class="flex items-center gap-2 min-w-0">
            <span class="w-7 h-7 rounded-lg bg-[#F3F0FF] dark:bg-[#7457E8]/20 text-[#7457E8] dark:text-[#C4B5FD] flex items-center justify-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </span>
            <span class="text-xs font-bold text-[#14182B] dark:text-[#F5F6FC] truncate">Planner</span>
          </div>
          <span class="text-[11px] font-semibold text-[#647087] dark:text-[#A5ADC2] tabular-nums shrink-0">${plannerSummary.todayEvents.length}</span>
        </div>
        <div class="mt-2.5 space-y-1 w-full">
          ${plannerSummary.todayHoliday ? `<p class="text-[11px] font-semibold text-amber-600 dark:text-amber-400 truncate">${esc(plannerSummary.todayHoliday)}</p>` : ""}
          ${topEvents.length ? topEvents.map((e) => `<p class="text-xs font-semibold text-[#14182B] dark:text-[#F5F6FC] truncate">${esc(e.title)}</p>`).join("") : '<p class="text-[11px] text-[#647087] dark:text-[#A5ADC2] truncate">Plan your day</p>'}
        </div>
        <p class="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mt-2.5 tabular-nums truncate">Water · ${plannerSummary.waterCount}/${plannerSummary.waterGoal}</p>
      `;
    }
    if (remEl && plannerSummary) {
      const nextRems = plannerSummary.upcomingReminders.slice(0, 2);
      remEl.innerHTML = `
        <div class="flex items-center justify-between gap-2 w-full">
          <div class="flex items-center gap-2 min-w-0">
            <span class="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            </span>
            <span class="text-xs font-bold text-[#14182B] dark:text-[#F5F6FC] truncate">Reminders</span>
          </div>
          <span class="text-[11px] font-semibold text-[#647087] dark:text-[#A5ADC2] tabular-nums shrink-0">${plannerSummary.upcomingReminders.length}</span>
        </div>
        <div class="mt-2.5 space-y-1 w-full">
          ${nextRems.length ? nextRems.map((r) => `<p class="text-xs font-semibold text-[#14182B] dark:text-[#F5F6FC] truncate">${esc(r.title)} <span class="text-[#647087] font-normal tabular-nums">· ${esc(r.timeStr || r.dateKey)}</span></p>`).join("") : '<p class="text-[11px] text-[#647087] dark:text-[#A5ADC2] truncate">No alerts pending</p>'}
        </div>
        ${expiries.length ? `<p class="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-2.5 truncate">${expiries.length} expiry alert(s)</p>` : '<p class="text-[11px] text-[#647087] dark:text-[#A5ADC2] mt-2.5 truncate">Bills &amp; medicine</p>'}
      `;
    }
    if (expEl && moneySummary) {
      expEl.innerHTML = `
        <div class="flex items-center justify-between gap-2 w-full">
          <div class="flex items-center gap-2 min-w-0">
            <span class="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
            </span>
            <span class="text-xs font-bold text-[#14182B] dark:text-[#F5F6FC] truncate">Today</span>
          </div>
          <span class="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">Money</span>
        </div>
        <p class="text-lg sm:text-xl font-extrabold text-[#14182B] dark:text-[#F5F6FC] tabular-nums mt-2.5 truncate">₹${Number(moneySummary.todayExpense || 0).toLocaleString("en-IN")}</p>
        <p class="text-[11px] font-medium text-[#647087] dark:text-[#A5ADC2] mt-1 tabular-nums truncate">Bal ₹${Number(moneySummary.balance || 0).toLocaleString("en-IN")}</p>
      `;
    }
    if (budgetEl && moneySummary) {
      const limit = Number(moneySummary.budgetLimit || 0);
      const spent = Number(moneySummary.budgetSpent || moneySummary.monthExpense || 0);
      const pct = limit > 0 ? Math.min(100, Math.round(spent / limit * 100)) : 0;
      const barColor = pct >= 90 ? "bg-rose-500" : pct >= 70 ? "bg-amber-500" : "bg-[#7457E8]";
      budgetEl.innerHTML = `
        <div class="flex items-center justify-between gap-2 w-full">
          <div class="flex items-center gap-2 min-w-0">
            <span class="w-7 h-7 rounded-lg bg-[#EEF2FF] dark:bg-[#1D2540] text-[#252B55] dark:text-[#9FAFFF] flex items-center justify-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
            </span>
            <span class="text-xs font-bold text-[#14182B] dark:text-[#F5F6FC] truncate">Budget</span>
          </div>
          <span class="text-[11px] font-semibold text-[#647087] dark:text-[#A5ADC2] tabular-nums shrink-0">${limit > 0 ? pct + "%" : "Set"}</span>
        </div>
        <div class="w-full mt-2.5">
          <p class="text-sm sm:text-base font-extrabold text-[#14182B] dark:text-[#F5F6FC] tabular-nums truncate">${limit > 0 ? "₹" + spent.toLocaleString("en-IN") + " / ₹" + limit.toLocaleString("en-IN") : "₹" + Number(moneySummary.monthExpense || 0).toLocaleString("en-IN")}</p>
          <div class="w-full h-1.5 rounded-full bg-[#E6E9F2] dark:bg-[#232C4A] mt-2 overflow-hidden">
            <div class="h-full rounded-full ${barColor} transition-all" style="width:${limit > 0 ? pct : 0}%"></div>
          </div>
        </div>
        <p class="text-[11px] font-medium text-[#647087] dark:text-[#A5ADC2] mt-1.5 truncate">${limit > 0 ? "Tap to adjust" : "Tap to set limit"}</p>
      `;
    }
    const totalAlerts = (plannerSummary ? plannerSummary.upcomingReminders.length : 0) + expiries.length;
    if (notifBadge) {
      notifBadge.textContent = totalAlerts > 9 ? "9+" : String(totalAlerts);
      notifBadge.classList.toggle("hidden", totalAlerts === 0);
    }
  }
  function initNotificationDrawer() {
    const bellBtn = document.getElementById("headerNotificationBtn");
    const modal = document.getElementById("oneoraNotifModal");
    const listEl = document.getElementById("oneoraNotifList");
    const closeBtn = document.getElementById("oneoraNotifCloseBtn");
    if (!bellBtn || !modal || !listEl) return;
    const close = () => {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    };
    closeBtn == null ? void 0 : closeBtn.addEventListener("click", close);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) close();
    });
    bellBtn.addEventListener("click", () => {
      var _a, _b;
      const plannerSummary = ((_a = global.OneoraPlanner) == null ? void 0 : _a.getSummary) ? global.OneoraPlanner.getSummary() : { upcomingReminders: [] };
      const expiries = ((_b = global.OneoraExtras) == null ? void 0 : _b.getUpcomingExpiries) ? global.OneoraExtras.getUpcomingExpiries() : [];
      const rows = [];
      plannerSummary.upcomingReminders.slice(0, 8).forEach((r) => {
        rows.push(`
          <div class="p-3.5 rounded-2xl bg-[#F6F7FB] dark:bg-[#1D2540]/70 border border-[#E6E9F2] dark:border-[#232C4A]">
            <p class="text-xs font-bold text-[#14182B] dark:text-[#F5F6FC]">${esc(r.title)}</p>
            <p class="text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-0.5 tabular-nums">Reminder · ${esc(r.dateKey)} ${esc(r.timeStr || "")}</p>
          </div>
        `);
      });
      expiries.forEach((ex) => {
        rows.push(`
          <div class="p-3.5 rounded-2xl bg-[#F6F7FB] dark:bg-[#1D2540]/70 border border-[#E6E9F2] dark:border-[#232C4A]">
            <p class="text-xs font-bold text-[#14182B] dark:text-[#F5F6FC]">${esc(ex.name)}</p>
            <p class="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-0.5 tabular-nums">Document Expiry · ${esc(ex.date)}</p>
          </div>
        `);
      });
      listEl.innerHTML = rows.length ? rows.join("") : '<div class="oneora-empty-state my-2"><p class="text-xs font-semibold text-[#647087] dark:text-[#A5ADC2]">No pending reminders or expiring documents right now.</p></div>';
      modal.classList.remove("hidden");
      modal.classList.add("flex");
    });
  }
  function initUniversalSearchExtensions() {
    const input = document.getElementById("smartSearchInput");
    const panel = document.getElementById("smartSearchDropdown");
    const resultsEl = document.getElementById("smartSearchResults");
    if (!input || !panel || !resultsEl) return;
    input.addEventListener("input", () => {
      var _a, _b, _c;
      const q = input.value.trim();
      if (q.length < 2) return;
      const extraMatches = [];
      if ((_a = global.OneoraPlanner) == null ? void 0 : _a.search) {
        global.OneoraPlanner.search(q).forEach((m) => extraMatches.push(m));
      }
      if ((_b = global.OneoraMoney) == null ? void 0 : _b.search) {
        global.OneoraMoney.search(q).forEach((m) => extraMatches.push(m));
      }
      if ((_c = global.OneoraCompanion) == null ? void 0 : _c.search) {
        global.OneoraCompanion.search(q).forEach((m) => extraMatches.push(m));
      }
      if (/setting|theme|dark|light|language|cloud|sync|backup|account|profile/i.test(q)) {
        extraMatches.push({
          title: "Profile, Theme, Language & Cloud Sync",
          subtitle: "SETTINGS · Open Profile & Preferences",
          action: () => global.openPdfBondhuTool && global.openPdfBondhuTool("profileSettingsTab")
        });
      }
      if (/ai|assistant|chat|letter|translate|summarize/i.test(q)) {
        extraMatches.push({
          title: "ONEORA AI Assistant",
          subtitle: "AI · Multilingual Chat, Voice & Document Q&A",
          action: () => global.OneoraExtras && global.OneoraExtras.openAi()
        });
      }
      if (!extraMatches.length) return;
      setTimeout(() => {
        if (panel.classList.contains("hidden")) panel.classList.remove("hidden");
        const container = document.createElement("div");
        container.className = "border-t border-[var(--oneora-border)] bg-[#FFF7EE]/85 dark:bg-[#17131F]/80";
        extraMatches.slice(0, 6).forEach((item) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "w-full text-left px-4 py-3 hover:bg-[#EFEAFF] dark:hover:bg-[#2F244D] flex items-center justify-between gap-2 border-b last:border-b-0 border-[var(--oneora-border)] min-h-[48px] transition";
          const left = document.createElement("div");
          left.className = "min-w-0";
          const t = document.createElement("div");
          t.className = "text-xs font-extrabold text-[#2B2236] dark:text-[#F5EEFF] truncate";
          t.textContent = item.title;
          const s = document.createElement("div");
          s.className = "text-[11px] font-semibold text-[#5B3FD0] dark:text-[#CBBBFF] truncate mt-0.5";
          s.textContent = item.subtitle;
          left.appendChild(t);
          left.appendChild(s);
          btn.appendChild(left);
          btn.addEventListener("click", () => {
            panel.classList.add("hidden");
            item.action();
          });
          container.appendChild(btn);
        });
        const prev = resultsEl.querySelector(".oneora-search-ext");
        if (prev) prev.remove();
        container.classList.add("oneora-search-ext");
        resultsEl.appendChild(container);
      }, 0);
    });
  }
  function initCloudAccountUi() {
    const statusText = document.getElementById("cloudAccountStatus");
    const userEmailEl = document.getElementById("cloudAccountEmail");
    const lastSyncEl = document.getElementById("cloudLastSyncText");
    const signInBtn = document.getElementById("cloudGoogleSignInBtn");
    const syncBtn = document.getElementById("cloudSyncNowBtn");
    const signOutBtn = document.getElementById("cloudSignOutBtn");
    const delCloudBtn = document.getElementById("cloudDeleteDataBtn");
    if (!signInBtn) return;
    function updateUi(user) {
      const lastSync = localStorage.getItem("oneoraLastCloudSync");
      if (lastSyncEl) {
        lastSyncEl.textContent = lastSync ? `Last synced: ${new Date(lastSync).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}` : "Not synced yet — offline local data is safe on this device.";
      }
      if (user) {
        if (statusText) statusText.textContent = `Signed in as ${user.displayName || "ONEORA Member"}`;
        if (userEmailEl) userEmailEl.textContent = user.email || "";
        signInBtn.classList.add("hidden");
        syncBtn == null ? void 0 : syncBtn.classList.remove("hidden");
        signOutBtn == null ? void 0 : signOutBtn.classList.remove("hidden");
        delCloudBtn == null ? void 0 : delCloudBtn.classList.remove("hidden");
      } else {
        if (statusText) statusText.textContent = "Offline Mode (No account required)";
        if (userEmailEl) userEmailEl.textContent = "Sign in with Google to back up & sync Planner, Notes, Reminders & Money across devices.";
        signInBtn.classList.remove("hidden");
        syncBtn == null ? void 0 : syncBtn.classList.add("hidden");
        signOutBtn == null ? void 0 : signOutBtn.classList.add("hidden");
        delCloudBtn == null ? void 0 : delCloudBtn.classList.add("hidden");
      }
    }
    document.addEventListener("oneora:authchange", (e) => {
      var _a;
      return updateUi(((_a = e.detail) == null ? void 0 : _a.user) || null);
    });
    if (global.OneoraCloud) updateUi(global.OneoraCloud.getUser());
    else updateUi(null);
    signInBtn.addEventListener("click", async () => {
      if (!global.OneoraCloud) {
        toast("Cloud Loading", "Firebase module is still initializing. Please try again in a second.", "info");
        return;
      }
      try {
        signInBtn.disabled = true;
        const user = await global.OneoraCloud.signInWithGoogle();
        toast("Signed In", `Welcome to ONEORA Cloud, ${user.displayName || user.email}!`, "success");
        updateUi(user);
      } catch (err) {
        toast("Sign-In Notice", err instanceof Error ? err.message : "Sign-in cancelled or blocked.", "error");
      } finally {
        signInBtn.disabled = false;
      }
    });
    syncBtn == null ? void 0 : syncBtn.addEventListener("click", async () => {
      if (!global.OneoraCloud) return;
      try {
        syncBtn.disabled = true;
        syncBtn.textContent = "Syncing...";
        const res = await global.OneoraCloud.syncNow();
        toast("Cloud Sync Complete", `Synced ${res.pushedPlanner + res.pulledPlanner} planner items & ${res.pushedFinance + res.pulledFinance} finance entries.`, "success");
        updateUi(global.OneoraCloud.getUser());
      } catch (err) {
        toast("Sync Failed", err instanceof Error ? err.message : "Could not sync right now.", "error");
      } finally {
        syncBtn.disabled = false;
        syncBtn.textContent = "Sync Now";
      }
    });
    signOutBtn == null ? void 0 : signOutBtn.addEventListener("click", async () => {
      if (!global.OneoraCloud) return;
      await global.OneoraCloud.signOut();
      toast("Signed Out", "Your local offline data stays safely on this device.", "info");
      updateUi(null);
    });
    delCloudBtn == null ? void 0 : delCloudBtn.addEventListener("click", async () => {
      if (!global.OneoraCloud) return;
      if (!delCloudBtn.dataset.armed) {
        delCloudBtn.dataset.armed = "1";
        delCloudBtn.textContent = "Tap again to confirm delete";
        setTimeout(() => {
          delete delCloudBtn.dataset.armed;
          delCloudBtn.textContent = "Delete Cloud Data";
        }, 4500);
        return;
      }
      delete delCloudBtn.dataset.armed;
      delCloudBtn.textContent = "Deleting...";
      try {
        await global.OneoraCloud.deleteAccountData();
        localStorage.removeItem("oneoraLastCloudSync");
        toast("Cloud Backup Deleted", "All cloud-stored Planner & Finance records were permanently removed.", "success");
        updateUi(global.OneoraCloud.getUser());
      } catch (err) {
        toast("Delete Failed", err instanceof Error ? err.message : "Could not delete cloud data.", "error");
      } finally {
        delCloudBtn.textContent = "Delete Cloud Data";
      }
    });
  }
  document.addEventListener("DOMContentLoaded", () => {
    var _a, _b;
    renderQuickActions();
    applyHomeWidgetsVisibility();
    initQuickActionsCustomizer();
    renderHomeLifeCards();
    initNotificationDrawer();
    initUniversalSearchExtensions();
    initCloudAccountUi();
    document.addEventListener("oneora:plannerchange", renderHomeLifeCards);
    document.addEventListener("oneora:moneychange", renderHomeLifeCards);
    (_a = document.getElementById("oneoraAiFab")) == null ? void 0 : _a.addEventListener("click", () => {
      if (global.OneoraExtras) global.OneoraExtras.openAi();
    });
    (_b = document.getElementById("headerSearchFocusBtn")) == null ? void 0 : _b.addEventListener("click", () => {
      if (typeof global.openPdfBondhuTool === "function") global.openPdfBondhuTool("homeDashboard");
      setTimeout(() => {
        const el = document.getElementById("smartSearchInput");
        if (el) {
          el.focus();
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 80);
    });
  });
})(window);
