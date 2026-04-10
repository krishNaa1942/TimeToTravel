import React, { useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { Text, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import LoadingSpinner from "@/components/Common/LoadingSpinner";
import { phrasebookService, PhraseData } from "@/services/phrasebook";
import { colors, spacing } from "@/theme/colors";

export default function PhrasebookScreen() {
  const [destinations, setDestinations] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const [data, setData] = useState<PhraseData | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    phrasebookService.getDestinations().then(r => setDestinations(r.destinations || [])).catch(() => {});
  }, []);

  const loadPhrases = async (dest: string) => {
    setSelected(dest); setLoading(true); setData(null);
    try {
      const res = await phrasebookService.getPhrases(dest);
      setData(res);
    } catch { }
    finally { setLoading(false); }
  };

  const filtered = data?.phrases?.filter(p =>
    !search || p.english.toLowerCase().includes(search.toLowerCase()) ||
    p.local.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>🗣️ Phrasebook</Text>
        <Text style={styles.subtitle}>Learn local phrases for your destination</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {destinations.map(d => (
              <TouchableOpacity key={d} style={[styles.destChip, selected === d && styles.destActive]}
                onPress={() => loadPhrases(d)}>
                <Text style={[styles.destText, selected === d && { color: "#FFF" }]}>
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {loading && <LoadingSpinner message="Loading phrases…" />}

        {data && (
          <>
            <View style={styles.langCard}>
              <Text style={styles.langName}>🌐 {data.language}</Text>
              {data.script && <Text style={styles.langScript}>Script: {data.script}</Text>}
            </View>

            <TextInput mode="outlined" placeholder="Search phrases…" value={search}
              onChangeText={setSearch} style={styles.searchInput}
              outlineColor={colors.border} activeOutlineColor={colors.primary} />

            {filtered.map((phrase, i) => (
              <View key={i} style={styles.phraseCard}>
                <View style={styles.phraseRow}>
                  <Text style={styles.phraseEn}>{phrase.english}</Text>
                  {phrase.category && (
                    <Text style={styles.phraseCat}>{phrase.category}</Text>
                  )}
                </View>
                <Text style={styles.phraseLocal}>{phrase.local}</Text>
                {phrase.pronunciation && (
                  <Text style={styles.phrasePron}>🔊 {phrase.pronunciation}</Text>
                )}
              </View>
            ))}
          </>
        )}

        {!data && !loading && (
          <View style={styles.empty}>
            <Text style={{ fontSize: 64 }}>🗣️</Text>
            <Text style={styles.emptyTitle}>Select a destination</Text>
            <Text style={styles.emptyText}>Pick a city above to see local phrases</Text>
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
  destChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  destActive: { backgroundColor: "#7C3AED", borderColor: "#7C3AED" },
  destText: { fontSize: 13, fontWeight: "600", color: colors.text },
  langCard: { backgroundColor: "#1E293B", borderRadius: 14, padding: spacing.md, marginBottom: spacing.md },
  langName: { fontSize: 18, fontWeight: "700", color: "#FFF" },
  langScript: { fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 4 },
  searchInput: { marginBottom: spacing.md, backgroundColor: "#FFF" },
  phraseCard: { backgroundColor: colors.surface, borderRadius: 14, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  phraseRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  phraseEn: { fontSize: 15, fontWeight: "600", color: colors.text },
  phraseCat: { fontSize: 10, color: "#7C3AED", fontWeight: "600", backgroundColor: "#7C3AED15", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: "hidden" },
  phraseLocal: { fontSize: 18, fontWeight: "700", color: colors.primary, marginTop: 6 },
  phrasePron: { fontSize: 13, color: colors.gray, marginTop: 4, fontStyle: "italic" },
  empty: { alignItems: "center", paddingVertical: spacing.xxl },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginTop: spacing.sm },
  emptyText: { fontSize: 14, color: colors.gray },
});
