/**
 * useTravelIntelligence Hook
 * Main hook for accessing AI Travel Intelligence OS
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { statsService, TravelStats } from '@/services/stats';
import travelIntelligenceEngine from '@/services/travelIntelligenceEngine';
import {
  TravelDNA,
  TravelPersonality,
  AIInsight,
  TravelPrediction,
  FinancialHealth,
  SpendingCategory,
  UserLevel,
  TravelStreak,
  Badge,
  Achievement,
  TravelStory,
  EnhancedTravelStats,
  AIAssistantQuery,
  AIAssistantResponse,
} from '@/types/travelIntelligence';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────────────────
// CACHE KEYS
// ─────────────────────────────────────────────────────────────

const CACHE_KEYS = {
  STATS: '@travel_intelligence_stats',
  DNA: '@travel_intelligence_dna',
  INSIGHTS: '@travel_intelligence_insights',
  LAST_UPDATE: '@travel_intelligence_last_update',
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// ─────────────────────────────────────────────────────────────
// HOOK RETURN TYPE
// ─────────────────────────────────────────────────────────────

interface UseTravelIntelligenceReturn {
  // Core data
  stats: EnhancedTravelStats | null;
  rawStats: TravelStats | null;
  dna: TravelDNA | null;
  personality: TravelPersonality | null;
  
  // Insights
  insights: AIInsight[];
  predictions: TravelPrediction[];
  
  // Financial
  financialHealth: FinancialHealth | null;
  spendingCategories: SpendingCategory[];
  
  // Gamification
  level: UserLevel | null;
  streaks: TravelStreak[];
  badges: Badge[];
  achievements: Achievement[];
  
  // Stories
  stories: TravelStory[];
  
  // Actions
  refresh: () => Promise<void>;
  dismissInsight: (id: string) => void;
  askAI: (query: string) => Promise<AIAssistantResponse>;
  
  // State
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  hasData: boolean;
}

// ─────────────────────────────────────────────────────────────
// MAIN HOOK
// ─────────────────────────────────────────────────────────────

export function useTravelIntelligence(): UseTravelIntelligenceReturn {
  // Raw data
  const [rawStats, setRawStats] = useState<TravelStats | null>(null);
  
  // Computed data
  const [stats, setStats] = useState<EnhancedTravelStats | null>(null);
  const [dna, setDNA] = useState<TravelDNA | null>(null);
  const [personality, setPersonality] = useState<TravelPersonality | null>(null);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [predictions, setPredictions] = useState<TravelPrediction[]>([]);
  const [financialHealth, setFinancialHealth] = useState<FinancialHealth | null>(null);
  const [spendingCategories, setSpendingCategories] = useState<SpendingCategory[]>([]);
  const [level, setLevel] = useState<UserLevel | null>(null);
  const [streaks, setStreaks] = useState<TravelStreak[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stories, setStories] = useState<TravelStory[]>([]);
  
  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ───────────────────────────────────────────────────────────
  // COMPUTE ALL INTELLIGENCE
  // ───────────────────────────────────────────────────────────

  const computeIntelligence = useCallback((statsData: TravelStats) => {
    // Compute Travel DNA
    const travelDNA = travelIntelligenceEngine.computeTravelDNA(statsData);
    setDNA(travelDNA);

    // Determine Personality
    const travelPersonality = travelIntelligenceEngine.determinePersonality(travelDNA);
    setPersonality(travelPersonality);

    // Generate Insights
    const travelInsights = travelIntelligenceEngine.generateInsights(statsData, travelDNA);
    setInsights(travelInsights);

    // Generate Predictions
    const travelPredictions = travelIntelligenceEngine.generatePredictions(statsData, travelDNA);
    setPredictions(travelPredictions);

    // Compute Financial Health
    const financial = travelIntelligenceEngine.computeFinancialHealth(statsData);
    setFinancialHealth(financial);

    // Compute Spending Categories
    const categories = travelIntelligenceEngine.computeSpendingCategories(statsData);
    setSpendingCategories(categories);

    // Compute Achievements
    const earnedAchievements = travelIntelligenceEngine.computeAchievements(statsData);
    setAchievements(earnedAchievements);

    // Compute XP and Level
    const totalXP = travelIntelligenceEngine.calculateTotalXP(statsData, earnedAchievements);
    const userLevel = travelIntelligenceEngine.computeUserLevel(totalXP);
    setLevel(userLevel);

    // Compute Streaks
    const travelStreaks = travelIntelligenceEngine.computeStreaks(statsData);
    setStreaks(travelStreaks);

    // Compute Badges
    const userBadges = travelIntelligenceEngine.computeBadges(statsData);
    setBadges(userBadges);

    // Generate Stories
    const travelStories = travelIntelligenceEngine.generateStories(statsData);
    setStories(travelStories);

    // Compute Enhanced Stats
    const enhancedStats = travelIntelligenceEngine.computeEnhancedStats(statsData);
    setStats(enhancedStats);
  }, []);

  // ───────────────────────────────────────────────────────────
  // LOAD DATA
  // ───────────────────────────────────────────────────────────

  const loadData = useCallback(async (useCache = true) => {
    try {
      setError(null);

      // Check cache
      if (useCache) {
        const lastUpdate = await AsyncStorage.getItem(CACHE_KEYS.LAST_UPDATE);
        if (lastUpdate) {
          const timeSinceUpdate = Date.now() - parseInt(lastUpdate, 10);
          if (timeSinceUpdate < CACHE_DURATION) {
            // Load from cache
            const cachedStats = await AsyncStorage.getItem(CACHE_KEYS.STATS);
            if (cachedStats) {
              const parsedStats = JSON.parse(cachedStats);
              setRawStats(parsedStats);
              computeIntelligence(parsedStats);
              setIsLoading(false);
              return;
            }
          }
        }
      }

      // Fetch from API
      const response = await statsService.getStats();
      
      if (response.stats) {
        setRawStats(response.stats);
        computeIntelligence(response.stats);

        // Cache the data
        await AsyncStorage.setItem(CACHE_KEYS.STATS, JSON.stringify(response.stats));
        await AsyncStorage.setItem(CACHE_KEYS.LAST_UPDATE, Date.now().toString());
      }
    } catch (err: any) {
      console.error('Failed to load travel intelligence:', err);
      setError(err.message || 'Failed to load travel data');
      
      // Try to load from cache on error
      try {
        const cachedStats = await AsyncStorage.getItem(CACHE_KEYS.STATS);
        if (cachedStats) {
          const parsedStats = JSON.parse(cachedStats);
          setRawStats(parsedStats);
          computeIntelligence(parsedStats);
        }
      } catch (cacheError) {
        // Ignore cache errors
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [computeIntelligence]);

  // ───────────────────────────────────────────────────────────
  // REFRESH
  // ───────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData(false);
  }, [loadData]);

  // ───────────────────────────────────────────────────────────
  // DISMISS INSIGHT
  // ───────────────────────────────────────────────────────────

  const dismissInsight = useCallback((id: string) => {
    setInsights(prev => prev.filter(insight => insight.id !== id));
  }, []);

  // ───────────────────────────────────────────────────────────
  // AI ASSISTANT
  // ───────────────────────────────────────────────────────────

  const askAI = useCallback(async (query: string): Promise<AIAssistantResponse> => {
    // Determine query type
    let queryType: AIAssistantQuery['type'] = 'insight';
    
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes('next') || lowerQuery.includes('predict')) {
      queryType = 'prediction';
    } else if (lowerQuery.includes('recommend') || lowerQuery.includes('suggest')) {
      queryType = 'recommendation';
    } else if (lowerQuery.includes('compare') || lowerQuery.includes('versus')) {
      queryType = 'comparison';
    }

    // Generate contextual response
    const response = generateAIResponse(query, queryType, {
      stats,
      dna,
      personality,
      insights,
      predictions,
      financialHealth,
      level,
    });

    return response;
  }, [stats, dna, personality, insights, predictions, financialHealth, level]);

  // ───────────────────────────────────────────────────────────
  // INITIAL LOAD
  // ───────────────────────────────────────────────────────────

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ───────────────────────────────────────────────────────────
  // MEMOIZED VALUES
  // ───────────────────────────────────────────────────────────

  const hasData = useMemo(() => rawStats !== null && rawStats.trips.total > 0, [rawStats]);

  return {
    // Core data
    stats,
    rawStats,
    dna,
    personality,
    
    // Insights
    insights,
    predictions,
    
    // Financial
    financialHealth,
    spendingCategories,
    
    // Gamification
    level,
    streaks,
    badges,
    achievements,
    
    // Stories
    stories,
    
    // Actions
    refresh,
    dismissInsight,
    askAI,
    
    // State
    isLoading,
    isRefreshing,
    error,
    hasData,
  };
}

// ─────────────────────────────────────────────────────────────
// AI RESPONSE GENERATOR
// ─────────────────────────────────────────────────────────────

function generateAIResponse(
  query: string,
  type: AIAssistantQuery['type'],
  context: any
): AIAssistantResponse {
  const { stats, dna, personality, insights, predictions, financialHealth, level } = context;
  
  let response = '';
  const insights_response: AIInsight[] = [];
  const followUpQuestions: string[] = [];

  switch (type) {
    case 'prediction':
      if (predictions && predictions.length > 0) {
        const nextTrip = predictions.find((p: TravelPrediction) => p.type === 'next_trip');
        const destination = predictions.find((p: TravelPrediction) => p.type === 'destination');
        
        response = `Based on your travel patterns:\n\n`;
        
        if (nextTrip) {
          response += `🗓️ **Next Trip**: ${nextTrip.prediction}\n`;
          response += `   Confidence: ${Math.round(nextTrip.confidence * 100)}%\n\n`;
        }
        
        if (destination) {
          response += `📍 **Likely Destination**: ${destination.prediction}\n\n`;
        }
        
        if (financialHealth) {
          response += `💰 **Budget Forecast**: Expect to spend around ₹${Math.round(financialHealth.avgTripCost).toLocaleString()} per trip.`;
        }
      } else {
        response = "I don't have enough travel history yet to make predictions. Keep traveling and I'll learn your patterns!";
      }
      
      followUpQuestions.push('How can I optimize my travel budget?');
      followUpQuestions.push('What destinations suit my travel style?');
      break;

    case 'recommendation':
      if (personality && dna) {
        response = `As **${personality.type}**, here are my recommendations:\n\n`;
        response += `${personality.icon} **Your Style**: ${personality.tagline}\n\n`;
        response += `**Personalized Tips:**\n`;
        personality.tips.forEach((tip: string) => {
          response += `• ${tip}\n`;
        });
        
        if (dna.adventure > 60) {
          response += `\n🏔️ **Adventure Suggestion**: Try Rishikesh for river rafting or Spiti Valley for a rugged experience!`;
        }
        
        if (dna.foodie > 60) {
          response += `\n🍜 **Foodie Suggestion**: Explore Amritsar's food scene or Pondicherry's French cuisine!`;
        }
        
        if (dna.relax > 60) {
          response += `\n🧘 **Wellness Suggestion**: Consider a yoga retreat in Rishikesh or a beach getaway in Gokarna!`;
        }
      }
      
      followUpQuestions.push('Where should I travel next?');
      followUpQuestions.push('What is my travel personality?');
      break;

    case 'comparison':
      if (stats) {
        response = `Here's how you compare:\n\n`;
        response += `📊 **vs Average Traveler**:\n`;
        response += `• Trips: ${stats.comparisons.vsAverageUser.trips > 0 ? '+' : ''}${stats.comparisons.vsAverageUser.trips}%\n`;
        response += `• Destinations: ${stats.comparisons.vsAverageUser.destinations > 0 ? '+' : ''}${stats.comparisons.vsAverageUser.destinations}%\n\n`;
        
        response += `📈 **vs Last Year**:\n`;
        response += `• Trips: ${stats.comparisons.vsLastYear.trips > 0 ? '+' : ''}${stats.comparisons.vsLastYear.trips}%\n`;
        response += `• Spending: ${stats.comparisons.vsLastYear.spending > 0 ? '+' : ''}${stats.comparisons.vsLastYear.spending}%\n`;
      }
      
      followUpQuestions.push('How can I travel more efficiently?');
      followUpQuestions.push('What are my travel strengths?');
      break;

    default:
      if (insights && insights.length > 0) {
        response = `Here are your key travel insights:\n\n`;
        insights.slice(0, 3).forEach((insight: AIInsight) => {
          response += `${insight.icon} **${insight.title}**\n${insight.description}\n\n`;
        });
      }
      
      if (level) {
        response += `\n⭐ **Your Level**: ${level.icon} ${level.title} (Level ${level.level})`;
      }
      
      followUpQuestions.push('What is my travel DNA?');
      followUpQuestions.push('Predict my next trip');
      followUpQuestions.push('How can I save on travel?');
  }

  return {
    query,
    response,
    insights: insights_response,
    followUpQuestions,
  };
}

// ─────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────

export default useTravelIntelligence;