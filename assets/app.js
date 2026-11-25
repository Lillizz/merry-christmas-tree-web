(function (root) {
  'use strict';

  function formatBytes(bytes) {
    if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes <= 0) {
      return '';
    }
    if (bytes >= 1024 * 1024) {
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
    return Math.max(1, Math.round(bytes / 1024)) + ' KB';
  }

  function formatDate(iso) {
    if (!iso || typeof iso !== 'string') return '';
    var d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '.' + m + '.' + day;
  }

  function formatDisplayVersion(tagOrVersion, fallbackVersion) {
    var raw = String(tagOrVersion || '').trim();
    if (!raw) {
      var fb = String(fallbackVersion || '2.1.0').trim().replace(/^v/i, '');
      return 'v' + fb;
    }
    var semverMatch = raw.match(/v?(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)/i);
    if (semverMatch) {
      return 'v' + semverMatch[1];
    }
    return raw.startsWith('v') ? raw : 'v' + raw;
  }

  function parseSemver(versionStr) {
    var m = String(versionStr || '').match(/(\d+)\.(\d+)\.(\d+)/);
    if (!m) return null;
    return [Number(m[1]), Number(m[2]), Number(m[3])];
  }

  function compareSemver(a, b) {
    var pa = parseSemver(a);
    var pb = parseSemver(b);
    if (!pa || !pb) return 0;
    for (var i = 0; i < 3; i++) {
      if (pa[i] !== pb[i]) return pa[i] - pb[i];
    }
    return 0;
  }

  function isCachedReleaseStale(cachedData, config) {
    if (!cachedData || !cachedData.found) {
      return true;
    }
    var fallbackVer = config && config.fallbackVersion;
    if (!fallbackVer || !cachedData.version) {
      return false;
    }
    if (!parseSemver(cachedData.version) || !parseSemver(fallbackVer)) {
      return false;
    }
    return compareSemver(cachedData.version, fallbackVer) < 0;
  }

  function pickNewestRelease(candidates) {
    if (!candidates || candidates.length === 0) return null;
    var best = candidates[0];
    for (var i = 1; i < candidates.length; i++) {
      var cur = candidates[i];
      var cmp = compareSemver(
        cur.tag_name || cur.name || '',
        best.tag_name || best.name || ''
      );
      if (cmp > 0) {
        best = cur;
      } else if (cmp === 0) {
        var timeA = Date.parse(cur.published_at || cur.created_at || '') || 0;
        var timeB = Date.parse(best.published_at || best.created_at || '') || 0;
        if (timeA > timeB) {
          best = cur;
        }
      }
    }
    return best;
  }

  function selectReleaseForEdition(releases, config) {
    if (!Array.isArray(releases) || releases.length === 0) {
      return null;
    }
    var cfg = config || {};
    var tagPrefix = String(cfg.tagPrefix || '').toLowerCase();
    var allowPlainVTag = Boolean(cfg.allowPlainVTag);
    var excludes = Array.isArray(cfg.excludeTagPrefixes)
      ? cfg.excludeTagPrefixes.map(function (p) {
          return String(p || '').toLowerCase();
        })
      : [];

    var nonDrafts = releases.filter(function (r) {
      return r && !r.draft;
    });
    if (nonDrafts.length === 0) return null;

    var stables = nonDrafts.filter(function (r) {
      return !r.prerelease;
    });
    var pool = stables.length > 0 ? stables : nonDrafts;

    if (tagPrefix) {
      var prefixed = pool.filter(function (r) {
        var tag = String(r.tag_name || '').toLowerCase();
        return tag.indexOf(tagPrefix) === 0;
      });
      if (prefixed.length > 0) {
        return pickNewestRelease(prefixed);
      }
    }

    if (allowPlainVTag) {
      var plainMatches = pool.filter(function (r) {
        var plainTag = String(r.tag_name || '').toLowerCase();
        var excluded = excludes.some(function (ex) {
          return ex && plainTag.indexOf(ex) === 0;
        });
        return !excluded;
      });
      if (plainMatches.length > 0) {
        return pickNewestRelease(plainMatches);
      }
    }

    return null;
  }

  function matchAssets(assets, fallbackDownloads) {
    var result = {
      'mac-arm64': null,
      'mac-x64': null,
      'win-x64': null,
    };
    var list = Array.isArray(assets) ? assets : [];
    var dmgFallbacks = [];

    for (var i = 0; i < list.length; i++) {
      var asset = list[i];
      if (!asset || !asset.name || !asset.browser_download_url) continue;

      var name = String(asset.name);
      var lower = name.toLowerCase();

      if (
        lower.endsWith('.blockmap') ||
        lower.endsWith('.yml') ||
        lower.endsWith('.yaml') ||
        lower.endsWith('.sig') ||
        lower.endsWith('.txt')
      ) {
        continue;
      }

      var item = {
        url: String(asset.browser_download_url),
        name: name,
        size: Number(asset.size) || 0,
        sizeText: formatBytes(Number(asset.size) || 0),
      };

      if (lower.endsWith('.dmg')) {
        if (
          lower.indexOf('arm64') !== -1 ||
          lower.indexOf('aarch64') !== -1 ||
          lower.indexOf('apple') !== -1
        ) {
          if (!result['mac-arm64']) result['mac-arm64'] = item;
        } else if (
          lower.indexOf('x64') !== -1 ||
          lower.indexOf('x86_64') !== -1 ||
          lower.indexOf('intel') !== -1 ||
          lower.indexOf('amd64') !== -1
        ) {
          if (!result['mac-x64']) result['mac-x64'] = item;
        } else {
          dmgFallbacks.push(item);
        }
      } else if (lower.endsWith('.exe')) {
        if (!result['win-x64']) result['win-x64'] = item;
      }
    }

    if (!result['mac-arm64'] && dmgFallbacks.length === 1) {
      result['mac-arm64'] = dmgFallbacks[0];
    }

    if (fallbackDownloads && typeof fallbackDownloads === 'object') {
      ['mac-arm64', 'mac-x64', 'win-x64'].forEach(function (key) {
        if (!result[key] && fallbackDownloads[key]) {
          result[key] = {
            url: String(fallbackDownloads[key]),
            name: '',
            size: 0,
            sizeText: '',
          };
        }
      });
    }

    return result;
  }

  var coreApi = {
    formatBytes: formatBytes,
    formatDate: formatDate,
    formatDisplayVersion: formatDisplayVersion,
    parseSemver: parseSemver,
    compareSemver: compareSemver,
    isCachedReleaseStale: isCachedReleaseStale,
    selectReleaseForEdition: selectReleaseForEdition,
    matchAssets: matchAssets,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = coreApi;
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    root.MerryDownloadCore = coreApi;
    return;
  }

  root.MerryDownloadCore = coreApi;

  var PLATFORM_LABELS = {
    'mac-arm64': {
      buttonLabel: 'macOS용 다운로드 (Apple Silicon)',
      shortLabel: 'macOS · Apple Silicon',
      guideTab: 'mac',
    },
    'mac-x64': {
      buttonLabel: 'macOS용 다운로드 (Intel)',
      shortLabel: 'macOS · Intel',
      guideTab: 'mac',
    },
    'win-x64': {
      buttonLabel: 'Windows용 다운로드 (64-bit)',
      shortLabel: 'Windows · 64-bit',
      guideTab: 'win',
    },
  };

  function detectUserPlatform() {
    var ua = (navigator.userAgent || '').toLowerCase();
    var platform = (navigator.platform || '').toLowerCase();
    var touchPoints = Number(navigator.maxTouchPoints || 0);

    var isMobileUa =
      /iphone|ipad|ipod|android|mobile|blackberry|iemobile|opera mini/.test(ua) ||
      (platform.indexOf('mac') !== -1 && touchPoints > 1);

    if (
      navigator.userAgentData &&
      typeof navigator.userAgentData.getHighEntropyValues === 'function'
    ) {
      return navigator.userAgentData
        .getHighEntropyValues(['platform', 'architecture'])
        .then(function (hints) {
          var hp = String(hints.platform || '').toLowerCase();
          var arch = String(hints.architecture || '').toLowerCase();
          if (navigator.userAgentData.mobile || hp === 'android' || hp === 'ios') {
            return { platform: 'mobile', needsArchHint: false };
          }
          if (hp.indexOf('win') !== -1) {
            return { platform: 'win-x64', needsArchHint: false };
          }
          if (hp.indexOf('mac') !== -1) {
            if (arch === 'x86') {
              return { platform: 'mac-x64', needsArchHint: false };
            }
            return {
              platform: 'mac-arm64',
              needsArchHint: arch !== 'arm',
            };
          }
          return { platform: 'unknown', needsArchHint: false };
        })
        .catch(function () {
          return fallbackDetect();
        });
    }

    return Promise.resolve(fallbackDetect());

    function fallbackDetect() {
      if (isMobileUa) {
        return { platform: 'mobile', needsArchHint: false };
      }
      if (ua.indexOf('windows') !== -1 || platform.indexOf('win') !== -1) {
        return { platform: 'win-x64', needsArchHint: false };
      }
      if (ua.indexOf('mac') !== -1 || platform.indexOf('mac') !== -1) {
        return { platform: 'mac-arm64', needsArchHint: true };
      }
      return { platform: 'unknown', needsArchHint: false };
    }
  }

  function getCacheKey(config) {
    return (
      'mct_release_cache_' +
      (config.edition || 'friends') +
      '_' +
      (config.githubRepo || 'default')
    );
  }

  function readCache(config, allowExpired) {
    try {
      var raw = localStorage.getItem(getCacheKey(config));
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.data) return null;
      var ttl = Number(config.cacheTtlMs || 5 * 60 * 1000);
      var expired = Date.now() - Number(parsed.savedAt || 0) > ttl;
      if (!allowExpired && (expired || isCachedReleaseStale(parsed.data, config))) {
        return null;
      }
      return parsed.data;
    } catch (_err) {
      return null;
    }
  }

  function writeCache(config, data) {
    try {
      localStorage.setItem(
        getCacheKey(config),
        JSON.stringify({ savedAt: Date.now(), data: data })
      );
    } catch (_err) {
      // ignore storage quota errors
    }
  }

  function buildReleasePayload(release, config) {
    if (!release) {
      return {
        found: false,
        version: formatDisplayVersion('', config.fallbackVersion),
        publishedAt: '',
        notes: '',
        releaseUrl: config.githubRepo
          ? 'https://github.com/' + config.githubRepo + '/releases'
          : '#download',
        assets: matchAssets([], config.fallbackDownloads),
      };
    }

    var cleanedNotes = String(release.body || '')
      .replace(/\r\n/g, '\n')
      .trim();
    if (cleanedNotes.length > 260) {
      cleanedNotes = cleanedNotes.slice(0, 257).trim() + '...';
    }

    return {
      found: true,
      version: formatDisplayVersion(
        release.tag_name || release.name,
        config.fallbackVersion
      ),
      publishedAt: formatDate(release.published_at || release.created_at),
      notes: cleanedNotes,
      releaseUrl:
        release.html_url ||
        (config.githubRepo
          ? 'https://github.com/' + config.githubRepo + '/releases'
          : '#download'),
      assets: matchAssets(release.assets, config.fallbackDownloads),
    };
  }

  function fetchLatestRelease(config) {
    var cached = readCache(config, false);
    if (cached) {
      return Promise.resolve(cached);
    }

    if (!config.githubRepo) {
      return Promise.resolve(buildReleasePayload(null, config));
    }

    var apiUrl =
      'https://api.github.com/repos/' +
      config.githubRepo +
      '/releases?per_page=50';

    return fetch(apiUrl, {
      cache: 'no-cache',
      headers: {
        Accept: 'application/vnd.github+json',
      },
    })
      .then(function (res) {
        if (!res.ok) {
          throw new Error('GitHub API status ' + res.status);
        }
        return res.json();
      })
      .then(function (releases) {
        var matched = selectReleaseForEdition(releases, config);
        var payload = buildReleasePayload(matched, config);
        writeCache(config, payload);
        return payload;
      })
      .catch(function () {
        var stale = readCache(config, true);
        if (stale) return stale;
        return buildReleasePayload(null, config);
      });
  }

  function setText(selectorOrEl, text) {
    var el =
      typeof selectorOrEl === 'string'
        ? document.querySelector(selectorOrEl)
        : selectorOrEl;
    if (el) el.textContent = text;
  }

  function setButtonReady(btn, url, label) {
    if (!btn) return;
    if (url) {
      btn.setAttribute('href', url);
      btn.setAttribute('download', '');
      btn.removeAttribute('aria-disabled');
      btn.classList.remove('is-disabled');
    } else {
      btn.setAttribute('href', '#download');
      btn.removeAttribute('download');
      btn.setAttribute('aria-disabled', 'true');
      btn.classList.add('is-disabled');
    }
    var labelEl = btn.querySelector('[data-btn-label]') || btn;
    if (label && labelEl) {
      labelEl.textContent = label;
    }
  }

  function copyToClipboard(text, buttonEl, defaultLabel) {
    if (!text) return;
    var done = function () {
      if (!buttonEl) return;
      var textTarget = buttonEl.querySelector('[data-copy-label]') || buttonEl;
      textTarget.textContent = '복사됨 ✓';
      buttonEl.classList.add('is-copied');
      window.setTimeout(function () {
        textTarget.textContent = defaultLabel;
        buttonEl.classList.remove('is-copied');
      }, 1800);
    };

    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(text).then(done).catch(fallbackCopy);
    } else {
      fallbackCopy();
    }

    function fallbackCopy() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        done();
      } catch (_e) {
        // ignore
      }
      document.body.removeChild(ta);
    }
  }

  function initGuideTabs(defaultTab) {
    var tabs = document.querySelectorAll('[data-guide-tab]');
    var panels = document.querySelectorAll('[data-guide-panel]');
    if (!tabs.length || !panels.length) return;

    function activate(tabName) {
      tabs.forEach(function (tab) {
        var active = tab.getAttribute('data-guide-tab') === tabName;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      panels.forEach(function (panel) {
        var active = panel.getAttribute('data-guide-panel') === tabName;
        panel.hidden = !active;
      });
    }

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        activate(tab.getAttribute('data-guide-tab'));
      });
    });

    activate(defaultTab || 'mac');
  }

  function initAsciiVisuals() {
    if (!window.MerryAsciiScene) return;

    var treeCanvas = document.getElementById('hero-tree-canvas');
    var treeCtrl = window.MerryAsciiScene.mountTree(treeCanvas, {
      theme: 'classic',
      interactiveDrag: true,
    });

    var themeBtns = document.querySelectorAll('[data-theme-btn]');
    themeBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var themeId = btn.getAttribute('data-theme-btn');
        themeBtns.forEach(function (other) {
          other.classList.toggle('is-active', other === btn);
        });
        if (treeCtrl) treeCtrl.setTheme(themeId);
      });
    });

    var snowCanvas = document.getElementById('snow-overlay-canvas');
    var snowCtrl = window.MerryAsciiScene.mountSnow(snowCanvas);
    var snowToggle = document.querySelector('[data-snow-toggle]');

    if (snowToggle && snowCtrl) {
      var syncSnowButton = function () {
        var on = snowCtrl.isEnabled();
        snowToggle.classList.toggle('is-active', on);
        snowToggle.setAttribute('aria-pressed', on ? 'true' : 'false');
        var label = snowToggle.querySelector('[data-snow-label]');
        if (label) label.textContent = on ? '눈 ON' : '눈 OFF';
      };

      syncSnowButton();
      snowToggle.addEventListener('click', function () {
        snowCtrl.setEnabled(!snowCtrl.isEnabled());
        syncSnowButton();
      });
    }
  }

  function initCopyButtons() {
    var copyBtns = document.querySelectorAll('[data-copy-text]');
    copyBtns.forEach(function (btn) {
      var labelEl = btn.querySelector('[data-copy-label]') || btn;
      var originalLabel = labelEl.textContent;
      btn.addEventListener('click', function () {
        var text = btn.getAttribute('data-copy-text');
        if (text === '__CURRENT_URL__') {
          text = window.location.href;
        }
        copyToClipboard(text, btn, originalLabel);
      });
    });
  }

  function renderReleaseAndPlatform(releaseData, platformInfo, config) {
    setText('#nav-version-badge', releaseData.version);
    setText('#release-version-badge', releaseData.version);

    var dateBadge = document.getElementById('release-date-badge');
    if (dateBadge) {
      if (releaseData.publishedAt) {
        dateBadge.textContent = releaseData.publishedAt + ' 배포';
        dateBadge.hidden = false;
      } else {
        dateBadge.hidden = true;
      }
    }

    var notesBox = document.getElementById('release-notes-box');
    var notesText = document.getElementById('release-notes-text');
    if (notesBox && notesText) {
      if (releaseData.notes) {
        notesText.textContent = releaseData.notes;
        notesBox.hidden = false;
      } else {
        notesBox.hidden = true;
      }
    }

    var allReleasesLink = document.getElementById('github-releases-link');
    if (allReleasesLink && releaseData.releaseUrl) {
      allReleasesLink.setAttribute('href', releaseData.releaseUrl);
    }

    var plat = platformInfo.platform;
    var heroBtn = document.getElementById('hero-download-btn');
    var heroNote = document.getElementById('hero-platform-note');
    var mobileNotice = document.getElementById('mobile-notice');

    if (plat === 'mobile') {
      if (mobileNotice) mobileNotice.hidden = false;
      setButtonReady(heroBtn, '#download', 'OS별 설치 파일 보기');
      if (heroBtn) heroBtn.removeAttribute('download');
      if (heroNote) {
        heroNote.textContent =
          'PC (macOS 12+ · Windows 10/11)에서 다운로드 후 설치해 주세요.';
      }
    } else if (PLATFORM_LABELS[plat]) {
      if (mobileNotice) mobileNotice.hidden = true;
      var meta = PLATFORM_LABELS[plat];
      var asset = releaseData.assets[plat];
      if (asset && asset.url) {
        var sizeSuffix = asset.sizeText ? ' · ' + asset.sizeText : '';
        setButtonReady(heroBtn, asset.url, meta.buttonLabel);
        if (heroNote) {
          heroNote.textContent =
            releaseData.version +
            ' · ' +
            meta.shortLabel +
            sizeSuffix +
            (platformInfo.needsArchHint
              ? ' (Intel Mac은 아래에서 선택)'
              : '');
        }
      } else {
        setButtonReady(heroBtn, releaseData.releaseUrl, meta.buttonLabel);
        if (heroBtn) heroBtn.removeAttribute('download');
        if (heroNote) {
          heroNote.textContent =
            '현재 릴리즈 파일을 준비 중입니다 · GitHub Releases에서 확인하기';
        }
      }
    } else {
      if (mobileNotice) mobileNotice.hidden = true;
      setButtonReady(heroBtn, '#download', 'OS별 설치 파일 선택하기');
      if (heroBtn) heroBtn.removeAttribute('download');
      if (heroNote) {
        heroNote.textContent =
          releaseData.version + ' · macOS 12+ 및 Windows 10/11 지원';
      }
    }

    ['mac-arm64', 'mac-x64', 'win-x64'].forEach(function (key) {
      var card = document.querySelector('[data-platform-card="' + key + '"]');
      if (!card) return;

      var isRecommended = plat === key;
      card.classList.toggle('is-recommended', isRecommended);
      var recBadge = card.querySelector('[data-rec-badge]');
      if (recBadge) recBadge.hidden = !isRecommended;

      var assetItem = releaseData.assets[key];
      var metaEl = card.querySelector('[data-asset-meta]');
      var dlBtn = card.querySelector('[data-card-download]');

      if (assetItem && assetItem.url) {
        if (metaEl) {
          metaEl.textContent = assetItem.sizeText
            ? releaseData.version + ' · ' + assetItem.sizeText
            : releaseData.version + ' · 바로 다운로드';
        }
        setButtonReady(dlBtn, assetItem.url, '설치 파일 다운로드');
      } else {
        if (metaEl) {
          metaEl.textContent = '릴리즈 파일 준비 중';
        }
        if (dlBtn) {
          dlBtn.setAttribute('href', releaseData.releaseUrl);
          dlBtn.removeAttribute('download');
          dlBtn.classList.add('is-secondary');
          var lbl = dlBtn.querySelector('[data-btn-label]') || dlBtn;
          lbl.textContent = 'GitHub Releases 보기';
        }
      }
    });

    if (
      config.edition === 'company' &&
      !releaseData.found &&
      allReleasesLink &&
      config.githubRepo
    ) {
      allReleasesLink.setAttribute(
        'href',
        'https://github.com/' + config.githubRepo + '/releases'
      );
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var config = window.APP_DOWNLOAD_CONFIG || {};
    initAsciiVisuals();
    initCopyButtons();

    var platformPromise = detectUserPlatform();
    var releasePromise = fetchLatestRelease(config);

    platformPromise.then(function (platformInfo) {
      var guideTab =
        PLATFORM_LABELS[platformInfo.platform] &&
        PLATFORM_LABELS[platformInfo.platform].guideTab;
      initGuideTabs(guideTab || 'mac');

      releasePromise.then(function (releaseData) {
        renderReleaseAndPlatform(releaseData, platformInfo, config);
      });
    });
  });
})(typeof window !== 'undefined' ? window : globalThis);
