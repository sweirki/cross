"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRODUCTION_COMPOSITION_PROFILES = void 0;
exports.listCompositionProfilesForDifficulty = listCompositionProfilesForDifficulty;
const COUNTS = {
    easy: [2, 3],
    medium: [3, 4],
    hard: [3, 5],
    expert: [4, 6],
};
exports.PRODUCTION_COMPOSITION_PROFILES = [
    { id: "four-corners", difficulties: ["easy", "medium", "hard"], clusterCount: COUNTS, minimumGap: 2, margin: 1 },
    { id: "triangle", difficulties: ["easy", "medium", "hard"], clusterCount: COUNTS, minimumGap: 2, margin: 1 },
    { id: "center-weighted", difficulties: ["medium", "hard", "expert"], clusterCount: COUNTS, minimumGap: 2, margin: 1 },
    { id: "diagonal", difficulties: ["easy", "medium", "hard", "expert"], clusterCount: COUNTS, minimumGap: 2, margin: 1 },
    { id: "hourglass", difficulties: ["medium", "hard", "expert"], clusterCount: COUNTS, minimumGap: 2, margin: 1 },
    { id: "balanced-asymmetric", difficulties: ["easy", "medium", "hard", "expert"], clusterCount: COUNTS, minimumGap: 2, margin: 1 },
];
function listCompositionProfilesForDifficulty(difficulty) {
    return exports.PRODUCTION_COMPOSITION_PROFILES.filter((profile) => profile.difficulties.includes(difficulty));
}
