import AsyncStorage from "expo-sqlite/kv-store";

const PERSIST_KEY = "fuflomycin.working-list";

export const persist = {
  read: (): Promise<string | null> => AsyncStorage.getItem(PERSIST_KEY),
  write: (value: string): Promise<void> => AsyncStorage.setItem(PERSIST_KEY, value),
};
