export const OURA_AUTHORIZE_URL = "https://cloud.ouraring.com/oauth/authorize";
export const OURA_TOKEN_URL = "https://api.ouraring.com/oauth/token";
/** Oura Cloud API v2 origin (usercollection routes). */
export const OURA_API_BASE = "https://api.ouraring.com";

/** HttpOnly cookie holding the OAuth `state` value (CSRF). */
export const OURA_STATE_COOKIE = "oura_oauth_state";

/** HttpOnly cookie binding Oura OAuth start to the signed-in Supabase user (UUID). */
export const OURA_USER_COOKIE = "oura_oauth_user_id";

/** Where to send the user after Oura OAuth succeeds (path only, e.g. `/workouts`). */
export const OURA_POST_NEXT_COOKIE = "oura_post_next_path";

export const DEFAULT_OURA_SCOPES = "daily workout";
