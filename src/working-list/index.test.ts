import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Drug } from "../../list-build/types";
import {
  createWorkingList,
  filterWorkingList,
  lookupWorkingList,
  mnnSearch,
} from "./index";
import type { ListFetchResult, WorkingListPorts } from "./index";

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

describe("рабочий список: препарат", () => {
  it("lookup по id отдаёт этот препарат", () => {
    const result = lookupWorkingList(catalog, "arbidol");

    assert.equal(result.drug, arbidol);
    assert.equal(result.notice, null);
  });

  it("неизвестный id — фраза «В списке такого нет.», без препарата", () => {
    const result = lookupWorkingList(catalog, "нет-такого-id");

    assert.equal(result.drug, null);
    assert.equal(result.notice, "В списке такого нет.");
    assert.equal(
      JSON.stringify(result).includes("нет-такого-id"),
      false,
    );
  });

  it("препарат с МНН отдаёт канонические URL Cochrane и Pubmed", () => {
    const result = mnnSearch(arbidol);

    assert.deepEqual(result, {
      mnn: "umifenovir",
      cochraneUrl:
        "https://www.cochranelibrary.com/advanced-search?q=umifenovir&t=1",
      pubmedUrl:
        "https://pubmed.ncbi.nlm.nih.gov/?term=umifenovir&filter=pubt.meta-analysis&filter=pubt.randomizedcontrolledtrial",
    });
  });

  it("без МНН блока нет", () => {
    assert.equal(mnnSearch(kagocel), null);
  });

  it("МНН кодируется целиком, не только первый пробел", () => {
    const result = mnnSearch(
      drug({ id: "spaced", title: "С пробелом", mnn: "foo bar" }),
    );

    assert.equal(
      result?.cochraneUrl,
      "https://www.cochranelibrary.com/advanced-search?q=foo%20bar&t=1",
    );
    assert.equal(
      result?.pubmedUrl,
      "https://pubmed.ncbi.nlm.nih.gov/?term=foo%20bar&filter=pubt.meta-analysis&filter=pubt.randomizedcontrolledtrial",
    );
  });
});

const DAY_MS = 24 * 60 * 60 * 1000;

function memoryPersist(initial: string | null = null) {
  let value = initial;
  return {
    read: async () => value,
    write: async (next: string) => {
      value = next;
    },
  };
}

function ports(
  overrides: Partial<WorkingListPorts> & { embedded?: readonly Drug[] } = {},
): WorkingListPorts {
  const { embedded = catalog, ...rest } = overrides;
  return {
    embedded,
    now: () => 0,
    isOnline: () => true,
    persist: memoryPersist(),
    fetchList: async () => ({ ok: false }),
    ...rest,
  };
}

describe("рабочий список: пол сборки", () => {
  it("без persist отдаёт вшитый список этой сборки", async () => {
    const list = createWorkingList(ports({ embedded: [arbidol, kagocel] }));
    await list.hydrate();

    assert.deepEqual(
      list.filter("").drugs.map((item) => item.id),
      ["arbidol", "kagocel"],
    );
  });

  it("битый persist оставляет пол сборки", async () => {
    const list = createWorkingList(
      ports({
        embedded: [arbidol],
        persist: memoryPersist("{не json"),
      }),
    );
    await list.hydrate();

    assert.deepEqual(
      list.filter("").drugs.map((item) => item.id),
      ["arbidol"],
    );
  });
});

describe("рабочий список: успех и не-успех", () => {
  it("успех перекрывает пол той же сборки и переживает повторный hydrate", async () => {
    const persist = memoryPersist();
    const list = createWorkingList(
      ports({
        embedded: [arbidol],
        persist,
        fetchList: async () => ({ ok: true, body: JSON.stringify([kagocel]) }),
      }),
    );
    await list.hydrate();
    await list.considerFetch("surface");

    assert.deepEqual(
      list.filter("").drugs.map((item) => item.id),
      ["kagocel"],
    );

    const again = createWorkingList(
      ports({
        embedded: [arbidol],
        persist,
        fetchList: async () => ({ ok: false }),
      }),
    );
    await again.hydrate();

    assert.deepEqual(
      again.filter("").drugs.map((item) => item.id),
      ["kagocel"],
    );
  });

  it("подписчик после hydrate сразу видит успех той же сборки, а не пол", async () => {
    const persist = memoryPersist();
    const first = createWorkingList(
      ports({
        embedded: [arbidol],
        persist,
        fetchList: async () => ({ ok: true, body: JSON.stringify([kagocel]) }),
      }),
    );
    await first.hydrate();
    await first.considerFetch("surface");

    const cold = createWorkingList(
      ports({
        embedded: [arbidol],
        persist,
        fetchList: async () => ({ ok: false }),
      }),
    );
    await cold.hydrate();

    let seen: string[] = [];
    cold.subscribe(() => {
      seen = cold.filter("").drugs.map((item) => item.id);
    });

    assert.deepEqual(seen, ["kagocel"]);
  });

  it("новая сборка с другим вшитым списком снова даёт пол", async () => {
    const persist = memoryPersist();
    const first = createWorkingList(
      ports({
        embedded: [arbidol],
        persist,
        fetchList: async () => ({ ok: true, body: JSON.stringify([kagocel]) }),
      }),
    );
    await first.hydrate();
    await first.considerFetch("surface");

    const rebuilt = createWorkingList(
      ports({
        embedded: [hawthorn],
        persist,
        fetchList: async () => ({ ok: false }),
      }),
    );
    await rebuilt.hydrate();

    assert.deepEqual(
      rebuilt.filter("").drugs.map((item) => item.id),
      ["nastoykaBoyaryshnika"],
    );
  });

  it("сеть, пустое тело, не JSON и битые поля не трогают список и не сдвигают отметку", async () => {
    const persist = memoryPersist();
    let fetches = 0;
    const bodies: ListFetchResult[] = [
      { ok: false },
      { ok: true, body: "[]" },
      { ok: true, body: "это не json" },
      { ok: true, body: JSON.stringify([{ id: "broken" }]) },
      { ok: true, body: JSON.stringify([arbidol, { id: "half" }]) },
    ];
    const list = createWorkingList(
      ports({
        embedded: [arbidol],
        persist,
        fetchList: async () => {
          const result = bodies[fetches] ?? { ok: false };
          fetches += 1;
          return result;
        },
      }),
    );
    await list.hydrate();
    for (let i = 0; i < bodies.length; i++) {
      await list.considerFetch("surface");
    }

    assert.deepEqual(
      list.filter("").drugs.map((item) => item.id),
      ["arbidol"],
    );
    assert.equal(fetches, bodies.length);

    const again = createWorkingList(
      ports({
        embedded: [arbidol],
        persist,
        fetchList: async () => {
          fetches += 1;
          return { ok: true, body: JSON.stringify([kagocel]) };
        },
      }),
    );
    await again.hydrate();
    await again.considerFetch("surface");

    assert.deepEqual(
      again.filter("").drugs.map((item) => item.id),
      ["kagocel"],
    );
  });

  it("без сети fetch не вызывается", async () => {
    let fetched = false;
    const list = createWorkingList(
      ports({
        isOnline: () => false,
        fetchList: async () => {
          fetched = true;
          return { ok: false };
        },
      }),
    );
    await list.hydrate();
    await list.considerFetch("online");

    assert.equal(fetched, false);
  });
});

describe("рабочий список: окно 24 ч", () => {
  it("повторный fetch только когда с успеха прошло не меньше суток", async () => {
    const persist = memoryPersist();
    let now = 1_000;
    let fetches = 0;
    const list = createWorkingList(
      ports({
        embedded: [arbidol],
        persist,
        now: () => now,
        fetchList: async () => {
          fetches += 1;
          return { ok: true, body: JSON.stringify([kagocel]) };
        },
      }),
    );
    await list.hydrate();
    await list.considerFetch("surface");
    assert.equal(fetches, 1);

    now = 1_000 + DAY_MS - 1;
    await list.considerFetch("foreground");
    assert.equal(fetches, 1);

    now = 1_000 + DAY_MS;
    await list.considerFetch("online");
    assert.equal(fetches, 2);
  });
});

describe("рабочий список: поиск и открытая карточка", () => {
  it("успех не сбрасывает запрос: тот же текст пересчитывается на новом составе", async () => {
    const query = "Арбидол";
    const list = createWorkingList(
      ports({
        embedded: [arbidol, kagocel],
        fetchList: async () => ({ ok: true, body: JSON.stringify([kagocel]) }),
      }),
    );
    await list.hydrate();
    assert.deepEqual(
      list.filter(query).drugs.map((item) => item.id),
      ["arbidol"],
    );

    await list.considerFetch("surface");

    assert.equal(query, "Арбидол");
    assert.deepEqual(list.filter(query).drugs, []);
    assert.equal(list.filter(query).notice, "В списке такого нет.");
  });

  it("lookup до hydrate не закрепляет пол поверх успеха той же сборки", async () => {
    const persist = memoryPersist();
    const first = createWorkingList(
      ports({
        embedded: [arbidol],
        persist,
        fetchList: async () => ({ ok: true, body: JSON.stringify([kagocel]) }),
      }),
    );
    await first.hydrate();
    await first.considerFetch("surface");

    const cold = createWorkingList(
      ports({
        embedded: [arbidol],
        persist,
        fetchList: async () => ({ ok: false }),
      }),
    );
    cold.lookup("arbidol");
    await cold.hydrate();

    assert.equal(cold.lookup("arbidol").drug, null);
    assert.equal(cold.lookup("kagocel").drug?.id, "kagocel");
  });

  it("открытая карточка не дёргается, даже если препарата уже нет в новом списке", async () => {
    const list = createWorkingList(
      ports({
        embedded: [arbidol, kagocel],
        fetchList: async () => ({ ok: true, body: JSON.stringify([kagocel]) }),
      }),
    );
    await list.hydrate();
    const opened = list.lookup("arbidol");
    assert.equal(opened.drug?.id, "arbidol");

    await list.considerFetch("surface");

    const stillOpen = list.lookup("arbidol");
    assert.equal(stillOpen.drug, opened.drug);
    assert.equal(stillOpen.notice, null);

    list.leaveDrug();
    const afterLeave = list.lookup("arbidol");
    assert.equal(afterLeave.drug, null);
    assert.equal(afterLeave.notice, "В списке такого нет.");
  });
});


