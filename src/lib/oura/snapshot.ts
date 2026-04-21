import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_OURA_SCOPES } from "./constants";
import { getValidOuraAccessToken } from "./access-token";
import { readOuraTokensForUser } from "./token-store";
import { fetchOuraUserCollection } from "./v2-client";

/** One GET probe per OAuth scope we can exercise on v2 (email has no list endpoint). */
const SCOPE_PROBES: Record<
  string,
  { collection: string; params: "none" | "date_range" | "datetime_range" }
> = {
  daily: { collection: "daily_sleep", params: "date_range" },
  workout: { collection: "workout", params: "date_range" },
  personal: { collection: "personal_info", params: "none" },
  heartrate: { collection: "heartrate", params: "datetime_range" },
  tag: { collection: "tag", params: "date_range" },
  session: { collection: "session", params: "date_range" },
  spo2: { collection: "daily_spo2", params: "date_range" },
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseScopes(scope: string | undefined | null): string[] {
  const trimmed = scope?.trim().replace(/\s+/g, " ") ?? "";
  const raw =
    trimmed.length > 0
      ? trimmed
      : DEFAULT_OURA_SCOPES.trim().replace(/\s+/g, " ");
  return [...new Set(raw.split(" ").filter(Boolean))];
}

function ymdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function defaultOuraDateRange(): { start_date: string; end_date: string } {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 7);
  return { start_date: ymdLocal(start), end_date: ymdLocal(end) };
}

function daysBetweenInclusive(a: string, b: string): number {
  const t0 = new Date(`${a}T00:00:00`).getTime();
  const t1 = new Date(`${b}T00:00:00`).getTime();
  return Math.floor((t1 - t0) / 86_400_000) + 1;
}

export function resolveSnapshotRange(searchParams: URLSearchParams):
  | { ok: true; start_date: string; end_date: string }
  | { ok: false; error: string } {
  const qStart = searchParams.get("start_date");
  const qEnd = searchParams.get("end_date");
  if (!qStart && !qEnd) {
    return { ok: true, ...defaultOuraDateRange() };
  }
  if (!qStart || !qEnd) {
    return {
      ok: false,
      error: "Provide both start_date and end_date (YYYY-MM-DD) or omit both.",
    };
  }
  if (!DATE_RE.test(qStart) || !DATE_RE.test(qEnd)) {
    return { ok: false, error: "start_date and end_date must be YYYY-MM-DD." };
  }
  if (qStart > qEnd) {
    return { ok: false, error: "start_date must be on or before end_date." };
  }
  if (daysBetweenInclusive(qStart, qEnd) > 31) {
    return { ok: false, error: "Date range cannot exceed 31 days (Oura limit)." };
  }
  return { ok: true, start_date: qStart, end_date: qEnd };
}

export type SnapshotProbeResult = {
  scope: string;
  collection: string;
  status: number;
  data?: unknown;
  raw?: string;
};

export type SnapshotJson = {
  start_date: string;
  end_date: string;
  scopes: string[];
  scopes_skipped: string[];
  results: SnapshotProbeResult[];
};

export async function buildOuraSnapshot(
  sb: SupabaseClient,
  userId: string,
  searchParams: URLSearchParams,
): Promise<{ status: 401 } | { status: 400; error: string } | { status: 200; body: SnapshotJson }> {
  const range = resolveSnapshotRange(searchParams);
  if (!range.ok) {
    return { status: 400, error: range.error };
  }

  const accessToken = await getValidOuraAccessToken(sb, userId);
  if (!accessToken) {
    return { status: 401 };
  }

  const stored = await readOuraTokensForUser(sb, userId);
  const scopes = parseScopes(stored?.scope);
  const scopes_skipped: string[] = [];
  const probes: { scope: string; collection: string; params: "none" | "date_range" | "datetime_range" }[] =
    [];

  for (const s of scopes) {
    const probe = SCOPE_PROBES[s];
    if (!probe) {
      if (s === "email") scopes_skipped.push(s);
      continue;
    }
    probes.push({ scope: s, collection: probe.collection, params: probe.params });
  }

  const results: SnapshotProbeResult[] = await Promise.all(
    probes.map(async ({ scope, collection, params }) => {
      const q = new URLSearchParams();
      if (params === "date_range") {
        q.set("start_date", range.start_date);
        q.set("end_date", range.end_date);
      } else if (params === "datetime_range") {
        q.set("start_datetime", `${range.start_date}T00:00:00.000Z`);
        q.set("end_datetime", `${range.end_date}T23:59:59.999Z`);
      }
      const r = await fetchOuraUserCollection(accessToken, collection, q);
      return {
        scope,
        collection,
        status: r.status,
        ...(r.data !== undefined ? { data: r.data } : {}),
        ...(r.raw !== undefined ? { raw: r.raw } : {}),
      };
    }),
  );

  return {
    status: 200,
    body: {
      start_date: range.start_date,
      end_date: range.end_date,
      scopes,
      scopes_skipped,
      results,
    },
  };
}
