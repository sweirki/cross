"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCatalogIntegrity = validateCatalogIntegrity;
exports.validateCampaignIntegrity = validateCampaignIntegrity;
const Fingerprinting_1 = require("../certification/Fingerprinting");
function validateCatalogIntegrity(catalog) {
    const failures = [];
    if (catalog.schemaVersion !== 2)
        failures.push("catalog-schema");
    if (catalog.puzzles.length === 0)
        failures.push("catalog-empty");
    const ids = new Set();
    for (const record of catalog.puzzles) {
        if (ids.has(record.id))
            failures.push(`duplicate-puzzle-id:${record.id}`);
        ids.add(record.id);
        if (!record.certificate.valid)
            failures.push(`uncertified-puzzle:${record.id}`);
        if (record.puzzle.id !== record.id)
            failures.push(`runtime-id-mismatch:${record.id}`);
    }
    const { fingerprint: stored, ...base } = catalog;
    if (stored !== (0, Fingerprinting_1.fingerprint)(base))
        failures.push("catalog-fingerprint");
    return Object.freeze({ valid: failures.length === 0, failures: Object.freeze(failures) });
}
function validateCampaignIntegrity(campaign, catalog) {
    const failures = [];
    if (campaign.schemaVersion !== 2)
        failures.push("campaign-schema");
    if (campaign.catalogId !== catalog.id)
        failures.push("campaign-catalog-id");
    const puzzleIds = new Set(catalog.puzzles.map((record) => record.id));
    const levelIds = new Set();
    let prior;
    for (const chapter of campaign.chapters) {
        for (const level of chapter.levels) {
            if (levelIds.has(level.id))
                failures.push(`duplicate-level-id:${level.id}`);
            levelIds.add(level.id);
            if (!puzzleIds.has(level.puzzleId))
                failures.push(`missing-puzzle:${level.puzzleId}`);
            if (level.unlockAfterLevelId !== prior)
                failures.push(`unlock-chain:${level.id}`);
            prior = level.id;
        }
    }
    const { fingerprint: stored, ...base } = campaign;
    if (stored !== (0, Fingerprinting_1.fingerprint)(base))
        failures.push("campaign-fingerprint");
    return Object.freeze({ valid: failures.length === 0, failures: Object.freeze(failures) });
}
