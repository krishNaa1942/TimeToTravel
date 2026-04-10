import React, { useEffect, useState } from "react";
import { View, FlatList, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import LoadingSpinner from "@/components/Common/LoadingSpinner";
import { placesService, Place } from "@/services/places";
import { colors, spacing } from "@/theme/colors";

const SITUATIONS = [
  { key: "exploring", label: "🏛️ Sightseeing", },
  { key: "hungry", label: "🍽️ Food", },
  { key: "relaxing", label: "🧘 Relax", },
  { key: "shopping", label: "🛍️ Shopping", },
  { key: "nightlife", label: "🌙 Nightlife", },
  { key: "family", label: "👨‍👩‍👧 Family", },
  { key: "emergency", label: "🏥 Emergency", },
];

// Default coords for popular cities (user can change)
const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  "Goa": { lat: 15.4909, lon: 73.8278 },
  "Jaipur": { lat: 26.9124, lon: 75.7873 },
  "Mumbai": { lat: 19.0760, lon: 72.8777 },
  "Delhi": { lat: 28.6139, lon: 77.2090 },
  "Manali": { lat: 32.2396, lon: 77.1887 },
  "Varanasi": { lat: 25.3176, lon: 82.9739 },
  "Kochi": { lat: 9.9312, lon: 76.2673 },
  "Agra": { lat: 27.1767, lon: 78.0081 },
};

export default function PlacesScreen() {
  const [selectedCity, setSelectedCity] = useState("Goa");
  const [situation, setSituation] = useState("exploring");
  const [places, setPlaces] = useState<Place[]>([]);
  const [reasons, setReasons] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    placesService.checkStatus().then(setAvailable);
  }, []);

  const search = async () => {
    const coords = CITY_COORDS[selectedCity];
    if (!coords) return;
    setLoading(true);
    try {
      const res = await placesService.recommend(coords.lat, coords.lon, situation);
      setPlaces(res.places || []);
      setReasons(res.reasons || []);
    } catch { setPlaces([]); }
    finally { setLoading(false); }
  };

  if (!available) return (
    <SafeAreaView style={styles.container}><View style={styles.empty}>
      <Text style={{ fontSize: 64 }}>📍</Text>
      <Text style={styles.emptyTitle}>Places service unavailable</Text>
      <Text style={styles.emptyText}>Foursquare API is not configured on the server.</Text>
    </View></SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>📍 Discover Places</Text>
      </View>

      {/* City picker */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: spacing.md, marginBottom: spacing.sm }}>
        <View style={styles.chipRow}>
          {Object.keys(CITY_COORDS).map((city) => (
            <TouchableOpacity key={city}
              style={[styles.chip, selectedCity === city && styles.chipActive]}
              onPress={() => { setSelectedCity(city); setPlaces([]); }}>
              <Text style={[styles.chipText, selectedCity === city && styles.chipTextActive]}>{city}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Situation picker */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: spacing.md, marginBottom: spacing.md }}>
        <View style={styles.chipRow}>
          {SITUATIONS.map((s) => (
            <TouchableOpacity key={s.key}
              style={[styles.sitChip, situation === s.key && styles.sitChipActive]}
              onPress={() => { setSituation(s.key); setPlaces([]); }}>
              <Text style={[styles.sitText, situation === s.key && styles.sitTextActive]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.searchBtn} onPress={search} disabled={loading}>
        <Text style={styles.searchBtnText}>{loading ? "Searching…" : `🔍 Find Places in ${selectedCity}`}</Text>
      </TouchableOpacity>

      {loading && <LoadingSpinner message="Discovering places…" />}

      {reasons.length > 0 && (
        <View style={styles.reasonsBox}>
          {reasons.map((r, i) => <Text key={i} style={styles.reasonText}>✨ {r}</Text>)}
        </View>
      )}

      <FlatList
        data={places}
        keyExtractor={(item) => item.fsq_id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.placeCard}>
            <View style={styles.placeHeader}>
              <Text style={styles.placeName}>{item.name}</Text>
              {item.rating ? <View style={styles.ratingBadge}><Text style={styles.ratingText}>⭐ {item.rating}</Text></View> : null}
            </View>
            <Text style={styles.placeAddress} numberOfLines={2}>{item.address || "Address unavailable"}</Text>
            <View style={styles.placeMeta}>
              <Text style={styles.metaChip}>📍 {item.category}</Text>
              {item.distance ? <Text style={styles.metaChip}>📏 {(item.distance / 1000).toFixed(1)}km</Text> : null}
              {item.is_open !== undefined && <Text style={[styles.metaChip, { color: item.is_open ? "#10B981" : "#EF4444" }]}>{item.is_open ? "✅ Open" : "🔴 Closed"}</Text>}
              {item.price_level && <Text style={styles.metaChip}>💰 {item.price_level}</Text>}
            </View>
          </View>
        )}
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 48 }}>🗺️</Text>
            <Text style={styles.emptyText}>Tap search to discover places</Text>
          </View>
        ) : null}
      />
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.md, paddingBottom: spacing.xs },
  title: { fontSize: 26, fontWeight: "800", color: colors.text },
  chipRow: { flexDirection: "row", gap: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.text },
  chipTextActive: { color: "#FFF", fontWeight: "600" },
  sitChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  sitChipActive: { backgroundColor: "#7C3AED", borderColor: "#7C3AED" },
  sitText: { fontSize: 13, color: colors.text },
  sitTextActive: { color: "#FFF", fontWeight: "600" },
  searchBtn: { marginHorizontal: spacing.md, backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: "center", marginBottom: spacing.md },
  searchBtnText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
  reasonsBox: { marginHorizontal: spacing.md, backgroundColor: "#EDE9FE", borderRadius: 12, padding: spacing.sm, marginBottom: spacing.md },
  reasonText: { fontSize: 13, color: "#5B21B6", lineHeight: 20 },
  list: { paddingHorizontal: spacing.md, paddingBottom: 100 },
  placeCard: { backgroundColor: colors.surface, borderRadius: 16, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  placeHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  placeName: { fontSize: 16, fontWeight: "700", color: colors.text, flex: 1 },
  ratingBadge: { backgroundColor: "#FEF3C7", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  ratingText: { fontSize: 12, fontWeight: "700", color: "#92400E" },
  placeAddress: { fontSize: 13, color: colors.gray, marginTop: 4 },
  placeMeta: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.sm },
  metaChip: { fontSize: 12, color: colors.text, backgroundColor: colors.background, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  empty: { alignItems: "center", padding: spacing.xxl },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: colors.text, marginTop: spacing.md },
  emptyText: { fontSize: 14, color: colors.gray, textAlign: "center", marginTop: spacing.sm },
});
