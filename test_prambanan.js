import fs from 'fs';
import { recommend, routeTo } from './src/engine/recommender.js';

const db = {
  stops_list: [],
  poi_list: [],
  poi_list_all: [],
  routes_geojson: {},
  stops_by_id: {},
  poi_by_id: {},
  route_to_stop_list: {},
  route_stop_pos: {},
  stop_to_route_dirs: {},
  eta_exact: {},
  route_avg_eta: {},
  wait_lookup: {},
  stop_schedule: {},
  invalid_stops: new Set()
};

function mapPoiType(poi) {
  const rawType = (poi.type || "").toLowerCase();
  const rawName = (poi.name || "").toLowerCase();
  if (rawType.includes("sejarah") || rawType.includes("museum") || rawType.includes("budaya")) return "Sejarah";
  if (rawType.includes("kuliner")) return "Kuliner";
  if (rawType.includes("oleh") || rawType.includes("belanja") || rawName.includes("mall") || rawName.includes("plaza")) return "Belanja";
  return "Wisata";
}

const stopsData = JSON.parse(fs.readFileSync('public/data/stops.json', 'utf8'));
const invalidStopsData = [];
const poiSlimData = JSON.parse(fs.readFileSync('public/data/poi_slim.json', 'utf8'));
const routeSeqData = JSON.parse(fs.readFileSync('public/data/route_sequences.json', 'utf8'));
const etaLookupData = JSON.parse(fs.readFileSync('public/data/eta_lookup.json', 'utf8'));
const routeAvgEtaData = JSON.parse(fs.readFileSync('public/data/route_avg_eta.json', 'utf8'));
const waitLookupData = JSON.parse(fs.readFileSync('public/data/wait_time_lookup.json', 'utf8'));

db.stops_list = stopsData;
stopsData.forEach(s => { db.stops_by_id[s.stop_id] = s; });

poiSlimData.forEach(p => {
  p.original_type = p.type;
  p.type = mapPoiType(p);
  db.poi_list_all.push(p);
  db.poi_by_id[parseInt(p.poi_id)] = p;
  
  const hasImage = p.image && p.image.trim() !== '';
  if (parseInt(p.needs_review || 0) === 0 && hasImage) {
    db.poi_list.push(p);
  }
});

const s2r = {};
for (const [rd, data] of Object.entries(routeSeqData)) {
  const clean = data.stops
    .map(s => s.stop_id)
    .filter(sid => !db.invalid_stops.has(sid) && db.stops_by_id[sid]?.lat != null);
    
  if (clean.length < 2) continue;
  db.route_to_stop_list[rd] = clean;
  
  const posMap = {};
  clean.forEach((sid, i) => {
    if (posMap[sid] === undefined) posMap[sid] = i;
  });
  db.route_stop_pos[rd] = posMap;
  
  clean.forEach(sid => {
    if (!s2r[sid]) s2r[sid] = [];
    s2r[sid].push(rd);
  });
}

for (const [sid, rds] of Object.entries(s2r)) {
  db.stop_to_route_dirs[sid] = [...new Set(rds)];
}

for (const [seg_id, val] of Object.entries(etaLookupData)) {
  db.eta_exact[seg_id] = parseFloat(val.seg_median_min);
}
db.route_avg_eta = routeAvgEtaData;

for (const [sid, routes] of Object.entries(waitLookupData)) {
  db.wait_lookup[sid] = {};
  for (const [rid, hoursDict] of Object.entries(routes)) {
    db.wait_lookup[sid][rid] = {};
    for (const [h, val] of Object.entries(hoursDict)) {
      db.wait_lookup[sid][rid][parseInt(h)] = parseFloat(val);
    }
  }
}

console.log('HT_250 in route_to_stop_list:', Object.keys(db.route_to_stop_list).filter(rd => db.route_to_stop_list[rd].includes('HT_250')));

const res = routeTo('HT_001', 0, '08:00', 10, db); // 10 is Candi Prambanan
console.log('routeTo with defaults:', res);
