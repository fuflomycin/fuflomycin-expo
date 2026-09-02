import { mkdir, readdir, readFile, copyFile, writeFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";
import type { BuildListOptions, Drug, Label } from "./types";

export type { BuildListOptions, Drug, Label } from "./types";

const LABELS = new Set<Label>(["red", "orange", "yellow"]);
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export async function buildList(options: BuildListOptions): Promise<Drug[]> {
  const drugs: Drug[] = [];
  const images: string[] = [];

  let categoryDirs: Array<{ name: string; isDirectory(): boolean }> = [];
  try {
    categoryDirs = await readdir(options.cardsDir, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  for (const categoryDir of categoryDirs) {
    if (!categoryDir.isDirectory()) {
      continue;
    }
    const categoryPath = path.join(options.cardsDir, categoryDir.name);
    const files = await readdir(categoryPath);

    for (const fileName of files) {
      const filePath = path.join(categoryPath, fileName);
      const extension = path.extname(fileName).toLowerCase();
      if (IMAGE_EXTENSIONS.has(extension)) {
        images.push(filePath);
        continue;
      }
      if (extension !== ".md") {
        continue;
      }
      const drug = toDrug(fileName, await readFile(filePath, "utf8"));
      if (drug) {
        drugs.push(drug);
      }
    }
  }

  drugs.sort((a, b) => a.title.localeCompare(b.title, "ru"));

  const json = JSON.stringify(drugs);
  await mkdir(path.dirname(options.bundlePath), { recursive: true });
  await mkdir(path.dirname(options.dataPath), { recursive: true });
  await mkdir(options.imagesDir, { recursive: true });
  await mkdir(path.dirname(options.nativeAssetsPath), { recursive: true });
  await writeFile(options.bundlePath, json);
  await writeFile(options.dataPath, json);
  await writeFile(
    options.nativeAssetsPath,
    nativeGalleryAssetsModule(options.nativeAssetsPath, images),
  );
  await Promise.all(
    images.map((filePath) =>
      copyFile(filePath, path.join(options.imagesDir, path.basename(filePath))),
    ),
  );

  return drugs;
}

function toDrug(fileName: string, raw: string): Drug | null {
  const parsed = matter(raw);
  const data = parsed.data as Record<string, unknown>;
  const title = asString(data.title);
  const label = data.label;
  if (!title || !isLabel(label)) {
    return null;
  }

  const drug: Drug = {
    id: kebabToCamel(path.basename(fileName, ".md")),
    title,
    other: asStringList(data.other),
    section: asString(data.section),
    label,
    source: asString(data.source),
    contents: markdownToHtml(parsed.content),
    gallery: galleryFrom(data),
  };
  const mnn = asString(data.mnn);
  if (mnn) {
    drug.mnn = mnn;
  }
  return drug;
}

function kebabToCamel(slug: string): string {
  return slug.replace(/-([a-z0-9])/g, (_, char: string) => char.toUpperCase());
}

function isLabel(value: unknown): value is Label {
  return typeof value === "string" && LABELS.has(value as Label);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string => typeof item === "string" && item.length > 0,
    );
  }
  if (typeof value === "string" && value.length > 0) {
    return [value];
  }
  return [];
}

function galleryFrom(data: Record<string, unknown>): string[] {
  const gallery = asStringList(data.gallery);
  const photo = asString(data.photo);
  if (!photo) {
    return gallery;
  }
  return [photo, ...gallery.filter((name) => name !== photo)];
}

function markdownToHtml(markdown: string): string {
  return marked.parse(markdown.trim(), { async: false }) as string;
}

function nativeGalleryAssetsModule(
  nativeAssetsPath: string,
  images: string[],
): string {
  const fromDir = path.dirname(nativeAssetsPath);
  const entries = [...images]
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b)))
    .map((imagePath) => {
      let relative = path.relative(fromDir, imagePath).split(path.sep).join("/");
      if (!relative.startsWith(".")) {
        relative = `./${relative}`;
      }
      return `  ${JSON.stringify(path.basename(imagePath))}: require(${JSON.stringify(relative)})`;
    });
  const body = entries.length > 0 ? `${entries.join(",\n")},\n` : "";
  return `export const bundledGallery: Record<string, number> = {\n${body}};\n`;
}
