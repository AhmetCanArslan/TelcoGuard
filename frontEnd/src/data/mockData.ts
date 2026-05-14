/* ======================================================
   TelcoGuard – Mock Seed Data
   15+ Istanbul Base Stations with realistic coordinates
   ====================================================== */

import type { BaseStation, Alarm, Metric, DashboardSummary, FieldEngineer } from '../types';

export const mockStations: BaseStation[] = [
  { id: '1',  code: 'BSC-001', name: 'Levent-K1',       latitude: 41.0821, longitude: 29.0107, region: 'Marmara', type: 'NR_5G', capacity: 1000, status: 'ACTIVE' },
  { id: '2',  code: 'BSC-002', name: 'Kadıköy-M3',      latitude: 40.9927, longitude: 29.0260, region: 'Marmara', type: 'LTE',   capacity: 800,  status: 'ACTIVE' },
  { id: '3',  code: 'BSC-003', name: 'Taksim-A2',        latitude: 41.0370, longitude: 28.9850, region: 'Marmara', type: 'NR_5G', capacity: 1200, status: 'WARNING' },
  { id: '4',  code: 'BSC-004', name: 'Beşiktaş-B1',      latitude: 41.0430, longitude: 29.0050, region: 'Marmara', type: 'LTE',   capacity: 900,  status: 'CRITICAL' },
  { id: '5',  code: 'BSC-005', name: 'Üsküdar-N4',       latitude: 41.0230, longitude: 29.0160, region: 'Marmara', type: 'NR_5G', capacity: 1100, status: 'ACTIVE' },
  { id: '6',  code: 'BSC-006', name: 'Şişli-C2',         latitude: 41.0608, longitude: 28.9870, region: 'Marmara', type: 'LTE',   capacity: 750,  status: 'ACTIVE' },
  { id: '7',  code: 'BSC-007', name: 'Beyoğlu-D1',       latitude: 41.0370, longitude: 28.9770, region: 'Marmara', type: 'NR_5G', capacity: 950,  status: 'ACTIVE' },
  { id: '8',  code: 'BSC-008', name: 'Ataşehir-E3',      latitude: 40.9833, longitude: 29.1168, region: 'Marmara', type: 'LTE',   capacity: 850,  status: 'WARNING' },
  { id: '9',  code: 'BSC-009', name: 'Bakırköy-F2',      latitude: 40.9800, longitude: 28.8770, region: 'Marmara', type: 'NR_5G', capacity: 1000, status: 'ACTIVE' },
  { id: '10', code: 'BSC-010', name: 'Maltepe-G4',       latitude: 40.9340, longitude: 29.1300, region: 'Marmara', type: 'LTE',   capacity: 700,  status: 'OFFLINE' },
  { id: '11', code: 'BSC-011', name: 'Sarıyer-H1',       latitude: 41.1667, longitude: 29.0500, region: 'Marmara', type: 'NR_5G', capacity: 600,  status: 'ACTIVE' },
  { id: '12', code: 'BSC-012', name: 'Fatih-J2',         latitude: 41.0186, longitude: 28.9400, region: 'Marmara', type: 'LTE',   capacity: 1050, status: 'ACTIVE' },
  { id: '13', code: 'BSC-013', name: 'Kartal-L1',        latitude: 40.8890, longitude: 29.1880, region: 'Marmara', type: 'NR_5G', capacity: 800,  status: 'ACTIVE' },
  { id: '14', code: 'BSC-014', name: 'Beylikdüzü-P3',    latitude: 41.0020, longitude: 28.6410, region: 'Marmara', type: 'LTE',   capacity: 950,  status: 'WARNING' },
  { id: '15', code: 'BSC-015', name: 'Pendik-R2',        latitude: 40.8800, longitude: 29.2338, region: 'Marmara', type: 'NR_5G', capacity: 1100, status: 'ACTIVE' },
  { id: '16', code: 'BSC-016', name: 'Çekmeköy-S1',      latitude: 41.0330, longitude: 29.1800, region: 'Marmara', type: 'LTE',   capacity: 650,  status: 'ACTIVE' },
];

/* ---- Generate mock time-series metrics ---- */
function generateMetricSeries(stationId: string, count: number): Metric[] {
  const now = Date.now();
  const metrics: Metric[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const ts = new Date(now - i * 5000).toISOString();
    metrics.push({
      id: `${stationId}-m-${i}`,
      stationId,
      timestamp: ts,
      cpuUsage:       +(35 + (Math.random() - 0.5) * 30).toFixed(1),
      memoryUsage:    +(45 + (Math.random() - 0.5) * 30).toFixed(1),
      packetLoss:     +(1 + (Math.random() - 0.5) * 2).toFixed(2),
      latency:        +(18 + (Math.random() - 0.5) * 20).toFixed(1),
      rssi:           +(-50 + (Math.random() - 0.5) * 30).toFixed(1),
      connectedUsers: Math.floor(250 + (Math.random() - 0.5) * 300),
    });
  }
  return metrics;
}

export const mockMetrics: Record<string, Metric[]> = {};
mockStations.forEach(s => {
  mockMetrics[s.id] = generateMetricSeries(s.id, 60); // 5 minutes of data at 5s intervals
});

/* ---- Mock alarms ---- */
export const mockAlarms: Alarm[] = [
  {
    id: 'a1', stationId: '4', stationCode: 'BSC-004', stationName: 'Beşiktaş-B1',
    metricName: 'cpu_usage', severity: 'CRITICAL', status: 'OPEN',
    message: 'CPU kullanımı %96 — Kritik eşik aşıldı',
    createdAt: new Date(Date.now() - 120000).toISOString(),
  },
  {
    id: 'a2', stationId: '3', stationCode: 'BSC-003', stationName: 'Taksim-A2',
    metricName: 'latency', severity: 'WARNING', status: 'ACKNOWLEDGED',
    message: 'Gecikme 85ms — Uyarı eşiği aşıldı',
    assignedTo: 'Ahmet Yılmaz',
    createdAt: new Date(Date.now() - 300000).toISOString(),
  },
  {
    id: 'a3', stationId: '10', stationCode: 'BSC-010', stationName: 'Maltepe-G4',
    metricName: 'station_offline', severity: 'CRITICAL', status: 'IN_PROGRESS',
    message: 'İstasyon çevrimdışı — Tüm metrikler 0',
    assignedTo: 'Mehmet Kaya',
    createdAt: new Date(Date.now() - 600000).toISOString(),
  },
  {
    id: 'a4', stationId: '8', stationCode: 'BSC-008', stationName: 'Ataşehir-E3',
    metricName: 'packet_loss', severity: 'WARNING', status: 'OPEN',
    message: 'Paket kaybı %7.2 — Uyarı eşiği aşıldı',
    createdAt: new Date(Date.now() - 180000).toISOString(),
  },
  {
    id: 'a5', stationId: '14', stationCode: 'BSC-014', stationName: 'Beylikdüzü-P3',
    metricName: 'memory_usage', severity: 'WARNING', status: 'OPEN',
    message: 'Bellek kullanımı %83 — Uyarı eşiği aşıldı',
    createdAt: new Date(Date.now() - 90000).toISOString(),
  },
  {
    id: 'a6', stationId: '4', stationCode: 'BSC-004', stationName: 'Beşiktaş-B1',
    metricName: 'connected_users', severity: 'CRITICAL', status: 'OPEN',
    message: 'Bağlı kullanıcı 960 — Kritik kapasite aşımı',
    createdAt: new Date(Date.now() - 60000).toISOString(),
  },
  {
    id: 'a7', stationId: '12', stationCode: 'BSC-012', stationName: 'Fatih-J2',
    metricName: 'latency', severity: 'WARNING', status: 'RESOLVED',
    message: 'Gecikme 55ms — Uyarı eşiği aşıldı',
    assignedTo: 'Ayşe Demir',
    resolutionNote: 'Bağlantı yeniden yapılandırıldı',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    resolvedAt: new Date(Date.now() - 600000).toISOString(),
  },
];

/* ---- Dashboard summary ---- */
export const mockSummary: DashboardSummary = {
  totalStations: mockStations.length,
  activeStations:   mockStations.filter(s => s.status === 'ACTIVE').length,
  warningStations:  mockStations.filter(s => s.status === 'WARNING').length,
  criticalStations: mockStations.filter(s => s.status === 'CRITICAL').length,
  offlineStations:  mockStations.filter(s => s.status === 'OFFLINE').length,
  openAlarms:       mockAlarms.filter(a => a.status === 'OPEN').length,
  criticalAlarms:   mockAlarms.filter(a => a.severity === 'CRITICAL').length,
  onlineEngineers:  3,
  resolvedToday:    1,
  inProgressAlarms: mockAlarms.filter(a => a.status === 'IN_PROGRESS').length,
};

/* ---- Field Engineers ---- */
export const mockEngineers: FieldEngineer[] = [
  { id: 'e1', name: 'Ahmet Yılmaz',  status: 'ONLINE',  latitude: 41.0450, longitude: 29.0090, activeAlarms: 1 },
  { id: 'e2', name: 'Mehmet Kaya',    status: 'BUSY',    latitude: 40.9350, longitude: 29.1280, activeAlarms: 1 },
  { id: 'e3', name: 'Ayşe Demir',     status: 'ONLINE',  latitude: 41.0200, longitude: 28.9500, activeAlarms: 0 },
  { id: 'e4', name: 'Fatma Öztürk',   status: 'OFFLINE', latitude: 40.9900, longitude: 29.0300, activeAlarms: 0 },
];
