import type { AuthResponse, User } from "@/types";

const TOKEN_KEY = "calendar_token";
const REFRESH_TOKEN_KEY = "calendar_refresh_token";
const USER_KEY = "calendar_user";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getAccessToken(): string {
  return isBrowser() ? localStorage.getItem(TOKEN_KEY) ?? "" : "";
}

export function getRefreshToken(): string {
  return isBrowser() ? localStorage.getItem(REFRESH_TOKEN_KEY) ?? "" : "";
}

export function setAccessToken(token: string) {
  if (isBrowser()) {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function saveSession(response: AuthResponse) {
  if (!isBrowser()) {
    return;
  }
  localStorage.setItem(TOKEN_KEY, response.access_token);
  localStorage.setItem(REFRESH_TOKEN_KEY, response.refresh_token);
  localStorage.setItem(USER_KEY, JSON.stringify(response.user));
}

export function saveRenewedTokens(accessToken: string, refreshToken: string) {
  if (!isBrowser()) {
    return;
  }
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function saveUser(user: User) {
  if (isBrowser()) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export function clearSession() {
  if (!isBrowser()) {
    return;
  }
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function hasSession() {
  return getAccessToken() !== "";
}
