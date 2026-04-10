import React, { useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { Text, Button, TextInput } from "react-native-paper";
import { useRoute, RouteProp } from "@react-navigation/native";
import LoadingSpinner from "@/components/Common/LoadingSpinner";
import { budgetService } from "@/services/budget";
import { destinationsService } from "@/services/destinations";
import { BudgetEstimate, Destination, RootStackParamList } from "@/types";
import { colors, spacing } from "@/theme/colors";

type RouteType = RouteProp<RootStackParamList, "Budget">;

export default function BudgetScreen() {
  const route = useRoute<RouteType>();
  const passedDest = route.params?.destination;
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [selected, setSelected] = useState(passedDest?.label || "");
  const [days, setDays] = useState("3");
  const [familySize, setFamilySize] = useState("2");
  const [travelClass, setTravelClass] = useState<"economy" | "comfort" | "premium">("economy");
  const [estimate, setEstimate] = useState<BudgetEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initLoading, setInitLoading] = useState(!passedDest);

  useEffect(() => {
    if (!passedDest) {
      destinationsService.getDestinations().then((d) => {
        setDestinations(d);
        if (d.length > 0 && !selected) setSelected(d[0].label);
      }).finally(() => setInitLoading(false));
    }
  }, []);

  const calculate = async () => {
    if (!selected) return;
    setLoading(true);
    setEstimate(null);
    setError(null);
    try {
      const result = await budgetService.getEstimate(
        selected,
        parseInt(days) || 3,
        parseInt(familySize) || 2,
        travelClass
      );
      setEstimate(result);
    } catch (err: any) {
      setError(err.message || "Failed to estimate budget");
    } finally {
      setLoading(false);
    }
  };

  if (initLoading) return <LoadingSpinner />;

  const breakdownItems = estimate
    ? [
        { label: "🏨 Accommodation", value: estimate.accommodation },
        { label: "🍽️ Food", value: estimate.food },
        { label: "🚗 Transport", value: estimate.transport },
        { label: "🎯 Activities", value: estimate.activities },
        { label: "📦 Miscellaneous", value: estimate.miscellaneous },
      ]
    : [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>💰 Trip Budget Planner</Text>
      <Text style={styles.subtitle}>
        Estimate travel costs for {selected || "a destination"}
      </Text>

      {/* Destination picker (if no destination was passed) */}
      {!passedDest && (
        <View style={styles.section}>
          <Text style={styles.label}>Destination</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {destinations.map((d) => (
                <TouchableOpacity
                  key={d.id}
                  style={[styles.chip, selected === d.label && styles.chipActive]}
                  onPress={() => setSelected(d.label)}
                >
                  <Text style={[styles.chipText, selected === d.label && styles.chipTextActive]}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Days + Family Size */}
      <View style={styles.inputRow}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Days</Text>
          <TextInput
            mode="outlined"
            value={days}
            onChangeText={setDays}
            keyboardType="numeric"
            style={styles.input}
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Family Size</Text>
          <TextInput
            mode="outlined"
            value={familySize}
            onChangeText={setFamilySize}
            keyboardType="numeric"
            style={styles.input}
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
          />
        </View>
      </View>

      {/* Travel Class */}
      <View style={styles.section}>
        <Text style={styles.label}>Travel Class</Text>
        <View style={styles.classRow}>
          {(["economy", "comfort", "premium"] as const).map((cls) => (
            <TouchableOpacity
              key={cls}
              style={[styles.classChip, travelClass === cls && styles.classChipActive]}
              onPress={() => setTravelClass(cls)}
            >
              <Text style={[styles.classText, travelClass === cls && styles.classTextActive]}>
                {cls === "economy" ? "✈️ Economy" : cls === "comfort" ? "🛋️ Comfort" : "👑 Premium"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Button
        mode="contained"
        onPress={calculate}
        loading={loading}
        disabled={loading || !selected}
        style={styles.calcBtn}
        buttonColor={colors.primary}
        contentStyle={{ paddingVertical: 6 }}
        labelStyle={{ fontSize: 16, fontWeight: "700" }}
      >
        Calculate Budget
      </Button>

      {loading && <LoadingSpinner message="Calculating…" />}
      {error && <Text style={styles.error}>{error}</Text>}

      {/* Results */}
      {estimate && (
        <View style={styles.resultCard}>
          <Text style={styles.totalLabel}>Estimated Total</Text>
          <Text style={styles.totalValue}>
            ₹{estimate.total?.toLocaleString("en-IN") || "N/A"}
          </Text>
          <Text style={styles.totalSub}>
            {estimate.num_days} days · {estimate.family_size} people · {estimate.travel_class} · {estimate.currency || "INR"}
          </Text>

          <View style={styles.breakdown}>
            {breakdownItems.map((item) => (
              <View key={item.label} style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>{item.label}</Text>
                <Text style={styles.breakdownValue}>
                  ₹{item.value?.toLocaleString("en-IN") || "0"}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: 100 },
  title: { fontSize: 26, fontWeight: "800", color: colors.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: colors.gray, marginBottom: spacing.lg },
  section: { marginBottom: spacing.md },
  label: { fontSize: 13, fontWeight: "600", color: colors.gray, marginBottom: 6 },
  chipRow: { flexDirection: "row", gap: 6 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.text },
  chipTextActive: { color: "#FFF", fontWeight: "600" },
  inputRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },
  inputGroup: { flex: 1 },
  input: { backgroundColor: "#FFF" },
  classRow: { flexDirection: "row", gap: spacing.sm },
  classChip: {
    flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center",
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  classChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  classText: { fontSize: 13, color: colors.text },
  classTextActive: { color: "#FFF", fontWeight: "600" },
  calcBtn: { borderRadius: 14, marginBottom: spacing.lg },
  error: { color: colors.error, fontSize: 13, textAlign: "center", marginBottom: spacing.md },
  resultCard: {
    backgroundColor: colors.surface, borderRadius: 20, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  totalLabel: { fontSize: 13, color: colors.gray, textAlign: "center" },
  totalValue: { fontSize: 40, fontWeight: "900", color: colors.primary, textAlign: "center", marginVertical: 4 },
  totalSub: { fontSize: 13, color: colors.gray, textAlign: "center", marginBottom: spacing.md },
  breakdown: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  breakdownRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  breakdownLabel: { fontSize: 14, color: colors.text },
  breakdownValue: { fontSize: 14, fontWeight: "600", color: colors.text },
});
