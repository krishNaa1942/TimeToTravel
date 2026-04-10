import React, { useEffect, useState } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import LoadingSpinner from "@/components/Common/LoadingSpinner";
import { statsService, TravelStats } from "@/services/stats";
import { colors, spacing } from "@/theme/colors";

export default function TravelStatsScreen() {
  const [stats, setStats] = useState<TravelStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    statsService.getStats().then(r => setStats(r.stats)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <SafeAreaView style={styles.container}><LoadingSpinner message="Loading stats…" /></SafeAreaView>;
  if (!stats) return (
    <SafeAreaView style={styles.container}><View style={styles.empty}>
      <Text style={{ fontSize: 48 }}>📊</Text>
      <Text style={styles.emptyTitle}>No stats available</Text>
    </View></SafeAreaView>
  );

  const spendingEntries = Object.entries(stats.spending_breakdown || {});

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>📊 Travel Dashboard</Text>
        <Text style={styles.subtitle}>Your travel journey at a glance</Text>

        {/* Hero stats */}
        <View style={styles.heroRow}>
          <View style={styles.heroCard}>
            <Text style={styles.heroValue}>{stats.trips.total}</Text>
            <Text style={styles.heroLabel}>Trips</Text>
          </View>
          <View style={styles.heroCard}>
            <Text style={styles.heroValue}>{stats.destinations_visited}</Text>
            <Text style={styles.heroLabel}>Destinations</Text>
          </View>
          <View style={styles.heroCard}>
            <Text style={styles.heroValue}>{stats.total_travel_days}</Text>
            <Text style={styles.heroLabel}>Days</Text>
          </View>
        </View>

        {/* Trip status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🗂️ Trip Status</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusBox, { backgroundColor: "#6366F1" }]}>
              <Text style={styles.statusVal}>{stats.trips.planning}</Text>
              <Text style={styles.statusLabel}>Planning</Text>
            </View>
            <View style={[styles.statusBox, { backgroundColor: "#10B981" }]}>
              <Text style={styles.statusVal}>{stats.trips.active}</Text>
              <Text style={styles.statusLabel}>Active</Text>
            </View>
            <View style={[styles.statusBox, { backgroundColor: "#F59E0B" }]}>
              <Text style={styles.statusVal}>{stats.trips.completed}</Text>
              <Text style={styles.statusLabel}>Done</Text>
            </View>
          </View>
        </View>

        {/* Spending */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Total Spending</Text>
          <View style={styles.spendingCard}>
            <Text style={styles.spendTotal}>₹{stats.total_spent.toLocaleString()}</Text>
            {spendingEntries.map(([cat, amt]) => (
              <View key={cat} style={styles.spendRow}>
                <Text style={styles.spendCat}>{cat}</Text>
                <View style={styles.spendBarBg}>
                  <View style={[styles.spendBar, { width: `${Math.min((amt / stats.total_spent) * 100, 100)}%` }]} />
                </View>
                <Text style={styles.spendAmt}>₹{amt.toLocaleString()}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* More stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📈 Highlights</Text>
          <View style={styles.highlightsGrid}>
            <View style={styles.highlightCard}>
              <Text style={styles.highlightEmoji}>📍</Text>
              <Text style={styles.highlightVal}>{stats.places_visited}</Text>
              <Text style={styles.highlightLabel}>Places</Text>
            </View>
            <View style={styles.highlightCard}>
              <Text style={styles.highlightEmoji}>🎫</Text>
              <Text style={styles.highlightVal}>{stats.reservations.total}</Text>
              <Text style={styles.highlightLabel}>Bookings</Text>
            </View>
            <View style={styles.highlightCard}>
              <Text style={styles.highlightEmoji}>📸</Text>
              <Text style={styles.highlightVal}>{stats.photos_uploaded}</Text>
              <Text style={styles.highlightLabel}>Photos</Text>
            </View>
            <View style={styles.highlightCard}>
              <Text style={styles.highlightEmoji}>❤️</Text>
              <Text style={styles.highlightVal}>{stats.favorites_count}</Text>
              <Text style={styles.highlightLabel}>Favorites</Text>
            </View>
          </View>
        </View>

        {/* Top destinations */}
        {stats.top_destinations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏆 Top Destinations</Text>
            {stats.top_destinations.map((d, i) => (
              <View key={i} style={styles.topRow}>
                <Text style={styles.topRank}>#{i + 1}</Text>
                <Text style={styles.topDest}>{d.destination}</Text>
                <Text style={styles.topCount}>{d.trips} trips</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, paddingBottom: 100 },
  title: { fontSize: 26, fontWeight: "800", color: colors.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: colors.gray, marginBottom: spacing.lg },
  heroRow: { flexDirection: "row", gap: 10, marginBottom: spacing.lg },
  heroCard: { flex: 1, backgroundColor: "#1E293B", borderRadius: 16, paddingVertical: 20, alignItems: "center" },
  heroValue: { fontSize: 28, fontWeight: "900", color: "#FFF" },
  heroLabel: { fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 4 },
  section: { marginBottom: spacing.lg },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  statusRow: { flexDirection: "row", gap: 10 },
  statusBox: { flex: 1, borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  statusVal: { fontSize: 24, fontWeight: "900", color: "#FFF" },
  statusLabel: { fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 4 },
  spendingCard: { backgroundColor: colors.surface, borderRadius: 16, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  spendTotal: { fontSize: 28, fontWeight: "900", color: colors.primary, marginBottom: spacing.md },
  spendRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  spendCat: { width: 70, fontSize: 12, color: colors.text, fontWeight: "600", textTransform: "capitalize" },
  spendBarBg: { flex: 1, height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: "hidden" },
  spendBar: { height: 8, backgroundColor: colors.primary, borderRadius: 4 },
  spendAmt: { width: 80, fontSize: 12, color: colors.gray, textAlign: "right" },
  highlightsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  highlightCard: { width: "47%", backgroundColor: colors.surface, borderRadius: 14, paddingVertical: 16, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  highlightEmoji: { fontSize: 28 },
  highlightVal: { fontSize: 22, fontWeight: "800", color: colors.text, marginTop: 4 },
  highlightLabel: { fontSize: 12, color: colors.gray, marginTop: 2 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  topRank: { fontSize: 16, fontWeight: "800", color: colors.primary, width: 30 },
  topDest: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.text, textTransform: "capitalize" },
  topCount: { fontSize: 13, color: colors.gray },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: spacing.xxl },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginTop: spacing.sm },
});
