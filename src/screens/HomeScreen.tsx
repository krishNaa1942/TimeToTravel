/**
 * HomeScreen V4 – AI Travel Command Center
 * Updated to use React Query hooks for data fetching
 */
import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Dimensions,
} from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";

import LoadingSpinner from "@/components/Common/LoadingSpinner";
import ErrorMessage from "@/components/Common/ErrorMessage";
import DestinationCard from "@/components/Features/DestinationCard";
import { 
  useDestinations, 
  useFeaturedDestinations,
  useTrendingDestinations 
} from "@/api/queries/useDestinations";
import { destinationsService } from "@/services/destinations";
import { Destination, RootStackParamList, UnsplashImage } from "@/types";
import { colors, spacing } from "@/theme/colors";
import { useTravelIntelligence } from "@/stores/travelIntelligenceStore";
import { PressableScale } from "@/components/UI/PressableScale";
import { GlassCard } from "@/components/UI/GlassCard";

type NavProp = NativeStackNavigationProp<RootStackParamList>;
const { width } = Dimensions.get("window");

export default function HomeScreen() {
  const navigation = useNavigation<NavProp>();
  
  // React Query hooks for data fetching
  const { 
    data: destinationsData, 
    isLoading: destinationsLoading, 
    error: destinationsError,
    refetch: refetchDestinations 
  } = useDestinations();
  
  const { 
    data: featuredDestinations,
    isLoading: featuredLoading 
  } = useFeaturedDestinations();
  
  const { 
    data: trendingDestinations,
    isLoading: trendingLoading 
  } = useTrendingDestinations();

  // Local state for images (not cached by React Query)
  const [images, setImages] = useState<Record<string, UnsplashImage>>({});
  const [refreshing, setRefreshing] = useState(false);
  
  // Search state
  const [aiQuery, setAiQuery] = useState("");
  
  // Intelligence Store
  const { logSearch, activeTrip, inferredPreferences } = useTravelIntelligence();

  // Extract destinations from React Query response
  const destinations = useMemo(() => {
    return destinationsData?.destinations || [];
  }, [destinationsData]);

  // Load images separately (not in React Query to avoid cache invalidation)
  useEffect(() => {
    if (destinations.length > 0) {
      destinationsService.getAllDestinationImages()
        .then(setImages)
        .catch(() => {});
    }
  }, [destinations.length]);

  // Combined loading state
  const loading = destinationsLoading;
  const error = destinationsError ? (destinationsError as Error).message : null;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchDestinations();
    setRefreshing(false);
  }, [refetchDestinations]);

  const getImageUrl = useCallback((dest: Destination): string | undefined => {
    const img = images[dest.id];
    if (img) return img.url_small || img.url_thumb || img.url_regular;
    return undefined;
  }, [images]);

  const onDestPress = useCallback((dest: Destination) => {
    navigation.navigate("DestinationDetail", { destination: dest });
  }, [navigation]);

  const handleAiSearchSubmit = useCallback(() => {
    if (aiQuery.trim()) {
      logSearch(aiQuery);
      navigation.navigate("Itinerary" as any, { query: aiQuery });
    }
  }, [aiQuery, logSearch, navigation]);

  // Time-aware greeting
  const getGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    if (hour < 22) return "Good Evening";
    return "Time to Travel";
  }, []);

  // Simulated AI Logic & Groupings
  const liveTrip = activeTrip;
  
  // We use simple deterministic string matching, augmented by user inferred preferences
  const isBeachPref = inferredPreferences.includes("beaches");
  const isBudgetPref = inferredPreferences.includes("budget");

  // Use React Query data for recommendations
  const recommended = useMemo(() => {
    const data = featuredDestinations || destinations;
    return data.filter(d => 
      isBeachPref && d.category?.includes("beach") || d.region.includes("Kerala") || d.label.includes("Goa")
    ).slice(0, 5);
  }, [featuredDestinations, destinations, isBeachPref]);
  
  const trending = useMemo(() => {
    const data = trendingDestinations || destinations;
    return data.filter(d => d.label.length < 9).slice(-6).reverse();
  }, [trendingDestinations, destinations]);
  
  const budgetPicks = useMemo(() => {
    return destinations.filter(d => isBudgetPref || d.region.includes("Rajasthan") || d.label.includes("Rishikesh")).slice(1, 6);
  }, [destinations, isBudgetPref]);

  /* ================= FRONTEND BLOCKS ================= */

  const renderHero = useCallback(() => (
    <LinearGradient
      colors={["#0F172A", "#1E293B", "#F8FAFC"]}
      locations={[0, 0.4, 0.9]}
      style={styles.heroContainer}
    >
      <View style={styles.headerTop}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}, Laxman 👋</Text>
          <Text style={styles.subtitle}>Your AI Travel Assistant is ready</Text>
        </View>
        <PressableScale activeScale={0.9} style={styles.avatarWrapper}>
          <Image source={{ uri: "https://i.pravatar.cc/150?u=laxman" }} style={styles.avatar} />
        </PressableScale>
      </View>

      {/* Intelligent AI Prompt Search */}
      <GlassCard intensity={20} style={styles.aiSearchWrapper}>
        <Text style={styles.aiIcon}>✨</Text>
        <TextInput
          style={styles.aiInput}
          placeholder="Plan a weekend trip from Hyderabad..."
          placeholderTextColor="#94A3B8"
          value={aiQuery}
          onChangeText={setAiQuery}
          onSubmitEditing={handleAiSearchSubmit}
          autoCapitalize="none"
          returnKeyType="go"
        />
        <PressableScale style={styles.aiGoBtn} onPress={handleAiSearchSubmit}>
          <Text style={styles.aiGoBtnText}>→</Text>
        </PressableScale>
      </GlassCard>

      {/* Smart Filters (Replacing Categories) */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.smartFiltersScroll}>
          {["💰 Budget Smart", "🌤️ Weekend Away", "🏔️ Adventure", "🏛️ Culture"].map((filter, index) => (
            <TouchableOpacity key={index} style={styles.smartFilterChip}>
              <Text style={styles.smartFilterText}>{filter}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </LinearGradient>
  ), [getGreeting, aiQuery, handleAiSearchSubmit]);

  const renderContextActions = useCallback(() => (
    <View style={styles.contextActionsRow}>
      {liveTrip ? (
        <PressableScale style={[styles.contextBtn, styles.primaryContextBtn]} onPress={() => navigation.navigate("MainTabs", { screen: "Trips" } as any)}>
          <Text style={styles.primaryContextBtnText}>📍 Resume Trip</Text>
        </PressableScale>
      ) : (
        <PressableScale style={[styles.contextBtn, styles.primaryContextBtn]} onPress={() => navigation.navigate("Itinerary" as any)}>
          <Text style={styles.primaryContextBtnText}>✨ Plan New Trip</Text>
        </PressableScale>
      )}
      <PressableScale style={styles.contextBtn} onPress={() => navigation.navigate("MainTabs", { screen: "Explore" } as any)}>
        <Text style={styles.contextBtnText}>🧠 AI Recs</Text>
      </PressableScale>
    </View>
  ), [liveTrip, navigation]);

  const renderLiveTrip = useCallback(() => {
    if (!liveTrip) return null;
    const dest = liveTrip.destination;
    return (
      <View style={styles.liveTripSection}>
        <PressableScale 
          style={styles.liveTripCard}
          onPress={() => navigation.navigate("MainTabs", { screen: "Trips" } as any)}
        >
          <Image source={{ uri: dest.imageUrl || dest.image || getImageUrl(dest) || "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2" }} style={styles.liveTripImage} />
          <GlassCard intensity={30} tint="dark" style={styles.liveTripOverlay}>
            <View style={styles.liveTripHeaderRow}>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveIndicatorText}>UPCOMING TRIP</Text>
              </View>
              <Text style={styles.liveWeather}>🌤️ 28°C</Text>
            </View>
            
            <View style={styles.liveTripBottomRow}>
              <View>
                <Text style={styles.liveTripTitle}>{dest.label}</Text>
                <Text style={styles.liveTripSubtitle}>Starts in {liveTrip.days} Days • Budget On Track</Text>
              </View>
              <View style={styles.resumeCircleBtn}>
                <Text style={styles.resumeArrow}>→</Text>
              </View>
            </View>
          </GlassCard>
        </PressableScale>
      </View>
    );
  }, [liveTrip, navigation, getImageUrl]);

  const renderCarousel = useCallback((title: string, subtitle: string, data: Destination[]) => {
    if (data.length === 0) return null;
    return (
      <View style={styles.carouselSection}>
        <View style={styles.carouselHeader}>
          <Text style={styles.carouselTitle}>{title}</Text>
          <Text style={styles.carouselSubtitle}>{subtitle}</Text>
        </View>
        <FlatList
          horizontal
          data={data}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselContentRow}
          snapToInterval={260 + spacing.md}
          decelerationRate="fast"
          renderItem={({ item }) => (
            <DestinationCard
              destination={item}
              imageUrl={getImageUrl(item)}
              onPress={onDestPress}
              horizontal={true}
            />
          )}
        />
      </View>
    );
  }, [getImageUrl, onDestPress]);

  const renderContent = useCallback(() => (
    <View style={styles.mainFeed}>
      {renderContextActions()}
      {renderLiveTrip()}
      {renderCarousel("✨ Recommended for You", "Matched to your interests • 95% Match", recommended)}
      {renderCarousel("🔥 Trending Now", "Most booked destinations this week", trending)}
      {renderCarousel("💰 Budget-Friendly Picks", "Top rated under ₹10,000", budgetPicks)}
    </View>
  ), [renderContextActions, renderLiveTrip, renderCarousel, recommended, trending, budgetPicks]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {loading ? (
        <LoadingSpinner message="Spinning up the AI Engine..." />
      ) : error ? (
        <ErrorMessage message={error} onRetry={onRefresh} />
      ) : (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            {renderHero()}
            {renderContent()}
          </ScrollView>

          {/* Persistent Floating AI Planner CTA */}
          <PressableScale
            style={styles.fab}
            onPress={() => navigation.navigate("Itinerary" as any)}
          >
            <Text style={styles.fabIcon}>✨</Text>
            <Text style={styles.fabText}>Plan with AI</Text>
          </PressableScale>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  scrollContent: { paddingBottom: 140 },
  
  /* Hero Section */
  heroContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  greeting: { fontSize: 28, fontWeight: "900", color: "#FFFFFF", letterSpacing: -0.8 },
  subtitle: { fontSize: 16, color: "rgba(255, 255, 255, 0.7)", marginTop: 4, fontWeight: "500" },
  avatarWrapper: {
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5
  },
  avatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: "rgba(255,255,255,0.2)" },

  /* AI Search Input */
  aiSearchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 24,
    height: 64,
    paddingHorizontal: 16,
    shadowColor: "#0f766e",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(15, 118, 110, 0.1)",
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  aiIcon: { fontSize: 24, marginRight: 12 },
  aiInput: { flex: 1, fontSize: 17, fontWeight: "600", color: "#0F172A" },
  aiGoBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#0F172A",
    justifyContent: "center", alignItems: "center",
  },
  aiGoBtnText: { color: "#FFF", fontSize: 20, fontWeight: "900" },

  /* Smart Filters */
  filterSection: {
    marginTop: spacing.sm,
  },
  smartFiltersScroll: {
    paddingBottom: spacing.sm,
    gap: 10,
  },
  smartFilterChip: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 20, backgroundColor: "#ffffff",
    borderWidth: 1, borderColor: "#E2E8F0",
  },
  smartFilterText: { fontSize: 13, fontWeight: "700", color: "#475569" },

  /* Main Feed */
  mainFeed: {
    paddingTop: spacing.xs,
  },

  /* Context Actions */
  contextActionsRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    gap: 10,
  },
  contextBtn: {
    paddingHorizontal: 18, paddingVertical: 12,
    backgroundColor: "#ffffff", borderRadius: 16,
    borderWidth: 1, borderColor: "#E2E8F0",
    shadowColor: "#000", shadowOpacity: 0.02, elevation: 1,
  },
  primaryContextBtn: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  contextBtnText: { fontSize: 14, fontWeight: "700", color: "#475569" },
  primaryContextBtnText: { fontSize: 14, fontWeight: "800", color: "#ffffff" },

  /* Live Trip Card */
  liveTripSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  liveTripCard: {
    height: 180,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#0f766e", shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 6,
  },
  liveTripImage: { width: "100%", height: "100%" },
  liveTripOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: spacing.md,
    justifyContent: "space-between",
  },
  liveTripHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  liveIndicator: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#22c55e", marginRight: 8 },
  liveIndicatorText: { color: "#ffffff", fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  liveWeather: { fontSize: 16, fontWeight: "600", color: "#ffffff" },
  liveTripBottomRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end",
  },
  liveTripTitle: { fontSize: 28, fontWeight: "900", color: "#ffffff", letterSpacing: -0.5 },
  liveTripSubtitle: { fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.85)", marginTop: 4 },
  resumeCircleBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: "#ffffff",
    justifyContent: "center", alignItems: "center",
  },
  resumeArrow: { fontSize: 20, color: "#0F172A", fontWeight: "900" },

  /* Carousels */
  carouselSection: {
    marginBottom: spacing.xl,
  },
  carouselHeader: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  carouselTitle: { fontSize: 22, fontWeight: "900", color: "#0F172A", letterSpacing: -0.5 },
  carouselSubtitle: { fontSize: 14, color: "#64748B", fontWeight: "500", marginTop: 2 },
  carouselContentRow: {
    paddingLeft: spacing.lg,
    paddingRight: 4,
  },

  /* Floating AI Button (FAB) */
  fab: {
    position: "absolute",
    bottom: 24,
    left: "25%",
    right: "25%",
    height: 56,
    borderRadius: 28,
    backgroundColor: "#0f766e",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0f766e",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  fabIcon: { fontSize: 20, marginRight: 8 },
  fabText: { fontSize: 16, fontWeight: "800", color: "#ffffff" },
});