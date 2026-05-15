import { Pressable, Text, View } from "react-native";
import { Minus, Plus, Trash2 } from "lucide-react-native";
import type { CartLine } from "../lib/types";
import { useCartStore } from "../store/cartStore";
import { haptic } from "../lib/haptics";

interface Props {
  line: CartLine;
}

export function CartLineItem({ line }: Props) {
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeLine = useCartStore((s) => s.removeLine);

  const inc = () => {
    haptic.selection();
    updateQuantity(line.lineId, line.quantity + 1);
  };
  const dec = () => {
    haptic.selection();
    if (line.quantity <= 1) removeLine(line.lineId);
    else updateQuantity(line.lineId, line.quantity - 1);
  };
  const remove = () => {
    haptic.medium();
    removeLine(line.lineId);
  };

  const details = [line.size, ...(line.modifiers ?? [])].filter(Boolean).join(" · ");

  return (
    <View className="bg-white rounded-2xl border border-cream-200 p-4 mb-3">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="font-serif text-ink-900 text-lg">{line.name}</Text>
          {details ? (
            <Text className="font-sans text-ink-500 text-xs mt-0.5">{details}</Text>
          ) : null}
          <Text className="font-sans-medium text-forest-600 text-base mt-1.5">
            ${(line.price * line.quantity).toFixed(2)}
          </Text>
        </View>
        <Pressable onPress={remove} hitSlop={8} className="p-1.5">
          <Trash2 size={18} color="#9CA095" />
        </Pressable>
      </View>

      <View className="flex-row items-center justify-end mt-2 gap-3">
        <Pressable
          onPress={dec}
          className="w-9 h-9 rounded-full bg-cream-200 items-center justify-center active:bg-cream-300"
        >
          <Minus size={16} color="#2E4A2C" strokeWidth={2.5} />
        </Pressable>
        <Text className="font-sans-semibold text-ink-900 text-base w-6 text-center">
          {line.quantity}
        </Text>
        <Pressable
          onPress={inc}
          className="w-9 h-9 rounded-full bg-forest-600 items-center justify-center active:bg-forest-700"
        >
          <Plus size={16} color="#FAF7F0" strokeWidth={2.5} />
        </Pressable>
      </View>
    </View>
  );
}
