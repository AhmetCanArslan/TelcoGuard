#!/usr/bin/env python3
"""Fetch Turkcell cell-tower seed data from the public OpenCellID map endpoint.

The public site exposes GeoJSON through ``ajax/getCells.php?bbox=...``. We query
small Turkish bounding boxes, keep MCC 286 + net 1 rows, and convert the result
to the seed-data format used by this workspace.
"""

from __future__ import annotations

import argparse
import json
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Sequence, Set, Tuple


OPENCELLID_CELLS_API = "https://opencellid.org/ajax/getCells.php"
TURKEY_MCC = 286
TURKCELL_NET = 1
OUTPUT_DIR = Path(__file__).resolve().parent

REGIONAL_TILES: Dict[str, Sequence[Tuple[str, float, float, float, float]]] = {
    "Marmara": (
        ("Istanbul-Levent", 41.0732, 29.0199, 0.015, 0.015),
        ("Istanbul-Taksim", 41.0373, 29.0252, 0.015, 0.015),
        ("Istanbul-Kadikoy", 40.9887, 29.0277, 0.015, 0.015),
        ("Istanbul-Pendik", 40.8897, 29.2410, 0.015, 0.015),
        ("Bursa-Nilufer", 40.2181, 28.9877, 0.015, 0.015),
        ("Tekirdag-Center", 40.9780, 27.5150, 0.015, 0.015),
        ("Kocaeli-izmit", 40.7659, 29.9407, 0.015, 0.015),
        ("Edirne-Center", 41.6771, 26.5557, 0.015, 0.015),
    ),
    "Ege": (
        ("Izmir-Konak", 38.4192, 27.1441, 0.015, 0.015),
        ("Izmir-Karşıyaka", 38.4644, 27.1132, 0.015, 0.015),
        ("Aydin-Center", 37.8450, 27.8416, 0.015, 0.015),
        ("Manisa-Center", 38.6191, 27.4289, 0.015, 0.015),
        ("Denizli-Center", 37.7741, 29.0875, 0.015, 0.015),
    ),
    "İç Anadolu": (
        ("Ankara-Cankaya", 39.8817, 32.7940, 0.015, 0.015),
        ("Ankara-Kecioren", 39.9500, 32.8500, 0.015, 0.015),
        ("Konya-Selcuklu", 37.8746, 32.4932, 0.015, 0.015),
        ("Eskisehir-Tepebasi", 39.7767, 30.5206, 0.015, 0.015),
        ("Kayseri-Melikgazi", 38.7205, 35.4826, 0.015, 0.015),
    ),
    "Akdeniz": (
        ("Antalya-Muratpasa", 36.8879, 30.7056, 0.015, 0.015),
        ("Mersin-Yenişehir", 36.8000, 34.6300, 0.015, 0.015),
        ("Adana-Seyhan", 37.0000, 35.3213, 0.015, 0.015),
        ("Isparta-Center", 37.7648, 30.5566, 0.015, 0.015),
    ),
    "Karadeniz": (
        ("Samsun-Atakum", 41.2867, 36.3300, 0.015, 0.015),
        ("Trabzon-Ortahisar", 41.0027, 39.7168, 0.015, 0.015),
        ("Ordu-Center", 40.9862, 37.8797, 0.015, 0.015),
        ("Zonguldak-Center", 41.4564, 31.7987, 0.015, 0.015),
    ),
    "Güneydoğu": (
        ("Gaziantep-Sahinbey", 37.0662, 37.3833, 0.015, 0.015),
        ("Diyarbakir-Sur", 37.9144, 40.2306, 0.015, 0.015),
        ("Sanliurfa-Eyyubiye", 37.1674, 38.7939, 0.015, 0.015),
        ("Mardin-Artuklu", 37.3129, 40.7351, 0.015, 0.015),
    ),
    "Doğu Anadolu": (
        ("Erzurum-Yakutiye", 39.9043, 41.2679, 0.015, 0.015),
        ("Elazig-Center", 38.6739, 39.2232, 0.015, 0.015),
        ("Van-Ipekyolu", 38.4998, 43.3800, 0.015, 0.015),
        ("Malatya-Battalgazi", 38.3552, 38.3095, 0.015, 0.015),
    ),
}


def build_bbox(lon: float, lat: float, lon_delta: float, lat_delta: float) -> str:
    return (
        f"{lon - lon_delta:.6f},{lat - lat_delta:.6f},"
        f"{lon + lon_delta:.6f},{lat + lat_delta:.6f}"
    )


def sql_escape(value: str) -> str:
    return value.replace("'", "''")


class OpenCellIDFetcher:
    def __init__(self, api_key: str = ""):
        self.api_key = api_key.strip()
        self.headers = {
            "Accept": "application/json, text/plain, */*",
            "User-Agent": "Mozilla/5.0 (compatible; TelcoGuardSeed/1.0)",
        }

    def fetch_turkcell_stations(self, limit: int = 30, request_delay: float = 1.25) -> List[Dict]:
        stations: List[Dict] = []
        seen: Set[Tuple[float, float, object, object, object]] = set()
        region_order = list(REGIONAL_TILES.keys())
        base_quota = limit // len(region_order)
        region_quota = {region: base_quota for region in region_order}
        for index in range(limit % len(region_order)):
            region_quota[region_order[index]] += 1
        for region in region_order:
            if len(stations) >= limit:
                break

            region_target = region_quota[region]
            region_count = 0

            for tile_label, lat, lon, lon_delta, lat_delta in REGIONAL_TILES[region]:
                if len(stations) >= limit or region_count >= region_target:
                    break

                bbox = build_bbox(lon, lat, lon_delta, lat_delta)
                print(f"Fetching {region} / {tile_label} ({bbox})...")
                features = self._fetch_features_for_bbox(bbox)
                if not features:
                    time.sleep(request_delay)
                    continue

                matched = 0
                for feature in features:
                    station = self._feature_to_station(feature)
                    if station is None:
                        continue

                    dedupe_key = station["dedupe_key"]
                    if dedupe_key in seen:
                        continue

                    seen.add(dedupe_key)
                    sequence = len(stations) + 1
                    station["code"] = f"BSC-{sequence:03d}"
                    station["name"] = f"{tile_label}-Cell-{sequence:03d}"
                    station.pop("dedupe_key", None)
                    stations.append(station)
                    matched += 1
                    region_count += 1

                    if len(stations) >= limit or region_count >= region_target:
                        break

                print(f"  -> {matched} Turkcell stations (region total: {region_count}/{region_target})")
                time.sleep(request_delay)

            print(f"Completed {region}: {region_count} stations")

        return stations

    def _fetch_features_for_bbox(self, bbox: str) -> List[Dict]:
        params = {"bbox": bbox}
        if self.api_key:
            params["key"] = self.api_key

        try:
            request_url = f"{OPENCELLID_CELLS_API}?{urlencode(params)}"
            request = Request(request_url, headers=self.headers)
            with urlopen(request, timeout=30) as response:
                status_code = getattr(response, "status", 200)
                body = response.read().decode("utf-8", errors="replace")
        except HTTPError as exc:
            print(f"  ! HTTP {exc.code}: {exc.read().decode('utf-8', errors='replace')[:200]}")
            return []
        except URLError as exc:
            print(f"  ! Request failed: {exc}")
            return []
        except Exception as exc:
            print(f"  ! Request failed: {exc}")
            return []

        if status_code != 200:
            print(f"  ! HTTP {status_code}: {body[:200]}")
            return []

        try:
            payload = json.loads(body)
        except ValueError:
            print(f"  ! Non-JSON response: {body[:200]}")
            return []

        if isinstance(payload, dict) and payload.get("type") == "FeatureCollection":
            return payload.get("features", []) or []

        if isinstance(payload, dict) and payload.get("status") == "error":
            message = str(payload.get("message", payload))
            print(f"  ! OpenCellID returned: {message}")
            return []

        if isinstance(payload, list):
            return payload

        if payload is False:
            print("  ! OpenCellID returned: false")
            return []

        if isinstance(payload, str) and payload in {"Too many requests", "Invalid Request"}:
            print(f"  ! OpenCellID returned: {payload}")
            return []

        print(f"  ! Unexpected payload: {str(payload)[:200]}")
        return []

    def _feature_to_station(self, feature: Dict) -> Optional[Dict]:
        properties = feature.get("properties") or {}
        geometry = feature.get("geometry") or {}
        coordinates = geometry.get("coordinates") or []

        if len(coordinates) != 2:
            return None

        try:
            mcc = int(properties.get("mcc", 0) or 0)
            net = int(properties.get("net", -1) or -1)
            longitude = float(coordinates[0])
            latitude = float(coordinates[1])
        except (TypeError, ValueError):
            return None

        if mcc != TURKEY_MCC or net != TURKCELL_NET:
            return None

        radio = str(properties.get("radio", "LTE") or "LTE").upper()
        station_type = self._map_radio_to_type(radio)
        region = self._get_region_from_coords(latitude, longitude)

        return {
            "latitude": latitude,
            "longitude": longitude,
            "region": region,
            "type": station_type,
            "capacity": self._estimate_capacity(properties, station_type),
            "status": "ACTIVE",
            "dedupe_key": (
                round(latitude, 6),
                round(longitude, 6),
                properties.get("area"),
                radio,
            ),
        }

    @staticmethod
    def _map_radio_to_type(radio: str) -> str:
        if "NR" in radio or "5G" in radio:
            return "NR_5G"
        return "LTE"

    @staticmethod
    def _estimate_capacity(properties: Dict, station_type: str) -> int:
        samples = int(properties.get("samples", 0) or 0)
        range_m = int(properties.get("range", 0) or 0)
        base_capacity = 1000 if station_type == "NR_5G" else 750
        capacity = base_capacity + min(250, samples * 8 + range_m // 25)
        return max(650, min(1200, capacity))

    @staticmethod
    def _get_region_from_coords(latitude: float, longitude: float) -> str:
        if 40.80 <= latitude <= 41.40 and 27.80 <= longitude <= 29.80:
            return "Marmara"
        if 38.10 <= latitude <= 38.60 and 26.90 <= longitude <= 27.40:
            return "Ege"
        if 39.60 <= latitude <= 40.10 and 32.40 <= longitude <= 33.20:
            return "İç Anadolu"
        return "Diğer"


def generate_sql(stations: List[Dict]) -> str:
    sql_lines = [
        "-- Base Stations from OpenCellID",
        f"-- Generated: {datetime.now().isoformat()}",
        "-- Source: https://opencellid.org/ajax/getCells.php",
        "",
        "INSERT INTO base_stations (code, name, latitude, longitude, region, type, capacity, status) VALUES",
    ]

    for index, station in enumerate(stations):
        comma = "," if index < len(stations) - 1 else ";"
        sql_lines.append(
            "(" \
            f"'{sql_escape(station['code'])}', " \
            f"'{sql_escape(station['name'])}', " \
            f"{station['latitude']}, " \
            f"{station['longitude']}, " \
            f"'{sql_escape(station['region'])}', " \
            f"'{station['type']}', " \
            f"{station['capacity']}, " \
            f"'{station['status']}'" \
            f") {comma}"
        )

    return "\n".join(sql_lines)


def generate_json(stations: List[Dict], api_key_used: bool) -> str:
    return json.dumps(
        {
            "base_stations": stations,
            "metadata": {
                "source": "OpenCellID",
                "endpoint": OPENCELLID_CELLS_API,
                "generated": datetime.now().isoformat(),
                "count": len(stations),
                "api_key_provided": api_key_used,
                "filter": {
                    "mcc": TURKEY_MCC,
                    "net": TURKCELL_NET,
                    "tiles": len(DEFAULT_TILES),
                },
            },
        },
        indent=2,
        ensure_ascii=False,
    )


def write_output(filename: str, content: str) -> None:
    output_path = OUTPUT_DIR / filename
    output_path.write_text(content, encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Fetch Turkcell base stations from the public OpenCellID map endpoint"
    )
    parser.add_argument(
        "api_key",
        nargs="?",
        default="",
        help="OpenCellID API key (optional, forwarded as the key query parameter)",
    )
    parser.add_argument(
        "--output",
        choices=["sql", "json", "both"],
        default="both",
        help="Output format (default: both)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=2000,
        help="Maximum number of stations to keep (default: 2000)",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=1.25,
        help="Delay in seconds between OpenCellID requests (default: 1.25)",
    )

    args = parser.parse_args()

    print("🔄 Fetching Turkcell base stations from OpenCellID...\n")
    print(f"Target: ~{args.limit} stations, request delay: {args.delay:.2f}s")

    fetcher = OpenCellIDFetcher(args.api_key)
    stations = fetcher.fetch_turkcell_stations(args.limit, request_delay=args.delay)

    print(f"\n✓ Total stations fetched: {len(stations)}")
    print(f"✓ Valid stations converted: {len(stations)}")

    if not stations:
        print("✗ No valid stations found!")
        return 1

    if args.output in ["sql", "both"]:
        sql_content = generate_sql(stations)
        write_output("base_stations_opencellid.sql", sql_content)
        print(f"\n✓ Saved SQL: {OUTPUT_DIR / 'base_stations_opencellid.sql'}")

    if args.output in ["json", "both"]:
        json_content = generate_json(stations, api_key_used=bool(args.api_key))
        write_output("base_stations_opencellid.json", json_content)
        print(f"✓ Saved JSON: {OUTPUT_DIR / 'base_stations_opencellid.json'}")

    print("\n📊 Station Summary:")
    print(f"  Total: {len(stations)}")
    print(f"  5G: {len([station for station in stations if station['type'] == 'NR_5G'])}")
    print(f"  LTE: {len([station for station in stations if station['type'] == 'LTE'])}")

    regions: Dict[str, int] = {}
    for station in stations:
        region = station["region"]
        regions[region] = regions.get(region, 0) + 1

    print("\n  By Region:")
    for region, count in sorted(regions.items()):
        print(f"    {region}: {count}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
