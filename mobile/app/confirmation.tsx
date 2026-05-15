import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Check, Clock } from "lucide-react-native";
import { MotiView } from "moti";
import { useOrderStore } from "../store/orderStore";
import { OrderProgress, Confetti } from "../components/OrderProgress";

const STAGE_HEADLINES = [
  { title: "Placed", sub: "Thanks — the kitchen has it." },
  { title: "In the kitchen", sub: "Your food just hit the line." },
  { title: "Plating up", sub: "Almost ready — adding the finishing touches." },
  { title: "Ready for pickup", sub: "Come grab it whenever you're ready." },
];

const STAGE_DURATIONS_MS = [0, 3000, 3000, 3000]; // delay before entering each stage

export default function ConfirmationScreen() {
  const router = useRouter();
  const order = useOrderStore((s) => s.lastOrder);

  const [stage, setStage] = useState(0);
  const [confettiKey, setConfettiKey] = useState(0);

  useEffect(() => {
    if (!order) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 0;
    for (let i = 1; i < STAGE_DURATIONS_MS.length; i++) {
      elapsed += STAGE_DURATIONS_MS[i];
      timers.push(
        setTimeout(() => {
          setStage(i);
          if (i === STAGE_DURATIONS_MS.length - 1) setConfettiKey(Date.now());
        }, elapsed),
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [order?.id]);

  const totalMs = STAGE_DURATIONS_MS.reduce((a, b) => a + b, 0);
  const targetReadyAt = useMemo(
    () => (order ? order.placedAt + totalMs : 0),
    [order?.id, order?.placedAt, totalMs],
  );

  const [nowMs, setNowMs] = useState(Date.now());
  useEffect(() => {
    if (!order) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [order?.id]);

  if (!order) {
    return (
      <SafeAreaView className="flex-1 bg-cream-100 items-center justify-center px-8">
        <Text className="font-serif text-ink-900 text-xl text-center">No order to show</Text>
        <Pressable
          onPress={() => router.replace("/")}
          className="mt-5 bg-forest-600 active:bg-forest-700 rounded-2xl px-5 py-3"
        >
          <Text className="font-sans-semibold text-cream-100">Back to menu</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const headline = STAGE_HEADLINES[stage];
  const remainingMs = Math.max(0, targetReadyAt - nowMs);
  const remainingMin = Math.floor(remainingMs / 60000);
  const remainingSec = Math.floor((remainingMs % 60000) / 1000);
  const countdown = stage < 3 ? `${remainingMin}:${String(remainingSec).padStart(2, "0")}` : "Now";

  return (
    <SafeAreaView className="flex-1 bg-cream-100" edges={["top", "bottom"]}>
      <Confetti trigger={confettiKey} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center mt-6">
          <MotiView
            from={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 12, stiffness: 180 }}
            className="w-20 h-20 rounded-full bg-forest-600 items-center justify-center"
            style={{
              shadowColor: "#0E1A0D",
              shadowOpacity: 0.2,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
            }}
          >
            <Check size={40} color="#FAF7F0" strokeWidth={3} />
          </MotiView>
          <MotiView
            key={stage}
            from={{ opacity: 0, translateY: 6 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 280 }}
          >
            <Text className="font-serif text-ink-900 text-3xl text-center mt-5">
              {headline.title}
            </Text>
            <Text className="font-sans text-ink-500 text-sm text-center mt-1.5">
              {headline.sub}
            </Text>
          </MotiView>
        </View>

        <View className="mt-7 px-1">
          <OrderProgress currentStage={stage} />
        </View>

        <MotiView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 320, delay: 200 }}
          className="mt-6 bg-white border border-cream-200 rounded-3xl p-5"
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="font-sans-medium text-ink-500 text-[11px] uppercase tracking-[1.5px]">
                Order
              </Text>
              <Text className="font-serif text-ink-900 text-2xl mt-0.5">#{order.id}</Text>
            </View>
            <View className="flex-row items-center gap-1.5 bg-cream-200 rounded-full px-3 py-1.5">
              <Clock size={13} color="#3F5F3C" />
              <Text className="font-sans-medium text-forest-600 text-xs">
                {stage < 3 ? `Ready in ${countdown}` : "Ready now"}
              </Text>
            </View>
          </View>

          <View className="h-px bg-cream-200 my-4" />

          <View className="gap-2.5">
            {order.lines.map((line) => {
              const details = [line.size, ...(line.modifiers ?? [])].filter(Boolean).join(" · ");
              return (
                <View key={line.lineId} className="flex-row items-start justify-between gap-3">
                  <View className="flex-row items-start gap-2.5 flex-1">
                    <View className="bg-cream-200 rounded-md min-w-[28px] h-6 px-1.5 items-center justify-center">
                      <Text className="font-sans-semibold text-forest-600 text-xs">
                        {line.quantity}×
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="font-sans-medium text-ink-900 text-[15px]">{line.name}</Text>
                      {details ? (
                        <Text className="font-sans text-ink-500 text-xs mt-0.5">{details}</Text>
                      ) : null}
                    </View>
                  </View>
                  <Text className="font-sans-medium text-ink-900 text-sm">
                    ${(line.price * line.quantity).toFixed(2)}
                  </Text>
                </View>
              );
            })}
          </View>

          <View className="h-px bg-cream-200 my-4" />

          <Row label="Subtotal" value={`$${order.subtotal.toFixed(2)}`} />
          <Row label="Tax" value={`$${order.tax.toFixed(2)}`} />
          {order.tip > 0 && <Row label="Tip" value={`$${order.tip.toFixed(2)}`} />}
          <View className="h-px bg-cream-200 my-2.5" />
          <Row label="Total" value={`$${order.total.toFixed(2)}`} emphasized />

          <View className="mt-4">
            <Text className="font-sans text-ink-500 text-xs">
              {order.paymentMethod === "card" &&
                `Charged to •••• ${order.cardLast4 ?? ""}`}
              {order.paymentMethod === "venmo" &&
                `Venmo request sent to @${order.venmoHandle ?? ""}`}
              {order.paymentMethod === "cash" && "Pay in cash at the counter"}
            </Text>
          </View>
        </MotiView>
      </ScrollView>

      <View className="px-5 pt-3 pb-2 bg-cream-100 border-t border-cream-200">
        <Pressable
          onPress={() => router.replace("/")}
          className="bg-forest-600 active:bg-forest-700 rounded-2xl py-4 items-center"
        >
          <Text className="font-sans-semibold text-cream-100 text-base">
            {stage === 3 ? "Order something else" : "Back to menu"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Row({ label, value, emphasized }: { label: string; value: string; emphasized?: boolean }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text
        className={`font-sans ${
          emphasized ? "font-sans-semibold text-ink-900 text-base" : "text-ink-500 text-sm"
        }`}
      >
        {label}
      </Text>
      <Text
        className={`${
          emphasized ? "font-serif text-ink-900 text-xl" : "font-sans-medium text-ink-900 text-sm"
        }`}
      >
        {value}
      </Text>
    </View>
  );
}
