/**
 * CompareScreen - Smart Travel Decision Engine
 * Transforms destination comparison into instant decision support
 * Inspired by top-tier travel apps (Airbnb, MakeMyTrip)
 */

import React, { useState, useMemo, useCallback, memo } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Animated,
} from "react-native";
import { Text, Button, Chip } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import LoadingSpinner from "@/components/Common/LoadingSpinner";
import { compareService, CompareResult, CompareProfile } from "@/services/compare";
import { destinationsService } from "@/services/destinations";
import { Destination } from "@/types";
import { colors, spacing } from "@/theme/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 32;

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

type PriorityType = "budget" | "safety" | "weather" | "balanced";

interface WinnerInfo {
  dest: string;
  insight: string;
  savings?: string;
  diff?: number;
}

interface CategoryWinner {
  category: string;
  icon: string;
  winner: string;
  insight: string;
  scoreDiff: number;
}

// ─────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────

const formatCurrency = (v: number | null | undefined): string => 
  v != null ? `₹${v.toLocaleString("en-IN")}` : "N/A";

const formatScore = (v: number | null | undefined): string => 
  v != null ? `${v}/10` : "N/A";

const formatTemp = (v: number | null | undefined): string => 
  v != null ? `${Math.round(v)}°C` : "N/A";

const formatPercent = (v: number | null | undefined): string => 
  v != null ? `${v}%` : "N/A";

const calculatePercentDiff = (v1: number, v2: number): number => {
  if (v2 === 0) return 0;
  return Math.round(((v1 - v2) / v2) * 100);
};

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────

interface DestinationChipProps {
  destination: Destination;
  isSelected: boolean;
  isDisabled: boolean;
  onPress: () => void;
}

const DestinationChip = memo(({ destination, isSelected, isDisabled, onPress }: DestinationChipProps) => (
  <TouchableOpacity
    style={[
      styles.destChip,
      isSelected && styles.destChipActive,
      isDisabled && styles.destChipDisabled,
    ]}
    onPress={onPress}
    disabled={isDisabled}
    activeOpacity={0.7}
  >
    <Text style={[styles.destChipText, isSelected && styles.destChipTextActive]} numberOfLines={1}>
      {destination.label}
    </Text>
    {destination.region && (
      <Text style={[styles.destChipRegion, isSelected && styles.destChipRegionActive]} numberOfLines={1}>
        {destination.region}
      </Text>
    )}
  </TouchableOpacity>
));

DestinationChip.displayName = "DestinationChip";

// ─────────────────────────────────────────────────────────────

interface QuickPresetProps {
  label: string;
  icon: string;
  isActive: boolean;
  onPress: () => void;
}

const QuickPreset = memo(({ label, icon, isActive, onPress }: QuickPresetProps) => (
  <TouchableOpacity
    style={[styles.presetChip, isActive && styles.presetChipActive]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <MaterialCommunityIcons 
      name={icon as any} 
      size={14} 
      color={isActive ? "#FFF" : colors.primary} 
    />
    <Text style={[styles.presetText, isActive && styles.presetTextActive]}>{label}</Text>
  </TouchableOpacity>
));

QuickPreset.displayName = "QuickPreset";

// ─────────────────────────────────────────────────────────────

interface VisualCompareBarProps {
  label: string;
  val1: number | null;
  val2: number | null;
  format: (v: any) => string;
  winner: "lower" | "higher";
  maxVal?: number;
  icon: string;
}

const VisualCompareBar = memo(({ label, val1, val2, format, winner, maxVal, icon }: VisualCompareBarProps) => {
  const v1 = val1 ?? 0;
  const v2 = val2 ?? 0;
  const max = maxVal ?? Math.max(v1, v2, 1);
  
  const isWinner1 = winner === "higher" ? v1 > v2 : v1 < v2;
  const isWinner2 = winner === "higher" ? v2 > v1 : v2 < v1;
  const isDraw = v1 === v2;

  const percent1 = Math.min((v1 / max) * 100, 100);
  const percent2 = Math.min((v2 / max) * 100, 100);

  return (
    <View style={styles.compareBarContainer}>
      <View style={styles.compareBarHeader}>
        <MaterialCommunityIcons name={icon as any} size={14} color={colors.gray} />
        <Text style={styles.compareBarLabel}>{label}</Text>
      </View>
      
      <View style={styles.compareBarRow}>
        {/* Value 1 */}
        <View style={styles.compareBarValueContainer}>
          <Text style={[styles.compareBarValue, isWinner1 && styles.winnerText]}>
            {format(val1)}
          </Text>
          <View style={styles.compareBarTrack}>
            <View 
              style={[
                styles.compareBarFill,
                { width: `${percent1}%` },
                isWinner1 && styles.compareBarWinner,
                isDraw && styles.compareBarDraw,
              ]} 
            />
          </View>
        </View>

        {/* Center */}
        <View style={styles.compareBarCenter}>
          {isWinner1 && <MaterialCommunityIcons name="check-circle" size={16} color="#10B981" />}
          {isWinner2 && <MaterialCommunityIcons name="check-circle" size={16} color="#10B981" />}
        </View>

        {/* Value 2 */}
        <View style={styles.compareBarValueContainer}>
          <Text style={[styles.compareBarValue, isWinner2 && styles.winnerText]}>
            {format(val2)}
          </Text>
          <View style={styles.compareBarTrack}>
            <View 
              style={[
                styles.compareBarFill,
                styles.compareBarFillRight,
                { width: `${percent2}%` },
                isWinner2 && styles.compareBarWinner,
                isDraw && styles.compareBarDraw,
              ]} 
            />
          </View>
        </View>
      </View>
    </View>
  );
});

VisualCompareBar.displayName = "VisualCompareBar";

// ─────────────────────────────────────────────────────────────

interface InsightCardProps {
  icon: string;
  iconColor: string;
  title: string;
  insight: string;
  type: "winner" | "info" | "warning";
}

const InsightCard = memo(({ icon, iconColor, title, insight, type }: InsightCardProps) => (
  <View style={[styles.insightCard, type === "winner" && styles.insightCardWinner]}>
    <View style={[styles.insightIcon, { backgroundColor: `${iconColor}15` }]}>
      <MaterialCommunityIcons name={icon as any} size={18} color={iconColor} />
    </View>
    <View style={styles.insightContent}>
      <Text style={styles.insightTitle}>{title}</Text>
      <Text style={styles.insightText}>{insight}</Text>
    </View>
  </View>
));

InsightCard.displayName = "InsightCard";

// ─────────────────────────────────────────────────────────────

interface WinnerBannerProps {
  winner: string;
  reason: string;
  score: number;
}

const WinnerBanner = memo(({ winner, reason, score }: WinnerBannerProps) => (
  <View style={styles.winnerBanner}>
    <View style={styles.winnerBadge}>
      <MaterialCommunityIcons name="trophy" size={28} color="#FFD700" />
    </View>
    <View style={styles.winnerContent}>
      <Text style={styles.winnerLabel}>BEST OVERALL</Text>
      <Text style={styles.winnerName}>{winner}</Text>
      <Text style={styles.winnerReason}>{reason}</Text>
    </View>
    <View style={styles.winnerScore}>
      <Text style={styles.winnerScoreValue}>{score}</Text>
      <Text style={styles.winnerScoreLabel}>Score</Text>
    </View>
  </View>
));

WinnerBanner.displayName = "WinnerBanner";

// ─────────────────────────────────────────────────────────────

interface CategoryWinnerRowProps {
  winners: CategoryWinner[];
}

const CategoryWinnerRow = memo(({ winners }: CategoryWinnerRowProps) => (
  <View style={styles.categoryWinnerRow}>
    {winners.map((item, idx) => (
      <View key={idx} style={styles.categoryWinnerCard}>
        <View style={[styles.categoryWinnerIcon, { backgroundColor: `${colors.primary}15` }]}>
          <MaterialCommunityIcons name={item.icon as any} size={16} color={colors.primary} />
        </View>
        <Text style={styles.categoryWinnerCategory}>{item.category}</Text>
        <Text style={styles.categoryWinnerName} numberOfLines={1}>{item.winner}</Text>
        <Text style={styles.categoryWinnerInsight}>{item.insight}</Text>
      </View>
    ))}
  </View>
));

CategoryWinnerRow.displayName = "CategoryWinnerRow";

// ─────────────────────────────────────────────────────────────
// CUSTOM HOOK
// ─────────────────────────────────────────────────────────────

function useCompare() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [dest1, setDest1] = useState<string>("");
  const [dest2, setDest2] = useState<string>("");
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(5);
  const [familySize, setFamilySize] = useState(4);
  const [priority, setPriority] = useState<PriorityType>("balanced");

  // Load destinations on mount
  React.useEffect(() => {
    destinationsService.getDestinations()
      .then((d) => {
        setDestinations(d);
        if (d.length >= 2) {
          setDest1(d[0].label);
          setDest2(d[1].label);
        }
      })
      .catch(() => setError("Failed to load destinations"))
      .finally(() => setInitLoading(false));
  }, []);

  // Compute analysis
  const analysis = useMemo(() => {
    if (!result) return null;

    const { dest1: d1, dest2: d2 } = result;

    // Calculate category winners
    const budgetDiff = (d1.budget?.total ?? 0) - (d2.budget?.total ?? 0);
    const budgetWinner = budgetDiff < 0 ? d1.destination : budgetDiff > 0 ? d2.destination : "Tie";
    const budgetSavings = Math.abs(budgetDiff);
    const budgetPercent = calculatePercentDiff(Math.min(d1.budget?.total ?? 0, d2.budget?.total ?? 0), Math.max(d1.budget?.total ?? 0, d2.budget?.total ?? 0));

    const safetyDiff = (d1.safety?.overall_score ?? 0) - (d2.safety?.overall_score ?? 0);
    const safetyWinner = safetyDiff > 0 ? d1.destination : safetyDiff < 0 ? d2.destination : "Tie";

    const temp1 = d1.weather?.temperature_c ?? 25;
    const temp2 = d2.weather?.temperature_c ?? 25;
    const idealTemp = 24; // Ideal vacation temperature
    const tempDiff1 = Math.abs(temp1 - idealTemp);
    const tempDiff2 = Math.abs(temp2 - idealTemp);
    const weatherWinner = tempDiff1 < tempDiff2 ? d1.destination : tempDiff1 > tempDiff2 ? d2.destination : "Tie";

    // Calculate overall scores based on priority
    const weights = {
      budget: { budget: 0.5, safety: 0.3, weather: 0.2 },
      safety: { budget: 0.2, safety: 0.6, weather: 0.2 },
      weather: { budget: 0.2, safety: 0.3, weather: 0.5 },
      balanced: { budget: 0.35, safety: 0.35, weather: 0.3 },
    };

    const w = weights[priority];

    const score1 = (
      (1 - (d1.budget?.total ?? 50000) / 100000) * w.budget * 100 +
      ((d1.safety?.overall_score ?? 5) / 10) * w.safety * 100 +
      (1 - tempDiff1 / 20) * w.weather * 100
    );

    const score2 = (
      (1 - (d2.budget?.total ?? 50000) / 100000) * w.budget * 100 +
      ((d2.safety?.overall_score ?? 5) / 10) * w.safety * 100 +
      (1 - tempDiff2 / 20) * w.weather * 100
    );

    const overallWinner = score1 > score2 ? d1.destination : score2 > score1 ? d2.destination : "Tie";

    // Generate insights
    const insights: string[] = [];
    if (budgetSavings > 0) {
      insights.push(`${budgetWinner === "Tie" ? "Both" : budgetWinner} ${budgetWinner === "Tie" ? "have similar" : "is"} ₹${budgetSavings.toLocaleString("en-IN")} cheaper (${budgetPercent}% savings)`);
    }
    if (Math.abs(safetyDiff) >= 1) {
      insights.push(`${safetyWinner} is safer by ${Math.abs(safetyDiff).toFixed(1)} points`);
    }
    if (Math.abs(temp1 - temp2) > 3) {
      const warmer = temp1 > temp2 ? d1.destination : d2.destination;
      insights.push(`${warmer} is ${Math.abs(temp1 - temp2).toFixed(0)}°C warmer`);
    }

    // Category winners for display
    const categoryWinners: CategoryWinner[] = [
      {
        category: "Budget",
        icon: "wallet",
        winner: budgetWinner,
        insight: budgetPercent > 0 ? `${budgetPercent}% less` : "Similar cost",
        scoreDiff: Math.abs(budgetDiff),
      },
      {
        category: "Safety",
        icon: "shield-check",
        winner: safetyWinner,
        insight: `${Math.abs(safetyDiff).toFixed(1)} pts ${safetyDiff > 0 ? "higher" : "lower"}`,
        scoreDiff: Math.abs(safetyDiff),
      },
      {
        category: "Weather",
        icon: "weather-sunny",
        winner: weatherWinner,
        insight: `${weatherWinner === d1.destination ? Math.round(temp1) : Math.round(temp2)}°C ideal`,
        scoreDiff: Math.abs(tempDiff1 - tempDiff2),
      },
    ];

    return {
      budgetWinner,
      safetyWinner,
      weatherWinner,
      overallWinner,
      winnerScore: Math.max(score1, score2),
      insights,
      categoryWinners,
      budgetPercent,
      safetyDiff,
      temp1,
      temp2,
    };
  }, [result, priority]);

  const compare = useCallback(async () => {
    if (!dest1 || !dest2 || dest1 === dest2) {
      setError("Please select two different destinations");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await compareService.compare(dest1, dest2, days, familySize, "economy");
      setResult(res);
    } catch (e: any) {
      setError(e.message || "Comparison failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [dest1, dest2, days, familySize]);

  const retry = useCallback(() => {
    setError(null);
    compare();
  }, [compare]);

  return {
    destinations,
    dest1,
    setDest1,
    dest2,
    setDest2,
    result,
    analysis,
    loading,
    initLoading,
    error,
    days,
    setDays,
    familySize,
    setFamilySize,
    priority,
    setPriority,
    compare,
    retry,
  };
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

export default function CompareScreen() {
  const {
    destinations,
    dest1,
    setDest1,
    dest2,
    setDest2,
    result,
    analysis,
    loading,
    initLoading,
    error,
    priority,
    setPriority,
    compare,
    retry,
  } = useCompare();

  const renderDestination = useCallback(({ item }: { item: Destination }) => {
    const isSelected1 = dest1 === item.label;
    const isSelected2 = dest2 === item.label;
    const isDisabled = (isSelected1 || isSelected2) && !(dest1 === item.label || dest2 === item.label);
    
    return (
      <DestinationChip
        destination={item}
        isSelected={isSelected1 || isSelected2}
        isDisabled={false}
        onPress={() => {
          if (isSelected1) return; // Already selected as dest1
          if (isSelected2) return; // Already selected as dest2
          // Select the one that's not selected
          if (!dest1) setDest1(item.label);
          else if (!dest2) setDest2(item.label);
          else setDest2(item.label); // Replace dest2 by default
        }}
      />
    );
  }, [dest1, dest2, setDest1, setDest2]);

  const keyExtractor = useCallback((item: Destination) => item.id, []);

  if (initLoading) {
    return <LoadingSpinner message="Loading destinations..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Smart Comparison</Text>
          <Text style={styles.subtitle}>Find your perfect destination in seconds</Text>
        </View>

        {/* Priority Selector */}
        <View style={styles.prioritySection}>
          <Text style={styles.sectionLabel}>What matters most?</Text>
          <View style={styles.priorityRow}>
            <QuickPreset 
              label="Budget" 
              icon="wallet" 
              isActive={priority === "budget"} 
              onPress={() => setPriority("budget")} 
            />
            <QuickPreset 
              label="Safety" 
              icon="shield-check" 
              isActive={priority === "safety"} 
              onPress={() => setPriority("safety")} 
            />
            <QuickPreset 
              label="Weather" 
              icon="weather-sunny" 
              isActive={priority === "weather"} 
              onPress={() => setPriority("weather")} 
            />
            <QuickPreset 
              label="Balanced" 
              icon="scale-balance" 
              isActive={priority === "balanced"} 
              onPress={() => setPriority("balanced")} 
            />
          </View>
        </View>

        {/* Destination Selection */}
        <View style={styles.selectionSection}>
          <View style={styles.selectedPair}>
            <View style={styles.selectedDest}>
              <Text style={styles.selectedLabel}>First</Text>
              <View style={styles.selectedDestCard}>
                <Text style={styles.selectedDestName} numberOfLines={1}>
                  {dest1 || "Select destination"}
                </Text>
              </View>
            </View>
            
            <View style={styles.vsBadge}>
              <Text style={styles.vsText}>VS</Text>
            </View>
            
            <View style={styles.selectedDest}>
              <Text style={styles.selectedLabel}>Second</Text>
              <View style={styles.selectedDestCard}>
                <Text style={styles.selectedDestName} numberOfLines={1}>
                  {dest2 || "Select destination"}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.pickLabel}>Tap to select destinations:</Text>
          <FlatList
            data={destinations}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={keyExtractor}
            renderItem={renderDestination}
            contentContainerStyle={styles.destList}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
          />
        </View>

        {/* Compare Button */}
        <Button
          mode="contained"
          onPress={compare}
          loading={loading}
          disabled={loading || !dest1 || !dest2 || dest1 === dest2}
          style={styles.compareBtn}
          buttonColor={colors.primary}
          contentStyle={styles.compareBtnContent}
          labelStyle={styles.compareBtnLabel}
          icon="compare"
        >
          Compare Now
        </Button>

        {/* Error State */}
        {error && (
          <View style={styles.errorCard}>
            <MaterialCommunityIcons name="alert-circle-outline" size={24} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={retry}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Loading State */}
        {loading && <LoadingSpinner message="Analyzing destinations..." />}

        {/* Results */}
        {result && analysis && (
          <View style={styles.resultsSection}>
            {/* Winner Banner */}
            {analysis.overallWinner !== "Tie" && (
              <WinnerBanner 
                winner={analysis.overallWinner} 
                reason={`Best for ${priority} focus`}
                score={Math.round(analysis.winnerScore)}
              />
            )}

            {/* Category Winners */}
            <CategoryWinnerRow winners={analysis.categoryWinners} />

            {/* Insights */}
            {analysis.insights.length > 0 && (
              <View style={styles.insightsSection}>
                <Text style={styles.insightsTitle}>Key Insights</Text>
                {analysis.insights.map((insight, idx) => (
                  <InsightCard
                    key={idx}
                    icon="lightbulb-outline"
                    iconColor={colors.primary}
                    title=""
                    insight={insight}
                    type="info"
                  />
                ))}
              </View>
            )}

            {/* Detailed Comparison */}
            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>Detailed Comparison</Text>

              {/* Budget Section */}
              <View style={styles.comparisonCard}>
                <View style={styles.comparisonCardHeader}>
                  <MaterialCommunityIcons name="wallet" size={18} color="#10B981" />
                  <Text style={styles.comparisonCardTitle}>Budget Breakdown</Text>
                </View>
                <VisualCompareBar
                  label="Total Cost"
                  val1={result.dest1.budget?.total}
                  val2={result.dest2.budget?.total}
                  format={formatCurrency}
                  winner="lower"
                  icon="cash"
                  maxVal={100000}
                />
                <VisualCompareBar
                  label="Accommodation"
                  val1={result.dest1.budget?.accommodation}
                  val2={result.dest2.budget?.accommodation}
                  format={formatCurrency}
                  winner="lower"
                  icon="bed"
                  maxVal={50000}
                />
                <VisualCompareBar
                  label="Food"
                  val1={result.dest1.budget?.food}
                  val2={result.dest2.budget?.food}
                  format={formatCurrency}
                  winner="lower"
                  icon="food"
                  maxVal={20000}
                />
                <VisualCompareBar
                  label="Transport"
                  val1={result.dest1.budget?.transport}
                  val2={result.dest2.budget?.transport}
                  format={formatCurrency}
                  winner="lower"
                  icon="car"
                  maxVal={20000}
                />
              </View>

              {/* Safety Section */}
              <View style={styles.comparisonCard}>
                <View style={styles.comparisonCardHeader}>
                  <MaterialCommunityIcons name="shield-check" size={18} color="#3B82F6" />
                  <Text style={styles.comparisonCardTitle}>Safety Scores</Text>
                </View>
                <VisualCompareBar
                  label="Overall"
                  val1={result.dest1.safety?.overall_score ?? null}
                  val2={result.dest2.safety?.overall_score ?? null}
                  format={formatScore}
                  winner="higher"
                  icon="shield"
                  maxVal={10}
                />
                <VisualCompareBar
                  label="Tourist Friendly"
                  val1={result.dest1.safety?.tourist_friendly ?? null}
                  val2={result.dest2.safety?.tourist_friendly ?? null}
                  format={formatScore}
                  winner="higher"
                  icon="account-group"
                  maxVal={10}
                />
                <VisualCompareBar
                  label="Health"
                  val1={result.dest1.safety?.health ?? null}
                  val2={result.dest2.safety?.health ?? null}
                  format={formatScore}
                  winner="higher"
                  icon="hospital"
                  maxVal={10}
                />
              </View>

              {/* Weather Section */}
              <View style={styles.comparisonCard}>
                <View style={styles.comparisonCardHeader}>
                  <MaterialCommunityIcons name="weather-partly-cloudy" size={18} color="#F59E0B" />
                  <Text style={styles.comparisonCardTitle}>Current Weather</Text>
                </View>
                <VisualCompareBar
                  label="Temperature"
                  val1={result.dest1.weather?.temperature_c}
                  val2={result.dest2.weather?.temperature_c}
                  format={formatTemp}
                  winner="higher"
                  icon="thermometer"
                  maxVal={45}
                />
                <VisualCompareBar
                  label="Humidity"
                  val1={result.dest1.weather?.humidity}
                  val2={result.dest2.weather?.humidity}
                  format={formatPercent}
                  winner="lower"
                  icon="water-percent"
                  maxVal={100}
                />
                <VisualCompareBar
                  label="Wind"
                  val1={result.dest1.weather?.wind_speed_kmh}
                  val2={result.dest2.weather?.wind_speed_kmh}
                  format={(v) => v != null ? `${v} km/h` : "N/A"}
                  winner="higher"
                  icon="weather-windy"
                  maxVal={50}
                />
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.md, paddingBottom: 120 },

  // Header
  header: { marginBottom: spacing.lg },
  title: { fontSize: 28, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 14, color: colors.gray, marginTop: 4 },

  // Section Label
  sectionLabel: { fontSize: 12, fontWeight: "600", color: colors.gray, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },

  // Priority Section
  prioritySection: { marginBottom: spacing.lg },
  priorityRow: { flexDirection: "row", gap: 8 },
  presetChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary },
  presetChipActive: { backgroundColor: colors.primary },
  presetText: { fontSize: 13, fontWeight: "600", color: colors.primary },
  presetTextActive: { color: "#FFF" },

  // Selection Section
  selectionSection: { marginBottom: spacing.lg },
  selectedPair: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md },
  selectedDest: { flex: 1 },
  selectedLabel: { fontSize: 11, color: colors.gray, marginBottom: 4 },
  selectedDestCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },
  selectedDestName: { fontSize: 14, fontWeight: "600", color: colors.text, textAlign: "center" },
  vsBadge: { paddingHorizontal: 12 },
  vsText: { fontSize: 12, fontWeight: "900", color: colors.primary },
  pickLabel: { fontSize: 12, color: colors.gray, marginBottom: 8 },
  destList: { gap: 8 },
  destChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, minWidth: 80 },
  destChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  destChipDisabled: { opacity: 0.5 },
  destChipText: { fontSize: 13, fontWeight: "600", color: colors.text },
  destChipTextActive: { color: "#FFF" },
  destChipRegion: { fontSize: 10, color: colors.gray, marginTop: 2 },
  destChipRegionActive: { color: "rgba(255,255,255,0.8)" },

  // Compare Button
  compareBtn: { borderRadius: 16, marginBottom: spacing.lg },
  compareBtnContent: { paddingVertical: 8 },
  compareBtnLabel: { fontSize: 16, fontWeight: "700" },

  // Error
  errorCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#FEF2F2", padding: 14, borderRadius: 12, marginBottom: spacing.md, gap: 10 },
  errorText: { flex: 1, fontSize: 14, color: colors.error },
  retryText: { fontSize: 14, fontWeight: "600", color: colors.primary },

  // Results Section
  resultsSection: { gap: spacing.md },

  // Winner Banner
  winnerBanner: { flexDirection: "row", alignItems: "center", backgroundColor: "#FEF3C7", padding: 16, borderRadius: 16, borderWidth: 2, borderColor: "#FCD34D" },
  winnerBadge: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", marginRight: 12 },
  winnerContent: { flex: 1 },
  winnerLabel: { fontSize: 10, fontWeight: "800", color: "#92400E", letterSpacing: 1 },
  winnerName: { fontSize: 20, fontWeight: "800", color: colors.text },
  winnerReason: { fontSize: 12, color: colors.gray, marginTop: 2 },
  winnerScore: { alignItems: "center" },
  winnerScoreValue: { fontSize: 24, fontWeight: "800", color: colors.primary },
  winnerScoreLabel: { fontSize: 10, color: colors.gray },

  // Category Winners
  categoryWinnerRow: { flexDirection: "row", gap: 8 },
  categoryWinnerCard: { flex: 1, backgroundColor: colors.surface, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  categoryWinnerIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  categoryWinnerCategory: { fontSize: 10, color: colors.gray, fontWeight: "600", textTransform: "uppercase" },
  categoryWinnerName: { fontSize: 13, fontWeight: "700", color: colors.text, marginTop: 2 },
  categoryWinnerInsight: { fontSize: 11, color: colors.primary, marginTop: 2 },

  // Insights
  insightsSection: { gap: 8 },
  insightsTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 4 },
  insightCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, padding: 12, borderRadius: 12, gap: 10, borderWidth: 1, borderColor: colors.border },
  insightCardWinner: { borderColor: "#10B981", backgroundColor: "#F0FDF4" },
  insightIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  insightContent: { flex: 1 },
  insightTitle: { fontSize: 12, fontWeight: "600", color: colors.text },
  insightText: { fontSize: 13, color: colors.gray, marginTop: 2 },

  // Detail Section
  detailSection: { gap: spacing.md, marginTop: spacing.sm },
  detailTitle: { fontSize: 18, fontWeight: "700", color: colors.text },

  // Comparison Card
  comparisonCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  comparisonCardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  comparisonCardTitle: { fontSize: 14, fontWeight: "700", color: colors.text },

  // Compare Bar
  compareBarContainer: { marginBottom: 12 },
  compareBarHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  compareBarLabel: { fontSize: 11, color: colors.gray },
  compareBarRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  compareBarValueContainer: { flex: 1, alignItems: "flex-end" },
  compareBarValue: { fontSize: 12, fontWeight: "600", color: colors.text, marginBottom: 4 },
  winnerText: { color: "#10B981" },
  compareBarTrack: { height: 6, backgroundColor: `${colors.gray}20`, borderRadius: 3, width: "100%", overflow: "hidden" },
  compareBarFill: { height: "100%", backgroundColor: colors.gray, borderRadius: 3 },
  compareBarFillRight: { alignSelf: "flex-end" },
  compareBarWinner: { backgroundColor: "#10B981" },
  compareBarDraw: { backgroundColor: colors.warning },
  compareBarCenter: { width: 24, alignItems: "center" },
});