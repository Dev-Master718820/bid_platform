import "server-only";
import { fontStylesheetUrl, getFont } from "@/templates/fonts";

/**
 * One source of font files for everything that renders a resume.
 *
 * A plain user agent makes Google Fonts serve static per-weight TrueType files. Those exact files are
 *  - inlined as base64 @font-face into PDF HTML (no network during printing, real TrueType embedding;
 *    variable woff2 would be embedded as Type 3), and
 *  - served to the live preview through /api/fonts/* (see fontProxyCss / fetchFontFile).
 * Using byte-identical files in both places keeps glyph metrics — and therefore line wraps and page
 * breaks — identical between preview and PDF. Results are cached per warm server instance.
 */

const UA = "ResumeForge-PDF/1.0";
const TIMEOUT_MS = 6_000;
const ATTEMPTS = 3;
const GSTATIC = "https://fonts.gstatic.com";
/** Allowed font file paths on fonts.gstatic.com (also the proxy's allow-list). */
export const FONT_PATH_RE = /^\/s\/[a-z0-9]+\/v\d+\/[A-Za-z0-9_-]+\.(ttf|woff2?)$/;

const cssCache = new Map<string, Promise<string>>();
const fileCache = new Map<string, Promise<Buffer>>();
const embedCache = new Map<string, Promise<string>>();

async function fetchWithRetry(url: string): Promise<Response> {
  let lastError: unknown;
  for (let i = 0; i < ATTEMPTS; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (res.ok) return res;
      lastError = new Error(`HTTP ${res.status} for ${url}`);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

function cached<T>(map: Map<string, Promise<T>>, key: string, load: () => Promise<T>): Promise<T> {
  let p = map.get(key);
  if (!p) {
    p = load();
    map.set(key, p);
    p.catch(() => map.delete(key)); // don't cache failures
  }
  return p;
}

/** Google's stylesheet (static TTF variant) for a known font family. */
function sourceCss(family: string, withMono: boolean): Promise<string> {
  const url = fontStylesheetUrl(family, withMono);
  return cached(cssCache, url, async () => (await fetchWithRetry(url)).text());
}

export function fetchFontFile(path: string): Promise<Buffer> {
  if (!FONT_PATH_RE.test(path)) return Promise.reject(new Error("Invalid font path"));
  return cached(fileCache, path, async () => Buffer.from(await (await fetchWithRetry(GSTATIC + path)).arrayBuffer()));
}

const fontUrls = (css: string) => [...new Set([...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com(\/[^)]+))\)/g)].map((m) => m[2]!))];
const mimeOf = (p: string) => (p.endsWith(".woff2") ? "font/woff2" : p.endsWith(".woff") ? "font/woff" : "font/ttf");

/** Self-contained @font-face CSS for PDF rendering, or null if fonts could not be fetched. */
export async function embeddedFontCss(family: string, withMono: boolean): Promise<string | null> {
  try {
    return await cached(embedCache, `${getFont(family).value}|${withMono}`, async () => {
      let css = await sourceCss(family, withMono);
      for (const path of fontUrls(css)) {
        const buf = await fetchFontFile(path);
        css = css.split(GSTATIC + path).join(`data:${mimeOf(path)};base64,${buf.toString("base64")}`);
      }
      return css;
    });
  } catch (e) {
    console.error("[fonts] embedding failed, falling back to <link>", e);
    return null;
  }
}

/** Stylesheet for the live preview: same files as the PDF, served from /api/fonts/file. */
export async function fontProxyCss(family: string, withMono: boolean): Promise<string> {
  const css = await sourceCss(family, withMono);
  return css.replace(/url\(https:\/\/fonts\.gstatic\.com(\/[^)]+)\)/g, (_, path: string) => `url(/api/fonts/file?p=${encodeURIComponent(path)})`);
}
