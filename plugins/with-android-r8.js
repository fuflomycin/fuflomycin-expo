const {
  AndroidConfig,
  withAppBuildGradle,
  withGradleProperties,
} = require("expo/config-plugins");

function withAndroidR8(config) {
  config = withGradleProperties(config, (config) => {
    AndroidConfig.BuildProperties.updateAndroidBuildProperty(
      config.modResults,
      "android.r8.optimizedResourceShrinking",
      "true",
    );
    return config;
  });
  config = withAppBuildGradle(config, (config) => {
    config.modResults.contents = config.modResults.contents.replaceAll(
      '"proguard-android.txt"',
      '"proguard-android-optimize.txt"',
    );
    return config;
  });
  return config;
}

module.exports = withAndroidR8;
