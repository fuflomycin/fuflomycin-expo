import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Drug } from "../../list-build/types";
import { filterWorkingList } from "./index";

function drug(fields: Pick<Drug, "id" | "title"> & Partial<Drug>): Drug {
  return {
    other: [],
    section: "РСП / Фуфломицин",
    label: "orange",
    source: "https://example.test",
    contents: "<p>Вердикт про Кагоцел в HTML.</p>",
    gallery: [],
    ...fields,
  };
}

const arbidol = drug({
  id: "arbidol",
  title: "Арбидол",
  other: ["Арпетол", "Умифеновир"],
  mnn: "umifenovir",
});
const kagocel = drug({
  id: "kagocel",
  title: "Кагоцел",
  other: ["Kagocel"],
  section: "Гомеопатия",
});
const hawthorn = drug({
  id: "nastoykaBoyaryshnika",
  title: "Настойка боярышника",
  label: "red",
  section: "Негативный перечень ФК",
});

const zelenka = drug({
  id: "zelenka",
  title: "Зеленка",
});
const glued = drug({
  id: "glued",
  title: "Арби",
  other: ["дол"],
});

const catalog = [arbidol, kagocel, hawthorn, zelenka, glued];

describe("рабочий список: поиск", () => {
  it("пустой запрос отдаёт весь список в исходном порядке", () => {
    const result = filterWorkingList(catalog, "");

    assert.deepEqual(
      result.drugs.map((item) => item.id),
      ["arbidol", "kagocel", "nastoykaBoyaryshnika", "zelenka", "glued"],
    );
    assert.equal(result.notice, null);
  });

  it("совпадение по названию оставляет только этот препарат", () => {
    const result = filterWorkingList(catalog, "Арбидол");

    assert.deepEqual(
      result.drugs.map((item) => item.id),
      ["arbidol"],
    );
    assert.equal(result.notice, null);
  });

  it("совпадение по любому синониму находит препарат", () => {
    const result = filterWorkingList(catalog, "Арпетол");

    assert.deepEqual(
      result.drugs.map((item) => item.id),
      ["arbidol"],
    );
    assert.equal(result.notice, null);
  });

  it("совпадение по МНН находит препарат", () => {
    const result = filterWorkingList(catalog, "umifenovir");

    assert.deepEqual(
      result.drugs.map((item) => item.id),
      ["arbidol"],
    );
    assert.equal(result.notice, null);
  });

  it("нет совпадений — фраза «В списке такого нет.»", () => {
    const result = filterWorkingList(catalog, "нет-такого-препарата");

    assert.deepEqual(result.drugs, []);
    assert.equal(result.notice, "В списке такого нет.");
  });

  it("поиск без учёта регистра", () => {
    const result = filterWorkingList(catalog, "арбидол");

    assert.deepEqual(
      result.drugs.map((item) => item.id),
      ["arbidol"],
    );
  });

  it("ё в запросе совпадает с е в поле", () => {
    const result = filterWorkingList(catalog, "зелёнка");

    assert.deepEqual(
      result.drugs.map((item) => item.id),
      ["zelenka"],
    );
  });

  it("кириллический запрос находит латинское МНН по транслиту", () => {
    const result = filterWorkingList(
      [drug({ id: "arbidolMnn", title: "Арбидол", mnn: "umifenovir" })],
      "умифеновир",
    );

    assert.deepEqual(
      result.drugs.map((item) => item.id),
      ["arbidolMnn"],
    );
  });

  it("категория и HTML вердикта в поиск не входят", () => {
    const bySection = filterWorkingList(catalog, "Гомеопатия");
    const byContents = filterWorkingList(catalog, "Вердикт");

    assert.equal(bySection.notice, "В списке такого нет.");
    assert.equal(byContents.notice, "В списке такого нет.");
  });

  it("склейки названия, синонима и МНН нет", () => {
    const result = filterWorkingList(catalog, "Арбидол");

    assert.equal(
      result.drugs.some((item) => item.id === "glued"),
      false,
    );
  });

  it("пробелы в запросе не выкидываются", () => {
    const withSpace = filterWorkingList(catalog, "Настойка боярышника");
    const gluedQuery = filterWorkingList(catalog, "Настойкабоярышника");

    assert.deepEqual(
      withSpace.drugs.map((item) => item.id),
      ["nastoykaBoyaryshnika"],
    );
    assert.equal(gluedQuery.notice, "В списке такого нет.");
  });

  it("запрос из одних ъ и ь не совпадает ни с чем", () => {
    const result = filterWorkingList(catalog, "ъь");

    assert.deepEqual(result.drugs, []);
    assert.equal(result.notice, "В списке такого нет.");
  });
});
