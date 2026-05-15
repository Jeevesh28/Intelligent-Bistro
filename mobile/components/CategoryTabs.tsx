import { useEffect, useRef, useState } from "react";
import { LayoutChangeEvent, Pressable, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { Category } from "../lib/types";

interface Props {
  categories: Category[];
  active: string;
  onChange: (id: string) => void;
}

const CATEGORY_EMOJI: Record<string, string> = {
  starters: "🍽️",
  mains: "🍲",
  sandwiches: "🥪",
  salads: "🥗",
  sides: "🍟",
  drinks: "🥤",
  desserts: "🍰",
};

export function CategoryTabs({ categories, active, onChange }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const itemLayouts = useRef<Record<string, { x: number; width: number }>>({});
  const [containerWidth, setContainerWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [scrollX, setScrollX] = useState(0);

  const onItemLayout = (id: string, e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    itemLayouts.current[id] = { x, width };
  };

  useEffect(() => {
    const layout = itemLayouts.current[active];
    if (!layout || !containerWidth) return;
    const target = Math.max(0, layout.x - (containerWidth - layout.width) / 2);
    const max = Math.max(0, contentWidth - containerWidth);
    scrollRef.current?.scrollTo({ x: Math.min(target, max), animated: true });
  }, [active, containerWidth, contentWidth]);

  const showLeftFade = scrollX > 4;
  const showRightFade = contentWidth - containerWidth - scrollX > 4;

  return (
    <View
      className="relative"
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={(e) => setScrollX(e.nativeEvent.contentOffset.x)}
        onContentSizeChange={(w) => setContentWidth(w)}
        scrollEventThrottle={32}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8, alignItems: "center" }}
        style={{ flexGrow: 0, flexShrink: 0, paddingVertical: 8 }}
      >
        {categories.map((cat) => {
          const isActive = cat.id === active;
          const emoji = CATEGORY_EMOJI[cat.id] ?? "🍽️";
          return (
            <Pressable
              key={cat.id}
              onPress={() => onChange(cat.id)}
              onLayout={(e) => onItemLayout(cat.id, e)}
              className={`self-center flex-row items-center gap-1.5 pl-3 pr-4 py-2 rounded-full border ${
                isActive ? "bg-forest-700 border-forest-700" : "bg-white border-cream-300"
              }`}
            >
              <Text style={{ fontSize: 14 }}>{emoji}</Text>
              <Text
                className={`font-sans-semibold text-sm ${
                  isActive ? "text-cream-100" : "text-ink-700"
                }`}
              >
                {cat.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {showLeftFade && (
        <LinearGradient
          colors={["rgba(250,247,240,1)", "rgba(250,247,240,0)"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          pointerEvents="none"
          style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 22 }}
        />
      )}
      {showRightFade && (
        <LinearGradient
          colors={["rgba(250,247,240,0)", "rgba(250,247,240,1)"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          pointerEvents="none"
          style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 22 }}
        />
      )}
    </View>
  );
}
