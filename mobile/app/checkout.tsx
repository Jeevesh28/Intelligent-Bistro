import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Banknote,
  ChevronDown,
  CreditCard,
  Lock,
  Wallet,
} from "lucide-react-native";
import { MotiView } from "moti";
import { useCartStore } from "../store/cartStore";
import { useOrderStore, type PaymentMethod } from "../store/orderStore";
import {
  detectBrand,
  formatCardNumber,
  formatCvc,
  formatExpiry,
  newOrderId,
  validateCard,
} from "../lib/checkout";
import { haptic } from "../lib/haptics";

const TAX_RATE = 0.0875;
const TIP_PRESETS = [
  { label: "No tip", pct: 0 },
  { label: "15%", pct: 0.15 },
  { label: "18%", pct: 0.18 },
  { label: "20%", pct: 0.2 },
  { label: "25%", pct: 0.25 },
];

export default function CheckoutScreen() {
  const router = useRouter();
  const cart = useCartStore((s) => s.cart);
  const clearCart = useCartStore((s) => s.clear);
  const setLastOrder = useOrderStore((s) => s.setLastOrder);
  const addToHistory = useOrderStore((s) => s.addToHistory);

  const [method, setMethod] = useState<PaymentMethod>("card");

  // Card
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [name, setName] = useState("");

  // Venmo
  const [venmoHandle, setVenmoHandle] = useState("");

  // Tip
  const [tipPct, setTipPct] = useState(0.18);
  const [customTip, setCustomTip] = useState("");
  const [tipMode, setTipMode] = useState<"preset" | "custom">("preset");

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = cart?.subtotal ?? 0;
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const tip = useMemo(() => {
    if (tipMode === "custom") {
      const parsed = parseFloat(customTip.replace(/[^\d.]/g, "")) || 0;
      return Math.round(parsed * 100) / 100;
    }
    return Math.round(subtotal * tipPct * 100) / 100;
  }, [tipMode, tipPct, customTip, subtotal]);
  const total = Math.round((subtotal + tax + tip) * 100) / 100;
  const brand = useMemo(() => detectBrand(number), [number]);

  const onPay = async () => {
    setError(null);

    if (!cart || cart.lines.length === 0) {
      setError("Your cart is empty");
      return;
    }

    if (method === "card") {
      const validation = validateCard({ number, expiry, cvc, name });
      if (!validation.ok) {
        setError(validation.reason ?? "Check your card details");
        haptic.medium();
        return;
      }
    } else if (method === "venmo") {
      if (venmoHandle.trim().length < 2) {
        setError("Enter your Venmo username");
        haptic.medium();
        return;
      }
    }

    haptic.light();
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 1600));

    const orderId = newOrderId();
    const base = {
      id: orderId,
      lines: cart.lines,
      subtotal,
      tax,
      tip,
      total,
      placedAt: Date.now(),
      estimatedReadyMinutes: 18 + Math.floor(Math.random() * 6),
    };

    const placed: import("../store/orderStore").PlacedOrder =
      method === "card"
        ? {
            ...base,
            paymentMethod: "card",
            cardLast4: number.replace(/\D/g, "").slice(-4),
          }
        : method === "venmo"
        ? {
            ...base,
            paymentMethod: "venmo",
            venmoHandle: venmoHandle.replace(/^@/, ""),
          }
        : { ...base, paymentMethod: "cash" };

    setLastOrder(placed);
    addToHistory(placed);

    await clearCart();
    setProcessing(false);
    router.replace("/confirmation");
  };

  const disabled = processing || !cart || cart.lines.length === 0;

  const payLabel =
    method === "cash" ? `Confirm · $${total.toFixed(2)}` : `Pay $${total.toFixed(2)}`;

  return (
    <SafeAreaView className="flex-1 bg-cream-100" edges={["top", "bottom"]}>
      <View className="px-5 pt-2 pb-2 flex-row items-center justify-between">
        <Pressable onPress={() => router.back()} hitSlop={12} disabled={processing} className="p-1.5">
          <ChevronDown size={26} color="#1B1F1A" />
        </Pressable>
        <Text className="font-serif text-ink-900 text-xl">Checkout</Text>
        <View style={{ width: 30 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 4 : 0}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text className="font-serif text-ink-900 text-3xl">${total.toFixed(2)}</Text>
          <Text className="font-sans text-ink-500 text-sm mt-1">Choose how you'd like to pay.</Text>

          <View className="flex-row gap-2 mt-4">
            <MethodTab
              active={method === "card"}
              onPress={() => {
                setMethod("card");
                setError(null);
              }}
              icon={<CreditCard size={16} color={method === "card" ? "#FAF7F0" : "#2E4A2C"} />}
              label="Card"
            />
            <MethodTab
              active={method === "venmo"}
              onPress={() => {
                setMethod("venmo");
                setError(null);
              }}
              icon={<Wallet size={16} color={method === "venmo" ? "#FAF7F0" : "#2E4A2C"} />}
              label="Venmo"
            />
            <MethodTab
              active={method === "cash"}
              onPress={() => {
                setMethod("cash");
                setError(null);
              }}
              icon={<Banknote size={16} color={method === "cash" ? "#FAF7F0" : "#2E4A2C"} />}
              label="Cash"
            />
          </View>

          {method === "card" && (
            <View className="mt-5">
              <CardPreview brand={brand} number={number} name={name} expiry={expiry} />

              <View className="mt-5 gap-3">
                <Field
                  label="Card number"
                  value={number}
                  onChangeText={(t) => setNumber(formatCardNumber(t))}
                  keyboardType="number-pad"
                  placeholder="1234 5678 9012 3456"
                  autoComplete="cc-number"
                  leadingIcon={<CreditCard size={18} color="#6B6F66" />}
                />
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Field
                      label="Expiry"
                      value={expiry}
                      onChangeText={(t) => setExpiry(formatExpiry(t))}
                      keyboardType="number-pad"
                      placeholder="MM/YY"
                      autoComplete="cc-exp"
                    />
                  </View>
                  <View className="flex-1">
                    <Field
                      label="CVC"
                      value={cvc}
                      onChangeText={(t) => setCvc(formatCvc(t))}
                      keyboardType="number-pad"
                      placeholder="123"
                      autoComplete="cc-csc"
                      secureTextEntry
                    />
                  </View>
                </View>
                <Field
                  label="Name on card"
                  value={name}
                  onChangeText={setName}
                  placeholder="Jordan Doe"
                  autoComplete="cc-name"
                  autoCapitalize="words"
                />
              </View>
            </View>
          )}

          {method === "venmo" && (
            <MotiView
              from={{ opacity: 0, translateY: 6 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 240 }}
              className="mt-5"
            >
              <View
                className="rounded-3xl p-5"
                style={{ backgroundColor: "#3D95CE" }}
              >
                <Text className="font-sans-semibold text-white text-xs uppercase tracking-[2px]">
                  Venmo
                </Text>
                <Text className="font-serif text-white text-2xl mt-3">Pay with Venmo</Text>
                <Text className="font-sans text-white/85 text-sm mt-1">
                  We'll send a request to your Venmo username.
                </Text>
              </View>
              <View className="mt-5">
                <Field
                  label="Venmo username"
                  value={venmoHandle}
                  onChangeText={setVenmoHandle}
                  placeholder="@yourhandle"
                  autoCapitalize="none"
                  leadingIcon={<Text className="font-sans-semibold text-ink-500 text-base">@</Text>}
                />
              </View>
            </MotiView>
          )}

          {method === "cash" && (
            <MotiView
              from={{ opacity: 0, translateY: 6 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 240 }}
              className="mt-5"
            >
              <View className="rounded-3xl bg-white border border-cream-200 p-5">
                <View className="flex-row items-center gap-2.5">
                  <View className="w-10 h-10 rounded-full bg-cream-200 items-center justify-center">
                    <Banknote size={20} color="#3F5F3C" />
                  </View>
                  <Text className="font-serif text-ink-900 text-xl">Pay at the counter</Text>
                </View>
                <Text className="font-sans text-ink-500 text-sm mt-3 leading-5">
                  Bring exact change or any amount — the host will settle up when your order is
                  ready.
                </Text>
              </View>
            </MotiView>
          )}

          {/* Tip */}
          <View className="mt-6">
            <Text className="font-sans-medium text-ink-500 text-xs uppercase tracking-[1.5px] mb-2">
              Add a tip
            </Text>
            <View className="flex-row gap-2 flex-wrap">
              {TIP_PRESETS.map((p) => {
                const active = tipMode === "preset" && tipPct === p.pct;
                return (
                  <Pressable
                    key={p.label}
                    onPress={() => {
                      setTipMode("preset");
                      setTipPct(p.pct);
                    }}
                    className={`px-3.5 py-2 rounded-full border ${
                      active ? "bg-forest-600 border-forest-600" : "bg-white border-cream-300"
                    }`}
                  >
                    <Text
                      className={`font-sans-medium text-sm ${
                        active ? "text-cream-100" : "text-ink-700"
                      }`}
                    >
                      {p.label}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => setTipMode("custom")}
                className={`px-3.5 py-2 rounded-full border ${
                  tipMode === "custom"
                    ? "bg-forest-600 border-forest-600"
                    : "bg-white border-cream-300"
                }`}
              >
                <Text
                  className={`font-sans-medium text-sm ${
                    tipMode === "custom" ? "text-cream-100" : "text-ink-700"
                  }`}
                >
                  Custom
                </Text>
              </Pressable>
            </View>
            {tipMode === "custom" && (
              <View className="mt-3">
                <View className="flex-row items-center bg-white border border-cream-200 rounded-2xl px-3.5">
                  <Text className="font-sans-semibold text-ink-500 text-base mr-1">$</Text>
                  <TextInput
                    value={customTip}
                    onChangeText={(t) => setCustomTip(t.replace(/[^\d.]/g, ""))}
                    placeholder="0.00"
                    placeholderTextColor="#9CA095"
                    keyboardType="decimal-pad"
                    className="flex-1 py-3 font-sans text-ink-900 text-[15px]"
                  />
                </View>
              </View>
            )}
          </View>

          <View className="mt-5 bg-white rounded-2xl border border-cream-200 p-4">
            <Row label="Subtotal" value={`$${subtotal.toFixed(2)}`} />
            <Row label="Tax" value={`$${tax.toFixed(2)}`} />
            {tip > 0 && <Row label="Tip" value={`$${tip.toFixed(2)}`} />}
            <View className="h-px bg-cream-200 my-2.5" />
            <Row label="Total" value={`$${total.toFixed(2)}`} emphasized />
          </View>

          {error && (
            <View className="mt-4 bg-terracotta-400/15 rounded-xl px-3.5 py-2.5">
              <Text className="font-sans-medium text-terracotta-600 text-sm">{error}</Text>
            </View>
          )}
        </ScrollView>

        <View className="px-5 pt-3 pb-2 border-t border-cream-200 bg-cream-100">
          <Pressable
            onPress={onPay}
            disabled={disabled}
            className={`rounded-2xl py-4 flex-row items-center justify-center gap-2 ${
              disabled ? "bg-forest-400" : "bg-forest-600 active:bg-forest-700"
            }`}
          >
            {processing ? (
              <>
                <ActivityIndicator color="#FAF7F0" />
                <Text className="font-sans-semibold text-cream-100 text-base ml-1">
                  Processing…
                </Text>
              </>
            ) : (
              <>
                {method !== "cash" && <Lock size={16} color="#FAF7F0" />}
                <Text className="font-sans-semibold text-cream-100 text-base">{payLabel}</Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MethodTab({
  active,
  onPress,
  icon,
  label,
}: {
  active: boolean;
  onPress: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-2xl border ${
        active ? "bg-forest-600 border-forest-600" : "bg-white border-cream-200"
      }`}
    >
      {icon}
      <Text
        className={`font-sans-semibold text-sm ${active ? "text-cream-100" : "text-ink-900"}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "number-pad" | "decimal-pad";
  autoComplete?: string;
  autoCapitalize?: "none" | "sentences" | "words";
  secureTextEntry?: boolean;
  leadingIcon?: React.ReactNode;
}) {
  return (
    <View>
      <Text className="font-sans-medium text-ink-500 text-xs uppercase tracking-[1px] mb-1.5">
        {props.label}
      </Text>
      <View className="flex-row items-center bg-white border border-cream-200 rounded-2xl px-3.5">
        {props.leadingIcon && <View className="mr-2">{props.leadingIcon}</View>}
        <TextInput
          value={props.value}
          onChangeText={props.onChangeText}
          placeholder={props.placeholder}
          placeholderTextColor="#9CA095"
          keyboardType={props.keyboardType ?? "default"}
          autoCapitalize={props.autoCapitalize ?? "none"}
          autoCorrect={false}
          autoComplete={props.autoComplete as never}
          secureTextEntry={props.secureTextEntry}
          className="flex-1 py-3 font-sans text-ink-900 text-[15px]"
        />
      </View>
    </View>
  );
}

function Row({ label, value, emphasized }: { label: string; value: string; emphasized?: boolean }) {
  return (
    <View className="flex-row items-center justify-between py-0.5">
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

function CardPreview({
  brand,
  number,
  name,
  expiry,
}: {
  brand: ReturnType<typeof detectBrand>;
  number: string;
  name: string;
  expiry: string;
}) {
  const display = number.length > 0 ? number.padEnd(19, "•") : "•••• •••• •••• ••••";
  const label =
    brand === "visa"
      ? "VISA"
      : brand === "mastercard"
      ? "Mastercard"
      : brand === "amex"
      ? "Amex"
      : brand === "discover"
      ? "Discover"
      : "Card";
  return (
    <MotiView
      from={{ opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 350 }}
      style={{
        backgroundColor: "#22381F",
        borderRadius: 24,
        padding: 20,
        shadowColor: "#0E1A0D",
        shadowOpacity: 0.2,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
      }}
    >
      <View className="flex-row items-center justify-between">
        <Text className="font-serif text-cream-100 text-base tracking-wider">The Intelligent Bistro</Text>
        <Text className="font-sans-semibold text-cream-100 text-xs uppercase tracking-[2px]">{label}</Text>
      </View>
      <Text className="font-sans-semibold text-cream-100 text-xl tracking-[3px] mt-7">
        {display}
      </Text>
      <View className="flex-row items-end justify-between mt-5">
        <View>
          <Text className="font-sans text-cream-300 text-[10px] uppercase tracking-wider">
            Cardholder
          </Text>
          <Text className="font-sans-medium text-cream-100 text-sm mt-0.5">
            {name.trim() ? name.toUpperCase() : "YOUR NAME"}
          </Text>
        </View>
        <View>
          <Text className="font-sans text-cream-300 text-[10px] uppercase tracking-wider">
            Expires
          </Text>
          <Text className="font-sans-medium text-cream-100 text-sm mt-0.5">
            {expiry || "MM/YY"}
          </Text>
        </View>
      </View>
    </MotiView>
  );
}
