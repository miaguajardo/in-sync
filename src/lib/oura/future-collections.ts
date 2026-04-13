/** Placeholder tiles for the Oura hub — wire real fetchers + UI when scopes expand. */
export type FutureOuraCollection = {
  id: string;
  label: string;
  description: string;
};

export const FUTURE_OURA_COLLECTIONS: FutureOuraCollection[] = [
  {
    id: "daily_sleep",
    label: "Sleep",
    description: "Nightly sleep summaries from Oura (daily_sleep).",
  },
  {
    id: "session",
    label: "Sessions",
    description: "Guided and detected sessions (session scope).",
  },
  {
    id: "heartrate",
    label: "Heart rate",
    description: "Daytime HR samples (heartrate scope).",
  },
];
