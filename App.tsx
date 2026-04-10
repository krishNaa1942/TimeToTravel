import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import { PaperProvider } from "react-native-paper";
import { useColorScheme } from "react-native";
import "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClientProvider } from "@tanstack/react-query";

import RootNavigator from "@/navigation/RootNavigator";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { lightTheme, darkTheme } from "@/theme/colors";
import { queryClient } from "@/api/queryClient";

export default function App() {
  const colorScheme = useColorScheme();
  const { loadAuthState } = useAuthStore();
  const { themeDark } = useUIStore();

  useEffect(() => {
    // Load auth state from AsyncStorage on app launch
    loadAuthState();
  }, [loadAuthState]);

  const isDark = themeDark || colorScheme === "dark";
  const navigationTheme = isDark ? DarkTheme : DefaultTheme;
  const paperTheme = isDark ? darkTheme : lightTheme;

  return (
    <GestureHandlerRootView style={styles.container}>
      <QueryClientProvider client={queryClient}>
        <PaperProvider theme={paperTheme}>
          <NavigationContainer theme={navigationTheme}>
            <RootNavigator />
          </NavigationContainer>
        </PaperProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
