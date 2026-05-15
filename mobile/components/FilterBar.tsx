import { Pressable, ScrollView, Text, View } from "react-native";
import { FILTERS, type FilterId } from "../lib/filters";

interface Props {
  active: FilterId[];
  onToggle: (id: FilterId) => void;
}

export function FilterBar({ active, onToggle }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 8, alignItems: "center" }}
      style={{ flexGrow: 0, flexShrink: 0, paddingVertical: 4 }}
    >
      {FILTERS.map((f) => {
        const on = active.includes(f.id);
        return (
          <Pressable
            key={f.id}
            onPress={() => onToggle(f.id)}
            className={`self-center flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border ${
              on ? "bg-forest-700 border-forest-700" : "bg-white border-cream-300"
            }`}
          >
            <Text style={{ fontSize: 13 }}>{f.emoji}</Text>
            <Text
              className={`font-sans-medium text-xs ${on ? "text-cream-100" : "text-ink-700"}`}
            >
              {f.label}
            </Text>
          </Pressable>
        );
      })}
      {active.length > 0 && (
        <View className="w-px h-5 bg-cream-300 mx-1" />
      )}
      {active.length > 0 && (
        <Pressable
          onPress={() => active.forEach((id) => onToggle(id))}
          className="self-center px-3 py-1.5 rounded-full"
        >
          <Text className="font-sans-medium text-terracotta-600 text-xs">Clear</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}
