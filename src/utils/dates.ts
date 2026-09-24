const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2012-03" → "Mar 2012"; "2012" → "2012"; anything else is returned as-is. */
export function formatYearMonth(value: string | null | undefined): string {
  if (!value) return "";
  const m = /^(\d{4})-(\d{2})$/.exec(value);
  if (!m) return value;
  const month = MONTHS[Number(m[2]) - 1];
  return month ? `${month} ${m[1]}` : m[1];
}

export function formatPeriod(start?: string | null, end?: string | null, isCurrent = false): string {
  const s = formatYearMonth(start);
  const e = isCurrent ? "Present" : formatYearMonth(end);
  if (s && e) return `${s} – ${e}`;
  return s || e;
}

export function relativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = (Date.now() - d.getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (diff < 60) return "just now";
  if (diff < 3600) return rtf.format(-Math.round(diff / 60), "minute");
  if (diff < 86400) return rtf.format(-Math.round(diff / 3600), "hour");
  if (diff < 86400 * 30) return rtf.format(-Math.round(diff / 86400), "day");
  return d.toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric" });
}
