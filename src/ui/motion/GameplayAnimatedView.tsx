import { useEffect, useRef, type ReactNode } from "react";
import { Animated, type StyleProp, type ViewStyle } from "react-native";
import type { GameplayMotionCue } from "./gameplay";

export function GameplayAnimatedView({
  cue,
  children,
  style,
  testID,
}: {
  readonly cue: GameplayMotionCue | null;
  readonly children: ReactNode;
  readonly style?: StyleProp<ViewStyle>;
  readonly testID?: string;
}) {
  const progress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (cue === null || !cue.animation.enabled) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: cue.animation.durationMs,
      useNativeDriver: true,
    }).start();
  }, [cue?.sequence, progress]);

  const kind = cue?.kind;
  const distance = cue?.animation.distance ?? 0;
  const scale = cue?.animation.scale ?? 1;
  const animatedStyle: Animated.WithAnimatedObject<ViewStyle> =
    kind === "mistake"
      ? {
          transform: [{
            translateX: progress.interpolate({
              inputRange: [0, 0.25, 0.5, 0.75, 1],
              outputRange: [0, -distance, distance, -distance / 2, 0],
            }),
          }],
        }
      : kind === "tile-select" || kind === "tile-place"
        ? {
            transform: [{
              scale: progress.interpolate({
                inputRange: [0, 0.55, 1],
                outputRange: [1, scale, 1],
              }),
            }],
          }
        : kind === "equation-complete"
          ? {
              opacity: progress.interpolate({
                inputRange: [0, 0.45, 1],
                outputRange: [0.72, 1, 1],
              }),
              transform: [{
                scale: progress.interpolate({
                  inputRange: [0, 0.45, 1],
                  outputRange: [1, scale, 1],
                }),
              }],
            }
          : {
              opacity: progress,
              transform: [{
                translateY: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [distance, 0],
                }),
              }],
            };

  return <Animated.View testID={testID} style={[style, animatedStyle]}>{children}</Animated.View>;
}
