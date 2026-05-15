import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { Plus } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import type { MenuItem } from "../lib/types";
import { useCartStore } from "../store/cartStore";
import { haptic } from "../lib/haptics";
import { HeartButtonStopProp } from "./HeartButton";
import { StarRating } from "./StarRating";

interface Props {
  item: MenuItem;
  index?: number;
}

const FALLBACK_ACCENT: [string, string] = ["#EDDFC8", "#C09A6B"];

export function MenuItemCard({ item, index = 0 }: Props) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const [imageFailed, setImageFailed] = useState(false);

  const onAdd = async () => {
    haptic.light();
    try {
      await addItem({ item_id: item.id, quantity: 1 });
    } catch {
      // Error handled in store
    }
  };

  const accent = item.accent ?? FALLBACK_ACCENT;
  const useImage = item.image && !imageFailed;

  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 350, delay: Math.min(index * 40, 400) }}
      className="mb-3"
    >
      <Pressable
        onPress={() => router.push(`/item/${item.id}`)}
        className="bg-white rounded-3xl overflow-hidden border border-cream-200 active:opacity-90"
        style={{
          shadowColor: "#0E1A0D",
          shadowOpacity: 0.05,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
        }}
      >
        <View className="relative">
          {useImage ? (
            <View
              style={{
                height: 180,
                width: "100%",
                backgroundColor: accent[0],
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              <Image
                source={{ uri: item.image as string }}
                style={{ height: 180, width: "100%" }}
                resizeMode="cover"
                onError={() => setImageFailed(true)}
              />
            </View>
          ) : (
            <LinearGradient
              colors={accent}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ height: 180, width: "100%" }}
            >
              <View className="flex-1 items-center justify-center">
                <Text style={{ fontSize: 72, lineHeight: 84 }}>{item.emoji ?? "🍽️"}</Text>
              </View>
            </LinearGradient>
          )}

          <Pressable
            onPress={onAdd}
            className="absolute right-3 -bottom-4 w-11 h-11 rounded-full bg-forest-600 active:bg-forest-700 items-center justify-center"
            style={{
              shadowColor: "#0E1A0D",
              shadowOpacity: 0.22,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 3 },
              elevation: 4,
            }}
          >
            <Plus size={22} color="#FAF7F0" strokeWidth={2.5} />
          </Pressable>

          <View className="absolute left-3 top-3">
            <HeartButtonStopProp itemId={item.id} size={34} variant="overlay" />
          </View>
        </View>

        <View className="px-4 pt-3 pb-4 pr-16">
          <View className="flex-row items-baseline justify-between gap-3">
            <Text className="font-serif text-ink-900 text-lg flex-1" numberOfLines={1}>
              {item.name}
            </Text>
            <Text className="font-sans-semibold text-forest-600 text-base">${item.price.toFixed(2)}</Text>
          </View>
          <Text className="font-sans text-ink-500 text-[13px] leading-[18px] mt-1" numberOfLines={2}>
            {item.description}
          </Text>
          {typeof item.rating === "number" && (
            <View className="mt-1.5">
              <StarRating
                rating={item.rating}
                count={item.reviewCount}
                size={12}
                compact
              />
            </View>
          )}
          {item.tags && item.tags.length > 0 && (
            <View className="flex-row flex-wrap gap-1.5 mt-2">
              {item.tags.map((tag) => (
                <View key={tag} className="bg-cream-200 rounded-full px-2 py-0.5">
                  <Text className="font-sans text-ink-700 text-[10px] uppercase tracking-wider">{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </Pressable>
    </MotiView>
  );
}
