/**
 * Favorites / Wishlist Service
 * CRUD for bookmarked destinations and places
 */

import apiService from "./api";

export interface Favorite {
  id: number;
  item_type: "destination" | "place";
  item_name: string;
  notes: string | null;
  created_at: string;
}

export const favoritesService = {
  async list(type?: string): Promise<Favorite[]> {
    const q = type ? `?type=${type}` : "";
    const res = await apiService.get<{ favorites: Favorite[] }>(`/favorites${q}`);
    return res.favorites;
  },

  async add(itemName: string, itemType: "destination" | "place" = "destination", notes?: string): Promise<Favorite> {
    const res = await apiService.post<{ favorite: Favorite }>("/favorites", {
      item_name: itemName,
      item_type: itemType,
      notes: notes || undefined,
    });
    return res.favorite;
  },

  async remove(favId: number): Promise<void> {
    await apiService.delete(`/favorites/${favId}`);
  },

  async check(itemName: string, itemType: string = "destination"): Promise<{ is_favorite: boolean; favorite: Favorite | null }> {
    const params = new URLSearchParams({ item_name: itemName, item_type: itemType });
    return apiService.get(`/favorites/check?${params}`);
  },
};

export default favoritesService;
