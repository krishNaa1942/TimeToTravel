/**
 * Trip Sharing Service
 * Backend: /api/share
 */
import apiService from "./api";

export interface SharedTrip {
  id: number;
  share_token: string;
  title: string;
  trip_id?: number;
  notes?: string;
  view_count: number;
  is_active: boolean;
  share_url: string;
  created_at?: string;
}

export const sharingService = {
  async createShare(data: {
    title: string;
    trip_id?: number;
    itinerary_json?: any;
    notes?: string;
  }): Promise<{ share: SharedTrip; share_url: string }> {
    return apiService.post("/share", data);
  },

  async listShares(): Promise<{ shares: SharedTrip[] }> {
    return apiService.get("/share");
  },

  async viewShared(token: string): Promise<any> {
    return apiService.get(`/share/${token}`);
  },

  async revokeShare(token: string): Promise<void> {
    return apiService.delete(`/share/${token}`);
  },
};

export default sharingService;
