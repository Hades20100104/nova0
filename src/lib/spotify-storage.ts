/**
 * Almacena tokens de Spotify en localStorage. Cada usuario en su propia clave
 * derivada del id (lo seteamos cuando hay sesión).
 */
const KEY = "spotify.tokens.v2";
const PKCE_VERIFIER_KEY = "spotify.pkce.verifier.v1";
const PKCE_REDIRECT_KEY = "spotify.pkce.redirect.v1";
const SPOTIFY_USER_HINT_KEY = "spotify.user-hint.v1";

export interface SpotifyTokens {
  access_token: string;
  refresh_token: string | null;
  expires_at: number; // ms epoch
  spotify_user_id?: string | null;
}

export function setSpotifyTokens(t: SpotifyTokens) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(t));
}

export function getSpotifyTokenKey(userId?: string | null) {
  return userId ? `${KEY}.${userId}` : KEY;
}

export function setSpotifyTokensForUser(userId: string | null | undefined, t: SpotifyTokens) {
  if (typeof window === "undefined") return;
  const key = getSpotifyTokenKey(userId);
  localStorage.setItem(key, JSON.stringify(t));
  if (userId) setSpotifyUserHint(userId);
}

export function getSpotifyTokens(): SpotifyTokens | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SpotifyTokens;
  } catch {
    return null;
  }
}

export function getSpotifyTokensForUser(userId?: string | null): SpotifyTokens | null {
  if (typeof window === "undefined") return null;
  const key = getSpotifyTokenKey(userId);
  const raw = localStorage.getItem(key) ?? (userId ? localStorage.getItem(KEY) : null);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SpotifyTokens;
  } catch {
    return null;
  }
}

export function clearSpotifyTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

export function clearSpotifyTokensForUser(userId?: string | null) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(getSpotifyTokenKey(userId));
  if (userId) localStorage.removeItem(KEY);
}

export function setSpotifyUserHint(userId: string | null) {
  if (typeof window === "undefined") return;
  if (!userId) {
    localStorage.removeItem(SPOTIFY_USER_HINT_KEY);
    return;
  }
  localStorage.setItem(SPOTIFY_USER_HINT_KEY, userId);
}

export function getSpotifyUserHint() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SPOTIFY_USER_HINT_KEY);
}

export function setSpotifyPkce(verifier: string, redirectUri: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PKCE_VERIFIER_KEY, verifier);
  localStorage.setItem(PKCE_REDIRECT_KEY, redirectUri);
  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
  sessionStorage.setItem(PKCE_REDIRECT_KEY, redirectUri);
}

export function getSpotifyPkce(): { verifier: string; redirectUri: string | null } | null {
  if (typeof window === "undefined") return null;
  const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY) ?? localStorage.getItem(PKCE_VERIFIER_KEY);
  if (!verifier) return null;
  const redirectUri = sessionStorage.getItem(PKCE_REDIRECT_KEY) ?? localStorage.getItem(PKCE_REDIRECT_KEY);
  return { verifier, redirectUri };
}

export function clearSpotifyPkce() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PKCE_VERIFIER_KEY);
  localStorage.removeItem(PKCE_REDIRECT_KEY);
  sessionStorage.removeItem(PKCE_VERIFIER_KEY);
  sessionStorage.removeItem(PKCE_REDIRECT_KEY);
}

/* ===== PKCE helpers ===== */

function base64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = "";
  for (let i = 0; i < bytes.byteLength; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function generateCodeVerifier(length = 64): string {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const random = new Uint8Array(length);
  crypto.getRandomValues(random);
  let out = "";
  for (let i = 0; i < length; i++) out += charset[random[i] % charset.length];
  return out;
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64Url(digest);
}
