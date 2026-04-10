import React, { useEffect, useState, useCallback } from "react";
import { View, FlatList, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import LoadingSpinner from "@/components/Common/LoadingSpinner";
import { favoritesService, Favorite } from "@/services/favorites";
import { colors, spacing } from "@/theme/colors";

export default function FavoritesScreen() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await favoritesService.list(filter || undefined);
      setFavorites(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const removeFav = (fav: Favorite) => {
    Alert.alert("Remove", `Remove "${fav.item_name}" from wishlist?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => {
        try {
          await favoritesService.remove(fav.id);
          setFavorites(prev => prev.filter(f => f.id !== fav.id));
        } catch { Alert.alert("Error", "Failed to remove"); }
      }},
    ]);
  };

  if (loading) return <LoadingSpinner message="Loading wishlist…" />;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>❤️ My Wishlist</Text>
        <Text style={styles.count}>{favorites.length} saved</Text>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {[null, "destination", "place"].map((f) => (
          <TouchableOpacity key={String(f)} style={[styles.filterChip, filter === f && styles.filterActive]}
            onPress={() => { setFilter(f); setLoading(true); }}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === null ? "All" : f === "destination" ? "🏔️ Destinations" : "📍 Places"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={favorites}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.favCard}>
            <View style={styles.favIcon}>
              <Text style={{ fontSize: 28 }}>{item.item_type === "destination" ? "🏔️" : "📍"}</Text>
            </View>
            <View style={styles.favInfo}>
              <Text style={styles.favName}>{item.item_name}</Text>
              <Text style={styles.favType}>{item.item_type}</Text>
              {item.notes ? <Text style={styles.favNotes} numberOfLines={2}>{item.notes}</Text> : null}
              <Text style={styles.favDate}>
                Added {new Date(item.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </Text>
            </View>
            <TouchableOpacity onPress={() => removeFav(item)} style={styles.removeBtn}>
              <Text style={{ fontSize: 18 }}>💔</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 64 }}>💝</Text>
            <Text style={styles.emptyTitle}>No favorites yet</Text>
            <Text style={styles.emptyText}>Browse destinations and tap the heart to save them here!</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.md },
  title: { fontSize: 26, fontWeight: "800", color: colors.text },
  count: { fontSize: 14, color: colors.gray },
  filterRow: { flexDirection: "row", paddingHorizontal: spacing.md, gap: spacing.sm, marginBottom: spacing.md },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  filterActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 13, color: colors.text },
  filterTextActive: { color: "#FFF", fontWeight: "600" },
  error: { color: colors.error, textAlign: "center", padding: spacing.md },
  list: { paddingHorizontal: spacing.md, paddingBottom: 100 },
  favCard: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: 16, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  favIcon: { marginRight: spacing.sm },
  favInfo: { flex: 1 },
  favName: { fontSize: 16, fontWeight: "700", color: colors.text },
  favType: { fontSize: 12, color: colors.primary, fontWeight: "500", textTransform: "capitalize", marginTop: 2 },
  favNotes: { fontSize: 13, color: colors.gray, marginTop: 4 },
  favDate: { fontSize: 11, color: colors.gray, marginTop: 4 },
  removeBtn: { padding: spacing.xs },
  empty: { alignItems: "center", padding: spacing.xxl, marginTop: spacing.xxl },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: colors.text, marginTop: spacing.md },
  emptyText: { fontSize: 14, color: colors.gray, textAlign: "center", marginTop: spacing.sm },
});
