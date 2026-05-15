# TelcoGuard

TelcoGuard is a **telecom network monitoring platform** with real-time base station telemetry, multi-engine anomaly detection, alarm management, and field engineer dispatch. Built with **Go Fiber** (backend), **React + TypeScript** (frontend), **PostgreSQL** (database), and a **Go network simulator** for realistic traffic generation.

---

## Architecture

```
┌────────────┐     POST /api/v1/stations/:id/metrics     ┌──────────┐
│  Simulator │ ──────────────────────────────────────────► │  Backend │
│  (Go, :3001)│     (shared-secret auth)                   │  (Go, :3000) │
│            │ ◄────────────────────────────────────────── │          │
│  20 base   │     GET /api/simulator/* (proxy)            │  Fiber   │
│  stations  │                                            │  + GORM  │
│  6 metrics │                                            │          │
│  per tick  │                                            │  JWT     │
│  3s interval│                                           │  + OTP   │
└─────┬──────┘                                            │  Auth    │
      │SSE stream                                         │          │
      │GET /api/v1/simulator/stream                       │  4x      │
      │                                                   │ Anomaly  │
      │                   ┌──────────────────┐            │ Detectors│
      │                   │   PostgreSQL 16   │ ◄─────── │          │
      │                   │                  │ AutoMigrate│ WebSocket│
      │                   │ 6 tables         │            │ Hub      │
      │                   └──────────────────┘            └────┬─────┘
      │                                                       │
      │                                                       │ WS /ws
      │                                                       │
      │                                              ┌────────▼──────┐
      │                                              │   Frontend     │
      └──────────────────────────────────────────────┤  (React + Vite)│
                                                     │ :5173          │
                                                     │ Dashboard      │
                                                     │ Alarms         │
                                                     │ Station Detail │
                                                     │ Sim Control    │
                                                     └────────────────┘
```

### Services

| Service | Port | Description |
|---------|------|-------------|
| **PostgreSQL** | 5432 | Database |
| **Backend** | 3000 | REST API + WebSocket |
| **Simulator** | 3001 | Telemetry generator |
| **Frontend** | 5173 | React SPA |

---

## Database Schema

6 tables managed by GORM AutoMigrate.

### `users`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uint` | PK, auto-increment | |
| `name` | `varchar(100)` | NOT NULL | |
| `email` | `varchar(100)` | UNIQUE, NOT NULL, INDEX | Login identifier |
| `password` | `varchar(255)` | NOT NULL | bcrypt hashed, JSON excluded |
| `phone` | `varchar(20)` | INDEX | |
| `role` | `varchar(30)` | DEFAULT `'NOC_OPERATOR'` | ADMIN, NOC_OPERATOR, FIELD_ENGINEER, NETWORK_MANAGER |
| `latitude` | `decimal(10,8)` | NULLABLE | Field engineer location |
| `longitude` | `decimal(11,8)` | NULLABLE | Field engineer location |
| `is_online` | `boolean` | DEFAULT `false` | Presence tracking |
| `last_seen_at` | `timestamp` | NULLABLE | |
| `active` | `boolean` | DEFAULT `true` | Soft-disable account |
| `created_at` | `timestamp` | NOT NULL | |
| `updated_at` | `timestamp` | NOT NULL | |
| `deleted_at` | `timestamp` | INDEX | GORM soft delete |

**Seed users** (created on startup if not exist):

| Name | Email | Password | Role |
|------|-------|----------|------|
| Admin User | admin@turkcell.com | admin | ADMIN |
| NOC Operator | noc@turkcell.com | noc | NOC_OPERATOR |
| Field Engineer | saha@turkcell.com | saha | FIELD_ENGINEER |
| Network Manager | sebeke@turkcell.com | sebeke | NETWORK_MANAGER |

### `base_stations`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK, `gen_random_uuid()` | |
| `code` | `varchar(20)` | UNIQUE, NOT NULL | e.g. `BSC-001` |
| `name` | `varchar(200)` | NOT NULL | |
| `latitude` | `decimal(10,8)` | NOT NULL | |
| `longitude` | `decimal(11,8)` | NOT NULL | |
| `region` | `varchar(50)` | NOT NULL, INDEX | Marmara, Ege, İç Anadolu |
| `type` | `varchar(10)` | NOT NULL | `LTE` or `NR_5G` |
| `capacity` | `int` | NOT NULL | Max connected users |
| `status` | `varchar(20)` | DEFAULT `'ACTIVE'`, INDEX | ACTIVE, WARNING, CRITICAL, OFFLINE |
| `created_at` | `timestamp` | NOT NULL | |
| `updated_at` | `timestamp` | NOT NULL | |

**Seed**: 20 stations across 3 regions, 11 LTE + 9 NR_5G.

### `metrics`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK, `gen_random_uuid()` | |
| `station_id` | `uuid` | NOT NULL, INDEX (composite `idx_metrics_station_timestamp`) | FK to base_stations |
| `timestamp` | `time` | NOT NULL | Part of composite index |
| `cpu_usage` | `decimal(5,2)` | NOT NULL | 0.00–100.00 |
| `memory_usage` | `decimal(5,2)` | NOT NULL | 0.00–100.00 |
| `packet_loss` | `decimal(5,2)` | NOT NULL | 0.00–100.00 |
| `latency` | `decimal(8,2)` | NOT NULL | ms |
| `rssi` | `decimal(6,2)` | NOT NULL | dBm |
| `connected_users` | `int` | NOT NULL | |

### `alarms`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK, `gen_random_uuid()` | |
| `station_id` | `uuid` | NOT NULL, INDEX | FK to base_stations |
| `metric_name` | `varchar(50)` | NOT NULL | cpu_usage, memory_usage, packet_loss, latency, rssi, connected_users |
| `severity` | `varchar(20)` | NOT NULL, INDEX | `WARNING`, `CRITICAL` |
| `status` | `varchar(20)` | DEFAULT `'OPEN'`, INDEX | OPEN, ACKNOWLEDGED, IN_PROGRESS, RESOLVED |
| `message` | `text` | NOT NULL | Human-readable description |
| `assigned_to` | `uint` | NULLABLE, INDEX | FK to users |
| `resolution_note` | `text` | NULLABLE | |
| `acknowledged_at` | `timestamp` | NULLABLE | |
| `resolved_at` | `timestamp` | NULLABLE | |
| `created_at` | `timestamp` | NOT NULL | |
| `updated_at` | `timestamp` | NOT NULL | |

### `threshold_configs`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uint` | PK, auto-increment | |
| `metric_name` | `varchar(50)` | UNIQUE, NOT NULL | |
| `warning_threshold` | `decimal(10,2)` | NOT NULL | |
| `critical_threshold` | `decimal(10,2)` | NOT NULL | |
| `direction` | `varchar(10)` | NOT NULL | `ABOVE` or `BELOW` |
| `is_active` | `boolean` | DEFAULT `true` | |
| `created_at` | `timestamp` | NOT NULL | |
| `updated_at` | `timestamp` | NOT NULL | |

**Default thresholds** (seeded on startup):

| Metric | Warning | Critical | Direction |
|--------|---------|----------|-----------|
| `cpu_usage` | ≥ 75 | ≥ 90 | ABOVE |
| `memory_usage` | ≥ 80 | ≥ 95 | ABOVE |
| `packet_loss` | ≥ 5 | ≥ 10 | ABOVE |
| `latency` | ≥ 50 | ≥ 100 | ABOVE |
| `rssi` | ≤ -80 | ≤ -90 | BELOW |

### `otp_codes`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uint` | PK, auto-increment | |
| `contact` | `varchar(150)` | NOT NULL, INDEX | Email or phone |
| `method` | `varchar(10)` | NOT NULL | `email` or `sms` |
| `code_hash` | `varchar(64)` | NOT NULL | SHA-256 hashed, JSON excluded |
| `expires_at` | `timestamp` | NOT NULL, INDEX | |
| `attempts` | `int` | DEFAULT `0` | |
| `used` | `boolean` | DEFAULT `false` | |
| `created_at` | `timestamp` | NOT NULL | |
| `updated_at` | `timestamp` | NOT NULL | |

---

## API Endpoints

### Public

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/swagger` | Swagger UI |
| `POST` | `/api/v1/auth/register` | Register new user |
| `POST` | `/api/v1/auth/login` | Login (email + password → JWT + refresh token) |
| `POST` | `/api/v1/auth/otp/send` | Send OTP code (email or SMS) |
| `POST` | `/api/v1/auth/otp/verify` | Verify OTP → JWT |
| `POST` | `/api/v1/auth/refresh` | Refresh access token |
| `POST` | `/api/v1/auth/reset-password` | OTP-based password reset |
| `POST` | `/api/v1/auth/send-reset-email` | Firebase password reset email |

### Simulator Ingestion (shared-secret auth)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/stations/:id/metrics` | Ingest telemetry → triggers anomaly engine |

### Protected — User

| Method | Path | Roles |
|--------|------|-------|
| `GET` | `/api/v1/me` | Any auth |
| `POST` | `/api/v1/me/password` | Any auth |
| `POST` | `/api/v1/auth/logout` | Any auth |
| `GET` | `/api/v1/users` | ADMIN, NOC_OPERATOR |
| `GET` | `/api/v1/users/:id` | ADMIN, NOC_OPERATOR |
| `POST` | `/api/v1/users` | ADMIN |
| `PUT` | `/api/v1/users/:id` | ADMIN |
| `DELETE` | `/api/v1/users/:id` | ADMIN |

### Protected — Stations

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/stations` | List all stations |
| `GET` | `/api/v1/stations/:id` | Get station detail |
| `GET` | `/api/v1/stations/:id/metrics` | Get metrics (query: `from`, `to` RFC3339) |
| `GET` | `/api/v1/stations/:id/metrics/latest` | Get latest metric |
| `PATCH` | `/api/v1/stations/:id/status` | Update station status |

### Protected — Alarms

| Method | Path | Roles |
|--------|------|-------|
| `GET` | `/api/v1/alarms` | ADMIN, NOC_OPERATOR |
| `GET` | `/api/v1/alarms/assigned` | ADMIN, NOC_OPERATOR, FIELD_ENGINEER |
| `GET` | `/api/v1/alarms/:id` | ADMIN, NOC_OPERATOR, FIELD_ENGINEER |
| `PATCH` | `/api/v1/alarms/:id/acknowledge` | ADMIN, NOC_OPERATOR |
| `PATCH` | `/api/v1/alarms/:id/assign` | ADMIN, NOC_OPERATOR |
| `PATCH` | `/api/v1/alarms/:id/resolve` | ADMIN, FIELD_ENGINEER |
| `POST` | `/api/v1/alarms/reset` | ADMIN, NOC_OPERATOR |

### Protected — Dashboard & Summary

| Method | Path | Roles |
|--------|------|-------|
| `GET` | `/api/v1/dashboard/summary` | Any auth |
| `GET` | `/api/v1/summary/overview` | ADMIN, NETWORK_MANAGER |
| `GET` | `/api/v1/summary/trends` | ADMIN, NETWORK_MANAGER (?days) |
| `GET` | `/api/v1/summary/engineers` | ADMIN, NETWORK_MANAGER (?month, ?year) |
| `GET` | `/api/v1/summary/fixed-issues` | ADMIN, NETWORK_MANAGER (?page, ?per_page) |
| `GET` | `/api/v1/summary/locations` | ADMIN, NETWORK_MANAGER |

### Simulator Proxy

| Method | Path | Description |
|--------|------|-------------|
| `ALL` | `/api/simulator/*` | Proxied to simulator |

### WebSocket

| Path | Description |
|------|-------------|
| `GET` | `/ws?token=<JWT>` | Real-time events |

---

## Anomaly Detection Pipeline

The anomaly engine runs synchronously on every metric ingestion and as a periodic background goroutine.

```
Metric Ingestion
      │
      ▼
┌─────────────────┐
│ ThresholdDetector│── Compares 6 metrics vs threshold_configs
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ MovingAvgDetector│── 10-sample rolling window, flags >2σ (WARNING) >3σ (CRITICAL)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  ZScoreDetector  │── 20-sample history, z>2 WARNING, z>3 CRITICAL
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Correlator    │── If 2+ metrics triggered on same station → escalate all to CRITICAL
└────────┬────────┘
         │
         ▼
   Create/Update Alarms
         │
         ▼
   Update Station Status
         │
         ▼
   Broadcast via WebSocket
```

### Anomaly States

1. **No alarm** — metrics within all thresholds
2. **WARNING** — any detector fires warning-level
3. **CRITICAL** — any detector fires critical-level or correlator escalates
4. **Escalation** — correlator promotes WARNING → CRITICAL when 2+ metrics violate on the same station

---

## WebSocket Events

| Event | Trigger | Payload |
|-------|---------|---------|
| `metric_update` | New metric ingested | station_id, timestamp, all 6 metrics |
| `station_status` | Station status changed | station_id, old_status, new_status |
| `new_alarm` | New alarm created | Full alarm object |
| `alarm_update` | Alarm acknowledged/assigned/resolved | Updated alarm object |
| `dashboard_snapshot` | Periodic (configurable) | Station counts, open alarm counts, etc. |
| `user_status` | Field engineer online/offline | user_id, is_online |

---

## Frontend Routes

| Route | Page | Roles |
|-------|------|-------|
| `/login` | Login | Public |
| `/forgot-password` | Forgot Password | Public |
| `/` | Dashboard | All authenticated |
| `/stations/:id` | Station Detail | All authenticated |
| `/alarms` | Alarms | ADMIN, NOC_OPERATOR, FIELD_ENGINEER |
| `/engineers` | Engineers | ADMIN, NOC_OPERATOR |
| `/reports` | Reports | ADMIN, NOC_OPERATOR |
| `/metrics` | Metrics | ADMIN, NOC_OPERATOR |
| `/summary` | Summary | ADMIN, NETWORK_MANAGER |
| `/simulator` | Simulator Control | ADMIN |
| `/users` | Users | ADMIN |

---

## Simulator

The Go-based simulator generates realistic metric data for 20 base stations.

### Simulator Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/simulator/config` | Get current config |
| `GET` | `/api/v1/simulator/stations` | List simulated stations |
| `GET` | `/api/v1/simulator/stream` | SSE stream of metrics |
| `POST` | `/api/v1/simulator/start` | Start simulation |
| `POST` | `/api/v1/simulator/stop` | Stop simulation |
| `POST` | `/api/v1/simulator/reset` | Reset all stations |
| `POST` | `/api/v1/simulator/inject-anomaly` | Inject anomaly (type: spike, drift, outage, noise, degradation) |
| `GET` | `/api/v1/simulator/status` | Running/paused state |
| `PATCH` | `/api/v1/simulator/interval` | Change tick interval |

### Anomaly Types (injectable)

| Type | Description |
|------|-------------|
| `spike` | Sudden metric spike on a station |
| `drift` | Gradual metric drift over time |
| `outage` | Complete metric failure |
| `noise` | High-frequency noise injection |
| `degradation` | Progressive performance degradation |

### Default Configuration

| Parameter | Value |
|-----------|-------|
| Tick interval | 3000ms |
| Stations | 20 |
| Backend URL | `http://localhost:3000` |
| Metrics per tick | cpu_usage, memory_usage, packet_loss, latency, rssi, connected_users |

---

## Running with Docker Compose

### Prerequisites

- Docker & Docker Compose
- Firebase credentials file at `.config/case1turkcell-firebase-adminsdk-fbsvc-1f7cd7e6ad.json` (optional — dev mode works without it)

### Quick Start

```bash
docker-compose up --build
```

This starts all 4 services:

1. **PostgreSQL** — database with health check
2. **Backend** — API server (waits for DB healthy)
3. **Simulator** — metric generator (starts automatically)
4. **Frontend** — React dev server with hot-reload

### Access the App

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| Swagger UI | http://localhost:3000/swagger |
| Simulator | http://localhost:3001 |

### Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@turkcell.com | admin |
| NOC Operator | noc@turkcell.com | noc |
| Field Engineer | saha@turkcell.com | saha |
| Network Manager | sebeke@turkcell.com | sebeke |

### Environment Variables

**Backend** (`backend/.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USER` | `postgres` | DB user |
| `DB_PASSWORD` | `password` | DB password |
| `DB_NAME` | `case1_db` | DB name |
| `SERVER_PORT` | `3000` | API port |
| `JWT_SECRET` | (required) | JWT signing key |
| `JWT_REFRESH_SECRET` | (required) | Refresh token key |
| `SIMULATOR_SECRET` | (required) | Shared secret for simulator auth |
| `FIREBASE_CREDENTIALS_PATH` | (optional) | Path to Firebase service account JSON |
| `DEFAULT_ADMIN_EMAIL` | `admin@turkcell.com` | Seed admin email |
| `DEFAULT_ADMIN_PASSWORD` | `admin` | Seed admin password |

**Simulator** (`simulator/.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Simulator port |
| `BACKEND_URL` | `http://localhost:3000` | Backend to push metrics |
| `SIMULATOR_SECRET` | (required) | Must match backend |
| `TICK_INTERVAL_MS` | `3000` | Metric generation interval |

**Frontend** (via `vite.config.ts` proxy):

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKEND_URL` | `http://backend:3000` | API proxy target |
| `SIMULATOR_URL` | `http://simulator:3001` | Simulator proxy target |
| `WS_URL` | `ws://backend:3000` | WebSocket URL |

---

## Data Flow (End-to-End)

```
1. Simulator starts, generates metrics every 3s for 20 stations
       │
2. POST /api/v1/stations/:id/metrics (shared-secret auth)
       │
3. Backend ingests metric → stores in `metrics` table
       │
4. Anomaly Engine runs 4 detectors:
   ├── ThresholdDetector (config-based)
   ├── MovingAvgDetector (10-window σ)
   ├── ZScoreDetector (20-window z-score)
   └── Correlator (multi-metric escalation)
       │
5. If anomaly detected → creates/updates alarm in `alarms` table
       │
6. Station status updated (ACTIVE → WARNING → CRITICAL)
       │
7. WebSocket broadcast to all connected clients
       │
8. Frontend Dashboard/Alarms pages update in real-time
       │
9. NOC operator acknowledges alarm
       │
10. Nearest field engineer auto-assigned (Haversine)
       │
11. Engineer resolves on-site → resolution note recorded
```

---

## Engineer Dispatch Algorithm

When an alarm requires assignment, the system finds the nearest available field engineer using the **Haversine formula**:

```
distance = 2 * R * arcsin(√(sin²(Δlat/2) + cos(lat1)·cos(lat2)·sin²(Δlon/2)))
```

where R = 6371 km (Earth's radius). The algorithm:
1. Filters engineers who are online
2. Calculates distance from each engineer's location to the alarming station
3. Returns the closest match
