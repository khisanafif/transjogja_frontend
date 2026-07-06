import xml.etree.ElementTree as ET
import pandas as pd
import re
import json
from difflib import SequenceMatcher

KML_NS = {'kml': 'http://www.opengis.net/kml/2.2'}
KML_PATH = 'c:/Users/User/Downloads/transjogja_skripsi/notebook/raw/Jalur Route.kml'
STOPS_JSON = 'c:/transjogja_frontend/public/data/stops.json'
OUT_JSON = 'c:/transjogja_frontend/public/data/route_sequences.json'

with open(STOPS_JSON, 'r', encoding='utf-8') as f:
    stops = json.load(f)

def normalize(name):
    return re.sub(r'[^a-z0-9]', '', name.lower())

stop_map = {}
for s in stops:
    norm = normalize(s['stop_name'])
    stop_map[norm] = s['stop_id']

stop_norms = list(stop_map.keys())

root = ET.parse(KML_PATH).getroot()
route_sequences = {}

for pm in root.findall('.//kml:Placemark', KML_NS):
    name = pm.findtext('kml:name', default='', namespaces=KML_NS)
    m = re.match(r'^\s*([A-Za-z0-9-]+)', name)
    route_id = m.group(1).upper() if m else name.upper()
    
    # Official KMLs are single loops (0)
    route_dir = f'{route_id}_0'
    
    desc = pm.findtext('kml:description', default='', namespaces=KML_NS)
    seq = re.findall(r'\d{3}\s*=>\s*([^<]+)', desc)
    
    if seq:
        stop_ids = []
        for stop_name in seq:
            snorm = normalize(stop_name.strip())
            
            matched_id = stop_map.get(snorm)
            if not matched_id:
                best_score = -1
                best_match = None
                for sn in stop_norms:
                    score = SequenceMatcher(None, sn, snorm).ratio()
                    if score > best_score:
                        best_score = score
                        best_match = sn
                if best_match and best_score > 0.8:
                    matched_id = stop_map[best_match]
                else:
                    print(f'Warning: Could not match stop {stop_name} in route {route_id}')
                    continue
                    
            stop_ids.append({'stop_id': matched_id})
            
        route_sequences[route_dir] = {'stops': stop_ids}
        print(f'Route {route_dir}: {len(stop_ids)} stops')

with open(OUT_JSON, 'w', encoding='utf-8') as f:
    json.dump(route_sequences, f, indent=2)

print(f'\nSuccess! Wrote {len(route_sequences)} route sequences to {OUT_JSON}')
