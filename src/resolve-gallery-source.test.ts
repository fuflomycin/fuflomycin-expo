import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveGallerySource } from "./resolve-gallery-source";

const bundled = { "abnoba-viscum-fraksini.jpg": 42 };

describe("кадр галереи", () => {
  it("на Android вшитое имя даёт модуль ассета, не http URI", () => {
    const source = resolveGallerySource("abnoba-viscum-fraksini.jpg", {
      platform: "android",
      origin: "https://fuflomycin.expo.app",
      bundled,
    });

    assert.equal(source, 42);
  });

  it("на Android неизвестное имя качает кадр с origin", () => {
    const source = resolveGallerySource("new-name.png", {
      platform: "android",
      origin: "https://fuflomycin.expo.app",
      bundled,
    });

    assert.deepEqual(source, {
      uri: "https://fuflomycin.expo.app/img/new-name.png",
    });
  });

  it("в браузере кадр остаётся относительно корня сайта, даже если имя вшито", () => {
    const source = resolveGallerySource("abnoba-viscum-fraksini.jpg", {
      platform: "web",
      origin: "https://fuflomycin.expo.app",
      bundled,
    });

    assert.deepEqual(source, { uri: "/img/abnoba-viscum-fraksini.jpg" });
  });
});
