"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toPuzzleLibrary = toPuzzleLibrary;
exports.toRuntimeCampaign = toRuntimeCampaign;
exports.migratePuzzleProgress = migratePuzzleProgress;
function toPuzzleLibrary(catalog) {
    return Object.freeze({
        schemaVersion: 1,
        id: catalog.id,
        puzzles: Object.freeze(catalog.puzzles.map((record) => record.puzzle)),
    });
}
function toRuntimeCampaign(campaign) {
    return Object.freeze({
        schemaVersion: 1,
        id: campaign.id,
        chapters: Object.freeze(campaign.chapters.map((chapter) => Object.freeze({
            id: chapter.id,
            title: chapter.title,
            levels: Object.freeze(chapter.levels.map(({ difficulty: _difficulty, ...level }) => Object.freeze(level))),
        }))),
    });
}
function migratePuzzleProgress(progress, migration, catalog) {
    if (migration.schemaVersion !== 1 || migration.toCatalogId !== catalog.id) {
        throw new Error("Content migration map does not target this catalog.");
    }
    const validIds = new Set(catalog.puzzles.map((record) => record.id));
    const migrated = {};
    for (const [oldId, state] of Object.entries(progress).sort(([a], [b]) => a.localeCompare(b))) {
        const newId = migration.puzzleIdAliases[oldId] ?? oldId;
        if (!validIds.has(newId))
            continue;
        const candidate = Object.freeze({ ...state, puzzleId: newId });
        const existing = migrated[newId];
        if (!existing
            || candidate.completed && !existing.completed
            || candidate.stars > existing.stars
            || (candidate.bestTimeMs !== null && (existing.bestTimeMs === null || candidate.bestTimeMs < existing.bestTimeMs))) {
            migrated[newId] = candidate;
        }
    }
    return Object.freeze(migrated);
}
