/**
 * ProfileScreen – AI-Powered Premium Dashboard
 */
import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  Pressable, // Needed for scaling animations
  Animated,
} from "react-native";
import { Text, Switch, Divider } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { authService } from "@/services/auth";
import { colors, spacing } from "@/theme/colors";
import { APP_VERSION } from "@/constants/config";
import { RootStackParamList } from "@/types";
import { useTravelIntelligence } from "@/stores/travelIntelligenceStore";
import { PressableScale } from "@/components/UI/PressableScale";

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
  const { user } = useAuthStore();
  const { themeDark, toggleTheme } = useUIStore();
  const navigation = useNavigation<NavProp>();

  // Mock settings toggles
  const [tripAlerts, setTripAlerts] = useState(true);
  const [priceAlerts, setPriceAlerts] = useState(false);

  // Logout Logic
  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          try {
            await authService.logout();
          } catch {
            // Force local logout if network fails
          }
        },
      },
    ]);
  };

  const handleComingSoon = (feature: string) => {
    Alert.alert("Coming Soon", `The ${feature} feature is being powered up by AI! Check back soon.`);
  };

  /* ================= FRONTEND SECTIONS ================= */

  const renderHeader = () => (
    <LinearGradient
      colors={["#0F172A", "#0f766e"]} // Navy to Teal gradient
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.heroGradient}
    >
      <View style={styles.heroContent}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>
              {user?.name?.[0]?.toUpperCase() || "👤"}
            </Text>
          </View>
          {/* Edit Badge Overlay */}
          <PressableScale style={styles.editBadge} onPress={() => handleComingSoon("Profile Photo Edit")}>
            <Text style={styles.editBadgeIcon}>✏️</Text>
          </PressableScale>
        </View>

        {/* User Info */}
        <Text style={styles.name}>{user?.name || "Traveler"}</Text>
        <Text style={styles.email}>{user?.email || "user@example.com"}</Text>

        {/* Glassmorphic Stats Bar */}
        <View style={styles.glassStatsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>4</Text>
            <Text style={styles.statLabel}>🌍 Trips</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>❤️ Saved</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>✨</Text>
            <Text style={styles.statLabel}>Explorer</Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );

  const renderQuickActions = () => {
    const actions = [
      { id: "trips", icon: "🧳", label: "My Trips", onPress: () => navigation.navigate("MainTabs", { screen: "Trips" } as any) },
      { id: "saved", icon: "❤️", label: "Saved Places", onPress: () => navigation.navigate("MainTabs", { screen: "Favorites" } as any) },
      { id: "searches", icon: "📍", label: "Recent Searches", onPress: () => handleComingSoon("Recent Searches") },
      { id: "ai", icon: "🧠", label: "AI Recs", onPress: () => handleComingSoon("AI Recommendations") },
    ];

    return (
      <View style={styles.quickActionGrid}>
        {actions.map((act) => (
          <PressableScale key={act.id} style={styles.actionCard} onPress={act.onPress}>
            <Text style={styles.actionIcon}>{act.icon}</Text>
            <Text style={styles.actionLabel}>{act.label}</Text>
          </PressableScale>
        ))}
      </View>
    );
  };

  const { inferredPreferences, savedDestinations, activeTrip } = useTravelIntelligence();

  const renderAIInsights = () => {
    const preferencesList = inferredPreferences.length > 0 
      ? inferredPreferences 
      : ["beaches", "adventure"];
    
    return (
      <View style={styles.insightsCard}>
        <LinearGradient
          colors={["rgba(15, 118, 110, 0.1)", "rgba(15, 118, 110, 0.02)"]}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.sectionTitle}>✨ Your AI Insights</Text>
        <View style={styles.insightItem}>
          <Text style={styles.insightDot}>•</Text>
          <Text style={styles.insightText}>
            You have a strong preference for <Text style={{fontWeight: '800', color: '#0f766e'}}>{preferencesList[0]}</Text> and <Text style={{fontWeight: '800', color: '#0f766e'}}>{preferencesList[1] || 'culture'}</Text>.
          </Text>
        </View>
        <View style={styles.insightItem}>
          <Text style={styles.insightDot}>•</Text>
          <Text style={styles.insightText}>
            You've explored <Text style={{fontWeight: '800'}}>{savedDestinations.length}</Text> major regions this year.
          </Text>
        </View>
        {activeTrip && (
          <View style={styles.insightItem}>
            <Text style={styles.insightDot}>•</Text>
            <Text style={styles.insightText}>
              Your next trip to <Text style={{fontWeight: '800'}}>{activeTrip.destination.label}</Text> is optimized for budget efficiency.
            </Text>
          </View>
        )}
      </View>
    );
  };

  // Helper component for standard list rows
  const SettingRow = ({ icon, label, rightNode, onPress, isLast = false }: any) => (
    <PressableScale
      style={[styles.settingRow, !isLast ? styles.rowBorder : {}]}
      onPress={onPress}
    >
      <View style={styles.settingLeft}>
        <Text style={styles.settingIcon}>{icon}</Text>
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      {rightNode || <Text style={styles.settingChevron}>›</Text>}
    </PressableScale>
  );

  const renderSettings = () => (
    <>
      <View style={styles.settingsGroup}>
        <Text style={styles.groupTitle}>⚙️ Preferences</Text>
        <View style={styles.groupCard}>
          <SettingRow
            icon="🌙" label="Dark Mode"
            rightNode={<Switch value={themeDark} onValueChange={toggleTheme} color="#0f766e" />}
          />
          <SettingRow icon="🌐" label="Language" onPress={() => handleComingSoon("Language")} />
          <SettingRow icon="💱" label="Currency" isLast onPress={() => handleComingSoon("Currency")} />
        </View>
      </View>

      <View style={styles.settingsGroup}>
        <Text style={styles.groupTitle}>🔔 Notifications</Text>
        <View style={styles.groupCard}>
          <SettingRow
            icon="✈️" label="Trip Alerts"
            rightNode={<Switch value={tripAlerts} onValueChange={() => setTripAlerts(!tripAlerts)} color="#0f766e" />}
          />
          <SettingRow
            icon="💰" label="Price Drops" isLast
            rightNode={<Switch value={priceAlerts} onValueChange={() => setPriceAlerts(!priceAlerts)} color="#0f766e" />}
          />
        </View>
      </View>

      <View style={styles.settingsGroup}>
        <Text style={styles.groupTitle}>🔐 Account</Text>
        <View style={styles.groupCard}>
          <SettingRow icon="👤" label="Edit Profile" onPress={() => handleComingSoon("Edit Profile")} />
          <SettingRow icon="🔑" label="Change Password" isLast onPress={() => handleComingSoon("Change Password")} />
        </View>
      </View>

      <View style={styles.settingsGroup}>
        <Text style={styles.groupTitle}>📱 About</Text>
        <View style={styles.groupCard}>
          <SettingRow icon="🚀" label="Version" rightNode={<Text style={styles.aboutValue}>{APP_VERSION}</Text>} />
          <SettingRow icon="🛠️" label="Platform" rightNode={<Text style={styles.aboutValue}>React Native + Expo</Text>} />
          <SettingRow icon="🧠" label="Backend" isLast rightNode={<Text style={styles.aboutValue}>Flask + AI</Text>} />
        </View>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {renderHeader()}
        
        <View style={styles.contentBody}>
          {renderQuickActions()}
          {renderAIInsights()}
          {renderSettings()}
          
          {/* Sticky-like Logout Button mapping */}
          <View style={styles.logoutWrapper}>
            <PressableScale style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutText}>Log Out</Text>
            </PressableScale>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  scrollContent: { paddingBottom: 120 }, // clear bottom nav

  /* Hero Section */
  heroGradient: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: "center",
    shadowColor: "#0f766e",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  heroContent: { alignItems: "center", width: "100%" },
  avatarContainer: { position: "relative", marginBottom: spacing.md },
  avatarCircle: {
    width: 90, height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.5)",
  },
  avatarEmoji: { fontSize: 40 },
  editBadge: {
    position: "absolute", bottom: 0, right: 0,
    width: 30, height: 30,
    borderRadius: 15,
    backgroundColor: "#ffffff",
    justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4, elevation: 3,
  },
  editBadgeIcon: { fontSize: 14 },
  name: { fontSize: 24, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.5 },
  email: { fontSize: 14, color: "rgba(255,255,255,0.8)", marginTop: 2, fontWeight: "500" },

  /* Glassmorphic Stats */
  glassStatsBar: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  statItem: { alignItems: "center", flex: 1 },
  statValue: { fontSize: 18, fontWeight: "800", color: "#FFFFFF" },
  statLabel: { fontSize: 11, color: "rgba(255,255,255,0.8)", marginTop: 4, fontWeight: "600" },
  statDivider: { width: 1, height: 24, backgroundColor: "rgba(255,255,255,0.3)" },

  /* Main Body layout offset */
  contentBody: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    marginTop: -30, // Pull up over the gradient
  },

  /* Quick Actions Grid */
  quickActionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: spacing.xl,
  },
  actionCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: spacing.md,
    alignItems: "center",
    marginBottom: spacing.md,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: "rgba(0,0,0,0.02)",
  },
  actionIcon: { fontSize: 28, marginBottom: 8 },
  actionLabel: { fontSize: 14, fontWeight: "700", color: "#1E293B" },

  /* AI Insights Section */
  insightsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    shadowColor: "#0f766e", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05, shadowRadius: 12, elevation: 3,
    borderWidth: 1, borderColor: "rgba(15, 118, 110, 0.1)",
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A", marginBottom: spacing.md, letterSpacing: -0.3 },
  insightItem: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  insightDot: { fontSize: 16, color: "#0f766e", marginRight: 8, lineHeight: 22 },
  insightText: { fontSize: 15, color: "#475569", fontWeight: "500", lineHeight: 22, flex: 1 },

  /* Settings Groups */
  settingsGroup: {
    marginBottom: spacing.xl,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingLeft: 4,
  },
  groupCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
    borderWidth: 1, borderColor: "rgba(0,0,0,0.03)",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingIcon: { fontSize: 20, marginRight: 12 },
  settingLabel: { fontSize: 16, fontWeight: "500", color: "#1E293B" },
  settingChevron: { fontSize: 24, color: "#cbd5e1", fontWeight: "300" },
  aboutValue: { fontSize: 14, color: "#64748B", fontWeight: "500" },

  /* Logout Button */
  logoutWrapper: {
    marginTop: spacing.lg,
    marginBottom: spacing.xxl,
  },
  logoutBtn: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#ef4444", // Red 500
    backgroundColor: "rgba(239, 68, 68, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ef4444",
  },
});
