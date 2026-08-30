import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

describe("совместимость expo-modules-core и react-native-worklets", () => {
  it("не вызывает WorkletRuntime::executeSync, если worklets его уже не объявляет", () => {
    const invokerPath = join(
      process.cwd(),
      "node_modules/expo-modules-core/android/src/main/cpp/worklets/WorkletJSCallInvoker.cpp",
    );
    const runtimePath = join(
      process.cwd(),
      "node_modules/react-native-worklets/Common/cpp/worklets/WorkletRuntime/WorkletRuntime.h",
    );

    const invoker = readFileSync(invokerPath, "utf8");
    const runtime = readFileSync(runtimePath, "utf8");

    const callsExecuteSync = invoker.includes("executeSync");
    const declaresExecuteSync = runtime.includes("executeSync");

    assert.ok(
      !callsExecuteSync || declaresExecuteSync,
      "EAS Android bundleRelease fails with: no member named 'executeSync' in 'worklets::WorkletRuntime'. expo-modules-core 57.0.14 still calls executeSync; worklets 0.12 removed it. Pin SDK 57 bundled react-native-reanimated 4.5.1 + react-native-worklets 0.10.1, or wait for the expo-modules-core runSync backport.",
    );
  });
});
