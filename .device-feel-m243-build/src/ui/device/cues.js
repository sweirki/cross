"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deviceFeelCue = deviceFeelCue;
exports.deviceFeelCues = deviceFeelCues;
const haptics = {
    "tile-select": "selection", "tile-place": "light", invalid: "warning",
    "equation-complete": "success", victory: "celebration",
    achievement: "success", "level-up": "celebration",
};
const sounds = {
    "tile-select": "tap", "tile-place": "place", invalid: "error",
    "equation-complete": "success", victory: "victory",
    achievement: "reward", "level-up": "reward",
};
const defaultAnnouncements = {
    "tile-select": "Tile selected.", "tile-place": "Tile placed.", invalid: "That move is not valid.",
    "equation-complete": "Equation completed.", victory: "Puzzle completed.",
    achievement: "Achievement unlocked.", "level-up": "Level up.",
};
function deviceFeelCue(event, preferences, sequence) {
    if (!Number.isSafeInteger(sequence) || sequence < 0) {
        throw new Error("Device feel sequence must be a non-negative safe integer.");
    }
    const announce = preferences.screenReaderOptimizations
        && !(preferences.announcementVerbosity === "minimal"
            && (event.kind === "tile-select" || event.kind === "tile-place"));
    return Object.freeze({
        sequence,
        kind: event.kind,
        targetId: event.targetId?.trim() || null,
        haptic: preferences.hapticsEnabled ? haptics[event.kind] : null,
        sound: preferences.soundEnabled ? sounds[event.kind] : null,
        announcement: announce ? (event.message?.trim() || defaultAnnouncements[event.kind]) : null,
        politeness: event.kind === "invalid" || event.kind === "victory" ? "assertive" : "polite",
    });
}
function deviceFeelCues(events, preferences, startSequence = 0) {
    if (!Number.isSafeInteger(startSequence) || startSequence < 0) {
        throw new Error("Device feel start sequence must be a non-negative safe integer.");
    }
    return Object.freeze(events.map((event, index) => deviceFeelCue(event, preferences, startSequence + index)));
}
