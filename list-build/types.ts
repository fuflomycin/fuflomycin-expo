export type Label = "red" | "orange" | "yellow";

export type Drug = {
  id: string;
  title: string;
  other: string[];
  section: string;
  label: Label;
  source: string;
  contents: string;
  gallery: string[];
  mnn?: string;
};

export type BuildListOptions = {
  cardsDir: string;
  bundlePath: string;
  dataPath: string;
  imagesDir: string;
  nativeAssetsPath: string;
};
