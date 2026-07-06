// src/engine/routing.js

import { seg_eta, get_wait, TRANSFER_PENALTY } from './eta.js';

export const MAX_COST_MIN = 180.0;

class MinHeap {
  constructor() {
    this.heap = [];
  }
  push(val) {
    this.heap.push(val);
    this.bubbleUp();
  }
  pop() {
    if (this.heap.length === 1) return this.heap.pop();
    const top = this.heap[0];
    this.heap[0] = this.heap.pop();
    this.sinkDown();
    return top;
  }
  isEmpty() { return this.heap.length === 0; }
  bubbleUp() {
    let index = this.heap.length - 1;
    while (index > 0) {
      let parent = Math.floor((index - 1) / 2);
      if (this.heap[parent][0] <= this.heap[index][0]) break;
      let temp = this.heap[parent];
      this.heap[parent] = this.heap[index];
      this.heap[index] = temp;
      index = parent;
    }
  }
  sinkDown() {
    let index = 0;
    const length = this.heap.length;
    while (true) {
      let left = 2 * index + 1;
      let right = 2 * index + 2;
      let smallest = index;
      if (left < length && this.heap[left][0] < this.heap[smallest][0]) smallest = left;
      if (right < length && this.heap[right][0] < this.heap[smallest][0]) smallest = right;
      if (smallest === index) break;
      let temp = this.heap[smallest];
      this.heap[smallest] = this.heap[index];
      this.heap[index] = temp;
      index = smallest;
    }
  }
}

let _cnt = 0;

export function sssp_from_origin(
  origin_stop_id,
  origin_walk_min,
  depart_hour,
  route_to_stop_list,
  route_stop_pos,
  stop_to_route_dirs,
  eta_exact,
  route_avg_eta,
  wait_lookup,
  max_cost = MAX_COST_MIN
) {
  const dist = {};
  const pred = {};

  const heap = new MinHeap();
  // cost, counter, stop, rd, legs
  heap.push([origin_walk_min, _cnt++, origin_stop_id, null, [
    {
      type: "WALK_START",
      to_stop_id: origin_stop_id,
      walk_time_min: origin_walk_min
    }
  ]]);

  while (!heap.isEmpty()) {
    const [cost, _tc, stop, rd, legs] = heap.pop();
    const key = `${stop}|${rd === null ? 'null' : rd}`;

    if (dist[key] !== undefined) continue;
    dist[key] = cost;
    pred[key] = legs;

    if (cost > max_cost) continue;

    const cur_hour = Math.min(Math.floor(depart_hour + cost / 60), 20);

    // Case A: At stop, haven't boarded
    if (rd === null) {
      const next_rds = stop_to_route_dirs[stop] || [];
      for (const next_rd of next_rds) {
        const route_id = next_rd.substring(0, next_rd.lastIndexOf('_'));
        const wait = get_wait(stop, route_id, cur_hour, wait_lookup);
        const new_cost = cost + wait;
        if (new_cost > max_cost) continue;
        
        const new_key = `${stop}|${next_rd}`;
        if (dist[new_key] !== undefined) continue;
        
        const new_legs = [...legs, {
          type: "BOARD",
          stop_id: stop,
          route_dir: next_rd,
          route_id: route_id,
          wait_min: Math.round(wait * 100) / 100,
        }];
        heap.push([new_cost, _cnt++, stop, next_rd, new_legs]);
      }
    } 
    // Case B: On board route rd
    else {
      const stops_in_route = route_to_stop_list[rd] || [];
      const posMap = route_stop_pos[rd] || {};
      const pos = posMap[stop];
      if (pos === undefined) continue;

      let accum = 0.0;
      const board_stop = _get_board_stop(legs);
      let prev = stop;

      for (let i = pos + 1; i < stops_in_route.length; i++) {
        const next_stop = stops_in_route[i];
        const seg_key = `${prev}->${next_stop}`;
        const seg_t = seg_eta(seg_key, rd, eta_exact, route_avg_eta);
        accum += seg_t;
        const new_cost = cost + accum;

        if (new_cost > max_cost) break;

        const ride_leg = {
          type: "BUS",
          route_dir: rd,
          route_id: rd.substring(0, rd.lastIndexOf('_')),
          board_stop_id: board_stop,
          alight_stop_id: next_stop,
          ride_min: Math.round(accum * 100) / 100,
          n_stops: i - pos,
        };

        // ALIGHT Option
        const alight_key = `${next_stop}|null`;
        if (dist[alight_key] === undefined) {
          const alight_legs = [...legs, ride_leg];
          heap.push([new_cost, _cnt++, next_stop, null, alight_legs]);
        }

        // TRANSFER Option (same-stop only)
        const arr_hour = Math.min(Math.floor(depart_hour + new_cost / 60), 20);
        const other_rds = stop_to_route_dirs[next_stop] || [];
        for (const other_rd of other_rds) {
          if (other_rd === rd) continue;
          
          const other_key = `${next_stop}|${other_rd}`;
          if (dist[other_key] !== undefined) continue;
          
          const other_rid = other_rd.substring(0, other_rd.lastIndexOf('_'));
          const wait_next = get_wait(next_stop, other_rid, arr_hour, wait_lookup);
          const transfer_cost = new_cost + wait_next;
          
          if (transfer_cost > MAX_COST_MIN) continue;
          
          const transfer_legs = [...legs, ride_leg, {
            type: "TRANSFER",
            at_stop_id: next_stop,
            from_route_dir: rd,
            to_route_dir: other_rd,
            to_route_id: other_rid,
            wait_min: Math.round(wait_next * 100) / 100,
            penalty_min: TRANSFER_PENALTY,
          }];
          
          heap.push([transfer_cost + TRANSFER_PENALTY, _cnt++, next_stop, other_rd, transfer_legs]);
        }

        prev = next_stop;
      }
    }
  }

  return { dist, pred };
}

export function build_route_to_poi(dist, pred, poi) {
  const dest_stop = poi.nearest_stop_id;
  if (!dest_stop) return null;

  const stop_key = `${dest_stop}|null`;
  if (dist[stop_key] === undefined) return null;

  const transit_cost = dist[stop_key];
  const walk_end_min = parseFloat(poi.walk_time_min || 0);
  const eta_total = Math.round((transit_cost + walk_end_min) * 100) / 100;

  const legs = [...pred[stop_key], {
    type: "WALK_END",
    from_stop_id: dest_stop,
    dest_name: poi.name || "",
    walk_dist_m: Math.round(parseFloat(poi.walk_dist_m || 0) * 10) / 10,
    walk_time_min: Math.round(walk_end_min * 100) / 100,
  }];

  const transfers = legs.filter(l => l.type === "TRANSFER").length;
  
  return {
    eta_total_min: eta_total,
    transfers: transfers,
    route_legs: legs,
  };
}

function _get_board_stop(legs) {
  for (let i = legs.length - 1; i >= 0; i--) {
    if (legs[i].type === "BOARD") {
      return legs[i].stop_id;
    }
  }
  return "";
}
