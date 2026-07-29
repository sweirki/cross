import { Stack } from "expo-router";
import { ApplicationProgressProvider } from "../src/application/react-native";
import { BUNDLED_LIBRARY } from "../src/data/bundledLibrary";
import { CrossMathAppProvider } from "../src/integration/react-native";
import { ProgressionProvider } from "../src/progression/react-native";
import { MotionProvider } from "../src/ui/motion";
import { DeviceProvider } from "../src/ui/device";
import { ThemeProvider } from "../src/ui/theme";

export default function RootLayout() {
  return (
    <ThemeProvider>
    <MotionProvider>
      <DeviceProvider>
      <CrossMathAppProvider playerId="local-player" library={BUNDLED_LIBRARY}>
      <ApplicationProgressProvider playerId="local-player">
        <ProgressionProvider playerId="local-player">
          <Stack screenOptions={{ headerShown: false }} />
        </ProgressionProvider>
      </ApplicationProgressProvider>
      </CrossMathAppProvider>
      </DeviceProvider>
    </MotionProvider>
    </ThemeProvider>
  );
}
