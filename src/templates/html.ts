import "server-only";
import { createElement } from "react";
import type { ResumeDocument } from "@/features/resume/schema";
import type { FormatSettings } from "@/features/resume/format";
import { ResumeRenderer } from "@/templates/renderer";
import { fontStylesheetUrl } from "@/templates/fonts";
import { USES_MONO } from "@/templates/registry";
import { pageBackground } from "@/templates/page-backgrounds";

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * HTML Resume stage of the pipeline: renders the React template to a complete, print-ready HTML
 * document consumed by the PDF generator.
 *
 * Page model: @page has zero margin; the page margin is padding on .sheet, repeated on every page
 * via box-decoration-break: clone. That lets an optional full-bleed page background (a fixed layer,
 * which Chromium repeats on every printed page) cover each sheet edge to edge.
 */
export async function renderResumeHtml(
  document: ResumeDocument,
  format: FormatSettings,
  opts: {
    title?: string;
    autoPrint?: boolean;
    /** Self-contained @font-face CSS (see services/export/font-embed). Replaces the Google Fonts <link>. */
    fontCss?: string | null;
  } = {},
): Promise<string> {
  // Loaded lazily: react-dom/server must not be pulled into the RSC module graph at import time.
  const { renderToStaticMarkup } = await import("react-dom/server");
  const body = renderToStaticMarkup(createElement(ResumeRenderer, { document, format }));
  const margin = `${format.spacing.page_margin}mm`;
  const title = escapeHtml(opts.title || document.resume.header.name || "Resume");
  // Built only from validated hex colors and numbers — safe to inline.
  const bg = pageBackground(format);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
${
    opts.fontCss
      ? `<style>${opts.fontCss}</style>`
      : `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${fontStylesheetUrl(format.font.family, USES_MONO.has(format.template))}">`
  }
<style>
@page { size: ${format.page_size}; margin: 0; }
html { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; padding: 0; background: transparent; }
.sheet { padding: ${margin}; -webkit-box-decoration-break: clone; box-decoration-break: clone; box-sizing: border-box; }
.page-bg { position: fixed; inset: 0; z-index: -1; background: ${bg ?? "#fff"}; }
@media screen {
  html { background: #e5e7eb; }
  body { padding: 24px 0; }
  .page-bg { display: none; }
  .sheet { width: ${format.page_size === "A4" ? "210mm" : "8.5in"}; min-height: ${format.page_size === "A4" ? "297mm" : "11in"}; margin: 0 auto; background: ${bg ?? "#fff"}; box-shadow: 0 2px 12px rgba(0,0,0,.15); }
}
</style>
</head>
<body>
${bg ? '<div class="page-bg"></div>' : ""}
<div class="sheet">${body}</div>
${opts.autoPrint ? `<script>document.fonts.ready.then(()=>setTimeout(()=>window.print(),150));</script>` : ""}
</body>
</html>`;
}
