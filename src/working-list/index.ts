import type { Drug } from "../../list-build/types";

export type ListFetchResult = { ok: false } | { ok: true; body: string };

export type WorkingListPersist = {
  read: () => Promise<string | null>;
  write: (value: string) => Promise<void>;
};

export type WorkingListPorts = {
  embedded: readonly Drug[];
  now: () => number;
  isOnline: () => boolean;
  persist: WorkingListPersist;
  fetchList: () => Promise<ListFetchResult>;
};

export type FetchTrigger = "surface" | "foreground" | "online";

export type WorkingList = {
  hydrate: () => Promise<void>;
  considerFetch: (trigger: FetchTrigger) => Promise<void>;
  filter: (query: string) => FilteredWorkingList;
  lookup: (id: string) => DrugLookup;
  leaveDrug: () => void;
  subscribe: (listener: () => void) => () => void;
};

type PersistRecord = {
  fingerprint: string;
  succeededAt: number;
  drugs: Drug[];
};

const LABELS = new Set(["red", "orange", "yellow"]);
const DAY_MS = 24 * 60 * 60 * 1000;

export function createWorkingList(ports: WorkingListPorts): WorkingList {
  let current: readonly Drug[] = ports.embedded;
  let succeededAt: number | null = null;
  let ready = false;
  let openCard: { id: string; result: DrugLookup } | null = null;
  const listeners = new Set<() => void>();
  let fetchInFlight = false;

  function notify() {
    for (const listener of listeners) {
      listener();
    }
  }

  const hydrating = (async () => {
    let raw: string | null = null;
    try {
      raw = await ports.persist.read();
    } catch {
      raw = null;
    }
    const record = parsePersist(raw, fingerprintOf(ports.embedded));
    if (record === null) {
      current = ports.embedded;
      succeededAt = null;
      ready = true;
      notify();
      return;
    }
    current = record.drugs;
    succeededAt = record.succeededAt;
    ready = true;
    notify();
  })();

  return {
    hydrate() {
      return hydrating;
    },

    async considerFetch(_trigger: FetchTrigger) {
      await hydrating;
      if (fetchInFlight) {
        return;
      }
      if (!ports.isOnline()) {
        return;
      }
      if (succeededAt !== null && ports.now() - succeededAt < DAY_MS) {
        return;
      }
      fetchInFlight = true;
      try {
        const result = await ports.fetchList();
        if (!result.ok) {
          return;
        }
        const drugs = parseFetchedList(result.body);
        if (drugs === null) {
          return;
        }
        const at = ports.now();
        const record: PersistRecord = {
          fingerprint: fingerprintOf(ports.embedded),
          succeededAt: at,
          drugs,
        };
        try {
          await ports.persist.write(JSON.stringify(record));
        } catch {
          // In-memory overlay still applies; next launch will use the floor.
        }
        current = drugs;
        succeededAt = at;
        notify();
      } finally {
        fetchInFlight = false;
      }
    },

    filter(query: string) {
      return filterWorkingList(current, query);
    },

    lookup(id: string) {
      if (openCard !== null && openCard.id === id) {
        return openCard.result;
      }
      const result = lookupWorkingList(current, id);
      if (ready) {
        openCard = { id, result };
      }
      return result;
    },

    leaveDrug() {
      openCard = null;
    },

    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

function fingerprintOf(drugs: readonly Drug[]): string {
  const source = JSON.stringify(drugs);
  let hash = 5381;
  for (let i = 0; i < source.length; i++) {
    hash = (hash * 33) ^ source.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

function parsePersist(
  raw: string | null,
  expectedFingerprint: string,
): PersistRecord | null {
  if (raw === null || raw === "") {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return null;
    }
    const record = parsed as Record<string, unknown>;
    if (record.fingerprint !== expectedFingerprint) {
      return null;
    }
    if (typeof record.succeededAt !== "number" || !Number.isFinite(record.succeededAt)) {
      return null;
    }
    const drugs = asDrugList(record.drugs);
    if (drugs === null) {
      return null;
    }
    return {
      fingerprint: expectedFingerprint,
      succeededAt: record.succeededAt,
      drugs,
    };
  } catch {
    return null;
  }
}

function parseFetchedList(body: string): Drug[] | null {
  try {
    return asDrugList(JSON.parse(body));
  } catch {
    return null;
  }
}

function asDrugList(value: unknown): Drug[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }
  const drugs: Drug[] = [];
  for (const item of value) {
    const drug = asDrug(item);
    if (drug === null) {
      return null;
    }
    drugs.push(drug);
  }
  return drugs;
}

function asDrug(value: unknown): Drug | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const item = value as Record<string, unknown>;
  if (typeof item.id !== "string" || item.id === "") {
    return null;
  }
  if (typeof item.title !== "string") {
    return null;
  }
  if (!Array.isArray(item.other) || item.other.some((entry) => typeof entry !== "string")) {
    return null;
  }
  if (typeof item.section !== "string") {
    return null;
  }
  if (typeof item.label !== "string" || !LABELS.has(item.label)) {
    return null;
  }
  if (typeof item.source !== "string") {
    return null;
  }
  if (typeof item.contents !== "string") {
    return null;
  }
  if (
    !Array.isArray(item.gallery) ||
    item.gallery.some((entry) => typeof entry !== "string")
  ) {
    return null;
  }
  const drug: Drug = {
    id: item.id,
    title: item.title,
    other: item.other as string[],
    section: item.section,
    label: item.label as Drug["label"],
    source: item.source,
    contents: item.contents,
    gallery: item.gallery as string[],
  };
  if (item.mnn !== undefined) {
    if (typeof item.mnn !== "string") {
      return null;
    }
    if (item.mnn !== "") {
      drug.mnn = item.mnn;
    }
  }
  return drug;
}

export type FilteredWorkingList = {
  drugs: readonly Drug[];
  notice: string | null;
};

export type DrugLookup = {
  drug: Drug | null;
  notice: string | null;
};

export type MnnSearch = {
  mnn: string;
  cochraneUrl: string;
  pubmedUrl: string;
};

const MISSING_NOTICE = "В списке такого нет.";

export function mnnSearch(drug: Drug): MnnSearch | null {
  if (drug.mnn === undefined || drug.mnn === "") {
    return null;
  }
  const encoded = encodeURIComponent(drug.mnn);
  return {
    mnn: drug.mnn,
    cochraneUrl: `https://www.cochranelibrary.com/advanced-search?q=${encoded}&t=1`,
    pubmedUrl: `https://pubmed.ncbi.nlm.nih.gov/?term=${encoded}&filter=pubt.meta-analysis&filter=pubt.randomizedcontrolledtrial`,
  };
}

export function lookupWorkingList(
  drugs: readonly Drug[],
  id: string,
): DrugLookup {
  const drug = drugs.find((item) => item.id === id);
  if (drug === undefined) {
    return { drug: null, notice: MISSING_NOTICE };
  }
  return { drug, notice: null };
}

export function filterWorkingList(
  drugs: readonly Drug[],
  query: string,
): FilteredWorkingList {
  if (query === "") {
    return { drugs, notice: null };
  }
  const needle = normalize(query);
  if (needle === "") {
    return { drugs: [], notice: MISSING_NOTICE };
  }
  const matches = drugs.filter((item) => matchesQuery(item, needle));
  if (matches.length === 0) {
    return { drugs: [], notice: MISSING_NOTICE };
  }
  return { drugs: matches, notice: null };
}

function matchesQuery(item: Drug, needle: string): boolean {
  if (containsNeedle(item.title, needle)) {
    return true;
  }
  if (item.other.some((synonym) => containsNeedle(synonym, needle))) {
    return true;
  }
  return item.mnn !== undefined && containsNeedle(item.mnn, needle);
}

function containsNeedle(value: string, needle: string): boolean {
  return normalize(value).includes(needle);
}

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "shch",
  ы: "y",
  э: "e",
  ю: "yu",
  я: "ya",
  ъ: "",
  ь: "",
};

function normalize(value: string): string {
  const folded = value.toLowerCase().replaceAll("ё", "е");
  let result = "";
  for (const char of folded) {
    result += Object.hasOwn(CYRILLIC_TO_LATIN, char)
      ? CYRILLIC_TO_LATIN[char]!
      : char;
  }
  return result;
}
