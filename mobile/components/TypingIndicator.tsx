import { View } from "react-native";
import { MotiView } from "moti";

export function TypingIndicator() {
  return (
    <View className="self-start bg-white border border-cream-200 rounded-2xl rounded-bl-md px-4 py-3 mb-3 flex-row gap-1.5">
      {[0, 1, 2].map((i) => (
        <MotiView
          key={i}
          from={{ opacity: 0.3, translateY: 0 }}
          animate={{ opacity: 1, translateY: -3 }}
          transition={{
            type: "timing",
            duration: 500,
            loop: true,
            delay: i * 120,
            repeatReverse: true,
          }}
          className="w-1.5 h-1.5 rounded-full bg-ink-400"
        />
      ))}
    </View>
  );
}
