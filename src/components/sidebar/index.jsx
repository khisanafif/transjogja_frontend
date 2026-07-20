import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '../../store/appStore'
import { api } from '../../services/api'
import { TypeBadge, OpenBadge, RatingStars, SkeletonCard, EmptyState, ErrorBox, Spinner, POI_META } from '../shared'

const WEEKDAYS = ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu']
const POI_TYPES = Object.keys(POI_META).filter(k => k !== 'default')

// ── OriginPanel ───────────────────────────────────────────────────────────────
export function OriginPanel({ allStops = [], onOriginSet }) {
  const { originStop, departHhmm, weekday, setDepartHhmm, setWeekday } = useAppStore()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError] = useState(null)
  const ref = useRef(null)

  const filtered = query.length > 1
    ? allStops.filter(s => (s.name || s.stop_name || '').toLowerCase().includes(query.toLowerCase())).slice(0, 7)
    : []

  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function useGPS() {
    setGpsLoading(true); setGpsError(null)
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 }))
      const nearest = await api.getNearestStops(pos.coords.latitude, pos.coords.longitude)
      if (nearest?.length) {
        const s = { ...nearest[0], name: nearest[0].stop_name, stop_id: nearest[0].stop_id }
        onOriginSet(s, s.walk_time_min || 0, [pos.coords.latitude, pos.coords.longitude])
        setQuery(s.name)
        setOpen(false)
      } else setGpsError('Tidak ada halte dalam 3 km')
    } catch { setGpsError('Lokasi tidak dapat diakses. Pilih halte manual.') }
    finally { setGpsLoading(false) }
  }

  return (
    <div className="space-y-4">
      {/* Stop picker */}
      <div>
        <label className="label">Berangkat dari</label>
        <div className="relative" ref={ref}>
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            placeholder="Cari nama halte..."
            className="input pr-10"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🚏</div>
          {open && filtered.length > 0 && (
            <div className="absolute top-full mt-1.5 left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-card-hover z-20 max-h-52 overflow-y-auto animate-fade-in">
              {filtered.map(s => (
                <button key={s.stop_id}
                  onClick={() => { onOriginSet(s, 0, null); setQuery(s.name || s.stop_name); setOpen(false) }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 first:rounded-t-2xl last:rounded-b-2xl">
                  <span className="font-medium text-slate-800 text-xs">{s.name || s.stop_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={useGPS} disabled={gpsLoading}
          className="mt-2 w-full flex items-center justify-center gap-2 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-xl py-2 transition-colors">
          {gpsLoading ? <Spinner size="sm" /> : <span>📡</span>}
          {gpsLoading ? 'Mendeteksi lokasi...' : 'Gunakan Lokasi GPS Saya'}
        </button>
        {gpsError && <p className="text-xs text-red-600 mt-1.5">{gpsError}</p>}
        {originStop && (
          <div className="mt-2 flex items-center gap-2 text-xs text-brand-700 bg-brand-50 rounded-xl px-3 py-2">
            <span>✅</span>
            <span className="font-medium truncate">{originStop.name || originStop.stop_name}</span>
          </div>
        )}
      </div>

      {/* Time & Day */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Berangkat</label>
          <input type="time" value={departHhmm} onChange={e => setDepartHhmm(e.target.value)}
            min="05:30" max="20:00" className="input" />
        </div>
        <div>
          <label className="label">Hari</label>
          <select value={weekday} onChange={e => setWeekday(e.target.value)} className="input appearance-none">
            {WEEKDAYS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>
      <button 
        onClick={() => {
          const now = new Date();
          const hh = String(now.getHours()).padStart(2, '0');
          const mm = String(now.getMinutes()).padStart(2, '0');
          setDepartHhmm(`${hh}:${mm}`);
          const dayIndex = now.getDay();
          const mappedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
          setWeekday(WEEKDAYS[mappedIndex]);
        }}
        className="mt-2 w-full flex items-center justify-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl py-2 transition-colors">
        🕒 Gunakan Waktu Saat Ini
      </button>
    </div>
  )
}

// ── FilterPanel ───────────────────────────────────────────────────────────────
export function FilterPanel() {
  const { filters, setFilters } = useAppStore()
  const types = filters.types || []

  function toggleType(t) {
    setFilters({ types: types.includes(t) ? types.filter(x => x !== t) : [...types, t] })
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="label">Tipe Wisata</label>
        <div className="flex flex-wrap gap-2">
          {POI_TYPES.map(t => {
            const m = POI_META[t]
            const active = types.includes(t)
            return (
              <button key={t} onClick={() => toggleType(t)}
                className={`chip text-2xs ${active ? 'chip-active' : 'chip-inactive'}`}
                style={active ? {} : { '--tw-border-opacity': 1 }}>
                {m.icon} {m.label}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label className="label flex justify-between">
          <span>Maks. ETA</span>
          <span className="font-bold text-brand-600 normal-case">{filters.max_eta_min} menit</span>
        </label>
        <input type="range" min={15} max={120} step={5} value={filters.max_eta_min}
          onChange={e => setFilters({ max_eta_min: +e.target.value })}
          className="w-full accent-brand-600 cursor-pointer" />
        <div className="flex justify-between text-2xs text-slate-400 mt-1">
          <span>15 mnt</span><span>120 mnt</span>
        </div>
      </div>

      <div>
        <label className="label flex justify-between">
          <span>Maks. Transfer</span>
          <span className="font-bold text-brand-600 normal-case">{filters.max_transfers}×</span>
        </label>
        <input type="range" min={0} max={4} step={1} value={filters.max_transfers}
          onChange={e => setFilters({ max_transfers: +e.target.value })}
          className="w-full accent-brand-600 cursor-pointer" />
        <div className="flex justify-between text-2xs text-slate-400 mt-1">
          <span>Langsung</span><span>4 transfer</span>
        </div>
      </div>
    </div>
  )
}

// ── RecommendCard ─────────────────────────────────────────────────────────────
export function RecommendCard({ rec, rank, onClick }) {
  const m = POI_META[rec.type] || POI_META.default
  return (
    <button onClick={() => onClick(rec)}
      className="w-full text-left card-hover p-4 animate-slide-up group">
      <div className="flex items-start gap-3">
        {/* Rank */}
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
          style={{ background: m.bg, color: m.text }}>
          {rank}
        </div>
        <div className="flex-1 min-w-0">
          {/* Name */}
          <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-brand-700 transition-colors">
            {rec.name}
          </p>
          {/* Type + Rating */}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <TypeBadge type={rec.type} />
            <RatingStars rating={rec.rating} />
          </div>
          {/* Stats row */}
          <div className="flex items-center gap-3 mt-2.5 flex-wrap">
            <div className="flex items-center gap-1 text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-1 rounded-lg">
              ⏱ {rec.eta_total_min?.toFixed(0)} mnt
            </div>
            <span className="text-xs text-slate-400">
              🚶 {rec.walk_dist_m?.toFixed(0)}m
            </span>
            {rec.transfers === 0
              ? <span className="text-xs font-medium text-blue-600">✓ Langsung</span>
              : <span className="text-xs text-amber-600">🔄 {rec.transfers}×</span>
            }
          </div>
          {/* Open badge */}
          <div className="mt-2">
            <OpenBadge needs_review={rec.needs_review} remaining_open_min={rec.remaining_open_min} />
          </div>
        </div>
        {/* Arrow */}
        <div className="text-slate-300 group-hover:text-brand-500 transition-colors mt-1 flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
        </div>
      </div>
    </button>
  )
}

// ── RecommendList ─────────────────────────────────────────────────────────────
export function RecommendList({ recs, loading, error, onCardClick, onRetry }) {
  if (loading) return <div className="space-y-3">{[1,2,3,4].map(i => <SkeletonCard key={i} />)}</div>
  if (error) return <ErrorBox message={error} onRetry={onRetry} />
  if (!recs?.length) return (
    <EmptyState
      icon="🗺"
      title="Belum ada rekomendasi"
      sub="Pilih halte asal dan klik Cari Wisata untuk memulai"
    />
  )
  return (
    <div className="space-y-2.5">
      {recs.map((r, i) => (
        <RecommendCard key={r.poi_id} rec={r} rank={i + 1} onClick={onCardClick} />
      ))}
      <p className="text-center text-2xs text-slate-400 pt-1">{recs.length} destinasi ditemukan</p>
    </div>
  )
}
