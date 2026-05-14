# Seed Data

This folder contains seed data for the TelcoGuard project.

## Files

### `base_stations.sql`
SQL INSERT statements for seeding the database with base stations and threshold configurations.

**Includes:**
- 20 base stations across multiple regions (Marmara, Ege, İç Anadolu)
- Istanbul-focused with realistic GPS coordinates
- Mix of LTE and NR_5G types
- Realistic capacity values (650-1200 users)
- All stations start in ACTIVE status
- Threshold configurations for all metrics:
  - CPU Usage: 75% warning, 90% critical
  - Memory Usage: 80% warning, 95% critical
  - Packet Loss: 5% warning, 10% critical
  - Latency: 50ms warning, 100ms critical
  - RSSI: -80dBm warning, -90dBm critical
  - Connected Users: High (800 warning, 950 critical), Low (10 warning, 0 critical)

### `base_stations.json`
JSON format of the same seed data. Useful for:
- Reference documentation
- Parsing in application code
- Creating data via API endpoints

## Usage

### Option 1: Direct SQL Execution
```bash
psql -U username -d database_name -f seedata/base_stations.sql
```

### Option 2: Via Go Migration
Include these statements in your database migration files.

### Option 3: Via API
Parse the JSON file and POST to `/api/v1/stations` endpoint during initialization.

## Base Station Distribution

| Region | Count | Types |
|--------|-------|-------|
| Marmara | 15 | 8x LTE, 7x NR_5G |
| Ege | 3 | 2x LTE, 1x NR_5G |
| İç Anadolu | 2 | 1x LTE, 1x NR_5G |
| **Total** | **20** | **11x LTE, 9x NR_5G** |

## Coordinates

All coordinates are realistic GPS coordinates for actual Istanbul, İzmir, and Ankara locations, suitable for mapping visualization.
