import "server-only";
import { existsSync } from "node:fs";
import type { Browser } from "puppeteer-core";
import type { PageSize } from "@/features/resume/format";

/**
 * HTML → PDF via headless Chromium.
 *  - Vercel / Lambda: @sparticuz/chromium (serverless-optimised build)
 *  - Local dev: CHROME_EXECUTABLE_PATH or a detected system Chrome/Chromium
 * The browser is cached per warm instance; a fresh page is used per request.
 */

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

const LOCAL_CANDIDATES = [
  process.env.CHROME_EXECUTABLE_PATH,
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/snap/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].filter(Boolean) as string[];

let browserPromise: Promise<Browser> | null = null;
const FONT_BUDGET_MS = 8_000;

async function launch(): Promise<Browser> {
  const puppeteer = await import("puppeteer-core");
  if (isServerless) {
    const chromium = (await import("@sparticuz/chromium")).default;
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
      defaultViewport: { width: 1200, height: 1600 },
    });
  }
  const executablePath = LOCAL_CANDIDATES.find((p) => existsSync(p));
  if (!executablePath) {
    throw new Error("No local Chrome found. Set CHROME_EXECUTABLE_PATH in .env to enable PDF export in development.");
  }
  return puppeteer.launch({ executablePath, headless: true, args: ["--no-sandbox", "--font-render-hinting=none"] });
}

async function getBrowser(): Promise<Browser> {
  if (browserPromise) {
    const b = await browserPromise.catch(() => null);
    if (b?.connected) return b;
  }
  browserPromise = launch();
  const browser = await browserPromise;
  browser.on("disconnected", () => {
    browserPromise = null;
  });
  return browser;
}

export async function htmlToPdf(html: string, opts: { pageSize: PageSize }): Promise<Uint8Array> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    // Google Fonts serves variable woff2 to modern Chrome, which Skia can only embed as Type 3
    // fonts (heavier, poorly parsed by some ATS). A plain UA gets static per-weight TTFs,
    // which embed as real TrueType fonts.
    await page.setUserAgent("ResumeForge-PDF/1.0");
    // Only allow font requests to leave the sandbox; block everything else the HTML might reference.
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const url = req.url();
      if (url.startsWith("data:") || url.startsWith("https://fonts.googleapis.com/") || url.startsWith("https://fonts.gstatic.com/")) {
        void req.continue();
      } else {
        void req.abort();
      }
    });
    // Don't let a slow font CDN fail the export: wait for fonts up to a budget, then print
    // with whatever has loaded (the CSS stacks have sane fallbacks).
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 15_000 });
    await page.evaluate(
      (budget) =>
        Promise.race([
          (async () => {
            const link = document.querySelector<HTMLLinkElement>('link[rel="stylesheet"]');
            if (link && !link.sheet) await new Promise((r) => link.addEventListener("load", r, { once: true }));
            await document.fonts.ready;
          })(),
          new Promise((r) => setTimeout(r, budget)),
        ]),
      FONT_BUDGET_MS,
    );
    // Zero PDF margins: the HTML applies the page margin as per-page padding (see templates/html.ts),
    // so full-bleed page backgrounds can reach the paper edge.
    return await page.pdf({
      format: opts.pageSize === "A4" ? "a4" : "letter",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    });
  } finally {
    await page.close().catch(() => {});
  }
}
