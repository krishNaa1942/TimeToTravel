/**
 * ProfileScreen V8 - AI Travel Identity System
 * Personalized travel dashboard with AI insights, gamification, and smart actions
 */

import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Image,
  Dimensions,
} from "react-native";
import { Text, Switch, Divider, TextInput, Button } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";

import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { usePreferenceStore } from "@/stores/preferenceStore";
import { useUserBehaviorStore, useUserLevel, useBadges, useUserStreak } from "@/stores/userBehaviorStore";
import { authService } from "@/services/auth";
import { statsService, TravelStats } from "@/services/stats";
import { useUpdateProfile } from "@/api/queries/useAuth";
import { colors, spacing } from "@/theme/colors";
import { APP_VERSION } from "@/constants/config";
import { RootStackParamList } from "@/types";
import { PressableScale } from "@/components/UI/PressableScale";
import { queryKeys } from "@/api/queryKeys";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const isSmallDevice = SCREEN_WIDTH < 375;

type NavProp = NativeStackNavigationProp<RootStackParamList>;

// ─────────────────────────────────────────────────────────────
// PERSONALITY TYPES
// ─────────────────────────────────────────────────────────────

const PERSONALITY_CONFIG: Record<string, { icon: string; color: string; label: string; description: string }> = {
  explorer: { icon: "🌍", color: "#3B82F6", label: "Globe Trekker", description: "You seek new horizons!" },
  foodie: { icon: "🍽️", color: "#F59E0B", label: "Culinary Voyager", description: "You travel for tastes!" },
  luxury: { icon: "💎", color: "#8B5CF6", label: "Luxury Connoisseur", description: "You love the finer things!" },
  adventure: { icon: "🏔️", color: "#EF4444", label: "Thrill Seeker", description: "Adrenaline drives you!" },
  culture: { icon: "🏛️", color: "#EC4899", label: "Culture Enthusiast", description: "History captivates you!" },
  relaxation: { icon: "🧘", color: "#10B981", label: "Zen Wanderer", description: "Peace guides you!" },
  budget: { icon: "💡", color: "#06B6D4", label: "Smart Traveler", description: "Value is your priority!" },
  social: { icon: "🦋", color: "#F97316", label: "Social Butterfly", description: "Travel is better together!" },
};

// ─────────────────────────────────────────────────────────────
// TRAVEL DNA BAR COMPONENT
// ─────────────────────────────────────────────────────────────

const TravelDNABar = React.memo(({ label, value, color }: { label: string; value: number; color: string }) => (
  <View style={styles.dnaRow}>
    <Text style={styles.dnaLabel}>{label}</Text>
    <View style={styles.dnaBarBg}>
      <View style={[styles.dnaBarFill, { width: `${value}%`, backgroundColor: color }]} />
    </View>
    <Text style={styles.dnaValue}>{value}%</Text>
  </View>
));

// ─────────────────────────────────────────────────────────────
// XP PROGRESS COMPONENT
// ─────────────────────────────────────────────────────────────

const XPProgress = React.memo(({ level, xp, xpToNext, title }: { level: number; xp: number; xpToNext: number; title: string }) => {
  const progress = Math.min(100, (xp / xpToNext) * 100);

  return (
    <View style={styles.xpContainer}>
      <View style={styles.xpHeader}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelNumber}>{level}</Text>
        </View>
        <Text style={styles.levelTitle}>{title}</Text>
        <Text style={styles.xpText}>{xp}/{xpToNext} XP</Text>
      </View>
      <View style={styles.xpBarBg}>
        <LinearGradient
          colors={["#3B82F6", "#8B5CF6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.xpBarFill, { width: `${progress}%` }]}
        />
      </View>
    </View>
  );
});

// ─────────────────────────────────────────────────────────────
// SMART ACTION CARD
// ─────────────────────────────────────────────────────────────

const SmartActionCard = React.memo(({ 
  icon, 
  title, 
  subtitle, 
  onPress, 
  color = "#3B82F6" 
}: { 
  icon: string; 
  title: string; 
  subtitle: string; 
  onPress: () => void; 
  color?: string;
}) => (
  <PressableScale style={[styles.smartActionCard, { borderLeftColor: color }]} onPress={onPress}>
    <Text style={styles.smartActionIcon}>{icon}</Text>
    <View style={styles.smartActionContent}>
      <Text style={styles.smartActionTitle}>{title}</Text>
      <Text style={styles.smartActionSubtitle}>{subtitle}</Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color={colors.gray} />
  </PressableScale>
));

// ─────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { user, clearUser } = useAuthStore();
  const { themeDark, toggleTheme } = useUIStore();
  const navigation = useNavigation<NavProp>();
  const queryClient = useQueryClient();
  
  // User behavior store
  const { level, trackEvent, savedDestinations, viewedDestinations } = useUserBehaviorStore();
  const streak = useUserStreak();
  
  // Preference store
  const preferences = usePreferenceStore((s) => s.preferences);

  // Profile update mutation
  const updateProfileMutation = useUpdateProfile();

  // State
  const [editMode, setEditMode] = useState(false);
  const [editedName, setEditedName] = useState(user?.name || "");
  const [editedEmail, setEditedEmail] = useState(user?.email || "");
  const [tripAlerts, setTripAlerts] = useState(true);
  const [priceAlerts, setPriceAlerts] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Track screen view
  useEffect(() => {
    trackEvent({ type: 'view', category: 'profile' });
  }, []);

  // Fetch travel stats
  const { data: statsData, isLoading: statsLoading, refetch: refetchStats, error: statsError } = useQuery({
    queryKey: queryKeys.user.stats(),
    queryFn: () => statsService.getStats(),
    staleTime: 5 * 60 * 1000,
  });

  const stats: TravelStats | null = statsData?.stats || null;

  // Computed values
  const tripCount = stats?.trips?.total ?? 0;
  const activeTrips = stats?.trips?.active ?? 0;
  const completedTrips = stats?.trips?.completed ?? 0;
  const favoritesCount = stats?.favorites_count ?? savedDestinations.length;
  const placesVisited = stats?.places_visited ?? viewedDestinations.length;
  const totalSpent = stats?.total_spent ?? 0;
  const topDestinations = stats?.top_destinations?.slice(0, 3) ?? [];

  // Travel DNA computation
  const travelDNA = useMemo(() => {
    const dna = { explorer: 0, foodie: 0, luxury: 0, adventure: 0, culture: 0, relaxation: 0, budget: 0, social: 0 };
    
    // Calculate based on viewed destinations and interactions
    dna.explorer = Math.min(100, viewedDestinations.length * 5);
    dna.foodie = Math.min(100, Math.floor(Math.random() * 30) + 40); // Placeholder
    dna.adventure = Math.min(100, Math.floor(Math.random() * 25) + 35);
    dna.culture = Math.min(100, Math.floor(Math.random() * 20) + 45);
    dna.relaxation = Math.min(100, Math.floor(Math.random() * 30) + 30);
    dna.social = Math.min(100, savedDestinations.length * 3);
    
    return dna;
  }, [viewedDestinations.length, savedDestinations.length]);

  // Dominant personality
  const personality = useMemo(() => {
    const maxTrait = Object.entries(travelDNA).reduce((a, b) => a[1] > b[1] ? a : b);
    return PERSONALITY_CONFIG[maxTrait[0]] || PERSONALITY_CONFIG.explorer;
  }, [travelDNA]);

  // AI Insights
  const insights = useMemo(() => {
    const result: string[] = [];
    
    if (tripCount > 0) {
      result.push(`You've completed ${completedTrips} amazing trips!`);
    }
    if (streak.current >= 3) {
      result.push(`🔥 ${streak.current} day planning streak! Keep it up!`);
    }
    if (favoritesCount >= 5) {
      result.push(`${favoritesCount} destinations saved - time to book your next adventure!`);
    }
    if (level.level >= 5) {
      result.push(`Level ${level.level} ${level.title} - you're a travel pro!`);
    }
    
    return result;
  }, [tripCount, completedTrips, streak.current, favoritesCount, level.level, level.title]);

  // Smart actions
  const smartActions = useMemo(() => [
    { icon: "🗺️", title: "Resume Planning", subtitle: "Continue your Goa trip", color: "#3B82F6", onPress: () => navigation.navigate("MainTabs", { screen: "Trips" } as any) },
    { icon: "✨", title: "Discover New Places", subtitle: "AI recommendations for you", color: "#8B5CF6", onPress: () => navigation.navigate("MainTabs", { screen: "Explore" } as any) },
    { icon: "📍", title: "Explore Nearby", subtitle: "Find places around you", color: "#10B981", onPress: () => navigation.navigate("Places" as any) },
    { icon: "💰", title: "Plan Budget", subtitle: "Track your travel spending", color: "#F59E0B", onPress: () => navigation.navigate("Budget" as any) },
  ], []);

  // Handlers
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), queryClient.invalidateQueries({ queryKey: queryKeys.user.all })]);
    setRefreshing(false);
  }, [refetchStats, queryClient]);

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          try { await authService.logout(); } catch {}
          clearUser();
          queryClient.clear();
        },
      },
    ]);
  };

  const handleSaveProfile = async () => {
    const trimmedName = editedName.trim();
    const trimmedEmail = editedEmail.trim().toLowerCase();

    if (!trimmedName) { Alert.alert("Error", "Name cannot be empty."); return; }
    if (trimmedName.length > 100) { Alert.alert("Error", "Name is too long."); return; }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmedEmail)) { Alert.alert("Error", "Please enter a valid email."); return; }

    try {
      await updateProfileMutation.mutateAsync({ name: trimmedName, email: trimmedEmail });
      setEditMode(false);
      Alert.alert("Success", "Profile updated successfully!");
    } catch (error: any) {
      Alert.alert("Update Failed", error?.message || "Could not update profile.");
    }
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.container, themeDark && styles.containerDark]} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0f766e" colors={["#0f766e"]} />}
      >
        {/* Hero Header */}
        <LinearGradient colors={["#0F172A", personality.color]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroGradient}>
          <View style={styles.heroContent}>
            {/* Avatar */}
            <TouchableOpacity style={styles.avatarContainer} onPress={() => setEditMode(true)}>
              <View style={styles.avatarCircle}>
                {(user?.avatar_url || user?.avatar) ? (
                  <Image source={{ uri: user.avatar_url || user.avatar }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarEmoji}>{user?.name?.[0]?.toUpperCase() || "👤"}</Text>
                )}
              </View>
              <View style={styles.editBadge}><Text style={styles.editBadgeIcon}>✏️</Text></View>
            </TouchableOpacity>

            {/* User Info */}
            {editMode ? (
              <View style={styles.editForm}>
                <TextInput mode="outlined" value={editedName} onChangeText={setEditedName} placeholder="Name" style={styles.editInput} outlineColor="rgba(255,255,255,0.3)" activeOutlineColor="#fff" textColor="#fff" placeholderTextColor="rgba(255,255,255,0.6)" />
                <TextInput mode="outlined" value={editedEmail} onChangeText={setEditedEmail} placeholder="Email" keyboardType="email-address" autoCapitalize="none" style={styles.editInput} outlineColor="rgba(255,255,255,0.3)" activeOutlineColor="#fff" textColor="#fff" placeholderTextColor="rgba(255,255,255,0.6)" />
                <View style={styles.editButtons}>
                  <Button mode="text" onPress={() => setEditMode(false)} textColor="rgba(255,255,255,0.8)">Cancel</Button>
                  <Button mode="contained" onPress={handleSaveProfile} buttonColor={personality.color} style={styles.saveButton}>Save</Button>
                </View>
              </View>
            ) : (
              <>
                <Text style={styles.name}>{user?.name || "Traveler"}</Text>
                <Text style={styles.email}>{user?.email || "user@example.com"}</Text>

                {/* Personality Badge */}
                <View style={[styles.personalityBadge, { backgroundColor: `${personality.color}20`, borderColor: personality.color }]}>
                  <Text style={styles.personalityIcon}>{personality.icon}</Text>
                  <Text style={[styles.personalityLabel, { color: personality.color }]}>{personality.label}</Text>
                </View>

                {/* Glass Stats Bar */}
                <View style={styles.glassStatsBar}>
                  <View style={styles.statItem}><Text style={styles.statValue}>{tripCount}</Text><Text style={styles.statLabel}>Trips</Text></View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}><Text style={styles.statValue}>{favoritesCount}</Text><Text style={styles.statLabel}>Saved</Text></View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}><Text style={styles.statValue}>{placesVisited}</Text><Text style={styles.statLabel}>Places</Text></View>
                </View>
              </>
            )}
          </View>
        </LinearGradient>

        <View style={styles.contentBody}>
          {/* XP Progress */}
          <XPProgress level={level.level} xp={level.xp} xpToNext={level.xpToNext} title={level.title} />

          {/* Streak Badge */}
          {streak.current > 0 && (
            <View style={styles.streakBanner}>
              <Text style={styles.streakIcon}>🔥</Text>
              <Text style={styles.streakText}>{streak.current} Day Streak!</Text>
            </View>
          )}

          {/* AI Insights */}
          {insights.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🧠 AI Insights</Text>
              <View style={styles.insightsCard}>
                {insights.map((insight, i) => (
                  <Text key={i} style={styles.insightText}>• {insight}</Text>
                ))}
              </View>
            </View>
          )}

          {/* Travel DNA */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🧬 Your Travel DNA</Text>
            <View style={styles.dnaCard}>
              {Object.entries(travelDNA).map(([key, value]) => (
                <TravelDNABar key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} value={value} color={PERSONALITY_CONFIG[key]?.color || "#6B7280"} />
              ))}
            </View>
          </View>

          {/* Smart Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✨ Smart Actions</Text>
            {smartActions.map((action, i) => (
              <SmartActionCard key={i} {...action} />
            ))}
          </View>

          {/* Quick Actions Grid */}
          <View style={styles.quickActionGrid}>
            {[
              { icon: "🧳", label: "My Trips", count: tripCount, onPress: () => navigation.navigate("MainTabs", { screen: "Trips" } as any) },
              { icon: "❤️", label: "Saved", count: favoritesCount, onPress: () => navigation.navigate("Favorites" as any) },
              { icon: "📊", label: "Stats", count: placesVisited, onPress: () => navigation.navigate("TravelStats" as any) },
              { icon: "⚙️", label: "Settings", count: null, onPress: () => {} },
            ].map((act, i) => (
              <PressableScale key={i} style={styles.actionCard} onPress={act.onPress}>
                <Text style={styles.actionIcon}>{act.icon}</Text>
                <Text style={styles.actionLabel}>{act.label}</Text>
                {act.count !== null && <View style={styles.actionBadge}><Text style={styles.actionBadgeText}>{act.count}</Text></View>}
              </PressableScale>
            ))}
          </View>

          {/* Settings */}
          <View style={styles.settingsGroup}>
            <Text style={styles.groupTitle}>Preferences</Text>
            <View style={[styles.groupCard, themeDark && styles.groupCardDark]}>
              {[
                { icon: "🌙", label: "Dark Mode", right: <Switch value={themeDark} onValueChange={toggleTheme} color="#0f766e" /> },
                { icon: "🔔", label: "Trip Alerts", right: <Switch value={tripAlerts} onValueChange={setTripAlerts} color="#0f766e" /> },
                { icon: "💰", label: "Price Alerts", right: <Switch value={priceAlerts} onValueChange={setPriceAlerts} color="#0f766e" /> },
              ].map((row, i) => (
                <PressableScale key={i} style={[styles.settingRow, i < 2 && styles.rowBorder, themeDark && styles.settingRowDark]}>
                  <View style={styles.settingLeft}>
                    <Text style={styles.settingIcon}>{row.icon}</Text>
                    <Text style={[styles.settingLabel, themeDark && styles.textDark]}>{row.label}</Text>
                  </View>
                  {row.right}
                </PressableScale>
              ))}
            </View>
          </View>

          {/* Logout */}
          <View style={styles.logoutWrapper}>
            <PressableScale style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutText}>Log Out</Text>
            </PressableScale>
          </View>

          <Text style={styles.footerText}>TimeTravel v{APP_VERSION} • Made with ❤️</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  containerDark: { backgroundColor: "#0F172A" },
  textDark: { color: "#F8FAFC" },
  scrollContent: { paddingBottom: 120 },
  
  heroGradient: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl + 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: "center",
    shadowColor: "#0f766e",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  heroContent: { alignItems: "center", width: "100%", paddingHorizontal: spacing.lg },
  avatarContainer: { position: "relative", marginBottom: spacing.md },
  avatarCircle: {
    width: isSmallDevice ? 80 : 90,
    height: isSmallDevice ? 80 : 90,
    borderRadius: isSmallDevice ? 40 : 45,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
  },
  avatarImage: { width: "100%", height: "100%", borderRadius: isSmallDevice ? 40 : 45 },
  avatarEmoji: { fontSize: isSmallDevice ? 32 : 40 },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  editBadgeIcon: { fontSize: 14 },
  name: { fontSize: isSmallDevice ? 20 : 24, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.5, textAlign: "center" },
  email: { fontSize: 14, color: "rgba(255,255,255,0.8)", marginTop: 2, fontWeight: "500" },
  
  personalityBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: spacing.md,
    gap: 8,
  },
  personalityIcon: { fontSize: 18 },
  personalityLabel: { fontSize: 14, fontWeight: "700" },
  
  glassStatsBar: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  statItem: { alignItems: "center", flex: 1 },
  statValue: { fontSize: isSmallDevice ? 16 : 18, fontWeight: "800", color: "#FFFFFF" },
  statLabel: { fontSize: 11, color: "rgba(255,255,255,0.8)", marginTop: 4, fontWeight: "600" },
  statDivider: { width: 1, height: 24, backgroundColor: "rgba(255,255,255,0.3)" },
  
  editForm: { width: "100%", paddingHorizontal: spacing.lg, marginTop: spacing.md },
  editInput: { marginBottom: spacing.sm, backgroundColor: "rgba(255,255,255,0.1)" },
  editButtons: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm, marginTop: spacing.sm },
  saveButton: { borderRadius: 8 },
  
  contentBody: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, marginTop: -30 },
  
  section: { marginBottom: spacing.lg },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A", marginBottom: spacing.sm },
  
  xpContainer: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: spacing.md, marginBottom: spacing.md, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  xpHeader: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
  levelBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#3B82F6", justifyContent: "center", alignItems: "center" },
  levelNumber: { fontSize: 16, fontWeight: "800", color: "#FFF" },
  levelTitle: { flex: 1, marginLeft: spacing.sm, fontSize: 16, fontWeight: "700", color: "#0F172A" },
  xpText: { fontSize: 12, color: "#64748B", fontWeight: "600" },
  xpBarBg: { height: 8, backgroundColor: "#E2E8F0", borderRadius: 4, overflow: "hidden" },
  xpBarFill: { height: "100%", borderRadius: 4 },
  
  streakBanner: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#FEF3C7", paddingVertical: 10, borderRadius: 12, marginBottom: spacing.md, gap: 8 },
  streakIcon: { fontSize: 18 },
  streakText: { fontSize: 14, fontWeight: "700", color: "#92400E" },
  
  insightsCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: spacing.md, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  insightText: { fontSize: 14, color: "#0F172A", marginBottom: 8, lineHeight: 20 },
  
  dnaCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: spacing.md, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  dnaRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  dnaLabel: { width: 80, fontSize: 12, fontWeight: "600", color: "#64748B", textTransform: "capitalize" },
  dnaBarBg: { flex: 1, height: 8, backgroundColor: "#E2E8F0", borderRadius: 4, marginHorizontal: 10, overflow: "hidden" },
  dnaBarFill: { height: "100%", borderRadius: 4 },
  dnaValue: { width: 40, fontSize: 12, fontWeight: "700", color: "#0F172A", textAlign: "right" },
  
  smartActionCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 12, padding: spacing.md, marginBottom: spacing.sm, borderLeftWidth: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  smartActionIcon: { fontSize: 24, marginRight: spacing.md },
  smartActionContent: { flex: 1 },
  smartActionTitle: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  smartActionSubtitle: { fontSize: 12, color: "#64748B", marginTop: 2 },
  
  quickActionGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: spacing.xl },
  actionCard: { width: "48%", backgroundColor: "#FFFFFF", borderRadius: 16, padding: spacing.md, alignItems: "center", marginBottom: spacing.md, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: "rgba(0,0,0,0.02)" },
  actionIcon: { fontSize: isSmallDevice ? 24 : 28, marginBottom: 8 },
  actionLabel: { fontSize: isSmallDevice ? 12 : 14, fontWeight: "700", color: "#1E293B" },
  actionBadge: { position: "absolute", top: 8, right: 8, backgroundColor: "#0f766e", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  actionBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  
  settingsGroup: { marginBottom: spacing.xl },
  groupTitle: { fontSize: 12, fontWeight: "700", color: "#64748B", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5, paddingLeft: 4 },
  groupCard: { backgroundColor: "#FFFFFF", borderRadius: 16, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  groupCardDark: { backgroundColor: "#1E293B" },
  settingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, paddingHorizontal: 16, minHeight: 52 },
  settingRowDark: { backgroundColor: "#1E293B" },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  settingLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  settingIcon: { fontSize: 20, marginRight: 12 },
  settingLabel: { fontSize: 15, color: "#1E293B", fontWeight: "500" },
  
  logoutWrapper: { marginTop: spacing.md },
  logoutBtn: { backgroundColor: "#FEE2E2", borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  logoutText: { color: "#DC2626", fontWeight: "700", fontSize: 16 },
  
  footerText: { textAlign: "center", color: "#94A3B8", fontSize: 12, marginTop: spacing.lg },
});