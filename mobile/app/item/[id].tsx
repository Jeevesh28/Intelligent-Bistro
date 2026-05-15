import { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Minus, Plus } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";
import { api } from "../../lib/api";
import type { MenuItem } from "../../lib/types";
import { useCartStore } from "../../store/cartStore";
import { haptic } from "../../lib/haptics";
import { HeartButton } from "../../components/HeartButton";
import { StarRating } from "../../components/StarRating";
import { priceForSize, computeUnitPrice } from "../../lib/pricing";

const FALLBACK_ACCENT: [string, string] = ["#EDDFC8", "#C09A6B"];

export default function ItemDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useQuery({ queryKey: ["menu"], queryFn: api.getMenu });

  const item: MenuItem | undefined = useMemo(
    () => data?.items.find((i) => i.id === id),
    [data, id],
  );

  const [quantity, setQuantity] = useState(1);
  const [selectedMods, setSelectedMods] = useState<string[]>([]);
  const [size, setSize] = useState<"small" | "medium" | "large" | undefined>();
  const [busy, setBusy] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const addItem = useCartStore((s) => s.addItem);
  const accent = item?.accent ?? FALLBACK_ACCENT;

  const pairingItems = useMemo(() => {
    if (!data || !item?.pairings) return [];
    return item.pairings
      .map((pid) => data.items.find((i) => i.id === pid))
      .filter((i): i is MenuItem => !!i);
  }, [data, item]);

  if (!data) {
    return (
      <SafeAreaView className="flex-1 bg-cream-100 items-center justify-center">
        <Text className="font-sans text-ink-500">Loading…</Text>
      </SafeAreaView>
    );
  }

  if (!item) {
    return (
      <SafeAreaView className="flex-1 bg-cream-100 items-center justify-center px-8">
        <Text className="font-serif text-ink-900 text-xl text-center">Not on the menu</Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-4 bg-forest-600 rounded-2xl px-4 py-3"
        >
          <Text className="font-sans-semibold text-cream-100">Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const isDrink = item.category === "drinks";
  const drinkSizes = ["small", "medium", "large"] as const;
  // Hide s/m/l selector if the item has its own size-like group (wine "pour", etc.)
  const hasOwnSizeGroup =
    item.modifierGroups?.some((g) => g.id === "pour" || g.id === "size") ?? false;
  const showSizes = isDrink && !hasOwnSizeGroup;

  const toggleInGroup = (
    groupId: string,
    groupType: "single" | "multi",
    name: string,
  ) => {
    haptic.selection();
    setSelectedMods((prev) => {
      if (groupType === "single") {
        const groupOptions =
          item.modifierGroups?.find((g) => g.id === groupId)?.options.map((o) => o.name) ?? [];
        const withoutGroup = prev.filter((m) => !groupOptions.includes(m));
        if (prev.includes(name)) return withoutGroup;
        return [...withoutGroup, name];
      }
      return prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name];
    });
  };

  const unitPrice = computeUnitPrice(
    item.price,
    size,
    selectedMods,
    item.modifierGroups,
  );
  const linePrice = unitPrice * quantity;

  const onAdd = async () => {
    if (busy) return;
    haptic.light();
    setBusy(true);
    try {
      await addItem({
        item_id: item.id,
        quantity,
        modifiers: selectedMods.length ? selectedMods : undefined,
        size,
      });
      router.back();
    } catch {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-cream-100" edges={["bottom"]}>
      <View className="flex-1">
        <View
          className="relative"
          style={{ height: 280, width: "100%", backgroundColor: accent[0] }}
        >
          {item.image && !imageFailed ? (
            <>
              <Image
                source={{ uri: item.image }}
                style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
                resizeMode="cover"
                onError={() => setImageFailed(true)}
              />
              <LinearGradient
                colors={["rgba(0,0,0,0.4)", "rgba(0,0,0,0)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 0.65 }}
                style={{ position: "absolute", left: 0, right: 0, top: 0, height: 140 }}
                pointerEvents="none"
              />
            </>
          ) : (
            <LinearGradient
              colors={accent}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            >
              <View className="flex-1 items-center justify-center">
                <MotiView
                  from={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", damping: 14, stiffness: 180 }}
                >
                  <Text style={{ fontSize: 120, lineHeight: 130 }}>{item.emoji ?? "🍽️"}</Text>
                </MotiView>
              </View>
            </LinearGradient>
          )}
          <SafeAreaView edges={["top"]} className="flex-1">
            <View className="px-5 pt-2 flex-row items-start justify-between">
              <Pressable
                onPress={() => router.back()}
                hitSlop={12}
                className="w-10 h-10 rounded-full bg-white/85 items-center justify-center"
              >
                <ChevronDown size={22} color="#1B1F1A" />
              </Pressable>
              <View className="flex-row items-start gap-1.5">
                {item.tags && item.tags.length > 0 && (
                  <View className="flex-row gap-1.5 mt-1">
                    {item.tags.slice(0, 2).map((tag) => (
                      <View key={tag} className="bg-white/85 rounded-full px-2.5 py-1">
                        <Text className="font-sans-medium text-ink-700 text-[10px] uppercase tracking-wider">
                          {tag}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
                <HeartButton itemId={item.id} size={40} variant="overlay" />
              </View>
            </View>
          </SafeAreaView>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-row items-baseline justify-between">
            <Text className="font-serif text-ink-900 text-2xl flex-1 mr-3">{item.name}</Text>
            <Text className="font-serif text-forest-600 text-2xl">${item.price.toFixed(2)}</Text>
          </View>
          <Text className="font-sans text-ink-700 text-[15px] leading-[22px] mt-2">
            {item.description}
          </Text>

          {typeof item.rating === "number" && (
            <View className="mt-3">
              <StarRating
                rating={item.rating}
                count={item.reviewCount}
                size={14}
              />
            </View>
          )}

          {item.longDescription && (
            <View className="mt-4 bg-white/70 border border-cream-200 rounded-2xl p-4">
              <Text className="font-sans-medium text-forest-600 text-[10px] uppercase tracking-[2px]">
                From the kitchen
              </Text>
              <Text className="font-sans text-ink-700 text-[14px] leading-[21px] mt-2">
                {item.longDescription}
              </Text>
            </View>
          )}

          {item.ingredients && item.ingredients.length > 0 && (
            <View className="mt-5">
              <Text className="font-sans-medium text-ink-500 text-[10px] uppercase tracking-[2px] mb-2">
                Ingredients
              </Text>
              <View className="flex-row flex-wrap gap-1.5">
                {item.ingredients.map((ing) => (
                  <View key={ing} className="bg-cream-200/80 rounded-full px-3 py-1.5">
                    <Text className="font-sans text-ink-700 text-xs">{ing}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {item.allergens && item.allergens.length > 0 && (
            <Text className="font-sans text-ink-500 text-xs mt-3">
              Contains: {item.allergens.join(", ")}
            </Text>
          )}

          {item.reviews && item.reviews.length > 0 && (
            <View className="mt-6">
              <View className="flex-row items-baseline justify-between mb-3">
                <Text className="font-sans-medium text-ink-500 text-[10px] uppercase tracking-[2px]">
                  What others are saying
                </Text>
                {typeof item.reviewCount === "number" && (
                  <Text className="font-sans text-ink-400 text-[10px] uppercase tracking-wider">
                    {item.reviewCount} reviews
                  </Text>
                )}
              </View>
              <View className="gap-2.5">
                {item.reviews.map((rev, i) => (
                  <View
                    key={`${rev.name}-${i}`}
                    className="bg-white border border-cream-200 rounded-2xl p-3.5"
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        <View className="w-7 h-7 rounded-full bg-cream-200 items-center justify-center">
                          <Text className="font-sans-semibold text-ink-700 text-[11px]">
                            {rev.name.charAt(0)}
                          </Text>
                        </View>
                        <Text className="font-sans-semibold text-ink-900 text-[13px]">
                          {rev.name}
                        </Text>
                      </View>
                      <StarRating
                        rating={rev.stars}
                        showNumber={false}
                        size={11}
                      />
                    </View>
                    <Text className="font-sans text-ink-700 text-[13px] leading-[19px] mt-2">
                      {rev.text}
                    </Text>
                    {rev.date && (
                      <Text className="font-sans text-ink-400 text-[11px] mt-1.5">{rev.date}</Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          {showSizes && (
            <View className="mt-6">
              <Text className="font-sans-medium text-ink-500 text-[10px] uppercase tracking-[2px] mb-2">
                Size
              </Text>
              <View className="flex-row gap-2">
                {drinkSizes.map((s) => {
                  const on = size === s;
                  const sizePrice = priceForSize(item.price, s);
                  return (
                    <Pressable
                      key={s}
                      onPress={() => {
                        haptic.selection();
                        setSize(on ? undefined : s);
                      }}
                      className={`flex-1 py-2.5 rounded-2xl border items-center ${
                        on ? "bg-forest-700 border-forest-700" : "bg-white border-cream-200"
                      }`}
                    >
                      <Text
                        className={`font-sans-semibold text-sm capitalize ${
                          on ? "text-cream-100" : "text-ink-900"
                        }`}
                      >
                        {s}
                      </Text>
                      <Text
                        className={`font-sans text-[11px] mt-0.5 ${
                          on ? "text-cream-100/80" : "text-ink-500"
                        }`}
                      >
                        ${sizePrice.toFixed(2)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {item.modifierGroups?.map((group) => (
            <View key={group.id} className="mt-6">
              <View className="flex-row items-baseline justify-between mb-2">
                <Text className="font-sans-medium text-ink-500 text-[10px] uppercase tracking-[2px]">
                  {group.label}
                </Text>
                <Text className="font-sans text-ink-400 text-[10px] uppercase tracking-wider">
                  {group.type === "single" ? "Pick one" : "Pick any"}
                </Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {group.options.map((opt) => {
                  const on = selectedMods.includes(opt.name);
                  const hasPrice = typeof opt.price === "number" && opt.price !== 0;
                  const priceLabel = hasPrice
                    ? `${(opt.price ?? 0) >= 0 ? "+" : "−"}$${Math.abs(opt.price ?? 0).toFixed(2)}`
                    : null;
                  return (
                    <Pressable
                      key={opt.name}
                      onPress={() => toggleInGroup(group.id, group.type, opt.name)}
                      className={`flex-row items-center gap-1.5 px-3.5 py-2 rounded-full border ${
                        on
                          ? "bg-forest-700 border-forest-700"
                          : "bg-white border-cream-300"
                      }`}
                    >
                      <Text
                        className={`font-sans-medium text-xs ${
                          on ? "text-cream-100" : "text-ink-700"
                        }`}
                      >
                        {opt.name}
                      </Text>
                      {priceLabel && (
                        <Text
                          className={`font-sans-semibold text-[11px] ${
                            on ? "text-cream-100/85" : "text-forest-600"
                          }`}
                        >
                          {priceLabel}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          <View className="mt-7 flex-row items-center justify-between bg-white border border-cream-200 rounded-2xl px-3 py-2.5">
            <Text className="font-sans-medium text-ink-700 text-sm">Quantity</Text>
            <View className="flex-row items-center gap-3">
              <Pressable
                onPress={() => {
                  haptic.selection();
                  setQuantity((q) => Math.max(1, q - 1));
                }}
                className="w-9 h-9 rounded-full bg-cream-200 items-center justify-center"
              >
                <Minus size={16} color="#2E4A2C" strokeWidth={2.5} />
              </Pressable>
              <Text className="font-sans-semibold text-ink-900 text-base w-6 text-center">
                {quantity}
              </Text>
              <Pressable
                onPress={() => {
                  haptic.selection();
                  setQuantity((q) => Math.min(99, q + 1));
                }}
                className="w-9 h-9 rounded-full bg-forest-600 items-center justify-center"
              >
                <Plus size={16} color="#FAF7F0" strokeWidth={2.5} />
              </Pressable>
            </View>
          </View>

          {pairingItems.length > 0 && (
            <View className="mt-7">
              <Text className="font-sans-medium text-ink-500 text-[10px] uppercase tracking-[2px] mb-2">
                Pairs well with
              </Text>
              <View className="gap-2">
                {pairingItems.map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() => router.replace(`/item/${p.id}`)}
                    className="flex-row items-center bg-white border border-cream-200 rounded-2xl p-3 active:opacity-80"
                  >
                    <View
                      className="w-11 h-11 rounded-xl items-center justify-center mr-3"
                      style={{ backgroundColor: (p.accent?.[0] ?? "#EDDFC8") }}
                    >
                      <Text style={{ fontSize: 24, lineHeight: 28 }}>{p.emoji ?? "🍽️"}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="font-sans-medium text-ink-900 text-[14px]">{p.name}</Text>
                      <Text className="font-sans text-ink-500 text-xs mt-0.5" numberOfLines={1}>
                        {p.description}
                      </Text>
                    </View>
                    <Text className="font-sans-semibold text-forest-600 text-sm ml-2">
                      ${p.price.toFixed(2)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        <View className="px-5 pt-3 pb-2 border-t border-cream-200 bg-cream-100">
          <Pressable
            onPress={onAdd}
            disabled={busy}
            className={`rounded-2xl py-4 flex-row items-center justify-center ${
              busy ? "bg-forest-400" : "bg-forest-600 active:bg-forest-700"
            }`}
          >
            <Text className="font-sans-semibold text-cream-100 text-base">
              Add {quantity > 1 ? `${quantity} ` : ""}to order · ${linePrice.toFixed(2)}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
