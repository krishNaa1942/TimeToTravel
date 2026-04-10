/**
 * Reservations Service
 * Backend: /api/reservations
 */
import apiService from "./api";

export interface Reservation {
  id: number;
  trip_id: number;
  res_type: string;
  title: string;
  confirmation_code?: string;
  provider?: string;
  start_datetime?: string;
  end_datetime?: string;
  location?: string;
  notes?: string;
  amount?: number;
  currency: string;
  status: string;
  created_at?: string;
}

export const reservationService = {
  async add(data: {
    trip_id: number;
    res_type: string;
    title: string;
    confirmation_code?: string;
    provider?: string;
    start_datetime?: string;
    end_datetime?: string;
    location?: string;
    notes?: string;
    amount?: number;
    currency?: string;
  }): Promise<{ reservation: Reservation }> {
    return apiService.post("/reservations", data);
  },

  async update(id: number, data: Partial<Reservation>): Promise<{ reservation: Reservation }> {
    return apiService.put(`/reservations/${id}`, data);
  },

  async remove(id: number): Promise<void> {
    return apiService.delete(`/reservations/${id}`);
  },

  async listByTrip(tripId: number): Promise<{ reservations: Reservation[] }> {
    return apiService.get(`/reservations/trip/${tripId}`);
  },
};

export default reservationService;
