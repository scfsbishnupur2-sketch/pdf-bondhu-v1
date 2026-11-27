(function(global) {
  "use strict";
  var RECENTS_KEY = "oneora_reader_recents_v1";
  var LAST_PAGE_KEY = "oneora_reader_lastpage_v1";
  var BOOKMARKS_KEY = "oneora_reader_bookmarks_v1";
  var THEME_PREF_KEY = "oneora_reader_theme_v1";
  var IDB_NAME = "OneoraReaderFilesDB_v1";
  var IDB_STORE = "files";
  function lsGet(key, fallback) {
    try {
      var raw = global.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function lsSet(key, val) {
    try {
      global.localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
    }
  }
  function openRecentsIdb() {
    return new Promise(function(resolve) {
      if (!global.indexedDB) {
        resolve(null);
        return;
      }
      try {
        var req = global.indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = function(ev) {
          var db = ev.target.result;
          if (!db.objectStoreNames.contains(IDB_STORE)) {
            db.createObjectStore(IDB_STORE, { keyPath: "id" });
          }
        };
        req.onsuccess = function() {
          resolve(req.result);
        };
        req.onerror = function() {
          resolve(null);
        };
      } catch (e) {
        resolve(null);
      }
    });
  }
  function idbPutBlob(id, bytes) {
    if (!bytes || bytes.byteLength > 18 * 1024 * 1024) return Promise.resolve(false);
    return openRecentsIdb().then(function(db) {
      if (!db) return false;
      return new Promise(function(resolve) {
        try {
          var tx = db.transaction(IDB_STORE, "readwrite");
          tx.objectStore(IDB_STORE).put({ id, bytes: bytes.slice(0), savedAt: Date.now() });
          tx.oncomplete = function() {
            resolve(true);
          };
          tx.onerror = function() {
            resolve(false);
          };
        } catch (e) {
          resolve(false);
        }
      });
    });
  }
  function idbGetBlob(id) {
    return openRecentsIdb().then(function(db) {
      if (!db) return null;
      return new Promise(function(resolve) {
        try {
          var tx = db.transaction(IDB_STORE, "readonly");
          var req = tx.objectStore(IDB_STORE).get(id);
          req.onsuccess = function() {
            resolve(req.result && req.result.bytes ? new Uint8Array(req.result.bytes) : null);
          };
          req.onerror = function() {
            resolve(null);
          };
        } catch (e) {
          resolve(null);
        }
      });
    });
  }
  function idbDeleteBlob(id) {
    return openRecentsIdb().then(function(db) {
      if (!db) return;
      try {
        var tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).delete(id);
      } catch (e) {
      }
    });
  }
  function haptic(ms) {
    if (global.OneoraCapabilities && global.OneoraCapabilities.vibrate) {
      global.OneoraCapabilities.vibrate(ms || 10);
    }
  }
  function showToast(title, msg, type) {
    if (global.utils && typeof global.utils.showToast === "function") {
      global.utils.showToast(title, msg, type || "success");
    }
  }
  function formatBytes(b) {
    if (global.utils && typeof global.utils.formatBytes === "function") {
      return global.utils.formatBytes(b);
    }
    var n = Number(b) || 0;
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
    return (n / (1024 * 1024)).toFixed(2) + " MB";
  }
  function escapeHtml(s) {
    return String(s === null || s === void 0 ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function escapeXml(s) {
    return String(s === null || s === void 0 ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  }
  function docKeyFor(name, byteLen) {
    return String(name || "doc").toLowerCase().slice(0, 80) + "_" + String(byteLen || 0);
  }
  function bytesStartWith(bytes, sig) {
    if (!bytes || bytes.length < sig.length) return false;
    for (var i = 0; i < sig.length; i++) {
      if (bytes[i] !== sig[i]) return false;
    }
    return true;
  }
  function searchUtf16LeAscii(bytes, needle) {
    var maxScan = Math.min(bytes.length, 512 * 1024);
    var nLen = needle.length;
    if (nLen === 0 || maxScan < nLen * 2) return false;
    for (var i = 0; i <= maxScan - nLen * 2; i++) {
      var ok = true;
      for (var j = 0; j < nLen; j++) {
        if (bytes[i + j * 2] !== needle.charCodeAt(j) || bytes[i + j * 2 + 1] !== 0) {
          ok = false;
          break;
        }
      }
      if (ok) return true;
    }
    return false;
  }
  var ALLOWED_TAGS = {
    p: 1,
    div: 1,
    span: 1,
    br: 1,
    hr: 1,
    h1: 1,
    h2: 1,
    h3: 1,
    h4: 1,
    h5: 1,
    h6: 1,
    strong: 1,
    b: 1,
    em: 1,
    i: 1,
    u: 1,
    s: 1,
    del: 1,
    ins: 1,
    sub: 1,
    sup: 1,
    ul: 1,
    ol: 1,
    li: 1,
    blockquote: 1,
    pre: 1,
    code: 1,
    table: 1,
    thead: 1,
    tbody: 1,
    tfoot: 1,
    tr: 1,
    th: 1,
    td: 1,
    img: 1,
    a: 1,
    font: 1
  };
  function sanitizeStyleValue(rawStyle) {
    var safe = [];
    var parts = String(rawStyle || "").split(";");
    for (var i = 0; i < parts.length; i++) {
      var kv = parts[i].split(":");
      if (kv.length !== 2) continue;
      var prop = kv[0].trim().toLowerCase();
      var val = kv[1].trim();
      if (!val || /expression|url\s*\(|javascript:/i.test(val)) continue;
      if (prop === "text-align" && /^(left|right|center|justify)$/i.test(val)) {
        safe.push("text-align:" + val);
      } else if (prop === "color" && /^(#[0-9a-f]{3,6}|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|[a-z]{3,20})$/i.test(val)) {
        safe.push("color:" + val);
      } else if (prop === "background-color" && /^(#[0-9a-f]{3,6}|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|transparent)$/i.test(val)) {
        safe.push("background-color:" + val);
      } else if (prop === "font-size" && /^\d{1,2}(\.\d+)?(px|pt|em|rem|%)$/i.test(val)) {
        safe.push("font-size:" + val);
      } else if (prop === "font-weight" && /^(normal|bold|[1-9]00)$/i.test(val)) {
        safe.push("font-weight:" + val);
      } else if (prop === "font-style" && /^(normal|italic)$/i.test(val)) {
        safe.push("font-style:" + val);
      } else if (prop === "text-decoration" && /^(none|underline|line-through)$/i.test(val)) {
        safe.push("text-decoration:" + val);
      }
    }
    return safe.join(";");
  }
  function sanitizeNode(node, outDoc) {
    if (node.nodeType === 3) {
      return outDoc.createTextNode(node.nodeValue || "");
    }
    if (node.nodeType !== 1) return null;
    var tag = node.tagName.toLowerCase();
    if (tag === "script" || tag === "style" || tag === "iframe" || tag === "object" || tag === "embed" || tag === "svg" || tag === "form" || tag === "meta" || tag === "link") {
      return null;
    }
    if (!ALLOWED_TAGS[tag]) {
      var frag = outDoc.createDocumentFragment();
      for (var c = 0; c < node.childNodes.length; c++) {
        var cc = sanitizeNode(node.childNodes[c], outDoc);
        if (cc) frag.appendChild(cc);
      }
      return frag;
    }
    var el = outDoc.createElement(tag === "font" ? "span" : tag);
    var styleAttr = node.getAttribute("style");
    if (styleAttr) {
      var cleanedStyle = sanitizeStyleValue(styleAttr);
      if (cleanedStyle) el.setAttribute("style", cleanedStyle);
    }
    if (tag === "font") {
      var col = node.getAttribute("color");
      if (col && /^(#[0-9a-f]{3,6}|rgb\([0-9,\s]+\)|[a-z]{3,20})$/i.test(col)) {
        el.style.color = col;
      }
    }
    if (tag === "img") {
      var src = (node.getAttribute("src") || "").trim();
      if (/^data:image\/(png|jpeg|jpg|gif|webp|bmp);base64,[a-z0-9+/=\s]+$/i.test(src)) {
        el.setAttribute("src", src);
      } else {
        return null;
      }
      var alt = node.getAttribute("alt");
      if (alt) el.setAttribute("alt", alt.slice(0, 120));
    } else if (tag === "a") {
      var href = (node.getAttribute("href") || "").trim();
      if (/^(https?:|mailto:)/i.test(href)) {
        el.setAttribute("href", href);
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener noreferrer");
      }
    } else if (tag === "th" || tag === "td") {
      var cs = parseInt(node.getAttribute("colspan") || "", 10);
      var rs = parseInt(node.getAttribute("rowspan") || "", 10);
      if (cs > 1 && cs <= 50) el.setAttribute("colspan", String(cs));
      if (rs > 1 && rs <= 50) el.setAttribute("rowspan", String(rs));
    }
    for (var i = 0; i < node.childNodes.length; i++) {
      var child = sanitizeNode(node.childNodes[i], outDoc);
      if (child) el.appendChild(child);
    }
    return el;
  }
  function renderSanitizedHtml(container, rawHtml) {
    container.textContent = "";
    var parser = new DOMParser();
    var parsed = parser.parseFromString(String(rawHtml || ""), "text/html");
    var frag = document.createDocumentFragment();
    for (var i = 0; i < parsed.body.childNodes.length; i++) {
      var clean = sanitizeNode(parsed.body.childNodes[i], document);
      if (clean) frag.appendChild(clean);
    }
    container.appendChild(frag);
  }
  function extractLegacyBinaryParagraphs(bytes) {
    var results = [];
    var seen = {};
    function pushLine(raw) {
      var clean = raw.replace(/\s+/g, " ").trim();
      if (clean.length < 3) return;
      if (/^(Root Entry|WordDocument|1Table|0Table|SummaryInformation|DocumentSummaryInformation|CompObj|MsoDataStore|PowerPoint Document|Current User|Pictures|Times New Roman|Calibri|Cambria|Arial|Normal|Default Paragraph Font|Heading \d|Microsoft Office|HYPERLINK|EMBED|PAGEREF|TOC \\o)$/i.test(clean)) return;
      if (/^[\d\W_]+$/.test(clean) && clean.length < 6) return;
      if (seen[clean]) return;
      seen[clean] = 1;
      results.push(clean);
    }
    var buf = "";
    for (var i = 0; i + 1 < bytes.length; i += 2) {
      var code = bytes[i] | bytes[i + 1] << 8;
      var isPrintable = code >= 32 && code <= 126 || code >= 2304 && code <= 2559 || code >= 160 && code <= 591 || code === 8211 || code === 8212 || code === 8216 || code === 8217 || code === 8220 || code === 8221 || code === 8226 || code === 8377;
      if (isPrintable) {
        buf += String.fromCharCode(code);
      } else if (code === 13 || code === 10 || code === 9) {
        if (buf.length >= 4) pushLine(buf);
        buf = "";
      } else {
        if (buf.length >= 8) pushLine(buf);
        buf = "";
      }
    }
    if (buf.length >= 4) pushLine(buf);
    if (results.length < 3) {
      var abuf = "";
      for (var j = 0; j < bytes.length; j++) {
        var b = bytes[j];
        if (b >= 32 && b <= 126) {
          abuf += String.fromCharCode(b);
        } else if (b === 13 || b === 10) {
          if (abuf.length >= 8) pushLine(abuf);
          abuf = "";
        } else {
          if (abuf.length >= 12) pushLine(abuf);
          abuf = "";
        }
      }
      if (abuf.length >= 8) pushLine(abuf);
    }
    return results;
  }
  function rtfToParagraphs(rtfText) {
    var clean = String(rtfText || "").replace(/\{\\\*\\[^}]+\}/g, "").replace(/\\par[d]?/g, "\n").replace(/\\line/g, "\n").replace(/\\tab/g, "    ").replace(/\\'([0-9a-fA-F]{2})/g, function(_, hex) {
      return String.fromCharCode(parseInt(hex, 16));
    }).replace(/\\u(-?\d+)\??/g, function(_, dec) {
      var n = parseInt(dec, 10);
      return String.fromCharCode(n < 0 ? n + 65536 : n);
    }).replace(/\\[a-z]+-?\d*\s?/gi, "").replace(/[{}]/g, "");
    return clean.split(/\r?\n/).map(function(l) {
      return l.trim();
    }).filter(Boolean);
  }
  function rgbToHex6(colorStr) {
    if (!colorStr) return "";
    var c = String(colorStr).trim();
    if (/^#[0-9a-f]{6}$/i.test(c)) return c.slice(1).toUpperCase();
    if (/^#[0-9a-f]{3}$/i.test(c)) {
      return (c[1] + c[1] + c[2] + c[2] + c[3] + c[3]).toUpperCase();
    }
    var m = c.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
    if (m) {
      var hex = function(v) {
        var s = Math.max(0, Math.min(255, parseInt(v, 10))).toString(16);
        return s.length === 1 ? "0" + s : s;
      };
      return (hex(m[1]) + hex(m[2]) + hex(m[3])).toUpperCase();
    }
    return "";
  }
  function serializeHtmlToDocxBodyXml(rootEl) {
    var bodyParts = [];
    function collectRuns(node, inherited) {
      var runs = [];
      if (node.nodeType === 3) {
        var txt = node.nodeValue || "";
        if (txt.length > 0) {
          runs.push({ text: txt, fmt: inherited });
        }
        return runs;
      }
      if (node.nodeType !== 1) return runs;
      var tag = node.tagName.toLowerCase();
      if (tag === "br") {
        runs.push({ br: true });
        return runs;
      }
      var nextFmt = {
        bold: inherited.bold || tag === "b" || tag === "strong",
        italic: inherited.italic || tag === "i" || tag === "em",
        underline: inherited.underline || tag === "u",
        color: inherited.color,
        sizeHalfPt: inherited.sizeHalfPt
      };
      if (node.style) {
        if (node.style.fontWeight === "bold" || parseInt(node.style.fontWeight, 10) >= 600) nextFmt.bold = true;
        if (node.style.fontStyle === "italic") nextFmt.italic = true;
        if (node.style.textDecoration && node.style.textDecoration.indexOf("underline") !== -1) nextFmt.underline = true;
        if (node.style.color) {
          var hx = rgbToHex6(node.style.color);
          if (hx) nextFmt.color = hx;
        }
        if (node.style.fontSize) {
          var px = parseFloat(node.style.fontSize);
          if (px > 0) {
            var pt = node.style.fontSize.indexOf("pt") !== -1 ? px : Math.round(px * 0.75);
            nextFmt.sizeHalfPt = Math.max(14, Math.min(96, Math.round(pt * 2)));
          }
        }
      }
      for (var i2 = 0; i2 < node.childNodes.length; i2++) {
        runs = runs.concat(collectRuns(node.childNodes[i2], nextFmt));
      }
      return runs;
    }
    function buildParagraphXml(el, opts) {
      opts = opts || {};
      var pPr = "";
      if (opts.styleId) pPr += '<w:pStyle w:val="' + opts.styleId + '"/>';
      var align = el && el.style ? el.style.textAlign : "";
      if (align === "center" || align === "right" || align === "left" || align === "justify") {
        var jcVal = align === "justify" ? "both" : align;
        pPr += '<w:jc w:val="' + jcVal + '"/>';
      }
      if (opts.listPrefix) {
        pPr += '<w:ind w:left="480" w:hanging="240"/>';
      }
      var runs = collectRuns(el, {
        bold: Boolean(opts.defaultBold),
        italic: false,
        underline: false,
        color: "",
        sizeHalfPt: opts.defaultHalfPt || 0
      });
      var runsXml = "";
      if (opts.listPrefix) {
        runsXml += '<w:r><w:t xml:space="preserve">' + escapeXml(opts.listPrefix) + "</w:t></w:r>";
      }
      for (var i2 = 0; i2 < runs.length; i2++) {
        var r = runs[i2];
        if (r.br) {
          runsXml += "<w:r><w:br/></w:r>";
          continue;
        }
        var rPr = "";
        if (r.fmt.bold) rPr += "<w:b/>";
        if (r.fmt.italic) rPr += "<w:i/>";
        if (r.fmt.underline) rPr += '<w:u w:val="single"/>';
        if (r.fmt.color) rPr += '<w:color w:val="' + r.fmt.color + '"/>';
        if (r.fmt.sizeHalfPt) rPr += '<w:sz w:val="' + r.fmt.sizeHalfPt + '"/><w:szCs w:val="' + r.fmt.sizeHalfPt + '"/>';
        runsXml += "<w:r>" + (rPr ? "<w:rPr>" + rPr + "</w:rPr>" : "") + '<w:t xml:space="preserve">' + escapeXml(r.text) + "</w:t></w:r>";
      }
      return "<w:p>" + (pPr ? "<w:pPr>" + pPr + "</w:pPr>" : "") + runsXml + "</w:p>";
    }
    function walkBlock(node) {
      if (node.nodeType === 3) {
        var t = (node.nodeValue || "").trim();
        if (t) bodyParts.push('<w:p><w:r><w:t xml:space="preserve">' + escapeXml(t) + "</w:t></w:r></w:p>");
        return;
      }
      if (node.nodeType !== 1) return;
      var tag = node.tagName.toLowerCase();
      if (tag === "h1") {
        bodyParts.push(buildParagraphXml(node, { styleId: "Heading1", defaultBold: true, defaultHalfPt: 40 }));
      } else if (tag === "h2") {
        bodyParts.push(buildParagraphXml(node, { styleId: "Heading2", defaultBold: true, defaultHalfPt: 32 }));
      } else if (tag === "h3" || tag === "h4") {
        bodyParts.push(buildParagraphXml(node, { styleId: "Heading3", defaultBold: true, defaultHalfPt: 26 }));
      } else if (tag === "ul" || tag === "ol") {
        var items = node.querySelectorAll(":scope > li");
        for (var liIdx = 0; liIdx < items.length; liIdx++) {
          var prefix = tag === "ol" ? liIdx + 1 + ". " : "• ";
          bodyParts.push(buildParagraphXml(items[liIdx], { listPrefix: prefix }));
        }
      } else if (tag === "table") {
        var trs = node.querySelectorAll("tr");
        var rowsXml = "";
        for (var r = 0; r < trs.length; r++) {
          var cells = trs[r].querySelectorAll("th,td");
          var cellsXml = "";
          for (var c = 0; c < cells.length; c++) {
            var isTh = cells[c].tagName.toLowerCase() === "th";
            cellsXml += '<w:tc><w:tcPr><w:tcW w:w="2400" w:type="dxa"/></w:tcPr>' + buildParagraphXml(cells[c], { defaultBold: isTh }) + "</w:tc>";
          }
          rowsXml += "<w:tr>" + cellsXml + "</w:tr>";
        }
        bodyParts.push('<w:tbl><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:color="CCCCCC"/><w:left w:val="single" w:sz="4" w:color="CCCCCC"/><w:bottom w:val="single" w:sz="4" w:color="CCCCCC"/><w:right w:val="single" w:sz="4" w:color="CCCCCC"/><w:insideH w:val="single" w:sz="4" w:color="E2E2E2"/><w:insideV w:val="single" w:sz="4" w:color="E2E2E2"/></w:tblBorders></w:tblPr>' + rowsXml + "</w:tbl>");
      } else if (tag === "p" || tag === "div" || tag === "blockquote" || tag === "pre") {
        var hasBlockChild = false;
        for (var k = 0; k < node.children.length; k++) {
          var ct = node.children[k].tagName.toLowerCase();
          if (ct === "p" || ct === "div" || ct === "h1" || ct === "h2" || ct === "h3" || ct === "ul" || ct === "ol" || ct === "table") {
            hasBlockChild = true;
            break;
          }
        }
        if (hasBlockChild) {
          for (var m = 0; m < node.childNodes.length; m++) walkBlock(node.childNodes[m]);
        } else {
          bodyParts.push(buildParagraphXml(node, {}));
        }
      } else {
        bodyParts.push(buildParagraphXml(node, {}));
      }
    }
    for (var i = 0; i < rootEl.childNodes.length; i++) {
      walkBlock(rootEl.childNodes[i]);
    }
    if (!bodyParts.length) bodyParts.push("<w:p/>");
    return bodyParts.join("");
  }
  function buildDocxBlobFromEditor(rootEl) {
    return global.OneoraLoader.load("jszip").then(function() {
      var zip = new global.JSZip();
      var bodyXml = serializeHtmlToDocxBodyXml(rootEl);
      zip.file(
        "[Content_Types].xml",
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>'
      );
      zip.folder("_rels").file(
        ".rels",
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
      );
      var wordFolder = zip.folder("word");
      wordFolder.folder("_rels").file(
        "document.xml.rels",
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'
      );
      wordFolder.file(
        "styles.xml",
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:sz w:val="22"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:rPr><w:b/><w:sz w:val="40"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:rPr><w:b/><w:sz w:val="26"/></w:rPr></w:style></w:styles>'
      );
      wordFolder.file(
        "document.xml",
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + bodyXml + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>'
      );
      return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
    });
  }
  function colIndexToLetter(idx) {
    var s = "";
    var n = idx + 1;
    while (n > 0) {
      var rem = (n - 1) % 26;
      s = String.fromCharCode(65 + rem) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  }
  function letterToColIndex(letters) {
    var up = String(letters || "").toUpperCase();
    var idx = 0;
    for (var i = 0; i < up.length; i++) {
      idx = idx * 26 + (up.charCodeAt(i) - 64);
    }
    return idx - 1;
  }
  function parseCellRef(ref) {
    var m = String(ref || "").trim().toUpperCase().match(/^([A-Z]{1,3})(\d{1,5})$/);
    if (!m) return null;
    return { c: letterToColIndex(m[1]), r: parseInt(m[2], 10) - 1 };
  }
  function evaluateFormulaGrid(grid, rIdx, cIdx, visited) {
    visited = visited || {};
    var key = rIdx + ":" + cIdx;
    if (visited[key]) return "#CYCLE!";
    var raw = grid[rIdx] && grid[rIdx][cIdx] !== void 0 && grid[rIdx][cIdx] !== null ? String(grid[rIdx][cIdx]) : "";
    if (!raw || raw.charAt(0) !== "=") return raw;
    var nextVisited = Object.assign({}, visited);
    nextVisited[key] = true;
    var expr = raw.slice(1).trim();
    function getNumericAt(rr, cc) {
      var v = evaluateFormulaGrid(grid, rr, cc, nextVisited);
      var num = parseFloat(String(v).replace(/,/g, ""));
      return isNaN(num) ? null : num;
    }
    function collectRangeNums(argStr) {
      var nums = [];
      var parts = String(argStr || "").split(",");
      for (var p = 0; p < parts.length; p++) {
        var part = parts[p].trim();
        if (!part) continue;
        if (part.indexOf(":") !== -1) {
          var bounds = part.split(":");
          var a = parseCellRef(bounds[0]);
          var b = parseCellRef(bounds[1]);
          if (a && b) {
            var r0 = Math.min(a.r, b.r), r1 = Math.max(a.r, b.r);
            var c0 = Math.min(a.c, b.c), c1 = Math.max(a.c, b.c);
            for (var rr = r0; rr <= r1; rr++) {
              for (var cc = c0; cc <= c1; cc++) {
                var n = getNumericAt(rr, cc);
                if (n !== null) nums.push(n);
              }
            }
          }
        } else {
          var single = parseCellRef(part);
          if (single) {
            var sn = getNumericAt(single.r, single.c);
            if (sn !== null) nums.push(sn);
          } else {
            var lit = parseFloat(part);
            if (!isNaN(lit)) nums.push(lit);
          }
        }
      }
      return nums;
    }
    var fnMatch = expr.match(/^(SUM|AVERAGE|AVG|COUNT|MIN|MAX)\s*\(([^)]*)\)$/i);
    if (fnMatch) {
      var fn = fnMatch[1].toUpperCase();
      var vals = collectRangeNums(fnMatch[2]);
      if (fn === "COUNT") return String(vals.length);
      if (!vals.length) return "0";
      var total = 0;
      var minV = vals[0];
      var maxV = vals[0];
      for (var i = 0; i < vals.length; i++) {
        total += vals[i];
        if (vals[i] < minV) minV = vals[i];
        if (vals[i] > maxV) maxV = vals[i];
      }
      var res = fn === "SUM" ? total : fn === "MIN" ? minV : fn === "MAX" ? maxV : total / vals.length;
      return Number.isInteger(res) ? String(res) : String(Math.round(res * 1e4) / 1e4);
    }
    var replaced = expr.replace(/\b([A-Za-z]{1,3}\d{1,5})\b/g, function(m) {
      var ref = parseCellRef(m);
      if (!ref) return "0";
      var v = getNumericAt(ref.r, ref.c);
      return v === null ? "0" : String(v);
    });
    if (/^[0-9+\-*/().\s]+$/.test(replaced)) {
      try {
        var val = computeSafeArithmetic(replaced);
        if (isFinite(val)) {
          return Number.isInteger(val) ? String(val) : String(Math.round(val * 1e4) / 1e4);
        }
      } catch (e) {
      }
    }
    return "#ERR";
  }
  function computeSafeArithmetic(expr) {
    var tokens = expr.match(/\d+(\.\d+)?|[+\-*/()]/g) || [];
    var pos = 0;
    function peek() {
      return tokens[pos];
    }
    function next() {
      return tokens[pos++];
    }
    function parseExpr() {
      var left = parseTerm();
      while (peek() === "+" || peek() === "-") {
        var op = next();
        var right = parseTerm();
        left = op === "+" ? left + right : left - right;
      }
      return left;
    }
    function parseTerm() {
      var left = parseFactor();
      while (peek() === "*" || peek() === "/") {
        var op = next();
        var right = parseFactor();
        left = op === "*" ? left * right : right === 0 ? NaN : left / right;
      }
      return left;
    }
    function parseFactor() {
      var tk = peek();
      if (tk === "+") {
        next();
        return parseFactor();
      }
      if (tk === "-") {
        next();
        return -parseFactor();
      }
      if (tk === "(") {
        next();
        var v = parseExpr();
        if (peek() === ")") next();
        return v;
      }
      return parseFloat(next());
    }
    return parseExpr();
  }
  function exportLinesToPdfBytes(title, paragraphs) {
    return global.OneoraLoader.load("pdflib").then(function() {
      return global.PDFLib.PDFDocument.create().then(function(doc) {
        return doc.embedFont(global.PDFLib.StandardFonts.Helvetica).then(function(font) {
          return doc.embedFont(global.PDFLib.StandardFonts.HelveticaBold).then(function(boldFont) {
            var pageW = 595.28;
            var pageH = 841.89;
            var margin = 46;
            var maxW = pageW - margin * 2;
            var page = doc.addPage([pageW, pageH]);
            var y = pageH - margin;
            function cleanAscii(str) {
              return String(str || "").replace(/[^\x20-\x7E]/g, " ").replace(/\s+/g, " ").trim();
            }
            var safeTitle = cleanAscii(title || "ONEORA Document");
            page.drawText(safeTitle.slice(0, 80), {
              x: margin,
              y: y - 16,
              size: 16,
              font: boldFont,
              color: global.PDFLib.rgb(0.17, 0.13, 0.21)
            });
            y -= 34;
            for (var p = 0; p < paragraphs.length; p++) {
              var item = paragraphs[p];
              var text = cleanAscii(typeof item === "string" ? item : item.text);
              if (!text) {
                y -= 10;
                continue;
              }
              var isHeading = typeof item === "object" && item.heading;
              var f = isHeading ? boldFont : font;
              var size = isHeading ? 13 : 10.5;
              var lineH = isHeading ? 18 : 15;
              var words = text.split(" ");
              var line = "";
              for (var w = 0; w < words.length; w++) {
                var test = line ? line + " " + words[w] : words[w];
                if (f.widthOfTextAtSize(test, size) > maxW && line) {
                  if (y < margin + 20) {
                    page = doc.addPage([pageW, pageH]);
                    y = pageH - margin;
                  }
                  page.drawText(line, { x: margin, y, size, font: f, color: global.PDFLib.rgb(0.15, 0.14, 0.18) });
                  y -= lineH;
                  line = words[w];
                } else {
                  line = test;
                }
              }
              if (line) {
                if (y < margin + 20) {
                  page = doc.addPage([pageW, pageH]);
                  y = pageH - margin;
                }
                page.drawText(line, { x: margin, y, size, font: f, color: global.PDFLib.rgb(0.15, 0.14, 0.18) });
                y -= lineH + (isHeading ? 6 : 4);
              }
            }
            return doc.save();
          });
        });
      });
    });
  }
  function exportCanvasPagesToPdfBytes(canvases) {
    return global.OneoraLoader.load("pdflib").then(function() {
      return global.PDFLib.PDFDocument.create().then(function(pdfDoc) {
        var chain = Promise.resolve();
        canvases.forEach(function(cv) {
          chain = chain.then(function() {
            var dataUrl = cv.toDataURL("image/jpeg", 0.92);
            return pdfDoc.embedJpg(dataUrl).then(function(img) {
              var page = pdfDoc.addPage([img.width, img.height]);
              page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
            });
          });
        });
        return chain.then(function() {
          return pdfDoc.save();
        });
      });
    });
  }
  function initUniversalReader() {
    var overlay = document.getElementById("pdfReaderFullscreenOverlay");
    if (!overlay || overlay.getAttribute("data-ur-init") === "1") return;
    overlay.setAttribute("data-ur-init", "1");
    var topBar = document.getElementById("pdfReaderTopBar");
    var bottomBar = document.getElementById("pdfReaderBottomBar");
    var floatingPill = document.getElementById("pdfReaderFloatingPagePill");
    var closeBtn = document.getElementById("pdfReaderCloseBtn");
    var fileNameEl = document.getElementById("pdfReaderFileName");
    var fileMetaEl = document.getElementById("pdfReaderFileMeta");
    var typePillEl = document.getElementById("urTypeBadge");
    var backToZipBtn = document.getElementById("urBackToZipBtn");
    var fileInput = document.getElementById("pdfReaderFileInput");
    var pickBtn = document.getElementById("pdfReaderPickBtn");
    var resumeBtn = document.getElementById("pdfReaderResumeBtn");
    var openAnotherBtn = document.getElementById("pdfReaderOpenAnotherBtn");
    var emptyState = document.getElementById("pdfReaderEmptyState");
    var recentsListEl = document.getElementById("urRecentFilesList");
    var recentsSectionEl = document.getElementById("urRecentFilesSection");
    var stage = document.getElementById("pdfReaderStage");
    var pagesContainer = document.getElementById("pdfReaderPagesContainer");
    var wordPane = document.getElementById("urWordPane");
    var wordNotice = document.getElementById("urWordNotice");
    var wordToolbar = document.getElementById("urWordToolbar");
    var wordFindBar = document.getElementById("urWordFindBar");
    var wordPaper = document.getElementById("urWordPaper");
    var excelPane = document.getElementById("urExcelPane");
    var excelFormulaBar = document.getElementById("urExcelFormulaBar");
    var excelCellAddr = document.getElementById("urExcelCellAddr");
    var excelFormulaInput = document.getElementById("urExcelFormulaInput");
    var excelHelperToggleBtn = document.getElementById("urExcelHelperToggleBtn");
    var excelHelperBar = document.getElementById("urExcelHelperBar");
    var excelColStats = document.getElementById("urExcelColStats");
    var excelEditTools = document.getElementById("urExcelEditTools");
    var excelTableWrap = document.getElementById("urExcelTableWrap");
    var excelTable = document.getElementById("urExcelTable");
    var excelLoadMoreBtn = document.getElementById("urExcelLoadMoreBtn");
    var excelSheetTabs = document.getElementById("urExcelSheetTabs");
    var excelHelperOpen = false;
    var pptPane = document.getElementById("urPptPane");
    var pptNotice = document.getElementById("urPptNotice");
    var pptSlideViewport = document.getElementById("urPptSlideViewport");
    var pptNotesBox = document.getElementById("urPptNotesBox");
    var pptThumbStrip = document.getElementById("urPptThumbStrip");
    var imgPane = document.getElementById("urImagePane");
    var imgEl = document.getElementById("urImageEl");
    var zipPane = document.getElementById("urZipPane");
    var zipSummary = document.getElementById("urZipSummary");
    var zipList = document.getElementById("urZipList");
    var errorCard = document.getElementById("urErrorCard");
    var errorTitle = document.getElementById("urErrorTitle");
    var errorMsg = document.getElementById("urErrorMsg");
    var errorConvertBtn = document.getElementById("urErrorConvertBtn");
    var errorCloseBtn = document.getElementById("urErrorCloseBtn");
    var skeletonEl = document.getElementById("urSkeletonLoader");
    var progressWrap = document.getElementById("urProgressWrap");
    var progressBar = document.getElementById("urProgressBar");
    var progressLabel = document.getElementById("urProgressLabel");
    var brightnessScrim = document.getElementById("urBrightnessScrim");
    var passBox = document.getElementById("pdfReaderPasswordBox");
    var passInput = document.getElementById("pdfReaderPasswordInput");
    var passSubmit = document.getElementById("pdfReaderPasswordSubmit");
    var passCancel = document.getElementById("pdfReaderPasswordCancel");
    var passErr = document.getElementById("pdfReaderPasswordErr");
    var editModeBtn = document.getElementById("urEditModeBtn");
    var saveExportBtn = document.getElementById("urSaveExportBtn");
    var bookmarkBtn = document.getElementById("urBookmarkBtn");
    var annotToggleBtn = document.getElementById("urAnnotToggleBtn");
    var searchToggleBtn = document.getElementById("pdfReaderSearchToggleBtn");
    var shareBtn = document.getElementById("pdfReaderShareBtn");
    var moreBtn = document.getElementById("pdfReaderMoreBtn");
    var moreMenu = document.getElementById("pdfReaderMoreMenu");
    var modeToggleBtn = document.getElementById("pdfReaderModeToggle");
    var modeBadge = document.getElementById("pdfReaderModeBadge");
    var tocOpenBtn = document.getElementById("urTocOpenBtn");
    var thumbsOpenBtn = document.getElementById("urThumbsOpenBtn");
    var bookmarksOpenBtn = document.getElementById("urBookmarksOpenBtn");
    var displaySettingsBtn = document.getElementById("urDisplaySettingsBtn");
    var renameDocBtn = document.getElementById("urRenameDocBtn");
    var exportPdfMenuBtn = document.getElementById("urExportPdfBtn");
    var saveVaultBtn = document.getElementById("pdfReaderSaveVaultBtn");
    var copyTextBtn = document.getElementById("pdfReaderCopyTextBtn");
    var printBtn = document.getElementById("pdfReaderPrintBtn");
    var searchBar = document.getElementById("pdfReaderSearchBar");
    var searchInput = document.getElementById("pdfReaderSearchInput");
    var searchBtn = document.getElementById("pdfReaderSearchBtn");
    var searchPrevBtn = document.getElementById("pdfReaderSearchPrevBtn");
    var searchNextBtn = document.getElementById("pdfReaderSearchNextBtn");
    var searchStatus = document.getElementById("pdfReaderSearchStatus");
    var searchCloseBtn = document.getElementById("pdfReaderSearchCloseBtn");
    var pdfBottomControls = document.getElementById("urPdfBottomControls");
    var pageSlider = document.getElementById("urPageSlider");
    var pageSliderBubble = document.getElementById("urPageSliderBubble");
    var prevBtn = document.getElementById("pdfReaderPrevBtn");
    var nextBtn = document.getElementById("pdfReaderNextBtn");
    var pageInput = document.getElementById("pdfReaderPageInput");
    var pageTotalEl = document.getElementById("pdfReaderPageTotal");
    var zoomOutBtn = document.getElementById("pdfReaderZoomOut");
    var zoomInBtn = document.getElementById("pdfReaderZoomIn");
    var zoomLabel = document.getElementById("pdfReaderZoomLabel");
    var fitBtn = document.getElementById("pdfReaderFitBtn");
    var rotateBtn = document.getElementById("pdfReaderRotateBtn");
    var themeCycleBtn = document.getElementById("pdfReaderThemeCycleBtn");
    var pptBottomControls = document.getElementById("urPptBottomControls");
    var pptPrevBtn = document.getElementById("urPptPrevBtn");
    var pptNextBtn = document.getElementById("urPptNextBtn");
    var pptCounter = document.getElementById("urPptCounter");
    var pptNotesToggleBtn = document.getElementById("urPptNotesToggleBtn");
    var pptPresentBtn = document.getElementById("urPptPresentBtn");
    var pptExportPdfBtn = document.getElementById("urPptExportPdfBtn");
    var imgBottomControls = document.getElementById("urImgBottomControls");
    var imgZoomOut = document.getElementById("urImgZoomOut");
    var imgZoomIn = document.getElementById("urImgZoomIn");
    var imgZoomLabel = document.getElementById("urImgZoomLabel");
    var imgRotateBtn = document.getElementById("urImgRotateBtn");
    var imgToPdfBtn = document.getElementById("urImgToPdfBtn");
    var annotBar = document.getElementById("urAnnotBar");
    var sideDrawer = document.getElementById("urSideDrawer");
    var sideDrawerTitle = document.getElementById("urSideDrawerTitle");
    var sideDrawerBody = document.getElementById("urSideDrawerBody");
    var sideDrawerClose = document.getElementById("urSideDrawerClose");
    var displaySheet = document.getElementById("urDisplaySheet");
    var displaySheetClose = document.getElementById("urDisplaySheetClose");
    var brightnessSlider = document.getElementById("urBrightnessSlider");
    var brightnessVal = document.getElementById("urBrightnessVal");
    var orientLockBtn = document.getElementById("urOrientLockBtn");
    var signPadModal = document.getElementById("urSignPadModal");
    var signPadCanvas = document.getElementById("urSignPadCanvas");
    var signPadClear = document.getElementById("urSignPadClear");
    var signPadCancel = document.getElementById("urSignPadCancel");
    var signPadApply = document.getElementById("urSignPadApply");
    var activeKind = null;
    var activeExt = "";
    var activeMime = "application/octet-stream";
    var activeFileName = "Document";
    var activeBytes = null;
    var activeDocKey = "";
    var activePlainText = "";
    var barsHidden = false;
    var readingTheme = lsGet(THEME_PREF_KEY, "paper");
    var brightnessPct = 100;
    var orientLocked = false;
    var tempUrls = [];
    var zipReturnStack = null;
    var pdfDoc = null;
    var currentPage = 1;
    var totalPages = 0;
    var zoomFactor = 1;
    var rotationDeg = 0;
    var viewMode = "scroll";
    var OVERSCAN_PAGES = 2;
    var PAGE_GAP = 12;
    var pageMetrics = [];
    var totalVirtualHeight = 0;
    var activeSlots = /* @__PURE__ */ new Map();
    var currentRenderSig = "";
    var renderToken = 0;
    var activeRenderTask = null;
    var activeRenderPage = 0;
    var renderQueue = [];
    var isProcessingQueue = false;
    var scrollRafId = null;
    var flingTimer = null;
    var lastScrollTs = 0;
    var pdfSearchQuery = "";
    var pdfSearchMatches = [];
    var pdfSearchIdx = -1;
    var annotActiveTool = null;
    var annotColor = "#FACC15";
    var pageAnnotations = {};
    var annotUndoStack = [];
    var pendingSignDataUrl = null;
    var wordEditMode = false;
    var wordUndoStack = [];
    var wordRedoStack = [];
    var excelWorkbook = null;
    var excelSheets = {};
    var excelSheetNames = [];
    var excelActiveSheet = "";
    var excelEditMode = false;
    var excelSelectedCell = { r: 0, c: 0 };
    var excelRenderedRows = 0;
    var EXCEL_CHUNK = 120;
    var excelUndoStack = [];
    var excelRedoStack = [];
    var pptSlides = [];
    var pptCurrent = 0;
    var pptShowNotes = false;
    var pptPresentMode = false;
    var imgZoom = 1;
    var imgRot = 0;
    var currentZipObj = null;
    function revokeTempUrls() {
      for (var i = 0; i < tempUrls.length; i++) {
        try {
          URL.revokeObjectURL(tempUrls[i]);
        } catch (e) {
        }
      }
      tempUrls = [];
    }
    function setProgress(pct, label) {
      if (!progressWrap || !progressBar) return;
      if (pct === null || pct === void 0) {
        progressWrap.classList.add("hidden");
        return;
      }
      progressWrap.classList.remove("hidden");
      progressBar.style.width = Math.max(4, Math.min(100, pct)) + "%";
      if (progressLabel) progressLabel.textContent = label || "Loading document...";
    }
    function setSkeletonVisible(show) {
      if (skeletonEl) skeletonEl.classList.toggle("hidden", !show);
    }
    function hideAllPanes() {
      if (pagesContainer) pagesContainer.classList.add("hidden");
      if (wordPane) wordPane.classList.add("hidden");
      if (excelPane) excelPane.classList.add("hidden");
      if (pptPane) pptPane.classList.add("hidden");
      if (imgPane) imgPane.classList.add("hidden");
      if (zipPane) zipPane.classList.add("hidden");
      if (errorCard) errorCard.classList.add("hidden");
      if (passBox) passBox.classList.add("hidden");
      if (pdfBottomControls) pdfBottomControls.classList.add("hidden");
      if (pptBottomControls) pptBottomControls.classList.add("hidden");
      if (imgBottomControls) imgBottomControls.classList.add("hidden");
      if (annotBar) annotBar.classList.add("hidden");
      if (editModeBtn) editModeBtn.classList.add("hidden");
      if (saveExportBtn) saveExportBtn.classList.add("hidden");
      if (bookmarkBtn) bookmarkBtn.classList.add("hidden");
      if (annotToggleBtn) annotToggleBtn.classList.add("hidden");
      if (floatingPill) floatingPill.classList.add("hidden");
      annotActiveTool = null;
      syncAnnotButtons();
    }
    function openOverlay() {
      overlay.classList.remove("hidden");
      overlay.classList.add("flex");
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      setBarsVisible(true);
      applyReadingTheme(readingTheme);
    }
    function closeOverlay() {
      clearAllPdfSlots();
      overlay.classList.add("hidden");
      overlay.classList.remove("flex");
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      if (moreMenu) moreMenu.classList.add("hidden");
      if (searchBar) searchBar.classList.add("hidden");
      if (sideDrawer) sideDrawer.classList.add("hidden");
      if (displaySheet) displaySheet.classList.add("hidden");
      if (document.fullscreenElement && document.exitFullscreen) {
        try {
          document.exitFullscreen();
        } catch (e) {
        }
      }
      if (resumeBtn && activeBytes && activeKind) {
        var shortN = activeFileName.length > 20 ? activeFileName.slice(0, 20) + "…" : activeFileName;
        resumeBtn.textContent = "Resume: " + shortN;
        resumeBtn.classList.remove("hidden");
      }
      renderRecentFilesList();
    }
    global.closePdfReaderFullscreen = closeOverlay;
    global.closeOfficeDocFullscreen = closeOverlay;
    global.isPdfReaderFullscreenOpen = function() {
      return !overlay.classList.contains("hidden");
    };
    global.isOfficeDocFullscreenOpen = function() {
      return false;
    };
    function setBarsVisible(visible) {
      barsHidden = !visible;
      if (topBar) topBar.style.transform = visible ? "translateY(0)" : "translateY(-118%)";
      if (bottomBar) {
        var showBottom = visible && (activeKind === "pdf" || activeKind === "ppt" || activeKind === "image");
        bottomBar.style.transform = showBottom ? "translateY(0)" : "translateY(118%)";
      }
      if (!visible && moreMenu) moreMenu.classList.add("hidden");
      if (!visible && searchBar) searchBar.classList.add("hidden");
      if (floatingPill && activeKind === "pdf") {
        floatingPill.style.top = visible ? "66px" : "14px";
      }
    }
    var THEME_CONFIG = {
      paper: { label: "Paper", bg: "#FFF7EE", ink: "#2B2236", paperBg: "#FFFDF9", filter: "none" },
      white: { label: "White", bg: "#F4F5F8", ink: "#1E1B26", paperBg: "#FFFFFF", filter: "none" },
      night: { label: "Night", bg: "#17131F", ink: "#F5EEFF", paperBg: "#221C2E", filter: "invert(0.91) hue-rotate(180deg) contrast(1.04)" },
      sepia: { label: "Sepia", bg: "#EFE3C8", ink: "#3B2B1A", paperBg: "#F8EED9", filter: "sepia(0.30) brightness(0.97) contrast(1.02)" }
    };
    function applyReadingTheme(themeName) {
      if (!THEME_CONFIG[themeName]) themeName = "paper";
      readingTheme = themeName;
      lsSet(THEME_PREF_KEY, themeName);
      var cfg = THEME_CONFIG[themeName];
      overlay.setAttribute("data-reader-theme", themeName);
      if (stage) {
        stage.style.backgroundColor = cfg.bg;
        stage.style.color = cfg.ink;
      }
      if (wordPaper) {
        wordPaper.style.backgroundColor = cfg.paperBg;
        wordPaper.style.color = cfg.ink;
      }
      activeSlots.forEach(function(slot) {
        if (slot.canvas) slot.canvas.style.filter = cfg.filter;
      });
      if (themeCycleBtn) themeCycleBtn.textContent = cfg.label;
      var themeBtns = overlay.querySelectorAll("[data-ur-theme]");
      for (var i = 0; i < themeBtns.length; i++) {
        var b = themeBtns[i];
        var isMatch = b.getAttribute("data-ur-theme") === themeName;
        b.setAttribute("data-active", isMatch ? "true" : "false");
      }
    }
    function applyBrightness(pct) {
      brightnessPct = Math.max(35, Math.min(100, parseInt(pct, 10) || 100));
      if (brightnessVal) brightnessVal.textContent = brightnessPct + "%";
      if (brightnessScrim) {
        var alpha = (100 - brightnessPct) / 100 * 0.78;
        brightnessScrim.style.backgroundColor = "rgba(12, 8, 20, " + alpha.toFixed(3) + ")";
      }
    }
    function toggleOrientationLock() {
      haptic(12);
      if (!global.screen || !global.screen.orientation || typeof global.screen.orientation.lock !== "function") {
        showToast("Orientation Lock", "Your browser controls screen rotation from Android Quick Settings.", "info");
        return;
      }
      if (orientLocked) {
        try {
          global.screen.orientation.unlock();
        } catch (e) {
        }
        orientLocked = false;
        if (orientLockBtn) orientLockBtn.textContent = "Lock Current Orientation";
        showToast("Unlocked", "Screen rotation unlocked.", "info");
      } else {
        var curType = global.screen.orientation.type || "portrait-primary";
        global.screen.orientation.lock(curType).then(function() {
          orientLocked = true;
          if (orientLockBtn) orientLockBtn.textContent = "Orientation Locked (Tap to Unlock)";
          showToast("Locked", "Screen orientation locked.", "success");
        }).catch(function() {
          showToast("Orientation Lock", "Lock requires full-screen mode on this device.", "info");
        });
      }
    }
    function generateTextThumbDataUrl(ext, title) {
      try {
        var c = document.createElement("canvas");
        c.width = 120;
        c.height = 156;
        var ctx = c.getContext("2d");
        var palette = {
          pdf: ["#FFD6D6", "#A11F31"],
          docx: ["#D6E8FF", "#1B4E9B"],
          doc: ["#D6E8FF", "#1B4E9B"],
          rtf: ["#D6E8FF", "#1B4E9B"],
          txt: ["#D6E8FF", "#1B4E9B"],
          xlsx: ["#CFF3E2", "#136143"],
          xls: ["#CFF3E2", "#136143"],
          csv: ["#CFF3E2", "#136143"],
          pptx: ["#FFE7C2", "#824709"],
          ppt: ["#FFE7C2", "#824709"],
          zip: ["#E4D9FF", "#4B2FB8"]
        };
        var pair = palette[ext] || ["#E4D9FF", "#5B3FD0"];
        ctx.fillStyle = pair[0];
        ctx.fillRect(0, 0, 120, 156);
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(14, 18, 92, 120);
        ctx.fillStyle = pair[1];
        ctx.fillRect(14, 18, 92, 26);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText(String(ext || "DOC").toUpperCase().slice(0, 5), 22, 36);
        ctx.fillStyle = "#E5DFEE";
        for (var row = 0; row < 5; row++) {
          ctx.fillRect(22, 56 + row * 14, row === 4 ? 46 : 74, 6);
        }
        return c.toDataURL("image/jpeg", 0.72);
      } catch (e) {
        return "";
      }
    }
    function saveToRecents(bytes, name, kind, ext, mime, thumbDataUrl) {
      var id = docKeyFor(name, bytes.byteLength);
      var list = lsGet(RECENTS_KEY, []);
      if (!Array.isArray(list)) list = [];
      var existing = null;
      var filtered = [];
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) {
          existing = list[i];
        } else filtered.push(list[i]);
      }
      var rec = {
        id,
        name,
        kind,
        ext,
        mime,
        size: bytes.byteLength,
        pinned: existing ? Boolean(existing.pinned) : false,
        thumb: thumbDataUrl || existing && existing.thumb || generateTextThumbDataUrl(ext, name),
        openedAt: Date.now()
      };
      filtered.unshift(rec);
      var pinned = filtered.filter(function(x) {
        return x.pinned;
      });
      var unpinned = filtered.filter(function(x) {
        return !x.pinned;
      }).slice(0, 14);
      lsSet(RECENTS_KEY, pinned.concat(unpinned));
      idbPutBlob(id, bytes);
      renderRecentFilesList();
      return id;
    }
    function updateRecentThumb(id, dataUrl) {
      if (!id || !dataUrl) return;
      var list = lsGet(RECENTS_KEY, []);
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) {
          list[i].thumb = dataUrl;
          break;
        }
      }
      lsSet(RECENTS_KEY, list);
      renderRecentFilesList();
    }
    function renderRecentFilesList() {
      if (!recentsListEl || !recentsSectionEl) return;
      var list = lsGet(RECENTS_KEY, []);
      if (!Array.isArray(list) || !list.length) {
        recentsSectionEl.classList.add("hidden");
        return;
      }
      recentsSectionEl.classList.remove("hidden");
      list.sort(function(a, b) {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return (b.openedAt || 0) - (a.openedAt || 0);
      });
      recentsListEl.innerHTML = "";
      list.forEach(function(item) {
        var card = document.createElement("div");
        card.className = "pastel-inset-tile p-3 flex items-center gap-3 text-left transition active:scale-[0.98]";
        var thumbSrc = item.thumb || generateTextThumbDataUrl(item.ext, item.name);
        card.innerHTML = '<button type="button" class="ur-recent-open flex items-center gap-3 flex-1 min-w-0 text-left min-h-[44px]"><img src="' + thumbSrc + '" alt="" class="w-11 h-14 rounded-xl object-cover shrink-0 bg-white shadow-sm border border-black/5" /><div class="min-w-0 flex-1"><div class="text-xs sm:text-sm font-extrabold truncate">' + (item.pinned ? "★ " : "") + escapeHtml(item.name) + '</div><div class="text-[11px] opacity-70 truncate">' + escapeHtml(String(item.ext || item.kind || "").toUpperCase()) + " · " + escapeHtml(formatBytes(item.size)) + '</div></div></button><div class="flex items-center gap-1 shrink-0"><button type="button" class="ur-recent-pin w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold hover:bg-black/5 dark:hover:bg-white/10" title="' + (item.pinned ? "Unpin" : "Pin Favourite") + '">' + (item.pinned ? "★" : "☆") + '</button><button type="button" class="ur-recent-del w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold opacity-65 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10" title="Remove">✕</button></div>';
        card.querySelector(".ur-recent-open").addEventListener("click", function() {
          haptic(10);
          idbGetBlob(item.id).then(function(bytes) {
            if (!bytes) {
              showToast("File Not Cached", "Pick the file again to reopen (files over 18 MB are not cached locally).", "info");
              return;
            }
            openUniversalFile(bytes, item.name, item.mime || "");
          });
        });
        card.querySelector(".ur-recent-pin").addEventListener("click", function() {
          haptic(12);
          var cur = lsGet(RECENTS_KEY, []);
          for (var i = 0; i < cur.length; i++) {
            if (cur[i].id === item.id) cur[i].pinned = !cur[i].pinned;
          }
          lsSet(RECENTS_KEY, cur);
          renderRecentFilesList();
        });
        card.querySelector(".ur-recent-del").addEventListener("click", function() {
          haptic(10);
          var cur = lsGet(RECENTS_KEY, []).filter(function(x) {
            return x.id !== item.id;
          });
          lsSet(RECENTS_KEY, cur);
          idbDeleteBlob(item.id);
          renderRecentFilesList();
        });
        recentsListEl.appendChild(card);
      });
    }
    function detectDocumentType(bytes, fileName, mimeType) {
      var lowerName = String(fileName || "").toLowerCase();
      var extMatch = lowerName.match(/\.([a-z0-9]{1,8})$/);
      var ext = extMatch ? extMatch[1] : "";
      var mime = String(mimeType || "").toLowerCase().split(";")[0].trim();
      if (bytesStartWith(bytes, [37, 80, 68, 70, 45])) {
        return Promise.resolve({ kind: "pdf", ext: "pdf", mime: "application/pdf" });
      }
      if (bytesStartWith(bytes, [123, 92, 114, 116, 102])) {
        return Promise.resolve({ kind: "word", ext: "rtf", mime: "application/rtf" });
      }
      if (bytesStartWith(bytes, [255, 216, 255])) return Promise.resolve({ kind: "image", ext: "jpg", mime: "image/jpeg" });
      if (bytesStartWith(bytes, [137, 80, 78, 71])) return Promise.resolve({ kind: "image", ext: "png", mime: "image/png" });
      if (bytesStartWith(bytes, [71, 73, 70, 56])) return Promise.resolve({ kind: "image", ext: "gif", mime: "image/gif" });
      if (bytesStartWith(bytes, [82, 73, 70, 70]) && bytes.length >= 12 && bytes[8] === 87 && bytes[9] === 69 && bytes[10] === 66 && bytes[11] === 80) {
        return Promise.resolve({ kind: "image", ext: "webp", mime: "image/webp" });
      }
      if (bytesStartWith(bytes, [66, 77]) && (ext === "bmp" || mime === "image/bmp")) {
        return Promise.resolve({ kind: "image", ext: "bmp", mime: "image/bmp" });
      }
      if (bytesStartWith(bytes, [80, 75, 3, 4])) {
        if (ext === "docx" || mime.indexOf("wordprocessingml") !== -1) {
          return Promise.resolve({ kind: "word", ext: "docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
        }
        if (ext === "xlsx" || mime.indexOf("spreadsheetml") !== -1) {
          return Promise.resolve({ kind: "excel", ext: "xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        }
        if (ext === "ods" || mime.indexOf("opendocument.spreadsheet") !== -1) {
          return Promise.resolve({ kind: "excel", ext: "ods", mime: "application/vnd.oasis.opendocument.spreadsheet" });
        }
        if (ext === "pptx" || mime.indexOf("presentationml") !== -1) {
          return Promise.resolve({ kind: "ppt", ext: "pptx", mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
        }
        return global.OneoraLoader.load("jszip").then(function() {
          return global.JSZip.loadAsync(bytes).then(function(zip) {
            if (zip.file("word/document.xml")) return { kind: "word", ext: "docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
            if (zip.file("xl/workbook.xml")) return { kind: "excel", ext: "xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
            if (zip.file("ppt/presentation.xml")) return { kind: "ppt", ext: "pptx", mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation" };
            return { kind: "zip", ext: "zip", mime: "application/zip" };
          });
        }).catch(function() {
          return { kind: "zip", ext: "zip", mime: "application/zip" };
        });
      }
      if (bytesStartWith(bytes, [208, 207, 17, 224, 161, 177, 26, 225])) {
        if (ext === "xls" || mime === "application/vnd.ms-excel" || searchUtf16LeAscii(bytes, "Workbook") || searchUtf16LeAscii(bytes, "Book")) {
          return Promise.resolve({ kind: "excel", ext: "xls", mime: "application/vnd.ms-excel" });
        }
        if (ext === "ppt" || mime === "application/vnd.ms-powerpoint" || searchUtf16LeAscii(bytes, "PowerPoint Document")) {
          return Promise.resolve({ kind: "ppt", ext: "ppt", mime: "application/vnd.ms-powerpoint" });
        }
        return Promise.resolve({ kind: "word", ext: "doc", mime: "application/msword" });
      }
      if (ext === "pdf" || mime === "application/pdf") return Promise.resolve({ kind: "pdf", ext: "pdf", mime: "application/pdf" });
      if (ext === "docx" || mime.indexOf("wordprocessingml") !== -1) return Promise.resolve({ kind: "word", ext: "docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      if (ext === "doc" || mime === "application/msword") return Promise.resolve({ kind: "word", ext: "doc", mime: "application/msword" });
      if (ext === "rtf" || mime.indexOf("rtf") !== -1) return Promise.resolve({ kind: "word", ext: "rtf", mime: "application/rtf" });
      if (ext === "xlsx" || mime.indexOf("spreadsheetml") !== -1) return Promise.resolve({ kind: "excel", ext: "xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      if (ext === "xls" || mime === "application/vnd.ms-excel") return Promise.resolve({ kind: "excel", ext: "xls", mime: "application/vnd.ms-excel" });
      if (ext === "ods") return Promise.resolve({ kind: "excel", ext: "ods", mime: "application/vnd.oasis.opendocument.spreadsheet" });
      if (ext === "csv" || mime === "text/csv") return Promise.resolve({ kind: "excel", ext: "csv", mime: "text/csv" });
      if (ext === "pptx" || mime.indexOf("presentationml") !== -1) return Promise.resolve({ kind: "ppt", ext: "pptx", mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
      if (ext === "ppt" || mime === "application/vnd.ms-powerpoint") return Promise.resolve({ kind: "ppt", ext: "ppt", mime: "application/vnd.ms-powerpoint" });
      if (ext === "txt" || ext === "md" || ext === "log" || ext === "json" || mime === "text/plain") return Promise.resolve({ kind: "word", ext: ext || "txt", mime: "text/plain" });
      if (ext === "zip" || mime.indexOf("zip") !== -1) return Promise.resolve({ kind: "zip", ext: "zip", mime: "application/zip" });
      if (/^(jpg|jpeg|png|webp|gif|bmp)$/.test(ext) || mime.indexOf("image/") === 0) {
        return Promise.resolve({ kind: "image", ext: ext || "jpg", mime: mime.indexOf("image/") === 0 ? mime : "image/jpeg" });
      }
      return Promise.resolve({ kind: "unknown", ext: ext || "bin", mime: mime || "application/octet-stream" });
    }
    function showReaderError(title, message, showConvertBtn, convertCb) {
      hideAllPanes();
      setSkeletonVisible(false);
      setProgress(null);
      if (errorTitle) errorTitle.textContent = title || "Could not open file";
      if (errorMsg) errorMsg.textContent = message || "This file appears to be corrupted or unsupported.";
      if (errorConvertBtn) {
        if (showConvertBtn && typeof convertCb === "function") {
          errorConvertBtn.classList.remove("hidden");
          errorConvertBtn.onclick = convertCb;
        } else {
          errorConvertBtn.classList.add("hidden");
          errorConvertBtn.onclick = null;
        }
      }
      if (errorCard) errorCard.classList.remove("hidden");
    }
    function cancelActivePdfTask() {
      if (activeRenderTask) {
        try {
          activeRenderTask.cancel();
        } catch (e) {
        }
        activeRenderTask = null;
        activeRenderPage = 0;
      }
    }
    function cancelAllPdfRendering() {
      renderToken += 1;
      renderQueue = [];
      cancelActivePdfTask();
      isProcessingQueue = false;
      if (flingTimer) {
        clearTimeout(flingTimer);
        flingTimer = null;
      }
    }
    function evictPdfSlot(pageNum) {
      var slot = activeSlots.get(pageNum);
      if (!slot) return;
      if (activeRenderPage === pageNum) cancelActivePdfTask();
      try {
        slot.canvas.width = 0;
        slot.canvas.height = 0;
        if (slot.annotCanvas) {
          slot.annotCanvas.width = 0;
          slot.annotCanvas.height = 0;
        }
        slot.el.remove();
      } catch (e) {
      }
      activeSlots.delete(pageNum);
      renderQueue = renderQueue.filter(function(p) {
        return p !== pageNum;
      });
    }
    function clearAllPdfSlots() {
      cancelAllPdfRendering();
      Array.from(activeSlots.keys()).forEach(evictPdfSlot);
      if (pagesContainer) pagesContainer.innerHTML = "";
    }
    function getStageWidth() {
      var w = stage && stage.clientWidth || global.innerWidth || 360;
      return Math.max(260, w - (global.innerWidth < 640 ? 12 : 36));
    }
    function computePdfSig() {
      return zoomFactor.toFixed(2) + "_" + rotationDeg + "_" + getStageWidth();
    }
    function getBookmarksMap() {
      return lsGet(BOOKMARKS_KEY, {});
    }
    function isPageBookmarked(pageNum) {
      var map = getBookmarksMap();
      var arr = map[activeDocKey] || [];
      return arr.indexOf(pageNum) !== -1;
    }
    function toggleCurrentBookmark() {
      if (activeKind !== "pdf" || !activeDocKey) return;
      haptic(12);
      var map = getBookmarksMap();
      var arr = Array.isArray(map[activeDocKey]) ? map[activeDocKey].slice() : [];
      var idx = arr.indexOf(currentPage);
      if (idx === -1) {
        arr.push(currentPage);
        arr.sort(function(a, b) {
          return a - b;
        });
        showToast("Bookmarked", "Page " + currentPage + " saved to bookmarks.", "success");
      } else {
        arr.splice(idx, 1);
        showToast("Removed", "Bookmark removed from Page " + currentPage + ".", "info");
      }
      map[activeDocKey] = arr;
      lsSet(BOOKMARKS_KEY, map);
      updatePdfNavUi();
    }
    function saveLastReadPage() {
      if (activeKind !== "pdf" || !activeDocKey || currentPage < 1) return;
      var map = lsGet(LAST_PAGE_KEY, {});
      map[activeDocKey] = currentPage;
      lsSet(LAST_PAGE_KEY, map);
    }
    function updatePdfNavUi() {
      if (pageInput && document.activeElement !== pageInput) pageInput.value = String(currentPage);
      if (pageTotalEl) pageTotalEl.textContent = String(totalPages);
      if (floatingPill) floatingPill.textContent = "Page " + currentPage + " / " + (totalPages || 1);
      if (zoomLabel) zoomLabel.textContent = Math.round(zoomFactor * 100) + "%";
      if (prevBtn) prevBtn.disabled = currentPage <= 1;
      if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
      if (modeBadge) modeBadge.textContent = viewMode === "scroll" ? "Scroll" : "Single";
      if (pageSlider) {
        pageSlider.max = String(Math.max(1, totalPages));
        pageSlider.value = String(currentPage);
      }
      if (bookmarkBtn) {
        var bm = isPageBookmarked(currentPage);
        bookmarkBtn.setAttribute("data-bookmarked", bm ? "true" : "false");
        bookmarkBtn.style.color = bm ? "#5B3FD0" : "";
      }
      saveLastReadPage();
    }
    function recomputeVirtualOffsets(startIdx) {
      startIdx = startIdx || 0;
      var y = startIdx > 0 ? pageMetrics[startIdx - 1].top + pageMetrics[startIdx - 1].height + PAGE_GAP : 0;
      for (var i = startIdx; i < pageMetrics.length; i++) {
        pageMetrics[i].top = y;
        y += pageMetrics[i].height + PAGE_GAP;
      }
      totalVirtualHeight = Math.max(0, y - PAGE_GAP);
      if (viewMode === "scroll") {
        pagesContainer.style.height = totalVirtualHeight + "px";
        activeSlots.forEach(function(slot, pNum) {
          var m = pageMetrics[pNum - 1];
          if (m) {
            slot.el.style.transform = "translate3d(-50%, " + m.top + "px, 0)";
            slot.el.style.width = m.width + "px";
            slot.el.style.height = m.height + "px";
          }
        });
      }
    }
    function initVirtualMetrics() {
      var targetW = Math.floor(getStageWidth() * zoomFactor);
      return pdfDoc.getPage(1).then(function(p1) {
        var effRot = ((p1.rotate || 0) + rotationDeg) % 360;
        var vp1 = p1.getViewport({ scale: 1, rotation: effRot });
        return vp1.width > 0 && vp1.height > 0 ? vp1.height / vp1.width : 1.414;
      }).catch(function() {
        return 1.414;
      }).then(function(firstRatio) {
        var prevMetrics = pageMetrics;
        pageMetrics = new Array(totalPages);
        for (var i = 0; i < totalPages; i++) {
          var prev = prevMetrics[i];
          var ratio = prev && prev.measured && prev.rot === rotationDeg ? prev.aspectRatio : firstRatio;
          pageMetrics[i] = {
            pageNum: i + 1,
            width: targetW,
            height: Math.max(120, Math.round(targetW * ratio)),
            top: 0,
            aspectRatio: ratio,
            rot: rotationDeg,
            measured: Boolean(prev && prev.measured && prev.rot === rotationDeg)
          };
        }
        recomputeVirtualOffsets(0);
      });
    }
    function findFirstVisibleIndex(scrollTop) {
      var lo = 0, hi = pageMetrics.length - 1, ans = 0;
      while (lo <= hi) {
        var mid = lo + hi >> 1;
        var m = pageMetrics[mid];
        if (m.top + m.height >= scrollTop) {
          ans = mid;
          hi = mid - 1;
        } else {
          lo = mid + 1;
        }
      }
      return ans;
    }
    function redrawAnnotationsOnSlot(pageNum) {
      var slot = activeSlots.get(pageNum);
      if (!slot || !slot.annotCanvas) return;
      var ac = slot.annotCanvas;
      var w = ac.width;
      var h = ac.height;
      var ctx = ac.getContext("2d");
      ctx.clearRect(0, 0, w, h);
      if (pdfSearchQuery && pdfSearchMatches.length) {
        for (var m = 0; m < pdfSearchMatches.length; m++) {
          if (pdfSearchMatches[m].pageNum !== pageNum) continue;
          var rects = pdfSearchMatches[m].rects || [];
          ctx.fillStyle = m === pdfSearchIdx ? "rgba(91, 63, 208, 0.34)" : "rgba(250, 204, 21, 0.45)";
          for (var r = 0; r < rects.length; r++) {
            var rc = rects[r];
            ctx.fillRect(rc.x * w, rc.y * h, Math.max(8, rc.w * w), Math.max(8, rc.h * h));
          }
        }
      }
      var items = pageAnnotations[pageNum] || [];
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        ctx.save();
        if (it.type === "highlight" && it.points && it.points.length) {
          ctx.strokeStyle = it.color || "rgba(250, 204, 21, 0.42)";
          ctx.globalAlpha = 0.42;
          ctx.lineWidth = Math.max(12, h * 0.022);
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          ctx.moveTo(it.points[0].x * w, it.points[0].y * h);
          for (var p = 1; p < it.points.length; p++) ctx.lineTo(it.points[p].x * w, it.points[p].y * h);
          ctx.stroke();
        } else if (it.type === "underline" && it.points && it.points.length >= 2) {
          ctx.strokeStyle = it.color || "#5B3FD0";
          ctx.lineWidth = Math.max(2.5, h * 4e-3);
          ctx.lineCap = "round";
          var p0 = it.points[0];
          var pEnd = it.points[it.points.length - 1];
          ctx.beginPath();
          ctx.moveTo(p0.x * w, p0.y * h);
          ctx.lineTo(pEnd.x * w, p0.y * h);
          ctx.stroke();
        } else if (it.type === "draw" && it.points && it.points.length) {
          ctx.strokeStyle = it.color || "#2B2236";
          ctx.lineWidth = Math.max(2.5, h * 45e-4);
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          ctx.moveTo(it.points[0].x * w, it.points[0].y * h);
          for (var d = 1; d < it.points.length; d++) ctx.lineTo(it.points[d].x * w, it.points[d].y * h);
          ctx.stroke();
        } else if (it.type === "note") {
          var nx = it.x * w;
          var ny = it.y * h;
          ctx.fillStyle = "#FFE7C2";
          ctx.strokeStyle = "#824709";
          ctx.lineWidth = 1.5;
          var txt = String(it.text || "Note").slice(0, 60);
          ctx.font = "bold " + Math.max(12, Math.round(w * 0.024)) + "px sans-serif";
          var tw = Math.min(w * 0.55, ctx.measureText(txt).width + 18);
          var th = Math.max(24, Math.round(w * 0.048));
          ctx.fillRect(nx, ny, tw, th);
          ctx.strokeRect(nx, ny, tw, th);
          ctx.fillStyle = "#2B2236";
          ctx.fillText(txt, nx + 8, ny + th * 0.68, tw - 14);
        } else if (it.type === "sign" && it.imgObj) {
          var sw = w * 0.34;
          var sh = sw * (it.imgObj.height / Math.max(1, it.imgObj.width));
          ctx.drawImage(it.imgObj, it.x * w - sw * 0.5, it.y * h - sh * 0.5, sw, sh);
        }
        ctx.restore();
      }
    }
    function wireAnnotationCanvas(annotCanvas, pageNum) {
      var drawing = false;
      var activeStroke = null;
      function normPt(ev) {
        var r = annotCanvas.getBoundingClientRect();
        return {
          x: Math.max(0, Math.min(1, (ev.clientX - r.left) / Math.max(1, r.width))),
          y: Math.max(0, Math.min(1, (ev.clientY - r.top) / Math.max(1, r.height)))
        };
      }
      annotCanvas.addEventListener("pointerdown", function(e) {
        if (!annotActiveTool) return;
        e.stopPropagation();
        var pt = normPt(e);
        if (annotActiveTool === "note") {
          var noteText = global.prompt ? global.prompt("Add a text note:") : "Note";
          if (noteText && noteText.trim()) {
            if (!pageAnnotations[pageNum]) pageAnnotations[pageNum] = [];
            var entry = { type: "note", x: pt.x, y: pt.y, text: noteText.trim(), color: annotColor };
            pageAnnotations[pageNum].push(entry);
            annotUndoStack.push({ pageNum });
            redrawAnnotationsOnSlot(pageNum);
            haptic(12);
          }
          return;
        }
        if (annotActiveTool === "sign") {
          if (!pendingSignDataUrl) {
            openSignPadModal(function(dataUrl) {
              pendingSignDataUrl = dataUrl;
              placeSignOnPage(pageNum, pt.x, pt.y, dataUrl);
            });
          } else {
            placeSignOnPage(pageNum, pt.x, pt.y, pendingSignDataUrl);
          }
          return;
        }
        drawing = true;
        activeStroke = { type: annotActiveTool, color: annotColor, points: [pt] };
        if (!pageAnnotations[pageNum]) pageAnnotations[pageNum] = [];
        pageAnnotations[pageNum].push(activeStroke);
        annotUndoStack.push({ pageNum });
        try {
          annotCanvas.setPointerCapture(e.pointerId);
        } catch (err) {
        }
        redrawAnnotationsOnSlot(pageNum);
      });
      annotCanvas.addEventListener("pointermove", function(e) {
        if (!drawing || !activeStroke) return;
        e.stopPropagation();
        activeStroke.points.push(normPt(e));
        redrawAnnotationsOnSlot(pageNum);
      });
      function stopDraw(e) {
        if (!drawing) return;
        e.stopPropagation();
        drawing = false;
        activeStroke = null;
      }
      annotCanvas.addEventListener("pointerup", stopDraw);
      annotCanvas.addEventListener("pointercancel", stopDraw);
    }
    function placeSignOnPage(pageNum, nx, ny, dataUrl) {
      var img = new Image();
      img.onload = function() {
        if (!pageAnnotations[pageNum]) pageAnnotations[pageNum] = [];
        pageAnnotations[pageNum].push({ type: "sign", x: nx, y: ny, dataUrl, imgObj: img });
        annotUndoStack.push({ pageNum });
        redrawAnnotationsOnSlot(pageNum);
        haptic(14);
        showToast("Signed", "Signature placed on Page " + pageNum + ". Tap Save PDF to embed.", "success");
      };
      img.src = dataUrl;
    }
    function createPdfVirtualSlot(pageNum) {
      var m = pageMetrics[pageNum - 1];
      var wrap = document.createElement("div");
      wrap.className = "pb-reader-page-wrap bg-white rounded-xl shadow-md overflow-hidden flex items-center justify-center";
      wrap.setAttribute("data-page-num", String(pageNum));
      if (viewMode === "scroll" && m) {
        wrap.style.position = "absolute";
        wrap.style.top = "0";
        wrap.style.left = "50%";
        wrap.style.width = m.width + "px";
        wrap.style.height = m.height + "px";
        wrap.style.transform = "translate3d(-50%, " + m.top + "px, 0)";
      } else if (m) {
        wrap.style.position = "relative";
        wrap.style.width = m.width + "px";
        wrap.style.height = m.height + "px";
        wrap.className += " my-auto shadow-xl";
      }
      var placeholder = document.createElement("div");
      placeholder.className = "pointer-events-none absolute top-0 right-0 bottom-0 left-0 flex flex-col items-center justify-center gap-2 text-xs font-bold opacity-55";
      placeholder.innerHTML = '<div class="w-8 h-8 rounded-full border-2 border-current border-t-transparent animate-spin"></div><span>Page ' + pageNum + "</span>";
      var cv = document.createElement("canvas");
      cv.className = "pb-reader-canvas block max-w-none relative z-10";
      cv.style.filter = (THEME_CONFIG[readingTheme] || THEME_CONFIG.paper).filter;
      var annotCv = document.createElement("canvas");
      annotCv.className = "ur-annot-canvas absolute top-0 left-0 z-20";
      annotCv.style.width = "100%";
      annotCv.style.height = "100%";
      annotCv.style.pointerEvents = annotActiveTool ? "auto" : "none";
      annotCv.style.touchAction = annotActiveTool ? "none" : "auto";
      wireAnnotationCanvas(annotCv, pageNum);
      wrap.appendChild(placeholder);
      wrap.appendChild(cv);
      wrap.appendChild(annotCv);
      pagesContainer.appendChild(wrap);
      var slot = { el: wrap, canvas: cv, annotCanvas: annotCv, placeholder, renderedSig: "" };
      activeSlots.set(pageNum, slot);
      return slot;
    }
    function getVisiblePdfWindow() {
      if (!pageMetrics.length || !stage) return { firstVis: 1, lastVis: 1, centerPage: 1 };
      var scrollTop = Math.max(0, stage.scrollTop - 60);
      var viewH = stage.clientHeight || global.innerHeight || 640;
      var scrollBottom = scrollTop + viewH;
      var centerY = scrollTop + viewH * 0.45;
      var startIdx = findFirstVisibleIndex(scrollTop);
      var endIdx = startIdx;
      var centerIdx = startIdx;
      var bestDist = Infinity;
      for (var i = startIdx; i < pageMetrics.length; i++) {
        var m = pageMetrics[i];
        if (m.top > scrollBottom && i > startIdx) break;
        endIdx = i;
        var dist = Math.abs(m.top + m.height * 0.5 - centerY);
        if (dist < bestDist) {
          bestDist = dist;
          centerIdx = i;
        }
      }
      return { firstVis: startIdx + 1, lastVis: endIdx + 1, centerPage: centerIdx + 1 };
    }
    function syncPdfVirtualWindow(immediate) {
      if (activeKind !== "pdf" || !pdfDoc || !pageMetrics.length || overlay.classList.contains("hidden")) return;
      if (viewMode === "single") {
        Array.from(activeSlots.keys()).forEach(function(pNum) {
          if (pNum !== currentPage) evictPdfSlot(pNum);
        });
        var singleSlot = activeSlots.get(currentPage) || createPdfVirtualSlot(currentPage);
        if (singleSlot.renderedSig !== currentRenderSig) {
          renderQueue = [currentPage];
          processPdfRenderQueue();
        }
        updatePdfNavUi();
        return;
      }
      var win = getVisiblePdfWindow();
      if (win.centerPage !== currentPage) {
        currentPage = win.centerPage;
        updatePdfNavUi();
      }
      var winStart = Math.max(1, win.firstVis - OVERSCAN_PAGES);
      var winEnd = Math.min(totalPages, win.lastVis + OVERSCAN_PAGES);
      Array.from(activeSlots.keys()).forEach(function(pNum) {
        if (pNum < winStart || pNum > winEnd) evictPdfSlot(pNum);
      });
      var needed = [];
      for (var p = winStart; p <= winEnd; p++) {
        var slot = activeSlots.get(p) || createPdfVirtualSlot(p);
        if (slot.renderedSig !== currentRenderSig) needed.push(p);
      }
      needed.sort(function(a, b) {
        return Math.abs(a - win.centerPage) - Math.abs(b - win.centerPage);
      });
      renderQueue = needed;
      if (!needed.length) return;
      var isFlinging = !immediate && performance.now() - lastScrollTs < 60;
      if (flingTimer) {
        clearTimeout(flingTimer);
        flingTimer = null;
      }
      if (isFlinging) {
        flingTimer = setTimeout(function() {
          flingTimer = null;
          processPdfRenderQueue();
        }, 65);
      } else {
        processPdfRenderQueue();
      }
    }
    function renderPdfVirtualSlot(pageNum, token, sig) {
      if (!pdfDoc || token !== renderToken) return Promise.resolve();
      var slot = activeSlots.get(pageNum);
      if (!slot || slot.renderedSig === sig) return Promise.resolve();
      return pdfDoc.getPage(pageNum).then(function(page) {
        if (token !== renderToken || !activeSlots.has(pageNum)) return;
        var effectiveRot = ((page.rotate || 0) + rotationDeg) % 360;
        var baseVp = page.getViewport({ scale: 1, rotation: effectiveRot });
        var targetCssW = Math.floor(getStageWidth() * zoomFactor);
        var cssScale = Math.max(0.1, targetCssW / Math.max(1, baseVp.width));
        var viewport = page.getViewport({ scale: cssScale, rotation: effectiveRot });
        var cssW = Math.max(1, Math.floor(viewport.width));
        var cssH = Math.max(1, Math.floor(viewport.height));
        var m = pageMetrics[pageNum - 1];
        if (m && (!m.measured || Math.abs(m.height - cssH) > 2 || Math.abs(m.width - cssW) > 2)) {
          var oldH = m.height;
          var above = stage && viewMode === "scroll" && m.top + oldH < stage.scrollTop;
          m.width = cssW;
          m.height = cssH;
          m.aspectRatio = baseVp.height / Math.max(1, baseVp.width);
          m.rot = rotationDeg;
          m.measured = true;
          recomputeVirtualOffsets(pageNum - 1);
          if (above && stage) stage.scrollTop += cssH - oldH;
        }
        var dpr = Math.min(global.devicePixelRatio || 1, global.OneoraCapabilities && global.OneoraCapabilities.isLowRam ? 1.5 : 2.25);
        var maxPixels = global.OneoraCapabilities && global.OneoraCapabilities.maxSafeCanvasPixels || 45e5;
        var rawPixels = viewport.width * viewport.height * dpr * dpr;
        var ramScale = rawPixels > maxPixels ? Math.sqrt(maxPixels / Math.max(1, viewport.width * viewport.height)) : dpr;
        var outputScale = Math.max(1, Math.min(dpr, ramScale, 2048 / Math.max(1, viewport.width), 2800 / Math.max(1, viewport.height)));
        var pixelW = Math.max(1, Math.floor(viewport.width * outputScale));
        var pixelH = Math.max(1, Math.floor(viewport.height * outputScale));
        var cv = slot.canvas;
        cv.width = pixelW;
        cv.height = pixelH;
        cv.style.width = cssW + "px";
        cv.style.height = cssH + "px";
        cv.style.filter = (THEME_CONFIG[readingTheme] || THEME_CONFIG.paper).filter;
        slot.annotCanvas.width = cssW;
        slot.annotCanvas.height = cssH;
        slot.annotCanvas.style.width = cssW + "px";
        slot.annotCanvas.style.height = cssH + "px";
        var ctx = cv.getContext("2d", { alpha: false });
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, pixelW, pixelH);
        activeRenderPage = pageNum;
        activeRenderTask = page.render({
          canvasContext: ctx,
          viewport,
          transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null
        });
        return activeRenderTask.promise.then(function() {
          activeRenderTask = null;
          activeRenderPage = 0;
          if (token === renderToken && activeSlots.has(pageNum)) {
            slot.renderedSig = sig;
            if (slot.placeholder) slot.placeholder.style.display = "none";
            redrawAnnotationsOnSlot(pageNum);
            if (pageNum === 1 && activeDocKey) {
              try {
                var tc = document.createElement("canvas");
                var sc = Math.min(1, 140 / Math.max(pixelW, pixelH));
                tc.width = Math.max(48, Math.round(pixelW * sc));
                tc.height = Math.max(60, Math.round(pixelH * sc));
                tc.getContext("2d").drawImage(cv, 0, 0, tc.width, tc.height);
                updateRecentThumb(activeDocKey, tc.toDataURL("image/jpeg", 0.72));
              } catch (e) {
              }
            }
          }
        });
      }).catch(function(err) {
        activeRenderTask = null;
        activeRenderPage = 0;
        if (err && err.name !== "RenderingCancelledException") {
          console.error("Reader render error p." + pageNum, err);
        }
      });
    }
    function processPdfRenderQueue() {
      if (isProcessingQueue || !pdfDoc) return;
      isProcessingQueue = true;
      var myToken = renderToken;
      var mySig = currentRenderSig;
      function nextStep() {
        if (renderQueue.length === 0 || myToken !== renderToken) {
          isProcessingQueue = false;
          return;
        }
        var pNum = renderQueue.shift();
        var slot = activeSlots.get(pNum);
        if (!slot || slot.renderedSig === mySig) {
          nextStep();
          return;
        }
        renderPdfVirtualSlot(pNum, myToken, mySig).then(function() {
          requestAnimationFrame(nextStep);
        });
      }
      nextStep();
    }
    function renderPdfLayout(keepRatio) {
      if (!pdfDoc) return Promise.resolve();
      var prevRatio = keepRatio && stage && totalVirtualHeight > 0 ? stage.scrollTop / totalVirtualHeight : 0;
      clearAllPdfSlots();
      currentRenderSig = computePdfSig();
      return initVirtualMetrics().then(function() {
        updatePdfNavUi();
        var targetW = Math.floor(getStageWidth() * zoomFactor);
        pagesContainer.style.position = "relative";
        pagesContainer.style.minWidth = targetW + "px";
        if (viewMode === "single") {
          pagesContainer.style.height = "auto";
          if (stage) stage.scrollTop = 0;
        } else {
          pagesContainer.style.height = totalVirtualHeight + "px";
          if (keepRatio && stage && prevRatio > 0) {
            stage.scrollTop = Math.floor(prevRatio * totalVirtualHeight);
          }
        }
        syncPdfVirtualWindow(true);
      });
    }
    function goToPdfPage(num) {
      if (!pdfDoc) return;
      var clamped = Math.max(1, Math.min(totalPages, parseInt(num, 10) || 1));
      currentPage = clamped;
      updatePdfNavUi();
      if (viewMode === "single") {
        syncPdfVirtualWindow(true);
        if (stage) stage.scrollTop = 0;
      } else {
        var m = pageMetrics[clamped - 1];
        if (m && stage) {
          stage.scrollTo({ top: m.top, behavior: "smooth" });
          syncPdfVirtualWindow(true);
        }
      }
    }
    function openPdfDocument(bytes, name, password) {
      activeKind = "pdf";
      activeExt = "pdf";
      activeMime = "application/pdf";
      activeFileName = name || "Document.pdf";
      activeBytes = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      activeDocKey = docKeyFor(activeFileName, activeBytes.byteLength);
      openOverlay();
      hideAllPanes();
      setSkeletonVisible(true);
      setProgress(18, "Loading PDF engine...");
      if (fileNameEl) fileNameEl.textContent = activeFileName;
      if (typePillEl) {
        typePillEl.textContent = "PDF";
        typePillEl.style.background = "var(--pastel-pdf)";
        typePillEl.style.color = "var(--pastel-pdf-accent)";
      }
      if (passErr) {
        passErr.textContent = "";
        passErr.classList.add("hidden");
      }
      return global.OneoraLoader.load("pdfjs").then(function() {
        setProgress(48, "Opening PDF pages...");
        clearAllPdfSlots();
        pageMetrics = [];
        pageAnnotations = {};
        annotUndoStack = [];
        pdfSearchQuery = "";
        pdfSearchMatches = [];
        pdfSearchIdx = -1;
        var destroyP = pdfDoc ? pdfDoc.destroy().catch(function() {
        }) : Promise.resolve();
        pdfDoc = null;
        return destroyP.then(function() {
          var loadingTask = global.pdfjsLib.getDocument({
            data: activeBytes.slice(),
            password: password || void 0
          });
          loadingTask.onProgress = function(prog) {
            if (prog && prog.total > 0) {
              setProgress(48 + Math.round(prog.loaded / prog.total * 44), "Rendering PDF...");
            }
          };
          return loadingTask.promise;
        });
      }).then(function(doc) {
        pdfDoc = doc;
        totalPages = doc.numPages;
        zoomFactor = 1;
        rotationDeg = 0;
        var savedPages = lsGet(LAST_PAGE_KEY, {});
        var resumed = savedPages[activeDocKey];
        currentPage = resumed && resumed >= 1 && resumed <= totalPages ? resumed : 1;
        setSkeletonVisible(false);
        setProgress(null);
        pagesContainer.classList.remove("hidden");
        if (pdfBottomControls) pdfBottomControls.classList.remove("hidden");
        if (bookmarkBtn) bookmarkBtn.classList.remove("hidden");
        if (annotToggleBtn) annotToggleBtn.classList.remove("hidden");
        if (floatingPill) floatingPill.classList.remove("hidden");
        if (fileMetaEl) fileMetaEl.textContent = totalPages + " page" + (totalPages > 1 ? "s" : "") + " · " + formatBytes(activeBytes.byteLength);
        setBarsVisible(true);
        saveToRecents(activeBytes, activeFileName, "pdf", "pdf", "application/pdf", "");
        return new Promise(function(r) {
          requestAnimationFrame(function() {
            requestAnimationFrame(r);
          });
        }).then(function() {
          return renderPdfLayout(false);
        }).then(function() {
          if (currentPage > 1) {
            goToPdfPage(currentPage);
            showToast("Resumed", "Continued from Page " + currentPage + " of " + totalPages, "info");
          } else if (stage) {
            stage.scrollTop = 0;
          }
        });
      }).catch(function(err) {
        setSkeletonVisible(false);
        setProgress(null);
        var msg = String(err && err.message || err || "");
        if (err && (err.name === "PasswordException" || msg.toLowerCase().indexOf("password") !== -1)) {
          if (passBox) passBox.classList.remove("hidden");
          if (password && passErr) {
            passErr.textContent = "Incorrect password. Please try again.";
            passErr.classList.remove("hidden");
          }
          if (passInput) {
            passInput.value = "";
            setTimeout(function() {
              passInput.focus();
            }, 60);
          }
        } else {
          showReaderError(
            "Could not open PDF",
            "This PDF appears to be corrupted or uses an unsupported encryption format. You can try repairing it with ONEORA PDF Repair.",
            false,
            null
          );
        }
      });
    }
    global._openPdfBytesInReader = openPdfDocument;
    function runPdfTextSearch() {
      if (activeKind !== "pdf" || !pdfDoc || !searchInput) return;
      var q = searchInput.value.trim().toLowerCase();
      pdfSearchQuery = q;
      pdfSearchMatches = [];
      pdfSearchIdx = -1;
      if (!q) {
        if (searchStatus) searchStatus.textContent = "";
        if (searchPrevBtn) searchPrevBtn.classList.add("hidden");
        if (searchNextBtn) searchNextBtn.classList.add("hidden");
        activeSlots.forEach(function(_, pNum) {
          redrawAnnotationsOnSlot(pNum);
        });
        return;
      }
      if (searchStatus) searchStatus.textContent = "Searching...";
      var chain = Promise.resolve();
      var _loop = function(p2) {
        chain = chain.then(function() {
          return pdfDoc.getPage(p2).then(function(page) {
            var effRot = ((page.rotate || 0) + rotationDeg) % 360;
            var vp = page.getViewport({ scale: 1, rotation: effRot });
            return page.getTextContent().then(function(tc) {
              var rects = [];
              for (var i = 0; i < tc.items.length; i++) {
                var item = tc.items[i];
                var str = String(item.str || "");
                if (str.toLowerCase().indexOf(q) !== -1 && item.transform) {
                  var tx = global.pdfjsLib.Util.transform(vp.transform, item.transform);
                  var fontH = Math.hypot(tx[2], tx[3]) || 12;
                  var x = tx[4] / Math.max(1, vp.width);
                  var y = (tx[5] - fontH) / Math.max(1, vp.height);
                  var w = (item.width || str.length * fontH * 0.5) / Math.max(1, vp.width);
                  var h = fontH * 1.25 / Math.max(1, vp.height);
                  rects.push({
                    x: Math.max(0, Math.min(0.98, x)),
                    y: Math.max(0, Math.min(0.98, y)),
                    w: Math.max(0.03, Math.min(1 - x, w)),
                    h: Math.max(0.015, Math.min(0.15, h))
                  });
                }
              }
              if (rects.length) pdfSearchMatches.push({ pageNum: p2, rects });
            });
          }).catch(function() {
          });
        });
      };
      for (var p = 1; p <= totalPages; p++) _loop(p);
      chain.then(function() {
        if (!pdfSearchMatches.length) {
          if (searchStatus) searchStatus.textContent = "0 matches";
          if (searchPrevBtn) searchPrevBtn.classList.add("hidden");
          if (searchNextBtn) searchNextBtn.classList.add("hidden");
          activeSlots.forEach(function(_, pNum) {
            redrawAnnotationsOnSlot(pNum);
          });
          return;
        }
        pdfSearchIdx = 0;
        if (searchPrevBtn) searchPrevBtn.classList.remove("hidden");
        if (searchNextBtn) searchNextBtn.classList.remove("hidden");
        if (searchStatus) searchStatus.textContent = "1/" + pdfSearchMatches.length + " (p." + pdfSearchMatches[0].pageNum + ")";
        goToPdfPage(pdfSearchMatches[0].pageNum);
        setTimeout(function() {
          activeSlots.forEach(function(_, pNum) {
            redrawAnnotationsOnSlot(pNum);
          });
        }, 120);
      });
    }
    function openSideDrawer(title, builderFn) {
      if (!sideDrawer || !sideDrawerBody) return;
      if (moreMenu) moreMenu.classList.add("hidden");
      if (sideDrawerTitle) sideDrawerTitle.textContent = title;
      sideDrawerBody.innerHTML = '<div class="py-6 text-center text-xs font-semibold opacity-65">Loading...</div>';
      sideDrawer.classList.remove("hidden");
      sideDrawer.classList.add("flex");
      builderFn(sideDrawerBody);
    }
    function openThumbnailsDrawer() {
      if (activeKind !== "pdf" || !pdfDoc) return;
      openSideDrawer("Pages (" + totalPages + ")", function(body) {
        body.innerHTML = "";
        var grid = document.createElement("div");
        grid.className = "grid grid-cols-2 gap-3";
        body.appendChild(grid);
        var limit = Math.min(totalPages, 60);
        for (var p = 1; p <= limit; p++) {
          (function(pageNum) {
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "pastel-inset-tile p-2 flex flex-col items-center gap-1.5 text-center transition active:scale-95 " + (pageNum === currentPage ? "ring-2 ring-[#5B3FD0]" : "");
            var cv = document.createElement("canvas");
            cv.className = "w-full rounded-lg bg-white shadow-sm";
            cv.width = 110;
            cv.height = 150;
            var lbl = document.createElement("span");
            lbl.className = "text-[11px] font-extrabold tabular-nums";
            lbl.textContent = "Page " + pageNum + (isPageBookmarked(pageNum) ? " ★" : "");
            btn.appendChild(cv);
            btn.appendChild(lbl);
            btn.addEventListener("click", function() {
              haptic(10);
              sideDrawer.classList.add("hidden");
              sideDrawer.classList.remove("flex");
              goToPdfPage(pageNum);
            });
            grid.appendChild(btn);
            setTimeout(function() {
              if (!pdfDoc || sideDrawer.classList.contains("hidden")) return;
              pdfDoc.getPage(pageNum).then(function(page) {
                var vp = page.getViewport({ scale: 1 });
                var sc = 110 / Math.max(1, vp.width);
                var tvp = page.getViewport({ scale: sc });
                cv.width = Math.max(40, Math.floor(tvp.width));
                cv.height = Math.max(40, Math.floor(tvp.height));
                page.render({ canvasContext: cv.getContext("2d"), viewport: tvp });
              }).catch(function() {
              });
            }, pageNum * 35);
          })(p);
        }
      });
    }
    function openTocDrawer() {
      if (activeKind !== "pdf" || !pdfDoc) return;
      openSideDrawer("Table of Contents", function(body) {
        pdfDoc.getOutline().then(function(outline) {
          body.innerHTML = "";
          if (!outline || !outline.length) {
            body.innerHTML = '<div class="pastel-inset-tile p-4 text-center text-xs font-semibold opacity-75">This PDF does not contain an embedded Table of Contents. Use the Page Thumbnails or Page Slider to navigate.</div>';
            return;
          }
          function renderItems(items, depth) {
            items.forEach(function(item) {
              var row = document.createElement("button");
              row.type = "button";
              row.className = "w-full text-left pastel-inset-tile px-3 py-2.5 mb-2 text-xs font-bold flex items-center justify-between gap-2 min-h-[44px] active:scale-[0.98]";
              row.style.paddingLeft = 12 + Math.min(3, depth) * 14 + "px";
              row.textContent = item.title || "Section";
              row.addEventListener("click", function() {
                haptic(10);
                var dest = item.dest;
                var pDest = typeof dest === "string" ? pdfDoc.getDestination(dest) : Promise.resolve(dest);
                pDest.then(function(resolved) {
                  if (resolved && resolved[0]) {
                    return pdfDoc.getPageIndex(resolved[0]).then(function(idx) {
                      sideDrawer.classList.add("hidden");
                      sideDrawer.classList.remove("flex");
                      goToPdfPage(idx + 1);
                    });
                  }
                }).catch(function() {
                });
              });
              body.appendChild(row);
              if (item.items && item.items.length) renderItems(item.items, depth + 1);
            });
          }
          renderItems(outline, 0);
        }).catch(function() {
          body.innerHTML = '<div class="pastel-inset-tile p-4 text-center text-xs font-semibold opacity-75">No outline available in this document.</div>';
        });
      });
    }
    function openBookmarksDrawer() {
      if (activeKind !== "pdf") return;
      openSideDrawer("Bookmarks", function(body) {
        var arr = getBookmarksMap()[activeDocKey] || [];
        body.innerHTML = "";
        if (!arr.length) {
          body.innerHTML = '<div class="pastel-inset-tile p-4 text-center text-xs font-semibold opacity-75">No bookmarks yet. Tap the bookmark star in the top bar to save any page.</div>';
          return;
        }
        arr.forEach(function(pNum) {
          var row = document.createElement("div");
          row.className = "pastel-inset-tile px-3 py-2 mb-2 flex items-center justify-between gap-2";
          row.innerHTML = '<button type="button" class="ur-bm-go flex-1 text-left text-xs font-extrabold min-h-[44px]">★ Page ' + pNum + '</button><button type="button" class="ur-bm-rm w-10 h-10 rounded-xl text-xs font-bold opacity-65 hover:opacity-100">✕</button>';
          row.querySelector(".ur-bm-go").addEventListener("click", function() {
            sideDrawer.classList.add("hidden");
            sideDrawer.classList.remove("flex");
            goToPdfPage(pNum);
          });
          row.querySelector(".ur-bm-rm").addEventListener("click", function() {
            var map = getBookmarksMap();
            map[activeDocKey] = (map[activeDocKey] || []).filter(function(x) {
              return x !== pNum;
            });
            lsSet(BOOKMARKS_KEY, map);
            updatePdfNavUi();
            openBookmarksDrawer();
          });
          body.appendChild(row);
        });
      });
    }
    function saveAnnotatedPdf() {
      if (activeKind !== "pdf" || !activeBytes) return;
      var annotatedPages = Object.keys(pageAnnotations).filter(function(k) {
        return pageAnnotations[k] && pageAnnotations[k].length > 0;
      });
      if (!annotatedPages.length) {
        showToast("No Annotations", "Highlight, draw, note, or sign on a page first.", "info");
        return;
      }
      setProgress(25, "Embedding annotations into PDF...");
      global.OneoraLoader.load("pdflib").then(function() {
        return global.PDFLib.PDFDocument.load(activeBytes, { ignoreEncryption: true });
      }).then(function(doc) {
        var pages = doc.getPages();
        var chain = Promise.resolve();
        annotatedPages.forEach(function(pStr) {
          var pNum = parseInt(pStr, 10);
          var page = pages[pNum - 1];
          if (!page) return;
          chain = chain.then(function() {
            var sz = page.getSize();
            var off = document.createElement("canvas");
            off.width = Math.min(1800, Math.round(sz.width * 2));
            off.height = Math.min(2400, Math.round(sz.height * 2));
            var fakeSlot = { annotCanvas: off };
            var origSlot = activeSlots.get(pNum);
            activeSlots.set(pNum, fakeSlot);
            var prevQuery = pdfSearchQuery;
            pdfSearchQuery = "";
            redrawAnnotationsOnSlot(pNum);
            pdfSearchQuery = prevQuery;
            if (origSlot) activeSlots.set(pNum, origSlot);
            else activeSlots.delete(pNum);
            var pngUrl = off.toDataURL("image/png");
            return doc.embedPng(pngUrl).then(function(pngImg) {
              page.drawImage(pngImg, { x: 0, y: 0, width: sz.width, height: sz.height });
            });
          });
        });
        return chain.then(function() {
          return doc.save();
        });
      }).then(function(outBytes) {
        setProgress(null);
        activeBytes = new Uint8Array(outBytes);
        var outName = activeFileName.replace(/\.pdf$/i, "") + "_annotated.pdf";
        if (global.utils && global.utils.downloadBlob) {
          global.utils.downloadBlob(new Blob([activeBytes], { type: "application/pdf" }), outName);
        }
        showToast("Saved Annotated PDF", outName + " downloaded with your annotations!", "success");
      }).catch(function(err) {
        setProgress(null);
        showToast("Save Failed", "Could not embed annotations: " + (err && err.message ? err.message : "error"), "error");
      });
    }
    function syncAnnotButtons() {
      if (!annotBar) return;
      var btns = annotBar.querySelectorAll("[data-annot-tool]");
      for (var i = 0; i < btns.length; i++) {
        var match = btns[i].getAttribute("data-annot-tool") === annotActiveTool;
        btns[i].setAttribute("data-active", match ? "true" : "false");
      }
      activeSlots.forEach(function(slot) {
        if (slot.annotCanvas) {
          slot.annotCanvas.style.pointerEvents = annotActiveTool ? "auto" : "none";
          slot.annotCanvas.style.touchAction = annotActiveTool ? "none" : "auto";
        }
      });
    }
    var signPadCallback = null;
    function openSignPadModal(cb) {
      if (!signPadModal || !signPadCanvas) return;
      signPadCallback = cb;
      var ctx = signPadCanvas.getContext("2d");
      ctx.clearRect(0, 0, signPadCanvas.width, signPadCanvas.height);
      signPadModal.classList.remove("hidden");
      signPadModal.classList.add("flex");
    }
    if (signPadCanvas) {
      var spDrawing = false;
      var spCtx = signPadCanvas.getContext("2d");
      signPadCanvas.addEventListener("pointerdown", function(e) {
        spDrawing = true;
        var r = signPadCanvas.getBoundingClientRect();
        var x = (e.clientX - r.left) * (signPadCanvas.width / Math.max(1, r.width));
        var y = (e.clientY - r.top) * (signPadCanvas.height / Math.max(1, r.height));
        spCtx.strokeStyle = "#1B2A6B";
        spCtx.lineWidth = 3.5;
        spCtx.lineCap = "round";
        spCtx.lineJoin = "round";
        spCtx.beginPath();
        spCtx.moveTo(x, y);
        try {
          signPadCanvas.setPointerCapture(e.pointerId);
        } catch (err) {
        }
      });
      signPadCanvas.addEventListener("pointermove", function(e) {
        if (!spDrawing) return;
        var r = signPadCanvas.getBoundingClientRect();
        var x = (e.clientX - r.left) * (signPadCanvas.width / Math.max(1, r.width));
        var y = (e.clientY - r.top) * (signPadCanvas.height / Math.max(1, r.height));
        spCtx.lineTo(x, y);
        spCtx.stroke();
      });
      signPadCanvas.addEventListener("pointerup", function() {
        spDrawing = false;
      });
      signPadCanvas.addEventListener("pointercancel", function() {
        spDrawing = false;
      });
    }
    if (signPadClear && signPadCanvas) {
      signPadClear.addEventListener("click", function() {
        signPadCanvas.getContext("2d").clearRect(0, 0, signPadCanvas.width, signPadCanvas.height);
      });
    }
    if (signPadCancel && signPadModal) {
      signPadCancel.addEventListener("click", function() {
        signPadModal.classList.add("hidden");
        signPadModal.classList.remove("flex");
      });
    }
    if (signPadApply && signPadModal && signPadCanvas) {
      signPadApply.addEventListener("click", function() {
        var url = signPadCanvas.toDataURL("image/png");
        signPadModal.classList.add("hidden");
        signPadModal.classList.remove("flex");
        if (typeof signPadCallback === "function") signPadCallback(url);
      });
    }
    function pushWordUndoSnapshot() {
      if (!wordPaper) return;
      var html = wordPaper.innerHTML;
      if (wordUndoStack.length && wordUndoStack[wordUndoStack.length - 1] === html) return;
      wordUndoStack.push(html);
      if (wordUndoStack.length > 40) wordUndoStack.shift();
      wordRedoStack = [];
    }
    function setWordEditMode(enabled) {
      wordEditMode = Boolean(enabled);
      if (wordPaper) {
        wordPaper.contentEditable = wordEditMode ? "true" : "false";
        wordPaper.classList.toggle("ring-2", wordEditMode);
        wordPaper.classList.toggle("ring-[#5B3FD0]", wordEditMode);
      }
      if (wordToolbar) wordToolbar.classList.toggle("hidden", !wordEditMode);
      if (!wordEditMode && wordFindBar) wordFindBar.classList.add("hidden");
      if (editModeBtn) {
        editModeBtn.textContent = wordEditMode ? "Done Editing" : "Edit";
        editModeBtn.setAttribute("data-active", wordEditMode ? "true" : "false");
      }
      if (saveExportBtn && activeKind === "word") {
        saveExportBtn.classList.remove("hidden");
        saveExportBtn.textContent = "Save .docx";
      }
      if (wordEditMode) {
        pushWordUndoSnapshot();
        if (wordPaper) wordPaper.focus();
      }
    }
    function openWordDocument(bytes, name, ext, mime) {
      activeKind = "word";
      activeExt = ext;
      activeMime = mime;
      activeFileName = name || "Document.docx";
      activeBytes = bytes;
      activeDocKey = docKeyFor(activeFileName, bytes.byteLength);
      wordEditMode = false;
      wordUndoStack = [];
      wordRedoStack = [];
      openOverlay();
      hideAllPanes();
      setSkeletonVisible(true);
      setProgress(25, "Loading Word engine...");
      if (fileNameEl) fileNameEl.textContent = activeFileName;
      if (typePillEl) {
        typePillEl.textContent = ext.toUpperCase();
        typePillEl.style.background = "var(--pastel-image)";
        typePillEl.style.color = "var(--pastel-image-accent)";
      }
      if (wordNotice) {
        wordNotice.classList.add("hidden");
        wordNotice.innerHTML = "";
      }
      var loadPromise;
      if (ext === "docx") {
        loadPromise = global.OneoraLoader.loadMany(["mammoth", "jszip"]).then(function() {
          setProgress(65, "Rendering Word document...");
          var ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
          return global.mammoth.convertToHtml({ arrayBuffer: ab }).then(function(res) {
            renderSanitizedHtml(wordPaper, res.value || "<p>(Empty Word document)</p>");
            return { legacy: false };
          });
        });
      } else if (ext === "rtf") {
        loadPromise = Promise.resolve().then(function() {
          var txt = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
          var paras = rtfToParagraphs(txt);
          wordPaper.innerHTML = "";
          if (!paras.length) {
            wordPaper.innerHTML = "<p>(Empty RTF document)</p>";
          } else {
            paras.forEach(function(line) {
              var p = document.createElement("p");
              p.textContent = line;
              wordPaper.appendChild(p);
            });
          }
          return { legacy: false };
        });
      } else if (ext === "doc") {
        loadPromise = Promise.resolve().then(function() {
          var recovered = extractLegacyBinaryParagraphs(bytes);
          if (!recovered.length) {
            return { legacyEmpty: true };
          }
          wordPaper.innerHTML = "";
          recovered.forEach(function(line) {
            var p = document.createElement("p");
            p.textContent = line;
            wordPaper.appendChild(p);
          });
          if (wordNotice) {
            wordNotice.classList.remove("hidden");
            wordNotice.innerHTML = '<div class="flex flex-wrap items-center justify-between gap-2"><span>Legacy <strong>.doc</strong> opened in compatibility recovery mode. Convert to PDF or Save as .docx for full formatting.</span><button type="button" id="urLegacyDocToPdfBtn" class="px-3 py-1.5 rounded-xl bg-[#5B3FD0] text-white text-xs font-extrabold min-h-[36px]">Convert to PDF</button></div>';
            var btn = document.getElementById("urLegacyDocToPdfBtn");
            if (btn) btn.addEventListener("click", exportCurrentDocToPdf);
          }
          return { legacy: true };
        });
      } else {
        loadPromise = Promise.resolve().then(function() {
          var txt = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
          wordPaper.innerHTML = "";
          txt.split(/\r?\n/).forEach(function(line) {
            var p = document.createElement("p");
            p.textContent = line || " ";
            wordPaper.appendChild(p);
          });
          return { legacy: false };
        });
      }
      return loadPromise.then(function(info) {
        if (info && info.legacyEmpty) {
          showReaderError(
            "Legacy .doc format cannot be displayed directly",
            "This older binary Word (.doc) file contains complex binary formatting that cannot be rendered faithfully offline. You can convert or save a clean PDF copy instead.",
            true,
            function() {
              exportLinesToPdfBytes(activeFileName, ["Legacy binary .doc file: " + activeFileName, "Re-save as .docx in Word or use ONEORA Word Editor to edit and export."]).then(function(pdfBytes) {
                openPdfDocument(new Uint8Array(pdfBytes), activeFileName.replace(/\.doc$/i, ".pdf"));
              });
            }
          );
          return;
        }
        setSkeletonVisible(false);
        setProgress(null);
        wordPane.classList.remove("hidden");
        if (editModeBtn) {
          editModeBtn.classList.remove("hidden");
          editModeBtn.textContent = "Edit";
        }
        if (saveExportBtn) {
          saveExportBtn.classList.remove("hidden");
          saveExportBtn.textContent = "Save .docx";
        }
        setWordEditMode(false);
        activePlainText = (wordPaper.innerText || "").trim();
        var wc = activePlainText ? activePlainText.split(/\s+/).length : 0;
        if (fileMetaEl) fileMetaEl.textContent = wc + " words · " + formatBytes(bytes.byteLength);
        setBarsVisible(true);
        saveToRecents(bytes, activeFileName, "word", ext, mime, "");
      }).catch(function(err) {
        showReaderError("Could not open Word document", "This file may be password-protected or corrupted (" + (err && err.message ? err.message : "parse error") + ").", false, null);
      });
    }
    function saveWordAsDocx() {
      if (!wordPaper) return;
      setProgress(40, "Building .docx file...");
      buildDocxBlobFromEditor(wordPaper).then(function(outBytes) {
        setProgress(null);
        activeBytes = outBytes;
        var outName = activeFileName.replace(/\.(docx|doc|rtf|txt)$/i, "") + ".docx";
        activeFileName = outName;
        if (fileNameEl) fileNameEl.textContent = outName;
        if (global.utils && global.utils.downloadBlob) {
          global.utils.downloadBlob(new Blob([outBytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), outName);
        }
        showToast("Saved Word File", outName + " saved offline!", "success");
      }).catch(function(err) {
        setProgress(null);
        showToast("Save Failed", "Could not generate .docx: " + (err && err.message ? err.message : "error"), "error");
      });
    }
    function cloneExcelState() {
      return {
        sheets: global.structuredClone(excelSheets),
        names: excelSheetNames.slice(),
        active: excelActiveSheet
      };
    }
    function pushExcelUndo() {
      excelUndoStack.push(cloneExcelState());
      if (excelUndoStack.length > 35) excelUndoStack.shift();
      excelRedoStack = [];
    }
    function getActiveGrid() {
      if (!excelSheets[excelActiveSheet]) excelSheets[excelActiveSheet] = [[""]];
      return excelSheets[excelActiveSheet];
    }
    function renderExcelSheetTabsUi() {
      if (!excelSheetTabs) return;
      excelSheetTabs.innerHTML = "";
      excelSheetNames.forEach(function(sName) {
        var btn = document.createElement("button");
        btn.type = "button";
        var active = sName === excelActiveSheet;
        btn.className = "px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap min-h-[40px] transition " + (active ? "bg-[#5B3FD0] text-white shadow-sm" : "bg-white/80 dark:bg-[#2B243A] text-[#2B2236] dark:text-[#F5EEFF]");
        btn.textContent = sName;
        btn.addEventListener("click", function() {
          haptic(8);
          excelActiveSheet = sName;
          excelSelectedCell = { r: 0, c: 0 };
          renderExcelSheetTabsUi();
          renderExcelGrid(true);
        });
        excelSheetTabs.appendChild(btn);
      });
      if (excelEditMode) {
        var addBtn = document.createElement("button");
        addBtn.type = "button";
        addBtn.className = "px-3 py-2 rounded-xl text-xs font-extrabold bg-[#CFF3E2] text-[#136143] min-h-[40px] shrink-0";
        addBtn.textContent = "+ Sheet";
        addBtn.addEventListener("click", function() {
          pushExcelUndo();
          var newName = "Sheet" + (excelSheetNames.length + 1);
          excelSheetNames.push(newName);
          excelSheets[newName] = [["", "", "", ""], ["", "", "", ""], ["", "", "", ""]];
          excelActiveSheet = newName;
          renderExcelSheetTabsUi();
          renderExcelGrid(true);
        });
        excelSheetTabs.appendChild(addBtn);
      }
    }
    function formatHelperNum(n) {
      if (!isFinite(n)) return "0";
      var rounded = Math.round(n * 100) / 100;
      try {
        return rounded.toLocaleString("en-IN", { maximumFractionDigits: 2 });
      } catch (e) {
        return String(rounded);
      }
    }
    function updateExcelColStats() {
      if (!excelColStats) return;
      var grid = getActiveGrid();
      var colIdx = excelSelectedCell.c || 0;
      var colLetter = colIndexToLetter(colIdx);
      var nonEmpty = 0;
      var nums = [];
      var uniqueMap = {};
      var uniqueCount = 0;
      for (var r = 0; r < grid.length; r++) {
        var val = evaluateFormulaGrid(grid, r, colIdx);
        var trimmed = String(val == null ? "" : val).trim();
        if (trimmed !== "") {
          nonEmpty++;
          if (!uniqueMap[trimmed]) {
            uniqueMap[trimmed] = true;
            uniqueCount++;
          }
          var cleaned = trimmed.replace(/[₹$,%\s,]/g, "");
          if (cleaned !== "" && !isNaN(Number(cleaned))) {
            nums.push(Number(cleaned));
          }
        }
      }
      if (nums.length > 0) {
        var sum = 0;
        var minV = nums[0];
        var maxV = nums[0];
        for (var i = 0; i < nums.length; i++) {
          sum += nums[i];
          if (nums[i] < minV) minV = nums[i];
          if (nums[i] > maxV) maxV = nums[i];
        }
        var avg = sum / nums.length;
        excelColStats.innerHTML =
          '<span>Col ' + colLetter + '</span>' +
          '<span>Count: ' + nonEmpty + ' (' + nums.length + ' nums)</span>' +
          '<span>Sum: ' + formatHelperNum(sum) + '</span>' +
          '<span>Avg: ' + formatHelperNum(avg) + '</span>' +
          '<span>Min: ' + formatHelperNum(minV) + '</span>' +
          '<span>Max: ' + formatHelperNum(maxV) + '</span>' +
          '<span>Unique: ' + uniqueCount + '</span>';
      } else {
        excelColStats.innerHTML =
          '<span>Col ' + colLetter + '</span>' +
          '<span>Filled: ' + nonEmpty + '</span>' +
          '<span>Unique: ' + uniqueCount + '</span>' +
          '<span>Rows: ' + grid.length + '</span>';
      }
    }
    function setExcelHelperOpen(open) {
      excelHelperOpen = Boolean(open);
      if (excelHelperBar) excelHelperBar.classList.toggle("hidden", !excelHelperOpen);
      if (excelHelperToggleBtn) {
        excelHelperToggleBtn.textContent = excelHelperOpen ? "Hide Helper" : "fx Helper";
      }
      if (excelHelperOpen) updateExcelColStats();
    }
    function insertExcelAutoFormula(fnName) {
      if (!excelEditMode) setExcelEditMode(true);
      var grid = getActiveGrid();
      var r = excelSelectedCell.r;
      var c = excelSelectedCell.c;
      var colLetter = colIndexToLetter(c);
      var startRow = 0;
      var endRow = r - 1;
      if (endRow < 0) {
        // Selected row 1: append summary formula in first empty row at bottom
        startRow = grid.length > 1 && isNaN(Number(String(grid[0][c] || "").replace(/[₹$,%\s,]/g, ""))) ? 1 : 0;
        endRow = Math.max(startRow, grid.length - 1);
        r = grid.length;
        excelSelectedCell.r = r;
      } else {
        // Skip header row if row 0 is text and row 1 is numeric
        var r0Val = String(grid[0] && grid[0][c] != null ? grid[0][c] : "").replace(/[₹$,%\s,]/g, "");
        if (endRow >= 1 && r0Val !== "" && isNaN(Number(r0Val))) {
          startRow = 1;
        }
      }
      var formula = "=" + fnName + "(" + colLetter + (startRow + 1) + ":" + colLetter + (endRow + 1) + ")";
      pushExcelUndo();
      while (grid.length <= r) {
        var colsLen = grid[0] && grid[0].length || Math.max(4, c + 1);
        grid.push(new Array(colsLen).fill(""));
      }
      grid[r][c] = formula;
      renderExcelGrid(true);
      showToast("Formula Inserted", formula + " placed in " + colLetter + (r + 1));
    }
    function runExcelHelperAction(act) {
      if (act === "fmlSum") return insertExcelAutoFormula("SUM");
      if (act === "fmlAvg") return insertExcelAutoFormula("AVERAGE");
      if (act === "fmlCount") return insertExcelAutoFormula("COUNT");
      if (act === "fmlMin") return insertExcelAutoFormula("MIN");
      if (act === "fmlMax") return insertExcelAutoFormula("MAX");
      if (!excelEditMode) setExcelEditMode(true);
      var grid = getActiveGrid();
      if (!grid || !grid.length) return;
      var c = excelSelectedCell.c || 0;
      if (act === "sortAsc" || act === "sortDesc") {
        if (grid.length < 2) return;
        pushExcelUndo();
        var header = grid[0];
        var body = grid.slice(1);
        var dir = act === "sortAsc" ? 1 : -1;
        body.sort(function(rowA, rowB) {
          var aRaw = String(rowA && rowA[c] != null ? rowA[c] : "").trim();
          var bRaw = String(rowB && rowB[c] != null ? rowB[c] : "").trim();
          var aNum = Number(aRaw.replace(/[₹$,%\s,]/g, ""));
          var bNum = Number(bRaw.replace(/[₹$,%\s,]/g, ""));
          if (aRaw !== "" && bRaw !== "" && !isNaN(aNum) && !isNaN(bNum)) {
            return (aNum - bNum) * dir;
          }
          return aRaw.localeCompare(bRaw, undefined, { numeric: true, sensitivity: "base" }) * dir;
        });
        excelSheets[excelActiveSheet] = [header].concat(body);
        renderExcelGrid(true);
        showToast("Sorted Column " + colIndexToLetter(c), act === "sortAsc" ? "Ascending (A → Z)" : "Descending (Z → A)");
      } else if (act === "trimSpaces") {
        pushExcelUndo();
        var changed = 0;
        for (var r = 0; r < grid.length; r++) {
          var row = grid[r] || [];
          for (var col = 0; col < row.length; col++) {
            if (typeof row[col] === "string") {
              var cleaned = row[col].replace(/\s+/g, " ").trim();
              if (cleaned !== row[col]) {
                row[col] = cleaned;
                changed++;
              }
            }
          }
        }
        renderExcelGrid(true);
        showToast("Trimmed Spaces", changed + " cell(s) cleaned.");
      } else if (act === "removeBlanks") {
        pushExcelUndo();
        var beforeLen = grid.length;
        var filtered = grid.filter(function(row) {
          if (!Array.isArray(row)) return false;
          for (var k = 0; k < row.length; k++) {
            if (String(row[k] == null ? "" : row[k]).trim() !== "") return true;
          }
          return false;
        });
        excelSheets[excelActiveSheet] = filtered.length ? filtered : [[""]];
        excelSelectedCell.r = Math.max(0, Math.min(excelSheets[excelActiveSheet].length - 1, excelSelectedCell.r));
        renderExcelGrid(true);
        showToast("Blank Rows Removed", Math.max(0, beforeLen - excelSheets[excelActiveSheet].length) + " empty row(s) removed.");
      } else if (act === "dedupeRows") {
        pushExcelUndo();
        var seen = {};
        var deduped = [];
        for (var d = 0; d < grid.length; d++) {
          var sig = (grid[d] || []).map(function(v) { return String(v == null ? "" : v).trim().toLowerCase(); }).join("\u001F");
          if (!seen[sig]) {
            seen[sig] = true;
            deduped.push(grid[d]);
          }
        }
        var removed = grid.length - deduped.length;
        excelSheets[excelActiveSheet] = deduped.length ? deduped : [[""]];
        excelSelectedCell.r = Math.max(0, Math.min(excelSheets[excelActiveSheet].length - 1, excelSelectedCell.r));
        renderExcelGrid(true);
        showToast("Deduplicated", removed + " duplicate row(s) removed.");
      }
    }
    function syncExcelFormulaBar() {
      var grid = getActiveGrid();
      var r = excelSelectedCell.r;
      var c = excelSelectedCell.c;
      if (excelCellAddr) excelCellAddr.textContent = colIndexToLetter(c) + (r + 1);
      if (excelFormulaInput) {
        var raw = grid[r] && grid[r][c] !== void 0 && grid[r][c] !== null ? String(grid[r][c]) : "";
        excelFormulaInput.value = raw;
      }
      if (excelHelperOpen) updateExcelColStats();
    }
    function renderExcelGrid(resetChunk) {
      if (!excelTable) return;
      var grid = getActiveGrid();
      var totalRows = grid.length;
      var maxCols = 1;
      for (var i = 0; i < Math.min(totalRows, 300); i++) {
        if (grid[i] && grid[i].length > maxCols) maxCols = grid[i].length;
      }
      if (resetChunk) {
        excelRenderedRows = Math.min(totalRows, EXCEL_CHUNK);
      } else {
        excelRenderedRows = Math.min(totalRows, excelRenderedRows + EXCEL_CHUNK);
      }
      var theadHtml = '<thead><tr><th class="ur-xl-corner sticky top-0 left-0 z-30">#</th>';
      for (var c = 0; c < maxCols; c++) {
        theadHtml += '<th class="ur-xl-colhead sticky top-0 z-20">' + colIndexToLetter(c) + "</th>";
      }
      theadHtml += "</tr></thead>";
      var tbodyHtml = "<tbody>";
      for (var r = 0; r < excelRenderedRows; r++) {
        tbodyHtml += '<tr><th class="ur-xl-rowhead sticky left-0 z-10 tabular-nums">' + (r + 1) + "</th>";
        var row = grid[r] || [];
        for (var col = 0; col < maxCols; col++) {
          var val = evaluateFormulaGrid(grid, r, col);
          var isSel = r === excelSelectedCell.r && col === excelSelectedCell.c;
          var cls = "ur-xl-cell tabular-nums" + (isSel ? " ur-xl-selected" : "");
          tbodyHtml += '<td class="' + cls + '" data-r="' + r + '" data-c="' + col + '">' + escapeHtml(val) + "</td>";
        }
        tbodyHtml += "</tr>";
      }
      tbodyHtml += "</tbody>";
      excelTable.innerHTML = theadHtml + tbodyHtml;
      if (excelLoadMoreBtn) {
        if (excelRenderedRows < totalRows) {
          excelLoadMoreBtn.classList.remove("hidden");
          excelLoadMoreBtn.textContent = "Load more rows (" + excelRenderedRows + " / " + totalRows + ")";
        } else {
          excelLoadMoreBtn.classList.add("hidden");
        }
      }
      syncExcelFormulaBar();
    }
    function setExcelEditMode(enabled) {
      excelEditMode = Boolean(enabled);
      if (excelFormulaBar) excelFormulaBar.classList.remove("hidden");
      if (excelFormulaInput) excelFormulaInput.readOnly = !excelEditMode;
      if (excelEditTools) excelEditTools.classList.toggle("hidden", !excelEditMode);
      if (editModeBtn) {
        editModeBtn.textContent = excelEditMode ? "Done Editing" : "Edit";
        editModeBtn.setAttribute("data-active", excelEditMode ? "true" : "false");
      }
      if (saveExportBtn && activeKind === "excel") {
        saveExportBtn.classList.remove("hidden");
        saveExportBtn.textContent = "Save .xlsx";
      }
      renderExcelSheetTabsUi();
      syncExcelFormulaBar();
    }
    function openExcelDocument(bytes, name, ext, mime) {
      activeKind = "excel";
      activeExt = ext;
      activeMime = mime;
      activeFileName = name || "Spreadsheet.xlsx";
      activeBytes = bytes;
      activeDocKey = docKeyFor(activeFileName, bytes.byteLength);
      excelEditMode = false;
      excelUndoStack = [];
      excelRedoStack = [];
      openOverlay();
      hideAllPanes();
      setSkeletonVisible(true);
      setProgress(25, "Loading SheetJS engine...");
      if (fileNameEl) fileNameEl.textContent = activeFileName;
      if (typePillEl) {
        typePillEl.textContent = ext.toUpperCase();
        typePillEl.style.background = "var(--pastel-office)";
        typePillEl.style.color = "var(--pastel-office-accent)";
      }
      return global.OneoraLoader.load("xlsx").then(function() {
        setProgress(65, "Parsing sheets...");
        var wb;
        if (ext === "csv") {
          var csvText = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
          wb = global.XLSX.read(csvText, { type: "string" });
        } else {
          wb = global.XLSX.read(bytes, { type: "array", cellFormula: true });
        }
        excelWorkbook = wb;
        excelSheetNames = wb.SheetNames && wb.SheetNames.length ? wb.SheetNames.slice() : ["Sheet1"];
        excelSheets = {};
        excelSheetNames.forEach(function(sName) {
          var ws = wb.Sheets[sName];
          var aoa = global.XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" });
          if (ws) {
            Object.keys(ws).forEach(function(addr) {
              if (addr.charAt(0) === "!") return;
              var cellObj = ws[addr];
              if (cellObj && cellObj.f) {
                var parsed = parseCellRef(addr);
                if (parsed) {
                  while (aoa.length <= parsed.r) aoa.push([]);
                  aoa[parsed.r][parsed.c] = "=" + cellObj.f;
                }
              }
            });
          }
          excelSheets[sName] = aoa.length ? aoa : [["", "", ""]];
        });
        excelActiveSheet = excelSheetNames[0];
        excelSelectedCell = { r: 0, c: 0 };
        setSkeletonVisible(false);
        setProgress(null);
        excelPane.classList.remove("hidden");
        if (editModeBtn) {
          editModeBtn.classList.remove("hidden");
          editModeBtn.textContent = "Edit";
        }
        if (saveExportBtn) {
          saveExportBtn.classList.remove("hidden");
          saveExportBtn.textContent = "Save .xlsx";
        }
        setExcelEditMode(false);
        setExcelHelperOpen(false);
        renderExcelSheetTabsUi();
        renderExcelGrid(true);
        if (fileMetaEl) fileMetaEl.textContent = excelSheetNames.length + " sheet" + (excelSheetNames.length > 1 ? "s" : "") + " · " + formatBytes(bytes.byteLength);
        setBarsVisible(true);
        saveToRecents(bytes, activeFileName, "excel", ext, mime, "");
      }).catch(function(err) {
        showReaderError("Could not open spreadsheet", "File may be password-protected or corrupted (" + (err && err.message ? err.message : "parse error") + ").", false, null);
      });
    }
    function createBlankExcelDocument(fileName) {
      activeKind = "excel";
      activeExt = "xlsx";
      activeMime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      activeFileName = fileName || "ONEORA_Spreadsheet.xlsx";
      activeBytes = new Uint8Array(0);
      activeDocKey = docKeyFor(activeFileName, Date.now());
      excelUndoStack = [];
      excelRedoStack = [];
      openOverlay();
      hideAllPanes();
      setSkeletonVisible(false);
      setProgress(null);
      if (fileNameEl) fileNameEl.textContent = activeFileName;
      if (typePillEl) {
        typePillEl.textContent = "XLSX";
        typePillEl.style.background = "var(--pastel-office)";
        typePillEl.style.color = "var(--pastel-office-accent)";
      }
      excelSheetNames = ["Sheet1"];
      excelSheets = {
        Sheet1: [
          ["Item", "Qty", "Rate", "Total", "Note"],
          ["Sample Item 1", "2", "250", "=B2*C2", ""],
          ["Sample Item 2", "1", "450", "=B3*C3", ""],
          ["", "", "", "", ""],
          ["", "", "", "", ""],
          ["", "", "", "", ""],
          ["Total", "", "", "=SUM(D2:D6)", ""]
        ]
      };
      excelActiveSheet = "Sheet1";
      excelSelectedCell = { r: 1, c: 0 };
      excelPane.classList.remove("hidden");
      if (editModeBtn) editModeBtn.classList.remove("hidden");
      if (saveExportBtn) {
        saveExportBtn.classList.remove("hidden");
        saveExportBtn.textContent = "Save .xlsx";
      }
      if (fileMetaEl) fileMetaEl.textContent = "1 sheet · New offline workbook";
      setExcelEditMode(true);
      setExcelHelperOpen(true);
      renderExcelSheetTabsUi();
      renderExcelGrid(true);
      setBarsVisible(true);
    }
    function buildWorkbookFromExcelState() {
      var wb = global.XLSX.utils.book_new();
      excelSheetNames.forEach(function(sName) {
        var grid = excelSheets[sName] || [[]];
        var ws = global.XLSX.utils.aoa_to_sheet(grid);
        for (var r = 0; r < grid.length; r++) {
          var row = grid[r] || [];
          for (var c = 0; c < row.length; c++) {
            var raw = String(row[c] === null || row[c] === void 0 ? "" : row[c]);
            if (raw.charAt(0) === "=") {
              var addr = colIndexToLetter(c) + (r + 1);
              ws[addr] = { t: "n", f: raw.slice(1), v: parseFloat(evaluateFormulaGrid(grid, r, c)) || 0 };
            }
          }
        }
        global.XLSX.utils.book_append_sheet(wb, ws, sName.slice(0, 31));
      });
      return wb;
    }
    function saveExcelAs(format) {
      global.OneoraLoader.load("xlsx").then(function() {
        var wb = buildWorkbookFromExcelState();
        var base = activeFileName.replace(/\.(xlsx|xls|csv|ods)$/i, "");
        if (format === "csv") {
          var ws = wb.Sheets[excelActiveSheet] || wb.Sheets[wb.SheetNames[0]];
          var csv = global.XLSX.utils.sheet_to_csv(ws);
          var blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
          if (global.utils && global.utils.downloadBlob) global.utils.downloadBlob(blob, base + ".csv");
          showToast("Saved CSV", base + ".csv exported!", "success");
        } else {
          var outArr = global.XLSX.write(wb, { bookType: "xlsx", type: "array" });
          activeBytes = new Uint8Array(outArr);
          var blobX = new Blob([activeBytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
          if (global.utils && global.utils.downloadBlob) global.utils.downloadBlob(blobX, base + ".xlsx");
          showToast("Saved Excel", base + ".xlsx saved offline!", "success");
        }
      });
    }
    function renderCurrentPptSlide() {
      if (!pptSlideViewport || !pptSlides.length) return;
      var s = pptSlides[pptCurrent] || pptSlides[0];
      var html = '<div class="ur-ppt-slide-card w-full max-w-3xl mx-auto rounded-3xl bg-white text-[#2B2236] shadow-xl p-5 sm:p-8 space-y-4 border border-black/10">';
      html += '<div class="flex items-center justify-between text-[11px] font-bold opacity-55"><span>Slide ' + (pptCurrent + 1) + " of " + pptSlides.length + "</span><span>View-only</span></div>";
      if (s.title) {
        html += '<h2 class="text-xl sm:text-2xl font-extrabold leading-tight">' + escapeHtml(s.title) + "</h2>";
      }
      if (s.images && s.images.length) {
        html += '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">';
        s.images.forEach(function(src) {
          html += '<img src="' + src + '" alt="Slide media" class="w-full max-h-64 object-contain rounded-2xl bg-[#FFF7EE] p-1" />';
        });
        html += "</div>";
      }
      if (s.blocks && s.blocks.length) {
        html += '<div class="space-y-2.5 text-sm sm:text-base leading-relaxed">';
        s.blocks.forEach(function(blk) {
          if (blk.type === "table" && blk.rows) {
            html += '<div class="overflow-x-auto"><table class="w-full border-collapse text-xs"><tbody>';
            blk.rows.forEach(function(row) {
              html += "<tr>" + row.map(function(cell) {
                return '<td class="border border-black/15 px-2.5 py-1.5">' + escapeHtml(cell) + "</td>";
              }).join("") + "</tr>";
            });
            html += "</tbody></table></div>";
          } else {
            html += '<p class="pl-3 relative"><span class="absolute left-0 opacity-50">•</span>' + escapeHtml(blk.text) + "</p>";
          }
        });
        html += "</div>";
      } else if (!s.title && (!s.images || !s.images.length)) {
        html += '<p class="text-sm opacity-60 italic">(Visual or empty slide)</p>';
      }
      html += "</div>";
      pptSlideViewport.innerHTML = html;
      if (pptNotesBox) {
        if (pptShowNotes) {
          pptNotesBox.classList.remove("hidden");
          pptNotesBox.innerHTML = '<div class="text-[11px] font-extrabold opacity-65 mb-1">Speaker Notes</div><p class="text-xs leading-relaxed">' + escapeHtml(s.notes || "No speaker notes for this slide.") + "</p>";
        } else {
          pptNotesBox.classList.add("hidden");
        }
      }
      if (pptCounter) pptCounter.textContent = pptCurrent + 1 + " / " + pptSlides.length;
      if (pptPrevBtn) pptPrevBtn.disabled = pptCurrent <= 0;
      if (pptNextBtn) pptNextBtn.disabled = pptCurrent >= pptSlides.length - 1;
      if (pptThumbStrip) {
        var thumbs = pptThumbStrip.querySelectorAll("[data-ppt-idx]");
        for (var i = 0; i < thumbs.length; i++) {
          var isCur = parseInt(thumbs[i].getAttribute("data-ppt-idx"), 10) === pptCurrent;
          thumbs[i].classList.toggle("ring-2", isCur);
          thumbs[i].classList.toggle("ring-[#5B3FD0]", isCur);
          if (isCur) {
            try {
              thumbs[i].scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
            } catch (e) {
            }
          }
        }
      }
    }
    function renderPptThumbStrip() {
      if (!pptThumbStrip) return;
      pptThumbStrip.innerHTML = "";
      pptSlides.forEach(function(s, idx) {
        var b = document.createElement("button");
        b.type = "button";
        b.setAttribute("data-ppt-idx", String(idx));
        b.className = "shrink-0 w-24 h-16 rounded-xl bg-white text-[#2B2236] p-2 text-left border border-black/10 shadow-sm flex flex-col justify-between overflow-hidden active:scale-95";
        b.innerHTML = '<div class="text-[10px] font-extrabold truncate">' + escapeHtml(s.title || "Slide " + (idx + 1)) + '</div><div class="text-[9px] font-bold opacity-55 tabular-nums">' + (idx + 1) + "</div>";
        b.addEventListener("click", function() {
          haptic(8);
          pptCurrent = idx;
          renderCurrentPptSlide();
        });
        pptThumbStrip.appendChild(b);
      });
    }
    function openPptDocument(bytes, name, ext, mime) {
      activeKind = "ppt";
      activeExt = ext;
      activeMime = mime;
      activeFileName = name || "Presentation.pptx";
      activeBytes = bytes;
      activeDocKey = docKeyFor(activeFileName, bytes.byteLength);
      pptSlides = [];
      pptCurrent = 0;
      pptShowNotes = false;
      openOverlay();
      hideAllPanes();
      setSkeletonVisible(true);
      setProgress(25, "Loading PowerPoint viewer...");
      if (fileNameEl) fileNameEl.textContent = activeFileName;
      if (typePillEl) {
        typePillEl.textContent = ext.toUpperCase();
        typePillEl.style.background = "var(--pastel-lifemoney)";
        typePillEl.style.color = "var(--pastel-lifemoney-accent)";
      }
      if (pptNotice) {
        pptNotice.classList.add("hidden");
        pptNotice.innerHTML = "";
      }
      if (ext === "ppt") {
        var paras = extractLegacyBinaryParagraphs(bytes);
        if (!paras.length) {
          showReaderError(
            "Legacy .ppt presentation cannot be rendered directly",
            "Older binary .ppt files use a proprietary format. You can still generate a readable PDF copy or save it as .pptx.",
            true,
            exportCurrentDocToPdf
          );
          return Promise.resolve();
        }
        var chunkSize = 6;
        for (var i = 0; i < paras.length; i += chunkSize) {
          var slice = paras.slice(i, i + chunkSize);
          pptSlides.push({
            num: pptSlides.length + 1,
            title: slice[0] || "Slide " + (pptSlides.length + 1),
            blocks: slice.slice(1).map(function(t) {
              return { type: "text", text: t };
            }),
            images: [],
            notes: ""
          });
        }
        if (pptNotice) {
          pptNotice.classList.remove("hidden");
          pptNotice.innerHTML = '<div class="flex flex-wrap items-center justify-between gap-2"><span>Legacy <strong>.ppt</strong> opened in compatibility mode (view-only).</span><button type="button" id="urLegacyPptToPdfBtn" class="px-3 py-1.5 rounded-xl bg-[#5B3FD0] text-white text-xs font-extrabold min-h-[36px]">Convert to PDF</button></div>';
          var b = document.getElementById("urLegacyPptToPdfBtn");
          if (b) b.addEventListener("click", exportCurrentDocToPdf);
        }
        finishPptOpen();
        return Promise.resolve();
      }
      return global.OneoraLoader.load("jszip").then(function() {
        setProgress(55, "Extracting slides...");
        return global.JSZip.loadAsync(bytes);
      }).then(function(zip) {
        var slideNames = Object.keys(zip.files).filter(function(k) {
          return /^ppt\/slides\/slide\d+\.xml$/i.test(k);
        }).sort(function(a, b2) {
          var na = parseInt(a.match(/slide(\d+)\.xml/i)[1], 10);
          var nb = parseInt(b2.match(/slide(\d+)\.xml/i)[1], 10);
          return na - nb;
        });
        if (!slideNames.length) throw new Error("No slides found in .pptx");
        var chain = Promise.resolve();
        slideNames.forEach(function(sPath, idx) {
          chain = chain.then(function() {
            var slideNum = idx + 1;
            setProgress(55 + Math.round((idx + 1) / slideNames.length * 40), "Loading slide " + slideNum + " of " + slideNames.length);
            return zip.file(sPath).async("text").then(function(xmlStr) {
              var doc = new DOMParser().parseFromString(xmlStr, "application/xml");
              var title = "";
              var blocks = [];
              var spNodes = doc.getElementsByTagNameNS("*", "sp");
              for (var s = 0; s < spNodes.length; s++) {
                var ph = spNodes[s].getElementsByTagNameNS("*", "ph")[0];
                var phType = ph ? ph.getAttribute("type") || "" : "";
                var paras2 = spNodes[s].getElementsByTagNameNS("*", "p");
                for (var p = 0; p < paras2.length; p++) {
                  var ts = paras2[p].getElementsByTagNameNS("*", "t");
                  var line = "";
                  for (var t = 0; t < ts.length; t++) line += ts[t].textContent || "";
                  line = line.trim();
                  if (!line) continue;
                  if (!title && (phType === "title" || phType === "ctrTitle" || s === 0)) {
                    title = line;
                  } else {
                    blocks.push({ type: "text", text: line });
                  }
                }
              }
              var tblNodes = doc.getElementsByTagNameNS("*", "tbl");
              for (var tb = 0; tb < tblNodes.length; tb++) {
                var rows = [];
                var trs = tblNodes[tb].getElementsByTagNameNS("*", "tr");
                for (var r = 0; r < trs.length; r++) {
                  var rowArr = [];
                  var tcs = trs[r].getElementsByTagNameNS("*", "tc");
                  for (var c = 0; c < tcs.length; c++) {
                    var cts = tcs[c].getElementsByTagNameNS("*", "t");
                    var cellTxt = "";
                    for (var ct = 0; ct < cts.length; ct++) cellTxt += cts[ct].textContent || "";
                    rowArr.push(cellTxt.trim());
                  }
                  if (rowArr.length) rows.push(rowArr);
                }
                if (rows.length) blocks.push({ type: "table", rows });
              }
              var relPath = "ppt/slides/_rels/" + sPath.split("/").pop() + ".rels";
              var relFile = zip.file(relPath);
              var images = [];
              var notes = "";
              if (!relFile) {
                pptSlides.push({ num: slideNum, title, blocks, images, notes });
                return;
              }
              return relFile.async("text").then(function(relXml) {
                var rDoc = new DOMParser().parseFromString(relXml, "application/xml");
                var rels = rDoc.getElementsByTagName("Relationship");
                var mediaPromises = [];
                for (var ri = 0; ri < rels.length; ri++) {
                  var target = rels[ri].getAttribute("Target") || "";
                  var rType = rels[ri].getAttribute("Type") || "";
                  var normPath = "ppt/" + target.replace(/^\.\.\//, "");
                  if (rType.indexOf("image") !== -1 && zip.file(normPath)) {
                    (function(mp) {
                      mediaPromises.push(zip.file(mp).async("blob").then(function(bl) {
                        var u = URL.createObjectURL(bl);
                        tempUrls.push(u);
                        images.push(u);
                      }).catch(function() {
                      }));
                    })(normPath);
                  } else if (rType.indexOf("notesSlide") !== -1 && zip.file(normPath)) {
                    (function(np) {
                      mediaPromises.push(zip.file(np).async("text").then(function(nXml) {
                        var nDoc = new DOMParser().parseFromString(nXml, "application/xml");
                        var nts = nDoc.getElementsByTagNameNS("*", "t");
                        var nLines = [];
                        for (var k = 0; k < nts.length; k++) {
                          var val = (nts[k].textContent || "").trim();
                          if (val && !/^\d+$/.test(val)) nLines.push(val);
                        }
                        notes = nLines.join(" ");
                      }).catch(function() {
                      }));
                    })(normPath);
                  }
                }
                return Promise.all(mediaPromises).then(function() {
                  pptSlides.push({ num: slideNum, title, blocks, images, notes });
                });
              });
            });
          });
        });
        return chain.then(finishPptOpen);
      }).catch(function(err) {
        showReaderError("Could not open PowerPoint", "This presentation may be corrupted or encrypted (" + (err && err.message ? err.message : "error") + ").", false, null);
      });
      function finishPptOpen() {
        setSkeletonVisible(false);
        setProgress(null);
        pptPane.classList.remove("hidden");
        if (pptBottomControls) pptBottomControls.classList.remove("hidden");
        if (saveExportBtn) {
          saveExportBtn.classList.remove("hidden");
          saveExportBtn.textContent = "Export PDF";
        }
        renderPptThumbStrip();
        renderCurrentPptSlide();
        if (fileMetaEl) fileMetaEl.textContent = pptSlides.length + " slide" + (pptSlides.length > 1 ? "s" : "") + " · " + formatBytes(bytes.byteLength);
        setBarsVisible(true);
        saveToRecents(bytes, activeFileName, "ppt", ext, mime, "");
      }
    }
    function openImageDocument(bytes, name, ext, mime) {
      activeKind = "image";
      activeExt = ext;
      activeMime = mime;
      activeFileName = name || "Image.jpg";
      activeBytes = bytes;
      activeDocKey = docKeyFor(activeFileName, bytes.byteLength);
      imgZoom = 1;
      imgRot = 0;
      openOverlay();
      hideAllPanes();
      revokeTempUrls();
      if (fileNameEl) fileNameEl.textContent = activeFileName;
      if (typePillEl) {
        typePillEl.textContent = ext.toUpperCase();
        typePillEl.style.background = "var(--pastel-image)";
        typePillEl.style.color = "var(--pastel-image-accent)";
      }
      var blob = new Blob([bytes], { type: mime || "image/jpeg" });
      var url = URL.createObjectURL(blob);
      tempUrls.push(url);
      if (imgEl) {
        imgEl.src = url;
        imgEl.style.transform = "scale(1) rotate(0deg)";
        imgEl.onload = function() {
          try {
            var tc = document.createElement("canvas");
            var sc = Math.min(1, 140 / Math.max(imgEl.naturalWidth || 100, imgEl.naturalHeight || 100));
            tc.width = Math.max(48, Math.round((imgEl.naturalWidth || 100) * sc));
            tc.height = Math.max(48, Math.round((imgEl.naturalHeight || 100) * sc));
            tc.getContext("2d").drawImage(imgEl, 0, 0, tc.width, tc.height);
            updateRecentThumb(activeDocKey, tc.toDataURL("image/jpeg", 0.72));
          } catch (e) {
          }
        };
      }
      if (imgZoomLabel) imgZoomLabel.textContent = "100%";
      imgPane.classList.remove("hidden");
      if (imgBottomControls) imgBottomControls.classList.remove("hidden");
      if (saveExportBtn) {
        saveExportBtn.classList.remove("hidden");
        saveExportBtn.textContent = "Export PDF";
      }
      if (fileMetaEl) fileMetaEl.textContent = "Image · " + formatBytes(bytes.byteLength);
      setBarsVisible(true);
      saveToRecents(bytes, activeFileName, "image", ext, mime, "");
      return Promise.resolve();
    }
    function openZipDocument(bytes, name, mime) {
      activeKind = "zip";
      activeExt = "zip";
      activeMime = mime || "application/zip";
      activeFileName = name || "Archive.zip";
      activeBytes = bytes;
      activeDocKey = docKeyFor(activeFileName, bytes.byteLength);
      openOverlay();
      hideAllPanes();
      setSkeletonVisible(true);
      setProgress(35, "Reading ZIP contents...");
      if (fileNameEl) fileNameEl.textContent = activeFileName;
      if (typePillEl) {
        typePillEl.textContent = "ZIP";
        typePillEl.style.background = "var(--pastel-vault)";
        typePillEl.style.color = "var(--pastel-vault-accent)";
      }
      return global.OneoraLoader.load("jszip").then(function() {
        return global.JSZip.loadAsync(bytes);
      }).then(function(zip) {
        currentZipObj = zip;
        var entries = [];
        zip.forEach(function(relPath, entry) {
          if (!entry.dir && relPath.indexOf("__MACOSX/") !== 0) {
            entries.push({ path: relPath, name: relPath.split("/").pop(), entry });
          }
        });
        setSkeletonVisible(false);
        setProgress(null);
        zipPane.classList.remove("hidden");
        if (zipSummary) zipSummary.textContent = entries.length + " file" + (entries.length === 1 ? "" : "s") + " inside archive · Tap any file to open in this reader";
        if (zipList) {
          zipList.innerHTML = "";
          if (!entries.length) {
            zipList.innerHTML = '<div class="pastel-inset-tile p-6 text-center text-xs font-semibold opacity-75">This ZIP archive is empty.</div>';
          }
          entries.forEach(function(item) {
            var extM = item.name.toLowerCase().match(/\.([a-z0-9]{1,8})$/);
            var ext = extM ? extM[1] : "file";
            var row = document.createElement("div");
            row.className = "pastel-inset-tile p-3 flex items-center justify-between gap-3";
            row.innerHTML = '<button type="button" class="ur-zip-open flex items-center gap-3 flex-1 min-w-0 text-left min-h-[44px]"><span class="w-10 h-10 rounded-xl bg-white dark:bg-[#17131F] flex items-center justify-center text-[10px] font-extrabold text-[#5B3FD0] shrink-0 shadow-sm">' + escapeHtml(ext.toUpperCase().slice(0, 4)) + '</span><div class="min-w-0 flex-1"><div class="text-xs sm:text-sm font-extrabold truncate">' + escapeHtml(item.name) + '</div><div class="text-[11px] opacity-65 truncate">' + escapeHtml(item.path) + '</div></div></button><button type="button" class="ur-zip-dl px-3 py-2 rounded-xl bg-[#E4D9FF] text-[#4B2FB8] text-xs font-extrabold min-h-[40px] shrink-0">Save</button>';
            row.querySelector(".ur-zip-open").addEventListener("click", function() {
              haptic(10);
              setProgress(40, "Extracting " + item.name + "...");
              item.entry.async("uint8array").then(function(u8) {
                zipReturnStack = { bytes, name: activeFileName, mime: activeMime };
                if (backToZipBtn) backToZipBtn.classList.remove("hidden");
                openUniversalFile(u8, item.name, "");
              }).catch(function() {
                setProgress(null);
                showToast("Extract Failed", "Could not extract " + item.name + " (archive may be encrypted).", "error");
              });
            });
            row.querySelector(".ur-zip-dl").addEventListener("click", function() {
              item.entry.async("blob").then(function(bl) {
                if (global.utils && global.utils.downloadBlob) global.utils.downloadBlob(bl, item.name);
              });
            });
            zipList.appendChild(row);
          });
        }
        if (fileMetaEl) fileMetaEl.textContent = entries.length + " files · " + formatBytes(bytes.byteLength);
        setBarsVisible(true);
        saveToRecents(bytes, activeFileName, "zip", "zip", activeMime, "");
      }).catch(function() {
        showReaderError("Could not open ZIP archive", "The archive may be password-protected or corrupted.", false, null);
      });
    }
    function exportCurrentDocToPdf() {
      if (moreMenu) moreMenu.classList.add("hidden");
      if (!activeKind) return;
      if (activeKind === "pdf") {
        saveAnnotatedPdf();
        return;
      }
      setProgress(30, "Exporting as PDF...");
      var baseName = activeFileName.replace(/\.[^.]+$/, "") + ".pdf";
      if (activeKind === "word" && wordPaper) {
        var paras = [];
        var children = wordPaper.querySelectorAll("h1,h2,h3,h4,p,li,tr");
        if (children.length) {
          for (var i = 0; i < children.length; i++) {
            var tag = children[i].tagName.toLowerCase();
            var txt = (children[i].innerText || children[i].textContent || "").trim();
            if (txt) paras.push({ text: txt, heading: tag === "h1" || tag === "h2" || tag === "h3" });
          }
        } else {
          (wordPaper.innerText || "").split(/\r?\n/).forEach(function(l) {
            if (l.trim()) paras.push(l.trim());
          });
        }
        exportLinesToPdfBytes(activeFileName, paras).then(function(pdfBytes) {
          setProgress(null);
          if (global.utils && global.utils.downloadBlob) global.utils.downloadBlob(new Blob([pdfBytes], { type: "application/pdf" }), baseName);
          showToast("Exported PDF", baseName + " is ready!", "success");
        }).catch(function() {
          setProgress(null);
          showToast("Export Failed", "Could not create PDF.", "error");
        });
      } else if (activeKind === "excel") {
        var grid = getActiveGrid();
        var lines = [{ text: "Sheet: " + excelActiveSheet, heading: true }];
        for (var r = 0; r < Math.min(grid.length, 400); r++) {
          var rowVals = [];
          var row = grid[r] || [];
          for (var c = 0; c < row.length; c++) rowVals.push(evaluateFormulaGrid(grid, r, c));
          lines.push(rowVals.join("  |  "));
        }
        exportLinesToPdfBytes(activeFileName, lines).then(function(pdfBytes) {
          setProgress(null);
          if (global.utils && global.utils.downloadBlob) global.utils.downloadBlob(new Blob([pdfBytes], { type: "application/pdf" }), baseName);
          showToast("Exported PDF", baseName + " is ready!", "success");
        }).catch(function() {
          setProgress(null);
          showToast("Export Failed", "Could not create PDF.", "error");
        });
      } else if (activeKind === "ppt") {
        var slideLines = [];
        pptSlides.forEach(function(s, idx) {
          slideLines.push({ text: "Slide " + (idx + 1) + ": " + (s.title || ""), heading: true });
          (s.blocks || []).forEach(function(b) {
            if (b.type === "text") slideLines.push("- " + b.text);
            else if (b.type === "table" && b.rows) {
              b.rows.forEach(function(rw) {
                slideLines.push(rw.join(" | "));
              });
            }
          });
          if (s.notes) slideLines.push("Notes: " + s.notes);
          slideLines.push("");
        });
        exportLinesToPdfBytes(activeFileName, slideLines).then(function(pdfBytes) {
          setProgress(null);
          if (global.utils && global.utils.downloadBlob) global.utils.downloadBlob(new Blob([pdfBytes], { type: "application/pdf" }), baseName);
          showToast("Exported PDF", baseName + " is ready!", "success");
        }).catch(function() {
          setProgress(null);
          showToast("Export Failed", "Could not create PDF.", "error");
        });
      } else if (activeKind === "image" && imgEl) {
        var c = document.createElement("canvas");
        var w = imgEl.naturalWidth || 1200;
        var h = imgEl.naturalHeight || 1600;
        c.width = imgRot % 180 === 0 ? w : h;
        c.height = imgRot % 180 === 0 ? h : w;
        var ctx = c.getContext("2d");
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.translate(c.width / 2, c.height / 2);
        ctx.rotate(imgRot * Math.PI / 180);
        ctx.drawImage(imgEl, -w / 2, -h / 2, w, h);
        exportCanvasPagesToPdfBytes([c]).then(function(pdfBytes) {
          setProgress(null);
          if (global.utils && global.utils.downloadBlob) global.utils.downloadBlob(new Blob([pdfBytes], { type: "application/pdf" }), baseName);
          showToast("Exported PDF", baseName + " is ready!", "success");
        }).catch(function() {
          setProgress(null);
          showToast("Export Failed", "Could not create PDF.", "error");
        });
      }
    }
    function openUniversalFile(bytes, name, mimeType) {
      var u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      if (backToZipBtn && (!zipReturnStack || zipReturnStack.name === name)) {
        backToZipBtn.classList.add("hidden");
      }
      return detectDocumentType(u8, name, mimeType).then(function(det) {
        if (det.kind === "pdf") return openPdfDocument(u8, name, "");
        if (det.kind === "word") return openWordDocument(u8, name, det.ext, det.mime);
        if (det.kind === "excel") return openExcelDocument(u8, name, det.ext, det.mime);
        if (det.kind === "ppt") return openPptDocument(u8, name, det.ext, det.mime);
        if (det.kind === "image") return openImageDocument(u8, name, det.ext, det.mime);
        if (det.kind === "zip") return openZipDocument(u8, name, det.mime);
        openOverlay();
        showReaderError(
          "Unsupported file format (." + det.ext + ")",
          "ONEORA Universal Reader supports PDF, Word (.docx/.doc), Excel (.xlsx/.xls/.csv), PowerPoint (.pptx/.ppt), Images (JPG/PNG/WebP), TXT/RTF, and ZIP archives.",
          false,
          null
        );
      });
    }
    global.openUniversalDocumentFile = openUniversalFile;
    var ALL_ACCEPT = fileInput ? fileInput.getAttribute("accept") || "" : "";
    global._triggerUniversalFilePick = function(acceptOverride) {
      if (!fileInput) return;
      fileInput.setAttribute("accept", acceptOverride || ALL_ACCEPT);
      fileInput.click();
    };
    function handlePickedFile(file) {
      if (!file) return Promise.resolve();
      zipReturnStack = null;
      if (backToZipBtn) backToZipBtn.classList.add("hidden");
      return file.arrayBuffer().then(function(ab) {
        return openUniversalFile(new Uint8Array(ab), file.name || "Document", file.type || "");
      });
    }
    if (pickBtn) pickBtn.addEventListener("click", function() {
      haptic(10);
      global._triggerUniversalFilePick(ALL_ACCEPT);
    });
    if (openAnotherBtn) openAnotherBtn.addEventListener("click", function() {
      if (moreMenu) moreMenu.classList.add("hidden");
      global._triggerUniversalFilePick(ALL_ACCEPT);
    });
    var fmtBtns = document.querySelectorAll(".pb-doc-format-btn[data-doc-pick-accept]");
    for (var fb = 0; fb < fmtBtns.length; fb++) {
      (function(b) {
        b.addEventListener("click", function() {
          haptic(10);
          global._triggerUniversalFilePick(b.getAttribute("data-doc-pick-accept") || ALL_ACCEPT);
        });
      })(fmtBtns[fb]);
    }
    if (fileInput) {
      fileInput.addEventListener("change", function(e) {
        var f = e.target.files && e.target.files[0];
        fileInput.value = "";
        fileInput.setAttribute("accept", ALL_ACCEPT);
        if (f) handlePickedFile(f);
      });
    }
    if (resumeBtn) {
      resumeBtn.addEventListener("click", function() {
        if (!activeBytes || !activeKind) return;
        openOverlay();
        if (activeKind === "pdf" && pdfDoc) requestAnimationFrame(function() {
          renderPdfLayout(true);
        });
      });
    }
    if (closeBtn) closeBtn.addEventListener("click", function() {
      haptic(8);
      closeOverlay();
    });
    if (errorCloseBtn) errorCloseBtn.addEventListener("click", closeOverlay);
    if (backToZipBtn) {
      backToZipBtn.addEventListener("click", function() {
        if (!zipReturnStack) return;
        var prev = zipReturnStack;
        zipReturnStack = null;
        backToZipBtn.classList.add("hidden");
        openZipDocument(prev.bytes, prev.name, prev.mime);
      });
    }
    if (editModeBtn) {
      editModeBtn.addEventListener("click", function() {
        haptic(12);
        if (activeKind === "word") setWordEditMode(!wordEditMode);
        else if (activeKind === "excel") setExcelEditMode(!excelEditMode);
      });
    }
    if (saveExportBtn) {
      saveExportBtn.addEventListener("click", function() {
        haptic(12);
        if (activeKind === "word") saveWordAsDocx();
        else if (activeKind === "excel") saveExcelAs("xlsx");
        else exportCurrentDocToPdf();
      });
    }
    if (bookmarkBtn) bookmarkBtn.addEventListener("click", toggleCurrentBookmark);
    if (annotToggleBtn && annotBar) {
      annotToggleBtn.addEventListener("click", function() {
        haptic(10);
        var opening = annotBar.classList.contains("hidden");
        annotBar.classList.toggle("hidden", !opening);
        if (!opening) {
          annotActiveTool = null;
          syncAnnotButtons();
        }
      });
    }
    if (annotBar) {
      annotBar.addEventListener("click", function(e) {
        var btn = e.target.closest("button");
        if (!btn) return;
        var tool = btn.getAttribute("data-annot-tool");
        var color = btn.getAttribute("data-annot-color");
        if (tool) {
          haptic(10);
          annotActiveTool = annotActiveTool === tool ? null : tool;
          if (tool === "highlight" && !color) annotColor = "#FACC15";
          if (tool === "underline" && !color) annotColor = "#5B3FD0";
          if (tool === "draw" && !color) annotColor = "#2B2236";
          syncAnnotButtons();
          if (annotActiveTool === "sign" && !pendingSignDataUrl) {
            openSignPadModal(function(url) {
              pendingSignDataUrl = url;
              showToast("Signature Ready", "Tap anywhere on the PDF page to place your signature.", "info");
            });
          }
        } else if (color) {
          annotColor = color;
          haptic(8);
        } else if (btn.id === "urAnnotUndoBtn") {
          var last = annotUndoStack.pop();
          if (last && pageAnnotations[last.pageNum]) {
            pageAnnotations[last.pageNum].pop();
            redrawAnnotationsOnSlot(last.pageNum);
          }
        } else if (btn.id === "urAnnotSaveBtn") {
          saveAnnotatedPdf();
        }
      });
    }
    if (moreBtn && moreMenu) {
      moreBtn.addEventListener("click", function(e) {
        e.stopPropagation();
        moreMenu.classList.toggle("hidden");
      });
      overlay.addEventListener("click", function(e) {
        if (!moreMenu.contains(e.target) && e.target !== moreBtn) moreMenu.classList.add("hidden");
      });
    }
    if (tocOpenBtn) tocOpenBtn.addEventListener("click", openTocDrawer);
    if (thumbsOpenBtn) thumbsOpenBtn.addEventListener("click", openThumbnailsDrawer);
    if (bookmarksOpenBtn) bookmarksOpenBtn.addEventListener("click", openBookmarksDrawer);
    if (sideDrawerClose && sideDrawer) {
      sideDrawerClose.addEventListener("click", function() {
        sideDrawer.classList.add("hidden");
        sideDrawer.classList.remove("flex");
      });
    }
    if (displaySettingsBtn && displaySheet) {
      displaySettingsBtn.addEventListener("click", function() {
        if (moreMenu) moreMenu.classList.add("hidden");
        displaySheet.classList.remove("hidden");
        displaySheet.classList.add("flex");
      });
    }
    if (displaySheetClose && displaySheet) {
      displaySheetClose.addEventListener("click", function() {
        displaySheet.classList.add("hidden");
        displaySheet.classList.remove("flex");
      });
    }
    overlay.querySelectorAll("[data-ur-theme]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        haptic(8);
        applyReadingTheme(btn.getAttribute("data-ur-theme"));
      });
    });
    if (brightnessSlider) {
      brightnessSlider.addEventListener("input", function() {
        applyBrightness(brightnessSlider.value);
      });
    }
    if (orientLockBtn) orientLockBtn.addEventListener("click", toggleOrientationLock);
    if (exportPdfMenuBtn) exportPdfMenuBtn.addEventListener("click", exportCurrentDocToPdf);
    if (renameDocBtn) {
      renameDocBtn.addEventListener("click", function() {
        if (moreMenu) moreMenu.classList.add("hidden");
        var next = global.prompt ? global.prompt("Rename document:", activeFileName) : null;
        if (next && next.trim()) {
          activeFileName = next.trim();
          if (fileNameEl) fileNameEl.textContent = activeFileName;
          showToast("Renamed", "Document renamed to " + activeFileName, "success");
        }
      });
    }
    overlay.querySelectorAll("[data-reader-jump]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var target = btn.getAttribute("data-reader-jump");
        closeOverlay();
        if (target && typeof global.openPdfBondhuTool === "function") global.openPdfBondhuTool(target);
      });
    });
    if (searchToggleBtn && searchBar) {
      searchToggleBtn.addEventListener("click", function() {
        var opening = searchBar.classList.contains("hidden");
        searchBar.classList.toggle("hidden", !opening);
        if (opening && searchInput) setTimeout(function() {
          searchInput.focus();
        }, 40);
      });
    }
    if (searchCloseBtn && searchBar) searchCloseBtn.addEventListener("click", function() {
      searchBar.classList.add("hidden");
    });
    if (searchBtn) searchBtn.addEventListener("click", runPdfTextSearch);
    if (searchInput) {
      searchInput.addEventListener("keydown", function(e) {
        if (e.key === "Enter") {
          e.preventDefault();
          runPdfTextSearch();
        }
      });
    }
    if (searchPrevBtn) {
      searchPrevBtn.addEventListener("click", function() {
        if (!pdfSearchMatches.length) return;
        pdfSearchIdx = (pdfSearchIdx - 1 + pdfSearchMatches.length) % pdfSearchMatches.length;
        if (searchStatus) searchStatus.textContent = pdfSearchIdx + 1 + "/" + pdfSearchMatches.length + " (p." + pdfSearchMatches[pdfSearchIdx].pageNum + ")";
        goToPdfPage(pdfSearchMatches[pdfSearchIdx].pageNum);
        setTimeout(function() {
          activeSlots.forEach(function(_, p) {
            redrawAnnotationsOnSlot(p);
          });
        }, 80);
      });
    }
    if (searchNextBtn) {
      searchNextBtn.addEventListener("click", function() {
        if (!pdfSearchMatches.length) return;
        pdfSearchIdx = (pdfSearchIdx + 1) % pdfSearchMatches.length;
        if (searchStatus) searchStatus.textContent = pdfSearchIdx + 1 + "/" + pdfSearchMatches.length + " (p." + pdfSearchMatches[pdfSearchIdx].pageNum + ")";
        goToPdfPage(pdfSearchMatches[pdfSearchIdx].pageNum);
        setTimeout(function() {
          activeSlots.forEach(function(_, p) {
            redrawAnnotationsOnSlot(p);
          });
        }, 80);
      });
    }
    if (prevBtn) prevBtn.addEventListener("click", function() {
      haptic(8);
      goToPdfPage(currentPage - 1);
    });
    if (nextBtn) nextBtn.addEventListener("click", function() {
      haptic(8);
      goToPdfPage(currentPage + 1);
    });
    if (pageInput) {
      pageInput.addEventListener("change", function() {
        goToPdfPage(pageInput.value);
      });
      pageInput.addEventListener("keydown", function(e) {
        if (e.key === "Enter") {
          e.preventDefault();
          goToPdfPage(pageInput.value);
        }
      });
    }
    if (pageSlider) {
      pageSlider.addEventListener("input", function() {
        var v = parseInt(pageSlider.value, 10) || 1;
        if (pageSliderBubble) {
          pageSliderBubble.textContent = "Page " + v + " / " + (totalPages || 1);
          pageSliderBubble.classList.remove("hidden");
        }
      });
      pageSlider.addEventListener("change", function() {
        if (pageSliderBubble) pageSliderBubble.classList.add("hidden");
        goToPdfPage(pageSlider.value);
      });
    }
    if (zoomOutBtn) zoomOutBtn.addEventListener("click", function() {
      if (activeKind !== "pdf" || !pdfDoc) return;
      zoomFactor = Math.max(0.6, Math.round((zoomFactor - 0.2) * 100) / 100);
      renderPdfLayout(true);
    });
    if (zoomInBtn) zoomInBtn.addEventListener("click", function() {
      if (activeKind !== "pdf" || !pdfDoc) return;
      zoomFactor = Math.min(3.2, Math.round((zoomFactor + 0.2) * 100) / 100);
      renderPdfLayout(true);
    });
    if (fitBtn) fitBtn.addEventListener("click", function() {
      if (activeKind !== "pdf" || !pdfDoc) return;
      zoomFactor = 1;
      renderPdfLayout(true);
    });
    if (rotateBtn) rotateBtn.addEventListener("click", function() {
      if (activeKind !== "pdf" || !pdfDoc) return;
      rotationDeg = (rotationDeg + 90) % 360;
      renderPdfLayout(true);
    });
    if (modeToggleBtn) modeToggleBtn.addEventListener("click", function() {
      if (moreMenu) moreMenu.classList.add("hidden");
      if (activeKind !== "pdf" || !pdfDoc) return;
      viewMode = viewMode === "scroll" ? "single" : "scroll";
      renderPdfLayout(false);
    });
    if (themeCycleBtn) {
      var themeOrder = ["paper", "white", "night", "sepia"];
      themeCycleBtn.addEventListener("click", function() {
        haptic(8);
        var next = themeOrder[(themeOrder.indexOf(readingTheme) + 1) % themeOrder.length];
        applyReadingTheme(next);
      });
    }
    if (stage) {
      let touchDist = function(ts) {
        return Math.hypot(ts[0].clientX - ts[1].clientX, ts[0].clientY - ts[1].clientY);
      };
      stage.addEventListener("scroll", function() {
        if (activeKind !== "pdf" || !pdfDoc || viewMode !== "scroll" || overlay.classList.contains("hidden")) return;
        lastScrollTs = performance.now();
        if (scrollRafId) return;
        scrollRafId = requestAnimationFrame(function() {
          scrollRafId = null;
          syncPdfVirtualWindow(false);
        });
      }, { passive: true });
      var lastTap = 0;
      var tapTimer = null;
      var touchMoved = false;
      var pinchActive = false;
      var pinchDist0 = 0;
      var pinchZoom0 = 1;
      var swipeStartX = 0;
      var swipeStartY = 0;
      stage.addEventListener("touchstart", function(e) {
        if (e.touches.length === 2 && activeKind === "pdf" && pdfDoc) {
          pinchActive = true;
          pinchDist0 = touchDist(e.touches);
          pinchZoom0 = zoomFactor;
          if (tapTimer) {
            clearTimeout(tapTimer);
            tapTimer = null;
          }
        } else if (e.touches.length === 1) {
          touchMoved = false;
          swipeStartX = e.touches[0].clientX;
          swipeStartY = e.touches[0].clientY;
        }
      }, { passive: true });
      stage.addEventListener("touchmove", function(e) {
        if (pinchActive && e.touches.length === 2 && pinchDist0 > 0) {
          var ratio = Math.max(0.5, Math.min(2.6, touchDist(e.touches) / pinchDist0));
          pagesContainer.style.transition = "none";
          pagesContainer.style.transformOrigin = "top center";
          pagesContainer.style.transform = "scale(" + ratio.toFixed(3) + ")";
        } else if (e.touches.length === 1) {
          if (Math.abs(e.touches[0].clientX - swipeStartX) > 10 || Math.abs(e.touches[0].clientY - swipeStartY) > 10) {
            touchMoved = true;
          }
        }
      }, { passive: true });
      stage.addEventListener("touchend", function(e) {
        if (pinchActive && e.touches.length < 2) {
          pinchActive = false;
          var m = pagesContainer.style.transform.match(/scale\(([^)]+)\)/);
          var ratio = m ? parseFloat(m[1]) : 1;
          pagesContainer.style.transition = "transform 160ms ease-out";
          pagesContainer.style.transform = "";
          if (Math.abs(ratio - 1) > 0.06 && pdfDoc) {
            zoomFactor = Math.max(0.6, Math.min(3.2, Math.round(pinchZoom0 * ratio * 100) / 100));
            renderPdfLayout(true);
          }
          return;
        }
        if (e.changedTouches && e.changedTouches.length === 1 && !annotActiveTool) {
          var dx = e.changedTouches[0].clientX - swipeStartX;
          var dy = e.changedTouches[0].clientY - swipeStartY;
          if (Math.abs(dx) > 58 && Math.abs(dx) > Math.abs(dy) * 1.4) {
            if (activeKind === "ppt" && pptSlides.length > 1) {
              if (dx < 0 && pptCurrent < pptSlides.length - 1) {
                pptCurrent++;
                renderCurrentPptSlide();
                haptic(8);
              } else if (dx > 0 && pptCurrent > 0) {
                pptCurrent--;
                renderCurrentPptSlide();
                haptic(8);
              }
            } else if (activeKind === "pdf" && viewMode === "single") {
              if (dx < 0 && currentPage < totalPages) goToPdfPage(currentPage + 1);
              else if (dx > 0 && currentPage > 1) goToPdfPage(currentPage - 1);
            }
          }
        }
      }, { passive: true });
      stage.addEventListener("click", function(e) {
        if (touchMoved || pinchActive || annotActiveTool) return;
        if (wordEditMode || excelEditMode) return;
        if (e.target.closest("button, input, select, a, td, th")) return;
        if (moreMenu && !moreMenu.classList.contains("hidden")) return;
        var now = Date.now();
        if (activeKind === "pdf" && pdfDoc && now - lastTap < 270) {
          if (tapTimer) {
            clearTimeout(tapTimer);
            tapTimer = null;
          }
          lastTap = 0;
          zoomFactor = Math.abs(zoomFactor - 1) < 0.1 ? 1.65 : 1;
          renderPdfLayout(true);
          haptic(10);
        } else {
          lastTap = now;
          tapTimer = setTimeout(function() {
            setBarsVisible(barsHidden);
            tapTimer = null;
          }, 270);
        }
      });
    }
    if (wordToolbar) {
      wordToolbar.addEventListener("click", function(e) {
        var btn = e.target.closest("button");
        if (!btn) return;
        var cmd = btn.getAttribute("data-wcmd");
        var val = btn.getAttribute("data-wval") || null;
        if (cmd === "undo") {
          if (wordUndoStack.length > 1) {
            wordRedoStack.push(wordUndoStack.pop());
            wordPaper.innerHTML = wordUndoStack[wordUndoStack.length - 1];
          }
          return;
        }
        if (cmd === "redo") {
          if (wordRedoStack.length) {
            var nextHtml = wordRedoStack.pop();
            wordUndoStack.push(nextHtml);
            wordPaper.innerHTML = nextHtml;
          }
          return;
        }
        if (cmd === "findReplace" && wordFindBar) {
          wordFindBar.classList.toggle("hidden");
          return;
        }
        if (cmd) {
          pushWordUndoSnapshot();
          try {
            document.execCommand(cmd, false, val);
          } catch (err) {
          }
          wordPaper.focus();
        }
      });
      var sizeSel = document.getElementById("urWordFontSize");
      if (sizeSel) {
        sizeSel.addEventListener("change", function() {
          pushWordUndoSnapshot();
          try {
            document.execCommand("fontSize", false, sizeSel.value);
          } catch (err) {
          }
        });
      }
      var colInput = document.getElementById("urWordColor");
      if (colInput) {
        colInput.addEventListener("input", function() {
          pushWordUndoSnapshot();
          try {
            document.execCommand("foreColor", false, colInput.value);
          } catch (err) {
          }
        });
      }
    }
    if (wordPaper) {
      var wordSnapTimer = null;
      wordPaper.addEventListener("input", function() {
        clearTimeout(wordSnapTimer);
        wordSnapTimer = setTimeout(pushWordUndoSnapshot, 600);
      });
    }
    var wFindInput = document.getElementById("urWordFindInput");
    var wRepInput = document.getElementById("urWordReplaceInput");
    var wRepAllBtn = document.getElementById("urWordReplaceAllBtn");
    if (wRepAllBtn && wFindInput && wRepInput && wordPaper) {
      wRepAllBtn.addEventListener("click", function() {
        var needle = wFindInput.value;
        var repl = wRepInput.value;
        if (!needle) return;
        pushWordUndoSnapshot();
        var count = 0;
        var walker = document.createTreeWalker(wordPaper, NodeFilter.SHOW_TEXT, null, false);
        var nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach(function(tn) {
          if (tn.nodeValue && tn.nodeValue.indexOf(needle) !== -1) {
            var parts = tn.nodeValue.split(needle);
            count += parts.length - 1;
            tn.nodeValue = parts.join(repl);
          }
        });
        showToast("Replaced", count + " occurrence" + (count === 1 ? "" : "s") + " replaced.", "success");
      });
    }
    if (excelTable) {
      excelTable.addEventListener("click", function(e) {
        var td = e.target.closest("td[data-r][data-c]");
        if (!td) return;
        excelSelectedCell = {
          r: parseInt(td.getAttribute("data-r"), 10) || 0,
          c: parseInt(td.getAttribute("data-c"), 10) || 0
        };
        var prevSel = excelTable.querySelector(".ur-xl-selected");
        if (prevSel) prevSel.classList.remove("ur-xl-selected");
        td.classList.add("ur-xl-selected");
        syncExcelFormulaBar();
        if (excelEditMode && excelFormulaInput) excelFormulaInput.focus();
      });
    }
    function commitExcelFormulaValue() {
      if (!excelEditMode || !excelFormulaInput) return;
      var grid = getActiveGrid();
      var r = excelSelectedCell.r;
      var c = excelSelectedCell.c;
      pushExcelUndo();
      while (grid.length <= r) grid.push([]);
      grid[r][c] = excelFormulaInput.value;
      renderExcelGrid(true);
    }
    if (excelFormulaInput) {
      excelFormulaInput.addEventListener("keydown", function(e) {
        if (e.key === "Enter") {
          e.preventDefault();
          commitExcelFormulaValue();
        }
      });
      excelFormulaInput.addEventListener("blur", commitExcelFormulaValue);
    }
    if (excelLoadMoreBtn) excelLoadMoreBtn.addEventListener("click", function() {
      renderExcelGrid(false);
    });
    if (excelEditTools) {
      excelEditTools.addEventListener("click", function(e) {
        var btn = e.target.closest("button");
        if (!btn) return;
        var act = btn.getAttribute("data-xl-act");
        var grid = getActiveGrid();
        if (act === "addRow") {
          pushExcelUndo();
          var cols = grid[0] && grid[0].length || 4;
          grid.splice(excelSelectedCell.r + 1, 0, new Array(cols).fill(""));
          renderExcelGrid(true);
        } else if (act === "delRow" && grid.length > 1) {
          pushExcelUndo();
          grid.splice(excelSelectedCell.r, 1);
          excelSelectedCell.r = Math.max(0, Math.min(grid.length - 1, excelSelectedCell.r));
          renderExcelGrid(true);
        } else if (act === "addCol") {
          pushExcelUndo();
          for (var r = 0; r < grid.length; r++) grid[r].splice(excelSelectedCell.c + 1, 0, "");
          renderExcelGrid(true);
        } else if (act === "delCol") {
          pushExcelUndo();
          for (var r2 = 0; r2 < grid.length; r2++) {
            if (grid[r2].length > 1) grid[r2].splice(excelSelectedCell.c, 1);
          }
          excelSelectedCell.c = Math.max(0, excelSelectedCell.c - 1);
          renderExcelGrid(true);
        } else if (act === "undo" && excelUndoStack.length) {
          excelRedoStack.push(cloneExcelState());
          var prev = excelUndoStack.pop();
          excelSheets = prev.sheets;
          excelSheetNames = prev.names;
          excelActiveSheet = prev.active;
          renderExcelSheetTabsUi();
          renderExcelGrid(true);
        } else if (act === "redo" && excelRedoStack.length) {
          excelUndoStack.push(cloneExcelState());
          var nxt = excelRedoStack.pop();
          excelSheets = nxt.sheets;
          excelSheetNames = nxt.names;
          excelActiveSheet = nxt.active;
          renderExcelSheetTabsUi();
          renderExcelGrid(true);
        } else if (act === "saveCsv") {
          saveExcelAs("csv");
        }
      });
    }
    if (excelHelperToggleBtn) {
      excelHelperToggleBtn.addEventListener("click", function() {
        haptic(8);
        setExcelHelperOpen(!excelHelperOpen);
      });
    }
    if (excelHelperBar) {
      excelHelperBar.addEventListener("click", function(e) {
        var btn = e.target && e.target.closest ? e.target.closest("[data-xl-help]") : null;
        if (!btn) return;
        haptic(8);
        runExcelHelperAction(btn.getAttribute("data-xl-help"));
      });
    }
    if (pptPrevBtn) pptPrevBtn.addEventListener("click", function() {
      if (pptCurrent > 0) {
        pptCurrent--;
        renderCurrentPptSlide();
        haptic(8);
      }
    });
    if (pptNextBtn) pptNextBtn.addEventListener("click", function() {
      if (pptCurrent < pptSlides.length - 1) {
        pptCurrent++;
        renderCurrentPptSlide();
        haptic(8);
      }
    });
    if (pptNotesToggleBtn) pptNotesToggleBtn.addEventListener("click", function() {
      pptShowNotes = !pptShowNotes;
      renderCurrentPptSlide();
    });
    if (pptPresentBtn) pptPresentBtn.addEventListener("click", function() {
      pptPresentMode = !pptPresentMode;
      if (pptPresentMode && overlay.requestFullscreen) {
        try {
          overlay.requestFullscreen();
        } catch (e) {
        }
      } else if (!pptPresentMode && document.fullscreenElement && document.exitFullscreen) {
        try {
          document.exitFullscreen();
        } catch (e) {
        }
      }
      setBarsVisible(!pptPresentMode);
    });
    if (pptExportPdfBtn) pptExportPdfBtn.addEventListener("click", exportCurrentDocToPdf);
    function applyImgTransform() {
      if (imgEl) imgEl.style.transform = "scale(" + imgZoom.toFixed(2) + ") rotate(" + imgRot + "deg)";
      if (imgZoomLabel) imgZoomLabel.textContent = Math.round(imgZoom * 100) + "%";
    }
    if (imgZoomOut) imgZoomOut.addEventListener("click", function() {
      imgZoom = Math.max(0.5, imgZoom - 0.25);
      applyImgTransform();
    });
    if (imgZoomIn) imgZoomIn.addEventListener("click", function() {
      imgZoom = Math.min(3.5, imgZoom + 0.25);
      applyImgTransform();
    });
    if (imgRotateBtn) imgRotateBtn.addEventListener("click", function() {
      imgRot = (imgRot + 90) % 360;
      applyImgTransform();
    });
    if (imgToPdfBtn) imgToPdfBtn.addEventListener("click", exportCurrentDocToPdf);
    if (passCancel) passCancel.addEventListener("click", function() {
      if (passBox) passBox.classList.add("hidden");
      if (!pdfDoc) closeOverlay();
    });
    if (passSubmit && passInput) {
      var submitPwd = function() {
        if (activeBytes) openPdfDocument(activeBytes, activeFileName, passInput.value);
      };
      passSubmit.addEventListener("click", submitPwd);
      passInput.addEventListener("keydown", function(e) {
        if (e.key === "Enter") {
          e.preventDefault();
          submitPwd();
        }
      });
    }
    if (copyTextBtn) {
      copyTextBtn.addEventListener("click", function() {
        if (moreMenu) moreMenu.classList.add("hidden");
        if (activeKind === "pdf" && pdfDoc) {
          pdfDoc.getPage(currentPage).then(function(p) {
            return p.getTextContent();
          }).then(function(tc) {
            var txt = tc.items.map(function(it) {
              return it.str || "";
            }).join(" ").trim();
            if (!txt) {
              showToast("Scanned Page", "No selectable text on this page.", "info");
              return;
            }
            global.OneoraCapabilities.copyText(txt).then(function() {
              showToast("Copied!", "Page " + currentPage + " text copied.");
            });
          });
        } else if (activeKind === "word" && wordPaper) {
          global.OneoraCapabilities.copyText(wordPaper.innerText || "").then(function() {
            showToast("Copied!", "Document text copied.");
          });
        } else if (activeKind === "ppt" && pptSlides[pptCurrent]) {
          var s = pptSlides[pptCurrent];
          var t = (s.title || "") + "\n" + (s.blocks || []).map(function(b) {
            return b.text || "";
          }).join("\n");
          global.OneoraCapabilities.copyText(t).then(function() {
            showToast("Copied!", "Slide text copied.");
          });
        }
      });
    }
    if (saveVaultBtn) {
      saveVaultBtn.addEventListener("click", function() {
        if (moreMenu) moreMenu.classList.add("hidden");
        if (!activeBytes) return;
        if (typeof global.saveBlobToPdfBondhuVault === "function") {
          global.saveBlobToPdfBondhuVault(activeBytes.slice().buffer, activeFileName, activeMime, "Personal");
        } else if (global.utils && global.utils.downloadBlob) {
          global.utils.downloadBlob(new Blob([activeBytes], { type: activeMime }), activeFileName);
        }
      });
    }
    if (shareBtn) {
      shareBtn.addEventListener("click", function() {
        if (!activeBytes) return;
        haptic(10);
        var blob = new Blob([activeBytes], { type: activeMime });
        if (global.AndroidBridge && typeof global.AndroidBridge.shareBase64File === "function") {
          var rd = new FileReader();
          rd.onloadend = function() {
            var b64 = String(rd.result || "").split(",")[1] || "";
            global.AndroidBridge.shareBase64File(b64, activeFileName, activeMime);
          };
          rd.readAsDataURL(blob);
          return;
        }
        try {
          var fileObj = new File([blob], activeFileName, { type: activeMime });
          if (navigator.canShare && navigator.canShare({ files: [fileObj] })) {
            navigator.share({ title: activeFileName, files: [fileObj] }).catch(function() {
            });
            return;
          }
        } catch (e) {
        }
        if (global.utils && global.utils.downloadBlob) global.utils.downloadBlob(blob, activeFileName);
      });
    }
    if (printBtn) {
      printBtn.addEventListener("click", function() {
        if (moreMenu) moreMenu.classList.add("hidden");
        if (global.AndroidBridge && typeof global.AndroidBridge.printDocument === "function") {
          global.AndroidBridge.printDocument(activeFileName || "ONEORA-Document");
          return;
        }
        if (activeKind === "pdf" && activeBytes) {
          var url = URL.createObjectURL(new Blob([activeBytes], { type: "application/pdf" }));
          var ifr = document.createElement("iframe");
          ifr.style.display = "none";
          ifr.src = url;
          document.body.appendChild(ifr);
          ifr.onload = function() {
            try {
              ifr.contentWindow.focus();
              ifr.contentWindow.print();
            } catch (e) {
              global.print();
            }
            setTimeout(function() {
              try {
                document.body.removeChild(ifr);
              } catch (e) {
              }
              URL.revokeObjectURL(url);
            }, 6e4);
          };
        } else {
          global.print();
        }
      });
    }
    global.openExternalDocFromAndroid = function(localUrl, displayName, mimeType) {
      return fetch(localUrl, { cache: "no-store" }).then(function(resp) {
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        var hdr = resp.headers.get("content-type") || "";
        return resp.arrayBuffer().then(function(ab) {
          return openUniversalFile(new Uint8Array(ab), displayName || "Phone-Document", mimeType || hdr);
        });
      }).catch(function() {
        showToast("Open Failed", "Could not read the selected document from device.", "error");
      });
    };
    global.openExternalPdfFromAndroid = function(localUrl, displayName) {
      return global.openExternalDocFromAndroid(localUrl, displayName, "application/pdf");
    };
    [emptyState, stage].forEach(function(zone) {
      if (!zone) return;
      zone.addEventListener("dragover", function(e) {
        e.preventDefault();
      });
      zone.addEventListener("drop", function(e) {
        e.preventDefault();
        var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) handlePickedFile(f);
      });
    });
    var resTimer = null;
    global.addEventListener("resize", function() {
      if (activeKind !== "pdf" || !pdfDoc || overlay.classList.contains("hidden")) return;
      clearTimeout(resTimer);
      resTimer = setTimeout(function() {
        renderPdfLayout(true);
      }, 220);
    });
    renderRecentFilesList();
    global.OneoraUniversalReader.openFile = function(file, opts) {
      return handlePickedFile(file).then(function() {
        if (opts && opts.openExcelHelper && activeKind === "excel") {
          setExcelEditMode(true);
          setExcelHelperOpen(true);
        }
      });
    };
    global.OneoraUniversalReader.createBlankExcel = createBlankExcelDocument;
    global.OneoraUniversalReader.setExcelHelperOpen = setExcelHelperOpen;
  }
  global.OneoraUniversalReader = {
    init: initUniversalReader
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initUniversalReader);
  } else {
    initUniversalReader();
  }
})(window);
