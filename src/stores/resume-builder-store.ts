"use client";

import { useMemo } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { parseResumeJson, type ResumeDocument } from "@/features/resume/schema";
import { DEFAULT_FORMAT, coerceFormat, mergeFormat, type FormatSettings, type FormatSettingsInput } from "@/features/resume/format";
import { mergeResume, profileSchema, profileToResume, stripSensitive, withTitleFallback } from "@/features/resume/profile";
import { SAMPLE_PROFILE, SAMPLE_RESUME_INPUT } from "@/templates/sample-inputs";
import { DEFAULT_TAILOR_PROMPT } from "@/features/tailor/schema";
import type { SectionOverrides } from "@/features/tailor/apply";

export type Mode = "normal" | "tailor";
export type Tailored = {
  document: ResumeDocument;
  /** Section order / visibility / titles requested by the tailoring prompt. */
  sections?: SectionOverrides;
  notes: string[];
  keywords: string[];
  model: string;
  usage?: { prompt: number; completion: number; total: number };
  createdAt: string;
  /** Fingerprint of the source resume + job description it was generated from (staleness check). */
  sourceKey: string;
};

/** Cheap, stable fingerprint for staleness detection. */
export function fingerprint(...parts: string[]): string {
  let h = 5381;
  const str = parts.join("\u0000");
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return `${str.length}:${h >>> 0}`;
}

type Parsed<T> = { value: T | null; errors: string[] };

function parseProfileText(text: string): Parsed<ResumeDocument> {
  if (!text.trim()) return { value: null, errors: [] };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { value: null, errors: [`Invalid JSON: ${(e as Error).message}`] };
  }
  const res = profileSchema.safeParse(raw);
  if (!res.success) return { value: null, errors: res.error.issues.slice(0, 10).map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`) };
  return { value: profileToResume(res.data), errors: [] };
}

function parseResumeText(text: string): Parsed<ResumeDocument> {
  if (!text.trim()) return { value: null, errors: [] };
  const res = parseResumeJson(text);
  return res.ok ? { value: res.data, errors: [] } : { value: null, errors: res.errors };
}

type State = {
  mode: Mode;
  jobDescription: string;
  tailorPrompt: string;
  tailored: Tailored | null;
  /** Regenerate the tailored version automatically when the prompt / job description / data change. */
  autoTailor: boolean;
  /** Groq model for tailoring; "" = server default. */
  tailorModel: string;
  /** Download file name (without extension). */
  fileName: string;
  profileText: string;
  resumeText: string;
  format: FormatSettings;

  /** Last successfully parsed inputs — the preview keeps showing these while an edit is invalid. */
  profileDoc: ResumeDocument | null;
  resumeDoc: ResumeDocument | null;
  profileErrors: string[];
  resumeErrors: string[];

  setMode: (m: Mode) => void;
  setJobDescription: (v: string) => void;
  setTailorPrompt: (v: string) => void;
  setTailored: (t: Tailored | null) => void;
  setAutoTailor: (v: boolean) => void;
  setTailorModel: (v: string) => void;
  setFileName: (v: string) => void;
  setProfileText: (text: string) => void;
  setResumeText: (text: string) => void;
  setFormat: (patch: FormatSettingsInput | Partial<FormatSettings>) => void;
  replaceFormat: (format: FormatSettings) => void;
  /** Edits the raw Resume JSON object (used by the Sections panel). Creates it if empty. */
  editResumeRaw: (fn: (resume: Record<string, unknown>) => void) => void;
  loadSample: () => void;
  clearAll: () => void;
  /** Embed editable data (visible resume + formatting) in exported PDF/DOCX files. */
  embedData: boolean;
  setEmbedData: (v: boolean) => void;
  /**
   * Loads a resume opened from a PDF/DOCX: it becomes the Resume JSON; the Profile JSON is cleared
   * unless kept (it would otherwise fill gaps with someone else's details); formatting is restored
   * when the file carried it.
   */
  importResume: (p: { document: ResumeDocument; format?: FormatSettings; fileName?: string; keepProfile: boolean }) => void;
};

const pretty = (v: unknown) => JSON.stringify(v, null, 2);

export const useBuilder = create<State>()(
  persist(
    (set, get) => ({
      mode: "normal",
      jobDescription: "",
      tailorPrompt: DEFAULT_TAILOR_PROMPT,
      tailored: null,
      autoTailor: true,
      tailorModel: "",
      fileName: "resume",
      profileText: "",
      resumeText: "",
      format: DEFAULT_FORMAT,
      profileDoc: null,
      resumeDoc: null,
      profileErrors: [],
      resumeErrors: [],

      setMode: (mode) => set({ mode }),
      setJobDescription: (jobDescription) => set({ jobDescription }),
      setTailorPrompt: (tailorPrompt) => set({ tailorPrompt }),
      setTailored: (tailored) => set({ tailored }),
      setAutoTailor: (autoTailor) => set({ autoTailor }),
      setTailorModel: (tailorModel) => set({ tailorModel }),
      setFileName: (fileName) => set({ fileName: fileName.slice(0, 100) }),
      setProfileText: (text) => {
        const p = parseProfileText(text);
        set({ profileText: text, profileErrors: p.errors, ...(p.errors.length ? {} : { profileDoc: p.value }) });
      },
      setResumeText: (text) => {
        const p = parseResumeText(text);
        set({ resumeText: text, resumeErrors: p.errors, ...(p.errors.length ? {} : { resumeDoc: p.value }) });
      },
      setFormat: (patch) => set({ format: mergeFormat(get().format, patch) }),
      replaceFormat: (format) => set({ format }),
      editResumeRaw: (fn) => {
        let raw: { resume?: Record<string, unknown> } = {};
        const text = get().resumeText.trim();
        if (text) {
          try {
            raw = JSON.parse(text);
          } catch {
            return; // don't overwrite text the user is still fixing
          }
        }
        raw.resume = raw.resume && typeof raw.resume === "object" ? raw.resume : {};
        fn(raw.resume);
        get().setResumeText(pretty(raw));
      },
      loadSample: () => {
        get().setProfileText(pretty(SAMPLE_PROFILE));
        get().setResumeText(pretty(SAMPLE_RESUME_INPUT));
        set({ fileName: "Alex_Morgan_Resume" });
      },
      embedData: true,
      setEmbedData: (embedData) => set({ embedData }),
      importResume: ({ document, format, fileName, keepProfile }) => {
        if (!keepProfile) get().setProfileText("");
        get().setResumeText(pretty(document));
        set({
          mode: "normal",
          ...(format && { format: coerceFormat(format) }),
          ...(fileName && { fileName: fileName.slice(0, 100) }),
        });
      },
      clearAll: () => set({ profileText: "", resumeText: "", profileDoc: null, resumeDoc: null, profileErrors: [], resumeErrors: [], fileName: "resume" }),
    }),
    {
      name: "resumeforge:v1",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      // Only inputs are stored, and never the profile's sensitive fields (SSN, license, DOB, …).
      partialize: (s) => {
        let profileText = s.profileText;
        try {
          profileText = s.profileText.trim() ? pretty(stripSensitive(JSON.parse(s.profileText))) : "";
        } catch {
          // invalid JSON in progress — store as typed
        }
        return {
          fileName: s.fileName,
          profileText,
          resumeText: s.resumeText,
          format: s.format,
          mode: s.mode,
          jobDescription: s.jobDescription,
          tailorPrompt: s.tailorPrompt,
          tailored: s.tailored,
          autoTailor: s.autoTailor,
          embedData: s.embedData,
          tailorModel: s.tailorModel,
        };
      },
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        const profile = parseProfileText(p.profileText ?? "");
        const resume = parseResumeText(p.resumeText ?? "");
        return {
          ...current,
          fileName: p.fileName || current.fileName,
          mode: p.mode === "tailor" ? "tailor" : "normal",
          jobDescription: p.jobDescription ?? "",
          tailorPrompt: p.tailorPrompt ?? current.tailorPrompt,
          autoTailor: p.autoTailor ?? true,
          embedData: p.embedData ?? true,
          tailorModel: typeof p.tailorModel === "string" ? p.tailorModel : "",
          // Drop a persisted tailored version that no longer validates (e.g. after a schema change).
          tailored: p.tailored?.document && parseResumeJson(p.tailored.document).ok ? p.tailored : null,
          profileText: p.profileText ?? "",
          resumeText: p.resumeText ?? "",
          format: coerceFormat(p.format),
          profileDoc: profile.value,
          resumeDoc: resume.value,
          profileErrors: profile.errors,
          resumeErrors: resume.errors,
        };
      },
    },
  ),
);

/** Normal-mode document: Resume JSON merged over the profile. */
export function useBaseDocument(): ResumeDocument {
  const resumeDoc = useBuilder((s) => s.resumeDoc);
  const profileDoc = useBuilder((s) => s.profileDoc);
  return useMemo(() => withTitleFallback(mergeResume(resumeDoc, profileDoc)), [resumeDoc, profileDoc]);
}

/**
 * The document that gets previewed and exported. In Tailor mode it's the tailored version (if one
 * has been generated). Section order / visibility / titles follow the user's own settings, except
 * where the tailoring prompt asked for something specific.
 */
export function useResumeDocument(): ResumeDocument {
  const base = useBaseDocument();
  const mode = useBuilder((s) => s.mode);
  const tailored = useBuilder((s) => s.tailored?.document ?? null);
  const overrides = useBuilder((s) => s.tailored?.sections);
  return useMemo(() => {
    if (mode !== "tailor" || !tailored) return base;
    const b = base.resume;
    return {
      resume: {
        ...tailored.resume,
        section_order: overrides?.order ?? b.section_order,
        hidden_sections: overrides?.hidden ?? b.hidden_sections,
        section_titles: { ...b.section_titles, ...overrides?.titles },
      },
    };
  }, [base, mode, tailored, overrides]);
}
