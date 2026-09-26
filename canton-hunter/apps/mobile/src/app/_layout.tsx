import "react-native-get-random-values";
import "@/lib/demo/boot";
import { DefaultTheme, Stack, ThemeProvider } from "expo-router";
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
import { C, isWeb, Screen, T } from "@/ui/kit";
import { WebNav } from "@/ui/webNav";
import { View } from "react-native";

SplashScreen.preventAutoHideAsync();

const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: C.bg, card: C.bg, primary: C.accent, text: C.text, border: C.line } };

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
        <StatusBar style="dark" />
        {!configured ? (
          <Screen><T size={20} bold>Not configured</T><T dim>Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (see docs/SETUP.md).</T></Screen>
        ) : !session ? (
          <Login />
        ) : (
          <View style={{ flex: 1, backgroundColor: C.bg }}>
            {isWeb ? <WebNav /> : null}
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="new" options={{ presentation: isWeb ? "card" : "modal" }} />
            </Stack>
          </View>
        )}
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
