import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Clock, Sparkles } from "lucide-react-native";
import { CartBadge } from "./CartBadge";
import { useOrderStore } from "../store/orderStore";

interface Props {
  name: string;
  tagline: string;
}

export function Hero({ name, tagline }: Props) {
  const router = useRouter();
  const historyCount = useOrderStore((s) => s.history.length);

  return (
    <View className="px-5 pt-3 pb-4 flex-row items-end justify-between">
      <View className="flex-1 pr-3">
        <View className="flex-row items-center gap-1.5">
          <View className="w-1.5 h-1.5 rounded-full bg-forest-600" />
          <Text className="font-sans-medium text-forest-600 text-[10px] uppercase tracking-[2.5px]">
            Now serving
          </Text>
        </View>
        <Text className="font-serif text-ink-900 text-[32px] leading-[36px] mt-2">{name}</Text>
        <Text className="font-sans text-ink-500 text-[13px] mt-1">{tagline}</Text>
      </View>
      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={() => router.push("/chat")}
          hitSlop={8}
          className="flex-row items-center gap-1.5 px-3.5 py-2 rounded-full active:opacity-80"
          style={{ backgroundColor: "rgba(46, 74, 44, 0.10)" }}
        >
          <Sparkles size={14} color="#2E4A2C" strokeWidth={2.4} />
          <Text className="font-sans-semibold text-forest-700 text-xs">Ask</Text>
        </Pressable>
        {historyCount > 0 && (
          <Pressable
            onPress={() => router.push("/orders")}
            hitSlop={8}
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: "rgba(46, 74, 44, 0.10)" }}
          >
            <Clock size={18} color="#2E4A2C" />
          </Pressable>
        )}
        <CartBadge />
      </View>
    </View>
  );
}
