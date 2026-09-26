import "react-native-get-random-values";
import { DarkTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import type { Session } from "@supabase/supabase-js";
import { configured } from "@/lib/env";
import { listenForTaps, registerPush } from "@/lib/push";
import { setMe } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { startSync } from "@/lib/sync";
import { Login } from "@/features/login";
import { C, Screen, T } from "@/ui/kit";

SplashScreen.preventAutoHideAsync();

const theme = { ...DarkTheme, colors: { ...DarkTheme.colors, background: C.bg, card: C.bg, primary: C.accent, text: C.text, border: C.line } };

export default function RootLayout() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === undefined) return;
    void SplashScreen.hideAsync();
    setMe(session?.user.id ?? null);
    if (!session) return;
    const stopSync = startSync();
    const stopTaps = listenForTaps();
    void registerPush().catch(() => {});
    return () => { stopSync(); stopTaps(); };
  }, [session?.user.id, session === undefined]);

  if (session === undefined) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.bg }}>
      <ThemeProvider value={theme}>
        <StatusBar style="light" />
        {!configured ? (
          <Screen><T size={20} bold>Not configured</T><T dim>Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (see docs/SETUP.md).</T></Screen>
        ) : !session ? (
          <Login />
        ) : (
          <Stack screenOptions={{ headerStyle: { backgroundColor: C.bg }, headerTintColor: C.text, contentStyle: { backgroundColor: C.bg }, headerBackTitle: "Back" }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="find/[id]" options={{ title: "Find" }} />
            <Stack.Screen name="launch/[id]" options={{ title: "Launch" }} />
            <Stack.Screen name="review" options={{ title: "Nightly Review" }} />
            <Stack.Screen name="phrasebook" options={{ title: "Supplier Questions", presentation: "modal" }} />
            <Stack.Screen name="translate" options={{ title: "Quick Translate" }} />
            <Stack.Screen name="hunt" options={{ title: "Hunt List" }} />
            <Stack.Screen name="halls" options={{ title: "Hall Plan" }} />
            <Stack.Screen name="samples" options={{ title: "Samples & Packing" }} />
            <Stack.Screen name="suppliers" options={{ title: "Suppliers" }} />
            <Stack.Screen name="settings" options={{ title: "Settings & Verify" }} />
            <Stack.Screen name="sync" options={{ title: "Sync" }} />
          </Stack>
        )}
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
