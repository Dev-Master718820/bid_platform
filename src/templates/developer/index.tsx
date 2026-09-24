import { ContactLine, ResumeFrame, type TemplateProps } from "@/templates/shared/frame";

/** Software Engineer — monospace accents, skills matrix, tech tags. */
const css = `
.rf-t-developer .rf-header{border-left:3pt solid var(--rf-accent);padding-left:10pt;text-align:left;}
.rf-t-developer .rf-contact{justify-content:flex-start;font-family:var(--rf-mono);font-size:calc(var(--rf-small) * .95);}
.rf-t-developer .rf-title{font-family:var(--rf-mono);color:var(--rf-accent);font-size:var(--rf-size);}
.rf-t-developer .rf-h2{font-family:var(--rf-mono);font-size:var(--rf-size);color:var(--rf-header);border-bottom:1px dashed var(--rf-divider);padding-bottom:2pt;}
.rf-t-developer .rf-h2::before{content:"// ";color:var(--rf-accent);}
.rf-t-developer .rf-meta{font-family:var(--rf-mono);font-size:calc(var(--rf-small) * .92);}
.rf-t-developer .rf-org{color:var(--rf-accent);}
.rf-t-developer .rf-tech b{font-family:var(--rf-mono);font-weight:500;color:var(--rf-accent);}
.rf-t-developer .rf-tech-list{font-family:var(--rf-mono);font-size:calc(var(--rf-small) * .95);}
.rf-t-developer .rf-skill-grid dt,.rf-t-developer .rf-skill-row b{font-family:var(--rf-mono);font-weight:500;color:var(--rf-accent);}
`;

export default function DeveloperTemplate({ data, format }: TemplateProps) {
  const h = data.header;
  return (
    <ResumeFrame
      data={data}
      format={format}
      templateClass="rf-t-developer"
      css={css}
      options={{ skills: "grid", showTech: true, techLabel: "Stack" }}
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
