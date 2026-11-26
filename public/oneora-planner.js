/**
 * ONEORA — My Daily Life (Offline-First Planner, Calendar, Date Notes, Reliable Reminders, Tasks & Habits)
 */
(function (global) {
  const STORE_KEY = 'oneoraPlannerItems_v1';
  const WATER_KEY = 'oneoraWaterTracker_v1';

  const INDIAN_HOLIDAYS = {
    '2026-01-26': 'Republic Day',
    '2026-03-04': 'Holi',
    '2026-03-20': 'Eid-ul-Fitr (Tentative)',
    '2026-04-14': 'Ambedkar Jayanti / Pohela Boishakh',
    '2026-05-01': 'May Day / Buddha Purnima',
    '2026-08-15': 'Independence Day',
    '2026-08-28': 'Raksha Bandhan',
    '2026-09-04': 'Janmashtami',
    '2026-10-02': 'Gandhi Jayanti',
    '2026-10-19': 'Durga Puja — Ashtami',
    '2026-10-20': 'Dussehra / Vijayadashami',
    '2026-11-08': 'Diwali / Kali Puja',
    '2026-11-24': 'Guru Nanak Jayanti',
    '2026-12-25': 'Christmas Day',
    '2027-01-01': 'New Year Day',
    '2027-01-26': 'Republic Day',
    '2027-03-22': 'Holi',
    '2027-04-15': 'Pohela Boishakh',
    '2027-08-15': 'Independence Day',
    '2027-10-02': 'Gandhi Jayanti',
    '2027-12-25': 'Christmas Day'
  };

  let activeSubTab = 'calendar';
  let calViewMode = 'month'; // month | week | day
  let selectedDateKey = todayKey();
  let viewYear = new Date().getFullYear();
  let viewMonth = new Date().getMonth();
  let reminderTimer = null;
  let firedReminderKeys = new Set();

  function todayKey(d = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function loadItems() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
      if (Array.isArray(raw) && raw.length > 0) return raw;
    } catch {}
    // Seed default helpful starter habits once (never overwrites existing user data)
    const seededKey = 'oneoraPlannerSeeded_v1';
    if (!localStorage.getItem(seededKey)) {
      const now = Date.now();
      const starters = [
        { id: 'hb_water', kind: 'habit', title: 'Drink 8 Glasses of Water', category: 'Health', dateKey: todayKey(), status: 'active', streak: 1, completedDates: [], updatedAtMs: now },
        { id: 'hb_walk', kind: 'habit', title: '30 Min Morning Walk / Exercise', category: 'Fitness', dateKey: todayKey(), status: 'active', streak: 0, completedDates: [], updatedAtMs: now },
        { id: 'hb_read', kind: 'habit', title: 'Read 15 Pages Daily', category: 'Growth', dateKey: todayKey(), status: 'active', streak: 0, completedDates: [], updatedAtMs: now }
      ];
      localStorage.setItem(seededKey, '1');
      saveItems(starters);
      return starters;
    }
    return [];
  }

  function saveItems(items) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(items));
    } catch {}
    document.dispatchEvent(new CustomEvent('oneora:plannerchange'));
  }

  function loadWater() {
    try {
      const data = JSON.parse(localStorage.getItem(WATER_KEY) || '{}') || {};
      const key = todayKey();
      return { count: Number(data[key] || 0), goal: 8, map: data };
    } catch {
      return { count: 0, goal: 8, map: {} };
    }
  }

  function setWaterCount(next) {
    const w = loadWater();
    const clamped = Math.max(0, Math.min(20, next));
    w.map[todayKey()] = clamped;
    try { localStorage.setItem(WATER_KEY, JSON.stringify(w.map)); } catch {}
    render();
  }

  function makeId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  function notifyToast(title, msg, type = 'success') {
    if (global.utils && typeof global.utils.showToast === 'function') {
      global.utils.showToast(title, msg, type);
    }
  }

  function computeTriggerMs(dateKey, timeStr) {
    const dPart = dateKey || todayKey();
    const tPart = timeStr || '09:00';
    const dt = new Date(`${dPart}T${tPart}:00`);
    return isNaN(dt.getTime()) ? Date.now() + 60_000 : dt.getTime();
  }

  function scheduleNativeOrWebReminder(item) {
    if (item.kind !== 'reminder' || item.status !== 'active') return;
    const triggerMs = computeTriggerMs(item.dateKey, item.timeStr);
    if (global.AndroidBridge && typeof global.AndroidBridge.scheduleReminder === 'function') {
      try {
        global.AndroidBridge.scheduleReminder(
          String(item.id),
          String(item.title || 'ONEORA Reminder'),
          String(item.body || 'Scheduled reminder from ONEORA'),
          Number(triggerMs),
          String(item.repeat || 'none')
        );
      } catch (e) {
        console.warn('Android scheduleReminder failed:', e);
      }
    } else if ('Notification' in global && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }

  function cancelNativeReminder(id) {
    if (global.AndroidBridge && typeof global.AndroidBridge.cancelReminder === 'function') {
      try { global.AndroidBridge.cancelReminder(String(id)); } catch {}
    }
  }

  function startWebReminderWatcher() {
    if (reminderTimer) clearInterval(reminderTimer);
    reminderTimer = setInterval(() => {
      const now = Date.now();
      const items = loadItems();
      let changed = false;
      items.forEach((it) => {
        if (it.kind !== 'reminder' || it.status !== 'active') return;
        const trig = computeTriggerMs(it.dateKey, it.timeStr);
        const fireKey = `${it.id}:${it.dateKey}:${it.timeStr}`;
        if (trig <= now && now - trig < 120_000 && !firedReminderKeys.has(fireKey)) {
          firedReminderKeys.add(fireKey);
          notifyToast(`Reminder: ${it.title}`, it.body || `${it.dateKey} ${it.timeStr || ''}`, 'info');
          if ('Notification' in global && Notification.permission === 'granted') {
            try {
              new Notification(`ONEORA Reminder: ${it.title}`, {
                body: it.body || `Scheduled for ${it.timeStr || 'now'}`,
                icon: './pwa-192x192.png'
              });
            } catch {}
          }
          // Auto-advance repeating reminders
          if (it.repeat && it.repeat !== 'none') {
            const nextDate = new Date(trig);
            if (it.repeat === 'daily') nextDate.setDate(nextDate.getDate() + 1);
            else if (it.repeat === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
            else if (it.repeat === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
            else if (it.repeat === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);
            it.dateKey = todayKey(nextDate);
            it.updatedAtMs = Date.now();
            changed = true;
            scheduleNativeOrWebReminder(it);
          }
        }
      });
      if (changed) saveItems(items);
    }, 25_000);
  }

  function addItem(item) {
    const items = loadItems();
    const record = {
      id: makeId(item.kind ? item.kind.slice(0, 2) : 'pl'),
      kind: item.kind || 'task',
      title: String(item.title || '').trim().slice(0, 200),
      body: String(item.body || '').trim().slice(0, 4000),
      dateKey: item.dateKey || selectedDateKey || todayKey(),
      timeStr: String(item.timeStr || '').slice(0, 16),
      repeat: item.repeat || 'none',
      category: String(item.category || 'General').slice(0, 40),
      status: item.status || 'active',
      pinned: Boolean(item.pinned),
      streak: Number(item.streak || 0),
      checklist: Array.isArray(item.checklist) ? item.checklist.slice(0, 30) : [],
      completedDates: Array.isArray(item.completedDates) ? item.completedDates.slice(-90) : [],
      updatedAtMs: Date.now()
    };
    if (!record.title) return null;
    items.unshift(record);
    saveItems(items);
    if (record.kind === 'reminder') scheduleNativeOrWebReminder(record);
    return record;
  }

  function updateItem(id, updater) {
    const items = loadItems();
    const idx = items.findIndex((x) => x.id === id);
    if (idx < 0) return;
    items[idx] = { ...items[idx], ...updater(items[idx]), updatedAtMs: Date.now() };
    saveItems(items);
    if (items[idx].kind === 'reminder') {
      if (items[idx].status === 'active') scheduleNativeOrWebReminder(items[idx]);
      else cancelNativeReminder(id);
    }
  }

  function deleteItem(id) {
    const items = loadItems().filter((x) => x.id !== id);
    cancelNativeReminder(id);
    saveItems(items);
  }

  /* ========================================================================
     Rendering Engine
     ======================================================================== */
  function render() {
    const root = document.getElementById('oneoraPlannerRoot');
    if (!root) return;

    const items = loadItems();
    const tKey = todayKey();
    const todayEvents = items.filter((i) => (i.kind === 'event' || i.kind === 'reminder') && i.dateKey === tKey && i.status === 'active');
    const activeTasks = items.filter((i) => i.kind === 'task' && i.status === 'active');
    const habits = items.filter((i) => i.kind === 'habit' && i.status !== 'archived');
    const doneHabitsToday = habits.filter((h) => Array.isArray(h.completedDates) && h.completedDates.includes(tKey)).length;

    const tabs = [
      { id: 'calendar', label: 'Calendar' },
      { id: 'notes', label: 'Date Notes' },
      { id: 'reminders', label: 'Reminders' },
      { id: 'tasks', label: 'Tasks & Lists' },
      { id: 'habits', label: 'Habits' }
    ];

    root.innerHTML = `
      <div class="space-y-5">
        <!-- Header Summary Strip -->
        <div class="bg-white dark:bg-[#151B2F] rounded-3xl border border-[#E8EAF2] dark:border-[#232C4A] p-5 shadow-sm space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="text-xs font-semibold text-[#7457E8] dark:text-[#B4A5FF]">My Daily Life · Offline-First</p>
              <h2 class="text-2xl font-extrabold text-[#171B2C] dark:text-[#F5F6FC] tracking-tight">ONEORA Planner</h2>
            </div>
            <div class="flex items-center gap-2 text-xs font-semibold text-[#777F91] dark:text-[#A5ADC2] tabular-nums">
              <span><strong class="text-[#171B2C] dark:text-[#F5F6FC]">${todayEvents.length}</strong> today</span>
              <span aria-hidden="true">·</span>
              <span><strong class="text-[#171B2C] dark:text-[#F5F6FC]">${activeTasks.length}</strong> tasks</span>
              <span aria-hidden="true">·</span>
              <span><strong class="text-emerald-600 dark:text-emerald-400">${doneHabitsToday}/${habits.length}</strong> habits</span>
            </div>
          </div>

          <!-- Sub-Navigation Tabs -->
          <div class="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-0.5">
            ${tabs.map((t) => `
              <button type="button" data-planner-tab="${t.id}" class="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap min-h-[40px] transition ${
                activeSubTab === t.id
                  ? 'bg-[#7457E8] text-white shadow-sm'
                  : 'bg-[#F6F7FB] dark:bg-[#1D2540] text-[#777F91] dark:text-[#A5ADC2] hover:text-[#171B2C] dark:hover:text-white'
              }">${t.label}</button>
            `).join('')}
          </div>
        </div>

        <div id="oneoraPlannerBody">
          ${activeSubTab === 'calendar' ? renderCalendarView(items) : ''}
          ${activeSubTab === 'notes' ? renderNotesView(items) : ''}
          ${activeSubTab === 'reminders' ? renderRemindersView(items) : ''}
          ${activeSubTab === 'tasks' ? renderTasksView(items) : ''}
          ${activeSubTab === 'habits' ? renderHabitsView(items) : ''}
        </div>
      </div>
    `;

    bindEvents(root);
  }

  function renderCalendarView(items) {
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const tKey = todayKey();

    // Map items per date
    const byDate = {};
    items.forEach((it) => {
      if (!it.dateKey || it.status === 'archived') return;
      if (!byDate[it.dateKey]) byDate[it.dateKey] = [];
      byDate[it.dateKey].push(it);
    });

    const pad = (n) => String(n).padStart(2, '0');
    let calendarGridHtml = '';

    if (calViewMode === 'month') {
      const cells = [];
      for (let i = 0; i < firstDay; i++) cells.push('<div class="h-12 sm:h-14"></div>');
      for (let d = 1; d <= daysInMonth; d++) {
        const key = `${viewYear}-${pad(viewMonth + 1)}-${pad(d)}`;
        const dayItems = byDate[key] || [];
        const holiday = INDIAN_HOLIDAYS[key];
        const isToday = key === tKey;
        const isSel = key === selectedDateKey;
        cells.push(`
          <button type="button" data-cal-date="${key}" class="relative h-12 sm:h-14 rounded-xl border text-left p-1.5 flex flex-col justify-between transition ${
            isSel
              ? 'bg-[#293B80] text-white border-[#293B80] shadow-md'
              : isToday
                ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-400 text-indigo-900 dark:text-indigo-200'
                : 'bg-slate-50/70 dark:bg-[#151B2B] border-slate-200/70 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-indigo-400'
          }">
            <span class="text-xs font-extrabold tabular-nums">${d}</span>
            <div class="flex items-center gap-0.5 flex-wrap">
              ${holiday ? '<span class="w-1.5 h-1.5 rounded-full bg-orange-500" title="Holiday"></span>' : ''}
              ${dayItems.slice(0, 3).map((x) => {
                const c = x.kind === 'reminder' ? 'bg-rose-500' : x.kind === 'note' ? 'bg-amber-400' : 'bg-emerald-400';
                return `<span class="w-1.5 h-1.5 rounded-full ${c}"></span>`;
              }).join('')}
            </div>
          </button>
        `);
      }
      calendarGridHtml = `
        <div class="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-400 mb-1.5">
          <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
        </div>
        <div class="grid grid-cols-7 gap-1.5">${cells.join('')}</div>
      `;
    } else if (calViewMode === 'week') {
      const selDate = new Date(`${selectedDateKey}T00:00:00`);
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
          <button type="button" data-cal-date="${key}" class="p-3 rounded-2xl border text-left transition ${
            isSel ? 'bg-[#293B80] text-white border-[#293B80]' : 'bg-slate-50 dark:bg-[#151B2B] border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100'
          }">
            <div class="text-[11px] font-bold opacity-75">${cur.toLocaleDateString('en-IN', { weekday: 'short' })}</div>
            <div class="text-lg font-extrabold tabular-nums">${cur.getDate()}</div>
            <div class="text-[10px] mt-1 truncate ${isSel ? 'text-indigo-200' : 'text-indigo-600 dark:text-indigo-300'}">${holiday ? esc(holiday) : `${dayItems.length} items`}</div>
          </button>
        `);
      }
      calendarGridHtml = `<div class="grid grid-cols-2 sm:grid-cols-7 gap-2">${weekCards.join('')}</div>`;
    } else {
      calendarGridHtml = `
        <div class="p-4 rounded-2xl bg-indigo-50/70 dark:bg-[#151B2B] border border-indigo-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p class="text-xs font-bold text-indigo-600 dark:text-indigo-300">Daily Focus View</p>
            <h4 class="text-lg font-extrabold text-slate-900 dark:text-white">${esc(selectedDateKey)}</h4>
            ${INDIAN_HOLIDAYS[selectedDateKey] ? `<p class="text-xs font-bold text-orange-600 dark:text-orange-400 mt-0.5">Holiday: ${esc(INDIAN_HOLIDAYS[selectedDateKey])}</p>` : ''}
          </div>
          <input type="date" id="calDayPickerInput" value="${esc(selectedDateKey)}" class="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1A2138] text-xs font-bold text-slate-800 dark:text-white min-h-[40px]" />
        </div>
      `;
    }

    const selItems = byDate[selectedDateKey] || [];
    const selHoliday = INDIAN_HOLIDAYS[selectedDateKey];

    return `
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div class="lg:col-span-7 bg-white dark:bg-[#1A2138] rounded-3xl border border-indigo-100 dark:border-slate-800 p-4 sm:p-5 shadow-sm space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <button type="button" id="calPrevMonthBtn" class="w-9 h-9 rounded-xl bg-slate-100 dark:bg-[#151B2B] text-slate-700 dark:text-slate-200 font-extrabold hover:bg-indigo-100">‹</button>
              <h3 class="text-base font-extrabold text-slate-900 dark:text-white min-w-[140px] text-center">${monthNames[viewMonth]} ${viewYear}</h3>
              <button type="button" id="calNextMonthBtn" class="w-9 h-9 rounded-xl bg-slate-100 dark:bg-[#151B2B] text-slate-700 dark:text-slate-200 font-extrabold hover:bg-indigo-100">›</button>
              <button type="button" id="calTodayBtn" class="px-3 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold">Today</button>
            </div>
            <div class="flex items-center gap-1 bg-slate-100 dark:bg-[#151B2B] p-1 rounded-xl">
              ${['month', 'week', 'day'].map((m) => `
                <button type="button" data-cal-mode="${m}" class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold capitalize ${
                  calViewMode === m ? 'bg-white dark:bg-[#293B80] text-[#293B80] dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'
                }">${m}</button>
              `).join('')}
            </div>
          </div>

          ${calendarGridHtml}

          <div class="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-orange-500"></span>Indian Holiday</span>
            <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-400"></span>Event / Birthday</span>
            <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-amber-400"></span>Date Note</span>
            <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-rose-500"></span>Reminder</span>
          </div>
        </div>

        <!-- Selected Date Agenda & Quick Add -->
        <div class="lg:col-span-5 bg-white dark:bg-[#1A2138] rounded-3xl border border-indigo-100 dark:border-slate-800 p-4 sm:p-5 shadow-sm space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-[11px] font-bold uppercase tracking-wide text-indigo-600 dark:text-cyan-400">Selected Date</p>
              <h3 class="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">${esc(selectedDateKey)}</h3>
            </div>
            ${selHoliday ? `<span class="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300">${esc(selHoliday)}</span>` : ''}
          </div>

          <!-- Quick Add Event/Note/Reminder for Selected Date -->
          <form id="calQuickAddForm" class="space-y-2.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-[#151B2B] border border-slate-200/80 dark:border-slate-800">
            <div class="grid grid-cols-2 gap-2">
              <select id="calAddKind" class="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1A2138] text-xs font-bold text-slate-800 dark:text-white min-h-[40px]">
                <option value="event">Event / Birthday</option>
                <option value="note">Date Note</option>
                <option value="reminder">Reminder</option>
                <option value="task">Task</option>
              </select>
              <input type="time" id="calAddTime" value="09:00" class="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1A2138] text-xs font-bold text-slate-800 dark:text-white min-h-[40px]" />
            </div>
            <input type="text" id="calAddTitle" required maxlength="180" placeholder="Title (e.g. Mom's Birthday, Pay Electricity Bill)..." class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1A2138] text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-indigo-500 min-h-[42px]" />
            <textarea id="calAddBody" rows="2" maxlength="1000" placeholder="Optional details or notes..." class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1A2138] text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"></textarea>
            <button type="submit" class="w-full py-2.5 rounded-xl bg-[#293B80] hover:bg-indigo-700 text-white text-xs font-extrabold min-h-[42px] transition">+ Save to ${esc(selectedDateKey)}</button>
          </form>

          <!-- Agenda Items for Selected Date -->
          <div class="space-y-2 max-h-72 overflow-y-auto">
            ${selItems.length ? selItems.map((it) => `
              <div class="p-3 rounded-2xl bg-slate-50 dark:bg-[#151B2B] border border-slate-200/80 dark:border-slate-800 flex items-start justify-between gap-2">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide text-indigo-600 dark:text-cyan-400">
                    <span>${esc(it.kind)}</span>
                    ${it.timeStr ? `<span>· ${esc(it.timeStr)}</span>` : ''}
                  </div>
                  <p class="text-xs font-bold text-slate-900 dark:text-white mt-0.5 ${it.status === 'completed' ? 'line-through opacity-60' : ''}">${esc(it.title)}</p>
                  ${it.body ? `<p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 whitespace-pre-wrap">${esc(it.body)}</p>` : ''}
                </div>
                <div class="flex items-center gap-1 shrink-0">
                  <button type="button" data-pl-toggle="${it.id}" class="px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">${it.status === 'completed' ? 'Undo' : 'Done'}</button>
                  <button type="button" data-pl-del="${it.id}" class="px-2 py-1 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 text-[11px] font-bold">✕</button>
                </div>
              </div>
            `).join('') : '<p class="text-xs text-slate-400 text-center py-6">No events or notes scheduled for this date yet.</p>'}
          </div>
        </div>
      </div>
    `;
  }

  function renderNotesView(items) {
    const notes = items
      .filter((i) => (i.kind === 'note' || i.kind === 'voice_note') && i.status !== 'archived')
      .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || (b.updatedAtMs || 0) - (a.updatedAtMs || 0));

    return `
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <form id="oneoraNoteForm" class="lg:col-span-5 bg-white dark:bg-[#1A2138] rounded-3xl border border-indigo-100 dark:border-slate-800 p-5 shadow-sm space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-extrabold text-slate-900 dark:text-white">New Date-Wise Note</h3>
            <button type="button" id="oneoraVoiceNoteBtn" class="px-3 py-1.5 rounded-xl bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 text-xs font-bold min-h-[36px]">Voice Dictate</button>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <input type="date" id="noteDateInput" value="${esc(selectedDateKey)}" class="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#151B2B] text-xs font-bold text-slate-800 dark:text-white min-h-[42px]" />
            <input type="text" id="noteCatInput" placeholder="Tag (Work, Study, Home)" class="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#151B2B] text-xs font-semibold text-slate-800 dark:text-white min-h-[42px]" />
          </div>
          <input type="text" id="noteTitleInput" required maxlength="180" placeholder="Note Title..." class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#151B2B] text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 min-h-[44px]" />
          <textarea id="noteBodyInput" rows="4" maxlength="3800" placeholder="Write description, meeting notes, or checklist items (one per line starting with - )..." class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#151B2B] text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"></textarea>
          <label class="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <input type="checkbox" id="notePinCheck" class="rounded" /> Pin this note to top
          </label>
          <button type="submit" class="w-full py-3 rounded-xl bg-[#293B80] hover:bg-indigo-700 text-white text-xs font-extrabold min-h-[44px] transition">Save Note Offline</button>
        </form>

        <div class="lg:col-span-7 space-y-3">
          ${notes.length ? notes.map((n) => `
            <div class="bg-white dark:bg-[#1A2138] rounded-2xl border ${n.pinned ? 'border-amber-300 dark:border-amber-700' : 'border-indigo-100 dark:border-slate-800'} p-4 shadow-sm space-y-2">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <div class="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                    <span class="tabular-nums">${esc(n.dateKey || 'No date')}</span>
                    ${n.category ? `<span>· ${esc(n.category)}</span>` : ''}
                    ${n.pinned ? '<span class="text-amber-600 dark:text-amber-400">· Pinned</span>' : ''}
                  </div>
                  <h4 class="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">${esc(n.title)}</h4>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                  <button type="button" data-pl-pin="${n.id}" class="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[11px] font-bold">${n.pinned ? 'Unpin' : 'Pin'}</button>
                  <button type="button" data-pl-del="${n.id}" class="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 text-[11px] font-bold">Delete</button>
                </div>
              </div>
              ${n.body ? `<p class="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">${esc(n.body)}</p>` : ''}
            </div>
          `).join('') : '<div class="p-8 rounded-2xl bg-white dark:bg-[#1A2138] border border-indigo-100 dark:border-slate-800 text-center text-xs text-slate-400">No saved notes yet. Add your first date-wise or voice note on the left.</div>'}
        </div>
      </div>
    `;
  }

  function renderRemindersView(items) {
    const reminders = items
      .filter((i) => i.kind === 'reminder' && i.status !== 'archived')
      .sort((a, b) => computeTriggerMs(a.dateKey, a.timeStr) - computeTriggerMs(b.dateKey, b.timeStr));

    const notifSupported = 'Notification' in global || (global.AndroidBridge && typeof global.AndroidBridge.scheduleReminder === 'function');

    return `
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <form id="oneoraReminderForm" class="lg:col-span-5 bg-white dark:bg-[#1A2138] rounded-3xl border border-indigo-100 dark:border-slate-800 p-5 shadow-sm space-y-3">
          <div>
            <h3 class="text-base font-extrabold text-slate-900 dark:text-white">Set Reliable Reminder</h3>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">${
              global.AndroidBridge && typeof global.AndroidBridge.scheduleReminder === 'function'
                ? 'Backed by Android AlarmManager & reboot persistence.'
                : notifSupported
                  ? 'Uses Browser Notification Alerts while ONEORA is open.'
                  : 'In-app visual reminder alert.'
            }</p>
          </div>
          <div class="flex flex-wrap gap-1.5">
            ${['Medicine', 'Bill Payment', 'Birthday', 'Document Renewal', 'Meeting'].map((p) => `
              <button type="button" data-rem-preset="${p}" class="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-[#151B2B] text-indigo-700 dark:text-indigo-300 text-[11px] font-bold hover:bg-indigo-100">${p}</button>
            `).join('')}
          </div>
          <input type="text" id="remTitleInput" required maxlength="180" placeholder="Remind me to..." class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#151B2B] text-sm font-bold text-slate-900 dark:text-white min-h-[44px]" />
          <div class="grid grid-cols-2 gap-2">
            <input type="date" id="remDateInput" value="${esc(todayKey())}" class="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#151B2B] text-xs font-bold text-slate-800 dark:text-white min-h-[42px]" />
            <input type="time" id="remTimeInput" value="09:00" class="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#151B2B] text-xs font-bold text-slate-800 dark:text-white min-h-[42px]" />
          </div>
          <select id="remRepeatInput" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#151B2B] text-xs font-bold text-slate-800 dark:text-white min-h-[42px]">
            <option value="none">One-Time Reminder</option>
            <option value="daily">Repeat Daily</option>
            <option value="weekly">Repeat Weekly</option>
            <option value="monthly">Repeat Monthly</option>
            <option value="yearly">Repeat Yearly</option>
          </select>
          <input type="text" id="remBodyInput" maxlength="400" placeholder="Optional note or dosage / bill account info..." class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#151B2B] text-xs text-slate-800 dark:text-white min-h-[42px]" />
          <button type="submit" class="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-indigo-600 hover:brightness-105 text-white text-xs font-extrabold min-h-[44px] shadow-sm transition">Schedule Reminder</button>
        </form>

        <div class="lg:col-span-7 space-y-2.5">
          ${reminders.length ? reminders.map((r) => `
            <div class="bg-white dark:bg-[#1A2138] rounded-2xl border border-indigo-100 dark:border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div class="min-w-0">
                <div class="flex items-center gap-2 text-[11px] font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
                  <span>${esc(r.dateKey)} · ${esc(r.timeStr || '09:00')}</span>
                  ${r.repeat && r.repeat !== 'none' ? `<span class="text-indigo-600 dark:text-indigo-300 uppercase">· ${esc(r.repeat)}</span>` : ''}
                  ${r.status === 'completed' ? '<span class="text-emerald-600">· Completed</span>' : ''}
                </div>
                <h4 class="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5 ${r.status === 'completed' ? 'line-through opacity-60' : ''}">${esc(r.title)}</h4>
                ${r.body ? `<p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">${esc(r.body)}</p>` : ''}
              </div>
              <div class="flex flex-wrap items-center gap-1.5 shrink-0">
                <button type="button" data-rem-snooze="${r.id}" class="px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-[11px] font-bold min-h-[34px]">+15m</button>
                <button type="button" data-pl-toggle="${r.id}" class="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold min-h-[34px]">${r.status === 'completed' ? 'Reopen' : 'Done'}</button>
                <button type="button" data-pl-del="${r.id}" class="px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 text-[11px] font-bold min-h-[34px]">Delete</button>
              </div>
            </div>
          `).join('') : '<div class="p-8 rounded-2xl bg-white dark:bg-[#1A2138] border border-indigo-100 dark:border-slate-800 text-center text-xs text-slate-400">No reminders scheduled yet.</div>'}
        </div>
      </div>
    `;
  }

  function renderTasksView(items) {
    const tasks = items.filter((i) => i.kind === 'task' && i.status !== 'archived');
    return `
      <div class="bg-white dark:bg-[#1A2138] rounded-3xl border border-indigo-100 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <form id="oneoraTaskForm" class="flex flex-col sm:flex-row gap-2">
          <input type="text" id="taskTitleInput" required maxlength="180" placeholder="Add a to-do or shopping item..." class="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#151B2B] text-sm font-semibold text-slate-900 dark:text-white min-h-[44px]" />
          <select id="taskCatInput" class="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#151B2B] text-xs font-bold text-slate-800 dark:text-white min-h-[44px]">
            <option value="To-Do">To-Do</option>
            <option value="Shopping">Shopping List</option>
            <option value="Work">Work</option>
            <option value="Personal">Personal</option>
          </select>
          <button type="submit" class="px-5 py-2.5 rounded-xl bg-[#293B80] hover:bg-indigo-700 text-white text-xs font-extrabold min-h-[44px] whitespace-nowrap">+ Add Task</button>
        </form>

        <div class="space-y-2">
          ${tasks.length ? tasks.map((t) => `
            <div class="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-[#151B2B] border border-slate-200/80 dark:border-slate-800">
              <button type="button" data-pl-toggle="${t.id}" class="flex items-center gap-3 flex-1 min-w-0 text-left">
                <span class="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${t.status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600'}">
                  ${t.status === 'completed' ? '✓' : ''}
                </span>
                <div class="min-w-0">
                  <p class="text-sm font-bold text-slate-900 dark:text-white truncate ${t.status === 'completed' ? 'line-through opacity-55' : ''}">${esc(t.title)}</p>
                  <p class="text-[11px] text-slate-400">${esc(t.category || 'To-Do')} · ${esc(t.dateKey || '')}</p>
                </div>
              </button>
              <button type="button" data-pl-del="${t.id}" class="px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 text-xs font-bold">✕</button>
            </div>
          `).join('') : '<p class="text-xs text-slate-400 text-center py-6">All clear! Add tasks or grocery items above.</p>'}
        </div>
      </div>
    `;
  }

  function renderHabitsView(items) {
    const habits = items.filter((i) => i.kind === 'habit' && i.status !== 'archived');
    const tKey = todayKey();
    const water = loadWater();
    const waterPct = Math.min(100, Math.round((water.count / water.goal) * 100));

    return `
      <div class="space-y-4">
        <!-- Quick Water Counter Card -->
        <div class="bg-gradient-to-r from-sky-600 to-cyan-600 rounded-3xl p-5 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="space-y-1 flex-1">
            <p class="text-[11px] font-bold uppercase tracking-wider text-sky-100">Daily Hydration Tracker</p>
            <h3 class="text-xl font-extrabold tabular-nums">${water.count} / ${water.goal} Glasses Today</h3>
            <div class="w-full max-w-sm h-2 rounded-full bg-white/25 overflow-hidden mt-2">
              <div class="h-full bg-white rounded-full transition-all" style="width:${waterPct}%"></div>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button type="button" id="waterDecBtn" class="w-11 h-11 rounded-xl bg-white/20 hover:bg-white/30 text-white text-lg font-extrabold">−</button>
            <button type="button" id="waterIncBtn" class="px-4 h-11 rounded-xl bg-white text-sky-700 hover:bg-sky-50 text-xs font-extrabold">+1 Glass</button>
          </div>
        </div>

        <!-- Custom Habits List -->
        <div class="bg-white dark:bg-[#1A2138] rounded-3xl border border-indigo-100 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <form id="oneoraHabitForm" class="flex flex-col sm:flex-row gap-2">
            <input type="text" id="habitTitleInput" required maxlength="140" placeholder="Add a daily habit (e.g. Meditate 10 min, No Sugar)..." class="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#151B2B] text-sm font-semibold text-slate-900 dark:text-white min-h-[44px]" />
            <button type="submit" class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold min-h-[44px]">+ Add Habit</button>
          </form>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            ${habits.map((h) => {
              const dates = Array.isArray(h.completedDates) ? h.completedDates : [];
              const doneToday = dates.includes(tKey);
              const monthPrefix = tKey.slice(0, 7);
              const monthCount = dates.filter((d) => String(d).startsWith(monthPrefix)).length;
              const pct = Math.min(100, Math.round((monthCount / 30) * 100));
              return `
                <div class="p-4 rounded-2xl border ${doneToday ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800' : 'bg-slate-50 dark:bg-[#151B2B] border-slate-200 dark:border-slate-800'} space-y-3">
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <h4 class="text-sm font-extrabold text-slate-900 dark:text-white truncate">${esc(h.title)}</h4>
                      <p class="text-[11px] font-bold text-indigo-600 dark:text-indigo-300 mt-0.5 tabular-nums">Streak: ${Number(h.streak || 0)} days · ${monthCount} days this month</p>
                    </div>
                    <button type="button" data-pl-del="${h.id}" class="text-xs font-bold text-slate-400 hover:text-rose-500 px-1.5">✕</button>
                  </div>
                  <div class="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div class="h-full bg-emerald-500 rounded-full" style="width:${pct}%"></div>
                  </div>
                  <button type="button" data-habit-checkin="${h.id}" class="w-full py-2 rounded-xl text-xs font-extrabold min-h-[38px] transition ${
                    doneToday ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-[#1A2138] border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white hover:border-emerald-500'
                  }">${doneToday ? '✓ Completed Today' : 'Mark Done Today'}</button>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function bindEvents(root) {
    root.querySelectorAll('[data-planner-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeSubTab = btn.getAttribute('data-planner-tab') || 'calendar';
        render();
      });
    });

    root.querySelectorAll('[data-cal-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        calViewMode = btn.getAttribute('data-cal-mode') || 'month';
        render();
      });
    });

    root.querySelectorAll('[data-cal-date]').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedDateKey = btn.getAttribute('data-cal-date') || todayKey();
        render();
      });
    });

    const dayPicker = root.querySelector('#calDayPickerInput');
    if (dayPicker) {
      dayPicker.addEventListener('change', (e) => {
        if (e.target.value) {
          selectedDateKey = e.target.value;
          render();
        }
      });
    }

    const prevBtn = root.querySelector('#calPrevMonthBtn');
    if (prevBtn) prevBtn.addEventListener('click', () => {
      viewMonth -= 1;
      if (viewMonth < 0) { viewMonth = 11; viewYear -= 1; }
      render();
    });
    const nextBtn = root.querySelector('#calNextMonthBtn');
    if (nextBtn) nextBtn.addEventListener('click', () => {
      viewMonth += 1;
      if (viewMonth > 11) { viewMonth = 0; viewYear += 1; }
      render();
    });
    const todayBtn = root.querySelector('#calTodayBtn');
    if (todayBtn) todayBtn.addEventListener('click', () => {
      const now = new Date();
      viewYear = now.getFullYear();
      viewMonth = now.getMonth();
      selectedDateKey = todayKey(now);
      render();
    });

    const calForm = root.querySelector('#calQuickAddForm');
    if (calForm) {
      calForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const kind = root.querySelector('#calAddKind').value;
        const timeStr = root.querySelector('#calAddTime').value;
        const title = root.querySelector('#calAddTitle').value.trim();
        const body = root.querySelector('#calAddBody').value.trim();
        if (!title) return;
        addItem({ kind, title, body, dateKey: selectedDateKey, timeStr });
        notifyToast('Saved to Planner', `${title} added for ${selectedDateKey}.`, 'success');
        render();
      });
    }

    const noteForm = root.querySelector('#oneoraNoteForm');
    if (noteForm) {
      noteForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = root.querySelector('#noteTitleInput').value.trim();
        const body = root.querySelector('#noteBodyInput').value.trim();
        const dateKey = root.querySelector('#noteDateInput').value || todayKey();
        const category = root.querySelector('#noteCatInput').value.trim() || 'Note';
        const pinned = root.querySelector('#notePinCheck').checked;
        if (!title) return;
        addItem({ kind: 'note', title, body, dateKey, category, pinned });
        notifyToast('Note Saved', `"${title}" saved offline.`, 'success');
        render();
      });
    }

    const voiceBtn = root.querySelector('#oneoraVoiceNoteBtn');
    if (voiceBtn) {
      voiceBtn.addEventListener('click', () => {
        const SpeechRec = global.SpeechRecognition || global.webkitSpeechRecognition;
        if (!SpeechRec) {
          notifyToast('Voice Not Supported', 'Your browser does not support speech recognition.', 'info');
          return;
        }
        const rec = new SpeechRec();
        rec.lang = (global.PDFBondhuI18n && global.PDFBondhuI18n.getLocale) ? global.PDFBondhuI18n.getLocale() : 'en-IN';
        voiceBtn.textContent = 'Listening...';
        rec.onresult = (ev) => {
          const transcript = ev.results?.[0]?.[0]?.transcript || '';
          const bodyEl = root.querySelector('#noteBodyInput');
          const titleEl = root.querySelector('#noteTitleInput');
          if (bodyEl) bodyEl.value = (bodyEl.value ? `${bodyEl.value}\n` : '') + transcript;
          if (titleEl && !titleEl.value.trim()) titleEl.value = transcript.slice(0, 60);
        };
        rec.onend = () => { voiceBtn.textContent = 'Voice Dictate'; };
        rec.onerror = () => { voiceBtn.textContent = 'Voice Dictate'; };
        rec.start();
      });
    }

    root.querySelectorAll('[data-rem-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const preset = btn.getAttribute('data-rem-preset');
        const inp = root.querySelector('#remTitleInput');
        if (inp) { inp.value = `${preset}: `; inp.focus(); }
      });
    });

    const remForm = root.querySelector('#oneoraReminderForm');
    if (remForm) {
      remForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = root.querySelector('#remTitleInput').value.trim();
        const dateKey = root.querySelector('#remDateInput').value || todayKey();
        const timeStr = root.querySelector('#remTimeInput').value || '09:00';
        const repeat = root.querySelector('#remRepeatInput').value || 'none';
        const body = root.querySelector('#remBodyInput').value.trim();
        if (!title) return;
        addItem({ kind: 'reminder', title, dateKey, timeStr, repeat, body });
        notifyToast('Reminder Scheduled', `"${title}" set for ${dateKey} at ${timeStr}.`, 'success');
        render();
      });
    }

    const taskForm = root.querySelector('#oneoraTaskForm');
    if (taskForm) {
      taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = root.querySelector('#taskTitleInput').value.trim();
        const category = root.querySelector('#taskCatInput').value || 'To-Do';
        if (!title) return;
        addItem({ kind: 'task', title, category, dateKey: todayKey() });
        render();
      });
    }

    const habitForm = root.querySelector('#oneoraHabitForm');
    if (habitForm) {
      habitForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = root.querySelector('#habitTitleInput').value.trim();
        if (!title) return;
        addItem({ kind: 'habit', title, category: 'Habit', dateKey: todayKey(), streak: 0, completedDates: [] });
        render();
      });
    }

    const wInc = root.querySelector('#waterIncBtn');
    const wDec = root.querySelector('#waterDecBtn');
    if (wInc) wInc.addEventListener('click', () => setWaterCount(loadWater().count + 1));
    if (wDec) wDec.addEventListener('click', () => setWaterCount(loadWater().count - 1));

    root.querySelectorAll('[data-pl-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-pl-toggle');
        updateItem(id, (cur) => ({ status: cur.status === 'completed' ? 'active' : 'completed' }));
        render();
      });
    });

    root.querySelectorAll('[data-pl-pin]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-pl-pin');
        updateItem(id, (cur) => ({ pinned: !cur.pinned }));
        render();
      });
    });

    root.querySelectorAll('[data-rem-snooze]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-rem-snooze');
        const nextDt = new Date(Date.now() + 15 * 60_000);
        const pad = (n) => String(n).padStart(2, '0');
        updateItem(id, () => ({
          dateKey: todayKey(nextDt),
          timeStr: `${pad(nextDt.getHours())}:${pad(nextDt.getMinutes())}`,
          status: 'active'
        }));
        notifyToast('Snoozed 15 min', 'Reminder moved 15 minutes ahead.', 'info');
        render();
      });
    });

    root.querySelectorAll('[data-habit-checkin]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-habit-checkin');
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

    root.querySelectorAll('[data-pl-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        deleteItem(btn.getAttribute('data-pl-del'));
        render();
      });
    });
  }

  /* ========================================================================
     Public API for Home Dashboard, Universal Search & Firebase Sync
     ======================================================================== */
  const OneoraPlanner = {
    init() {
      startWebReminderWatcher();
      render();
    },
    render,
    openSubTab(tab) {
      activeSubTab = tab || 'calendar';
      if (typeof global.openPdfBondhuTool === 'function') global.openPdfBondhuTool('oneoraPlannerTab');
      render();
    },
    getSummary() {
      const items = loadItems();
      const tKey = todayKey();
      const todayEvents = items.filter((i) => (i.kind === 'event' || i.kind === 'task') && i.dateKey === tKey && i.status === 'active');
      const upcomingReminders = items
        .filter((i) => i.kind === 'reminder' && i.status === 'active')
        .sort((a, b) => computeTriggerMs(a.dateKey, a.timeStr) - computeTriggerMs(b.dateKey, b.timeStr));
      const notesCount = items.filter((i) => i.kind === 'note' && i.status !== 'archived').length;
      const water = loadWater();
      return {
        todayKey: tKey,
        todayHoliday: INDIAN_HOLIDAYS[tKey] || '',
        todayEvents,
        upcomingReminders,
        notesCount,
        waterCount: water.count,
        waterGoal: water.goal,
        totalActiveTasks: items.filter((i) => i.kind === 'task' && i.status === 'active').length
      };
    },
    search(q) {
      const clean = String(q || '').trim().toLowerCase();
      if (!clean) return [];
      return loadItems()
        .filter((i) => i.status !== 'archived' && `${i.title} ${i.body || ''} ${i.category || ''} ${i.dateKey || ''}`.toLowerCase().includes(clean))
        .slice(0, 5)
        .map((i) => ({
          id: i.id,
          kind: i.kind,
          title: i.title,
          subtitle: `${i.kind.toUpperCase()} · ${i.dateKey || 'No date'} ${i.timeStr || ''}`.trim(),
          action: () => {
            activeSubTab = i.kind === 'reminder' ? 'reminders' : i.kind === 'note' ? 'notes' : i.kind === 'habit' ? 'habits' : i.kind === 'task' ? 'tasks' : 'calendar';
            if (i.dateKey) selectedDateKey = i.dateKey;
            if (typeof global.openPdfBondhuTool === 'function') global.openPdfBondhuTool('oneoraPlannerTab');
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
          map.set(r.id, { ...cur, ...r });
        }
      });
      saveItems(Array.from(map.values()));
      render();
    }
  };

  global.OneoraPlanner = OneoraPlanner;
  document.addEventListener('DOMContentLoaded', () => OneoraPlanner.init());
})(window);
