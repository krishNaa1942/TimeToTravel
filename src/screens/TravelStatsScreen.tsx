/**
 * AI Travel Intelligence OS
 * A next-generation travel analytics and intelligence system
 * 
 * Features:
 * - AI Insight Engine
 * - Travel DNA Analysis
 * - Financial Intelligence
 * - Prediction Engine
 * - Gamification System
 * - AI Assistant
 * - Premium Glassmorphism UI
 */

import React, { useState, useCallback, useMemo, memo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Dimensions,
  RefreshControl,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Text, IconButton, Chip, Divider, Modal, Portal } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTravelIntelligence } from '@/hooks/useTravelIntelligence';
import { colors, spacing } from '@/theme/colors';
import {
  TravelDNA,
  AIInsight,
  TravelPrediction,
  SpendingCategory,
  Badge,
  TravelStory,
} from '@/types/travelIntelligence';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRADIENT_COLORS = {
  morning: ['#1a1a2e', '#16213e', '#0f3460'] as const,
  afternoon: ['#1e3c72', '#2a5298', '#3a7bd5'] as const,
  evening: ['#0f0c29', '#302b63', '#24243e'] as const,
  night: ['#0a0a0a', '#1a1a2e', '#16213e'] as const,
};

// ─────────────────────────────────────────────────────────────
// ANIMATED COUNTER COMPONENT
// ─────────────────────────────────────────────────────────────

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  style?: any;
  prefix?: string;
  suffix?: string;
}

const AnimatedCounter: React.FC<AnimatedCounterProps> = memo(({
  value,
  duration = 1000,
  style,
  prefix = '',
  suffix = '',
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  React.useEffect(() => {
    const startTime = Date.now();
    const startValue = displayValue;
    const endValue = value;
    const diff = endValue - startValue;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = Math.round(startValue + diff * easeOutQuart);
      
      setDisplayValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, duration]);
  
  return (
    <Text style={style}>
      {prefix}{displayValue.toLocaleString()}{suffix}
    </Text>
  );
});

// ─────────────────────────────────────────────────────────────
// GLASSMORPHISM CARD
// ─────────────────────────────────────────────────────────────

interface GlassCardProps {
  children: React.ReactNode;
  style?: any;
  intensity?: number;
}

const GlassCard: React.FC<GlassCardProps> = memo(({ children, style, intensity = 20 }) => (
  <View style={[styles.glassCard, style]}>
    <BlurView intensity={intensity} style={styles.blurView} tint="dark">
      <View style={styles.glassContent}>
        {children}
      </View>
    </BlurView>
  </View>
));

// ─────────────────────────────────────────────────────────────
// SKELETON LOADER
// ─────────────────────────────────────────────────────────────

const SkeletonLoader: React.FC = memo(() => (
  <View style={styles.skeletonContainer}>
    {[1, 2, 3, 4].map((i) => (
      <View key={i} style={styles.skeletonCard}>
        <View style={styles.skeletonHeader} />
        <View style={styles.skeletonRow}>
          <View style={styles.skeletonBox} />
          <View style={styles.skeletonBox} />
          <View style={styles.skeletonBox} />
        </View>
      </View>
    ))}
  </View>
));

// ─────────────────────────────────────────────────────────────
// DNA RADIAL CHART
// ─────────────────────────────────────────────────────────────

interface DNARadialChartProps {
  dna: TravelDNA;
}

const DNARadialChart: React.FC<DNARadialChartProps> = memo(({ dna }) => {
  const segments = [
    { key: 'explorer', label: 'Explorer', value: dna.explorer, color: '#4ECDC4' },
    { key: 'luxury', label: 'Luxury', value: dna.luxury, color: '#FFD700' },
    { key: 'budget', label: 'Budget', value: dna.budget, color: '#10B981' },
    { key: 'foodie', label: 'Foodie', value: dna.foodie, color: '#EF4444' },
    { key: 'adventure', label: 'Adventure', value: dna.adventure, color: '#F59E0B' },
    { key: 'culture', label: 'Culture', value: dna.culture, color: '#8B5CF6' },
  ];

  return (
    <GlassCard style={styles.dnaCard}>
      <Text style={styles.sectionTitle}>Your Travel DNA</Text>
      <View style={styles.dnaGrid}>
        {segments.map((segment) => (
          <View key={segment.key} style={styles.dnaItem}>
            <View style={styles.dnaBarContainer}>
              <View 
                style={[
                  styles.dnaBar, 
                  { 
                    height: `${segment.value}%`, 
                    backgroundColor: segment.color,
                  },
                ]} 
              />
            </View>
            <Text style={styles.dnaValue}>{segment.value}%</Text>
            <Text style={styles.dnaLabel}>{segment.label}</Text>
          </View>
        ))}
      </View>
    </GlassCard>
  );
});

// ─────────────────────────────────────────────────────────────
// INSIGHT CARD
// ─────────────────────────────────────────────────────────────

interface InsightCardProps {
  insight: AIInsight;
  onDismiss?: () => void;
}

const InsightCard: React.FC<InsightCardProps> = memo(({ insight, onDismiss }) => {
  const priorityColors = {
    low: '#6B7280',
    medium: '#3B82F6',
    high: '#F59E0B',
    urgent: '#EF4444',
  };

  return (
    <GlassCard style={[styles.insightCard, { borderLeftColor: priorityColors[insight.priority] }]}>
      <View style={styles.insightHeader}>
        <Text style={styles.insightIcon}>{insight.icon}</Text>
        <View style={styles.insightTitleContainer}>
          <Text style={styles.insightTitle}>{insight.title}</Text>
          <Chip 
            mode="flat" 
            style={[styles.priorityChip, { backgroundColor: priorityColors[insight.priority] + '20' }]}
            textStyle={{ color: priorityColors[insight.priority], fontSize: 10 }}
          >
            {insight.type}
          </Chip>
        </View>
      </View>
      <Text style={styles.insightDescription}>{insight.description}</Text>
      {insight.actionLabel && (
        <TouchableOpacity style={styles.insightAction}>
          <Text style={styles.insightActionLabel}>{insight.actionLabel}</Text>
        </TouchableOpacity>
      )}
    </GlassCard>
  );
});

// ─────────────────────────────────────────────────────────────
// PREDICTION CARD
// ─────────────────────────────────────────────────────────────

interface PredictionCardProps {
  prediction: TravelPrediction;
}

const PredictionCard: React.FC<PredictionCardProps> = memo(({ prediction }) => {
  const icons = {
    next_trip: '✈️',
    destination: '📍',
    budget: '💰',
    season: '🌤️',
    frequency: '📊',
  };

  return (
    <View style={styles.predictionItem}>
      <Text style={styles.predictionIcon}>{icons[prediction.type] || '🔮'}</Text>
      <View style={styles.predictionContent}>
        <Text style={styles.predictionText}>{prediction.prediction}</Text>
        <Text style={styles.predictionConfidence}>
          {Math.round(prediction.confidence * 100)}% confidence
        </Text>
      </View>
    </View>
  );
});

// ─────────────────────────────────────────────────────────────
// SPENDING CHART
// ─────────────────────────────────────────────────────────────

interface SpendingChartProps {
  categories: SpendingCategory[];
  totalSpent: number;
}

const SpendingChart: React.FC<SpendingChartProps> = memo(({ categories, totalSpent }) => {
  if (categories.length === 0 || totalSpent === 0) {
    return (
      <GlassCard style={styles.spendingCard}>
        <Text style={styles.sectionTitle}>Financial Intelligence</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>💰</Text>
          <Text style={styles.emptyText}>No spending data yet</Text>
          <Text style={styles.emptySubtext}>Start tracking your trips to see insights</Text>
        </View>
      </GlassCard>
    );
  }

  return (
    <GlassCard style={styles.spendingCard}>
      <Text style={styles.sectionTitle}>Financial Intelligence</Text>
      <Text style={styles.totalSpent}>
        ₹<AnimatedCounter value={totalSpent} />
      </Text>
      <Text style={styles.totalLabel}>Total Travel Investment</Text>
      
      <View style={styles.spendingBreakdown}>
        {categories.slice(0, 5).map((category) => (
          <View key={category.name} style={styles.categoryRow}>
            <Text style={styles.categoryName}>{category.name}</Text>
            <View style={styles.categoryBarBg}>
              <View 
                style={[
                  styles.categoryBar, 
                  { width: `${Math.min(category.percentage, 100)}%` },
                  category.status === 'over' && styles.categoryBarOver,
                ]} 
              />
            </View>
            <Text style={styles.categoryAmount}>₹{category.amount.toLocaleString()}</Text>
            <Text style={styles.categoryPercent}>{category.percentage}%</Text>
          </View>
        ))}
      </View>

      {categories[0]?.insights && categories[0].insights.length > 0 && (
        <View style={styles.spendingInsights}>
          <Text style={styles.insightTip}>💡 {categories[0].insights[0]}</Text>
        </View>
      )}
    </GlassCard>
  );
});

// ─────────────────────────────────────────────────────────────
// LEVEL PROGRESS CARD
// ─────────────────────────────────────────────────────────────

interface LevelCardProps {
  level: {
    level: number;
    xp: number;
    xpToNext: number;
    title: string;
    progress: number;
    icon: string;
  };
}

const LevelCard: React.FC<LevelCardProps> = memo(({ level }) => (
  <GlassCard style={styles.levelCard}>
    <View style={styles.levelHeader}>
      <Text style={styles.levelIcon}>{level.icon}</Text>
      <View style={styles.levelInfo}>
        <Text style={styles.levelTitle}>{level.title}</Text>
        <Text style={styles.levelNumber}>Level {level.level}</Text>
      </View>
      <View style={styles.xpContainer}>
        <Text style={styles.xpValue}>{level.xp}</Text>
        <Text style={styles.xpLabel}>XP</Text>
      </View>
    </View>
    <View style={styles.progressContainer}>
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBar, { width: `${level.progress}%` }]} />
      </View>
      <Text style={styles.progressLabel}>{level.xpToNext} XP to next level</Text>
    </View>
  </GlassCard>
));

// ─────────────────────────────────────────────────────────────
// BADGE GRID
// ─────────────────────────────────────────────────────────────

interface BadgeGridProps {
  badges: Badge[];
}

const BadgeGrid: React.FC<BadgeGridProps> = memo(({ badges }) => {
  const unlockedBadges = badges.filter(b => b.isUnlocked);
  const lockedBadges = badges.filter(b => !b.isUnlocked).slice(0, 4);

  return (
    <GlassCard style={styles.badgeCard}>
      <Text style={styles.sectionTitle}>Achievements</Text>
      <View style={styles.badgeGrid}>
        {unlockedBadges.slice(0, 6).map((badge) => (
          <View key={badge.id} style={styles.badgeItem}>
            <View style={[styles.badgeIcon, styles.badgeUnlocked]}>
              <Text style={styles.badgeEmoji}>{badge.icon}</Text>
            </View>
            <Text style={styles.badgeName}>{badge.name}</Text>
          </View>
        ))}
        {lockedBadges.map((badge) => (
          <View key={badge.id} style={styles.badgeItem}>
            <View style={[styles.badgeIcon, styles.badgeLocked]}>
              <Text style={styles.badgeEmojiLocked}>🔒</Text>
            </View>
            <Text style={styles.badgeNameLocked}>{badge.name}</Text>
          </View>
        ))}
      </View>
    </GlassCard>
  );
});

// ─────────────────────────────────────────────────────────────
// STREAK CARD
// ─────────────────────────────────────────────────────────────

interface StreakCardProps {
  streaks: { current: number; longest: number; type: string; isActive: boolean }[];
}

const StreakCard: React.FC<StreakCardProps> = memo(({ streaks }) => {
  const tripStreak = streaks.find(s => s.type === 'trips');
  const dayStreak = streaks.find(s => s.type === 'days');

  return (
    <View style={styles.streakContainer}>
      {tripStreak && (
        <GlassCard style={styles.streakCard}>
          <Text style={styles.streakIcon}>🔥</Text>
          <AnimatedCounter value={tripStreak.current} style={styles.streakValue} />
          <Text style={styles.streakLabel}>Trip Streak</Text>
          <Text style={styles.streakBest}>Best: {tripStreak.longest}</Text>
        </GlassCard>
      )}
      {dayStreak && (
        <GlassCard style={styles.streakCard}>
          <Text style={styles.streakIcon}>📅</Text>
          <AnimatedCounter value={dayStreak.current} style={styles.streakValue} />
          <Text style={styles.streakLabel}>Days Traveled</Text>
          <Text style={styles.streakBest}>Longest: {dayStreak.longest}</Text>
        </GlassCard>
      )}
    </View>
  );
});

// ─────────────────────────────────────────────────────────────
// AI ASSISTANT MODAL
// ─────────────────────────────────────────────────────────────

interface AIAssistantModalProps {
  visible: boolean;
  onClose: () => void;
  onQuery: (query: string) => Promise<any>;
}

const AIAssistantModal: React.FC<AIAssistantModalProps> = memo(({ visible, onClose, onQuery }) => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const suggestedQueries = [
    'Where should I travel next?',
    'How can I reduce expenses?',
    'What is my travel personality?',
    'Predict my next trip',
  ];

  const handleQuery = async (q: string) => {
    setLoading(true);
    setQuery(q);
    const res = await onQuery(q);
    setResponse(res);
    setLoading(false);
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>🤖 Travel AI Assistant</Text>
          <IconButton icon="close" onPress={onClose} iconColor="#fff" />
        </View>
        
        <View style={styles.suggestedQueries}>
          {suggestedQueries.map((q, i) => (
            <Chip 
              key={i} 
              mode="outlined" 
              style={styles.queryChip}
              onPress={() => handleQuery(q)}
              textStyle={styles.queryChipText}
            >
              {q}
            </Chip>
          ))}
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Analyzing your travel data...</Text>
          </View>
        )}

        {response && (
          <ScrollView style={styles.responseContainer}>
            <Text style={styles.responseText}>{response.response}</Text>
            {response.followUpQuestions?.length > 0 && (
              <View style={styles.followUpContainer}>
                <Text style={styles.followUpTitle}>Follow up:</Text>
                {response.followUpQuestions.map((q: string, i: number) => (
                  <Chip 
                    key={i} 
                    mode="outlined" 
                    style={styles.followUpChip}
                    onPress={() => handleQuery(q)}
                    textStyle={styles.followUpChipText}
                  >
                    {q}
                  </Chip>
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </Modal>
    </Portal>
  );
});

// ─────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────

const EmptyState: React.FC = memo(() => (
  <View style={styles.emptyStateContainer}>
    <Text style={styles.emptyStateIcon}>🌍</Text>
    <Text style={styles.emptyStateTitle}>Your Travel Journey Awaits</Text>
    <Text style={styles.emptyStateSubtitle}>
      Start planning trips to unlock AI-powered insights about your travel behavior
    </Text>
    <GlassCard style={styles.emptyStateCard}>
      <Text style={styles.emptyStateTip}>💡 Tip: Plan your first trip to get personalized travel intelligence</Text>
    </GlassCard>
  </View>
));

// ─────────────────────────────────────────────────────────────
// ERROR STATE
// ─────────────────────────────────────────────────────────────

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = memo(({ error, onRetry }) => (
  <View style={styles.errorContainer}>
    <Text style={styles.errorIcon}>⚠️</Text>
    <Text style={styles.errorTitle}>Something went wrong</Text>
    <Text style={styles.errorMessage}>{error}</Text>
    <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
      <Text style={styles.retryButtonText}>Try Again</Text>
    </TouchableOpacity>
  </View>
));

// ─────────────────────────────────────────────────────────────
// MAIN SCREEN COMPONENT
// ─────────────────────────────────────────────────────────────

export default function TravelStatsScreen() {
  const {
    stats,
    rawStats,
    dna,
    personality,
    insights,
    predictions,
    financialHealth,
    spendingCategories,
    level,
    streaks,
    badges,
    achievements,
    stories,
    refresh,
    dismissInsight,
    askAI,
    isLoading,
    isRefreshing,
    error,
    hasData,
  } = useTravelIntelligence();

  const [aiModalVisible, setAiModalVisible] = useState(false);

  // Get time-based gradient
  const gradientColors = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return GRADIENT_COLORS.morning;
    if (hour >= 12 && hour < 17) return GRADIENT_COLORS.afternoon;
    if (hour >= 17 && hour < 21) return GRADIENT_COLORS.evening;
    return GRADIENT_COLORS.night;
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <LinearGradient colors={gradientColors} style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <Text style={styles.title}>Travel Intelligence</Text>
          </View>
          <SkeletonLoader />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Error state
  if (error && !hasData) {
    return (
      <LinearGradient colors={gradientColors} style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <ErrorState error={error} onRetry={refresh} />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Empty state
  if (!hasData) {
    return (
      <LinearGradient colors={gradientColors} style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <Text style={styles.title}>Travel Intelligence</Text>
            <IconButton 
              icon="refresh" 
              onPress={refresh} 
              iconColor="#fff"
            />
          </View>
          <EmptyState />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Travel Intelligence</Text>
            <Text style={styles.subtitle}>AI-powered insights about your journeys</Text>
          </View>
          <View style={styles.headerActions}>
            <IconButton 
              icon="robot" 
              onPress={() => setAiModalVisible(true)} 
              iconColor="#fff"
              style={styles.aiButton}
            />
            <IconButton 
              icon="refresh" 
              onPress={refresh} 
              iconColor="#fff"
            />
          </View>
        </View>

        {/* Main Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refresh}
              tintColor="#fff"
              colors={['#4ECDC4']}
            />
          }
        >
          {/* Personality Card */}
          {personality && (
            <GlassCard style={styles.personalityCard}>
              <View style={styles.personalityHeader}>
                <Text style={styles.personalityIcon}>{personality.icon}</Text>
                <View style={styles.personalityInfo}>
                  <Text style={styles.personalityType}>{personality.type}</Text>
                  <Text style={styles.personalityTagline}>{personality.tagline}</Text>
                </View>
              </View>
              <Text style={styles.personalityDescription}>{personality.description}</Text>
              {personality.tips.length > 0 && (
                <Text style={styles.personalityTip}>💡 {personality.tips[0]}</Text>
              )}
            </GlassCard>
          )}

          {/* Level Progress */}
          {level && <LevelCard level={level} />}

          {/* Hero Stats */}
          {rawStats && (
            <View style={styles.heroStatsRow}>
              <GlassCard style={styles.heroStatCard}>
                <AnimatedCounter value={rawStats.trips.total} style={styles.heroValue} />
                <Text style={styles.heroLabel}>Trips</Text>
              </GlassCard>
              <GlassCard style={styles.heroStatCard}>
                <AnimatedCounter value={rawStats.destinations_visited} style={styles.heroValue} />
                <Text style={styles.heroLabel}>Places</Text>
              </GlassCard>
              <GlassCard style={styles.heroStatCard}>
                <AnimatedCounter value={rawStats.total_travel_days} style={styles.heroValue} />
                <Text style={styles.heroLabel}>Days</Text>
              </GlassCard>
            </View>
          )}

          {/* Streaks */}
          {streaks.length > 0 && <StreakCard streaks={streaks} />}

          {/* Travel DNA */}
          {dna && <DNARadialChart dna={dna} />}

          {/* AI Insights */}
          {insights.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionHeaderText}>AI Insights</Text>
              {insights.slice(0, 3).map((insight) => (
                <InsightCard 
                  key={insight.id} 
                  insight={insight} 
                  onDismiss={() => dismissInsight(insight.id)}
                />
              ))}
            </View>
          )}

          {/* Predictions */}
          {predictions.length > 0 && (
            <GlassCard style={styles.predictionsCard}>
              <Text style={styles.sectionTitle}>Predictions</Text>
              <Text style={styles.predictionsSubtitle}>Based on your travel patterns</Text>
              {predictions.slice(0, 3).map((prediction, index) => (
                <PredictionCard key={index} prediction={prediction} />
              ))}
            </GlassCard>
          )}

          {/* Financial Intelligence */}
          {rawStats && (
            <SpendingChart 
              categories={spendingCategories} 
              totalSpent={rawStats.total_spent} 
            />
          )}

          {/* Badges */}
          {badges.length > 0 && <BadgeGrid badges={badges} />}

          {/* Travel Stories */}
          {stories.length > 0 && (
            <GlassCard style={styles.storiesCard}>
              <Text style={styles.sectionTitle}>Your Travel Story</Text>
              {stories[0] && (
                <>
                  <Text style={styles.storyNarrative}>{stories[0].narrative}</Text>
                  <View style={styles.storyHighlights}>
                    {stories[0].highlights.map((highlight, i) => (
                      <Chip key={i} mode="flat" style={styles.highlightChip}>
                        {highlight}
                      </Chip>
                    ))}
                  </View>
                </>
              )}
            </GlassCard>
          )}

          {/* Quick Stats Grid */}
          {stats && (
            <GlassCard style={styles.quickStatsCard}>
              <Text style={styles.sectionTitle}>Quick Stats</Text>
              <View style={styles.quickStatsGrid}>
                <View style={styles.quickStatItem}>
                  <Text style={styles.quickStatValue}>{stats.trips.avgDuration}</Text>
                  <Text style={styles.quickStatLabel}>Avg Days/Trip</Text>
                </View>
                <View style={styles.quickStatItem}>
                  <Text style={styles.quickStatValue}>₹{stats.spending.avgPerTrip.toLocaleString()}</Text>
                  <Text style={styles.quickStatLabel}>Avg Cost/Trip</Text>
                </View>
                <View style={styles.quickStatItem}>
                  <Text style={styles.quickStatValue}>{stats.destinations.countries}</Text>
                  <Text style={styles.quickStatLabel}>Countries</Text>
                </View>
                <View style={styles.quickStatItem}>
                  <Text style={styles.quickStatValue}>{stats.engagement.photosUploaded}</Text>
                  <Text style={styles.quickStatLabel}>Photos</Text>
                </View>
              </View>
            </GlassCard>
          )}

          {/* Bottom Padding */}
          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* AI Assistant Modal */}
        <AIAssistantModal
          visible={aiModalVisible}
          onClose={() => setAiModalVisible(false)}
          onQuery={askAI}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
  },
  aiButton: {
    backgroundColor: 'rgba(78, 205, 196, 0.2)',
    borderRadius: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 100,
  },

  // Glass Card
  glassCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: spacing.md,
  },
  blurView: {
    flex: 1,
  },
  glassContent: {
    padding: spacing.md,
  },

  // Personality Card
  personalityCard: {
    marginTop: spacing.sm,
  },
  personalityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  personalityIcon: {
    fontSize: 40,
    marginRight: spacing.md,
  },
  personalityInfo: {
    flex: 1,
  },
  personalityType: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  personalityTagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  personalityDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
  },
  personalityTip: {
    fontSize: 13,
    color: '#4ECDC4',
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },

  // Level Card
  levelCard: {
    marginBottom: spacing.md,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  levelIcon: {
    fontSize: 36,
    marginRight: spacing.sm,
  },
  levelInfo: {
    flex: 1,
  },
  levelTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  levelNumber: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
  xpContainer: {
    alignItems: 'flex-end',
  },
  xpValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#4ECDC4',
  },
  xpLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  progressContainer: {
    marginTop: spacing.xs,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#4ECDC4',
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
    textAlign: 'right',
  },

  // Hero Stats
  heroStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.md,
  },
  heroStatCard: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  heroValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
  },
  heroLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },

  // Streaks
  streakContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.md,
  },
  streakCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  streakIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  streakValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
  },
  streakLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  streakBest: {
    fontSize: 10,
    color: '#4ECDC4',
    marginTop: 2,
  },

  // DNA Chart
  dnaCard: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: spacing.sm,
  },
  dnaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dnaItem: {
    alignItems: 'center',
    width: (SCREEN_WIDTH - 80) / 6,
  },
  dnaBarContainer: {
    width: 8,
    height: 80,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  dnaBar: {
    width: '100%',
    borderRadius: 4,
  },
  dnaValue: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
    marginTop: 4,
  },
  dnaLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
    textAlign: 'center',
  },

  // Insights
  section: {
    marginBottom: spacing.md,
  },
  sectionHeaderText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: spacing.sm,
  },
  insightCard: {
    borderLeftWidth: 3,
    marginBottom: spacing.sm,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  insightIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  insightTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  priorityChip: {
    height: 20,
    paddingHorizontal: 6,
  },
  insightDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
  },
  insightAction: {
    marginTop: spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(78, 205, 196, 0.2)',
    borderRadius: 8,
    alignItems: 'center',
  },
  insightActionLabel: {
    color: '#4ECDC4',
    fontSize: 13,
    fontWeight: '600',
  },

  // Predictions
  predictionsCard: {
    marginBottom: spacing.md,
  },
  predictionsSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: spacing.sm,
  },
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  predictionIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  predictionContent: {
    flex: 1,
  },
  predictionText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  predictionConfidence: {
    fontSize: 11,
    color: '#4ECDC4',
    marginTop: 2,
  },

  // Spending
  spendingCard: {
    marginBottom: spacing.md,
  },
  totalSpent: {
    fontSize: 32,
    fontWeight: '900',
    color: '#4ECDC4',
  },
  totalLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: spacing.md,
  },
  spendingBreakdown: {
    marginBottom: spacing.sm,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  categoryName: {
    width: 60,
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'capitalize',
  },
  categoryBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  categoryBar: {
    height: 6,
    backgroundColor: '#4ECDC4',
    borderRadius: 3,
  },
  categoryBarOver: {
    backgroundColor: '#EF4444',
  },
  categoryAmount: {
    width: 60,
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'right',
  },
  categoryPercent: {
    width: 30,
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'right',
  },
  spendingInsights: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  insightTip: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },

  // Badges
  badgeCard: {
    marginBottom: spacing.md,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badgeItem: {
    width: (SCREEN_WIDTH - 80) / 3,
    alignItems: 'center',
  },
  badgeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  badgeUnlocked: {
    backgroundColor: 'rgba(78, 205, 196, 0.3)',
  },
  badgeLocked: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  badgeEmoji: {
    fontSize: 24,
  },
  badgeEmojiLocked: {
    fontSize: 16,
  },
  badgeName: {
    fontSize: 10,
    color: '#fff',
    textAlign: 'center',
  },
  badgeNameLocked: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },

  // Stories
  storiesCard: {
    marginBottom: spacing.md,
  },
  storyNarrative: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  storyHighlights: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  highlightChip: {
    backgroundColor: 'rgba(78, 205, 196, 0.2)',
  },

  // Quick Stats
  quickStatsCard: {
    marginBottom: spacing.md,
  },
  quickStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickStatItem: {
    width: (SCREEN_WIDTH - 90) / 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: spacing.sm,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  quickStatLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  emptySubtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },

  // Error State
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: spacing.sm,
  },
  errorMessage: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: '#4ECDC4',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 14,
  },

  // Empty State Container
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyStateCard: {
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  emptyStateTip: {
    fontSize: 14,
    color: '#4ECDC4',
    textAlign: 'center',
  },

  // Skeleton
  skeletonContainer: {
    padding: spacing.md,
  },
  skeletonCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  skeletonHeader: {
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    width: '60%',
    marginBottom: spacing.md,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  skeletonBox: {
    flex: 1,
    height: 80,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
  },

  // Modal
  modalContainer: {
    backgroundColor: '#1a1a2e',
    margin: spacing.md,
    borderRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  suggestedQueries: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: spacing.md,
  },
  queryChip: {
    borderColor: 'rgba(78, 205, 196, 0.5)',
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
  },
  queryChipText: {
    color: '#4ECDC4',
    fontSize: 12,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  responseContainer: {
    padding: spacing.md,
    maxHeight: 300,
  },
  responseText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 24,
  },
  followUpContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  followUpTitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: spacing.sm,
  },
  followUpChip: {
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 6,
  },
  followUpChipText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },

  // Bottom padding
  bottomPadding: {
    height: spacing.xxl,
  },
});