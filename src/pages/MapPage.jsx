import { useState, useEffect, useRef, Suspense, lazy, Component } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { api } from '../services/api'
import { OriginPanel, FilterPanel, RecommendList } from '../components/sidebar'
import { Spinner } from '../components/shared'

const MapView     = lazy(() => import('../components/map/MapView'))
const RouteDetail = lazy(() => import('../components/route_detail/RouteDetail'))

class MapErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { crashed: false } }
  static getDerivedStateFromError() { return { crashed: true } }
  render() {
    if (this.state.crashed) return (
      <div className="w-full h-full flex items-center justify-center bg-slate-100">
        <div className="text-center p-8">
          <div className="text-4xl mb-3">🗺</div>
          <p className="text-sm font-semibold text-slate-700">Peta tidak dapat dimuat</p>
          <p className="text-xs text-slate-400 mt-1 mb-4">Periksa koneksi internet Anda</p>
          <button onClick={() => this.setState({ crashed: false })} className="btn-primary text-xs">
            Coba lagi
          </button>
        </div>
      </div>
    )
    return this.props.children
  }
}

export default function MapPage() {
  const nav = useNavigate()
  const {
    originStop, originWalkMin, departHhmm, weekday,
    filters, setOrigin,
    recommendations, setRecommendations,
    loadingRec, setLoadingRec,
    recError, setRecError,
    targetDestination, setTargetDestination,
  } = useAppStore()

  const [allStops, setAllStops]           = useState([])
  const [allPois, setAllPois]             = useState([])
  const [routesGeoJSON, setRoutesGeoJSON] = useState(null)
  const [userPos, setUserPos]             = useState(null)
  const [selectedPoi, setSelectedPoi]     = useState(null)
  const [sidebarTab, setSidebarTab]       = useState('recs')
  const [sidebarOpen, setSidebarOpen]     = useState(true)
  const abortRef = useRef(null)

  useEffect(() => {
    api.getStops().then(setAllStops).catch(() => {})
    api.getPoi().then(setAllPois).catch(() => {})
    api.getRoutesGeoJSON().then(setRoutesGeoJSON).catch(() => {})
    return () => abortRef.current?.abort()
  }, [])

  async function search() {
    if (!originStop) {
      setRecError('Pilih halte asal terlebih dahulu')
      setSidebarTab('search'); setSidebarOpen(true)
      return
    }
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setLoadingRec(true); setRecError(null)
    try {
      if (targetDestination) {
        const res = await api.routeTo({
          origin_stop_id:  originStop.stop_id,
          origin_walk_min: originWalkMin || 0,
          depart_hhmm:     departHhmm,
          dest_poi_id:     targetDestination.poi_id
        })
        if (res.found) {
          const resultPoi = { ...targetDestination, ...res }
          setRecommendations([resultPoi])
          setSelectedPoi(resultPoi)
          if (window.innerWidth < 768) setSidebarOpen(false)
        } else {
          setRecError(res.message || 'Tidak ada rute ke destinasi ini')
          setRecommendations([])
        }
      } else {
        const res = await api.recommend({
          origin_stop_id:  originStop.stop_id,
          origin_walk_min: originWalkMin || 0,
          depart_hhmm:     departHhmm,
          weekday, filters, limit: 20,
        })
        setRecommendations(res.results || [])
        if (!(res.results || []).length)
          setRecError('Tidak ada destinasi ditemukan. Coba longgarkan filter atau ubah jam.')
      }
    } catch (e) {
      if (e.name !== 'AbortError')
        setRecError(e.message || 'Gagal memuat rute')
    } finally { setLoadingRec(false) }
  }

  function handleOriginSet(stop, walkMin, pos) {
    setOrigin(stop, walkMin)
    if (pos) setUserPos(pos)
  }

  function handleSearch() { search(); setSidebarTab('recs') }

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
            <span className="text-white text-xs">🚌</span>
          </div>
          <span className="text-sm font-bold text-slate-900 hidden sm:block">Cari Wisata</span>
        </div>

        {originStop && (
          <div className="hidden sm:flex items-center gap-1.5 bg-brand-50 border border-brand-200 rounded-full px-3 py-1 text-xs font-medium text-brand-700 max-w-[200px]">
            <span className="flex-shrink-0">📍</span>
            <span className="truncate">{originStop.name}</span>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {originStop && (
            <button onClick={handleSearch} disabled={loadingRec}
              className="btn-primary text-xs px-3.5 py-2">
              {loadingRec ? <Spinner size="sm" /> : '🔍 Cari'}
            </button>
          )}
          <button onClick={() => setSidebarOpen(v => !v)}
            className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>
            </svg>
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col-reverse md:flex-row overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <div className="w-full h-1/2 md:h-auto md:w-80 xl:w-96 flex-shrink-0 flex flex-col bg-white border-r border-slate-100 overflow-hidden shadow-sm">
            {selectedPoi ? (
              <Suspense fallback={<div className="p-8 flex justify-center"><Spinner size="md" /></div>}>
                <RouteDetail
                  poi={selectedPoi}
                  isModal={false}
                  onClose={() => { setSelectedPoi(null) }}
                  onAddToPlanner={() => { nav('/planner'); setSelectedPoi(null) }}
                />
              </Suspense>
            ) : (
              <>
                {/* Tab switcher */}
                <div className="flex border-b border-slate-100 flex-shrink-0 px-1 pt-1">
                  <button onClick={() => setSidebarTab('recs')}
                    className={`flex-1 py-2.5 text-xs font-semibold rounded-t-lg transition-all ${
                      sidebarTab === 'recs' ? 'bg-brand-600 text-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}>
                    {targetDestination ? 'Hasil Rute' : 'Rekomendasi'}
                  </button>
                  <button onClick={() => setSidebarTab('search')}
                    className={`flex-1 py-2.5 text-xs font-semibold rounded-t-lg transition-all ${
                      sidebarTab === 'search' ? 'bg-brand-600 text-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}>
                    Pengaturan
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {targetDestination && (
                    <div className="bg-brand-50 border border-brand-200 rounded-xl p-3 flex items-start gap-3 relative">
                      <div className="text-xl">🎯</div>
                      <div className="flex-1 min-w-0 pr-6">
                        <p className="text-2xs font-bold text-brand-600 uppercase tracking-wider mb-0.5">Tujuan Spesifik</p>
                        <p className="text-sm font-semibold text-slate-800 line-clamp-1">{targetDestination.name}</p>
                      </div>
                      <button onClick={() => { setTargetDestination(null); setRecommendations([]); setSelectedPoi(null) }}
                        className="absolute top-3 right-3 text-brand-400 hover:text-brand-600 transition-colors">
                        ✕
                      </button>
                    </div>
                  )}

                  {sidebarTab === 'search' ? (
                    <>
                      <OriginPanel allStops={allStops} onOriginSet={handleOriginSet} />
                      {!targetDestination && (
                        <>
                          <hr className="divider" />
                          <FilterPanel />
                        </>
                      )}
                      <button onClick={handleSearch} disabled={loadingRec}
                        className="btn-primary w-full py-3">
                        {loadingRec ? <><Spinner size="sm" /> Mencari...</> : (targetDestination ? '🗺 Cari Rute' : '🔍 Cari Wisata')}
                      </button>
                    </>
                  ) : (
                    <>
                      {!originStop ? (
                        <button onClick={() => setSidebarTab('search')}
                          className="btn-primary w-full py-3">
                          📍 Pilih Titik Asal →
                        </button>
                      ) : !loadingRec && recommendations.length === 0 && !recError ? (
                        <button onClick={handleSearch} className="btn-primary w-full py-3">
                          {targetDestination ? '🗺 Cari Rute' : '🔍 Cari Wisata'}
                        </button>
                      ) : null}
                      <RecommendList
                        recs={recommendations}
                        loading={loadingRec}
                        error={recError}
                        onCardClick={(poi) => {
                          setSelectedPoi(poi)
                          setSidebarOpen(true) // Ensure sidebar stays open to show detail
                        }}
                        onRetry={handleSearch}
                      />
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Map */}
        <div className="flex-1 relative">
          <MapErrorBoundary>
            <Suspense fallback={
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 gap-4">
                <Spinner size="lg" />
                <p className="text-xs text-slate-400">Memuat peta Yogyakarta...</p>
              </div>
            }>
              <MapView
                stops={allStops}
                allPois={allPois}
                recommendations={recommendations}
                originStop={originStop}
                userPos={userPos}
                routesGeoJSON={routesGeoJSON}
                selectedPoi={selectedPoi}
                onStopClick={(s) => {
                  setOrigin(s, 0)
                  setSidebarTab('search')
                  setSidebarOpen(true)
                }}
                onPoiClick={(poi) => {
                  setSelectedPoi(poi)
                  if (window.innerWidth < 768) setSidebarOpen(false)
                }}
              />
            </Suspense>
          </MapErrorBoundary>

          {/* Collapsed sidebar button */}
          {!sidebarOpen && (
            <button onClick={() => setSidebarOpen(true)}
              className="absolute top-4 left-4 bg-white shadow-card-hover rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-700 border border-slate-100 flex items-center gap-2 z-10 hover:bg-slate-50 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>
              </svg>
              Panel
            </button>
          )}

          {/* GPS Locate Me Button */}
          <button 
            onClick={async () => {
              try {
                const pos = await new Promise((res, rej) =>
                  navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 }))
                const lat = pos.coords.latitude; const lon = pos.coords.longitude;
                handleOriginSet(originStop, originWalkMin, [lat, lon])
                // Update originStop as well to nearest
                const nearest = await api.getNearestStops(lat, lon)
                if (nearest?.length) {
                  const s = { ...nearest[0], name: nearest[0].stop_name, stop_id: nearest[0].stop_id }
                  handleOriginSet(s, s.walk_time_min || 0, [lat, lon])
                }
              } catch (e) {
                console.error("GPS Error", e)
              }
            }}
            className="absolute bottom-6 right-4 z-10 w-12 h-12 bg-white rounded-full shadow-card-hover flex items-center justify-center text-brand-600 hover:bg-slate-50 border border-slate-100 transition-colors"
            title="Lokasi Saya"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="2" x2="12" y2="6"></line>
              <line x1="12" y1="18" x2="12" y2="22"></line>
              <line x1="4" y1="12" x2="8" y2="12"></line>
              <line x1="16" y1="12" x2="20" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>

      {/* Route detail drawer removed from here (now in sidebar) */}
    </div>
  )
}
