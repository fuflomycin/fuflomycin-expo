import path from "node:path";
import { buildList } from "../list-build";

async function main() {
  const root = process.cwd();
  await buildList({
    cardsDir: path.join(root, "cards"),
    bundlePath: path.join(root, "src", "data", "list.json"),
    dataPath: path.join(root, "public", "data", "list.json"),
    imagesDir: path.join(root, "public", "img"),
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
