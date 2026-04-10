/**
 * Profile Feature Service
 * API service for profile-related operations
 */

import apiService from '@/services/api';
import type {
  UserProfile,
  ProfileUpdatePayload,
  TravelStats,
  ProfileAPIResponse,
  StatsAPIResponse,
} from '../types';

// ─────────────────────────────────────────────────────────────
// PROFILE SERVICE
// ─────────────────────────────────────────────────────────────

export const profileService = {
  /**
   * Get user profile data
   */
  async getProfile(): Promise<ProfileAPIResponse<UserProfile>> {
    return apiService.get('/user/profile');
  },

  /**
   * Update user profile
   */
  async updateProfile(payload: ProfileUpdatePayload): Promise<ProfileAPIResponse<UserProfile>> {
    return apiService.put('/user/profile', payload);
  },

  /**
   * Get user avatar upload URL
   */
  async getAvatarUploadUrl(): Promise<{ uploadUrl: string; key: string }> {
    return apiService.get('/user/avatar/upload-url');
  },

  /**
   * Upload avatar image
   */
  async uploadAvatar(uri: string): Promise<{ avatar_url: string }> {
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'avatar.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('avatar', {
      uri,
      name: filename,
      type,
    } as any);

    return apiService.post('/user/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * Get travel stats
   */
  async getStats(): Promise<StatsAPIResponse> {
    return apiService.get('/stats');
  },

  /**
   * Delete user account
   */
  async deleteAccount(): Promise<{ success: boolean }> {
    return apiService.delete('/user/account');
  },

  /**
   * Export user data (GDPR)
   */
  async exportData(): Promise<{ downloadUrl: string }> {
    return apiService.get('/user/export');
  },

  /**
   * Update preferences
   */
  async updatePreferences(preferences: Record<string, boolean>): Promise<{ success: boolean }> {
    return apiService.put('/user/preferences', preferences);
  },

  /**
   * Get user achievements/badges
   */
  async getAchievements(): Promise<{ badges: Array<{ id: string; earnedAt: string }> }> {
    return apiService.get('/user/achievements');
  },

  /**
   * Sync offline data
   */
  async syncOfflineData(events: Array<{ type: string; data: any; timestamp: number }>): Promise<{ synced: number }> {
    return apiService.post('/user/sync', { events });
  },
};

export default profileService;