import type { ExpoConfig } from "expo/config";

// Remaining setup before Android push works (README → Push notifications):
// - android.googleServicesFile: "./google-services.json" — add once the file exists (it is gitignored);
//   Android push registration fails without it.
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
    bundleIdentifier: "com.sailendradarbha.claimsagent",
  },
  android: {
    package: "com.sailendradarbha.claimsagent",
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
  },
  extra: {
    // Filled in by hand: `eas init` prints the id but cannot write to a dynamic (.ts) config.
    // lib/notifications.ts reads it when requesting an Expo push token.
    eas: { projectId: "d62390ba-7d80-4688-944e-1969d69a9815" },
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
