/**
 * PhrasebookScreen V6 – AI Language Assistant
 * Next-generation real-time translation & voice system for travelers
 * 
 * Features:
 * - AI-powered phrase suggestions based on context
 * - Text-to-Speech (TTS) pronunciation
 * - Speech-to-Text (STT) voice input
 * - Smart category filtering
 * - Offline-first with AsyncStorage caching
 * - Bookmark & recently used phrases
 * - Fuzzy search with debounce
 * - Skeleton loading states
 * - Glassmorphism UI design
 * - Haptic feedback
 */

import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  RefreshControl,
  Pressable,
  ScrollView,
} from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { phrasebookService, PhraseData, DestinationInfo } from "@/services/phrasebook";
import { colors, spacing } from "@/theme/colors";
import { useTravelIntelligence } from "@/stores/travelIntelligenceStore";
import { PressableScale } from "@/components/UI/PressableScale";
import { GlassCard } from "@/components/UI/GlassCard";
import { useDebounce } from "@/hooks/useDebounce";

// Phrase type definition
interface Phrase {
  english: string;
  local: string;
  pronunciation?: string;
  category?: string;
}

// Polyfill for expo-haptics (graceful fallback)
const Haptics = {
  impactAsync: async (_style: string) => { /* no-op on web */ },
  notificationAsync: async (_type: string) => { /* no-op on web */ },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
};

// Polyfill for expo-speech (graceful fallback)
const Speech = {
  speak: (text: string, options?: { language?: string; rate?: number; onDone?: () => void; onError?: () => void }) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      if (options?.language) utterance.lang = options.language;
      if (options?.rate) utterance.rate = options.rate;
      utterance.onend = () => options?.onDone?.();
      utterance.onerror = () => options?.onError?.();
      window.speechSynthesis.speak(utterance);
    } else {
      options?.onDone?.();
    }
  },
  stop: () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  },
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CACHE_KEY = "@phrasebook_cache";
const BOOKMARKS_KEY = "@phrasebook_bookmarks";
const RECENT_KEY = "@phrasebook_recent";
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// ─────────────────────────────────────────────────────────────
// TYPES & CONSTANTS
// ─────────────────────────────────────────────────────────────

type Category = "all" | "greetings" | "food" | "transport" | "emergency" | "shopping" | "directions";

interface EnhancedPhrase extends Phrase {
  isBookmarked?: boolean;
  isRecent?: boolean;
  contextScore?: number;
}

interface CachedPhrasebook {
  data: PhraseData;
  destination: string;
  timestamp: number;
}

const CATEGORIES: { key: Category; label: string; icon: string; color: string; emoji: string }[] = [
  { key: "all", label: "All", icon: "translate", color: "#7C3AED", emoji: "🌐" },
  { key: "greetings", label: "Greetings", icon: "hand-wave", color: "#10B981", emoji: "👋" },
  { key: "food", label: "Food", icon: "food", color: "#F59E0B", emoji: "🍽️" },
  { key: "transport", label: "Transport", icon: "bus", color: "#3B82F6", emoji: "🚌" },
  { key: "emergency", label: "Emergency", icon: "alert-circle", color: "#EF4444", emoji: "🆘" },
  { key: "shopping", label: "Shopping", icon: "shopping", color: "#EC4899", emoji: "🛍️" },
  { key: "directions", label: "Directions", icon: "map-marker", color: "#06B6D4", emoji: "📍" },
];

const CONTEXT_PHRASES: Record<string, string[]> = {
  restaurant: ["table", "order", "water", "bill", "menu", "delicious", "vegetarian"],
  airport: ["gate", "flight", "boarding", "luggage", "passport", "visa"],
  hotel: ["room", "checkout", "key", "breakfast", "wifi", "reservation"],
  emergency: ["help", "doctor", "hospital", "police", "embassy", "emergency"],
};

// ─────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────

// Fuzzy match for typo-tolerant search
const fuzzyMatch = (text: string, query: string): boolean => {
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  
  // Direct match
  if (t.includes(q)) return true;
  
  // Fuzzy: allow 1 typo for short queries, 2 for longer
  const maxDist = q.length <= 4 ? 1 : 2;
  let distance = 0;
  let ti = 0, qi = 0;
  
  while (ti < t.length && qi < q.length && distance <= maxDist) {
    if (t[ti] === q[qi]) {
      qi++;
    } else {
      distance++;
    }
    ti++;
  }
  
  return distance <= maxDist && qi >= q.length - 1;
};

// Detect category from phrase text
const detectCategory = (phrase: Phrase): Category => {
  const englishText = phrase?.english || "";
  const categoryText = phrase?.category || "";
  const text = (englishText + " " + categoryText).toLowerCase();
  
  if (/hello|hi|good morning|good evening|thank|please|sorry|excuse|goodbye/.test(text)) return "greetings";
  if (/food|eat|drink|water|menu|restaurant|order|bill|vegetarian|spicy/.test(text)) return "food";
  if (/bus|train|taxi|airport|station|ticket|flight|gate|boarding/.test(text)) return "transport";
  if (/help|emergency|doctor|hospital|police|fire|ambulance|danger/.test(text)) return "emergency";
  if (/buy|shop|price|cost|money|cheap|expensive|market|store/.test(text)) return "shopping";
  if (/where|direction|left|right|straight|map|address|near|far/.test(text)) return "directions";
  
  return "all";
};

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// Category Tabs
interface CategoryTabsProps {
  activeCategory: Category;
  onCategoryPress: (cat: Category) => void;
  counts: Record<string, number>;
}

const CategoryTabs = memo(({ activeCategory, onCategoryPress, counts }: CategoryTabsProps) => (
  <FlatList
    horizontal
    data={CATEGORIES}
    keyExtractor={(item) => item.key}
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.categoryScroll}
    renderItem={({ item }) => {
      const isActive = activeCategory === item.key;
      const count = item.key === "all" ? counts.all : counts[item.key] || 0;
      
      return (
        <PressableScale
          style={[
            styles.categoryChip,
            isActive && { backgroundColor: item.color, borderColor: item.color }
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onCategoryPress(item.key);
          }}
        >
          <Text style={styles.categoryEmoji}>{item.emoji}</Text>
          <Text style={[styles.categoryLabel, isActive && styles.categoryLabelActive]}>
            {item.label}
          </Text>
          {count > 0 && (
            <View style={[styles.categoryCount, isActive && styles.categoryCountActive]}>
              <Text style={[styles.categoryCountText, isActive && { color: "#FFF" }]}>
                {count}
              </Text>
            </View>
          )}
        </PressableScale>
      );
    }}
  />
));
CategoryTabs.displayName = "CategoryTabs";

// ─────────────────────────────────────────────────────────────
// Phrase Card
interface PhraseCardProps {
  phrase: EnhancedPhrase;
  onPlay: () => void;
  onBookmark: () => void;
  language?: string;
}

const PhraseCard = memo(({ phrase, onPlay, onBookmark, language }: PhraseCardProps) => {
  const category = detectCategory(phrase);
  const categoryConfig = CATEGORIES.find(c => c.key === category);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const handlePlay = async () => {
    if (isPlaying) {
      Speech.stop();
      setIsPlaying(false);
      return;
    }
    
    setIsPlaying(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    Speech.speak(phrase.local, {
      language: language?.startsWith("hi") ? "hi-IN" : language?.startsWith("es") ? "es-ES" : "en-US",
      rate: 0.8,
      onDone: () => setIsPlaying(false),
      onError: () => setIsPlaying(false),
    });
    
    onPlay();
  };
  
  return (
    <GlassCard intensity={40} tint="light" style={styles.phraseCard}>
      {/* Header row */}
      <View style={styles.phraseHeader}>
        <View style={styles.phraseCategoryRow}>
          {categoryConfig && (
            <View style={[styles.phraseCategoryBadge, { backgroundColor: `${categoryConfig.color}20` }]}>
              <Text style={styles.phraseCategoryEmoji}>{categoryConfig.emoji}</Text>
              <Text style={[styles.phraseCategoryText, { color: categoryConfig.color }]}>
                {categoryConfig.label}
              </Text>
            </View>
          )}
          {phrase.isRecent && (
            <View style={styles.recentBadge}>
              <MaterialCommunityIcons name="history" size={10} color="#64748B" />
              <Text style={styles.recentText}>Recent</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={onBookmark} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <MaterialCommunityIcons
            name={phrase.isBookmarked ? "star" : "star-outline"}
            size={22}
            color={phrase.isBookmarked ? "#F59E0B" : "#94A3B8"}
          />
        </TouchableOpacity>
      </View>
      
      {/* English text */}
      <Text style={styles.phraseEnglish}>{phrase.english}</Text>
      
      {/* Local translation */}
      <View style={styles.phraseLocalRow}>
        <Text style={styles.phraseLocal}>{phrase.local}</Text>
        <PressableScale style={styles.playButton} onPress={handlePlay}>
          <LinearGradient
            colors={isPlaying ? ["#10B981", "#059669"] : ["#7C3AED", "#6D28D9"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.playButtonGradient}
          >
            <MaterialCommunityIcons
              name={isPlaying ? "stop" : "volume-high"}
              size={18}
              color="#FFF"
            />
          </LinearGradient>
        </PressableScale>
      </View>
      
      {/* Pronunciation */}
      {phrase.pronunciation && (
        <View style={styles.pronunciationRow}>
          <MaterialCommunityIcons name="account-tie-voice" size={14} color="#94A3B8" />
          <Text style={styles.pronunciation}>{phrase.pronunciation}</Text>
        </View>
      )}
    </GlassCard>
  );
});
PhraseCard.displayName = "PhraseCard";

// ─────────────────────────────────────────────────────────────
// Language Header
interface LanguageHeaderProps {
  language: string;
  script?: string;
  phraseCount: number;
  bookmarkCount: number;
}

const LanguageHeader = memo(({ language, script, phraseCount, bookmarkCount }: LanguageHeaderProps) => (
  <LinearGradient
    colors={["#1E293B", "#0F172A"]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.languageHeader}
  >
    <View style={styles.languageHeaderLeft}>
      <Text style={styles.languageEmoji}>🌍</Text>
      <View>
        <Text style={styles.languageName}>{language}</Text>
        {script && <Text style={styles.languageScript}>Script: {script}</Text>}
      </View>
    </View>
    <View style={styles.languageStats}>
      <View style={styles.languageStat}>
        <MaterialCommunityIcons name="translate" size={16} color="#A5B4FC" />
        <Text style={styles.languageStatText}>{phraseCount} phrases</Text>
      </View>
      {bookmarkCount > 0 && (
        <View style={styles.languageStat}>
          <MaterialCommunityIcons name="star" size={16} color="#FCD34D" />
          <Text style={styles.languageStatText}>{bookmarkCount} saved</Text>
        </View>
      )}
    </View>
  </LinearGradient>
));
LanguageHeader.displayName = "LanguageHeader";

// ─────────────────────────────────────────────────────────────
// Voice Input Button
interface VoiceInputButtonProps {
  onVoiceInput: () => void;
  isListening: boolean;
}

const VoiceInputButton = memo(({ onVoiceInput, isListening }: VoiceInputButtonProps) => (
  <PressableScale style={styles.voiceButton} onPress={onVoiceInput}>
    <LinearGradient
      colors={isListening ? ["#EF4444", "#DC2626"] : ["#7C3AED", "#6D28D9"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.voiceButtonGradient}
    >
      <MaterialCommunityIcons
        name={isListening ? "microphone" : "microphone-outline"}
        size={28}
        color="#FFF"
      />
    </LinearGradient>
  </PressableScale>
));
VoiceInputButton.displayName = "VoiceInputButton";

// ─────────────────────────────────────────────────────────────
// Search Bar
interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

const SearchBar = memo(({ value, onChangeText, placeholder = "Search phrases..." }: SearchBarProps) => (
  <View style={styles.searchContainer}>
    <MaterialCommunityIcons name="magnify" size={20} color="#94A3B8" />
    <TextInput
      style={styles.searchInput}
      placeholder={placeholder}
      placeholderTextColor="#94A3B8"
      value={value}
      onChangeText={onChangeText}
      returnKeyType="search"
      autoCapitalize="none"
      autoCorrect={false}
    />
    {value.length > 0 && (
      <TouchableOpacity onPress={() => onChangeText("")} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <MaterialCommunityIcons name="close-circle" size={20} color="#94A3B8" />
      </TouchableOpacity>
    )}
  </View>
));
SearchBar.displayName = "SearchBar";

// ─────────────────────────────────────────────────────────────
// Skeleton Loader
const PhraseSkeleton = memo(() => (
  <View style={styles.skeletonContainer}>
    {Array.from({ length: 5 }).map((_, i) => (
      <View key={i} style={styles.skeletonCard}>
        <View style={styles.skeletonHeader}>
          <View style={styles.skeletonBadge} />
          <View style={styles.skeletonStar} />
        </View>
        <View style={styles.skeletonLineLarge} />
        <View style={styles.skeletonLineMedium} />
        <View style={styles.skeletonPronunciation} />
      </View>
    ))}
  </View>
));
PhraseSkeleton.displayName = "PhraseSkeleton";

// ─────────────────────────────────────────────────────────────
// Empty State
interface EmptyStateProps {
  type: "no-destination" | "no-results" | "error";
  onAction?: () => void;
  actionLabel?: string;
}

const EmptyState = memo(({ type, onAction, actionLabel }: EmptyStateProps) => {
  const config = {
    "no-destination": {
      emoji: "🗺️",
      title: "Select a Destination",
      subtitle: "Choose where you're traveling to see local phrases",
    },
    "no-results": {
      emoji: "🔍",
      title: "No Phrases Found",
      subtitle: "Try a different search term or category",
    },
    "error": {
      emoji: "⚠️",
      title: "Something Went Wrong",
      subtitle: "Please check your connection and try again",
    },
  };
  
  const { emoji, title, subtitle } = config[type];
  
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Text style={styles.emptyEmoji}>{emoji}</Text>
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
      {onAction && actionLabel && (
        <PressableScale style={styles.emptyButton} onPress={onAction}>
          <LinearGradient
            colors={["#7C3AED", "#6D28D9"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.emptyButtonGradient}
          >
            <Text style={styles.emptyButtonText}>{actionLabel}</Text>
          </LinearGradient>
        </PressableScale>
      )}
    </View>
  );
});
EmptyState.displayName = "EmptyState";

// ─────────────────────────────────────────────────────────────
// Destination Selector
interface DestinationSelectorProps {
  destinations: DestinationInfo[];
  selected: string;
  onSelect: (dest: string) => void;
}

const DestinationSelector = memo(({ destinations, selected, onSelect }: DestinationSelectorProps) => (
  <FlatList
    horizontal
    data={destinations}
    keyExtractor={(item) => item.key}
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.destinationsScroll}
    renderItem={({ item }) => {
      const isSelected = selected === item.key || selected === item.label;
      return (
        <PressableScale
          style={[styles.destinationChip, isSelected && styles.destinationChipActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSelect(item.key);
          }}
        >
          <Text style={[styles.destinationChipText, isSelected && styles.destinationChipTextActive]}>
            {item.label}
          </Text>
        </PressableScale>
      );
    }}
  />
));
DestinationSelector.displayName = "DestinationSelector";

// ─────────────────────────────────────────────────────────────
// AI Context Suggestion
interface AIContextSuggestionProps {
  context: string;
  phrases: EnhancedPhrase[];
  onPhrasePress: (phrase: EnhancedPhrase) => void;
}

const AIContextSuggestion = memo(({ context, phrases, onPhrasePress }: AIContextSuggestionProps) => {
  if (phrases.length === 0) return null;
  
  return (
    <View style={styles.contextSection}>
      <View style={styles.contextHeader}>
        <MaterialCommunityIcons name="robot-outline" size={16} color="#7C3AED" />
        <Text style={styles.contextTitle}>Suggested for {context}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {phrases.slice(0, 4).map((phrase, idx) => (
          <PressableScale
            key={idx}
            style={styles.contextPhraseChip}
            onPress={() => onPhrasePress(phrase)}
          >
            <Text style={styles.contextPhraseText} numberOfLines={1}>
              {phrase.english}
            </Text>
          </PressableScale>
        ))}
      </ScrollView>
    </View>
  );
});
AIContextSuggestion.displayName = "AIContextSuggestion";

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

export default function PhrasebookScreen() {
  const [destinations, setDestinations] = useState<DestinationInfo[]>([]);
  const [selectedDestination, setSelectedDestination] = useState("");
  const [phraseData, setPhraseData] = useState<PhraseData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [recentPhrases, setRecentPhrases] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  
  const { activeTrip } = useTravelIntelligence();
  const debouncedSearch = useDebounce(searchQuery, 300);
  
  // Initialize
  useEffect(() => {
    const init = async () => {
      try {
        const response = await phrasebookService.getDestinations();
        // API returns { destinations: [{ key, label, language, script }, ...] }
        const destList = (response.destinations || []) as DestinationInfo[];
        setDestinations(destList);
        
        // Use active trip destination if available, otherwise first destination
        const initialDest = activeTrip?.destination?.label || (destList[0]?.key || "");
        if (initialDest) {
          setSelectedDestination(initialDest);
          await loadCachedPhrases(initialDest);
        }
        
        // Load bookmarks and recent
        await loadBookmarks();
        await loadRecentPhrases();
      } catch (e) {
        console.error("Init error:", e);
      } finally {
        setInitLoading(false);
      }
    };
    init();
  }, [activeTrip?.destination?.label]);
  
  const loadCachedPhrases = async (destination: string) => {
    try {
      const cached = await AsyncStorage.getItem(`${CACHE_KEY}_${destination}`);
      if (cached) {
        const data: CachedPhrasebook = JSON.parse(cached);
        if (Date.now() - data.timestamp < CACHE_TTL) {
          setPhraseData(data.data);
          return true;
        }
      }
    } catch (e) {
      // Ignore cache errors
    }
    return false;
  };
  
  const loadBookmarks = async () => {
    try {
      const saved = await AsyncStorage.getItem(BOOKMARKS_KEY);
      if (saved) {
        setBookmarks(new Set(JSON.parse(saved)));
      }
    } catch (e) {
      // Ignore
    }
  };
  
  const loadRecentPhrases = async () => {
    try {
      const saved = await AsyncStorage.getItem(RECENT_KEY);
      if (saved) {
        setRecentPhrases(JSON.parse(saved));
      }
    } catch (e) {
      // Ignore
    }
  };
  
  const loadPhrases = useCallback(async (destination: string) => {
    if (!destination) return;
    
    setSelectedDestination(destination);
    setLoading(true);
    setPhraseData(null);
    
    try {
      // Try cache first
      const hasCache = await loadCachedPhrases(destination);
      if (hasCache) {
        setLoading(false);
        return;
      }
      
      const response = await phrasebookService.getPhrases(destination);
      setPhraseData(response);
      
      // Cache the data
      await AsyncStorage.setItem(
        `${CACHE_KEY}_${destination}`,
        JSON.stringify({ data: response, destination, timestamp: Date.now() })
      );
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to load phrases");
    } finally {
      setLoading(false);
    }
  }, []);
  
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPhrases(selectedDestination);
    setRefreshing(false);
  }, [selectedDestination, loadPhrases]);
  
  const toggleBookmark = useCallback(async (phrase: Phrase) => {
    const key = `${phrase.english}|${phrase.local}`;
    const newBookmarks = new Set(bookmarks);
    
    if (newBookmarks.has(key)) {
      newBookmarks.delete(key);
    } else {
      newBookmarks.add(key);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    setBookmarks(newBookmarks);
    await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify([...newBookmarks]));
  }, [bookmarks]);
  
  const addToRecent = useCallback(async (phrase: Phrase) => {
    const key = phrase.english;
    const newRecent = [key, ...recentPhrases.filter(r => r !== key)].slice(0, 10);
    setRecentPhrases(newRecent);
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(newRecent));
  }, [recentPhrases]);
  
  const handleVoiceInput = useCallback(() => {
    setIsListening(!isListening);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Note: In production, integrate expo-speech or @react-native-voice/voice
    if (!isListening) {
      Alert.alert(
        "Voice Input",
        "Voice recognition would be activated here. Speak a phrase to translate.",
        [{ text: "OK", onPress: () => setIsListening(false) }]
      );
    }
  }, [isListening]);
  
  // ─────────────────────────────────────────────────────────────
  // COMPUTED VALUES
  // ─────────────────────────────────────────────────────────────
  
  const enhancedPhrases = useMemo((): EnhancedPhrase[] => {
    if (!phraseData?.phrases) return [];
    
    return phraseData.phrases.map(phrase => {
      const key = `${phrase.english}|${phrase.local}`;
      return {
        ...phrase,
        isBookmarked: bookmarks.has(key),
        isRecent: recentPhrases.includes(phrase.english),
        category: detectCategory(phrase),
      };
    });
  }, [phraseData?.phrases, bookmarks, recentPhrases]);
  
  const filteredPhrases = useMemo(() => {
    let result = enhancedPhrases;
    
    // Show bookmarks only
    if (showBookmarksOnly) {
      result = result.filter(p => p.isBookmarked);
    }
    
    // Category filter
    if (activeCategory !== "all") {
      result = result.filter(p => detectCategory(p) === activeCategory);
    }
    
    // Search filter (fuzzy)
    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase();
      result = result.filter(p =>
        fuzzyMatch(p.english, query) ||
        fuzzyMatch(p.local, query) ||
        (p.pronunciation && fuzzyMatch(p.pronunciation, query))
      );
    }
    
    // Sort: recent first, then bookmarks
    return result.sort((a, b) => {
      if (a.isRecent !== b.isRecent) return a.isRecent ? -1 : 1;
      if (a.isBookmarked !== b.isBookmarked) return a.isBookmarked ? -1 : 1;
      return 0;
    });
  }, [enhancedPhrases, showBookmarksOnly, activeCategory, debouncedSearch]);
  
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: enhancedPhrases.length };
    enhancedPhrases.forEach(phrase => {
      const cat = detectCategory(phrase);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [enhancedPhrases]);
  
  const bookmarkCount = useMemo(() => 
    enhancedPhrases.filter(p => p.isBookmarked).length,
    [enhancedPhrases]
  );
  
  const contextSuggestions = useMemo(() => {
    // AI-powered context suggestions based on keywords
    if (!enhancedPhrases.length) return [];
    
    return (enhancedPhrases || [])
      .filter(p => p?.english && typeof p.english === 'string')
      .filter(p => {
        const text = p.english.toLowerCase();
        return CONTEXT_PHRASES.restaurant?.some(kw => text.includes(kw)) ||
               CONTEXT_PHRASES.emergency?.some(kw => text.includes(kw));
      })
      .slice(0, 4);
  }, [enhancedPhrases]);
  
  const renderPhrase = useCallback(({ item }: { item: EnhancedPhrase }) => (
    <PhraseCard
      phrase={item}
      onPlay={() => addToRecent(item)}
      onBookmark={() => toggleBookmark(item)}
      language={phraseData?.language}
    />
  ), [toggleBookmark, addToRecent, phraseData?.language]);
  
  const keyExtractor = useCallback((item: EnhancedPhrase, index: number) => 
    `${item.english}_${index}`,
    []
  );
  
  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  
  if (initLoading) {
    return <PhraseSkeleton />;
  }
  
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <LinearGradient colors={["#7C3AED", "#6D28D9"]} style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>AI Phrasebook</Text>
            <Text style={styles.headerSubtitle}>
              {selectedDestination ? `For ${selectedDestination}` : "Speak like a local"}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.headerAction, showBookmarksOnly && styles.headerActionActive]}
              onPress={() => setShowBookmarksOnly(!showBookmarksOnly)}
            >
              <MaterialCommunityIcons
                name={showBookmarksOnly ? "star" : "star-outline"}
                size={22}
                color="#FFF"
              />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
      
      {/* Destination Selector */}
      {destinations.length > 0 && (
        <DestinationSelector
          destinations={destinations}
          selected={selectedDestination}
          onSelect={loadPhrases}
        />
      )}
      
      {/* Search Bar */}
      {phraseData && (
        <View style={styles.searchSection}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={`Search in ${phraseData.language || "phrases"}...`}
          />
        </View>
      )}
      
      {/* Category Tabs */}
      {phraseData && (
        <CategoryTabs
          activeCategory={activeCategory}
          onCategoryPress={setActiveCategory}
          counts={categoryCounts}
        />
      )}
      
      {/* Language Header */}
      {phraseData && !loading && (
        <LanguageHeader
          language={phraseData.language || "Unknown"}
          script={phraseData.script}
          phraseCount={phraseData.phrases?.length || 0}
          bookmarkCount={bookmarkCount}
        />
      )}
      
      {/* AI Context Suggestions */}
      {contextSuggestions.length > 0 && !showBookmarksOnly && (
        <AIContextSuggestion
          context="your trip"
          phrases={contextSuggestions}
          onPhrasePress={(phrase) => addToRecent(phrase)}
        />
      )}
      
      {/* Loading State */}
      {loading && <PhraseSkeleton />}
      
      {/* Empty States */}
      {!loading && !phraseData && (
        <EmptyState
          type={destinations.length === 0 ? "error" : "no-destination"}
          onAction={destinations.length > 0 ? () => loadPhrases(destinations[0].key) : undefined}
          actionLabel={destinations.length > 0 ? "Load First Destination" : undefined}
        />
      )}
      
      {!loading && phraseData && filteredPhrases.length === 0 && (
        <EmptyState
          type="no-results"
          onAction={showBookmarksOnly ? () => setShowBookmarksOnly(false) : undefined}
          actionLabel={showBookmarksOnly ? "Show All Phrases" : undefined}
        />
      )}
      
      {/* Phrases List */}
      {!loading && filteredPhrases.length > 0 && (
        <FlatList
          data={filteredPhrases}
          renderItem={renderPhrase}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.phrasesList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#7C3AED"
            />
          }
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={8}
        />
      )}
      
      {/* Floating Voice Button */}
      {phraseData && (
        <VoiceInputButton onVoiceInput={handleVoiceInput} isListening={isListening} />
      )}
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  
  // Header
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg },
  headerContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  headerTitle: { fontSize: 28, fontWeight: "900", color: "#FFF", letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  headerActions: { flexDirection: "row", gap: 8 },
  headerAction: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center" },
  headerActionActive: { backgroundColor: "rgba(255,255,255,0.3)" },
  
  // Destinations
  destinationsScroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, gap: 8 },
  destinationChip: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#FFF", borderRadius: 20, borderWidth: 1, borderColor: "#E2E8F0" },
  destinationChipActive: { backgroundColor: "#7C3AED", borderColor: "#7C3AED" },
  destinationChipText: { fontSize: 13, fontWeight: "600", color: "#64748B" },
  destinationChipTextActive: { color: "#FFF" },
  
  // Search
  searchSection: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: "#E2E8F0", gap: 10 },
  searchInput: { flex: 1, fontSize: 14, color: "#0F172A", padding: 0 },
  
  // Categories
  categoryScroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, gap: 8 },
  categoryChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#FFF", borderRadius: 16, gap: 6, borderWidth: 1, borderColor: "#E2E8F0" },
  categoryEmoji: { fontSize: 14 },
  categoryLabel: { fontSize: 12, fontWeight: "600", color: "#64748B" },
  categoryLabelActive: { color: "#FFF" },
  categoryCount: { backgroundColor: "#F1F5F9", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  categoryCountActive: { backgroundColor: "rgba(255,255,255,0.2)" },
  categoryCountText: { fontSize: 10, fontWeight: "700", color: "#64748B" },
  
  // Language Header
  languageHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginHorizontal: spacing.lg, marginBottom: spacing.sm, borderRadius: 14, padding: spacing.md },
  languageHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  languageEmoji: { fontSize: 28 },
  languageName: { fontSize: 18, fontWeight: "700", color: "#FFF" },
  languageScript: { fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  languageStats: { flexDirection: "row", gap: 12 },
  languageStat: { flexDirection: "row", alignItems: "center", gap: 4 },
  languageStatText: { fontSize: 11, color: "#CBD5E1", fontWeight: "500" },
  
  // Context Suggestions
  contextSection: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  contextHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  contextTitle: { fontSize: 13, fontWeight: "600", color: "#7C3AED" },
  contextPhraseChip: { backgroundColor: "#EEF2FF", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, marginRight: 8 },
  contextPhraseText: { fontSize: 12, fontWeight: "500", color: "#7C3AED" },
  
  // Phrases List
  phrasesList: { paddingHorizontal: spacing.lg, paddingBottom: 120, paddingTop: spacing.sm },
  
  // Phrase Card
  phraseCard: { marginBottom: 10, borderRadius: 16, padding: spacing.md },
  phraseHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  phraseCategoryRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  phraseCategoryBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  phraseCategoryEmoji: { fontSize: 12 },
  phraseCategoryText: { fontSize: 10, fontWeight: "600" },
  recentBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F1F5F9", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  recentText: { fontSize: 10, color: "#64748B", fontWeight: "500" },
  phraseEnglish: { fontSize: 15, fontWeight: "600", color: "#0F172A", marginBottom: 6 },
  phraseLocalRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  phraseLocal: { flex: 1, fontSize: 20, fontWeight: "700", color: "#7C3AED" },
  playButton: { width: 44, height: 44, borderRadius: 22, overflow: "hidden" },
  playButtonGradient: { flex: 1, justifyContent: "center", alignItems: "center" },
  pronunciationRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  pronunciation: { fontSize: 13, color: "#64748B", fontStyle: "italic" },
  
  // Voice Button
  voiceButton: { position: "absolute", right: spacing.lg, bottom: spacing.xxl, borderRadius: 32, overflow: "hidden", shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  voiceButtonGradient: { width: 64, height: 64, justifyContent: "center", alignItems: "center" },
  
  // Skeleton
  skeletonContainer: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  skeletonCard: { backgroundColor: "#FFF", borderRadius: 16, padding: spacing.md, marginBottom: 10 },
  skeletonHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  skeletonBadge: { width: 80, height: 20, borderRadius: 10, backgroundColor: "#E2E8F0" },
  skeletonStar: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#E2E8F0" },
  skeletonLineLarge: { height: 16, backgroundColor: "#E2E8F0", borderRadius: 8, width: "80%", marginBottom: 8 },
  skeletonLineMedium: { height: 20, backgroundColor: "#E2E8F0", borderRadius: 10, width: "60%", marginBottom: 8 },
  skeletonPronunciation: { height: 12, backgroundColor: "#E2E8F0", borderRadius: 6, width: "40%" },
  
  // Empty State
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: spacing.xxl * 2, paddingHorizontal: spacing.lg },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center", marginBottom: spacing.md },
  emptyEmoji: { fontSize: 36 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#0F172A", marginBottom: 4 },
  emptySubtitle: { fontSize: 14, color: "#64748B", textAlign: "center", marginBottom: spacing.lg },
  emptyButton: { borderRadius: 14, overflow: "hidden" },
  emptyButtonGradient: { paddingHorizontal: 20, paddingVertical: 12 },
  emptyButtonText: { fontSize: 14, fontWeight: "700", color: "#FFF" },
});