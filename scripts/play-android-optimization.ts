import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const DEX_THRESHOLD_BYTES = 10 * 1024 * 1024;
const PLAY_OBFUSCATION_FLOOR = 25;

export type AabOptimization = {
  agpVersion: string | null;
  hasR8Json: boolean;
  hasD8Json: boolean;
  hasMapping: boolean;
  dexUncompressedBytes: number;
  obfuscationPercent: number | null;
  r8ObfuscationPercent: number | null;
};

export type GradleOptimization = {
  minifyProperty: boolean;
  shrinkProperty: boolean;
  optimizedResourceShrinking: boolean;
  usesOptimizeProguardDefaults: boolean;
  pinnedAgp: string | null;
};

export type AppConfigOptimization = {
  minify: boolean;
  shrink: boolean;
  optimizeProguardPlugin: boolean;
};

export type Verdict = {
  ok: boolean;
  failures: string[];
  warnings: string[];
  aab: AabOptimization | null;
  gradle: GradleOptimization | null;
  appConfig: AppConfigOptimization | null;
};

function unzipList(aabPath: string): string {
  return execFileSync("unzip", ["-l", aabPath], { encoding: "utf8" });
}

function unzipToString(aabPath: string, entry: string): string | null {
  try {
    return execFileSync("unzip", ["-p", aabPath, entry], { encoding: "utf8" });
  } catch {
    return null;
  }
}

function unzipToFile(aabPath: string, entry: string, destDir: string): Buffer | null {
  try {
    execFileSync("unzip", ["-o", "-q", "-d", destDir, aabPath, entry]);
    const extracted = path.join(destDir, entry);
    return existsSync(extracted) ? readFileSync(extracted) : null;
  } catch {
    return null;
  }
}

function parseAgp(metadata: string | null): string | null {
  if (!metadata) return null;
  const match = metadata.match(/^androidGradlePluginVersion=(.+)$/m);
  return match?.[1]?.trim() ?? null;
}

function parseR8Obfuscation(r8Json: string | null): number | null {
  if (!r8Json) return null;
  try {
    const data = JSON.parse(r8Json) as {
      obfuscation?: { percentage?: number };
      stats?: { obfuscation?: { percentage?: number } };
    };
    const value =
      data.obfuscation?.percentage ?? data.stats?.obfuscation?.percentage;
    return typeof value === "number" ? value : null;
  } catch {
    return null;
  }
}

function readU32(buf: Buffer, offset: number): number {
  return buf.readUInt32LE(offset);
}

function readUleb128(buf: Buffer, offset: number): { value: number; next: number } {
  let value = 0;
  let shift = 0;
  let next = offset;
  while (next < buf.length) {
    const byte = buf[next];
    next += 1;
    value |= (byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) break;
    shift += 7;
  }
  return { value, next };
}

function readMutf8(buf: Buffer, start: number): string {
  const { next } = readUleb128(buf, start);
  const bytes: number[] = [];
  let i = next;
  while (i < buf.length && buf[i] !== 0) {
    bytes.push(buf[i]);
    i += 1;
  }
  return Buffer.from(bytes).toString("utf8");
}

function dexClassNames(dex: Buffer): string[] {
  if (dex.length < 112 || dex.subarray(0, 3).toString() !== "dex") return [];
  const stringIdsSize = readU32(dex, 56);
  const stringIdsOff = readU32(dex, 60);
  const typeIdsOff = readU32(dex, 68);
  const classDefsSize = readU32(dex, 96);
  const classDefsOff = readU32(dex, 100);
  const names: string[] = [];
  for (let i = 0; i < classDefsSize; i += 1) {
    const classIdx = readU32(dex, classDefsOff + i * 32);
    const descriptorIdx = readU32(dex, typeIdsOff + classIdx * 4);
    if (descriptorIdx >= stringIdsSize) continue;
    const stringOff = readU32(dex, stringIdsOff + descriptorIdx * 4);
    names.push(readMutf8(dex, stringOff));
  }
  return names;
}

function simpleName(descriptor: string): string {
  const trimmed = descriptor.replace(/^L/, "").replace(/;$/, "");
  const parts = trimmed.split("/");
  return parts[parts.length - 1] ?? trimmed;
}

function isObfuscatedName(descriptor: string): boolean {
  const name = simpleName(descriptor).replace(/\$.*/, "");
  return /^[a-z]{1,3}$/.test(name) || /^[A-Z]$/.test(name);
}

export function estimateObfuscationPercent(classNames: string[]): number | null {
  if (classNames.length === 0) return null;
  const obfuscated = classNames.filter(isObfuscatedName).length;
  return (100 * obfuscated) / classNames.length;
}

export function inspectAab(aabPath: string): AabOptimization {
  const listing = unzipList(aabPath);
  const hasR8Json = listing.includes("BUNDLE-METADATA/com.android.tools/r8.json");
  const hasD8Json = listing.includes("BUNDLE-METADATA/com.android.tools/d8.json");
  const hasMapping = /mapping\.txt/.test(listing);
  const dexUncompressedBytes = listing
    .split("\n")
    .filter((line) => /\.dex$/.test(line))
    .reduce((sum, line) => sum + (parseInt(line.trim().split(/\s+/)[0] ?? "0", 10) || 0), 0);

  const agpVersion = parseAgp(
    unzipToString(
      aabPath,
      "BUNDLE-METADATA/com.android.tools.build.gradle/app-metadata.properties",
    ),
  );
  const r8ObfuscationPercent = hasR8Json
    ? parseR8Obfuscation(
        unzipToString(aabPath, "BUNDLE-METADATA/com.android.tools/r8.json"),
      )
    : null;

  const dexEntries = listing
    .split("\n")
    .map((line) => line.trim().split(/\s+/).pop())
    .filter((entry): entry is string => Boolean(entry?.endsWith(".dex")));
  const extractDir = mkdtempSync(path.join(tmpdir(), "aab-dex-"));
  let classNames: string[] = [];
  try {
    classNames = dexEntries.flatMap((entry) => {
      const dex = unzipToFile(aabPath, entry, extractDir);
      return dex ? dexClassNames(dex) : [];
    });
  } finally {
    rmSync(extractDir, { recursive: true, force: true });
  }

  return {
    agpVersion,
    hasR8Json,
    hasD8Json,
    hasMapping,
    dexUncompressedBytes,
    obfuscationPercent: estimateObfuscationPercent(classNames),
    r8ObfuscationPercent,
  };
}

function gradlePropertyTrue(contents: string, key: string): boolean {
  return new RegExp(`^${key}\\s*=\\s*true\\s*$`, "m").test(contents);
}

function pluginOptions(plugins: unknown[], name: string): unknown {
  for (const plugin of plugins) {
    if (plugin === name) return {};
    if (Array.isArray(plugin) && plugin[0] === name) return plugin[1] ?? {};
  }
  return undefined;
}

export function inspectAppConfig(raw: unknown): AppConfigOptimization {
  const plugins = (raw as { expo?: { plugins?: unknown[] } }).expo?.plugins ?? [];
  const buildProps = pluginOptions(plugins, "expo-build-properties") as {
    android?: {
      enableMinifyInReleaseBuilds?: boolean;
      enableShrinkResourcesInReleaseBuilds?: boolean;
    };
  } | undefined;
  const optimizeProguardPlugin =
    pluginOptions(plugins, "./plugins/with-android-r8.js") !== undefined;
  return {
    minify: buildProps?.android?.enableMinifyInReleaseBuilds === true,
    shrink: buildProps?.android?.enableShrinkResourcesInReleaseBuilds === true,
    optimizeProguardPlugin,
  };
}

export function inspectGradle(androidDir: string): GradleOptimization {
  const properties = existsSync(path.join(androidDir, "gradle.properties"))
    ? readFileSync(path.join(androidDir, "gradle.properties"), "utf8")
    : "";
  const appBuild = existsSync(path.join(androidDir, "app", "build.gradle"))
    ? readFileSync(path.join(androidDir, "app", "build.gradle"), "utf8")
    : "";
  let pinnedAgp: string | null = null;
  const catalog = path.join(
    androidDir,
    "..",
    "node_modules",
    "react-native",
    "gradle",
    "libs.versions.toml",
  );
  if (existsSync(catalog)) {
    const match = readFileSync(catalog, "utf8").match(/^agp\s*=\s*"([^"]+)"/m);
    pinnedAgp = match?.[1] ?? null;
  }
  return {
    minifyProperty: gradlePropertyTrue(
      properties,
      "android.enableMinifyInReleaseBuilds",
    ),
    shrinkProperty: gradlePropertyTrue(
      properties,
      "android.enableShrinkResourcesInReleaseBuilds",
    ),
    optimizedResourceShrinking: gradlePropertyTrue(
      properties,
      "android.r8.optimizedResourceShrinking",
    ),
    usesOptimizeProguardDefaults: appBuild.includes(
      "proguard-android-optimize.txt",
    ),
    pinnedAgp,
  };
}

function agpAtLeast(version: string | null, major: number): boolean {
  if (!version) return false;
  const parsed = Number.parseInt(version.split(".")[0] ?? "", 10);
  return Number.isFinite(parsed) && parsed >= major;
}

export function verdict(input: {
  aab: AabOptimization | null;
  gradle: GradleOptimization | null;
  appConfig?: AppConfigOptimization | null;
}): Verdict {
  const failures: string[] = [];
  const warnings: string[] = [];
  const appConfig = input.appConfig ?? null;

  if (appConfig) {
    if (!appConfig.minify) {
      failures.push("app.json does not enable android.enableMinifyInReleaseBuilds");
    }
    if (!appConfig.shrink) {
      failures.push("app.json does not enable android.enableShrinkResourcesInReleaseBuilds");
    }
    if (!appConfig.optimizeProguardPlugin) {
      failures.push("app.json is missing ./plugins/with-android-r8.js");
    }
  }

  if (input.aab) {
    if (input.aab.dexUncompressedBytes >= DEX_THRESHOLD_BYTES) {
      if (!input.aab.hasR8Json) {
        failures.push("AAB has no r8.json (R8 did not run; Play falls back to DEX heuristics)");
      }
      if (input.aab.hasD8Json && !input.aab.hasR8Json) {
        failures.push("AAB ships d8.json instead of r8.json");
      }
      const obfuscation =
        input.aab.r8ObfuscationPercent ?? input.aab.obfuscationPercent;
      if (obfuscation != null && obfuscation < PLAY_OBFUSCATION_FLOOR) {
        failures.push(
          `Obfuscation ${obfuscation.toFixed(1)}% is below Play floor ${PLAY_OBFUSCATION_FLOOR}%`,
        );
      }
    }
    if (!agpAtLeast(input.aab.agpVersion, 9)) {
      warnings.push(
        `AAB AGP ${input.aab.agpVersion ?? "unknown"} < 9.0 (Play asks for AGP 9 + R8)`,
      );
    }
  }

  if (input.gradle) {
    if (!input.gradle.minifyProperty) {
      failures.push("android.enableMinifyInReleaseBuilds is not true");
    }
    if (!input.gradle.shrinkProperty) {
      failures.push("android.enableShrinkResourcesInReleaseBuilds is not true");
    }
    if (!input.gradle.usesOptimizeProguardDefaults) {
      failures.push("release proguardFiles does not use proguard-android-optimize.txt");
    }
    if (!input.gradle.optimizedResourceShrinking) {
      failures.push("android.r8.optimizedResourceShrinking is not true");
    }
    if (!agpAtLeast(input.gradle.pinnedAgp, 9)) {
      warnings.push(
        `Pinned AGP ${input.gradle.pinnedAgp ?? "unknown"} < 9.0 (Expo SDK 57 / RN 0.86 do not support AGP 9)`,
      );
    }
  }

  return {
    ok: failures.length === 0,
    failures,
    warnings,
    aab: input.aab,
    gradle: input.gradle,
    appConfig,
  };
}

function main() {
  const root = process.cwd();
  const aabArg = process.argv[2];
  const aabPath = aabArg ? path.resolve(aabArg) : undefined;
  const androidDir = path.join(root, "android");
  const appJsonPath = path.join(root, "app.json");

  const aab = aabPath && existsSync(aabPath) ? inspectAab(aabPath) : null;
  const gradle = existsSync(androidDir) ? inspectGradle(androidDir) : null;
  const appConfig = existsSync(appJsonPath)
    ? inspectAppConfig(JSON.parse(readFileSync(appJsonPath, "utf8")))
    : null;
  const result = verdict({ aab, gradle, appConfig });

  console.log(JSON.stringify({ aabPath: aabPath ?? null, ...result }, null, 2));
  if (!result.ok) process.exitCode = 1;
}

const invoked = process.argv[1]?.replace(/\\/g, "/");
if (invoked && /play-android-optimization\.ts$/.test(invoked)) {
  main();
}
