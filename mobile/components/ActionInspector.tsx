import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { MotiView } from "moti";
import { Check, Search, X } from "lucide-react-native";
import type { ExecutedAction } from "../lib/types";

interface Props {
  action: ExecutedAction | null;
  visible: boolean;
  onClose: () => void;
}

const TOOL_DESCRIPTIONS: Record<string, string> = {
  add_item: "Added a new line to the cart",
  update_line: "Modified an existing line (quantity, size, or modifiers)",
  remove_item: "Removed a line from the cart",
  clear_cart: "Cleared the entire cart",
};

export function ActionInspector({ action, visible, onClose }: Props) {
  if (!action) return null;
  const a = action.action;
  const friendly = TOOL_DESCRIPTIONS[a.type] ?? a.type;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/40">
        <Pressable className="absolute inset-0" onPress={onClose} />
        <MotiView
          from={{ translateY: 40, opacity: 0.7 }}
          animate={{ translateY: 0, opacity: 1 }}
          transition={{ type: "timing", duration: 220 }}
          className="bg-cream-100 rounded-t-3xl pt-3 pb-8 px-5"
          style={{ maxHeight: "85%" }}
        >
          <View className="items-center mb-2">
            <View className="w-10 h-1.5 rounded-full bg-cream-300" />
          </View>

          <View className="flex-row items-center justify-between mb-1">
            <View className="flex-row items-center gap-2">
              <Search size={18} color="#3F5F3C" />
              <Text className="font-serif text-ink-900 text-xl">What the AI did</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8} className="p-1.5">
              <X size={20} color="#6B6F66" />
            </Pressable>
          </View>
          <Text className="font-sans text-ink-500 text-xs">{friendly}</Text>

          <ScrollView
            className="mt-4"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 12 }}
          >
            <View className="bg-white border border-cream-200 rounded-2xl p-4">
              <Text className="font-sans-medium text-ink-500 text-[10px] uppercase tracking-[2px]">
                Tool call
              </Text>
              <View className="flex-row items-baseline gap-2 mt-1.5">
                <Text className="font-sans-semibold text-forest-600 text-base">{a.type}</Text>
                <View
                  className={`flex-row items-center gap-1 rounded-full px-2 py-0.5 ${
                    action.ok ? "bg-forest-700" : "bg-terracotta-500"
                  }`}
                >
                  {action.ok && <Check size={10} color="#FAF7F0" strokeWidth={3} />}
                  <Text className="font-sans-semibold text-cream-100 text-[10px] uppercase tracking-wider">
                    {action.ok ? "ok" : "error"}
                  </Text>
                </View>
              </View>
              <Text className="font-sans text-ink-700 text-[13px] mt-2">{action.message}</Text>
            </View>

            <View className="mt-4">
              <Text className="font-sans-medium text-ink-500 text-[10px] uppercase tracking-[2px] mb-2">
                Parameters Claude emitted
              </Text>
              <View className="gap-1.5">
                {Object.entries(a)
                  .filter(([k]) => k !== "type")
                  .map(([k, v]) => (
                    <View
                      key={k}
                      className="flex-row items-start justify-between bg-white border border-cream-200 rounded-xl px-3.5 py-2.5"
                    >
                      <Text className="font-sans-medium text-ink-500 text-xs">{k}</Text>
                      <Text
                        className="font-sans text-ink-900 text-xs flex-1 text-right ml-3"
                        numberOfLines={4}
                      >
                        {formatValue(v)}
                      </Text>
                    </View>
                  ))}
              </View>
            </View>

            <View className="mt-4">
              <Text className="font-sans-medium text-ink-500 text-[10px] uppercase tracking-[2px] mb-2">
                Raw JSON
              </Text>
              <View className="bg-forest-900 rounded-xl p-3.5">
                <Text
                  className="font-sans text-cream-100 text-[11px]"
                  style={{ fontFamily: "Menlo", lineHeight: 16 }}
                >
                  {JSON.stringify(a, null, 2)}
                </Text>
              </View>
            </View>

            <Text className="font-sans text-ink-400 text-[11px] text-center mt-4">
              Tip: every cart change in this app — whether you tap a "+" or the AI types it —
              flows through the same applyCartAction function.
            </Text>
          </ScrollView>
        </MotiView>
      </View>
    </Modal>
  );
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (Array.isArray(v)) return v.length === 0 ? "—" : v.join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
