/** Web top bar: brand, sections, new entry. Full width, content centered. */
import { router, usePathname } from "expo-router";
import { Pressable, View } from "react-native";
import { resetDemo } from "@/lib/demo/boot";
import { Button, C, MAX_WIDTH, T, useWide } from "./kit";

const LINKS: [string, string][] = [["Journal", "/"], ["Build", "/build"], ["Manage", "/tools"]];

export function WebNav() {
  const path = usePathname();
  const { wide } = useWide();
  const MANAGE = ["/tools", "/followups", "/suppliers", "/samples", "/hunt", "/halls", "/dashboard", "/phrasebook", "/translate", "/settings", "/sync"];
  const active = (href: string) => (href === "/" ? path === "/" || path.startsWith("/find") || path === "/new"
    : href === "/tools" ? MANAGE.some((m) => path.startsWith(m)) : path.startsWith(href));
  return (
    <View style={{ backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.line }}>
      <View style={{ width: "100%", maxWidth: MAX_WIDTH, alignSelf: "center", paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: wide ? 24 : 8, height: 60 }}>
        {wide ? <T size={17} bold style={{ fontWeight: "700" }}>Canton Hunter</T> : null}
        <View style={{ flexDirection: "row", gap: 4, flex: 1 }}>
          {LINKS.map(([label, href]) => (
            <Pressable key={href} onPress={() => router.navigate(href as never)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: active(href) ? C.card2 : "transparent" }}>
              <T size={15} style={{ color: active(href) ? C.text : C.dim, fontWeight: active(href) ? "600" : "400" }}>{label}</T>
            </Pressable>
          ))}
        </View>
        {wide ? (
          <Pressable onPress={() => { if (globalThis.confirm?.("Reset the demo data?")) resetDemo(); }}>
            <T size={13} dim>Demo data · <T size={13} style={{ textDecorationLine: "underline", color: C.dim }}>reset</T></T>
          </Pressable>
        ) : null}
        {wide ? <Button title="New entry" onPress={() => router.push("/new")} /> : null}
      </View>
    </View>
  );
}
