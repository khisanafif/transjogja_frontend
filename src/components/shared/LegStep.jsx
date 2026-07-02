import { Tag, getRouteColor } from './index'

export const LEG_CONFIG = {
  WALK_START: { icon: '🚶', color: '#3B82F6', line: '#BFDBFE', bg: '#EFF6FF', label: 'Jalan Kaki' },
  BOARD:      { icon: '🚏', color: '#10B981', line: '#A7F3D0', bg: '#ECFDF5', label: 'Naik Bus' },
  BUS:        { icon: '🚌', color: '#059669', line: '#6EE7B7', bg: '#ECFDF5', label: 'Di Dalam Bus' },
  TRANSFER:   { icon: '🔄', color: '#F59E0B', line: '#FDE68A', bg: '#FFFBEB', label: 'Pindah Rute' },
  WALK_END:   { icon: '🏁', color: '#3B82F6', line: '#BFDBFE', bg: '#EFF6FF', label: 'Tiba' },
}

export function LegStep({ leg, isLast }) {
  const c = LEG_CONFIG[leg.type] || { icon: '❓', color: '#94A3B8', line: '#E2E8F0', bg: '#F8FAFC', label: '' }

  return (
    <div className="flex gap-3">
      {/* Timeline */}
      <div className="flex flex-col items-center flex-shrink-0 w-9">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base z-10 shadow-sm border border-white"
          style={{ background: c.bg, color: c.color }}>
          {c.icon}
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 my-1 min-h-[20px] rounded-full" style={{ background: c.line }} />
        )}
      </div>

      {/* Content */}
      <div className="pb-5 pt-1 flex-1 min-w-0">
        <p className="text-2xs font-bold uppercase tracking-widest mb-1" style={{ color: c.color }}>
          {c.label}
        </p>

        {leg.type === 'WALK_START' && (
          <div>
            <p className="text-xs text-slate-500">Menuju halte</p>
            <p className="text-sm font-semibold text-slate-900">{leg.to_stop_name || leg.to_stop_id}</p>
            <Tag color="blue" className="mt-1.5">🚶 {leg.walk_time_min?.toFixed(1)} menit</Tag>
          </div>
        )}

        {leg.type === 'BOARD' && (
          <div>
            <p className="text-sm font-semibold text-slate-900">{leg.stop_name || leg.stop_id}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span 
                className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: getRouteColor(leg.route_id) + '20', color: getRouteColor(leg.route_id) }}
              >
                🚌 Rute {leg.route_id}
              </span>
              <span className="text-xs text-slate-400">Tunggu ±{leg.wait_min?.toFixed(0)} mnt</span>
            </div>
          </div>
        )}

        {leg.type === 'BUS' && (
          <div>
            <p className="text-xs text-slate-500">Dari <span className="font-medium text-slate-700">{leg.board_stop_name || leg.board_stop_id}</span></p>
            <p className="text-sm font-semibold text-slate-900 mt-0.5">
              📍 Turun di {leg.alight_stop_name || leg.alight_stop_id}
            </p>
            <p className="text-xs text-emerald-600 mt-1 font-medium">
              {leg.n_stops} halte • {leg.ride_min?.toFixed(1)} menit
            </p>
          </div>
        )}

        {leg.type === 'TRANSFER' && (
          <div>
            <p className="text-sm font-semibold text-slate-900">{leg.at_stop_name || leg.at_stop_id}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {leg.from_route_dir?.split('_')[0]} ➜ Rute {leg.to_route_id}
            </p>
            <p className="text-xs text-amber-600 mt-1 font-medium">
              ⌛ Tunggu ±{leg.wait_min?.toFixed(0)} mnt • halte yang sama
            </p>
          </div>
        )}

        {leg.type === 'WALK_END' && (
          <div>
            <p className="text-xs text-slate-500">Berjalan dari {leg.from_stop_name || leg.from_stop_id}</p>
            <p className="text-sm font-semibold text-slate-900">{leg.dest_name}</p>
            <p className="text-xs text-blue-600 mt-1 font-medium">
              🚶 {leg.walk_dist_m?.toFixed(0)}m • {leg.walk_time_min?.toFixed(1)} menit
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
