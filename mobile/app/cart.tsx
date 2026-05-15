import { FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronDown, Sparkles, Trash2 } from "lucide-react-native";
import { useCartStore } from "../store/cartStore";
import { CartLineItem } from "../components/CartLineItem";

export default function CartScreen() {
  const router = useRouter();
  const cart = useCartStore((s) => s.cart);
  const clear = useCartStore((s) => s.clear);

  const isEmpty = !cart || cart.lines.length === 0;

  return (
    <SafeAreaView className="flex-1 bg-cream-100" edges={["top", "bottom"]}>
      <View className="px-5 pt-2 pb-3 flex-row items-center justify-between">
        <Pressable onPress={() => router.back()} hitSlop={12} className="p-1.5">
          <ChevronDown size={26} color="#1B1F1A" />
        </Pressable>
        <Text className="font-serif text-ink-900 text-xl">Your Order</Text>
        <Pressable
          onPress={clear}
          disabled={isEmpty}
          hitSlop={12}
          className="p-1.5"
          style={{ opacity: isEmpty ? 0.35 : 1 }}
        >
          <Trash2 size={20} color="#1B1F1A" />
        </Pressable>
      </View>

      {isEmpty ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-20 h-20 rounded-full bg-cream-200 items-center justify-center mb-5">
            <Sparkles size={28} color="#3F5F3C" />
          </View>
          <Text className="font-serif text-ink-900 text-2xl text-center">Empty cart, full possibilities</Text>
          <Text className="font-sans text-ink-500 text-sm text-center mt-2 leading-5">
            Tap items on the menu — or ask the AI for "a light lunch under $25" and watch it build your order.
          </Text>
          <Pressable
            onPress={() => router.replace("/chat")}
            className="mt-6 bg-forest-600 active:bg-forest-700 rounded-2xl px-5 py-3 flex-row items-center gap-2"
          >
            <Sparkles size={16} color="#FAF7F0" />
            <Text className="font-sans-semibold text-cream-100">Ask the assistant</Text>
          </Pressable>
        </View>
      ) : (
        <View className="flex-1">
          <FlatList
            data={cart.lines}
            keyExtractor={(l) => l.lineId}
            renderItem={({ item }) => <CartLineItem line={item} />}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            className="flex-1"
          />
          <View className="px-5 pb-4 pt-4 border-t border-cream-200 bg-cream-100">
            <View className="flex-row items-baseline justify-between mb-3">
              <Text className="font-sans text-ink-500 text-sm">
                Subtotal · {cart.itemCount} item{cart.itemCount === 1 ? "" : "s"}
              </Text>
              <Text className="font-serif text-ink-900 text-2xl">${cart.subtotal.toFixed(2)}</Text>
            </View>
            <Pressable
              onPress={() => router.push("/checkout")}
              className="bg-forest-600 active:bg-forest-700 rounded-2xl py-4 items-center"
            >
              <Text className="font-sans-semibold text-cream-100 text-base">
                Checkout · ${cart.subtotal.toFixed(2)}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
