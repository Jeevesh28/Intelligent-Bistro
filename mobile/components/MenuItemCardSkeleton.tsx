import { View } from "react-native";
import { MotiView } from "moti";

/**
 * Shimmering placeholder card matching MenuItemCard's outer shell. Used while
 * the menu is loading so the page has form before content arrives.
 */
export function MenuItemCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <View
      className="mb-3 bg-white rounded-3xl overflow-hidden border border-cream-200"
      style={{
        shadowColor: "#0E1A0D",
        shadowOpacity: 0.04,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      }}
    >
      {/* Image area with shimmer band */}
      <View
        style={{ height: 180, width: "100%", backgroundColor: "#F2EBDD", overflow: "hidden" }}
      >
        <Shimmer delay={index * 80} />
      </View>

      {/* Text rows */}
      <View className="px-4 pt-3 pb-4">
        <View className="flex-row items-baseline justify-between gap-3">
          <View
            className="rounded-md bg-cream-200"
            style={{ height: 18, flex: 1, marginRight: 12 }}
          />
          <View className="rounded-md bg-cream-200" style={{ height: 16, width: 56 }} />
        </View>
        <View className="rounded-md bg-cream-200 mt-2" style={{ height: 12, width: "92%" }} />
        <View className="rounded-md bg-cream-200 mt-1.5" style={{ height: 12, width: "70%" }} />
        <View className="flex-row gap-1.5 mt-3">
          <View className="rounded-full bg-cream-200" style={{ height: 14, width: 60 }} />
          <View className="rounded-full bg-cream-200" style={{ height: 14, width: 48 }} />
        </View>
      </View>
    </View>
  );
}

function Shimmer({ delay = 0 }: { delay?: number }) {
  return (
    <MotiView
      from={{ translateX: -160 }}
      animate={{ translateX: 460 }}
      transition={{
        type: "timing",
        duration: 1300,
        loop: true,
        repeatReverse: false,
        delay,
      }}
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        width: 120,
        backgroundColor: "#FDFBF6",
        opacity: 0.65,
        transform: [{ skewX: "-20deg" }],
      }}
    />
  );
}
