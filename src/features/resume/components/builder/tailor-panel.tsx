"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, Copy, KeyRound, Loader2, Lock, RotateCcw, Trash2, WandSparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_TAILOR_PROMPT, JD_MAX, PROMPT_MAX, type TailorResult } from "@/features/tailor/schema";
import { fingerprint, useBaseDocument, useBuilder } from "@/stores/resume-builder-store";
import { relativeTime } from "@/utils/dates";
import { cn } from "@/lib/utils";

type Status = { configured: boolean; keys: number; model: string; models: string[] } | null;
type TailorError = Error & { retryAfter?: number };

/** Pause after the last edit before auto-updating (each request uses ~2k of the free tier's 8k tokens/min). */
const AUTO_DELAY_MS = 2000;

export function TailorPanel() {
  const base = useBaseDocument();
  const jobDescription = useBuilder((s) => s.jobDescription);
  const prompt = useBuilder((s) => s.tailorPrompt);
  const tailored = useBuilder((s) => s.tailored);
  const autoTailor = useBuilder((s) => s.autoTailor);
  const tailorModel = useBuilder((s) => s.tailorModel);
  const { setJobDescription, setTailorPrompt, setTailored, setAutoTailor, setTailorModel } = useBuilder.getState();
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState<false | "manual" | "auto">(false);
  /** When a rate limit resets (ms timestamp) — auto-update waits until then. */
  const [retryAt, setRetryAt] = useState<number | null>(null);
  const [, forceTick] = useState(0);
  const running = useRef(false);
  const mounted = useRef(true);
  /** Last source an automatic update was attempted for — a failure isn't retried until something changes. */
  const lastAutoKey = useRef<string | null>(null);

  useEffect(() => {
    mounted.current = true;
    fetch("/api/tailor")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ configured: false, keys: 0, model: "", models: [] }));
    return () => {
      mounted.current = false;
    };
  }, []);

  // Tick once per second while a rate-limit countdown is shown.
  useEffect(() => {
    if (!retryAt) return;
    const t = setInterval(() => {
      if (Date.now() >= retryAt) setRetryAt(null);
      else forceTick((n) => n + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [retryAt]);
  const waitSeconds = retryAt ? Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)) : 0;

  const sourceKey = useMemo(() => fingerprint(JSON.stringify(base), jobDescription.trim(), prompt.trim(), tailorModel), [base, jobDescription, prompt, tailorModel]);
  const stale = Boolean(tailored && tailored.sourceKey !== sourceKey);
  const hasContent = base.resume.experience.length > 0 || Boolean(base.resume.summary.content);
  const jdTooShort = jobDescription.trim().length < 50;

  // Which of the job's keywords the tailored resume actually contains.
  const coverage = useMemo(() => {
    if (!tailored) return [];
    const text = JSON.stringify(tailored.document).toLowerCase();
    return tailored.keywords.map((k) => ({ k, hit: text.includes(k.toLowerCase()) }));
  }, [tailored]);

  /**
   * One request at a time. A request is never aborted: Groq counts its tokens either way, so
   * aborting would only waste the free tier's per-minute budget. Edits made meanwhile leave the
   * result stale, and auto-update sends a single follow-up once this request finishes.
   */
  const generate = useCallback(
    async (kind: "manual" | "auto") => {
      if (running.current) return;
      running.current = true;
      const key = sourceKey; // the inputs this request was made from
      setBusy(kind);
      try {
        const res = await fetch("/api/tailor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ document: base, jobDescription, prompt, ...(tailorModel && { model: tailorModel }) }),
        });
        const json = (await res.json()) as TailorResult & { error?: string; retryAfter?: number };
        if (!res.ok) throw Object.assign(new Error(json.error ?? `Tailoring failed (${res.status})`), { retryAfter: json.retryAfter });
        // Saved even if the panel was closed meanwhile — the result is still valid for these inputs.
        setTailored({ ...json, createdAt: new Date().toISOString(), sourceKey: key });
        if (kind === "manual") toast.success("Tailored resume generated");
      } catch (e) {
        const err = e as TailorError;
        if (err.retryAfter !== undefined) {
          // Free-tier per-minute limit: show a countdown; auto-update retries by itself when it resets.
          setRetryAt(Date.now() + (err.retryAfter + 1) * 1000);
          lastAutoKey.current = null;
          toast.warning(`Groq free-tier limit reached — ${autoTailor ? "retrying automatically" : "try again"} in ${Math.ceil(err.retryAfter)}s.`);
        } else {
          toast.error(kind === "auto" ? `Auto-update failed: ${err.message}` : err.message);
        }
      } finally {
        running.current = false;
        if (mounted.current) setBusy(false);
      }
    },
    [base, jobDescription, prompt, tailorModel, sourceKey, setTailored, autoTailor],
  );

  // Auto-update: once a tailored version exists, regenerate shortly after the prompt, job
  // description, model or resume data stop changing (and after any rate-limit wait).
  const canGenerate = !jdTooShort && hasContent && status?.configured !== false;
  useEffect(() => {
    if (!autoTailor || !tailored || !stale || !canGenerate || busy || retryAt || lastAutoKey.current === sourceKey) return;
    const t = setTimeout(() => {
      lastAutoKey.current = sourceKey;
      void generate("auto");
    }, AUTO_DELAY_MS);
    return () => clearTimeout(t);
  }, [autoTailor, tailored, stale, canGenerate, busy, retryAt, sourceKey, generate]);

  return (
    <div className="grid gap-4">
      {status && !status.configured && (
        <div className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <KeyRound className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <div>
            <div className="font-medium">Groq API key not configured</div>
            <div className="text-muted-foreground text-xs">
              Add <code>GROQ_API_KEYS=key1,key2</code> to <code>.env</code> (or Vercel env vars) and restart the server.
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="jd">Job description</Label>
          <span className="text-muted-foreground text-xs tabular-nums">
            {jobDescription.length.toLocaleString()} / {JD_MAX.toLocaleString()}
          </span>
        </div>
        <Textarea
          id="jd"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value.slice(0, JD_MAX))}
          placeholder="Paste the full job description here…"
          className="max-h-[320px] min-h-40 text-sm"
        />
      </div>

      <div className="grid gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="tp">Tailoring prompt</Label>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs disabled:opacity-40"
            disabled={prompt === DEFAULT_TAILOR_PROMPT}
            onClick={() => setTailorPrompt(DEFAULT_TAILOR_PROMPT)}
          >
            <RotateCcw className="size-3" /> Reset to default
          </button>
        </div>
        <Textarea
          id="tp"
          value={prompt}
          onChange={(e) => setTailorPrompt(e.target.value.slice(0, PROMPT_MAX))}
          placeholder="How should the resume be tailored?"
          className="max-h-[260px] min-h-28 text-sm"
        />
        <p className="text-muted-foreground text-xs">
          The prompt controls the wording, length and number of bullets, the title, summary and skills, section order,
          hidden sections, section titles, and which jobs or projects to include.
        </p>
        <p className="text-muted-foreground flex gap-1.5 text-xs">
          <Lock className="mt-0.5 size-3 shrink-0" />
          Facts stay locked: name, contact, companies, job titles, dates, education and certifications always come from your data.
        </p>
      </div>

      {status?.models && status.models.length > 0 && (
        <div className="grid gap-1.5">
          <Label htmlFor="tm">Groq model</Label>
          <select
            id="tm"
            value={tailorModel}
            onChange={(e) => setTailorModel(e.target.value)}
            className="border-input dark:bg-input/30 h-9 rounded-md border bg-transparent px-2 text-sm shadow-xs"
          >
            <option value="">Default ({status.model})</option>
            {status.models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <p className="text-muted-foreground text-xs">All models work on Groq&apos;s free tier (about 8,000 tokens per minute; one tailoring uses ~2,000).</p>
        </div>
      )}

      <Button variant="brand" size="lg" disabled={Boolean(busy) || !canGenerate || waitSeconds > 0} onClick={() => void generate("manual")}>
        {busy ? <Loader2 className="animate-spin" /> : <WandSparkles />}
        {waitSeconds > 0 && !busy
          ? `Free-tier limit — ${autoTailor && tailored ? "retrying" : "ready"} in ${waitSeconds}s`
          : busy === "auto"
            ? "Updating with your changes…"
            : busy
              ? "Tailoring…"
              : tailored
                ? "Regenerate tailored resume"
                : "Generate tailored resume"}
      </Button>
      <label className="text-muted-foreground -mt-1 flex cursor-pointer items-center gap-2 text-xs">
        <input type="checkbox" className="accent-[var(--brand)] size-3.5" checked={autoTailor} onChange={(e) => setAutoTailor(e.target.checked)} />
        Auto-update when the prompt, job description or resume data changes
      </label>
      {!hasContent && <p className="text-muted-foreground -mt-2 text-center text-xs">Add your Profile JSON or Resume JSON first.</p>}
      {hasContent && jdTooShort && <p className="text-muted-foreground -mt-2 text-center text-xs">Paste a job description to enable tailoring.</p>}

      {tailored && (
        <div className="bg-card grid gap-3 rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <Check className="size-4 text-emerald-600" />
            <span className="text-sm font-medium">Tailored version</span>
            <span className="text-muted-foreground ml-auto text-xs">
              {tailored.model}
              {tailored.usage ? ` · ${tailored.usage.total.toLocaleString()} tokens` : ""} · {relativeTime(tailored.createdAt)}
            </span>
          </div>

          {busy === "auto" ? (
            <div className="bg-brand/10 flex items-center gap-2 rounded-md p-2 text-xs">
              <Loader2 className="text-brand size-3.5 shrink-0 animate-spin" />
              Updating the tailored resume with your changes…
            </div>
          ) : (
            stale && (
              <div className="flex gap-2 rounded-md bg-amber-500/10 p-2 text-xs">
                <AlertTriangle className="size-3.5 shrink-0 text-amber-600" />
                {autoTailor && canGenerate
                  ? "Your changes will be applied automatically when you stop typing."
                  : "Your resume data, job description or prompt changed since this was generated. Regenerate to update it."}
              </div>
            )
          )}

          {coverage.length > 0 && (
            <div className="grid gap-1.5">
              <div className="text-muted-foreground text-xs">
                Job keywords covered: {coverage.filter((c) => c.hit).length} / {coverage.length}
              </div>
              <div className="flex flex-wrap gap-1">
                {coverage.map(({ k, hit }) => (
                  <span
                    key={k}
                    className={cn(
                      "rounded px-1.5 py-0.5 text-xs",
                      hit ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground line-through decoration-1",
                    )}
                    title={hit ? "In the tailored resume" : "Not in the resume (not supported by your experience)"}
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}

          {tailored.notes.length > 0 && (
            <ul className="text-muted-foreground list-disc space-y-1 pl-4 text-xs">
              {tailored.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void navigator.clipboard.writeText(JSON.stringify(tailored.document, null, 2));
                toast.success("Tailored resume JSON copied");
              }}
            >
              <Copy /> Copy JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!confirm("Replace your Resume JSON with the tailored version and switch to Normal mode?")) return;
                useBuilder.getState().setResumeText(JSON.stringify(tailored.document, null, 2));
                useBuilder.getState().setMode("normal");
                toast.success("Tailored version moved into Resume JSON for manual editing");
              }}
            >
              Edit as Resume JSON
            </Button>
            <Button variant="ghost" size="sm" className="text-destructive ml-auto" onClick={() => setTailored(null)}>
              <Trash2 /> Discard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
