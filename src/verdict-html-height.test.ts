import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { contentHeightFromMessage } from "./verdict-html-height";

describe("высота вердикта в WebView", () => {
  it("на Адаптоле не берёт заниженный body.scrollHeight — иначе HTML обрежется блоком МНН", () => {
    const adaptolProbe =
      '{"bodyScroll":296,"bodyOffset":296,"deScroll":328,"deOffset":328,"deClient":296,"innerH":296,"scale":1,"sentinelBottom":328,"lastPBottom":312,"bodyBottom":312,"when":"inline"}';

    assert.equal(contentHeightFromMessage(adaptolProbe), 328);
  });
});
