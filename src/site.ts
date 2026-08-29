import Constants from "expo-constants";

export const DIRECTORY_NAME = "Фуфломицины";
export const DIRECTORY_DESCRIPTION = "Расстрельный список препаратов";

function extraWebOrigin(): string {
  const extra = Constants.expoConfig?.extra;
  if (typeof extra !== "object" || extra === null) {
    return "";
  }
  const origin = "webOrigin" in extra ? extra.webOrigin : undefined;
  return typeof origin === "string" ? origin : "";
}

export const WEB_ORIGIN = extraWebOrigin();
