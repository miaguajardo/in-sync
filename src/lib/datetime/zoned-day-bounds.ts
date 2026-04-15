/** Inclusive calendar-day range as UTC ISO strings for DB filtering (`started_at`, etc.). */

export function utcCalendarDayBounds(start_date: string, end_date: string): {
  start: string;
  end: string;
} {
  return {
    start: `${start_date}T00:00:00.000Z`,
    end: `${end_date}T23:59:59.999Z`,
  };
}

export function isValidIanaTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone }).format(0);
    return true;
  } catch {
    return false;
  }
}

function ymdKey(w: { year: number; month: number; day: number }): number {
  return w.year * 10_000 + w.month * 100 + w.day;
}

function wallDateInZone(utcMs: number, timeZone: string): {
  year: number;
  month: number;
  day: number;
} {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(utcMs));
  const g = (t: Intl.DateTimeFormatPartTypes) =>
    parseInt(p.find((x) => x.type === t)!.value, 10);
  return { year: g("year"), month: g("month"), day: g("day") };
}

function addDaysYmd(ymd: string, days: number): string {
  const [y, mo, d] = ymd.split("-").map((x) => parseInt(x, 10));
  const u = new Date(Date.UTC(y, mo - 1, d));
  u.setUTCDate(u.getUTCDate() + days);
  return `${u.getUTCFullYear()}-${String(u.getUTCMonth() + 1).padStart(2, "0")}-${String(u.getUTCDate()).padStart(2, "0")}`;
}

/** First instant (UTC ms) of `ymd`'s calendar date in `timeZone`. */
function startOfZonedDayUtc(ymd: string, timeZone: string): number {
  const [y, mo, d] = ymd.split("-").map((x) => parseInt(x, 10));
  const target = y * 10_000 + mo * 100 + d;
  let lo = Date.UTC(y, mo - 1, d - 2, 0, 0, 0);
  let hi = Date.UTC(y, mo - 1, d + 2, 0, 0, 0);
  while (lo < hi - 1) {
    const mid = Math.floor((lo + hi) / 2);
    const key = ymdKey(wallDateInZone(mid, timeZone));
    if (key < target) lo = mid;
    else hi = mid;
  }
  let t = hi;
  while (t > lo) {
    const prev = t - 1;
    if (ymdKey(wallDateInZone(prev, timeZone)) < target) break;
    t = prev;
  }
  return t;
}

/** Last millisecond of `ymd`'s calendar date in `timeZone`. */
function endOfZonedDayUtc(ymd: string, timeZone: string): number {
  return startOfZonedDayUtc(addDaysYmd(ymd, 1), timeZone) - 1;
}

/**
 * When the UI picks YYYY-MM-DD in the user's locale, treat that as an inclusive
 * range in `time_zone` (browser IANA id). Falls back to UTC calendar bounds if
 * `time_zone` is missing or invalid.
 */
export function inclusiveLocalDayBoundsAsIso(
  start_date: string,
  end_date: string,
  time_zone: string | null | undefined,
): { start: string; end: string } {
  if (!time_zone || !isValidIanaTimeZone(time_zone)) {
    return utcCalendarDayBounds(start_date, end_date);
  }
  const startMs = startOfZonedDayUtc(start_date, time_zone);
  const endMs = endOfZonedDayUtc(end_date, time_zone);
  return {
    start: new Date(startMs).toISOString(),
    end: new Date(endMs).toISOString(),
  };
}
