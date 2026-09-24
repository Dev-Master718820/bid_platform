import { parseResumeJson } from "@/features/resume/schema";
import { mergeResume, profileSchema, profileToResume } from "@/features/resume/profile";
import { SAMPLE_PROFILE, SAMPLE_RESUME_INPUT } from "@/templates/sample-inputs";

/** The sample inputs merged into one resume — used for template thumbnails. */
const parsed = parseResumeJson(SAMPLE_RESUME_INPUT);
export const SAMPLE_DOCUMENT = mergeResume(parsed.ok ? parsed.data : null, profileToResume(profileSchema.parse(SAMPLE_PROFILE)));
