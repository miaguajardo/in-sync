import fs from "fs/promises";
import path from "path";

export type StoredOuraTokens = {
  access_token: string;
  refresh_token: string;
  /** Epoch ms when access_token is no longer valid */
  expires_at_ms: number;
  scope?: string;
  updated_at: string;
};

function storePath(): string {
  return (
    process.env.OURA_TOKEN_STORE_PATH ??
    path.join(/*turbopackIgnore: true*/ process.cwd(), ".data", "oura-tokens.json")
  );
}

export async function readOuraTokens(): Promise<StoredOuraTokens | null> {
  const p = storePath();
  try {
    const raw = await fs.readFile(p, "utf-8");
    return JSON.parse(raw) as StoredOuraTokens;
  } catch {
    return null;
  }
}

export async function writeOuraTokens(data: StoredOuraTokens): Promise<void> {
  const p = storePath();
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, JSON.stringify(data, null, 2), "utf-8");
}

/** True if we have stored tokens that might still be usable (refresh or unexpired access). */
export async function isOuraConnected(): Promise<boolean> {
  const s = await readOuraTokens();
  if (!s) return false;
  if (s.refresh_token) return true;
  return Date.now() < s.expires_at_ms;
}
