import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { Spinner, ErrorBox, EmptyState, NavBar, getRouteColor } from '../components/shared'
import PlannerPanel from '../components/planner/PlannerPanel'

// ─────────────────────────────────────────────────────────────
// Schedule Page
// ─────────────────────────────────────────────────────────────
function SchedulePage() {
  const nav = useNavigate()
  const [allStops, setAllStops] = useState([])
  const [query, setQuery] = useState('')
  const [dropOpen, setDropOpen] = useState(false)
  const [selectedStop, setSelectedStop] = useState(null)
  const [dayType, setDayType] = useState('weekday')
  const [timeFilter, setTimeFilter] = useState('')
  const [schedule, setSchedule] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { api.getStops().then(setAllStops).catch(() => {}) }, [])

  const filtered = query.length > 1
    ? allStops.filter(s => s.name?.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : []

  async function load(stop, dt) {
    setLoading(true); setError(null); setSchedule(null)
    try { setSchedule(await api.getSchedule(stop.stop_id, dt)) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  function pickStop(s) {
    setSelectedStop(s); setQuery(s.name); setDropOpen(false); load(s, dayType)
  }

  function changeDayType(dt) {
    setDayType(dt)
    if (selectedStop) load(selectedStop, dt)
  }

  const nowMins = new Date().getHours() * 60 + new Date().getMinutes()

  return (
    <div className="min-h-screen bg-surface-2">
      <NavBar title="🕐 Cek Jadwal Trans Jogja" onBack={() => nav('/')} />

      <div className="max-w-xl mx-auto px-4 py-6 space-y-4">
        {/* Search */}
        <div>
          <label className="label">Nama Halte</label>
          <div className="relative">
            <input
              value={query}
              onChange={e => { setQuery(e.target.value); setDropOpen(true) }}
              onFocus={() => setDropOpen(true)}
              placeholder="Ketik nama halte..."
              className="input pr-10"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            {dropOpen && filtered.length > 0 && (
              <div className="absolute top-full mt-1.5 left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-card-hover z-20 max-h-52 overflow-y-auto animate-fade-in">
                {filtered.map(s => (
                  <button key={s.stop_id} onClick={() => pickStop(s)}
                    className="w-full text-left px-4 py-2.5 text-xs font-medium text-slate-800 hover:bg-slate-50 border-b border-slate-50 last:border-0 first:rounded-t-2xl last:rounded-b-2xl">
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Day toggle */}
        <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
          {[['weekday', '📅 Hari Kerja'], ['weekend', '🎉 Akhir Pekan']].map(([v, l]) => (
            <button key={v} onClick={() => changeDayType(v)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                dayType === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>{l}</button>
          ))}
        </div>

        {/* Time Filter */}
        <div className="animate-fade-in">
          <label className="label">Filter Waktu (opsional)</label>
          <input 
            type="time" 
            value={timeFilter}
            onChange={e => setTimeFilter(e.target.value)}
            className="input w-full"
          />
          <p className="text-2xs text-slate-400 mt-1 ml-1">Atur jam untuk menyembunyikan jadwal yang sudah lewat jauh.</p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-10">
            <div className="text-center">
              <Spinner size="lg" />
              <p className="text-xs text-slate-400 mt-3">Memuat jadwal...</p>
            </div>
          </div>
        )}

        {error && <ErrorBox message={error} onRetry={() => selectedStop && load(selectedStop, dayType)} />}

        {/* Schedule */}
        {schedule && !loading && (
          <div className="space-y-4 animate-fade-in">
            <div className="card p-4">
              <p className="text-base font-bold text-slate-900">{schedule.stop_name}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {dayType === 'weekend' ? 'Jadwal Akhir Pekan' : 'Jadwal Hari Kerja'} · Estimasi historis
              </p>
            </div>

            {schedule.routes?.length === 0 && (
              <EmptyState icon="🚌" title="Tidak ada jadwal" sub="Halte ini belum memiliki data jadwal" />
            )}

            {schedule.routes?.map(r => (
              <div key={r.route_id} className="card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div 
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: getRouteColor(r.route_id) }}
                    >
                      <span className="text-white text-xs font-bold">{r.route_id}</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Rute {r.route_id}</p>
                      {r.headway_avg_min && (
                        <p className="text-2xs text-slate-400">setiap ±{r.headway_avg_min} mnt</p>
                      )}
                    </div>
                  </div>
                  <span className="text-2xs text-slate-400">{r.departures.length} jadwal</span>
                </div>
                <div className="p-4 flex flex-wrap gap-1.5">
                  {(() => {
                    let filteredDeps = r.departures;
                    if (timeFilter) {
                      const [fh, fm] = timeFilter.split(':').map(Number);
                      const fMins = fh * 60 + fm;
                      filteredDeps = r.departures.filter(t => {
                        const [h, m] = t.split(':').map(Number);
                        return (h * 60 + m) >= fMins - 15;
                      });
                    }
                    if (filteredDeps.length === 0) {
                      return <p className="text-xs text-slate-400 italic">Tidak ada jadwal untuk jam ini.</p>;
                    }
                    return filteredDeps.map(t => {
                      const [h, m] = t.split(':').map(Number)
                      const mins = h * 60 + m
                      const isNext = mins >= nowMins && mins < nowMins + 25
                      const isPast = mins < nowMins - 3
                      return (
                        <span key={t} className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                          isNext ? 'bg-brand-600 text-white shadow-sm scale-105'
                          : isPast ? 'bg-slate-100 text-slate-400'
                          : 'bg-slate-100 text-slate-700'
                        }`}>{t}</span>
                      )
                    })
                  })()}
                </div>
              </div>
            ))}

            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
              <p className="text-xs text-amber-700">
                ⚠ Jadwal ini <strong>estimasi</strong> dari data historis. Waktu aktual dapat berbeda.
              </p>
            </div>
          </div>
        )}

        {!selectedStop && !loading && (
          <EmptyState
            icon="🚏"
            title="Pilih halte terlebih dahulu"
            sub="Ketik nama halte di kolom pencarian di atas untuk melihat jadwal keberangkatan"
          />
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Route Page
// ─────────────────────────────────────────────────────────────
function RoutePage() {
  const nav = useNavigate()
  const [routes, setRoutes] = useState([])
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { api.getRoutesList().then(setRoutes).catch(() => {}) }, [])

  async function loadDetail(rd) {
    setSelected(rd); setLoading(true)
    try { setDetail(await api.getRouteDetail(rd)) }
    catch { setDetail(null) }
    finally { setLoading(false) }
  }

  const grouped = routes.reduce((acc, r) => {
    const key = r.route_id
    if (!acc[key]) acc[key] = []
    acc[key].push(r)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-surface-2">
      <NavBar title="🚌 Koridor Rute Trans Jogja" onBack={() => nav('/')} />

      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="grid md:grid-cols-5 gap-4">
          {/* Route list */}
          <div className="md:col-span-2 space-y-2">
            <p className="label mb-3">Pilih Koridor</p>
            {Object.entries(grouped).map(([rid, dirs]) => (
              <div key={rid} className="space-y-1">
                {dirs.map(r => (
                  <button key={r.route_dir} onClick={() => loadDetail(r.route_dir)}
                    className={`w-full text-left rounded-2xl p-3.5 border transition-all duration-150 ${
                      selected === r.route_dir
                        ? 'bg-brand-600 border-brand-600 shadow-sm'
                        : 'bg-white border-slate-100 hover:border-brand-300 hover:shadow-card'
                    }`}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={selected === r.route_dir ? { backgroundColor: getRouteColor(r.route_id), color: 'white' } : { backgroundColor: getRouteColor(r.route_id) + '20', color: getRouteColor(r.route_id) }}
                      >{r.route_id}</div>
                      <div className="min-w-0">
                        <p className={`text-xs font-bold ${selected === r.route_dir ? 'text-white' : 'text-slate-800'}`}>
                          Rute {r.route_id} · Arah {r.direction_id === '0' ? 'A' : 'B'}
                        </p>
                        <p className={`text-2xs mt-0.5 truncate ${selected === r.route_dir ? 'text-brand-100' : 'text-slate-400'}`}>
                          {r.total_stops} halte
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Detail */}
          <div className="md:col-span-3">
            {loading && (
              <div className="card p-8 flex justify-center">
                <Spinner size="lg" />
              </div>
            )}
            {detail && !loading && (
              <div className="card overflow-hidden animate-fade-in">
                <div className="px-5 py-4 border-b border-slate-100" style={{ backgroundColor: getRouteColor(detail.route_id) + '15' }}>
                  <p className="text-base font-bold" style={{ color: getRouteColor(detail.route_id) }}>Rute {detail.route_id}</p>
                  <p className="text-xs text-brand-600 mt-0.5">
                    Arah {detail.direction_id === '0' ? 'A' : 'B'} · {detail.total_stops} halte
                  </p>
                </div>
                <div className="p-5 max-h-[60vh] overflow-y-auto">
                  <div className="space-y-0">
                    {detail.stops.map((s, i) => {
                      const isEndpoint = i === 0 || i === detail.stops.length - 1
                      return (
                        <div key={s.stop_id} className="flex gap-3 items-start">
                          <div className="flex flex-col items-center flex-shrink-0 w-5">
                            <div className={`w-3 h-3 rounded-full border-2 mt-1 flex-shrink-0 ${
                              isEndpoint ? 'bg-brand-600 border-brand-600' : 'bg-white border-slate-300'
                            }`} />
                            {i < detail.stops.length - 1 && (
                              <div className="w-0.5 flex-1 bg-slate-200 my-0.5 min-h-[16px]" />
                            )}
                          </div>
                          <p className={`text-xs pb-3 leading-tight ${
                            isEndpoint ? 'font-bold text-slate-900' : 'text-slate-500'
                          }`}>
                            {s.stop_name || s.stop_id}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
            {!selected && !loading && (
              <div className="card p-8">
                <EmptyState
                  icon="🚌"
                  title="Pilih koridor"
                  sub="Klik salah satu koridor di sebelah kiri untuk melihat daftar halte"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Planner Page
// ─────────────────────────────────────────────────────────────
function PlannerPage() {
  const nav = useNavigate()
  return (
    <div className="min-h-screen bg-surface-2">
      <NavBar title="📅 Rencanakan Hari Ini" onBack={() => nav('/')} />
      <div className="max-w-xl mx-auto px-4 py-6">
        <div className="mb-4 p-4 bg-blue-50 border border-blue-100 rounded-2xl text-xs text-blue-700 leading-relaxed">
          💡 <strong>Tip:</strong> Pilih halte asal di halaman <strong>Cari Wisata</strong> terlebih dahulu, lalu kembali ke sini untuk merencanakan itinerary otomatis.
        </div>
        <PlannerPanel />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// About Page
// ─────────────────────────────────────────────────────────────
function AboutPage() {
  const nav = useNavigate()
  const TECH = [
    { icon: '⚡', name: 'FastAPI + Python', desc: 'Backend REST API, startup data loading, CORS, global error handling' },
    { icon: '🗺', name: 'React 18 + Vite', desc: 'Frontend SPA dengan lazy loading per route, code splitting otomatis' },
    { icon: '🌍', name: 'Leaflet + OpenStreetMap', desc: 'Peta interaktif dengan marker POI, jalur rute, dan animasi fly-to' },
    { icon: '🔄', name: 'SSSP Dijkstra', desc: 'Routing engine: 1 run covers 204 POI dalam <50ms, same-stop transit' },
    { icon: '📊', name: 'CRISP-DM Pipeline', desc: 'Business Understanding → Data Prep → Modeling → Evaluation → Deployment' },
    { icon: '⏱', name: 'ETA Historis 3-Level', desc: 'Exact segment → Route average → Global default 3.0 menit fallback' },
  ]
  const FEATURES = [
    { icon: '🗺', name: 'Peta Interaktif & Rekomendasi', desc: 'Cari wisata populer sesuai selera, dilengkapi dengan filter kategori dan urutan terbaik.' },
    { icon: '🎯', name: 'Cari Rute Spesifik', desc: 'Cari rute bus Trans Jogja tercepat untuk mengantar Anda ke destinasi dari posisi Anda saat ini.' },
    { icon: '📅', name: 'Rencana Perjalanan (Day Planner)', desc: 'Sistem otomatis menyusun jadwal itinerary seharian penuh yang mencocokkan jam buka wisata dan jadwal bus.' },
    { icon: '🕐', name: 'Informasi Jadwal & Rute', desc: 'Lihat perkiraan kedatangan bus dan peta jalur koridor secara detail.' },
  ]
  const DATA = [
    ['152', 'Destinasi wisata eligible (dalam 1.2km halte)'],
    ['53', 'POI dengan jam operasional terverifikasi web'],
    ['273', 'Halte berkoordinat (62 invalid difilter)'],
    ['519', 'Segmen ETA historis (MAE 0.12 menit)'],
    ['20', 'Route-direction koridor Trans Jogja'],
    ['164', 'Halte transfer-eligible (multi-rute)'],
  ]

  return (
    <div className="min-h-screen bg-surface-2">
      <NavBar title="📖 Tentang Program" onBack={() => nav('/')} />

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Hero card */}
        <div className="bg-gradient-to-br from-brand-600 to-brand-800 rounded-3xl p-8 text-white">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center text-2xl">🚌</div>
            <div>
              <p className="text-xs font-bold text-brand-200 uppercase tracking-widest mb-0.5">Tugas Akhir</p>
              <h1 className="text-lg font-extrabold leading-tight">Sistem Rekomendasi Wisata<br />Trans Jogja</h1>
            </div>
          </div>
          <p className="text-brand-100 text-sm leading-relaxed">
            Purwarupa sistem rekomendasi destinasi wisata berbasis web yang terintegrasi dengan rute Trans Jogja, menggunakan metodologi CRISP-DM dan algoritma estimasi ETA berbasis data jadwal historis.
          </p>
        </div>

        {/* Researcher info */}
        <div className="card p-6">
          <p className="label mb-4">Informasi Peneliti</p>
          <div className="space-y-3">
            {[
              ['Nama', 'Khisan Afif Ainur Rohim'],
              ['NIM', '222410102075'],
              ['Program Studi', 'Teknologi Informasi'],
              ['Fakultas', 'Ilmu Komputer'],
              ['Universitas', 'Universitas Jember'],
              ['Pembimbing', 'Saiful Bukhori'],
              ['Tahun', '2026'],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-4">
                <span className="w-28 text-xs text-slate-400 flex-shrink-0 pt-0.5">{k}</span>
                <span className="text-xs font-semibold text-slate-800">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Features info */}
        <div>
          <p className="label mb-3">Panduan Fitur Utama</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {FEATURES.map(t => (
              <div key={t.name} className="card p-4 flex gap-3">
                <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center text-lg flex-shrink-0">{t.icon}</div>
                <div>
                  <p className="text-xs font-bold text-slate-800">{t.name}</p>
                  <p className="text-2xs text-slate-500 mt-0.5 leading-relaxed">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tech stack */}
        <div>
          <p className="label mb-3">Teknologi yang Digunakan</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {TECH.map(t => (
              <div key={t.name} className="card p-4 flex gap-3">
                <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center text-lg flex-shrink-0">{t.icon}</div>
                <div>
                  <p className="text-xs font-bold text-slate-800">{t.name}</p>
                  <p className="text-2xs text-slate-500 mt-0.5 leading-relaxed">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Data stats */}
        <div>
          <p className="label mb-3">Data Pipeline</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {DATA.map(([val, lbl]) => (
              <div key={lbl} className="card p-4 text-center">
                <p className="text-2xl font-extrabold text-brand-600">{val}</p>
                <p className="text-2xs text-slate-500 mt-1 leading-snug">{lbl}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
          <p className="text-xs font-bold text-amber-800 mb-2">⚠ Catatan Penggunaan</p>
          <ul className="space-y-1.5 text-xs text-amber-700 leading-relaxed">
            <li>• ETA dihitung dari data jadwal historis Trans Jogja — bukan real-time GPS armada</li>
            <li>• Waktu aktual dapat berbeda tergantung kondisi lalu lintas dan keandalan armada</li>
            <li>• Jam operasional 63 destinasi belum terverifikasi — konfirmasi sebelum berangkat</li>
            <li>• Sistem ini merupakan purwarupa penelitian, bukan layanan komersial resmi</li>
          </ul>
        </div>

        {/* Data credits */}
        <div className="card p-5">
          <p className="label mb-3">Kredit Data</p>
          <div className="space-y-2 text-xs text-slate-600">
            {[
              ['Halte & Rute KML', 'Trans Jogja / Dinas Perhubungan DIY'],
              ['Jadwal historis', 'Moovit (scraping etis, publik)'],
              ['Peta & Tiles', 'OpenStreetMap contributors'],
              ['Dataset wisata', 'Dataset publik Wisata Jogja'],
              ['Jam operasional', 'Verifikasi web manual (Traveloka, Google, official)'],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-3">
                <span className="w-36 text-slate-400 flex-shrink-0">{k}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center pt-2">
          <button onClick={() => nav('/')} className="btn-primary px-8">← Kembali ke Beranda</button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Dispatcher
// ─────────────────────────────────────────────────────────────
const PAGES = {
  planner: PlannerPage,
  jadwal: SchedulePage,
  rute: RoutePage,
  tentang: AboutPage,
}

export default function OtherPages({ page }) {
  const Page = PAGES[page]
  if (!Page) return <div className="min-h-screen flex items-center justify-center text-slate-400">Halaman tidak ditemukan</div>
  return <Page />
}
