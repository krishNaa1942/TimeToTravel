import React, { useState } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { Text, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { currencyService, ConversionResult } from "@/services/currency";
import { colors, spacing } from "@/theme/colors";

const POPULAR_CURRENCIES = [
  { code: "INR", name: "Indian Rupee", flag: "🇮🇳" },
  { code: "USD", name: "US Dollar", flag: "🇺🇸" },
  { code: "EUR", name: "Euro", flag: "🇪🇺" },
  { code: "GBP", name: "British Pound", flag: "🇬🇧" },
  { code: "JPY", name: "Japanese Yen", flag: "🇯🇵" },
  { code: "AUD", name: "Australian Dollar", flag: "🇦🇺" },
  { code: "CAD", name: "Canadian Dollar", flag: "🇨🇦" },
  { code: "SGD", name: "Singapore Dollar", flag: "🇸🇬" },
  { code: "AED", name: "UAE Dirham", flag: "🇦🇪" },
  { code: "THB", name: "Thai Baht", flag: "🇹🇭" },
  { code: "MYR", name: "Malaysian Ringgit", flag: "🇲🇾" },
  { code: "CHF", name: "Swiss Franc", flag: "🇨🇭" },
];

export default function CurrencyScreen() {
  const [amount, setAmount] = useState("1000");
  const [fromCurrency, setFromCurrency] = useState("INR");
  const [toCurrency, setToCurrency] = useState("USD");
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const convert = async () => {
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) { setError("Enter a valid amount"); return; }
    setLoading(true); setError(null);
    try {
      const res = await currencyService.convert(amt, fromCurrency, toCurrency);
      setResult(res);
    } catch (e: any) { setError(e.message || "Conversion failed"); }
    finally { setLoading(false); }
  };

  const swap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setResult(null);
  };

  const CurrencyPicker = ({ selected, onSelect, label }: { selected: string; onSelect: (c: string) => void; label: string }) => (
    <View style={styles.pickerSection}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.flagRow}>
          {POPULAR_CURRENCIES.map((c) => (
            <TouchableOpacity key={c.code}
              style={[styles.flagChip, selected === c.code && styles.flagChipActive]}
              onPress={() => { onSelect(c.code); setResult(null); }}>
              <Text style={styles.flag}>{c.flag}</Text>
              <Text style={[styles.flagCode, selected === c.code && styles.flagCodeActive]}>{c.code}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>💱 Currency Converter</Text>
        <Text style={styles.subtitle}>Real-time exchange rates for your travel budget</Text>

        {/* Amount input */}
        <View style={styles.amountCard}>
          <Text style={styles.label}>Amount</Text>
          <TextInput mode="outlined" value={amount} onChangeText={(t) => { setAmount(t); setResult(null); }}
            keyboardType="numeric" style={styles.amountInput}
            outlineColor={colors.border} activeOutlineColor={colors.primary}
            left={<TextInput.Affix text={fromCurrency} textStyle={{ fontWeight: "700", color: colors.primary }} />} />
        </View>

        <CurrencyPicker selected={fromCurrency} onSelect={setFromCurrency} label="From" />

        {/* Swap button */}
        <TouchableOpacity style={styles.swapBtn} onPress={swap}>
          <Text style={styles.swapIcon}>🔄</Text>
        </TouchableOpacity>

        <CurrencyPicker selected={toCurrency} onSelect={setToCurrency} label="To" />

        <TouchableOpacity style={styles.convertBtn} onPress={convert} disabled={loading}>
          <Text style={styles.convertText}>{loading ? "Converting…" : "Convert"}</Text>
        </TouchableOpacity>

        {error && <Text style={styles.error}>{error}</Text>}

        {/* Result */}
        {result && (
          <View style={styles.resultCard}>
            <Text style={styles.resultFrom}>
              {POPULAR_CURRENCIES.find(c => c.code === result.from)?.flag} {result.amount.toLocaleString()} {result.from}
            </Text>
            <Text style={styles.resultEquals}>=</Text>
            <Text style={styles.resultTo}>
              {POPULAR_CURRENCIES.find(c => c.code === result.to)?.flag} {result.converted?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {result.to}
            </Text>
            <Text style={styles.resultRate}>
              1 {result.from} = {result.rate?.toFixed(4)} {result.to}
            </Text>
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
  amountCard: { marginBottom: spacing.md },
  amountInput: { backgroundColor: "#FFF", fontSize: 20 },
  pickerSection: { marginBottom: spacing.sm },
  flagRow: { flexDirection: "row", gap: 8 },
  flagChip: { alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, minWidth: 60 },
  flagChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  flag: { fontSize: 24, marginBottom: 2 },
  flagCode: { fontSize: 11, fontWeight: "600", color: colors.text },
  flagCodeActive: { color: "#FFF" },
  swapBtn: { alignSelf: "center", width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", marginVertical: spacing.sm, borderWidth: 1, borderColor: colors.border },
  swapIcon: { fontSize: 22 },
  convertBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: spacing.md, marginBottom: spacing.md },
  convertText: { color: "#FFF", fontWeight: "700", fontSize: 16 },
  error: { color: colors.error, textAlign: "center", marginBottom: spacing.md },
  resultCard: { backgroundColor: colors.surface, borderRadius: 20, padding: spacing.lg, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  resultFrom: { fontSize: 18, color: colors.gray, fontWeight: "500" },
  resultEquals: { fontSize: 28, color: colors.gray, marginVertical: 4 },
  resultTo: { fontSize: 32, fontWeight: "900", color: colors.primary },
  resultRate: { fontSize: 13, color: colors.gray, marginTop: spacing.sm },
});
