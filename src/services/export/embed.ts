import "server-only";
import { gunzipSync, gzipSync } from "node:zlib";
import JSZip from "jszip";
import { PDFDict, PDFDocument, PDFHexString, PDFName, PDFString } from "pdf-lib";
import { resumeDocumentSchema, type ResumeDocument } from "@/features/resume/schema";
import { formatSettingsSchema, type FormatSettings } from "@/features/resume/format";
import { docxText, pdfText, textFingerprint } from "@/services/documents/text";

/**
 * Editable data embedded in exported files, so opening a ResumeForge PDF/DOCX restores the exact
 * Resume JSON + formatting.
 *
 * Only what is visible on the resume is embedded: content of hidden sections is removed first, so a
 * file sent to an employer carries nothing that isn't printed on it.
 *   PDF  → custom key /ResumeForgeData in the document info dictionary
 *   DOCX → an Office custom XML part (customXml/itemN.xml), which Word preserves when re-saving
 */

const PDF_KEY = "ResumeForgeData";
const XML_NS = "urn:resumeforge:data:v1";

export type EmbeddedPayload = {
  app: "ResumeForge";
  v: 1;
  createdAt: string;
  document: ResumeDocument;
  format: FormatSettings;
  /** Fingerprint of the file's text at export — a mismatch on import means it was edited elsewhere. */
  textHash?: string;
};

/** Removes the content of hidden sections (the printed resume never shows it). */
export function visibleOnly(doc: ResumeDocument): ResumeDocument {
  const r = structuredClone(doc.resume);
  for (const key of r.hidden_sections) {
    if (key === "summary") r.summary = { content: "" };
    else if (key === "skills") r.skills = {};
    else r[key] = [] as never;
  }
  return { resume: r };
}

const encode = (p: EmbeddedPayload) => gzipSync(Buffer.from(JSON.stringify(p), "utf8")).toString("base64");

function decode(b64: string): EmbeddedPayload | null {
  try {
    const raw = JSON.parse(gunzipSync(Buffer.from(b64.trim(), "base64")).toString("utf8")) as Partial<EmbeddedPayload>;
    if (raw.app !== "ResumeForge") return null;
    const document = resumeDocumentSchema.safeParse(raw.document);
    const format = formatSettingsSchema.safeParse(raw.format);
    if (!document.success) return null;
    return {
      app: "ResumeForge",
      v: 1,
      createdAt: String(raw.createdAt ?? ""),
      document: document.data,
      format: format.success ? format.data : formatSettingsSchema.parse({}),
      ...(typeof raw.textHash === "string" && { textHash: raw.textHash }),
    };
  } catch {
    return null;
  }
}

export function makePayload(document: ResumeDocument, format: FormatSettings): EmbeddedPayload {
  return { app: "ResumeForge", v: 1, createdAt: new Date().toISOString(), document: visibleOnly(document), format };
}

// ── PDF ─────────────────────────────────────────────────────────────────────

/** The document information dictionary, via the public trailer (pdf-lib keeps getInfoDict private). */
function infoDict(doc: PDFDocument): PDFDict | undefined {
  const ref = doc.context.trailerInfo.Info;
  return ref ? doc.context.lookup(ref, PDFDict) : undefined;
}

export async function embedInPdf(pdf: Uint8Array, payload: EmbeddedPayload, title: string): Promise<Uint8Array> {
  payload = { ...payload, textHash: textFingerprint(await pdfText(pdf)) };
  const doc = await PDFDocument.load(pdf, { updateMetadata: false });
  doc.setTitle(title);
  doc.setCreator("ResumeForge"); // setters create the info dictionary if the PDF has none
  infoDict(doc)?.set(PDFName.of(PDF_KEY), PDFString.of(encode(payload)));
  return doc.save();
}

export async function readPdfPayload(pdf: Uint8Array): Promise<EmbeddedPayload | null> {
  try {
    const doc = await PDFDocument.load(pdf, { ignoreEncryption: true, updateMetadata: false });
    const v = infoDict(doc)?.lookup(PDFName.of(PDF_KEY));
    if (v instanceof PDFString || v instanceof PDFHexString) return decode(v.decodeText());
    return null;
  } catch {
    return null;
  }
}

// ── DOCX ────────────────────────────────────────────────────────────────────

export async function embedInDocx(docx: Buffer, payload: EmbeddedPayload): Promise<Buffer> {
  const zip = await JSZip.loadAsync(docx);
  payload = { ...payload, textHash: textFingerprint(await docxText(zip)) };
  let n = 1;
  while (zip.file(`customXml/item${n}.xml`)) n++;
  const guid = crypto.randomUUID().toUpperCase();
  zip.file(`customXml/item${n}.xml`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<resumeforge xmlns="${XML_NS}">${encode(payload)}</resumeforge>`);
  zip.file(
    `customXml/itemProps${n}.xml`,
    `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<ds:datastoreItem ds:itemID="{${guid}}" xmlns:ds="http://schemas.openxmlformats.org/officeDocument/2006/customXml"><ds:schemaRefs><ds:schemaRef ds:uri="${XML_NS}"/></ds:schemaRefs></ds:datastoreItem>`,
  );
  zip.file(
    `customXml/_rels/item${n}.xml.rels`,
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/customXmlProps" Target="itemProps${n}.xml"/></Relationships>`,
  );

  // Link the part from the main document (unlinked custom XML is dropped by Word on save).
  const relsPath = "word/_rels/document.xml.rels";
  const rels = (await zip.file(relsPath)?.async("string")) ?? "";
  zip.file(
    relsPath,
    rels.replace(
      "</Relationships>",
      `<Relationship Id="rIdResumeForge${n}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/customXml" Target="../customXml/item${n}.xml"/></Relationships>`,
    ),
  );
  const ctPath = "[Content_Types].xml";
  let ct = (await zip.file(ctPath)?.async("string")) ?? "";
  if (!/Extension="xml"/i.test(ct)) ct = ct.replace("</Types>", `<Default Extension="xml" ContentType="application/xml"/></Types>`);
  ct = ct.replace("</Types>", `<Override PartName="/customXml/itemProps${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.customXmlProperties+xml"/></Types>`);
  zip.file(ctPath, ct);

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

export async function readDocxPayload(zip: JSZip): Promise<EmbeddedPayload | null> {
  for (const f of zip.file(/^customXml\/item\d+\.xml$/)) {
    const xml = await f.async("string");
    const m = new RegExp(`<resumeforge xmlns="${XML_NS}">([^<]+)</resumeforge>`).exec(xml);
    if (m) return decode(m[1]!);
  }
  return null;
}
