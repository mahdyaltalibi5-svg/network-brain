/** Web demo tabs (native tabs are iOS-only). A banner makes it clear this is demo data. */
import { TabList, TabSlot, Tabs, TabTrigger, type TabTriggerSlotProps } from "expo-router/ui";
import { Pressable, View } from "react-native";
import { resetDemo } from "@/lib/demo/boot";
import { C, T } from "@/ui/kit";

function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps & { children: string }) {
  return (
    <Pressable {...props} style={{ flex: 1, alignItems: "center", paddingTop: 12, paddingBottom: 14, borderTopWidth: 2, borderTopColor: isFocused ? C.text : "transparent", marginTop: -1 }}>
      <T size={13} bold={isFocused} style={{ color: isFocused ? C.text : C.dim }}>{children}</T>
    </Pressable>
  );
}

const TABS: [string, string, string][] = [["index", "/", "Capture"], ["feed", "/feed", "Feed"], ["deals", "/deals", "Deal Room"], ["content", "/content", "Content"], ["more", "/more", "More"]];

export default function WebTabs() {
  return (
    <View style={{ flex: 1, backgroundColor: "#E9E7E4", alignItems: "center" }}>
      <View style={{ flex: 1, width: "100%", maxWidth: 520, borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.line, backgroundColor: C.bg }}>
        <View style={{ backgroundColor: C.bg, paddingVertical: 8, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 8, borderBottomWidth: 1, borderColor: C.line }}>
          <T size={12} style={{ flex: 1, color: C.dim }}>Demo with sample data. Camera, voice and AI are simulated.</T>
          <Pressable onPress={() => { if (globalThis.confirm("Reset the demo data?")) resetDemo(); }}><T size={12} style={{ color: C.text, textDecorationLine: "underline" }}>Reset</T></Pressable>
        </View>
        <Tabs>
          <TabSlot style={{ flex: 1 }} />
          <TabList style={{ flexDirection: "row", borderTopWidth: 1, borderColor: C.line, backgroundColor: C.card }}>
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
