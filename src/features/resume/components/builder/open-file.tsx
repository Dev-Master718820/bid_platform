"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Copy, FileUp, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ResumeDocument } from "@/features/resume/schema";
import type { FormatSettings } from "@/features/resume/format";
import { useBuilder } from "@/stores/resume-builder-store";

type ImportResult =
  | { source: "embedded"; kind: "pdf" | "docx"; document: ResumeDocument; format: FormatSettings; edited: boolean }
  | { source: "parsed"; kind: "pdf" | "docx"; document: ResumeDocument; notes: string[]; model: string; truncated: boolean; format?: FormatSettings }
  | { source: "text"; kind: "pdf" | "docx"; text: string };

const baseName = (name: string) => name.replace(/\.(pdf|docx)$/i, "").slice(0, 100);

/**
 * "Open" button: uploads a PDF/DOCX to /api/import and, after confirmation, loads the result into
 * the Resume JSON (and formatting, for ResumeForge files).
 */
export function OpenFileButton({ onImported }: { onImported: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{ result: ImportResult; fileName: string; file: File } | null>(null);
  const [keepProfile, setKeepProfile] = useState(false);

  const open = async (file: File, prefer?: "text") => {
    if (!/\.(pdf|docx)$/i.test(file.name)) {
      toast.error("Choose a .pdf or .docx file.");
      return;
    }
    setBusy(true);
    const t = toast.loading(prefer ? `Reading the edited text of ${file.name}…` : `Opening ${file.name}…`);
    try {
      const body = new FormData();
      body.append("file", file);
      if (prefer) body.append("prefer", prefer);
      const res = await fetch("/api/import", { method: "POST", body });
      const json = (await res.json()) as ImportResult & { error?: string };
      if (!res.ok) throw new Error(json.error ?? `Could not open the file (${res.status})`);
      toast.dismiss(t);
      setKeepProfile(false);
      setPending({ result: json, fileName: baseName(file.name), file });
    } catch (e) {
      toast.error((e as Error).message, { id: t });
    } finally {
      setBusy(false);
    }
  };

  const apply = () => {
    if (!pending || pending.result.source === "text") return;
    const r = pending.result;
    useBuilder.getState().importResume({
      document: r.document,
      format: r.format,
      fileName: pending.fileName,
      keepProfile,
    });
    setPending(null);
    onImported();
    toast.success(r.source === "embedded" ? "Resume restored — edit the JSON and download again." : "Resume imported — review the Resume JSON, then pick a template.");
  };

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => inputRef.current?.click()} disabled={busy} title="Open a PDF or DOCX resume to edit it">
        {busy ? <Loader2 className="animate-spin" /> : <FileUp />} <span className="hidden sm:inline">Open</span>
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void open(f);
        }}
      />
      {pending && (
        <ImportDialog
          pending={pending}
          keepProfile={keepProfile}
          setKeepProfile={setKeepProfile}
          onCancel={() => setPending(null)}
          onApply={apply}
          onReadEditedText={() => {
            const f = pending.file;
            setPending(null);
            void open(f, "text");
          }}
          busy={busy}
        />
      )}
    </>
  );
}

function ImportDialog({
  pending,
  keepProfile,
  setKeepProfile,
  onCancel,
  onApply,
  onReadEditedText,
  busy,
}: {
  pending: { result: ImportResult; fileName: string; file: File };
  keepProfile: boolean;
  setKeepProfile: (v: boolean) => void;
  onCancel: () => void;
  onApply: () => void;
  onReadEditedText: () => void;
  busy: boolean;
}) {
  const r = pending.result;
  const kind = r.kind.toUpperCase();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Open resume file" onClick={onCancel}>
      <div className="bg-background w-full max-w-lg rounded-xl border p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          {r.source === "embedded" ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" /> : <Sparkles className="text-brand mt-0.5 size-5 shrink-0" />}
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">
              {r.source === "embedded" ? "ResumeForge file — exact data found" : r.source === "parsed" ? "Resume read from the file" : "Text extracted from the file"}
            </h2>
            <p className="text-muted-foreground truncate text-xs">{pending.fileName}</p>
          </div>
          <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-foreground" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-4 grid gap-3 text-sm">
          {r.source === "embedded" && (
            <p>This {kind} was made with ResumeForge. Its Resume JSON and formatting (template, fonts, colors, layout) will be restored exactly, ready to edit and regenerate.</p>
          )}
          {r.source === "embedded" && r.edited && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
              <b>This file was edited after it was exported</b> (e.g. in Word). &ldquo;Restore original&rdquo; brings back the data as exported — without those edits. &ldquo;Read edited
              text&rdquo; keeps your edits: the current text is read with AI and the original formatting is kept.
            </div>
          )}
          {r.source === "parsed" && (
            <>
              <p>
                The text of this {kind} was structured into Resume JSON with AI ({r.model}). Please review it in the <b>Resume JSON</b> tab.{" "}
                {r.format
                  ? "The file's original ResumeForge formatting is kept."
                  : "Formatting can't be recovered from other apps' files — your current template and formatting are kept."}
              </p>
              {r.truncated && <p className="text-amber-700 dark:text-amber-400">The file was very long; only the first part was read.</p>}
              {r.notes.length > 0 && (
                <ul className="text-muted-foreground list-disc pl-5 text-xs">
                  {r.notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              )}
            </>
          )}
          {r.source === "text" && (
            <>
              <p>
                This {kind} wasn&apos;t made with ResumeForge, and AI structuring needs a Groq key (<code>GROQ_API_KEYS</code> in <code>.env</code>). Here is the extracted text to copy into your JSON:
              </p>
              <textarea readOnly value={r.text} className="bg-muted/40 h-48 w-full resize-none rounded-md border p-2 font-mono text-xs" aria-label="Extracted text" />
            </>
          )}

          {r.source !== "text" && (
            <>
              <p className="text-muted-foreground text-xs">This replaces your current Resume JSON{r.source === "embedded" ? " and formatting" : ""}.</p>
              <label className="flex cursor-pointer items-start gap-2 text-xs">
                <input type="checkbox" className="accent-[var(--brand)] mt-0.5 size-3.5" checked={keepProfile} onChange={(e) => setKeepProfile(e.target.checked)} />
                <span>
                  Keep my Profile JSON
                  <span className="text-muted-foreground block">Off (recommended): cleared, so the resume shows exactly what the file contains. On: your profile fills anything the file leaves empty.</span>
                </span>
              </label>
            </>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            {r.source === "text" ? "Close" : "Cancel"}
          </Button>
          {r.source === "text" ? (
            <Button
              onClick={() => {
                void navigator.clipboard.writeText(r.text);
                toast.success("Text copied");
              }}
            >
              <Copy /> Copy text
            </Button>
          ) : (
            <>
              {r.source === "embedded" && r.edited && (
                <Button variant="outline" onClick={onReadEditedText} disabled={busy}>
                  <Sparkles /> Read edited text
                </Button>
              )}
              <Button variant="brand" onClick={onApply}>
                <FileUp /> {r.source === "embedded" && r.edited ? "Restore original" : "Open for editing"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
