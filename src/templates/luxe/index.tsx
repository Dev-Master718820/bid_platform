import { ContactLine, ResumeFrame, type TemplateProps } from "@/templates/shared/frame";

/** Luxe — refined serif on warm cream with gold gradient hairlines. */
const css = `
.rf-t-luxe .rf-header{padding-bottom:10pt;position:relative;}
.rf-t-luxe .rf-header::after{content:"";display:block;height:1pt;margin-top:10pt;background:linear-gradient(90deg,transparent,var(--rf-accent) 20%,var(--rf-accent) 80%,transparent);}
.rf-t-luxe .rf-name{font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--rf-header);}
.rf-t-luxe .rf-title{font-style:italic;color:var(--rf-accent);letter-spacing:.03em;margin-top:4pt;}
.rf-t-luxe .rf-contact{letter-spacing:.02em;}
.rf-t-luxe .rf-contact span+span::before{content:"◆";font-size:.6em;top:.55em;left:-8.2pt;color:var(--rf-accent);opacity:1;}
.rf-t-luxe .rf-h2{display:flex;align-items:center;gap:10pt;font-weight:600;letter-spacing:.2em;text-transform:uppercase;font-size:var(--rf-small);color:var(--rf-header);}
.rf-t-luxe .rf-h2::before,.rf-t-luxe .rf-h2::after{content:"";flex:1;height:1pt;background:linear-gradient(90deg,transparent,var(--rf-accent));}
.rf-t-luxe .rf-h2::after{background:linear-gradient(90deg,var(--rf-accent),transparent);}
.rf-t-luxe .rf-org{font-style:italic;font-weight:400;color:var(--rf-accent);}
.rf-t-luxe .rf-p{text-align:justify;}
.rf-t-luxe .rf-bullets li::marker{color:var(--rf-accent);}
.rf-t-luxe .rf-tech b,.rf-t-luxe .rf-skill-row b{color:var(--rf-accent);font-weight:600;}
`;

export default function LuxeTemplate({ data, format }: TemplateProps) {
  const h = data.header;
  return (
    <ResumeFrame
      data={data}
      format={format}
      templateClass="rf-t-luxe"
      css={css}
      options={{ skills: "inline", showTech: false }}
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
