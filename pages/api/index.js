import chromium from "chrome-aws-lambda";
import fs from "fs";
import allowedDomains from "../../allowed-domains.js";

const normalizeOrigin = (origin) => String(origin || "").trim();

// Browser origins allowed to call this API: the allowed-domains.js file, the
// ALLOWED_ORIGINS env var, and the request's own host (same-origin).
function getAllowedOrigins(host) {
  const fromFile = allowedDomains.map(normalizeOrigin).filter(Boolean);
  const fromEnv = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map(normalizeOrigin)
    .filter(Boolean);
  const fromHost = host ? [`https://${host}`, `http://${host}`] : [];
  return new Set([...fromEnv, ...fromFile, ...fromHost]);
}

function getExecutablePath() {
  if (process.env.CHROME_EXECUTABLE_PATH) {
    return process.env.CHROME_EXECUTABLE_PATH;
  }
  const paths = [
    // macOS
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    // Linux
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    // Windows
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ];
  return paths.find((p) => fs.existsSync(p)) || null;
}

async function dismissCookieBanners(page) {
  try {
    // 1. Attempt clicking common accept/agree buttons
    const acceptSelectors = [
      "#onetrust-accept-btn-handler",
      "#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll",
      "#CybotCookiebotDialogBodyButtonAccept",
      "#accept-cookies",
      "#accept-all-cookies",
      ".cmplz-accept",
      "#cmplz-accept",
      ".cc-btn.cc-allow",
      ".cc-allow",
      "button[id*='cookie-accept' i]",
      "button[id*='accept-cookie' i]",
      "button[class*='cookie-accept' i]",
      "button[class*='accept-cookie' i]",
      "button[aria-label*='accept' i]",
    ];

    for (const sel of acceptSelectors) {
      try {
        const btn = await page.$(sel);
        if (btn) {
          await btn.click();
          await new Promise((r) => setTimeout(r, 200));
          break;
        }
      } catch (_) {}
    }

    // 2. Inject CSS rules to hide standard CMPs and generic cookie banners
    await page.addStyleTag({
      content: `
        /* Known CMPs */
        #onetrust-consent-sdk,
        #onetrust-banner-sdk,
        .onetrust-pc-dark-filter,
        #CybotCookiebotDialog,
        #CybotCookiebotDialogBodyUnderlay,
        #cmplz-cookiebanner,
        .cmplz-cookiebanner,
        .qc-cmp2-container,
        #qc-cmp2-ui,
        #didomi-host,
        #didomi-popup,
        #didomi-notice,
        [id*="sp_message_container"],
        div[id*="sp_message"],
        iframe[id*="sp_message"],
        #truste-consent-track,
        .truste_box_overlay,
        .truste_overlay,
        .truste_popframe,
        .klaro,
        #usercentrics-root,
        #iubenda-cs-banner,
        .iubenda-cs-overlay,
        #cookie-law-info-bar,
        #cookie-law-info-again,
        .cc-banner,
        .cc-window,
        .cc-floating,
        #coiOverlay,
        #coiConsentBanner,
        #ccc,
        #ccc-overlay,

        /* Generic cookie/consent selectors */
        [id*="cookie-banner" i],
        [id*="cookie-consent" i],
        [id*="cookiebanner" i],
        [id*="cookie-notice" i],
        [id*="cookie-law" i],
        [id*="cookies-banner" i],
        [id*="consent-banner" i],
        [id*="cookie-bar" i],
        [id*="cookie-popup" i],
        [class*="cookie-banner" i],
        [class*="cookie-consent" i],
        [class*="cookiebanner" i],
        [class*="cookie-notice" i],
        [class*="cookies-banner" i],
        [class*="consent-banner" i],
        [class*="cookie-bar" i],
        [class*="cookie-popup" i],
        [aria-label*="cookie" i][role="dialog"],
        [aria-label*="cookie" i][role="region"],
        [aria-label*="consent" i][role="dialog"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
          clip: rect(0,0,0,0) !important;
          height: 0 !important;
          max-height: 0 !important;
          z-index: -99999 !important;
        }

        /* Ensure page scroll and layout are restored */
        html, body {
          overflow: auto !important;
          position: static !important;
        }
      `,
    });

    // 3. Dynamic evaluation: remove floating/fixed elements whose text mentions cookie/consent
    await page.evaluate(() => {
      try {
        const keywords = ["cookie", "cookies", "consent", "gdpr", "accept all cookies", "we use cookies"];
        const elements = document.querySelectorAll("div, section, aside, dialog, [role='dialog'], [role='region']");
        for (const el of elements) {
          const style = window.getComputedStyle(el);
          const isFloating = style.position === "fixed" || style.position === "sticky" || parseInt(style.zIndex, 10) > 999;
          if (isFloating) {
            const text = (el.innerText || el.textContent || "").toLowerCase();
            if (keywords.some((k) => text.includes(k)) && text.length < 1500) {
              el.remove();
            }
          }
        }
      } catch (_) {}
    });
  } catch (err) {
    console.warn("Cookie blocker warning:", err.message);
  }
}

// CORS: only allowlisted browser origins may call this API cross-origin.
// The allowlist lives in allowed-domains.js and can be extended at runtime
// with ALLOWED_ORIGINS="https://a.com,https://b.com".
// Requests without an Origin header (curl, server-to-server) are not CORS
// requests and are always allowed. Same-origin requests (the request's own host)
// are always allowed so this page keeps working on any deployment.
function applyCorsPolicy(req, res) {
  const origin = req.headers.origin;
  res.setHeader("Vary", "Origin");

  if (!origin) {
    return true;
  }

  const allowlist = getAllowedOrigins(req.headers.host);

  if (allowlist.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Max-Age", "86400");
    return true;
  }

  return false;
}

export default async function handler(req, res) {
  const originAllowed = applyCorsPolicy(req, res);

  // Preflight requests never need a browser launched
  if (req.method === "OPTIONS") {
    if (!originAllowed) {
      return res.status(403).json({ error: "Origin not allowed" });
    }
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed. Use GET." });
  }

  if (!originAllowed) {
    return res.status(403).json({ error: "Origin not allowed" });
  }

  let { url, waitUntil, timeout, width, height, blockCookies } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Missing 'url' query parameter" });
  }

  // Ensure URL has protocol
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  const isVercel = process.env.VERCEL === "1" || !!process.env.AWS_REGION;

  // On Vercel / AWS Lambda, use chromium.executablePath; locally, find local Chrome
  const executablePath = isVercel
    ? await chromium.executablePath
    : (getExecutablePath() || (await chromium.executablePath));

  // Filter out flags like '--use-gl=swiftshader' that crash modern Chrome locally
  const args = isVercel
    ? chromium.args
    : (chromium.args || []).filter((arg) => arg !== "--use-gl=swiftshader");

  const viewportWidth = parseInt(width, 10) || 1280;
  const viewportHeight = parseInt(height, 10) || 720;

  let browser = null;

  try {
    browser = await chromium.puppeteer.launch({
      args,
      defaultViewport: {
        width: viewportWidth,
        height: viewportHeight,
      },
      executablePath,
      headless: true,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    await page.setViewport({
      width: viewportWidth,
      height: viewportHeight,
      deviceScaleFactor: 1,
    });

    const navTimeout = parseInt(timeout, 10) || 30000;
    const waitCondition = waitUntil || "load";

    try {
      await page.goto(url, { waitUntil: waitCondition, timeout: navTimeout });
    } catch (navError) {
      if (navError.name === "TimeoutError") {
        console.warn(`Navigation timeout after ${navTimeout}ms waiting for '${waitCondition}'. Capturing rendered state...`);
      } else {
        throw navError;
      }
    }

    // Make sure the document finished loading and the network went idle so
    // late XHRs, fonts, and images don't get cut off mid-render.
    try {
      await page.waitForFunction(() => document.readyState === "complete", { timeout: navTimeout });
    } catch (_) {}
    try {
      await page.waitForNetworkIdle({ idleTime: 500, timeout: 10000 });
    } catch (_) {}

    // Scroll through the page to trigger lazy-loaded images and JS-rendered
    // content, then return to the top for the capture.
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        const scrollHeight = Math.max(
          document.documentElement.scrollHeight,
          document.body ? document.body.scrollHeight : 0
        );
        let scrolled = 0;
        const step = () => {
          const distance = Math.floor(window.innerHeight * 0.8);
          window.scrollBy(0, distance);
          scrolled += distance;
          if (scrolled >= scrollHeight) {
            window.scrollTo(0, 0);
            resolve();
          } else {
            setTimeout(step, 150);
          }
        };
        step();
      });
    });

    // Give lazy-loaded content triggered by scrolling a chance to arrive
    try {
      await page.waitForNetworkIdle({ idleTime: 500, timeout: 10000 });
    } catch (_) {}

    // Brief settle delay for final animations to end
    await new Promise((r) => setTimeout(r, 500));

    // Dismiss & strip cookie consent banners and overlays for a clutter-free screenshot
    if (blockCookies !== "false") {
      await dismissCookieBanners(page);
    }

    const screenshot = await page.screenshot({
      type: "png",
      clip: {
        x: 0,
        y: 0,
        width: viewportWidth,
        height: viewportHeight,
      },
    });

    res.setHeader("Content-Type", "image/png");
    return res.send(screenshot);
  } catch (error) {
    console.error("Handler error:", error);
    return res.status(500).json({ error: error.message || "Failed to process request" });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
