import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useSyncStatus } from "@/lib/sync";
import { C } from "@/ui/kit";

export default function TabsLayout() {
  const sync = useSyncStatus();
  const pending = sync.pendingChanges + sync.pendingUploads;
  return (
    <NativeTabs backgroundColor={C.card} tintColor={C.text}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Capture</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="camera.fill" md="photo_camera" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="feed">
        <NativeTabs.Trigger.Label>Feed</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="square.grid.2x2.fill" md="grid_view" />
        {pending > 0 ? <NativeTabs.Trigger.Badge>{String(pending)}</NativeTabs.Trigger.Badge> : null}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="deals">
        <NativeTabs.Trigger.Label>Deal Room</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.bar.fill" md="leaderboard" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="content">
        <NativeTabs.Trigger.Label>Content</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="film.fill" md="movie" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="more">
        <NativeTabs.Trigger.Label>More</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="ellipsis.circle.fill" md="more_horiz" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
