import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";

import { initializeDatabase } from "../database/database";

export default function RootLayout() {
  return (
    <SQLiteProvider
      databaseName="celebration-manager.db"
      onInit={initializeDatabase}
    >
      <StatusBar style="light" />

      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: "#6d3b7c",
          },
          headerTintColor: "#ffffff",
          headerTitleStyle: {
            fontWeight: "600",
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: "Kalendar proslava",
          }}
        />

        <Stack.Screen
          name="reservation/new"
          options={{
            title: "Nova rezervacija",
          }}
        />
      </Stack>
    </SQLiteProvider>
  );
}
