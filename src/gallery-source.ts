import { Platform } from "react-native";
import { bundledGallery } from "./data/gallery-assets";
import { resolveGallerySource } from "./resolve-gallery-source";
import { WEB_ORIGIN } from "./site";

export function gallerySource(name: string) {
  return resolveGallerySource(name, {
    platform: Platform.OS,
    origin: WEB_ORIGIN,
    bundled: bundledGallery,
  });
}
