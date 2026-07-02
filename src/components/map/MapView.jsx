import { useEffect, useRef } from 'react'
import L from 'leaflet'
import {
  MapContainer, TileLayer, Marker, Popup,
  GeoJSON, Circle, useMap, Polyline
} from 'react-leaflet'
import { POI_COLORS, getRouteColor } from '../shared'

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const POI_COLOR_MAP = POI_COLORS()

function makePoiIcon(type) {
  const color = POI_COLOR_MAP[type] || POI_COLOR_MAP.default
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" width="24" height="32">
    <path d="M12 0C7.2 0 3 4.2 3 9c0 6.75 9 16 9 16s9-9.25 9-16C21 4.2 16.8 0 12 0z" fill="${color}" stroke="white" stroke-width="1.5"/>
    <circle cx="12" cy="9" r="4" fill="white" opacity="0.9"/>
  </svg>`
  return L.divIcon({
    html: svg, className: '',
    iconSize: [24, 32], iconAnchor: [12, 32], popupAnchor: [0, -34],
  })
}

function makeStopIcon() {
  return L.divIcon({
    html: `<div style="width:9px;height:9px;background:#10b981;border:2px solid white;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,.25)"></div>`,
    className: '', iconSize: [9, 9], iconAnchor: [4, 4],
  })
}

function makeUserIcon() {
  return L.divIcon({
    html: `<div style="width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(59,130,246,.6)"></div>`,
    className: '', iconSize: [16, 16], iconAnchor: [8, 8],
  })
}

function makeOriginIcon(name) {
  const short = (name || '').split(' ').slice(0, 2).join(' ')
  return L.divIcon({
    html: `<div style="background:#10b981;color:white;padding:3px 8px;border-radius:999px;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.2);max-width:160px;overflow:hidden;text-overflow:ellipsis">📍 ${short}</div>`,
    className: '', iconAnchor: [0, 0],
  })
}

function FlyTo({ pos }) {
  const map = useMap()
  const prevRef = useRef(null)
  useEffect(() => {
    if (pos && JSON.stringify(pos) !== JSON.stringify(prevRef.current)) {
      map.flyTo(pos, 15, { duration: 1.2 })
      prevRef.current = pos
    }
  }, [pos, map])
  return null
}

export default function MapView({
  stops = [],
  allPois = [],
  recommendations = [],
  originStop = null,
  userPos = null,
  routesGeoJSON = null,
  selectedPoi = null,
  onStopClick,
  onPoiClick,
}) {
  const center  = [-7.797, 110.370]
  const flyTarget = originStop?.lat ? [originStop.lat, originStop.lon]
    : userPos || null

  // Only show stops with valid coords
  const validStops = stops.filter(s => s.lat != null && s.lon != null)
  const poiSource = recommendations.length > 0 ? recommendations : allPois
  const validPoi  = poiSource.filter(p => p.lat != null && p.lon != null)

  const activeRouteIds = selectedPoi?.route_legs
    ?.filter(l => l.type === 'BUS')
    .map(l => l.route_id) || []

  let activeGeoJSON = null
  if (routesGeoJSON && activeRouteIds.length > 0) {
    activeGeoJSON = {
      ...routesGeoJSON,
      features: routesGeoJSON.features.filter(f => activeRouteIds.includes(f.properties.route_id))
    }
  }

  const walkLines = []
  if (selectedPoi?.route_legs) {
    const legs = selectedPoi.route_legs
    const lastLeg = legs[legs.length - 1]
    if (lastLeg?.type === 'WALK_END') {
      const fromStop = stops.find(s => s.stop_id === lastLeg.from_stop_id) || validStops.find(s => s.name === lastLeg.from_stop_name)
      if (fromStop) {
        walkLines.push([[fromStop.lat, fromStop.lon], [selectedPoi.lat, selectedPoi.lon]])
      }
    }
  }

  return (
    <MapContainer
      center={center}
      zoom={13}
      className="w-full h-full"
      zoomControl
      maxBounds={[
        [-8.3, 109.8], // Southwest bound
        [-7.4, 110.9]  // Northeast bound
      ]}
      maxBoundsViscosity={1.0}
      minZoom={10}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        maxZoom={19}
      />

      {flyTarget && <FlyTo pos={flyTarget} />}

      {/* Routes (subtle background) */}
      {routesGeoJSON && (
        <GeoJSON
          key="all-routes"
          data={routesGeoJSON}
          style={(feature) => ({
            color: selectedPoi ? '#cbd5e1' : getRouteColor(feature.properties.route_id),
            weight: selectedPoi ? 2 : 3,
            opacity: selectedPoi ? 0.3 : 0.6,
            interactive: false
          })}
        />
      )}

      {/* Active Route Highlight */}
      {activeGeoJSON && (
        <GeoJSON
          key={`active-routes-${selectedPoi.poi_id}-${activeRouteIds.join('-')}`}
          data={activeGeoJSON}
          style={(feature) => ({
            color: getRouteColor(feature.properties.route_id),
            weight: 6,
            opacity: 1,
            interactive: false
          })}
        />
      )}

      {/* Walking lines */}
      {walkLines.map((positions, i) => (
        <Polyline
          key={`walk-${i}`}
          positions={positions}
          pathOptions={{ color: '#3b82f6', weight: 4, dashArray: '8, 8', opacity: 0.8 }}
        />
      ))}

      {/* Stop markers – only when zoomed in enough */}
      <ZoomedMarkers stops={validStops} onStopClick={onStopClick} />

      {/* User location */}
      {userPos && (
        <>
          <Marker position={userPos} icon={makeUserIcon()}>
            <Popup><p className="text-xs font-medium">📡 Lokasi Anda</p></Popup>
          </Marker>
          <Circle
            center={userPos} radius={1200}
            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.04, weight: 1, dashArray: '4' }}
          />
        </>
      )}

      {/* Origin stop */}
      {originStop?.lat && (
        <Marker position={[originStop.lat, originStop.lon]} icon={makeOriginIcon(originStop.name)}>
          <Popup>
            <p className="text-xs font-medium">Halte Asal</p>
            <p className="text-xs text-gray-600">{originStop.name}</p>
          </Popup>
        </Marker>
      )}

      {/* POI recommendation markers */}
      {validPoi.map(poi => (
        <Marker
          key={poi.poi_id}
          position={[poi.lat, poi.lon]}
          icon={makePoiIcon(poi.type)}
          eventHandlers={{ click: () => onPoiClick?.(poi) }}
        >
          <Popup>
            <div className="text-xs max-w-[160px]">
              <p className="font-semibold leading-tight">{poi.name}</p>
              <p className="text-gray-500 mt-0.5">
                ⏱ {poi.eta_total_min?.toFixed(0)} mnt · ⭐ {poi.rating?.toFixed(1)}
              </p>
              <button
                className="mt-1.5 w-full bg-emerald-600 text-white px-2 py-1 rounded text-xs font-medium"
                onClick={() => onPoiClick?.(poi)}
              >
                Lihat rute →
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}

// Separate component so it can call useMap()
function ZoomedMarkers({ stops, onStopClick }) {
  const map = useMap()
  const [zoom, setZoom] = L.version ? [13, () => {}] : [13, () => {}]

  // Listen to zoom
  useEffect(() => {
    function onZoom() { /* trigger re-render if needed */ }
    map.on('zoomend', onZoom)
    return () => map.off('zoomend', onZoom)
  }, [map])

  // Only render stops at zoom >= 14 to avoid lag
  const currentZoom = map.getZoom?.() ?? 13
  if (currentZoom < 14) return null

  return stops.slice(0, 400).map(s => (
    <Marker
      key={s.stop_id}
      position={[s.lat, s.lon]}
      icon={makeStopIcon()}
      eventHandlers={{ click: () => onStopClick?.(s) }}
    >
      <Popup>
        <div className="text-xs">
          <p className="font-medium">{s.name || s.stop_id}</p>
          <button
            className="mt-1 text-emerald-600 underline text-xs"
            onClick={() => onStopClick?.(s)}
          >
            Berangkat dari sini
          </button>
        </div>
      </Popup>
    </Marker>
  ))
}
