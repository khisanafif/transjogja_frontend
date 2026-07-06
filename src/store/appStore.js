import { create } from 'zustand'

export const useAppStore = create((set, get) => ({
  // Origin
  originStop: null,
  originWalkMin: 0,
  setOrigin: (stop, walkMin = 0) => set({ originStop: stop, originWalkMin: walkMin }),

  // Time & Day
  departHhmm: '09:00',
  weekday: 'Sabtu',
  setDepartHhmm: (v) => set({ departHhmm: v }),
  setWeekday: (v) => set({ weekday: v }),

  // Filters
  filters: { types: [], max_eta_min: 120, max_transfers: 3, min_stay_hours: 2 },
  setFilters: (f) => set({ filters: { ...get().filters, ...f } }),

  // Recommendations
  recommendations: [],
  loadingRec: false,
  recError: null,
  setRecommendations: (r) => set({ recommendations: r }),
  setLoadingRec: (v) => set({ loadingRec: v }),
  setRecError: (e) => set({ recError: e }),

  // Selected POI & route
  selectedPoi: null,
  selectedRoute: null,
  targetDestination: null, // POI targeted from Landing Page
  setSelectedPoi: (p) => set({ selectedPoi: p }),
  setSelectedRoute: (r) => set({ selectedRoute: r }),
  setTargetDestination: (p) => set({ targetDestination: p }),

  // Map active route highlight
  activeRouteDir: null,
  setActiveRouteDir: (rd) => set({ activeRouteDir: rd }),

  // Planner
  itinerary: null,
  loadingPlan: false,
  setItinerary: (it) => set({ itinerary: it }),
  setLoadingPlan: (v) => set({ loadingPlan: v }),
}))
