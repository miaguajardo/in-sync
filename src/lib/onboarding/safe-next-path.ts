/** Returns a safe in-app path for redirects (no open redirects). */
export function safeNextPath(next: string | null | undefined, fallback = "/workouts"): string {
  if (!next || typeof next !== "string") return fallback;
  const t = next.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return fallback;
  return t;
}
