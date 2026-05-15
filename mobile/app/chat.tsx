import { useEffect, useRef } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronDown, Sparkles } from "lucide-react-native";
import { useChatStore } from "../store/chatStore";
import { ChatBubble } from "../components/ChatBubble";
import { ChatInput } from "../components/ChatInput";
import { TypingIndicator } from "../components/TypingIndicator";
import { CartBadge } from "../components/CartBadge";

const SUGGESTIONS = [
  "Build me dinner for two under $60",
  "Spicy chicken sandwich, truffle fries, and a cold brew",
  "What's good and vegetarian?",
  "Add a ribeye medium rare with a glass of red",
];

export default function ChatScreen() {
  const router = useRouter();
  const messages = useChatStore((s) => s.messages);
  const sending = useChatStore((s) => s.sending);
  const send = useChatStore((s) => s.send);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    const id = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(id);
  }, [messages.length, sending]);

  const showSuggestions = messages.length <= 1 && !sending;

  return (
    <SafeAreaView className="flex-1 bg-cream-100" edges={["top", "bottom"]}>
      <View className="px-5 pt-2 pb-3 flex-row items-center justify-between">
        <Pressable onPress={() => router.back()} hitSlop={12} className="p-1.5">
          <ChevronDown size={26} color="#1B1F1A" />
        </Pressable>
        <View className="flex-row items-center gap-1.5">
          <Sparkles size={16} color="#3F5F3C" />
          <Text className="font-serif text-ink-900 text-xl">Assistant</Text>
        </View>
        <CartBadge />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 4 : 0}
        className="flex-1"
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => `${i}`}
          renderItem={({ item }) => <ChatBubble message={item} />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={sending ? <TypingIndicator /> : null}
          className="flex-1"
        />

        {showSuggestions && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 8, alignItems: "center" }}
            style={{ flexGrow: 0, flexShrink: 0, marginBottom: 8 }}
          >
            {SUGGESTIONS.map((s) => (
              <Pressable
                key={s}
                onPress={() => send(s)}
                className="bg-white border border-cream-300 rounded-full px-3.5 py-2 self-center"
              >
                <Text className="font-sans-medium text-ink-700 text-xs">{s}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        <View className="px-4 pb-2">
          <ChatInput onSend={send} disabled={sending} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
