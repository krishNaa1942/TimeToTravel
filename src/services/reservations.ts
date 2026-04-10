/**
 * Reservations Service V2 - AI-Powered Smart Booking Engine
 * Supports offline caching, intelligent parsing, and real-time sync
 */

import apiService from "./api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { cache } from "@/utils/cache";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export type ReservationType = "flight" | "hotel" | "restaurant" | "transport" | "activity" | "train" | "bus" | "cruise" | "other";
export type ReservationStatus = "confirmed" | "pending" | "cancelled" | "completed";

export interface Reservation {
  id: number;
  trip_id: number;
  res_type: ReservationType;
  title: string;
  confirmation_code?: string;
  provider?: string;
  start_datetime?: string;
  end_datetime?: string;
  location?: string;
  amount?: number;
  currency: string;
  status: ReservationStatus;
  notes?: string;
  reminder_set?: boolean;
  reminder_time?: string;
  is_bookmarked?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ReservationCreateInput {
  trip_id: number;
  res_type: ReservationType;
  title: string;
  confirmation_code?: string;
  provider?: string;
  start_datetime?: string;
  end_datetime?: string;
  location?: string;
  amount?: number;
  currency?: string;
  notes?: string;
}

export interface ReservationUpdateInput extends Partial<ReservationCreateInput> {
  status?: ReservationStatus;
  is_bookmarked?: boolean;
}

export interface ReservationFilter {
  trip_id?: number;
  type?: ReservationType;
  status?: ReservationStatus;
  search?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: "date" | "amount" | "type" | "status";
  sort_order?: "asc" | "desc";
}

export interface ReservationStats {
  total_count: number;
  by_type: Record<ReservationType, number>;
  by_status: Record<ReservationStatus, number>;
  total_amount: number;
  currency: string;
  upcoming_count: number;
  completed_count: number;
  upcoming_this_week: number;
}

export interface AIInsight {
  type: "warning" | "info" | "suggestion" | "reminder";
  title: string;
  message: string;
  icon: string;
  action?: { label: string; route: string };
}

export interface ParsedBooking {
  type: ReservationType;
  title: string;
  provider?: string;
  confirmation_code?: string;
  start_datetime?: string;
  end_datetime?: string;
  location?: string;
  amount?: number;
}

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

const CACHE_KEY_PREFIX = "@reservations:";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const RESERVATION_TYPES: Record<ReservationType, { emoji: string; label: string; color: string }> = {
  flight: { emoji: "✈️", label: "Flight", color: "#3B82F6" },
  hotel: { emoji: "🏨", label: "Hotel", color: "#8B5CF6" },
  restaurant: { emoji: "🍽️", label: "Restaurant", color: "#F59E0B" },
  transport: { emoji: "🚗", label: "Transport", color: "#10B981" },
  activity: { emoji: "🎯", label: "Activity", color: "#EC4899" },
  train: { emoji: "🚂", label: "Train", color: "#6366F1" },
  bus: { emoji: "🚌", label: "Bus", color: "#14B8A6" },
  cruise: { emoji: "🚢", label: "Cruise", color: "#0EA5E9" },
  other: { emoji: "📋", label: "Other", color: "#64748B" },
};

export const STATUS_CONFIG: Record<ReservationStatus, { emoji: string; label: string; color: string }> = {
  confirmed: { emoji: "✅", label: "Confirmed", color: "#10B981" },
  pending: { emoji: "⏳", label: "Pending", color: "#F59E0B" },
  cancelled: { emoji: "❌", label: "Cancelled", color: "#EF4444" },
  completed: { emoji: "🎉", label: "Completed", color: "#6366F1" },
};

// ─────────────────────────────────────────────────────────────
// AI PARSING ENGINE
// ─────────────────────────────────────────────────────────────

const parseEmailBooking = (text: string): ParsedBooking | null => {
  const lowerText = text.toLowerCase();
  
  // Detect type
  let detectedType: ReservationType = "other";
  if (lowerText.includes("flight") || lowerText.includes("airline") || lowerText.includes("departure") || lowerText.includes("arrival") || /airways|airlines|air\s*india|indigo|spicejet|vistara/i.test(text)) {
    detectedType = "flight";
  } else if (lowerText.includes("hotel") || lowerText.includes("check-in") || lowerText.includes("check-out") || /resort|stay|booking|room|suite/i.test(text)) {
    detectedType = "hotel";
  } else if (lowerText.includes("restaurant") || lowerText.includes("table") || lowerText.includes("reservation")) {
    detectedType = "restaurant";
  } else if (lowerText.includes("train") || lowerText.includes("railway")) {
    detectedType = "train";
  } else if (lowerText.includes("bus")) {
    detectedType = "bus";
  }

  // Extract confirmation code (uppercase alphanumeric, 4-8 chars)
  const confirmMatch = text.match(/(?:confirmation|booking|reference|PNR)\s*[:#]?\s*([A-Z0-9]{4,8})/i) ||
                       text.match(/\b([A-Z0-9]{6})\b/);
  
  // Extract provider
  const providerPatterns: Record<ReservationType, RegExp[]> = {
    flight: [/(air\s*india|indigo|spicejet|vistara|go\s*air|airasia|emirates|etihad|qatar|british\s*airways)/i],
    hotel: [/marriott|taj|oberoi|itc|hilton|hyatt|radisson|ibis|novotel/i],
    restaurant: [/zomato|swiggy|dineout/i],
    transport: [/ola|uber|zoomcar/i],
    activity: [/airbnb|viator|tripadvisor|thrillophilia/i],
    train: [/irctc|indian\s*railways/i],
    bus: [/redbus|makemytrip/i],
    cruise: [/carnival|royal\s*caribbean/i],
    other: [],
  };
  
  let provider: string | undefined;
  for (const pattern of providerPatterns[detectedType] || []) {
    const match = text.match(pattern);
    if (match) {
      provider = match[1];
      break;
    }
  }

  // Extract dates
  const dateMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/) ||
                    text.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  
  // Extract amount
  const amountMatch = text.match(/[₹$€£]\s*(\d[\d,]*)/) ||
                      text.match(/(\d[\d,]*)\s*(rs|inr|usd|eur|£|€|\$)/i);

  // Build title
  let title = "";
  if (detectedType === "flight") {
    const fromMatch = text.match(/from\s+([A-Za-z\s]+)/i);
    const toMatch = text.match(/to\s+([A-Za-z\s]+)/i);
    if (fromMatch && toMatch) {
      title = `${fromMatch[1].trim()} → ${toMatch[1].trim()}`;
    }
  }
  if (!title) {
    title = provider ? `${provider} Booking` : `${RESERVATION_TYPES[detectedType].label} Booking`;
  }

  return {
    type: detectedType,
    title,
    provider,
    confirmation_code: confirmMatch?.[1],
    amount: amountMatch ? parseFloat(amountMatch[1].replace(/,/g, "")) : undefined,
  };
};

// ─────────────────────────────────────────────────────────────
// SMART INSIGHTS ENGINE
// ─────────────────────────────────────────────────────────────

const generateInsights = (reservations: Reservation[]): AIInsight[] => {
  const insights: AIInsight[] = [];
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // Upcoming today
  const todayReservations = reservations.filter(r => {
    if (!r.start_datetime) return false;
    const start = new Date(r.start_datetime).toISOString().split("T")[0];
    return start === today && r.status === "confirmed";
  });

  if (todayReservations.length > 0) {
    insights.push({
      type: "reminder",
      title: "Today's Bookings",
      message: `You have ${todayReservations.length} reservation${todayReservations.length > 1 ? "s" : ""} today!`,
      icon: "🔔",
    });
  }

  // Upcoming this week
  const weekReservations = reservations.filter(r => {
    if (!r.start_datetime) return false;
    const start = r.start_datetime.split("T")[0];
    return start >= today && start <= weekLater && r.status === "confirmed";
  });

  if (weekReservations.length > 3) {
    insights.push({
      type: "info",
      title: "Busy Week Ahead",
      message: `${weekReservations.length} reservations scheduled this week.`,
      icon: "📅",
    });
  }

  // Missing essentials
  const hasFlight = reservations.some(r => r.res_type === "flight");
  const hasHotel = reservations.some(r => r.res_type === "hotel");
  
  if (hasFlight && !hasHotel) {
    insights.push({
      type: "suggestion",
      title: "Missing Hotel?",
      message: "You have a flight booked but no hotel. Need help finding one?",
      icon: "🏨",
      action: { label: "Find Hotels", route: "Places" },
    });
  }

  // Pending reservations
  const pending = reservations.filter(r => r.status === "pending");
  if (pending.length > 0) {
    insights.push({
      type: "warning",
      title: "Pending Confirmations",
      message: `${pending.length} booking${pending.length > 1 ? "s" : ""} awaiting confirmation.`,
      icon: "⏳",
    });
  }

  // High spending
  const total = reservations.reduce((sum, r) => sum + (r.amount || 0), 0);
  if (total > 50000) {
    insights.push({
      type: "info",
      title: "Total Spending",
      message: `₹${(total / 1000).toFixed(0)}K total in reservations.`,
      icon: "💰",
    });
  }

  return insights;
};

// ─────────────────────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────────────────────

export const reservationService = {
  // Create reservation
  async create(data: ReservationCreateInput): Promise<Reservation> {
    const response = await apiService.post<{ reservation: Reservation }>("/reservations", {
      ...data,
      currency: data.currency || "INR",
      status: "pending",
    });
    await this.invalidateCache(data.trip_id);
    return response.reservation;
  },

  // Update reservation
  async update(id: number, data: ReservationUpdateInput): Promise<Reservation> {
    const response = await apiService.put<{ reservation: Reservation }>(`/reservations/${id}`, data);
    // Invalidate cache for this reservation's trip
    const allCache = await AsyncStorage.getAllKeys();
    const reservationCacheKeys = allCache.filter(k => k.startsWith(CACHE_KEY_PREFIX));
    for (const key of reservationCacheKeys) {
      await AsyncStorage.removeItem(key);
    }
    return response.reservation;
  },

  // Delete reservation
  async delete(id: number, tripId: number): Promise<void> {
    await apiService.delete(`/reservations/${id}`);
    await this.invalidateCache(tripId);
  },

  // List with filtering
  async list(params: ReservationFilter = {}): Promise<{ reservations: Reservation[]; total: number }> {
    const query = new URLSearchParams();
    if (params.trip_id) query.append("trip_id", params.trip_id.toString());
    if (params.type) query.append("type", params.type);
    if (params.status) query.append("status", params.status);
    if (params.search) query.append("search", params.search);
    if (params.date_from) query.append("date_from", params.date_from);
    if (params.date_to) query.append("date_to", params.date_to);
    if (params.sort_by) query.append("sort_by", params.sort_by);
    if (params.sort_order) query.append("sort_order", params.sort_order);

    const response = await apiService.get<{ reservations: Reservation[]; total: number }>(`/reservations?${query.toString()}`);
    return response;
  },

  // Get by trip (with caching)
  async getByTrip(tripId: number, useCache = true): Promise<Reservation[]> {
    const cacheKey = `trip_${tripId}`;

    if (useCache) {
      const cached = await cache.get<Reservation[]>(cacheKey);
      if (cached) return cached;
    }

    const response = await apiService.get<{ reservations: Reservation[] }>(`/reservations/trip/${tripId}`);
    await cache.set(cacheKey, response.reservations, { ttl: CACHE_TTL });
    return response.reservations;
  },

  // Get stats
  async getStats(tripId: number): Promise<ReservationStats> {
    const response = await apiService.get<ReservationStats>(`/reservations/stats/${tripId}`);
    return response;
  },

  // Get upcoming reservations
  async getUpcoming(tripId: number, days = 7): Promise<Reservation[]> {
    const response = await apiService.get<{ reservations: Reservation[] }>(`/reservations/upcoming/${tripId}?days=${days}`);
    return response.reservations;
  },

  // Toggle bookmark
  async toggleBookmark(id: number, tripId: number): Promise<Reservation> {
    const response = await apiService.post<{ reservation: Reservation }>(`/reservations/${id}/bookmark`);
    await this.invalidateCache(tripId);
    return response.reservation;
  },

  // Parse booking from text
  parseBookingText: parseEmailBooking,

  // Generate AI insights
  generateInsights,

  // Invalidate cache
  async invalidateCache(tripId: number): Promise<void> {
    await cache.invalidate(`trip_${tripId}`);
  },

  // Offline sync
  async syncOffline(): Promise<void> {
    // Get offline queue and sync
    const offlineQueue = await AsyncStorage.getItem("@offline_reservations");
    if (offlineQueue) {
      const items = JSON.parse(offlineQueue);
      for (const item of items) {
        try {
          await this.create(item);
        } catch {
          // Keep in queue if failed
        }
      }
      await AsyncStorage.removeItem("@offline_reservations");
    }
  },
};

export default reservationService;