import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ShoppingBag } from "lucide-react-native";
import { AnimatePresence, MotiView } from "moti";
import { useCartStore } from "../store/cartStore";

export function MiniCart() {
  const router = useRouter();
  const cart = useCartStore((s) => s.cart);
  const lastAddedAt = useCartStore((s) => s.lastAddedAt);

  const itemCount = cart?.itemCount ?? 0;
  const subtotal = cart?.subtotal ?? 0;
  const visible = itemCount > 0;

  return (
    <View pointerEvents="box-none" className="absolute left-0 right-0 bottom-0 px-4 pb-4">
      <AnimatePresence>
        {visible && (
          <MotiView
            key="minicart"
            from={{ opacity: 0, translateY: 80 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: 80 }}
            transition={{ type: "spring", damping: 16, stiffness: 220 }}
          >
            <MotiView
              key={lastAddedAt}
              from={{ scale: 1.04 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 10, stiffness: 320 }}
            >
              <Pressable
                onPress={() => router.push("/cart")}
                className="bg-forest-700 active:bg-forest-600 rounded-full pl-3 pr-5 py-2.5 flex-row items-center"
                style={{
                  shadowColor: "#0E1A0D",
                  shadowOpacity: 0.3,
                  shadowRadius: 16,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 6,
                }}
              >
                <View className="w-9 h-9 rounded-full bg-cream-100 items-center justify-center mr-2.5">
                  <ShoppingBag size={18} color="#2E4A2C" />
                  <View className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-terracotta-500 items-center justify-center">
                    <MotiView
                      key={`badge-${itemCount}-${lastAddedAt}`}
                      from={{ scale: 1.35 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", damping: 12, stiffness: 380 }}
                    >
                      <Text className="font-sans-semibold text-cream-100 text-[10px]">
                        {itemCount}
                      </Text>
                    </MotiView>
                  </View>
                </View>
                <Text className="font-sans-semibold text-cream-100 text-[15px] flex-1">
                  View order
                </Text>
                <Text className="font-serif text-cream-100 text-lg ml-3">
                  ${subtotal.toFixed(2)}
                </Text>
              </Pressable>
            </MotiView>
          </MotiView>
        )}
      </AnimatePresence>
    </View>
  );
}
