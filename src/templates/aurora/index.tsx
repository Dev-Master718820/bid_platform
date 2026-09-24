import { ContactLine, ResumeFrame, type TemplateProps } from "@/templates/shared/frame";

/** Aurora — gradient header card, gradient section rules, soft glow page background. */
const css = `
.rf-t-aurora .rf-header{background:linear-gradient(120deg,var(--rf-header) 0%,var(--rf-accent) 100%);color:#fff;padding:16pt 18pt;border-radius:10pt;box-shadow:0 8pt 20pt -12pt var(--rf-header);}
.rf-t-aurora .rf-name{color:#fff;letter-spacing:-.01em;}
.rf-t-aurora .rf-title{color:rgba(255,255,255,.92);font-weight:500;}
.rf-t-aurora .rf-contact{color:rgba(255,255,255,.95);}
.rf-t-aurora .rf-contact span+span::before{opacity:.6;}
.rf-t-aurora .rf-h2{display:flex;align-items:center;gap:8pt;color:var(--rf-header);letter-spacing:.01em;}
.rf-t-aurora .rf-h2::after{content:"";flex:1;height:2pt;border-radius:2pt;background:linear-gradient(90deg,var(--rf-accent),transparent);}
.rf-t-aurora .rf-org{color:var(--rf-header);}
.rf-t-aurora .rf-bullets li::marker{color:var(--rf-accent);}
.rf-t-aurora .rf-chip{background:linear-gradient(90deg,color-mix(in srgb,var(--rf-header) 12%,#fff),color-mix(in srgb,var(--rf-accent) 14%,#fff));color:var(--rf-header);border-radius:20pt;padding:0.5pt 6pt;}
.rf-t-aurora .rf-tech b,.rf-t-aurora .rf-skill-row b{color:var(--rf-header);}
`;

export default function AuroraTemplate({ data, format }: TemplateProps) {
  const h = data.header;
  return (
    <ResumeFrame
      data={data}
      format={format}
      templateClass="rf-t-aurora"
      css={css}
      options={{ skills: "chips", showTech: true }}
      header={
        <>
          <h1 className="rf-name">{h.name || "Your Name"}</h1>
          {h.professional_title && <div className="rf-title">{h.professional_title}</div>}
          <ContactLine header={h} />
        </>
      }
    />
  );
}
