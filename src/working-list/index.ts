import type { Drug } from "../../list-build/types";

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
