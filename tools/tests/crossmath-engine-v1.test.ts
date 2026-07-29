import { CrossMathEngine } from "../../src/engine/api/CrossMathEngine";
import { DeterministicRandom } from "../../src/engine/random/DeterministicRandom";

let assertions = 0;
function check(condition: unknown, message?: string): asserts condition {
  if (!condition) throw new Error(message ?? "Assertion failed.");
  assertions += 1;
}

const firstRandom = new DeterministicRandom(12345);
const secondRandom = new DeterministicRandom(12345);
check(firstRandom.nextUint32() === secondRandom.nextUint32());
check(
  JSON.stringify(firstRandom.shuffle([1, 2, 3, 4, 5])) ===
    JSON.stringify(secondRandom.shuffle([1, 2, 3, 4, 5])),
);

const engine = new CrossMathEngine();
const options = {
  seed: 20260728,
  difficulty: "easy" as const,
  width: 7,
  height: 7,
  equationCount: 2,
  hiddenCellCount: 2,
  operators: ["add", "subtract"] as const,
};

const first = engine.generate(options);
const second = engine.generate(options);

check(JSON.stringify(first.puzzle) === JSON.stringify(second.puzzle));
check(first.fingerprints.exact === second.fingerprints.exact);
check(first.generationSeed === second.generationSeed);
check(first.puzzle.numberBank.length >= 1);
check(first.puzzle.numberBank.length <= 2);
check(first.certification.unique === true);

const verification = engine.verify(first.puzzle);
check(verification.valid);
check(verification.unique);
check(verification.verification?.solutionCount === 1);

const solved = engine.solve(first.puzzle, {
  solutionLimit: 2,
  includeTrace: true,
});
check(solved.status === "unique");
check(solved.solutionCount === 1);
check(solved.searchExhausted);
check(solved.firstSolution !== null);
check(solved.trace.length > 0);

const fingerprints = engine.fingerprint(first.puzzle);
check(fingerprints.exact.startsWith("exact-v1-"));
check(fingerprints.topology.startsWith("topology-v1-"));
check(fingerprints.solution.startsWith("solution-v1-"));

const certification = engine.certify(first.puzzle);
check(certification.fingerprint === first.certification.fingerprint);
check(certification.score >= 0 && certification.score <= 100);

const different = engine.generate({ ...options, seed: options.seed + 1 });
check(different.fingerprints.exact !== first.fingerprints.exact);

const library = engine.exportLibrary({
  rootSeed: "engine-v1-test",
  count: 3,
  chunkSize: 2,
  maximumAttempts: 30,
  difficulty: "easy",
  width: 7,
  height: 7,
  equationCount: 2,
  hiddenCellCount: 2,
  operators: ["add", "subtract"],
});
check(library.records.length === 3);
check(library.chunks.length === 2);
check(library.manifest.generatedCount === 3);
check(new Set(library.records.map((record) => record.fingerprints.exact)).size === 3);
check(library.records.every((record) => record.certification.unique));

const repeatedLibrary = engine.exportLibrary({
  rootSeed: "engine-v1-test",
  count: 3,
  chunkSize: 2,
  maximumAttempts: 30,
  difficulty: "easy",
  width: 7,
  height: 7,
  equationCount: 2,
  hiddenCellCount: 2,
  operators: ["add", "subtract"],
});
check(
  JSON.stringify(library.records.map((record) => record.fingerprints.exact)) ===
    JSON.stringify(repeatedLibrary.records.map((record) => record.fingerprints.exact)),
);

let rejectedInvalidEquationCount = false;
try {
  engine.generate({ seed: 1, difficulty: "easy", equationCount: 1 });
} catch (error) {
  rejectedInvalidEquationCount =
    error instanceof Error && /at least 2/.test(error.message);
}
check(rejectedInvalidEquationCount);

console.log(`CrossMath Engine v1 assertions: ${assertions}/${assertions} PASS`);
