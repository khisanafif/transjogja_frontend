import { useState, useEffect, Suspense, lazy } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { useAppStore } from '../store/appStore'
import { TypeBadge, RatingStars, POI_META } from '../components/shared'

const RouteDetail = lazy(() => import('../components/route_detail/RouteDetail'))

const NAV_LINKS = [
  { label: 'Wisata Populer', path: '#wisata' },
  { label: 'Cek Jadwal', path: '/jadwal' },
  { label: 'Lihat Rute',  path: '/rute' },
  { label: 'Tentang',     path: '/tentang' },
]

const STATS = [
  { value: '144', label: 'Destinasi Wisata', icon: '🏛' },
  { value: '273', label: 'Halte Tercakup',   icon: '🚏' },
  { value: '20',  label: 'Koridor Rute',     icon: '🗺' },
  { value: '156', label: 'Titik Transfer',   icon: '🔄' },
]

const FEATURES = [
  {
    icon: '🗺',
    title: 'Cari & Rekomendasi Wisata',
    desc: 'Sistem hitung rute Trans Jogja terbaik ke destinasi wisata secara otomatis dari halte terdekatmu.',
    path: '/map', cta: 'Buka Peta', primary: true,
    badge: 'Fitur Utama',
  },
  {
    icon: '📅',
    title: 'Planner Sehari',
    desc: 'Masukkan jam mulai dan selesai — sistem susun itinerary lengkap dengan estimasi waktu perjalanan.',
    path: '/planner', cta: 'Rencanakan', primary: true,
    badge: 'Populer',
  },
  {
    icon: '🕐',
    title: 'Cek Jadwal Bus',
    desc: 'Lihat jadwal keberangkatan Trans Jogja per halte berdasarkan data historis.',
    path: '/jadwal', cta: 'Cek Jadwal', primary: false,
  },
  {
    icon: '🚌',
    title: 'Lihat Koridor Rute',
    desc: 'Jelajahi 20 koridor Trans Jogja, urutan halte, dan titik transfer yang tersedia.',
    path: '/rute', cta: 'Lihat Rute', primary: false,
  },
]

const HOW_STEPS = [
  { step: '01', icon: '📍', title: 'Pilih Titik Kumpul / Asal', desc: 'Sistem menggunakan halte Trans Jogja sebagai titik simulasi perjalanan Anda.' },
  { step: '02', icon: '⚡', title: 'Hitung Rute Otomatis', desc: 'Algoritma SSSP mencari jalur optimal ke semua 144 destinasi wisata dalam <50ms.' },
  { step: '03', icon: '🎯', title: 'Rekomendasi Terbaik', desc: 'Destinasi diurutkan berdasarkan ETA, rating, dan jam buka operasional hari ini.' },
]

const POI_TYPES = [
  { icon: '🏛', label: 'Budaya & Sejarah', color: '#F5F3FF', text: '#6D28D9' },
  { icon: '🖼', label: 'Museum',           color: '#EEF2FF', text: '#4338CA' },
  { icon: '🎡', label: 'Wisata Buatan',    color: '#FFFBEB', text: '#B45309' },
  { icon: '🌿', label: 'Agrowisata',       color: '#ECFDF5', text: '#047857' },
  { icon: '🕌', label: 'Religi',           color: '#FEF2F2', text: '#B91C1C' },
  { icon: '💧', label: 'Wisata Air',       color: '#F0F9FF', text: '#0369A1' },
  { icon: '🍜', label: 'Kuliner',          color: '#FFF7ED', text: '#C2410C' },
]

export default function Landing() {
  const nav = useNavigate()
  const { setTargetDestination } = useAppStore()

  const [pois, setPois] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [displayLimit, setDisplayLimit] = useState(8)
  const [selectedPoi, setSelectedPoi] = useState(null)

  useEffect(() => {
    api.getPoi().then(res => {
      const sorted = res.sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
      setPois(sorted)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    setDisplayLimit(8)
  }, [searchQuery])

  const filteredPois = pois.filter(p => 
    p.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const displayedPois = filteredPois.slice(0, displayLimit)

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <div onClick={() => nav('/')} className="flex items-center gap-2.5 flex-shrink-0 cursor-pointer">
            <div className="w-8 h-8 bg-brand-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-sm">🚌</span>
            </div>
            <span className="text-sm font-bold text-slate-900 hidden sm:block">TransJogja Tourism</span>
          </div>
          <div className="flex-1" />
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(l => (
              <button key={l.path} onClick={() => {
                if (l.path.startsWith('#')) {
                  const el = document.getElementById(l.path.substring(1));
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                } else {
                  nav(l.path);
                }
              }}
                className="btn-ghost text-xs px-3 py-2">{l.label}</button>
            ))}
          </div>
          <button onClick={() => nav('/map')} className="btn-primary text-xs px-4 py-2">
            Mulai Sekarang
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-brand-900 pt-16">
        {/* Background texture */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.03%22%3E%3Ccircle%20cx%3D%221.5%22%20cy%3D%221.5%22%20r%3D%221.5%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-60" />
        {/* Gradient orbs */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-brand-400/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-24 grid lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-brand-600/20 border border-brand-500/30 text-brand-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-pulse" />
              Sistem Rekomendasi Wisata Trans Jogja
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight tracking-tight mb-6">
              Jelajahi Jogja<br />
              <span className="text-brand-400">Lebih Cerdas</span><br />
              <span className="text-slate-300">dengan Trans Jogja</span>
            </h1>
            <p className="text-slate-400 text-base leading-relaxed mb-8 max-w-lg">
              Temukan destinasi wisata terbaik yang bisa kamu capai dengan bus kota Trans Jogja — lengkap dengan rute, estimasi waktu, dan panduan perjalanan step-by-step.
            </p>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => nav('/map')} className="btn-primary px-6 py-3 text-sm">
                🗺 Cari Wisata Sekarang
              </button>
              <button onClick={() => nav('/planner')} className="btn-secondary px-6 py-3 text-sm bg-white/10 border-white/20 text-white hover:bg-white/20">
                📅 Buat Itinerary
              </button>
            </div>
          </div>

          {/* Right — decorative stats card */}
          <div className="hidden lg:block animate-slide-up">
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-3xl p-6 space-y-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Cakupan Sistem</p>
              <div className="grid grid-cols-2 gap-3">
                {STATS.map(s => (
                  <div key={s.label} className="bg-white/5 rounded-2xl p-4">
                    <div className="text-2xl mb-1">{s.icon}</div>
                    <div className="text-2xl font-bold text-white">{s.value}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="bg-brand-600/20 border border-brand-500/30 rounded-2xl p-4 mt-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 bg-brand-400 rounded-full animate-pulse" />
                  <span className="text-xs font-semibold text-brand-300">Algoritma SSSP</span>
                </div>
                <p className="text-xs text-slate-400">Rute optimal dihitung &lt;50ms dari halte mana pun</p>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-slate-500 text-xs flex flex-col items-center gap-2 animate-bounce">
          <span>Gulir ke bawah</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
        </div>
      </section>

      {/* ── Popular Destinations ── */}
      <section id="wisata" className="py-24 px-4 sm:px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-3">Jelajahi</p>
              <h2 className="section-title">Destinasi Wisata Populer</h2>
            </div>
            <div className="w-full md:w-72 relative">
              <input 
                type="text" 
                placeholder="Cari nama wisata..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="input w-full pl-10"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {displayedPois.map(poi => (
              <div key={poi.poi_id} onClick={() => setSelectedPoi(poi)} className="card p-0 overflow-hidden cursor-pointer group hover:-translate-y-1 hover:shadow-card-hover transition-all flex flex-col h-full">
                <div className="h-40 bg-slate-200 relative flex-shrink-0">
                  {poi.image ? (
                    <img src={poi.image} alt={poi.name} className="w-full h-full object-cover" />
                  ) : (
                    <img src={`https://placehold.co/600x400/e2e8f0/64748b?text=${encodeURIComponent(poi.name)}`} alt={poi.name} className="w-full h-full object-cover" />
                  )}
                  <div className="absolute top-3 left-3">
                    <TypeBadge type={poi.type} />
                  </div>
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="text-sm font-bold text-slate-900 mb-1 line-clamp-1 group-hover:text-brand-600 transition-colors">{poi.name}</h3>
                  <RatingStars rating={poi.rating} />
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed flex-1">{poi.description || 'Destinasi wisata di Yogyakarta.'}</p>
                </div>
              </div>
            ))}
            
            {displayedPois.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-500">
                <div className="text-4xl mb-3">🔍</div>
                <p>Tidak ada destinasi wisata yang cocok dengan pencarianmu.</p>
              </div>
            )}
          </div>
          
          {filteredPois.length > displayLimit && (
            <div className="mt-10 text-center">
              <button onClick={() => setDisplayLimit(d => d + 8)} className="btn-secondary px-8 py-3 bg-white">
                Tampilkan Lebih Banyak
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 px-4 sm:px-6 bg-surface-2">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-3">Fitur</p>
            <h2 className="section-title mb-4">Semua yang Kamu Butuhkan</h2>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              Dari rekomendasi otomatis hingga planner sehari — satu platform untuk semua kebutuhanmu.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map(f => (
              <div
                key={f.path}
                onClick={() => nav(f.path)}
                className={`relative rounded-2xl p-6 cursor-pointer transition-all duration-200 group ${
                  f.primary
                    ? 'bg-brand-600 text-white hover:bg-brand-700 hover:shadow-lg hover:-translate-y-0.5'
                    : 'bg-white border border-slate-100 hover:border-slate-200 hover:shadow-card-hover hover:-translate-y-0.5'
                }`}
              >
                {f.badge && (
                  <span className={`absolute top-4 right-4 text-2xs font-bold px-2 py-0.5 rounded-full ${
                    f.primary ? 'bg-white/20 text-white' : 'bg-brand-50 text-brand-700'
                  }`}>{f.badge}</span>
                )}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-4 ${
                  f.primary ? 'bg-white/15' : 'bg-slate-50'
                }`}>{f.icon}</div>
                <h3 className={`text-sm font-bold mb-2 ${f.primary ? 'text-white' : 'text-slate-900'}`}>
                  {f.title}
                </h3>
                <p className={`text-xs leading-relaxed ${f.primary ? 'text-brand-100' : 'text-slate-500'}`}>
                  {f.desc}
                </p>
                <p className={`text-xs font-semibold mt-4 flex items-center gap-1 ${
                  f.primary ? 'text-white' : 'text-brand-600'
                }`}>
                  {f.cta}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-3">Cara Kerja</p>
            <h2 className="section-title mb-4">Tiga Langkah Mudah</h2>
          </div>
          <div className="relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-10 left-[calc(16.67%-0.5px)] right-[calc(16.67%-0.5px)] h-px bg-gradient-to-r from-slate-200 via-brand-300 to-slate-200" />
            <div className="grid md:grid-cols-3 gap-8">
              {HOW_STEPS.map((s, i) => (
                <div key={s.step} className="text-center relative">
                  <div className="w-20 h-20 rounded-2xl bg-slate-50 border-2 border-slate-100 flex flex-col items-center justify-center mx-auto mb-5 relative z-10">
                    <span className="text-2xl">{s.icon}</span>
                    <span className="text-2xs font-bold text-slate-400 mt-1">{s.step}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-2">{s.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── POI Types ── */}
      <section className="py-20 px-4 sm:px-6 bg-surface-2">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-3">Kategori Wisata</p>
            <h2 className="section-title">Jelajahi Berbagai Kategori</h2>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {POI_TYPES.map(t => (
              <button key={t.label} onClick={() => nav('/map')}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl border border-slate-100 bg-white hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200"
                style={{ '--hover-bg': t.color }}>
                <span className="text-lg">{t.icon}</span>
                <span className="text-sm font-semibold text-slate-700">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── About section ── */}
      <section className="py-24 px-4 sm:px-6 bg-white" id="tentang">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-3">Tentang Program</p>
              <h2 className="section-title mb-5">Tugas Akhir Penelitian</h2>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">
                Sistem ini merupakan purwarupa penelitian tugas akhir yang mengembangkan <strong className="text-slate-700">sistem rekomendasi destinasi wisata berbasis web</strong> terintegrasi rute Trans Jogja, menggunakan metodologi CRISP-DM dan algoritma estimasi ETA berbasis data historis.
              </p>
              <div className="space-y-3">
                {[
                  ['Peneliti', 'Khisan Afif Ainur Rohim'],
                  ['NIM', '222410102075'],
                  ['Program Studi', 'Teknologi Informasi'],
                  ['Fakultas', 'Ilmu Komputer'],
                  ['Universitas', 'Universitas Jember'],
                  ['Tahun', '2026'],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-3 text-sm">
                    <span className="w-32 text-slate-400 flex-shrink-0">{k}</span>
                    <span className="font-medium text-slate-800">{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              {[
                { icon: '🏗', title: 'CRISP-DM Methodology', desc: 'Business Understanding → Data Understanding → Data Preparation → Modeling → Evaluation → Deployment' },
                { icon: '⚡', title: 'SSSP Dijkstra Routing', desc: '1 run Dijkstra mencakup 144 POI dalam <50ms. Transit same-stop only.' },
                { icon: '📊', title: 'ETA 3-Level Fallback', desc: 'Exact segment → Route average → Global default 3.0 menit' },
                { icon: '🔒', title: 'Data Transparan', desc: 'ETA berbasis data historis jadwal Trans Jogja dari Moovit, bukan real-time GPS.' },
              ].map(t => (
                <div key={t.title} className="card p-4 flex gap-4">
                  <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-lg flex-shrink-0">{t.icon}</div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 mb-0.5">{t.title}</p>
                    <p className="text-xs text-slate-500 leading-relaxed">{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className="py-20 px-4 sm:px-6 bg-gradient-to-br from-brand-600 to-brand-800">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold text-white mb-4 tracking-tight">
            Siap jelajahi Yogyakarta?
          </h2>
          <p className="text-brand-200 text-sm mb-8">
            Temukan destinasi wisata yang bisa kamu capai hari ini dengan Trans Jogja.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button onClick={() => nav('/map')} className="btn-secondary px-8 py-3 text-sm">
              🗺 Buka Peta Wisata
            </button>
            <button onClick={() => nav('/planner')} className="px-8 py-3 bg-white/15 border border-white/25 text-white text-sm font-semibold rounded-xl hover:bg-white/25 transition-all">
              📅 Rencanakan Hari Ini
            </button>
          </div>
        </div>
      </section>

      {/* ── Disclaimer ── */}
      <section className="py-8 px-4 sm:px-6 bg-amber-50 border-t border-amber-100">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs text-amber-800 text-center leading-relaxed">
            <strong>⚠ Catatan Penggunaan:</strong> ETA dihitung dari data jadwal historis Trans Jogja — bukan real-time GPS armada. Waktu aktual dapat berbeda tergantung kondisi lalu lintas. Jam operasional sebagian destinasi belum terverifikasi web — selalu konfirmasi sebelum berangkat.
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-950 text-slate-400 py-12 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center text-sm">🚌</div>
                <span className="text-sm font-bold text-white">TransJogja Tourism</span>
              </div>
              <p className="text-xs leading-relaxed">Sistem rekomendasi wisata terintegrasi rute Trans Jogja berbasis CRISP-DM dan algoritma ETA historis.</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">Fitur</p>
              {[['Cari Wisata','/map'],['Planner','/planner'],['Cek Jadwal','/jadwal'],['Lihat Rute','/rute']].map(([l,p])=>(
                <button key={p} onClick={()=>nav(p)} className="block text-xs hover:text-white transition-colors mb-2">{l}</button>
              ))}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">Kredit Data</p>
              <p className="text-xs mb-1">Halte & Rute: Trans Jogja / Dishub DIY</p>
              <p className="text-xs mb-1">Jadwal historis: Moovit</p>
              <p className="text-xs mb-1">Peta: OpenStreetMap contributors</p>
              <p className="text-xs">Dataset wisata: Publik</p>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-xs">© 2026 Khisan Afif Ainur Rohim · 222410102075 · FKOM Universitas Jember</p>
            <p className="text-xs">Tugas Akhir Program Studi Teknologi Informasi</p>
          </div>
        </div>
      </footer>

      {/* ── Modals ── */}
      {selectedPoi && (
        <Suspense fallback={null}>
          <RouteDetail 
            poi={selectedPoi} 
            onClose={() => setSelectedPoi(null)} 
            onCariRute={(p) => {
              setTargetDestination(p)
              nav('/map')
            }}
          />
        </Suspense>
      )}
    </div>
  )
}
