import { useLocalSearchParams } from "expo-router";
import { LaunchScreen } from "@/features/launch";
export default function LaunchRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <LaunchScreen id={id} />;
}
