import React from 'react';
import { useNavigate } from 'react-router-dom';

export function Spinner({ size = 'md' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };
  return (
    <div className={`animate-spin rounded-full border-4 border-slate-200 border-t-brand-600 ${sizeClasses[size]}`}></div>
  );
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
      <p className="text-red-600 text-sm font-medium">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 text-xs font-bold text-red-700 bg-red-100 hover:bg-red-200 px-4 py-2 rounded-lg">
          Coba Lagi
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon, title, message }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-lg font-bold text-slate-700 mb-1">{title}</h3>
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function TypeBadge({ type }) {
  const mapping = {
    'Wisata': { color: 'bg-emerald-100 text-emerald-700', icon: '🏞️' },
    'Kuliner': { color: 'bg-amber-100 text-amber-700', icon: '🍜' },
    'Belanja': { color: 'bg-rose-100 text-rose-700', icon: '🛍️' },
    'Sejarah': { color: 'bg-indigo-100 text-indigo-700', icon: '🏛️' },
  };
  const c = mapping[type] || { color: 'bg-slate-100 text-slate-700', icon: '📍' };
  return (
    <span className={`px-2 py-1 rounded text-xs font-bold ${c.color}`}>
      {c.icon} {type}
    </span>
  );
}

export function OpenBadge({ needs_review }) {
  if (needs_review) {
    return <span className="px-2 py-1 rounded bg-amber-50 text-amber-600 text-xs font-bold border border-amber-200">Perlu Review</span>;
  }
  return <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-600 text-xs font-bold border border-emerald-200">Buka</span>;
}

export function RatingStars({ rating }) {
  if (!rating) return null;
  return (
    <span className="flex items-center gap-1 text-xs font-bold text-slate-700">
      <span className="text-amber-400">★</span> {rating}
    </span>
  );
}

export function Tag({ color, className = '', children }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    yellow: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded border text-xs font-bold ${colors[color] || colors.blue} ${className}`}>
      {children}
    </span>
  );
}

export function NavBar({ title, onBack, rightSlot }) {
  return (
    <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-20 shadow-sm">
      {onBack && (
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      )}
      <span className="text-sm font-semibold text-slate-900 flex-1 min-w-0 truncate">{title}</span>
      {rightSlot}
    </header>
  );
}

export const POI_META = {
  'Wisata':  { bg: '#D1FAE5', text: '#047857', icon: '🏞️', label: 'Wisata' },
  'Kuliner': { bg: '#FEF3C7', text: '#B45309', icon: '🍜', label: 'Kuliner' },
  'Belanja': { bg: '#FFE4E6', text: '#BE123C', icon: '🛍️', label: 'Belanja' },
  'Sejarah': { bg: '#E0E7FF', text: '#4338CA', icon: '🏛️', label: 'Sejarah' },
  'default': { bg: '#F1F5F9', text: '#475569', icon: '📍', label: 'Lainnya' }
};

export function SkeletonCard() {
  return (
    <div className="card p-4 flex gap-3 animate-pulse">
      <div className="flex-1 space-y-2 py-1">
        <div className="h-4 bg-slate-200 rounded w-3/4"></div>
        <div className="h-3 bg-slate-200 rounded w-1/2"></div>
      </div>
      <div className="w-16 h-16 bg-slate-200 rounded-lg"></div>
    </div>
  );
}

export function POI_COLORS() {
  return {
    'Wisata': '#10b981',
    'Kuliner': '#f59e0b',
    'Belanja': '#f43f5e',
    'Sejarah': '#6366f1',
    'default': '#94a3b8'
  };
}

export const TJ_COLORS = {
  '1A': '#0284c7', '1B': '#0284c7',
  '2A': '#16a34a', '2B': '#16a34a',
  '3A': '#eab308', '3B': '#eab308',
  '4A': '#dc2626', '4B': '#dc2626',
  '5A': '#f97316', '5B': '#f97316',
  '6A': '#7c3aed', '6B': '#7c3aed',
  '7':  '#db2777', '8': '#0d9488',
  '9':  '#ea580c', '10': '#65a30d',
  '11': '#8b5cf6', '12': '#be123c',
  '13': '#fbbf24', '14': '#34d399',
  '15': '#fb7185'
};

export function getRouteColor(routeId) {
  if (!routeId) return '#94a3b8';
  // If exact match (e.g. '1A', '2B')
  if (TJ_COLORS[routeId]) return TJ_COLORS[routeId];
  
  // Try to match the numeric part if the letter is missing or different
  const numMatch = routeId.match(/\d+/);
  if (numMatch) {
    const num = numMatch[0];
    const fallbackColor = TJ_COLORS[`${num}A`] || TJ_COLORS[num];
    if (fallbackColor) return fallbackColor;
  }
  
  // Generic fallback based on string length/char codes to be consistent
  const colors = ['#059669', '#2563eb', '#d97706', '#dc2626', '#7c3aed', '#db2777', '#0891b2', '#65a30d'];
  const hash = routeId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

export * from './LegStep';
