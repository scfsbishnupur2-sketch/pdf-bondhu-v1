var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
(function(global) {
  const STORE_KEY = "oneoraPlannerItems_v1";
  const WATER_KEY = "oneoraWaterTracker_v1";
  const INDIAN_HOLIDAYS = {
    "2026-01-26": "Republic Day",
    "2026-03-04": "Holi",
    "2026-03-20": "Eid-ul-Fitr (Tentative)",
    "2026-04-14": "Ambedkar Jayanti / Pohela Boishakh",
    "2026-05-01": "May Day / Buddha Purnima",
    "2026-08-15": "Independence Day",
    "2026-08-28": "Raksha Bandhan",
    "2026-09-04": "Janmashtami",
    "2026-10-02": "Gandhi Jayanti",
    "2026-10-19": "Durga Puja — Ashtami",
    "2026-10-20": "Dussehra / Vijayadashami",
    "2026-11-08": "Diwali / Kali Puja",
    "2026-11-24": "Guru Nanak Jayanti",
    "2026-12-25": "Christmas Day",
    "2027-01-01": "New Year Day",
    "2027-01-26": "Republic Day",
    "2027-03-22": "Holi",
    "2027-04-15": "Pohela Boishakh",
    "2027-08-15": "Independence Day",
    "2027-10-02": "Gandhi Jayanti",
    "2027-12-25": "Christmas Day"
  };
  let activeSubTab = "calendar";
  let calViewMode = "month";
  let selectedDateKey = todayKey();
  let viewYear = (/* @__PURE__ */ new Date()).getFullYear();
  let viewMonth = (/* @__PURE__ */ new Date()).getMonth();
  let reminderTimer = null;
  let firedReminderKeys = /* @__PURE__ */ new Set();
  function todayKey(d = /* @__PURE__ */ new Date()) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function formatHumanDate(dateKey) {
    if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return String(dateKey || "");
    const [y, m, d] = dateKey.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    if (isNaN(dt.getTime())) return String(dateKey);
    return `${SHORT_DAYS[dt.getDay()]}, ${dt.getDate()} ${SHORT_MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
  }
  function esc(s) {
    return String(s != null ? s : "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function loadItems() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
      if (Array.isArray(raw) && raw.length > 0) return raw;
    } catch (e) {
    }
    const seededKey = "oneoraPlannerSeeded_v1";
    if (!localStorage.getItem(seededKey)) {
      const now = Date.now();
      const starters = [
        { id: "hb_water", kind: "habit", title: "Drink 8 Glasses of Water", category: "Health", dateKey: todayKey(), status: "active", streak: 1, completedDates: [], updatedAtMs: now },
        { id: "hb_walk", kind: "habit", title: "30 Min Morning Walk / Exercise", category: "Fitness", dateKey: todayKey(), status: "active", streak: 0, completedDates: [], updatedAtMs: now },
        { id: "hb_read", kind: "habit", title: "Read 15 Pages Daily", category: "Growth", dateKey: todayKey(), status: "active", streak: 0, completedDates: [], updatedAtMs: now }
      ];
      localStorage.setItem(seededKey, "1");
      saveItems(starters);
      return starters;
    }
    return [];
  }
  function saveItems(items) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(items));
    } catch (e) {
    }
    document.dispatchEvent(new CustomEvent("oneora:plannerchange"));
  }
  function loadWater() {
    try {
      const data = JSON.parse(localStorage.getItem(WATER_KEY) || "{}") || {};
      const key = todayKey();
      return { count: Number(data[key] || 0), goal: 8, map: data };
    } catch (e) {
      return { count: 0, goal: 8, map: {} };
    }
  }
  function setWaterCount(next) {
    const w = loadWater();
    const clamped = Math.max(0, Math.min(20, next));
    w.map[todayKey()] = clamped;
    try {
      localStorage.setItem(WATER_KEY, JSON.stringify(w.map));
    } catch (e) {
    }
    render();
  }
  function makeId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }
  function notifyToast(title, msg, type = "success") {
    if (global.utils && typeof global.utils.showToast === "function") {
      global.utils.showToast(title, msg, type);
    }
  }
  function computeTriggerMs(dateKey, timeStr) {
    const dPart = dateKey || todayKey();
    const tPart = timeStr || "09:00";
    const dt = /* @__PURE__ */ new Date(`${dPart}T${tPart}:00`);
    return isNaN(dt.getTime()) ? Date.now() + 6e4 : dt.getTime();
  }
  function scheduleNativeOrWebReminder(item) {
    if (item.kind !== "reminder" || item.status !== "active") return;
    const triggerMs = computeTriggerMs(item.dateKey, item.timeStr);
    if (global.AndroidBridge && typeof global.AndroidBridge.scheduleReminder === "function") {
      try {
        global.AndroidBridge.scheduleReminder(
          String(item.id),
          String(item.title || "ONEORA Reminder"),
          String(item.body || "Scheduled reminder from ONEORA"),
          Number(triggerMs),
          String(item.repeat || "none")
        );
      } catch (e) {
        console.warn("Android scheduleReminder failed:", e);
      }
    } else if ("Notification" in global && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {
      });
    }
  }
  function cancelNativeReminder(id) {
    if (global.AndroidBridge && typeof global.AndroidBridge.cancelReminder === "function") {
      try {
        global.AndroidBridge.cancelReminder(String(id));
      } catch (e) {
      }
    }
  }
  function startWebReminderWatcher() {
    if (reminderTimer) clearInterval(reminderTimer);
    reminderTimer = setInterval(() => {
      const now = Date.now();
      const items = loadItems();
      let changed = false;
      items.forEach((it) => {
        if (it.kind !== "reminder" || it.status !== "active") return;
        const trig = computeTriggerMs(it.dateKey, it.timeStr);
        const fireKey = `${it.id}:${it.dateKey}:${it.timeStr}`;
        if (trig <= now && now - trig < 12e4 && !firedReminderKeys.has(fireKey)) {
          firedReminderKeys.add(fireKey);
          notifyToast(`Reminder: ${it.title}`, it.body || `${it.dateKey} ${it.timeStr || ""}`, "info");
          if ("Notification" in global && Notification.permission === "granted") {
            try {
              new Notification(`ONEORA Reminder: ${it.title}`, {
                body: it.body || `Scheduled for ${it.timeStr || "now"}`,
                icon: "./pwa-192x192.png"
              });
            } catch (e) {
            }
          }
          if (it.repeat && it.repeat !== "none") {
            const nextDate = new Date(trig);
            if (it.repeat === "daily") nextDate.setDate(nextDate.getDate() + 1);
            else if (it.repeat === "weekly") nextDate.setDate(nextDate.getDate() + 7);
            else if (it.repeat === "monthly") nextDate.setMonth(nextDate.getMonth() + 1);
            else if (it.repeat === "yearly") nextDate.setFullYear(nextDate.getFullYear() + 1);
            it.dateKey = todayKey(nextDate);
            it.updatedAtMs = Date.now();
            changed = true;
            scheduleNativeOrWebReminder(it);
          }
        }
      });
      if (changed) saveItems(items);
    }, 25e3);
  }
  function addItem(item) {
    const items = loadItems();
    const record = {
      id: makeId(item.kind ? item.kind.slice(0, 2) : "pl"),
      kind: item.kind || "task",
      title: String(item.title || "").trim().slice(0, 200),
      body: String(item.body || "").trim().slice(0, 4e3),
      dateKey: item.dateKey || selectedDateKey || todayKey(),
      timeStr: String(item.timeStr || "").slice(0, 16),
      repeat: item.repeat || "none",
      category: String(item.category || "General").slice(0, 40),
      status: item.status || "active",
      pinned: Boolean(item.pinned),
      streak: Number(item.streak || 0),
      checklist: Array.isArray(item.checklist) ? item.checklist.slice(0, 30) : [],
      completedDates: Array.isArray(item.completedDates) ? item.completedDates.slice(-90) : [],
      updatedAtMs: Date.now()
    };
    if (!record.title) return null;
    items.unshift(record);
    saveItems(items);
    if (record.kind === "reminder") scheduleNativeOrWebReminder(record);
    return record;
  }
  function updateItem(id, updater) {
    const items = loadItems();
    const idx = items.findIndex((x) => x.id === id);
    if (idx < 0) return;
    items[idx] = __spreadProps(__spreadValues(__spreadValues({}, items[idx]), updater(items[idx])), { updatedAtMs: Date.now() });
    saveItems(items);
    if (items[idx].kind === "reminder") {
      if (items[idx].status === "active") scheduleNativeOrWebReminder(items[idx]);
      else cancelNativeReminder(id);
    }
  }
  function deleteItem(id) {
    const items = loadItems().filter((x) => x.id !== id);
    cancelNativeReminder(id);
    saveItems(items);
  }
  function render() {
    const root = document.getElementById("oneoraPlannerRoot");
    if (!root) return;
    const items = loadItems();
    const tKey = todayKey();
    const todayEvents = items.filter((i) => (i.kind === "event" || i.kind === "reminder") && i.dateKey === tKey && i.status === "active");
    const activeTasks = items.filter((i) => i.kind === "task" && i.status === "active");
    const habits = items.filter((i) => i.kind === "habit" && i.status !== "archived");
    const doneHabitsToday = habits.filter((h) => Array.isArray(h.completedDates) && h.completedDates.includes(tKey)).length;
    const bestStreak = habits.reduce((mx, h) => Math.max(mx, Number(h.streak || 0)), 0);
    const activeStreakCount = habits.filter((h) => Number(h.streak || 0) > 0).length;
    const habitPct = habits.length > 0 ? Math.round(doneHabitsToday / habits.length * 100) : 0;
    const tabs = [
      { id: "calendar", label: "Calendar" },
      { id: "notes", label: "Date Notes" },
      { id: "reminders", label: "Reminders" },
      { id: "tasks", label: "Tasks & Lists" },
      { id: "habits", label: "Habits & Streaks" }
    ];
    root.innerHTML = `
      <div class="space-y-5" data-pastel-cat="lifemoney">
        <!-- Pastel Planner Header & Streaks Banner -->
        <div class="pastel-cat-header p-5 sm:p-6 space-y-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="flex items-start gap-3.5">
              <div class="pastel-icon-tile !w-12 !h-12 !rounded-2xl shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <div>
                <p class="text-[11px] font-extrabold uppercase tracking-wider text-[#804800] dark:text-[#FCD34D]">My Daily Life · Offline-First</p>
                <h2 class="text-2xl sm:text-[28px] font-extrabold text-[#2B2236] dark:text-[#F5EEFF] tracking-tight leading-tight">ONEORA Planner</h2>
              </div>
            </div>
            <div class="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/90 dark:bg-[#17131F]/80 border border-[#2B2236]/10 dark:border-[#F5EEFF]/12 text-xs font-extrabold text-[#2B2236] dark:text-[#F5EEFF] tabular-nums min-h-[44px]">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
              <span>Best Streak: ${bestStreak}d</span>
            </div>
          </div>

          <!-- Planner Streaks & Daily Pulse Tiles -->
          <div class="grid grid-cols-3 gap-2.5">
            <div class="pastel-kpi-tile p-3">
              <p class="text-[11px] font-bold text-[#5C506B] dark:text-[#C5B9DA]">Active Streaks</p>
              <p class="text-base sm:text-lg font-extrabold text-[#2B2236] dark:text-[#F5EEFF] tabular-nums mt-0.5">${activeStreakCount} habit${activeStreakCount === 1 ? "" : "s"}</p>
            </div>
            <div class="pastel-kpi-tile p-3">
              <p class="text-[11px] font-bold text-[#146347] dark:text-[#86EFAC]">Habits Today</p>
              <p class="text-base sm:text-lg font-extrabold text-[#115E42] dark:text-[#6EE7B7] tabular-nums mt-0.5">${doneHabitsToday}/${habits.length} (${habitPct}%)</p>
            </div>
            <div class="pastel-kpi-tile p-3">
              <p class="text-[11px] font-bold text-[#5C506B] dark:text-[#C5B9DA]">Today's Agenda</p>
              <p class="text-base sm:text-lg font-extrabold text-[#2B2236] dark:text-[#F5EEFF] tabular-nums mt-0.5">${todayEvents.length} · ${activeTasks.length} tasks</p>
            </div>
          </div>

          <!-- Sub-Navigation Tabs -->
          <div class="flex items-center gap-2 overflow-x-auto hide-scrollbar pt-1">
            ${tabs.map((t) => `
              <button type="button" data-planner-tab="${t.id}" class="pastel-pill-tab ${activeSubTab === t.id ? "is-active" : ""}">${t.label}</button>
            `).join("")}
          </div>
        </div>

        <div id="oneoraPlannerBody">
          ${activeSubTab === "calendar" ? renderCalendarView(items) : ""}
          ${activeSubTab === "notes" ? renderNotesView(items) : ""}
          ${activeSubTab === "reminders" ? renderRemindersView(items) : ""}
          ${activeSubTab === "tasks" ? renderTasksView(items) : ""}
          ${activeSubTab === "habits" ? renderHabitsView(items) : ""}
        </div>
      </div>
    `;
    bindEvents(root);
  }
  function renderCalendarView(items) {
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const tKey = todayKey();
    const byDate = {};
    items.forEach((it) => {
      if (!it.dateKey || it.status === "archived") return;
      if (!byDate[it.dateKey]) byDate[it.dateKey] = [];
      byDate[it.dateKey].push(it);
    });
    const pad = (n) => String(n).padStart(2, "0");
    let calendarGridHtml = "";
    if (calViewMode === "month") {
      const cells = [];
      for (let i = 0; i < firstDay; i++) cells.push('<div class="h-12 sm:h-14"></div>');
      for (let d = 1; d <= daysInMonth; d++) {
        const key = `${viewYear}-${pad(viewMonth + 1)}-${pad(d)}`;
        const dayItems = byDate[key] || [];
        const holiday = INDIAN_HOLIDAYS[key];
        const isToday = key === tKey;
        const isSel = key === selectedDateKey;
        cells.push(`
          <button type="button" data-cal-date="${key}" class="relative h-12 sm:h-14 rounded-2xl border text-left p-1.5 flex flex-col justify-between transition ${isSel ? "bg-[#5B3FD0] text-white border-[#5B3FD0] shadow-sm" : isToday ? "bg-[#E4D9FF] dark:bg-[#2D2347] border-[#5B3FD0]/45 text-[#3E26A0] dark:text-[#E4D9FF]" : "bg-[#FFF7EE] dark:bg-[#17131F] border-[#2B2236]/8 dark:border-[#F5EEFF]/10 text-[#2B2236] dark:text-[#F5EEFF] hover:border-[#5B3FD0]/50"}">
            <span class="text-xs font-extrabold tabular-nums">${d}</span>
            <div class="flex items-center gap-0.5 flex-wrap">
              ${holiday ? '<span class="w-1.5 h-1.5 rounded-full bg-orange-500" title="Holiday"></span>' : ""}
              ${dayItems.slice(0, 3).map((x) => {
          const c = x.kind === "reminder" ? "bg-rose-500" : x.kind === "note" ? "bg-amber-400" : "bg-emerald-500";
          return `<span class="w-1.5 h-1.5 rounded-full ${c}"></span>`;
        }).join("")}
            </div>
          </button>
        `);
      }
      calendarGridHtml = `
        <div class="grid grid-cols-7 gap-1 text-center text-[11px] font-extrabold text-[#5C506B] dark:text-[#C5B9DA] mb-1.5">
          <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
        </div>
        <div class="grid grid-cols-7 gap-1.5">${cells.join("")}</div>
      `;
    } else if (calViewMode === "week") {
      const selDate = /* @__PURE__ */ new Date(`${selectedDateKey}T00:00:00`);
      const startOfWeek = new Date(selDate);
      startOfWeek.setDate(selDate.getDate() - selDate.getDay());
      const weekCards = [];
      for (let i = 0; i < 7; i++) {
        const cur = new Date(startOfWeek);
        cur.setDate(startOfWeek.getDate() + i);
        const key = todayKey(cur);
        const dayItems = byDate[key] || [];
        const holiday = INDIAN_HOLIDAYS[key];
        const isSel = key === selectedDateKey;
        weekCards.push(`
          <button type="button" data-cal-date="${key}" class="p-3 rounded-2xl border text-left transition ${isSel ? "bg-[#5B3FD0] text-white border-[#5B3FD0]" : "bg-[#FFF7EE] dark:bg-[#17131F] border-[#2B2236]/8 dark:border-[#F5EEFF]/10 text-[#2B2236] dark:text-[#F5EEFF]"}">
            <div class="text-[11px] font-bold opacity-80">${cur.toLocaleDateString("en-IN", { weekday: "short" })}</div>
            <div class="text-lg font-extrabold tabular-nums">${cur.getDate()}</div>
            <div class="text-[10px] mt-1 truncate ${isSel ? "text-white/90" : "text-[#5B3FD0] dark:text-[#CBBBFF]"}">${holiday ? esc(holiday) : `${dayItems.length} items`}</div>
          </button>
        `);
      }
      calendarGridHtml = `<div class="grid grid-cols-2 sm:grid-cols-7 gap-2">${weekCards.join("")}</div>`;
    } else {
      calendarGridHtml = `
        <div class="pastel-inset-tile p-4 flex items-center justify-between gap-2">
          <div>
            <p class="text-xs font-extrabold text-[#5B3FD0] dark:text-[#CBBBFF]">Daily Focus View</p>
            <h4 class="text-lg font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">${esc(formatHumanDate(selectedDateKey))}</h4>
            ${INDIAN_HOLIDAYS[selectedDateKey] ? `<p class="text-xs font-bold text-[#8A4600] dark:text-[#FCD34D] mt-0.5">Holiday: ${esc(INDIAN_HOLIDAYS[selectedDateKey])}</p>` : ""}
          </div>
          <input type="date" id="calDayPickerInput" value="${esc(selectedDateKey)}" class="pastel-pill-input text-xs font-bold min-w-[155px]" />
        </div>
      `;
    }
    const selItems = byDate[selectedDateKey] || [];
    const selHoliday = INDIAN_HOLIDAYS[selectedDateKey];
    return `
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div class="lg:col-span-7 pastel-stage3-card p-5 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <button type="button" id="calPrevMonthBtn" class="w-11 h-11 rounded-full bg-[#FFF7EE] dark:bg-[#17131F] text-[#2B2236] dark:text-[#F5EEFF] font-extrabold hover:bg-[#E4D9FF]">‹</button>
              <h3 class="text-base font-extrabold text-[#2B2236] dark:text-[#F5EEFF] min-w-[140px] text-center">${monthNames[viewMonth]} ${viewYear}</h3>
              <button type="button" id="calNextMonthBtn" class="w-11 h-11 rounded-full bg-[#FFF7EE] dark:bg-[#17131F] text-[#2B2236] dark:text-[#F5EEFF] font-extrabold hover:bg-[#E4D9FF]">›</button>
              <button type="button" id="calTodayBtn" class="px-4 h-11 rounded-full bg-[#E4D9FF] dark:bg-[#2D2347] text-[#3E26A0] dark:text-[#E4D9FF] text-xs font-extrabold">Today</button>
            </div>
            <div class="flex items-center gap-1 bg-[#FFF7EE] dark:bg-[#17131F] p-1 rounded-full border border-[#2B2236]/8 dark:border-[#F5EEFF]/10">
              ${["month", "week", "day"].map((m) => `
                <button type="button" data-cal-mode="${m}" class="px-3.5 py-2 rounded-full text-xs font-extrabold capitalize min-h-[38px] transition ${calViewMode === m ? "bg-[#5B3FD0] text-white shadow-sm" : "text-[#5C506B] dark:text-[#C5B9DA]"}">${m}</button>
              `).join("")}
            </div>
          </div>

          ${calendarGridHtml}

          <div class="flex flex-wrap items-center gap-4 pt-2 border-t border-[#2B2236]/8 dark:border-[#F5EEFF]/10 text-[11px] font-bold text-[#5C506B] dark:text-[#C5B9DA]">
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-orange-500"></span>Indian Holiday</span>
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>Event / Birthday</span>
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span>Date Note</span>
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span>Reminder</span>
          </div>
        </div>

        <!-- Selected Date Agenda & Quick Add -->
        <div class="lg:col-span-5 pastel-stage3-card p-5 space-y-4">
          <div class="flex items-center justify-between gap-2">
            <div>
              <p class="text-[11px] font-extrabold uppercase tracking-wider text-[#5B3FD0] dark:text-[#CBBBFF]">Selected Date</p>
              <h3 class="text-lg font-extrabold text-[#2B2236] dark:text-[#F5EEFF] tabular-nums">${esc(formatHumanDate(selectedDateKey))}</h3>
            </div>
            ${selHoliday ? `<span class="text-[11px] font-extrabold px-3 py-1 rounded-full bg-[#FFF1A8] dark:bg-[#3A3219] text-[#6B5000] dark:text-[#FDE68A]">${esc(selHoliday)}</span>` : ""}
          </div>

          <!-- Quick Add Event/Note/Reminder for Selected Date -->
          <form id="calQuickAddForm" class="pastel-inset-tile space-y-2.5 p-3.5">
            <div class="grid grid-cols-2 gap-2">
              <select id="calAddKind" class="pastel-pill-input !bg-white dark:!bg-[#221C2E] text-xs font-bold">
                <option value="" disabled>Select entry type...</option>
                <option value="event" selected>Event / Birthday</option>
                <option value="note">Date Note</option>
                <option value="reminder">Reminder</option>
                <option value="task">Task</option>
              </select>
              <input type="time" id="calAddTime" value="09:00" class="pastel-pill-input !bg-white dark:!bg-[#221C2E] text-xs font-bold" />
            </div>
            <input type="text" id="calAddTitle" required maxlength="180" placeholder="Title (e.g. Mom's Birthday, Pay Bill)..." class="pastel-pill-input !bg-white dark:!bg-[#221C2E] w-full text-xs" />
            <textarea id="calAddBody" rows="2" maxlength="1000" placeholder="Optional details or notes..." class="pastel-pill-input !bg-white dark:!bg-[#221C2E] w-full text-xs"></textarea>
            <button type="submit" class="w-full py-2.5 rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white text-xs font-extrabold min-h-[44px] shadow-sm transition">+ Save to ${esc(formatHumanDate(selectedDateKey))}</button>
          </form>

          <!-- Agenda Items for Selected Date -->
          <div class="space-y-2 max-h-72 overflow-y-auto">
            ${selItems.length ? selItems.map((it) => `
              <div class="pastel-inset-tile p-3.5 flex items-start justify-between gap-2">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#5B3FD0] dark:text-[#CBBBFF]">
                    <span>${esc(it.kind)}</span>
                    ${it.timeStr ? `<span>· ${esc(it.timeStr)}</span>` : ""}
                  </div>
                  <p class="text-xs font-extrabold text-[#2B2236] dark:text-[#F5EEFF] mt-0.5 ${it.status === "completed" ? "line-through opacity-60" : ""}">${esc(it.title)}</p>
                  ${it.body ? `<p class="text-[11px] text-[#5C506B] dark:text-[#C5B9DA] mt-0.5 whitespace-pre-wrap">${esc(it.body)}</p>` : ""}
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                  <button type="button" data-pl-toggle="${it.id}" class="px-3 py-1.5 rounded-full bg-[#CFF3E2] dark:bg-[#1B362E] text-[#115E42] dark:text-[#A7F3D0] text-xs font-extrabold min-h-[40px]">${it.status === "completed" ? "Undo" : "Done"}</button>
                  <button type="button" data-pl-del="${it.id}" class="w-10 h-10 rounded-full bg-[#FFD6D6]/70 dark:bg-[#3D212B] text-[#8E1B3B] dark:text-[#FDA4AF] text-xs font-extrabold">✕</button>
                </div>
              </div>
            `).join("") : '<div class="pastel-empty-state !py-6"><p class="text-xs font-bold text-[#5C506B] dark:text-[#C5B9DA]">No events or notes scheduled for this date yet.</p></div>'}
          </div>
        </div>
      </div>
    `;
  }
  function renderNotesView(items) {
    const notes = items.filter((i) => (i.kind === "note" || i.kind === "voice_note") && i.status !== "archived").sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || (b.updatedAtMs || 0) - (a.updatedAtMs || 0));
    return `
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <form id="oneoraNoteForm" class="lg:col-span-5 pastel-stage3-card p-5 space-y-3">
          <div class="flex items-center justify-between gap-2">
            <h3 class="text-base font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">New Date-Wise Note</h3>
            <button type="button" id="oneoraVoiceNoteBtn" class="px-3.5 py-2 rounded-full bg-[#E4D9FF] dark:bg-[#2D2347] text-[#3E26A0] dark:text-[#E4D9FF] text-xs font-extrabold min-h-[44px]">Voice Dictate</button>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <input type="date" id="noteDateInput" value="${esc(selectedDateKey)}" class="pastel-pill-input text-xs font-bold" />
            <input type="text" id="noteCatInput" placeholder="Tag (Work, Study, Home)" class="pastel-pill-input text-xs" />
          </div>
          <input type="text" id="noteTitleInput" required maxlength="180" placeholder="Note Title..." class="pastel-pill-input w-full text-sm font-bold" />
          <textarea id="noteBodyInput" rows="4" maxlength="3800" placeholder="Write description, meeting notes, or checklist items..." class="pastel-pill-input w-full text-xs"></textarea>
          <label class="flex items-center gap-2 text-xs font-bold text-[#5C506B] dark:text-[#C5B9DA] min-h-[36px]">
            <input type="checkbox" id="notePinCheck" class="rounded accent-[#5B3FD0]" /> Pin this note to top
          </label>
          <button type="submit" class="w-full py-3 rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white text-xs font-extrabold min-h-[48px] shadow-sm transition">Save Note Offline</button>
        </form>

        <div class="lg:col-span-7 space-y-3">
          ${notes.length ? notes.map((n) => `
            <div class="pastel-stage3-card ${n.pinned ? "!border-[#D97706]" : ""} p-4 sm:p-5 space-y-2">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <div class="flex items-center gap-2 text-[11px] font-bold text-[#5C506B] dark:text-[#C5B9DA]">
                    <span class="tabular-nums">${esc(n.dateKey || "No date")}</span>
                    ${n.category ? `<span>· ${esc(n.category)}</span>` : ""}
                    ${n.pinned ? '<span class="text-[#8A4600] dark:text-[#FCD34D]">· Pinned</span>' : ""}
                  </div>
                  <h4 class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF] mt-0.5">${esc(n.title)}</h4>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                  <button type="button" data-pl-pin="${n.id}" class="px-3 py-1.5 rounded-full bg-[#FFF1A8] dark:bg-[#3A3219] text-[#6B5000] dark:text-[#FDE68A] text-xs font-extrabold min-h-[40px]">${n.pinned ? "Unpin" : "Pin"}</button>
                  <button type="button" data-pl-del="${n.id}" class="px-3 py-1.5 rounded-full bg-[#FFD6D6]/70 dark:bg-[#3D212B] text-[#8E1B3B] dark:text-[#FDA4AF] text-xs font-extrabold min-h-[40px]">Delete</button>
                </div>
              </div>
              ${n.body ? `<p class="text-xs text-[#5C506B] dark:text-[#C5B9DA] whitespace-pre-wrap leading-relaxed">${esc(n.body)}</p>` : ""}
            </div>
          `).join("") : '<div class="pastel-empty-state"><p class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">No saved notes yet</p><p class="text-xs text-[#5C506B] dark:text-[#C5B9DA]">Add your first date-wise or voice note on the left.</p></div>'}
        </div>
      </div>
    `;
  }
  function renderRemindersView(items) {
    const reminders = items.filter((i) => i.kind === "reminder" && i.status !== "archived").sort((a, b) => computeTriggerMs(a.dateKey, a.timeStr) - computeTriggerMs(b.dateKey, b.timeStr));
    const notifSupported = "Notification" in global || global.AndroidBridge && typeof global.AndroidBridge.scheduleReminder === "function";
    return `
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <form id="oneoraReminderForm" class="lg:col-span-5 pastel-stage3-card p-5 space-y-3">
          <div>
            <h3 class="text-base font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">Set Reliable Reminder</h3>
            <p class="text-[11px] font-semibold text-[#5C506B] dark:text-[#C5B9DA] mt-0.5">${global.AndroidBridge && typeof global.AndroidBridge.scheduleReminder === "function" ? "Backed by Android AlarmManager & reboot persistence." : notifSupported ? "Uses Browser Notification Alerts while ONEORA is open." : "In-app visual reminder alert."}</p>
          </div>
          <div class="flex flex-wrap gap-1.5">
            ${["Medicine", "Bill Payment", "Birthday", "Document Renewal", "Meeting"].map((p) => `
              <button type="button" data-rem-preset="${p}" class="px-3 py-1.5 rounded-full bg-[#E4D9FF] dark:bg-[#2D2347] text-[#3E26A0] dark:text-[#E4D9FF] text-xs font-extrabold hover:bg-[#5B3FD0] hover:text-white min-h-[38px] transition">${p}</button>
            `).join("")}
          </div>
          <input type="text" id="remTitleInput" required maxlength="180" placeholder="Remind me to..." class="pastel-pill-input w-full text-sm font-bold" />
          <div class="grid grid-cols-2 gap-2">
            <input type="date" id="remDateInput" value="${esc(todayKey())}" class="pastel-pill-input text-xs font-bold" />
            <input type="time" id="remTimeInput" value="09:00" class="pastel-pill-input text-xs font-bold" />
          </div>
          <select id="remRepeatInput" class="pastel-pill-input w-full text-xs font-bold">
            <option value="" disabled>Repeat schedule...</option>
            <option value="none" selected>One-Time Reminder</option>
            <option value="daily">Repeat Daily</option>
            <option value="weekly">Repeat Weekly</option>
            <option value="monthly">Repeat Monthly</option>
            <option value="yearly">Repeat Yearly</option>
          </select>
          <input type="text" id="remBodyInput" maxlength="400" placeholder="Optional note or dosage / bill account info..." class="pastel-pill-input w-full text-xs" />
          <button type="submit" class="w-full py-3 rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white text-xs font-extrabold min-h-[48px] shadow-sm transition">Schedule Reminder</button>
        </form>

        <div class="lg:col-span-7 space-y-2.5">
          ${reminders.length ? reminders.map((r) => `
            <div class="pastel-stage3-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="min-w-0">
                <div class="flex items-center gap-2 text-[11px] font-extrabold text-[#8E1B3B] dark:text-[#FDA4AF] tabular-nums">
                  <span>${esc(r.dateKey)} · ${esc(r.timeStr || "09:00")}</span>
                  ${r.repeat && r.repeat !== "none" ? `<span class="text-[#5B3FD0] dark:text-[#CBBBFF] uppercase">· ${esc(r.repeat)}</span>` : ""}
                  ${r.status === "completed" ? '<span class="text-[#115E42] dark:text-[#6EE7B7]">· Completed</span>' : ""}
                </div>
                <h4 class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF] mt-0.5 ${r.status === "completed" ? "line-through opacity-60" : ""}">${esc(r.title)}</h4>
                ${r.body ? `<p class="text-xs text-[#5C506B] dark:text-[#C5B9DA] mt-0.5">${esc(r.body)}</p>` : ""}
              </div>
              <div class="flex flex-wrap items-center gap-1.5 shrink-0">
                <button type="button" data-rem-snooze="${r.id}" class="px-3 py-1.5 rounded-full bg-[#FFF1A8] dark:bg-[#3A3219] text-[#6B5000] dark:text-[#FDE68A] text-xs font-extrabold min-h-[44px]">+15m</button>
                <button type="button" data-pl-toggle="${r.id}" class="px-3 py-1.5 rounded-full bg-[#CFF3E2] dark:bg-[#1B362E] text-[#115E42] dark:text-[#A7F3D0] text-xs font-extrabold min-h-[44px]">${r.status === "completed" ? "Reopen" : "Done"}</button>
                <button type="button" data-pl-del="${r.id}" class="px-3 py-1.5 rounded-full bg-[#FFD6D6]/70 dark:bg-[#3D212B] text-[#8E1B3B] dark:text-[#FDA4AF] text-xs font-extrabold min-h-[44px]">Delete</button>
              </div>
            </div>
          `).join("") : '<div class="pastel-empty-state"><p class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">No reminders scheduled yet</p><p class="text-xs text-[#5C506B] dark:text-[#C5B9DA]">Pick a quick preset on the left for medicines, bills, or renewals.</p></div>'}
        </div>
      </div>
    `;
  }
  function renderTasksView(items) {
    const tasks = items.filter((i) => i.kind === "task" && i.status !== "archived");
    return `
      <div class="pastel-stage3-card p-5 space-y-4">
        <form id="oneoraTaskForm" class="flex flex-col sm:flex-row gap-2">
          <input type="text" id="taskTitleInput" required maxlength="180" placeholder="Add a to-do or shopping item..." class="pastel-pill-input !rounded-full flex-1 text-sm" />
          <select id="taskCatInput" class="pastel-pill-input !rounded-full text-xs font-bold">
            <option value="" disabled>Task category...</option>
            <option value="To-Do" selected>To-Do</option>
            <option value="Shopping">Shopping List</option>
            <option value="Work">Work</option>
            <option value="Personal">Personal</option>
          </select>
          <button type="submit" class="px-5 py-2.5 rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white text-xs font-extrabold min-h-[44px] whitespace-nowrap shadow-sm">+ Add Task</button>
        </form>

        <div class="space-y-2.5">
          ${tasks.length ? tasks.map((t) => `
            <div class="pastel-inset-tile flex items-center justify-between gap-3 p-3.5">
              <button type="button" data-pl-toggle="${t.id}" class="flex items-center gap-3 flex-1 min-w-0 text-left min-h-[44px]">
                <span class="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 text-xs font-extrabold ${t.status === "completed" ? "bg-[#15803D] border-[#15803D] text-white" : "border-[#5B3FD0]/40 bg-white dark:bg-[#221C2E]"}">
                  ${t.status === "completed" ? "✓" : ""}
                </span>
                <div class="min-w-0">
                  <p class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF] truncate ${t.status === "completed" ? "line-through opacity-55" : ""}">${esc(t.title)}</p>
                  <p class="text-[11px] font-semibold text-[#5C506B] dark:text-[#C5B9DA]">${esc(t.category || "To-Do")} · ${esc(t.dateKey || "")}</p>
                </div>
              </button>
              <button type="button" data-pl-del="${t.id}" aria-label="Delete task" class="w-11 h-11 rounded-full bg-[#FFD6D6]/70 dark:bg-[#3D212B] text-[#8E1B3B] dark:text-[#FDA4AF] text-xs font-extrabold flex items-center justify-center">✕</button>
            </div>
          `).join("") : '<div class="pastel-empty-state"><p class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">All clear!</p><p class="text-xs text-[#5C506B] dark:text-[#C5B9DA]">Add to-dos or grocery items above to stay organized offline.</p></div>'}
        </div>
      </div>
    `;
  }
  function renderHabitsView(items) {
    const habits = items.filter((i) => i.kind === "habit" && i.status !== "archived");
    const tKey = todayKey();
    const water = loadWater();
    const waterPct = Math.min(100, Math.round(water.count / water.goal * 100));
    return `
      <div class="space-y-4">
        <!-- Quick Water Counter Card (Image Blue Pastel #D6E8FF / #1F2E44) -->
        <div class="rounded-[28px] bg-[#D6E8FF] dark:bg-[#1F2E44] border border-[#2B2236]/8 dark:border-[#F5EEFF]/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div class="space-y-1.5 flex-1">
            <p class="text-[11px] font-extrabold uppercase tracking-wider text-[#1B4A8B] dark:text-[#93C5FD]">Daily Hydration Tracker</p>
            <h3 class="text-xl font-extrabold text-[#2B2236] dark:text-[#F5EEFF] tabular-nums">${water.count} / ${water.goal} Glasses Today</h3>
            <div class="w-full max-w-sm h-2.5 rounded-full bg-white/75 dark:bg-[#17131F]/70 overflow-hidden mt-2">
              <div class="h-full bg-[#1D63D8] dark:bg-[#60A5FA] rounded-full transition-all" style="width:${waterPct}%"></div>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button type="button" id="waterDecBtn" aria-label="Decrease water glasses" class="w-12 h-12 rounded-full bg-white/90 dark:bg-[#17131F]/80 text-[#2B2236] dark:text-[#F5EEFF] text-lg font-extrabold shadow-xs">−</button>
            <button type="button" id="waterIncBtn" class="px-5 h-12 rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white text-xs font-extrabold shadow-sm">+1 Glass</button>
          </div>
        </div>

        <!-- Custom Habits List -->
        <div class="pastel-stage3-card p-5 space-y-4">
          <form id="oneoraHabitForm" class="flex flex-col sm:flex-row gap-2">
            <input type="text" id="habitTitleInput" required maxlength="140" placeholder="Add a daily habit (e.g. Meditate 10 min, No Sugar)..." class="pastel-pill-input !rounded-full flex-1 text-sm" />
            <button type="submit" class="px-5 py-2.5 rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white text-xs font-extrabold min-h-[44px] shadow-sm">+ Add Habit</button>
          </form>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            ${habits.map((h) => {
      const dates = Array.isArray(h.completedDates) ? h.completedDates : [];
      const doneToday = dates.includes(tKey);
      const monthPrefix = tKey.slice(0, 7);
      const monthCount = dates.filter((d) => String(d).startsWith(monthPrefix)).length;
      const pct = Math.min(100, Math.round(monthCount / 30 * 100));
      const streakNum = Number(h.streak || 0);
      return `
                <div class="p-4 rounded-[24px] border ${doneToday ? "bg-[#CFF3E2]/70 dark:bg-[#1B362E] border-[#15803D]/35" : "bg-[#FFF7EE] dark:bg-[#17131F] border-[#2B2236]/8 dark:border-[#F5EEFF]/10"} space-y-3">
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <h4 class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF] truncate">${esc(h.title)}</h4>
                      <p class="text-[11px] font-extrabold text-[#5B3FD0] dark:text-[#CBBBFF] mt-0.5 tabular-nums">${streakNum > 0 ? `Streak: ${streakNum} day${streakNum === 1 ? "" : "s"}` : "Start streak today"} · ${monthCount}d this month</p>
                    </div>
                    <button type="button" data-pl-del="${h.id}" aria-label="Delete habit" class="w-10 h-10 rounded-full bg-white/80 dark:bg-[#221C2E] text-[#8E1B3B] dark:text-[#FDA4AF] text-xs font-extrabold">✕</button>
                  </div>
                  <div class="h-2 rounded-full bg-white dark:bg-[#221C2E] overflow-hidden">
                    <div class="h-full bg-[#15803D] rounded-full transition-all" style="width:${pct}%"></div>
                  </div>
                  <button type="button" data-habit-checkin="${h.id}" class="w-full py-2.5 rounded-full text-xs font-extrabold min-h-[44px] transition ${doneToday ? "bg-[#157A54] text-white shadow-sm" : "bg-white dark:bg-[#221C2E] border border-[#2B2236]/12 dark:border-[#F5EEFF]/12 text-[#2B2236] dark:text-[#F5EEFF] hover:border-[#157A54]"}">${doneToday ? "✓ Completed Today" : "Mark Done Today"}</button>
                </div>
              `;
    }).join("")}
          </div>
        </div>
      </div>
    `;
  }
  function bindEvents(root) {
    root.querySelectorAll("[data-planner-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeSubTab = btn.getAttribute("data-planner-tab") || "calendar";
        render();
      });
    });
    root.querySelectorAll("[data-cal-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        calViewMode = btn.getAttribute("data-cal-mode") || "month";
        render();
      });
    });
    root.querySelectorAll("[data-cal-date]").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedDateKey = btn.getAttribute("data-cal-date") || todayKey();
        render();
      });
    });
    const dayPicker = root.querySelector("#calDayPickerInput");
    if (dayPicker) {
      dayPicker.addEventListener("change", (e) => {
        if (e.target.value) {
          selectedDateKey = e.target.value;
          render();
        }
      });
    }
    const prevBtn = root.querySelector("#calPrevMonthBtn");
    if (prevBtn) prevBtn.addEventListener("click", () => {
      viewMonth -= 1;
      if (viewMonth < 0) {
        viewMonth = 11;
        viewYear -= 1;
      }
      render();
    });
    const nextBtn = root.querySelector("#calNextMonthBtn");
    if (nextBtn) nextBtn.addEventListener("click", () => {
      viewMonth += 1;
      if (viewMonth > 11) {
        viewMonth = 0;
        viewYear += 1;
      }
      render();
    });
    const todayBtn = root.querySelector("#calTodayBtn");
    if (todayBtn) todayBtn.addEventListener("click", () => {
      const now = /* @__PURE__ */ new Date();
      viewYear = now.getFullYear();
      viewMonth = now.getMonth();
      selectedDateKey = todayKey(now);
      render();
    });
    const calForm = root.querySelector("#calQuickAddForm");
    if (calForm) {
      calForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const kind = root.querySelector("#calAddKind").value;
        const timeStr = root.querySelector("#calAddTime").value;
        const title = root.querySelector("#calAddTitle").value.trim();
        const body = root.querySelector("#calAddBody").value.trim();
        if (!title) return;
        addItem({ kind, title, body, dateKey: selectedDateKey, timeStr });
        notifyToast("Saved to Planner", `${title} added for ${formatHumanDate(selectedDateKey)}.`, "success");
        render();
      });
    }
    const noteForm = root.querySelector("#oneoraNoteForm");
    if (noteForm) {
      noteForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const title = root.querySelector("#noteTitleInput").value.trim();
        const body = root.querySelector("#noteBodyInput").value.trim();
        const dateKey = root.querySelector("#noteDateInput").value || todayKey();
        const category = root.querySelector("#noteCatInput").value.trim() || "Note";
        const pinned = root.querySelector("#notePinCheck").checked;
        if (!title) return;
        addItem({ kind: "note", title, body, dateKey, category, pinned });
        notifyToast("Note Saved", `"${title}" saved offline.`, "success");
        render();
      });
    }
    const voiceBtn = root.querySelector("#oneoraVoiceNoteBtn");
    if (voiceBtn) {
      voiceBtn.addEventListener("click", () => {
        const SpeechRec = global.SpeechRecognition || global.webkitSpeechRecognition;
        if (!SpeechRec) {
          notifyToast("Voice Not Supported", "Your browser does not support speech recognition.", "info");
          return;
        }
        const rec = new SpeechRec();
        rec.lang = global.PDFBondhuI18n && global.PDFBondhuI18n.getLocale ? global.PDFBondhuI18n.getLocale() : "en-IN";
        voiceBtn.textContent = "Listening...";
        rec.onresult = (ev) => {
          var _a, _b, _c;
          const transcript = ((_c = (_b = (_a = ev.results) == null ? void 0 : _a[0]) == null ? void 0 : _b[0]) == null ? void 0 : _c.transcript) || "";
          const bodyEl = root.querySelector("#noteBodyInput");
          const titleEl = root.querySelector("#noteTitleInput");
          if (bodyEl) bodyEl.value = (bodyEl.value ? `${bodyEl.value}
` : "") + transcript;
          if (titleEl && !titleEl.value.trim()) titleEl.value = transcript.slice(0, 60);
        };
        rec.onend = () => {
          voiceBtn.textContent = "Voice Dictate";
        };
        rec.onerror = () => {
          voiceBtn.textContent = "Voice Dictate";
        };
        rec.start();
      });
    }
    root.querySelectorAll("[data-rem-preset]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const preset = btn.getAttribute("data-rem-preset");
        const inp = root.querySelector("#remTitleInput");
        if (inp) {
          inp.value = `${preset}: `;
          inp.focus();
        }
      });
    });
    const remForm = root.querySelector("#oneoraReminderForm");
    if (remForm) {
      remForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const title = root.querySelector("#remTitleInput").value.trim();
        const dateKey = root.querySelector("#remDateInput").value || todayKey();
        const timeStr = root.querySelector("#remTimeInput").value || "09:00";
        const repeat = root.querySelector("#remRepeatInput").value || "none";
        const body = root.querySelector("#remBodyInput").value.trim();
        if (!title) return;
        addItem({ kind: "reminder", title, dateKey, timeStr, repeat, body });
        notifyToast("Reminder Scheduled", `"${title}" set for ${dateKey} at ${timeStr}.`, "success");
        render();
      });
    }
    const taskForm = root.querySelector("#oneoraTaskForm");
    if (taskForm) {
      taskForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const title = root.querySelector("#taskTitleInput").value.trim();
        const category = root.querySelector("#taskCatInput").value || "To-Do";
        if (!title) return;
        addItem({ kind: "task", title, category, dateKey: todayKey() });
        render();
      });
    }
    const habitForm = root.querySelector("#oneoraHabitForm");
    if (habitForm) {
      habitForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const title = root.querySelector("#habitTitleInput").value.trim();
        if (!title) return;
        addItem({ kind: "habit", title, category: "Habit", dateKey: todayKey(), streak: 0, completedDates: [] });
        render();
      });
    }
    const wInc = root.querySelector("#waterIncBtn");
    const wDec = root.querySelector("#waterDecBtn");
    if (wInc) wInc.addEventListener("click", () => setWaterCount(loadWater().count + 1));
    if (wDec) wDec.addEventListener("click", () => setWaterCount(loadWater().count - 1));
    root.querySelectorAll("[data-pl-toggle]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-pl-toggle");
        updateItem(id, (cur) => ({ status: cur.status === "completed" ? "active" : "completed" }));
        render();
      });
    });
    root.querySelectorAll("[data-pl-pin]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-pl-pin");
        updateItem(id, (cur) => ({ pinned: !cur.pinned }));
        render();
      });
    });
    root.querySelectorAll("[data-rem-snooze]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-rem-snooze");
        const nextDt = new Date(Date.now() + 15 * 6e4);
        const pad = (n) => String(n).padStart(2, "0");
        updateItem(id, () => ({
          dateKey: todayKey(nextDt),
          timeStr: `${pad(nextDt.getHours())}:${pad(nextDt.getMinutes())}`,
          status: "active"
        }));
        notifyToast("Snoozed 15 min", "Reminder moved 15 minutes ahead.", "info");
        render();
      });
    });
    root.querySelectorAll("[data-habit-checkin]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-habit-checkin");
        const tKey = todayKey();
        updateItem(id, (cur) => {
          const dates = Array.isArray(cur.completedDates) ? [...cur.completedDates] : [];
          const has = dates.includes(tKey);
          if (has) {
            return { completedDates: dates.filter((d) => d !== tKey), streak: Math.max(0, (cur.streak || 1) - 1) };
          }
          dates.push(tKey);
          return { completedDates: dates.slice(-90), streak: (cur.streak || 0) + 1 };
        });
        render();
      });
    });
    root.querySelectorAll("[data-pl-del]").forEach((btn) => {
      btn.addEventListener("click", () => {
        deleteItem(btn.getAttribute("data-pl-del"));
        render();
      });
    });
  }
  const OneoraPlanner = {
    init() {
      startWebReminderWatcher();
      render();
    },
    render,
    openSubTab(tab) {
      activeSubTab = tab || "calendar";
      if (typeof global.openPdfBondhuTool === "function") global.openPdfBondhuTool("oneoraPlannerTab");
      render();
    },
    getSummary() {
      const items = loadItems();
      const tKey = todayKey();
      const todayEvents = items.filter((i) => (i.kind === "event" || i.kind === "task") && i.dateKey === tKey && i.status === "active");
      const upcomingReminders = items.filter((i) => i.kind === "reminder" && i.status === "active").sort((a, b) => computeTriggerMs(a.dateKey, a.timeStr) - computeTriggerMs(b.dateKey, b.timeStr));
      const notesCount = items.filter((i) => i.kind === "note" && i.status !== "archived").length;
      const water = loadWater();
      return {
        todayKey: tKey,
        todayHoliday: INDIAN_HOLIDAYS[tKey] || "",
        todayEvents,
        upcomingReminders,
        notesCount,
        waterCount: water.count,
        waterGoal: water.goal,
        totalActiveTasks: items.filter((i) => i.kind === "task" && i.status === "active").length
      };
    },
    search(q) {
      const clean = String(q || "").trim().toLowerCase();
      if (!clean) return [];
      return loadItems().filter((i) => i.status !== "archived" && `${i.title} ${i.body || ""} ${i.category || ""} ${i.dateKey || ""}`.toLowerCase().includes(clean)).slice(0, 5).map((i) => ({
        id: i.id,
        kind: i.kind,
        title: i.title,
        subtitle: `${i.kind.toUpperCase()} · ${i.dateKey || "No date"} ${i.timeStr || ""}`.trim(),
        action: () => {
          activeSubTab = i.kind === "reminder" ? "reminders" : i.kind === "note" ? "notes" : i.kind === "habit" ? "habits" : i.kind === "task" ? "tasks" : "calendar";
          if (i.dateKey) selectedDateKey = i.dateKey;
          if (typeof global.openPdfBondhuTool === "function") global.openPdfBondhuTool("oneoraPlannerTab");
          render();
        }
      }));
    },
    exportForSync() {
      return loadItems();
    },
    mergeFromSync(remoteItems) {
      if (!Array.isArray(remoteItems) || !remoteItems.length) return;
      const local = loadItems();
      const map = new Map(local.map((x) => [x.id, x]));
      remoteItems.forEach((r) => {
        const cur = map.get(r.id);
        if (!cur || Number(r.updatedAtMs || 0) > Number(cur.updatedAtMs || 0)) {
          map.set(r.id, __spreadValues(__spreadValues({}, cur), r));
        }
      });
      saveItems(Array.from(map.values()));
      render();
    }
  };
  global.OneoraPlanner = OneoraPlanner;
  document.addEventListener("DOMContentLoaded", () => OneoraPlanner.init());
})(window);
