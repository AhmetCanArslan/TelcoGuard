/* ======================================================
   TelcoGuard – Type Definitions (aligned with backend)
   ====================================================== */

export type StationStatus = 'ACTIVE' | 'WARNING' | 'CRITICAL' | 'OFFLINE';
export type StationType = 'LTE' | 'NR_5G';

export interface BaseStation {
  id: string;
  code: string;
  name: string;
  latitude: number;
  longitude: number;
  region: string;
  type: StationType;
  capacity: number;
  status: StationStatus;
}

export interface Metric {
  id: string;
  station_id: string;
  timestamp: string;
  cpu_usage: number;
  memory_usage: number;
  packet_loss: number;
  latency: number;
  rssi: number;
  connected_users: number;
}

export type AlarmSeverity = 'WARNING' | 'CRITICAL';
export type AlarmStatus = 'OPEN' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED';

export interface Alarm {
  id: string;
  station_id: string;
  station?: BaseStation;
  metric_name: string;
  severity: AlarmSeverity;
  status: AlarmStatus;
  message: string;
  assigned_to?: number;
  assigned_user?: { id: number; name: string; email: string; role: string };
  resolution_note?: string;
  created_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
}

export interface DashboardSummary {
  total_stations: number;
  active_stations: number;
  warning_stations: number;
  critical_stations: number;
  offline_stations: number;
  open_alarms: number;
  critical_alarms: number;
  online_engineers: number;
  resolved_today: number;
  in_progress_alarms: number;
}

export interface FieldEngineer {
  id: number;
  name: string;
  email: string;
  role: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  is_online: boolean;
  active: boolean;
  created_at?: string;
  updated_at?: string;
  last_seen_at?: string;
}

export type AnomalyType = 'CPU_SPIKE' | 'USER_DROP' | 'LATENCY_BURST' | 'PACKET_STORM' | 'STATION_DOWN';

export interface SummaryOverview {
  total_stations: number;
  active_stations: number;
  warning_stations: number;
  critical_stations: number;
  offline_stations: number;
  total_alarms: number;
  open_alarms: number;
  critical_alarms: number;
  resolved_today: number;
  online_engineers: number;
  uptime_percent: number;
  stations_by_region: Record<string, number>;
  alarms_by_severity: Record<string, number>;
  alarms_by_status: Record<string, number>;
  users_by_role: Record<string, number>;
  region_health: RegionHealthItem[];
}

export interface RegionHealthItem {
  region: string;
  total: number;
  active: number;
  warning: number;
  critical: number;
  offline: number;
  health_score: number;
}

export interface TrendPoint {
  date: string;
  alarm_count: number;
  critical: number;
  warning: number;
  avg_cpu: number;
  avg_memory: number;
  avg_latency: number;
  avg_packet_loss: number;
}

export interface EngineerAnalytics {
  user_id: number;
  name: string;
  email: string;
  resolved_count: number;
  critical_count: number;
  avg_resolution_mins: number;
  estimated_hours: number;
  score: number;
}

export interface FixedIssue {
  id: string;
  station_id: string;
  station_code: string;
  station_name: string;
  region: string;
  metric_name: string;
  severity: string;
  message: string;
  resolution_note: string;
  assigned_to?: number;
  engineer_name: string;
  resolution_mins: number;
  created_at: string;
  resolved_at: string;
}

export interface LocationAnalysis {
  region: string;
  station_count: number;
  alarm_count: number;
  alarms_per_station: number;
  health_score: number;
  reliability_score: number;
  fraud_score: number;
  active_count: number;
  warning_count: number;
  critical_count: number;
  offline_count: number;
}

/* ======================================================
   Simulator Types
   ====================================================== */

export interface SimStation {
  id: string;
  code: string;
  name: string;
  lat: number;
  lng: number;
  region: string;
  type: string;
  capacity: number;
  cpu_base: number;
  cpu_noise: number;
  memory_base: number;
  memory_noise: number;
  packet_base: number;
  packet_noise: number;
  latency_base: number;
  latency_noise: number;
  rssi_base: number;
  rssi_noise: number;
  users_base: number;
  users_noise: number;
}

export interface ActiveAnomaly {
  type: AnomalyType;
  remaining_seconds: number;
  duration_sec: number;
  injected_at: string;
  expires_at: string;
}

export interface AnomalyHistoryEntry {
  station_code: string;
  anomaly_type: AnomalyType;
  duration_sec: number;
  injected_at: string;
  expired_at?: string;
}

export interface TickSummary {
  tick_number: number;
  stations_sent: number;
  stations_failed: number;
  tick_duration_ms: number;
  backend_latency_ms: number;
}

export interface SimulatorStatus {
  running: boolean;
  tick_interval_ms: number;
  station_count: number;
  tick_count: number;
  metrics_sent: number;
  metrics_failed: number;
  uptime_seconds: number;
  last_tick_at: string;
  last_tick_duration_ms: number;
  avg_tick_duration_ms: number;
  last_backend_latency_ms: number;
  active_anomalies: Record<string, ActiveAnomaly>;
  anomaly_history: AnomalyHistoryEntry[];
  backend_url: string;
}

export type SimulatorEventType =
  | 'simulator_status'
  | 'tick_complete'
  | 'anomaly_injected'
  | 'anomaly_expired';

export interface SimulatorEvent {
  type: SimulatorEventType;
  timestamp: string;
  payload: SimulatorStatus | TickSummary | AnomalyHistoryEntry;
}
