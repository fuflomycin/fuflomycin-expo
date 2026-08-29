import { Platform } from "react-native";
import type { Drug } from "../list-build/types";
import embedded from "./data/list.json";
import { WEB_ORIGIN } from "./site";

const bundledGallery = new Set(
  (embedded as Drug[]).flatMap((item) => item.gallery),
);

export function galleryUri(name: string): string {
  if (Platform.OS === "web") {
    return `/img/${name}`;
  }
  if (!bundledGallery.has(name) && WEB_ORIGIN !== "") {
    return `${WEB_ORIGIN}/img/${name}`;
  }
  return `/img/${name}`;
}
