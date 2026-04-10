import React from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/types";
import { colors, spacing } from "@/theme/colors";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const FEATURES = [
  { id: "TripWorkspace", emoji: "🗂️", title: "Trip Workspace", desc: "Plan itineraries, add places & maps day-by-day." },
  { id: "Reservations", emoji: "🎫", title: "Reservations", desc: "Manage flights, hotels, and booking codes." },
  { id: "Expenses", emoji: "💰", title: "Expense Tracker", desc: "Log daily spending and balance your budget." },
  { id: "TravelJournal", emoji: "📔", title: "Travel Journal", desc: "Write notes, attach photos, share with community." },
  { id: "TripSharing", emoji: "🔗", title: "Collaborate & Share", desc: "Generate secure links for friends and family." },
  { id: "TravelStats", emoji: "📊", title: "Travel Stats", desc: "View your globetrotter analytics & spending charts." },
];

export default function TripsScreen() {
  const nav = useNavigation<Nav>();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Travel Hub</Text>
          <Text style={styles.subtitle}>Your all-in-one trip management center.</Text>
        </View>

        <View style={styles.grid}>
          {FEATURES.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => nav.navigate(item.id as any)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.emoji}>{item.emoji}</Text>
                <Text style={styles.arrow}>↗</Text>
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDesc}>{item.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          style={styles.legacyBtn}
          onPress={() => {
            // Future compatibility for old simple trips if needed
          }}
        >
          <Text style={styles.legacyText}>View Legacy Budgets (Archived)</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - spacing.md * 2 - spacing.sm) / 2;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, paddingBottom: 100 },
  header: { marginBottom: spacing.lg },
  title: { fontSize: 32, fontWeight: "900", color: colors.text, marginBottom: 4 },
  subtitle: { fontSize: 16, color: colors.gray, lineHeight: 22 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "space-between" },
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  emoji: { fontSize: 36 },
  arrow: { fontSize: 18, color: colors.gray, fontWeight: "600" },
  cardTitle: { fontSize: 16, fontWeight: "800", color: colors.text, marginBottom: 6 },
  cardDesc: { fontSize: 13, color: colors.gray, lineHeight: 18 },
  legacyBtn: { marginTop: spacing.xl, paddingVertical: spacing.md, alignItems: "center" },
  legacyText: { fontSize: 14, color: colors.gray, fontWeight: "600", textDecorationLine: "underline" },
});
