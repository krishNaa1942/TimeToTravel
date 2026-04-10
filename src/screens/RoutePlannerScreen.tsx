import React, { useEffect, useState, useRef } from "react";
import { View, StyleSheet, TouchableOpacity, Dimensions, Platform, ScrollView, Animated } from "react-native";
import { Text, TextInput } from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { MapComponent, MarkerComponent, PolylineComponent, MAP_PROVIDER } from "@/components/Common/ExpoMap";
import LoadingSpinner from "@/components/Common/LoadingSpinner";
import { mapsService, RouteResult } from "@/services/maps";
import { colors, spacing } from "@/theme/colors";

const { width, height } = Dimensions.get("window");

const TRAVEL_MODES = [
  { key: "car", emoji: "🚗", label: "Car" },
  { key: "bicycle", emoji: "🚲", label: "Cycle" },
  { key: "pedestrian", emoji: "🚶", label: "Walk" },
];

export default function RoutePlannerScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<any>(null); // Platform-agnostic Map ref

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [mode, setMode] = useState("car");
  
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [available, setAvailable] = useState(true);

  // Animated drawer for results to slide up elegantly
  const slideAnim = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    mapsService.getConfig().then(r => setAvailable(r.available)).catch(() => {});
  }, []);

  const planRoute = async () => {
    if (!from.trim() || !to.trim()) { setError("Enter both origin and destination"); return; }
    setLoading(true); setError(null); setRoute(null);
    Animated.spring(slideAnim, { toValue: height, useNativeDriver: true }).start();

    try {
      const res = await mapsService.getRoute(from.trim(), to.trim(), mode);
      setRoute(res);
      
      // Animate the result card upwards
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();

      // Ensure geometry exists and animate camera to frame the polyline perfectly
      if (res.geometry && res.geometry.length > 0 && mapRef.current) {
        const coordinates = res.geometry.map(coord => ({
          latitude: coord[0],
          longitude: coord[1],
        }));

        setTimeout(() => {
          mapRef.current?.fitToCoordinates(coordinates, {
            edgePadding: { top: 350, right: 50, bottom: 250, left: 50 },
            animated: true,
          });
        }, 500); // Wait for Map to catch up rendering natively
      }
    } catch (e: any) {
      setError(e.message || "Route planning failed");
    } finally {
      setLoading(false);
    }
  };

  const swapLocations = () => {
    setFrom(to); setTo(from); setRoute(null);
    Animated.spring(slideAnim, { toValue: height, useNativeDriver: true }).start();
  };

  if (!available) return (
    <SafeAreaView style={styles.unavailableContainer}>
      <Text style={{ fontSize: 64 }}>🗺️</Text>
      <Text style={styles.unavailableTitle}>Maps Service Offline</Text>
      <Text style={styles.unavailableText}>TomTom API is not configured on the server.</Text>
    </SafeAreaView>
  );

  return (
    <View style={styles.container}>
      {/* 1. Underlying Native Map Boilerplate */}
      <MapComponent
        ref={mapRef as any}
        style={StyleSheet.absoluteFillObject}
        provider={MAP_PROVIDER}
        initialRegion={{
          latitude: 20.5937,
          longitude: 78.9629,
          latitudeDelta: 15,
          longitudeDelta: 15,
        }}
        showsIndoors={false}
        showsTraffic={false}
      >
        {/* Render TomTom Polyline Natively on top of Map */}
        {route?.geometry && (
          <PolylineComponent
            coordinates={route.geometry.map(c => ({ latitude: c[0], longitude: c[1] }))}
            strokeColor="#0f766e" // Primary Teal
            strokeWidth={5}
            lineCap="round"
            lineJoin="round"
          />
        )}

        {/* Origin Marker */}
        {route?.geometry && route.geometry.length > 0 && (
          <MarkerComponent
            coordinate={{
              latitude: route.geometry[0][0],
              longitude: route.geometry[0][1],
            }}
            title={from}
            description="Start point"
            pinColor="#10B981" // Green Start
          />
        )}

        {/* Destination Marker */}
        {route?.geometry && route.geometry.length > 0 && (
          <MarkerComponent
            coordinate={{
              latitude: route.geometry[route.geometry.length - 1][0],
              longitude: route.geometry[route.geometry.length - 1][1],
            }}
            title={to}
            description="Destination"
            pinColor="#EF4444" // Red End
          />
        )}
      </MapComponent>

      {/* 2. Floating Search Panel */}
      <View style={[styles.floatingHeader, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.searchCard}>
          <View style={styles.inputRow}>
            <View style={styles.dot}><Text style={{ color: "#10B981", fontSize: 16 }}>●</Text></View>
            <TextInput mode="outlined" value={from} onChangeText={setFrom} placeholder="Start location..."
              style={styles.routeInput} outlineColor="transparent" activeOutlineColor={colors.primary} />
          </View>

          <TouchableOpacity style={styles.swapBtn} onPress={swapLocations}>
            <View style={styles.swapIconBox}><Text style={{ fontSize: 16 }}>↕️</Text></View>
          </TouchableOpacity>

          <View style={styles.inputRow}>
            <View style={styles.dot}><Text style={{ color: "#EF4444", fontSize: 16 }}>■</Text></View>
            <TextInput mode="outlined" value={to} onChangeText={setTo} placeholder="Where to?"
               style={styles.routeInput} outlineColor="transparent" activeOutlineColor={colors.primary} />
          </View>

          {/* Travel Modes Ribbon */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modeRow}>
            {TRAVEL_MODES.map(m => (
              <TouchableOpacity key={m.key}
                style={[styles.modeChip, mode === m.key && styles.modeChipActive]}
                onPress={() => { setMode(m.key); setRoute(null); }}>
                <Text style={styles.modeEmoji}>{m.emoji}</Text>
                <Text style={[styles.modeText, mode === m.key && styles.modeTextActive]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.planBtn} onPress={planRoute} disabled={loading}>
            <Text style={styles.planBtnText}>{loading ? "Mapping..." : "Route 📍"}</Text>
          </TouchableOpacity>

        </View>
        {loading && (
          <View style={styles.loadingPill}>
            <LoadingSpinner message="Querying TomTom Matrix Engine..." />
          </View>
        )}
        {error && <Text style={styles.errorPill}>{error}</Text>}
      </View>

      {/* 3. Floating Bottom Result Card logic */}
      <Animated.View style={[styles.floatingResultWrapper, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.resultCard}>
            <View style={styles.dragHandle} />
            <Text style={styles.resultTitle}>{from} to {to}</Text>
            
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statEmoji}>📏</Text>
                <View>
                  <Text style={styles.statValue}>{route?.distance_km?.toFixed(1)} km</Text>
                  <Text style={styles.statLabel}>Distance</Text>
                </View>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statBox}>
                <Text style={styles.statEmoji}>⏱️</Text>
                <View>
                  <Text style={styles.statValue}>{route?.duration_text || `${Math.round(route?.duration_minutes || 0)} min`}</Text>
                  <Text style={styles.statLabel}>Duration</Text>
                </View>
              </View>
            </View>

            {route?.summary && (
              <View style={styles.summaryBadge}>
                <Text style={styles.summaryText}>"{route.summary}"</Text>
              </View>
            )}
        </View>
      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E2E8F0" },
  unavailableContainer: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  unavailableTitle: { fontSize: 20, fontWeight: "800", marginTop: 16 },
  unavailableText: { fontSize: 14, color: "#64748B", marginTop: 8 },

  /* Search Overlay Card */
  floatingHeader: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    zIndex: 10,
    paddingHorizontal: spacing.md,
  },
  searchCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)", // Glass effect solid
    borderRadius: 24,
    padding: spacing.md,
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 8,
  },
  inputRow: { flexDirection: "row", alignItems: "center", height: 50 },
  dot: { width: 30, alignItems: "center", justifyContent: "center" },
  routeInput: { flex: 1, backgroundColor: "transparent", fontSize: 16, height: 44 },
  swapBtn: { 
    position: "absolute", right: 26, top: 40, zIndex: 20, 
    backgroundColor: "#F1F5F9", width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: "#ffffff"
  },
  swapIconBox: { transform: [{ rotate: "90deg" }] },
  
  modeRow: { marginTop: spacing.md, paddingBottom: spacing.sm, gap: 10 },
  modeChip: { flexDirection: "row", alignItems: "center", backgroundColor: "#F1F5F9", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  modeChipActive: { backgroundColor: "#0f766e" }, // Teal
  modeEmoji: { fontSize: 16, marginRight: 6 },
  modeText: { fontSize: 14, fontWeight: "600", color: "#475569" },
  modeTextActive: { color: "#ffffff" },

  planBtn: {
    marginTop: spacing.md,
    backgroundColor: "#0F172A", // Black / Slate900
    borderRadius: 16,
    height: 52,
    alignItems: "center", justifyContent: "center",
  },
  planBtnText: { color: "#ffffff", fontWeight: "800", fontSize: 16 },

  loadingPill: { marginTop: 12, backgroundColor: "#ffffff", borderRadius: 20, padding: 10, alignSelf:"center", shadowColor:"#000", shadowOpacity:0.1, elevation:3 },
  errorPill: { marginTop: 12, backgroundColor: "#FEE2E2", color: "#B91C1C", fontWeight:"700", padding: 12, borderRadius: 12, overflow: "hidden", textAlign: "center" },

  /* Bottom Animated Result Card */
  floatingResultWrapper: {
    position: "absolute",
    bottom: 20, left: spacing.md, right: spacing.md,
    zIndex: 15,
  },
  resultCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: spacing.lg,
    alignItems: "center",
    shadowColor: "#0f766e", shadowOpacity: 0.2, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 12,
  },
  dragHandle: { width: 40, height: 4, backgroundColor: "#E2E8F0", borderRadius: 2, marginBottom: 12 },
  resultTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A", textTransform: "capitalize", textAlign: "center", marginBottom: spacing.md },
  
  statsGrid: { flexDirection: "row", backgroundColor: "#F8FAFC", borderRadius: 16, padding: spacing.md, width: "100%", justifyContent:"space-around" },
  statBox: { flexDirection: "row", alignItems: "center", gap: 12 },
  statEmoji: { fontSize: 24 },
  statValue: { fontSize: 18, fontWeight: "900", color: "#0F172A" },
  statLabel: { fontSize: 12, color: "#64748B", fontWeight: "600" },
  statDivider: { width: 1, backgroundColor: "#E2E8F0" },

  summaryBadge: { marginTop: spacing.md, backgroundColor: "#ecfdf5", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, width: "100%" },
  summaryText: { color: "#047857", fontSize: 13, fontWeight: "600", fontStyle:"italic", textAlign: "center" },
});
