import AsyncStorage from "@react-native-async-storage/async-storage";
import "react-native-get-random-values";
import { v4 as uuid } from "uuid";

const KEY = "bistro.sessionId";

let cached: string | null = null;

export async function getSessionId(): Promise<string> {
  if (cached) return cached;
  const existing = await AsyncStorage.getItem(KEY);
  if (existing) {
    cached = existing;
    return existing;
  }
  const fresh = uuid();
  await AsyncStorage.setItem(KEY, fresh);
  cached = fresh;
  return fresh;
}

export async function resetSessionId(): Promise<string> {
  const fresh = uuid();
  await AsyncStorage.setItem(KEY, fresh);
  cached = fresh;
  return fresh;
}
