/* ==========================================================================
   ONEORA — Compatibility Polyfills, Lazy Local Vendor Loader, Feature Detection,
   Global Error Recovery Screen & Settings Diagnostics (ES5/ES2017 Safe)
   Target: Android 7+ WebView (Chrome 61+), iOS Safari, Desktop Browsers
   ========================================================================== */
(function (global) {
  'use strict';

  /* ------------------------------------------------------------------------
     1. ES2018-ES2023 Polyfills for Older Android WebView (Android 7-9)
     ------------------------------------------------------------------------ */
  if (typeof global.globalThis === 'undefined') {
    try { global.globalThis = global; } catch (e) {}
  }

  // Array.prototype.at & String.prototype.at & TypedArray.prototype.at
  function polyfillAt(n) {
    n = Math.trunc(n) || 0;
    if (n < 0) n += this.length;
    if (n < 0 || n >= this.length) return undefined;
    return this[n];
  }
  if (!Array.prototype.at) {
    Object.defineProperty(Array.prototype, 'at', { value: polyfillAt, writable: true, configurable: true });
  }
  if (!String.prototype.at) {
    Object.defineProperty(String.prototype, 'at', { value: polyfillAt, writable: true, configurable: true });
  }
  if (typeof Uint8Array !== 'undefined' && !Uint8Array.prototype.at) {
    try {
      var TypedArrayProto = Object.getPrototypeOf(Uint8Array.prototype);
      if (TypedArrayProto && !TypedArrayProto.at) {
        Object.defineProperty(TypedArrayProto, 'at', { value: polyfillAt, writable: true, configurable: true });
      }
    } catch (e) {}
  }

  // String.prototype.replaceAll
  if (!String.prototype.replaceAll) {
    Object.defineProperty(String.prototype, 'replaceAll', {
      value: function (search, replacement) {
        if (search instanceof RegExp) {
          if (!search.global) throw new TypeError('replaceAll must be called with a global RegExp');
          return this.replace(search, replacement);
        }
        return this.split(String(search)).join(String(replacement));
      },
      writable: true,
      configurable: true
    });
  }

  // Object.hasOwn
  if (typeof Object.hasOwn !== 'function') {
    Object.hasOwn = function (obj, prop) {
      if (obj === null || obj === undefined) throw new TypeError('Cannot convert undefined or null to object');
      return Object.prototype.hasOwnProperty.call(Object(obj), prop);
    };
  }

  // Object.fromEntries
  if (typeof Object.fromEntries !== 'function') {
    Object.fromEntries = function (entries) {
      var out = {};
      if (!entries) return out;
      var arr = Array.from(entries);
      for (var i = 0; i < arr.length; i++) {
        var pair = arr[i];
        if (pair && pair.length >= 2) out[pair[0]] = pair[1];
      }
      return out;
    };
  }

  // Array.prototype.flat & flatMap
  if (!Array.prototype.flat) {
    Object.defineProperty(Array.prototype, 'flat', {
      value: function (depth) {
        var d = depth === undefined ? 1 : Number(depth);
        if (isNaN(d) || d < 1) return this.slice();
        var res = [];
        for (var i = 0; i < this.length; i++) {
          if (i in this) {
            var val = this[i];
            if (Array.isArray(val) && d > 0) {
              res = res.concat(val.flat(d - 1));
            } else {
              res.push(val);
            }
          }
        }
        return res;
      },
      writable: true,
      configurable: true
    });
  }
  if (!Array.prototype.flatMap) {
    Object.defineProperty(Array.prototype, 'flatMap', {
      value: function (fn, thisArg) {
        return this.map(fn, thisArg).flat(1);
      },
      writable: true,
      configurable: true
    });
  }

  // Promise.allSettled
  if (typeof Promise !== 'undefined' && typeof Promise.allSettled !== 'function') {
    Promise.allSettled = function (promises) {
      return Promise.all(
        Array.from(promises).map(function (p) {
          return Promise.resolve(p).then(
            function (value) { return { status: 'fulfilled', value: value }; },
            function (reason) { return { status: 'rejected', reason: reason }; }
          );
        })
      );
    };
  }

  // Element.prototype.replaceChildren
  if (typeof Element !== 'undefined' && !Element.prototype.replaceChildren) {
    Element.prototype.replaceChildren = function () {
      while (this.firstChild) this.removeChild(this.firstChild);
      for (var i = 0; i < arguments.length; i++) {
        var node = arguments[i];
        this.appendChild(typeof node === 'string' ? document.createTextNode(node) : node);
      }
    };
  }

  // crypto.randomUUID (works even in non-secure HTTP or file:// Android WebView contexts)
  function fallbackUUID() {
    var bytes = new Uint8Array(16);
    if (global.crypto && typeof global.crypto.getRandomValues === 'function') {
      global.crypto.getRandomValues(bytes);
    } else {
      for (var i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    var hex = [];
    for (var j = 0; j < 16; j++) {
      var h = bytes[j].toString(16);
      hex.push(h.length === 1 ? '0' + h : h);
    }
    return (
      hex[0] + hex[1] + hex[2] + hex[3] + '-' +
      hex[4] + hex[5] + '-' +
      hex[6] + hex[7] + '-' +
      hex[8] + hex[9] + '-' +
      hex[10] + hex[11] + hex[12] + hex[13] + hex[14] + hex[15]
    );
  }
  try {
    if (!global.crypto) global.crypto = {};
    if (typeof global.crypto.randomUUID !== 'function') {
      global.crypto.randomUUID = fallbackUUID;
    }
  } catch (e) {}
  global.oneoraUUID = function () {
    try {
      if (global.crypto && typeof global.crypto.randomUUID === 'function') {
        return global.crypto.randomUUID();
      }
    } catch (e) {}
    return fallbackUUID();
  };

  // structuredClone polyfill (handles Date, RegExp, TypedArray, ArrayBuffer, Map, Set, Array, Objects)
  if (typeof global.structuredClone !== 'function') {
    global.structuredClone = function (value) {
      var seen = new WeakMap();
      function clone(val) {
        if (val === null || typeof val !== 'object') return val;
        if (val instanceof Date) return new Date(val.getTime());
        if (val instanceof RegExp) return new RegExp(val.source, val.flags);
        if (val instanceof ArrayBuffer) return val.slice(0);
        if (ArrayBuffer.isView(val)) {
          return new val.constructor(val.buffer.slice(val.byteOffset, val.byteOffset + val.byteLength));
        }
        if (seen.has(val)) return seen.get(val);
        if (val instanceof Map) {
          var m = new Map();
          seen.set(val, m);
          val.forEach(function (v, k) { m.set(clone(k), clone(v)); });
          return m;
        }
        if (val instanceof Set) {
          var s = new Set();
          seen.set(val, s);
          val.forEach(function (v) { s.add(clone(v)); });
          return s;
        }
        if (Array.isArray(val)) {
          var arr = new Array(val.length);
          seen.set(val, arr);
          for (var i = 0; i < val.length; i++) arr[i] = clone(val[i]);
          return arr;
        }
        var out = {};
        seen.set(val, out);
        var keys = Object.keys(val);
        for (var k = 0; k < keys.length; k++) {
          out[keys[k]] = clone(val[keys[k]]);
        }
        return out;
      }
      return clone(value);
    };
  }

  /* ------------------------------------------------------------------------
     2. Safe Feature Detection & Graceful Fallbacks
     ------------------------------------------------------------------------ */
  var nav = global.navigator || {};
  var deviceMem = typeof nav.deviceMemory === 'number' ? nav.deviceMemory : 4;
  var hwCores = typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : 4;

  var Capabilities = {
    serviceWorker: 'serviceWorker' in nav,
    indexedDB: (function () {
      try { return typeof global.indexedDB !== 'undefined' && global.indexedDB !== null; } catch (e) { return false; }
    })(),
    localStorage: (function () {
      try {
        var k = '__oneora_ls_test__';
        global.localStorage.setItem(k, '1');
        global.localStorage.removeItem(k);
        return true;
      } catch (e) { return false; }
    })(),
    webShare: typeof nav.share === 'function',
    webShareFiles: typeof nav.canShare === 'function',
    fileSystemAccess: typeof global.showOpenFilePicker === 'function',
    clipboard: Boolean(nav.clipboard && typeof nav.clipboard.writeText === 'function'),
    vibration: typeof nav.vibrate === 'function',
    getUserMedia: Boolean(nav.mediaDevices && typeof nav.mediaDevices.getUserMedia === 'function'),
    barcodeDetector: typeof global.BarcodeDetector === 'function',
    webAssembly: typeof global.WebAssembly === 'object',
    webWorker: typeof global.Worker === 'function',
    notifications: typeof global.Notification === 'function',
    deviceMemoryGB: deviceMem,
    hardwareConcurrency: hwCores,
    isLowRam: deviceMem <= 2 || hwCores <= 4,
    isSmallScreen: (global.innerWidth || 360) <= 360,
    isTouch: 'ontouchstart' in global || (nav.maxTouchPoints || 0) > 0,
    maxSafeCanvasPixels: (deviceMem <= 2) ? 3200000 : 6400000
  };

  Capabilities.vibrate = function (pattern) {
    try {
      if (Capabilities.vibration) nav.vibrate(pattern || 12);
    } catch (e) {}
  };

  Capabilities.copyText = function (text) {
    var str = String(text || '');
    if (Capabilities.clipboard) {
      return nav.clipboard.writeText(str).then(function () { return true; }).catch(function () {
        return legacyCopy(str);
      });
    }
    return Promise.resolve(legacyCopy(str));
  };

  function legacyCopy(str) {
    try {
      var ta = document.createElement('textarea');
      ta.value = str;
      ta.setAttribute('readonly', 'readonly');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.style.top = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
      return ok;
    } catch (e) {
      return false;
    }
  }

  // Permission-safe camera request with clear denial guidance
  Capabilities.requestCamera = function (constraints) {
    if (!Capabilities.getUserMedia) {
      return Promise.reject(new Error('Live camera preview is not supported in this browser. Use the Capture Photo button instead.'));
    }
    var opts = constraints || {
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 4096 },
        height: { ideal: 3072 }
      },
      audio: false
    };
    return nav.mediaDevices.getUserMedia(opts).catch(function (err) {
      var name = (err && err.name) || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        throw new Error('Camera permission was denied. Enable Camera permission in Android App Settings or use Gallery / System Camera capture.');
      }
      if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        throw new Error('No rear camera detected on this device. You can still scan from Gallery photos.');
      }
      if (name === 'NotReadableError' || name === 'TrackStartError') {
        throw new Error('Camera is currently in use by another app. Close other camera apps and try again.');
      }
      throw new Error('Camera unavailable (' + (err && err.message ? err.message : 'error') + '). Tap System Camera or Gallery instead.');
    });
  };

  Capabilities.requestNotifications = function () {
    if (!Capabilities.notifications) {
      return Promise.resolve({ granted: false, reason: 'Notifications are not supported on this device. Reminders will still show inside ONEORA.' });
    }
    if (global.Notification.permission === 'granted') {
      return Promise.resolve({ granted: true, reason: '' });
    }
    if (global.Notification.permission === 'denied') {
      return Promise.resolve({ granted: false, reason: 'Notifications are blocked in device settings. In-app reminders remain active.' });
    }
    try {
      return Promise.resolve(global.Notification.requestPermission()).then(function (res) {
        return {
          granted: res === 'granted',
          reason: res === 'granted' ? '' : 'Notification permission declined. In-app reminders will still alert you.'
        };
      });
    } catch (e) {
      return Promise.resolve({ granted: false, reason: 'Notification request unavailable on this WebView.' });
    }
  };

  Capabilities.checkStorageQuota = function () {
    if (nav.storage && typeof nav.storage.estimate === 'function') {
      return nav.storage.estimate().catch(function () { return { usage: 0, quota: 0 }; });
    }
    return Promise.resolve({ usage: 0, quota: 0 });
  };

  global.OneoraCapabilities = Capabilities;

  // Detect CSS flexbox gap support (older Chrome < 84) and tag html element
  try {
    var flex = document.createElement('div');
    flex.style.display = 'flex';
    flex.style.flexDirection = 'column';
    flex.style.rowGap = '1px';
    flex.appendChild(document.createElement('div'));
    flex.appendChild(document.createElement('div'));
    if (document.documentElement) {
      document.documentElement.classList.add(Capabilities.isLowRam ? 'oneora-low-ram' : 'oneora-std-ram');
    }
  } catch (e) {}

  /* ------------------------------------------------------------------------
     3. Lazy Local Vendor Loader (100% Offline Local Files — Zero CDN!)
     ------------------------------------------------------------------------ */
  var VENDOR_REGISTRY = {
    pdfjs: {
      test: function () { return typeof global.pdfjsLib !== 'undefined'; },
      scripts: ['./vendor/pdf.min.js'],
      onLoad: function () {
        if (global.pdfjsLib && global.pdfjsLib.GlobalWorkerOptions) {
          global.pdfjsLib.GlobalWorkerOptions.workerSrc = './vendor/pdf.worker.min.js';
        }
      }
    },
    pdflib: {
      test: function () { return typeof global.PDFLib !== 'undefined'; },
      scripts: ['./vendor/pdf-lib.min.js']
    },
    xlsx: {
      test: function () { return typeof global.XLSX !== 'undefined'; },
      scripts: ['./vendor/xlsx.full.min.js']
    },
    mammoth: {
      test: function () { return typeof global.mammoth !== 'undefined'; },
      scripts: ['./vendor/mammoth.browser.min.js']
    },
    jszip: {
      test: function () { return typeof global.JSZip !== 'undefined'; },
      scripts: ['./vendor/jszip.min.js']
    },
    cropper: {
      test: function () { return typeof global.Cropper !== 'undefined'; },
      styles: ['./vendor/cropper.min.css'],
      scripts: ['./vendor/cropper.min.js']
    },
    qrcode: {
      test: function () { return typeof global.QRCode !== 'undefined'; },
      scripts: ['./vendor/qrcode.min.js']
    },
    jsqr: {
      test: function () { return typeof global.jsQR !== 'undefined'; },
      scripts: ['./vendor/jsQR.js']
    },
    tesseract: {
      test: function () { return typeof global.Tesseract !== 'undefined'; },
      scripts: ['./vendor/tesseract.min.js']
    }
  };

  var inFlightLoads = {};

  function injectStyle(href) {
    return new Promise(function (resolve) {
      var existing = document.querySelector('link[data-oneora-vendor="' + href + '"]');
      if (existing) { resolve(); return; }
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.setAttribute('data-oneora-vendor', href);
      link.onload = function () { resolve(); };
      link.onerror = function () { resolve(); };
      (document.head || document.documentElement).appendChild(link);
    });
  }

  function injectScript(src) {
    return new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[data-oneora-vendor="' + src + '"]');
      if (existing && existing.getAttribute('data-loaded') === '1') {
        resolve();
        return;
      }
      var s = document.createElement('script');
      s.src = src;
      s.async = false;
      s.setAttribute('data-oneora-vendor', src);
      s.onload = function () {
        s.setAttribute('data-loaded', '1');
        resolve();
      };
      s.onerror = function () {
        reject(new Error('Could not load local offline library: ' + src));
      };
      (document.head || document.documentElement).appendChild(s);
    });
  }

  function loadVendor(key) {
    var entry = VENDOR_REGISTRY[key];
    if (!entry) return Promise.reject(new Error('Unknown vendor library: ' + key));
    if (entry.test()) {
      if (entry.onLoad) { try { entry.onLoad(); } catch (e) {} }
      return Promise.resolve();
    }
    if (inFlightLoads[key]) return inFlightLoads[key];

    var stylePromises = (entry.styles || []).map(injectStyle);
    var p = Promise.all(stylePromises).then(function () {
      var chain = Promise.resolve();
      (entry.scripts || []).forEach(function (src) {
        chain = chain.then(function () { return injectScript(src); });
      });
      return chain;
    }).then(function () {
      if (entry.onLoad) entry.onLoad();
    }).catch(function (err) {
      delete inFlightLoads[key];
      throw err;
    });

    inFlightLoads[key] = p;
    return p;
  }

  function loadManyVendors(keys) {
    return Promise.all((keys || []).map(loadVendor));
  }

  global.OneoraLoader = {
    load: loadVendor,
    loadMany: loadManyVendors,
    has: function (key) {
      var entry = VENDOR_REGISTRY[key];
      return Boolean(entry && entry.test());
    }
  };

  /* ------------------------------------------------------------------------
     4. Global Error Boundary (window.onerror & unhandledrejection) + Diagnostics
     ------------------------------------------------------------------------ */
  var DIAG_KEY = 'oneora_diag_errors_v1';
  var MAX_ERRORS = 20;
  var crashShown = false;

  function loadErrorLog() {
    if (!Capabilities.localStorage) return [];
    try {
      var raw = global.localStorage.getItem(DIAG_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveErrorLog(list) {
    if (!Capabilities.localStorage) return;
    try {
      global.localStorage.setItem(DIAG_KEY, JSON.stringify(list.slice(0, MAX_ERRORS)));
    } catch (e) {}
  }

  function isBenignNoise(msg, src) {
    var m = String(msg || '').toLowerCase();
    var s = String(src || '').toLowerCase();
    if (!m && !s) return true;
    if (m.indexOf('resizeobserver loop') !== -1) return true;
    if (m.indexOf('websocket') !== -1 || m.indexOf('hmr') !== -1 || m.indexOf('vite') !== -1) return true;
    if (m.indexOf('script error.') === 0 && !s) return true;
    if (m.indexOf('abort') !== -1 && m.indexOf('share') !== -1) return true;
    if (m.indexOf('renderingcancelled') !== -1) return true;
    return false;
  }

  function recordError(kind, message, source, line, col, stack) {
    var entry = {
      id: global.oneoraUUID(),
      time: new Date().toISOString(),
      kind: kind || 'error',
      message: String(message || 'Unknown error').slice(0, 400),
      source: String(source || '').slice(0, 220),
      line: line || 0,
      col: col || 0,
      stack: String(stack || '').slice(0, 900),
      viewport: (global.innerWidth || 0) + 'x' + (global.innerHeight || 0),
      online: Boolean(nav.onLine)
    };
    var list = loadErrorLog();
    list.unshift(entry);
    saveErrorLog(list);
    return entry;
  }

  function buildDiagnosticsReport(latestEntry) {
    var list = loadErrorLog();
    var lines = [
      'ONEORA Diagnostics Report',
      'Time: ' + new Date().toISOString(),
      'Version: 3.1 Pastel Offline',
      'User-Agent: ' + (nav.userAgent || 'unknown'),
      'Viewport: ' + (global.innerWidth || 0) + 'x' + (global.innerHeight || 0) + ' @' + (global.devicePixelRatio || 1) + 'x',
      'Memory: ' + Capabilities.deviceMemoryGB + 'GB · Cores: ' + Capabilities.hardwareConcurrency,
      'Online: ' + Boolean(nav.onLine),
      'APIs: SW=' + Capabilities.serviceWorker + ', IDB=' + Capabilities.indexedDB + ', Worker=' + Capabilities.webWorker + ', Share=' + Capabilities.webShare + ', Camera=' + Capabilities.getUserMedia + ', WASM=' + Capabilities.webAssembly,
      ''
    ];
    if (latestEntry) {
      lines.push('Latest Error:');
      lines.push('[' + latestEntry.kind + '] ' + latestEntry.message);
      if (latestEntry.source) lines.push('At: ' + latestEntry.source + ':' + latestEntry.line + ':' + latestEntry.col);
      if (latestEntry.stack) lines.push(latestEntry.stack);
      lines.push('');
    }
    lines.push('Recent Stored Errors (' + list.length + '/' + MAX_ERRORS + '):');
    for (var i = 0; i < Math.min(list.length, 10); i++) {
      var e = list[i];
      lines.push((i + 1) + '. [' + e.time + '] (' + e.kind + ') ' + e.message + (e.source ? ' @ ' + e.source + ':' + e.line : ''));
    }
    return lines.join('\n');
  }

  function showCrashRecoveryScreen(entry) {
    if (crashShown) return;
    crashShown = true;
    var overlay = document.getElementById('oneoraCrashOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'oneoraCrashOverlay';
      overlay.setAttribute('role', 'alertdialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.style.cssText = 'position:fixed;top:0;right:0;bottom:0;left:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;background:#FFF7EE;color:#2B2236;font-family:"Plus Jakarta Sans",system-ui,sans-serif;';
      if (document.documentElement && document.documentElement.classList.contains('dark')) {
        overlay.style.background = '#17131F';
        overlay.style.color = '#F5EEFF';
      }
      var card = document.createElement('div');
      card.style.cssText = 'width:100%;max-width:420px;border-radius:30px;padding:24px;background:' + (document.documentElement.classList.contains('dark') ? '#221C2E' : '#FFFFFF') + ';box-shadow:0 20px 50px rgba(43,34,54,0.16);border:1px solid rgba(91,63,208,0.16);text-align:center;';

      var badge = document.createElement('div');
      badge.style.cssText = 'width:56px;height:56px;margin:0 auto 14px;border-radius:20px;background:#FFD6D6;color:#A11F31;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:24px;';
      badge.textContent = '!';

      var h2 = document.createElement('h2');
      h2.style.cssText = 'margin:0 0 8px;font-size:22px;font-weight:800;';
      h2.textContent = 'Something went wrong';

      var p = document.createElement('p');
      p.style.cssText = 'margin:0 0 14px;font-size:13px;line-height:1.5;opacity:0.82;';
      p.textContent = 'ONEORA caught an unexpected error so your data stays safe. You can copy the technical details or restart the app.';

      var pre = document.createElement('pre');
      pre.id = 'oneoraCrashDetailsPre';
      pre.style.cssText = 'margin:0 0 16px;padding:10px 12px;border-radius:14px;font-size:11px;text-align:left;max-height:110px;overflow:auto;white-space:pre-wrap;word-break:break-word;background:rgba(91,63,208,0.08);';
      pre.textContent = entry.message + (entry.source ? '\n' + entry.source + ':' + entry.line : '');

      var btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;flex-direction:column;gap:10px;';

      var restartBtn = document.createElement('button');
      restartBtn.type = 'button';
      restartBtn.id = 'oneoraCrashRestartBtn';
      restartBtn.style.cssText = 'width:100%;min-height:46px;border:none;border-radius:18px;background:#5B3FD0;color:#FFFFFF;font-weight:800;font-size:14px;cursor:pointer;';
      restartBtn.textContent = 'Restart app';
      restartBtn.onclick = function () { global.location.reload(); };

      var copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.id = 'oneoraCrashCopyBtn';
      copyBtn.style.cssText = 'width:100%;min-height:44px;border:1px solid rgba(91,63,208,0.28);border-radius:18px;background:transparent;color:inherit;font-weight:700;font-size:13px;cursor:pointer;';
      copyBtn.textContent = 'Copy error details';
      copyBtn.onclick = function () {
        Capabilities.copyText(buildDiagnosticsReport(entry)).then(function (ok) {
          copyBtn.textContent = ok ? 'Copied error details!' : 'Could not access clipboard';
        });
      };

      var dismissBtn = document.createElement('button');
      dismissBtn.type = 'button';
      dismissBtn.style.cssText = 'width:100%;min-height:40px;border:none;background:transparent;color:inherit;opacity:0.7;font-weight:600;font-size:12px;cursor:pointer;';
      dismissBtn.textContent = 'Try to continue';
      dismissBtn.onclick = function () {
        overlay.style.display = 'none';
        crashShown = false;
      };

      btnRow.appendChild(restartBtn);
      btnRow.appendChild(copyBtn);
      btnRow.appendChild(dismissBtn);
      card.appendChild(badge);
      card.appendChild(h2);
      card.appendChild(p);
      card.appendChild(pre);
      card.appendChild(btnRow);
      overlay.appendChild(card);
      (document.body || document.documentElement).appendChild(overlay);
    } else {
      var preEl = document.getElementById('oneoraCrashDetailsPre');
      if (preEl) preEl.textContent = entry.message + (entry.source ? '\n' + entry.source + ':' + entry.line : '');
      overlay.style.display = 'flex';
      overlay.classList.remove('hidden');
    }
  }

  global.addEventListener('error', function (event) {
    var msg = (event && event.message) || (event && event.error && event.error.message) || '';
    var src = (event && event.filename) || '';
    if (isBenignNoise(msg, src)) return;
    var stack = (event && event.error && event.error.stack) || '';
    var entry = recordError('runtime', msg, src, event.lineno || 0, event.colno || 0, stack);
    // Only take over full screen if the error looks fatal (app shell hasn't booted or uncaught TypeError/SyntaxError/ReferenceError)
    var isFatal = !global.__ONEORA_BOOTED__ || /SyntaxError|ReferenceError|RangeError|ChunkLoadError/i.test(msg);
    if (isFatal) {
      showCrashRecoveryScreen(entry);
    }
  });

  global.addEventListener('unhandledrejection', function (event) {
    var reason = event && event.reason;
    var msg = (reason && reason.message) ? reason.message : String(reason || 'Unhandled promise rejection');
    var stack = (reason && reason.stack) ? reason.stack : '';
    if (isBenignNoise(msg, '')) return;
    recordError('promise', msg, '', 0, 0, stack);
  });

  /* ------------------------------------------------------------------------
     5. Settings > Diagnostics Modal Wiring
     ------------------------------------------------------------------------ */
  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderDiagnosticsModal() {
    var modal = document.getElementById('oneoraDiagnosticsModal');
    var capsEl = document.getElementById('oneoraDiagCapsGrid');
    var listEl = document.getElementById('oneoraDiagErrorList');
    var countEl = document.getElementById('oneoraDiagErrorCount');
    if (!modal || !listEl) return;

    var errors = loadErrorLog();
    if (countEl) countEl.textContent = errors.length + ' / ' + MAX_ERRORS;

    if (capsEl) {
      var rows = [
        ['Viewport', (global.innerWidth || 0) + '×' + (global.innerHeight || 0) + ' (' + (global.devicePixelRatio || 1) + 'x)'],
        ['Device RAM', Capabilities.deviceMemoryGB + ' GB' + (Capabilities.isLowRam ? ' (Low-RAM safe mode)' : '')],
        ['Offline Cache (SW)', Capabilities.serviceWorker ? 'Supported' : 'Fallback mode'],
        ['Local Vault (IDB)', Capabilities.indexedDB ? 'Supported' : 'Memory fallback'],
        ['Web Workers', Capabilities.webWorker ? 'Active' : 'Main-thread fallback'],
        ['Camera / Share', (Capabilities.getUserMedia ? 'Cam OK' : 'File input') + ' · ' + (Capabilities.webShare ? 'Share OK' : 'Download')]
      ];
      capsEl.innerHTML = rows.map(function (r) {
        return '<div class="pastel-inset-tile px-3 py-2 flex items-center justify-between gap-2 text-xs">' +
          '<span class="font-semibold opacity-75">' + escapeHtml(r[0]) + '</span>' +
          '<span class="font-bold text-right truncate">' + escapeHtml(r[1]) + '</span>' +
          '</div>';
      }).join('');
    }

    if (!errors.length) {
      listEl.innerHTML = '<div class="pastel-inset-tile p-4 text-center text-xs font-semibold opacity-75">No errors recorded. Everything is running smoothly!</div>';
    } else {
      listEl.innerHTML = errors.map(function (err) {
        var dt = err.time ? err.time.replace('T', ' ').slice(0, 19) : '';
        return '<div class="pastel-inset-tile p-3 space-y-1 text-xs">' +
          '<div class="flex items-center justify-between gap-2">' +
          '<span class="font-extrabold text-[11px]" style="color:var(--oneora-error)">' + escapeHtml(err.kind.toUpperCase()) + '</span>' +
          '<span class="text-[10px] opacity-65 tabular-nums">' + escapeHtml(dt) + '</span>' +
          '</div>' +
          '<p class="font-bold break-words">' + escapeHtml(err.message) + '</p>' +
          (err.source ? '<p class="text-[11px] opacity-70 truncate">' + escapeHtml(err.source) + ':' + err.line + '</p>' : '') +
          '</div>';
      }).join('');
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  function closeDiagnosticsModal() {
    var modal = document.getElementById('oneoraDiagnosticsModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  /* ------------------------------------------------------------------------
     6. Controlled Service Worker Registration + "Refresh for Update" Prompt
     ------------------------------------------------------------------------ */
  function showSwUpdateBanner(waitingWorker) {
    var banner = document.getElementById('oneoraSwUpdateBanner');
    if (!banner) return;
    banner.classList.remove('hidden');
    banner.classList.add('flex');
    var refreshBtn = document.getElementById('oneoraSwRefreshBtn');
    var dismissBtn = document.getElementById('oneoraSwDismissBtn');
    if (refreshBtn) {
      refreshBtn.onclick = function () {
        refreshBtn.textContent = 'Updating...';
        try {
          if (waitingWorker) waitingWorker.postMessage({ type: 'SKIP_WAITING' });
        } catch (e) {}
        setTimeout(function () { global.location.reload(); }, 400);
      };
    }
    if (dismissBtn) {
      dismissBtn.onclick = function () {
        banner.classList.add('hidden');
        banner.classList.remove('flex');
      };
    }
  }

  function registerOneoraServiceWorker() {
    if (!Capabilities.serviceWorker) return;
    if (global.location && global.location.protocol === 'file:') return;
    try {
      var refreshing = false;
      nav.serviceWorker.addEventListener('controllerchange', function () {
        if (refreshing) return;
        refreshing = true;
        global.location.reload();
      });

      nav.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then(function (reg) {
        if (reg.waiting && nav.serviceWorker.controller) {
          showSwUpdateBanner(reg.waiting);
        }
        reg.addEventListener('updatefound', function () {
          var newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', function () {
            if (newWorker.state === 'installed' && nav.serviceWorker.controller) {
              showSwUpdateBanner(newWorker);
            }
          });
        });
      }).catch(function () {
        // Silently ignore in restricted preview iframes / insecure contexts
      });
    } catch (e) {}
  }

  document.addEventListener('DOMContentLoaded', function () {
    global.__ONEORA_BOOTED__ = true;
    var openBtn = document.getElementById('oneoraDiagnosticsBtn');
    if (openBtn) openBtn.addEventListener('click', renderDiagnosticsModal);
    var closeBtn = document.getElementById('oneoraDiagCloseBtn');
    if (closeBtn) closeBtn.addEventListener('click', closeDiagnosticsModal);
    var backdrop = document.getElementById('oneoraDiagBackdrop');
    if (backdrop) backdrop.addEventListener('click', closeDiagnosticsModal);
    var copyBtn = document.getElementById('oneoraDiagCopyBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        Capabilities.copyText(buildDiagnosticsReport(null)).then(function (ok) {
          if (global.utils && global.utils.showToast) {
            global.utils.showToast(ok ? 'Copied' : 'Copy Failed', ok ? 'Diagnostics report copied to clipboard.' : 'Clipboard unavailable.', ok ? 'success' : 'error');
          }
        });
      });
    }
    var clearBtn = document.getElementById('oneoraDiagClearBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        saveErrorLog([]);
        renderDiagnosticsModal();
      });
    }
    registerOneoraServiceWorker();
  });

  global.OneoraDiagnostics = {
    getErrors: loadErrorLog,
    record: recordError,
    clear: function () { saveErrorLog([]); },
    getReport: function () { return buildDiagnosticsReport(null); },
    openModal: renderDiagnosticsModal,
    showCrashScreen: showCrashRecoveryScreen
  };
})(window);
