import xml.etree.ElementTree as ET
import re
import json
from difflib import SequenceMatcher
import shutil

KML_NS = {'kml': 'http://www.opengis.net/kml/2.2'}
root = ET.parse('c:/Users/User/Downloads/transjogja_skripsi/notebook/raw/Jalur Route.kml').getroot()

def normalize(name):
    return re.sub(r'[^a-z0-9]', '', name.lower())

STOPS_JSON = 'c:/transjogja_frontend/public/data/stops.json'

with open(STOPS_JSON, 'r', encoding='utf-8') as f:
    stops = json.load(f)

stop_map = {}
for s in stops:
    norm = normalize(s['stop_name'])
    stop_map[norm] = s['stop_id']
stop_norms = list(stop_map.keys())

# Update stop_name in stops using names from Jalur Route
updated_stops = 0

for pm in root.findall('.//kml:Placemark', KML_NS):
    desc = pm.findtext('kml:description', default='', namespaces=KML_NS)
    seq = re.findall(r'\d{3}\s*=>\s*([^<]+)', desc)
    
    for stop_name in seq:
        stop_name = stop_name.strip()
        snorm = normalize(stop_name)
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
                
        if matched_id:
            # find the stop and update its name
            for s in stops:
                if s['stop_id'] == matched_id and s['stop_name'] != stop_name:
                    print(f"Updating {s['stop_name']} -> {stop_name}")
                    s['stop_name'] = stop_name
                    updated_stops += 1

print(f'Total updated stops: {updated_stops}')

with open(STOPS_JSON, 'w', encoding='utf-8') as f:
    json.dump(stops, f, indent=2)

TARGETS = [
    'c:/Users/User/Downloads/transjogja_skripsi/app/backend/data/stops.json',
    'c:/Users/User/Downloads/transjogja_skripsi/project-simple/public/data/stops.json'
]
for t in TARGETS:
    try:
        shutil.copy(STOPS_JSON, t)
    except:
        pass
print('Done!')
