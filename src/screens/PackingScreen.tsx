import React, { useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Text, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import LoadingSpinner from "@/components/Common/LoadingSpinner";
import { packingService, PackingItem } from "@/services/packing";
import { destinationsService } from "@/services/destinations";
import { Destination } from "@/types";
import { colors, spacing } from "@/theme/colors";

export default function PackingScreen() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [selected, setSelected] = useState("");
  const [items, setItems] = useState<PackingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [progress, setProgress] = useState(0);
  const [initLoading, setInitLoading] = useState(true);

  useEffect(() => {
    destinationsService.getDestinations().then((d) => {
      setDestinations(d);
      if (d.length > 0) setSelected(d[0].label);
    }).finally(() => setInitLoading(false));
  }, []);

  const generateList = async () => {
    if (!selected) return;
    setGenerating(true);
    try {
      const res = await packingService.generate(selected);
      setItems(res.items);
      updateProgress(res.items);
    } catch (e: any) { Alert.alert("Error", e.message); }
    finally { setGenerating(false); }
  };

  const loadChecklist = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await packingService.getChecklist(selected);
      setItems(res.items);
      setProgress(res.progress);
    } catch {} finally { setLoading(false); }
  };

  const updateProgress = (list: PackingItem[]) => {
    const checked = list.filter(i => i.is_checked).length;
    setProgress(list.length ? Math.round(checked / list.length * 100) : 0);
  };

  const toggleItem = async (item: PackingItem) => {
    try {
      const res = await packingService.toggleItem(item.id);
      const updated = items.map(i => i.id === item.id ? res.item : i);
      setItems(updated);
      updateProgress(updated);
    } catch {}
  };

  const addCustomItem = async () => {
    if (!newItem.trim() || !selected) return;
    try {
      const res = await packingService.addCustom(selected, newItem.trim());
      setItems([...items, res.item]);
      setNewItem("");
      updateProgress([...items, res.item]);
    } catch (e: any) { Alert.alert("Error", e.message); }
  };

  const deleteItem = async (item: PackingItem) => {
    Alert.alert("Delete", `Remove "${item.item_text}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try {
          await packingService.deleteItem(item.id);
          const updated = items.filter(i => i.id !== item.id);
          setItems(updated);
          updateProgress(updated);
        } catch {}
      }},
    ]);
  };

  if (initLoading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>🧳 Packing Checklist</Text>
        <Text style={styles.subtitle}>Auto-generated based on weather at your destination</Text>

        {/* Destination picker */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
          <View style={styles.chipRow}>
            {destinations.slice(0, 30).map((d) => (
              <TouchableOpacity key={d.id}
                style={[styles.chip, selected === d.label && styles.chipActive]}
                onPress={() => { setSelected(d.label); setItems([]); }}>
                <Text style={[styles.chipText, selected === d.label && styles.chipTextActive]}>{d.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.primaryBtn} onPress={generateList} disabled={generating}>
            <Text style={styles.primaryBtnText}>{generating ? "Generating…" : "✨ Generate List"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={loadChecklist}>
            <Text style={styles.secondaryBtnText}>📥 Load Saved</Text>
          </TouchableOpacity>
        </View>

        {generating && <LoadingSpinner message="Creating packing list…" />}

        {/* Progress bar */}
        {items.length > 0 && (
          <View style={styles.progressSection}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{progress}% packed ({items.filter(i=>i.is_checked).length}/{items.length})</Text>
          </View>
        )}

        {/* Items */}
        {items.map((item) => (
          <TouchableOpacity key={item.id} style={styles.itemCard} onPress={() => toggleItem(item)}
            onLongPress={() => item.is_custom && deleteItem(item)}>
            <View style={[styles.checkbox, item.is_checked && styles.checkboxActive]}>
              {item.is_checked && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={[styles.itemText, item.is_checked && styles.itemTextChecked]}>{item.item_text}</Text>
            {item.is_custom && <Text style={styles.customBadge}>custom</Text>}
          </TouchableOpacity>
        ))}

        {/* Add custom item */}
        {items.length > 0 && (
          <View style={styles.addRow}>
            <TextInput mode="outlined" value={newItem} onChangeText={setNewItem}
              placeholder="Add custom item…" style={styles.addInput}
              outlineColor={colors.border} activeOutlineColor={colors.primary} />
            <TouchableOpacity style={styles.addBtn} onPress={addCustomItem}>
              <Text style={styles.addBtnText}>+</Text>
            </TouchableOpacity>
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
  chipRow: { flexDirection: "row", gap: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.text },
  chipTextActive: { color: "#FFF", fontWeight: "600" },
  btnRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  primaryBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  primaryBtnText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
  secondaryBtn: { flex: 1, backgroundColor: colors.surface, borderRadius: 14, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  secondaryBtnText: { color: colors.text, fontWeight: "600", fontSize: 15 },
  progressSection: { marginBottom: spacing.md },
  progressBar: { height: 8, backgroundColor: colors.surface, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#10B981", borderRadius: 4 },
  progressText: { fontSize: 13, color: colors.gray, marginTop: 4, textAlign: "center" },
  itemCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: 12, padding: spacing.sm, marginBottom: spacing.xs, borderWidth: 1, borderColor: colors.border },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.border, marginRight: spacing.sm, alignItems: "center", justifyContent: "center" },
  checkboxActive: { backgroundColor: "#10B981", borderColor: "#10B981" },
  checkmark: { color: "#FFF", fontSize: 14, fontWeight: "800" },
  itemText: { flex: 1, fontSize: 15, color: colors.text },
  itemTextChecked: { textDecorationLine: "line-through", color: colors.gray },
  customBadge: { fontSize: 10, color: colors.primary, backgroundColor: colors.primary + "15", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  addRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  addInput: { flex: 1, backgroundColor: "#FFF" },
  addBtn: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  addBtnText: { color: "#FFF", fontSize: 24, fontWeight: "700" },
});
