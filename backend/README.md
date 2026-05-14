# TelcoGuard - Go Fiber Backend

A comprehensive telecom network monitoring and anomaly detection backend built with Go Fiber, WebSocket support, PostgreSQL (GORM ORM), and real-time anomaly detection engines.

## Features

- ✅ **TelcoGuard System**: Multi-layer cellular network monitoring (LTE, 5G)
- ✅ **Anomaly Detection**: 4 detection algorithms (threshold, moving average, z-score, correlation)
- ✅ **Real-time Alarms**: Automatic alarm generation with deduplication (5-min window)
- ✅ **User Management**: Multi-role system (Admin, NOC Operator, Field Engineer, Network Manager)
- ✅ **JWT Authentication**: Secure token-based auth with refresh tokens
- ✅ **OTP Support**: Email/SMS OTP in dev mode (Firebase-ready)
- ✅ **WebSocket Events**: Real-time alarm and status updates
- ✅ **Swagger Docs**: OpenAPI 3.0.3 spec at `/swagger`
- ✅ **Field Engineer Assignment**: Auto-nearest engineer based on haversine distance
- ✅ **Dashboard Analytics**: Real-time stats and region health scores
- ✅ **Comprehensive Tests**: 16+ handler tests + anomaly engine integration tests with real PostgreSQL

## Project Structure

```
backend/
├── auth/                  # JWT & OTP authentication
├── anomaly/              # Detection engines (threshold, moving_avg, zscore, correlator)
├── config/               # Configuration management
├── database/             # PostgreSQL connection
├── handlers/             # HTTP route handlers
├── middleware/           # Auth middleware, error handling
├── models/               # GORM models (User, Station, Alarm, Metric, etc.)
├── repositories/         # Data access layer (5 repos)
├── services/             # Business logic (Alarm, Assignment, Dashboard)
├── testutil/             # Test utilities & DB setup
├── utils/                # Validators, response builders
├── websocket/            # WebSocket hub and events
├── main.go              # Entry point
├── go.mod               # Module definition
├── .env.example         # Environment variables template
└── README.md            # This file
```

## Prerequisites

- Go 1.22.2+
- PostgreSQL 12+
- Docker (for PostgreSQL)
- `GOTOOLCHAIN=local` and `CGO_ENABLED=0` (macOS dyld compatibility)

## Setup

### 1. Start PostgreSQL

```bash
docker run --name case1_db -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:15
# Create test database
docker exec case1_db createdb -U postgres case1_test_db
```

### 2. Install Dependencies

```bash
cd backend
go mod download
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=case1_db
DB_SSLMODE=disable
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
SIMULATOR_SECRET=simulator-secret
SERVER_PORT=3000
SERVER_HOST=0.0.0.0
ENV=development
```

### 4. Run Server

```bash
GOTOOLCHAIN=local CGO_ENABLED=0 go run main.go
```

Server runs on `http://0.0.0.0:3000`

## API Endpoints

### Authentication
- **POST** `/api/v1/auth/register` - Register new user
- **POST** `/api/v1/auth/login` - Login (email + password)
- **POST** `/api/v1/auth/otp/send` - Send OTP (dev mode: console log)
- **POST** `/api/v1/auth/otp/verify` - Verify OTP code

### Stations
- **GET** `/api/v1/stations` - List all stations
- **GET** `/api/v1/stations/:id` - Get station details

### Metrics
- **POST** `/api/v1/stations/:id/metrics` - Ingest metric (simulator endpoint)
- **GET** `/api/v1/stations/:id/metrics` - Query metrics (time range)
- **GET** `/api/v1/stations/:id/metrics/latest` - Get latest metric

### Alarms
- **GET** `/api/v1/alarms` - List alarms (filter: severity, status, station)
- **GET** `/api/v1/alarms/:id` - Get alarm details
- **GET** `/api/v1/alarms/assigned` - Get my assigned alarms (Field Engineer)
- **PATCH** `/api/v1/alarms/:id/acknowledge` - Acknowledge alarm
- **PATCH** `/api/v1/alarms/:id/assign` - Assign to engineer (auto-nearest if no user_id)
- **PATCH** `/api/v1/alarms/:id/resolve` - Resolve with note

### Dashboard
- **GET** `/api/v1/dashboard/summary` - Real-time stats (stations, alarms, engineers)
- **GET** `/api/v1/dashboard/region-health` - Region health scores

### Users
- **GET** `/api/v1/users` - List users
- **GET** `/api/v1/users/:id` - Get user
- **PUT** `/api/v1/users/:id` - Update user (name, phone, location)
- **DELETE** `/api/v1/users/:id` - Delete user
- **PATCH** `/api/v1/users/password` - Change password

### Documentation
- **GET** `/swagger` - Swagger UI
- **GET** `/swagger.json` - OpenAPI spec

## Testing

### Run All Tests
```bash
cd backend
GOTOOLCHAIN=local CGO_ENABLED=0 go test -p 1 ./...
```

**Note**: Use `-p 1` to run package tests sequentially (all packages share single `case1_test_db`).

### Run Specific Package Tests
```bash
# Handlers
go test -v ./handlers/

# Anomaly engine
go test -v ./anomaly/

# Services
go test -v ./services/

# Repositories
go test -v ./repositories/
```

### Test Coverage

**Handler Tests** (`handlers/*_test.go`):
- Auth (register, login, OTP send/verify) — `auth_test.go`
- Health check — `health_test.go`
- Stations (list, get) — `station_test.go`
- **Alarms** (list, get, acknowledge, assign, resolve) — `alarm_test.go` ⭐ NEW
- **Metrics** (ingest, get time range, latest) — `metric_test.go` ⭐ NEW
- **Dashboard & Users** (summary, list/get/update/delete users, password) — `dashboard_test.go` ⭐ NEW

**Service Tests** (`services/*_test.go`):
- Alarm service (create/update, acknowledge, assign, resolve)
- Assignment service (nearest engineer)
- Dashboard service (summaries, region health)

**Repository Tests** (`repositories/*_test.go`):
- User, Station, Metric, Alarm, Threshold repositories

**Anomaly Engine Tests** (`anomaly/*_test.go`):
- **Correlator** (multi-metric escalation, multi-station isolation)
- **ThresholdDetector** integration (CPU, memory, RSSI, connected users) — `engine_test.go` ⭐ NEW
- **MovingAvgDetector** integration (variance detection with real DB) — `engine_test.go` ⭐ NEW
- **ZScoreDetector** integration (statistical outliers with real DB) — `engine_test.go` ⭐ NEW
- **Engine.Process** end-to-end (alarm creation, status updates)

**Utility Tests** (`utils/*_test.go`):
- DefaultInt (handles "0" vs parse failures)

### Test Database

Tests use dedicated PostgreSQL database `case1_test_db`:
- Auto-migrated schemas
- `TRUNCATE ... CASCADE` between tests for clean isolation
- Threshold configs seeded per test
- No test data persistence

### Example Test Run

```bash
$ GOTOOLCHAIN=local CGO_ENABLED=0 go test -v ./anomaly
=== RUN   TestThresholdDetectorIntegration
    === RUN   TestThresholdDetectorIntegration/cpu_usage_critical_above_threshold
    === RUN   TestThresholdDetectorIntegration/cpu_usage_warning_above_threshold
    === RUN   TestThresholdDetectorIntegration/rssi_critical_below_threshold
    === RUN   TestThresholdDetectorIntegration/no_threshold_breach
    === RUN   TestThresholdDetectorIntegration/connected_users_high_critical
    === RUN   TestThresholdDetectorIntegration/connected_users_low_warning
--- PASS: TestThresholdDetectorIntegration (0.23s)
ok  case1/anomaly  0.230s
```

## Key Implementation Details

### Models
- **User**: Multi-role (Admin, NOC_OPERATOR, FIELD_ENGINEER, NETWORK_MANAGER)
- **BaseStation**: LTE/5G with geo-location (lat/lng), 4 statuses (ACTIVE, WARNING, CRITICAL, OFFLINE)
- **Metric**: 6 KPIs per station (CPU, memory, packet loss, latency, RSSI, connected users)
- **Alarm**: 4-state lifecycle (OPEN → ACKNOWLEDGED → IN_PROGRESS → RESOLVED), 2 severities (WARNING, CRITICAL)
- **ThresholdConfig**: Configurable thresholds per metric with direction (ABOVE/BELOW)

### Anomaly Detection Pipeline
1. **Threshold Detection** — Compare metric against configured thresholds
2. **Moving Average Detection** — Compare against sliding window mean (10-sample window)
3. **Z-Score Detection** — Detect outliers (z > 3 critical, z > 2 warning, 20-sample history)
4. **Correlation** — Escalate if 2+ metrics triggered on same station
5. **Alarm Deduplication** — Update existing alarm within 5-min window
6. **Status Update** — Station status changes based on max alarm severity

### Authentication
- JWT tokens with 15-min expiry
- Refresh tokens with 7-day expiry
- OTP in dev mode (code logged to console)
- Role-based access control via middleware

## Build for Production

```bash
GOTOOLCHAIN=local CGO_ENABLED=0 go build -o case1-backend
./case1-backend
```

## Recent Fixes

- **User.UpdateUser()**: Changed `fiber.Map` to `map[string]interface{}` (GORM compatibility)
- **DefaultInt()**: Fixed "0" string handling using `fmt.Sscanf` error check
- **ValidateOTP()**: Fixed attempts counter by separating hash validation from increment
- **FindNearestEngineer()**: Requires engineer `IsOnline: true` flag
- **Test Isolation**: All package tests share single `case1_test_db`, run with `-p 1`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| DB_HOST | PostgreSQL host | localhost |
| DB_PORT | PostgreSQL port | 5432 |
| DB_USER | DB user | postgres |
| DB_PASSWORD | DB password | password |
| DB_NAME | Production DB name | case1_db |
| DB_SSLMODE | SSL mode | disable |
| JWT_SECRET | Access token secret | - |
| JWT_REFRESH_SECRET | Refresh token secret | - |
| SIMULATOR_SECRET | Simulator auth secret | - |
| SERVER_PORT | API server port | 3000 |
| SERVER_HOST | Bind address | 0.0.0.0 |
| ENV | Environment mode | development |

## WebSocket Events

Real-time updates via `/ws` endpoint (Bearer token auth):
```json
{
  "type": "alarm_created",
  "data": { "alarm_id": "...", "severity": "CRITICAL", "message": "..." }
}
```

## Next Steps

1. **Frontend**: Build React dashboard consuming API + WebSocket
2. **Simulator**: Implement independent metric generator service (separate `go run` process)
3. **Scaling**: Deploy multiple backend instances with shared PostgreSQL
4. **Analytics**: Add time-series DB (InfluxDB) for metric history
5. **Notifications**: Integrate SMS provider for critical alarms
6. **Compliance**: Add audit logs, encryption at rest

## License

Proprietary - TelcoGuard System

## Support

For issues or questions, contact the development team.
