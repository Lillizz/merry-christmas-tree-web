(function (global) {
  'use strict';

  var CHAR_RAMP = ['.', ',', ':', ';', '~', '+', '*', '^', '#'];

  var THEME_PALETTES = {
    classic: {
      leaf: ['#0a2e1d', '#10472c', '#18663f', '#228753', '#36a86d'],
      core: '#072215',
      garland: '#eab308',
    },
    'snow-white': {
      leaf: ['#334155', '#64748b', '#94a3b8', '#cbd5e1', '#f8fafc'],
      core: '#1e293b',
      garland: '#bae6fd',
    },
    aurora: {
      leaf: ['#083344', '#0e7490', '#14b8a6', '#2dd4bf', '#a5f3fc'],
      core: '#062634',
      garland: '#fde047',
    },
    'rose-winter': {
      leaf: ['#4c0519', '#881337', '#be123c', '#fb7185', '#fecdd3'],
      core: '#350412',
      garland: '#fde68a',
    },
    champagne: {
      leaf: ['#422006', '#713f12', '#a16207', '#eab308', '#fef08a'],
      core: '#2d1504',
      garland: '#ffffff',
    },
  };

  var DEFAULT_LIGHTS = [
    { color: '#fbbf24', symbol: '★' },
    { color: '#38bdf8', symbol: '❄' },
    { color: '#34d399', symbol: '✦' },
    { color: '#fb7185', symbol: '♦' },
    { color: '#c084fc', symbol: '♪' },
    { color: '#fbbf24', symbol: '✦' },
    { color: '#38bdf8', symbol: '★' },
    { color: '#34d399', symbol: '❄' },
    { color: '#fb7185', symbol: '✦' },
  ];

  var BOX_RED_PALETTE = ['#7f1d1d', '#991b1b', '#dc2626', '#ef4444'];
  var BOX_CHAR_RAMP = [':', '+', '*', '#'];
  var RIBBON_GOLD_PALETTE = ['#d97706', '#f59e0b', '#fbbf24', '#fef08a'];

  var LIGHT_DIR = (function () {
    var lx = -0.35;
    var ly = -0.75;
    var lz = 0.55;
    var len = Math.hypot(lx, ly, lz);
    return { x: lx / len, y: ly / len, z: lz / len };
  })();

  function buildHighDensityPinePoints() {
    var pts = [];
    var tiers = 5;
    var layers = 92;

    for (var l = 0; l < layers; l++) {
      var t = 0.02 + (l / (layers - 1)) * 0.96;
      var y = -0.92 + t * 1.62;
      var scaled = t * tiers;
      var localT = scaled - Math.floor(scaled);
      var tierIdx = Math.min(tiers - 1, Math.floor(scaled));

      var baseRadius = Math.pow(t, 1.06) * 0.72;
      var tierFlare = 0.56 + 0.5 * Math.pow(localT, 0.82);
      var radius = baseRadius * tierFlare;

      var ringCount = Math.max(8, Math.floor(10 + radius * 56 + t * t * 18));
      for (var i = 0; i < ringCount; i++) {
        var theta = (i / ringCount) * Math.PI * 2 + l * 0.37 + tierIdx * 0.55;
        var jitter = 0.94 + 0.12 * Math.sin(i * 3.1 + l);
        var r = radius * jitter;
        pts.push({
          x: Math.cos(theta) * r,
          y: y + (localT > 0.85 ? 0.012 : 0),
          z: Math.sin(theta) * r,
          kind: 'leaf',
          t: t,
          isTip: localT > 0.82,
          phase: l * 0.35 + i * 0.6,
        });
      }
    }

    for (var c = 0; c < 420; c++) {
      var ct = 0.08 + Math.pow(c / 419, 0.72) * 0.9;
      var cy = -0.9 + ct * 1.6;
      var cScaled = ct * tiers;
      var cLocalT = cScaled - Math.floor(cScaled);
      var maxR =
        Math.pow(ct, 1.06) * 0.72 * (0.56 + 0.5 * Math.pow(cLocalT, 0.82));
      var cr = maxR * (0.28 + ((c * 7) % 10) * 0.064);
      var cTheta = c * 2.39996323;
      pts.push({
        x: Math.cos(cTheta) * cr,
        y: cy,
        z: Math.sin(cTheta) * cr,
        kind: 'core',
        t: ct,
        phase: c * 0.4,
      });
    }

    for (var b = 0; b < 60; b++) {
      var bt = 0.9 + (b / 59) * 0.08;
      var by = -0.9 + bt * 1.6;
      var br = 0.15 + ((b * 11) % 10) * 0.05;
      var bTheta = b * 2.39996323 + 0.3;
      pts.push({
        x: Math.cos(bTheta) * br,
        y: by,
        z: Math.sin(bTheta) * br,
        kind: 'core',
        t: bt,
        phase: b * 0.25,
      });
    }

    for (var strand = 0; strand < 2; strand++) {
      var offset = strand * Math.PI;
      for (var g = 0; g < 92; g++) {
        var gt = 0.06 + (g / 91) * 0.91;
        var gy = -0.9 + gt * 1.6;
        var gScaled = gt * tiers;
        var gLocalT = gScaled - Math.floor(gScaled);
        var gr =
          Math.pow(gt, 1.06) * 0.73 * (0.6 + 0.46 * Math.pow(gLocalT, 0.82)) +
          0.022;
        var gTheta = gt * Math.PI * 10 + offset;
        pts.push({
          x: Math.cos(gTheta) * gr,
          y: gy,
          z: Math.sin(gTheta) * gr,
          kind: 'garland',
          t: gt,
          phase: g * 0.32 + strand * 1.9,
        });
      }
    }

    for (var row = 0; row < 6; row++) {
      var ty = 0.72 + row * 0.035;
      for (var ti = 0; ti < 10; ti++) {
        var tTheta = (ti / 10) * Math.PI * 2 + row * 0.2;
        pts.push({
          x: Math.cos(tTheta) * 0.088,
          y: ty,
          z: Math.sin(tTheta) * 0.088,
          kind: 'trunk',
          t: 1,
          phase: 0,
        });
      }
    }

    for (var h = 0; h < 44; h++) {
      var hTheta = (h / 44) * Math.PI * 2;
      pts.push({
        x: Math.cos(hTheta) * 0.84,
        y: 0.92,
        z: Math.sin(hTheta) * 0.84,
        kind: 'halo',
        t: h / 44,
        phase: h * 0.28,
      });
    }

    return pts;
  }

  function buildDenseGiftCubePoints() {
    var pts = [];
    var bw = 0.5;
    var lw = 0.56;
    var yBot = 0.54;
    var yBodyTop = -0.32;
    var yLidBot = -0.32;
    var yLidTop = -0.54;

    function sample(count, min, max) {
      var arr = [];
      for (var i = 0; i < count; i++) {
        arr.push(min + (i / (count - 1)) * (max - min));
      }
      return arr;
    }

    var u7 = sample(7, -bw, bw);
    var vBody7 = sample(7, yBodyTop, yBot);
    var l7 = sample(7, -lw, lw);
    var vLid3 = sample(3, yLidTop, yLidBot);

    u7.forEach(function (u) {
      vBody7.forEach(function (v) {
        var isRib = Math.abs(u) <= 0.11;
        var kind = isRib ? 'ribbon' : 'box';
        var off = isRib ? 0.015 : 0;
        pts.push({ x: u, y: v, z: bw + off, nx: 0, ny: 0, nz: 1, kind: kind, phase: u + v });
        pts.push({ x: u, y: v, z: -bw - off, nx: 0, ny: 0, nz: -1, kind: kind, phase: u - v });
        pts.push({ x: bw + off, y: v, z: u, nx: 1, ny: 0, nz: 0, kind: kind, phase: v + u });
        pts.push({ x: -bw - off, y: v, z: u, nx: -1, ny: 0, nz: 0, kind: kind, phase: v - u });
      });
    });

    u7.forEach(function (x) {
      u7.forEach(function (z) {
        var isRib = Math.abs(x) <= 0.11 || Math.abs(z) <= 0.11;
        pts.push({
          x: x,
          y: yBot,
          z: z,
          nx: 0,
          ny: 1,
          nz: 0,
          kind: isRib ? 'ribbon' : 'box',
          phase: x + z,
        });
      });
    });

    l7.forEach(function (x) {
      l7.forEach(function (z) {
        var isRib = Math.abs(x) <= 0.11 || Math.abs(z) <= 0.11;
        pts.push({
          x: x,
          y: yLidTop - (isRib ? 0.012 : 0),
          z: z,
          nx: 0,
          ny: -1,
          nz: 0,
          kind: isRib ? 'ribbon' : 'lid',
          phase: x * 1.5 + z,
        });
      });
    });

    l7.forEach(function (u) {
      vLid3.forEach(function (v) {
        var isRib = Math.abs(u) <= 0.11;
        var kind = isRib ? 'ribbon' : 'lid';
        var off = isRib ? 0.015 : 0;
        pts.push({ x: u, y: v, z: lw + off, nx: 0, ny: 0, nz: 1, kind: kind, phase: u });
        pts.push({ x: u, y: v, z: -lw - off, nx: 0, ny: 0, nz: -1, kind: kind, phase: u });
        pts.push({ x: lw + off, y: v, z: u, nx: 1, ny: 0, nz: 0, kind: kind, phase: u });
        pts.push({ x: -lw - off, y: v, z: u, nx: -1, ny: 0, nz: 0, kind: kind, phase: u });
      });
    });

    pts.push({
      x: 0,
      y: yLidTop - 0.1,
      z: 0,
      nx: 0,
      ny: -1,
      nz: 0,
      kind: 'bowCenter',
      alwaysVisible: true,
      phase: 0,
    });

    var dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    for (var d = 0; d < dirs.length; d++) {
      var dx = dirs[d][0];
      var dz = dirs[d][1];
      for (var k = 1; k <= 6; k++) {
        var s = k / 6;
        var rad = s * 0.29;
        var arch = Math.sin(s * Math.PI) * 0.17;
        pts.push({
          x: dx * rad,
          y: yLidTop - 0.04 - arch,
          z: dz * rad,
          nx: 0,
          ny: -1,
          nz: 0,
          kind: 'bowWing',
          alwaysVisible: true,
          phase: d * 1.1 + k * 0.4,
        });
      }
    }

    return pts;
  }

  function buildUserSymbolPoints(lights) {
    var count = lights.length;
    if (!count) return [];
    var goldenAngle = 2.39996323;
    var tiers = 5;

    return lights.map(function (light, i) {
      var t = 0.14 + ((i + 0.5) / Math.max(count, 6)) * 0.78;
      var y = -0.9 + t * 1.6;
      var scaled = t * tiers;
      var localT = scaled - Math.floor(scaled);
      var r =
        Math.pow(t, 1.06) * 0.73 * (0.58 + 0.48 * Math.pow(localT, 0.82)) +
        0.085;
      var theta = i * goldenAngle + 0.45;
      return {
        x: Math.cos(theta) * r,
        y: y,
        z: Math.sin(theta) * r,
        color: light.color,
        symbol: light.symbol,
        phase: i * 0.95,
        idx: i,
      };
    });
  }

  function fillTextVisualCenter(ctx, text, cx, cy) {
    var m = ctx.measureText(text);
    var dx =
      typeof m.actualBoundingBoxLeft === 'number' &&
      typeof m.actualBoundingBoxRight === 'number'
        ? (m.actualBoundingBoxLeft - m.actualBoundingBoxRight) / 2
        : 0;
    var dy =
      typeof m.actualBoundingBoxAscent === 'number' &&
      typeof m.actualBoundingBoxDescent === 'number'
        ? (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2
        : 0;
    ctx.fillText(text, cx + dx, cy + dy);
  }

  function renderTopper(ctx, starX, starY, fontScale, frame) {
    var pulse = 0.78 + 0.22 * Math.sin(frame * 0.1);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    function drawRow(text, y, color, px, blur) {
      ctx.font =
        'bold ' + (px * fontScale).toFixed(1) + 'px ui-monospace, Menlo, monospace';
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = blur || 0;
      fillTextVisualCenter(ctx, text, starX, y);
    }

    drawRow('✦', starY, '#fde047', 16.5, 15 * pulse);
    ctx.globalAlpha = 0.85;
    drawRow('✦', starY, '#ffffff', 12, 0);

    ctx.font =
      'bold ' + Math.round(9 * fontScale) + 'px ui-monospace, monospace';
    ctx.fillStyle = '#fef08a';
    ctx.shadowColor = '#fde047';
    ctx.shadowBlur = 8;
    ctx.globalAlpha = 0.8 * pulse;

    var ray = 12 * fontScale;
    var diag = 8.5 * fontScale;
    fillTextVisualCenter(ctx, '|', starX, starY - ray);
    fillTextVisualCenter(ctx, '|', starX, starY + ray);
    fillTextVisualCenter(ctx, '—', starX - ray - 1, starY);
    fillTextVisualCenter(ctx, '—', starX + ray + 1, starY);
    fillTextVisualCenter(ctx, '/', starX + diag, starY - diag);
    fillTextVisualCenter(ctx, '/', starX - diag, starY + diag);
    fillTextVisualCenter(ctx, '\\', starX - diag, starY - diag);
    fillTextVisualCenter(ctx, '\\', starX + diag, starY + diag);
    ctx.restore();
  }

  var STATIC_TREE_POINTS = buildHighDensityPinePoints();
  var STATIC_CUBE_POINTS = buildDenseGiftCubePoints();
  var USER_SYMBOL_POINTS = buildUserSymbolPoints(DEFAULT_LIGHTS);

  function mountTree(canvas, options) {
    if (!canvas) return null;
    var ctx = canvas.getContext('2d');
    if (!ctx) return null;

    var opts = options || {};
    var currentTheme = THEME_PALETTES[opts.theme] ? opts.theme : 'classic';
    var interactiveDrag = opts.interactiveDrag !== false;

    var width = 320;
    var height = 340;
    var angle = 0.35;
    var velocity = 0.009;
    var dragging = false;
    var lastX = 0;
    var frame = 0;
    var rafId = 0;

    var reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function syncSize() {
      var rect = canvas.getBoundingClientRect();
      width = Math.max(180, rect.width || 320);
      height = Math.max(180, rect.height || 340);
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    syncSize();
    var observer = null;
    if (typeof ResizeObserver === 'function') {
      observer = new ResizeObserver(syncSize);
      observer.observe(canvas);
    } else {
      window.addEventListener('resize', syncSize);
    }

    function onPointerDown(e) {
      if (!interactiveDrag) return;
      dragging = true;
      lastX = e.clientX;
      canvas.style.cursor = 'grabbing';
    }

    function onPointerMove(e) {
      if (!dragging) return;
      var dx = e.clientX - lastX;
      lastX = e.clientX;
      angle += dx * 0.012;
      velocity = Math.max(-0.07, Math.min(0.07, dx * 0.0025));
    }

    function onPointerUp() {
      if (!dragging) return;
      dragging = false;
      canvas.style.cursor = interactiveDrag ? 'grab' : 'default';
    }

    if (interactiveDrag) {
      canvas.style.cursor = 'grab';
      canvas.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    }

    function drawFrame() {
      ctx.clearRect(0, 0, width, height);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      var palette = THEME_PALETTES[currentTheme] || THEME_PALETTES.classic;
      var treeScale = Math.min(height * 0.39, width * 0.35);
      var treeCenterX = width * 0.5;
      var treeCenterY = height * 0.51;
      var fontScale = Math.max(0.72, Math.min(1.35, treeScale / 128));

      var cosA = Math.cos(angle);
      var sinA = Math.sin(angle);
      var projected = [];

      for (var i = 0; i < STATIC_TREE_POINTS.length; i++) {
        var p = STATIC_TREE_POINTS[i];
        var rx = p.x * cosA - p.z * sinA;
        var rz = p.x * sinA + p.z * cosA;
        var depth = 2.75 / (2.75 - rz);
        projected.push({
          tag: 'static',
          kind: p.kind,
          isTip: p.isTip,
          phase: p.phase,
          rz: rz,
          sx: treeCenterX + rx * treeScale * depth,
          sy: treeCenterY + p.y * treeScale * depth,
        });
      }

      for (var j = 0; j < USER_SYMBOL_POINTS.length; j++) {
        var u = USER_SYMBOL_POINTS[j];
        var urx = u.x * cosA - u.z * sinA;
        var urz = u.x * sinA + u.z * cosA;
        var uDepth = 2.75 / (2.75 - urz);
        projected.push({
          tag: 'user',
          color: u.color,
          symbol: u.symbol,
          phase: u.phase,
          rz: urz,
          sx: treeCenterX + urx * treeScale * uDepth,
          sy: treeCenterY + u.y * treeScale * uDepth,
        });
      }

      projected.sort(function (a, b) {
        return a.rz - b.rz;
      });

      for (var k = 0; k < projected.length; k++) {
        var item = projected[k];
        var normZ = Math.max(0, Math.min(1, (item.rz + 0.85) / 1.7));

        if (item.tag === 'user') {
          var spark = Math.pow(
            Math.max(0, Math.sin(frame * 0.11 + item.phase)),
            5
          );
          var sz = Math.round((15 + normZ * 4 + spark * 4.5) * fontScale);

          ctx.save();
          ctx.font =
            'bold ' + sz + 'px ui-monospace, SFMono-Regular, Menlo, monospace';
          ctx.fillStyle = item.color;
          ctx.globalAlpha = 0.65 + normZ * 0.35;
          ctx.shadowColor = item.color;
          ctx.shadowBlur = normZ > 0.35 ? 14 + spark * 10 : 6;
          ctx.fillText(item.symbol, item.sx, item.sy);

          ctx.shadowBlur = 0;
          ctx.globalAlpha = normZ > 0.4 ? 0.55 : 0.22;
          ctx.fillStyle = '#ffffff';
          ctx.fillText(item.symbol, item.sx, item.sy);

          if (normZ > 0.32 && spark > 0.35) {
            var flareDist = 9 * fontScale;
            ctx.font =
              'bold ' +
              Math.round(9.5 * fontScale) +
              'px ui-monospace, monospace';
            ctx.globalAlpha = spark * 0.88;
            ctx.fillStyle = '#ffffff';
            ctx.fillText('+', item.sx, item.sy - flareDist);
            ctx.fillText('+', item.sx, item.sy + flareDist);
            ctx.fillText('·', item.sx - flareDist, item.sy);
            ctx.fillText('·', item.sx + flareDist, item.sy);
          }
          ctx.restore();
          continue;
        }

        if (item.kind === 'leaf') {
          var ci = Math.min(
            palette.leaf.length - 1,
            Math.floor(normZ * palette.leaf.length)
          );
          var chIdx = Math.min(
            CHAR_RAMP.length - 1,
            Math.floor(normZ * CHAR_RAMP.length)
          );
          var px = Math.round((8.4 + normZ * 2.4) * fontScale);
          ctx.font =
            (item.isTip ? 'bold ' : '') +
            px +
            'px ui-monospace, Menlo, monospace';
          ctx.globalAlpha = 0.48 + normZ * 0.52;
          ctx.fillStyle = palette.leaf[ci];
          ctx.fillText(CHAR_RAMP[chIdx], item.sx, item.sy);
          ctx.globalAlpha = 1;
        } else if (item.kind === 'core') {
          ctx.font =
            Math.round(8.4 * fontScale) + 'px ui-monospace, monospace';
          ctx.fillStyle = palette.core;
          ctx.globalAlpha = 0.45 + normZ * 0.35;
          ctx.fillText(normZ > 0.5 ? ':' : '.', item.sx, item.sy);
          ctx.globalAlpha = 1;
        } else if (item.kind === 'garland') {
          if (normZ > 0.26) {
            var twinkle = 0.55 + 0.45 * Math.sin(frame * 0.09 + item.phase);
            var gSpark = Math.pow(
              Math.max(0, Math.sin(frame * 0.13 + item.phase)),
              6
            );
            ctx.save();
            ctx.font =
              'bold ' +
              Math.round((8 + normZ * 2) * fontScale) +
              'px ui-monospace, monospace';
            ctx.fillStyle = gSpark > 0.65 ? '#fef3c7' : palette.garland;
            ctx.globalAlpha = (0.28 + normZ * 0.45) * twinkle;
            if (normZ > 0.52) {
              ctx.shadowColor = palette.garland;
              ctx.shadowBlur = 4 + gSpark * 5;
            }
            ctx.fillText(normZ > 0.68 ? '*' : '·', item.sx, item.sy);
            ctx.restore();
          }
        } else if (item.kind === 'trunk') {
          ctx.font =
            'bold ' +
            Math.round(9.5 * fontScale) +
            'px ui-monospace, monospace';
          ctx.fillStyle = '#92400e';
          ctx.globalAlpha = 0.6 + normZ * 0.4;
          ctx.fillText(normZ > 0.5 ? '|' : ':', item.sx, item.sy);
          ctx.globalAlpha = 1;
        } else if (item.kind === 'halo') {
          var pulse =
            0.35 + 0.65 * Math.abs(Math.sin(frame * 0.045 + item.phase));
          ctx.font =
            Math.round(9.5 * fontScale) + 'px ui-monospace, monospace';
          ctx.fillStyle = palette.garland;
          ctx.globalAlpha = (0.16 + normZ * 0.38) * pulse;
          ctx.fillText(normZ > 0.6 ? '·' : '.', item.sx, item.sy);
          ctx.globalAlpha = 1;
        }
      }

      renderTopper(
        ctx,
        treeCenterX,
        treeCenterY - treeScale * 1.01,
        fontScale,
        frame
      );

      // 우하단 3D 회전 선물 상자
      var cubeCenterX = treeCenterX + treeScale * 0.66;
      var cubeCenterY = treeCenterY + treeScale * 0.56;
      var cubeScale = treeScale * 0.34;
      var floatY = Math.sin(frame * 0.06) * 2.6;
      var yaw = angle * 0.95 + 0.65;
      var pitch = -0.52;

      var cosY = Math.cos(yaw);
      var sinY = Math.sin(yaw);
      var cosP = Math.cos(pitch);
      var sinP = Math.sin(pitch);
      var giftSpark = 0.65 + 0.35 * Math.sin(frame * 0.14);

      var projectedCube = [];
      for (var c = 0; c < STATIC_CUBE_POINTS.length; c++) {
        var cp = STATIC_CUBE_POINTS[c];
        var nx1 = cp.nx * cosY - cp.nz * sinY;
        var nz1 = cp.nx * sinY + cp.nz * cosY;
        var ny2 = cp.ny * cosP - nz1 * sinP;
        var nz2 = cp.ny * sinP + nz1 * cosP;
        if (!cp.alwaysVisible && nz2 <= 0.02) continue;

        var x1 = cp.x * cosY - cp.z * sinY;
        var z1 = cp.x * sinY + cp.z * cosY;
        var y2 = cp.y * cosP - z1 * sinP;
        var z2 = cp.y * sinP + z1 * cosP;
        var cDepth = 3.2 / (3.2 - z2);
        var lit = Math.max(
          0,
          Math.min(
            1,
            (nx1 * LIGHT_DIR.x + ny2 * LIGHT_DIR.y + nz2 * LIGHT_DIR.z + 0.25) /
              1.25
          )
        );
        projectedCube.push({
          kind: cp.kind,
          rz: z2,
          sx: cubeCenterX + x1 * cubeScale * cDepth,
          sy: cubeCenterY + floatY + y2 * cubeScale * cDepth,
          lit: lit,
        });
      }

      projectedCube.sort(function (a, b) {
        return a.rz - b.rz;
      });

      function cubePx(basePx) {
        return Math.max(5.5, Number((basePx * fontScale).toFixed(1)));
      }

      for (var m = 0; m < projectedCube.length; m++) {
        var q = projectedCube[m];
        ctx.save();
        if (q.kind === 'box' || q.kind === 'lid') {
          var boost = q.kind === 'lid' ? 0.12 : 0;
          var lVal = Math.min(1, q.lit + boost);
          var bci = Math.min(
            BOX_RED_PALETTE.length - 1,
            Math.floor(lVal * BOX_RED_PALETTE.length)
          );
          var bchIdx = Math.min(
            BOX_CHAR_RAMP.length - 1,
            Math.floor(lVal * BOX_CHAR_RAMP.length)
          );
          ctx.font =
            'bold ' +
            cubePx(q.kind === 'lid' ? 9.5 : 9) +
            'px ui-monospace, monospace';
          ctx.fillStyle = BOX_RED_PALETTE[bci];
          ctx.globalAlpha = 0.68 + lVal * 0.32;
          ctx.fillText(BOX_CHAR_RAMP[bchIdx], q.sx, q.sy);
        } else if (q.kind === 'ribbon') {
          var rci = Math.min(
            RIBBON_GOLD_PALETTE.length - 1,
            Math.floor(q.lit * RIBBON_GOLD_PALETTE.length)
          );
          ctx.font = 'bold ' + cubePx(10) + 'px ui-monospace, monospace';
          ctx.fillStyle = RIBBON_GOLD_PALETTE[rci];
          ctx.globalAlpha = 0.78 + q.lit * 0.22;
          if (q.lit > 0.45) {
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 6 * giftSpark;
          }
          ctx.fillText(q.lit > 0.55 ? '#' : '=', q.sx, q.sy);
        } else if (q.kind === 'bowCenter') {
          ctx.font = 'bold ' + cubePx(15) + 'px ui-monospace, monospace';
          ctx.fillStyle = '#fef08a';
          ctx.shadowColor = '#fde047';
          ctx.shadowBlur = 13 * giftSpark;
          ctx.fillText('✦', q.sx, q.sy);
        } else if (q.kind === 'bowWing') {
          ctx.font = 'bold ' + cubePx(10.5) + 'px ui-monospace, monospace';
          ctx.fillStyle = '#fde047';
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 5 * giftSpark;
          ctx.globalAlpha = 0.85;
          ctx.fillText(q.rz > 0 ? '*' : '~', q.sx, q.sy);
        }
        ctx.restore();
      }
    }

    function renderLoop() {
      frame += 1;
      if (!dragging) {
        angle += velocity;
        velocity += (0.0085 - velocity) * 0.03;
      }
      drawFrame();
      rafId = requestAnimationFrame(renderLoop);
    }

    if (reduceMotion) {
      drawFrame();
    } else {
      rafId = requestAnimationFrame(renderLoop);
    }

    return {
      setTheme: function (themeId) {
        if (THEME_PALETTES[themeId]) {
          currentTheme = themeId;
          if (reduceMotion) drawFrame();
        }
      },
      destroy: function () {
        if (rafId) cancelAnimationFrame(rafId);
        if (observer) observer.disconnect();
        else window.removeEventListener('resize', syncSize);
        if (interactiveDrag) {
          canvas.removeEventListener('pointerdown', onPointerDown);
          window.removeEventListener('pointermove', onPointerMove);
          window.removeEventListener('pointerup', onPointerUp);
        }
      },
    };
  }

  function mountSnow(canvas) {
    if (!canvas) return null;
    var ctx = canvas.getContext('2d');
    if (!ctx) return null;

    var NEAR_CHARS = ['❄', '✦', '*'];
    var MID_CHARS = ['*', '+', '❄'];
    var FAR_CHARS = ['·', '.', '+'];

    var width = window.innerWidth;
    var height = window.innerHeight;
    var enabled = true;
    var rafId = 0;
    var lastTime = 0;
    var frameInterval = 1000 / 30;

    var reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function createFlake(randomY) {
      var roll = Math.random();
      var layer = roll < 0.2 ? 'near' : roll < 0.58 ? 'mid' : 'far';
      if (layer === 'near') {
        return {
          x: Math.random() * width,
          y: randomY ? Math.random() * height : -18,
          vy: 0.95 + Math.random() * 0.55,
          vx: (Math.random() - 0.5) * 0.38,
          alpha: 0.5 + Math.random() * 0.22,
          phase: Math.random() * Math.PI * 2,
          size: Math.round(13 + Math.random() * 3),
          ch: NEAR_CHARS[Math.floor(Math.random() * NEAR_CHARS.length)],
          color: '#e0f2fe',
          glow: true,
          layer: layer,
        };
      }
      if (layer === 'mid') {
        return {
          x: Math.random() * width,
          y: randomY ? Math.random() * height : -14,
          vy: 0.6 + Math.random() * 0.45,
          vx: (Math.random() - 0.5) * 0.28,
          alpha: 0.35 + Math.random() * 0.2,
          phase: Math.random() * Math.PI * 2,
          size: Math.round(10 + Math.random() * 2),
          ch: MID_CHARS[Math.floor(Math.random() * MID_CHARS.length)],
          color: '#f1f5f9',
          glow: false,
          layer: layer,
        };
      }
      return {
        x: Math.random() * width,
        y: randomY ? Math.random() * height : -10,
        vy: 0.35 + Math.random() * 0.35,
        vx: (Math.random() - 0.5) * 0.2,
        alpha: 0.2 + Math.random() * 0.18,
        phase: Math.random() * Math.PI * 2,
        size: Math.round(8 + Math.random() * 2),
        ch: FAR_CHARS[Math.floor(Math.random() * FAR_CHARS.length)],
        color: '#cbd5e1',
        glow: false,
        layer: layer,
      };
    }

    function syncSize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    syncSize();
    window.addEventListener('resize', syncSize);

    var flakes = [];
    for (var i = 0; i < 70; i++) {
      flakes.push(createFlake(true));
    }

    function tick(now) {
      if (!enabled) return;
      rafId = requestAnimationFrame(tick);
      if (now - lastTime < frameInterval) return;
      lastTime = now;

      ctx.clearRect(0, 0, width, height);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (var i = 0; i < flakes.length; i++) {
        var f = flakes[i];
        f.phase += 0.025;
        f.y += f.vy;
        f.x += f.vx + Math.sin(f.phase) * (f.layer === 'near' ? 0.45 : 0.25);

        if (f.y > height + 18) {
          f.y = -14;
          f.x = Math.random() * width;
        }
        if (f.x > width + 18) f.x = -14;
        if (f.x < -18) f.x = width + 14;

        ctx.save();
        ctx.font =
          'bold ' +
          f.size +
          'px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
        ctx.fillStyle = f.color;
        ctx.globalAlpha = f.alpha;
        if (f.glow) {
          ctx.shadowColor = '#bae6fd';
          ctx.shadowBlur = 7;
        }
        ctx.fillText(f.ch, f.x, f.y);
        ctx.restore();
      }
    }

    if (!reduceMotion && enabled) {
      rafId = requestAnimationFrame(tick);
    }

    return {
      isEnabled: function () {
        return enabled;
      },
      setEnabled: function (next) {
        enabled = Boolean(next);
        if (!enabled) {
          if (rafId) cancelAnimationFrame(rafId);
          rafId = 0;
          ctx.clearRect(0, 0, width, height);
        } else if (!reduceMotion && !rafId) {
          lastTime = 0;
          rafId = requestAnimationFrame(tick);
        }
      },
      destroy: function () {
        if (rafId) cancelAnimationFrame(rafId);
        window.removeEventListener('resize', syncSize);
      },
    };
  }

  global.MerryAsciiScene = {
    mountTree: mountTree,
    mountSnow: mountSnow,
  };
})(typeof window !== 'undefined' ? window : globalThis);
