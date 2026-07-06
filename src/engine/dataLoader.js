// src/engine/dataLoader.js

export const db = {
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

let initialized = false;
let initPromise = null;

function mapPoiType(poi) {
  const rawType = (poi.type || "").toLowerCase();
  const rawName = (poi.name || "").toLowerCase();
  
  if (rawType.includes("sejarah") || rawType.includes("museum") || rawType.includes("budaya")) return "Sejarah";
  if (rawType.includes("kuliner")) return "Kuliner";
  if (rawType.includes("oleh") || rawType.includes("belanja") || rawName.includes("mall") || rawName.includes("plaza")) return "Belanja";
  return "Wisata";
}

export async function initEngine() {
  if (initialized) return;
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    try {
      const [
        stopsData, invalidStopsData, poiSlimData, 
        routesGeojsonData, routeSeqData, etaLookupData,
        routeAvgEtaData, waitLookupData, schedulesMoovitData
      ] = await Promise.all([
        fetch('/data/stops.json').then(r => r.json()),
        fetch('/data/invalid_stops.json').then(r => r.json()).catch(() => []),
        fetch('/data/poi_slim.json').then(r => r.json()),
        fetch('/data/routes_geojson.json').then(r => r.json()).catch(() => ({})),
        fetch('/data/route_sequences.json').then(r => r.json()),
        fetch('/data/eta_lookup.json').then(r => r.json()),
        fetch('/data/route_avg_eta.json').then(r => r.json()),
        fetch('/data/wait_time_lookup.json').then(r => r.json()),
        fetch('/data/schedules_moovit.json').then(r => r.json()).catch(() => ({}))
      ]);

      // -- invalid stops --
      invalidStopsData.forEach(id => db.invalid_stops.add(id));

      // -- stops --
      db.stops_list = stopsData;
      stopsData.forEach(s => { db.stops_by_id[s.stop_id] = s; });

      // -- poi --
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

      // -- routes geojson --
      db.routes_geojson = routesGeojsonData;

      // -- route sequences & dicts --
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

      // -- eta --
      for (const [seg_id, val] of Object.entries(etaLookupData)) {
        db.eta_exact[seg_id] = parseFloat(val.seg_median_min);
      }
      db.route_avg_eta = routeAvgEtaData;

      // -- wait --
      for (const [sid, routes] of Object.entries(waitLookupData)) {
        db.wait_lookup[sid] = {};
        for (const [rid, hoursDict] of Object.entries(routes)) {
          db.wait_lookup[sid][rid] = {};
          for (const [h, val] of Object.entries(hoursDict)) {
            db.wait_lookup[sid][rid][parseInt(h)] = parseFloat(val);
          }
        }
      }

      // -- schedule --
      for (const [sid, rds] of Object.entries(db.stop_to_route_dirs)) {
        db.stop_schedule[sid] = {};
        const rids = [...new Set(rds.map(rd => rd.split('_')[0]))];
        rids.forEach(rid => {
          if (schedulesMoovitData[sid] && schedulesMoovitData[sid][rid]) {
            db.stop_schedule[sid][rid] = schedulesMoovitData[sid][rid]
              .filter(t => t <= '20:30')
              .slice().sort();
          } else {
            const times = [];
            for (let h = 5; h <= 20; h++) {
              const headway = 15;
              const n_trips = Math.floor(60 / headway);
              for (let j = 0; j < n_trips; j++) {
                const minute = Math.floor((j / n_trips) * 60);
                const tStr = `${h.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                if (tStr <= '20:30') {
                  times.push(tStr);
                }
              }
            }
            db.stop_schedule[sid][rid] = times;
          }
        });
      }

      initialized = true;
    } catch (e) {
      console.error("Engine Init Failed:", e);
      throw e;
    }
  })();
  
  return initPromise;
}
