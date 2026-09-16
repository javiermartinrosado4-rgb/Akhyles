const { withAppBuildGradle } = require("expo/config-plugins");

module.exports = function withAndroidSigning(config) {
  return withAppBuildGradle(config, (config) => {
    const marker = "// Akhyles local release signing";
    if (!config.modResults.contents.includes(marker)) {
      config.modResults.contents += `
${marker}
def akhylesSigningPath = System.getenv("AKHYLES_ANDROID_SIGNING_FILE")
if (akhylesSigningPath) {
    def akhylesSigning = new Properties()
    new File(akhylesSigningPath).withInputStream { akhylesSigning.load(it) }
    android.signingConfigs.create("akhyles") {
        storeFile new File(akhylesSigning.getProperty("storeFile"))
        storePassword akhylesSigning.getProperty("storePassword")
        keyAlias akhylesSigning.getProperty("keyAlias")
        keyPassword akhylesSigning.getProperty("keyPassword")
    }
    android.buildTypes.release.signingConfig = android.signingConfigs.akhyles
}
`;
    }
    const guard = "// Akhyles reject unsigned release";
    if (!config.modResults.contents.includes(guard)) config.modResults.contents += `
${guard}
gradle.taskGraph.whenReady { graph ->
    if (!System.getenv("AKHYLES_ANDROID_SIGNING_FILE") && graph.allTasks.any { it.project == project && it.name.toLowerCase().contains("release") }) {
        throw new GradleException("Release requires AKHYLES_ANDROID_SIGNING_FILE; debug signing is forbidden.")
    }
}
`;
    return config;
  });
};
