import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { buildList } from "./index";

async function setup() {
  const root = await mkdtemp(path.join(tmpdir(), "list-build-"));
  const cardsDir = path.join(root, "cards");
  const bundlePath = path.join(root, "bundle", "list.json");
  const dataPath = path.join(root, "public", "data", "list.json");
  const imagesDir = path.join(root, "public", "img");
  const nativeAssetsPath = path.join(
    root,
    "src",
    "data",
    "gallery-assets.native.ts",
  );
  return { root, cardsDir, bundlePath, dataPath, imagesDir, nativeAssetsPath };
}

const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function writeCard(
  cardsDir: string,
  category: string,
  fileName: string,
  frontmatter: string,
  body: string,
) {
  const dir = path.join(cardsDir, category);
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, fileName),
    `---\n${frontmatter}\n---\n\n${body}\n`,
    "utf8",
  );
}

async function readList(bundlePath: string) {
  return JSON.parse(await readFile(bundlePath, "utf8")) as Array<
    Record<string, unknown>
  >;
}

describe("сборка списка", () => {
  it("kebab-имя карточки становится camelCase id", async () => {
    const paths = await setup();
    await writeCard(
      paths.cardsDir,
      "homeopathy",
      "abnoba-viscum-fraksini.md",
      [
        "section: Гомеопатия",
        "title: АбнобаВИСКУМ Фраксини",
        "other: []",
        "source: https://example.test/abnoba",
        "label: red",
      ].join("\n"),
      "Текст.",
    );

    await buildList(paths);
    const list = await readList(paths.bundlePath);

    assert.equal(list[0]?.id, "abnobaViscumFraksini");
  });

  it("категория берётся из frontmatter, не из каталога", async () => {
    const paths = await setup();
    await writeCard(
      paths.cardsDir,
      "homeopathy",
      "kagocel.md",
      [
        "section: РСП / Фуфломицин",
        "title: Кагоцел",
        "other: []",
        "source: https://example.test/kagocel",
        "label: orange",
      ].join("\n"),
      "Текст.",
    );

    await buildList(paths);
    const list = await readList(paths.bundlePath);

    assert.equal(list[0]?.section, "РСП / Фуфломицин");
  });

  it("тело Markdown становится HTML в contents", async () => {
    const paths = await setup();
    await writeCard(
      paths.cardsDir,
      "homeopathy",
      "oscillokokcinum.md",
      [
        "section: Гомеопатия",
        "title: ОСЦИЛЛОКОКЦИНУМ",
        "other: []",
        "source: https://example.test/osc",
        "label: red",
      ].join("\n"),
      "У гомеопатии **не может** быть доказательств эффективности.",
    );

    await buildList(paths);
    const list = await readList(paths.bundlePath);

    assert.equal(
      list[0]?.contents,
      "<p>У гомеопатии <strong>не может</strong> быть доказательств эффективности.</p>\n",
    );
  });

  it("скаляр галереи и YAML-список становятся массивом имён, не URL", async () => {
    const paths = await setup();
    await writeCard(
      paths.cardsDir,
      "rsp",
      "adaptol.md",
      [
        "section: РСП / Фуфломицин",
        "title: Адаптол",
        "other: []",
        "source: https://example.test/adaptol",
        "label: orange",
        "gallery: cover.png",
      ].join("\n"),
      "Текст.",
    );
    await writeCard(
      paths.cardsDir,
      "rsp",
      "allapinin.md",
      [
        "section: РСП / Фуфломицин",
        "title: Аллапинин",
        "other: []",
        "source: https://example.test/allapinin",
        "label: orange",
        "gallery: [one.png, two.png]",
      ].join("\n"),
      "Текст.",
    );

    await buildList(paths);
    const list = await readList(paths.bundlePath);
    const byId = Object.fromEntries(list.map((item) => [item.id, item]));

    assert.deepEqual(byId.adaptol?.gallery, ["cover.png"]);
    assert.deepEqual(byId.allapinin?.gallery, ["one.png", "two.png"]);
    assert.equal(
      JSON.stringify(byId.adaptol?.gallery).includes("/"),
      false,
    );
  });

  it("пустая галерея становится пустым массивом", async () => {
    const paths = await setup();
    await writeCard(
      paths.cardsDir,
      "fk",
      "prednizolon.md",
      [
        "section: Негативный перечень ФК",
        "title: Преднизолон",
        "other: []",
        "source: https://example.test/pred",
        "label: red",
      ].join("\n"),
      "Текст.",
    );

    await buildList(paths);
    const list = await readList(paths.bundlePath);

    assert.deepEqual(list[0]?.gallery, []);
  });

  it("старое поле обложки становится первым кадром и в список не входит", async () => {
    const paths = await setup();
    await writeCard(
      paths.cardsDir,
      "rsp",
      "ademetionin.md",
      [
        "section: РСП / Фуфломицин",
        "title: Адеметионин",
        "other: []",
        "source: https://example.test/adem",
        "label: orange",
        "photo: ademetionin.png",
        "gallery: [geptral.png, geptor.png]",
      ].join("\n"),
      "Текст.",
    );

    await buildList(paths);
    const list = await readList(paths.bundlePath);

    assert.deepEqual(list[0]?.gallery, [
      "ademetionin.png",
      "geptral.png",
      "geptor.png",
    ]);
    assert.equal("photo" in list[0]!, false);
  });

  it("отбрасывает producer, otherstr, index, verdict и lead", async () => {
    const paths = await setup();
    await writeCard(
      paths.cardsDir,
      "homeopathy",
      "anaferon.md",
      [
        "section: Гомеопатия",
        "title: АНАФЕРОН",
        "other: [Анаферон]",
        "producer: Материа Медика",
        "source: https://example.test/anaferon",
        "label: red",
        "verdict: нет доказательств",
        "lead: кратко",
        "otherstr: Анаферон",
        "index: АНАФЕРОН, АНАФЕРОН",
      ].join("\n"),
      "Текст.",
    );

    await buildList(paths);
    const list = await readList(paths.bundlePath);
    const keys = Object.keys(list[0]!);

    assert.deepEqual(
      keys.filter((key) =>
        ["producer", "otherstr", "index", "verdict", "lead", "photo"].includes(
          key,
        ),
      ),
      [],
    );
    assert.deepEqual(list[0]?.other, ["Анаферон"]);
  });

  it("ярлык в списке только red, orange или yellow", async () => {
    const paths = await setup();
    await writeCard(
      paths.cardsDir,
      "rsp",
      "gold-drug.md",
      [
        "section: РСП / Фуфломицин",
        "title: Золотой",
        "other: []",
        "source: https://example.test/gold",
        "label: gold",
      ].join("\n"),
      "Текст.",
    );
    await writeCard(
      paths.cardsDir,
      "rsp",
      "kagocel.md",
      [
        "section: РСП / Фуфломицин",
        "title: Кагоцел",
        "other: []",
        "source: https://example.test/kagocel",
        "label: orange",
      ].join("\n"),
      "Текст.",
    );

    await buildList(paths);
    const list = await readList(paths.bundlePath);

    assert.deepEqual(
      list.map((item) => item.label),
      ["orange"],
    );
  });

  it("непустой МНН входит в препарат, пустой — нет", async () => {
    const paths = await setup();
    await writeCard(
      paths.cardsDir,
      "rsp",
      "amizon.md",
      [
        "section: РСП / Фуфломицин",
        "title: Амизон",
        "mnn: enisamium iodide",
        "other: []",
        "source: https://example.test/amizon",
        "label: orange",
      ].join("\n"),
      "Текст.",
    );
    await writeCard(
      paths.cardsDir,
      "rsp",
      "asd.md",
      [
        "section: РСП / Фуфломицин",
        "title: АСД",
        "mnn:",
        "other: []",
        "source: https://example.test/asd",
        "label: orange",
      ].join("\n"),
      "Текст.",
    );

    await buildList(paths);
    const list = await readList(paths.bundlePath);
    const byId = Object.fromEntries(list.map((item) => [item.id, item]));

    assert.equal(byId.amizon?.mnn, "enisamium iodide");
    assert.equal("mnn" in byId.asd!, false);
  });

  it("сортирует препараты по названию в локали ru", async () => {
    const paths = await setup();
    await writeCard(
      paths.cardsDir,
      "rsp",
      "yantarnaya.md",
      [
        "section: РСП / Фуфломицин",
        "title: Янтарная кислота",
        "other: []",
        "source: https://example.test/ya",
        "label: yellow",
      ].join("\n"),
      "Текст.",
    );
    await writeCard(
      paths.cardsDir,
      "rsp",
      "arbidol.md",
      [
        "section: РСП / Фуфломицин",
        "title: Арбидол",
        "other: []",
        "source: https://example.test/ar",
        "label: orange",
      ].join("\n"),
      "Текст.",
    );
    await writeCard(
      paths.cardsDir,
      "rsp",
      "kagocel.md",
      [
        "section: РСП / Фуфломицин",
        "title: Кагоцел",
        "other: []",
        "source: https://example.test/ka",
        "label: orange",
      ].join("\n"),
      "Текст.",
    );

    await buildList(paths);
    const list = await readList(paths.bundlePath);

    assert.deepEqual(
      list.map((item) => item.title),
      ["Арбидол", "Кагоцел", "Янтарная кислота"],
    );
  });

  it("пишет одни и те же байты в бандл и в /data/list.json", async () => {
    const paths = await setup();
    await writeCard(
      paths.cardsDir,
      "fk",
      "etamzilat.md",
      [
        "section: Негативный перечень ФК",
        "title: Этамзилат",
        "other: []",
        "source: https://example.test/et",
        "label: red",
      ].join("\n"),
      "Текст.",
    );

    await buildList(paths);
    const bundle = await readFile(paths.bundlePath);
    const data = await readFile(paths.dataPath);

    assert.equal(bundle.equals(data), true);
    assert.equal(path.basename(path.dirname(paths.dataPath)), "data");
    assert.equal(path.basename(paths.dataPath), "list.json");
  });

  it("пишет native-карту require для каждого файла, скопированного в /img/", async () => {
    const paths = await setup();
    await writeCard(
      paths.cardsDir,
      "rsp",
      "adaptol.md",
      [
        "section: РСП / Фуфломицин",
        "title: Адаптол",
        "other: []",
        "source: https://example.test/adaptol",
        "label: orange",
        "gallery: adaptol.png",
      ].join("\n"),
      "Текст.",
    );
    await mkdir(path.join(paths.cardsDir, "rsp"), { recursive: true });
    await writeFile(path.join(paths.cardsDir, "rsp", "adaptol.png"), PNG_1x1);
    await mkdir(path.join(paths.cardsDir, "fk"), { recursive: true });
    await writeFile(path.join(paths.cardsDir, "fk", "orphan.png"), PNG_1x1);

    await buildList(paths);

    const copiedAdaptol = await readFile(
      path.join(paths.imagesDir, "adaptol.png"),
    );
    const copiedOrphan = await readFile(
      path.join(paths.imagesDir, "orphan.png"),
    );
    assert.equal(copiedAdaptol.equals(PNG_1x1), true);
    assert.equal(copiedOrphan.equals(PNG_1x1), true);

    const map = await readFile(paths.nativeAssetsPath, "utf8");
    const adaptol = map.match(/"adaptol\.png": require\("([^"]+)"\)/);
    const orphan = map.match(/"orphan\.png": require\("([^"]+)"\)/);
    assert.ok(adaptol, "в карте нет adaptol.png");
    assert.ok(orphan, "в карте нет orphan.png");
    assert.equal(adaptol[1].includes("/cards/"), true);
    assert.equal(orphan[1].includes("/cards/"), true);

    const mapDir = path.dirname(paths.nativeAssetsPath);
    const adaptolBytes = await readFile(path.resolve(mapDir, adaptol[1]));
    const orphanBytes = await readFile(path.resolve(mapDir, orphan[1]));
    assert.equal(adaptolBytes.equals(PNG_1x1), true);
    assert.equal(orphanBytes.equals(PNG_1x1), true);
  });
});
