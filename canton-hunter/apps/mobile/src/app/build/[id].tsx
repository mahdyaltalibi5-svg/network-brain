import { useLocalSearchParams } from "expo-router";
import { BuildGuideScreen } from "@/features/build";
export default function BuildRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <BuildGuideScreen id={id} />;
}
