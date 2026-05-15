import { Text, View } from "react-native";

interface Props {
  label: string;
  emoji?: string;
  count?: number;
}

export function SectionHeader({ label, emoji, count }: Props) {
  return (
    <View className="pt-7 pb-3">
      <View className="flex-row items-baseline justify-between">
        <View className="flex-row items-baseline gap-2">
          {emoji && <Text style={{ fontSize: 18, lineHeight: 22 }}>{emoji}</Text>}
          <Text className="font-serif text-ink-900 text-[26px] leading-[30px]">{label}</Text>
        </View>
        {typeof count === "number" && count > 0 && (
          <Text className="font-sans text-ink-400 text-xs uppercase tracking-[1.5px]">
            {count} {count === 1 ? "item" : "items"}
          </Text>
        )}
      </View>
      <View className="h-px bg-cream-300 mt-3" />
    </View>
  );
}
