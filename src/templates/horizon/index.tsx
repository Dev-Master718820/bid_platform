import { ContactLine, GradientText, ResumeFrame, type TemplateProps } from "@/templates/shared/frame";

/** Horizon — full-page gradient wash, gradient name and headings (per-letter, print-safe). */
const css = `
.rf-t-horizon .rf-name{font-weight:800;letter-spacing:-.02em;}
.rf-t-horizon .rf-title{color:var(--rf-header);font-weight:600;letter-spacing:.02em;}
.rf-t-horizon .rf-contact{opacity:.85;}
.rf-t-horizon .rf-h2{text-transform:uppercase;letter-spacing:.14em;font-size:var(--rf-small);padding-bottom:3pt;border-bottom:1pt solid var(--rf-divider);}
.rf-t-horizon .rf-h2 span{font-weight:800;}
.rf-t-horizon .rf-org{color:var(--rf-accent);}
.rf-t-horizon .rf-bullets li::marker{color:var(--rf-header);}
.rf-t-horizon .rf-tech b,.rf-t-horizon .rf-skill-row b{color:var(--rf-header);}
`;

export default function HorizonTemplate({ data, format }: TemplateProps) {
  const h = data.header;
  return (
    <ResumeFrame
      data={data}
      format={format}
      templateClass="rf-t-horizon"
      css={css}
      options={{ skills: "inline", showTech: true, headingGradient: [format.colors.header, format.colors.accent] }}
      header={
        <>
          <h1 className="rf-name">
            <GradientText text={h.name || "Your Name"} from={format.colors.header} to={format.colors.accent} />
          </h1>
          {h.professional_title && <div className="rf-title">{h.professional_title}</div>}
          <ContactLine header={h} />
        </>
      }
    />
  );
}
