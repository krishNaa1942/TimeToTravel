import React, { useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { Text, Button } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import LoadingSpinner from "@/components/Common/LoadingSpinner";
import { compareService, CompareResult } from "@/services/compare";
import { destinationsService } from "@/services/destinations";
import { Destination } from "@/types";
import { colors, spacing } from "@/theme/colors";

export default function CompareScreen() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [dest1, setDest1] = useState("");
  const [dest2, setDest2] = useState("");
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initLoading, setInitLoading] = useState(true);

  useEffect(() => {
    destinationsService.getDestinations().then((d) => {
      setDestinations(d);
      if (d.length >= 2) { setDest1(d[0].label); setDest2(d[1].label); }
    }).finally(() => setInitLoading(false));
  }, []);

  const compare = async () => {
    if (!dest1 || !dest2 || dest1 === dest2) { setError("Pick two different destinations"); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await compareService.compare(dest1, dest2);
      setResult(res);
    } catch (e: any) { setError(e.message || "Comparison failed"); }
    finally { setLoading(false); }
  };

  if (initLoading) return <LoadingSpinner />;

  const DestPicker = ({ selected, onSelect, label }: { selected: string; onSelect: (s: string) => void; label: string }) => (
    <View style={styles.pickerSection}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chipRow}>
          {destinations.slice(0, 30).map((d) => (
            <TouchableOpacity key={d.id} style={[styles.chip, selected === d.label && styles.chipActive]}
              onPress={() => { onSelect(d.label); setResult(null); }}>
              <Text style={[styles.chipText, selected === d.label && styles.chipTextActive]}>{d.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  const CompareRow = ({ label, val1, val2, format, winner }: {
    label: string; val1: any; val2: any; format?: (v: any) => string; winner?: "lower" | "higher"
  }) => {
    const f = format || ((v: any) => String(v ?? "N/A"));
    const v1 = typeof val1 === "number" ? val1 : 0;
    const v2 = typeof val2 === "number" ? val2 : 0;
    const highlight1 = winner === "lower" ? v1 < v2 : winner === "higher" ? v1 > v2 : false;
    const highlight2 = winner === "lower" ? v2 < v1 : winner === "higher" ? v2 > v1 : false;
    return (
      <View style={styles.compareRow}>
        <Text style={[styles.compareVal, highlight1 && styles.winner]}>{f(val1)}</Text>
        <Text style={styles.compareLabel}>{label}</Text>
        <Text style={[styles.compareVal, highlight2 && styles.winner]}>{f(val2)}</Text>
      </View>
    );
  };

  const fmt = (v: number | null | undefined) => v != null ? `₹${v.toLocaleString("en-IN")}` : "N/A";
  const fmtScore = (v: number | null | undefined) => v != null ? `${v}/10` : "N/A";
  const fmtTemp = (v: number | null | undefined) => v != null ? `${v}°C` : "N/A";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>🗺️ Compare Destinations</Text>
        <Text style={styles.subtitle}>Side-by-side comparison of budget, safety, and weather</Text>

        <DestPicker selected={dest1} onSelect={setDest1} label="Destination 1" />
        <View style={styles.vsContainer}><Text style={styles.vsText}>VS</Text></View>
        <DestPicker selected={dest2} onSelect={setDest2} label="Destination 2" />

        <Button mode="contained" onPress={compare} loading={loading} disabled={loading || !dest1 || !dest2 || dest1 === dest2}
          style={styles.cmpBtn} buttonColor={colors.primary}
          contentStyle={{ paddingVertical: 6 }} labelStyle={{ fontSize: 16, fontWeight: "700" }}>
          ⚖️ Compare
        </Button>

        {loading && <LoadingSpinner message="Comparing destinations…" />}
        {error && <Text style={styles.error}>{error}</Text>}

        {result && (
          <View style={styles.resultCard}>
            {/* Header */}
            <View style={styles.resultHeader}>
              <Text style={styles.destName}>{result.dest1.destination}</Text>
              <Text style={styles.vsSmall}>vs</Text>
              <Text style={styles.destName}>{result.dest2.destination}</Text>
            </View>

            {/* Budget */}
            <Text style={styles.sectionLabel}>💰 Budget ({result.params.num_days} days, {result.params.family_size} people)</Text>
            <CompareRow label="Total" val1={result.dest1.budget?.total} val2={result.dest2.budget?.total} format={fmt} winner="lower" />
            <CompareRow label="Stay" val1={result.dest1.budget?.accommodation} val2={result.dest2.budget?.accommodation} format={fmt} winner="lower" />
            <CompareRow label="Food" val1={result.dest1.budget?.food} val2={result.dest2.budget?.food} format={fmt} winner="lower" />
            <CompareRow label="Transport" val1={result.dest1.budget?.transport} val2={result.dest2.budget?.transport} format={fmt} winner="lower" />

            {/* Safety */}
            <Text style={styles.sectionLabel}>🛡️ Safety</Text>
            <CompareRow label="Overall" val1={result.dest1.safety?.overall_score} val2={result.dest2.safety?.overall_score} format={fmtScore} winner="higher" />
            <CompareRow label="Crime" val1={result.dest1.safety?.crime} val2={result.dest2.safety?.crime} format={fmtScore} winner="higher" />
            <CompareRow label="Tourist" val1={result.dest1.safety?.tourist_friendly} val2={result.dest2.safety?.tourist_friendly} format={fmtScore} winner="higher" />

            {/* Weather */}
            <Text style={styles.sectionLabel}>🌤️ Weather</Text>
            <CompareRow label="Temp" val1={result.dest1.weather?.temperature_c} val2={result.dest2.weather?.temperature_c} format={fmtTemp} />
            <CompareRow label="Humidity" val1={result.dest1.weather?.humidity} val2={result.dest2.weather?.humidity}
              format={(v: any) => v != null ? `${v}%` : "N/A"} winner="lower" />
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
  label: { fontSize: 13, fontWeight: "600", color: colors.gray, marginBottom: 6 },
  pickerSection: { marginBottom: spacing.xs },
  chipRow: { flexDirection: "row", gap: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.text },
  chipTextActive: { color: "#FFF", fontWeight: "600" },
  vsContainer: { alignItems: "center", marginVertical: spacing.sm },
  vsText: { fontSize: 18, fontWeight: "900", color: colors.primary, backgroundColor: colors.primary + "15", paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  cmpBtn: { borderRadius: 14, marginBottom: spacing.lg },
  error: { color: colors.error, textAlign: "center", marginBottom: spacing.md },
  resultCard: { backgroundColor: colors.surface, borderRadius: 20, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  resultHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  destName: { fontSize: 16, fontWeight: "800", color: colors.text, flex: 1, textAlign: "center" },
  vsSmall: { fontSize: 12, color: colors.gray, fontWeight: "600", marginHorizontal: 8 },
  sectionLabel: { fontSize: 14, fontWeight: "700", color: colors.text, marginTop: spacing.md, marginBottom: spacing.xs },
  compareRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border + "40" },
  compareVal: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.text, textAlign: "center" },
  compareLabel: { width: 80, fontSize: 12, color: colors.gray, textAlign: "center" },
  winner: { color: "#10B981", fontWeight: "800" },
});
