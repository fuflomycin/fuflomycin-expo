import path from "node:path";
import { buildList } from "../list-build";

async function main() {
  const root = process.cwd();
  const catalogDir = path.join(
    root,
    "android",
    "app",
    "src",
    "main",
    "assets",
    "catalog",
  );
  await buildList({
    cardsDir: path.join(root, "cards"),
    catalogPath: path.join(catalogDir, "list.json"),
    imagesDir: path.join(catalogDir, "img"),
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
