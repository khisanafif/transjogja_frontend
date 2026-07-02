// src/engine/eta.js

export const WALK_SPEED_MPM = 80.0;
export const TRANSFER_PENALTY = 5.0;
export const DEFAULT_SEG_MIN = 3.0;

export function seg_eta(seg_key, route_dir, eta_exact, route_avg_eta) {
  if (eta_exact[seg_key] !== undefined) {
    return eta_exact[seg_key];
  }
  if (route_avg_eta[route_dir] !== undefined) {
    return route_avg_eta[route_dir];
  }
  return DEFAULT_SEG_MIN;
}

export function get_wait(stop_id, route_id, hour, wait_lookup) {
  const stop_data = wait_lookup[stop_id] || {};
  const route_data = stop_data[route_id] || {};
  
  if (Object.keys(route_data).length === 0) {
    return 7.5;
  }
  if (route_data[hour] !== undefined) {
    return route_data[hour];
  }
  
  // closest available hour
  const keys = Object.keys(route_data).map(Number);
  const closest = keys.reduce((prev, curr) => 
    Math.abs(curr - hour) < Math.abs(prev - hour) ? curr : prev
  );
  return route_data[closest];
}

export function walk_time(dist_m) {
  return Math.round((dist_m / WALK_SPEED_MPM) * 100) / 100;
}

export function walk_dist_to_stop(user_lat, user_lon, stop) {
  const slat = stop.lat;
  const slon = stop.lon;
  if (slat == null || slon == null) return null;
  
  const R = 6371000;
  const p = Math.PI / 180;
  const a = Math.pow(Math.sin((slat - user_lat) * p / 2), 2) +
            Math.cos(user_lat * p) * Math.cos(slat * p) *
            Math.pow(Math.sin((slon - user_lon) * p / 2), 2);
  const dist = 2 * R * Math.asin(Math.sqrt(a));
  return [dist, walk_time(dist)];
}

export function hhmm_to_min(hhmm) {
  if (!hhmm) return 0;
  const parts = hhmm.split(":");
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

export function min_to_hhmm(total_min) {
  const t = Math.round(total_min);
  const h = Math.floor(t / 60).toString().padStart(2, '0');
  const m = (t % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

export function is_open_with_margin(arrive_hhmm, close_hhmm, min_margin_min = 120) {
  const arrive = hhmm_to_min(arrive_hhmm);
  const close = hhmm_to_min(close_hhmm);
  const remaining = close - arrive;
  return [remaining >= min_margin_min, remaining];
}

const _DAY_ORDER = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

export function is_open_on_day(open_days, weekday) {
  const s = (open_days || "").toString().trim();
  const lower = s.toLowerCase();
  if (!s || ["nan", "none", "", "setiap hari", "setiap_hari", "daily", "every day"].includes(lower)) {
    return true;
  }
  if (s.includes("-") && !s.includes(",")) {
    const parts = s.split("-").map(p => p.trim());
    if (parts.length === 2 && _DAY_ORDER.includes(parts[0]) && _DAY_ORDER.includes(parts[1])) {
      const start = _DAY_ORDER.indexOf(parts[0]);
      const end = _DAY_ORDER.indexOf(parts[1]);
      const idx = _DAY_ORDER.indexOf(weekday);
      return start <= idx && idx <= end;
    }
  }
  const days = s.split(",").map(d => d.trim());
  return days.includes(weekday);
}

export function is_open_on_day_perhari(poi, weekday) {
  const schedule = poi.schedule;
  if (!schedule) {
    return is_open_on_day(poi.open_days || "", weekday);
  }
  const day_entry = schedule[weekday];
  if (day_entry === undefined) {
    return true;
  }
  return day_entry !== null;
}

export function get_close_hhmm_for_day(poi, weekday) {
  const schedule = poi.schedule;
  if (schedule) {
    const day_entry = schedule[weekday];
    if (day_entry && typeof day_entry === 'object') {
      return day_entry.close || poi.close_hhmm || "17:00";
    }
  }
  return poi.close_hhmm || "17:00";
}
