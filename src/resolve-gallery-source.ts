export type GallerySource = number | { uri: string };

export function resolveGallerySource(
  name: string,
  options: {
    platform: string;
    origin: string;
    bundled: Record<string, number>;
  },
): GallerySource {
  if (options.platform === "web") {
    return { uri: `/img/${name}` };
  }
  const asset = options.bundled[name];
  if (asset !== undefined) {
    return asset;
  }
  return { uri: `${options.origin}/img/${name}` };
}
