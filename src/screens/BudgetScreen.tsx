/**
 * BudgetScreen - Production Grade Budget Planner
 * A world-class budget planning experience with:
 * - Intelligent validation
 * - Skeleton loading states
 * - Beautiful result visualization
 * - Smart insights & tips
 * - Premium UI/UX
 */

import React, { memo, useCallback, useMemo } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  FlatList,
  Dimensions,
} from "react-native";
import { Text, Button, TextInput, Divider } from "react-native-paper";
import { useRoute, RouteProp } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useBudgetPlanner, TravelClass, BudgetInsights } from "@/hooks/useBudgetPlanner";
import { PressableScale } from "@/components/UI/PressableScale";
import { DestinationDetailSkeleton } from "@/components/UI/SkeletonLoader";
import { RootStackParamList, BudgetEstimate } from "@/types";
import { colors, spacing } from "@/theme/colors";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

type RouteType = RouteProp<RootStackParamList, "Budget">;

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

const TRAVEL_CLASSES: { key: TravelClass; label: string; icon: string; description: string }[] = [
  { key: "economy", label: "Economy", icon: "wallet-outline", description: "Budget-friendly" },
  { key: "comfort", label: "Comfort", icon: "seat-passenger", description: "Balanced" },
  { key: "premium", label: "Premium", icon: "star-circle", description: "Luxury" },
];

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENTS (Memoized)
// ─────────────────────────────────────────────────────────────

interface SelectionChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}

const SelectionChip = memo(({ label, selected, onPress, disabled }: SelectionChipProps) => (
  <PressableScale
    style={[styles.chip, selected && styles.chipActive, disabled && styles.chipDisabled]}
    onPress={disabled ? undefined : onPress}
    accessibilityRole="button"
    accessibilityState={{ selected, disabled }}
  >
    <Text style={[styles.chipText, selected && styles.chipTextActive]} numberOfLines={1}>
      {label}
    </Text>
  </PressableScale>
));

SelectionChip.displayName = "SelectionChip";

// ─────────────────────────────────────────────────────────────

interface TravelClassCardProps {
  option: typeof TRAVEL_CLASSES[0];
  selected: boolean;
  onPress: () => void;
}

const TravelClassCard = memo(({ option, selected, onPress }: TravelClassCardProps) => (
  <PressableScale
    style={[styles.classCard, selected && styles.classCardActive]}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{ selected }}
  >
    <View style={[styles.classIconBg, selected && styles.classIconBgActive]}>
      <MaterialCommunityIcons
        name={option.icon as any}
        size={22}
        color={selected ? "#FFF" : colors.primary}
      />
    </View>
    <Text style={[styles.classLabel, selected && styles.classLabelActive]}>{option.label}</Text>
    <Text style={styles.classDesc}>{option.description}</Text>
  </PressableScale>
));

TravelClassCard.displayName = "TravelClassCard";

// ─────────────────────────────────────────────────────────────

interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  keyboardType?: "numeric" | "default";
  placeholder?: string;
  suffix?: string;
}

const FormField = memo(({ label, value, onChangeText, error, keyboardType, placeholder, suffix }: FormFieldProps) => (
  <View style={styles.fieldContainer}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={styles.inputWrapper}>
      <TextInput
        mode="outlined"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType || "default"}
        placeholder={placeholder}
        placeholderTextColor={colors.gray}
        style={styles.input}
        outlineColor={error ? colors.error : colors.border}
        activeOutlineColor={error ? colors.error : colors.primary}
        error={!!error}
        right={suffix ? <TextInput.Affix text={suffix} /> : undefined}
        accessible={true}
        accessibilityLabel={label}
      />
      {error && (
        <View style={styles.errorRow}>
          <MaterialCommunityIcons name="alert-circle" size={14} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  </View>
));

FormField.displayName = "FormField";

// ─────────────────────────────────────────────────────────────

interface ResultCardProps {
  estimate: BudgetEstimate;
  insights: BudgetInsights | null;
  onClose: () => void;
}

const ResultCard = memo(({ estimate, insights, onClose }: ResultCardProps) => {
  const breakdown = useMemo(() => [
    { label: "Accommodation", icon: "bed", value: estimate.accommodation, color: "#3B82F6" },
    { label: "Food & Dining", icon: "food", value: estimate.food, color: "#10B981" },
    { label: "Transport", icon: "car", value: estimate.transport, color: "#F59E0B" },
    { label: "Activities", icon: "run", value: estimate.activities, color: "#8B5CF6" },
    { label: "Miscellaneous", icon: "package-variant", value: estimate.miscellaneous, color: "#EC4899" },
  ], [estimate]);

  const maxValue = Math.max(...breakdown.map(b => b.value));

  return (
    <View style={styles.resultCard}>
      {/* Close Button */}
      <PressableScale style={styles.closeButton} onPress={onClose}>
        <MaterialCommunityIcons name="close" size={20} color={colors.gray} />
      </PressableScale>

      {/* Total Section */}
      <View style={styles.totalSection}>
        <Text style={styles.totalLabel}>Estimated Budget</Text>
        <Text style={styles.totalValue}>
          ₹{estimate.total?.toLocaleString("en-IN") || "N/A"}
        </Text>
        <View style={styles.totalMeta}>
          <View style={styles.metaItem}>
            <MaterialCommunityIcons name="calendar" size={14} color={colors.gray} />
            <Text style={styles.metaText}>{estimate.num_days} days</Text>
          </View>
          <View style={styles.metaDot} />
          <View style={styles.metaItem}>
            <MaterialCommunityIcons name="account-group" size={14} color={colors.gray} />
            <Text style={styles.metaText}>{estimate.family_size} people</Text>
          </View>
          <View style={styles.metaDot} />
          <View style={styles.metaItem}>
            <MaterialCommunityIcons name="star" size={14} color={colors.gray} />
            <Text style={styles.metaText}>{estimate.travel_class}</Text>
          </View>
        </View>
      </View>

      {/* Per Day / Per Person */}
      {insights && (
        <View style={styles.quickStats}>
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>₹{insights.dailyAverage.toLocaleString("en-IN")}</Text>
            <Text style={styles.quickStatLabel}>per day</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>₹{insights.perPersonCost.toLocaleString("en-IN")}</Text>
            <Text style={styles.quickStatLabel}>per person</Text>
          </View>
        </View>
      )}

      <Divider style={styles.divider} />

      {/* Breakdown */}
      <View style={styles.breakdownSection}>
        <Text style={styles.sectionTitle}>Cost Breakdown</Text>
        {breakdown.map((item) => (
          <View key={item.label} style={styles.breakdownRow}>
            <View style={styles.breakdownLabelRow}>
              <View style={[styles.breakdownIcon, { backgroundColor: `${item.color}15` }]}>
                <MaterialCommunityIcons name={item.icon as any} size={16} color={item.color} />
              </View>
              <Text style={styles.breakdownLabel}>{item.label}</Text>
            </View>
            <View style={styles.breakdownRight}>
              <Text style={styles.breakdownValue}>₹{item.value?.toLocaleString("en-IN") || "0"}</Text>
              <View style={styles.miniBarBg}>
                <View 
                  style={[
                    styles.miniBar, 
                    { 
                      width: `${(item.value / maxValue) * 100}%`,
                      backgroundColor: item.color 
                    }
                  ]} 
                />
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Insights */}
      {insights && insights.tips.length > 0 && (
        <View style={styles.insightsSection}>
          <View style={styles.insightHeader}>
            <MaterialCommunityIcons name="lightbulb-on" size={18} color={colors.accent} />
            <Text style={styles.insightTitle}>Smart Tips</Text>
          </View>
          <View style={styles.mostExpensive}>
            <Text style={styles.mostExpensiveText}>
              <Text style={styles.highlightText}>{insights.mostExpensiveCategory}</Text> is your biggest expense
            </Text>
          </View>
          {insights.tips.map((tip, index) => (
            <View key={index} style={styles.tipRow}>
              <MaterialCommunityIcons name="check-circle" size={14} color={colors.success} />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
});

ResultCard.displayName = "ResultCard";

// ─────────────────────────────────────────────────────────────

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

const ErrorState = memo(({ message, onRetry }: ErrorStateProps) => (
  <View style={styles.errorState}>
    <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.error} />
    <Text style={styles.errorStateTitle}>Calculation Failed</Text>
    <Text style={styles.errorStateMessage}>{message}</Text>
    <Button
      mode="contained"
      onPress={onRetry}
      buttonColor={colors.primary}
      style={styles.retryButton}
      icon="refresh"
    >
      Try Again
    </Button>
  </View>
));

ErrorState.displayName = "ErrorState";

// ─────────────────────────────────────────────────────────────

interface EmptyStateProps {
  hasDestination: boolean;
}

const EmptyState = memo(({ hasDestination }: EmptyStateProps) => (
  <View style={styles.emptyState}>
    <View style={styles.emptyIcon}>
      <MaterialCommunityIcons name="calculator" size={48} color={colors.primary} />
    </View>
    <Text style={styles.emptyTitle}>
      {hasDestination ? "Ready to Calculate" : "Select a Destination"}
    </Text>
    <Text style={styles.emptyMessage}>
      {hasDestination
        ? "Adjust your preferences and tap Calculate to see your budget estimate"
        : "Choose where you want to go to get started"}
    </Text>
  </View>
));

EmptyState.displayName = "EmptyState";

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

export default function BudgetScreen() {
  const route = useRoute<RouteType>();
  const preselectedDestination = route.params?.destination?.label;

  const {
    formData,
    updateField,
    fieldErrors,
    destinations,
    isLoadingDestinations,
    estimate,
    isCalculating,
    calculationError,
    calculateBudget,
    clearEstimate,
    insights,
  } = useBudgetPlanner({ preselectedDestination });

  const handleCalculate = useCallback(() => {
    calculateBudget();
  }, [calculateBudget]);

  const handleClear = useCallback(() => {
    clearEstimate();
  }, [clearEstimate]);

  // Loading state with skeleton
  if (isLoadingDestinations && !preselectedDestination) {
    return (
      <View style={styles.container}>
        <DestinationDetailSkeleton />
      </View>
    );
  }

  const hasValidDestination = !!formData.destination;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <MaterialCommunityIcons name="wallet-travel" size={28} color={colors.primary} />
        </View>
        <Text style={styles.title}>Trip Budget Planner</Text>
        <Text style={styles.subtitle}>
          Get an intelligent cost estimate for your adventure
        </Text>
      </View>

      {/* Destination Selection */}
      {!preselectedDestination && destinations.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Select Destination</Text>
          <FlatList
            data={destinations}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <SelectionChip
                label={item.label}
                selected={formData.destination === item.label}
                onPress={() => updateField("destination", item.label)}
              />
            )}
            contentContainerStyle={styles.chipList}
          />
        </View>
      )}

      {/* Selected Destination Display */}
      {preselectedDestination && (
        <View style={styles.selectedDest}>
          <MaterialCommunityIcons name="map-marker" size={18} color={colors.primary} />
          <Text style={styles.selectedDestText}>{preselectedDestination}</Text>
        </View>
      )}

      {/* Form Fields */}
      <View style={styles.formSection}>
        <View style={styles.formRow}>
          <View style={styles.formHalf}>
            <FormField
              label="Trip Duration"
              value={formData.days}
              onChangeText={(text) => updateField("days", text)}
              keyboardType="numeric"
              placeholder="3"
              suffix="days"
              error={fieldErrors.days}
            />
          </View>
          <View style={styles.formHalf}>
            <FormField
              label="Group Size"
              value={formData.familySize}
              onChangeText={(text) => updateField("familySize", text)}
              keyboardType="numeric"
              placeholder="2"
              suffix="people"
              error={fieldErrors.familySize}
            />
          </View>
        </View>
      </View>

      {/* Travel Class */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Travel Class</Text>
        <View style={styles.classGrid}>
          {TRAVEL_CLASSES.map((option) => (
            <TravelClassCard
              key={option.key}
              option={option}
              selected={formData.travelClass === option.key}
              onPress={() => updateField("travelClass", option.key)}
            />
          ))}
        </View>
      </View>

      {/* Calculate Button */}
      <Button
        mode="contained"
        onPress={handleCalculate}
        loading={isCalculating}
        disabled={isCalculating || !hasValidDestination}
        style={styles.calcButton}
        buttonColor={colors.primary}
        contentStyle={styles.calcButtonContent}
        labelStyle={styles.calcButtonLabel}
        icon="calculator"
      >
        {isCalculating ? "Calculating..." : "Calculate Budget"}
      </Button>

      {/* Error State */}
      {calculationError && !estimate && (
        <ErrorState message={calculationError} onRetry={handleCalculate} />
      )}

      {/* Result or Empty State */}
      {!isCalculating && !calculationError && (
        estimate ? (
          <ResultCard estimate={estimate} insights={insights} onClose={handleClear} />
        ) : (
          <EmptyState hasDestination={hasValidDestination} />
        )
      )}

      {/* Bottom Spacing */}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: 100,
  },

  // Header
  header: {
    alignItems: "center",
    marginBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${colors.primary}10`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: colors.gray,
    textAlign: "center",
    marginTop: 4,
  },

  // Section
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.gray,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Destination Chips
  chipList: {
    paddingRight: spacing.md,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
  },
  chipTextActive: {
    color: "#FFF",
    fontWeight: "600",
  },

  // Selected Destination
  selectedDest: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${colors.primary}10`,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
  selectedDestText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.primary,
    marginLeft: 8,
  },

  // Form
  formSection: {
    marginBottom: spacing.md,
  },
  formRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  formHalf: {
    flex: 1,
  },
  fieldContainer: {
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.gray,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputWrapper: {
    position: "relative",
  },
  input: {
    backgroundColor: "#FFF",
    height: 48,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginLeft: 4,
  },

  // Travel Class Cards
  classGrid: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  classCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.border,
  },
  classCardActive: {
    backgroundColor: `${colors.primary}08`,
    borderColor: colors.primary,
  },
  classIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${colors.primary}10`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  classIconBgActive: {
    backgroundColor: colors.primary,
  },
  classLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 2,
  },
  classLabelActive: {
    color: colors.primary,
  },
  classDesc: {
    fontSize: 11,
    color: colors.gray,
  },

  // Calculate Button
  calcButton: {
    borderRadius: 16,
    marginBottom: spacing.lg,
  },
  calcButtonContent: {
    paddingVertical: 8,
  },
  calcButtonLabel: {
    fontSize: 16,
    fontWeight: "700",
  },

  // Result Card
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  totalSection: {
    alignItems: "center",
    paddingTop: spacing.sm,
  },
  totalLabel: {
    fontSize: 13,
    color: colors.gray,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  totalValue: {
    fontSize: 42,
    fontWeight: "900",
    color: colors.primary,
    marginTop: 4,
  },
  totalMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    fontSize: 13,
    color: colors.gray,
    marginLeft: 4,
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },

  // Quick Stats
  quickStats: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  quickStat: {
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  quickStatLabel: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 2,
  },
  quickStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },

  // Divider
  divider: {
    marginVertical: spacing.md,
    backgroundColor: colors.border,
  },

  // Breakdown Section
  breakdownSection: {
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.md,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  breakdownLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  breakdownIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  breakdownLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "500",
  },
  breakdownRight: {
    alignItems: "flex-end",
    flex: 1,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  miniBarBg: {
    width: 80,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  miniBar: {
    height: "100%",
    borderRadius: 2,
  },

  // Insights Section
  insightsSection: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: `${colors.accent}08`,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${colors.accent}20`,
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginLeft: 8,
  },
  mostExpensive: {
    backgroundColor: "#FFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  mostExpensiveText: {
    fontSize: 13,
    color: colors.text,
  },
  highlightText: {
    fontWeight: "700",
    color: colors.primary,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 8,
  },
  tipText: {
    fontSize: 13,
    color: colors.text,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },

  // Error State
  errorState: {
    alignItems: "center",
    padding: spacing.xl,
    backgroundColor: `${colors.error}08`,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${colors.error}20`,
  },
  errorStateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginTop: spacing.md,
  },
  errorStateMessage: {
    fontSize: 14,
    color: colors.gray,
    textAlign: "center",
    marginTop: 8,
  },
  retryButton: {
    marginTop: spacing.md,
    borderRadius: 12,
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${colors.primary}08`,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginTop: spacing.md,
    textAlign: "center",
  },
  emptyMessage: {
    fontSize: 14,
    color: colors.gray,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },

  // Bottom Spacer
  bottomSpacer: {
    height: 32,
  },
});