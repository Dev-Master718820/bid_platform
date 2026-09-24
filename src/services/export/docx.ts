import "server-only";
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  LevelFormat,
  LineRuleType,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TabStopType,
  TextRun,
  WidthType,
  type IBorderOptions,
  type IRunOptions,
  type ParagraphChild,
} from "docx";
import {
  SKILL_CATEGORIES,
  SKILL_CATEGORY_LABELS,
  sectionTitle,
  type ResumeBody,
  type ResumeDocument,
  type SectionKey,
} from "@/features/resume/schema";
import type { FormatSettings, TemplateKey } from "@/features/resume/format";
import { getFont } from "@/templates/fonts";
import { contactItems, splitSections } from "@/templates/shared/frame";
import { PAGE_MM, mmToTwip, ptToHalfPt, ptToTwip } from "@/templates/geometry";

/**
 * Resume JSON + FormatSettings → native .docx.
 * Mirrors the HTML templates' structure and styling with real Word constructs
 * (styles, numbering, tab stops, borders, keep-with-next) so the file stays editable.
 */

type Style = {
  headingUpper: boolean;
  headingBorder: "bottom" | "both" | "none";
  headingPrefix: string;
  headerBand: boolean;
  nameUpper: boolean;
  orgAccent: boolean;
  showTech: boolean;
  sideTint: boolean;
};

const STYLES: Record<TemplateKey, Style> = {
  ats: { headingUpper: true, headingBorder: "bottom", headingPrefix: "", headerBand: false, nameUpper: true, orgAccent: false, showTech: true, sideTint: false },
  modern: { headingUpper: false, headingBorder: "none", headingPrefix: "▍", headerBand: false, nameUpper: false, orgAccent: true, showTech: true, sideTint: true },
  minimal: { headingUpper: true, headingBorder: "none", headingPrefix: "", headerBand: false, nameUpper: false, orgAccent: true, showTech: true, sideTint: false },
  executive: { headingUpper: true, headingBorder: "both", headingPrefix: "", headerBand: true, nameUpper: false, orgAccent: false, showTech: false, sideTint: false },
  developer: { headingUpper: false, headingBorder: "bottom", headingPrefix: "// ", headerBand: false, nameUpper: false, orgAccent: true, showTech: true, sideTint: false },
  // Word has no gradients — gradient templates map to their closest solid-color equivalents.
  aurora: { headingUpper: false, headingBorder: "bottom", headingPrefix: "", headerBand: true, nameUpper: false, orgAccent: false, showTech: true, sideTint: false },
  horizon: { headingUpper: true, headingBorder: "bottom", headingPrefix: "", headerBand: false, nameUpper: false, orgAccent: true, showTech: true, sideTint: false },
  prism: { headingUpper: true, headingBorder: "none", headingPrefix: "▬ ", headerBand: false, nameUpper: false, orgAccent: true, showTech: true, sideTint: true },
  luxe: { headingUpper: true, headingBorder: "both", headingPrefix: "", headerBand: false, nameUpper: true, orgAccent: true, showTech: false, sideTint: false },
  nova: { headingUpper: false, headingBorder: "none", headingPrefix: "▍", headerBand: false, nameUpper: false, orgAccent: true, showTech: true, sideTint: true },
};

/** Templates that move contact details into the side column in column layouts. */
const CONTACT_IN_SIDE: Partial<Record<TemplateKey, (layout: string) => boolean>> = {
  modern: (l) => l === "sidebar",
  prism: (l) => l !== "single-column",
};

const hex = (c: string) => c.replace("#", "").toUpperCase();
const NONE: IBorderOptions = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };

function tint(color: string, amount: number) {
  const n = parseInt(hex(color), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * (1 - amount));
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(mix).map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
}

class Builder {
  private s: Style;
  private font: string;
  private size: number;
  private small: number;
  private h2: number;
  private charSpacing: number;
  private align: (typeof AlignmentType)[keyof typeof AlignmentType];
  constructor(
    private body: ResumeBody,
    private f: FormatSettings,
    /** Usable width (twips) of the current column — for right-aligned date tab stops */
    public width: number,
    /**
     * Keep-with-next is disabled inside table cells: Word/LibreOffice treat a row whose paragraphs
     * chain keep-with-next as unsplittable and push the whole column table to the next page.
     */
    private keep = true,
  ) {
    this.s = STYLES[f.template] ?? STYLES.ats;
    this.font = getFont(f.font.family).docx;
    this.size = f.font.size;
    this.small = Math.round(f.font.size * 0.9 * 2) / 2;
    this.h2 = Math.round(f.font.size * 1.18 * 2) / 2;
    this.charSpacing = Math.round(f.font.letter_spacing * f.font.size * 20);
    this.align = { left: AlignmentType.LEFT, center: AlignmentType.CENTER, right: AlignmentType.RIGHT }[f.alignment];
  }

  get lineSpacing() {
    return { line: Math.round(240 * this.f.spacing.line_height), lineRule: LineRuleType.AUTO };
  }

  run(text: string, o: Partial<IRunOptions> = {}) {
    return new TextRun({ text, font: this.font, size: ptToHalfPt(this.size), color: hex(this.f.colors.text), characterSpacing: this.charSpacing || undefined, ...o });
  }

  header(inSideLayout: boolean): Paragraph[] {
    const h = this.body.header;
    const band = this.s.headerBand;
    const fg = band ? "FFFFFF" : hex(this.f.colors.header);
    const shading = band ? { type: ShadingType.CLEAR, fill: hex(this.f.colors.header), color: "auto" } : undefined;
    const align = this.f.template === "developer" ? AlignmentType.LEFT : this.align;
    const out: Paragraph[] = [
      new Paragraph({
        alignment: align,
        shading,
        spacing: { after: 40, before: band ? 120 : 0 },
        keepNext: this.keep,
        children: [this.run(this.s.nameUpper ? (h.name || "Your Name").toUpperCase() : h.name || "Your Name", { bold: true, size: ptToHalfPt(this.f.font.heading_size), color: fg })],
      }),
    ];
    if (h.professional_title) {
      out.push(
        new Paragraph({
          alignment: align,
          shading,
          spacing: { after: 60 },
          keepNext: this.keep,
          children: [this.run(h.professional_title, { size: ptToHalfPt(this.size * 1.15), color: band ? fg : this.s.orgAccent ? hex(this.f.colors.accent) : undefined, italics: band })],
        }),
      );
    }
    const contacts = inSideLayout ? [] : contactItems(h);
    if (contacts.length) {
      const children: ParagraphChild[] = [];
      contacts.forEach((c, i) => {
        if (i) children.push(this.run("  |  ", { size: ptToHalfPt(this.small), color: band ? fg : "9CA3AF" }));
        const r = this.run(c.label, { size: ptToHalfPt(this.small), color: band ? fg : undefined });
        children.push(c.href ? new ExternalHyperlink({ link: c.href, children: [r] }) : r);
      });
      out.push(new Paragraph({ alignment: align, shading, spacing: { after: band ? 120 : 0 }, children }));
    }
    out.push(
      new Paragraph({
        spacing: { after: ptToTwip(this.f.spacing.section_spacing) / 2 },
        border: this.f.template === "modern" ? { bottom: { style: BorderStyle.SINGLE, size: 12, color: hex(this.f.colors.accent), space: 4 } } : undefined,
        children: [],
      }),
    );
    return out;
  }

  heading(title: string, inSide: boolean): Paragraph {
    const border = { style: BorderStyle.SINGLE, size: 6, color: hex(this.f.colors.divider), space: 2 };
    return new Paragraph({
      alignment: inSide ? AlignmentType.LEFT : this.align,
      keepNext: this.keep,
      keepLines: true,
      spacing: { before: ptToTwip(this.f.spacing.section_spacing), after: 100 },
      border: this.s.headingBorder === "bottom" ? { bottom: border } : this.s.headingBorder === "both" ? { top: border, bottom: border } : undefined,
      children: [
        ...(this.s.headingPrefix ? [this.run(this.s.headingPrefix, { color: hex(this.f.colors.accent), size: ptToHalfPt(this.h2), bold: true })] : []),
        this.run(this.s.headingUpper ? title.toUpperCase() : title, {
          bold: true,
          size: ptToHalfPt(this.f.template === "minimal" || this.f.template === "developer" ? this.size : this.h2),
          color: hex(this.f.template === "modern" ? this.f.colors.header : this.f.colors.accent),
          characterSpacing: this.s.headingUpper ? ptToTwip(this.size * 0.08) : undefined,
        }),
      ],
    });
  }

  entryHead(left: ParagraphChild[], right: string | undefined, inSide: boolean): Paragraph[] {
    if (inSide) {
      return [
        new Paragraph({ keepNext: this.keep, spacing: { before: 80, ...this.lineSpacing }, children: left }),
        ...(right ? [new Paragraph({ keepNext: this.keep, spacing: this.lineSpacing, children: [this.run(right, { size: ptToHalfPt(this.small), color: "6B7280" })] })] : []),
      ];
    }
    return [
      new Paragraph({
        keepNext: this.keep,
        keepLines: true,
        spacing: { before: 100, ...this.lineSpacing },
        tabStops: [{ type: TabStopType.RIGHT, position: this.width }],
        children: [...left, ...(right ? [this.run(`\t${right}`, { size: ptToHalfPt(this.small), color: "4B5563" })] : [])],
      }),
    ];
  }

  sub(text: string, keepNext = true) {
    return new Paragraph({ keepNext: keepNext && this.keep, spacing: this.lineSpacing, children: [this.run(text, { size: ptToHalfPt(this.small), color: "6B7280" })] });
  }

  para(text: string, o: { justify?: boolean } = {}) {
    return new Paragraph({ spacing: { ...this.lineSpacing, after: 40 }, alignment: o.justify ? AlignmentType.JUSTIFIED : AlignmentType.LEFT, children: [this.run(text)] });
  }

  bullets(items: string[]) {
    return items
      .filter((a) => a.trim())
      .map((a) => new Paragraph({ numbering: { reference: "rf-bullets", level: 0 }, keepLines: true, spacing: { ...this.lineSpacing, after: 30 }, children: [this.run(a)] }));
  }

  tech(label: string, items: string[]) {
    return new Paragraph({
      spacing: { ...this.lineSpacing, before: 40 },
      children: [this.run(`${label}: `, { bold: true, size: ptToHalfPt(this.small), color: this.f.template === "developer" ? hex(this.f.colors.accent) : undefined }), this.run(items.join(", "), { size: ptToHalfPt(this.small) })],
    });
  }

  roleLine(role: string, org: string) {
    return [
      this.run(role, { bold: true }),
      ...(org ? [this.run(role ? ` · ${org}` : org, { bold: this.f.template !== "ats", color: this.s.orgAccent ? hex(this.f.colors.accent) : undefined, italics: this.f.template === "executive" })] : []),
    ];
  }

  section(k: SectionKey, inSide: boolean): (Paragraph | Table)[] {
    const b = this.body;
    const out: (Paragraph | Table)[] = [this.heading(sectionTitle(b, k), inSide)];
    const techLabel = this.f.template === "developer" || this.f.template === "minimal" ? "Stack" : "Technologies";

    switch (k) {
      case "summary":
        out.push(this.para(b.summary.content, { justify: this.f.template === "executive" }));
        break;
      case "skills":
        for (const c of SKILL_CATEGORIES) {
          if (!b.skills[c].length) continue;
          out.push(
            new Paragraph({
              spacing: { ...this.lineSpacing, after: 30 },
              children: [
                this.run(`${SKILL_CATEGORY_LABELS[c]}: `, { bold: true, color: this.f.template === "developer" ? hex(this.f.colors.accent) : undefined }),
                this.run(b.skills[c].join(", ")),
              ],
            }),
          );
        }
        break;
      case "experience":
        for (const e of b.experience) {
          out.push(...this.entryHead(this.roleLine(e.role, e.company), e.period, inSide));
          if (e.location || e.employment_type) out.push(this.sub([e.location, e.employment_type].filter(Boolean).join(" · ")));
          out.push(...this.bullets(e.achievements));
          if (this.s.showTech && e.technologies.length) out.push(this.tech(techLabel, e.technologies));
        }
        break;
      case "projects":
        for (const p of b.projects) {
          out.push(...this.entryHead(this.roleLine(p.name, p.role), p.period, inSide));
          if (p.url) out.push(this.sub(p.url.replace(/^https?:\/\//, "")));
          if (p.description) out.push(this.para(p.description));
          out.push(...this.bullets(p.highlights));
          if (this.s.showTech && p.technologies.length) out.push(this.tech(techLabel, p.technologies));
        }
        break;
      case "education":
        for (const e of b.education) {
          out.push(...this.entryHead([this.run(e.school, { bold: true })], e.period, inSide));
          out.push(new Paragraph({ keepNext: this.keep && Boolean(e.location || e.details), spacing: this.lineSpacing, children: [this.run(e.degree)] }));
          if (e.location || e.details) out.push(this.sub([e.location, e.details].filter(Boolean).join(" · "), false));
        }
        break;
      case "certifications":
        for (const c of b.certifications) {
          out.push(...this.entryHead([this.run(c.name, { bold: true })], c.date, inSide));
          if (c.issuer) out.push(this.sub(c.issuer, false));
        }
        break;
      case "awards":
        for (const a of b.awards) {
          out.push(...this.entryHead([this.run(a.title, { bold: true })], a.date, inSide));
          if (a.issuer || a.description) out.push(this.sub([a.issuer, a.description].filter(Boolean).join(" — "), false));
        }
        break;
      case "languages":
        if (inSide) {
          for (const l of b.languages) out.push(new Paragraph({ spacing: this.lineSpacing, children: [this.run(l.language, { bold: true }), ...(l.proficiency ? [this.run(` — ${l.proficiency}`)] : [])] }));
        } else {
          out.push(this.para(b.languages.map((l) => (l.proficiency ? `${l.language} (${l.proficiency})` : l.language)).join(" · ")));
        }
        break;
    }
    return out;
  }

  sideContact(): Paragraph[] {
    const items = contactItems(this.body.header);
    if (!items.length) return [];
    return [
      this.heading("Contact", true),
      ...items.map((c) => {
        const r = this.run(c.label, { size: ptToHalfPt(this.small) });
        return new Paragraph({ spacing: this.lineSpacing, children: [c.href ? new ExternalHyperlink({ link: c.href, children: [r] }) : r] });
      }),
    ];
  }
}

export async function buildDocx(document: ResumeDocument, format: FormatSettings): Promise<Buffer> {
  const body = document.resume;
  const page = PAGE_MM[format.page_size];
  const margin = mmToTwip(format.spacing.page_margin);
  const contentWidth = mmToTwip(page.width) - margin * 2;
  const { main, side } = splitSections(body, format.layout);
  const contactInSide = Boolean(CONTACT_IN_SIDE[format.template]?.(format.layout));
  // Mirrors the HTML renderer: collapse to one column when the side column would be empty.
  const cols = format.layout !== "single-column" && (side.length > 0 || contactInSide);

  const top = new Builder(body, format, contentWidth);
  const children: (Paragraph | Table)[] = [...top.header(contactInSide)];

  if (!cols) {
    for (const k of main) children.push(...top.section(k, false));
  } else {
    const gap = ptToTwip(18);
    const sideW = Math.round((contentWidth - gap) * (format.layout === "sidebar" ? 0.333 : 0.342));
    const mainW = contentWidth - gap - sideW;
    const mainB = new Builder(body, format, mainW, false);
    const sideB = new Builder(body, format, sideW - 240, false);
    const styles = STYLES[format.template];

    const mainCell = new TableCell({
      width: { size: mainW, type: WidthType.DXA },
      margins: { left: 0, right: 0, top: 0, bottom: 0 },
      children: main.flatMap((k) => mainB.section(k, false)).filter((c): c is Paragraph => c instanceof Paragraph),
    });
    const sideChildren = [...(contactInSide ? sideB.sideContact() : []), ...side.flatMap((k) => sideB.section(k, true))].filter((c): c is Paragraph => c instanceof Paragraph);
    const sideCell = new TableCell({
      width: { size: sideW, type: WidthType.DXA },
      margins: { left: 120, right: 120, top: 60, bottom: 60 },
      shading: styles.sideTint && format.layout === "sidebar" ? { type: ShadingType.CLEAR, fill: tint(format.colors.accent, 0.06), color: "auto" } : undefined,
      children: sideChildren.length ? sideChildren : [new Paragraph({})],
    });
    const spacer = new TableCell({ width: { size: gap, type: WidthType.DXA }, children: [new Paragraph({})] });
    const cells = format.layout === "sidebar" ? [sideCell, spacer, mainCell] : [mainCell, spacer, sideCell];

    children.push(
      new Table({
        layout: TableLayoutType.FIXED,
        width: { size: contentWidth, type: WidthType.DXA },
        columnWidths: cells.map((c) => (c === spacer ? gap : c === sideCell ? sideW : mainW)),
        borders: { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE },
        rows: [new TableRow({ cantSplit: false, children: cells })],
      }),
    );
  }

  const doc = new Document({
    creator: "ResumeForge",
    title: `${body.header.name || "Resume"}`,
    styles: {
      default: {
        document: {
          run: { font: getFont(format.font.family).docx, size: ptToHalfPt(format.font.size), color: hex(format.colors.text) },
          paragraph: { spacing: { line: Math.round(240 * format.spacing.line_height), lineRule: LineRuleType.AUTO } },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: "rf-bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: format.template === "minimal" ? "–" : "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 300, hanging: 200 } }, run: { color: hex(format.template === "modern" ? format.colors.accent : format.colors.text) } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: mmToTwip(page.width), height: mmToTwip(page.height) },
            margin: { top: margin, bottom: margin, left: margin, right: margin, header: 0, footer: 0 },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
