import { z } from "zod";
import { expandCareerHistory } from "./career";

/**
 * Canonical Resume JSON document.
 * This is the single source of truth stored in Resume.resumeJson and consumed by
 * the rendering engine, the DOCX builder, and the PDF pipeline.
 */

const str = (max = 300) => z.string().trim().max(max).default("");
const list = (max = 60, itemMax = 600) => z.array(z.string().trim().max(itemMax)).max(max).default([]);

export const SECTION_KEYS = [
  "summary",
  "skills",
  "experience",
  "projects",
  "education",
  "certifications",
  "awards",
  "languages",
] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

export const DEFAULT_SECTION_TITLES: Record<SectionKey, string> = {
  summary: "Summary",
  skills: "Technical Skills",
  experience: "Professional Experience",
  projects: "Projects",
  education: "Education",
  certifications: "Certifications",
  awards: "Awards",
  languages: "Languages",
};

/**
 * Skills are free-form groups: an ordered map of group name → skills, rendered in the order given.
 * Any group name works ("Frontend", "Backend", "Soft Skills" …). The classic keys below get friendly
 * labels; a group named "" is rendered as an unlabeled list.
 */
export const SKILL_CATEGORIES = ["languages", "frameworks", "databases", "cloud", "tools", "other"] as const;
const CLASSIC_LABELS: Record<string, string> = {
  languages: "Languages",
  frameworks: "Frameworks",
  databases: "Databases",
  cloud: "Cloud",
  tools: "Tools",
  other: "Other",
};

/** Display label for a skill group key: classic keys → friendly label, snake_case → Title Case, else as written. */
export function skillLabel(key: string): string {
  if (CLASSIC_LABELS[key]) return CLASSIC_LABELS[key];
  if (/^[a-z0-9_]+$/.test(key)) return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return key;
}

export type SkillGroups = Record<string, string[]>;

/**
 * Accepts: { "Frontend": ["React"], … } · ["Go", "Java"] (one unlabeled group) ·
 * [{ "name" | "category" | "label": "Frontend", "items" | "skills": [...] }, …].
 * Empty groups are dropped; order is preserved.
 */
function normalizeSkills(input: unknown): unknown {
  if (input == null) return {};
  if (Array.isArray(input)) {
    if (input.every((x) => typeof x === "string" || typeof x === "number")) return { "": input.map(String) };
    const out: Record<string, unknown> = {};
    for (const g of input) {
      if (!g || typeof g !== "object") continue;
      const o = g as Record<string, unknown>;
      const name = String(o.name ?? o.category ?? o.label ?? o.title ?? "");
      const items = o.items ?? o.skills ?? o.list ?? [];
      out[name] = [...((out[name] as string[]) ?? []), ...(Array.isArray(items) ? items.map(String) : [])];
    }
    return out;
  }
  return input;
}

const skillGroupList = z
  .array(z.union([z.string(), z.number()]).transform((v) => String(v).trim().slice(0, 80)))
  .max(80)
  .catch([])
  .transform((a) => a.filter(Boolean));

export const skillsSchema = z.preprocess(
  normalizeSkills,
  z
    .record(z.string().max(60), skillGroupList)
    .catch({})
    .transform((rec) => {
      const out: SkillGroups = {};
      for (const [k, v] of Object.entries(rec).slice(0, 30)) if (v.length) out[k.trim()] = [...(out[k.trim()] ?? []), ...v];
      return out;
    }),
);

export function hasSkills(skills: SkillGroups): boolean {
  return Object.values(skills).some((g) => g.length > 0);
}

export const headerSchema = z.object({
  name: str(120),
  professional_title: str(160),
  email: str(254),
  phone: str(40),
  linkedin: str(300),
  location: str(160),
  website: str(300),
  github: str(300),
});


export const experienceItemSchema = z.object({
  company: str(160),
  role: str(160),
  period: str(80),
  location: str(160),
  employment_type: str(60),
  achievements: list(40, 1000),
  technologies: list(),
});

export const educationItemSchema = z.object({
  school: str(200),
  degree: str(200),
  period: str(80),
  location: str(160),
  details: str(1000),
});

export const certificationItemSchema = z.object({
  name: str(200),
  issuer: str(200),
  date: str(80),
  url: str(300),
});

export const projectItemSchema = z.object({
  name: str(200),
  role: str(160),
  period: str(80),
  url: str(300),
  description: str(2000),
  highlights: list(20, 1000),
  technologies: list(),
});

export const languageItemSchema = z.object({ language: str(80), proficiency: str(80) });
export const awardItemSchema = z.object({ title: str(200), issuer: str(200), date: str(80), description: str(1000) });

const resumeBodyObject = z.object({
  header: headerSchema.default({}),
  summary: z.object({ content: str(3000) }).default({}),
  skills: skillsSchema.default({}),
  experience: z.array(experienceItemSchema).max(50).default([]),
  education: z.array(educationItemSchema).max(20).default([]),
  certifications: z.array(certificationItemSchema).max(40).default([]),
  projects: z.array(projectItemSchema).max(40).default([]),
  languages: z.array(languageItemSchema).max(30).default([]),
  awards: z.array(awardItemSchema).max(40).default([]),
  section_order: z
    .array(z.enum(SECTION_KEYS))
    .default([...SECTION_KEYS])
    // Guarantee every section appears exactly once, keeping the user's order first.
    .transform((order) => [...new Set([...order, ...SECTION_KEYS])]),
  hidden_sections: z.array(z.enum(SECTION_KEYS)).default([]),
  section_titles: z.record(z.enum(SECTION_KEYS), z.string().trim().max(60)).default({}),
});

/** Resume body. Also accepts `career_history` (spec career format), converted into `experience`. */
export const resumeBodySchema = z.preprocess(expandCareerHistory, resumeBodyObject);

export const resumeDocumentSchema = z.object({ resume: resumeBodySchema });

export type ResumeBody = z.infer<typeof resumeBodySchema>;
export type ResumeDocument = z.infer<typeof resumeDocumentSchema>;
export type ResumeDocumentInput = z.input<typeof resumeDocumentSchema>;
export type ExperienceItem = z.infer<typeof experienceItemSchema>;
export type EducationItem = z.infer<typeof educationItemSchema>;
export type ProjectItem = z.infer<typeof projectItemSchema>;

export function emptyResume(): ResumeDocument {
  return resumeDocumentSchema.parse({ resume: {} });
}

/** Parse untrusted JSON (DB, user JSON editor, imports). Never throws. */
export function parseResumeJson(input: unknown):
  | { ok: true; data: ResumeDocument }
  | { ok: false; errors: string[] } {
  let value = input;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch (e) {
      return { ok: false, errors: [`Invalid JSON: ${(e as Error).message}`] };
    }
  }
  const res = resumeDocumentSchema.safeParse(value);
  if (res.success) return { ok: true, data: res.data };
  return {
    ok: false,
    errors: res.error.issues.slice(0, 20).map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`),
  };
}

/** Lenient parse for rendering: falls back to an empty resume rather than crashing a page. */
export function coerceResume(input: unknown): ResumeDocument {
  const res = parseResumeJson(input);
  return res.ok ? res.data : emptyResume();
}

export function sectionTitle(body: ResumeBody, key: SectionKey) {
  return body.section_titles[key] || DEFAULT_SECTION_TITLES[key];
}

/** Whether a section has any content worth rendering. */
export function sectionHasContent(body: ResumeBody, key: SectionKey): boolean {
  switch (key) {
    case "summary":
      return body.summary.content.trim().length > 0;
    case "skills":
      return hasSkills(body.skills);
    default:
      return body[key].length > 0;
  }
}

export function visibleSections(body: ResumeBody): SectionKey[] {
  return body.section_order.filter((k) => !body.hidden_sections.includes(k) && sectionHasContent(body, k));
}
