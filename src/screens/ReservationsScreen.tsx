import React, { useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Text, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import LoadingSpinner from "@/components/Common/LoadingSpinner";
import { reservationService, Reservation } from "@/services/reservations";
import { tripPlannerService, TripData } from "@/services/tripPlanner";
import { colors, spacing } from "@/theme/colors";

const RES_TYPES = [
  { key: "flight", emoji: "✈️", label: "Flight" },
  { key: "hotel", emoji: "🏨", label: "Hotel" },
  { key: "restaurant", emoji: "🍽️", label: "Restaurant" },
  { key: "transport", emoji: "🚗", label: "Transport" },
  { key: "activity", emoji: "🎯", label: "Activity" },
  { key: "other", emoji: "📋", label: "Other" },
];

export default function ReservationsScreen() {
  const [trips, setTrips] = useState<TripData[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<number | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);

  const [resType, setResType] = useState("flight");
  const [resTitle, setResTitle] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [provider, setProvider] = useState("");
  const [location, setLocation] = useState("");
  const [resAmount, setResAmount] = useState("");
  const [resNotes, setResNotes] = useState("");

  useEffect(() => {
    tripPlannerService.listTrips().then(r => {
      setTrips(r.trips || []);
      if (r.trips?.length) { setSelectedTrip(r.trips[0].id); }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedTrip) return;
    setLoading(true);
    reservationService.listByTrip(selectedTrip).then(r => setReservations(r.reservations || []))
      .catch(() => setReservations([])).finally(() => setLoading(false));
  }, [selectedTrip]);

  const handleAdd = async () => {
    if (!selectedTrip || !resTitle.trim()) { Alert.alert("Error", "Select trip and enter title"); return; }
    setAdding(true);
    try {
      await reservationService.add({
        trip_id: selectedTrip, res_type: resType, title: resTitle.trim(),
        confirmation_code: confirmCode.trim() || undefined, provider: provider.trim() || undefined,
        location: location.trim() || undefined, notes: resNotes.trim() || undefined,
        amount: resAmount ? parseFloat(resAmount) : undefined,
      });
      setShowAdd(false); setResTitle(""); setConfirmCode(""); setProvider("");
      setLocation(""); setResAmount(""); setResNotes("");
      const r = await reservationService.listByTrip(selectedTrip);
      setReservations(r.reservations || []);
    } catch (e: any) { Alert.alert("Error", e.message); }
    finally { setAdding(false); }
  };

  const getEmoji = (type: string) => RES_TYPES.find(r => r.key === type)?.emoji || "📋";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>🎫 Reservations</Text>
        <Text style={styles.subtitle}>Track flights, hotels & bookings</Text>

        {/* Trip selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {trips.map(t => (
              <TouchableOpacity key={t.id} style={[styles.tripChip, selectedTrip === t.id && styles.tripChipActive]}
                onPress={() => setSelectedTrip(t.id)}>
                <Text style={[styles.tripChipText, selectedTrip === t.id && { color: "#FFF" }]}>{t.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {selectedTrip && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(!showAdd)}>
            <Text style={styles.addBtnText}>{showAdd ? "✕ Cancel" : "＋ Add Booking"}</Text>
          </TouchableOpacity>
        )}

        {showAdd && (
          <View style={styles.form}>
            <View style={styles.typeRow}>
              {RES_TYPES.map(r => (
                <TouchableOpacity key={r.key} style={[styles.typeChip, resType === r.key && styles.typeActive]}
                  onPress={() => setResType(r.key)}>
                  <Text style={{ fontSize: 20 }}>{r.emoji}</Text>
                  <Text style={[styles.typeText, resType === r.key && { color: "#FFF" }]}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput mode="outlined" label="Title (e.g. Delhi → Goa)" value={resTitle} onChangeText={setResTitle}
              style={styles.input} outlineColor={colors.border} activeOutlineColor={colors.primary} />
            <TextInput mode="outlined" label="Confirmation Code" value={confirmCode} onChangeText={setConfirmCode}
              style={styles.input} outlineColor={colors.border} />
            <TextInput mode="outlined" label="Provider (airline, hotel...)" value={provider} onChangeText={setProvider}
              style={styles.input} outlineColor={colors.border} />
            <TextInput mode="outlined" label="Location" value={location} onChangeText={setLocation}
              style={styles.input} outlineColor={colors.border} />
            <TextInput mode="outlined" label="Amount (₹)" value={resAmount} onChangeText={setResAmount}
              keyboardType="numeric" style={styles.input} outlineColor={colors.border} />
            <TouchableOpacity style={styles.submitBtn} onPress={handleAdd} disabled={adding}>
              <Text style={styles.submitText}>{adding ? "Saving…" : "💾 Save Booking"}</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading ? <LoadingSpinner message="Loading…" /> : (
          reservations.length === 0 ? (
            <View style={styles.empty}>
              <Text style={{ fontSize: 48 }}>🎫</Text>
              <Text style={styles.emptyTitle}>{selectedTrip ? "No bookings yet" : "Create a trip first"}</Text>
            </View>
          ) : (
            reservations.map(res => (
              <View key={res.id} style={styles.resCard}>
                <Text style={styles.resEmoji}>{getEmoji(res.res_type)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.resTitle}>{res.title}</Text>
                  {res.provider && <Text style={styles.resMeta}>{res.provider}</Text>}
                  {res.confirmation_code && <Text style={styles.resCode}>🔑 {res.confirmation_code}</Text>}
                  {res.location && <Text style={styles.resMeta}>📍 {res.location}</Text>}
                </View>
                {res.amount && <Text style={styles.resAmount}>₹{res.amount.toLocaleString()}</Text>}
                <View style={[styles.resBadge, { backgroundColor: res.status === "confirmed" ? "#10B981" : "#F59E0B" }]}>
                  <Text style={styles.resBadgeText}>{res.status}</Text>
                </View>
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
  tripChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tripChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tripChipText: { fontSize: 13, fontWeight: "600", color: colors.text },
  addBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: "center", marginBottom: spacing.md },
  addBtnText: { color: "#FFF", fontWeight: "700", fontSize: 16 },
  form: { backgroundColor: colors.surface, borderRadius: 16, padding: spacing.md, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.md },
  typeChip: { alignItems: "center", paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, gap: 2 },
  typeActive: { backgroundColor: "#7C3AED", borderColor: "#7C3AED" },
  typeText: { fontSize: 10, fontWeight: "600", color: colors.text },
  input: { marginBottom: spacing.sm, backgroundColor: "#FFF" },
  submitBtn: { backgroundColor: "#10B981", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: spacing.sm },
  submitText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
  resCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: colors.surface, borderRadius: 14, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border, flexWrap: "wrap" },
  resEmoji: { fontSize: 28 },
  resTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  resMeta: { fontSize: 12, color: colors.gray, marginTop: 2 },
  resCode: { fontSize: 12, color: "#7C3AED", fontWeight: "600", marginTop: 2 },
  resAmount: { fontSize: 15, fontWeight: "700", color: "#EF4444" },
  resBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  resBadgeText: { fontSize: 10, fontWeight: "700", color: "#FFF", textTransform: "capitalize" },
  empty: { alignItems: "center", paddingVertical: spacing.xxl },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginTop: spacing.sm },
});
