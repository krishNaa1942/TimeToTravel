import React, { useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity, Linking } from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import LoadingSpinner from "@/components/Common/LoadingSpinner";
import { newsService, NewsArticle } from "@/services/news";
import { colors, spacing } from "@/theme/colors";

const TABS = [
  { key: "trending", label: "🔥 Trending" },
  { key: "travel", label: "✈️ Travel" },
  { key: "safety", label: "🛡️ Safety" },
];

export default function NewsFeedScreen() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("trending");
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    newsService.getStatus().then(r => setAvailable(r.available)).catch(() => setAvailable(false));
  }, []);

  useEffect(() => {
    setLoading(true);
    const fetch = tab === "trending"
      ? newsService.getTrending(15)
      : tab === "safety"
        ? newsService.getSafetyNews()
        : newsService.getTravelNews(undefined, "travel", 15);
    fetch.then(r => setArticles(r.articles || []))
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, [tab]);

  if (!available) return (
    <SafeAreaView style={styles.container}><View style={styles.empty}>
      <Text style={{ fontSize: 64 }}>📰</Text>
      <Text style={styles.emptyTitle}>News unavailable</Text>
      <Text style={styles.emptyText}>NewsAPI not configured on server</Text>
    </View></SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>📰 Travel News</Text>
        <Text style={styles.subtitle}>Stay informed with latest travel updates</Text>

        <View style={styles.tabRow}>
          {TABS.map(t => (
            <TouchableOpacity key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]}
              onPress={() => setTab(t.key)}>
              <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? <LoadingSpinner message="Loading news…" /> : (
          articles.length === 0 ? (
            <View style={styles.empty}>
              <Text style={{ fontSize: 48 }}>📰</Text>
              <Text style={styles.emptyTitle}>No articles found</Text>
            </View>
          ) : (
            articles.map((article, i) => (
              <TouchableOpacity key={i} style={styles.newsCard}
                onPress={() => article.url && Linking.openURL(article.url)}>
                <View style={styles.newsHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.newsTitle}>{article.title}</Text>
                    {article.source && <Text style={styles.newsSource}>{article.source}</Text>}
                  </View>
                  <Text style={styles.newsArrow}>→</Text>
                </View>
                {article.description && (
                  <Text style={styles.newsDesc} numberOfLines={2}>{article.description}</Text>
                )}
                {article.published_at && (
                  <Text style={styles.newsDate}>{article.published_at.split("T")[0]}</Text>
                )}
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
  tabRow: { flexDirection: "row", gap: 8, marginBottom: spacing.lg },
  tab: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: "600", color: colors.text },
  tabTextActive: { color: "#FFF" },
  newsCard: { backgroundColor: colors.surface, borderRadius: 14, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  newsHeader: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  newsTitle: { fontSize: 15, fontWeight: "700", color: colors.text, lineHeight: 22 },
  newsSource: { fontSize: 12, color: colors.primary, fontWeight: "600", marginTop: 4 },
  newsArrow: { fontSize: 18, color: colors.gray },
  newsDesc: { fontSize: 13, color: colors.gray, lineHeight: 20, marginTop: 8 },
  newsDate: { fontSize: 11, color: colors.gray, marginTop: 6 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: spacing.xxl },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginTop: spacing.sm },
  emptyText: { fontSize: 14, color: colors.gray, textAlign: "center" },
});
