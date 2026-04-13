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
};

function pickString(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function pickNumber(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

export function normalizeOuraWorkoutDoc(raw: unknown): OuraWorkoutSummary | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = pickString(o.id);
  if (!id) return null;
  return {
    id,
    day: pickString(o.day),
    start_datetime: pickString(o.start_datetime),
    end_datetime: pickString(o.end_datetime),
    activity: pickString(o.activity),
    source: pickString(o.source),
    calories: pickNumber(o.calories),
    duration: pickNumber(o.duration),
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
