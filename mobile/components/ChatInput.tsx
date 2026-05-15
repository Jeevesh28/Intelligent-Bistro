import { Pressable, TextInput, View } from "react-native";
import { useState } from "react";
import { ArrowUp } from "lucide-react-native";

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState("");

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
  };

  return (
    <View className="flex-row items-end gap-2 bg-white border border-cream-200 rounded-3xl px-4 py-2">
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Ask for anything…"
        placeholderTextColor="#9CA095"
        multiline
        className="flex-1 font-sans text-ink-900 text-[15px] py-2 max-h-32"
        onSubmitEditing={submit}
        editable={!disabled}
      />
      <Pressable
        onPress={submit}
        disabled={disabled || !text.trim()}
        className={`w-10 h-10 rounded-full items-center justify-center ${
          disabled || !text.trim() ? "bg-cream-300" : "bg-forest-600 active:bg-forest-700"
        }`}
      >
        <ArrowUp size={18} color="#FAF7F0" strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}
