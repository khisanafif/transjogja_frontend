# Web/Backend Artifacts (proposal-aligned)

## Core
- web_artifacts/poi_catalog.json
- web_artifacts/stops.json
- web_artifacts/stop_routes.json
- web_artifacts/stop_board_departures.csv
- web_artifacts/routes_geojson_by_route_id.json
- web_artifacts/poi_opening_hours.csv
- web_artifacts/recommendation_samples.json
- web_artifacts/recommendation_defaults.json

## Model
- model/eta_lookup_segment_mean.csv
- model/eta_lookup_segment_bin_smoothed.csv
- model/wait_time_by_hour.csv
- model/recommendation_config.json

## Notes
- Jadwal bersifat schedule-based (non-realtime).
- KML dipisah: satu file jalur dan satu file titik halte.
- Logika nearest stop memakai Haversine dan batas jalan kaki 1 km.
- Jam buka/tutup POI memprioritaskan raw/poi_opening_hours_verified.csv.
- Recommendation engine memakai ETA total, jarak jalan kaki, jumlah transit, dan jam operasional.
- Prototype recommendation saat ini mendukung direct trip dan 1 transfer.
