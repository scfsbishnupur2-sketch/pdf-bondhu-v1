/**
 * ONEORA Smart Hub — Cross-Module Suggestions & Guided Workflows
 * Connects Documents, Document Expiries, Calendar/Planner, Money Manager, and ONEORA AI.
 *
 * Strict User-Control Guarantee:
 * - Never creates, edits, deletes, or shares any personal record automatically.
 * - Every suggested action requires an explicit tap to confirm or dismiss.
 */
(function (global) {
  const DISMISSED_KEY = 'oneoraSmartHubDismissed_v1';

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function toast(title, msg, type = 'success') {
    if (global.utils && typeof global.utils.showToast === 'function') {
      global.utils.showToast(title, msg, type);
    }
  }

  function loadDismissed() {
    try {
      const arr = JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]');
      return new Set(Array.isArray(arr) ? arr : []);
    } catch {
      return new Set();
    }
  }

  function dismissSuggestion(id) {
    const set = loadDismissed();
    set.add(id);
    try {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(set).slice(-40)));
    } catch {}
    renderSmartHub();
  }

  function getTodayKey() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function addPlannerReminderConfirmed(title, dateKey, timeStr = '09:00', kind = 'reminder') {
    const key = 'oneoraPlannerItems_v1';
    let list = [];
    try { list = JSON.parse(localStorage.getItem(key) || '[]'); } catch {}
    if (!Array.isArray(list)) list = [];

    const id = `sh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    list.unshift({
      id,
      kind,
      title: String(title || 'Reminder').slice(0, 180),
      body: 'Added via ONEORA Smart Hub with your confirmation.',
      dateKey: dateKey || getTodayKey(),
      timeStr,
      repeat: 'none',
      category: 'Smart Hub',
      status: 'active',
      updatedAtMs: Date.now()
    });
    try { localStorage.setItem(key, JSON.stringify(list)); } catch {}
    document.dispatchEvent(new CustomEvent('oneora:plannerchange'));
    toast('Added to Planner', `"${title}" scheduled for ${dateKey || getTodayKey()}.`, 'success');
  }

  function addMoneyBudgetConfirmed(title, amount, category = 'Travel', recordType = 'expense') {
    const key = 'oneoraFinanceRecords_v1';
    let list = [];
    try { list = JSON.parse(localStorage.getItem(key) || '[]'); } catch {}
    if (!Array.isArray(list)) list = [];

    list.unshift({
      id: `fin_sh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      recordType,
      title: String(title || 'Entry').slice(0, 180),
      amount: Math.max(0, Number(amount || 0)),
      targetAmount: recordType === 'budget' ? Math.max(0, Number(amount || 0)) : 0,
      category,
      paymentMethod: 'upi',
      dateKey: getTodayKey(),
      notes: 'Added via ONEORA Smart Hub with your confirmation.',
      status: 'active',
      updatedAtMs: Date.now()
    });
    try { localStorage.setItem(key, JSON.stringify(list)); } catch {}
    document.dispatchEvent(new CustomEvent('oneora:moneychange'));
    toast('Saved in Money Manager', `"${title}" (₹${Number(amount || 0).toLocaleString('en-IN')}) added.`, 'success');
  }

  function computeRealSuggestions() {
    const dismissed = loadDismissed();
    const suggestions = [];

    // 1. Document Expiries -> Suggest creating a Planner Reminder
    const expiries = global.OneoraExtras?.getUpcomingExpiries ? global.OneoraExtras.getUpcomingExpiries() : [];
    const plannerSummary = global.OneoraPlanner?.getSummary ? global.OneoraPlanner.getSummary() : { todayEvents: [], upcomingReminders: [] };
    const existingReminderTitles = new Set((plannerSummary.upcomingReminders || []).map((r) => String(r.title || '').toLowerCase()));

    expiries.slice(0, 1).forEach((ex) => {
      const sid = `exp_${ex.name}_${ex.date}`;
      if (dismissed.has(sid)) return;
      if (existingReminderTitles.has(`renew ${String(ex.name || '').toLowerCase()}`)) return;
      suggestions.push({
        id: sid,
        module: 'Vault → Planner',
        title: `Renew ${ex.name} before ${ex.date}`,
        desc: 'Detected an upcoming document expiry. Confirm to create a calendar reminder.',
        cta: 'Create Reminder',
        onConfirm: () => {
          addPlannerReminderConfirmed(`Renew ${ex.name}`, ex.date, '09:30', 'reminder');
          dismissSuggestion(sid);
        }
      });
    });

    // 2. Recurring Bills / Subscriptions -> Suggest Renewal Reminder
    try {
      const finList = JSON.parse(localStorage.getItem('oneoraFinanceRecords_v1') || '[]');
      const bills = Array.isArray(finList) ? finList.filter((r) => r.recordType === 'bill' && r.status === 'active') : [];
      bills.slice(0, 1).forEach((bill) => {
        const sid = `bill_${bill.id}`;
        if (dismissed.has(sid)) return;
        const dueDay = Number(bill.dueDay || 1);
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const dueDateKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(Math.min(28, Math.max(1, dueDay)))}`;
        suggestions.push({
          id: sid,
          module: 'Money → Planner',
          title: `Set renewal alert for ${bill.title}`,
          desc: `Recurring ₹${Number(bill.amount || 0).toLocaleString('en-IN')} bill due around day ${dueDay}.`,
          cta: 'Add Reminder',
          onConfirm: () => {
            addPlannerReminderConfirmed(`Pay ${bill.title} (₹${bill.amount})`, dueDateKey, '10:00', 'reminder');
            dismissSuggestion(sid);
          }
        });
      });
    } catch {}

    // 3. Today's Event -> Suggest Prep Task
    const todayEvent = (plannerSummary.todayEvents || []).find((e) => e.kind === 'event');
    if (todayEvent) {
      const sid = `evt_${todayEvent.id}`;
      if (!dismissed.has(sid)) {
        suggestions.push({
          id: sid,
          module: 'Calendar → Tasks',
          title: `Add prep checklist for "${todayEvent.title}"`,
          desc: 'Keep related follow-up tasks attached to today’s schedule.',
          cta: 'Add Prep Task',
          onConfirm: () => {
            addPlannerReminderConfirmed(`Prepare for ${todayEvent.title}`, getTodayKey(), '08:30', 'task');
            dismissSuggestion(sid);
          }
        });
      }
    }

    // 4. Financial Data Available -> Suggest AI Spending Insights
    const moneySummary = global.OneoraMoney?.getSummary ? global.OneoraMoney.getSummary() : null;
    if (moneySummary && Number(moneySummary.monthExpense || 0) > 0) {
      const sid = `ai_spend_${new Date().toISOString().slice(0, 7)}`;
      if (!dismissed.has(sid)) {
        suggestions.push({
          id: sid,
          module: 'Money → ONEORA AI',
          title: 'Review monthly spending insights',
          desc: `₹${Number(moneySummary.monthExpense).toLocaleString('en-IN')} logged this month. Open ONEORA AI for tailored saving tips.`,
          cta: 'Open AI Insights',
          onConfirm: () => {
            if (global.OneoraExtras && typeof global.OneoraExtras.openAi === 'function') {
              global.OneoraExtras.openAi();
              toast('ONEORA AI Ready', 'Tap "Analyze My Expenses" in AI Assistant when ready.', 'info');
            }
          }
        });
      }
    }

    return suggestions.slice(0, 2);
  }

  /* Guided Confirmation Modal for Bill->Expense and Travel->Packing+Budget */
  function openSmartWorkflowModal(mode) {
    let modal = document.getElementById('oneoraSmartHubModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'oneoraSmartHubModal';
      modal.className = 'fixed inset-0 z-[92] hidden items-center justify-center bg-black/55 backdrop-blur-sm p-4';
      modal.addEventListener('click', (e) => { if (e.target === modal) closeWorkflowModal(); });
      document.body.appendChild(modal);
    }

    if (mode === 'bill_expense') {
      modal.innerHTML = `
        <div class="w-full max-w-md bg-white dark:bg-[#151B2F] rounded-[24px] border border-[#E8EAF2] dark:border-[#232C4A] p-5 shadow-2xl space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-[11px] font-bold text-[#7457E8] dark:text-[#9FAFFF]">Smart Hub · Documents → Money</p>
              <h3 class="text-base font-extrabold text-[#171B2C] dark:text-[#F5F6FC]">Log Scanned Bill as Expense</h3>
            </div>
            <button type="button" id="shCloseBtn" class="w-9 h-9 rounded-xl bg-[#F6F7FB] dark:bg-[#1D2540] text-sm font-bold">✕</button>
          </div>
          <form id="shBillForm" class="space-y-3">
            <div>
              <label class="block text-xs font-semibold text-[#777F91] mb-1">Merchant / Bill Title</label>
              <input id="shBillTitle" type="text" required maxlength="120" placeholder="e.g. Electricity Bill or Grocery Receipt" class="w-full px-3.5 py-2.5 rounded-xl border border-[#E8EAF2] dark:border-[#232C4A] bg-[#F6F7FB] dark:bg-[#0C1020] text-sm" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-[#777F91] mb-1">Amount (₹)</label>
                <input id="shBillAmount" type="number" min="1" step="0.01" required placeholder="450" class="w-full px-3.5 py-2.5 rounded-xl border border-[#E8EAF2] dark:border-[#232C4A] bg-[#F6F7FB] dark:bg-[#0C1020] text-sm tabular-nums" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-[#777F91] mb-1">Category</label>
                <select id="shBillCat" class="w-full px-3 py-2.5 rounded-xl border border-[#E8EAF2] dark:border-[#232C4A] bg-[#F6F7FB] dark:bg-[#0C1020] text-sm">
                  <option>Bills &amp; Utilities</option>
                  <option>Groceries</option>
                  <option>Food &amp; Dining</option>
                  <option>Health &amp; Medicine</option>
                  <option>Shopping</option>
                  <option>Travel</option>
                </select>
              </div>
            </div>
            <div class="flex items-center justify-end gap-2 pt-2">
              <button type="button" id="shCancelBtn" class="px-4 py-2.5 rounded-xl bg-[#F6F7FB] dark:bg-[#1D2540] text-xs font-bold min-h-[42px]">Cancel</button>
              <button type="submit" class="px-4 py-2.5 rounded-xl bg-[#7457E8] hover:bg-[#5E42D4] text-white text-xs font-bold min-h-[42px]">Confirm &amp; Add Expense</button>
            </div>
          </form>
        </div>
      `;
      modal.querySelector('#shCloseBtn')?.addEventListener('click', closeWorkflowModal);
      modal.querySelector('#shCancelBtn')?.addEventListener('click', closeWorkflowModal);
      modal.querySelector('#shBillForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = modal.querySelector('#shBillTitle').value.trim();
        const amount = Number(modal.querySelector('#shBillAmount').value || 0);
        const cat = modal.querySelector('#shBillCat').value;
        if (!title || amount <= 0) return;
        addMoneyBudgetConfirmed(title, amount, cat, 'expense');
        closeWorkflowModal();
      });
    } else if (mode === 'travel_plan') {
      modal.innerHTML = `
        <div class="w-full max-w-md bg-white dark:bg-[#151B2F] rounded-[24px] border border-[#E8EAF2] dark:border-[#232C4A] p-5 shadow-2xl space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-[11px] font-bold text-[#7457E8] dark:text-[#9FAFFF]">Smart Hub · Travel → Planner &amp; Money</p>
              <h3 class="text-base font-extrabold text-[#171B2C] dark:text-[#F5F6FC]">Create Trip Checklist &amp; Budget</h3>
            </div>
            <button type="button" id="shCloseBtn" class="w-9 h-9 rounded-xl bg-[#F6F7FB] dark:bg-[#1D2540] text-sm font-bold">✕</button>
          </div>
          <form id="shTravelForm" class="space-y-3">
            <div>
              <label class="block text-xs font-semibold text-[#777F91] mb-1">Destination / Trip Name</label>
              <input id="shTripDest" type="text" required maxlength="100" placeholder="e.g. Darjeeling Weekend Trip" class="w-full px-3.5 py-2.5 rounded-xl border border-[#E8EAF2] dark:border-[#232C4A] bg-[#F6F7FB] dark:bg-[#0C1020] text-sm" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-[#777F91] mb-1">Travel Date</label>
                <input id="shTripDate" type="date" value="${getTodayKey()}" required class="w-full px-3 py-2.5 rounded-xl border border-[#E8EAF2] dark:border-[#232C4A] bg-[#F6F7FB] dark:bg-[#0C1020] text-sm tabular-nums" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-[#777F91] mb-1">Planned Budget (₹)</label>
                <input id="shTripBudget" type="number" min="0" placeholder="8000" class="w-full px-3.5 py-2.5 rounded-xl border border-[#E8EAF2] dark:border-[#232C4A] bg-[#F6F7FB] dark:bg-[#0C1020] text-sm tabular-nums" />
              </div>
            </div>
            <p class="text-[11px] text-[#777F91] dark:text-[#A5ADC2]">On confirmation, ONEORA adds a packing checklist task to your Planner and optionally logs a Travel Budget goal in Money Manager.</p>
            <div class="flex items-center justify-end gap-2 pt-2">
              <button type="button" id="shCancelBtn" class="px-4 py-2.5 rounded-xl bg-[#F6F7FB] dark:bg-[#1D2540] text-xs font-bold min-h-[42px]">Cancel</button>
              <button type="submit" class="px-4 py-2.5 rounded-xl bg-[#7457E8] hover:bg-[#5E42D4] text-white text-xs font-bold min-h-[42px]">Confirm &amp; Create</button>
            </div>
          </form>
        </div>
      `;
      modal.querySelector('#shCloseBtn')?.addEventListener('click', closeWorkflowModal);
      modal.querySelector('#shCancelBtn')?.addEventListener('click', closeWorkflowModal);
      modal.querySelector('#shTravelForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const dest = modal.querySelector('#shTripDest').value.trim();
        const dateVal = modal.querySelector('#shTripDate').value || getTodayKey();
        const budget = Number(modal.querySelector('#shTripBudget').value || 0);
        if (!dest) return;
        addPlannerReminderConfirmed(`Packing List: ${dest} (ID, Chargers, Tickets, Medicines)`, dateVal, '08:00', 'task');
        if (budget > 0) {
          addMoneyBudgetConfirmed(`Trip Budget: ${dest}`, budget, 'Travel', 'budget');
        }
        closeWorkflowModal();
      });
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  function closeWorkflowModal() {
    const modal = document.getElementById('oneoraSmartHubModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }

  function renderSmartHub() {
    const container = document.getElementById('homeSmartHubContainer');
    if (!container) return;

    const suggestions = computeRealSuggestions();

    container.innerHTML = `
      <div class="bg-white dark:bg-[#151B2F] rounded-[22px] border border-[#E8EAF2] dark:border-[#232C4A] p-4 sm:p-5 space-y-3.5 shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 class="text-sm font-bold text-[#171B2C] dark:text-[#F5F6FC]">ONEORA Smart Hub</h2>
            <p class="text-[11px] text-[#777F91] dark:text-[#A5ADC2]">Connected actions across Documents, Planner, Money &amp; AI · Nothing changes without your tap</p>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" id="smartHubBillBtn" class="px-3 py-1.5 rounded-xl bg-[#F6F7FB] dark:bg-[#1D2540] border border-[#E8EAF2] dark:border-[#232C4A] hover:border-[#7457E8] text-[11px] font-semibold text-[#171B2C] dark:text-[#F5F6FC] min-h-[36px] transition">Bill → Expense</button>
            <button type="button" id="smartHubTripBtn" class="px-3 py-1.5 rounded-xl bg-[#F6F7FB] dark:bg-[#1D2540] border border-[#E8EAF2] dark:border-[#232C4A] hover:border-[#7457E8] text-[11px] font-semibold text-[#171B2C] dark:text-[#F5F6FC] min-h-[36px] transition">Trip → Checklist</button>
          </div>
        </div>

        ${suggestions.length ? `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            ${suggestions.map((s, idx) => `
              <div class="p-3.5 rounded-2xl bg-[#F6F7FB] dark:bg-[#0C1020] border border-[#E8EAF2] dark:border-[#232C4A] flex flex-col justify-between gap-2.5">
                <div>
                  <p class="text-[10px] font-bold uppercase tracking-wider text-[#7457E8] dark:text-[#9FAFFF]">${esc(s.module)}</p>
                  <p class="text-xs font-bold text-[#171B2C] dark:text-[#F5F6FC] mt-0.5">${esc(s.title)}</p>
                  <p class="text-[11px] text-[#777F91] dark:text-[#A5ADC2] mt-0.5">${esc(s.desc)}</p>
                </div>
                <div class="flex items-center gap-2">
                  <button type="button" data-sh-confirm="${idx}" class="px-3 py-1.5 rounded-lg bg-[#7457E8] hover:bg-[#5E42D4] text-white text-[11px] font-semibold min-h-[34px] transition">${esc(s.cta)}</button>
                  <button type="button" data-sh-dismiss="${esc(s.id)}" class="px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-[#777F91] hover:text-[#171B2C] dark:hover:text-white min-h-[34px]">Dismiss</button>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;

    container.querySelector('#smartHubBillBtn')?.addEventListener('click', () => openSmartWorkflowModal('bill_expense'));
    container.querySelector('#smartHubTripBtn')?.addEventListener('click', () => openSmartWorkflowModal('travel_plan'));

    container.querySelectorAll('[data-sh-confirm]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-sh-confirm'));
        if (suggestions[idx] && typeof suggestions[idx].onConfirm === 'function') {
          suggestions[idx].onConfirm();
        }
      });
    });

    container.querySelectorAll('[data-sh-dismiss]').forEach((btn) => {
      btn.addEventListener('click', () => {
        dismissSuggestion(btn.getAttribute('data-sh-dismiss'));
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderSmartHub();
    document.addEventListener('oneora:plannerchange', renderSmartHub);
    document.addEventListener('oneora:moneychange', renderSmartHub);
  });

  global.OneoraSmartHub = {
    refresh: renderSmartHub,
    openBillToExpense: () => openSmartWorkflowModal('bill_expense'),
    openTravelPlanner: () => openSmartWorkflowModal('travel_plan')
  };
})(window);
