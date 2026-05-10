import React, { useCallback, useRef } from "react";
import {
  Pressable,
  Animated,
  ViewStyle,
  PressableProps,
  StyleProp,
  Platform,
} from "react-native";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props extends PressableProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  activeScale?: number;
}

export const PressableScale = ({
  children,
  style,
  activeScale = 0.96,
  ...props
}: Props) => {
  const {
    onPressIn: onPressInProp,
    onPressOut: onPressOutProp,
    ...restProps
  } = props;
  const scale = useRef(new Animated.Value(1)).current;
  const useNativeDriver = Platform.OS !== "web";

  const onPressIn = useCallback(
    (e: any) => {
      onPressInProp?.(e);
      Animated.spring(scale, {
        toValue: activeScale,
        useNativeDriver,
        tension: 100,
        friction: 10,
      }).start();
    },
    [activeScale, onPressInProp, scale, useNativeDriver],
  );

  const onPressOut = useCallback(
    (e: any) => {
      onPressOutProp?.(e);
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver,
        tension: 100,
        friction: 10,
      }).start();
    },
    [onPressOutProp, scale, useNativeDriver],
  );

  return (
    <AnimatedPressable
      {...restProps}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      renderToHardwareTextureAndroid
      shouldRasterizeIOS
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
};
