import { FONTS } from "@/templates/fonts";
import { fontProxyCss } from "@/services/export/font-embed";

export const runtime = "nodejs";

/**
 * GET /api/fonts/css?family=Inter&mono=1 → @font-face CSS pointing at /api/fonts/file.
 * Serves the live preview the exact font files the PDF embeds (identical metrics → identical page breaks).
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const family = params.get("family") ?? "";
  if (!FONTS.some((f) => f.value === family)) return new Response("Unknown font family", { status: 400 });
  try {
    const css = await fontProxyCss(family, params.get("mono") === "1");
    return new Response(css, { headers: { "Content-Type": "text/css; charset=utf-8", "Cache-Control": "public, max-age=86400" } });
  } catch {
    return new Response("/* font stylesheet unavailable */", { status: 502, headers: { "Content-Type": "text/css" } });
  }
}
