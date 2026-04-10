import React, { useEffect, useState } from "react";
import { View, ScrollView, Image, StyleSheet, FlatList, TouchableOpacity, Alert } from "react-native";
import { Text, Button } from "react-native-paper";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import LoadingSpinner from "@/components/Common/LoadingSpinner";
import WeatherCard from "@/components/Features/WeatherCard";
import SafetyBadge from "@/components/Features/SafetyBadge";
import { destinationsService } from "@/services/destinations";
import { weatherService } from "@/services/weather";
import { safetyService } from "@/services/safety";
import { Destination, WeatherData, SafetyData, UnsplashImage, RootStackParamList } from "@/types";
import { colors, spacing } from "@/theme/colors";
import { favoritesService } from "@/services/favorites";

type RouteType = RouteProp<RootStackParamList, "DestinationDetail">;
type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function DestinationDetailScreen() {
  const route = useRoute<RouteType>();
  const navigation = useNavigation<NavProp>();
  const { destination } = route.params;
  const [heroUrl, setHeroUrl] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [safety, setSafety] = useState<SafetyData | null>(null);
  const [photos, setPhotos] = useState<UnsplashImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const [favId, setFavId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [hero, w, s, p] = await Promise.allSettled([
          destinationsService.getHeroImage(destination.label),
          weatherService.getWeather(destination.label),
          safetyService.getSafety(destination.label),
          destinationsService.getDestinationImages(destination.label),
        ]);
        if (hero.status === "fulfilled" && hero.value) setHeroUrl(hero.value.url_regular || hero.value.url_small);
        if (w.status === "fulfilled") setWeather(w.value);
        if (s.status === "fulfilled") setSafety(s.value);
        if (p.status === "fulfilled") setPhotos(p.value);
      } finally { setLoading(false); }
    })();
  }, [destination]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.heroContainer}>
        {heroUrl ? <Image source={{ uri: heroUrl }} style={styles.heroImage} resizeMode="cover" /> : (
          <View style={[styles.heroImage, styles.heroPlaceholder]}><Text style={{ fontSize: 80 }}>🏔️</Text></View>
        )}
        <View style={styles.heroOverlay} />
        <View style={styles.heroTextArea}>
          <Text style={styles.heroTitle}>{destination.label}</Text>
          <Text style={styles.heroRegion}>{destination.region}</Text>
        </View>
      </View>

      <View style={styles.chips}>
        {destination.best_season ? <View style={styles.chip}><Text style={styles.chipText}>🗓️ {destination.best_season}</Text></View> : null}
        {destination.category?.map((c, i) => <View key={i} style={styles.chip}><Text style={styles.chipText}>{c}</Text></View>)}
      </View>

      {destination.highlight ? <Text style={styles.highlight}>{destination.highlight}</Text> : null}
      {loading && <LoadingSpinner message="Loading details…" />}

      {weather && <View style={styles.section}><Text style={styles.sectionTitle}>🌤️ Current Weather</Text><WeatherCard weather={weather} /></View>}
      {safety && <View style={styles.section}><Text style={styles.sectionTitle}>🛡️ Safety Score</Text><SafetyBadge safety={safety} /></View>}

      {photos.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📸 Photo Gallery</Text>
          <FlatList data={photos} horizontal showsHorizontalScrollIndicator={false} keyExtractor={(_, i) => String(i)}
            renderItem={({ item }) => (
              <View style={styles.photoCard}><Image source={{ uri: item.url_small || item.url_regular }} style={styles.photo} resizeMode="cover" />
                <Text style={styles.photoCredit} numberOfLines={1}>📷 {item.photographer}</Text></View>
            )} />
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.favBtn, isFav && styles.favBtnActive]}
          onPress={async () => {
            try {
              if (isFav && favId) {
                await favoritesService.remove(favId);
                setIsFav(false); setFavId(null);
              } else {
                const fav = await favoritesService.add(destination.label);
                setIsFav(true); setFavId(fav.id);
              }
            } catch (e: any) { Alert.alert("Info", e.message || "Failed"); }
          }}>
          <Text style={{ fontSize: 20 }}>{isFav ? "❤️" : "🤍"}</Text>
        </TouchableOpacity>
        <Button mode="contained" onPress={() => navigation.navigate("Budget", { destination })}
          style={styles.actionBtn} buttonColor={colors.primary} icon="calculator-variant">Budget</Button>
        <Button mode="outlined" onPress={() => navigation.navigate("Itinerary", {})}
          style={styles.actionBtn} textColor={colors.primary}>📋 Itinerary</Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 100 },
  heroContainer: { position: "relative", height: 280 },
  heroImage: { width: "100%", height: "100%" },
  heroPlaceholder: { backgroundColor: colors.darkBackground, justifyContent: "center", alignItems: "center" },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" },
  heroTextArea: { position: "absolute", bottom: 24, left: 16, right: 16 },
  heroTitle: { fontSize: 34, fontWeight: "900", color: "#FFF", textShadowColor: "rgba(0,0,0,0.5)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  heroRegion: { fontSize: 16, color: "rgba(255,255,255,0.85)", marginTop: 4, fontWeight: "500" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 4, paddingHorizontal: 16, paddingTop: 16 },
  chip: { backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  chipText: { fontSize: 12, color: colors.text },
  highlight: { fontSize: 15, color: colors.text, lineHeight: 22, padding: 16, fontStyle: "italic" },
  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 8 },
  photoCard: { marginRight: 8, borderRadius: 12, overflow: "hidden", backgroundColor: colors.surface, width: 220 },
  photo: { width: 220, height: 150 },
  photoCredit: { fontSize: 11, color: colors.gray, padding: 4 },
  actions: { paddingHorizontal: 16, gap: 8, flexDirection: "row", alignItems: "center" },
  actionBtn: { borderRadius: 14, flex: 1 },
  favBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  favBtnActive: { backgroundColor: "#FEE2E2", borderColor: "#FCA5A5" },
});
