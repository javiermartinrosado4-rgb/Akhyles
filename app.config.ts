import "tsx/cjs";
import { ExpoConfig } from "expo/config";
import APP from "./brand.json";
import { requirePublicHttps } from "./src/logic/endpoints";
const localAndroid = process.env.AKHYLES_ANDROID_LOCAL === "1";
const googleIosUrlScheme = process.env.AKHYLES_GOOGLE_IOS_URL_SCHEME;
if (!localAndroid && process.env.EXPO_PUBLIC_COMMUNITY_URL) requirePublicHttps(process.env.EXPO_PUBLIC_COMMUNITY_URL);
if (!localAndroid && process.env.NODE_ENV === "production" && process.env.EXPO_PUBLIC_ACCOUNT_URL) requirePublicHttps(process.env.EXPO_PUBLIC_ACCOUNT_URL);
const config: ExpoConfig = {
  name: APP.name,
  slug: APP.slug,
    version: "1.0.36",
  orientation: "portrait",
  scheme: APP.slug,
  userInterfaceStyle: "dark",
  icon: "./assets/brand/icon.png",
  ios: {
    bundleIdentifier: "com.javiermartinrosado.akhyles",
    buildNumber: "1",
    supportsTablet: false,
  },
  android: {
    package: "com.javiermartinrosado.akhyles",
      versionCode: 39,
    allowBackup: false,
    softwareKeyboardLayoutMode: "resize",
    adaptiveIcon: {
      foregroundImage: "./assets/brand/foreground.png",
      backgroundColor: "#070A09",
      monochromeImage: "./assets/brand/monochrome.png",
    },
    blockedPermissions: [
      "android.permission.CAMERA",
      "android.permission.READ_MEDIA_IMAGES",
      "android.permission.READ_MEDIA_VIDEO",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "android.permission.SYSTEM_ALERT_WINDOW",
      "android.permission.RECORD_AUDIO",
    ],
    intentFilters: [{ action: "VIEW", autoVerify: true, data: [{ scheme: "https", host: "api.akhyles.com", pathPrefix: "/verify" }], category: ["BROWSABLE", "DEFAULT"] }],
  },
  plugins: [
    ["expo-localization", { supportedLocales: { ios: ["es", "en"], android: ["es", "en"] } }],
    "expo-router",
    "expo-secure-store",
    "expo-sqlite",
    ...(googleIosUrlScheme ? [["react-native-nitro-google-signin", { iosUrlScheme: googleIosUrlScheme }]] : []),
    "./plugins/withAsyncStorageDatabaseSize",
    ["expo-notifications", { icon: "./assets/brand/notification-icon.png", color: "#C39850" }],
    "./plugins/withAndroidSigning",
    ["expo-splash-screen", { image: "./assets/brand/splash.png", imageWidth: 260, backgroundColor: "#0F1412", dark: { backgroundColor: "#0F1412" } }],
    ["expo-build-properties", { android: { usesCleartextTraffic: localAndroid } }],
    // Android autolinks Nitro Google Sign-In; its client ID comes from our API.
    // The package's config plugin is only needed for Firebase files / iOS.
    [
      "expo-image-picker",
      {
        photosPermission:
          "Selecciona fotografías para tu perfil, publicaciones o la demostración opcional.",
        cameraPermission: "Graba la primera serie de un ejercicio para revisarla con tu entrenador.",
        microphonePermission: false,
      },
    ],
  ],
  web: {
    bundler: "metro",
    output: "single",
    favicon: "./assets/brand/favicon.png",
  },
  experiments: { typedRoutes: true },
  extra: {
    eas: { projectId: "0d55315c-62ca-4ecf-a9d1-736ba51ea21d" },
    communityLocalTest: localAndroid,
    // Keep the trainer workspace experimental until it is explicitly enabled for a release.
    trainerWorkspaceExperiment: process.env.EXPO_PUBLIC_TRAINER_WORKSPACE === "1",
  },
};
export default config;
