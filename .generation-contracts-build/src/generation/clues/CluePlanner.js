"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planClues = planClues;
const GenerationSeeds_1 = require("../random/GenerationSeeds");
const SchemaVersions_1 = require("../versioning/SchemaVersions");
const ClueProfiles_1 = require("./ClueProfiles");
const CluePlanValidator_1 = require("./CluePlanValidator");
const DeductionSimulator_1 = require("./DeductionSimulator");
function hashText(text) {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}
function rank(seed, id) {
    let value = (seed ^ hashText(id)) >>> 0;
    value ^= value >>> 16;
    value = Math.imul(value, 0x7feb352d);
    value ^= value >>> 15;
    value = Math.imul(value, 0x846ca68b);
    value ^= value >>> 16;
    return value >>> 0;
}
function bankOrder(values, seed) {
    return values.map((value, index) => ({ value, index }))
        .sort((a, b) => rank(seed, `${a.value}:${a.index}`) - rank(seed, `${b.value}:${b.index}`) || a.index - b.index)
        .map((entry) => entry.value);
}
function planClues(request, composition, fill, candidateIndex = 0) {
    const profile = (0, ClueProfiles_1.clueProfileForDifficulty)(request.difficulty);
    const clueSeed = (0, GenerationSeeds_1.allocateStageSeeds)(request.rootSeed, candidateIndex).clue;
    const numberIds = composition.occupiedCells
        .filter((cell) => cell.kind === "number")
        .map((cell) => cell.cellId)
        .sort();
    if (numberIds.some((id) => fill.values[id] === undefined)) {
        return { ok: false, code: "INVALID_CLUE_COVERAGE", message: "The fill plan does not cover every number cell." };
    }
    const targetGivenCount = Math.max(1, Math.ceil(numberIds.length * profile.targetGivenRatio));
    const given = new Set(numberIds);
    const hidden = new Set();
    const removalOrder = [...numberIds].sort((a, b) => rank(clueSeed.value, a) - rank(clueSeed.value, b) || a.localeCompare(b));
    for (const cellId of removalOrder) {
        if (given.size <= targetGivenCount)
            break;
        given.delete(cellId);
        hidden.add(cellId);
        const trial = {
            givenCellIds: [...given].sort(),
            hiddenCellIds: [...hidden].sort(),
            numberBank: [...hidden].map((id) => fill.values[id]),
        };
        if (!(0, DeductionSimulator_1.simulateDeductions)(composition, fill, trial).solved) {
            hidden.delete(cellId);
            given.add(cellId);
        }
    }
    const givenCellIds = Object.freeze([...given].sort());
    const hiddenCellIds = Object.freeze([...hidden].sort());
    const numberBank = Object.freeze(bankOrder(hiddenCellIds.map((id) => fill.values[id]), clueSeed.value));
    const plan = Object.freeze({
        schema: SchemaVersions_1.GENERATION_SCHEMA_IDS.cluePlan,
        id: `${composition.id}:clues`,
        givenCellIds,
        hiddenCellIds,
        numberBank,
        profileId: profile.id,
        clueSeed,
    });
    const trace = (0, DeductionSimulator_1.simulateDeductions)(composition, fill, plan);
    if (!trace.solved) {
        return { ok: false, code: "UNSOLVABLE_BY_SUPPORTED_RULES", message: "The clue plan requires unsupported guessing.", trace };
    }
    (0, CluePlanValidator_1.assertValidCluePlan)(composition, fill, plan);
    return { ok: true, plan, trace };
}
