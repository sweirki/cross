"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INITIAL_GAMEPLAY_MOTION_SNAPSHOT = void 0;
exports.gameplayMotionCue = gameplayMotionCue;
exports.gameplayMotionCues = gameplayMotionCues;
exports.reduceGameplayMotion = reduceGameplayMotion;
const animations_1 = require("./animations");
const transitions_1 = require("./transitions");
const animationForKind = Object.freeze({
    "tile-select": "pop",
    "tile-place": "pop",
    "tile-remove": "fade",
    "equation-complete": "glow",
    mistake: "shake",
    victory: "confetti",
    "board-reset": "fade",
});
function emphasisForKind(kind) {
    if (kind === "victory" || kind === "mistake")
        return "strong";
    if (kind === "tile-select" || kind === "tile-place" || kind === "equation-complete")
        return "subtle";
    return "none";
}
function gameplayMotionCue(event, preferences, sequence) {
    if (!Number.isSafeInteger(sequence) || sequence < 0) {
        throw new Error("Gameplay motion sequence must be a non-negative safe integer.");
    }
    const targetId = event.targetId?.trim() || null;
    const transition = event.kind === "board-reset"
        ? (0, transitions_1.motionTransition)("board-change", preferences)
        : null;
    return Object.freeze({
        kind: event.kind,
        targetId,
        animation: (0, animations_1.motionAnimation)(animationForKind[event.kind], preferences),
        transition,
        emphasis: emphasisForKind(event.kind),
        sequence,
    });
}
function gameplayMotionCues(events, preferences, startSequence = 0) {
    if (!Number.isSafeInteger(startSequence) || startSequence < 0) {
        throw new Error("Gameplay motion start sequence must be a non-negative safe integer.");
    }
    return Object.freeze(events.map((event, index) => gameplayMotionCue(event, preferences, startSequence + index)));
}
exports.INITIAL_GAMEPLAY_MOTION_SNAPSHOT = Object.freeze({
    sequence: 0,
    tileId: null,
    cellId: null,
    equationId: null,
    mistakeId: null,
    boardRevision: 0,
    victoryRevision: 0,
    cue: null,
});
function reduceGameplayMotion(snapshot, cue) {
    if (cue.sequence < snapshot.sequence)
        return snapshot;
    return Object.freeze({
        sequence: cue.sequence + 1,
        tileId: cue.kind === "tile-select" ? cue.targetId : snapshot.tileId,
        cellId: cue.kind === "tile-place" || cue.kind === "tile-remove" ? cue.targetId : snapshot.cellId,
        equationId: cue.kind === "equation-complete" ? cue.targetId : snapshot.equationId,
        mistakeId: cue.kind === "mistake" ? cue.targetId : snapshot.mistakeId,
        boardRevision: snapshot.boardRevision + (cue.kind === "board-reset" ? 1 : 0),
        victoryRevision: snapshot.victoryRevision + (cue.kind === "victory" ? 1 : 0),
        cue,
    });
}
