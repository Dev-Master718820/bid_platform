import "server-only";
import JSZip from "jszip";
import { readDocxPayload, readPdfPayload, type EmbeddedPayload } from "@/services/export/embed";
import { docxText, pdfText, textFingerprint } from "@/services/documents/text";

/**
 * Opens an uploaded resume file (PDF or DOCX).
 *   1. ResumeForge files: the embedded data (exact Resume JSON + formatting), plus whether the file's
 *      text was edited elsewhere (e.g. in Word) since export — then the embedded data is out of date.
 *   2. Other files: the plain text, for structuring with the AI parser.
 */

export type OpenedFile = { kind: "pdf" | "docx"; payload: EmbeddedPayload | null; edited: boolean; text: string };

export class ImportError extends Error {
  constructor(
    message: string,
    public status = 422,
  ) {
    super(message);
  }
}

export async function openResumeFile(bytes: Uint8Array): Promise<OpenedFile> {
  const head = Buffer.from(bytes.subarray(0, 5)).toString("latin1");
  let kind: OpenedFile["kind"];
  let payload: EmbeddedPayload | null;
  let raw: string;

  if (head.startsWith("%PDF")) {
    kind = "pdf";
    payload = await readPdfPayload(bytes);
    try {
      raw = await pdfText(bytes);
    } catch {
      if (payload) return { kind, payload, edited: false, text: "" };
      throw new ImportError("Could not read this PDF (it may be encrypted or damaged).");
    }
  } else if (head.startsWith("PK")) {
    kind = "docx";
    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(bytes);
    } catch {
      throw new ImportError("Could not open this file as a .docx.");
    }
    if (!zip.file("word/document.xml")) throw new ImportError("This is not a Word (.docx) document.");
    payload = await readDocxPayload(zip);
    raw = await docxText(zip);
  } else {
    throw new ImportError("Unsupported file. Open a .pdf or .docx resume.", 415);
  }

  const text = raw.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (payload) {
    // Older exports carry no fingerprint → treat as unedited.
    const edited = Boolean(payload.textHash && payload.textHash !== textFingerprint(raw));
    return { kind, payload, edited, text };
  }
  if (text.length < 40) {
    throw new ImportError("No text found in this file — it may be a scanned image. Try a text-based PDF or a .docx.");
  }
  return { kind, payload: null, edited: false, text };
}
