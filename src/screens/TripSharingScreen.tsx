import React, { useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import LoadingSpinner from "@/components/Common/LoadingSpinner";
import { sharingService, SharedTrip } from "@/services/sharing";
import { tripPlannerService, TripData } from "@/services/tripPlanner";
import { colors, spacing } from "@/theme/colors";
import { API_BASE_URL } from "@/constants/config";

export default function TripSharingScreen() {
  const [trips, setTrips] = useState<TripData[]>([]);
  const [shares, setShares] = useState<SharedTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      tripPlannerService.listTrips().then(r => setTrips(r.trips || [])),
      sharingService.listShares().then(r => setShares(r.shares || [])),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleShare = async () => {
    if (!selectedTrip) { Alert.alert("Select a trip first"); return; }
    const trip = trips.find(t => t.id === selectedTrip);
    setCreating(true);
    try {
      const res = await sharingService.createShare({
        title: trip?.title || "My Trip", trip_id: selectedTrip,
      });
      Alert.alert("🔗 Link Created!", `Share URL: ${API_BASE_URL}${res.share_url}`);
      const s = await sharingService.listShares();
      setShares(s.shares || []);
    } catch (e: any) { Alert.alert("Error", e.message); }
    finally { setCreating(false); }
  };

  const handleRevoke = (share: SharedTrip) => {
    Alert.alert("Revoke Link", "This will disable the share link.", [
      { text: "Cancel" },
      { text: "Revoke", style: "destructive", onPress: async () => {
        try {
          await sharingService.revokeShare(share.share_token);
          const s = await sharingService.listShares();
          setShares(s.shares || []);
        } catch {}
      }},
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>🔗 Trip Sharing</Text>
        <Text style={styles.subtitle}>Share your trips with friends & family</Text>

        {/* Trip selector */}
        <Text style={styles.sectionTitle}>Select a trip to share</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {trips.map(t => (
              <TouchableOpacity key={t.id} style={[styles.tripChip, selectedTrip === t.id && styles.tripActive]}
                onPress={() => setSelectedTrip(t.id)}>
                <Text style={[styles.tripText, selectedTrip === t.id && { color: "#FFF" }]}>{t.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <TouchableOpacity style={styles.shareBtn} onPress={handleShare} disabled={creating || !selectedTrip}>
          <Text style={styles.shareBtnText}>{creating ? "Creating…" : "🔗 Generate Share Link"}</Text>
        </TouchableOpacity>

        {/* Active shares */}
        <Text style={styles.sectionTitle}>📋 Your Share Links ({shares.length})</Text>

        {loading ? <LoadingSpinner message="Loading…" /> : (
          shares.length === 0 ? (
            <View style={styles.empty}>
              <Text style={{ fontSize: 48 }}>🔗</Text>
              <Text style={styles.emptyTitle}>No shared trips</Text>
              <Text style={styles.emptyText}>Generate a link above to share</Text>
            </View>
          ) : (
            shares.map(share => (
              <View key={share.id} style={styles.shareCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.shareTitle}>{share.title}</Text>
                  <Text style={styles.shareLink}>{API_BASE_URL}/shared/{share.share_token}</Text>
                  <View style={styles.shareMeta}>
                    <Text style={styles.shareViews}>👁 {share.view_count} views</Text>
                    <Text style={[styles.shareBadge, { color: share.is_active ? "#10B981" : "#EF4444" }]}>
                      {share.is_active ? "🟢 Active" : "🔴 Revoked"}
                    </Text>
                  </View>
                </View>
                {share.is_active && (
                  <TouchableOpacity onPress={() => handleRevoke(share)} style={styles.revokeBtn}>
                    <Text style={styles.revokeText}>Revoke</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )
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
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  tripChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tripActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tripText: { fontSize: 13, fontWeight: "600", color: colors.text },
  shareBtn: { backgroundColor: "#7C3AED", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginBottom: spacing.lg },
  shareBtnText: { color: "#FFF", fontWeight: "700", fontSize: 16 },
  shareCard: { flexDirection: "row", alignItems: "flex-start", backgroundColor: colors.surface, borderRadius: 14, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  shareTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  shareLink: { fontSize: 12, color: colors.primary, marginTop: 4 },
  shareMeta: { flexDirection: "row", gap: 12, marginTop: 6 },
  shareViews: { fontSize: 12, color: colors.gray },
  shareBadge: { fontSize: 12, fontWeight: "600" },
  revokeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "#FEE2E2" },
  revokeText: { fontSize: 12, fontWeight: "600", color: "#EF4444" },
  empty: { alignItems: "center", paddingVertical: spacing.xxl },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginTop: spacing.sm },
  emptyText: { fontSize: 14, color: colors.gray },
});
