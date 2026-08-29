const PERSIST_KEY = "fuflomycin.working-list";

export const persist = {
  read: async (): Promise<string | null> => {
    try {
      return window.localStorage.getItem(PERSIST_KEY);
    } catch {
      return null;
    }
  },
  write: async (value: string): Promise<void> => {
    window.localStorage.setItem(PERSIST_KEY, value);
  },
};
