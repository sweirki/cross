
const fs=require("fs"); const g=require("../.generation-contracts-build/src/generation");
const shard=Number(process.argv[2]), pool=625;
const req={schema:g.GENERATION_SCHEMA_IDS.generationRequest,requestId:`launch-easy-extra-s${shard}`,rootSeed:`crossmath-launch-2026-easy-extra-s${shard}`,difficulty:"easy",generatorVersion:g.COMMERCIAL_GENERATOR_VERSION,candidateCount:pool,constraints:{}};
const t=Date.now(); const res=g.runCandidateSearch(req,{poolSize:pool,acceptanceLimit:40,maximumPerComposition:20,maximumPerDependency:20});
fs.mkdirSync("artifacts/generation",{recursive:true});
fs.writeFileSync(`artifacts/generation/easy-extra-s${shard}-manifest.json`,JSON.stringify(res.manifest));
fs.writeFileSync(`artifacts/generation/easy-extra-s${shard}-analysis.json`,JSON.stringify({difficulty:"easy",shard,generated:pool,accepted:res.manifest.acceptedCount,ms:Date.now()-t,rejectionCounts:res.manifest.rejectionCounts},null,2));
console.log(shard);
