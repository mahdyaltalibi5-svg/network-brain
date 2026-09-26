/**
 * UI kit. Quiet, neutral and legible in a bright, crowded hall: warm-gray canvas, white surfaces,
 * near-black text, one accent (ink). Color only carries meaning (good / bad / warning), never decoration.
 */
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import type { ReactNode } from "react";
import {
  ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View,
  type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const C = {
  bg: "#F4F3F1",      // canvas
  card: "#FFFFFF",    // surfaces
  card2: "#EFEEEC",   // subtle fills (tags, placeholders)
  line: "#E4E2DF",    // hairlines
  text: "#1A1917",    // ink
  dim: "#77736E",     // secondary text
  accent: "#1A1917",  // primary actions are ink
  good: "#1F7A4D",
  warn: "#A15C07",
  bad: "#B42318",
  blue: "#1A1917",    // legacy alias: secondary highlights are just ink now
  goodBg: "#E7F3EC",
  badBg: "#FBEAE8",
  bannerBg: "#EFEEEC",
  onAccent: "#FFFFFF",
};

export const isWeb = Platform.OS === "web";

/** Wide layout (desktop web / iPad): more columns, centered content. */
export function useWide(): { wide: boolean; cols: number } {
  const { width } = useWindowDimensions();
  return { wide: width >= 820, cols: width >= 1180 ? 3 : width >= 820 ? 2 : 1 };
}

export const MAX_WIDTH = 1120;

export function Screen({ children, scroll = true, pad = true, style, narrow }: { children: ReactNode; scroll?: boolean; pad?: boolean; style?: StyleProp<ViewStyle>; narrow?: boolean }) {
  const insets = useSafeAreaInsets();
  const inner = [{ paddingTop: isWeb ? 28 : insets.top + 8, paddingBottom: insets.bottom + (isWeb ? 60 : 110), paddingHorizontal: pad ? 20 : 0,
    width: "100%" as const, maxWidth: narrow ? 760 : MAX_WIDTH, alignSelf: "center" as const }, style];
  return scroll
    ? <ScrollView style={s.screen} contentContainerStyle={inner} keyboardShouldPersistTaps="handled">{children}</ScrollView>
    : <View style={[s.screen, ...inner]}>{children}</View>;
}

/** Page title with optional back link and actions. Replaces the native header so web and phone look the same. */
export function PageHeader({ title, subtitle, back, right }: { title: string; subtitle?: string; back?: string; right?: ReactNode }) {
  return (
    <View style={{ marginBottom: 20 }}>
      {back ? (
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} style={{ alignSelf: "flex-start", paddingVertical: 6, marginBottom: 4 }}>
          <T size={15} dim>‹ {back}</T>
        </Pressable>
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <T size={30} bold style={{ flex: 1, fontWeight: "700" }} numberOfLines={2}>{title}</T>
        {right}
      </View>
      {subtitle ? <T dim size={15} style={{ marginTop: 4 }}>{subtitle}</T> : null}
    </View>
  );
}

/** Floating "+" on phones. */
export function Fab({ onPress, label = "+" }: { onPress: () => void; label?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ position: "absolute", right: 20, bottom: insets.bottom + 24, width: 60, height: 60, borderRadius: 30,
      backgroundColor: C.text, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }, pressed && { opacity: 0.85 }]}>
      <T size={30} style={{ color: C.onAccent, marginTop: -3 }}>{label}</T>
    </Pressable>
  );
}

/** Search box. */
export function SearchBar({ value, onChangeText, placeholder }: { value: string; onChangeText: (v: string) => void; placeholder: string }) {
  return (
    <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#A8A4A0" clearButtonMode="always"
      style={[s.input, { fontSize: 16, paddingVertical: 13, marginBottom: 16 }]} />
  );
}

export function T({ children, style, dim, size = 16, bold, numberOfLines, selectable }: {
  children: ReactNode; style?: StyleProp<TextStyle>; dim?: boolean; size?: number; bold?: boolean; numberOfLines?: number; selectable?: boolean;
}) {
  return (
    <Text selectable={selectable} numberOfLines={numberOfLines}
      style={[{ color: dim ? C.dim : C.text, fontSize: size, fontWeight: bold ? "600" : "400", letterSpacing: size >= 22 ? -0.4 : 0 }, style]}>
      {children}
    </Text>
  );
}

export const H = ({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) =>
  <T size={30} bold style={[{ marginBottom: 16, fontWeight: "700" }, style]}>{children}</T>;

export const Section = ({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) => (
  <View style={{ marginTop: 28 }}>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
      <T size={14} bold style={{ color: C.dim }}>{title}</T>
      {right}
    </View>
    {children}
  </View>
);

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (!onPress) return <View style={[s.card, style]}>{children}</View>;
  return <Pressable onPress={onPress} style={({ pressed }) => [s.card, style, pressed && { backgroundColor: "#FAFAF9" }]}>{children}</Pressable>;
}

export function Button({ title, onPress, kind = "primary", disabled, busy, style, big, haptic = true }: {
  title: string; onPress: () => void; kind?: "primary" | "secondary" | "danger" | "good" | "ghost"; disabled?: boolean; busy?: boolean;
  style?: StyleProp<ViewStyle>; big?: boolean; haptic?: boolean;
}) {
  const solid = kind === "primary" || kind === "good" || kind === "danger";
  const bg = kind === "danger" ? C.bad : solid ? C.accent : kind === "secondary" ? C.card : "transparent";
  const fg = solid ? C.onAccent : kind === "ghost" ? C.dim : C.text;
  return (
    <Pressable
      disabled={disabled || busy}
      onPress={() => { if (haptic) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      style={({ pressed }) => [s.btn, { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.8 : 1, paddingVertical: big ? 16 : 11 },
        kind === "secondary" && { borderWidth: StyleSheet.hairlineWidth, borderColor: "#D6D3CF" }, kind === "ghost" && { paddingHorizontal: 8 }, style]}>
      {busy ? <ActivityIndicator color={fg} /> : <T bold size={big ? 17 : 15} style={{ color: fg }}>{title}</T>}
    </Pressable>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void; color?: string }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, active && { backgroundColor: C.text, borderColor: C.text }]}>
      <T size={14} style={{ color: active ? C.onAccent : C.text, fontWeight: active ? "600" : "400" }}>{label}</T>
    </Pressable>
  );
}

export const Row = ({ children, style, gap = 8 }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) =>
  <View style={[{ flexDirection: "row", alignItems: "center", gap, flexWrap: "wrap" }, style]}>{children}</View>;

export function Field({ label, ...props }: TextInputProps & { label?: string }) {
  return (
    <View style={{ marginBottom: 12 }}>
      {label ? <T size={13} dim style={{ marginBottom: 6 }}>{label}</T> : null}
      <TextInput placeholderTextColor="#A8A4A0" {...props} style={[s.input, props.multiline && { minHeight: 88, textAlignVertical: "top" }, props.style]} />
    </View>
  );
}

export const KV = ({ k, v, onPress }: { k: string; v: ReactNode; onPress?: () => void }) => (
  <Pressable onPress={onPress} style={s.kv}>
    <T dim size={15} style={{ flex: 1 }}>{k}</T>
    {typeof v === "string" || typeof v === "number" ? <T size={15} style={{ flex: 2, textAlign: "right" }} selectable>{v}</T> : <View style={{ flex: 2, alignItems: "flex-end" }}>{v}</View>}
  </Pressable>
);

/** A quiet tag. Only good/bad/warn get color; everything else is neutral. */
export const Badge = ({ label, color }: { label: string; color?: string }) => {
  const tone = color === C.bad || color === C.badBg ? C.bad : color === C.good || color === C.goodBg ? C.good : color === C.warn ? C.warn : null;
  return (
    <View style={{ backgroundColor: tone === C.bad ? C.badBg : tone === C.good ? C.goodBg : tone === C.warn ? "#FBF1E1" : C.card2, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
      <T size={12} style={{ color: tone ?? C.dim, fontWeight: "500" }}>{label}</T>
    </View>
  );
};

export const Empty = ({ text }: { text: string }) => <T dim style={{ textAlign: "center", marginTop: 48 }}>{text}</T>;

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  card: { backgroundColor: C.card, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  btn: { borderRadius: 12, paddingHorizontal: 18, alignItems: "center", justifyContent: "center" },
  chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: C.card, borderWidth: StyleSheet.hairlineWidth, borderColor: "#D6D3CF" },
  input: { backgroundColor: C.card, color: C.text, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: "#D6D3CF" },
  kv: { flexDirection: "row", paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line, gap: 12 },
});
