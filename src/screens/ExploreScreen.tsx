/**
 * ExploreScreen V4 – AI-Powered Smart Discovery Engine
 * Updated to use React Query hooks and FlashList for performance
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Keyboard,
  RefreshControl,
} from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { FlatList } from "react-native";

import LoadingSpinner from "@/components/Common/LoadingSpinner";
import ErrorMessage from "@/components/Common/ErrorMessage";
import DestinationCard from "@/components/Features/DestinationCard";
import { useDestinations, useSearchDestinations } from "@/api/queries/useDestinations";
import { destinationsService } from "@/services/destinations";
import { Destination, RootStackParamList, UnsplashImage } from "@/types";
import { colors, spacing } from "@/theme/colors";
import { PressableScale } from "@/components/UI/PressableScale";
import { GlassCard } from "@/components/UI/GlassCard";

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const CATEGORIES = [
  { id: "all", label: "All Destinations" },
  { id: "beach", label: "🏖️ Coast & Beaches" },
  { id: "hill", label: "🏔️ Mountains" },
  { id: "city", label: "🏙️ Metros & Cities" },
  { id: "spiritual", label: "🛕 Temples & Spirit" },
];

const RECENT_SEARCHES = ["Goa", "Manali", "Andaman"];
const POPULAR_SEARCHES = ["Kerala Backwaters", "Shimla", "Varanasi Spiritual", "Leh Ladakh Bike Trip"];

export default function ExploreScreen() {
  const navigation = useNavigation<NavProp>();
  
  // React Query for destinations
  const { 
    data: destinationsData, 
    isLoading: loading, 
    error: queryError, 
    refetch 
  } = useDestinations();
  
  // Search state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  
  // Images state (separate from destinations)
  const [images, setImages] = useState<Record<string, UnsplashImage>>({});

  // Search query with React Query
  const { data: searchResults } = useSearchDestinations(debouncedSearch);

  // Extract destinations from React Query response
  const destinations = useMemo(() => {
    return destinationsData?.destinations || [];
  }, [destinationsData]);

  // Load images separately (not in React Query to avoid cache invalidation)
  useEffect(() => {
    destinationsService.getAllDestinationImages()
      .then(setImages)
      .catch(() => {});
  }, [destinations.length]);

  // Handle Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Frontend Heuristic Categorization
  const isMatchCategory = useCallback((dest: Destination, catId: string) => {
    if (catId === "all") return true;
    const str = `${dest.label} ${dest.region} ${dest.tagline || ""}`.toLowerCase();
    switch(catId) {
      case "beach": return str.includes("beach") || str.includes("goa") || str.includes("andaman");
      case "hill": return str.includes("hill") || str.includes("mountain") || str.includes("manali") || str.includes("himachal") || str.includes("leh");
      case "city": return str.includes("city") || str.includes("mumbai") || str.includes("delhi") || str.includes("bangalore");
      case "spiritual": return str.includes("temple") || str.includes("spiritual") || str.includes("varanasi") || str.includes("amritsar");
      default: return false;
    }
  }, []);

  // Use search results or filtered destinations
  const filteredDestinations = useMemo(() => {
    if (debouncedSearch.trim().length >= 2 && searchResults) {
      return searchResults;
    }
    return destinations.filter((d) => isMatchCategory(d, activeCategory));
  }, [debouncedSearch, searchResults, destinations, activeCategory, isMatchCategory]);

  const getImageUrl = useCallback((dest: Destination): string | undefined => {
    const img = images[dest.id];
    if (img) return img.url_small || img.url_thumb || img.url_regular;
    return undefined;
  }, [images]);

  const onDestPress = useCallback((dest: Destination) => {
    navigation.navigate("DestinationDetail", { destination: dest });
  }, [navigation]);

  // Intelligent Clusters (Mock Personalization)
  const recommended = useMemo(() => 
    destinations.filter(d => d.region.includes("Himachal") || d.region.includes("Kerala")).slice(0, 4),
    [destinations]
  );
  
  const trending = useMemo(() => 
    destinations.filter(d => d.label.length < 10).slice(-5).reverse(),
    [destinations]
  );

  const error = queryError ? (queryError as Error).message : null;

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const renderDestination = useCallback(({ item }: { item: Destination }) => (
    <DestinationCard 
      destination={item} 
      imageUrl={getImageUrl(item)} 
      onPress={onDestPress} 
    />
  ), [getImageUrl, onDestPress]);

  const renderHorizontalDestination = useCallback(({ item }: { item: Destination }) => (
    <DestinationCard 
      destination={item} 
      imageUrl={getImageUrl(item)} 
      onPress={onDestPress} 
      horizontal 
    />
  ), [getImageUrl, onDestPress]);

  /* ================= FRONTEND SECTIONS ================= */
  
  const renderHeader = useCallback(() => {
    if (isSearchFocused) return null;

    return (
      <View style={styles.headerBlock}>
        {/* ✨ Recommended For You (AI Personalization) */}
        {!debouncedSearch && recommended.length > 0 && (
          <View style={styles.premiumSection}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sparkleTitle}>✨ Recommended for You</Text>
              <Text style={styles.subtitleContext}>Because you like mountains & nature</Text>
            </View>
            <FlatList
              horizontal
              data={recommended}
              keyExtractor={d => `rec-${d.id}`}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hListContent}
              renderItem={renderHorizontalDestination}
            />
          </View>
        )}

        {/* Category Icons */}
        {!debouncedSearch && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            {CATEGORIES.map((cat) => (
              <PressableScale
                key={cat.id}
                style={[styles.categoryPill, activeCategory === cat.id ? styles.categoryPillActive : {}]}
                onPress={() => setActiveCategory(cat.id)}
              >
                <Text style={[styles.categoryText, activeCategory === cat.id ? styles.categoryTextActive : {}]}>
                  {cat.label}
                </Text>
              </PressableScale>
            ))}
          </ScrollView>
        )}

        {/* 🔥 Trending Now Carousel */}
        {!debouncedSearch && activeCategory === "all" && trending.length > 0 && (
          <View style={styles.premiumSection}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.trendingTitle}>🔥 Trending Now</Text>
              <Text style={styles.subtitleContext}>Most booked this week</Text>
            </View>
            <FlatList
              horizontal
              data={trending}
              keyExtractor={d => `trend-${d.id}`}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hListContent}
              renderItem={renderHorizontalDestination}
            />
          </View>
        )}

        {/* Start of Main Grid */}
        <View style={styles.gridHeaderBlock}>
          <Text style={styles.gridTitle}>
            {debouncedSearch ? `Results for "${debouncedSearch}"` : `Discover ${activeCategory !== 'all' ? activeCategory : 'All'}`}
          </Text>
        </View>
      </View>
    );
  }, [isSearchFocused, debouncedSearch, recommended, trending, activeCategory, renderHorizontalDestination]);

  const renderSearchOverlay = useCallback(() => {
    if (!isSearchFocused) return null;
    return (
      <View style={styles.searchOverlay}>
        <Text style={styles.searchSectionLabel}>Recent Searches</Text>
        <View style={styles.chipsRow}>
          {RECENT_SEARCHES.map(s => (
            <PressableScale key={s} style={styles.searchChip} onPress={() => { setSearch(s); Keyboard.dismiss(); }}>
              <Text style={styles.searchChipText}>🕒 {s}</Text>
            </PressableScale>
          ))}
        </View>

        <Text style={[styles.searchSectionLabel, { marginTop: 24 }]}>Popular Destinations</Text>
        {POPULAR_SEARCHES.map(p => (
          <PressableScale key={p} style={styles.popularSearchRow} onPress={() => { setSearch(p); Keyboard.dismiss(); }}>
            <Text style={styles.popularSearchIcon}>🔥</Text>
            <Text style={styles.popularSearchText}>{p}</Text>
            <Text style={styles.popularSearchArrow}>↗</Text>
          </PressableScale>
        ))}
      </View>
    );
  }, [isSearchFocused]);

  const ListEmptyComponent = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Text style={{ fontSize: 64 }}>🗺️</Text>
      <Text style={styles.emptyTitle}>No places found</Text>
      <Text style={styles.emptySub}>Adjust your search or category filters.</Text>
    </View>
  ), []);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Search Header - Fixed at Top */}
      <View style={styles.topStickyHeader}>
        <LinearGradient
          colors={["#F8FAFC", "#F1F5F9"]}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.screenTitle}>Explore</Text>
        <View style={styles.searchRow}>
          <GlassCard intensity={20} style={[styles.searchInputWrapper, isSearchFocused ? styles.searchInputWrapperFocused : {}]}>
            <Text style={styles.searchIcon}>✨</Text>
            <TextInput
              placeholder="Where to next? Try 'Beaches'..."
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              style={styles.searchInput}
              autoCapitalize="none"
            />
            {search.length > 0 && (
              <PressableScale onPress={() => setSearch("")}>
                <Text style={styles.clearSearchIcon}>✕</Text>
              </PressableScale>
            )}
          </GlassCard>
          {isSearchFocused && (
            <TouchableOpacity onPress={() => { Keyboard.dismiss(); setIsSearchFocused(false); }}>
              <Text style={styles.cancelSearchText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Content Area */}
      {loading ? (
        <LoadingSpinner message="Curating destinations..." />
      ) : error ? (
        <ErrorMessage message={error} onRetry={onRefresh} />
      ) : (
        <>
          {/* Smart Search Overlay */}
          {renderSearchOverlay()}

          {/* Underlying List (Hidden visually when searching) */}
          {!isSearchFocused && (
            <FlatList
              data={filteredDestinations}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.gridRow}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={renderHeader}
              ListEmptyComponent={ListEmptyComponent}
              refreshControl={
                <RefreshControl refreshing={loading} onRefresh={onRefresh} />
              }
              renderItem={renderDestination}
            />
          )}

          {/* Floating Action Button (FAB) for AI Planner */}
          {!isSearchFocused && (
            <PressableScale
              style={styles.fab}
              onPress={() => navigation.navigate("Itinerary" as any)}
            >
              <Text style={styles.fabIcon}>✨</Text>
              <Text style={styles.fabText}>Plan Trip with AI</Text>
            </PressableScale>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  listContent: { paddingBottom: 160 },
  gridRow: {
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  
  /* Top Sticky Header */
  topStickyHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: "#F8FAFC",
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.5,
    marginBottom: spacing.md,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
    borderWidth: 1, borderColor: "rgba(0,0,0,0.03)",
  },
  searchInputWrapperFocused: {
    borderColor: "#0f766e",
    borderWidth: 2,
    shadowOpacity: 0.1,
  },
  searchIcon: { fontSize: 18, marginRight: 10 },
  clearSearchIcon: { fontSize: 16, color: "#94A3B8", padding: 8 },
  searchInput: { flex: 1, fontSize: 15, color: "#1E293B", fontWeight: "500" },
  cancelSearchText: { fontSize: 15, fontWeight: "600", color: "#0f766e" },

  /* Search Overlay */
  searchOverlay: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  searchSectionLabel: { fontSize: 16, fontWeight: "800", color: "#0F172A", marginBottom: spacing.md },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  searchChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: "#F1F5F9", borderRadius: 20,
    borderWidth: 1, borderColor: "#E2E8F0",
  },
  searchChipText: { fontSize: 14, fontWeight: "500", color: "#475569" },
  popularSearchRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#F1F5F9",
  },
  popularSearchIcon: { fontSize: 20, marginRight: 16 },
  popularSearchText: { flex: 1, fontSize: 16, fontWeight: "500", color: "#1E293B" },
  popularSearchArrow: { fontSize: 16, color: "#94A3B8" },

  /* Main FlashList Header Block */
  headerBlock: {
    paddingBottom: spacing.sm,
  },

  /* Categories */
  categoryScroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1, borderColor: "#E2E8F0",
    shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 6, elevation: 1,
  },
  categoryPillActive: {
    backgroundColor: "#0f766e",
    borderColor: "#0f766e",
  },
  categoryText: { fontSize: 14, fontWeight: "700", color: "#475569" },
  categoryTextActive: { color: "#FFFFFF" },

  /* Premium Intelligent Sections */
  premiumSection: {
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
  },
  sectionTitleRow: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sparkleTitle: { fontSize: 22, fontWeight: "800", color: "#0F172A", letterSpacing: -0.5 },
  trendingTitle: { fontSize: 22, fontWeight: "800", color: "#ea580c", letterSpacing: -0.5 },
  subtitleContext: { fontSize: 14, color: "#64748B", marginTop: 2, fontWeight: "500" },
  hListContent: {
    paddingLeft: spacing.lg,
    paddingRight: 4,
  },

  /* Grid Header */
  gridHeaderBlock: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  gridTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A", letterSpacing: -0.3, textTransform: "capitalize" },

  /* Floating Action Button */
  fab: {
    position: "absolute",
    bottom: 24,
    left: "20%",
    right: "20%",
    backgroundColor: "#0F172A",
    borderRadius: 30,
    height: 56,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 16, elevation: 10,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  fabIcon: { fontSize: 20, marginRight: 8 },
  fabText: { fontSize: 16, fontWeight: "800", color: "#FFFFFF", letterSpacing: 0.5 },

  /* Empty State */
  emptyContainer: {
    alignItems: "center", justifyContent: "center",
    paddingVertical: spacing.xxl * 2,
  },
  emptyTitle: { fontSize: 22, fontWeight: "800", color: "#1E293B", marginTop: 16 },
  emptySub: { fontSize: 15, color: "#64748B", marginTop: 8, textAlign: "center", paddingHorizontal: 30 },
});