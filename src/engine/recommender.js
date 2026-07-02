// src/engine/recommender.js

import {
  hhmm_to_min,
  min_to_hhmm,
  is_open_with_margin,
  is_open_on_day_perhari,
  get_close_hhmm_for_day
} from './eta.js';

import {
  sssp_from_origin,
  build_route_to_poi
} from './routing.js';

const _cache = {};
const _CACHE_TTL = 900 * 1000; // 15 mins

export function recommend(
  origin_stop_id,
  origin_walk_min,
  depart_hhmm,
  weekday,
  filters,
  db,
  limit = 15
) {
  const depart_hour = parseInt(depart_hhmm.split(":")[0], 10);
  const depart_min_of_day = hhmm_to_min(depart_hhmm);

  // Cache key
  const types_tuple = (filters.types || []).slice().sort().join(",");
  const cache_key = [
    origin_stop_id,
    depart_hour,
    _day_type(weekday),
    types_tuple,
    filters.max_transfers !== undefined ? filters.max_transfers : 99,
    filters.max_eta_min !== undefined ? filters.max_eta_min : 90,
    filters.min_stay_hours !== undefined ? filters.min_stay_hours : 2,
  ].join("|");

  const now = Date.now();
  if (_cache[cache_key] && (now - _cache[cache_key].ts < _CACHE_TTL)) {
    return _cache[cache_key].data;
  }

  // SSSP
  const { dist, pred } = sssp_from_origin(
    origin_stop_id,
    origin_walk_min,
    depart_hour,
    db.route_to_stop_list,
    db.route_stop_pos,
    db.stop_to_route_dirs,
    db.eta_exact,
    db.route_avg_eta,
    db.wait_lookup
  );

  const candidates = [];
  const max_eta = parseFloat(filters.max_eta_min !== undefined ? filters.max_eta_min : 90);
  const max_transfers = parseInt(filters.max_transfers !== undefined ? filters.max_transfers : 99, 10);
  const min_stay = parseInt(filters.min_stay_hours !== undefined ? filters.min_stay_hours : 2, 10) * 60;
  const type_filter = (filters.types || []).map(t => t.trim());

  for (const poi of db.poi_list) {
    if (type_filter.length > 0 && !type_filter.includes(poi.type)) continue;
    if (!poi.nearest_stop_id) continue;

    const route_result = build_route_to_poi(dist, pred, poi);
    if (!route_result) continue;

    const eta = route_result.eta_total_min;
    const transfers = route_result.transfers;

    if (eta > max_eta) continue;
    if (transfers > max_transfers) continue;

    const arrive_hhmm = min_to_hhmm(depart_min_of_day + eta);
    const close_today = get_close_hhmm_for_day(poi, weekday);
    const [open_ok, remaining] = is_open_with_margin(arrive_hhmm, close_today, min_stay);
    
    if (!open_ok) continue;
    if (!is_open_on_day_perhari(poi, weekday)) continue;

    const score = _score(poi, eta, transfers, remaining);

    candidates.push({
      ..._poi_fields(poi),
      eta_total_min: eta,
      transfers: transfers,
      arrive_hhmm: arrive_hhmm,
      remaining_open_min: remaining,
      open_margin_ok: open_ok,
      recommendation_score: Math.round(score * 100) / 100,
      route_legs: _enrich_legs(route_result.route_legs, db.stops_by_id),
    });
  }

  candidates.sort((a, b) => b.recommendation_score - a.recommendation_score);
  
  const result = candidates.slice(0, limit).map((c, i) => ({
    rank: i + 1,
    ...c
  }));

  _cache[cache_key] = { data: result, ts: now };
  return result;
}

function _score(poi, eta, transfers, remaining_min) {
  const norm_inv = (val, lo = 0, hi = 90) => Math.max(0.0, 1.0 - (val - lo) / Math.max(hi - lo, 1));
  
  const eta_score = norm_inv(eta, 0, 90);
  const walk_dist_m = parseFloat(poi.walk_dist_m || 1200);
  const walk_score = norm_inv(walk_dist_m, 0, 1200);
  const transfer_score = Math.max(0.0, 1.0 - transfers / 4);
  const margin_score = Math.min(1.0, remaining_min / 480);
  const rating_score = (parseFloat(poi.rating || 3) - 1) / 4;
  const pop_score = Math.min(1.0, Math.log1p(parseFloat(poi.vote_count || 0)) / 10);

  return (
    0.35 * eta_score +
    0.20 * walk_score +
    0.20 * transfer_score +
    0.10 * margin_score +
    0.10 * rating_score +
    0.05 * pop_score
  ) * 100;
}

function _poi_fields(poi) {
  return {
    poi_id: poi.poi_id,
    name: poi.name,
    type: poi.type,
    lat: poi.lat,
    lon: poi.lon,
    rating: poi.rating,
    vote_count: poi.vote_count,
    open_hhmm: poi.open_hhmm,
    close_hhmm: poi.close_hhmm,
    open_days: poi.open_days,
    needs_review: !!parseInt(poi.needs_review || 0, 10),
    hours_source_type: poi.hours_source_type,
    nearest_stop_id: poi.nearest_stop_id,
    nearest_stop_name: poi.nearest_stop_name,
    walk_dist_m: poi.walk_dist_m,
    walk_time_min: poi.walk_time_min,
    walk_access_class: poi.walk_access_class,
    description: poi.description,
    htm_weekday: poi.htm_weekday,
    htm_weekend: poi.htm_weekend,
    image: poi.image,
  };
}

function _enrich_legs(legs, stops_by_id) {
  return legs.map(leg => {
    const l = { ...leg };
    const keys = ["stop_id", "board_stop_id", "alight_stop_id", "at_stop_id", "from_stop_id", "to_stop_id"];
    for (const key of keys) {
      const sid = l[key];
      if (sid && stops_by_id[sid]) {
        l[key.replace("_id", "_name")] = stops_by_id[sid].name || sid;
      }
    }
    return l;
  });
}

function _day_type(weekday) {
  const weekends = ["Sabtu", "Minggu", "Saturday", "Sunday"];
  return weekends.includes(weekday) ? "weekend" : "weekday";
}

// Added targeted routing endpoint
export function routeTo(
  origin_stop_id,
  origin_walk_min,
  depart_hhmm,
  dest_poi_id,
  db
) {
  const depart_hour = parseInt(depart_hhmm.split(":")[0], 10);
  
  const { dist, pred } = sssp_from_origin(
    origin_stop_id,
    origin_walk_min,
    depart_hour,
    db.route_to_stop_list,
    db.route_stop_pos,
    db.stop_to_route_dirs,
    db.eta_exact,
    db.route_avg_eta,
    db.wait_lookup
  );

  const poi = db.poi_by_id[dest_poi_id];
  if (!poi) return { found: false, message: "POI tidak ditemukan" };

  const route_result = build_route_to_poi(dist, pred, poi);
  if (!route_result) return { found: false, message: "Rute ke POI ini tidak tersedia" };

  const depart_min_of_day = hhmm_to_min(depart_hhmm);
  const eta = route_result.eta_total_min;
  const arrive_hhmm = min_to_hhmm(depart_min_of_day + eta);

  return {
    found: true,
    eta_total_min: eta,
    transfers: route_result.transfers,
    arrive_hhmm: arrive_hhmm,
    route_legs: _enrich_legs(route_result.route_legs, db.stops_by_id)
  };
}
