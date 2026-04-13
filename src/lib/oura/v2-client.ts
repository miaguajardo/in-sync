import { OURA_API_BASE } from "./constants";

export type OuraV2FetchResult = {
  status: number;
  data?: unknown;
  raw?: string;
};

export async function fetchOuraUserCollection(
  accessToken: string,
  collection: string,
  query: URLSearchParams,
): Promise<OuraV2FetchResult> {
  const url = `${OURA_API_BASE}/v2/usercollection/${collection}?${query.toString()}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text) as unknown };
  } catch {
    return { status: res.status, raw: text };
  }
}
