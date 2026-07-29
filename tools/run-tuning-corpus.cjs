
const fs = require("fs");
const path = require("path");
const g = require("../.generation-contracts-build/src/generation");

const total = Number(process.argv[2] || 100000);
const shardIndex = Number(process.argv[3] || 0);
const shardCount = Number(process.argv[4] || 100);
if (!Number.isInteger(total) || total < 1 || !Number.isInteger(shardIndex) || shardIndex < 0 || !Number.isInteger(shardCount) || shardCount < 1 || shardIndex >= shardCount) {
  throw new Error("Usage: node tools/run-tuning-corpus.cjs [total=100000] [shardIndex=0] [shardCount=100]");
}
const difficulties = ["easy", "medium", "hard", "expert"];
const base = Math.floor(total / shardCount);
const remainder = total % shardCount;
const shardSize = base + (shardIndex < remainder ? 1 : 0);
const difficulty = difficulties[shardIndex % difficulties.length];
const request = {
  schema: g.GENERATION_SCHEMA_IDS.generationRequest,
  requestId: `tuning-v2-${difficulty}-s${shardIndex}`,
  rootSeed: `crossmath-tuning-v2-${difficulty}-s${shardIndex}`,
  difficulty,
  generatorVersion: g.COMMERCIAL_GENERATOR_VERSION,
  candidateCount: shardSize,
  constraints: {},
};
const started = Date.now();
const result = g.runCandidateSearch(request, {
  poolSize: shardSize,
  acceptanceLimit: Math.max(1, Math.ceil(shardSize * 0.08)),
  maximumPerComposition: Math.max(1, Math.ceil(shardSize * 0.03)),
  maximumPerDependency: Math.max(1, Math.ceil(shardSize * 0.03)),
});
const analysis = g.analyzeGenerationManifest(result.manifest);
const outputDir = path.join("artifacts", "tuning-v2");
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, `manifest-${shardIndex}.json`), JSON.stringify(result.manifest));
fs.writeFileSync(path.join(outputDir, `analysis-${shardIndex}.json`), JSON.stringify({ ...analysis, elapsedMs: Date.now() - started }, null, 2));
console.log(JSON.stringify({ shardIndex, shardCount, shardSize, difficulty, accepted: result.manifest.acceptedCount, elapsedMs: Date.now() - started }));
