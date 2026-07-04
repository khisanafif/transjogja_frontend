// src/engine/planner.js

import {
  hhmm_to_min,
  min_to_hhmm,
  is_open_with_margin
} from './eta.js';
import { recommend, routeTo } from './recommender.js';

export function plan_day(
  origin_stop_id,
  origin_walk_min,
  depart_hhmm,
  end_hhmm,
  weekday,
  min_stay_min,
  filters = {},
  max_destinations = 5,
  db
) {
  const depart_min = hhmm_to_min(depart_hhmm);
  const end_min = hhmm_to_min(end_hhmm);

  let current_stop = origin_stop_id;
  let current_walk = origin_walk_min;
  let current_min = depart_min;
  
  const visited = new Set();
  const itinerary = [];

  while (current_min < end_min - min_stay_min && itinerary.length < max_destinations) {
    const current_hhmm = min_to_hhmm(current_min);

    const is_allowed = (p) => {
      if (visited.has(parseInt(p.poi_id))) return false;
      const t = (p.type || "").toLowerCase();
      const n = (p.name || "").toLowerCase();
      if (t.includes("oleh") || n.includes("pusat oleh")) return false;
      if (n.includes("mall") || n.includes("plaza") || n.includes("square")) return false;
      return true;
    };

    const valid_pois = db.poi_list.filter(is_allowed);
    const mock_db = { ...db, poi_list: valid_pois }; // Inject filtered POI list

    const recs = recommend(
      current_stop,
      current_walk,
      current_hhmm,
      weekday,
      { ...filters, min_stay_hours: min_stay_min / 60 },
      mock_db,
      20
    );

    let chosen = null;
    let arrive_min_chosen = 0;

    for (const rec of recs) {
      const arrive_min = current_min + rec.eta_total_min;
      if (arrive_min + min_stay_min > end_min) continue;
      
      const [open_ok, remaining] = is_open_with_margin(
        min_to_hhmm(arrive_min),
        rec.close_hhmm || "17:00",
        min_stay_min
      );
      
      if (!open_ok) continue;
      
      chosen = rec;
      arrive_min_chosen = arrive_min;
      break;
    }

    if (!chosen) break;

    const depart_from_poi = arrive_min_chosen + min_stay_min;
    
    itinerary.push({
      order: itinerary.length + 1,
      poi_id: chosen.poi_id,
      name: chosen.name,
      type: chosen.type,
      lat: chosen.lat,
      lon: chosen.lon,
      rating: chosen.rating,
      open_hhmm: chosen.open_hhmm,
      close_hhmm: chosen.close_hhmm,
      needs_review: chosen.needs_review,
      arrive_hhmm: min_to_hhmm(arrive_min_chosen),
      depart_hhmm: min_to_hhmm(depart_from_poi),
      stay_min: min_stay_min,
      eta_from_prev_min: Math.round(chosen.eta_total_min * 100) / 100,
      transfers: chosen.transfers,
      route_legs: chosen.route_legs,
      description: chosen.description,
      htm_weekday: chosen.htm_weekday,
      htm_weekend: chosen.htm_weekend,
      image: chosen.image,
    });

    visited.add(parseInt(chosen.poi_id));
    
    current_stop = chosen.nearest_stop_id || current_stop;
    current_walk = parseFloat(chosen.walk_time_min || 0);
    current_min = depart_from_poi;
  }

  const total_travel = itinerary.reduce((sum, i) => sum + i.eta_from_prev_min, 0);
  const total_visit = itinerary.length * min_stay_min;

  return {
    feasible: itinerary.length > 0,
    total_destinations: itinerary.length,
    total_travel_min: Math.round(total_travel * 10) / 10,
    total_visit_min: total_visit,
    return_hhmm: min_to_hhmm(current_min),
    itinerary: itinerary,
  };
}

export function custom_plan(
  origin_stop_id,
  origin_walk_min,
  depart_hhmm,
  targets, // array of { poi_id, stay_min }
  db,
  optimize_order = true
) {
  const depart_min = hhmm_to_min(depart_hhmm);

  let current_stop = origin_stop_id;
  let current_walk = origin_walk_min;
  let current_min = depart_min;
  
  const itinerary = [];
  
  let unvisited = [...targets];

  while (unvisited.length > 0) {
    const current_hhmm = min_to_hhmm(current_min);
    
    let best_idx = -1;
    let best_route = null;
    
    if (optimize_order) {
      let best_eta = Infinity;
      for (let i = 0; i < unvisited.length; i++) {
        const route_res = routeTo(current_stop, current_walk, current_hhmm, unvisited[i].poi_id, db);
        if (route_res.found && route_res.eta_total_min < best_eta) {
          best_eta = route_res.eta_total_min;
          best_route = route_res;
          best_idx = i;
        }
      }
    } else {
      best_idx = 0;
      best_route = routeTo(current_stop, current_walk, current_hhmm, unvisited[0].poi_id, db);
      if (!best_route.found) best_idx = -1;
    }

    if (best_idx === -1) {
      break; // cannot reach next target, stop here
    }

    const target = unvisited[best_idx];
    const arrive_min = current_min + best_route.eta_total_min;
    const depart_from_poi = arrive_min + target.stay_min;
    
    const poi = db.poi_by_id[target.poi_id];

    itinerary.push({
      order: itinerary.length + 1,
      poi_id: poi.poi_id,
      name: poi.name,
      type: poi.type,
      lat: poi.lat,
      lon: poi.lon,
      rating: poi.rating,
      open_hhmm: poi.open_hhmm,
      close_hhmm: poi.close_hhmm,
      needs_review: poi.needs_review,
      arrive_hhmm: min_to_hhmm(arrive_min),
      depart_hhmm: min_to_hhmm(depart_from_poi),
      stay_min: target.stay_min,
      eta_from_prev_min: Math.round(best_route.eta_total_min * 100) / 100,
      transfers: best_route.transfers,
      route_legs: best_route.route_legs,
      description: poi.description,
      htm_weekday: poi.htm_weekday,
      htm_weekend: poi.htm_weekend,
      image: poi.image,
    });

    current_stop = poi.nearest_stop_id || current_stop;
    current_walk = parseFloat(poi.walk_time_min || 0);
    current_min = depart_from_poi;
    
    unvisited.splice(best_idx, 1);
  }

  const total_travel = itinerary.reduce((sum, i) => sum + i.eta_from_prev_min, 0);
  const total_visit = itinerary.reduce((sum, i) => sum + i.stay_min, 0);

  return {
    feasible: itinerary.length === targets.length,
    total_destinations: itinerary.length,
    total_travel_min: Math.round(total_travel * 10) / 10,
    total_visit_min: total_visit,
    return_hhmm: min_to_hhmm(current_min),
    itinerary: itinerary,
  };
}
