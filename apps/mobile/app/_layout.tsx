import "../src/polyfills";

import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Activity, Clock, Sparkles, Vault } from "lucide-react-native";
import React from "react";
import { AppProvider, useSolCheck } from "../src/context/AppContext";
import { COLORS } from "../src/theme";

function SolCheckTabs() {
  const { t } = useSolCheck();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.bgCard,
          borderTopColor: COLORS.borderSubtle,
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: COLORS.solanaGreen,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.tabs.xray,
          tabBarIcon: ({ color, size }) => (
            <Activity size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="advisor"
        options={{
          title: t.tabs.advisor,
          tabBarIcon: ({ color, size }) => (
            <Sparkles size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="vault"
        options={{
          title: t.tabs.vault,
          tabBarIcon: ({ color, size }) => <Vault size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t.tabs.history,
          tabBarIcon: ({ color, size }) => <Clock size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <StatusBar style="light" backgroundColor={COLORS.bgPrimary} />
      <SolCheckTabs />
    </AppProvider>
  );
}
