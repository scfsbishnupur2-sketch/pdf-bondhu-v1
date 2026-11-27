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
var __objRest = (source, exclude) => {
  var target = {};
  for (var prop in source)
    if (__hasOwnProp.call(source, prop) && exclude.indexOf(prop) < 0)
      target[prop] = source[prop];
  if (source != null && __getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(source)) {
      if (exclude.indexOf(prop) < 0 && __propIsEnum.call(source, prop))
        target[prop] = source[prop];
    }
  return target;
};
(function(global) {
  const STORE_KEY = "oneoraFinanceRecords_v1";
  const CURRENCY = "₹";
  const EXPENSE_CATEGORIES = [
    "Food & Dining",
    "Groceries",
    "Transport & Fuel",
    "Bills & Utilities",
    "Mobile & Internet",
    "Rent & Housing",
    "Shopping",
    "Health & Medicine",
    "Education",
    "Entertainment",
    "Travel",
    "Family & Gifts",
    "EMI & Loans",
    "Investments & SIP",
    "Other"
  ];
  const INCOME_CATEGORIES = ["Salary", "Business", "Freelance", "Interest & Dividends", "Rental Income", "Gift / Refund", "Other Income"];
  const PAYMENT_METHODS = [
    { id: "upi", label: "UPI" },
    { id: "cash", label: "Cash" },
    { id: "bank", label: "Bank Transfer" },
    { id: "debit", label: "Debit Card" },
    { id: "credit", label: "Credit Card" }
  ];
  let activeSubTab = "overview";
  let txFilterType = "all";
  let txSearchTerm = "";
  let pendingReceiptDataUrl = "";
  function todayKey(d = /* @__PURE__ */ new Date()) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  function esc(s) {
    return String(s != null ? s : "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function fmtMoney(n) {
    const num = Number(n || 0);
    return `${CURRENCY}${num.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  }
  function loadRecords() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch (e) {
      return [];
    }
  }
  function saveRecords(list) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(list));
    } catch (e) {
    }
    document.dispatchEvent(new CustomEvent("oneora:moneychange"));
  }
  function makeId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }
  function notifyToast(title, msg, type = "success") {
    if (global.utils && typeof global.utils.showToast === "function") {
      global.utils.showToast(title, msg, type);
    }
  }
  function addRecord(rec) {
    const list = loadRecords();
    const entry = {
      id: makeId(rec.recordType ? rec.recordType.slice(0, 3) : "fin"),
      recordType: rec.recordType || "expense",
      title: String(rec.title || rec.category || "Entry").trim().slice(0, 200),
      amount: Math.max(0, Number(rec.amount || 0)),
      targetAmount: Math.max(0, Number(rec.targetAmount || 0)),
      category: String(rec.category || "Other").slice(0, 60),
      paymentMethod: rec.paymentMethod || "upi",
      dateKey: rec.dateKey || todayKey(),
      notes: String(rec.notes || "").trim().slice(0, 1e3),
      counterparty: String(rec.counterparty || "").trim().slice(0, 100),
      dueDay: Number(rec.dueDay || 0),
      recurring: Boolean(rec.recurring),
      receiptThumb: rec.receiptThumb || "",
      status: rec.status || "active",
      updatedAtMs: Date.now()
    };
    list.unshift(entry);
    saveRecords(list);
    return entry;
  }
  function updateRecord(id, updater) {
    const list = loadRecords();
    const idx = list.findIndex((r) => r.id === id);
    if (idx < 0) return;
    list[idx] = __spreadProps(__spreadValues(__spreadValues({}, list[idx]), updater(list[idx])), { updatedAtMs: Date.now() });
    saveRecords(list);
  }
  function deleteRecord(id) {
    saveRecords(loadRecords().filter((r) => r.id !== id));
  }
  function computeMetrics(records) {
    const monthPrefix = todayKey().slice(0, 7);
    const tKey = todayKey();
    let totalIncome = 0;
    let totalExpense = 0;
    let monthIncome = 0;
    let monthExpense = 0;
    let todayExpense = 0;
    const catSpend = {};
    records.forEach((r) => {
      if (r.recordType === "income") {
        totalIncome += Number(r.amount || 0);
        if (String(r.dateKey || "").startsWith(monthPrefix)) monthIncome += Number(r.amount || 0);
      } else if (r.recordType === "expense") {
        totalExpense += Number(r.amount || 0);
        if (String(r.dateKey || "").startsWith(monthPrefix)) {
          monthExpense += Number(r.amount || 0);
          catSpend[r.category] = (catSpend[r.category] || 0) + Number(r.amount || 0);
        }
        if (r.dateKey === tKey) todayExpense += Number(r.amount || 0);
      }
    });
    const months = [];
    const now = /* @__PURE__ */ new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const pad = (n) => String(n).padStart(2, "0");
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
      const label = d.toLocaleDateString("en-IN", { month: "short" });
      let inc = 0;
      let exp = 0;
      records.forEach((r) => {
        if (!String(r.dateKey || "").startsWith(key)) return;
        if (r.recordType === "income") inc += Number(r.amount || 0);
        if (r.recordType === "expense") exp += Number(r.amount || 0);
      });
      months.push({ key, label, inc, exp });
    }
    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      monthIncome,
      monthExpense,
      monthSavings: monthIncome - monthExpense,
      todayExpense,
      catSpend,
      months
    };
  }
  function exportCsv() {
    const records = loadRecords().filter((r) => r.recordType === "expense" || r.recordType === "income");
    if (!records.length) {
      notifyToast("Nothing to Export", "Add at least one income or expense entry first.", "info");
      return;
    }
    const headers = ["Date", "Type", "Title", "Category", "Payment Method", "Amount (INR)", "Notes"];
    const rows = records.map((r) => [
      r.dateKey,
      r.recordType,
      r.title,
      r.category,
      r.paymentMethod,
      r.amount,
      r.notes || ""
    ].map((v) => `"${String(v != null ? v : "").replace(/"/g, '""')}"`).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    global.utils.downloadBlob(blob, `ONEORA_Finance_Report_${todayKey()}.csv`);
    notifyToast("CSV Exported", "Your financial report CSV has been saved.", "success");
  }
  function exportExcel() {
    if (!global.XLSX) {
      notifyToast("Excel Engine Loading", "Spreadsheet library is still loading. Try CSV export.", "error");
      return;
    }
    const records = loadRecords().filter((r) => r.recordType === "expense" || r.recordType === "income");
    if (!records.length) {
      notifyToast("Nothing to Export", "Add at least one income or expense entry first.", "info");
      return;
    }
    const rows = records.map((r) => ({
      Date: r.dateKey,
      Type: r.recordType.toUpperCase(),
      Title: r.title,
      Category: r.category,
      Payment: String(r.paymentMethod || "").toUpperCase(),
      Amount_INR: Number(r.amount || 0),
      Notes: r.notes || ""
    }));
    const wb = global.XLSX.utils.book_new();
    const ws = global.XLSX.utils.json_to_sheet(rows);
    global.XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    const out = global.XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    global.utils.downloadBlob(blob, `ONEORA_Finance_Report_${todayKey()}.xlsx`);
    notifyToast("Excel Exported", "Your financial report (.xlsx) has been saved.", "success");
  }
  async function exportPdf() {
    if (!global.PDFLib) {
      notifyToast("PDF Engine Loading", "PDF library is still loading.", "error");
      return;
    }
    const records = loadRecords().filter((r) => r.recordType === "expense" || r.recordType === "income");
    if (!records.length) {
      notifyToast("Nothing to Export", "Add at least one income or expense entry first.", "info");
      return;
    }
    try {
      const m = computeMetrics(records);
      const pdfDoc = await global.PDFLib.PDFDocument.create();
      const font = await pdfDoc.embedFont(global.PDFLib.StandardFonts.Helvetica);
      const bold = await pdfDoc.embedFont(global.PDFLib.StandardFonts.HelveticaBold);
      let page = pdfDoc.addPage([595, 842]);
      let y = 800;
      const drawSafe = (text, x, yPos, size = 10, f = font, color = global.PDFLib.rgb(0.1, 0.12, 0.2)) => {
        const clean = String(text != null ? text : "").replace(/[^\x20-\x7E]/g, "");
        page.drawText(clean, { x, y: yPos, size, font: f, color });
      };
      drawSafe("ONEORA - Personal Finance Statement", 42, y, 16, bold, global.PDFLib.rgb(0.16, 0.23, 0.5));
      y -= 20;
      drawSafe(`Generated on ${todayKey()} | Total Income: Rs. ${m.totalIncome.toFixed(2)} | Total Expense: Rs. ${m.totalExpense.toFixed(2)} | Balance: Rs. ${m.balance.toFixed(2)}`, 42, y, 9.5);
      y -= 24;
      drawSafe("Date         Type      Category              Payment   Amount(Rs.)  Title", 42, y, 9, bold);
      y -= 14;
      for (const r of records.slice(0, 120)) {
        if (y < 52) {
          page = pdfDoc.addPage([595, 842]);
          y = 800;
        }
        const line = `${String(r.dateKey).padEnd(12)} ${String(r.recordType).toUpperCase().padEnd(9)} ${String(r.category).slice(0, 18).padEnd(20)} ${String(r.paymentMethod).toUpperCase().padEnd(9)} ${Number(r.amount).toFixed(2).padStart(10)}   ${String(r.title).slice(0, 28)}`;
        drawSafe(line, 42, y, 8.5, font);
        y -= 14;
      }
      const bytes = await pdfDoc.save();
      const blob = new Blob([bytes], { type: "application/pdf" });
      global.utils.downloadBlob(blob, `ONEORA_Finance_Statement_${todayKey()}.pdf`);
      notifyToast("PDF Report Ready", "Your financial statement PDF has been saved.", "success");
    } catch (err) {
      notifyToast("PDF Export Failed", err instanceof Error ? err.message : "Could not build PDF.", "error");
    }
  }
  function render() {
    const root = document.getElementById("oneoraMoneyRoot");
    if (!root) return;
    const records = loadRecords();
    const m = computeMetrics(records);
    const tabs = [
      { id: "overview", label: "Dashboard" },
      { id: "khata", label: "Khata · খাতা" },
      { id: "transactions", label: "Transactions" },
      { id: "budgets", label: "Budgets & Goals" },
      { id: "bills", label: "Bills & Debts" },
      { id: "calculators", label: "Calculators" }
    ];
    root.innerHTML = `
      <div class="space-y-5" data-pastel-cat="lifemoney">
        <!-- Financial Summary Banner (Life & Money Pastel #FFE7C2 / #3D2E1D) -->
        <div class="pastel-cat-header p-5 sm:p-6 space-y-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="flex items-start gap-3.5">
              <div class="pastel-icon-tile !w-12 !h-12 !rounded-2xl shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
              </div>
              <div>
                <p class="text-[11px] font-extrabold uppercase tracking-wider text-[#804800] dark:text-[#FCD34D]">Life &amp; Money · Offline-First</p>
                <h2 class="text-2xl sm:text-[28px] font-extrabold tracking-tight text-[#2B2236] dark:text-[#F5EEFF] leading-tight">ONEORA Money</h2>
              </div>
            </div>
            <div class="flex items-center gap-1.5">
              <button type="button" id="moneyQuickExportPdf" class="px-3.5 py-2 rounded-full bg-white/90 dark:bg-[#17131F]/80 hover:bg-white text-[#2B2236] dark:text-[#F5EEFF] border border-[#2B2236]/10 dark:border-[#F5EEFF]/12 text-xs font-extrabold min-h-[44px]">PDF</button>
              <button type="button" id="moneyQuickExportXlsx" class="px-3.5 py-2 rounded-full bg-white/90 dark:bg-[#17131F]/80 hover:bg-white text-[#2B2236] dark:text-[#F5EEFF] border border-[#2B2236]/10 dark:border-[#F5EEFF]/12 text-xs font-extrabold min-h-[44px]">Excel</button>
              <button type="button" id="moneyQuickExportCsv" class="px-3.5 py-2 rounded-full bg-white/90 dark:bg-[#17131F]/80 hover:bg-white text-[#2B2236] dark:text-[#F5EEFF] border border-[#2B2236]/10 dark:border-[#F5EEFF]/12 text-xs font-extrabold min-h-[44px]">CSV</button>
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div class="pastel-kpi-tile p-3.5">
              <p class="text-[11px] font-bold text-[#5C506B] dark:text-[#C5B9DA]">Net Balance</p>
              <p class="text-lg sm:text-xl font-extrabold tabular-nums mt-0.5 text-[#2B2236] dark:text-[#F5EEFF]">${fmtMoney(m.balance)}</p>
            </div>
            <div class="pastel-kpi-tile p-3.5">
              <p class="text-[11px] font-bold text-[#146347] dark:text-[#86EFAC]">Month Income</p>
              <p class="text-lg sm:text-xl font-extrabold tabular-nums mt-0.5 text-[#115E42] dark:text-[#6EE7B7]">${fmtMoney(m.monthIncome)}</p>
            </div>
            <div class="pastel-kpi-tile p-3.5">
              <p class="text-[11px] font-bold text-[#9F1D3A] dark:text-[#FDA4AF]">Month Expense</p>
              <p class="text-lg sm:text-xl font-extrabold tabular-nums mt-0.5 text-[#8E1B3B] dark:text-[#FCA5A5]">${fmtMoney(m.monthExpense)}</p>
            </div>
            <div class="pastel-kpi-tile p-3.5">
              <p class="text-[11px] font-bold text-[#8A4600] dark:text-[#FDE68A]">Today's Spend</p>
              <p class="text-lg sm:text-xl font-extrabold tabular-nums mt-0.5 text-[#7C3E00] dark:text-[#FCD34D]">${fmtMoney(m.todayExpense)}</p>
            </div>
          </div>

          <div class="flex items-center gap-2 overflow-x-auto hide-scrollbar pt-1">
            ${tabs.map((t) => `
              <button type="button" data-money-tab="${t.id}" class="pastel-pill-tab ${activeSubTab === t.id ? "is-active" : ""}">${t.label}</button>
            `).join("")}
          </div>
        </div>

        <div>
          ${activeSubTab === "overview" ? renderOverview(records, m) : ""}
          ${activeSubTab === "khata" ? '<div id="oneoraKhataRoot"></div>' : ""}
          ${activeSubTab === "transactions" ? renderTransactions(records) : ""}
          ${activeSubTab === "budgets" ? renderBudgetsAndGoals(records, m) : ""}
          ${activeSubTab === "bills" ? renderBillsAndDebts(records) : ""}
          ${activeSubTab === "calculators" ? renderCalculators() : ""}
        </div>
      </div>
    `;
    bindEvents(root);
    if (global.OneoraKhata) {
      if (activeSubTab === "khata") {
        global.OneoraKhata.render(root.querySelector("#oneoraKhataRoot"));
      } else if (typeof global.OneoraKhata.unmount === "function") {
        global.OneoraKhata.unmount();
      }
    }
    if (activeSubTab === "calculators" && global.OneoraFinCalc) {
      global.OneoraFinCalc.render(root.querySelector("#oneoraMoneyFinCalcEmbed"), null, { embedded: true });
    }
  }
  function renderOverview(records, m) {
    const catEntries = Object.entries(m.catSpend).sort((a, b) => b[1] - a[1]);
    const maxMonthVal = Math.max(1, ...m.months.map((x) => Math.max(x.inc, x.exp)));
    const now = /* @__PURE__ */ new Date();
    const monthLabel = now.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    const dayOfMonth = Math.max(1, now.getDate());
    const dailyAvg = m.monthExpense / dayOfMonth;
    const savingsRate = m.monthIncome > 0 ? Math.max(-100, Math.min(100, Math.round(m.monthSavings / m.monthIncome * 100))) : 0;
    const topCategory = catEntries.length ? `${catEntries[0][0]} (${fmtMoney(catEntries[0][1])})` : "No spend yet";
    return `
      <div class="space-y-5">
        <!-- Monthly Summary Insight Card -->
        <div class="pastel-stage3-card p-5 space-y-3.5">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p class="text-[11px] font-extrabold uppercase tracking-wider text-[#5B3FD0] dark:text-[#CBBBFF]">Monthly Summary</p>
              <h3 class="text-base sm:text-lg font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">${esc(monthLabel)}</h3>
            </div>
            <span class="px-3.5 py-1.5 rounded-full text-xs font-extrabold tabular-nums ${m.monthSavings >= 0 ? "bg-[#CFF3E2] dark:bg-[#1B362E] text-[#115E42] dark:text-[#A7F3D0]" : "bg-[#FFD6D6] dark:bg-[#3D212B] text-[#8E1B3B] dark:text-[#FDA4AF]"}">
              ${m.monthSavings >= 0 ? "Saved" : "Deficit"}: ${fmtMoney(Math.abs(m.monthSavings))}
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div class="pastel-inset-tile p-3.5">
              <p class="text-[11px] font-bold text-[#5C506B] dark:text-[#C5B9DA]">Savings Rate</p>
              <p class="text-base font-extrabold text-[#2B2236] dark:text-[#F5EEFF] tabular-nums mt-0.5">${m.monthIncome > 0 ? `${savingsRate}% of income` : "Add income"}</p>
              <div class="h-2 rounded-full bg-[#2B2236]/10 dark:bg-[#F5EEFF]/12 overflow-hidden mt-2">
                <div class="h-full rounded-full ${savingsRate >= 20 ? "bg-[#15803D]" : savingsRate > 0 ? "bg-[#5B3FD0]" : "bg-[#BE123C]"}" style="width:${Math.max(0, Math.min(100, savingsRate))}%"></div>
              </div>
            </div>
            <div class="pastel-inset-tile p-3.5">
              <p class="text-[11px] font-bold text-[#5C506B] dark:text-[#C5B9DA]">Daily Avg Spend</p>
              <p class="text-base font-extrabold text-[#2B2236] dark:text-[#F5EEFF] tabular-nums mt-0.5">${fmtMoney(dailyAvg)} / day</p>
              <p class="text-[11px] text-[#5C506B] dark:text-[#C5B9DA] mt-1">Across ${dayOfMonth} day(s) this month</p>
            </div>
            <div class="pastel-inset-tile p-3.5">
              <p class="text-[11px] font-bold text-[#5C506B] dark:text-[#C5B9DA]">Top Spend Category</p>
              <p class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF] truncate mt-0.5">${esc(topCategory)}</p>
              <p class="text-[11px] text-[#5C506B] dark:text-[#C5B9DA] mt-1">${catEntries.length} active category(ies)</p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <!-- Quick Add Expense / Income -->
          <form id="moneyAddTxForm" class="lg:col-span-5 pastel-stage3-card p-5 space-y-3">
            <h3 class="text-base font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">Add Expense / Income</h3>
            <div class="grid grid-cols-2 gap-2">
              <select id="moneyTxType" class="pastel-pill-input text-xs font-extrabold">
                <option value="" disabled>Select type...</option>
                <option value="expense" selected>Expense (−)</option>
                <option value="income">Income (+)</option>
              </select>
              <input type="number" step="0.01" min="0" id="moneyTxAmount" required placeholder="Amount (₹)" class="pastel-pill-input text-sm font-extrabold tabular-nums" />
            </div>
            <input type="text" id="moneyTxTitle" required maxlength="160" placeholder="Description (e.g. Lunch, Petrol, Salary)..." class="pastel-pill-input w-full text-xs" />
            <div class="grid grid-cols-2 gap-2">
              <select id="moneyTxCategory" class="pastel-pill-input text-xs font-bold">
                <option value="" disabled>Select category...</option>
                ${EXPENSE_CATEGORIES.map((c, idx) => `<option value="${esc(c)}"${idx === 0 ? " selected" : ""}>${esc(c)}</option>`).join("")}
              </select>
              <select id="moneyTxMethod" class="pastel-pill-input text-xs font-bold">
                <option value="" disabled>Payment method...</option>
                ${PAYMENT_METHODS.map((p, idx) => `<option value="${p.id}"${idx === 0 ? " selected" : ""}>${p.label}</option>`).join("")}
              </select>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <input type="date" id="moneyTxDate" value="${esc(todayKey())}" class="pastel-pill-input sm:col-span-7 w-full min-w-0 text-xs font-bold tabular-nums" />
              <label class="sm:col-span-5 cursor-pointer flex items-center justify-center gap-1.5 px-3 py-2 rounded-[18px] border-2 border-dashed border-[#5B3FD0]/40 bg-[#E4D9FF]/40 dark:bg-[#2D2347] text-xs font-extrabold text-[#432B9F] dark:text-[#E4D9FF] min-h-[44px] whitespace-nowrap">
                <span id="moneyReceiptLabel">Attach Receipt</span>
                <input type="file" id="moneyReceiptInput" accept="image/*" class="hidden" />
              </label>
            </div>
            <input type="text" id="moneyTxNotes" maxlength="300" placeholder="Optional notes..." class="pastel-pill-input w-full text-xs" />
            <button type="submit" class="w-full py-3 rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white text-xs font-extrabold min-h-[48px] shadow-sm transition">Save Transaction</button>
          </form>

          <!-- Charts & Breakdown -->
          <div class="lg:col-span-7 space-y-4">
            <!-- 6-Month Income vs Expense Chart -->
            <div class="pastel-stage3-card p-5 space-y-3">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">Income vs Expense (6 Months)</h3>
                <div class="flex items-center gap-3 text-[11px] font-extrabold">
                  <span class="flex items-center gap-1.5 text-[#115E42] dark:text-[#6EE7B7]"><span class="w-2.5 h-2.5 rounded-full bg-[#15803D]"></span>Income</span>
                  <span class="flex items-center gap-1.5 text-[#8E1B3B] dark:text-[#FCA5A5]"><span class="w-2.5 h-2.5 rounded-full bg-[#E11D48]"></span>Expense</span>
                </div>
              </div>
              <div class="grid grid-cols-6 gap-2 items-end h-36 pt-4">
                ${m.months.map((mo) => {
      const incH = Math.max(5, Math.round(mo.inc / maxMonthVal * 100));
      const expH = Math.max(5, Math.round(mo.exp / maxMonthVal * 100));
      return `
                    <div class="flex flex-col items-center gap-1.5 h-full justify-end">
                      <div class="w-full flex items-end justify-center gap-1 h-28">
                        <div class="w-3.5 sm:w-4 rounded-t-full bg-[#15803D] transition-all" style="height:${incH}%" title="Income: ${fmtMoney(mo.inc)}"></div>
                        <div class="w-3.5 sm:w-4 rounded-t-full bg-[#E11D48] transition-all" style="height:${expH}%" title="Expense: ${fmtMoney(mo.exp)}"></div>
                      </div>
                      <span class="text-[11px] font-bold text-[#5C506B] dark:text-[#C5B9DA]">${esc(mo.label)}</span>
                    </div>
                  `;
    }).join("")}
              </div>
            </div>

            <!-- Monthly Category Breakdown -->
            <div class="pastel-stage3-card p-5 space-y-3">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">Spending by Category</h3>
                <span class="text-xs font-extrabold text-[#5B3FD0] dark:text-[#CBBBFF] tabular-nums">Net: ${fmtMoney(m.monthSavings)}</span>
              </div>
              ${catEntries.length ? catEntries.slice(0, 6).map(([cat, amt]) => {
      const pct = m.monthExpense > 0 ? Math.round(amt / m.monthExpense * 100) : 0;
      return `
                  <div class="space-y-1.5">
                    <div class="flex items-center justify-between text-xs font-bold">
                      <span class="text-[#2B2236] dark:text-[#F5EEFF]">${esc(cat)}</span>
                      <span class="text-[#2B2236] dark:text-[#F5EEFF] tabular-nums">${fmtMoney(amt)} (${pct}%)</span>
                    </div>
                    <div class="h-2.5 rounded-full bg-[#FFF7EE] dark:bg-[#17131F] overflow-hidden border border-[#2B2236]/8 dark:border-[#F5EEFF]/10">
                      <div class="h-full rounded-full bg-[#5B3FD0]" style="width:${pct}%"></div>
                    </div>
                  </div>
                `;
    }).join("") : `
                <div class="pastel-empty-state !py-6">
                  <p class="text-xs font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">No spending recorded this month</p>
                  <p class="text-[11px] text-[#5C506B] dark:text-[#C5B9DA]">Add your first expense on the left to see live category breakdown.</p>
                </div>`}
            </div>
          </div>
        </div>
      </div>
    `;
  }
  function renderTransactions(records) {
    const txs = records.filter((r) => {
      if (r.recordType !== "expense" && r.recordType !== "income") return false;
      if (txFilterType !== "all" && r.recordType !== txFilterType) return false;
      if (txSearchTerm && !`${r.title} ${r.category} ${r.notes || ""} ${r.paymentMethod}`.toLowerCase().includes(txSearchTerm)) return false;
      return true;
    });
    return `
      <div class="pastel-stage3-card p-5 space-y-4">
        <div class="flex flex-col sm:flex-row gap-2.5">
          <input type="search" id="moneyTxSearchInput" value="${esc(txSearchTerm)}" placeholder="Search by title, category, UPI/Cash..." class="pastel-pill-input !rounded-full flex-1 text-xs" />
          <div class="flex items-center gap-1.5">
            ${["all", "expense", "income"].map((t) => `
              <button type="button" data-tx-filter="${t}" class="pastel-pill-tab capitalize ${txFilterType === t ? "is-active" : ""}">${t}</button>
            `).join("")}
          </div>
        </div>

        <div class="space-y-2.5">
          ${txs.length ? txs.map((r) => `
            <div class="pastel-inset-tile flex items-center justify-between gap-3 p-3.5">
              <div class="flex items-center gap-3 min-w-0">
                ${r.receiptThumb ? `<img src="${r.receiptThumb}" alt="Receipt" class="w-11 h-11 rounded-2xl object-cover border border-[#2B2236]/10 shrink-0" />` : `<span class="w-11 h-11 rounded-2xl flex items-center justify-center font-extrabold text-base shrink-0 ${r.recordType === "income" ? "bg-[#CFF3E2] text-[#115E42] dark:bg-[#1B362E] dark:text-[#A7F3D0]" : "bg-[#FFD6D6] text-[#8E1B3B] dark:bg-[#3D212B] dark:text-[#FDA4AF]"}">${r.recordType === "income" ? "+" : "−"}</span>`}
                <div class="min-w-0">
                  <p class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF] truncate">${esc(r.title)}</p>
                  <p class="text-[11px] font-semibold text-[#5C506B] dark:text-[#C5B9DA] truncate">${esc(r.category)} · ${esc(String(r.paymentMethod || "").toUpperCase())} · ${esc(r.dateKey)}</p>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span class="text-sm font-extrabold tabular-nums ${r.recordType === "income" ? "text-[#115E42] dark:text-[#6EE7B7]" : "text-[#8E1B3B] dark:text-[#FCA5A5]"}">${r.recordType === "income" ? "+" : "−"}${fmtMoney(r.amount)}</span>
                <button type="button" data-fin-del="${r.id}" aria-label="Delete transaction" class="w-11 h-11 rounded-full bg-[#FFD6D6]/70 dark:bg-[#3D212B] text-[#8E1B3B] dark:text-[#FDA4AF] text-xs font-extrabold flex items-center justify-center">✕</button>
              </div>
            </div>
          `).join("") : `
            <div class="pastel-empty-state">
              <p class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">No matching transactions</p>
              <p class="text-xs text-[#5C506B] dark:text-[#C5B9DA]">Try clearing your search or switch to Dashboard to log a new entry.</p>
            </div>`}
        </div>
      </div>
    `;
  }
  function renderBudgetsAndGoals(records, m) {
    const budgets = records.filter((r) => r.recordType === "budget");
    const goals = records.filter((r) => r.recordType === "goal");
    return `
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <!-- Monthly & Category Budgets -->
        <div class="pastel-stage3-card p-5 space-y-4">
          <h3 class="text-base font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">Monthly Budgets</h3>
          <form id="moneyBudgetForm" class="grid grid-cols-12 gap-2">
            <select id="budgetCatInput" class="pastel-pill-input col-span-6 text-xs font-bold">
              <option value="" disabled>Select budget category...</option>
              <option value="Overall Monthly" selected>Overall Monthly</option>
              ${EXPENSE_CATEGORIES.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join("")}
            </select>
            <input type="number" min="1" id="budgetLimitInput" required placeholder="Limit (₹)" class="pastel-pill-input col-span-4 text-xs font-bold" />
            <button type="submit" class="col-span-2 rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white text-xs font-extrabold min-h-[44px]">Set</button>
          </form>

          <div class="space-y-3">
            ${budgets.length ? budgets.map((b) => {
      const spent = b.category === "Overall Monthly" ? m.monthExpense : m.catSpend[b.category] || 0;
      const pct = b.amount > 0 ? Math.min(100, Math.round(spent / b.amount * 100)) : 0;
      const over = spent > b.amount;
      return `
                <div class="pastel-inset-tile p-4 ${over ? "!border-[#E11D48]" : ""} space-y-2">
                  <div class="flex items-center justify-between text-xs font-extrabold">
                    <span class="text-[#2B2236] dark:text-[#F5EEFF]">${esc(b.category)}</span>
                    <div class="flex items-center gap-2">
                      <span class="tabular-nums ${over ? "text-[#8E1B3B] dark:text-[#FDA4AF]" : "text-[#5C506B] dark:text-[#C5B9DA]"}">${fmtMoney(spent)} / ${fmtMoney(b.amount)}</span>
                      <button type="button" data-fin-del="${b.id}" class="w-9 h-9 rounded-full bg-[#FFD6D6]/70 dark:bg-[#3D212B] text-[#8E1B3B] dark:text-[#FDA4AF] font-extrabold">✕</button>
                    </div>
                  </div>
                  <div class="h-2.5 rounded-full bg-white dark:bg-[#221C2E] overflow-hidden">
                    <div class="h-full rounded-full ${over ? "bg-[#E11D48]" : pct > 80 ? "bg-[#D97706]" : "bg-[#5B3FD0]"}" style="width:${pct}%"></div>
                  </div>
                  ${over ? `<p class="text-[11px] font-extrabold text-[#8E1B3B] dark:text-[#FDA4AF]">Over budget by ${fmtMoney(spent - b.amount)}!</p>` : ""}
                </div>
              `;
    }).join("") : '<div class="pastel-empty-state !py-6"><p class="text-xs font-bold text-[#5C506B] dark:text-[#C5B9DA]">Set a monthly or category budget to track spending limits.</p></div>'}
          </div>
        </div>

        <!-- Savings Goals -->
        <div class="pastel-stage3-card p-5 space-y-4">
          <h3 class="text-base font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">Savings Goals</h3>
          <form id="moneyGoalForm" class="grid grid-cols-12 gap-2">
            <input type="text" id="goalTitleInput" required maxlength="120" placeholder="Goal (e.g. Emergency Fund)" class="pastel-pill-input col-span-6 text-xs" />
            <input type="number" min="1" id="goalTargetInput" required placeholder="Target ₹" class="pastel-pill-input col-span-4 text-xs font-bold" />
            <button type="submit" class="col-span-2 rounded-full bg-[#157A54] hover:bg-[#106344] text-white text-xs font-extrabold min-h-[44px]">Add</button>
          </form>

          <div class="space-y-3">
            ${goals.length ? goals.map((g) => {
      const target = Math.max(1, Number(g.targetAmount || 1));
      const pct = Math.min(100, Math.round(Number(g.amount || 0) / target * 100));
      return `
                <div class="pastel-inset-tile p-4 space-y-2.5">
                  <div class="flex items-center justify-between text-xs font-extrabold">
                    <span class="text-[#2B2236] dark:text-[#F5EEFF]">${esc(g.title)}</span>
                    <span class="tabular-nums text-[#115E42] dark:text-[#6EE7B7]">${fmtMoney(g.amount)} / ${fmtMoney(target)} (${pct}%)</span>
                  </div>
                  <div class="h-2.5 rounded-full bg-white dark:bg-[#221C2E] overflow-hidden">
                    <div class="h-full rounded-full bg-[#15803D]" style="width:${pct}%"></div>
                  </div>
                  <div class="flex items-center gap-2 pt-1">
                    <button type="button" data-goal-add="${g.id}" data-goal-step="500" class="px-3.5 py-2 rounded-full bg-[#CFF3E2] dark:bg-[#1B362E] text-[#115E42] dark:text-[#A7F3D0] text-xs font-extrabold min-h-[44px]">+₹500</button>
                    <button type="button" data-goal-add="${g.id}" data-goal-step="2000" class="px-3.5 py-2 rounded-full bg-[#E4D9FF] dark:bg-[#2D2347] text-[#3E26A0] dark:text-[#E4D9FF] text-xs font-extrabold min-h-[44px]">+₹2,000</button>
                    <button type="button" data-fin-del="${g.id}" class="px-3.5 py-2 rounded-full bg-[#FFD6D6]/70 dark:bg-[#3D212B] text-[#8E1B3B] dark:text-[#FDA4AF] text-xs font-extrabold min-h-[44px] ml-auto">Delete</button>
                  </div>
                </div>
              `;
    }).join("") : '<div class="pastel-empty-state !py-6"><p class="text-xs font-bold text-[#5C506B] dark:text-[#C5B9DA]">Create savings goals for travel, gadgets, or emergency funds.</p></div>'}
          </div>
        </div>
      </div>
    `;
  }
  function renderBillsAndDebts(records) {
    const bills = records.filter((r) => r.recordType === "bill");
    const debts = records.filter((r) => r.recordType === "debt");
    return `
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <!-- Recurring Bills & Subscriptions -->
        <div class="pastel-stage3-card p-5 space-y-4">
          <h3 class="text-base font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">Bill Reminders &amp; Subscriptions</h3>
          <form id="moneyBillForm" class="space-y-2.5">
            <div class="grid grid-cols-2 gap-2">
              <input type="text" id="billTitleInput" required placeholder="Bill (WiFi, Electricity, EMI)" class="pastel-pill-input text-xs" />
              <input type="number" min="1" id="billAmtInput" required placeholder="Amount (₹)" class="pastel-pill-input text-xs font-bold" />
            </div>
            <div class="grid grid-cols-2 gap-2">
              <input type="number" min="1" max="31" id="billDueDayInput" value="5" placeholder="Due Day (1-31)" class="pastel-pill-input text-xs font-bold" />
              <button type="submit" class="rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white text-xs font-extrabold min-h-[44px]">+ Save Bill</button>
            </div>
          </form>

          <div class="space-y-2">
            ${bills.length ? bills.map((b) => `
              <div class="pastel-inset-tile flex items-center justify-between gap-2 p-3.5">
                <div class="min-w-0">
                  <p class="text-xs font-extrabold text-[#2B2236] dark:text-[#F5EEFF] truncate">${esc(b.title)}</p>
                  <p class="text-[11px] font-semibold text-[#5C506B] dark:text-[#C5B9DA]">Due Day ${Number(b.dueDay || 1)} · ${b.status === "paid" ? "Paid" : "Pending"}</p>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                  <span class="text-xs font-extrabold tabular-nums text-[#5B3FD0] dark:text-[#CBBBFF]">${fmtMoney(b.amount)}</span>
                  <button type="button" data-bill-pay="${b.id}" class="px-3 py-1.5 rounded-full bg-[#CFF3E2] dark:bg-[#1B362E] text-[#115E42] dark:text-[#A7F3D0] text-xs font-extrabold min-h-[44px]">${b.status === "paid" ? "Paid" : "Mark Paid"}</button>
                  <button type="button" data-fin-del="${b.id}" class="w-10 h-10 rounded-full bg-[#FFD6D6]/70 dark:bg-[#3D212B] text-[#8E1B3B] dark:text-[#FDA4AF] text-xs font-extrabold">✕</button>
                </div>
              </div>
            `).join("") : '<div class="pastel-empty-state !py-6"><p class="text-xs font-bold text-[#5C506B] dark:text-[#C5B9DA]">Track electricity, broadband, OTT, and EMI due dates here.</p></div>'}
          </div>
        </div>

        <!-- Debt / Borrowed & Lent Tracker -->
        <div class="pastel-stage3-card p-5 space-y-4">
          <h3 class="text-base font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">Debt &amp; Udhaar Tracker</h3>
          <form id="moneyDebtForm" class="space-y-2.5">
            <div class="grid grid-cols-2 gap-2">
              <input type="text" id="debtPersonInput" required placeholder="Person / Lender name" class="pastel-pill-input text-xs" />
              <input type="number" min="1" id="debtAmtInput" required placeholder="Amount (₹)" class="pastel-pill-input text-xs font-bold" />
            </div>
            <div class="grid grid-cols-2 gap-2">
              <select id="debtDirInput" class="pastel-pill-input text-xs font-bold">
                <option value="" disabled>Select direction...</option>
                <option value="To Receive" selected>Lent (To Receive)</option>
                <option value="To Pay">Borrowed (To Pay)</option>
              </select>
              <button type="submit" class="rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white text-xs font-extrabold min-h-[44px]">+ Track Entry</button>
            </div>
          </form>

          <div class="space-y-2">
            ${debts.length ? debts.map((d) => `
              <div class="pastel-inset-tile flex items-center justify-between gap-2 p-3.5">
                <div class="min-w-0">
                  <p class="text-xs font-extrabold text-[#2B2236] dark:text-[#F5EEFF] truncate ${d.status === "settled" ? "line-through opacity-55" : ""}">${esc(d.counterparty || d.title)}</p>
                  <p class="text-[11px] font-semibold text-[#5C506B] dark:text-[#C5B9DA]">${esc(d.category)} · ${esc(d.status)}</p>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                  <span class="text-xs font-extrabold tabular-nums ${d.category === "To Receive" ? "text-[#115E42] dark:text-[#6EE7B7]" : "text-[#8E1B3B] dark:text-[#FCA5A5]"}">${fmtMoney(d.amount)}</span>
                  ${d.status !== "settled" ? `<button type="button" data-debt-settle="${d.id}" class="px-3 py-1.5 rounded-full bg-[#CFF3E2] dark:bg-[#1B362E] text-[#115E42] dark:text-[#A7F3D0] text-xs font-extrabold min-h-[44px]">Settle</button>` : ""}
                  <button type="button" data-fin-del="${d.id}" class="w-10 h-10 rounded-full bg-[#FFD6D6]/70 dark:bg-[#3D212B] text-[#8E1B3B] dark:text-[#FDA4AF] text-xs font-extrabold">✕</button>
                </div>
              </div>
            `).join("") : '<div class="pastel-empty-state !py-6"><p class="text-xs font-bold text-[#5C506B] dark:text-[#C5B9DA]">No pending borrowed or lent entries.</p></div>'}
          </div>
        </div>
      </div>
    `;
  }
  function renderCalculators() {
    return `
      <div class="space-y-4">
        <div id="oneoraMoneyFinCalcEmbed"></div>

        <details class="pastel-stage3-card p-4 sm:p-5">
          <summary class="text-xs sm:text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF] cursor-pointer select-none min-h-[40px] flex items-center justify-between">
            <span>More Quick Calculators (Compound Interest, Fuel, Bill Split &amp; Salary)</span>
            <span>▾</span>
          </summary>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
          <!-- SIP Calculator -->
          <div class="pastel-stage3-card p-5 space-y-2.5">
            <h4 class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">SIP Wealth Calculator</h4>
            <input type="number" id="calcSipAmt" value="5000" placeholder="Monthly SIP (₹)" class="pastel-pill-input w-full text-xs font-bold" />
            <div class="grid grid-cols-2 gap-2">
              <input type="number" id="calcSipRate" value="12" step="0.5" placeholder="Return % p.a." class="pastel-pill-input text-xs font-bold" />
              <input type="number" id="calcSipYears" value="10" placeholder="Years" class="pastel-pill-input text-xs font-bold" />
            </div>
            <button type="button" id="calcSipBtn" class="w-full py-2.5 rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white text-xs font-extrabold min-h-[44px]">Calculate SIP</button>
            <p id="calcSipOut" class="text-xs font-extrabold text-[#115E42] dark:text-[#6EE7B7] tabular-nums"></p>
          </div>

          <!-- Compound Interest -->
          <div class="pastel-stage3-card p-5 space-y-2.5">
            <h4 class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">Compound Interest</h4>
            <input type="number" id="calcCiP" value="100000" placeholder="Principal (₹)" class="pastel-pill-input w-full text-xs font-bold" />
            <div class="grid grid-cols-2 gap-2">
              <input type="number" id="calcCiR" value="8" step="0.5" placeholder="Rate % p.a." class="pastel-pill-input text-xs font-bold" />
              <input type="number" id="calcCiT" value="5" placeholder="Years" class="pastel-pill-input text-xs font-bold" />
            </div>
            <button type="button" id="calcCiBtn" class="w-full py-2.5 rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white text-xs font-extrabold min-h-[44px]">Calculate CI</button>
            <p id="calcCiOut" class="text-xs font-extrabold text-[#5B3FD0] dark:text-[#CBBBFF] tabular-nums"></p>
          </div>

          <!-- Fuel Cost & Mileage -->
          <div class="pastel-stage3-card p-5 space-y-2.5">
            <h4 class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">Fuel Cost &amp; Mileage</h4>
            <input type="number" id="calcFuelDist" value="120" placeholder="Distance (km)" class="pastel-pill-input w-full text-xs font-bold" />
            <div class="grid grid-cols-2 gap-2">
              <input type="number" id="calcFuelMil" value="45" placeholder="Mileage (km/L)" class="pastel-pill-input text-xs font-bold" />
              <input type="number" id="calcFuelPrice" value="105" placeholder="Price/L (₹)" class="pastel-pill-input text-xs font-bold" />
            </div>
            <button type="button" id="calcFuelBtn" class="w-full py-2.5 rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white text-xs font-extrabold min-h-[44px]">Calculate Fuel</button>
            <p id="calcFuelOut" class="text-xs font-extrabold text-[#8A4600] dark:text-[#FCD34D] tabular-nums"></p>
          </div>

          <!-- Discount Calculator -->
          <div class="pastel-stage3-card p-5 space-y-2.5">
            <h4 class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">Discount Calculator</h4>
            <div class="grid grid-cols-2 gap-2">
              <input type="number" id="calcDiscPrice" value="1999" placeholder="MRP (₹)" class="pastel-pill-input text-xs font-bold" />
              <input type="number" id="calcDiscPct" value="25" placeholder="Discount %" class="pastel-pill-input text-xs font-bold" />
            </div>
            <button type="button" id="calcDiscBtn" class="w-full py-2.5 rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white text-xs font-extrabold min-h-[44px]">Calculate Price</button>
            <p id="calcDiscOut" class="text-xs font-extrabold text-[#8E1B3B] dark:text-[#FCA5A5] tabular-nums"></p>
          </div>

          <!-- Bill Splitter -->
          <div class="pastel-stage3-card p-5 space-y-2.5">
            <h4 class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">Group Bill Splitter</h4>
            <div class="grid grid-cols-2 gap-2">
              <input type="number" id="calcSplitTotal" value="2400" placeholder="Total Bill (₹)" class="pastel-pill-input text-xs font-bold" />
              <input type="number" id="calcSplitPeople" value="4" min="1" placeholder="People" class="pastel-pill-input text-xs font-bold" />
            </div>
            <button type="button" id="calcSplitBtn" class="w-full py-2.5 rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white text-xs font-extrabold min-h-[44px]">Split Bill</button>
            <p id="calcSplitOut" class="text-xs font-extrabold text-[#115E42] dark:text-[#6EE7B7] tabular-nums"></p>
          </div>

          <!-- Salary Take-Home Estimator -->
          <div class="pastel-stage3-card p-5 space-y-2.5">
            <h4 class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">Monthly Salary Estimator</h4>
            <div class="grid grid-cols-2 gap-2">
              <input type="number" id="calcSalCtc" value="600000" placeholder="Annual CTC (₹)" class="pastel-pill-input text-xs font-bold" />
              <input type="number" id="calcSalDed" value="12" placeholder="Deduction %" class="pastel-pill-input text-xs font-bold" />
            </div>
            <button type="button" id="calcSalBtn" class="w-full py-2.5 rounded-full bg-[#5B3FD0] hover:bg-[#4A30B8] text-white text-xs font-extrabold min-h-[44px]">Estimate In-Hand</button>
            <p id="calcSalOut" class="text-xs font-extrabold text-[#5B3FD0] dark:text-[#CBBBFF] tabular-nums"></p>
          </div>
          </div>
        </details>
      </div>
    `;
  }
  function bindEvents(root) {
    root.querySelectorAll("[data-money-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeSubTab = btn.getAttribute("data-money-tab") || "overview";
        render();
      });
    });
    const expPdf = root.querySelector("#moneyQuickExportPdf");
    const expXlsx = root.querySelector("#moneyQuickExportXlsx");
    const expCsv = root.querySelector("#moneyQuickExportCsv");
    if (expPdf) expPdf.addEventListener("click", exportPdf);
    if (expXlsx) expXlsx.addEventListener("click", exportExcel);
    if (expCsv) expCsv.addEventListener("click", exportCsv);
    const typeSel = root.querySelector("#moneyTxType");
    const catSel = root.querySelector("#moneyTxCategory");
    if (typeSel && catSel) {
      typeSel.addEventListener("change", () => {
        const list = typeSel.value === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
        catSel.innerHTML = list.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join("");
      });
    }
    const recInput = root.querySelector("#moneyReceiptInput");
    if (recInput) {
      recInput.addEventListener("change", (e) => {
        var _a;
        const file = (_a = e.target.files) == null ? void 0 : _a[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const scale = Math.min(1, 240 / Math.max(img.width, img.height));
            canvas.width = Math.max(1, Math.round(img.width * scale));
            canvas.height = Math.max(1, Math.round(img.height * scale));
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              pendingReceiptDataUrl = canvas.toDataURL("image/jpeg", 0.65);
              const lbl = root.querySelector("#moneyReceiptLabel");
              if (lbl) lbl.textContent = "Receipt Attached ✓";
            }
          };
          img.src = String(reader.result || "");
        };
        reader.readAsDataURL(file);
      });
    }
    const txForm = root.querySelector("#moneyAddTxForm");
    if (txForm) {
      txForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const recordType = root.querySelector("#moneyTxType").value;
        const amount = Number(root.querySelector("#moneyTxAmount").value || 0);
        const title = root.querySelector("#moneyTxTitle").value.trim();
        const category = root.querySelector("#moneyTxCategory").value;
        const paymentMethod = root.querySelector("#moneyTxMethod").value;
        const dateKey = root.querySelector("#moneyTxDate").value || todayKey();
        const notes = root.querySelector("#moneyTxNotes").value.trim();
        if (!title || amount <= 0) return;
        addRecord({ recordType, amount, title, category, paymentMethod, dateKey, notes, receiptThumb: pendingReceiptDataUrl });
        pendingReceiptDataUrl = "";
        notifyToast("Saved", `${recordType === "income" ? "Income" : "Expense"} of ${fmtMoney(amount)} recorded.`, "success");
        render();
      });
    }
    const searchInp = root.querySelector("#moneyTxSearchInput");
    if (searchInp) {
      searchInp.addEventListener("input", (e) => {
        txSearchTerm = String(e.target.value || "").trim().toLowerCase();
        render();
        const fresh = document.getElementById("moneyTxSearchInput");
        if (fresh) {
          fresh.focus();
          fresh.setSelectionRange(fresh.value.length, fresh.value.length);
        }
      });
    }
    root.querySelectorAll("[data-tx-filter]").forEach((b) => {
      b.addEventListener("click", () => {
        txFilterType = b.getAttribute("data-tx-filter") || "all";
        render();
      });
    });
    const budgetForm = root.querySelector("#moneyBudgetForm");
    if (budgetForm) {
      budgetForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const category = root.querySelector("#budgetCatInput").value;
        const amount = Number(root.querySelector("#budgetLimitInput").value || 0);
        if (amount <= 0) return;
        const existing = loadRecords().find((r) => r.recordType === "budget" && r.category === category);
        if (existing) updateRecord(existing.id, () => ({ amount }));
        else addRecord({ recordType: "budget", title: `${category} Budget`, category, amount });
        notifyToast("Budget Saved", `${category} limit set to ${fmtMoney(amount)}.`, "success");
        render();
      });
    }
    const goalForm = root.querySelector("#moneyGoalForm");
    if (goalForm) {
      goalForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const title = root.querySelector("#goalTitleInput").value.trim();
        const targetAmount = Number(root.querySelector("#goalTargetInput").value || 0);
        if (!title || targetAmount <= 0) return;
        addRecord({ recordType: "goal", title, category: "Savings Goal", amount: 0, targetAmount });
        render();
      });
    }
    root.querySelectorAll("[data-goal-add]").forEach((b) => {
      b.addEventListener("click", () => {
        const id = b.getAttribute("data-goal-add");
        const step = Number(b.getAttribute("data-goal-step") || 500);
        updateRecord(id, (cur) => ({ amount: Number(cur.amount || 0) + step }));
        render();
      });
    });
    const billForm = root.querySelector("#moneyBillForm");
    if (billForm) {
      billForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const title = root.querySelector("#billTitleInput").value.trim();
        const amount = Number(root.querySelector("#billAmtInput").value || 0);
        const dueDay = Math.max(1, Math.min(31, Number(root.querySelector("#billDueDayInput").value || 5)));
        if (!title || amount <= 0) return;
        addRecord({ recordType: "bill", title, category: "Bills & Utilities", amount, dueDay, recurring: true });
        render();
      });
    }
    root.querySelectorAll("[data-bill-pay]").forEach((b) => {
      b.addEventListener("click", () => {
        const id = b.getAttribute("data-bill-pay");
        updateRecord(id, (cur) => ({ status: cur.status === "paid" ? "active" : "paid" }));
        render();
      });
    });
    const debtForm = root.querySelector("#moneyDebtForm");
    if (debtForm) {
      debtForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const counterparty = root.querySelector("#debtPersonInput").value.trim();
        const amount = Number(root.querySelector("#debtAmtInput").value || 0);
        const category = root.querySelector("#debtDirInput").value;
        if (!counterparty || amount <= 0) return;
        addRecord({ recordType: "debt", title: `${category}: ${counterparty}`, counterparty, category, amount });
        render();
      });
    }
    root.querySelectorAll("[data-debt-settle]").forEach((b) => {
      b.addEventListener("click", () => {
        updateRecord(b.getAttribute("data-debt-settle"), () => ({ status: "settled" }));
        render();
      });
    });
    root.querySelectorAll("[data-fin-del]").forEach((b) => {
      b.addEventListener("click", () => {
        deleteRecord(b.getAttribute("data-fin-del"));
        render();
      });
    });
    const sipBtn = root.querySelector("#calcSipBtn");
    if (sipBtn) sipBtn.addEventListener("click", () => {
      const p = Number(root.querySelector("#calcSipAmt").value || 0);
      const r = Number(root.querySelector("#calcSipRate").value || 0) / 100 / 12;
      const n = Number(root.querySelector("#calcSipYears").value || 0) * 12;
      const invested = p * n;
      const fv = r > 0 ? p * ((Math.pow(1 + r, n) - 1) / r * (1 + r)) : invested;
      root.querySelector("#calcSipOut").textContent = `Invested: ${fmtMoney(invested)} · Value: ${fmtMoney(fv)}`;
    });
    const ciBtn = root.querySelector("#calcCiBtn");
    if (ciBtn) ciBtn.addEventListener("click", () => {
      const p = Number(root.querySelector("#calcCiP").value || 0);
      const r = Number(root.querySelector("#calcCiR").value || 0) / 100;
      const t = Number(root.querySelector("#calcCiT").value || 0);
      const a = p * Math.pow(1 + r, t);
      root.querySelector("#calcCiOut").textContent = `Total: ${fmtMoney(a)} · Interest: ${fmtMoney(a - p)}`;
    });
    const fuelBtn = root.querySelector("#calcFuelBtn");
    if (fuelBtn) fuelBtn.addEventListener("click", () => {
      const d = Number(root.querySelector("#calcFuelDist").value || 0);
      const mil = Math.max(0.1, Number(root.querySelector("#calcFuelMil").value || 1));
      const pr = Number(root.querySelector("#calcFuelPrice").value || 0);
      const liters = d / mil;
      const cost = liters * pr;
      root.querySelector("#calcFuelOut").textContent = `Fuel: ${liters.toFixed(2)} L · Cost: ${fmtMoney(cost)} (${fmtMoney(cost / Math.max(1, d))}/km)`;
    });
    const discBtn = root.querySelector("#calcDiscBtn");
    if (discBtn) discBtn.addEventListener("click", () => {
      const p = Number(root.querySelector("#calcDiscPrice").value || 0);
      const d = Number(root.querySelector("#calcDiscPct").value || 0);
      const save = p * d / 100;
      root.querySelector("#calcDiscOut").textContent = `Final Price: ${fmtMoney(p - save)} · You Save: ${fmtMoney(save)}`;
    });
    const splitBtn = root.querySelector("#calcSplitBtn");
    if (splitBtn) splitBtn.addEventListener("click", () => {
      const tot = Number(root.querySelector("#calcSplitTotal").value || 0);
      const ppl = Math.max(1, Number(root.querySelector("#calcSplitPeople").value || 1));
      root.querySelector("#calcSplitOut").textContent = `Per Person: ${fmtMoney(tot / ppl)}`;
    });
    const salBtn = root.querySelector("#calcSalBtn");
    if (salBtn) salBtn.addEventListener("click", () => {
      const ctc = Number(root.querySelector("#calcSalCtc").value || 0);
      const ded = Number(root.querySelector("#calcSalDed").value || 0);
      const monthly = ctc * (1 - ded / 100) / 12;
      root.querySelector("#calcSalOut").textContent = `Est. Monthly In-Hand: ${fmtMoney(monthly)}`;
    });
  }
  const OneoraMoney = {
    init() {
      render();
    },
    render,
    openSubTab(tab) {
      activeSubTab = tab || "overview";
      if (typeof global.openPdfBondhuTool === "function") global.openPdfBondhuTool("oneoraMoneyTab", { sub: activeSubTab });
      render();
    },
    setSubTab(tab) {
      if (tab) activeSubTab = tab;
      render();
    },
    getSummary() {
      const records = loadRecords();
      const m = computeMetrics(records);
      const budgets = records.filter((r) => r.recordType === "budget");
      const budgetLimit = budgets.reduce((sum, b) => sum + Number(b.amount || 0), 0);
      return __spreadProps(__spreadValues({}, m), {
        budgetLimit,
        budgetSpent: m.monthExpense,
        transactionCount: records.filter((r) => r.recordType === "expense" || r.recordType === "income").length,
        upcomingBills: records.filter((r) => r.recordType === "bill" && r.status !== "paid")
      });
    },
    search(q) {
      const clean = String(q || "").trim().toLowerCase();
      if (!clean) return [];
      const txHits = loadRecords().filter((r) => `${r.title} ${r.category} ${r.notes || ""} ${r.counterparty || ""}`.toLowerCase().includes(clean)).slice(0, 5).map((r) => ({
        id: r.id,
        title: `${r.title} (${fmtMoney(r.amount)})`,
        subtitle: `MONEY · ${r.recordType.toUpperCase()} · ${r.category} · ${r.dateKey}`,
        action: () => {
          activeSubTab = r.recordType === "budget" || r.recordType === "goal" ? "budgets" : r.recordType === "bill" || r.recordType === "debt" ? "bills" : "transactions";
          if (typeof global.openPdfBondhuTool === "function") global.openPdfBondhuTool("oneoraMoneyTab");
          render();
        }
      }));
      const khataHits = global.OneoraKhata && typeof global.OneoraKhata.search === "function" ? global.OneoraKhata.search(clean) : [];
      return khataHits.concat(txHits).slice(0, 6);
    },
    exportForSync() {
      return loadRecords().map((_a) => {
        var _b = _a, { receiptThumb } = _b, rest = __objRest(_b, ["receiptThumb"]);
        return rest;
      });
    },
    mergeFromSync(remoteItems) {
      if (!Array.isArray(remoteItems) || !remoteItems.length) return;
      const local = loadRecords();
      const map = new Map(local.map((x) => [x.id, x]));
      remoteItems.forEach((r) => {
        const cur = map.get(r.id);
        if (!cur || Number(r.updatedAtMs || 0) > Number(cur.updatedAtMs || 0)) {
          map.set(r.id, __spreadValues(__spreadValues({}, cur), r));
        }
      });
      saveRecords(Array.from(map.values()));
      render();
    }
  };
  global.OneoraMoney = OneoraMoney;
  document.addEventListener("DOMContentLoaded", () => OneoraMoney.init());
})(window);
