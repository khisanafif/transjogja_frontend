import json
import pandas as pd
import shutil

STOPS_JSON = 'c:/transjogja_frontend/public/data/stops.json'
KML_STOPS_CSV = 'c:/Users/User/Downloads/transjogja_skripsi/notebook/preprocessed/kml_stop_points.csv'

with open(STOPS_JSON, 'r', encoding='utf-8') as f:
    existing_stops = json.load(f)

name_to_id = {s['stop_name']: s['stop_id'] for s in existing_stops}
max_ht = max([int(s['stop_id'].replace('HT_', '')) for s in existing_stops if s['stop_id'].startswith('HT_')])

kml_stops = pd.read_csv(KML_STOPS_CSV)

new_stops = []
for _, row in kml_stops.iterrows():
    name = str(row['kml_stop_name']).strip()
    if name in name_to_id:
        sid = name_to_id[name]
    else:
        max_ht += 1
        sid = f'HT_{max_ht:03d}'
        name_to_id[name] = sid
        print(f'Added missing stop from KML: {name} -> {sid}')
        
    new_stops.append({
        'stop_id': sid,
        'stop_name': name,
        'lat': float(row['lat']),
        'lon': float(row['lon']),
        'name': name
    })

# sort by stop_id
new_stops = sorted(new_stops, key=lambda x: x['stop_id'])

with open(STOPS_JSON, 'w', encoding='utf-8') as f:
    json.dump(new_stops, f, indent=2)

print(f'\nTotal stops updated from {len(existing_stops)} to {len(new_stops)}')

# Now copy them to the other frontend
TARGET_DIR = 'c:/Users/User/Downloads/transjogja_skripsi/app/frontend/public/data/'
shutil.copy(STOPS_JSON, TARGET_DIR + 'stops.json')
print('Copied stops.json to app/frontend')
