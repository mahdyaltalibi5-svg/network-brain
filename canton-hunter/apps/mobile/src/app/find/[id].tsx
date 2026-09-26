import { useLocalSearchParams } from "expo-router";
import { FindDetail } from "@/features/findDetail";
export default function FindRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <FindDetail id={id} />;
}
