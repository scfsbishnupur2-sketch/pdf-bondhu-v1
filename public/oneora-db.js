(function(global) {
  const DB_NAME = "ONEORA_LocalDB";
  const DB_VERSION = 1;
  const STORE_KV = "module_snapshots";
  const STORE_META = "migration_meta";
  const MANAGED_KEYS = [
    { key: "oneoraFinanceRecords_v1", label: "Finance & Expenses", type: "array" },
    { key: "oneora_khata_v1", label: "Khata / Udhar Ledger", type: "object" },
    { key: "oneora_khata_pin_v1", label: "Khata PIN Lock", type: "object" },
    { key: "oneora_fin_calc_v1", label: "Finance Calculators & Saved Rates", type: "object" },
    { key: "oneora_social_tools_v1", label: "WhatsApp Direct & Saved Captions", type: "object" },
    { key: "oneora_voice_helper_v1", label: "Voice Notes & Letter Drafts", type: "object" },
    { key: "oneora_office_pro_v1", label: "Bangla Converter & Excel Formulas", type: "object" },
    { key: "oneora_utilities_safety_v1", label: "Land Measurements & Speed History", type: "object" },
    { key: "oneoraPlannerItems_v1", label: "Calendar, Tasks, Notes & Reminders", type: "array" },
    { key: "oneoraDocExpiries_v1", label: "Document Expiry Tracker", type: "array" },
    { key: "oneoraWaterTracker_v1", label: "Daily Water Tracker", type: "object" },
    { key: "oneoraSavedLinks_v1", label: "Saved Links", type: "array" },
    { key: "pdfBondhuVault", label: "Encrypted Vault Metadata", type: "array" },
    { key: "oneoraQuickActions_v1", label: "Quick Actions Layout", type: "array" },
    { key: "oneoraHomeWidgets_v1", label: "Home Dashboard Preferences", type: "object" },
    { key: "oneoraCompanionData_v1", label: "Life+, Wellness & Goals", type: "object" },
    { key: "oneoraSecVault_v1", label: "AES-256 Encrypted Password Vault", type: "object" },
    { key: "oneora_privacy_consent_v1", label: "Privacy & Consent Preferences", type: "object" }
  ];
  let dbPromise = null;
  function openDb() {
    if (!("indexedDB" in global)) return Promise.resolve(null);
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve) => {
      try {
        const req = global.indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (ev) => {
          const db = ev.target.result;
          if (!db.objectStoreNames.contains(STORE_KV)) {
            db.createObjectStore(STORE_KV, { keyPath: "key" });
          }
          if (!db.objectStoreNames.contains(STORE_META)) {
            db.createObjectStore(STORE_META, { keyPath: "id" });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
    return dbPromise;
  }
  async function idbGet(storeName, key) {
    const db = await openDb();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, "readonly");
        const req = tx.objectStore(storeName).get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  }
  async function idbPut(storeName, value) {
    const db = await openDb();
    if (!db) return false;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, "readwrite");
        tx.objectStore(storeName).put(value);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  }
  async function idbClear(storeName) {
    const db = await openDb();
    if (!db) return false;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, "readwrite");
        tx.objectStore(storeName).clear();
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  }
  function safeParseJson(raw, fallback) {
    try {
      const parsed = JSON.parse(raw);
      return parsed !== null && parsed !== void 0 ? parsed : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function countRecords(val) {
    if (Array.isArray(val)) return val.length;
    if (val && typeof val === "object") return Object.keys(val).length;
    return 0;
  }
  async function syncKeyToIndexedDb(storageKey) {
    const raw = localStorage.getItem(storageKey);
    if (raw === null) return false;
    const def = MANAGED_KEYS.find((k) => k.key === storageKey);
    const fallback = def && def.type === "object" ? {} : [];
    const data = safeParseJson(raw, fallback);
    return idbPut(STORE_KV, {
      key: storageKey,
      data,
      count: countRecords(data),
      updatedAt: Date.now(),
      schemaVersion: DB_VERSION
    });
  }
  async function migrateAndHydrate() {
    const db = await openDb();
    if (!db) return { ok: false, engine: "localStorage_fallback" };
    let hydratedCount = 0;
    let mirroredCount = 0;
    for (const item of MANAGED_KEYS) {
      const lsRaw = localStorage.getItem(item.key);
      const idbRec = await idbGet(STORE_KV, item.key);
      if (lsRaw && lsRaw !== "[]" && lsRaw !== "{}") {
        const parsed = safeParseJson(lsRaw, item.type === "object" ? {} : []);
        const lsCount = countRecords(parsed);
        const idbCount = idbRec ? Number(idbRec.count || 0) : 0;
        if (!idbRec || lsCount >= idbCount || Date.now() - (idbRec.updatedAt || 0) > 1e3) {
          await idbPut(STORE_KV, {
            key: item.key,
            data: parsed,
            count: lsCount,
            updatedAt: Date.now(),
            schemaVersion: DB_VERSION
          });
          mirroredCount += 1;
        }
      } else if (idbRec && idbRec.data !== void 0 && countRecords(idbRec.data) > 0) {
        try {
          localStorage.setItem(item.key, JSON.stringify(idbRec.data));
          hydratedCount += 1;
        } catch (e) {
        }
      }
    }
    await idbPut(STORE_META, {
      id: "last_migration",
      version: DB_VERSION,
      hydratedCount,
      mirroredCount,
      checkedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    if (hydratedCount > 0) {
      document.dispatchEvent(new CustomEvent("oneora:plannerchange"));
      document.dispatchEvent(new CustomEvent("oneora:moneychange"));
    }
    return { ok: true, engine: "IndexedDB + localStorage mirror", hydratedCount, mirroredCount };
  }
  async function getStorageSummary() {
    const db = await openDb();
    const summary = {
      engine: db ? "IndexedDB (ONEORA_LocalDB v1)" : "Browser Local Storage",
      indexedDbActive: Boolean(db),
      totalRecords: 0,
      modules: []
    };
    for (const item of MANAGED_KEYS) {
      const raw = localStorage.getItem(item.key);
      const parsed = raw ? safeParseJson(raw, item.type === "object" ? {} : []) : item.type === "object" ? {} : [];
      const count = countRecords(parsed);
      const idbRec = db ? await idbGet(STORE_KV, item.key) : null;
      summary.totalRecords += count;
      summary.modules.push({
        key: item.key,
        label: item.label,
        count,
        backedUpInIdb: Boolean(idbRec),
        updatedAt: idbRec ? idbRec.updatedAt : null
      });
    }
    return summary;
  }
  async function exportFullBackup() {
    const payload = {
      app: "ONEORA",
      formatVersion: 1,
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      modules: {}
    };
    for (const item of MANAGED_KEYS) {
      const raw = localStorage.getItem(item.key);
      if (raw !== null) {
        payload.modules[item.key] = safeParseJson(raw, item.type === "object" ? {} : []);
      }
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const filename = `ONEORA_Backup_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`;
    if (global.AndroidBridge && typeof global.AndroidBridge.saveBase64File === "function") {
      const reader = new FileReader();
      reader.onload = () => {
        global.AndroidBridge.saveBase64File(String(reader.result || ""), filename, "application/json");
      };
      reader.readAsDataURL(blob);
      return { ok: true, filename };
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return { ok: true, filename };
  }
  async function importFullBackup(file) {
    if (!file) throw new Error("No backup file selected.");
    const text = await file.text();
    const parsed = safeParseJson(text, null);
    if (!parsed || parsed.app !== "ONEORA" || !parsed.modules || typeof parsed.modules !== "object") {
      throw new Error("Invalid ONEORA backup file. Please select a genuine ONEORA_Backup_*.json file.");
    }
    let restoredModules = 0;
    const allowedKeys = new Set(MANAGED_KEYS.map((m) => m.key));
    for (const [k, v] of Object.entries(parsed.modules)) {
      if (!allowedKeys.has(k)) continue;
      const def = MANAGED_KEYS.find((m) => m.key === k);
      if (def.type === "array" && !Array.isArray(v)) continue;
      if (def.type === "object" && (!v || typeof v !== "object" || Array.isArray(v))) continue;
      if (def.type === "array") {
        const existingRaw = localStorage.getItem(k);
        const existingArr = existingRaw ? safeParseJson(existingRaw, []) : [];
        if (Array.isArray(existingArr) && existingArr.length && v.every((x) => x && typeof x === "object" && x.id)) {
          const map = /* @__PURE__ */ new Map();
          existingArr.forEach((x) => {
            if (x && x.id) map.set(x.id, x);
          });
          v.forEach((x) => {
            const prev = map.get(x.id);
            if (!prev || Number(x.updatedAtMs || 0) >= Number(prev.updatedAtMs || 0)) {
              map.set(x.id, x);
            }
          });
          const merged = Array.from(map.values());
          localStorage.setItem(k, JSON.stringify(merged));
        } else {
          localStorage.setItem(k, JSON.stringify(v));
        }
      } else {
        localStorage.setItem(k, JSON.stringify(v));
      }
      await syncKeyToIndexedDb(k);
      restoredModules += 1;
    }
    document.dispatchEvent(new CustomEvent("oneora:plannerchange"));
    document.dispatchEvent(new CustomEvent("oneora:moneychange"));
    return { ok: true, restoredModules };
  }
  async function clearAllLocalRecords() {
    for (const item of MANAGED_KEYS) {
      if (item.key === "oneora_privacy_consent_v1") continue;
      localStorage.removeItem(item.key);
    }
    await idbClear(STORE_KV);
    document.dispatchEvent(new CustomEvent("oneora:plannerchange"));
    document.dispatchEvent(new CustomEvent("oneora:moneychange"));
    return { ok: true };
  }
  document.addEventListener("oneora:moneychange", () => {
    syncKeyToIndexedDb("oneoraFinanceRecords_v1");
    syncKeyToIndexedDb("oneora_khata_v1");
    syncKeyToIndexedDb("oneora_khata_pin_v1");
    syncKeyToIndexedDb("oneora_fin_calc_v1");
  });
  document.addEventListener("oneora:khatachange", () => {
    syncKeyToIndexedDb("oneora_khata_v1");
    syncKeyToIndexedDb("oneora_khata_pin_v1");
  });
  document.addEventListener("oneora:fincalcchange", () => {
    syncKeyToIndexedDb("oneora_fin_calc_v1");
  });
  document.addEventListener("oneora:socialchange", () => {
    syncKeyToIndexedDb("oneora_social_tools_v1");
  });
  document.addEventListener("oneora:voicehelperchange", () => {
    syncKeyToIndexedDb("oneora_voice_helper_v1");
  });
  document.addEventListener("oneora:officeprochange", () => {
    syncKeyToIndexedDb("oneora_office_pro_v1");
  });
  document.addEventListener("oneora:utilssafetychange", () => {
    syncKeyToIndexedDb("oneora_utilities_safety_v1");
  });
  document.addEventListener("oneora:plannerchange", () => {
    syncKeyToIndexedDb("oneoraPlannerItems_v1");
    syncKeyToIndexedDb("oneoraDocExpiries_v1");
    syncKeyToIndexedDb("oneoraWaterTracker_v1");
  });
  document.addEventListener("oneora:companionchange", () => {
    syncKeyToIndexedDb("oneoraCompanionData_v1");
    syncKeyToIndexedDb("oneoraSecVault_v1");
    syncKeyToIndexedDb("oneoraHomeWidgets_v1");
  });
  document.addEventListener("DOMContentLoaded", () => {
    migrateAndHydrate().catch(() => {
    });
  });
  global.OneoraDB = {
    migrateAndHydrate,
    syncKeyToIndexedDb,
    getStorageSummary,
    exportFullBackup,
    importFullBackup,
    clearAllLocalRecords
  };
})(window);
