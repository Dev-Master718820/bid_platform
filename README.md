# ResumeForge — JSON → Resume generator

Paste or upload a **Profile JSON** and/or a **Resume JSON**, customize the template and formatting with a live, paginated preview, and download **PDF** or **DOCX**.

No database and no accounts: inputs live in your browser (localStorage), and the export API is stateless — it receives the resume + formatting in the request and returns the file.

```
Profile JSON ─▶ profileToResume ─┐
                                 ├─▶ merge ─▶ Resume JSON ─▶ Renderer ─▶ Template (React) ─▶ HTML
Resume JSON ─────────────────────┘                                          │
                                        Live preview (paginated) ◀──────────┤
                                        PDF  (headless Chromium) ◀──────────┤
                                        DOCX (native Word objects) ◀── Resume JSON + formatting
```

## Inputs

**Profile JSON** — your personal record (all fields optional; career history lives in Resume JSON):

```json
{
  "personal_information": {
    "first_name": "", "middle_name": "", "last_name": "", "full_legal_name": "",
    "email_address": "", "phone_number": "", "linkedin_url": "", "github_url": "", "website_url": "",
    "city": "", "state": "", "country": ""
  },
  "professional_title": "",
  "summary": "",
  "education": [{ "school": "", "degree": "", "field_of_study": "", "start_date": "", "end_date": "", "gpa": "" }],
  "certifications": [{ "name": "", "issuer": "", "issue_date": "", "credential_url": "" }],
  "projects": [{ "name": "", "role": "", "url": "", "description": "", "highlights": [], "technologies": [] }],
  "skills": { "languages": [], "frameworks": [], "databases": [], "cloud": [], "tools": [] },
  "languages": [{ "language": "English", "proficiency": "Native" }],
  "awards": [{ "title": "", "issuer": "", "date": "", "description": "" }]
}
```

`skills` may also be a flat array.
`ssn`, `drivers_license_number`, `date_of_birth`, `race` and `full_address` are accepted but **never rendered, exported, or saved** in the browser.

**Resume JSON** — the resume document (`src/features/resume/schema.ts`), including your career history:

```json
{
  "resume": {
    "header": { "name": "", "professional_title": "", "email": "", "phone": "", "linkedin": "", "location": "", "github": "", "website": "" },
    "summary": { "content": "" },
    "career_history": [
      { "company": "Microsoft", "position": "Senior Software Engineer", "start_date": "2012-03", "end_date": "2015-05",
        "location": "Redmond, WA", "employment_type": "Full Time",
        "responsibilities": ["Developed scalable backend applications"], "technologies": ["Java", "Azure"] }
    ],
    "skills": { "languages": [], "frameworks": [], "databases": [], "cloud": [], "tools": [], "other": [] },
    "experience": [{ "company": "", "role": "", "period": "", "location": "", "employment_type": "", "achievements": [], "technologies": [] }],
    "education": [{ "school": "", "degree": "", "period": "", "location": "", "details": "" }],
    "certifications": [], "projects": [], "languages": [], "awards": [],
    "section_order": ["summary", "skills", "experience", "projects", "education", "certifications", "awards", "languages"],
    "hidden_sections": [],
    "section_titles": { "skills": "Core Skills" }
  }
}
```

`career_history` is converted into `experience` entries (`end_date: null` or missing → "Present"); `experience` can still be written directly in the rendered format — if both are given, career history comes first. When no professional title is given anywhere, the most recent position is used.

**Merge rule:** Resume JSON wins wherever it has content; the profile fills whatever the Resume JSON leaves empty (per header field, per section). Provide either one, or both.

## Formatting

Template (10) · layout (single, two-column, sidebar) · alignment (left/center/right) · page size (A4/Letter) · page margin · font family · font size · name/heading size · line height · letter spacing · section spacing · header/accent/divider/text colors (+ presets) · section order, visibility and titles. Formatting can be exported and re-imported as JSON.

| Template | Style |
| --- | --- |
| ATS Professional, Modern, Minimal, Executive, Software Engineer | Classic, print-friendly |
| **Aurora** | Gradient header card, soft corner glow, gradient section rules |
| **Horizon** | Full-page gradient wash, gradient name and headings |
| **Prism** | Full-height gradient sidebar (white text) with contact, skills, education |
| **Luxe** | Serif on warm cream, gold gradient hairlines |
| **Nova** | Vivid gradient name and section markers, pastel corner gradients |

Gradients blend the **Header → Accent** colors, so every palette works (try the two-tone presets Sunset, Ocean, Berry, Lagoon). Full-page backgrounds are edge-to-edge on every PDF page. DOCX has no gradients, so gradient templates export with their closest solid-color styling.

```json
{ "template": "modern", "layout": "single-column", "alignment": "left", "page_size": "A4",
  "font": { "family": "Inter", "size": 11, "heading_size": 16, "letter_spacing": 0 },
  "spacing": { "line_height": 1.5, "section_spacing": 20, "page_margin": 16 },
  "colors": { "header": "#111827", "accent": "#2563eb", "divider": "#d1d5db", "text": "#1f2937" } }
```

## Tailor mode (Groq)

Switch the header from **Normal** to **Tailor**, paste a **job description**, adjust the **tailoring prompt** (a default is provided), and click **Generate tailored resume**. The preview and PDF/DOCX downloads then use the tailored version; switching back to Normal shows the original. The tailored version, job description and prompt are kept in the browser.

**The prompt drives the result.** Besides wording, tone, length and bullet counts, the prompt can set the title, summary and skills, **section order**, **hidden sections**, **section titles**, and **which jobs or projects to include** (e.g. "Put Skills first", "Hide Languages", "Rename Professional Experience to Experience", "Only include my two most recent jobs"). Section settings the prompt doesn't mention keep following the Sections panel.

**Auto-update** (on by default, toggle under the button): after the first generation, editing the prompt, job description, model or resume data regenerates the tailored version 2 s after you stop typing — one request at a time; edits made while a request runs are applied in a single follow-up (requests are never aborted, since Groq counts their tokens anyway).

**Groq free tier.** Every model works on the free tier, which limits each model to about **8,000 tokens per minute** and 1,000 requests per day. A tailoring request uses **~2,000 tokens** (reasoning models run with low reasoning effort), so ~4 generations per minute fit. When the limit is hit, short waits are absorbed server-side (the request waits Groq's "try again in N s" and retries); longer ones show a countdown on the button and auto-update retries by itself. Pick a model in the Tailor panel (lists the models your key can use) — each generation shows its token usage.

Setup — add your keys to `.env` (or Vercel env vars) and restart:

```bash
GROQ_API_KEYS="gsk_key1,gsk_key2"      # one or more; rotates to the next key on 429 / 401 / 5xx
# GROQ_MODEL="openai/gpt-oss-120b"     # optional; must support JSON mode (retired models are replaced automatically)
```

**Facts are locked.** The model only returns tailorable content — professional title, summary, skills, experience/project bullets and technologies — plus the presentation choices above. Name, contact details, companies, job titles, dates, locations, education, certifications, languages and awards are always taken from your data; bullets from any entry the model invents are discarded, and an entry is only left out when the model explicitly marks it `include: false` (`src/features/tailor/apply.ts`). Contact details are not sent to Groq. The UI shows which job keywords made it into the resume.

`POST /api/tailor` with `{ "document": <Resume JSON>, "jobDescription": "...", "prompt": "..." }` → `{ document, notes, keywords, model }`. `GET /api/tailor` reports whether keys are configured (never the keys).

## Export API

`POST /api/export/pdf` and `POST /api/export/docx` with body `{ "document": <Resume JSON>, "format": <formatting>, "fileName": "resume" }`. Validated with the same schemas as the UI (max 1 MB); returns the file as an attachment. Nothing is stored or logged.

## Project structure

```
src/
  app/page.tsx                  # the generator (single page)
  app/api/export/{pdf,docx}/    # stateless export endpoints
  app/api/tailor/               # Groq tailoring endpoint
  features/tailor/              # tailoring request schema, default prompt, fact-locking merge
  services/tailor/              # Groq client (key rotation) + prompt
  features/resume/
    schema.ts                   # Resume JSON schema (zod)
    format.ts                   # formatting schema + defaults
    profile.ts                  # Profile JSON schema, profile → resume, merge rule
    components/builder/         # JSON inputs, format & sections panels, preview, download menu
  stores/                       # Zustand store (persisted to localStorage, sensitive fields stripped)
  templates/                    # rendering engine: renderer, registry, 5 templates, fonts, pagination, HTML
  services/export/              # pdf.ts (Chromium), docx.ts (docx), font-embed.ts
  components/ui/                # shadcn/ui primitives
```

## Design notes

- **Templates are React components** built on a shared `ResumeFrame` with scoped CSS driven by the formatting settings, so the same markup renders the preview and the PDF.
- **Preview = PDF.** Templates mark unbreakable blocks (`data-block`, `data-keep-next`); print CSS and the preview paginator (`templates/paginate.ts`) apply the same rules, and column layouts are paginated per column exactly as Chromium does. Verified on a long multi-page resume: identical page counts in 29 of 30 template × layout combinations; the one exception is a line that overflows by 0.13px, which wraps on screen but fits in print (sub-pixel difference between Chromium's screen and print layout) — the preview then shows one page more than the PDF, never fewer.
- **Fonts.** Metric-compatible open fonts (Arimo, Carlito, Tinos, Gelasio) stand in for Arial, Calibri, Times and Georgia. The server downloads static TTFs once and caches them: PDFs inline them (Chromium needs no network and embeds real TrueType subsets — ATS-friendly), and the live preview loads the *same files* through `/api/fonts/*`, so glyph metrics and line wraps match. DOCX files reference the real font names.
- **Full-bleed pages.** PDFs use zero `@page` margins; the page margin is padding repeated on every page (`box-decoration-break: clone`), and a template's page background (`templates/page-backgrounds.ts`) is a fixed layer that Chromium repeats on each page — edge to edge, one full gradient per page. The preview paints the same background on each sheet.
- **Gradient text** is colored per letter (`GradientText`) rather than with `background-clip: text`, which leaves hairline box artifacts in Chromium PDFs.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

PDF export needs Chrome/Chromium locally (auto-detected; or set `CHROME_EXECUTABLE_PATH` in `.env`). Scripts: `npm run build`, `npm run typecheck`, `npm run lint`.

## Deploy to Vercel

Import the repo — no environment variables are required. `vercel.json` gives the PDF function 1769 MB / 60 s, and `next.config.ts` bundles the `@sparticuz/chromium` binary.

Add `GROQ_API_KEYS` in the Vercel project settings to enable Tailor mode.

The API endpoints are public. If you deploy on the open internet, use Vercel Deployment Protection or a WAF rate-limit rule on `/api/export/*` and `/api/tailor` — each PDF launches a headless browser, and each tailoring request spends your Groq quota.
