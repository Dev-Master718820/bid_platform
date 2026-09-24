import { ContactLine, GradientText, ResumeFrame, type TemplateProps } from "@/templates/shared/frame";

/** Nova — vivid gradient name and section markers over pastel corner gradients. */
const css = `
.rf-t-nova .rf-name{font-weight:900;letter-spacing:-.03em;line-height:1.05;}
.rf-t-nova .rf-title{font-weight:600;color:var(--rf-text);text-transform:uppercase;letter-spacing:.12em;font-size:var(--rf-small);margin-top:3pt;}
.rf-t-nova .rf-contact{margin-top:7pt;gap:3pt;}
.rf-t-nova .rf-contact span{background:rgba(255,255,255,.7);border:1px solid var(--rf-divider);border-radius:20pt;padding:0.5pt 6pt;}
.rf-t-nova .rf-contact span+span::before{content:none;}
.rf-t-nova .rf-h2{display:flex;align-items:center;gap:7pt;font-weight:800;color:var(--rf-header);}
.rf-t-nova .rf-h2::before{content:"";width:4pt;height:1.1em;border-radius:2pt;background:linear-gradient(180deg,var(--rf-header),var(--rf-accent));flex:none;}
.rf-t-nova .rf-org{color:var(--rf-accent);}
.rf-t-nova .rf-bullets li::marker{color:var(--rf-accent);}
.rf-t-nova .rf-chip{background:linear-gradient(90deg,color-mix(in srgb,var(--rf-header) 13%,#fff),color-mix(in srgb,var(--rf-accent) 15%,#fff));color:var(--rf-text);border-radius:20pt;padding:0.5pt 6pt;}
.rf-t-nova .rf-tech b,.rf-t-nova .rf-skill-row b{color:var(--rf-header);}
`;

export default function NovaTemplate({ data, format }: TemplateProps) {
  const h = data.header;
  return (
    <ResumeFrame
      data={data}
      format={format}
      templateClass="rf-t-nova"
      css={css}
      options={{ skills: "chips", showTech: true }}
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
