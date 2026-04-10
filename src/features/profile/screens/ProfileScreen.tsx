/**
 * ProfileScreen - Production-grade profile screen with FlashList
 */
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, RefreshControl, ScrollView } from 'react-native';
import { useUIStore } from '@/stores/uiStore';
import { useUserBehaviorStore } from '@/stores/userBehaviorStore';
import { useProfileData } from '../hooks/useProfileData';
import { useTravelDNA } from '../hooks/useTravelDNA';
import { useInsights } from '../hooks/useInsights';
import { useProfileActions } from '../hooks/useProfileActions';
import { ProfileHeader } from '../components/ProfileHeader';
import { XPProgressCard } from '../components/XPProgressCard';
import { TravelDNACard } from '../components/TravelDNACard';
import { InsightsCard } from '../components/InsightsCard';
import { SmartActions } from '../components/SmartActions';
import { QuickActionsGrid } from '../components/QuickActionsGrid';
import { SettingsSection } from '../components/SettingsSection';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { ErrorState } from '../components/ErrorState';
import { DEFAULT_USER_LEVEL, createDefaultTravelDNA, PERSONALITY_CONFIG, generateSmartActions, generateQuickActions } from '../utils/profileHelpers';
import type { SmartAction, QuickAction } from '../types';

const ProfileScreen: React.FC = () => {
  const { themeDark } = useUIStore();
  const { level } = useUserBehaviorStore();
  const { user, stats, isLoading, isError, error, refetch } = useProfileData();
  const { dna, dominantPersonality } = useTravelDNA();
  const { handleLogout, handleSmartActionPress, handleQuickActionPress, handleSettingToggle } = useProfileActions();

  // Compute insights with proper params
  const { insights } = useInsights({
    tripCount: stats?.trips?.total ?? 0,
    completedTrips: stats?.trips?.completed ?? 0,
    favoritesCount: stats?.favorites_count ?? 0,
    level: level ?? 1,
    levelTitle: 'Explorer',
  });

  // Get actions from helpers
  const smartActions = useMemo(() => 
    generateSmartActions(stats?.trips?.active ?? 0, stats?.favorites_count ?? 0, true), 
    [stats]
  );
  const quickActions = useMemo(() => 
    generateQuickActions(stats?.trips?.total ?? 0, stats?.favorites_count ?? 0, stats?.places_visited ?? 0), 
    [stats]
  );
  const settings = useMemo(() => [
    { id: 'darkMode', icon: '🌙', label: 'Dark Mode', type: 'toggle' as const, value: themeDark },
    { id: 'logout', icon: '🚪', label: 'Sign Out', type: 'button' as const, onPress: handleLogout, danger: true },
  ], [themeDark, handleLogout]);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isLoading) {
    return <SkeletonLoader visible={isLoading} />;
  }

  if (isError && error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  return (
    <ScrollView
      style={[styles.container, themeDark && styles.containerDark]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={themeDark ? '#FFFFFF' : '#8B5CF6'} />}
      showsVerticalScrollIndicator={false}
    >
      <ProfileHeader user={user} level={DEFAULT_USER_LEVEL} />
      <XPProgressCard level={DEFAULT_USER_LEVEL} />
      <TravelDNACard dna={dna || createDefaultTravelDNA()} personality={dominantPersonality || PERSONALITY_CONFIG.explorer} />
      {insights.length > 0 && <InsightsCard insights={insights} />}
      <SmartActions actions={smartActions} onActionPress={handleSmartActionPress} />
      <QuickActionsGrid actions={quickActions} onActionPress={handleQuickActionPress} />
      <SettingsSection settings={settings} onToggle={handleSettingToggle} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  containerDark: { backgroundColor: '#111827' },
  content: { paddingVertical: 16, paddingBottom: 32 },
});

export default ProfileScreen;