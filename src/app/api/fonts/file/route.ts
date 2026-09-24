import { FONT_PATH_RE, fetchFontFile } from "@/services/export/font-embed";

export const runtime = "nodejs";

/** GET /api/fonts/file?p=/s/inter/v20/xyz.ttf → the font file (allow-listed fonts.gstatic.com paths only). */
export async function GET(req: Request) {
  const path = new URL(req.url).searchParams.get("p") ?? "";
  if (!FONT_PATH_RE.test(path)) return new Response("Invalid font path", { status: 400 });
  try {
    const buf = await fetchFontFile(path);
    const type = path.endsWith(".woff2") ? "font/woff2" : path.endsWith(".woff") ? "font/woff" : "font/ttf";
    // Google font file URLs are versioned (/v20/…), so the content never changes.
    return new Response(new Uint8Array(buf), { headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch {
    return new Response("Font unavailable", { status: 502 });
  }
}
