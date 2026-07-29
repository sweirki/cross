import { useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PuzzleBoard } from "../components/board/PuzzleBoard";
import { NumberBank } from "../components/tiles/NumberBank";
import { GameHud } from "../components/gameplay";
import { VictoryOverlay, useApplicationProgress, useGameplayFeedback } from "../application/react-native";
import { gameplayPolish } from "../application/v1";
import { ProgressionRewardOverlay, useProgression } from "../progression/react-native";
import { BUNDLED_LIBRARY } from "../data/bundledLibrary";
import { LEARNING_CONTENT } from "../data/learningContent";
import { useIntegratedGameSession } from "../integration/react-native";
import { buildGuidedLessonState, lessonProgressLabel } from "../services/GuidedLessonRuntime";
import { GameplayCelebration, useGameplayMotion } from "../ui/motion";
import { useGameplayDeviceFeel } from "../ui/device";
import { resolveBoardLayout, resolveVisualPalette } from "../ui/visual-refresh";
import { useTheme } from "../ui/theme";

export function PlayScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const palette = resolveVisualPalette(theme.mode, theme.contrast === "high");
  const visualLayout = resolveBoardLayout(width);
  const params = useLocalSearchParams<{ puzzleId: string; lessonId?: string; mode?: string; date?: string }>();
  const puzzle = BUNDLED_LIBRARY.puzzles.find(item => item.id === params.puzzleId);
  const lesson = params.lessonId ? LEARNING_CONTENT.lessons.find(item => item.id === params.lessonId) : undefined;
  if (puzzle === undefined) return <SafeAreaView style={styles.safe}><Text>Puzzle not found.</Text></SafeAreaView>;

  const {
    session, view, dispatch, selectedTileId, canUndo, canRedo,
    elapsedMs, mistakes, events, restored,
  } = useIntegratedGameSession(puzzle);
  const { progress, recordStarted, recordCompleted, markDailyComplete } = useApplicationProgress();
  const { progression, recordProgressionCompletion, dismissReward, clearRewards } = useProgression();
  const [showVictory, setShowVictory] = useState(false);
  const [pendingExit, setPendingExit] = useState(false);
  const started = useRef(false);
  const recorded = useRef(false);
  const feedback = useGameplayFeedback(false, true);
  const gameplayMotion = useGameplayMotion();
  const consumeDeviceFeel = useGameplayDeviceFeel();

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      recordStarted(puzzle.id, lesson?.id ?? null);
    }
  }, [lesson?.id, puzzle.id, recordStarted]);

  useEffect(() => {
    const runtimeEvents = events
      .filter(event => event.type === "game-event")
      .map(event => event.event);

    gameplayMotion.consume(runtimeEvents);
    void consumeDeviceFeel(runtimeEvents);

    for (const event of runtimeEvents) {
      switch (event.type) {
        case "tile-placed": feedback("tile-placed"); break;
        case "tile-removed": feedback("tile-removed"); break;
        case "equation-completed": feedback("equation-complete"); break;
        case "mistake-recorded": feedback("mistake"); break;
        case "hint-used": feedback("hint"); break;
        case "puzzle-completed": feedback("victory"); break;
      }
    }
  }, [consumeDeviceFeel, events, feedback, gameplayMotion.consume]);

  useEffect(() => {
    if (session?.completed === true && !recorded.current) {
      recorded.current = true;
      recordCompleted(puzzle.id, session.moves, session.hintsUsed);
      if (params.mode === "daily" && params.date) markDailyComplete(params.date);
      const reward = gameplayPolish.reward({
        puzzleId: puzzle.id,
        lessonId: lesson?.id ?? null,
        moves: session.moves,
        hintsUsed: session.hintsUsed,
        mistakes,
        elapsedMs,
        previousBestMoves: progress.puzzleProgress[puzzle.id]?.bestMoves ?? null,
      });
      const lessonCompleted = lesson !== undefined && lesson.puzzleIds.every(
        id => id === puzzle.id || progress.puzzleProgress[id]?.completed === true,
      );
      const campaignPuzzleIds = LEARNING_CONTENT.lessons.flatMap(item => item.puzzleIds);
      const campaignCompleted = campaignPuzzleIds.every(
        id => id === puzzle.id || progress.puzzleProgress[id]?.completed === true,
      );
      recordProgressionCompletion({
        puzzleId: puzzle.id,
        completedAt: new Date().toISOString(),
        stars: reward.stars,
        moves: session.moves,
        hintsUsed: session.hintsUsed,
        mistakes,
        elapsedMs,
        mode: lesson ? "lesson" : params.mode === "daily" ? "daily" : "practice",
        lessonCompleted,
        campaignCompleted,
      });
      setShowVictory(true);
    }
  }, [elapsedMs, lesson, markDailyComplete, mistakes, params.date, params.mode, progress.puzzleProgress, puzzle.id, recordCompleted, recordProgressionCompletion, session?.completed, session?.hintsUsed, session?.moves]);

  useEffect(() => {
    if (pendingExit && !showVictory && progression.rewardQueue.length === 0) {
      router.replace(lesson ? "/campaign" : "/");
    }
  }, [lesson, pendingExit, progression.rewardQueue.length, router, showVictory]);

  if (!restored || session === null || view === null) {
    return <SafeAreaView style={styles.safe}><View style={styles.loading}><ActivityIndicator size="large" /></View></SafeAreaView>;
  }

  const guide = lesson ? buildGuidedLessonState(lesson, puzzle, view, selectedTileId) : null;
  const prior = progress.puzzleProgress[puzzle.id];
  const completionInput = {
    puzzleId: puzzle.id,
    lessonId: lesson?.id ?? null,
    moves: session.moves,
    hintsUsed: session.hintsUsed,
    mistakes,
    elapsedMs,
    previousBestMoves: prior?.bestMoves ?? null,
  };

  const pressCell = (cellId: string) => {
    const cell = view.cells.find(item => item.cellId === cellId);
    if (cell?.source === "tile") dispatch({ type: "remove", cellId });
    else if (cell?.source === "empty" && selectedTileId !== null) dispatch({ type: "place-selected", cellId });
  };
  const replay = () => {
    setShowVictory(false);
    setPendingExit(false);
    clearRewards();
    recorded.current = false;
    dispatch({ type: "reset" });
  };
  const exitTarget = lesson ? "/campaign" : "/";
  const undo = () => { feedback("undo"); dispatch({ type: "undo" }); };
  const redo = () => { feedback("redo"); dispatch({ type: "redo" }); };

  const modeLabel = lesson ? `LESSON ${lesson.order}` : params.mode === "daily" ? "DAILY CHALLENGE" : "PRACTICE";

  return <SafeAreaView style={[styles.safe, { backgroundColor: palette.canvas }]}>
    <ScrollView
      contentContainerStyle={[
        styles.container,
        {
          paddingHorizontal: visualLayout.pagePadding,
          maxWidth: visualLayout.breakpoint === "wide" ? 960 : undefined,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <GameHud
        label={modeLabel}
        title={lesson?.title ?? "CrossMath puzzle"}
        moves={session.moves}
        hints={session.hintsUsed}
        elapsedMs={elapsedMs}
        canUndo={canUndo}
        canRedo={canRedo}
        onBack={() => router.replace("/")}
        onUndo={undo}
        onRedo={redo}
      />
      {guide && <View style={[styles.guide, { backgroundColor: palette.board, borderColor: palette.boardBorder }]}><Text style={[styles.guideMeta, { color: palette.accent }]}>{lessonProgressLabel(guide)}</Text><Text style={[styles.guideTitle, { color: palette.textStrong }]}>{guide.activeStep?.title ?? lesson!.completionMessage}</Text><Text style={[styles.guideBody, { color: palette.textMuted }]}>{guide.activeStep?.message ?? ""}</Text></View>}
      <PuzzleBoard
        view={view}
        selectedTileId={selectedTileId}
        onCellPress={pressCell}
        motionCue={gameplayMotion.snapshot.cue?.kind === "tile-select" ? null : gameplayMotion.snapshot.cue}
      />
      <NumberBank
        tiles={view.puzzle.numberBank}
        availableTileIds={view.availableTileIds}
        selectedTileId={selectedTileId}
        onSelect={tileId => dispatch({type:"select-tile",tileId:selectedTileId===tileId?null:tileId})}
        motionCue={gameplayMotion.snapshot.cue?.kind === "tile-select" ? gameplayMotion.snapshot.cue : null}
      />
      <View style={styles.actions}>
        <Pressable style={[styles.secondary, { backgroundColor: palette.board, borderColor: palette.boardBorder }]} onPress={() => dispatch({type:"hint"})}><Text style={[styles.secondaryText, { color: palette.accent }]}>Hint</Text></Pressable>
        <Pressable style={[styles.secondary, { backgroundColor: palette.board, borderColor: palette.boardBorder }]} onPress={() => dispatch({type:"reset"})}><Text style={[styles.secondaryText, { color: palette.accent }]}>Reset</Text></Pressable>
      </View>
    </ScrollView>
    <VictoryOverlay
      visible={showVictory}
      input={completionInput}
      continueLabel={lesson ? "Continue campaign" : "Back home"}
      onContinue={() => { setShowVictory(false); setPendingExit(true); }}
      onExit={() => { clearRewards(); router.replace(exitTarget); }}
      onReplay={replay}
    />
    <GameplayCelebration cue={gameplayMotion.snapshot.cue} />
    <ProgressionRewardOverlay
      reward={!showVictory ? progression.rewardQueue[0] ?? null : null}
      onDismiss={() => dismissReward()}
    />
  </SafeAreaView>;
}

const styles=StyleSheet.create({
  safe:{flex:1},
  loading:{flex:1,alignItems:"center",justifyContent:"center"},
  container:{
    width:"100%",
    alignSelf:"center",
    paddingTop:10,
    paddingBottom:36,
    gap:14,
  },
  guide:{
    padding:14,
    borderRadius:16,
    borderWidth:1,
  },
  guideMeta:{fontSize:10,fontWeight:"900",letterSpacing:1},
  guideTitle:{marginTop:4,fontSize:16,fontWeight:"900"},
  guideBody:{marginTop:4,lineHeight:19},
  actions:{flexDirection:"row",justifyContent:"center",gap:10},
  secondary:{
    minWidth:104,
    minHeight:44,
    paddingHorizontal:18,
    paddingVertical:10,
    borderRadius:14,
    borderWidth:1,
    alignItems:"center",
    justifyContent:"center",
  },
  secondaryText:{fontWeight:"900"},
});
