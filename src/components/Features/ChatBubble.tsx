/**
 * ChatBubble – user/bot message bubble
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { colors, spacing } from "@/theme/colors";

interface Props {
  text: string;
  isUser: boolean;
  timestamp?: number;
}

export default function ChatBubble({ text, isUser }: Props) {
  return (
    <View
      style={[
        styles.row,
        isUser ? styles.rowUser : styles.rowBot,
      ]}
    >
      {!isUser && <Text style={styles.avatar}>🤖</Text>}
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleBot,
        ]}
      >
        <Text
          style={[
            styles.text,
            isUser ? styles.textUser : styles.textBot,
          ]}
        >
          {text}
        </Text>
      </View>
      {isUser && <Text style={styles.avatar}>👤</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  rowUser: {
    justifyContent: "flex-end",
  },
  rowBot: {
    justifyContent: "flex-start",
  },
  avatar: {
    fontSize: 24,
    marginHorizontal: spacing.xs,
  },
  bubble: {
    maxWidth: "75%",
    padding: spacing.sm + 4,
    borderRadius: 18,
  },
  bubbleUser: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleBot: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {
    fontSize: 15,
    lineHeight: 21,
  },
  textUser: {
    color: "#FFFFFF",
  },
  textBot: {
    color: colors.text,
  },
});
