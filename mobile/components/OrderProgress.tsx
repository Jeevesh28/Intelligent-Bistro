import { Text, View } from "react-native";
import { Check, ChefHat, Flame, ShoppingBag } from "lucide-react-native";
import { MotiView } from "moti";
import type { ReactNode } from "react";

interface Stage {
  label: string;
  icon: (active: boolean) => ReactNode;
}

const STAGES: Stage[] = [
  {
    label: "Placed",
    icon: (active) => (
      <Check size={16} color={active ? "#FAF7F0" : "#3F5F3C"} strokeWidth={3} />
    ),
  },
  {
    label: "Kitchen",
    icon: (active) => (
      <Flame size={16} color={active ? "#FAF7F0" : "#9CA095"} strokeWidth={2.4} />
    ),
  },
  {
    label: "Plating",
    icon: (active) => (
      <ChefHat size={16} color={active ? "#FAF7F0" : "#9CA095"} strokeWidth={2.4} />
    ),
  },
  {
    label: "Ready",
    icon: (active) => (
      <ShoppingBag size={16} color={active ? "#FAF7F0" : "#9CA095"} strokeWidth={2.4} />
    ),
  },
];

interface Props {
  currentStage: number; // 0..3
}

export function OrderProgress({ currentStage }: Props) {
  const progress = Math.min(1, Math.max(0, currentStage / (STAGES.length - 1)));
  return (
    <View className="w-full">
      <View className="relative" style={{ height: 36 }}>
        {/* Track */}
        <View
          className="absolute bg-cream-200"
          style={{ left: 18, right: 18, top: 17, height: 2, borderRadius: 1 }}
        />
        {/* Filled progress */}
        <MotiView
          from={{ width: "0%" }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ type: "timing", duration: 600 }}
          className="absolute bg-forest-600"
          style={{ left: 18, top: 17, height: 2, borderRadius: 1, maxWidth: "100%" }}
        />
        {/* Nodes */}
        <View className="flex-row items-center justify-between">
          {STAGES.map((stage, i) => {
            const active = i <= currentStage;
            const isCurrent = i === currentStage;
            return (
              <View key={stage.label} className="items-center" style={{ width: 36 }}>
                <MotiView
                  animate={{
                    scale: isCurrent ? 1.08 : 1,
                  }}
                  transition={{ type: "spring", damping: 12 }}
                  className="w-9 h-9 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: active ? "#3F5F3C" : "#F2EBDD",
                    borderWidth: active ? 0 : 1,
                    borderColor: "#E6DBC2",
                  }}
                >
                  {stage.icon(active)}
                </MotiView>
              </View>
            );
          })}
        </View>
      </View>
      <View className="flex-row items-start justify-between mt-2">
        {STAGES.map((stage, i) => {
          const active = i <= currentStage;
          return (
            <View key={stage.label} className="items-center" style={{ width: 64 }}>
              <Text
                className={`font-sans-medium text-[10px] uppercase tracking-[1px] text-center ${
                  active ? "text-forest-600" : "text-ink-400"
                }`}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {stage.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

interface ConfettiProps {
  trigger: number; // change to re-fire
}

const CONFETTI_COLORS = ["#3F5F3C", "#C46E4D", "#D6A21A", "#5C7E5A", "#C9482A", "#7B4E1F"];

export function Confetti({ trigger }: ConfettiProps) {
  if (!trigger) return null;
  const pieces = Array.from({ length: 22 }, (_, i) => i);
  return (
    <View
      pointerEvents="none"
      className="absolute top-0 left-0 right-0 items-center"
      style={{ height: 200 }}
    >
      {pieces.map((i) => {
        const tx = (Math.random() * 2 - 1) * 180;
        const ty = 30 + Math.random() * 160;
        const rot = (Math.random() * 2 - 1) * 360;
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        const w = 4 + Math.random() * 6;
        const h = 8 + Math.random() * 8;
        const delay = Math.random() * 120;
        return (
          <MotiView
            key={`${trigger}-${i}`}
            from={{ translateX: 0, translateY: 0, rotate: "0deg", opacity: 1 }}
            animate={{
              translateX: tx,
              translateY: ty,
              rotate: `${rot}deg`,
              opacity: 0,
            }}
            transition={{ type: "timing", duration: 1200 + Math.random() * 600, delay }}
            style={{
              position: "absolute",
              top: 0,
              width: w,
              height: h,
              borderRadius: 1.5,
              backgroundColor: color,
            }}
          />
        );
      })}
    </View>
  );
}
