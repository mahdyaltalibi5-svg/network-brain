import { NativeTabs } from "expo-router/unstable-native-tabs";
import { C } from "@/ui/kit";

/** Phone: two tabs. Journal (log everything) and Build (turn a winner into a store + ads). Tools live in the Journal header. */
export default function TabsLayout() {
  return (
    <NativeTabs backgroundColor={C.card} tintColor={C.text}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Journal</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="book.closed" md="menu_book" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="build">
        <NativeTabs.Trigger.Label>Build</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="hammer" md="construction" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
