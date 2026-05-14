/* ======================================================
   TelcoGuard – API Client Layer
   Typed API functions with JWT auth + auto-refresh
   ====================================================== */

import type {
  BaseStation, Alarm, Metric, DashboardSummary, FieldEngineer,
  AlarmSeverity, AlarmStatus, SummaryOverview, TrendPoint,
  EngineerAnalytics, FixedIssue, LocationAnalysis
} from '../types'
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './auth'

const API_BASE = '/api/v1'

/* ---- Generic fetch wrapper ---- */

interface APIResponse<T = unknown> {
  // API can return either `message` for success or `error` for failures
  // Preserve both fields for proper error handling

  success: boolean
  message?: string
  error?: string
  data: T
  meta?: {
    page: number
    per_page: number
    total: number
    total_pages: number
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
    if (!res.ok) return null
    const data: APIResponse<{ access_token: string }> = await res.json()
    if (data.success && data.data.access_token) {
      setTokens(data.data.access_token, refreshToken)
      return data.data.access_token
    }
    return null
  } catch {
    return null
  }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<APIResponse<T>> {
  const token = getAccessToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (res.status === 401 && retry) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      return apiFetch<T>(path, options, false)
    }
    clearTokens()
    window.location.href = '/login'
    throw new Error('Session expired')
  }

  const data: APIResponse<T> = await res.json()
  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed: ${res.status}`)
  }
  return data
}

/* ---- Auth ---- */

export interface LoginResponse {
  access_token: string
  refresh_token: string
  user: FieldEngineer & { email: string; role: string }
}

export async function apiLogin(email: string, password: string) {
  const res = await apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }, false)
  return res.data
}

export async function apiRegister(data: {
  name: string; email: string; password: string; role?: string
}) {
  const res = await apiFetch<unknown>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  }, false)
  return res.data
}

export async function apiGetMe() {
  const res = await apiFetch<{ id: number; name: string; email: string; role: string }>('/me')
  return res.data
}

/* ---- Firebase Password Reset ---- */

export async function apiSendResetEmail(email: string) {
  const res = await apiFetch<unknown>('/auth/send-reset-email', {
    method: 'POST',
    body: JSON.stringify({ email }),
  }, false)
  return res.data
}

/* ---- OTP & Password Reset (public endpoints) ---- */

export async function apiSendOTP(contact: string, method: string) {
  const res = await apiFetch<{ code?: string }>('/auth/otp/send', {
    method: 'POST',
    body: JSON.stringify({ contact, method }),
  }, false)
  return res.data
}

export async function apiVerifyOTP(contact: string, code: string) {
  const res = await apiFetch<unknown>('/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ contact, code }),
  }, false)
  return res.data
}

export async function apiResetPassword(contact: string, otpCode: string, newPassword: string) {
  const res = await apiFetch<unknown>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ contact, otp_code: otpCode, new_password: newPassword }),
  }, false)
  return res.data
}

/* ---- Dashboard ---- */

export async function apiGetDashboardSummary() {
  const res = await apiFetch<DashboardSummary>('/dashboard/summary')
  return res.data
}

/* ---- Stations ---- */

export async function apiGetStations() {
  const res = await apiFetch<BaseStation[]>('/stations')
  return res.data
}

export async function apiGetStation(id: string) {
  const res = await apiFetch<BaseStation>(`/stations/${id}`)
  return res.data
}

export async function apiGetStationMetrics(id: string, from?: string, to?: string) {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const qs = params.toString() ? `?${params.toString()}` : ''
  const res = await apiFetch<Metric[]>(`/stations/${id}/metrics${qs}`)
  return res.data
}

export async function apiGetLatestMetric(id: string) {
  const res = await apiFetch<Metric>(`/stations/${id}/metrics/latest`)
  return res.data
}

/* ---- Alarms ---- */

export async function apiGetAlarms(filters?: {
  severity?: AlarmSeverity
  status?: AlarmStatus
  station?: string
  page?: number
  per_page?: number
}) {
  const params = new URLSearchParams()
  if (filters?.severity) params.set('severity', filters.severity)
  if (filters?.status) params.set('status', filters.status)
  if (filters?.station) params.set('station', filters.station)
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.per_page) params.set('per_page', String(filters.per_page))
  const qs = params.toString() ? `?${params.toString()}` : ''
  const res = await apiFetch<Alarm[]>(`/alarms${qs}`)
  return { data: res.data, meta: res.meta }
}

export async function apiGetMyAlarms() {
  const res = await apiFetch<Alarm[]>('/alarms/assigned')
  return res.data
}


export async function apiAcknowledgeAlarm(id: string) {
  const res = await apiFetch<Alarm>(`/alarms/${id}/acknowledge`, { method: 'PATCH' })
  return res.data
}

export async function apiAssignAlarm(id: string, userId?: number) {
  const res = await apiFetch<Alarm>(`/alarms/${id}/assign`, {
    method: 'PATCH',
    body: JSON.stringify(userId ? { user_id: userId } : {}),
  })
  return res.data
}

export async function apiResolveAlarm(id: string, resolutionNote: string) {
  const res = await apiFetch<Alarm>(`/alarms/${id}/resolve`, {
    method: 'PATCH',
    body: JSON.stringify({ resolution_note: resolutionNote }),
  })
  return res.data
}

/* ---- Users / Engineers ---- */

export async function apiGetUsers() {
  const res = await apiFetch<FieldEngineer[]>('/users')
  return res.data
}

export async function apiCreateUser(data: {
  name: string; email: string; password: string; phone?: string; role?: string
}) {
  const res = await apiFetch<FieldEngineer>('/users', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return res.data
}

export async function apiUpdateUser(id: number, data: Partial<{
  name: string; email: string; phone: string; role: string; active: boolean
}>) {
  const res = await apiFetch<unknown>(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  return res.data
}

export async function apiDeleteUser(id: number) {
  const res = await apiFetch<unknown>(`/users/${id}`, { method: 'DELETE' })
  return res.data
}

/* ---- Summary & Analytics (Admin + Network Manager) ---- */

export async function apiGetSummaryOverview() {
  const res = await apiFetch<SummaryOverview>('/summary/overview')
  return res.data
}

export async function apiGetSummaryTrends(days = 7) {
  const res = await apiFetch<TrendPoint[]>(`/summary/trends?days=${days}`)
  return res.data
}

export async function apiGetSummaryEngineers(month?: number, year?: number) {
  const params = new URLSearchParams()
  if (month) params.set('month', String(month))
  if (year) params.set('year', String(year))
  const qs = params.toString() ? `?${params.toString()}` : ''
  const res = await apiFetch<EngineerAnalytics[]>(`/summary/engineers${qs}`)
  return res.data
}

export async function apiGetSummaryFixedIssues(page = 1, perPage = 20) {
  const res = await apiFetch<FixedIssue[]>(`/summary/fixed-issues?page=${page}&per_page=${perPage}`)
  return { data: res.data, meta: res.meta }
}

export async function apiGetSummaryLocations() {
  const res = await apiFetch<LocationAnalysis[]>('/summary/locations')
  return res.data
}

/* ---- Simulator (proxied to port 3001) ---- */

async function simFetch<T>(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  const res = await fetch(`/api/simulator${path}`, { ...options, headers })
  const data = await res.json() as { success: boolean; message?: string; error?: string; data?: T }
  if (!data.success) throw new Error(data.error || data.message || 'Simulator request failed')
  return data.data as T
}

export async function apiSimulatorStart() {
  return simFetch<{ running: boolean }>('/start', { method: 'POST' })
}

export async function apiSimulatorStop() {
  return simFetch<{ running: boolean }>('/stop', { method: 'POST' })
}

export async function apiSimulatorInjectAnomaly(
  stationCode: string, anomalyType: string, durationSeconds: number
) {
  return simFetch<unknown>('/inject-anomaly', {
    method: 'POST',
    body: JSON.stringify({
      station_code: stationCode,
      anomaly_type: anomalyType,
      duration_seconds: durationSeconds,
    }),
  })
}

export async function apiSimulatorStatus() {
  return simFetch<{ running: boolean; stations_count: number; metrics_sent: number }>('/status')
}

export async function apiLogout(): Promise<void> {
  await apiFetch('/auth/logout', { method: 'POST' })
}


