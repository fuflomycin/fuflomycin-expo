import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  estimateObfuscationPercent,
  inspectAppConfig,
  verdict,
} from "./play-android-optimization";

describe("estimateObfuscationPercent", () => {
  it("treats single-letter R8 names as obfuscated and readable packages as not", () => {
    const names = [
      "La/a;",
      "La/b;",
      "Lcom/facebook/react/ReactActivity;",
      "Lexpo/modules/kotlin/AppContext;",
    ];
    assert.equal(estimateObfuscationPercent(names), 50);
  });
});

describe("verdict", () => {
  it("goes red on the Play Console 1% obfuscation pattern", () => {
    const result = verdict({
      aab: {
        agpVersion: "8.12.0",
        hasR8Json: false,
        hasD8Json: true,
        hasMapping: false,
        dexUncompressedBytes: 40_730_912,
        obfuscationPercent: 1.2,
        r8ObfuscationPercent: null,
      },
      gradle: null,
      appConfig: {
        minify: false,
        shrink: false,
        optimizeProguardPlugin: false,
      },
    });
    assert.equal(result.ok, false);
    assert.ok(result.failures.some((line) => line.includes("Obfuscation 1.2%")));
    assert.ok(result.failures.some((line) => line.includes("d8.json")));
    assert.ok(result.failures.some((line) => line.includes("enableMinifyInReleaseBuilds")));
  });
});

describe("app.json R8 seam", () => {
  it("enables minify, resource shrinking, and the optimize-proguard plugin", () => {
    const app = JSON.parse(
      readFileSync(path.join(process.cwd(), "app.json"), "utf8"),
    );
    const config = inspectAppConfig(app);
    assert.equal(config.minify, true);
    assert.equal(config.shrink, true);
    assert.equal(config.optimizeProguardPlugin, true);
  });
});
