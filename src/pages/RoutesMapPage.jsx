import { useState, useEffect, Suspense, lazy, Component } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { Spinner, getRouteColor } from '../components/shared'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("RoutesMapPage crashed:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 text-red-600 bg-red-100 min-h-screen">
          <h1 className="text-2xl font-bold mb-4">Aplikasi Crash!</h1>
          <p className="font-mono text-sm">{this.state.error && this.state.error.toString()}</p>
          <pre className="mt-4 text-xs bg-red-50 p-4 rounded">{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const MapView = lazy(() => import('../components/map/MapView'))

function RoutesMapPage() {
  const nav = useNavigate()
  
  const [allStops, setAllStops] = useState([])
  const [routesGeoJSON, setRoutesGeoJSON] = useState(null)
  const [routesList, setRoutesList] = useState([])
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  
  const [expandedRouteId, setExpandedRouteId] = useState(null)
  const [activeDirection, setActiveDirection] = useState('0') // '0' or '1'
  const [routeDetail, setRouteDetail] = useState(null) // Holds stops for the active route_dir
  const [loadingDetail, setLoadingDetail] = useState(false)
  
  // Fetch initial data
  useEffect(() => {
    Promise.all([
      api.getStops().catch(() => []),
      api.getRoutesGeoJSON().catch(() => null),
      api.getRoutesList().catch(() => [])
    ]).then(([stops, geojson, rList]) => {
      setAllStops(stops)
      setRoutesGeoJSON(geojson)
      
      // Group routes by route_id
      const grouped = {}
      rList.forEach(r => {
        if (!grouped[r.route_id]) {
          grouped[r.route_id] = {
            route_id: r.route_id,
            directions: []
          }
        }
        grouped[r.route_id].directions.push(r)
      })
      
      // Sort: numeric first, then strings like L1
      const sorted = Object.values(grouped).sort((a, b) => {
        const numA = parseInt(a.route_id)
        const numB = parseInt(b.route_id)
        if (!isNaN(numA) && !isNaN(numB)) {
          if (numA === numB) return a.route_id.localeCompare(b.route_id)
          return numA - numB
        }
        if (!isNaN(numA)) return -1
        if (!isNaN(numB)) return 1
        return a.route_id.localeCompare(b.route_id)
      })
      
      setRoutesList(sorted)
      setLoading(false)
    })
  }, [])
  
  // When a route is expanded or direction changes, fetch its detail
  useEffect(() => {
    if (!expandedRouteId) {
      setRouteDetail(null)
      return
    }
    
    // Find the specific route_dir
    const group = routesList.find(g => g.route_id === expandedRouteId)
    if (!group) return
    
    // Fallback to first available direction if the requested one doesn't exist
    const dirObj = group.directions.find(d => d.direction_id === activeDirection) || group.directions[0]
    if (!dirObj) return
    
    const routeDir = dirObj.route_dir
    
    setLoadingDetail(true)
    api.getRouteDetail(routeDir)
      .then(detail => setRouteDetail(detail))
      .catch(e => console.error(e))
      .finally(() => setLoadingDetail(false))
      
  }, [expandedRouteId, activeDirection, routesList])
  
  const handleToggleAccordion = (routeId) => {
    if (expandedRouteId === routeId) {
      setExpandedRouteId(null)
    } else {
      setExpandedRouteId(routeId)
      setActiveDirection('0') // Default to direction 0 when opening a new route
    }
  }

  const activeGroup = routesList.find(g => g.route_id === expandedRouteId)
  const isolatedStops = routeDetail ? routeDetail.stops.map(s => s.stop_id) : null

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-100">
      {/* Top navbar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-100 flex items-center gap-3 px-4 h-14 flex-shrink-0 shadow-nav">
        <button onClick={() => nav('/')}
          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 transition-colors flex-shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </button>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-6 h-6 bg-brand-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs">🗺</span>
          </div>
          <span className="text-sm font-bold text-slate-900">Info Rute TransJogja</span>
        </div>
      </header>
      
      <div className="flex-1 flex flex-col-reverse md:flex-row overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <div className="w-full h-1/2 md:h-auto md:w-80 xl:w-96 flex-shrink-0 flex flex-col bg-white border-r border-slate-100 overflow-hidden shadow-sm z-20">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h2 className="text-sm font-bold text-slate-800">Daftar Rute</h2>
              <p className="text-xs text-slate-500 mt-1">Pilih rute untuk melihat jalur dan halte.</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loading ? (
                <div className="flex justify-center p-8"><Spinner size="md" /></div>
              ) : (
                routesList.map(group => {
                  const isExpanded = expandedRouteId === group.route_id
                  const color = getRouteColor(group.route_id)
                  
                  return (
                    <div key={group.route_id} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                      {/* Accordion Header */}
                      <button 
                        onClick={() => handleToggleAccordion(group.route_id)}
                        className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm text-white" style={{ backgroundColor: color }}>
                            {group.route_id}
                          </div>
                          <span className="font-semibold text-slate-800 text-sm">Rute {group.route_id}</span>
                        </div>
                        <div className={`transform transition-transform text-slate-400 ${isExpanded ? 'rotate-180' : ''}`}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </div>
                      </button>
                      
                      {/* Accordion Body */}
                      {isExpanded && (
                        <div className="bg-slate-50 border-t border-slate-100 flex flex-col h-[400px]">
                          {/* Direction Toggle */}
                          {group.directions.length > 1 && (
                            <div className="p-3 bg-white border-b border-slate-100 flex-shrink-0">
                              <div className="flex bg-slate-100 rounded-lg p-1">
                                {group.directions.map((dir, i) => (
                                  <button
                                    key={dir.direction_id}
                                    onClick={() => setActiveDirection(dir.direction_id)}
                                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${activeDirection === dir.direction_id ? 'bg-white shadow-sm text-brand-700' : 'text-slate-500 hover:text-slate-700'}`}
                                  >
                                    Arah {i + 1}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Stops List */}
                          <div className="flex-1 overflow-y-auto p-2">
                            {loadingDetail ? (
                              <div className="flex justify-center p-6"><Spinner size="sm" /></div>
                            ) : routeDetail?.stops ? (
                              <div className="relative pl-6 py-2">
                                {/* Vertical Line */}
                                <div className="absolute left-[11px] top-4 bottom-4 w-0.5" style={{ backgroundColor: color, opacity: 0.3 }}></div>
                                
                                {routeDetail.stops.map((stop, i) => (
                                  <div key={stop.stop_id + i} className="relative mb-4 last:mb-0">
                                    {/* Stop Dot */}
                                    <div className="absolute -left-[20px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white" style={{ backgroundColor: color, boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}></div>
                                    
                                    <p className="text-xs font-bold text-slate-800 leading-tight">{stop.stop_name}</p>
                                    
                                    {/* Passing Routes Badges */}
                                    {stop.passing_routes && stop.passing_routes.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1.5">
                                        {stop.passing_routes.filter(r => r !== group.route_id).map(r => (
                                          <span key={r} className="text-[10px] px-1.5 py-0.5 rounded text-white font-medium" style={{ backgroundColor: getRouteColor(r) }}>
                                            {r}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="p-4 text-center text-xs text-slate-500">Gagal memuat halte.</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
        
        {/* Map */}
        <div className="flex-1 relative">
          <Suspense fallback={
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 gap-4">
              <Spinner size="lg" />
            </div>
          }>
            <MapView
              stops={allStops}
              allPois={[]}
              recommendations={[]}
              routesGeoJSON={routesGeoJSON}
              isolatedRouteId={expandedRouteId}
              isolatedStops={isolatedStops}
              onStopClick={() => {}}
              onPoiClick={() => {}}
            />
          </Suspense>
          
          {/* Collapsed sidebar button */}
          {!sidebarOpen && (
            <button onClick={() => setSidebarOpen(true)}
              className="absolute top-4 left-4 bg-white shadow-card-hover rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-700 border border-slate-100 flex items-center gap-2 z-10 hover:bg-slate-50 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>
              </svg>
              Daftar Rute
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function RoutesMapPageWrapper() {
  return (
    <ErrorBoundary>
      <RoutesMapPage />
    </ErrorBoundary>
  )
}
