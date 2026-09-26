/** Web demo tabs (native tabs are iOS-only). A banner makes it clear this is demo data. */
import { TabList, TabSlot, Tabs, TabTrigger, type TabTriggerSlotProps } from "expo-router/ui";
import { Pressable, View } from "react-native";
import { resetDemo } from "@/lib/demo/boot";
import { C, T } from "@/ui/kit";

function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps & { children: string }) {
  return (
    <Pressable {...props} style={{ flex: 1, alignItems: "center", paddingVertical: 10 }}>
      <T size={13} bold={isFocused} style={{ color: isFocused ? C.accent : C.dim }}>{children}</T>
    </Pressable>
  );
}

const TABS: [string, string, string][] = [["index", "/", "📷 Capture"], ["feed", "/feed", "▦ Feed"], ["deals", "/deals", "📊 Deal Room"], ["content", "/content", "🎬 Content"], ["more", "/more", "⋯ More"]];

export default function WebTabs() {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center" }}>
      <View style={{ flex: 1, width: "100%", maxWidth: 520, borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.line }}>
        <View style={{ backgroundColor: "#3a2a00", paddingVertical: 6, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <T size={12} style={{ flex: 1, color: C.warn }}>DEMO · fake data saved in this browser only · camera, voice & AI are simulated</T>
          <Pressable onPress={() => { if (globalThis.confirm("Reset the demo data?")) resetDemo(); }}><T size={12} bold style={{ color: C.warn }}>Reset</T></Pressable>
        </View>
        <Tabs>
          <TabSlot style={{ flex: 1 }} />
          <TabList style={{ flexDirection: "row", borderTopWidth: 1, borderColor: C.line, backgroundColor: C.bg }}>
            {TABS.map(([name, href, label]) => (
              <TabTrigger key={name} name={name} href={href as never} asChild>
                <TabButton>{label}</TabButton>
              </TabTrigger>
            ))}
          </TabList>
        </Tabs>
      </View>
    </View>
  );
}
