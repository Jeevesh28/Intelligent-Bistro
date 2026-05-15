import { Alert, FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronDown, Clock, Trash2 } from "lucide-react-native";
import { MotiView } from "moti";
import { useOrderStore, type PlacedOrder } from "../store/orderStore";
import { useCartStore } from "../store/cartStore";
import { haptic } from "../lib/haptics";

function timeAgo(ts: number): string {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(ts).toLocaleDateString();
}

function paymentLabel(o: PlacedOrder): string {
  if (o.paymentMethod === "card") return `•••• ${o.cardLast4 ?? ""}`;
  if (o.paymentMethod === "venmo") return `Venmo @${o.venmoHandle ?? ""}`;
  return "Cash";
}

export default function OrdersScreen() {
  const router = useRouter();
  const history = useOrderStore((s) => s.history);
  const clearHistory = useOrderStore((s) => s.clearHistory);
  const clearCart = useCartStore((s) => s.clear);
  const addItem = useCartStore((s) => s.addItem);

  const reorder = async (order: PlacedOrder) => {
    haptic.light();
    await clearCart();
    let failures = 0;
    for (const line of order.lines) {
      try {
        await addItem({
          item_id: line.itemId,
          quantity: line.quantity,
          modifiers: line.modifiers,
          size: line.size,
        });
      } catch {
        failures += 1;
      }
    }
    router.replace("/cart");
    if (failures > 0) {
      setTimeout(() => {
        Alert.alert(
          "Some items couldn't be added",
          `${failures} item${failures === 1 ? " is" : "s are"} no longer on the menu. The rest were added.`,
        );
      }, 400);
    }
  };

  const onClearAll = () => {
    Alert.alert("Clear order history?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => clearHistory(),
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-cream-100" edges={["top", "bottom"]}>
      <View className="px-5 pt-2 pb-3 flex-row items-center justify-between">
        <Pressable onPress={() => router.back()} hitSlop={12} className="p-1.5">
          <ChevronDown size={26} color="#1B1F1A" />
        </Pressable>
        <Text className="font-serif text-ink-900 text-xl">Past orders</Text>
        <Pressable
          onPress={onClearAll}
          disabled={history.length === 0}
          hitSlop={12}
          className="p-1.5"
          style={{ opacity: history.length === 0 ? 0.35 : 1 }}
        >
          <Trash2 size={20} color="#1B1F1A" />
        </Pressable>
      </View>

      {history.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-20 h-20 rounded-full bg-cream-200 items-center justify-center mb-5">
            <Clock size={28} color="#3F5F3C" />
          </View>
          <Text className="font-serif text-ink-900 text-2xl text-center">
            No orders yet
          </Text>
          <Text className="font-sans text-ink-500 text-sm text-center mt-2 leading-5">
            Place an order and it'll appear here. One tap reorders it.
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 }}
          renderItem={({ item, index }) => (
            <MotiView
              from={{ opacity: 0, translateY: 8 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 280, delay: Math.min(index * 50, 350) }}
              className="mb-3 bg-white border border-cream-200 rounded-3xl p-4"
              style={{
                shadowColor: "#0E1A0D",
                shadowOpacity: 0.04,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
              }}
            >
              <View className="flex-row items-baseline justify-between">
                <View className="flex-1">
                  <Text className="font-sans-medium text-ink-500 text-[10px] uppercase tracking-[1.5px]">
                    Order #{item.id}
                  </Text>
                  <Text className="font-serif text-ink-900 text-lg mt-0.5">
                    {item.lines.length} item{item.lines.length === 1 ? "" : "s"} · $
                    {item.total.toFixed(2)}
                  </Text>
                  <Text className="font-sans text-ink-500 text-xs mt-0.5">
                    {timeAgo(item.placedAt)} · {paymentLabel(item)}
                  </Text>
                </View>
              </View>

              <View className="mt-3 gap-1.5">
                {item.lines.slice(0, 4).map((line) => (
                  <View key={line.lineId} className="flex-row items-baseline gap-2">
                    <Text className="font-sans-semibold text-forest-600 text-xs">
                      {line.quantity}×
                    </Text>
                    <Text className="font-sans text-ink-700 text-[13px] flex-1" numberOfLines={1}>
                      {line.name}
                      {line.size ? ` (${line.size})` : ""}
                      {line.modifiers?.length ? ` · ${line.modifiers.join(", ")}` : ""}
                    </Text>
                  </View>
                ))}
                {item.lines.length > 4 && (
                  <Text className="font-sans text-ink-400 text-xs">
                    + {item.lines.length - 4} more
                  </Text>
                )}
              </View>

              <Pressable
                onPress={() => reorder(item)}
                className="mt-4 bg-forest-600 active:bg-forest-700 rounded-2xl py-3 items-center"
              >
                <Text className="font-sans-semibold text-cream-100 text-sm">
                  Reorder · ${item.total.toFixed(2)}
                </Text>
              </Pressable>
            </MotiView>
          )}
        />
      )}
    </SafeAreaView>
  );
}
