(function (global) {
  "use strict";

  var STORAGE_KEY = "oneora_office_pro_v1";

  var state = {
    tab: "bangla_convert", // "bangla_convert" | "excel_helper"
    convertDir: "u2b", // "u2b" (Unicode -> Bijoy) | "b2u" (Bijoy -> Unicode)
    convertDigits: true,
    inputText: "",
    outputText: "",
    history: [], // [{ id, dir, input, output, createdAt }]
    formulaKey: "SUM",
    formulaRange: "B2:B20",
    formulaCriteria: '">500"',
    formulaSumRange: "C2:C20",
    formulaLookup: "A2",
    formulaTable: "A2:D50",
    formulaColIdx: "3",
    formulaTrueVal: '"Pass"',
    formulaFalseVal: '"Fail"',
    formulaDecimals: "2",
    formulaSearch: "",
    savedFormulas: [], // [{ id, title, formula, createdAt }]
    resultSheet: null // { title, subtitle, text, filename }
  };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function uid(prefix) {
    return (prefix || "op") + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7);
  }

  function haptic(ms) {
    try {
      if (typeof global.oneoraHaptic === "function") global.oneoraHaptic(ms || 10);
      else if (navigator && typeof navigator.vibrate === "function") navigator.vibrate(ms || 10);
    } catch (e) {}
  }

  function toast(title, msg, type) {
    if (global.utils && typeof global.utils.showToast === "function") {
      global.utils.showToast(title, msg || "", type || "success");
    }
  }

  function copyText(text) {
    if (global.OneoraCapabilities && typeof global.OneoraCapabilities.copyText === "function") {
      return global.OneoraCapabilities.copyText(text);
    }
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      return navigator.clipboard.writeText(text).then(function () { return true; }).catch(function () { return false; });
    }
    try {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return Promise.resolve(true);
    } catch (e) {
      return Promise.resolve(false);
    }
  }

  function downloadTextFile(text, filename) {
    var blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    if (global.utils && typeof global.utils.downloadBlob === "function") {
      global.utils.downloadBlob(blob, filename);
      return;
    }
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  function shareText(title, text) {
    if (navigator && typeof navigator.share === "function") {
      navigator.share({ title: title, text: text }).catch(function () {});
      return;
    }
    copyText(text).then(function () {
      toast("Copied to Share", "Text copied — paste in WhatsApp, Word or Email.", "info");
    });
  }

  function loadStorage() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        if (Array.isArray(parsed.history)) state.history = parsed.history.slice(0, 20);
        if (Array.isArray(parsed.savedFormulas)) state.savedFormulas = parsed.savedFormulas.slice(0, 25);
        if (parsed.convertDir === "u2b" || parsed.convertDir === "b2u") state.convertDir = parsed.convertDir;
        if (typeof parsed.convertDigits === "boolean") state.convertDigits = parsed.convertDigits;
      }
    } catch (e) {}
  }

  function saveStorage() {
    try {
      var payload = {
        history: state.history.slice(0, 20),
        savedFormulas: state.savedFormulas.slice(0, 25),
        convertDir: state.convertDir,
        convertDigits: state.convertDigits,
        updatedAt: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      document.dispatchEvent(new CustomEvent("oneora:officeprochange"));
    } catch (e) {}
  }

  // =========================================================================
  // 1. OFFLINE BANGLA UNICODE <-> BIJOY CLASSIC (SUTONNYMJ ANSI) ENGINE
  // =========================================================================
  var BN_CONSONANT_RE = /[\u0995-\u09B9\u09DC-\u09DF\u09CE]/;

  function isBnConsonant(ch) {
    return !!ch && BN_CONSONANT_RE.test(ch);
  }

  // Ordered longest-first for accurate Unicode -> Bijoy conjunct mapping
  var U2B_CONJUNCTS = [
    ["\u0995\u09CD\u09B7\u09CD\u09AE", "\u00FF\u00A7"], // ক্ষ্ম
    ["\u0995\u09CD\u09B7\u09CD\u09A3", "\u00FF\u00A2"], // ক্ষ্ণ
    ["\u09B8\u09CD\u09A4\u09CD\u09B0", "\u00AF\u00AA"], // স্ত্র
    ["\u09A8\u09CD\u09A4\u09CD\u09B0", "\u00BE\u00AA"], // ন্ত্র
    ["\u09A8\u09CD\u09A6\u09CD\u09B0", "\u00BC\u00AA"], // ন্দ্র
    ["\u09B6\u09CD\u09B0", "k\u00AA"], // শ্র
    ["\u0995\u09CD\u09B7", "\u00FF"], // ক্ষ
    ["\u099C\u09CD\u099E", "\u00C1"], // জ্ঞ
    ["\u0999\u09CD\u0995", "\u00C4"], // ঙ্ক
    ["\u0999\u09CD\u0997", "\u00C6"], // ঙ্গ
    ["\u099E\u09CD\u099A", "\u00C8"], // ঞ্চ
    ["\u099E\u09CD\u099B", "\u00C9"], // ঞ্ছ
    ["\u099E\u09CD\u099C", "\u00CA"], // ঞ্জ
    ["\u0995\u09CD\u09A4", "\u00B3"], // ক্ত
    ["\u0995\u09CD\u0995", "\u00B1"], // ক্ক
    ["\u0995\u09CD\u099F", "\u00B2"], // ক্ট
    ["\u0995\u09CD\u09AE", "\u00B5"], // ক্ম
    ["\u0995\u09CD\u09B8", "\u00B7"], // ক্স
    ["\u0997\u09CD\u09A7", "\u00BD"], // গ্ধ
    ["\u099A\u09CD\u099A", "\u00B0"], // চ্চ
    ["\u099A\u09CD\u099B", "\u00B0\u0051"], // চ্ছ
    ["\u099C\u09CD\u099C", "\u00BB"], // জ্জ
    ["\u099F\u09CD\u099F", "\u00D6"], // ট্ট
    ["\u09A1\u09CD\u09A1", "\u00D7"], // ড্ড
    ["\u09A3\u09CD\u099F", "\u00D8"], // ণ্ট
    ["\u09A3\u09CD\u09A0", "\u00D9"], // ণ্ঠ
    ["\u09A3\u09CD\u09A1", "\u00DA"], // ণ্ড
    ["\u09A4\u09CD\u09A4", "\u00CB"], // ত্ত
    ["\u09A4\u09CD\u09A5", "\u00CC"], // ত্থ
    ["\u09A4\u09CD\u09AE", "\u00CE"], // ত্ম
    ["\u09A4\u09CD\u09B0", "\u00CE\u00AA"], // ত্র -> fallback handled cleanly
    ["\u09A6\u09CD\u09A6", "\u00CF"], // দ্দ
    ["\u09A6\u09CD\u09A7", "\u00D0"], // দ্ধ
    ["\u09A6\u09CD\u09AC", "\u00D1"], // দ্ব
    ["\u09A6\u09CD\u09AD", "\u00D2"], // দ্ভ
    ["\u09A8\u09CD\u09A4", "\u00BE"], // ন্ত
    ["\u09A8\u09CD\u09A5", "\u00BF"], // ন্থ
    ["\u09A8\u09CD\u09A6", "\u00BC"], // ন্দ
    ["\u09A8\u09CD\u09A7", "\u00C0"], // ন্ধ
    ["\u09A8\u09CD\u09A8", "\u00DB"], // ন্ন
    ["\u09AA\u09CD\u09A4", "\u00DC"], // প্ত
    ["\u09AA\u09CD\u09AA", "\u00DD"], // প্প
    ["\u09AC\u09CD\u09A6", "\u00DE"], // ব্দ
    ["\u09AC\u09CD\u09A7", "\u00DF"], // ব্ধ
    ["\u09AC\u09CD\u09AC", "\u00E0"], // ব্ব
    ["\u09AE\u09CD\u09AA", "\u00E1"], // ম্প
    ["\u09AE\u09CD\u09AB", "\u00E2"], // ম্ফ
    ["\u09AE\u09CD\u09AC", "\u00E3"], // ম্ব
    ["\u09AE\u09CD\u09AD", "\u09AE\u09CD\u09AD"], // ম্ভ (mapped via hasanta)
    ["\u09AE\u09CD\u09AE", "\u00E5"], // ম্ম
    ["\u09B2\u09CD\u0995", "\u00E6"], // ল্ক
    ["\u09B2\u09CD\u0997", "\u00E7"], // ল্গ
    ["\u09B2\u09CD\u09AA", "\u00E8"], // ল্প
    ["\u09B2\u09CD\u09B2", "\u00E9"], // ল্ল
    ["\u09B6\u09CD\u099A", "\u00EA"], // শ্চ
    ["\u09B7\u09CD\u0995", "\u00EB"], // ষ্ক
    ["\u09B7\u09CD\u099F", "\u00EC"], // ষ্ট
    ["\u09B7\u09CD\u09A0", "\u00ED"], // ষ্ঠ
    ["\u09B7\u09CD\u09A3", "\u00EE"], // ষ্ণ
    ["\u09B7\u09CD\u09AA", "\u00EF"], // ষ্প
    ["\u09B8\u09CD\u0995", "\u00F0"], // স্ক
    ["\u09B8\u09CD\u09A4", "\u00AF"], // স্ত
    ["\u09B8\u09CD\u09A5", "\u00F1"], // স্থ
    ["\u09B8\u09CD\u09AA", "\u00F2"], // স্প
    ["\u09B8\u09CD\u09AC", "\u00F3"], // স্ব
    ["\u09B8\u09CD\u09AE", "\u00F4"], // স্ম
    ["\u09B9\u09CD\u09AE", "\u00F5"], // হ্ম
    ["\u09B9\u09CD\u09A8", "\u00F6"], // হ্ন
    ["\u0997\u09C1", "\u00B8"], // গু
    ["\u09B0\u09C1", "\u00E4"], // রু
    ["\u09B0\u09C2", "\u00F7"], // রূ
    ["\u09B6\u09C1", "\u00F8"], // শু
    ["\u09B9\u09C1", "\u00F9"]  // হু
  ];

  // Fix ত্র explicit mapping to Bijoy standard `Î` (0xCE) vs `Îª` -> Bijoy uses `Î` for ত্র and `Z¥` for ত্ম
  U2B_CONJUNCTS = U2B_CONJUNCTS.map(function (pair) {
    if (pair[0] === "\u09A4\u09CD\u09B0") return ["\u09A4\u09CD\u09B0", "\u00CE"];
    if (pair[0] === "\u09A4\u09CD\u09AE") return ["\u09A4\u09CD\u09AE", "Z&g"];
    if (pair[0] === "\u09AE\u09CD\u09AD") return ["\u09AE\u09CD\u09AD", "g&f"];
    return pair;
  });

  var U2B_BASE = {
    // Independent Vowels
    "\u0985": "A",
    "\u0986": "Av",
    "\u0987": "B",
    "\u0988": "C",
    "\u0989": "D",
    "\u098A": "E",
    "\u098B": "F",
    "\u098F": "G",
    "\u0990": "H",
    "\u0993": "I",
    "\u0994": "J",
    // Consonants
    "\u0995": "K",
    "\u0996": "L",
    "\u0997": "M",
    "\u0998": "N",
    "\u0999": "O",
    "\u099A": "P",
    "\u099B": "Q",
    "\u099C": "R",
    "\u099D": "S",
    "\u099E": "T",
    "\u099F": "U",
    "\u09A0": "V",
    "\u09A1": "W",
    "\u09A2": "X",
    "\u09A3": "Y",
    "\u09A4": "Z",
    "\u09A5": "_",
    "\u09A6": "`",
    "\u09A7": "a",
    "\u09A8": "b",
    "\u09AA": "c",
    "\u09AB": "d",
    "\u09AC": "e",
    "\u09AD": "f",
    "\u09AE": "g",
    "\u09AF": "h",
    "\u09B0": "i",
    "\u09B2": "j",
    "\u09B6": "k",
    "\u09B7": "l",
    "\u09B8": "m",
    "\u09B9": "n",
    "\u09DC": "o",
    "\u09DD": "p",
    "\u09DF": "q",
    "\u09CE": "r",
    // Signs
    "\u0982": "s", // ং
    "\u0983": "t", // ঃ
    "\u0981": "u", // ঁ
    // Vowel signs (post-base)
    "\u09BE": "v", // া
    "\u09BF": "w", // ি (reordered before cluster)
    "\u09C0": "x", // ী
    "\u09C1": "y", // ু
    "\u09C2": "~", // ূ
    "\u09C3": "\u201E", // ৃ (Windows-1252 0x84 „)
    "\u09C7": "\u2021", // ে (Windows-1252 0x87 ‡)
    "\u09C8": "\u2030", // ৈ (Windows-1252 0x89 ‰)
    "\u09D7": "\u0160", // ৗ (Windows-1252 0x8A Š)
    "\u09CD": "&", // ্ (Hasanta)
    "\u0964": "|", // ।
    "\u09F3": "\u09F3" // ৳
  };

  var BN_TO_EN_DIGITS = {
    "\u09E6": "0", "\u09E7": "1", "\u09E8": "2", "\u09E9": "3", "\u09EA": "4",
    "\u09EB": "5", "\u09EC": "6", "\u09ED": "7", "\u09EE": "8", "\u09EF": "9"
  };

  var EN_TO_BN_DIGITS = {
    "0": "\u09E6", "1": "\u09E7", "2": "\u09E8", "3": "\u09E9", "4": "\u09EA",
    "5": "\u09EB", "6": "\u09EC", "7": "\u09ED", "8": "\u09EE", "9": "\u09EF"
  };

  function unicodeToBijoy(input, opts) {
    var text = String(input || "");
    if (!text) return "";
    var convertDigits = opts && typeof opts.convertDigits === "boolean" ? opts.convertDigits : true;

    // 1. Normalize decomposed nukta forms
    text = text
      .replace(/\u09A1\u09BC/g, "\u09DC") // ড় -> ড়
      .replace(/\u09A2\u09BC/g, "\u09DD") // ঢ় -> ঢ়
      .replace(/\u09AF\u09BC/g, "\u09DF") // য় -> য়
      .replace(/\u200C|\u200D/g, ""); // clean ZWNJ/ZWJ

    // 2. Split two-part vowels: ো -> ে + া, ৌ -> ে + ৗ
    text = text
      .replace(/\u09CB/g, "\u09C7\u09BE")
      .replace(/\u09CC/g, "\u09C7\u09D7");

    // 3. Reorder Reph (র্ + cluster) -> cluster + © placeholder (\uE001)
    //    and pre-base vowel signs (ি, ে, ৈ) BEFORE consonant cluster
    var out = "";
    var i = 0;
    var len = text.length;

    while (i < len) {
      var hasReph = false;
      if (
        text.charAt(i) === "\u09B0" &&
        text.charAt(i + 1) === "\u09CD" &&
        isBnConsonant(text.charAt(i + 2))
      ) {
        hasReph = true;
        i += 2;
      }

      if (isBnConsonant(text.charAt(i))) {
        // Consume full consonant cluster: C (্ C)*
        var cluster = text.charAt(i);
        i++;
        while (
          i + 1 < len &&
          text.charAt(i) === "\u09CD" &&
          isBnConsonant(text.charAt(i + 1))
        ) {
          cluster += "\u09CD" + text.charAt(i + 1);
          i += 2;
        }

        // Check for pre-base vowel sign (ি, ে, ৈ) right after cluster
        var preKar = "";
        var postKar = "";
        while (i < len) {
          var nextCh = text.charAt(i);
          if (nextCh === "\u09BF" || nextCh === "\u09C7" || nextCh === "\u09C8") {
            preKar += nextCh;
            i++;
          } else if (
            nextCh === "\u09BE" ||
            nextCh === "\u09C0" ||
            nextCh === "\u09C1" ||
            nextCh === "\u09C2" ||
            nextCh === "\u09C3" ||
            nextCh === "\u09D7" ||
            nextCh === "\u0981"
          ) {
            postKar += nextCh;
            i++;
          } else {
            break;
          }
        }

        // Combine: preKar + mapped(cluster) + reph + postKar
        out += preKar + cluster + (hasReph ? "\uE001" : "") + postKar;
      } else {
        if (hasReph) {
          out += "\u09B0\u09CD";
        }
        out += text.charAt(i);
        i++;
      }
    }

    // 4. Replace special phalas (্য -> ¨, ্র -> ª) inside clusters before generic mapping
    out = out
      .replace(/\u09CD\u09AF/g, "\u00A8") // ্য -> ¨ (ja-phala)
      .replace(/\u09CD\u09B0/g, "\u00AA"); // ্র -> ª (ra-phala)

    // 5. Replace known conjuncts
    for (var c = 0; c < U2B_CONJUNCTS.length; c++) {
      var uSeq = U2B_CONJUNCTS[c][0];
      var bSeq = U2B_CONJUNCTS[c][1];
      if (out.indexOf(uSeq) !== -1) {
        out = out.split(uSeq).join(bSeq);
      }
    }

    // 6. Replace individual Unicode characters and Reph placeholder
    var finalStr = "";
    for (var k = 0; k < out.length; k++) {
      var ch = out.charAt(k);
      if (ch === "\uE001") {
        finalStr += "\u00A9"; // © (Reph in Bijoy)
      } else if (U2B_BASE[ch] !== void 0) {
        finalStr += U2B_BASE[ch];
      } else if (convertDigits && BN_TO_EN_DIGITS[ch] !== void 0) {
        finalStr += BN_TO_EN_DIGITS[ch];
      } else {
        finalStr += ch;
      }
    }

    return finalStr;
  }

  // Reverse map: Bijoy ANSI -> Unicode
  var B2U_MULTI = [
    ["Av", "\u0986"], // আ
    ["\u00FF\u00A7", "\u0995\u09CD\u09B7\u09CD\u09AE"],
    ["\u00FF\u00A2", "\u0995\u09CD\u09B7\u09CD\u09A3"],
    ["\u00AF\u00AA", "\u09B8\u09CD\u09A4\u09CD\u09B0"],
    ["\u00BE\u00AA", "\u09A8\u09CD\u09A4\u09CD\u09B0"],
    ["\u00BC\u00AA", "\u09A8\u09CD\u09A6\u09CD\u09B0"],
    ["k\u00AA", "\u09B6\u09CD\u09B0"],
    ["\u00B0Q", "\u099A\u09CD\u099B"],
    ["Z&g", "\u09A4\u09CD\u09AE"],
    ["g&f", "\u09AE\u09CD\u09AD"]
  ];

  var B2U_SINGLE = {
    "A": "\u0985",
    "B": "\u0987",
    "C": "\u0988",
    "D": "\u0989",
    "E": "\u098A",
    "F": "\u098B",
    "G": "\u098F",
    "H": "\u0990",
    "I": "\u0993",
    "J": "\u0994",
    "K": "\u0995",
    "L": "\u0996",
    "M": "\u0997",
    "N": "\u0998",
    "O": "\u0999",
    "P": "\u099A",
    "Q": "\u099B",
    "R": "\u099C",
    "S": "\u099D",
    "T": "\u099E",
    "U": "\u099F",
    "V": "\u09A0",
    "W": "\u09A1",
    "X": "\u09A2",
    "Y": "\u09A3",
    "Z": "\u09A4",
    "_": "\u09A5",
    "`": "\u09A6",
    "a": "\u09A7",
    "b": "\u09A8",
    "c": "\u09AA",
    "d": "\u09AB",
    "e": "\u09AC",
    "f": "\u09AD",
    "g": "\u09AE",
    "h": "\u09AF",
    "i": "\u09B0",
    "j": "\u09B2",
    "k": "\u09B6",
    "l": "\u09B7",
    "m": "\u09B8",
    "n": "\u09B9",
    "o": "\u09DC",
    "p": "\u09DD",
    "q": "\u09DF",
    "r": "\u09CE",
    "s": "\u0982",
    "t": "\u0983",
    "u": "\u0981",
    "v": "\u09BE",
    "w": "\u09BF",
    "x": "\u09C0",
    "y": "\u09C1",
    "~": "\u09C2",
    "\u201E": "\u09C3",
    "\u2021": "\u09C7",
    "\u2020": "\u09C7", // † variant of ে in some Bijoy fonts
    "\u2030": "\u09C8",
    "\u0160": "\u09D7",
    "&": "\u09CD",
    "|": "\u0964",
    "\u00A8": "\u09CD\u09AF", // ¨ -> ্য
    "\u00AA": "\u09CD\u09B0", // ª -> ্র
    "\u00A9": "\uE002", // © -> Reph marker
    "\u00FF": "\u0995\u09CD\u09B7",
    "\u00C1": "\u099C\u09CD\u099E",
    "\u00C4": "\u0999\u09CD\u0995",
    "\u00C6": "\u0999\u09CD\u0997",
    "\u00C8": "\u099E\u09CD\u099A",
    "\u00C9": "\u099E\u09CD\u099B",
    "\u00CA": "\u099E\u09CD\u099C",
    "\u00B3": "\u0995\u09CD\u09A4",
    "\u00B1": "\u0995\u09CD\u0995",
    "\u00B2": "\u0995\u09CD\u099F",
    "\u00B5": "\u0995\u09CD\u09AE",
    "\u00B7": "\u0995\u09CD\u09B8",
    "\u00BD": "\u0997\u09CD\u09A7",
    "\u00B0": "\u099A\u09CD\u099A",
    "\u00BB": "\u099C\u09CD\u099C",
    "\u00D6": "\u099F\u09CD\u099F",
    "\u00D7": "\u09A1\u09CD\u09A1",
    "\u00D8": "\u09A3\u09CD\u099F",
    "\u00D9": "\u09A3\u09CD\u09A0",
    "\u00DA": "\u09A3\u09CD\u09A1",
    "\u00CB": "\u09A4\u09CD\u09A4",
    "\u00CC": "\u09A4\u09CD\u09A5",
    "\u00CE": "\u09A4\u09CD\u09B0",
    "\u00CF": "\u09A6\u09CD\u09A6",
    "\u00D0": "\u09A6\u09CD\u09A7",
    "\u00D1": "\u09A6\u09CD\u09AC",
    "\u00D2": "\u09A6\u09CD\u09AD",
    "\u00BE": "\u09A8\u09CD\u09A4",
    "\u00BF": "\u09A8\u09CD\u09A5",
    "\u00BC": "\u09A8\u09CD\u09A6",
    "\u00C0": "\u09A8\u09CD\u09A7",
    "\u00DB": "\u09A8\u09CD\u09A8",
    "\u00DC": "\u09AA\u09CD\u09A4",
    "\u00DD": "\u09AA\u09CD\u09AA",
    "\u00DE": "\u09AC\u09CD\u09A6",
    "\u00DF": "\u09AC\u09CD\u09A7",
    "\u00E0": "\u09AC\u09CD\u09AC",
    "\u00E1": "\u09AE\u09CD\u09AA",
    "\u00E2": "\u09AE\u09CD\u09AB",
    "\u00E3": "\u09AE\u09CD\u09AC",
    "\u00E5": "\u09AE\u09CD\u09AE",
    "\u00E6": "\u09B2\u09CD\u0995",
    "\u00E7": "\u09B2\u09CD\u0997",
    "\u00E8": "\u09B2\u09CD\u09AA",
    "\u00E9": "\u09B2\u09CD\u09B2",
    "\u00EA": "\u09B6\u09CD\u099A",
    "\u00EB": "\u09B7\u09CD\u0995",
    "\u00EC": "\u09B7\u09CD\u099F",
    "\u00ED": "\u09B7\u09CD\u09A0",
    "\u00EE": "\u09B7\u09CD\u09A3",
    "\u00EF": "\u09B7\u09CD\u09AA",
    "\u00F0": "\u09B8\u09CD\u0995",
    "\u00AF": "\u09B8\u09CD\u09A4",
    "\u00F1": "\u09B8\u09CD\u09A5",
    "\u00F2": "\u09B8\u09CD\u09AA",
    "\u00F3": "\u09B8\u09CD\u09AC",
    "\u00F4": "\u09B8\u09CD\u09AE",
    "\u00F5": "\u09B9\u09CD\u09AE",
    "\u00F6": "\u09B9\u09CD\u09A8",
    "\u00B8": "\u0997\u09C1",
    "\u00E4": "\u09B0\u09C1",
    "\u00F7": "\u09B0\u09C2",
    "\u00F8": "\u09B6\u09C1",
    "\u00F9": "\u09B9\u09C1"
  };

  function bijoyToUnicode(input, opts) {
    var text = String(input || "");
    if (!text) return "";
    var convertDigits = opts && typeof opts.convertDigits === "boolean" ? opts.convertDigits : true;

    // 1. Replace multi-character Bijoy sequences first
    var tmp = text;
    for (var m = 0; m < B2U_MULTI.length; m++) {
      var bSeq = B2U_MULTI[m][0];
      var uSeq = B2U_MULTI[m][1];
      if (tmp.indexOf(bSeq) !== -1) {
        tmp = tmp.split(bSeq).join(uSeq);
      }
    }

    // 2. Map single Bijoy characters to Unicode
    var mapped = "";
    for (var i = 0; i < tmp.length; i++) {
      var ch = tmp.charAt(i);
      if (B2U_SINGLE[ch] !== void 0) {
        mapped += B2U_SINGLE[ch];
      } else if (convertDigits && EN_TO_BN_DIGITS[ch] !== void 0) {
        mapped += EN_TO_BN_DIGITS[ch];
      } else {
        mapped += ch;
      }
    }

    // 3. Move Reph marker (\uE002) BEFORE preceding consonant cluster
    var rephFixed = mapped.replace(
      /([\u0995-\u09B9\u09DC-\u09DF](?:\u09CD[\u0995-\u09B9\u09DC-\u09DF])*)\uE002/g,
      "\u09B0\u09CD$1"
    ).replace(/\uE002/g, "\u09B0\u09CD");

    // 4. Move pre-base vowel signs (ি, ে, ৈ) AFTER the following consonant cluster
    var reordered = "";
    var j = 0;
    var n = rephFixed.length;
    while (j < n) {
      var cur = rephFixed.charAt(j);
      if (cur === "\u09BF" || cur === "\u09C7" || cur === "\u09C8") {
        // Look ahead for optional reph + consonant cluster
        var pos = j + 1;
        var cluster = "";
        if (rephFixed.charAt(pos) === "\u09B0" && rephFixed.charAt(pos + 1) === "\u09CD" && isBnConsonant(rephFixed.charAt(pos + 2))) {
          cluster += "\u09B0\u09CD";
          pos += 2;
        }
        if (isBnConsonant(rephFixed.charAt(pos))) {
          cluster += rephFixed.charAt(pos);
          pos++;
          while (pos + 1 < n && rephFixed.charAt(pos) === "\u09CD" && isBnConsonant(rephFixed.charAt(pos + 1))) {
            cluster += "\u09CD" + rephFixed.charAt(pos + 1);
            pos += 2;
          }
          reordered += cluster + cur;
          j = pos;
          continue;
        }
      }
      reordered += cur;
      j++;
    }

    // 5. Merge two-part vowel signs: ে + া -> ো, ে + ৗ -> ৌ, অ + া -> আ
    reordered = reordered
      .replace(/\u09C7\u09BE/g, "\u09CB")
      .replace(/\u09C7\u09D7/g, "\u09CC")
      .replace(/\u0985\u09BE/g, "\u0986");

    return reordered;
  }

  function runConversion() {
    if (state.convertDir === "u2b") {
      state.outputText = unicodeToBijoy(state.inputText, { convertDigits: state.convertDigits });
    } else {
      state.outputText = bijoyToUnicode(state.inputText, { convertDigits: state.convertDigits });
    }
  }

  // =========================================================================
  // 2. EXCEL FORMULA BUILDER & CHEAT SHEET (BENGALI + ENGLISH)
  // =========================================================================
  var FORMULA_CATALOG = [
    {
      key: "SUM",
      title: "SUM · মোট যোগফল",
      cat: "Math",
      desc: "Add all numbers in a column or cell range · নির্দিষ্ট কলাম বা রেঞ্জের সব সংখ্যার যোগফল বের করুন।",
      fields: ["range"],
      build: function (s) { return "=SUM(" + (s.formulaRange || "B2:B20") + ")"; },
      example: "=SUM(B2:B20)"
    },
    {
      key: "AVERAGE",
      title: "AVERAGE · গড় মান",
      cat: "Math",
      desc: "Calculate the mean/average of numbers · সংখ্যার গড় (Average) হিসাব করুন।",
      fields: ["range"],
      build: function (s) { return "=AVERAGE(" + (s.formulaRange || "B2:B20") + ")"; },
      example: "=AVERAGE(B2:B20)"
    },
    {
      key: "COUNT",
      title: "COUNT · মোট সংখ্যা গণনা",
      cat: "Stats",
      desc: "Count cells containing numbers · কতগুলি ঘরে সংখ্যা আছে তা গুনুন।",
      fields: ["range"],
      build: function (s) { return "=COUNT(" + (s.formulaRange || "B2:B20") + ")"; },
      example: "=COUNT(B2:B20)"
    },
    {
      key: "MIN",
      title: "MIN · সর্বনিম্ন মান",
      cat: "Stats",
      desc: "Find the smallest number in a range · রেঞ্জের সবচেয়ে ছোট সংখ্যা খুঁজুন।",
      fields: ["range"],
      build: function (s) { return "=MIN(" + (s.formulaRange || "B2:B20") + ")"; },
      example: "=MIN(B2:B20)"
    },
    {
      key: "MAX",
      title: "MAX · সর্বোচ্চ মান",
      cat: "Stats",
      desc: "Find the largest number in a range · রেঞ্জের সবচেয়ে বড় সংখ্যা খুঁজুন।",
      fields: ["range"],
      build: function (s) { return "=MAX(" + (s.formulaRange || "B2:B20") + ")"; },
      example: "=MAX(B2:B20)"
    },
    {
      key: "IF",
      title: "IF · শর্তসাপেক্ষ ফলাফল",
      cat: "Logic",
      desc: "Return one value if condition is true, another if false · শর্ত মিললে একটি মান, না মিললে অন্য মান দেখান।",
      fields: ["lookup", "criteria", "trueFalse"],
      build: function (s) {
        var cell = s.formulaLookup || "B2";
        var cond = (s.formulaCriteria || ">=40").replace(/^"+|"+$/g, "");
        return "=IF(" + cell + cond + ", " + (s.formulaTrueVal || '"Pass"') + ", " + (s.formulaFalseVal || '"Fail"') + ")";
      },
      example: '=IF(B2>=40, "Pass", "Fail")'
    },
    {
      key: "SUMIF",
      title: "SUMIF · শর্তসাপেক্ষ যোগ",
      cat: "Finance",
      desc: "Sum cells that match a category or condition · নির্দিষ্ট ক্যাটাগরি বা শর্ত মিললে যোগফল বের করুন।",
      fields: ["range", "criteria", "sumRange"],
      build: function (s) {
        return "=SUMIF(" + (s.formulaRange || "A2:A20") + ", " + (s.formulaCriteria || '"Paid"') + ", " + (s.formulaSumRange || "C2:C20") + ")";
      },
      example: '=SUMIF(A2:A20, "Paid", C2:C20)'
    },
    {
      key: "COUNTIF",
      title: "COUNTIF · শর্তসাপেক্ষ গণনা",
      cat: "Stats",
      desc: "Count rows matching a specific text or rule · নির্দিষ্ট নাম বা শর্ত কতবার আছে গুনুন।",
      fields: ["range", "criteria"],
      build: function (s) {
        return "=COUNTIF(" + (s.formulaRange || "A2:A20") + ", " + (s.formulaCriteria || '"Present"') + ")";
      },
      example: '=COUNTIF(A2:A20, "Present")'
    },
    {
      key: "VLOOKUP",
      title: "VLOOKUP · টেবিল থেকে তথ্য খোঁজা",
      cat: "Lookup",
      desc: "Look up a value in the first column and return a column to its right · প্রথম কলাম মিলিয়ে পাশের কলামের তথ্য আনুন।",
      fields: ["lookup", "table", "colIdx"],
      build: function (s) {
        return "=VLOOKUP(" + (s.formulaLookup || "A2") + ", " + (s.formulaTable || "A2:D50") + ", " + (s.formulaColIdx || "3") + ", FALSE)";
      },
      example: "=VLOOKUP(A2, A2:D50, 3, FALSE)"
    },
    {
      key: "CONCAT",
      title: "CONCAT · দুটি ঘর জোড়া লাগানো",
      cat: "Text",
      desc: "Join first name & last name or codes together · দুটি কলামের লেখা একসাথে জোড়া লাগান।",
      fields: ["lookup", "sumRange"],
      build: function (s) {
        return '=CONCAT(' + (s.formulaLookup || "A2") + ', " ", ' + (s.formulaSumRange || "B2") + ')';
      },
      example: '=CONCAT(A2, " ", B2)'
    },
    {
      key: "TRIM",
      title: "TRIM · বাড়তি স্পেস মোছা",
      cat: "Text",
      desc: "Remove extra leading/trailing spaces in names or phone numbers · লেখার বাড়তি স্পেস পরিষ্কার করুন।",
      fields: ["lookup"],
      build: function (s) { return "=TRIM(" + (s.formulaLookup || "A2") + ")"; },
      example: "=TRIM(A2)"
    },
    {
      key: "ROUND",
      title: "ROUND · দশমিক রাউন্ড অফ",
      cat: "Finance",
      desc: "Round GST or invoice totals to 2 decimal places · বিল বা GST হিসাব ২ দশমিক ঘর পর্যন্ত ঠিক করুন।",
      fields: ["lookup", "decimals"],
      build: function (s) { return "=ROUND(" + (s.formulaLookup || "C2") + ", " + (s.formulaDecimals || "2") + ")"; },
      example: "=ROUND(C2, 2)"
    }
  ];

  function getFormulaMeta(key) {
    for (var i = 0; i < FORMULA_CATALOG.length; i++) {
      if (FORMULA_CATALOG[i].key === key) return FORMULA_CATALOG[i];
    }
    return FORMULA_CATALOG[0];
  }

  // =========================================================================
  // 3. UI RENDERING (DESIGN A · PASTEL OFFICE PALETTE)
  // =========================================================================
  function renderResultSheet() {
    if (!state.resultSheet) return "";
    var r = state.resultSheet;
    return (
      '<div class="fixed inset-0 z-[90] bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-3">' +
        '<div class="w-full max-w-lg rounded-[26px] bg-[#FFF7EE] dark:bg-[#1D1729] border border-black/10 dark:border-white/15 p-5 shadow-2xl space-y-4">' +
          '<div class="flex items-start justify-between gap-3">' +
            '<div>' +
              '<p class="text-[11px] font-extrabold uppercase tracking-wider text-[#115E42] dark:text-[#A7F3D0]">Office Pro Result</p>' +
              '<h3 class="text-lg font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">' + esc(r.title) + '</h3>' +
              '<p class="text-xs text-[#6B5E7B] dark:text-[#B9AEC9]">' + esc(r.subtitle || "") + '</p>' +
            '</div>' +
            '<button type="button" data-op-act="closeSheet" class="min-w-[44px] min-h-[44px] rounded-2xl bg-black/5 dark:bg-white/10 text-[#2B2236] dark:text-[#F5EEFF] font-extrabold text-sm">✕</button>' +
          '</div>' +
          '<textarea readonly rows="6" class="w-full rounded-2xl p-3.5 bg-white dark:bg-[#14101D] border border-black/10 dark:border-white/15 text-sm text-[#2B2236] dark:text-[#F5EEFF] font-mono">' + esc(r.text) + '</textarea>' +
          '<div class="grid grid-cols-3 gap-2">' +
            '<button type="button" data-op-act="sheetCopy" class="min-h-[44px] rounded-2xl bg-[#5B3FD0] text-white text-xs font-extrabold">Copy</button>' +
            '<button type="button" data-op-act="sheetShare" class="min-h-[44px] rounded-2xl bg-[#CFF3E2] dark:bg-[#1B362E] text-[#115E42] dark:text-[#A7F3D0] text-xs font-extrabold">Share</button>' +
            '<button type="button" data-op-act="sheetDownload" class="min-h-[44px] rounded-2xl bg-[#E4D9FF] dark:bg-[#2D2347] text-[#3E26A0] dark:text-[#E4D9FF] text-xs font-extrabold">.TXT</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function renderBanglaConverterTab() {
    var isU2B = state.convertDir === "u2b";
    var inChars = state.inputText.length;
    var outChars = state.outputText.length;
    var inWords = state.inputText.trim() ? state.inputText.trim().split(/\s+/).length : 0;

    var histHtml = "";
    if (!state.history.length) {
      histHtml =
        '<div class="rounded-[22px] p-5 text-center bg-white/70 dark:bg-[#221C2E]/80 border border-dashed border-black/10 dark:border-white/15">' +
          '<p class="text-sm font-bold text-[#2B2236] dark:text-[#F5EEFF]">No saved conversions yet · কোনো ইতিহাস নেই</p>' +
          '<p class="text-xs text-[#6B5E7B] dark:text-[#B9AEC9] mt-1">Tap "Save" after converting to keep quick Bengali/Bijoy snippets offline.</p>' +
        '</div>';
    } else {
      histHtml = '<div class="space-y-2">';
      for (var i = 0; i < state.history.length; i++) {
        var h = state.history[i];
        var badge = h.dir === "u2b" ? "Unicode → Bijoy" : "Bijoy → Unicode";
        histHtml +=
          '<div class="rounded-[18px] p-3 bg-white dark:bg-[#221C2E] border border-black/10 dark:border-white/10 flex items-center justify-between gap-2">' +
            '<button type="button" data-op-act="loadHistory" data-id="' + esc(h.id) + '" class="flex-1 min-w-0 text-left min-h-[44px]">' +
              '<span class="inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-[#CFF3E2] dark:bg-[#1B362E] text-[#115E42] dark:text-[#A7F3D0]">' + badge + '</span>' +
              '<p class="text-xs font-bold text-[#2B2236] dark:text-[#F5EEFF] truncate mt-1">' + esc(h.input.slice(0, 80)) + '</p>' +
              '<p class="text-[11px] text-[#6B5E7B] dark:text-[#B9AEC9] truncate">' + esc(h.output.slice(0, 80)) + '</p>' +
            '</button>' +
            '<button type="button" data-op-act="delHistory" data-id="' + esc(h.id) + '" class="min-w-[44px] min-h-[44px] rounded-xl bg-[#FFD6D6] dark:bg-[#3D212B] text-[#8E1B3B] dark:text-[#FDA4AF] text-xs font-extrabold">✕</button>' +
          '</div>';
      }
      histHtml += '</div>';
    }

    return (
      '<div class="space-y-4">' +
        // Direction Toggle Card
        '<div class="rounded-[24px] p-4 bg-[#CFF3E2]/65 dark:bg-[#1B362E]/75 border border-black/5 dark:border-white/10 space-y-3">' +
          '<div class="grid grid-cols-2 gap-2">' +
            '<button type="button" data-op-act="setDir" data-dir="u2b" class="min-h-[46px] px-3 rounded-2xl text-xs sm:text-sm font-extrabold transition ' +
              (isU2B ? "bg-[#5B3FD0] text-white shadow-sm" : "bg-white/90 dark:bg-[#221C2E] text-[#2B2236] dark:text-[#F5EEFF]") + '">' +
              'Unicode → Bijoy<span class="block text-[10px] font-semibold opacity-85">অভ্র → বিজয় (SutonnyMJ)</span>' +
            '</button>' +
            '<button type="button" data-op-act="setDir" data-dir="b2u" class="min-h-[46px] px-3 rounded-2xl text-xs sm:text-sm font-extrabold transition ' +
              (!isU2B ? "bg-[#5B3FD0] text-white shadow-sm" : "bg-white/90 dark:bg-[#221C2E] text-[#2B2236] dark:text-[#F5EEFF]") + '">' +
              'Bijoy → Unicode<span class="block text-[10px] font-semibold opacity-85">বিজয় → অভ্র (ইউনিকোড)</span>' +
            '</button>' +
          '</div>' +
          '<div class="flex flex-wrap items-center justify-between gap-2">' +
            '<label class="inline-flex items-center gap-2 text-xs font-bold text-[#115E42] dark:text-[#A7F3D0] min-h-[36px] cursor-pointer">' +
              '<input type="checkbox" id="opConvertDigitsChk" ' + (state.convertDigits ? "checked" : "") + ' class="w-4 h-4 accent-[#5B3FD0] rounded" />' +
              '<span>Convert digits (০-৯ ↔ 0-9)</span>' +
            '</label>' +
            '<div class="flex items-center gap-1.5">' +
              '<button type="button" data-op-act="sampleText" class="min-h-[38px] px-3 rounded-xl bg-white dark:bg-[#221C2E] text-[#2B2236] dark:text-[#F5EEFF] text-xs font-extrabold border border-black/10 dark:border-white/10">Sample · নমুনা</button>' +
              '<button type="button" data-op-act="swapText" class="min-h-[38px] px-3 rounded-xl bg-white dark:bg-[#221C2E] text-[#5B3FD0] dark:text-[#C8B9FF] text-xs font-extrabold border border-black/10 dark:border-white/10">⇅ Swap</button>' +
              '<button type="button" data-op-act="clearText" class="min-h-[38px] px-3 rounded-xl bg-[#FFD6D6] dark:bg-[#3D212B] text-[#8E1B3B] dark:text-[#FDA4AF] text-xs font-extrabold">Clear</button>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // Input & Output Dual Cards
        '<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">' +
          '<div class="rounded-[24px] p-4 bg-white dark:bg-[#221C2E] border border-black/10 dark:border-white/10 flex flex-col gap-2">' +
            '<div class="flex items-center justify-between">' +
              '<label for="opBanglaInput" class="text-xs font-extrabold uppercase tracking-wider text-[#6B5E7B] dark:text-[#B9AEC9]">' +
                (isU2B ? "Unicode Input · ইউনিকোড বাংলা" : "Bijoy ANSI Input · বিজয় লেখা") +
              '</label>' +
              '<span class="text-[11px] font-bold text-[#6B5E7B] dark:text-[#B9AEC9] tabular-nums">' + inWords + ' words · ' + inChars + ' chars</span>' +
            '</div>' +
            '<textarea id="opBanglaInput" rows="7" placeholder="' + (isU2B ? "এখানে বাংলা ইউনিকোড লিখুন বা পেস্ট করুন (যেমন: আমার সোনার বাংলা)..." : "Paste Bijoy ANSI text here (e.g. Avgvi \u2021mvbvi evsjv)...") + '" class="w-full rounded-2xl p-3.5 bg-[#FFF7EE] dark:bg-[#17131F] border border-black/10 dark:border-white/15 text-sm text-[#2B2236] dark:text-[#F5EEFF] leading-relaxed outline-none focus:border-[#5B3FD0]">' + esc(state.inputText) + '</textarea>' +
            '<div class="flex items-center gap-2">' +
              '<button type="button" data-op-act="pasteInput" class="min-h-[44px] px-4 rounded-2xl bg-[#FFF7EE] dark:bg-[#17131F] border border-black/10 dark:border-white/15 text-xs font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">Paste · পেস্ট</button>' +
              '<button type="button" data-op-act="convertNow" class="flex-1 min-h-[44px] px-4 rounded-2xl bg-[#5B3FD0] text-white text-xs sm:text-sm font-extrabold shadow-sm">Convert Now · রূপান্তর করুন</button>' +
            '</div>' +
          '</div>' +

          '<div class="rounded-[24px] p-4 bg-white dark:bg-[#221C2E] border border-black/10 dark:border-white/10 flex flex-col gap-2">' +
            '<div class="flex items-center justify-between">' +
              '<label for="opBanglaOutput" class="text-xs font-extrabold uppercase tracking-wider text-[#115E42] dark:text-[#A7F3D0]">' +
                (isU2B ? "Bijoy ANSI Output · বিজয় (SutonnyMJ)" : "Unicode Output · ইউনিকোড বাংলা") +
              '</label>' +
              '<span class="text-[11px] font-bold text-[#6B5E7B] dark:text-[#B9AEC9] tabular-nums">' + outChars + ' chars</span>' +
            '</div>' +
            '<textarea id="opBanglaOutput" readonly rows="7" placeholder="Converted output will appear here automatically..." class="w-full rounded-2xl p-3.5 bg-[#F4FBF7] dark:bg-[#15241F] border border-[#115E42]/15 dark:border-[#A7F3D0]/15 text-sm text-[#2B2236] dark:text-[#F5EEFF] leading-relaxed outline-none">' + esc(state.outputText) + '</textarea>' +
            '<div class="grid grid-cols-4 gap-1.5">' +
              '<button type="button" data-op-act="copyOutput" class="min-h-[44px] rounded-2xl bg-[#5B3FD0] text-white text-xs font-extrabold">Copy</button>' +
              '<button type="button" data-op-act="saveHistory" class="min-h-[44px] rounded-2xl bg-[#CFF3E2] dark:bg-[#1B362E] text-[#115E42] dark:text-[#A7F3D0] text-xs font-extrabold">Save</button>' +
              '<button type="button" data-op-act="shareOutput" class="min-h-[44px] rounded-2xl bg-[#E4D9FF] dark:bg-[#2D2347] text-[#3E26A0] dark:text-[#E4D9FF] text-xs font-extrabold">Share</button>' +
              '<button type="button" data-op-act="openSheet" class="min-h-[44px] rounded-2xl bg-[#FFE7C2] dark:bg-[#3D2E1D] text-[#6B3E00] dark:text-[#FDE68A] text-xs font-extrabold">.TXT</button>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // Font tip note
        '<div class="rounded-[20px] p-3.5 bg-[#FFF1A8]/55 dark:bg-[#3A3219]/65 text-xs font-semibold text-[#4A3B00] dark:text-[#FDE68A]">' +
          'Tip · পরামর্শ: Bijoy output uses standard <strong>SutonnyMJ</strong> ANSI encoding for MS Word, PageMaker, Photoshop &amp; Govt printing presses. Works 100% offline.' +
        '</div>' +

        // Saved History
        '<div class="space-y-2">' +
          '<div class="flex items-center justify-between">' +
            '<h3 class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">Recent Saved Conversions · সংরক্ষিত ইতিহাস</h3>' +
            (state.history.length ? '<button type="button" data-op-act="clearHistory" class="text-xs font-bold text-[#8E1B3B] dark:text-[#FDA4AF] min-h-[36px] px-2">Clear All</button>' : '') +
          '</div>' +
          histHtml +
        '</div>' +
      '</div>'
    );
  }

  function renderExcelHelperTab() {
    var meta = getFormulaMeta(state.formulaKey);
    var builtFormula = meta.build(state);
    var fields = meta.fields || [];

    var fieldHtml = '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">';
    if (fields.indexOf("range") !== -1) {
      fieldHtml +=
        '<div>' +
          '<label class="block text-[11px] font-extrabold text-[#6B5E7B] dark:text-[#B9AEC9] mb-1">Cell Range · সেল রেঞ্জ</label>' +
          '<input type="text" id="opFmlRange" value="' + esc(state.formulaRange) + '" placeholder="B2:B20" class="w-full min-h-[44px] px-3 rounded-xl bg-[#FFF7EE] dark:bg-[#17131F] border border-black/10 dark:border-white/15 text-sm font-bold text-[#2B2236] dark:text-[#F5EEFF]" />' +
        '</div>';
    }
    if (fields.indexOf("lookup") !== -1) {
      fieldHtml +=
        '<div>' +
          '<label class="block text-[11px] font-extrabold text-[#6B5E7B] dark:text-[#B9AEC9] mb-1">Target / Lookup Cell · মূল সেল</label>' +
          '<input type="text" id="opFmlLookup" value="' + esc(state.formulaLookup) + '" placeholder="A2" class="w-full min-h-[44px] px-3 rounded-xl bg-[#FFF7EE] dark:bg-[#17131F] border border-black/10 dark:border-white/15 text-sm font-bold text-[#2B2236] dark:text-[#F5EEFF]" />' +
        '</div>';
    }
    if (fields.indexOf("criteria") !== -1) {
      fieldHtml +=
        '<div>' +
          '<label class="block text-[11px] font-extrabold text-[#6B5E7B] dark:text-[#B9AEC9] mb-1">Condition / Criteria · শর্ত</label>' +
          '<input type="text" id="opFmlCriteria" value="' + esc(state.formulaCriteria) + '" placeholder=\'">500" or "Paid"\' class="w-full min-h-[44px] px-3 rounded-xl bg-[#FFF7EE] dark:bg-[#17131F] border border-black/10 dark:border-white/15 text-sm font-bold text-[#2B2236] dark:text-[#F5EEFF]" />' +
        '</div>';
    }
    if (fields.indexOf("sumRange") !== -1) {
      fieldHtml +=
        '<div>' +
          '<label class="block text-[11px] font-extrabold text-[#6B5E7B] dark:text-[#B9AEC9] mb-1">' + (meta.key === "CONCAT" ? "Second Cell · দ্বিতীয় সেল" : "Sum Range · যোগফলের রেঞ্জ") + '</label>' +
          '<input type="text" id="opFmlSumRange" value="' + esc(state.formulaSumRange) + '" placeholder="C2:C20" class="w-full min-h-[44px] px-3 rounded-xl bg-[#FFF7EE] dark:bg-[#17131F] border border-black/10 dark:border-white/15 text-sm font-bold text-[#2B2236] dark:text-[#F5EEFF]" />' +
        '</div>';
    }
    if (fields.indexOf("table") !== -1) {
      fieldHtml +=
        '<div>' +
          '<label class="block text-[11px] font-extrabold text-[#6B5E7B] dark:text-[#B9AEC9] mb-1">Table Range · টেবিল রেঞ্জ</label>' +
          '<input type="text" id="opFmlTable" value="' + esc(state.formulaTable) + '" placeholder="A2:D50" class="w-full min-h-[44px] px-3 rounded-xl bg-[#FFF7EE] dark:bg-[#17131F] border border-black/10 dark:border-white/15 text-sm font-bold text-[#2B2236] dark:text-[#F5EEFF]" />' +
        '</div>';
    }
    if (fields.indexOf("colIdx") !== -1) {
      fieldHtml +=
        '<div>' +
          '<label class="block text-[11px] font-extrabold text-[#6B5E7B] dark:text-[#B9AEC9] mb-1">Column Number · কলাম নম্বর</label>' +
          '<input type="number" min="1" id="opFmlColIdx" value="' + esc(state.formulaColIdx) + '" class="w-full min-h-[44px] px-3 rounded-xl bg-[#FFF7EE] dark:bg-[#17131F] border border-black/10 dark:border-white/15 text-sm font-bold text-[#2B2236] dark:text-[#F5EEFF]" />' +
        '</div>';
    }
    if (fields.indexOf("trueFalse") !== -1) {
      fieldHtml +=
        '<div>' +
          '<label class="block text-[11px] font-extrabold text-[#6B5E7B] dark:text-[#B9AEC9] mb-1">If True · শর্ত মিললে</label>' +
          '<input type="text" id="opFmlTrue" value="' + esc(state.formulaTrueVal) + '" class="w-full min-h-[44px] px-3 rounded-xl bg-[#FFF7EE] dark:bg-[#17131F] border border-black/10 dark:border-white/15 text-sm font-bold text-[#2B2236] dark:text-[#F5EEFF]" />' +
        '</div>' +
        '<div>' +
          '<label class="block text-[11px] font-extrabold text-[#6B5E7B] dark:text-[#B9AEC9] mb-1">If False · না মিললে</label>' +
          '<input type="text" id="opFmlFalse" value="' + esc(state.formulaFalseVal) + '" class="w-full min-h-[44px] px-3 rounded-xl bg-[#FFF7EE] dark:bg-[#17131F] border border-black/10 dark:border-white/15 text-sm font-bold text-[#2B2236] dark:text-[#F5EEFF]" />' +
        '</div>';
    }
    if (fields.indexOf("decimals") !== -1) {
      fieldHtml +=
        '<div>' +
          '<label class="block text-[11px] font-extrabold text-[#6B5E7B] dark:text-[#B9AEC9] mb-1">Decimal Places · দশমিক ঘর</label>' +
          '<input type="number" min="0" max="6" id="opFmlDec" value="' + esc(state.formulaDecimals) + '" class="w-full min-h-[44px] px-3 rounded-xl bg-[#FFF7EE] dark:bg-[#17131F] border border-black/10 dark:border-white/15 text-sm font-bold text-[#2B2236] dark:text-[#F5EEFF]" />' +
        '</div>';
    }
    fieldHtml += '</div>';

    var q = (state.formulaSearch || "").trim().toLowerCase();
    var cheatCards = "";
    for (var i = 0; i < FORMULA_CATALOG.length; i++) {
      var item = FORMULA_CATALOG[i];
      if (q && (item.key + " " + item.title + " " + item.desc + " " + item.cat).toLowerCase().indexOf(q) === -1) {
        continue;
      }
      var active = item.key === state.formulaKey;
      cheatCards +=
        '<button type="button" data-op-act="pickFormula" data-key="' + esc(item.key) + '" class="text-left rounded-[20px] p-3.5 border transition min-h-[44px] ' +
          (active
            ? "bg-[#CFF3E2] dark:bg-[#1B362E] border-[#115E42]/40 dark:border-[#A7F3D0]/40"
            : "bg-white dark:bg-[#221C2E] border-black/10 dark:border-white/10") + '">' +
          '<div class="flex items-center justify-between gap-2">' +
            '<span class="text-xs font-extrabold text-[#115E42] dark:text-[#A7F3D0]">' + esc(item.title) + '</span>' +
            '<span class="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/10 text-[#6B5E7B] dark:text-[#B9AEC9]">' + esc(item.cat) + '</span>' +
          '</div>' +
          '<p class="text-[11px] text-[#6B5E7B] dark:text-[#B9AEC9] mt-1 leading-snug">' + esc(item.desc) + '</p>' +
          '<code class="block mt-2 text-[11px] font-mono font-bold text-[#5B3FD0] dark:text-[#C8B9FF]">' + esc(item.example) + '</code>' +
        '</button>';
    }

    var savedHtml = "";
    if (state.savedFormulas.length) {
      savedHtml =
        '<div class="space-y-2">' +
          '<h3 class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">Saved Formulas · সংরক্ষিত ফর্মুলা</h3>' +
          '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">';
      for (var sIdx = 0; sIdx < state.savedFormulas.length; sIdx++) {
        var sf = state.savedFormulas[sIdx];
        savedHtml +=
          '<div class="rounded-[18px] p-3 bg-white dark:bg-[#221C2E] border border-black/10 dark:border-white/10 flex items-center justify-between gap-2">' +
            '<div class="min-w-0 flex-1">' +
              '<p class="text-xs font-extrabold text-[#2B2236] dark:text-[#F5EEFF] truncate">' + esc(sf.title) + '</p>' +
              '<code class="text-[11px] font-mono text-[#5B3FD0] dark:text-[#C8B9FF] break-all">' + esc(sf.formula) + '</code>' +
            '</div>' +
            '<div class="flex items-center gap-1">' +
              '<button type="button" data-op-act="copySavedFormula" data-formula="' + esc(sf.formula) + '" class="min-h-[40px] px-2.5 rounded-xl bg-[#CFF3E2] dark:bg-[#1B362E] text-[#115E42] dark:text-[#A7F3D0] text-[11px] font-extrabold">Copy</button>' +
              '<button type="button" data-op-act="delSavedFormula" data-id="' + esc(sf.id) + '" class="min-w-[40px] min-h-[40px] rounded-xl bg-[#FFD6D6] dark:bg-[#3D212B] text-[#8E1B3B] dark:text-[#FDA4AF] text-xs font-extrabold">✕</button>' +
            '</div>' +
          '</div>';
      }
      savedHtml += '</div></div>';
    }

    return (
      '<div class="space-y-4">' +
        // Spreadsheet Reader + Live Helper Launcher
        '<div class="rounded-[24px] p-4 bg-[#CFF3E2]/70 dark:bg-[#1B362E]/80 border border-black/5 dark:border-white/10 space-y-3">' +
          '<div>' +
            '<p class="text-[11px] font-extrabold uppercase tracking-wider text-[#115E42] dark:text-[#A7F3D0]">Live Spreadsheet Editor · এক্সেল এডিটর</p>' +
            '<h3 class="text-base font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">Open Excel/CSV with Live Column Stats, Auto-Formulas &amp; Sort/Clean</h3>' +
            '<p class="text-xs text-[#2B2236]/80 dark:text-[#D5EFE2]/80 mt-0.5">Reuses ONEORA Universal Reader — edit cells, auto-insert SUM/AVG/MIN/MAX, sort A→Z, trim spaces, remove duplicates &amp; save as .xlsx or .csv offline.</p>' +
          '</div>' +
          '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">' +
            '<label class="cursor-pointer min-h-[48px] px-4 rounded-2xl bg-[#5B3FD0] text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-sm">' +
              '<span>Open .xlsx / .xls / .csv File</span>' +
              '<input type="file" id="opExcelPickInput" accept=".xlsx,.xls,.csv,.ods,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv" class="hidden" />' +
            '</label>' +
            '<button type="button" data-op-act="newBlankSheet" class="min-h-[48px] px-4 rounded-2xl bg-white dark:bg-[#221C2E] text-[#115E42] dark:text-[#A7F3D0] border border-[#115E42]/20 text-xs sm:text-sm font-extrabold">+ New Blank Spreadsheet · নতুন শিট</button>' +
          '</div>' +
          '<div class="flex flex-wrap gap-1.5 pt-1">' +
            '<button type="button" data-op-act="jumpTool" data-tool="excelMerge" class="min-h-[38px] px-3 rounded-xl bg-white/85 dark:bg-[#221C2E] text-[#2B2236] dark:text-[#F5EEFF] text-xs font-bold">Excel Merger</button>' +
            '<button type="button" data-op-act="jumpTool" data-tool="excelCleaner" class="min-h-[38px] px-3 rounded-xl bg-white/85 dark:bg-[#221C2E] text-[#2B2236] dark:text-[#F5EEFF] text-xs font-bold">Duplicate Cleaner</button>' +
            '<button type="button" data-op-act="jumpTool" data-tool="pdfToExcel" class="min-h-[38px] px-3 rounded-xl bg-white/85 dark:bg-[#221C2E] text-[#2B2236] dark:text-[#F5EEFF] text-xs font-bold">PDF to Excel</button>' +
          '</div>' +
        '</div>' +

        // Interactive Formula Builder
        '<div class="rounded-[24px] p-4 bg-white dark:bg-[#221C2E] border border-black/10 dark:border-white/10 space-y-3">' +
          '<div class="flex flex-wrap items-center justify-between gap-2">' +
            '<div>' +
              '<p class="text-[11px] font-extrabold uppercase tracking-wider text-[#5B3FD0] dark:text-[#C8B9FF]">Interactive Formula Builder · ফর্মুলা তৈরি করুন</p>' +
              '<h3 class="text-base font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">' + esc(meta.title) + '</h3>' +
            '</div>' +
            '<select id="opFormulaSelect" class="min-h-[44px] px-3 rounded-xl bg-[#FFF7EE] dark:bg-[#17131F] border border-black/10 dark:border-white/15 text-xs font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">' +
              FORMULA_CATALOG.map(function (f) {
                return '<option value="' + esc(f.key) + '"' + (f.key === state.formulaKey ? " selected" : "") + '>' + esc(f.title) + '</option>';
              }).join("") +
            '</select>' +
          '</div>' +
          '<p class="text-xs text-[#6B5E7B] dark:text-[#B9AEC9]">' + esc(meta.desc) + '</p>' +
          fieldHtml +
          '<div class="rounded-2xl p-3.5 bg-[#FFF7EE] dark:bg-[#17131F] border border-[#5B3FD0]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2">' +
            '<code id="opBuiltFormulaPreview" class="text-sm sm:text-base font-mono font-extrabold text-[#5B3FD0] dark:text-[#C8B9FF] break-all">' + esc(builtFormula) + '</code>' +
            '<div class="flex items-center gap-1.5 shrink-0">' +
              '<button type="button" data-op-act="copyFormula" class="min-h-[44px] px-4 rounded-xl bg-[#5B3FD0] text-white text-xs font-extrabold">Copy</button>' +
              '<button type="button" data-op-act="saveFormula" class="min-h-[44px] px-3.5 rounded-xl bg-[#CFF3E2] dark:bg-[#1B362E] text-[#115E42] dark:text-[#A7F3D0] text-xs font-extrabold">Save</button>' +
              '<button type="button" data-op-act="shareFormula" class="min-h-[44px] px-3.5 rounded-xl bg-[#E4D9FF] dark:bg-[#2D2347] text-[#3E26A0] dark:text-[#E4D9FF] text-xs font-extrabold">Share</button>' +
            '</div>' +
          '</div>' +
        '</div>' +

        savedHtml +

        // Searchable Bengali + English Cheat Sheet
        '<div class="space-y-2.5">' +
          '<div class="flex flex-wrap items-center justify-between gap-2">' +
            '<h3 class="text-sm font-extrabold text-[#2B2236] dark:text-[#F5EEFF]">Offline Excel Formula Cheat Sheet · ফর্মুলা তালিকা</h3>' +
            '<input type="search" id="opFormulaSearch" value="' + esc(state.formulaSearch) + '" placeholder="Search SUM, IF, VLOOKUP..." class="min-h-[40px] px-3 rounded-xl bg-white dark:bg-[#221C2E] border border-black/10 dark:border-white/15 text-xs font-semibold text-[#2B2236] dark:text-[#F5EEFF] w-full sm:w-56" />' +
          '</div>' +
          '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">' +
            (cheatCards || '<p class="text-xs text-[#6B5E7B] dark:text-[#B9AEC9] col-span-full py-4 text-center">No matching formula found.</p>') +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function render(rootEl, forcedTab) {
    if (forcedTab === "bangla_convert" || forcedTab === "excel_helper") {
      state.tab = forcedTab;
    }
    var root = rootEl || document.getElementById("oneoraOfficeProRoot");
    if (!root) return;

    var isBangla = state.tab === "bangla_convert";

    root.innerHTML =
      '<div class="space-y-4 pb-10" data-pastel-cat="office">' +
        // Top Pastel Office Banner
        '<div class="rounded-[26px] p-4 sm:p-5 bg-[#CFF3E2] dark:bg-[#1B362E] text-[#115E42] dark:text-[#D5EFE2] flex flex-col sm:flex-row sm:items-center justify-between gap-3">' +
          '<div>' +
            '<p class="text-[11px] font-extrabold uppercase tracking-wider opacity-80">ONEORA Office Pro · 100% Offline</p>' +
            '<h2 class="text-xl sm:text-2xl font-extrabold text-[#113D2C] dark:text-[#F5EEFF] mt-0.5">' +
              (isBangla ? "Bangla Unicode ↔ Bijoy · বাংলা কনভার্টার" : "Excel Helper & Formula Studio · এক্সেল হেল্পার") +
            '</h2>' +
            '<p class="text-xs opacity-90 mt-0.5">' +
              (isBangla ? "Convert Avro Unicode & Bijoy SutonnyMJ ANSI offline with conjunct & kar accuracy." : "Live spreadsheet stats, auto-formulas, sort/clean tools & Bengali+English formula builder.") +
            '</p>' +
          '</div>' +
          '<button type="button" data-op-act="jumpTool" data-tool="ocrScanner" class="min-h-[44px] px-4 rounded-2xl bg-white/90 dark:bg-[#221C2E] text-[#115E42] dark:text-[#A7F3D0] text-xs font-extrabold shadow-xs shrink-0">' +
            'Offline Bengali+English OCR →' +
          '</button>' +
        '</div>' +

        // Sub-Tab Switcher
        '<div class="grid grid-cols-2 gap-2 p-1.5 rounded-[20px] bg-white/80 dark:bg-[#221C2E] border border-black/10 dark:border-white/10">' +
          '<button type="button" data-op-act="switchTab" data-tab="bangla_convert" class="min-h-[44px] rounded-2xl text-xs sm:text-sm font-extrabold transition ' +
            (isBangla ? "bg-[#5B3FD0] text-white shadow-xs" : "text-[#2B2236] dark:text-[#F5EEFF]") + '">' +
            'Unicode ↔ Bijoy · বাংলা' +
          '</button>' +
          '<button type="button" data-op-act="switchTab" data-tab="excel_helper" class="min-h-[44px] rounded-2xl text-xs sm:text-sm font-extrabold transition ' +
            (!isBangla ? "bg-[#5B3FD0] text-white shadow-xs" : "text-[#2B2236] dark:text-[#F5EEFF]") + '">' +
            'Excel Helper · এক্সেল' +
          '</button>' +
        '</div>' +

        (isBangla ? renderBanglaConverterTab() : renderExcelHelperTab()) +
        renderResultSheet() +
      '</div>';

    bindEvents(root);
  }

  function updateFormulaPreviewOnly(root) {
    var meta = getFormulaMeta(state.formulaKey);
    var preview = root.querySelector("#opBuiltFormulaPreview");
    if (preview) preview.textContent = meta.build(state);
  }

  function bindEvents(root) {
    // Live Bangla converter textarea
    var inEl = root.querySelector("#opBanglaInput");
    var outEl = root.querySelector("#opBanglaOutput");
    if (inEl) {
      inEl.addEventListener("input", function () {
        state.inputText = inEl.value;
        runConversion();
        if (outEl) outEl.value = state.outputText;
      });
    }

    var digChk = root.querySelector("#opConvertDigitsChk");
    if (digChk) {
      digChk.addEventListener("change", function () {
        state.convertDigits = Boolean(digChk.checked);
        runConversion();
        saveStorage();
        if (outEl) outEl.value = state.outputText;
      });
    }

    // Excel file picker -> opens directly inside Universal Reader!
    var excelPick = root.querySelector("#opExcelPickInput");
    if (excelPick) {
      excelPick.addEventListener("change", function () {
        var f = excelPick.files && excelPick.files[0];
        if (!f) return;
        haptic(10);
        if (global.OneoraUniversalReader && typeof global.OneoraUniversalReader.openFile === "function") {
          global.OneoraUniversalReader.openFile(f, { openExcelHelper: true });
        } else if (typeof global.openUniversalDocumentFile === "function") {
          f.arrayBuffer().then(function (ab) {
            global.openUniversalDocumentFile(new Uint8Array(ab), f.name || "Sheet.xlsx", f.type || "");
          });
        } else {
          toast("Reader Ready", "Open Document Reader to view spreadsheets.", "info");
        }
        excelPick.value = "";
      });
    }

    // Formula selector & live inputs
    var fmlSel = root.querySelector("#opFormulaSelect");
    if (fmlSel) {
      fmlSel.addEventListener("change", function () {
        state.formulaKey = fmlSel.value;
        render(root);
      });
    }

    var bindInput = function (id, prop) {
      var el = root.querySelector(id);
      if (!el) return;
      el.addEventListener("input", function () {
        state[prop] = el.value;
        updateFormulaPreviewOnly(root);
      });
    };
    bindInput("#opFmlRange", "formulaRange");
    bindInput("#opFmlLookup", "formulaLookup");
    bindInput("#opFmlCriteria", "formulaCriteria");
    bindInput("#opFmlSumRange", "formulaSumRange");
    bindInput("#opFmlTable", "formulaTable");
    bindInput("#opFmlColIdx", "formulaColIdx");
    bindInput("#opFmlTrue", "formulaTrueVal");
    bindInput("#opFmlFalse", "formulaFalseVal");
    bindInput("#opFmlDec", "formulaDecimals");

    var searchEl = root.querySelector("#opFormulaSearch");
    if (searchEl) {
      searchEl.addEventListener("input", function () {
        state.formulaSearch = searchEl.value;
        var pos = searchEl.selectionStart || searchEl.value.length;
        render(root);
        var nextSearch = root.querySelector("#opFormulaSearch");
        if (nextSearch) {
          nextSearch.focus();
          try { nextSearch.setSelectionRange(pos, pos); } catch (e) {}
        }
      });
    }

    // Delegated button clicks
    root.onclick = function (e) {
      var btn = e.target && e.target.closest ? e.target.closest("[data-op-act]") : null;
      if (!btn) return;
      var act = btn.getAttribute("data-op-act");
      haptic(8);

      if (act === "switchTab") {
        state.tab = btn.getAttribute("data-tab") || "bangla_convert";
        render(root);
      } else if (act === "setDir") {
        state.convertDir = btn.getAttribute("data-dir") || "u2b";
        runConversion();
        saveStorage();
        render(root);
      } else if (act === "sampleText") {
        if (state.convertDir === "u2b") {
          state.inputText = "আমার সোনার বাংলা, আমি তোমায় ভালোবাসি।\nঅফিস আবেদনপত্র — তারিখ: ২৭/১১/২০২৬, মোট টাকা: ১২,৫০০/-";
        } else {
          state.inputText = "Avgvi \u2021mvbvi evsjv, Avwg \u2021Zvgvq fv\u2021jvevwm|\nAwdm Av\u2021e`bc\u00CE \u2014 ZvwiL: 27/11/2026";
        }
        runConversion();
        render(root);
      } else if (act === "swapText") {
        var nextIn = state.outputText || state.inputText;
        state.convertDir = state.convertDir === "u2b" ? "b2u" : "u2b";
        state.inputText = nextIn;
        runConversion();
        saveStorage();
        render(root);
      } else if (act === "clearText") {
        state.inputText = "";
        state.outputText = "";
        render(root);
      } else if (act === "pasteInput") {
        if (navigator.clipboard && typeof navigator.clipboard.readText === "function") {
          navigator.clipboard.readText().then(function (txt) {
            state.inputText = txt || "";
            runConversion();
            render(root);
          }).catch(function () {
            toast("Paste Manually", "Long-press the input box to paste text.", "info");
          });
        } else {
          toast("Paste Manually", "Long-press the input box to paste text.", "info");
        }
      } else if (act === "convertNow") {
        runConversion();
        render(root);
        toast("Converted!", state.convertDir === "u2b" ? "Ready in Bijoy SutonnyMJ format." : "Ready in Unicode Bengali.");
      } else if (act === "copyOutput") {
        if (!state.outputText) { toast("Nothing to Copy", "Type or paste Bengali text first.", "info"); return; }
        copyText(state.outputText).then(function () { toast("Copied!", "Converted text copied to clipboard."); });
      } else if (act === "shareOutput") {
        if (!state.outputText) { toast("Nothing to Share", "Convert some text first.", "info"); return; }
        shareText("ONEORA Bangla Conversion", state.outputText);
      } else if (act === "openSheet") {
        if (!state.outputText) { toast("Nothing to Export", "Convert some text first.", "info"); return; }
        state.resultSheet = {
          title: state.convertDir === "u2b" ? "Bijoy ANSI Text Ready" : "Unicode Bengali Text Ready",
          subtitle: state.outputText.length + " characters · 100% offline conversion",
          text: state.outputText,
          filename: (state.convertDir === "u2b" ? "Bijoy_Text_" : "Unicode_Bangla_") + Date.now() + ".txt"
        };
        render(root);
      } else if (act === "saveHistory") {
        if (!state.inputText.trim() || !state.outputText.trim()) {
          toast("Empty Text", "Convert some text before saving.", "info");
          return;
        }
        state.history.unshift({
          id: uid("bn"),
          dir: state.convertDir,
          input: state.inputText.slice(0, 1200),
          output: state.outputText.slice(0, 1200),
          createdAt: Date.now()
        });
        if (state.history.length > 20) state.history = state.history.slice(0, 20);
        saveStorage();
        render(root);
        toast("Saved Offline", "Added to Bangla conversion history.");
      } else if (act === "loadHistory") {
        var hId = btn.getAttribute("data-id");
        for (var i = 0; i < state.history.length; i++) {
          if (state.history[i].id === hId) {
            state.convertDir = state.history[i].dir;
            state.inputText = state.history[i].input;
            state.outputText = state.history[i].output;
            render(root);
            break;
          }
        }
      } else if (act === "delHistory") {
        var delId = btn.getAttribute("data-id");
        state.history = state.history.filter(function (x) { return x.id !== delId; });
        saveStorage();
        render(root);
      } else if (act === "clearHistory") {
        state.history = [];
        saveStorage();
        render(root);
        toast("Cleared", "Conversion history cleared.");
      } else if (act === "newBlankSheet") {
        if (global.OneoraUniversalReader && typeof global.OneoraUniversalReader.createBlankExcel === "function") {
          global.OneoraUniversalReader.createBlankExcel("ONEORA_Sheet_" + new Date().toISOString().slice(0, 10) + ".xlsx");
        } else {
          toast("Spreadsheet Reader", "Universal Reader is loading, try again.", "info");
        }
      } else if (act === "jumpTool") {
        var toolId = btn.getAttribute("data-tool");
        if (toolId && typeof global.openPdfBondhuTool === "function") {
          global.openPdfBondhuTool(toolId, { fromCat: "office" });
        }
      } else if (act === "pickFormula") {
        state.formulaKey = btn.getAttribute("data-key") || "SUM";
        render(root);
      } else if (act === "copyFormula") {
        var fml = getFormulaMeta(state.formulaKey).build(state);
        copyText(fml).then(function () { toast("Formula Copied!", fml); });
      } else if (act === "shareFormula") {
        var fml2 = getFormulaMeta(state.formulaKey).build(state);
        shareText("Excel Formula (" + state.formulaKey + ")", fml2);
      } else if (act === "saveFormula") {
        var metaNow = getFormulaMeta(state.formulaKey);
        var built = metaNow.build(state);
        state.savedFormulas.unshift({
          id: uid("fml"),
          title: metaNow.title,
          formula: built,
          createdAt: Date.now()
        });
        if (state.savedFormulas.length > 25) state.savedFormulas = state.savedFormulas.slice(0, 25);
        saveStorage();
        render(root);
        toast("Formula Saved", "Saved offline for quick reuse.");
      } else if (act === "copySavedFormula") {
        var sfText = btn.getAttribute("data-formula") || "";
        copyText(sfText).then(function () { toast("Copied!", sfText); });
      } else if (act === "delSavedFormula") {
        var sfId = btn.getAttribute("data-id");
        state.savedFormulas = state.savedFormulas.filter(function (x) { return x.id !== sfId; });
        saveStorage();
        render(root);
      } else if (act === "closeSheet") {
        state.resultSheet = null;
        render(root);
      } else if (act === "sheetCopy" && state.resultSheet) {
        copyText(state.resultSheet.text).then(function () { toast("Copied!", "Text copied to clipboard."); });
      } else if (act === "sheetShare" && state.resultSheet) {
        shareText(state.resultSheet.title, state.resultSheet.text);
      } else if (act === "sheetDownload" && state.resultSheet) {
        downloadTextFile(state.resultSheet.text, state.resultSheet.filename || "ONEORA_Bangla.txt");
        toast("Downloaded", state.resultSheet.filename || "Text file saved.");
      }
    };
  }

  function sendToConverter(text, dir) {
    state.tab = "bangla_convert";
    state.convertDir = dir === "b2u" ? "b2u" : "u2b";
    state.inputText = String(text || "");
    runConversion();
    if (typeof global.openPdfBondhuTool === "function") {
      global.openPdfBondhuTool("oneoraOfficeProTool", { sub: "bangla_convert", fromCat: "office" });
    } else {
      render();
    }
  }

  function init() {
    loadStorage();
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  global.OneoraOfficePro = {
    render: render,
    unicodeToBijoy: unicodeToBijoy,
    bijoyToUnicode: bijoyToUnicode,
    sendToConverter: sendToConverter
  };
})(window);
