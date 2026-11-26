/**
 * ONEORA Everyday Companion Studio
 * 4 Offline-First Super-App Modules:
 * 1. Life+ (Shopping List, Birthdays & Anniversaries, Daily Routine Builder)
 * 2. Document Templates Studio (Resume, Invoice, Quotation, Receipt, Official Letter -> Real PDF Export & Print)
 * 3. Lifestyle & Wellness (Exercise Checklist, Sleep Notes, Medicine Reminders, Personal Goals)
 * 4. Security+ (AES-256-GCM Web Crypto Encrypted Password Vault & Secure Notes)
 */
(function (global) {
  const DATA_KEY = 'oneoraCompanionData_v1';
  const SEC_VAULT_KEY = 'oneoraSecVault_v1';
  const LEGACY_MONEY_KEY = 'oneoraFinanceRecords_v1';
  const LEGACY_PLANNER_KEY = 'oneoraPlannerItems_v1';

  let activeTab = 'lifeplus';
  let activeDocType = 'invoice';
  let secUnlockedKey = null;
  let secDecryptedCache = null; // { passwords: [], notes: [] } — memory only while unlocked
  let secMasterSalt = null;

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function todayKey() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }

  function uid(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  function toast(title, msg, type = 'info') {
    if (global.utils && typeof global.utils.showToast === 'function') {
      global.utils.showToast(title, msg, type);
    }
  }

  function defaultData() {
    return {
      shopping: [],
      birthdays: [],
      routines: [],
      routineChecks: {}, // { 'YYYY-MM-DD': [routineId, ...] }
      exercises: [],
      exerciseChecks: {}, // { 'YYYY-MM-DD': [exId, ...] }
      sleepLogs: [],
      medicines: [],
      medicineChecks: {}, // { 'YYYY-MM-DD': [medId, ...] }
      goals: []
    };
  }

  function loadData() {
    try {
      const raw = JSON.parse(localStorage.getItem(DATA_KEY) || '');
      if (raw && typeof raw === 'object') {
        return Object.assign(defaultData(), raw);
      }
    } catch {}
    return defaultData();
  }

  function saveData(d) {
    try {
      localStorage.setItem(DATA_KEY, JSON.stringify(d));
    } catch {}
    document.dispatchEvent(new CustomEvent('oneora:companionchange'));
  }

  /* ========================================================================
     WEB CRYPTO AES-256-GCM ENGINE (Real Zero-Plaintext Local Vault)
     ======================================================================== */
  function bufToB64(buf) {
    const bytes = new Uint8Array(buf);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function b64ToBuf(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  async function deriveAesKey(passphrase, saltBytes) {
    const enc = new TextEncoder();
    const keyMat = await crypto.subtle.importKey(
      'raw',
      enc.encode(passphrase),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations: 120000,
        hash: 'SHA-256'
      },
      keyMat,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function encryptVaultPayload(aesKey, saltB64, obj) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(JSON.stringify(obj));
    const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, encoded);
    const envelope = {
      v: 1,
      alg: 'AES-256-GCM',
      kdf: 'PBKDF2-SHA256-120000',
      salt: saltB64,
      iv: bufToB64(iv),
      ct: bufToB64(cipher),
      updatedAt: Date.now()
    };
    localStorage.setItem(SEC_VAULT_KEY, JSON.stringify(envelope));
    document.dispatchEvent(new CustomEvent('oneora:companionchange'));
  }

  async function decryptVaultPayload(passphrase) {
    const raw = localStorage.getItem(SEC_VAULT_KEY);
    if (!raw) return null;
    const env = JSON.parse(raw);
    const saltBytes = b64ToBuf(env.salt);
    const key = await deriveAesKey(passphrase, saltBytes);
    const iv = b64ToBuf(env.iv);
    const ct = b64ToBuf(env.ct);
    const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    const data = JSON.parse(new TextDecoder().decode(plainBuf));
    secUnlockedKey = key;
    secMasterSalt = env.salt;
    secDecryptedCache = {
      passwords: Array.isArray(data.passwords) ? data.passwords : [],
      notes: Array.isArray(data.notes) ? data.notes : []
    };
    return secDecryptedCache;
  }

  function generateStrongPassword(len = 16) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*?';
    const arr = new Uint32Array(len);
    crypto.getRandomValues(arr);
    let out = '';
    for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
    return out;
  }

  function daysUntilBirthday(dateStr) {
    if (!dateStr) return 999;
    const parts = dateStr.split('-').map(Number);
    if (parts.length < 3) return 999;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let next = new Date(now.getFullYear(), parts[1] - 1, parts[2]);
    if (next < today) next = new Date(now.getFullYear() + 1, parts[1] - 1, parts[2]);
    return Math.round((next - today) / 86400000);
  }

  function calcSleepDuration(bed, wake) {
    if (!bed || !wake) return '';
    const [bh, bm] = bed.split(':').map(Number);
    const [wh, wm] = wake.split(':').map(Number);
    if ([bh, bm, wh, wm].some(Number.isNaN)) return '';
    let mins = (wh * 60 + wm) - (bh * 60 + bm);
    if (mins <= 0) mins += 1440;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  }

  /* ========================================================================
     CROSS-MODULE HELPER ACTIONS (Always Triggered by Explicit User Tap)
     ======================================================================== */
  function logShoppingToMoney(amount, itemCount) {
    if (!amount || amount <= 0) {
      toast('Enter Estimated Prices', 'Add estimated ₹ costs to checked items before logging to Money.', 'info');
      return;
    }
    try {
      const records = JSON.parse(localStorage.getItem(LEGACY_MONEY_KEY) || '[]');
      const now = Date.now();
      records.unshift({
        id: `fin_${now}_shop`,
        recordType: 'tx',
        txType: 'expense',
        amount: Math.round(amount * 100) / 100,
        category: 'Groceries & Shopping',
        account: 'UPI',
        dateKey: todayKey(),
        note: `Shopping list (${itemCount} item${itemCount === 1 ? '' : 's'})`,
        createdAtMs: now,
        updatedAtMs: now
      });
      localStorage.setItem(LEGACY_MONEY_KEY, JSON.stringify(records));
      document.dispatchEvent(new CustomEvent('oneora:moneychange'));
      toast('Logged to Money', `₹${amount.toLocaleString('en-IN')} added as an expense.`, 'success');
    } catch {
      toast('Could Not Log', 'Please try again.', 'error');
    }
  }

  function addEventToPlanner(title, dateKeyStr, timeStr, category) {
    try {
      const items = JSON.parse(localStorage.getItem(LEGACY_PLANNER_KEY) || '[]');
      const now = Date.now();
      items.unshift({
        id: `pln_${now}_${Math.random().toString(36).slice(2, 5)}`,
        type: 'reminder',
        title,
        notes: `Added from ONEORA ${category}`,
        dateKey: dateKeyStr || todayKey(),
        timeStr: timeStr || '09:00',
        priority: 'medium',
        completed: false,
        repeat: category === 'Birthday' ? 'yearly' : category === 'Medicine' ? 'daily' : 'none',
        createdAtMs: now,
        updatedAtMs: now
      });
      localStorage.setItem(LEGACY_PLANNER_KEY, JSON.stringify(items));
      document.dispatchEvent(new CustomEvent('oneora:plannerchange'));
      if (global.AndroidBridge && typeof global.AndroidBridge.scheduleReminder === 'function') {
        const dt = new Date(`${dateKeyStr || todayKey()}T${timeStr || '09:00'}:00`);
        if (!Number.isNaN(dt.getTime()) && dt.getTime() > Date.now()) {
          global.AndroidBridge.scheduleReminder(title, `ONEORA ${category} Reminder`, dt.getTime());
        }
      }
      toast('Reminder Scheduled', `"${title}" added to your Planner & Reminders.`, 'success');
    } catch {
      toast('Error', 'Could not create reminder.', 'error');
    }
  }

  /* ========================================================================
     DOCUMENT TEMPLATES PDF EXPORT ENGINE (100% Offline via PDFLib)
     ======================================================================== */
  async function exportTemplateToPdf(docTitle, lines) {
    if (!global.PDFLib) {
      toast('PDF Engine Loading', 'Offline PDF engine is not ready yet. Use Print instead.', 'info');
      return;
    }
    try {
      const { PDFDocument, StandardFonts, rgb } = global.PDFLib;
      const pdfDoc = await PDFDocument.create();
      let page = pdfDoc.addPage([595.28, 841.89]); // A4
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const safeAscii = (str) => String(str || '').replace(/₹/g, 'INR ').replace(/[^\x20-\x7E]/g, ' ');
      let y = 790;

      // Subtle navy header bar
      page.drawRectangle({ x: 42, y: 785, width: 511, height: 34, color: rgb(0.06, 0.08, 0.16) });
      page.drawText(safeAscii(docTitle).slice(0, 65), {
        x: 54,
        y: 797,
        size: 13,
        font: fontBold,
        color: rgb(1, 1, 1)
      });
      y = 755;

      for (const row of lines) {
        if (y < 60) {
          page = pdfDoc.addPage([595.28, 841.89]);
          y = 795;
        }
        if (row.type === 'hr') {
          page.drawLine({
            start: { x: 42, y: y + 4 },
            end: { x: 553, y: y + 4 },
            thickness: 0.7,
            color: rgb(0.84, 0.86, 0.91)
          });
          y -= 12;
          continue;
        }
        const font = row.bold ? fontBold : fontRegular;
        const size = row.size || 10.5;
        const color = row.accent ? rgb(0.45, 0.34, 0.91) : row.muted ? rgb(0.42, 0.46, 0.55) : rgb(0.09, 0.11, 0.18);
        const text = safeAscii(row.text);

        // Simple word wrap
        const words = text.split(/\s+/);
        let line = '';
        const maxChars = Math.floor(495 / (size * 0.53));
        for (const w of words) {
          if ((line + ' ' + w).trim().length > maxChars && line) {
            if (y < 55) {
              page = pdfDoc.addPage([595.28, 841.89]);
              y = 795;
            }
            page.drawText(line, { x: 46, y, size, font, color });
            y -= size + 5;
            line = w;
          } else {
            line = (line ? line + ' ' : '') + w;
          }
        }
        if (line) {
          page.drawText(line, { x: 46, y, size, font, color });
          y -= size + (row.gap || 6);
        }
      }

      // Clean footer
      page.drawText('Generated offline with ONEORA Document Templates Studio', {
        x: 46,
        y: 28,
        size: 8.5,
        font: fontRegular,
        color: rgb(0.5, 0.54, 0.62)
      });

      const bytes = await pdfDoc.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const fname = `ONEORA_${docTitle.replace(/[^A-Za-z0-9]+/g, '_')}_${todayKey()}.pdf`;
      if (global.utils && typeof global.utils.downloadBlob === 'function') {
        global.utils.downloadBlob(blob, fname);
      }
      toast('PDF Ready', `${fname} created 100% offline.`, 'success');
    } catch (err) {
      toast('PDF Export Failed', err instanceof Error ? err.message : 'Unable to build PDF.', 'error');
    }
  }

  /* ========================================================================
     MAIN RENDERER
     ======================================================================== */
  function render(subTab) {
    if (subTab && ['lifeplus', 'doctemplates', 'lifestyle', 'securityplus'].includes(subTab)) {
      activeTab = subTab;
    }
    const root = document.getElementById('oneoraCompanionRoot');
    if (!root) return;

    const tabs = [
      { id: 'lifeplus', label: 'Life+' },
      { id: 'doctemplates', label: 'Doc Templates' },
      { id: 'lifestyle', label: 'Lifestyle' },
      { id: 'securityplus', label: 'Password Vault' }
    ];

    root.innerHTML = `
      <div class="space-y-5">
        <div class="oneora-surface p-5 sm:p-6 space-y-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-[11px] font-bold uppercase tracking-wider text-[#7457E8] dark:text-[#B4A5FF]">ONEORA Everyday Companion</p>
              <h2 class="text-2xl sm:text-3xl font-extrabold text-[#171B2C] dark:text-[#F5F6FC] tracking-tight mt-0.5">Life, Templates, Wellness &amp; Security</h2>
              <p class="text-xs sm:text-sm text-[#777F91] dark:text-[#A5ADC2] mt-1">100% offline-first modules with IndexedDB durability and AES-256 encryption.</p>
            </div>
          </div>
          <div class="oneora-segmented grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            ${tabs.map((t) => `
              <button type="button" data-comp-tab="${t.id}" class="oneora-seg-btn ${activeTab === t.id ? 'is-active' : ''}">${t.label}</button>
            `).join('')}
          </div>
        </div>

        <div id="oneoraCompanionPanel"></div>
      </div>
    `;

    root.querySelectorAll('[data-comp-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeTab = btn.getAttribute('data-comp-tab');
        render();
      });
    });

    const panel = document.getElementById('oneoraCompanionPanel');
    if (!panel) return;
    if (activeTab === 'lifeplus') renderLifePlus(panel);
    else if (activeTab === 'doctemplates') renderDocTemplates(panel);
    else if (activeTab === 'lifestyle') renderLifestyle(panel);
    else if (activeTab === 'securityplus') renderSecurityPlus(panel);
  }

  /* ========================================================================
     1. LIFE+ (Shopping List, Birthdays & Anniversaries, Daily Routine)
     ======================================================================== */
  function renderLifePlus(panel) {
    const data = loadData();
    const tKey = todayKey();
    const checkedRoutines = new Set(data.routineChecks[tKey] || []);

    const shoppingCheckedTotal = data.shopping
      .filter((s) => s.done && Number(s.price) > 0)
      .reduce((acc, s) => acc + Number(s.price || 0), 0);
    const shoppingCheckedCount = data.shopping.filter((s) => s.done).length;

    const sortedBirthdays = [...data.birthdays].sort((a, b) => daysUntilBirthday(a.date) - daysUntilBirthday(b.date));
    const routinePct = data.routines.length
      ? Math.round((data.routines.filter((r) => checkedRoutines.has(r.id)).length / data.routines.length) * 100)
      : 0;

    panel.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- Shopping List -->
        <div class="oneora-surface p-5 space-y-4">
          <div class="flex items-center justify-between gap-2">
            <div>
              <h3 class="text-base font-bold text-[#171B2C] dark:text-[#F5F6FC]">Shopping List</h3>
              <p class="text-xs text-[#777F91] dark:text-[#A5ADC2]">Track groceries &amp; essentials, then optionally log spent total to Money.</p>
            </div>
            <span class="text-xs font-bold text-[#7457E8] dark:text-[#B4A5FF] tabular-nums">${data.shopping.filter((x) => !x.done).length} left</span>
          </div>

          <form id="compShopForm" class="grid grid-cols-12 gap-2">
            <input type="text" id="compShopName" required placeholder="Item (e.g. Milk, Rice)" class="col-span-6 oneora-input text-xs" />
            <input type="text" id="compShopQty" placeholder="Qty" class="col-span-3 oneora-input text-xs" />
            <input type="number" id="compShopPrice" min="0" step="1" placeholder="₹ Est." class="col-span-3 oneora-input text-xs" />
            <button type="submit" class="col-span-12 oneora-btn-primary text-xs">Add to Shopping List</button>
          </form>

          <div class="space-y-2 max-h-72 overflow-y-auto pr-0.5">
            ${data.shopping.length ? data.shopping.map((item) => `
              <div class="flex items-center justify-between gap-2 p-3 rounded-xl bg-[#F6F7FB] dark:bg-[#1D2540]/70 border border-[#E8EAF2] dark:border-[#232C4A]">
                <label class="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer">
                  <input type="checkbox" data-shop-toggle="${item.id}" ${item.done ? 'checked' : ''} class="w-4 h-4 rounded accent-[#7457E8]" />
                  <span class="text-xs font-semibold truncate ${item.done ? 'line-through text-[#777F91]' : 'text-[#171B2C] dark:text-[#F5F6FC]'}">${esc(item.name)}${item.qty ? ` · ${esc(item.qty)}` : ''}</span>
                </label>
                <div class="flex items-center gap-2 shrink-0">
                  ${Number(item.price) > 0 ? `<span class="text-xs font-bold text-[#171B2C] dark:text-[#F5F6FC] tabular-nums">₹${Number(item.price).toLocaleString('en-IN')}</span>` : ''}
                  <button type="button" data-shop-del="${item.id}" class="text-xs text-[#777F91] hover:text-rose-600 px-1.5 py-1">✕</button>
                </div>
              </div>
            `).join('') : `
              <div class="oneora-empty-state py-6">
                <p class="text-xs font-semibold text-[#171B2C] dark:text-[#F5F6FC]">Your shopping list is empty</p>
                <p class="text-[11px] text-[#777F91] dark:text-[#A5ADC2] mt-1">Add groceries, medicine, or household items above.</p>
              </div>
            `}
          </div>

          ${shoppingCheckedCount > 0 ? `
            <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E8EAF2] dark:border-[#232C4A]">
              <button type="button" id="compShopLogMoneyBtn" class="oneora-btn-secondary text-xs">Log ₹${shoppingCheckedTotal.toLocaleString('en-IN')} to Money</button>
              <button type="button" id="compShopClearDoneBtn" class="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline px-2 py-1">Clear Purchased (${shoppingCheckedCount})</button>
            </div>
          ` : ''}
        </div>

        <!-- Birthdays & Anniversaries -->
        <div class="oneora-surface p-5 space-y-4">
          <div class="flex items-center justify-between gap-2">
            <div>
              <h3 class="text-base font-bold text-[#171B2C] dark:text-[#F5F6FC]">Birthdays &amp; Anniversaries</h3>
              <p class="text-xs text-[#777F91] dark:text-[#A5ADC2]">Never miss a special day with live countdowns &amp; planner alerts.</p>
            </div>
            <span class="text-xs font-bold text-[#7457E8] dark:text-[#B4A5FF] tabular-nums">${sortedBirthdays.length} saved</span>
          </div>

          <form id="compBdayForm" class="grid grid-cols-12 gap-2">
            <input type="text" id="compBdayName" required placeholder="Person / Event Name" class="col-span-6 oneora-input text-xs" />
            <input type="date" id="compBdayDate" required class="col-span-6 oneora-input text-xs" />
            <select id="compBdayType" class="col-span-5 oneora-input text-xs">
              <option value="Birthday">Birthday</option>
              <option value="Anniversary">Anniversary</option>
              <option value="Special Day">Special Day</option>
            </select>
            <input type="text" id="compBdayNote" placeholder="Gift idea or relation" class="col-span-7 oneora-input text-xs" />
            <button type="submit" class="col-span-12 oneora-btn-primary text-xs">Save Special Date</button>
          </form>

          <div class="space-y-2 max-h-72 overflow-y-auto pr-0.5">
            ${sortedBirthdays.length ? sortedBirthdays.map((b) => {
              const dLeft = daysUntilBirthday(b.date);
              const label = dLeft === 0 ? 'Today!' : dLeft === 1 ? 'Tomorrow' : `In ${dLeft} days`;
              return `
                <div class="flex items-center justify-between gap-2 p-3 rounded-xl bg-[#F6F7FB] dark:bg-[#1D2540]/70 border border-[#E8EAF2] dark:border-[#232C4A]">
                  <div class="min-w-0">
                    <p class="text-xs font-bold text-[#171B2C] dark:text-[#F5F6FC] truncate">${esc(b.name)} <span class="font-medium text-[#777F91]">· ${esc(b.type)}</span></p>
                    <p class="text-[11px] text-[#777F91] dark:text-[#A5ADC2] tabular-nums mt-0.5">${esc(b.date)}${b.note ? ` · ${esc(b.note)}` : ''}</p>
                  </div>
                  <div class="flex items-center gap-1.5 shrink-0">
                    <span class="text-[11px] font-bold px-2 py-1 rounded-lg ${dLeft <= 7 ? 'bg-[#7457E8]/15 text-[#7457E8] dark:text-[#C4B5FD]' : 'bg-white dark:bg-[#151B2F] text-[#777F91]'} tabular-nums">${label}</span>
                    <button type="button" data-bday-remind="${b.id}" class="text-[11px] font-bold px-2 py-1 rounded-lg border border-[#E8EAF2] dark:border-[#232C4A] text-[#171B2C] dark:text-[#F5F6FC] hover:border-[#7457E8]" title="Add Yearly Reminder">+ Alert</button>
                    <button type="button" data-bday-del="${b.id}" class="text-xs text-[#777F91] hover:text-rose-600 px-1">✕</button>
                  </div>
                </div>
              `;
            }).join('') : `
              <div class="oneora-empty-state py-6">
                <p class="text-xs font-semibold text-[#171B2C] dark:text-[#F5F6FC]">No birthdays or anniversaries yet</p>
                <p class="text-[11px] text-[#777F91] dark:text-[#A5ADC2] mt-1">Add family &amp; friend dates to see live countdowns.</p>
              </div>
            `}
          </div>
        </div>

        <!-- Daily Routine Manager -->
        <div class="oneora-surface p-5 space-y-4 lg:col-span-2">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 class="text-base font-bold text-[#171B2C] dark:text-[#F5F6FC]">Daily Routine Manager</h3>
              <p class="text-xs text-[#777F91] dark:text-[#A5ADC2]">Build a calm morning, afternoon, and evening routine with daily check-ins.</p>
            </div>
            <div class="text-right">
              <span class="text-sm font-extrabold text-[#7457E8] dark:text-[#B4A5FF] tabular-nums">${routinePct}% today</span>
            </div>
          </div>

          <div class="w-full h-2 rounded-full bg-[#E8EAF2] dark:bg-[#232C4A] overflow-hidden">
            <div class="h-full rounded-full bg-[#7457E8] transition-all" style="width:${routinePct}%"></div>
          </div>

          <form id="compRoutineForm" class="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <input type="text" id="compRoutineTitle" required placeholder="Routine step (e.g. Morning walk, Read 15 mins)" class="sm:col-span-6 oneora-input text-xs" />
            <select id="compRoutineBlock" class="sm:col-span-3 oneora-input text-xs">
              <option value="Morning">Morning</option>
              <option value="Afternoon">Afternoon</option>
              <option value="Evening">Evening</option>
            </select>
            <input type="time" id="compRoutineTime" value="07:00" class="sm:col-span-2 oneora-input text-xs" />
            <button type="submit" class="sm:col-span-1 oneora-btn-primary text-xs">Add</button>
          </form>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            ${['Morning', 'Afternoon', 'Evening'].map((block) => {
              const list = data.routines.filter((r) => r.block === block);
              return `
                <div class="p-3.5 rounded-2xl bg-[#F6F7FB] dark:bg-[#1D2540]/60 border border-[#E8EAF2] dark:border-[#232C4A] space-y-2">
                  <h4 class="text-xs font-bold text-[#171B2C] dark:text-[#F5F6FC]">${block}</h4>
                  ${list.length ? list.map((r) => {
                    const done = checkedRoutines.has(r.id);
                    return `
                      <div class="flex items-center justify-between gap-2 p-2 rounded-xl bg-white dark:bg-[#151B2F] border border-[#E8EAF2] dark:border-[#232C4A]">
                        <label class="flex items-center gap-2 min-w-0 flex-1 cursor-pointer">
                          <input type="checkbox" data-routine-toggle="${r.id}" ${done ? 'checked' : ''} class="w-4 h-4 rounded accent-[#7457E8]" />
                          <span class="text-xs font-medium truncate ${done ? 'line-through text-[#777F91]' : 'text-[#171B2C] dark:text-[#F5F6FC]'}">${esc(r.title)}</span>
                        </label>
                        <span class="text-[10px] font-semibold text-[#777F91] tabular-nums">${esc(r.time || '')}</span>
                        <button type="button" data-routine-del="${r.id}" class="text-xs text-[#777F91] hover:text-rose-600 px-1">✕</button>
                      </div>
                    `;
                  }).join('') : `<p class="text-[11px] text-[#777F91] dark:text-[#A5ADC2]">No ${block.toLowerCase()} steps yet.</p>`}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    // Bindings
    panel.querySelector('#compShopForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = panel.querySelector('#compShopName').value.trim();
      if (!name) return;
      const d = loadData();
      d.shopping.unshift({
        id: uid('shop'),
        name,
        qty: panel.querySelector('#compShopQty').value.trim(),
        price: Number(panel.querySelector('#compShopPrice').value || 0),
        done: false
      });
      saveData(d);
      render();
    });

    panel.querySelectorAll('[data-shop-toggle]').forEach((chk) => {
      chk.addEventListener('change', () => {
        const id = chk.getAttribute('data-shop-toggle');
        const d = loadData();
        const item = d.shopping.find((x) => x.id === id);
        if (item) item.done = chk.checked;
        saveData(d);
        render();
      });
    });

    panel.querySelectorAll('[data-shop-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-shop-del');
        const d = loadData();
        d.shopping = d.shopping.filter((x) => x.id !== id);
        saveData(d);
        render();
      });
    });

    panel.querySelector('#compShopLogMoneyBtn')?.addEventListener('click', () => {
      logShoppingToMoney(shoppingCheckedTotal, shoppingCheckedCount);
    });

    panel.querySelector('#compShopClearDoneBtn')?.addEventListener('click', () => {
      const d = loadData();
      d.shopping = d.shopping.filter((x) => !x.done);
      saveData(d);
      render();
    });

    panel.querySelector('#compBdayForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = panel.querySelector('#compBdayName').value.trim();
      const date = panel.querySelector('#compBdayDate').value;
      if (!name || !date) return;
      const d = loadData();
      d.birthdays.push({
        id: uid('bday'),
        name,
        date,
        type: panel.querySelector('#compBdayType').value,
        note: panel.querySelector('#compBdayNote').value.trim()
      });
      saveData(d);
      render();
    });

    panel.querySelectorAll('[data-bday-remind]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const b = loadData().birthdays.find((x) => x.id === btn.getAttribute('data-bday-remind'));
        if (!b) return;
        const parts = b.date.split('-');
        const now = new Date();
        let yr = now.getFullYear();
        const cand = new Date(yr, Number(parts[1]) - 1, Number(parts[2]));
        if (cand < new Date(now.getFullYear(), now.getMonth(), now.getDate())) yr += 1;
        addEventToPlanner(`${b.name}'s ${b.type}`, `${yr}-${parts[1]}-${parts[2]}`, '09:00', 'Birthday');
      });
    });

    panel.querySelectorAll('[data-bday-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const d = loadData();
        d.birthdays = d.birthdays.filter((x) => x.id !== btn.getAttribute('data-bday-del'));
        saveData(d);
        render();
      });
    });

    panel.querySelector('#compRoutineForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = panel.querySelector('#compRoutineTitle').value.trim();
      if (!title) return;
      const d = loadData();
      d.routines.push({
        id: uid('rtn'),
        title,
        block: panel.querySelector('#compRoutineBlock').value,
        time: panel.querySelector('#compRoutineTime').value
      });
      saveData(d);
      render();
    });

    panel.querySelectorAll('[data-routine-toggle]').forEach((chk) => {
      chk.addEventListener('change', () => {
        const id = chk.getAttribute('data-routine-toggle');
        const d = loadData();
        const set = new Set(d.routineChecks[tKey] || []);
        if (chk.checked) set.add(id);
        else set.delete(id);
        d.routineChecks[tKey] = Array.from(set);
        saveData(d);
        render();
      });
    });

    panel.querySelectorAll('[data-routine-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const d = loadData();
        d.routines = d.routines.filter((x) => x.id !== btn.getAttribute('data-routine-del'));
        saveData(d);
        render();
      });
    });
  }

  /* ========================================================================
     2. DOCUMENT TEMPLATES STUDIO (Resume, Invoice, Quotation, Receipt, Letter)
     ======================================================================== */
  function renderDocTemplates(panel) {
    const types = [
      { id: 'invoice', label: 'Invoice' },
      { id: 'resume', label: 'Resume' },
      { id: 'quotation', label: 'Quotation' },
      { id: 'receipt', label: 'Receipt' },
      { id: 'letter', label: 'Official Letter' }
    ];

    let fieldsHtml = '';
    if (activeDocType === 'invoice' || activeDocType === 'quotation') {
      const isInv = activeDocType === 'invoice';
      fieldsHtml = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-[11px] font-semibold text-[#777F91] mb-1">Your Business / Name</label>
            <input type="text" id="dtBiz" value="ONEORA Studio" class="oneora-input text-xs" />
          </div>
          <div>
            <label class="block text-[11px] font-semibold text-[#777F91] mb-1">Client / Customer Name</label>
            <input type="text" id="dtClient" placeholder="Client name or company" class="oneora-input text-xs" />
          </div>
          <div>
            <label class="block text-[11px] font-semibold text-[#777F91] mb-1">${isInv ? 'Invoice Number' : 'Quotation Number'}</label>
            <input type="text" id="dtNum" value="${isInv ? 'INV-2026-001' : 'QTN-2026-001'}" class="oneora-input text-xs" />
          </div>
          <div>
            <label class="block text-[11px] font-semibold text-[#777F91] mb-1">GST % (0 for No GST)</label>
            <input type="number" id="dtGst" value="18" min="0" max="28" class="oneora-input text-xs" />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-[11px] font-semibold text-[#777F91] mb-1">Items (One per line: Description | Qty | Rate ₹)</label>
            <textarea id="dtItems" rows="4" class="oneora-input text-xs font-mono">Design &amp; Consulting | 1 | 5000
Document Processing | 2 | 1200</textarea>
          </div>
          <div class="sm:col-span-2">
            <label class="block text-[11px] font-semibold text-[#777F91] mb-1">Payment / Terms Note</label>
            <input type="text" id="dtNote" value="Payment via UPI / Bank Transfer within 7 days. Thank you!" class="oneora-input text-xs" />
          </div>
        </div>
      `;
    } else if (activeDocType === 'resume') {
      fieldsHtml = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-[11px] font-semibold text-[#777F91] mb-1">Full Name</label>
            <input type="text" id="dtName" placeholder="e.g. Ananya Sen" class="oneora-input text-xs" />
          </div>
          <div>
            <label class="block text-[11px] font-semibold text-[#777F91] mb-1">Target Role / Title</label>
            <input type="text" id="dtRole" placeholder="e.g. Software Engineer" class="oneora-input text-xs" />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-[11px] font-semibold text-[#777F91] mb-1">Contact (Phone · Email · City)</label>
            <input type="text" id="dtContact" placeholder="+91 98XXXXXXXX · name@email.com · Kolkata, India" class="oneora-input text-xs" />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-[11px] font-semibold text-[#777F91] mb-1">Professional Summary</label>
            <textarea id="dtSummary" rows="2" placeholder="2-3 lines summarizing your strengths and experience..." class="oneora-input text-xs"></textarea>
          </div>
          <div class="sm:col-span-2">
            <label class="block text-[11px] font-semibold text-[#777F91] mb-1">Work Experience / Projects</label>
            <textarea id="dtExp" rows="3" placeholder="Company / Project — Role (Year): Key achievement..." class="oneora-input text-xs"></textarea>
          </div>
          <div>
            <label class="block text-[11px] font-semibold text-[#777F91] mb-1">Education</label>
            <textarea id="dtEdu" rows="2" placeholder="B.Tech / B.Sc — University (Year)" class="oneora-input text-xs"></textarea>
          </div>
          <div>
            <label class="block text-[11px] font-semibold text-[#777F91] mb-1">Key Skills</label>
            <textarea id="dtSkills" rows="2" placeholder="JavaScript, Excel, Communication, Accounting..." class="oneora-input text-xs"></textarea>
          </div>
        </div>
      `;
    } else if (activeDocType === 'receipt') {
      fieldsHtml = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-[11px] font-semibold text-[#777F91] mb-1">Receipt Number</label>
            <input type="text" id="dtRecNo" value="RCPT-${Date.now().toString().slice(-4)}" class="oneora-input text-xs" />
          </div>
          <div>
            <label class="block text-[11px] font-semibold text-[#777F91] mb-1">Date</label>
            <input type="date" id="dtRecDate" value="${todayKey()}" class="oneora-input text-xs" />
          </div>
          <div>
            <label class="block text-[11px] font-semibold text-[#777F91] mb-1">Received From</label>
            <input type="text" id="dtRecFrom" placeholder="Payer full name" class="oneora-input text-xs" />
          </div>
          <div>
            <label class="block text-[11px] font-semibold text-[#777F91] mb-1">Amount Received (₹)</label>
            <input type="number" id="dtRecAmt" placeholder="e.g. 2500" class="oneora-input text-xs" />
          </div>
          <div>
            <label class="block text-[11px] font-semibold text-[#777F91] mb-1">Payment Mode</label>
            <select id="dtRecMode" class="oneora-input text-xs">
              <option value="UPI">UPI</option>
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>
          <div>
            <label class="block text-[11px] font-semibold text-[#777F91] mb-1">Received By / Issuer</label>
            <input type="text" id="dtRecBy" placeholder="Your name or business" class="oneora-input text-xs" />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-[11px] font-semibold text-[#777F91] mb-1">Purpose / Description</label>
            <input type="text" id="dtRecPurpose" placeholder="e.g. Monthly Rent / Tuition Fee / Service Payment" class="oneora-input text-xs" />
          </div>
        </div>
      `;
    } else {
      fieldsHtml = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-[11px] font-semibold text-[#777F91] mb-1">From (Sender Name &amp; Address)</label>
            <input type="text" id="dtLetFrom" placeholder="Your name &amp; city" class="oneora-input text-xs" />
          </div>
          <div>
            <label class="block text-[11px] font-semibold text-[#777F91] mb-1">To (Recipient / Authority)</label>
            <input type="text" id="dtLetTo" placeholder="The Branch Manager / Principal / HR" class="oneora-input text-xs" />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-[11px] font-semibold text-[#777F91] mb-1">Subject</label>
            <input type="text" id="dtLetSub" placeholder="Application for ..." class="oneora-input text-xs" />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-[11px] font-semibold text-[#777F91] mb-1">Letter Body</label>
            <textarea id="dtLetBody" rows="5" placeholder="Respected Sir/Madam,&#10;&#10;I am writing to kindly request..." class="oneora-input text-xs"></textarea>
          </div>
        </div>
      `;
    }

    panel.innerHTML = `
      <div class="oneora-surface p-5 space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 class="text-base font-bold text-[#171B2C] dark:text-[#F5F6FC]">Document Templates Studio</h3>
            <p class="text-xs text-[#777F91] dark:text-[#A5ADC2]">Build clean A4 documents offline and export straight to PDF.</p>
          </div>
          <div class="flex flex-wrap gap-1.5">
            ${types.map((t) => `
              <button type="button" data-dt-type="${t.id}" class="px-3 py-1.5 rounded-xl text-xs font-semibold min-h-[36px] transition ${activeDocType === t.id ? 'bg-[#7457E8] text-white' : 'bg-[#F6F7FB] dark:bg-[#1D2540] text-[#171B2C] dark:text-[#F5F6FC] border border-[#E8EAF2] dark:border-[#232C4A]'}">${t.label}</button>
            `).join('')}
          </div>
        </div>

        ${fieldsHtml}

        <div class="p-4 rounded-2xl bg-[#F6F7FB] dark:bg-[#1D2540]/60 border border-[#E8EAF2] dark:border-[#232C4A]">
          <p class="text-[11px] font-bold uppercase tracking-wider text-[#777F91] mb-2">Live Preview</p>
          <div id="dtPreviewBox" class="p-5 rounded-xl bg-white text-[#171B2C] border border-[#E8EAF2] text-xs space-y-2 shadow-xs"></div>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <button type="button" id="dtExportPdfBtn" class="oneora-btn-primary text-xs">Export A4 PDF (Offline)</button>
          <button type="button" id="dtPrintBtn" class="oneora-btn-secondary text-xs">Print Document</button>
        </div>
      </div>
    `;

    panel.querySelectorAll('[data-dt-type]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeDocType = btn.getAttribute('data-dt-type');
        render();
      });
    });

    function buildDocModel() {
      const val = (id) => (panel.querySelector('#' + id)?.value || '').trim();
      if (activeDocType === 'invoice' || activeDocType === 'quotation') {
        const isInv = activeDocType === 'invoice';
        const biz = val('dtBiz') || 'Your Business';
        const client = val('dtClient') || 'Valued Client';
        const num = val('dtNum') || (isInv ? 'INV-001' : 'QTN-001');
        const gstPct = Math.max(0, Number(val('dtGst') || 0));
        const rawLines = val('dtItems').split('\n').map((l) => l.trim()).filter(Boolean);
        let subtotal = 0;
        const parsedItems = rawLines.map((line) => {
          const [desc, q, r] = line.split('|').map((x) => (x || '').trim());
          const qty = Math.max(1, Number(q || 1));
          const rate = Math.max(0, Number(r || 0));
          const total = qty * rate;
          subtotal += total;
          return { desc: desc || 'Item', qty, rate, total };
        });
        const gstAmt = Math.round(subtotal * (gstPct / 100) * 100) / 100;
        const grand = subtotal + gstAmt;
        const note = val('dtNote');
        const pdfLines = [
          { text: `${biz} — ${isInv ? 'TAX INVOICE' : 'QUOTATION'}`, bold: true, size: 13 },
          { text: `${isInv ? 'Invoice' : 'Quote'} #: ${num}   |   Date: ${todayKey()}`, muted: true },
          { text: `Bill To: ${client}`, bold: true },
          { type: 'hr' },
          ...parsedItems.map((it) => ({
            text: `${it.desc}   (Qty ${it.qty} x INR ${it.rate.toLocaleString('en-IN')})  =  INR ${it.total.toLocaleString('en-IN')}`
          })),
          { type: 'hr' },
          { text: `Subtotal: INR ${subtotal.toLocaleString('en-IN')}`, bold: true },
          ...(gstPct > 0 ? [{ text: `GST (${gstPct}%): INR ${gstAmt.toLocaleString('en-IN')}` }] : []),
          { text: `Grand Total: INR ${grand.toLocaleString('en-IN')}`, bold: true, size: 12.5, accent: true },
          ...(note ? [{ type: 'hr' }, { text: `Notes: ${note}`, muted: true }] : [])
        ];
        const html = `
          <div class="flex justify-between items-start border-b border-slate-200 pb-2">
            <div><div class="text-sm font-extrabold">${esc(biz)}</div><div class="text-[11px] text-slate-500">To: ${esc(client)}</div></div>
            <div class="text-right"><div class="text-xs font-bold text-[#7457E8]">${isInv ? 'INVOICE' : 'QUOTATION'}</div><div class="text-[11px] tabular-nums text-slate-500">${esc(num)} · ${todayKey()}</div></div>
          </div>
          <div class="space-y-1 pt-1">
            ${parsedItems.map((it) => `<div class="flex justify-between tabular-nums"><span>${esc(it.desc)} × ${it.qty}</span><span class="font-semibold">₹${it.total.toLocaleString('en-IN')}</span></div>`).join('')}
          </div>
          <div class="border-t border-slate-200 pt-2 space-y-0.5 text-right tabular-nums">
            <div class="text-slate-600">Subtotal: ₹${subtotal.toLocaleString('en-IN')}</div>
            ${gstPct > 0 ? `<div class="text-slate-600">GST (${gstPct}%): ₹${gstAmt.toLocaleString('en-IN')}</div>` : ''}
            <div class="text-sm font-extrabold text-[#10152A]">Total: ₹${grand.toLocaleString('en-IN')}</div>
          </div>
          ${note ? `<p class="text-[11px] text-slate-500 pt-1">${esc(note)}</p>` : ''}
        `;
        return { title: `${isInv ? 'Invoice' : 'Quotation'}_${num}`, pdfLines, html };
      }

      if (activeDocType === 'resume') {
        const name = val('dtName') || 'Your Full Name';
        const role = val('dtRole') || 'Professional Title';
        const contact = val('dtContact') || 'Phone · Email · City';
        const summary = val('dtSummary');
        const exp = val('dtExp');
        const edu = val('dtEdu');
        const skills = val('dtSkills');
        const pdfLines = [
          { text: name, bold: true, size: 15 },
          { text: role, bold: true, accent: true, size: 11.5 },
          { text: contact, muted: true },
          { type: 'hr' },
          ...(summary ? [{ text: 'PROFESSIONAL SUMMARY', bold: true, accent: true }, { text: summary, gap: 10 }] : []),
          ...(exp ? [{ text: 'EXPERIENCE & PROJECTS', bold: true, accent: true }, { text: exp, gap: 10 }] : []),
          ...(edu ? [{ text: 'EDUCATION', bold: true, accent: true }, { text: edu, gap: 10 }] : []),
          ...(skills ? [{ text: 'KEY SKILLS', bold: true, accent: true }, { text: skills }] : [])
        ];
        const html = `
          <div class="border-b border-slate-200 pb-2">
            <div class="text-base font-extrabold">${esc(name)}</div>
            <div class="text-xs font-bold text-[#7457E8]">${esc(role)}</div>
            <div class="text-[11px] text-slate-500 mt-0.5">${esc(contact)}</div>
          </div>
          ${summary ? `<div><div class="text-[10px] font-bold uppercase text-slate-500">Summary</div><p class="mt-0.5 whitespace-pre-line">${esc(summary)}</p></div>` : ''}
          ${exp ? `<div><div class="text-[10px] font-bold uppercase text-slate-500">Experience</div><p class="mt-0.5 whitespace-pre-line">${esc(exp)}</p></div>` : ''}
          ${edu ? `<div><div class="text-[10px] font-bold uppercase text-slate-500">Education</div><p class="mt-0.5 whitespace-pre-line">${esc(edu)}</p></div>` : ''}
          ${skills ? `<div><div class="text-[10px] font-bold uppercase text-slate-500">Skills</div><p class="mt-0.5">${esc(skills)}</p></div>` : ''}
        `;
        return { title: `Resume_${name}`, pdfLines, html };
      }

      if (activeDocType === 'receipt') {
        const no = val('dtRecNo') || 'RCPT-001';
        const dt = val('dtRecDate') || todayKey();
        const from = val('dtRecFrom') || 'Payer Name';
        const amt = Number(val('dtRecAmt') || 0);
        const mode = val('dtRecMode') || 'UPI';
        const by = val('dtRecBy') || 'Authorized Signatory';
        const purpose = val('dtRecPurpose') || 'Payment Received';
        const pdfLines = [
          { text: `PAYMENT RECEIPT (${no})`, bold: true, size: 14 },
          { text: `Date: ${dt}`, muted: true },
          { type: 'hr' },
          { text: `Received with thanks from: ${from}`, bold: true },
          { text: `Sum of: INR ${amt.toLocaleString('en-IN')}`, bold: true, size: 13, accent: true },
          { text: `Payment Mode: ${mode}` },
          { text: `Towards: ${purpose}`, gap: 14 },
          { type: 'hr' },
          { text: `Received By: ${by}`, bold: true }
        ];
        const html = `
          <div class="flex justify-between border-b border-slate-200 pb-2">
            <span class="font-extrabold">PAYMENT RECEIPT</span>
            <span class="text-slate-500 tabular-nums">${esc(no)} · ${esc(dt)}</span>
          </div>
          <p>Received with thanks from <strong>${esc(from)}</strong> the sum of <strong class="text-[#7457E8] tabular-nums">₹${amt.toLocaleString('en-IN')}</strong> via <strong>${esc(mode)}</strong>.</p>
          <p class="text-slate-600">Purpose: ${esc(purpose)}</p>
          <div class="pt-3 text-right text-[11px] font-bold">Authorized By: ${esc(by)}</div>
        `;
        return { title: `Receipt_${no}`, pdfLines, html };
      }

      const from = val('dtLetFrom') || 'Sender Name';
      const to = val('dtLetTo') || 'Recipient';
      const sub = val('dtLetSub') || 'Official Request';
      const body = val('dtLetBody') || 'Respected Sir/Madam,\n\nPlease enter your letter content above.';
      const pdfLines = [
        { text: `Date: ${todayKey()}`, muted: true },
        { text: `From: ${from}`, bold: true },
        { text: `To: ${to}`, bold: true, gap: 10 },
        { text: `Subject: ${sub}`, bold: true, accent: true, gap: 10 },
        { type: 'hr' },
        ...body.split('\n').map((l) => ({ text: l || ' ' })),
        { text: `Sincerely, ${from}`, bold: true, gap: 12 }
      ];
      const html = `
        <div class="text-[11px] text-slate-500">Date: ${todayKey()}</div>
        <div><strong>From:</strong> ${esc(from)}</div>
        <div><strong>To:</strong> ${esc(to)}</div>
        <div class="font-bold text-[#7457E8] pt-1">Subject: ${esc(sub)}</div>
        <div class="whitespace-pre-line border-t border-slate-200 pt-2 leading-relaxed">${esc(body)}</div>
        <div class="pt-2 font-bold">Sincerely, ${esc(from)}</div>
      `;
      return { title: `Letter_${sub.slice(0, 24)}`, pdfLines, html };
    }

    const previewBox = panel.querySelector('#dtPreviewBox');
    const updatePreview = () => {
      if (!previewBox) return;
      previewBox.innerHTML = buildDocModel().html;
    };
    updatePreview();
    panel.querySelectorAll('input, textarea, select').forEach((el) => el.addEventListener('input', updatePreview));

    panel.querySelector('#dtExportPdfBtn')?.addEventListener('click', () => {
      const m = buildDocModel();
      exportTemplateToPdf(m.title, m.pdfLines);
    });

    panel.querySelector('#dtPrintBtn')?.addEventListener('click', () => {
      if (global.AndroidBridge && typeof global.AndroidBridge.printDocument === 'function') {
        global.AndroidBridge.printDocument();
      } else {
        window.print();
      }
    });
  }

  /* ========================================================================
     3. LIFESTYLE & WELLNESS (Exercise, Sleep Notes, Medicine, Personal Goals)
     ======================================================================== */
  function renderLifestyle(panel) {
    const data = loadData();
    const tKey = todayKey();
    const exChecked = new Set(data.exerciseChecks[tKey] || []);
    const medChecked = new Set(data.medicineChecks[tKey] || []);

    panel.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- Exercise Checklist -->
        <div class="oneora-surface p-5 space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-base font-bold text-[#171B2C] dark:text-[#F5F6FC]">Exercise Checklist</h3>
              <p class="text-xs text-[#777F91] dark:text-[#A5ADC2]">Track daily movement, walking, yoga, or home workouts.</p>
            </div>
            <span class="text-xs font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">${exChecked.size}/${data.exercises.length} done</span>
          </div>

          <form id="compExForm" class="flex gap-2">
            <input type="text" id="compExName" required placeholder="e.g. 30 min Brisk Walk" class="flex-1 oneora-input text-xs" />
            <button type="submit" class="oneora-btn-primary text-xs px-4">Add</button>
          </form>

          <div class="space-y-2">
            ${data.exercises.length ? data.exercises.map((ex) => {
              const done = exChecked.has(ex.id);
              return `
                <div class="flex items-center justify-between gap-2 p-3 rounded-xl bg-[#F6F7FB] dark:bg-[#1D2540]/70 border border-[#E8EAF2] dark:border-[#232C4A]">
                  <label class="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer">
                    <input type="checkbox" data-ex-toggle="${ex.id}" ${done ? 'checked' : ''} class="w-4 h-4 rounded accent-[#7457E8]" />
                    <span class="text-xs font-semibold truncate ${done ? 'line-through text-[#777F91]' : 'text-[#171B2C] dark:text-[#F5F6FC]'}">${esc(ex.name)}</span>
                  </label>
                  <button type="button" data-ex-del="${ex.id}" class="text-xs text-[#777F91] hover:text-rose-600 px-1.5">✕</button>
                </div>
              `;
            }).join('') : `
              <div class="oneora-empty-state py-5">
                <p class="text-xs font-semibold text-[#171B2C] dark:text-[#F5F6FC]">No exercises added yet</p>
                <p class="text-[11px] text-[#777F91] mt-0.5">Add a simple daily movement habit to stay consistent.</p>
              </div>
            `}
          </div>
        </div>

        <!-- Medicine Reminders -->
        <div class="oneora-surface p-5 space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-base font-bold text-[#171B2C] dark:text-[#F5F6FC]">Medicine Tracker</h3>
              <p class="text-xs text-[#777F91] dark:text-[#A5ADC2]">Log daily doses and schedule planner alerts with one tap.</p>
            </div>
            <span class="text-xs font-bold text-[#7457E8] dark:text-[#B4A5FF] tabular-nums">${medChecked.size}/${data.medicines.length} taken</span>
          </div>

          <form id="compMedForm" class="grid grid-cols-12 gap-2">
            <input type="text" id="compMedName" required placeholder="Medicine name" class="col-span-5 oneora-input text-xs" />
            <input type="text" id="compMedDose" placeholder="Dosage (1 tab)" class="col-span-4 oneora-input text-xs" />
            <input type="time" id="compMedTime" value="08:30" class="col-span-3 oneora-input text-xs" />
            <button type="submit" class="col-span-12 oneora-btn-primary text-xs">Add Medicine</button>
          </form>

          <div class="space-y-2">
            ${data.medicines.length ? data.medicines.map((m) => {
              const taken = medChecked.has(m.id);
              return `
                <div class="flex items-center justify-between gap-2 p-3 rounded-xl bg-[#F6F7FB] dark:bg-[#1D2540]/70 border border-[#E8EAF2] dark:border-[#232C4A]">
                  <label class="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer">
                    <input type="checkbox" data-med-toggle="${m.id}" ${taken ? 'checked' : ''} class="w-4 h-4 rounded accent-[#7457E8]" />
                    <div class="min-w-0">
                      <p class="text-xs font-semibold truncate ${taken ? 'line-through text-[#777F91]' : 'text-[#171B2C] dark:text-[#F5F6FC]'}">${esc(m.name)}</p>
                      <p class="text-[11px] text-[#777F91] tabular-nums">${esc(m.dose || 'Standard dose')} · ${esc(m.time || '')}</p>
                    </div>
                  </label>
                  <div class="flex items-center gap-1.5 shrink-0">
                    <button type="button" data-med-remind="${m.id}" class="text-[11px] font-bold px-2 py-1 rounded-lg border border-[#E8EAF2] dark:border-[#232C4A] text-[#171B2C] dark:text-[#F5F6FC] hover:border-[#7457E8]">+ Alert</button>
                    <button type="button" data-med-del="${m.id}" class="text-xs text-[#777F91] hover:text-rose-600 px-1">✕</button>
                  </div>
                </div>
              `;
            }).join('') : `
              <div class="oneora-empty-state py-5">
                <p class="text-xs font-semibold text-[#171B2C] dark:text-[#F5F6FC]">No medicines tracked</p>
                <p class="text-[11px] text-[#777F91] mt-0.5">Add supplements or prescriptions to track daily intake.</p>
              </div>
            `}
          </div>
        </div>

        <!-- Sleep Notes -->
        <div class="oneora-surface p-5 space-y-4">
          <div>
            <h3 class="text-base font-bold text-[#171B2C] dark:text-[#F5F6FC]">Sleep Notes</h3>
            <p class="text-xs text-[#777F91] dark:text-[#A5ADC2]">Record sleep &amp; wake times with automatic duration calculation.</p>
          </div>

          <form id="compSleepForm" class="grid grid-cols-12 gap-2">
            <div class="col-span-4">
              <label class="block text-[10px] font-semibold text-[#777F91] mb-1">Bedtime</label>
              <input type="time" id="compSleepBed" value="23:00" class="oneora-input text-xs" />
            </div>
            <div class="col-span-4">
              <label class="block text-[10px] font-semibold text-[#777F91] mb-1">Wake Time</label>
              <input type="time" id="compSleepWake" value="06:30" class="oneora-input text-xs" />
            </div>
            <div class="col-span-4">
              <label class="block text-[10px] font-semibold text-[#777F91] mb-1">Quality</label>
              <select id="compSleepQual" class="oneora-input text-xs">
                <option value="Rested">Rested</option>
                <option value="Fair">Fair</option>
                <option value="Tired">Tired</option>
              </select>
            </div>
            <input type="text" id="compSleepNote" placeholder="Optional sleep note..." class="col-span-8 oneora-input text-xs" />
            <button type="submit" class="col-span-4 oneora-btn-primary text-xs">Log Sleep</button>
          </form>

          <div class="space-y-2 max-h-56 overflow-y-auto">
            ${data.sleepLogs.slice(0, 7).map((s) => `
              <div class="flex items-center justify-between gap-2 p-3 rounded-xl bg-[#F6F7FB] dark:bg-[#1D2540]/70 border border-[#E8EAF2] dark:border-[#232C4A]">
                <div class="min-w-0">
                  <p class="text-xs font-bold text-[#171B2C] dark:text-[#F5F6FC] tabular-nums">${esc(s.duration)} · <span class="text-[#7457E8] dark:text-[#B4A5FF]">${esc(s.quality)}</span></p>
                  <p class="text-[11px] text-[#777F91] tabular-nums">${esc(s.date)} (${esc(s.bed)} → ${esc(s.wake)})${s.note ? ` · ${esc(s.note)}` : ''}</p>
                </div>
                <button type="button" data-sleep-del="${s.id}" class="text-xs text-[#777F91] hover:text-rose-600 px-1.5">✕</button>
              </div>
            `).join('') || `<p class="text-xs text-[#777F91] text-center py-4">No sleep logs yet.</p>`}
          </div>
        </div>

        <!-- Personal Goals -->
        <div class="oneora-surface p-5 space-y-4">
          <div>
            <h3 class="text-base font-bold text-[#171B2C] dark:text-[#F5F6FC]">Personal Goals</h3>
            <p class="text-xs text-[#777F91] dark:text-[#A5ADC2]">Track study, career, reading, or personal milestones.</p>
          </div>

          <form id="compGoalForm" class="grid grid-cols-12 gap-2">
            <input type="text" id="compGoalTitle" required placeholder="Goal (e.g. Finish Python Course)" class="col-span-7 oneora-input text-xs" />
            <input type="date" id="compGoalDate" class="col-span-5 oneora-input text-xs" />
            <button type="submit" class="col-span-12 oneora-btn-primary text-xs">Add Personal Goal</button>
          </form>

          <div class="space-y-2.5 max-h-60 overflow-y-auto">
            ${data.goals.length ? data.goals.map((g) => `
              <div class="p-3 rounded-xl bg-[#F6F7FB] dark:bg-[#1D2540]/70 border border-[#E8EAF2] dark:border-[#232C4A] space-y-2">
                <div class="flex items-center justify-between gap-2">
                  <div class="min-w-0">
                    <p class="text-xs font-bold text-[#171B2C] dark:text-[#F5F6FC] truncate">${esc(g.title)}</p>
                    ${g.targetDate ? `<p class="text-[11px] text-[#777F91] tabular-nums">Target: ${esc(g.targetDate)}</p>` : ''}
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    <span class="text-xs font-extrabold text-[#7457E8] dark:text-[#B4A5FF] tabular-nums">${g.progress}%</span>
                    <button type="button" data-goal-del="${g.id}" class="text-xs text-[#777F91] hover:text-rose-600 px-1">✕</button>
                  </div>
                </div>
                <input type="range" min="0" max="100" step="5" value="${g.progress}" data-goal-range="${g.id}" class="w-full accent-[#7457E8]" />
              </div>
            `).join('') : `
              <div class="oneora-empty-state py-5">
                <p class="text-xs font-semibold text-[#171B2C] dark:text-[#F5F6FC]">No personal goals yet</p>
                <p class="text-[11px] text-[#777F91] mt-0.5">Set a target and track progress with the slider.</p>
              </div>
            `}
          </div>
        </div>
      </div>
    `;

    // Bindings
    panel.querySelector('#compExForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = panel.querySelector('#compExName').value.trim();
      if (!name) return;
      const d = loadData();
      d.exercises.push({ id: uid('ex'), name });
      saveData(d);
      render();
    });
    panel.querySelectorAll('[data-ex-toggle]').forEach((chk) => {
      chk.addEventListener('change', () => {
        const d = loadData();
        const set = new Set(d.exerciseChecks[tKey] || []);
        if (chk.checked) set.add(chk.getAttribute('data-ex-toggle'));
        else set.delete(chk.getAttribute('data-ex-toggle'));
        d.exerciseChecks[tKey] = Array.from(set);
        saveData(d);
        render();
      });
    });
    panel.querySelectorAll('[data-ex-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const d = loadData();
        d.exercises = d.exercises.filter((x) => x.id !== btn.getAttribute('data-ex-del'));
        saveData(d);
        render();
      });
    });

    panel.querySelector('#compMedForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = panel.querySelector('#compMedName').value.trim();
      if (!name) return;
      const d = loadData();
      d.medicines.push({
        id: uid('med'),
        name,
        dose: panel.querySelector('#compMedDose').value.trim(),
        time: panel.querySelector('#compMedTime').value
      });
      saveData(d);
      render();
    });
    panel.querySelectorAll('[data-med-toggle]').forEach((chk) => {
      chk.addEventListener('change', () => {
        const d = loadData();
        const set = new Set(d.medicineChecks[tKey] || []);
        if (chk.checked) set.add(chk.getAttribute('data-med-toggle'));
        else set.delete(chk.getAttribute('data-med-toggle'));
        d.medicineChecks[tKey] = Array.from(set);
        saveData(d);
        render();
      });
    });
    panel.querySelectorAll('[data-med-remind]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const m = loadData().medicines.find((x) => x.id === btn.getAttribute('data-med-remind'));
        if (!m) return;
        addEventToPlanner(`Medicine: ${m.name} (${m.dose || 'Dose'})`, todayKey(), m.time || '08:30', 'Medicine');
      });
    });
    panel.querySelectorAll('[data-med-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const d = loadData();
        d.medicines = d.medicines.filter((x) => x.id !== btn.getAttribute('data-med-del'));
        saveData(d);
        render();
      });
    });

    panel.querySelector('#compSleepForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const bed = panel.querySelector('#compSleepBed').value;
      const wake = panel.querySelector('#compSleepWake').value;
      const d = loadData();
      d.sleepLogs.unshift({
        id: uid('slp'),
        date: todayKey(),
        bed,
        wake,
        duration: calcSleepDuration(bed, wake),
        quality: panel.querySelector('#compSleepQual').value,
        note: panel.querySelector('#compSleepNote').value.trim()
      });
      saveData(d);
      render();
    });
    panel.querySelectorAll('[data-sleep-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const d = loadData();
        d.sleepLogs = d.sleepLogs.filter((x) => x.id !== btn.getAttribute('data-sleep-del'));
        saveData(d);
        render();
      });
    });

    panel.querySelector('#compGoalForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = panel.querySelector('#compGoalTitle').value.trim();
      if (!title) return;
      const d = loadData();
      d.goals.unshift({
        id: uid('goal'),
        title,
        targetDate: panel.querySelector('#compGoalDate').value,
        progress: 0
      });
      saveData(d);
      render();
    });
    panel.querySelectorAll('[data-goal-range]').forEach((rng) => {
      rng.addEventListener('change', () => {
        const d = loadData();
        const g = d.goals.find((x) => x.id === rng.getAttribute('data-goal-range'));
        if (g) g.progress = Number(rng.value || 0);
        saveData(d);
        render();
      });
    });
    panel.querySelectorAll('[data-goal-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const d = loadData();
        d.goals = d.goals.filter((x) => x.id !== btn.getAttribute('data-goal-del'));
        saveData(d);
        render();
      });
    });
  }

  /* ========================================================================
     4. SECURITY+ (AES-256-GCM Encrypted Password Vault & Secure Notes)
     ======================================================================== */
  function renderSecurityPlus(panel) {
    const hasVault = Boolean(localStorage.getItem(SEC_VAULT_KEY));
    const cryptoOk = Boolean(global.crypto && global.crypto.subtle);

    if (!cryptoOk) {
      panel.innerHTML = `
        <div class="oneora-surface p-6 text-center space-y-2">
          <h3 class="text-base font-bold text-[#171B2C] dark:text-[#F5F6FC]">Secure Context Required</h3>
          <p class="text-xs text-[#777F91]">AES-256 encryption requires HTTPS or the ONEORA Android app.</p>
        </div>
      `;
      return;
    }

    if (!secUnlockedKey || !secDecryptedCache) {
      panel.innerHTML = `
        <div class="oneora-surface p-6 sm:p-8 max-w-md mx-auto text-center space-y-4">
          <div class="w-12 h-12 rounded-2xl bg-[#EEF2FF] dark:bg-[#1D2540] text-[#7457E8] dark:text-[#B4A5FF] mx-auto flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <div>
            <h3 class="text-lg font-extrabold text-[#171B2C] dark:text-[#F5F6FC]">${hasVault ? 'Unlock Encrypted Password Vault' : 'Create Your AES-256 Password Vault'}</h3>
            <p class="text-xs text-[#777F91] dark:text-[#A5ADC2] mt-1">
              ${hasVault
                ? 'Enter your Master Passphrase to decrypt your saved passwords and secure notes locally.'
                : 'Set a strong Master Passphrase. Everything is encrypted on-device with PBKDF2 + AES-256-GCM and never leaves your phone.'}
            </p>
          </div>

          <form id="secAuthForm" class="space-y-3 text-left">
            <div>
              <label class="block text-[11px] font-semibold text-[#777F91] mb-1">Master Passphrase (min 6 chars)</label>
              <input type="password" id="secPassInput" required minlength="6" autocomplete="off" placeholder="Enter master passphrase" class="oneora-input text-sm" />
            </div>
            ${!hasVault ? `
              <div>
                <label class="block text-[11px] font-semibold text-[#777F91] mb-1">Confirm Passphrase</label>
                <input type="password" id="secPassConfirm" required minlength="6" autocomplete="off" placeholder="Re-enter master passphrase" class="oneora-input text-sm" />
              </div>
            ` : ''}
            <button type="submit" class="w-full oneora-btn-primary text-xs">${hasVault ? 'Decrypt & Unlock Vault' : 'Initialize AES-256 Vault'}</button>
          </form>
        </div>
      `;

      panel.querySelector('#secAuthForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pass = panel.querySelector('#secPassInput').value;
        if (pass.length < 6) {
          toast('Passphrase Too Short', 'Use at least 6 characters for strong AES-256 protection.', 'info');
          return;
        }
        try {
          if (!hasVault) {
            const conf = panel.querySelector('#secPassConfirm').value;
            if (pass !== conf) {
              toast('Mismatch', 'Both passphrases must match.', 'error');
              return;
            }
            const salt = crypto.getRandomValues(new Uint8Array(16));
            const saltB64 = bufToB64(salt);
            const key = await deriveAesKey(pass, salt);
            secUnlockedKey = key;
            secMasterSalt = saltB64;
            secDecryptedCache = { passwords: [], notes: [] };
            await encryptVaultPayload(key, saltB64, secDecryptedCache);
            toast('Vault Created', 'Your AES-256 encrypted vault is ready.', 'success');
            render();
          } else {
            await decryptVaultPayload(pass);
            toast('Vault Unlocked', 'Decrypted locally in memory.', 'success');
            render();
          }
        } catch {
          toast('Invalid Passphrase', 'Decryption failed. Please check your master passphrase.', 'error');
        }
      });
      return;
    }

    const { passwords, notes } = secDecryptedCache;
    panel.innerHTML = `
      <div class="space-y-4">
        <div class="oneora-surface p-4 flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2.5">
            <span class="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
            </span>
            <div>
              <p class="text-xs font-bold text-[#171B2C] dark:text-[#F5F6FC]">AES-256-GCM Vault Unlocked</p>
              <p class="text-[11px] text-[#777F91] tabular-nums">${passwords.length} passwords · ${notes.length} secure notes encrypted locally</p>
            </div>
          </div>
          <button type="button" id="secLockNowBtn" class="oneora-btn-secondary text-xs">Lock Vault Now</button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <!-- Saved Passwords -->
          <div class="oneora-surface p-5 space-y-4">
            <h3 class="text-base font-bold text-[#171B2C] dark:text-[#F5F6FC]">Encrypted Passwords</h3>
            <form id="secAddPwdForm" class="space-y-2">
              <input type="text" id="secPwdSite" required placeholder="Website / App (e.g. SBI, Gmail)" class="oneora-input text-xs" />
              <input type="text" id="secPwdUser" placeholder="Username / Email / Phone" class="oneora-input text-xs" />
              <div class="flex gap-2">
                <input type="text" id="secPwdVal" required autocomplete="off" placeholder="Password" class="flex-1 oneora-input text-xs font-mono" />
                <button type="button" id="secGenPwdBtn" class="oneora-btn-secondary text-xs whitespace-nowrap">Generate</button>
              </div>
              <button type="submit" class="w-full oneora-btn-primary text-xs">Encrypt &amp; Save Password</button>
            </form>

            <div class="space-y-2 max-h-72 overflow-y-auto">
              ${passwords.length ? passwords.map((p) => `
                <div class="p-3 rounded-xl bg-[#F6F7FB] dark:bg-[#1D2540]/70 border border-[#E8EAF2] dark:border-[#232C4A] space-y-1.5">
                  <div class="flex items-center justify-between gap-2">
                    <p class="text-xs font-bold text-[#171B2C] dark:text-[#F5F6FC] truncate">${esc(p.site)}</p>
                    <button type="button" data-sec-del-pwd="${p.id}" class="text-xs text-[#777F91] hover:text-rose-600 px-1">✕</button>
                  </div>
                  ${p.user ? `<p class="text-[11px] text-[#777F91] truncate">${esc(p.user)}</p>` : ''}
                  <div class="flex items-center justify-between gap-2 pt-1">
                    <code data-sec-pwd-display="${p.id}" class="text-xs font-mono text-[#171B2C] dark:text-[#F5F6FC]">••••••••••••</code>
                    <div class="flex items-center gap-1.5">
                      <button type="button" data-sec-reveal="${p.id}" class="text-[11px] font-semibold text-[#7457E8] dark:text-[#B4A5FF] px-2 py-1 rounded-lg bg-white dark:bg-[#151B2F] border border-[#E8EAF2] dark:border-[#232C4A]">Show</button>
                      <button type="button" data-sec-copy="${p.id}" class="text-[11px] font-semibold text-[#171B2C] dark:text-[#F5F6FC] px-2 py-1 rounded-lg bg-white dark:bg-[#151B2F] border border-[#E8EAF2] dark:border-[#232C4A]">Copy</button>
                    </div>
                  </div>
                </div>
              `).join('') : `
                <div class="oneora-empty-state py-5">
                  <p class="text-xs font-semibold text-[#171B2C] dark:text-[#F5F6FC]">No passwords stored yet</p>
                  <p class="text-[11px] text-[#777F91] mt-0.5">Every entry is encrypted with AES-256-GCM before saving.</p>
                </div>
              `}
            </div>
          </div>

          <!-- Secure Notes -->
          <div class="oneora-surface p-5 space-y-4">
            <h3 class="text-base font-bold text-[#171B2C] dark:text-[#F5F6FC]">Encrypted Secure Notes</h3>
            <form id="secAddNoteForm" class="space-y-2">
              <input type="text" id="secNoteTitle" required placeholder="Note title (e.g. Recovery Codes, Locker Info)" class="oneora-input text-xs" />
              <textarea id="secNoteBody" required rows="3" placeholder="Private content encrypted with AES-256..." class="oneora-input text-xs"></textarea>
              <button type="submit" class="w-full oneora-btn-primary text-xs">Encrypt &amp; Save Note</button>
            </form>

            <div class="space-y-2 max-h-72 overflow-y-auto">
              ${notes.length ? notes.map((n) => `
                <div class="p-3 rounded-xl bg-[#F6F7FB] dark:bg-[#1D2540]/70 border border-[#E8EAF2] dark:border-[#232C4A] space-y-1">
                  <div class="flex items-center justify-between gap-2">
                    <p class="text-xs font-bold text-[#171B2C] dark:text-[#F5F6FC] truncate">${esc(n.title)}</p>
                    <button type="button" data-sec-del-note="${n.id}" class="text-xs text-[#777F91] hover:text-rose-600 px-1">✕</button>
                  </div>
                  <p class="text-xs text-[#777F91] dark:text-[#A5ADC2] whitespace-pre-line break-words">${esc(n.body)}</p>
                </div>
              `).join('') : `
                <div class="oneora-empty-state py-5">
                  <p class="text-xs font-semibold text-[#171B2C] dark:text-[#F5F6FC]">No secure notes yet</p>
                  <p class="text-[11px] text-[#777F91] mt-0.5">Store private PINs, backup codes, or sensitive details safely.</p>
                </div>
              `}
            </div>
          </div>
        </div>
      </div>
    `;

    panel.querySelector('#secLockNowBtn')?.addEventListener('click', () => {
      secUnlockedKey = null;
      secDecryptedCache = null;
      toast('Vault Locked', 'Encryption key cleared from memory.', 'info');
      render();
    });

    panel.querySelector('#secGenPwdBtn')?.addEventListener('click', () => {
      const inp = panel.querySelector('#secPwdVal');
      if (inp) inp.value = generateStrongPassword(16);
    });

    panel.querySelector('#secAddPwdForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const site = panel.querySelector('#secPwdSite').value.trim();
      const user = panel.querySelector('#secPwdUser').value.trim();
      const val = panel.querySelector('#secPwdVal').value;
      if (!site || !val) return;
      secDecryptedCache.passwords.unshift({ id: uid('pwd'), site, user, val });
      await encryptVaultPayload(secUnlockedKey, secMasterSalt, secDecryptedCache);
      toast('Saved Securely', `${site} encrypted with AES-256.`, 'success');
      render();
    });

    panel.querySelectorAll('[data-sec-reveal]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-sec-reveal');
        const entry = secDecryptedCache.passwords.find((p) => p.id === id);
        const codeEl = panel.querySelector(`[data-sec-pwd-display="${id}"]`);
        if (!entry || !codeEl) return;
        const shown = btn.textContent === 'Hide';
        codeEl.textContent = shown ? '••••••••••••' : entry.val;
        btn.textContent = shown ? 'Show' : 'Hide';
      });
    });

    panel.querySelectorAll('[data-sec-copy]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const entry = secDecryptedCache.passwords.find((p) => p.id === btn.getAttribute('data-sec-copy'));
        if (!entry) return;
        try {
          await navigator.clipboard.writeText(entry.val);
          toast('Copied', `Password for ${entry.site} copied to clipboard.`, 'success');
        } catch {
          toast('Copy Notice', 'Tap Show to copy manually.', 'info');
        }
      });
    });

    panel.querySelectorAll('[data-sec-del-pwd]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        secDecryptedCache.passwords = secDecryptedCache.passwords.filter((p) => p.id !== btn.getAttribute('data-sec-del-pwd'));
        await encryptVaultPayload(secUnlockedKey, secMasterSalt, secDecryptedCache);
        render();
      });
    });

    panel.querySelector('#secAddNoteForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = panel.querySelector('#secNoteTitle').value.trim();
      const body = panel.querySelector('#secNoteBody').value.trim();
      if (!title || !body) return;
      secDecryptedCache.notes.unshift({ id: uid('sn'), title, body });
      await encryptVaultPayload(secUnlockedKey, secMasterSalt, secDecryptedCache);
      toast('Note Encrypted', `"${title}" saved inside AES-256 vault.`, 'success');
      render();
    });

    panel.querySelectorAll('[data-sec-del-note]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        secDecryptedCache.notes = secDecryptedCache.notes.filter((n) => n.id !== btn.getAttribute('data-sec-del-note'));
        await encryptVaultPayload(secUnlockedKey, secMasterSalt, secDecryptedCache);
        render();
      });
    });
  }

  /* ========================================================================
     PUBLIC API + UNIVERSAL SEARCH INTEGRATION
     ======================================================================== */
  function openSubTab(tabId) {
    if (['lifeplus', 'doctemplates', 'lifestyle', 'securityplus'].includes(tabId)) {
      activeTab = tabId;
    }
    if (typeof global.openPdfBondhuTool === 'function') {
      global.openPdfBondhuTool('oneoraCompanionTab');
    }
    render();
  }

  function search(query) {
    const q = String(query || '').trim().toLowerCase();
    if (q.length < 2) return [];
    const d = loadData();
    const out = [];
    d.shopping.forEach((s) => {
      if (s.name.toLowerCase().includes(q)) {
        out.push({ title: s.name, subtitle: 'LIFE+ · Shopping List', action: () => openSubTab('lifeplus') });
      }
    });
    d.birthdays.forEach((b) => {
      if (b.name.toLowerCase().includes(q)) {
        out.push({ title: `${b.name} (${b.type})`, subtitle: `LIFE+ · ${b.date}`, action: () => openSubTab('lifeplus') });
      }
    });
    d.goals.forEach((g) => {
      if (g.title.toLowerCase().includes(q)) {
        out.push({ title: g.title, subtitle: `LIFESTYLE · Goal (${g.progress}%)`, action: () => openSubTab('lifestyle') });
      }
    });
    if (/resume|cv|invoice|quotation|receipt|letter|template/i.test(q)) {
      out.push({ title: 'Document Templates Studio (Resume, Invoice, Receipt, Letter)', subtitle: 'DOCUMENTS · Offline PDF Export', action: () => openSubTab('doctemplates') });
    }
    if (/password|vault|secret|secure note/i.test(q)) {
      out.push({ title: 'AES-256 Encrypted Password Vault & Secure Notes', subtitle: 'SECURITY · Zero-Plaintext On-Device Vault', action: () => openSubTab('securityplus') });
    }
    return out.slice(0, 5);
  }

  document.addEventListener('DOMContentLoaded', () => {
    render();
  });

  global.OneoraCompanion = {
    openSubTab,
    render,
    search
  };
})(window);
