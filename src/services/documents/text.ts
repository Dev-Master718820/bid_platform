import "server-only";
import { createHash } from "node:crypto";
import JSZip from "jszip";

/** Plain-text extraction from PDF / DOCX, shared by export (fingerprinting) and import (reading). */

const decodeXml = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&");

/** Paragraph-by-paragraph text of word/document.xml (tabs and line breaks kept). "" if missing. */
export async function docxText(zip: JSZip): Promise<string> {
  const xml = await zip.file("word/document.xml")?.async("string");
  if (!xml) return "";
  // Per paragraph, walk text runs, tabs and breaks in document order.
  return xml
    .split(/<\/w:p>/)
    .map((p) =>
      decodeXml(
        (p.match(/<w:t(?:\s[^>]*)?>[^<]*<\/w:t>|<w:tab\/>|<w:br[^>]*\/>/g) ?? [])
          .map((t) => (t === "<w:tab/>" ? "\t" : t.startsWith("<w:br") ? "\n" : t.replace(/<[^>]+>/g, "")))
          .join(""),
      ).trim(),
    )
    .filter(Boolean)
    .join("\n");
}

export async function pdfText(bytes: Uint8Array): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

/**
 * Fingerprint of a document's visible text, insensitive to whitespace and line wrapping, so
 * re-saving a file without changing its words keeps the same fingerprint.
 */
export function textFingerprint(text: string): string {
  return createHash("sha256").update(text.replace(/\s+/g, "")).digest("hex").slice(0, 32);
}
