"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tuning_1 = require("../../src/generation/tuning");
let assertions = 0;
function check(condition, message) {
    assertions += 1;
    if (!condition)
        throw new Error(message);
}
for (const difficulty of ["easy", "medium", "hard", "expert"]) {
    const profile = (0, tuning_1.productionTuningProfile)(difficulty);
    check(profile.difficulty === difficulty, `${difficulty} profile mismatch`);
    check(profile.version === 2, `${difficulty} profile version mismatch`);
    check((0, tuning_1.validateQualityWeights)(profile), `${difficulty} weights must sum to one`);
    check(profile.minimumOverall > 0, `${difficulty} overall threshold invalid`);
    check(profile.minimumComponent > 0, `${difficulty} component threshold invalid`);
    check(profile.targetAcceptanceRate[0] < profile.targetAcceptanceRate[1], `${difficulty} acceptance target invalid`);
}
const sample = (0, tuning_1.distribution)([5, 1, 2, 4, 3, 100]);
check(sample.count === 6, "distribution count mismatch");
check(sample.minimum === 1 && sample.maximum === 100, "distribution bounds mismatch");
check(sample.median === 3, "distribution median mismatch");
check(sample.p95 === 100, "distribution p95 mismatch");
check((0, tuning_1.distribution)([]).count === 0, "empty distribution mismatch");
const hard = (0, tuning_1.productionTuningProfile)("hard");
const expert = (0, tuning_1.productionTuningProfile)("expert");
check(expert.weights.deductionRhythm > hard.weights.deductionRhythm, "expert deduction weighting should exceed hard");
check(expert.minimumOverall > hard.minimumOverall, "expert quality floor should exceed hard");
console.log(`Generator tuning Phase 13A: ${assertions}/${assertions} assertions passed.`);
