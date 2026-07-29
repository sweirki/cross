import { useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import type { GameplayMotionCue } from "./gameplay";

const PARTICLES = Object.freeze([
  { x: -72, y: 150, rotate: "-120deg" },
  { x: -42, y: 180, rotate: "95deg" },
  { x: -15, y: 135, rotate: "-70deg" },
  { x: 18, y: 165, rotate: "125deg" },
  { x: 48, y: 145, rotate: "-105deg" },
  { x: 76, y: 175, rotate: "80deg" },
]);

export function GameplayCelebration({ cue }: { readonly cue: GameplayMotionCue | null }) {
  const progress = useRef(new Animated.Value(0)).current;
  const active = cue?.kind === "victory" && cue.animation.enabled;

  useEffect(() => {
    if (!active) {
      progress.setValue(0);
      return;
    }
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: cue.animation.durationMs,
      useNativeDriver: true,
    }).start();
  }, [active, cue?.sequence, progress]);

  const particles = useMemo(() => PARTICLES, []);
  if (!active) return null;

  return (
    <View pointerEvents="none" accessibilityElementsHidden style={StyleSheet.absoluteFill}>
      {particles.map((particle, index) => (
        <Animated.View
          key={index}
          style={[
            styles.particle,
            {
              left: "50%",
              opacity: progress.interpolate({
                inputRange: [0, 0.15, 0.85, 1],
                outputRange: [0, 1, 1, 0],
              }),
              transform: [
                { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, particle.x] }) },
                { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-12, particle.y] }) },
                { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ["0deg", particle.rotate] }) },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: "absolute",
    top: 20,
    width: 8,
    height: 14,
    borderRadius: 2,
    backgroundColor: "#F0B429",
  },
});
