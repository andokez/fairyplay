
const http = require('http');
const { URL } = require('url');
const { exec } = require('child_process');
const util = require('util');
const { chromium } = require('playwright');

const execPromise = util.promisify(exec);

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8'
  });
  res.end(JSON.stringify(payload));
}

async function fetchTextWithCurl(targetUrl, referer = '') {
  const safeUrl = String(targetUrl).replace(/"/g, '\\"');
  const safeReferer = String(referer || targetUrl).replace(/"/g, '\\"');

  const cmd =
    `curl -L --silent --show-error ` +
    `-A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36" ` +
    `-H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" ` +
    `-H "Accept-Language: es-ES,es;q=0.9,en;q=0.8" ` +
    `-H "Cache-Control: no-cache" ` +
    `-H "Pragma: no-cache" ` +
    `-H "Referer: ${safeReferer}" ` +
    `"${safeUrl}"`;

  const { stdout } = await execPromise(cmd, { maxBuffer: 20 * 1024 * 1024 });
  return stdout || '';
}

function cleanFoundUrl(value) {
  if (!value) return null;
  return String(value).replace(/\\\//g, '/').replace(/&amp;/g, '&').trim();
}

function isPlayableUrl(value) {
  if (!value) return false;
  return /(\.m3u8|\.m3u|\.mp4|\.m4v|\.webm|\.mov|\.mkv|\.mpd|\.ts|\.ogv)(\?|$)/i.test(value) || /\/master\.m3u8(\?|$)/i.test(value);
}

function toAbsoluteUrl(value, baseUrl) {
  if (!value) return null;
  try { return new URL(cleanFoundUrl(value), baseUrl).toString(); }
  catch { return cleanFoundUrl(value); }
}

function extractGenericPlayableUrlsFromHtml(html, baseUrl) {
  if (!html) return [];
  const patterns = [
    /(?:file|src|url)\s*[:=]\s*['"]([^'"]+\.(?:m3u8|m3u|mp4|m4v|webm|mov|mkv|mpd|ts|ogv)[^'"]*)['"]/ig,
    /['"](https?:\/\/[^'"]+\.(?:m3u8|m3u|mp4|m4v|webm|mov|mkv|mpd|ts|ogv)[^'"]*)['"]/ig,
    /['"]((?:\/|\.\/|\.\.\/)[^'"]+\.(?:m3u8|m3u|mp4|m4v|webm|mov|mkv|mpd|ts|ogv)[^'"]*)['"]/ig
  ];
  const found = [];
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(html))) {
      const direct = toAbsoluteUrl(match[1] || match[0], baseUrl);
      if (isPlayableUrl(direct) && !found.includes(direct)) found.push(direct);
      if (found.length >= 15) return found;
    }
  }
  return found;
}

function extractVidmolyUrlFromHtml(html) {
  if (!html) return null;
  const patterns = [
    /var\s+playerInstance\s*=\s*player\.setup\s*\(\s*\{[\s\S]*?sources\s*:\s*\[\s*\{\s*file\s*:\s*'([^']+)'/i,
    /var\s+playerInstance\s*=\s*player\.setup\s*\(\s*\{[\s\S]*?sources\s*:\s*\[\s*\{\s*file\s*:\s*"([^"]+)"/i,
    /player\.setup\s*\(\s*\{[\s\S]*?sources\s*:\s*\[\s*\{\s*file\s*:\s*'([^']+)'/i,
    /player\.setup\s*\(\s*\{[\s\S]*?sources\s*:\s*\[\s*\{\s*file\s*:\s*"([^"]+)"/i,
    /sources\s*:\s*\[\s*\{\s*file\s*:\s*'([^']+)'/i,
    /sources\s*:\s*\[\s*\{\s*file\s*:\s*"([^"]+)"/i
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(html);
    const found = cleanFoundUrl(match ? match[1] : null);
    if (isPlayableUrl(found)) return found;
  }
  return null;
}

function extractStreamwishUrlFromHtml(html) {
  if (!html) return null;
  const patterns = [
    /sources\s*:\s*\[\s*\{\s*file\s*:\s*"([^"]+\.m3u8[^"]*)"/i,
    /sources\s*:\s*\[\s*\{\s*file\s*:\s*'([^']+\.m3u8[^']*)'/i,
    /(https?:\/\/[^"'\\\s]+\.m3u8[^"'\\\s]*)/i
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(html);
    const found = cleanFoundUrl(match ? (match[1] || match[0]) : null);
    if (isPlayableUrl(found)) return found;
  }
  return null;
}

function extractVoeUrlFromHtml(html) {
  if (!html) return null;
  const match = html.match(/['"](https?:\/\/[^'"]+\.m3u8[^'"]*)['"]/i);
  const found = cleanFoundUrl(match ? match[1] : null);
  return isPlayableUrl(found) ? found : null;
}

async function resolveWithPlaywright(target, options = {}) {
  const manual = !!options.manual;
  const referer = options.referer || '';
  const browser = await chromium.launch({ headless: !manual });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 768 },
    extraHTTPHeaders: referer ? { Referer: referer } : undefined
  });
  const page = await context.newPage();
  const foundUrls = [];
  const candidates = [];

  const scoreCandidate = (url, contentType = '') => {
    let score = 0;
    const u = String(url || '').toLowerCase();
    const ct = String(contentType || '').toLowerCase();

    if (/\/master\.m3u8(\?|$)/i.test(u)) score += 100;
    if (/\.m3u8(\?|$)/i.test(u)) score += 60;
    if (/\.mpd(\?|$)/i.test(u)) score += 40;
    if (/\.mp4(\?|$)/i.test(u)) score += 20;
    if (ct.includes('application/vnd.apple.mpegurl')) score += 80;
    if (ct.includes('application/x-mpegurl')) score += 80;
    if (ct.includes('application/dash+xml')) score += 50;
    if (ct.includes('video/')) score += 20;
    if (u.includes('/hls')) score += 15;
    if (u.includes('playlist')) score += 10;
    if (u.includes('chunk')) score -= 15;
    if (u.includes('.ts?') || /\.ts(\?|$)/i.test(u)) score += 10;

    return score;
  };

  const pushCandidate = (candidate, contentType = '') => {
    if (!candidate) return;
    const clean = cleanFoundUrl(candidate);
    if (!isPlayableUrl(clean)) return;
    if (!foundUrls.includes(clean)) foundUrls.push(clean);
    const score = scoreCandidate(clean, contentType);
    const already = candidates.find(x => x.url === clean);
    if (!already) candidates.push({ url: clean, score, contentType });
    else if (score > already.score) {
      already.score = score;
      already.contentType = contentType;
    }
  };

  const getBestCandidate = () => {
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0]?.url || null;
  };

  page.on('request', request => pushCandidate(request.url(), ''));
  page.on('response', async response => {
    try {
      const headers = await response.allHeaders();
      pushCandidate(response.url(), headers['content-type'] || '');
    } catch {
      pushCandidate(response.url(), '');
    }
  });

  try {
    await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 30000, referer: referer || undefined });
    const html = await page.content();
    pushCandidate(extractVidmolyUrlFromHtml(html), '');
    pushCandidate(extractStreamwishUrlFromHtml(html), '');
    pushCandidate(extractVoeUrlFromHtml(html), '');
    pushCandidate(cleanFoundUrl((html.match(/(https?:\/\/[^"'\\\s]+\.m3u8[^"'\\\s]*)/i) || [])[1]), '');

    if (manual) {
      try { await page.bringToFront(); } catch {}
      const selectors = [
        'text=/proceed to video/i',
        'text=/continue to video/i',
        'text=/continue/i',
        'text=/verify/i',
        'iframe',
        'button',
        '#captcha',
        '.g-recaptcha'
      ];
      for (const selector of selectors) {
        try {
          const el = page.locator(selector).first();
          if (await el.count()) {
            await el.scrollIntoViewIfNeeded().catch(() => {});
            break;
          }
        } catch {}
      }

      const started = Date.now();
      const maxWait = 120000;
      while (Date.now() - started < maxWait) {
        const best = getBestCandidate();
        if (best) {
          return { streamUrl: best, allUrls: foundUrls, ranked: candidates };
        }
        await page.waitForTimeout(1000);
      }
      return { streamUrl: null, allUrls: foundUrls, ranked: candidates };
    }

    await page.waitForTimeout(5000);
    const selectors = ['button', '.play', '.jw-icon-playback', '.jw-display-icon-container', '.vjs-big-play-button', '#vplayer', 'video'];
    for (const selector of selectors) {
      try {
        const el = page.locator(selector).first();
        if (await el.count()) {
          await el.click({ timeout: 1000 }).catch(() => {});
          await page.waitForTimeout(1200);
        }
      } catch {}
    }
    await page.waitForTimeout(4000);

    return { streamUrl: getBestCandidate(), allUrls: foundUrls, ranked: candidates };
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

async function resolveWithYtDlpIfInstalled(target) {
  try {
    const { stdout } = await execPromise(`yt-dlp -g "${target}"`, { maxBuffer: 20 * 1024 * 1024 });
    return String(stdout || '').trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

async function handleResolve(req, res, reqUrl) {
  const target = reqUrl.searchParams.get('url');
  const manual = reqUrl.searchParams.get('manual') === '1';
  const referer = reqUrl.searchParams.get('referer') || '';

  if (!target) return sendJson(res, 400, { success: false, error: 'URL es requerida' });

  let urlObj;
  try { urlObj = new URL(target); }
  catch { return sendJson(res, 400, { success: false, error: 'URL inválida' }); }

  if (!['http:', 'https:'].includes(urlObj.protocol)) {
    return sendJson(res, 400, { success: false, error: 'Protocolo no soportado' });
  }

  try {
    const hostname = urlObj.hostname.toLowerCase();

    if (hostname.includes('vidmoly.')) {
      const html = await fetchTextWithCurl(target, referer || target);
      const direct = extractVidmolyUrlFromHtml(html);
      if (direct) {
        return sendJson(res, 200, {
          success: true,
          method: 'vidmoly-player-setup',
          streamUrl: direct
        });
      }
    }

    if (hostname.includes('streamwish') || hostname.includes('streamtape') || hostname.includes('wish')) {
      const html = await fetchTextWithCurl(target, referer || target);
      const direct = extractStreamwishUrlFromHtml(html);
      if (direct) {
        return sendJson(res, 200, {
          success: true,
          method: 'streamwish-html',
          streamUrl: direct
        });
      }
    }

    if (hostname.includes('voe')) {
      const html = await fetchTextWithCurl(target, referer || target);
      const direct = extractVoeUrlFromHtml(html);
      if (direct) {
        return sendJson(res, 200, {
          success: true,
          method: 'voe-html',
          streamUrl: direct
        });
      }
    }

    const genericHtml = await fetchTextWithCurl(target, referer || target).catch(() => '');
    if (genericHtml) {
      const genericCandidates = extractGenericPlayableUrlsFromHtml(genericHtml, target);
      if (genericCandidates.length) {
        return sendJson(res, 200, {
          success: true,
          method: 'generic-html',
          streamUrl: genericCandidates[0],
          allUrls: genericCandidates
        });
      }
    }

    const pwResult = await resolveWithPlaywright(target, { manual, referer });
    if (pwResult.streamUrl) {
      return sendJson(res, 200, {
        success: true,
        method: manual ? 'playwright-manual-window' : 'playwright-network',
        streamUrl: pwResult.streamUrl,
        allUrls: pwResult.allUrls,
        ranked: pwResult.ranked
      });
    }

    if (manual) {
      return sendJson(res, 408, {
        success: false,
        method: 'playwright-manual-window',
        error: 'No se detectó ningún stream tras la resolución manual'
      });
    }

    const ytUrls = await resolveWithYtDlpIfInstalled(target);
    if (ytUrls.length) {
      return sendJson(res, 200, {
        success: true,
        method: 'yt-dlp',
        streamUrl: ytUrls[0],
        allUrls: ytUrls
      });
    }

    return sendJson(res, 404, {
      success: false,
      error: 'No se pudo extraer la URL del stream'
    });
  } catch (error) {
    console.error('Error resolviendo stream:', error);
    return sendJson(res, 500, {
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
}

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, 'http://localhost:3000');

  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  if (req.method === 'GET' && reqUrl.pathname === '/api/resolve') {
    return handleResolve(req, res, reqUrl);
  }

  return sendJson(res, 404, { success: false, error: 'Ruta no encontrada' });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log('Backend listo en puerto ' + PORT);
});
