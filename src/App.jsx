import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import Landing from './pages/Landing'
import { Spinner } from './components/shared'

const MapPage    = lazy(() => import('./pages/MapPage'))
const RoutesMapPage = lazy(() => import('./pages/RoutesMapPage'))
const OtherPages = lazy(() => import('./pages/OtherPages'))

function PageLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-2 gap-3">
      <Spinner size="lg" />
      <p className="text-xs text-slate-400">Memuat...</p>
    </div>
  )
}

function Lazy({ page }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <OtherPages page={page} />
    </Suspense>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"        element={<Landing />} />
        <Route path="/map"     element={<Suspense fallback={<PageLoader />}><MapPage /></Suspense>} />
        <Route path="/planner" element={<Lazy page="planner" />} />
        <Route path="/jadwal"  element={<Lazy page="jadwal" />} />
        <Route path="/rute"    element={<Suspense fallback={<PageLoader />}><RoutesMapPage /></Suspense>} />
        <Route path="/tentang" element={<Lazy page="tentang" />} />
        <Route path="*"        element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
