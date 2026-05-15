import { Pressable, View } from "react-native";
import { Heart } from "lucide-react-native";
import { MotiView } from "moti";
import { useFavoritesStore } from "../store/favoritesStore";
import { haptic } from "../lib/haptics";

interface Props {
  itemId: string;
  size?: number;
  variant?: "overlay" | "plain";
}

export function HeartButton({ itemId, size = 38, variant = "overlay" }: Props) {
  const isFav = useFavoritesStore((s) => s.ids.includes(itemId));
  const toggle = useFavoritesStore((s) => s.toggle);

  const onPress = () => {
    haptic.selection();
    toggle(itemId);
  };

  const bg =
    variant === "overlay"
      ? "rgba(255, 255, 255, 0.88)"
      : isFav
      ? "rgba(196, 110, 77, 0.10)"
      : "rgba(46, 74, 44, 0.08)";

  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      className="items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
      }}
    >
      <MotiView
        key={isFav ? "on" : "off"}
        from={{ scale: isFav ? 0.7 : 1 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", damping: 10, stiffness: 320 }}
      >
        <Heart
          size={Math.round(size * 0.5)}
          color={isFav ? "#C46E4D" : "#3A3F37"}
          fill={isFav ? "#C46E4D" : "transparent"}
          strokeWidth={isFav ? 1.5 : 2}
        />
      </MotiView>
    </Pressable>
  );
}

export function HeartButtonStopProp({ itemId, size, variant }: Props) {
  // Wrapper that swallows the parent press so tapping the heart inside a card
  // doesn't also navigate.
  return (
    <View
      onStartShouldSetResponder={() => true}
      onResponderRelease={(e) => e.stopPropagation()}
    >
      <HeartButton itemId={itemId} size={size} variant={variant} />
    </View>
  );
}
