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
