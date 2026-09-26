/** Small UI kit: dark, big, thumb-friendly. Used in a loud crowded hall with one free hand. */
import * as Haptics from "expo-haptics";
import type { ReactNode } from "react";
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const C = {
  bg: "#0B0B10",
  card: "#16161F",
  card2: "#1F1F2B",
  line: "#2A2A38",
  text: "#F4F4F8",
  dim: "#9A9AAE",
  accent: "#FF6B35",
  good: "#3DDC97",
  warn: "#F7B801",
  bad: "#FF4D6D",
  blue: "#4EA8DE",
};

export function Screen({ children, scroll = true, pad = true, style }: { children: ReactNode; scroll?: boolean; pad?: boolean; style?: StyleProp<ViewStyle> }) {
  const insets = useSafeAreaInsets();
  const inner = [{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 90, paddingHorizontal: pad ? 16 : 0 }, style];
  return scroll
    ? <ScrollView style={s.screen} contentContainerStyle={inner} keyboardShouldPersistTaps="handled">{children}</ScrollView>
    : <View style={[s.screen, ...inner]}>{children}</View>;
}

export function T({ children, style, dim, size = 16, bold, numberOfLines, selectable }: {
  children: ReactNode; style?: StyleProp<TextStyle>; dim?: boolean; size?: number; bold?: boolean; numberOfLines?: number; selectable?: boolean;
}) {
  return (
    <Text selectable={selectable} numberOfLines={numberOfLines}
      style={[{ color: dim ? C.dim : C.text, fontSize: size, fontWeight: bold ? "700" : "400" }, style]}>
      {children}
    </Text>
  );
}

export const H = ({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) =>
  <T size={26} bold style={[{ marginBottom: 12 }, style]}>{children}</T>;

export const Section = ({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) => (
  <View style={{ marginTop: 20 }}>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
      <T size={13} dim bold style={{ textTransform: "uppercase", letterSpacing: 1 }}>{title}</T>
      {right}
    </View>
    {children}
  </View>
);

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (!onPress) return <View style={[s.card, style]}>{children}</View>;
  return <Pressable onPress={onPress} style={({ pressed }) => [s.card, style, pressed && { opacity: 0.7 }]}>{children}</Pressable>;
}

export function Button({ title, onPress, kind = "primary", disabled, busy, style, big, haptic = true }: {
  title: string; onPress: () => void; kind?: "primary" | "secondary" | "danger" | "good" | "ghost"; disabled?: boolean; busy?: boolean;
  style?: StyleProp<ViewStyle>; big?: boolean; haptic?: boolean;
}) {
  const bg = { primary: C.accent, secondary: C.card2, danger: C.bad, good: C.good, ghost: "transparent" }[kind];
  return (
    <Pressable
      disabled={disabled || busy}
      onPress={() => { if (haptic) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      style={({ pressed }) => [s.btn, { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.75 : 1, paddingVertical: big ? 18 : 12 }, kind === "ghost" && { borderWidth: 1, borderColor: C.line }, style]}>
      {busy ? <ActivityIndicator color={C.text} /> : <T bold size={big ? 18 : 15} style={{ color: kind === "good" ? "#062" : C.text }}>{title}</T>}
    </Pressable>
  );
}

export function Chip({ label, active, onPress, color }: { label: string; active?: boolean; onPress?: () => void; color?: string }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, active && { backgroundColor: color ?? C.accent, borderColor: color ?? C.accent }]}>
      <T size={14} bold={active}>{label}</T>
    </Pressable>
  );
}

export const Row = ({ children, style, gap = 8 }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) =>
  <View style={[{ flexDirection: "row", alignItems: "center", gap, flexWrap: "wrap" }, style]}>{children}</View>;

export function Field({ label, ...props }: TextInputProps & { label?: string }) {
  return (
    <View style={{ marginBottom: 10 }}>
      {label ? <T size={13} dim style={{ marginBottom: 4 }}>{label}</T> : null}
      <TextInput placeholderTextColor={C.dim} {...props} style={[s.input, props.multiline && { minHeight: 80, textAlignVertical: "top" }, props.style]} />
    </View>
  );
}

export const KV = ({ k, v, onPress }: { k: string; v: ReactNode; onPress?: () => void }) => (
  <Pressable onPress={onPress} style={s.kv}>
    <T dim size={14} style={{ flex: 1 }}>{k}</T>
    {typeof v === "string" || typeof v === "number" ? <T size={15} style={{ flex: 2, textAlign: "right" }} selectable>{v}</T> : <View style={{ flex: 2, alignItems: "flex-end" }}>{v}</View>}
  </Pressable>
);

export const Badge = ({ label, color = C.card2 }: { label: string; color?: string }) =>
  <View style={{ backgroundColor: color, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}><T size={12} bold>{label}</T></View>;

export const Empty = ({ text }: { text: string }) => <T dim style={{ textAlign: "center", marginTop: 40 }}>{text}</T>;

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  card: { backgroundColor: C.card, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  btn: { borderRadius: 14, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  chip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  input: { backgroundColor: C.card, color: C.text, borderRadius: 12, padding: 12, fontSize: 16, borderWidth: 1, borderColor: C.line },
  kv: { flexDirection: "row", paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line, gap: 12 },
});
