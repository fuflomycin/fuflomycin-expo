import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { listScrollBottomPadding } from "./list-scroll-padding";

describe("нижний отступ списка препаратов", () => {
  it("при системной панели 48px последний препарат остаётся выше неё", () => {
    const navBarHeight = 48;
    const padding = listScrollBottomPadding(navBarHeight);

    assert.ok(
      padding >= navBarHeight,
      `paddingBottom=${padding}, нужно >= ${navBarHeight}, иначе последний препарат окажется под панелью`,
    );
  });
});
