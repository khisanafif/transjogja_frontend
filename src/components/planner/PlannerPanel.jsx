import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/appStore'
import { api } from '../../services/api'
import { TypeBadge, OpenBadge, RatingStars, Spinner, ErrorBox, EmptyState, LegStep } from '../shared'

const WEEKDAYS = ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu']

function SearchableSelect({ options, value, onChange, placeholder }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  
  useEffect(() => {
    if (value) {
      const selected = options.find(o => o.value === value)
      if (selected) setQuery(selected.label)
    } else {
      setQuery('')
    }
  }, [value, options])

  const filtered = options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="relative w-full">
      <input 
        type="text"
        className="input w-full"
        placeholder={placeholder}
        value={query}
        onChange={e => {
          setQuery(e.target.value)
          setOpen(true)
          if (value) onChange('')
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filtered.map(o => (
            <div 
              key={o.value}
              className="px-3 py-2 text-sm cursor-pointer hover:bg-brand-50"
              onMouseDown={(e) => {
                e.preventDefault()
                setQuery(o.label)
                onChange(o.value)
                setOpen(false)
              }}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TimelineItem({ item, isLast }) {
  const [showLegs, setShowLegs] = useState(false)
  const nav = useNavigate()
  const { setSelectedPoi } = useAppStore()
  return (
    <div className="flex gap-4">
      {/* Connector */}
      <div className="flex flex-col items-center w-10 flex-shrink-0">
        <div className="w-10 h-10 rounded-2xl bg-brand-600 text-white text-sm font-bold flex items-center justify-center z-10 shadow-sm">
          {item.order}
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-slate-200 my-1.5 min-h-[24px]" />}
      </div>

      {/* Card */}
      <div className="flex-1 min-w-0 pb-6">
        {/* Travel time chip */}
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
          <span className="font-medium text-brand-600">🚌 {item.eta_from_prev_min?.toFixed(0)} mnt perjalanan</span>
          {item.transfers > 0 && <span>· 🔄 {item.transfers}×</span>}
        </div>
        {/* POI card */}
        <div className="card p-4 hover:shadow-card-hover transition-shadow">
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <TypeBadge type={item.type} />
                  <RatingStars rating={item.rating} />
                </div>
                <p className="text-sm font-bold text-slate-900 truncate">{item.name}</p>
                {item.htm_weekday && (
                  <p className="text-xs font-semibold text-emerald-600 mt-1">🎟 Rp {item.htm_weekday}</p>
                )}
              </div>
              {item.image && (
                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-slate-100 shadow-sm">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            
            <div className="flex justify-between items-center mt-3 bg-slate-50 rounded-lg p-2 border border-slate-100">
              <div className="flex gap-2 text-xs font-medium text-slate-600">
                <span>Tiba: <strong className="text-brand-600">{item.arrive_hhmm}</strong></span>
                <span>—</span>
                <span>Selesai: <strong className="text-slate-800">{item.depart_hhmm}</strong></span>
              </div>
              <span className="text-xs font-semibold bg-white px-2 py-1 rounded shadow-sm text-slate-600">{item.stay_min} mnt</span>
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
            <OpenBadge needs_review={item.needs_review} remaining_open_min={item.remaining_open_min} />
            <button onClick={() => setShowLegs(v => !v)}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
              {showLegs ? 'Sembunyikan' : 'Detail rute'}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                style={{ transform: showLegs ? 'rotate(180deg)' : 'none', transition: '.2s' }}>
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>
          </div>
          {showLegs && (
            <div className="mt-3 pt-4 border-t border-slate-100 animate-fade-in">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                {(item.route_legs || []).map((leg, i) => (
                  <LegStep key={i} leg={leg} isLast={i === (item.route_legs || []).length - 1} />
                ))}
              </div>
              <button 
                onClick={() => { setSelectedPoi(item); nav('/map'); }}
                className="w-full mt-3 py-2 bg-brand-50 text-brand-700 font-bold rounded-lg text-xs hover:bg-brand-100 transition-colors flex items-center justify-center gap-1">
                🗺️ Lihat Rute di Peta
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PlannerPanel() {
  const { originStop, originWalkMin, setOrigin, weekday, plannerMode: mode, setPlannerMode: setMode, manualTargets, addManualTarget, removeManualTarget } = useAppStore()
  const [departHhmm, setDepartHhmm] = useState('09:00')
  const [endHhmm, setEndHhmm] = useState('17:00')
  const [minStayMin, setMinStayMin] = useState(60)
  const [maxDest, setMaxDest] = useState(4)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const [pois, setPois] = useState([])
  const [stops, setStops] = useState([])
  const [selectedPoiId, setSelectedPoiId] = useState('')
  const [manualStayMin, setManualStayMin] = useState(60)

  useEffect(() => {
    api.getPoi().then(res => {
      // sort by name
      setPois(res.sort((a,b) => (a.name || '').localeCompare(b.name || '')))
    }).catch(console.error)
    api.getStops().then(res => {
      setStops(res.sort((a,b) => (a.name || a.stop_name || '').localeCompare(b.name || b.stop_name || '')))
    }).catch(console.error)
  }, [])

  async function plan() {
    if (!originStop) { setError('Pilih halte asal terlebih dahulu'); return }
    if (mode === 'manual' && manualTargets.length === 0) { setError('Tambahkan minimal 1 tempat wisata'); return }
    setLoading(true); setError(null); setResult(null)
    try {
      let r;
      if (mode === 'auto') {
        r = await api.itinerary({
          origin_stop_id: originStop.stop_id,
          origin_walk_min: originWalkMin,
          depart_hhmm: departHhmm, end_hhmm: endHhmm, weekday,
          min_stay_min: minStayMin, max_destinations: maxDest, filters: {},
        })
      } else {
        r = await api.customItinerary({
          origin_stop_id: originStop.stop_id,
          origin_walk_min: originWalkMin,
          depart_hhmm: departHhmm,
          targets: manualTargets
        })
      }
      setResult(r)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  function addTarget() {
    if (!selectedPoiId) return;
    const poi = pois.find(p => p.poi_id == selectedPoiId)
    if (poi) {
      addManualTarget(poi, manualStayMin)
      setSelectedPoiId('')
    }
  }

  function removeTarget(index) {
    removeManualTarget(index)
  }

  const stopOptions = stops.map(s => ({ value: s.stop_id, label: s.name || s.stop_name }));
  const poiOptions = pois.map(p => ({ value: p.poi_id, label: p.name }));

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Config card */}
      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-bold text-slate-800">⚙ Konfigurasi Rencana</h2>

        <div>
          <label className="label flex gap-1.5 items-center">
            <span>📍</span> Halte Asal
          </label>
          <SearchableSelect 
            options={stopOptions}
            value={originStop ? originStop.stop_id : ''}
            onChange={(val) => {
              const s = stops.find(x => x.stop_id === val)
              setOrigin(s || null, 0)
            }}
            placeholder="Cari atau ketik nama halte..."
          />
        </div>

        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button 
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${mode === 'auto' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setMode('auto')}
          >
            Rekomendasi Otomatis
          </button>
          <button 
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${mode === 'manual' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setMode('manual')}
          >
            Pilih Wisata Sendiri
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[['Mulai', departHhmm, setDepartHhmm]].map(([l, v, fn]) => (
            <div key={l}>
              <label className="label">{l}</label>
              <input type="time" value={v} onChange={e => fn(e.target.value)}
                min="05:30" max="20:30" className="input" />
            </div>
          ))}
          {mode === 'auto' && (
            <div>
              <label className="label">Selesai</label>
              <input type="time" value={endHhmm} onChange={e => setEndHhmm(e.target.value)}
                min="05:30" max="20:30" className="input" />
            </div>
          )}
        </div>

        {mode === 'auto' ? (
          <>
            <div>
              <label className="label flex justify-between">
                <span>Durasi kunjungan per tempat</span>
                <span className="font-bold text-brand-600 normal-case">{minStayMin} menit</span>
              </label>
              <input type="range" min={30} max={180} step={15} value={minStayMin}
                onChange={e => setMinStayMin(+e.target.value)}
                className="w-full accent-brand-600" />
            </div>

            <div>
              <label className="label flex justify-between">
                <span>Maks. destinasi</span>
                <span className="font-bold text-brand-600 normal-case">{maxDest} tempat</span>
              </label>
              <input type="range" min={1} max={6} step={1} value={maxDest}
                onChange={e => setMaxDest(+e.target.value)}
                className="w-full accent-brand-600" />
            </div>
          </>
        ) : (
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-800">Daftar Kunjungan</h3>
            {manualTargets.map((t, idx) => (
              <div key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-100 p-2 rounded-lg">
                <div>
                  <div className="text-xs font-bold text-slate-800">{idx+1}. {t.name}</div>
                  <div className="text-2xs text-slate-500">Durasi: {t.stay_min} menit</div>
                </div>
                <button onClick={() => removeTarget(idx)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-md">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
            ))}
            
            <div className="bg-brand-50/50 p-3 rounded-lg space-y-3 border border-brand-100/50">
              <div>
                <label className="label">Pilih Wisata</label>
                <SearchableSelect 
                  options={poiOptions}
                  value={selectedPoiId}
                  onChange={setSelectedPoiId}
                  placeholder="Cari wisata yang ingin dituju..."
                />
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="label">Durasi (menit)</label>
                  <input type="number" className="input" value={manualStayMin} onChange={e => setManualStayMin(+e.target.value)} min="15" step="15" />
                </div>
                <button onClick={addTarget} disabled={!selectedPoiId} className="btn-primary py-2 px-4 whitespace-nowrap bg-brand-600 hover:bg-brand-700 disabled:opacity-50">
                  Tambah
                </button>
              </div>
            </div>
          </div>
        )}

        <button onClick={plan} disabled={loading}
          className="btn-primary w-full py-3">
          {loading ? <><Spinner size="sm" /> Merencanakan...</> : mode === 'auto' ? '📅 Rencanakan Otomatis' : '📅 Buat Rencana'}
        </button>
      </div>

      {error && <ErrorBox message={error} onRetry={plan} />}

      {/* Result */}
      {result && (
        <div className="animate-fade-in space-y-4">
          {/* Summary */}
          <div className={`rounded-2xl p-4 border ${result.feasible
            ? 'bg-brand-50 border-brand-200'
            : 'bg-amber-50 border-amber-200'}`}>
            {result.feasible ? (
              <div>
                <p className="text-sm font-bold text-brand-800">
                  ✅ {result.total_destinations} destinasi siap dikunjungi
                </p>
                <p className="text-xs text-brand-600 mt-0.5">
                  Selesai sekitar pukul {result.return_hhmm} · Total perjalanan {result.total_travel_min?.toFixed(0)} mnt
                </p>
              </div>
            ) : (
              <p className="text-sm font-semibold text-amber-800">
                ⚠ Tidak ada destinasi feasible. Coba perlebar rentang waktu atau kurangi durasi kunjungan.
              </p>
            )}
          </div>

          {/* Stats */}
          {result.feasible && (
            <div className="grid grid-cols-3 gap-2">
              {[
                ['🏛', result.total_destinations, 'Destinasi'],
                ['🚌', `${result.total_travel_min?.toFixed(0)}m`, 'Perjalanan'],
                ['⏱', `${result.total_visit_min}m`, 'Kunjungan'],
              ].map(([icon, val, lbl]) => (
                <div key={lbl} className="card p-3 text-center">
                  <div className="text-xl mb-0.5">{icon}</div>
                  <div className="text-sm font-bold text-slate-800">{val}</div>
                  <div className="text-2xs text-slate-400">{lbl}</div>
                </div>
              ))}
            </div>
          )}

          {/* Timeline */}
          {result.feasible && (
            <div className="card p-5">
              <h3 className="text-sm font-bold text-slate-800 mb-4">Rencana Perjalanan</h3>
              {result.itinerary.map((item, i) => (
                <TimelineItem key={item.poi_id} item={item} isLast={i === result.itinerary.length - 1} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
