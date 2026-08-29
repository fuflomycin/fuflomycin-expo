import {
  addNetworkStateListener,
  getNetworkStateAsync,
} from "expo-network";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState, Platform } from "react-native";
import type { Drug } from "../../list-build/types";
import embedded from "../data/list.json";
import { WEB_ORIGIN } from "../site";
import {
  createWorkingList,
  type ListFetchResult,
  type WorkingList,
} from "./index";
import { persist } from "./persist";

const WorkingListContext = createContext<WorkingList | null>(null);

function listUrl(): string {
  if (Platform.OS === "web") {
    return "/data/list.json";
  }
  return `${WEB_ORIGIN}/data/list.json`;
}

async function fetchList(): Promise<ListFetchResult> {
  if (Platform.OS !== "web" && WEB_ORIGIN === "") {
    return { ok: false };
  }
  try {
    const response = await fetch(listUrl(), { cache: "no-store" });
    if (!response.ok) {
      return { ok: false };
    }
    return { ok: true, body: await response.text() };
  } catch {
    return { ok: false };
  }
}

export function WorkingListProvider({ children }: { children: ReactNode }) {
  const onlineRef = useRef(true);
  const list = useMemo(
    () =>
      createWorkingList({
        embedded: embedded as Drug[],
        now: () => Date.now(),
        isOnline: () => onlineRef.current,
        persist,
        fetchList,
      }),
    [],
  );

  useEffect(() => {
    void getNetworkStateAsync().then((state) => {
      onlineRef.current = state.isConnected !== false;
    });
    const network = addNetworkStateListener((state) => {
      const next = state.isConnected !== false;
      const wasOffline = !onlineRef.current;
      onlineRef.current = next;
      if (wasOffline && next) {
        void list.considerFetch("online");
      }
    });
    const appState = AppState.addEventListener("change", (status) => {
      if (status === "active") {
        void list.considerFetch("foreground");
      }
    });
    return () => {
      network.remove();
      appState.remove();
    };
  }, [list]);

  return (
    <WorkingListContext.Provider value={list}>
      {children}
    </WorkingListContext.Provider>
  );
}

function requireWorkingList(): WorkingList {
  const list = useContext(WorkingListContext);
  if (list === null) {
    throw new Error("WorkingListProvider is missing");
  }
  return list;
}

export function useWorkingList(): WorkingList {
  const list = requireWorkingList();
  const [, setGeneration] = useState(0);
  useEffect(
    () =>
      list.subscribe(() => {
        setGeneration((generation) => generation + 1);
      }),
    [list],
  );
  return list;
}

export function useWorkingListHandle(): WorkingList {
  return requireWorkingList();
}
