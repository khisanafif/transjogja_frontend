// src/services/api.js

import { initEngine, db } from '../engine/dataLoader.js';
import { recommend, routeTo } from '../engine/recommender.js';
import { plan_day } from '../engine/planner.js';

async function engineApi(handler) {
  await initEngine();
  return handler();
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const p = Math.PI / 180;
  const a = 0.5 - Math.cos((lat2 - lat1) * p)/2 + 
            Math.cos(lat1 * p) * Math.cos(lat2 * p) * 
            (1 - Math.cos((lon2 - lon1) * p))/2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export const api = {
  getStops: () => engineApi(() => db.stops_list),
  
  getNearestStops: (lat, lon) => engineApi(() => {
    const latF = parseFloat(lat);
    const lonF = parseFloat(lon);
    const withDist = db.stops_list
      .filter(s => s.lat != null && s.lon != null)
      .map(s => {
        const dist = haversine(latF, lonF, s.lat, s.lon);
        return { ...s, distance_m: Math.round(dist * 10) / 10 };
      });
    return withDist.sort((a, b) => a.distance_m - b.distance_m).slice(0, 5);
  }),

  getStop: (id) => engineApi(() => db.stops_by_id[id] || null),

  getPoi: (type) => engineApi(() => {
    if (type) return db.poi_list.filter(p => p.type === type);
    return db.poi_list;
  }),

  getPoiTypes: () => engineApi(() => {
    const types = [...new Set(db.poi_list.map(p => p.type))].filter(Boolean);
    return types;
  }),

  getPoiDetail: (id) => engineApi(() => db.poi_by_id[parseInt(id)] || null),

  recommend: (body) => engineApi(() => {
    return {
      results: recommend(
        body.origin_stop_id,
        body.origin_walk_min,
        body.depart_hhmm,
        body.weekday,
        body.filters || {},
        db,
        body.limit || 15
      )
    };
  }),

  routeTo: (body) => engineApi(() => {
    return routeTo(
      body.origin_stop_id,
      body.origin_walk_min,
      body.depart_hhmm,
      body.dest_poi_id,
      db
    );
  }),

  itinerary: (body) => engineApi(() => {
    return plan_day(
      body.origin_stop_id,
      body.origin_walk_min,
      body.depart_hhmm,
      body.end_hhmm,
      body.weekday,
      body.min_stay_min || 60,
      body.filters || {},
      body.max_destinations || 5,
      db
    );
  }),

  getSchedule: (stop_id, day_type) => engineApi(() => {
    const raw = db.stop_schedule[stop_id] || {};
    const stop = db.stops_by_id[stop_id];
    if (!stop) throw new Error("Stop not found");
    
    const routes = Object.keys(raw).map(rid => {
      return {
        route_id: rid,
        departures: raw[rid].map(t => {
          const parts = t.split(':');
          return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
        }).sort()
      };
    });

    return {
      stop_name: stop.name,
      routes: routes
    };
  }),

  getRoutesList: () => engineApi(() => {
    return Object.keys(db.route_to_stop_list).map(rd => ({
      route_dir: rd,
      route_id: rd.split('_')[0],
      n_stops: db.route_to_stop_list[rd].length
    }));
  }),

  getRouteDetail: (rd) => engineApi(() => {
    const stops = db.route_to_stop_list[rd];
    if (!stops) return null;
    return {
      route_dir: rd,
      stops: stops.map(sid => db.stops_by_id[sid])
    };
  }),

  getRoutesGeoJSON: (id) => engineApi(() => {
    if (id) {
      const filtered = { type: "FeatureCollection", features: [] };
      db.routes_geojson.features.forEach(f => {
        if (f.properties.route_id === id) {
          filtered.features.push(f);
        }
      });
      return filtered;
    }
    return db.routes_geojson;
  }),

  getRoutesBetween: (from_stop, to_stop) => engineApi(() => {
    const from_routes = db.stop_to_route_dirs[from_stop] || [];
    const to_routes = db.stop_to_route_dirs[to_stop] || [];
    const common = from_routes.filter(rd => to_routes.includes(rd));
    
    const results = [];
    for (const rd of common) {
      const posMap = db.route_stop_pos[rd];
      if (posMap[from_stop] < posMap[to_stop]) {
        results.push({
          route_dir: rd,
          route_id: rd.split('_')[0],
          n_stops: posMap[to_stop] - posMap[from_stop]
        });
      }
    }
    return { routes: results };
  })
}
