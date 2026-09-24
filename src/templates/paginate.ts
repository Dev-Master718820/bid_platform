export type MeasuredBlock = { top: number; bottom: number; keepNext: boolean };

/**
 * Computes page start offsets (px) for a measured resume.
 * Mirrors the print CSS contract:
 *  - never break inside a block ([data-block] ↔ break-inside: avoid)
 *  - never break right after a keep-next block ([data-keep-next] ↔ break-after: avoid)
 *  - a block taller than a page is hard-cut (Chrome does the same)
 * Blocks must be in document order.
 */
export function paginate(blocks: MeasuredBlock[], totalHeight: number, pageHeight: number): number[] {
  const starts = [0];
  if (pageHeight <= 0) return starts;
  let start = 0;
  const EPS = 0.5;

  for (let guard = 0; start + pageHeight < totalHeight - EPS && guard < 200; guard++) {
    const limit = start + pageHeight;
    let y = limit;
    let changed = true;

    while (changed) {
      changed = false;
      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i]!;
        if (b.top <= start + EPS) continue;
        // Block straddles the break → move break above it.
        if (b.top < y - EPS && b.bottom > y + EPS) {
          y = b.top;
          changed = true;
          continue;
        }
        // Keep-next block is the last thing before the break → take it to the next page.
        if (b.keepNext && b.top < y - EPS && b.bottom <= y + EPS) {
          const next = blocks[i + 1];
          if (next && next.top >= y - EPS && next.top < limit + pageHeight) {
            y = b.top;
            changed = true;
          }
        }
      }
    }

    if (y <= start + EPS) y = limit; // nothing breakable fits: hard cut
    starts.push(y);
    start = y;
  }
  return starts;
}

/** A rectangular window onto the rendered content, placed on a page at `dest` (px from content top). */
export type Slice = { from: number; to: number; x0: number; x1: number; dest: number };

function blocksIn(root: HTMLElement, origin: number, scope?: Element): MeasuredBlock[] {
  return Array.from(root.querySelectorAll<HTMLElement>("[data-block]"))
    .filter((el) => !scope || scope.contains(el) || !el.closest(".rf-cols"))
    .map((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top - origin, bottom: r.bottom - origin, keepNext: el.hasAttribute("data-keep-next") };
    });
}

/**
 * Splits measured content into pages of slices.
 *  - Flow layouts: one full-width slice per page.
 *  - Column layouts: Chromium fragments grid columns independently when printing, so each column
 *    is paginated on its own and every page shows one clipped slice per column (plus the header
 *    on page 1). This keeps preview page breaks identical to the PDF.
 */
export function layoutPages(root: HTMLElement, pageHeight: number): Slice[][] {
  const box = root.getBoundingClientRect();
  const origin = box.top;
  const width = box.width;
  const cols = root.querySelector<HTMLElement>(".rf-cols");
  const columnEls = cols ? (Array.from(cols.children) as HTMLElement[]) : [];

  if (!cols || columnEls.length < 2) {
    const blocks = blocksIn(root, origin);
    const total = root.scrollHeight;
    const starts = paginate(blocks, total, pageHeight);
    return starts.map((from, i) => [{ from, to: starts[i + 1] ?? total, x0: 0, x1: width, dest: 0 }]);
  }

  const colsTop = cols.getBoundingClientRect().top - origin;
  const rects = columnEls.map((el) => el.getBoundingClientRect()).sort((a, b) => a.left - b.left);
  const ordered = columnEls.slice().sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
  // Split the inter-column gap down the middle so nothing (e.g. italic overhang) is clipped.
  const bounds = rects.map((r, i) => ({
    x0: i === 0 ? 0 : (rects[i - 1]!.right + r.left) / 2 - box.left,
    x1: i === rects.length - 1 ? width : (r.right + rects[i + 1]!.left) / 2 - box.left,
  }));

  const pages: Slice[][] = [];
  const add = (i: number, s: Slice) => (pages[i] ??= []).push(s);
  if (colsTop > 0) add(0, { from: 0, to: colsTop, x0: 0, x1: width, dest: 0 });

  ordered.forEach((col, c) => {
    const total = col.getBoundingClientRect().bottom - origin;
    const starts = paginate(blocksIn(root, origin, col), total, pageHeight);
    starts.forEach((start, i) => {
      const from = i === 0 ? colsTop : start;
      const to = starts[i + 1] ?? total;
      if (to > from) add(i, { from, to, x0: bounds[c]!.x0, x1: bounds[c]!.x1, dest: from - start });
    });
  });
  for (let i = 0; i < pages.length; i++) pages[i] ??= [];
  return pages;
}
