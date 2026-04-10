/**
 * useProfileData Hook
 * Centralized hook for fetching and managing profile data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useUserBehaviorStore } from '@/stores/userBehaviorStore';
import { statsService } from '@/services/stats';
import { profileService } from '../services/profileService';
import { queryKeys } from '@/api/queryKeys';
import type { UserProfile, TravelStats, ProfileUpdatePayload } from '../types';

interface UseProfileDataReturn {
  user: UserProfile | null;
  stats: TravelStats | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  updateProfile: (payload: ProfileUpdatePayload) => Promise<void>;
  isUpdating: boolean;
}

export const useProfileData = (): UseProfileDataReturn => {
  const queryClient = useQueryClient();
  const { user: authUser } = useAuthStore();
  const { trackEvent } = useUserBehaviorStore();

  // Fetch extended profile data
  const {
    data: profileData,
    isLoading: isProfileLoading,
    isError: isProfileError,
    error: profileError,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: queryKeys.profile.data(),
    queryFn: () => profileService.getProfile(),
    enabled: !!authUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch travel stats
  const {
    data: statsData,
    isLoading: isStatsLoading,
    isError: isStatsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: queryKeys.profile.stats(),
    queryFn: () => statsService.getStats(),
    enabled: !!authUser,
    staleTime: 5 * 60 * 1000,
  });

  // Profile update mutation
  const { mutateAsync: updateProfileMutation, isPending: isUpdating } = useMutation({
    mutationFn: (payload: ProfileUpdatePayload) => profileService.updateProfile(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.profile.data(), data);
    },
    onError: (error) => {
      console.error('Profile update failed:', error);
    },
  });

  const updateProfile = useCallback(async (payload: ProfileUpdatePayload) => {
    await updateProfileMutation(payload);
  }, [updateProfileMutation]);

  // Memoized combined data
  const user = useMemo((): UserProfile | null => {
    if (profileData?.data) return profileData.data;
    if (authUser) {
      return {
        id: authUser.id,
        name: authUser.name || '',
        email: authUser.email || '',
        avatar_url: authUser.avatar_url || null,
        created_at: new Date().toISOString(),
      };
    }
    return null;
  }, [profileData, authUser]);

  const stats = useMemo((): TravelStats | null => {
    if (statsData?.stats) {
      // Use unknown then any to safely handle the API response shape
      const s = statsData.stats as unknown as {
        trips?: { total?: number; active?: number; completed?: number; upcoming?: number; planning?: number };
        favorites_count?: number;
        places_visited?: number;
        total_spent?: number;
        top_destinations?: Array<{ destination?: string; trips?: number; name?: string }>;
      };
      
      const tripsData = s.trips || {};
      
      return {
        trips: {
          total: tripsData.total ?? 0,
          active: tripsData.active ?? 0,
          completed: tripsData.completed ?? 0,
          upcoming: tripsData.upcoming ?? tripsData.planning ?? 0,
        },
        favorites_count: s.favorites_count ?? 0,
        places_visited: s.places_visited ?? 0,
        total_spent: s.total_spent ?? 0,
        top_destinations: Array.isArray(s.top_destinations)
          ? s.top_destinations.map((d, idx) => ({
              id: `dest-${idx}`,
              name: d.name || d.destination || 'Unknown',
              visits: d.trips ?? 0,
            }))
          : [],
      };
    }
    return null;
  }, [statsData]);

  const refetch = useCallback(() => {
    refetchProfile();
    refetchStats();
  }, [refetchProfile, refetchStats]);

  return {
    user,
    stats,
    isLoading: isProfileLoading || isStatsLoading,
    isError: isProfileError || isStatsError,
    error: profileError,
    refetch,
    updateProfile,
    isUpdating,
  };
};

export default useProfileData;