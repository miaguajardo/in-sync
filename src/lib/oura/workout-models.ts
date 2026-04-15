/** Narrow view of Oura v2 `workout` usercollection documents for UI + linking. */
export type OuraWorkoutSummary = {
  id: string;
  day?: string;
  start_datetime?: string;
  end_datetime?: string;
  activity?: string;
  source?: string;
  calories?: number;
  duration?: number;
  intensity?: string;
};

function pickString(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function pickNumber(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/** Seconds between ISO datetimes; undefined if missing or not parseable. */
function durationSecondsFromStartEnd(
  startIso: string | undefined,
  endIso: string | undefined,
): number | undefined {
  if (!startIso || !endIso) return undefined;
  const t0 = Date.parse(startIso);
  const t1 = Date.parse(endIso);
  if (!Number.isFinite(t0) || !Number.isFinite(t1) || t1 <= t0) return undefined;
  return Math.round((t1 - t0) / 1000);
}

export function normalizeOuraWorkoutDoc(raw: unknown): OuraWorkoutSummary | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = pickString(o.id);
  if (!id) return null;
  const start_datetime = pickString(o.start_datetime);
  const end_datetime = pickString(o.end_datetime);
  const duration =
    pickNumber(o.duration) ?? durationSecondsFromStartEnd(start_datetime, end_datetime);
  return {
    id,
    day: pickString(o.day),
    start_datetime,
    end_datetime,
    activity: pickString(o.activity),
    source: pickString(o.source),
    calories: pickNumber(o.calories),
    duration,
    intensity: pickString(o.intensity),
  };
}

export function parseOuraWorkoutCollectionPayload(data: unknown): OuraWorkoutSummary[] {
  if (!data || typeof data !== "object") return [];
  const root = data as { data?: unknown };
  if (!Array.isArray(root.data)) return [];
  const out: OuraWorkoutSummary[] = [];
  for (const item of root.data) {
    const n = normalizeOuraWorkoutDoc(item);
    if (n) out.push(n);
  }
  return out;
}
