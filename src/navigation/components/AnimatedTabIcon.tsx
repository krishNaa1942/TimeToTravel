/**
 * 🎨 ANIMATED TAB ICON COMPONENT
 * ===============================
 * Production-grade animated tab icon with:
 * - Spring animations
 * - Haptic feedback
 * - Badge support
 * - Theme support
 * - Accessibility
 */

import React, { memo, useCallback } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';

import { TabConfig, TAB_ANIMATION_CONFIG } from '../config/tabConfig';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

interface AnimatedTabIconProps {
  tab: TabConfig;
  focused: boolean;
  badgeCount?: number;
  onPress?: () => void;
}

// ─────────────────────────────────────────────────────────────
// ANIMATED BADGE COMPONENT
// ─────────────────────────────────────────────────────────────

const AnimatedBadge: React.FC<{ count: number; focused: boolean }> = memo(({ count, focused }) => {
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  React.useEffect(() => {
    if (focused) {
      scale.value = withSequence(
        withSpring(TAB_ANIMATION_CONFIG.badge.scale.active, {
          damping: 10,
          stiffness: 400,
        }),
        withTiming(1, { duration: 150 })
      );
    }
  }, [focused]);

  if (count <= 0) return null;

  return (
    <Animated.View style={[styles.badgeContainer, animatedStyle]}>
      <Text style={styles.badgeText}>
        {count > 99 ? '99+' : count.toString()}
      </Text>
    </Animated.View>
  );
});

AnimatedBadge.displayName = 'AnimatedBadge';

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

const AnimatedTabIcon: React.FC<AnimatedTabIconProps> = memo(({
  tab,
  focused,
  badgeCount = 0,
  onPress,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  // Animation values
  const scale = useSharedValue(TAB_ANIMATION_CONFIG.iconScale.inactive);
  const opacity = useSharedValue(focused ? 1 : 0.7);
  
  // Handle focus animation
  React.useEffect(() => {
    scale.value = withSpring(
      focused ? TAB_ANIMATION_CONFIG.iconScale.active : TAB_ANIMATION_CONFIG.iconScale.inactive,
      {
        damping: TAB_ANIMATION_CONFIG.iconScale.springDamping,
        stiffness: TAB_ANIMATION_CONFIG.iconScale.springStiffness,
      }
    );
    opacity.value = withTiming(focused ? 1 : 0.7, {
      duration: TAB_ANIMATION_CONFIG.transition.duration,
    });
  }, [focused]);

  // Animated styles
  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  // Handle press with haptic
  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  }, [onPress]);

  // Get icon component
  const iconName = focused ? tab.icon.active : tab.icon.inactive;
  const iconColor = focused ? theme.colors.primary : theme.colors.text;
  const iconSize = focused ? 26 : 24;

  const renderIcon = () => {
    if (tab.icon.family === 'material') {
      return (
        <MaterialIcons
          name={iconName as keyof typeof MaterialIcons.glyphMap}
          size={iconSize}
          color={iconColor}
        />
      );
    }
    return (
      <Ionicons
        name={iconName as keyof typeof Ionicons.glyphMap}
        size={iconSize}
        color={iconColor}
      />
    );
  };

  return (
    <Pressable
      onPress={handlePress}
      style={[
        styles.container,
        { paddingBottom: insets.bottom > 0 ? 4 : 8 },
      ]}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={`${tab.label} tab${badgeCount > 0 ? `, ${badgeCount} notifications` : ''}`}
    >
      <Animated.View style={[styles.iconWrapper, iconAnimatedStyle]}>
        {renderIcon()}
        {tab.badge?.enabled && (
          <AnimatedBadge count={badgeCount} focused={focused} />
        )}
      </Animated.View>
      <Animated.Text
        style={[
          styles.label,
          {
            color: iconColor,
            fontWeight: focused ? '600' : '500',
          },
        ]}
      >
        {tab.label}
      </Animated.Text>
    </Pressable>
  );
});

AnimatedTabIcon.displayName = 'AnimatedTabIcon';

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
  },
  label: {
    fontSize: 11,
    marginTop: 4,
  },
  badgeContainer: {
    position: 'absolute',
    top: -6,
    right: -12,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});

export default AnimatedTabIcon;