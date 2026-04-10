/**
 * ChatScreen – AI Travel Agent
 * Enhanced with agent mode, quick actions, and contextual recommendations
 */

import React, { useState, useRef, useCallback } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import ChatBubble from "@/components/Features/ChatBubble";
import { chatService } from "@/services/chat";
import { ChatMessage as ChatMsg, RootStackParamList } from "@/types";
import { colors, spacing } from "@/theme/colors";

type NavProp = NativeStackNavigationProp<RootStackParamList>;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const QUICK_ACTIONS = [
  { emoji: "🏖️", label: "Plan Goa trip", msg: "Plan a 5-day family trip to Goa with beaches, food and culture. Include budget, itinerary, and packing list." },
  { emoji: "🗺️", label: "Compare", msg: "Compare Jaipur vs Udaipur for a 4-day couple trip. Which is better for budget, safety, and weather?" },
  { emoji: "🧳", label: "Packing tips", msg: "What should I pack for a trip to Manali in winter? Give me a complete checklist." },
  { emoji: "💰", label: "Budget help", msg: "What's the estimated budget for a 7-day trip to Kerala for a family of 4 in comfort class?" },
  { emoji: "🍽️", label: "Food guide", msg: "Recommend the best local food and restaurants to try in Varanasi. Include street food!" },
  { emoji: "🛡️", label: "Safety tips", msg: "Is Meghalaya safe for solo female travelers? Give me safety tips and precautions." },
  { emoji: "📍", label: "Route plan", msg: "Plan a road trip route from Delhi to Manali. Include stops, distances, and estimated time." },
  { emoji: "🌤️", label: "Best time", msg: "What's the best time to visit Ladakh? Consider weather, road conditions, and festival season." },
];

export default function ChatScreen() {
  const navigation = useNavigation<NavProp>();
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: "welcome",
      role: "bot",
      text: "🤖 Hi! I'm your **AI Travel Agent**.\n\nI can help you with:\n• 📋 Trip planning & itineraries\n• 💰 Budget estimates\n• 🗺️ Route planning\n• 🛡️ Safety assessments\n• 🧳 Packing lists\n• 🍽️ Food & place recommendations\n\nTry the quick actions below or ask me anything!",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionId] = useState(generateId());
  const [agentMode, setAgentMode] = useState(true);
  const [destination, setDestination] = useState("");
  const listRef = useRef<FlatList>(null);

  const handleSend = useCallback(async (overrideMsg?: string) => {
    const text = (overrideMsg || input).trim();
    if (!text || sending) return;

    const userMsg: ChatMsg = {
      id: generateId(),
      role: "user",
      text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    if (!overrideMsg) setInput("");
    setSending(true);

    try {
      const response = agentMode
        ? await chatService.sendAgentMessage(text, sessionId, {
            destination: destination || undefined,
            routeContext: "travel_agent",
          })
        : await chatService.sendMessage(text, sessionId, destination || undefined);

      const botMsg: ChatMsg = {
        id: generateId(),
        role: "bot",
        text: response.reply,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errMsg: ChatMsg = {
        id: generateId(),
        role: "bot",
        text: `⚠️ ${err.message || "Please try again."}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setSending(false);
    }
  }, [input, sending, sessionId, agentMode, destination]);

  const quickNavActions = [
    { emoji: "📋", label: "Itinerary", screen: "Itinerary" },
    { emoji: "🗺️", label: "Route", screen: "RoutePlanner" },
    { emoji: "💱", label: "Currency", screen: "Currency" },
    { emoji: "⚖️", label: "Compare", screen: "Compare" },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>🤖</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>AI Travel Agent</Text>
          <Text style={styles.headerSub}>
            {agentMode ? "🟢 Agent Mode" : "💬 Chat Mode"} · Gemini AI
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.modeBadge, agentMode && styles.modeBadgeActive]}
          onPress={() => setAgentMode(!agentMode)}>
          <Text style={styles.modeBadgeText}>{agentMode ? "🧠 Agent" : "💬 Chat"}</Text>
        </TouchableOpacity>
      </View>

      {/* Destination context bar */}
      <View style={styles.contextBar}>
        <Text style={styles.contextLabel}>📍</Text>
        <TextInput
          style={styles.contextInput}
          value={destination}
          onChangeText={setDestination}
          placeholder="Set destination context (optional)"
          placeholderTextColor={colors.gray}
        />
        {destination ? (
          <TouchableOpacity onPress={() => setDestination("")}>
            <Text style={{ fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Quick nav buttons */}
      <View style={styles.quickNav}>
        {quickNavActions.map(a => (
          <TouchableOpacity key={a.screen} style={styles.quickNavBtn}
            onPress={() => navigation.navigate(a.screen as any)}>
            <Text style={{ fontSize: 16 }}>{a.emoji}</Text>
            <Text style={styles.quickNavText}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        {/* Messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatBubble
              text={item.text}
              isUser={item.role === "user"}
              timestamp={item.timestamp}
            />
          )}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: true })
          }
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            messages.length <= 1 ? (
              <View style={styles.quickActions}>
                <Text style={styles.quickTitle}>💡 Quick Actions</Text>
                <View style={styles.quickGrid}>
                  {QUICK_ACTIONS.map((action, i) => (
                    <TouchableOpacity key={i} style={styles.quickChip}
                      onPress={() => handleSend(action.msg)}>
                      <Text style={styles.quickEmoji}>{action.emoji}</Text>
                      <Text style={styles.quickLabel}>{action.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null
          }
        />

        {/* Typing indicator */}
        {sending && (
          <View style={styles.typingBar}>
            <Text style={styles.typingText}>🤖 Agent is thinking…</Text>
          </View>
        )}

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            placeholder={agentMode ? "Ask the travel agent…" : "Ask about travel…"}
            placeholderTextColor={colors.gray}
            multiline
            maxLength={2000}
            editable={!sending}
            onSubmitEditing={() => handleSend()}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
            onPress={() => handleSend()}
            disabled={!input.trim() || sending}
          >
            <Text style={styles.sendIcon}>{sending ? "⏳" : "📤"}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", padding: spacing.md, backgroundColor: colors.darkBackground, gap: spacing.sm },
  headerIcon: { fontSize: 32 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.6)" },
  modeBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.1)" },
  modeBadgeActive: { backgroundColor: "#10B981" },
  modeBadgeText: { fontSize: 12, fontWeight: "700", color: "#FFF" },
  contextBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, paddingVertical: 6, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 6 },
  contextLabel: { fontSize: 16 },
  contextInput: { flex: 1, fontSize: 13, color: colors.text, paddingVertical: 4 },
  quickNav: { flexDirection: "row", paddingHorizontal: spacing.md, paddingVertical: 8, gap: 8, backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border },
  quickNavBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  quickNavText: { fontSize: 11, fontWeight: "600", color: colors.text },
  messageList: { paddingVertical: spacing.md },
  quickActions: { padding: spacing.md },
  quickTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  quickChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  quickEmoji: { fontSize: 18 },
  quickLabel: { fontSize: 13, color: colors.text, fontWeight: "500" },
  typingBar: { paddingHorizontal: spacing.md, paddingVertical: 6, backgroundColor: colors.primary + "10" },
  typingText: { fontSize: 13, color: colors.primary, fontStyle: "italic" },
  inputBar: { flexDirection: "row", alignItems: "flex-end", padding: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background, gap: spacing.sm },
  textInput: { flex: 1, backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, fontSize: 15, maxHeight: 100, color: colors.text, borderWidth: 1, borderColor: colors.border },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, justifyContent: "center", alignItems: "center" },
  sendBtnDisabled: { backgroundColor: colors.border },
  sendIcon: { fontSize: 20 },
});
