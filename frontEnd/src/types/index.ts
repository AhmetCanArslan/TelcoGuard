/* ======================================================
   TelcoGuard – Type Definitions
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
  stationId: string;
  timestamp: string;
  cpuUsage: number;
  memoryUsage: number;
  packetLoss: number;
  latency: number;
  rssi: number;
  connectedUsers: number;
}

export type AlarmSeverity = 'WARNING' | 'CRITICAL';
export type AlarmStatus = 'OPEN' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED';

export interface Alarm {
  id: string;
  stationId: string;
  stationCode: string;
  stationName: string;
  metricName: string;
  severity: AlarmSeverity;
  status: AlarmStatus;
  message: string;
  assignedTo?: string;
  resolutionNote?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface DashboardSummary {
  totalStations: number;
  activeStations: number;
  warningStations: number;
  criticalStations: number;
  offlineStations: number;
  openAlarms: number;
  criticalAlarms: number;
  onlineEngineers: number;
  resolvedToday: number;
  inProgressAlarms: number;
}

export interface FieldEngineer {
  id: string;
  name: string;
  status: 'ONLINE' | 'OFFLINE' | 'BUSY';
  latitude: number;
  longitude: number;
  activeAlarms: number;
}

export type AnomalyType = 'CPU_SPIKE' | 'USER_DROP' | 'LATENCY_BURST' | 'PACKET_STORM' | 'STATION_DOWN';
