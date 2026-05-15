import { Text, View } from "react-native";
import { Star } from "lucide-react-native";

interface Props {
  rating: number; // 0–5
  size?: number;
  showNumber?: boolean;
  count?: number;
  compact?: boolean;
}

/**
 * Renders a row of 5 stars with the first `rating` filled.
 * Compact mode shows: 4.6 ★ (218) inline (no row of stars).
 */
export function StarRating({
  rating,
  size = 14,
  showNumber = true,
  count,
  compact = false,
}: Props) {
  if (compact) {
    return (
      <View className="flex-row items-center gap-1">
        <Star size={size} color="#C68B1F" fill="#D6A21A" strokeWidth={1.5} />
        <Text className="font-sans-semibold text-ink-900 text-xs">{rating.toFixed(1)}</Text>
        {typeof count === "number" && (
          <Text className="font-sans text-ink-500 text-xs">({count})</Text>
        )}
      </View>
    );
  }

  const filled = Math.round(rating);
  return (
    <View className="flex-row items-center gap-1.5">
      <View className="flex-row">
        {[1, 2, 3, 4, 5].map((i) => {
          const on = i <= filled;
          return (
            <Star
              key={i}
              size={size}
              color={on ? "#C68B1F" : "#C8C5BD"}
              fill={on ? "#D6A21A" : "transparent"}
              strokeWidth={1.5}
            />
          );
        })}
      </View>
      {showNumber && (
        <Text className="font-sans-semibold text-ink-900 text-xs">{rating.toFixed(1)}</Text>
      )}
      {typeof count === "number" && (
        <Text className="font-sans text-ink-500 text-xs">({count})</Text>
      )}
    </View>
  );
}
