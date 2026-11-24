(function (global) {
  'use strict';

  var CHAR_RAMP = ['.', ',', ':', ';', '~', '+', '*', '^', '#'];

  var THEME_PALETTES = {
    classic: {
      leaf: ['#0a2e1d', '#10472c', '#18663f', '#228753', '#36a86d'],
      core: '#072215',
      garland: '#eab308',
      frost: '#e2fce8',
    },
    'snow-white': {
      leaf: ['#334155', '#64748b', '#94a3b8', '#cbd5e1', '#f8fafc'],
      core: '#1e293b',
      garland: '#bae6fd',
      frost: '#ffffff',
    },
    aurora: {
      leaf: ['#083344', '#0e7490', '#14b8a6', '#2dd4bf', '#a5f3fc'],
      core: '#062634',
      garland: '#fde047',
      frost: '#e0f2fe',
    },
    'rose-winter': {
      leaf: ['#4c0519', '#881337', '#be123c', '#fb7185', '#fecdd3'],
      core: '#350412',
      garland: '#fde68a',
      frost: '#fff1f2',
    },
    champagne: {
      leaf: ['#422006', '#713f12', '#a16207', '#eab308', '#fef08a'],
      core: '#2d1504',
      garland: '#ffffff',
      frost: '#fefce8',
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

  var BOX_RED_PALETTE = ['#7f1d1d', '#b91c1c', '#dc2626', '#f87171'];
  var BOX_BACKING_PALETTE = ['#2b070c', '#3d0a12', '#520e18', '#681220'];
  var BOX_CHAR_RAMP = ['▒', '#', '▓', '▓'];
  var RIBBON_GOLD_PALETTE = ['#b45309', '#d97706', '#f59e0b', '#fde047'];
  var TRUNK_PALETTE = ['#451a03', '#78350f', '#92400e', '#b45309'];
  var SNOW_BASE_PALETTE = [
    '#475569',
    '#64748b',
    '#94a3b8',
    '#cbd5e1',
    '#f1f5f9',
  ];

  var TREE_PITCH = -0.14;
  var COS_TREE_PITCH = Math.cos(TREE_PITCH);
  var SIN_TREE_PITCH = Math.sin(TREE_PITCH);
  var PINE_TIERS = 7;

  var LIGHT_DIR = (function () {
    var lx = -0.35;
    var ly = -0.75;
    var lz = 0.55;
    var len = Math.hypot(lx, ly, lz);
    return { x: lx / len, y: ly / len, z: lz / len };
  })();

  function normalizeVec(nx, ny, nz) {
    var len = Math.hypot(nx, ny, nz) || 1;
    return { nx: nx / len, ny: ny / len, nz: nz / len };
  }

  function samplePineSurface(t, theta) {
    var yBase = -0.94 + t * 1.6;
    var bottomTaper =
      1 - 0.06 * Math.pow(Math.max(0, (t - 0.88) / 0.12), 2);
    var envelope = 0.02 + Math.pow(t, 0.88) * 0.75 * bottomTaper;
    var tierIdx = Math.min(PINE_TIERS - 1, Math.floor(t * PINE_TIERS));
    var localT = t * PINE_TIERS - tierIdx;
    var tierFlare =
      0.76 + 0.28 * Math.sin(Math.pow(localT, 0.78) * Math.PI * 0.72);
    var boughCount = 5 + Math.floor(tierIdx * 0.75);
    var tierPhase = tierIdx * 1.15;
    var lobeRaw = 0.5 + 0.5 * Math.cos(theta * boughCount + tierPhase);
    var boughMod = 0.87 + 0.17 * Math.pow(lobeRaw, 1.3);
    var r = envelope * tierFlare * boughMod;
    var droop =
      Math.pow(localT, 1.8) * (0.015 + 0.055 * t) * (0.45 + 0.55 * lobeRaw);

    return {
      r: r,
      y: yBase + droop,
      localT: localT,
      tierIdx: tierIdx,
      lobeRaw: lobeRaw,
    };
  }

  function buildHighDensityPinePoints() {
    var pts = [];
    var layers = 88;

    for (var l = 0; l < layers; l++) {
      var t = 0.015 + (l / (layers - 1)) * 0.97;
      var baseSample = samplePineSurface(t, 0);
      var tierIdx = baseSample.tierIdx;
      var localT = baseSample.localT;
      var bottomTaper =
        1 - 0.06 * Math.pow(Math.max(0, (t - 0.88) / 0.12), 2);
      var surfaceRefR =
        (0.02 + Math.pow(t, 0.88) * 0.75 * bottomTaper) *
        (0.76 + 0.28 * Math.sin(Math.pow(localT, 0.78) * Math.PI * 0.72));

      var ringCount = Math.max(
        8,
        Math.floor(9 + surfaceRefR * 48 + t * t * 14)
      );
      for (var i = 0; i < ringCount; i++) {
        var theta = (i / ringCount) * Math.PI * 2 + l * 0.37 + tierIdx * 0.55;
        var surface = samplePineSurface(t, theta);
        var jitter = 0.96 + 0.08 * Math.sin(i * 3.1 + l);
        var r = surface.r * jitter;
        var norm = normalizeVec(
          Math.cos(theta),
          -0.34 - 0.18 * (1 - surface.localT),
          Math.sin(theta)
        );
        pts.push({
          x: Math.cos(theta) * r,
          y: surface.y,
          z: Math.sin(theta) * r,
          nx: norm.nx,
          ny: norm.ny,
          nz: norm.nz,
          kind: 'leaf',
          t: t,
          ao: 0.62 + 0.38 * Math.pow(surface.localT, 0.65),
          isTip: surface.localT > 0.74,
          isFrostTip:
            surface.localT > 0.68 &&
            surface.localT < 0.95 &&
            surface.lobeRaw > 0.58 &&
            t > 0.08,
          phase: l * 0.35 + i * 0.6,
        });
      }
    }

    for (var c = 0; c < 420; c++) {
      var ct = 0.08 + Math.pow(c / 419, 0.72) * 0.9;
      var cTheta = c * 2.39996323;
      var cSurf = samplePineSurface(ct, cTheta);
      var cr = cSurf.r * (0.22 + ((c * 7) % 10) * 0.068);
      var cNorm = normalizeVec(Math.cos(cTheta), -0.3, Math.sin(cTheta));
      pts.push({
        x: Math.cos(cTheta) * cr,
        y: cSurf.y,
        z: Math.sin(cTheta) * cr,
        nx: cNorm.nx,
        ny: cNorm.ny,
        nz: cNorm.nz,
        kind: 'core',
        t: ct,
        ao: 0.55,
        phase: c * 0.4,
      });
    }

    for (var b = 0; b < 65; b++) {
      var bt = 0.88 + (b / 64) * 0.09;
      var bTheta = b * 2.39996323 + 0.3;
      var bSurf = samplePineSurface(bt, bTheta);
      var br = bSurf.r * (0.22 + ((b * 11) % 10) * 0.068);
      var bNorm = normalizeVec(Math.cos(bTheta), -0.2, Math.sin(bTheta));
      pts.push({
        x: Math.cos(bTheta) * br,
        y: bSurf.y,
        z: Math.sin(bTheta) * br,
        nx: bNorm.nx,
        ny: bNorm.ny,
        nz: bNorm.nz,
        kind: 'core',
        t: bt,
        ao: 0.55,
        phase: b * 0.25,
      });
    }

    for (var strand = 0; strand < 2; strand++) {
      var offset = strand * Math.PI;
      for (var g = 0; g < 104; g++) {
        var gt = 0.06 + (g / 103) * 0.88;
        var gTheta = gt * Math.PI * 10 + offset;
        var gSurf = samplePineSurface(gt, gTheta);
        var gr = gSurf.r + 0.024;
        var swagY = gSurf.y + Math.abs(Math.sin(gTheta * 2.5)) * 0.022;
        var gNorm = normalizeVec(Math.cos(gTheta), -0.25, Math.sin(gTheta));
        pts.push({
          x: Math.cos(gTheta) * gr,
          y: swagY,
          z: Math.sin(gTheta) * gr,
          nx: gNorm.nx,
          ny: gNorm.ny,
          nz: gNorm.nz,
          kind: 'garland',
          t: gt,
          ao: 1,
          phase: g * 0.32 + strand * 1.9,
        });
      }
    }

    for (var row = 0; row < 8; row++) {
      var frac = row / 7;
      var ty = 0.62 + row * 0.034;
      var tr = 0.092 + frac * 0.045;
      for (var ti = 0; ti < 14; ti++) {
        var tTheta = (ti / 14) * Math.PI * 2 + row * 0.22;
        pts.push({
          x: Math.cos(tTheta) * tr,
          y: ty,
          z: Math.sin(tTheta) * tr,
          nx: Math.cos(tTheta),
          ny: 0,
          nz: Math.sin(tTheta),
          kind: 'trunk',
          t: 1,
          ao: 0.72 + frac * 0.28,
          phase: 0,
        });
      }
    }

    var snowRings = [
      { r: 0.18, count: 12 },
      { r: 0.33, count: 20 },
      { r: 0.48, count: 28 },
      { r: 0.63, count: 36 },
      { r: 0.77, count: 44 },
    ];
    for (var ringIdx = 0; ringIdx < snowRings.length; ringIdx++) {
      var ring = snowRings[ringIdx];
      var sFrac = ring.r / 0.77;
      for (var si = 0; si < ring.count; si++) {
        var sTheta = (si / ring.count) * Math.PI * 2 + ringIdx * 0.31;
        var sy =
          0.905 -
          (1 - sFrac * sFrac) * 0.055 +
          Math.sin(sTheta * 3 + ringIdx) * 0.008;
        var sNorm = normalizeVec(
          Math.cos(sTheta) * sFrac * 0.25,
          -0.96,
          Math.sin(sTheta) * sFrac * 0.25
        );
        pts.push({
          x: Math.cos(sTheta) * ring.r,
          y: sy,
          z: Math.sin(sTheta) * ring.r,
          nx: sNorm.nx,
          ny: sNorm.ny,
          nz: sNorm.nz,
          kind: 'snowBase',
          t: si / ring.count,
          ao: 0.78 + 0.22 * sFrac,
          isSnowEdge: ringIdx === 4,
          phase: ringIdx * 1.3 + si * 0.42,
        });
      }
    }

    return pts;
  }

  function buildBoxFaces(w, yTop, yBot) {
    return [
      { corners: [[-w, yTop, w], [w, yTop, w], [w, yBot, w], [-w, yBot, w]], nx: 0, ny: 0, nz: 1 },
      { corners: [[w, yTop, -w], [-w, yTop, -w], [-w, yBot, -w], [w, yBot, -w]], nx: 0, ny: 0, nz: -1 },
      { corners: [[w, yTop, w], [w, yTop, -w], [w, yBot, -w], [w, yBot, w]], nx: 1, ny: 0, nz: 0 },
      { corners: [[-w, yTop, -w], [-w, yTop, w], [-w, yBot, w], [-w, yBot, -w]], nx: -1, ny: 0, nz: 0 },
      { corners: [[-w, yTop, -w], [w, yTop, -w], [w, yTop, w], [-w, yTop, w]], nx: 0, ny: -1, nz: 0 },
      { corners: [[-w, yBot, w], [w, yBot, w], [w, yBot, -w], [-w, yBot, -w]], nx: 0, ny: 1, nz: 0 },
    ];
  }

  var GIFT_BODY_FACES = buildBoxFaces(0.5, -0.32, 0.54);
  var GIFT_LID_FACES = buildBoxFaces(0.56, -0.54, -0.32);

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

    var u10 = sample(10, -bw, bw);
    var vBody9 = sample(9, yBodyTop, yBot);
    var l10 = sample(10, -lw, lw);
    var vLid4 = sample(4, yLidTop, yLidBot);

    u10.forEach(function (u) {
      vBody9.forEach(function (v) {
        var isRib = Math.abs(u) <= 0.125;
        var kind = isRib ? 'ribbon' : 'box';
        var off = isRib ? 0.015 : 0;
        var ao = v < yBodyTop + 0.14 ? 0.58 : 1;
        pts.push({ x: u, y: v, z: bw + off, nx: 0, ny: 0, nz: 1, kind: kind, part: 'body', ao: ao, phase: u + v });
        pts.push({ x: u, y: v, z: -bw - off, nx: 0, ny: 0, nz: -1, kind: kind, part: 'body', ao: ao, phase: u - v });
        pts.push({ x: bw + off, y: v, z: u, nx: 1, ny: 0, nz: 0, kind: kind, part: 'body', ao: ao, phase: v + u });
        pts.push({ x: -bw - off, y: v, z: u, nx: -1, ny: 0, nz: 0, kind: kind, part: 'body', ao: ao, phase: v - u });
      });
    });

    u10.forEach(function (x) {
      u10.forEach(function (z) {
        var isRib = Math.abs(x) <= 0.125 || Math.abs(z) <= 0.125;
        pts.push({
          x: x,
          y: yBot,
          z: z,
          nx: 0,
          ny: 1,
          nz: 0,
          kind: isRib ? 'ribbon' : 'box',
          part: 'body',
          ao: 1,
          phase: x + z,
        });
      });
    });

    l10.forEach(function (x) {
      l10.forEach(function (z) {
        var isRib = Math.abs(x) <= 0.125 || Math.abs(z) <= 0.125;
        pts.push({
          x: x,
          y: yLidTop - (isRib ? 0.012 : 0),
          z: z,
          nx: 0,
          ny: -1,
          nz: 0,
          kind: isRib ? 'ribbon' : 'lid',
          part: 'lid',
          ao: 1,
          phase: x * 1.5 + z,
        });
      });
    });

    l10.forEach(function (u) {
      vLid4.forEach(function (v) {
        var isRib = Math.abs(u) <= 0.125;
        var kind = isRib ? 'ribbon' : 'lid';
        var off = isRib ? 0.015 : 0;
        pts.push({ x: u, y: v, z: lw + off, nx: 0, ny: 0, nz: 1, kind: kind, part: 'lid', ao: 1, phase: u });
        pts.push({ x: u, y: v, z: -lw - off, nx: 0, ny: 0, nz: -1, kind: kind, part: 'lid', ao: 1, phase: u });
        pts.push({ x: lw + off, y: v, z: u, nx: 1, ny: 0, nz: 0, kind: kind, part: 'lid', ao: 1, phase: u });
        pts.push({ x: -lw - off, y: v, z: u, nx: -1, ny: 0, nz: 0, kind: kind, part: 'lid', ao: 1, phase: u });
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
      part: 'bow',
      alwaysVisible: true,
      phase: 0,
    });

    var dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    var innerSteps = [0.25, 0.5, 0.75];
    for (var d = 0; d < dirs.length; d++) {
      var dx = dirs[d][0];
      var dz = dirs[d][1];
      var bowN = normalizeVec(dx * 0.4, -0.9, dz * 0.4);
      for (var k = 1; k <= 7; k++) {
        var s = k / 7;
        var rad = s * 0.34;
        var arch = Math.sin(s * Math.PI) * 0.21;
        pts.push({
          x: dx * rad,
          y: yLidTop - 0.04 - arch,
          z: dz * rad,
          nx: bowN.nx,
          ny: bowN.ny,
          nz: bowN.nz,
          kind: 'bowWing',
          part: 'bow',
          alwaysVisible: true,
          phase: d * 1.1 + k * 0.4,
        });
      }
      for (var ki = 0; ki < innerSteps.length; ki++) {
        var si = innerSteps[ki];
        var radI = si * 0.28;
        var archI = Math.sin(si * Math.PI) * 0.09;
        pts.push({
          x: dx * radI,
          y: yLidTop - 0.03 - archI,
          z: dz * radI,
          nx: bowN.nx,
          ny: bowN.ny,
          nz: bowN.nz,
          kind: 'bowWing',
          part: 'bow',
          alwaysVisible: true,
          phase: d * 1.1 + ki * 0.6 + 2.4,
        });
      }
    }

    return pts;
  }

  function buildUserSymbolPoints(lights) {
    var count = lights.length;
    if (!count) return [];
    var goldenAngle = 2.39996323;

    return lights.map(function (light, i) {
      var t = 0.14 + ((i + 0.5) / Math.max(count, 6)) * 0.77;
      var theta = i * goldenAngle + 0.45;
      var surface = samplePineSurface(t, theta);
      var r = surface.r + 0.032;
      return {
        x: Math.cos(theta) * r,
        y: surface.y,
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

  var STAR_GOLD_PALETTE = ['#b45309', '#f59e0b', '#fde047', '#fef9c3'];

  function buildNorthStarTopperPoints() {
    var pts = [];
    var cy = -1.02;
    var i, k, t, n, dx, dy, dz;

    var coreNorm = normalizeVec(0, -0.3, 1);
    pts.push({
      x: 0,
      y: cy,
      z: 0,
      nx: coreNorm.nx,
      ny: coreNorm.ny,
      nz: coreNorm.nz,
      kind: 'starCore',
      phase: 0,
    });

    var topN = normalizeVec(0, -1, 0);
    var topSteps = [0.3, 0.58, 0.82];
    for (i = 0; i < topSteps.length; i++) {
      pts.push({
        x: 0,
        y: cy - 0.115 * topSteps[i],
        z: 0,
        nx: topN.nx,
        ny: topN.ny,
        nz: topN.nz,
        kind: 'starRay',
        phase: 0.4 + i * 0.3,
      });
    }
    pts.push({
      x: 0,
      y: cy - 0.115,
      z: 0,
      nx: topN.nx,
      ny: topN.ny,
      nz: topN.nz,
      kind: 'starTip',
      phase: 1.3,
    });

    var botN = normalizeVec(0, 1, 0);
    var botSteps = [0.45, 0.9];
    for (i = 0; i < botSteps.length; i++) {
      pts.push({
        x: 0,
        y: cy + 0.085 * botSteps[i],
        z: 0,
        nx: botN.nx,
        ny: botN.ny,
        nz: botN.nz,
        kind: 'starRay',
        phase: 1.7 + i * 0.35,
      });
    }

    var horizDirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    var hSteps = [0.28, 0.56, 0.8];
    for (i = 0; i < horizDirs.length; i++) {
      dx = horizDirs[i][0];
      dz = horizDirs[i][1];
      n = normalizeVec(dx, 0, dz);
      for (k = 0; k < hSteps.length; k++) {
        t = hSteps[k];
        pts.push({
          x: dx * 0.125 * t,
          y: cy,
          z: dz * 0.125 * t,
          nx: n.nx,
          ny: n.ny,
          nz: n.nz,
          kind: 'starRay',
          phase: i * 0.8 + k * 0.25,
        });
      }
      pts.push({
        x: dx * 0.125,
        y: cy,
        z: dz * 0.125,
        nx: n.nx,
        ny: n.ny,
        nz: n.nz,
        kind: 'starTip',
        phase: i * 0.8 + 1.0,
      });
    }

    var invSqrt3 = 1 / Math.sqrt(3);
    var signs = [-1, 1];
    var diagIdx = 0;
    var dSteps = [0.42, 0.74];
    for (var ix = 0; ix < 2; ix++) {
      for (var iy = 0; iy < 2; iy++) {
        for (var iz = 0; iz < 2; iz++) {
          dx = signs[ix] * invSqrt3;
          dy = signs[iy] * invSqrt3;
          dz = signs[iz] * invSqrt3;
          n = normalizeVec(dx, dy, dz);
          for (k = 0; k < dSteps.length; k++) {
            t = dSteps[k];
            pts.push({
              x: dx * 0.092 * t,
              y: cy + dy * 0.092 * t,
              z: dz * 0.092 * t,
              nx: n.nx,
              ny: n.ny,
              nz: n.nz,
              kind: 'starRay',
              phase: diagIdx * 0.45 + k * 0.2,
            });
          }
          pts.push({
            x: dx * 0.092,
            y: cy + dy * 0.092,
            z: dz * 0.092,
            nx: n.nx,
            ny: n.ny,
            nz: n.nz,
            kind: 'starTip',
            phase: diagIdx * 0.45 + 0.9,
          });
          diagIdx++;
        }
      }
    }

    var invSqrt2 = 1 / Math.sqrt(2);
    var facetIdx = 0;
    for (var ia = 0; ia < 2; ia++) {
      for (var ib = 0; ib < 2; ib++) {
        var a = signs[ia];
        var b = signs[ib];
        var pairs = [
          [a * invSqrt2, b * invSqrt2, 0],
          [0, a * invSqrt2, b * invSqrt2],
          [a * invSqrt2, 0, b * invSqrt2],
        ];
        for (k = 0; k < pairs.length; k++) {
          var fx = pairs[k][0];
          var fy = pairs[k][1];
          var fz = pairs[k][2];
          n = normalizeVec(fx, fy, fz);
          pts.push({
            x: fx * 0.056,
            y: cy + fy * 0.056,
            z: fz * 0.056,
            nx: n.nx,
            ny: n.ny,
            nz: n.nz,
            kind: 'starFacet',
            phase: facetIdx * 0.37,
          });
          facetIdx++;
        }
      }
    }

    return pts;
  }

  var STATIC_NORTH_STAR_POINTS = buildNorthStarTopperPoints();

  function renderTopper(
    ctx,
    treeCenterX,
    treeCenterY,
    treeScale,
    angle,
    fontScale,
    frame
  ) {
    var pulse = 0.78 + 0.22 * Math.sin(frame * 0.1);
    var cosA = Math.cos(angle);
    var sinA = Math.sin(angle);
    var centerRz = -1.02 * SIN_TREE_PITCH;
    var projected = [];
    var i;

    for (i = 0; i < STATIC_NORTH_STAR_POINTS.length; i++) {
      var p = STATIC_NORTH_STAR_POINTS[i];
      var rx = p.x * cosA + p.z * sinA;
      var z1 = -p.x * sinA + p.z * cosA;
      var ry = p.y * COS_TREE_PITCH - z1 * SIN_TREE_PITCH;
      var rz = p.y * SIN_TREE_PITCH + z1 * COS_TREE_PITCH;

      var rnx = p.nx * cosA + p.nz * sinA;
      var nz1 = -p.nx * sinA + p.nz * cosA;
      var rny = p.ny * COS_TREE_PITCH - nz1 * SIN_TREE_PITCH;
      var rnz = p.ny * SIN_TREE_PITCH + nz1 * COS_TREE_PITCH;

      var relRz = rz - centerRz;
      var normZ = Math.max(0, Math.min(1, (relRz + 0.18) / 0.36));
      var diff = Math.max(
        0,
        rnx * LIGHT_DIR.x + rny * LIGHT_DIR.y + rnz * LIGHT_DIR.z
      );
      var shade = Math.max(0, Math.min(1, 0.14 + normZ * 0.42 + diff * 0.56));
      var depth = 2.85 / (2.85 - rz);
      projected.push({
        sx: treeCenterX + rx * treeScale * depth,
        sy: treeCenterY + ry * treeScale * depth,
        rz: rz,
        relRz: relRz,
        shade: shade,
        normZ: normZ,
        p: p,
      });
    }

    projected.sort(function (a, b) {
      return a.rz - b.rz;
    });

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    function drawGlyph(text, x, y, px, color, alpha, shadowColor, shadowBlur) {
      ctx.font =
        'bold ' +
        (px * fontScale).toFixed(1) +
        'px ui-monospace, Menlo, monospace';
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = shadowBlur;
      fillTextVisualCenter(ctx, text, x, y);
    }

    for (i = 0; i < projected.length; i++) {
      var item = projected[i];
      var sp = item.p;
      var backAlpha = 0.24 + 0.76 * item.normZ;
      var shimmer = 0.75 + 0.25 * Math.sin(frame * 0.12 + sp.phase);
      var isFront = item.relRz >= -0.02;
      var colIdx = Math.min(
        STAR_GOLD_PALETTE.length - 1,
        Math.floor(item.shade * STAR_GOLD_PALETTE.length)
      );
      var starCol = STAR_GOLD_PALETTE[colIdx];

      if (sp.kind === 'starCore') {
        drawGlyph('✦', item.sx, item.sy, 9.4, '#fde047', 1, '#fde047', 11 * pulse);
        drawGlyph('✦', item.sx, item.sy, 6.6, '#ffffff', 0.9, '#ffffff', 0);
      } else if (sp.kind === 'starTip') {
        drawGlyph(
          isFront ? '✦' : '•',
          item.sx,
          item.sy,
          isFront ? 7.6 : 5.8,
          isFront ? '#fef9c3' : starCol,
          isFront ? 0.95 : backAlpha,
          '#fde047',
          isFront ? 6 * pulse * shimmer : 0
        );
      } else if (sp.kind === 'starRay') {
        var rayGlyph =
          item.shade > 0.65 ? '*' : item.shade > 0.38 ? '+' : '·';
        drawGlyph(
          rayGlyph,
          item.sx,
          item.sy,
          6.8,
          starCol,
          0.26 + 0.74 * item.normZ,
          starCol,
          item.shade > 0.72 && item.relRz > 0 ? 5 * pulse : 0
        );
      } else {
        var facetGlyph =
          item.shade > 0.66 ? '◆' : item.shade > 0.38 ? '•' : '·';
        drawGlyph(
          facetGlyph,
          item.sx,
          item.sy,
          6.6,
          starCol,
          0.28 + 0.72 * item.normZ,
          starCol,
          item.shade > 0.74 && item.relRz > 0 ? 4 * pulse : 0
        );
      }
    }

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
    var velocity = 0.007;
    var dragging = false;
    var lastX = 0;
    var frame = 0;
    var lastFrameMs = 0;
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
      var treeScale = Math.min(height * 0.39, width * 0.36);
      var treeCenterX = width * 0.5;
      var treeCenterY = height * 0.5 - treeScale * 0.05;
      var fontScale = Math.max(0.72, Math.min(1.35, treeScale / 128));

      var cosA = Math.cos(angle);
      var sinA = Math.sin(angle);
      var projected = [];

      for (var i = 0; i < STATIC_TREE_POINTS.length; i++) {
        var p = STATIC_TREE_POINTS[i];
        var rx = p.x * cosA - p.z * sinA;
        var rz0 = p.x * sinA + p.z * cosA;
        var ry = p.y * COS_TREE_PITCH - rz0 * SIN_TREE_PITCH;
        var rz = p.y * SIN_TREE_PITCH + rz0 * COS_TREE_PITCH;
        var depth = 2.85 / (2.85 - rz);

        var rnx = p.nx * cosA - p.nz * sinA;
        var rnz0 = p.nx * sinA + p.nz * cosA;
        var rny = p.ny * COS_TREE_PITCH - rnz0 * SIN_TREE_PITCH;
        var rnz = p.ny * SIN_TREE_PITCH + rnz0 * COS_TREE_PITCH;
        var lit = Math.max(
          0,
          Math.min(
            1,
            (rnx * LIGHT_DIR.x + rny * LIGHT_DIR.y + rnz * LIGHT_DIR.z + 0.35) /
              1.35
          )
        );

        projected.push({
          tag: 'static',
          kind: p.kind,
          ao: p.ao,
          isTip: p.isTip,
          isFrostTip: p.isFrostTip,
          isSnowEdge: p.isSnowEdge,
          phase: p.phase,
          rz: rz,
          lit: lit,
          sx: treeCenterX + rx * treeScale * depth,
          sy: treeCenterY + ry * treeScale * depth,
        });
      }

      for (var j = 0; j < USER_SYMBOL_POINTS.length; j++) {
        var u = USER_SYMBOL_POINTS[j];
        var urx = u.x * cosA - u.z * sinA;
        var urz0 = u.x * sinA + u.z * cosA;
        var ury = u.y * COS_TREE_PITCH - urz0 * SIN_TREE_PITCH;
        var urz = u.y * SIN_TREE_PITCH + urz0 * COS_TREE_PITCH;
        var uDepth = 2.85 / (2.85 - urz);
        projected.push({
          tag: 'user',
          color: u.color,
          symbol: u.symbol,
          phase: u.phase,
          rz: urz,
          sx: treeCenterX + urx * treeScale * uDepth,
          sy: treeCenterY + ury * treeScale * uDepth,
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
          var sz = Math.round((16 + normZ * 4 + spark * 4.5) * fontScale);

          ctx.save();
          ctx.font =
            'bold ' + sz + 'px ui-monospace, SFMono-Regular, Menlo, monospace';
          ctx.fillStyle = item.color;
          ctx.globalAlpha = 0.68 + normZ * 0.32;
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
          if (item.isFrostTip && normZ > 0.42 && item.lit > 0.42) {
            ctx.save();
            ctx.font =
              'bold ' +
              Math.round((8.8 + normZ * 2.2) * fontScale) +
              'px ui-monospace, Menlo, monospace';
            ctx.fillStyle = palette.frost;
            ctx.shadowColor = palette.frost;
            ctx.shadowBlur = 3 * fontScale;
            ctx.globalAlpha = 0.72 + normZ * 0.28;
            var frostGlyph =
              item.lit > 0.68 ? '*' : item.lit > 0.52 ? '^' : '·';
            ctx.fillText(frostGlyph, item.sx, item.sy);
            ctx.restore();
          } else {
            var shade = Math.max(
              0,
              Math.min(1, (normZ * 0.48 + item.lit * 0.52) * item.ao)
            );
            var ci = Math.min(
              palette.leaf.length - 1,
              Math.floor(shade * palette.leaf.length)
            );
            var chIdx = Math.min(
              CHAR_RAMP.length - 1,
              Math.floor(shade * CHAR_RAMP.length)
            );
            var px = Math.round((8.4 + normZ * 2.4) * fontScale);
            ctx.font =
              (item.isTip ? 'bold ' : '') +
              px +
              'px ui-monospace, Menlo, monospace';
            ctx.globalAlpha = 0.46 + normZ * 0.54;
            ctx.fillStyle = palette.leaf[ci];
            ctx.fillText(CHAR_RAMP[chIdx], item.sx, item.sy);
            ctx.globalAlpha = 1;
          }
        } else if (item.kind === 'core') {
          ctx.font =
            Math.round(8.4 * fontScale) + 'px ui-monospace, monospace';
          ctx.fillStyle = palette.core;
          ctx.globalAlpha = 0.42 + normZ * 0.32;
          ctx.fillText(normZ > 0.52 ? ':' : '.', item.sx, item.sy);
          ctx.globalAlpha = 1;
        } else if (item.kind === 'garland') {
          if (normZ > 0.24) {
            var twinkle = 0.58 + 0.42 * Math.sin(frame * 0.09 + item.phase);
            var gSpark = Math.pow(
              Math.max(0, Math.sin(frame * 0.13 + item.phase)),
              5
            );
            ctx.save();
            ctx.font =
              'bold ' +
              Math.round((8.6 + normZ * 2.4) * fontScale) +
              'px ui-monospace, monospace';
            ctx.fillStyle = gSpark > 0.58 ? '#fffbeb' : palette.garland;
            ctx.globalAlpha = (0.42 + normZ * 0.52) * twinkle;
            ctx.shadowColor = palette.garland;
            ctx.shadowBlur = 5 + gSpark * 7;
            var gGlyph =
              gSpark > 0.62 ? '✦' : normZ > 0.52 ? '*' : '·';
            ctx.fillText(gGlyph, item.sx, item.sy);
            ctx.restore();
          }
        } else if (item.kind === 'trunk') {
          var trunkShade = Math.max(
            0,
            Math.min(1, (normZ * 0.35 + item.lit * 0.65) * item.ao)
          );
          var tIdx = Math.min(
            TRUNK_PALETTE.length - 1,
            Math.floor(trunkShade * TRUNK_PALETTE.length)
          );
          var tGlyph =
            item.lit > 0.66 ? '#' : normZ > 0.48 ? '|' : ':';
          ctx.font =
            'bold ' +
            Math.round(9.5 * fontScale) +
            'px ui-monospace, monospace';
          ctx.fillStyle = TRUNK_PALETTE[tIdx];
          ctx.globalAlpha = 0.65 + normZ * 0.35;
          ctx.fillText(tGlyph, item.sx, item.sy);
          ctx.globalAlpha = 1;
        } else if (item.kind === 'snowBase') {
          var snowShade = Math.max(
            0,
            Math.min(1, (normZ * 0.28 + item.lit * 0.72) * item.ao)
          );
          var snowSpark =
            normZ > 0.5 && Math.sin(frame * 0.08 + item.phase) > 0.88;
          if (snowSpark) {
            ctx.save();
            ctx.font =
              'bold ' +
              Math.round(9.5 * fontScale) +
              'px ui-monospace, monospace';
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#e2e8f0';
            ctx.shadowBlur = 4;
            ctx.globalAlpha = 0.88;
            ctx.fillText('*', item.sx, item.sy);
            ctx.restore();
          } else {
            var sIdx = Math.min(
              SNOW_BASE_PALETTE.length - 1,
              Math.floor(snowShade * SNOW_BASE_PALETTE.length)
            );
            var sGlyph =
              snowShade > 0.72 ? '~' : snowShade > 0.48 ? '·' : '.';
            ctx.font =
              Math.round(9.2 * fontScale) + 'px ui-monospace, monospace';
            ctx.fillStyle = SNOW_BASE_PALETTE[sIdx];
            ctx.globalAlpha = 0.45 + normZ * 0.4;
            ctx.fillText(sGlyph, item.sx, item.sy);
            ctx.globalAlpha = 1;
          }
        }
      }

      renderTopper(ctx, treeCenterX, treeCenterY, treeScale, angle, fontScale, frame);

      // 우하단 3D 불투명 선물 상자 (본체 -> 뚜껑 -> 리본 3단계 폐색)
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

      var bodyPts = [];
      var lidPts = [];
      var bowPts = [];
      for (var c = 0; c < STATIC_CUBE_POINTS.length; c++) {
        var cp = STATIC_CUBE_POINTS[c];
        var nx1 = cp.nx * cosY - cp.nz * sinY;
        var nz1 = cp.nx * sinY + cp.nz * cosY;
        var ny2 = cp.ny * cosP - nz1 * sinP;
        var nz2 = cp.ny * sinP + nz1 * cosP;
        if (!cp.alwaysVisible && nz2 <= 0.01) continue;

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
        var cProj = {
          kind: cp.kind,
          part: cp.part,
          ao: cp.ao != null ? cp.ao : 1,
          rz: z2,
          sx: cubeCenterX + x1 * cubeScale * cDepth,
          sy: cubeCenterY + floatY + y2 * cubeScale * cDepth,
          lit: lit,
        };
        if (cp.part === 'body') bodyPts.push(cProj);
        else if (cp.part === 'lid') lidPts.push(cProj);
        else bowPts.push(cProj);
      }

      bodyPts.sort(function (a, b) {
        return a.rz - b.rz;
      });
      lidPts.sort(function (a, b) {
        return a.rz - b.rz;
      });
      bowPts.sort(function (a, b) {
        return a.rz - b.rz;
      });

      function cubePx(basePx) {
        return Math.max(5.5, Number((basePx * fontScale).toFixed(1)));
      }

      function drawFaceQuads(faces, isLid) {
        for (var fi = 0; fi < faces.length; fi++) {
          var face = faces[fi];
          var fx1 = face.nx * cosY - face.nz * sinY;
          var fz1 = face.nx * sinY + face.nz * cosY;
          var fy2 = face.ny * cosP - fz1 * sinP;
          var fz2 = face.ny * sinP + fz1 * cosP;
          if (fz2 <= 0.01) continue;

          var fLit = Math.max(
            0,
            Math.min(
              1,
              (fx1 * LIGHT_DIR.x + fy2 * LIGHT_DIR.y + fz2 * LIGHT_DIR.z + 0.25) /
                1.25 +
                (isLid ? 0.14 : 0)
            )
          );
          var bIdx = Math.min(
            BOX_BACKING_PALETTE.length - 1,
            Math.floor(fLit * BOX_BACKING_PALETTE.length)
          );
          var backingCol = BOX_BACKING_PALETTE[bIdx];

          ctx.save();
          ctx.beginPath();
          for (var ci = 0; ci < face.corners.length; ci++) {
            var corner = face.corners[ci];
            var rx = corner[0] * cosY - corner[2] * sinY;
            var rz1 = corner[0] * sinY + corner[2] * cosY;
            var ry2 = corner[1] * cosP - rz1 * sinP;
            var rz2 = corner[1] * sinP + rz1 * cosP;
            var cd = 3.2 / (3.2 - rz2);
            var px = cubeCenterX + rx * cubeScale * cd;
            var py = cubeCenterY + floatY + ry2 * cubeScale * cd;
            if (ci === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.globalAlpha = 0.98;
          ctx.fillStyle = backingCol;
          ctx.fill();
          ctx.lineWidth = 1.2;
          ctx.lineJoin = 'round';
          ctx.strokeStyle = backingCol;
          ctx.stroke();
          ctx.restore();
        }
      }

      function drawCubePoints(list) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (var m = 0; m < list.length; m++) {
          var q = list[m];
          if (q.kind === 'box' || q.kind === 'lid') {
            var boost = q.kind === 'lid' ? 0.14 : 0;
            var lVal = Math.max(0, Math.min(1, (q.lit + boost) * q.ao));
            var bci = Math.min(
              BOX_RED_PALETTE.length - 1,
              Math.floor(lVal * BOX_RED_PALETTE.length)
            );
            var bchIdx = Math.min(
              BOX_CHAR_RAMP.length - 1,
              Math.floor(lVal * BOX_CHAR_RAMP.length)
            );
            ctx.shadowBlur = 0;
            ctx.font =
              'bold ' +
              cubePx(q.kind === 'lid' ? 8.6 : 8.2) +
              'px ui-monospace, monospace';
            ctx.fillStyle = BOX_RED_PALETTE[bci];
            ctx.globalAlpha = 0.9 + lVal * 0.1;
            ctx.fillText(BOX_CHAR_RAMP[bchIdx], q.sx, q.sy);
          } else if (q.kind === 'ribbon') {
            var rci = Math.min(
              RIBBON_GOLD_PALETTE.length - 1,
              Math.floor(q.lit * RIBBON_GOLD_PALETTE.length)
            );
            ctx.font = 'bold ' + cubePx(8.8) + 'px ui-monospace, monospace';
            ctx.fillStyle = RIBBON_GOLD_PALETTE[rci];
            ctx.globalAlpha = 1;
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = q.lit > 0.45 ? 5 * giftSpark : 0;
            ctx.fillText(
              q.lit > 0.62 ? '▓' : q.lit > 0.32 ? '#' : '=',
              q.sx,
              q.sy
            );
          } else if (q.kind === 'bowCenter') {
            ctx.font = 'bold ' + cubePx(13.5) + 'px ui-monospace, monospace';
            ctx.fillStyle = '#fef08a';
            ctx.shadowColor = '#fde047';
            ctx.shadowBlur = 11 * giftSpark;
            ctx.globalAlpha = 1;
            ctx.fillText('✦', q.sx, q.sy);
          } else if (q.kind === 'bowWing') {
            ctx.font = 'bold ' + cubePx(9.2) + 'px ui-monospace, monospace';
            ctx.fillStyle = q.rz > 0 ? '#fde047' : '#f59e0b';
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = q.rz > 0 ? 5 * giftSpark : 0;
            ctx.globalAlpha = q.rz > 0 ? 0.96 : 0.72;
            ctx.fillText(q.rz > 0 ? '#' : '*', q.sx, q.sy);
          }
        }
        ctx.restore();
      }

      drawFaceQuads(GIFT_BODY_FACES, false);
      drawCubePoints(bodyPts);
      drawFaceQuads(GIFT_LID_FACES, true);
      drawCubePoints(lidPts);
      drawCubePoints(bowPts);
    }

    function renderLoop(nowMs) {
      var dtSec =
        lastFrameMs > 0 && typeof nowMs === 'number'
          ? Math.min(0.05, Math.max(0, (nowMs - lastFrameMs) / 1000))
          : 1 / 60;
      if (typeof nowMs === 'number') lastFrameMs = nowMs;
      var step60 = dtSec * 60;
      frame += step60;
      if (!dragging) {
        angle += velocity * step60;
        velocity += (0.007 - velocity) * (1 - Math.pow(0.97, step60));
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
