import { Pressable, TextInput, View } from "react-native";
import { Search, X } from "lucide-react-native";

interface Props {
  value: string;
  onChangeText: (v: string) => void;
}

export function SearchBar({ value, onChangeText }: Props) {
  return (
    <View className="px-5 pt-1 pb-2">
      <View className="flex-row items-center bg-white/80 border border-cream-300 rounded-full px-3.5 py-2">
        <Search size={16} color="#6B6F66" />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Search dishes, ingredients…"
          placeholderTextColor="#9CA095"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          className="flex-1 ml-2 mr-1 py-1 font-sans text-ink-900 text-[14px]"
        />
        {value.length > 0 && (
          <Pressable onPress={() => onChangeText("")} hitSlop={8} className="p-1">
            <X size={16} color="#6B6F66" />
          </Pressable>
        )}
      </View>
    </View>
  );
}
