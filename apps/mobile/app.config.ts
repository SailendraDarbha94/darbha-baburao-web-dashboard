import type { ExpoConfig } from "expo/config";

// Values you must set before the first EAS build (README → Deploying):
//
// - extra.eas.projectId — printed by `eas init` (run inside apps/mobile after `eas login`). `eas init`
//   cannot write into a dynamic (.ts) config, so paste it in by hand:
//     extra: { eas: { projectId: "<uuid printed by eas init>" } }
//   Until then lib/notifications.ts logs a skip in development and the app runs without push.
// - ios.bundleIdentifier / android.package — the values below are PLACEHOLDERS; replace them with your
//   organisation's reverse-DNS identifiers before creating credentials (they are baked into provisioning
//   profiles and the Play listing and are hard to change later).
// - android.googleServicesFile: "./google-services.json" — add once the file exists (it is gitignored);
//   Android push registration fails without it. See README → Push notifications.
const config: ExpoConfig = {
  name: "Claims Agent",
  slug: "claims-agent",
  version: "1.0.0",
  scheme: "claimsagent", // deep links: claimsagent://reset-password, claimsagent://claims/<id>
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.example.claimsagent", // PLACEHOLDER — see the comment block above
  },
  android: {
    package: "com.example.claimsagent", // PLACEHOLDER — see the comment block above
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
  },
  plugins: [
    "expo-router",
    // Native setup for push: the APNs entitlement on iOS, FCM metadata on Android. The plugin's defaults
    // are enough (no custom icon, colour or sounds); the Android "default" channel is created at runtime
    // in lib/notifications.ts because channel importance cannot be set from the plugin.
    "expo-notifications",
    // iOS shows these strings when the app first asks for the photo library / camera; App Review rejects
    // builds whose usage descriptions are missing or generic.
    [
      "expo-image-picker",
      {
        photosPermission:
          "Claims Agent needs access to your photos to attach them to a claim.",
        cameraPermission:
          "Claims Agent needs the camera to photograph damage for a claim.",
        // The picker is only ever opened with mediaTypes: ["images"] (components/attachments.tsx), so the
        // plugin's default microphone entitlement (RECORD_AUDIO + NSMicrophoneUsageDescription, meant for
        // video capture) would be an unused permission for store review to question.
        microphonePermission: false,
      },
    ],
  ],
};

export default config;
