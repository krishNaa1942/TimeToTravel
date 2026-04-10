import React, { useEffect, useState, useCallback } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Text, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import LoadingSpinner from "@/components/Common/LoadingSpinner";
import { expenseService, Expense, ExpenseSummary } from "@/services/expenses";
import { colors, spacing } from "@/theme/colors";

const CATEGORIES = [
  { key: "food", emoji: "🍽️", label: "Food" },
  { key: "transport", emoji: "🚗", label: "Transport" },
  { key: "stay", emoji: "🏨", label: "Stay" },
  { key: "activities", emoji: "🎯", label: "Activities" },
  { key: "shopping", emoji: "🛍️", label: "Shopping" },
  { key: "other", emoji: "📦", label: "Other" },
];

export default function ExpenseTrackerScreen() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);

  const [destination, setDestination] = useState("");
  const [category, setCategory] = useState("food");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [expRes, sumRes] = await Promise.all([
        expenseService.listExpenses(),
        expenseService.getSummary(),
      ]);
      setExpenses(expRes.expenses || []);
      setSummary(sumRes);
    } catch { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!destination.trim() || !description.trim() || !amount.trim()) {
      Alert.alert("Error", "Fill all fields"); return;
    }
    setAdding(true);
    try {
      await expenseService.addExpense({
        destination: destination.trim(), category,
        description: description.trim(), amount: parseFloat(amount),
      });
      setShowAdd(false); setDescription(""); setAmount("");
      load();
    } catch (e: any) { Alert.alert("Error", e.message); }
    finally { setAdding(false); }
  };

  const handleDelete = (exp: Expense) => {
    Alert.alert("Delete", `Delete "${exp.description}"?`, [
      { text: "Cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try { await expenseService.deleteExpense(exp.id); load(); } catch {}
      }},
    ]);
  };

  const getCatEmoji = (cat: string) => CATEGORIES.find(c => c.key === cat)?.emoji || "📦";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>💰 Expense Tracker</Text>
        <Text style={styles.subtitle}>Track every rupee of your journey</Text>

        {/* Summary card */}
        {summary && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTotal}>₹{summary.total.toLocaleString()}</Text>
            <Text style={styles.summaryLabel}>Total Spent · {summary.count} expenses</Text>
            <View style={styles.breakdownRow}>
              {(summary.by_category || []).slice(0, 4).map((cat, i) => (
                <View key={i} style={styles.breakdownItem}>
                  <Text style={styles.breakdownEmoji}>{getCatEmoji(cat.category)}</Text>
                  <Text style={styles.breakdownAmt}>₹{cat.total.toLocaleString()}</Text>
                  <Text style={styles.breakdownCat}>{cat.category}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(!showAdd)}>
          <Text style={styles.addBtnText}>{showAdd ? "✕ Cancel" : "＋ Add Expense"}</Text>
        </TouchableOpacity>

        {showAdd && (
          <View style={styles.form}>
            <TextInput mode="outlined" label="Destination" value={destination} onChangeText={setDestination}
              style={styles.input} outlineColor={colors.border} activeOutlineColor={colors.primary} />
            <View style={styles.catGrid}>
              {CATEGORIES.map(c => (
                <TouchableOpacity key={c.key} style={[styles.catChip, category === c.key && styles.catActive]}
                  onPress={() => setCategory(c.key)}>
                  <Text style={{ fontSize: 18 }}>{c.emoji}</Text>
                  <Text style={[styles.catText, category === c.key && { color: "#FFF" }]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput mode="outlined" label="Description" value={description} onChangeText={setDescription}
              style={styles.input} outlineColor={colors.border} activeOutlineColor={colors.primary} />
            <TextInput mode="outlined" label="Amount (₹)" value={amount} onChangeText={setAmount}
              keyboardType="numeric" style={styles.input} outlineColor={colors.border} activeOutlineColor={colors.primary} />
            <TouchableOpacity style={styles.submitBtn} onPress={handleAdd} disabled={adding}>
              <Text style={styles.submitText}>{adding ? "Adding…" : "💾 Save Expense"}</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading ? <LoadingSpinner message="Loading expenses…" /> : (
          expenses.length === 0 ? (
            <View style={styles.empty}>
              <Text style={{ fontSize: 48 }}>💸</Text>
              <Text style={styles.emptyTitle}>No expenses yet</Text>
              <Text style={styles.emptyText}>Start tracking your travel spending</Text>
            </View>
          ) : (
            expenses.map(exp => (
              <TouchableOpacity key={exp.id} style={styles.expCard} onLongPress={() => handleDelete(exp)}>
                <Text style={styles.expEmoji}>{getCatEmoji(exp.category)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.expDesc}>{exp.description}</Text>
                  <Text style={styles.expMeta}>{exp.destination} · {exp.category} · {exp.date}</Text>
                </View>
                <Text style={styles.expAmount}>₹{exp.amount.toLocaleString()}</Text>
              </TouchableOpacity>
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
  summaryCard: { backgroundColor: "#1E293B", borderRadius: 20, padding: spacing.lg, marginBottom: spacing.lg, alignItems: "center" },
  summaryTotal: { fontSize: 36, fontWeight: "900", color: "#FFF" },
  summaryLabel: { fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 4 },
  breakdownRow: { flexDirection: "row", marginTop: spacing.md, gap: spacing.md },
  breakdownItem: { alignItems: "center" },
  breakdownEmoji: { fontSize: 24 },
  breakdownAmt: { fontSize: 14, fontWeight: "700", color: "#FFF", marginTop: 4 },
  breakdownCat: { fontSize: 10, color: "rgba(255,255,255,0.5)", textTransform: "capitalize" },
  addBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: "center", marginBottom: spacing.md },
  addBtnText: { color: "#FFF", fontWeight: "700", fontSize: 16 },
  form: { backgroundColor: colors.surface, borderRadius: 16, padding: spacing.md, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border },
  input: { marginBottom: spacing.sm, backgroundColor: "#FFF" },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.sm },
  catChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  catActive: { backgroundColor: "#7C3AED", borderColor: "#7C3AED" },
  catText: { fontSize: 12, fontWeight: "600", color: colors.text },
  submitBtn: { backgroundColor: "#10B981", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: spacing.sm },
  submitText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
  expCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface, borderRadius: 14, padding: spacing.md, marginBottom: spacing.xs, borderWidth: 1, borderColor: colors.border },
  expEmoji: { fontSize: 28 },
  expDesc: { fontSize: 15, fontWeight: "600", color: colors.text },
  expMeta: { fontSize: 12, color: colors.gray, marginTop: 2, textTransform: "capitalize" },
  expAmount: { fontSize: 16, fontWeight: "800", color: "#EF4444" },
  empty: { alignItems: "center", paddingVertical: spacing.xxl },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginTop: spacing.sm },
  emptyText: { fontSize: 14, color: colors.gray },
});
