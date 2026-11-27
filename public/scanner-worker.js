/* ==========================================================================
   ONEORA — High-Precision Offline Document Scanner Web Worker (Pure ES2017)
   - Document edge detection (background chroma + Sobel + largest convex quad)
   - Ignores table/background, computes auto-straighten angle
   - Exact inverse homography perspective warp at >= 2400px off the main thread
   - Hue-preserving filters: Original (default), Magic Colour, Grayscale, B&W
   ========================================================================== */
'use strict';

function orderPoints(pts) {
  var arr = pts.map(function (p) { return { x: p.x, y: p.y }; });
  arr.sort(function (a, b) { return (a.x + a.y) - (b.x + b.y); });
  var tl = arr[0];
  var br = arr[3];
  var remain = [arr[1], arr[2]];
  remain.sort(function (a, b) { return (a.x - a.y) - (b.x - b.y); });
  var bl = remain[0];
  var tr = remain[1];
  return [tl, tr, br, bl];
}

function cross2D(o, a, b) {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

function convexHull(points) {
  if (points.length <= 3) return points.slice();
  var pts = points.slice().sort(function (a, b) {
    return a.x === b.x ? a.y - b.y : a.x - b.x;
  });
  var lower = [];
  for (var i = 0; i < pts.length; i++) {
    while (lower.length >= 2 && cross2D(lower[lower.length - 2], lower[lower.length - 1], pts[i]) <= 0) {
      lower.pop();
    }
    lower.push(pts[i]);
  }
  var upper = [];
  for (var j = pts.length - 1; j >= 0; j--) {
    while (upper.length >= 2 && cross2D(upper[upper.length - 2], upper[upper.length - 1], pts[j]) <= 0) {
      upper.pop();
    }
    upper.push(pts[j]);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

function quadArea(pts) {
  var area = 0;
  for (var i = 0; i < pts.length; i++) {
    var j = (i + 1) % pts.length;
    area += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return Math.abs(area) * 0.5;
}

function solveLinear8(A, b) {
  var n = 8;
  var M = [];
  for (var r = 0; r < n; r++) {
    M.push(A[r].slice().concat([b[r]]));
  }
  for (var col = 0; col < n; col++) {
    var maxRow = col;
    for (var row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row;
    }
    var tmp = M[col];
    M[col] = M[maxRow];
    M[maxRow] = tmp;
    var pivot = M[col][col];
    if (Math.abs(pivot) < 1e-10) return null;
    for (var j = col; j <= n; j++) M[col][j] /= pivot;
    for (var r2 = 0; r2 < n; r2++) {
      if (r2 === col) continue;
      var factor = M[r2][col];
      for (var j2 = col; j2 <= n; j2++) M[r2][j2] -= factor * M[col][j2];
    }
  }
  var sol = new Array(n);
  for (var k = 0; k < n; k++) sol[k] = M[k][n];
  return sol;
}

// Compute best 4 corners from a convex hull by finding extreme projections + greedy area maximization
function simplifyHullToQuad(hull) {
  if (hull.length < 4) return null;
  if (hull.length === 4) return orderPoints(hull);

  // Pick 4 initial corners using extreme diagonal sums/diffs
  var tl = hull[0], tr = hull[0], br = hull[0], bl = hull[0];
  for (var i = 0; i < hull.length; i++) {
    var p = hull[i];
    if (p.x + p.y < tl.x + tl.y) tl = p;
    if (p.x + p.y > br.x + br.y) br = p;
    if (p.x - p.y > tr.x - tr.y) tr = p;
    if (p.x - p.y < bl.x - bl.y) bl = p;
  }
  var best = [tl, tr, br, bl];
  var bestArea = quadArea(best);

  // Refine each vertex along hull to maximize enclosed quadrilateral area (3 passes)
  for (var pass = 0; pass < 3; pass++) {
    for (var k = 0; k < 4; k++) {
      for (var h = 0; h < hull.length; h++) {
        var cand = best.slice();
        cand[k] = hull[h];
        var a = quadArea(cand);
        if (a > bestArea) {
          bestArea = a;
          best = cand;
        }
      }
    }
  }
  return orderPoints(best);
}

// Detect ONLY the document page edges (rejects surrounding table/desk & interior text)
function detectDocumentQuad(rgba, w, h) {
  var total = w * h;
  var lum = new Float32Array(total);
  var rArr = new Float32Array(total);
  var gArr = new Float32Array(total);
  var bArr = new Float32Array(total);

  // 1. Sample outer border ring (3.5% margin) to model table/background color
  var bgR = 0, bgG = 0, bgB = 0, bgL = 0, bgCnt = 0;
  var bx = Math.max(2, Math.floor(w * 0.035));
  var by = Math.max(2, Math.floor(h * 0.035));

  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      var idx = y * w + x;
      var o = idx * 4;
      var r = rgba[o];
      var g = rgba[o + 1];
      var b = rgba[o + 2];
      var l = r * 0.299 + g * 0.587 + b * 0.114;
      rArr[idx] = r;
      gArr[idx] = g;
      bArr[idx] = b;
      lum[idx] = l;
      if (x < bx || x >= w - bx || y < by || y >= h - by) {
        bgR += r; bgG += g; bgB += b; bgL += l; bgCnt++;
      }
    }
  }
  if (bgCnt > 0) {
    bgR /= bgCnt; bgG /= bgCnt; bgB /= bgCnt; bgL /= bgCnt;
  }

  // 2. Sample central 40% region as document interior prior
  var fgR = 0, fgG = 0, fgB = 0, fgL = 0, fgCnt = 0;
  var cx0 = Math.floor(w * 0.30), cx1 = Math.floor(w * 0.70);
  var cy0 = Math.floor(h * 0.30), cy1 = Math.floor(h * 0.70);
  for (var cy = cy0; cy < cy1; cy++) {
    for (var cx = cx0; cx < cx1; cx++) {
      var cidx = cy * w + cx;
      fgR += rArr[cidx]; fgG += gArr[cidx]; fgB += bArr[cidx]; fgL += lum[cidx]; fgCnt++;
    }
  }
  if (fgCnt > 0) {
    fgR /= fgCnt; fgG /= fgCnt; fgB /= fgCnt; fgL /= fgCnt;
  }

  // 3. Build foreground document score map (color distance from table + closeness to paper)
  var bgFgDist = Math.sqrt(
    (fgR - bgR) * (fgR - bgR) +
    (fgG - bgG) * (fgG - bgG) +
    (fgB - bgB) * (fgB - bgB)
  );

  // 4. 3x3 box blur luminance for Sobel edge detection
  var blur = new Float32Array(total);
  for (var y2 = 1; y2 < h - 1; y2++) {
    for (var x2 = 1; x2 < w - 1; x2++) {
      var i2 = y2 * w + x2;
      blur[i2] = (
        lum[i2 - w - 1] + lum[i2 - w] * 2 + lum[i2 - w + 1] +
        lum[i2 - 1] * 2 + lum[i2] * 4 + lum[i2 + 1] * 2 +
        lum[i2 + w - 1] + lum[i2 + w] * 2 + lum[i2 + w + 1]
      ) / 16;
    }
  }

  var grad = new Float32Array(total);
  var maxGrad = 1;
  for (var y3 = 2; y3 < h - 2; y3++) {
    for (var x3 = 2; x3 < w - 2; x3++) {
      var i3 = y3 * w + x3;
      var gx = -blur[i3 - w - 1] + blur[i3 - w + 1] - 2 * blur[i3 - 1] + 2 * blur[i3 + 1] - blur[i3 + w - 1] + blur[i3 + w + 1];
      var gy = -blur[i3 - w - 1] - 2 * blur[i3 - w] - blur[i3 - w + 1] + blur[i3 + w - 1] + 2 * blur[i3 + w] + blur[i3 + w + 1];
      var mag = Math.sqrt(gx * gx + gy * gy);
      grad[i3] = mag;
      if (mag > maxGrad) maxGrad = mag;
    }
  }

  var candidates = [];

  // Method A: Paper-vs-Table foreground mask + largest connected component convex hull
  if (bgFgDist > 24) {
    var mask = new Uint8Array(total);
    for (var p = 0; p < total; p++) {
      var dBg = Math.sqrt(
        (rArr[p] - bgR) * (rArr[p] - bgR) +
        (gArr[p] - bgG) * (gArr[p] - bgG) +
        (bArr[p] - bgB) * (bArr[p] - bgB)
      );
      var dFg = Math.sqrt(
        (rArr[p] - fgR) * (rArr[p] - fgR) +
        (gArr[p] - fgG) * (gArr[p] - fgG) +
        (bArr[p] - fgB) * (bArr[p] - fgB)
      );
      // Pixel belongs to document if closer to paper tone or bright low-saturation interior
      var isBrightNeutral = lum[p] > Math.max(125, bgL + 18) && (Math.max(rArr[p], gArr[p], bArr[p]) - Math.min(rArr[p], gArr[p], bArr[p])) < 55;
      if (dBg > bgFgDist * 0.44 && (dFg < dBg * 1.15 || isBrightNeutral)) {
        mask[p] = 1;
      }
    }

    // Flood-fill largest connected component (BFS) to discard stray desk highlights
    var visited = new Uint8Array(total);
    var bestComp = null;
    var bestCount = 0;
    var queue = new Int32Array(total);
    var step = 2;
    for (var sy = by; sy < h - by; sy += step) {
      for (var sx = bx; sx < w - bx; sx += step) {
        var startIdx = sy * w + sx;
        if (!mask[startIdx] || visited[startIdx]) continue;
        var head = 0, tail = 0;
        queue[tail++] = startIdx;
        visited[startIdx] = 1;
        var boundaryPts = [];
        var count = 0;
        while (head < tail) {
          var cur = queue[head++];
          count++;
          var cxp = cur % w;
          var cyp = (cur - cxp) / w;
          var isEdge = false;
          var nbs = [cur - 1, cur + 1, cur - w, cur + w];
          for (var nb = 0; nb < 4; nb++) {
            var ni = nbs[nb];
            var nx = ni % w;
            var ny = (ni - nx) / w;
            if (nx <= 0 || nx >= w - 1 || ny <= 0 || ny >= h - 1 || !mask[ni]) {
              isEdge = true;
            } else if (!visited[ni]) {
              visited[ni] = 1;
              queue[tail++] = ni;
            }
          }
          if (isEdge && (count % 2 === 0)) {
            boundaryPts.push({ x: cxp, y: cyp });
          }
        }
        if (count > bestCount) {
          bestCount = count;
          bestComp = boundaryPts;
        }
      }
    }

    if (bestComp && bestCount > total * 0.14 && bestCount < total * 0.96 && bestComp.length >= 16) {
      var hullA = convexHull(bestComp);
      var quadA = simplifyHullToQuad(hullA);
      if (quadA) {
        candidates.push(quadA);
      }
    }
  }

  // Method B: Strong outer Sobel edge hull (handles white paper on light table with shadow border)
  var edgeThresh = Math.max(28, maxGrad * 0.22);
  var edgePts = [];
  for (var ey = by; ey < h - by; ey += 2) {
    for (var ex = bx; ex < w - bx; ex += 2) {
      if (grad[ey * w + ex] >= edgeThresh) {
        edgePts.push({ x: ex, y: ey });
      }
    }
  }
  if (edgePts.length >= 24) {
    var hullB = convexHull(edgePts);
    var quadB = simplifyHullToQuad(hullB);
    if (quadB) {
      candidates.push(quadB);
    }
  }

  // Score candidate quads by area ratio, convexity, aspect sanity, and edge gradient support
  function scoreQuad(q) {
    var area = quadArea(q);
    var areaRatio = area / total;
    if (areaRatio < 0.16 || areaRatio > 0.96) return -1;

    var wTop = Math.hypot(q[1].x - q[0].x, q[1].y - q[0].y);
    var wBot = Math.hypot(q[2].x - q[3].x, q[2].y - q[3].y);
    var hLeft = Math.hypot(q[3].x - q[0].x, q[3].y - q[0].y);
    var hRight = Math.hypot(q[2].x - q[1].x, q[2].y - q[1].y);
    var minSide = Math.min(wTop, wBot, hLeft, hRight);
    if (minSide < Math.min(w, h) * 0.22) return -1;

    // Sample gradient along all 4 sides
    var sideSupport = 0;
    var samples = 24;
    for (var s = 0; s < 4; s++) {
      var p0 = q[s];
      var p1 = q[(s + 1) % 4];
      var hits = 0;
      for (var t = 1; t < samples; t++) {
        var frac = t / samples;
        var sx = Math.round(p0.x + (p1.x - p0.x) * frac);
        var sy = Math.round(p0.y + (p1.y - p0.y) * frac);
        var bestLocal = 0;
        for (var dy = -2; dy <= 2; dy++) {
          for (var dx = -2; dx <= 2; dx++) {
            var nx = Math.max(0, Math.min(w - 1, sx + dx));
            var ny = Math.max(0, Math.min(h - 1, sy + dy));
            if (grad[ny * w + nx] > bestLocal) bestLocal = grad[ny * w + nx];
          }
        }
        if (bestLocal >= edgeThresh * 0.65) hits++;
      }
      sideSupport += hits / (samples - 1);
    }
    sideSupport /= 4;

    var symmetry = 1 - Math.abs(wTop - wBot) / Math.max(1, Math.max(wTop, wBot)) * 0.45
                     - Math.abs(hLeft - hRight) / Math.max(1, Math.max(hLeft, hRight)) * 0.45;
    return areaRatio * 0.55 + sideSupport * 0.35 + Math.max(0.2, symmetry) * 0.1;
  }

  var bestQuad = null;
  var bestScore = -1;
  for (var c = 0; c < candidates.length; c++) {
    var sc = scoreQuad(candidates[c]);
    if (sc > bestScore) {
      bestScore = sc;
      bestQuad = candidates[c];
    }
  }

  var normCorners;
  if (bestQuad) {
    normCorners = bestQuad.map(function (pt) {
      return {
        x: Math.max(0, Math.min(1, pt.x / w)),
        y: Math.max(0, Math.min(1, pt.y / h))
      };
    });
  } else {
    normCorners = [
      { x: 0.04, y: 0.04 },
      { x: 0.96, y: 0.04 },
      { x: 0.96, y: 0.96 },
      { x: 0.04, y: 0.96 }
    ];
  }

  // Estimate document skew angle in degrees from top & bottom edge vectors
  var topAngle = Math.atan2(normCorners[1].y - normCorners[0].y, normCorners[1].x - normCorners[0].x) * 180 / Math.PI;
  var botAngle = Math.atan2(normCorners[2].y - normCorners[3].y, normCorners[2].x - normCorners[3].x) * 180 / Math.PI;
  var skewDeg = Math.round(((topAngle + botAngle) * 0.5) * 10) / 10;

  return {
    corners: normCorners,
    detected: Boolean(bestQuad),
    skewDeg: skewDeg
  };
}

// Perspective warp (bilinear interpolation) off the main thread
function warpPerspective(srcRgba, sw, sh, corners, outW, outH) {
  var pts = orderPoints(corners.map(function (c) {
    return {
      x: Math.max(0, Math.min(sw - 1, c.x * sw)),
      y: Math.max(0, Math.min(sh - 1, c.y * sh))
    };
  }));

  var dstPts = [
    { x: 0, y: 0 },
    { x: outW - 1, y: 0 },
    { x: outW - 1, y: outH - 1 },
    { x: 0, y: outH - 1 }
  ];

  var A = [];
  var b = [];
  for (var i = 0; i < 4; i++) {
    var dx = dstPts[i].x;
    var dy = dstPts[i].y;
    var sx = pts[i].x;
    var sy = pts[i].y;
    A.push([dx, dy, 1, 0, 0, 0, -dx * sx, -dy * sx]);
    b.push(sx);
    A.push([0, 0, 0, dx, dy, 1, -dx * sy, -dy * sy]);
    b.push(sy);
  }

  var h = solveLinear8(A, b);
  var out = new Uint8ClampedArray(outW * outH * 4);
  if (!h) {
    return out;
  }

  var h0 = h[0], h1 = h[1], h2 = h[2], h3 = h[3], h4 = h[4], h5 = h[5], h6 = h[6], h7 = h[7];
  var maxX = sw - 2;
  var maxY = sh - 2;

  for (var y = 0; y < outH; y++) {
    var rowBase = y * outW * 4;
    for (var x = 0; x < outW; x++) {
      var denom = h6 * x + h7 * y + 1;
      var ux = (h0 * x + h1 * y + h2) / denom;
      var uy = (h3 * x + h4 * y + h5) / denom;

      var x0 = ux < 0 ? 0 : ux > maxX ? maxX : (ux | 0);
      var y0 = uy < 0 ? 0 : uy > maxY ? maxY : (uy | 0);
      var fx = ux - x0; if (fx < 0) fx = 0; else if (fx > 1) fx = 1;
      var fy = uy - y0; if (fy < 0) fy = 0; else if (fy > 1) fy = 1;

      var idx00 = (y0 * sw + x0) * 4;
      var idx10 = idx00 + 4;
      var idx01 = idx00 + sw * 4;
      var idx11 = idx01 + 4;

      var w00 = (1 - fx) * (1 - fy);
      var w10 = fx * (1 - fy);
      var w01 = (1 - fx) * fy;
      var w11 = fx * fy;

      var oi = rowBase + x * 4;
      out[oi]     = srcRgba[idx00]     * w00 + srcRgba[idx10]     * w10 + srcRgba[idx01]     * w01 + srcRgba[idx11]     * w11;
      out[oi + 1] = srcRgba[idx00 + 1] * w00 + srcRgba[idx10 + 1] * w10 + srcRgba[idx01 + 1] * w01 + srcRgba[idx11 + 1] * w11;
      out[oi + 2] = srcRgba[idx00 + 2] * w00 + srcRgba[idx10 + 2] * w10 + srcRgba[idx01 + 2] * w01 + srcRgba[idx11 + 2] * w11;
      out[oi + 3] = 255;
    }
  }
  return out;
}

// Fast local luminance background map (preserves RGB hue — divides ONLY luminance, never distorts green/blue ink!)
function estimateLuminanceBackground(rgba, w, h) {
  var scale = Math.min(1, 72 / Math.max(w, h));
  var bw = Math.max(12, Math.round(w * scale));
  var bh = Math.max(12, Math.round(h * scale));
  var small = new Float32Array(bw * bh);

  for (var sy = 0; sy < bh; sy++) {
    var oy = Math.min(h - 1, Math.floor(sy / scale));
    for (var sx = 0; sx < bw; sx++) {
      var ox = Math.min(w - 1, Math.floor(sx / scale));
      var o = (oy * w + ox) * 4;
      small[sy * bw + sx] = rgba[o] * 0.299 + rgba[o + 1] * 0.587 + rgba[o + 2] * 0.114;
    }
  }

  // Morphological max (radius 3) + 3x3 smooth blur estimates paper brightness under shadows
  var hMax = new Float32Array(bw * bh);
  var vMax = new Float32Array(bw * bh);
  var rad = 3;
  for (var y = 0; y < bh; y++) {
    for (var x = 0; x < bw; x++) {
      var m = 0;
      for (var k = -rad; k <= rad; k++) {
        var nx = x + k < 0 ? 0 : x + k >= bw ? bw - 1 : x + k;
        var val = small[y * bw + nx];
        if (val > m) m = val;
      }
      hMax[y * bw + x] = m;
    }
  }
  for (var y2 = 0; y2 < bh; y2++) {
    for (var x2 = 0; x2 < bw; x2++) {
      var m2 = 0;
      for (var k2 = -rad; k2 <= rad; k2++) {
        var ny = y2 + k2 < 0 ? 0 : y2 + k2 >= bh ? bh - 1 : y2 + k2;
        var val2 = hMax[ny * bw + x2];
        if (val2 > m2) m2 = val2;
      }
      vMax[y2 * bw + x2] = m2;
    }
  }
  var smooth = new Float32Array(bw * bh);
  for (var y3 = 0; y3 < bh; y3++) {
    for (var x3 = 0; x3 < bw; x3++) {
      var sum = 0, cnt = 0;
      for (var dy = -2; dy <= 2; dy++) {
        var ny3 = y3 + dy < 0 ? 0 : y3 + dy >= bh ? bh - 1 : y3 + dy;
        for (var dx = -2; dx <= 2; dx++) {
          var nx3 = x3 + dx < 0 ? 0 : x3 + dx >= bw ? bw - 1 : x3 + dx;
          sum += vMax[ny3 * bw + nx3];
          cnt++;
        }
      }
      smooth[y3 * bw + x3] = sum / cnt;
    }
  }
  return { map: smooth, bw: bw, bh: bh };
}

function sampleBg(bg, x, y, w, h) {
  var fx = (x / Math.max(1, w - 1)) * (bg.bw - 1);
  var fy = (y / Math.max(1, h - 1)) * (bg.bh - 1);
  var x0 = Math.floor(fx);
  var y0 = Math.floor(fy);
  var x1 = Math.min(bg.bw - 1, x0 + 1);
  var y1 = Math.min(bg.bh - 1, y0 + 1);
  var tx = fx - x0;
  var ty = fy - y0;
  var v00 = bg.map[y0 * bg.bw + x0];
  var v10 = bg.map[y0 * bg.bw + x1];
  var v01 = bg.map[y1 * bg.bw + x0];
  var v11 = bg.map[y1 * bg.bw + x1];
  return (v00 * (1 - tx) + v10 * tx) * (1 - ty) + (v01 * (1 - tx) + v11 * tx) * ty;
}

// Hue-preserving filter processor
function enhanceRgba(rgba, w, h, filterMode, bright, contr, sharp) {
  var out = new Uint8ClampedArray(rgba);
  if (filterMode === 'original' && !bright && !contr && !sharp) {
    return out;
  }

  var needsBg = filterMode === 'magic' || filterMode === 'bw' || filterMode === 'gray' || filterMode === 'autopro' || filterMode === 'whiteboard';
  var bg = needsBg ? estimateLuminanceBackground(out, w, h) : null;
  var contrastFactor = (259 * (contr * 2.1 + 255)) / (255 * (259 - contr * 2.1));
  var brightOffset = bright * 1.5;

  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      var i = (y * w + x) * 4;
      var r = out[i];
      var g = out[i + 1];
      var b = out[i + 2];

      if (filterMode === 'magic' || filterMode === 'autopro') {
        // Hue-preserving mild shadow removal & contrast boost:
        // Scales ALL 3 channels by the SAME scalar luminance gain so green signatures & blue ink keep exact hue!
        var lum = r * 0.299 + g * 0.587 + b * 0.114;
        var bgLum = Math.max(60, sampleBg(bg, x, y, w, h));
        // Gentle shadow lift (blend 58% normalized + 42% original)
        var targetGain = Math.min(1.85, 246 / bgLum);
        var gain = 1 + (targetGain - 1) * 0.62;
        var nr = Math.min(255, r * gain);
        var ng = Math.min(255, g * gain);
        var nb = Math.min(255, b * gain);

        // Mild paper white cleanup ONLY on very light, low-saturation paper pixels (never touches colored ink!)
        var maxC = Math.max(nr, ng, nb);
        var minC = Math.min(nr, ng, nb);
        var sat = maxC > 0 ? (maxC - minC) / maxC : 0;
        var nLum = nr * 0.299 + ng * 0.587 + nb * 0.114;
        if (nLum > 218 && sat < 0.16) {
          var t = Math.min(1, (nLum - 218) / 30);
          nr = nr + (255 - nr) * t * 0.85;
          ng = ng + (255 - ng) * t * 0.85;
          nb = nb + (255 - nb) * t * 0.85;
        } else {
          // Gentle contrast curve around midpoint preserving channel ratios
          nr = 128 + (nr - 128) * 1.08;
          ng = 128 + (ng - 128) * 1.08;
          nb = 128 + (nb - 128) * 1.08;
        }
        r = nr; g = ng; b = nb;
      } else if (filterMode === 'gray') {
        var gLum = r * 0.299 + g * 0.587 + b * 0.114;
        var gBg = Math.max(48, sampleBg(bg, x, y, w, h));
        var gv = Math.min(255, (gLum / gBg) * 248);
        gv = gv > 228 ? 255 : Math.max(0, 128 + (gv - 128) * 1.12);
        r = g = b = gv;
      } else if (filterMode === 'bw') {
        var bwLum = r * 0.299 + g * 0.587 + b * 0.114;
        var bwBg = Math.max(40, sampleBg(bg, x, y, w, h));
        var ratio = bwLum / bwBg;
        var v;
        if (ratio >= 0.85) v = 255;
        else if (ratio <= 0.62) v = 12;
        else v = ((ratio - 0.62) / 0.23) * 243 + 12;
        r = g = b = v;
      }

      if (bright !== 0 || contr !== 0) {
        r = contrastFactor * (r + brightOffset - 128) + 128;
        g = contrastFactor * (g + brightOffset - 128) + 128;
        b = contrastFactor * (b + brightOffset - 128) + 128;
      }

      out[i]     = r < 0 ? 0 : r > 255 ? 255 : r;
      out[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
      out[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
      out[i + 3] = 255;
    }
  }

  // Mild unsharp mask if sharpness > 0
  if (sharp > 0) {
    var amt = (sharp / 100) * 0.55;
    var src = new Uint8ClampedArray(out);
    for (var sy = 1; sy < h - 1; sy++) {
      for (var sx = 1; sx < w - 1; sx++) {
        var idx = (sy * w + sx) * 4;
        var top = idx - w * 4;
        var bot = idx + w * 4;
        for (var ch = 0; ch < 3; ch++) {
          var center = src[idx + ch];
          var blurVal = (src[top + ch] + src[bot + ch] + src[idx - 4 + ch] + src[idx + 4 + ch]) * 0.25;
          var sharpened = center + (center - blurVal) * amt;
          out[idx + ch] = sharpened < 0 ? 0 : sharpened > 255 ? 255 : sharpened;
        }
      }
    }
  }

  return out;
}

self.onmessage = function (e) {
  var msg = e.data || {};
  var id = msg.id;
  try {
    if (msg.type === 'detectEdges') {
      var rgba = new Uint8ClampedArray(msg.buffer);
      var res = detectDocumentQuad(rgba, msg.width, msg.height);
      self.postMessage({ id: id, ok: true, result: res });
    } else if (msg.type === 'warpAndEnhance') {
      var src = new Uint8ClampedArray(msg.buffer);
      var warped = msg.skipWarp
        ? src
        : warpPerspective(src, msg.srcWidth, msg.srcHeight, msg.corners, msg.outWidth, msg.outHeight);
      var finalRgba = enhanceRgba(
        warped,
        msg.skipWarp ? msg.srcWidth : msg.outWidth,
        msg.skipWarp ? msg.srcHeight : msg.outHeight,
        msg.filter || 'original',
        Number(msg.brightness) || 0,
        Number(msg.contrast) || 0,
        Number(msg.sharpness) || 0
      );
      self.postMessage(
        {
          id: id,
          ok: true,
          width: msg.skipWarp ? msg.srcWidth : msg.outWidth,
          height: msg.skipWarp ? msg.srcHeight : msg.outHeight,
          buffer: finalRgba.buffer
        },
        [finalRgba.buffer]
      );
    } else {
      self.postMessage({ id: id, ok: false, error: 'Unknown worker command: ' + msg.type });
    }
  } catch (err) {
    self.postMessage({ id: id, ok: false, error: err && err.message ? err.message : String(err) });
  }
};
