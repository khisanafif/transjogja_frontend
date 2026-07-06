import { useEffect } from 'react'
import { TypeBadge, OpenBadge, RatingStars, Tag, LegStep } from '../shared'

export default function RouteDetail({ poi, onClose, onAddToPlanner, onCariRute, isModal = true }) {
  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!poi) return null
  const legs = poi.route_legs || []
  const transfers = poi.transfers || 0

  const content = (
    <div className={`bg-white w-full flex flex-col overflow-hidden animate-slide-up relative ${isModal ? 'md:w-[28rem] md:rounded-3xl rounded-t-3xl max-h-[90vh] shadow-2xl' : 'h-full'}`}>
      
      <button onClick={onClose} className="absolute top-4 right-4 z-10 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-colors shadow-sm">
        ✕
      </button>

      <div className="flex-1 overflow-y-auto">
        <div className="relative h-48 flex-shrink-0 bg-slate-200">
          <img 
            src={poi.image || `https://placehold.co/600x400/e2e8f0/64748b?text=${encodeURIComponent(poi.name)}`} 
            alt={poi.name} 
            className="w-full h-full object-cover" 
          />
        </div>

        <div className="p-5">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <TypeBadge type={poi.type} />
              <RatingStars rating={poi.rating} />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 leading-tight mb-2">{poi.name}</h2>
            <OpenBadge needs_review={poi.needs_review} />
          </div>

          {legs.length > 0 ? (
            <>
              <div className="flex items-center gap-3 bg-brand-50 rounded-xl p-3 mb-6 border border-brand-100">
                <div className="text-2xl">⏱</div>
                <div>
                  <p className="text-xs font-bold text-brand-800">
                    Estimasi Tiba: {poi.arrive_hhmm || '--:--'}
                  </p>
                  <p className="text-2xs text-brand-600 mt-0.5">
                    {poi.eta_total_min?.toFixed(0)} mnt perjalanan · {transfers > 0 ? `${transfers}x transit` : 'Langsung'}
                  </p>
                </div>
              </div>

              <p className="text-sm font-bold text-slate-800 mb-4">Panduan Perjalanan</p>
              <div className="space-y-0 relative">
                {legs.map((leg, i) => (
                  <LegStep key={i} leg={leg} isLast={i === legs.length - 1} />
                ))}
              </div>
            </>
          ) : (
            <div className="bg-slate-50 rounded-xl p-4 mb-4">
              <p className="text-sm text-slate-700 leading-relaxed">
                {poi.description || 'Belum ada deskripsi untuk destinasi ini.'}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-slate-100 flex-shrink-0 flex gap-3 bg-white">
          <button onClick={onClose} className="btn-secondary px-6">Tutup</button>
          {onAddToPlanner && (
            <button onClick={() => { onAddToPlanner(poi); onClose() }}
              className="btn-primary flex-1">
              + Tambah ke Planner
            </button>
          )}
          {onCariRute && (
            poi.nearest_stop_id ? (
              <button onClick={() => { onCariRute(poi); onClose() }}
                className="btn-primary flex-1">
                🗺 Cari Rute ke Sini
              </button>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-slate-100 rounded-xl px-3 border border-slate-200">
                <span className="text-xs font-bold text-slate-500">❌ Belum terakomodasi rute Trans Jogja</span>
              </div>
            )
          )}
        </div>
      </div>
  )

  if (isModal) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        {content}
      </div>
    )
  }

  return content
}
