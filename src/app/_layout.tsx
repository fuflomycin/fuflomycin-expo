import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { WorkingListProvider } from "../working-list/provider";

export default function RootLayout() {
  return (
    <WorkingListProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </WorkingListProvider>
  );
}
