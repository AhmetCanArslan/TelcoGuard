/* ======================================================
   TelcoGuard – Auth Helpers
   Token CRUD via localStorage
   ====================================================== */

const ACCESS_TOKEN_KEY = 'tg_access_token'
const REFRESH_TOKEN_KEY = 'tg_refresh_token'
const USER_KEY = 'tg_user'

export interface StoredUser {
  id: number
  name: string
  email: string
  role: string
}

/* ---- Token CRUD ---- */

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, access)
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

/* ---- User CRUD ---- */

export function getStoredUser(): StoredUser | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export function setStoredUser(user: StoredUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

/* ---- Auth State ---- */

export function isAuthenticated(): boolean {
  return !!getAccessToken()
}
