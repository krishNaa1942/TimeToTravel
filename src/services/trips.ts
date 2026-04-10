/**
 * Trips Service
 * Manages saved trip history
 */

import apiService from "./api";
import { Trip } from "@/types";

export const tripsService = {
  /** List all trips for the logged-in user */
  async getTrips(): Promise<Trip[]> {
    const response = await apiService.get<{ trips: Trip[] }>("/trips");
    return response.trips;
  },

  /** Get a single trip by ID */
  async getTrip(id: number): Promise<Trip> {
    return apiService.get<Trip>(`/trips/${id}`);
  },

  /** Delete a trip */
  async deleteTrip(id: number): Promise<void> {
    await apiService.delete(`/trips/${id}`);
  },
};

export default tripsService;
