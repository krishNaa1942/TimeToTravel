/**
 * BottomTabNavigator
 * 5 tabs: Home, Explore, Chat, Trips, Profile
 */

import React from "react";
import { StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native-paper";
import { BottomTabParamList } from "@/types";
import { colors } from "@/theme/colors";

import HomeScreen from "@/screens/HomeScreen";
import ExploreScreen from "@/screens/ExploreScreen";
import ChatScreen from "@/screens/ChatScreen";
import TripsScreen from "@/screens/TripsScreen";
import ProfileScreen from "@/screens/ProfileScreen";

const Tab = createBottomTabNavigator<BottomTabParamList>();

function tabIcon(route: string, focused: boolean): string {
  switch (route) {
    case "Home":
      return focused ? "🏠" : "🏡";
    case "Explore":
      return focused ? "🧭" : "🗺️";
    case "Chat":
      return focused ? "💬" : "🗨️";
    case "Trips":
      return focused ? "✈️" : "🛫";
    case "Profile":
      return focused ? "👤" : "👥";
    default:
      return "📱";
  }
}

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => {
          const icon = tabIcon(route.name, focused);
          return (
            <Text style={{ fontSize: focused ? 26 : 22 }}>{icon}</Text>
          );
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Trips" component={TripsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.darkBackground,
    borderTopWidth: 0,
    height: 65,
    paddingBottom: 8,
    paddingTop: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
});
