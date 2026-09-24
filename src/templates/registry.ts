import type { ComponentType } from "react";
import type { TemplateKey } from "@/features/resume/format";
import type { TemplateProps } from "@/templates/shared/frame";
import AtsTemplate from "@/templates/ats";
import ModernTemplate from "@/templates/modern";
import MinimalTemplate from "@/templates/minimal";
import ExecutiveTemplate from "@/templates/executive";
import DeveloperTemplate from "@/templates/developer";
import AuroraTemplate from "@/templates/aurora";
import HorizonTemplate from "@/templates/horizon";
import PrismTemplate from "@/templates/prism";
import LuxeTemplate from "@/templates/luxe";
import NovaTemplate from "@/templates/nova";

/** Template key → React component. Add a template: create a folder, register it here, in meta.ts, TEMPLATE_KEYS, docx STYLES
 * and (optionally) page-backgrounds.ts. */
export const TEMPLATE_COMPONENTS: Record<TemplateKey, ComponentType<TemplateProps>> = {
  ats: AtsTemplate,
  modern: ModernTemplate,
  minimal: MinimalTemplate,
  executive: ExecutiveTemplate,
  developer: DeveloperTemplate,
  aurora: AuroraTemplate,
  horizon: HorizonTemplate,
  prism: PrismTemplate,
  luxe: LuxeTemplate,
  nova: NovaTemplate,
};

/** Templates whose CSS uses the monospace font (so it must be loaded). */
export const USES_MONO: ReadonlySet<TemplateKey> = new Set(["developer"]);
