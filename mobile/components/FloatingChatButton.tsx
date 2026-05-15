import { Pressable, Text, View } from "react-native";
import { Sparkles } from "lucide-react-native";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { useEffect } from "react";
import { useCartStore } from "../store/cartStore";

export function FloatingChatButton() {
  const router = useRouter();
  const lastAddedAt = useCartStore((s) => s.lastAddedAt);

  return (
    <View pointerEvents="box-none" className="absolute right-5 bottom-7">
      <MotiView
        key={lastAddedAt}
        from={{ scale: 1 }}
        animate={{ scale: 1 }}
        transition={{ type: "timing", duration: 200 }}
      >
        <Pressable
          onPress={() => router.push("/chat")}
          className="bg-forest-600 active:bg-forest-700 rounded-full pl-4 pr-5 py-3.5 flex-row items-center gap-2 shadow-lg"
          style={{
            shadowColor: "#2E4A2C",
            shadowOpacity: 0.35,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
          }}
        >
          <Sparkles size={18} color="#FAF7F0" />
          <Text className="font-sans-semibold text-cream-100 text-base">Ask</Text>
        </Pressable>
      </MotiView>
    </View>
  );
}
