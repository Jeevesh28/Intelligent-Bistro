import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ShoppingBag } from "lucide-react-native";
import { MotiView } from "moti";
import { useCartStore } from "../store/cartStore";

export function CartBadge() {
  const router = useRouter();
  const itemCount = useCartStore((s) => s.cart?.itemCount ?? 0);
  const lastAddedAt = useCartStore((s) => s.lastAddedAt);

  return (
    <Pressable onPress={() => router.push("/cart")} hitSlop={10}>
      <MotiView
        key={lastAddedAt}
        from={{ scale: 1.25 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", damping: 12 }}
      >
        <View className="relative">
          <View
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: "rgba(46, 74, 44, 0.10)" }}
          >
            <ShoppingBag size={18} color="#2E4A2C" />
          </View>
          {itemCount > 0 && (
            <View className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-terracotta-500 items-center justify-center">
              <Text className="font-sans-semibold text-cream-100 text-[11px]">{itemCount}</Text>
            </View>
          )}
        </View>
      </MotiView>
    </Pressable>
  );
}
