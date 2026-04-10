/**
 * Travel Intelligence Store - Enhanced with Persistence
 * Premium AI-powered state management for travel app
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Destination } from "@/types";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export type TravelStyle = "beaches" | "adventure" | "budget" | "luxury" | "culture" | "nature" | "spiritual";

export interface UserPreferences {
  travelStyle: TravelStyle[];
  budgetLevel: "budget" | "mid-range" | "luxury";
  preferredSeason: "summer" | "winter" | "monsoon" | "any";
  groupType: "solo" | "couple" | "family" | "friends";
}

export interface CachedItinerary {
  destination: string;
  days: number;
  itinerary: any;
  route: any;
  generatedAt: number;
  matchScore: number;
}

export interface ActiveTrip {
  id: string;
  destination: Destination;
  startDate: string;
  endDate: string;
  days: number;
  status: "planning" | "upcoming" | "ongoing" | "completed";
}

export interface TravelIntelligenceState {
  // User Context
  userLocation: { latitude: number; longitude: number } | null;
  userPreferences: UserPreferences;
  
  // Active Trip Tracking
  activeTrip: ActiveTrip | null;
  daysUntilTrip: number | null;
  
  // Intelligence History
  recentSearches: string[];
  inferredPreferences: TravelStyle[];
  savedDestinations: Destination[];
  
  // AI Cache Layer
  aiCache: Record<string, CachedItinerary>;
  
  // UI State
  isLoading: boolean;
  lastError: string | null;

  // Location Actions
  setUserLocation: (coords: { latitude: number; longitude: number } | null) => void;
  
  // Preferences Actions
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
  
  // Trip Actions
  setActiveTrip: (dest: Destination, days: number, startDate?: string) => void;
  clearActiveTrip: () => void;
  
  // Search & Favorites
  logSearch: (query: string) => void;
  toggleFavorite: (dest: Destination) => void;
  isFavorite: (id: string) => boolean;
  
  // Cache Actions
  setCachedItinerary: (query: string, data: Omit<CachedItinerary, "generatedAt" | "matchScore">) => void;
  getCachedItinerary: (query: string) => CachedItinerary | null;
  clearCache: () => void;
  
  // Utility
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearHistory: () => void;
  resetStore: () => void;
}

// ─────────────────────────────────────────────────────────────
// DEFAULT PREFERENCES
// ─────────────────────────────────────────────────────────────

const defaultPreferences: UserPreferences = {
  travelStyle: [],
  budgetLevel: "mid-range",
  preferredSeason: "any",
  groupType: "couple",
};

// ─────────────────────────────────────────────────────────────
// INTENT PARSING HEURISTICS
// ─────────────────────────────────────────────────────────────

const STYLE_KEYWORDS: Record<TravelStyle, string[]> = {
  beaches: ["beach", "goa", "coast", "sea", "island", "sand", "waves", "kerala", "andaman", "maldives"],
  adventure: ["trek", "mountain", "hiking", "adventure", "climb", "rafting", "safari", "himalaya", "leh", "spiti"],
  budget: ["cheap", "budget", "hostel", "affordable", "backpack", "economical"],
  luxury: ["luxury", "resort", "spa", "premium", "5-star", "exclusive", "palace"],
  culture: ["temple", "heritage", "history", "culture", "monument", "fort", "palace", "varanasi", "jaipur", "udaipur"],
  nature: ["nature", "forest", "wildlife", "national park", "hill station", "munnar", "ooty", "coorg"],
  spiritual: ["temple", "spiritual", "pilgrimage", "ashram", "meditation", "yoga", "varanasi", "rishikesh"],
};

const inferTravelStyles = (query: string): TravelStyle[] => {
  const queryLower = query.toLowerCase();
  const styles: TravelStyle[] = [];
  
  for (const [style, keywords] of Object.entries(STYLE_KEYWORDS)) {
    if (keywords.some(keyword => queryLower.includes(keyword))) {
      styles.push(style as TravelStyle);
    }
  }
  
  return styles.length > 0 ? styles : ["culture"]; // Default to culture
};

const calculateMatchScore = (styles: TravelStyle[], preferences: UserPreferences): number => {
  if (preferences.travelStyle.length === 0) return 85;
  
  const matchingStyles = styles.filter(s => preferences.travelStyle.includes(s));
  const baseScore = 70;
  const styleBonus = (matchingStyles.length / Math.max(styles.length, 1)) * 20;
  const randomVariance = Math.random() * 10;
  
  return Math.min(98, Math.round(baseScore + styleBonus + randomVariance));
};

// ─────────────────────────────────────────────────────────────
// STORE
// ─────────────────────────────────────────────────────────────

export const useTravelIntelligence = create<TravelIntelligenceState>()(
  persist(
    (set, get) => ({
      // Initial State
      userLocation: null,
      userPreferences: defaultPreferences,
      activeTrip: null,
      daysUntilTrip: null,
      recentSearches: [],
      inferredPreferences: [],
      savedDestinations: [],
      aiCache: {},
      isLoading: false,
      lastError: null,

      // Location
      setUserLocation: (coords) => set({ userLocation: coords }),

      // Preferences
      updatePreferences: (prefs) =>
        set((state) => ({
          userPreferences: { ...state.userPreferences, ...prefs },
        })),

      // Trip Management
      setActiveTrip: (dest, days, startDate = new Date().toISOString()) =>
        set({
          activeTrip: {
            id: `trip-${Date.now()}`,
            destination: dest,
            startDate,
            endDate: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
            days,
            status: "planning",
          },
          daysUntilTrip: days,
        }),

      clearActiveTrip: () => set({ activeTrip: null, daysUntilTrip: null }),

      // Search & Favorites
      logSearch: (query) =>
        set((state) => {
          const formatted = query.trim();
          if (!formatted) return state;

          const updatedSearches = [formatted, ...state.recentSearches.filter(q => q !== formatted)].slice(0, 15);
          const newStyles = inferTravelStyles(formatted);
          const updatedPrefs = [...new Set([...state.inferredPreferences, ...newStyles])].slice(0, 5);

          return {
            recentSearches: updatedSearches,
            inferredPreferences: updatedPrefs,
          };
        }),

      toggleFavorite: (dest) =>
        set((state) => {
          const exists = state.savedDestinations.some(d => d.id === dest.id);
          return {
            savedDestinations: exists
              ? state.savedDestinations.filter(d => d.id !== dest.id)
              : [...state.savedDestinations, dest],
          };
        }),

      isFavorite: (id) => get().savedDestinations.some(d => d.id === id),

      // Cache Management
      setCachedItinerary: (query, data) =>
        set((state) => {
          const styles = inferTravelStyles(query);
          const matchScore = calculateMatchScore(styles, state.userPreferences);
          
          return {
            aiCache: {
              ...state.aiCache,
              [query.toLowerCase().trim()]: {
                ...data,
                generatedAt: Date.now(),
                matchScore,
              },
            },
          };
        }),

      getCachedItinerary: (query) => {
        const cached = get().aiCache[query.toLowerCase().trim()];
        if (!cached) return null;
        
        // Cache expires after 24 hours
        const isExpired = Date.now() - cached.generatedAt > 24 * 60 * 60 * 1000;
        return isExpired ? null : cached;
      },

      clearCache: () => set({ aiCache: {} }),

      // Utility
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ lastError: error }),
      clearHistory: () =>
        set({
          recentSearches: [],
          inferredPreferences: [],
          aiCache: {},
        }),

      resetStore: () =>
        set({
          userLocation: null,
          userPreferences: defaultPreferences,
          activeTrip: null,
          daysUntilTrip: null,
          recentSearches: [],
          inferredPreferences: [],
          savedDestinations: [],
          aiCache: {},
          isLoading: false,
          lastError: null,
        }),
    }),
    {
      name: "travel-intelligence-v2",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        userPreferences: state.userPreferences,
        recentSearches: state.recentSearches,
        inferredPreferences: state.inferredPreferences,
        savedDestinations: state.savedDestinations,
        aiCache: state.aiCache,
        activeTrip: state.activeTrip,
      }),
    }
  )
);

// ─────────────────────────────────────────────────────────────
// SELECTORS (Performance Optimized)
// ─────────────────────────────────────────────────────────────

export const useUserLocation = () => useTravelIntelligence((s) => s.userLocation);
export const useUserPreferences = () => useTravelIntelligence((s) => s.userPreferences);
export const useActiveTrip = () => useTravelIntelligence((s) => s.activeTrip);
export const useRecentSearches = () => useTravelIntelligence((s) => s.recentSearches);
export const useSavedDestinations = () => useTravelIntelligence((s) => s.savedDestinations);
export const useIsLoading = () => useTravelIntelligence((s) => s.isLoading);