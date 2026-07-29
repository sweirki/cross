
const fs=require("fs");
const g=require("../.generation-contracts-build/src/generation");
const difficulty=process.argv[2], shard=Number(process.argv[3]);
if(!["easy","medium","hard","expert"].includes(difficulty)||!Number.isInteger(shard)) throw new Error("difficulty and shard required");
const pool=25;
const req={schema:g.GENERATION_SCHEMA_IDS.generationRequest,requestId:`launch-${difficulty}-v1-s${shard}`,rootSeed:`crossmath-launch-2026-${difficulty}-s${shard}`,difficulty,generatorVersion:g.COMMERCIAL_GENERATOR_VERSION,candidateCount:pool,constraints:{}};
const t=Date.now();
const res=g.runCandidateSearch(req,{poolSize:pool,acceptanceLimit:5,maximumPerComposition:5,maximumPerDependency:5});
const ms=Date.now()-t;
fs.mkdirSync("artifacts/generation",{recursive:true});
fs.writeFileSync(`artifacts/generation/${difficulty}-s${shard}-manifest.json`,JSON.stringify(res.manifest));
const scores=res.manifest.accepted.map(r=>r.scorecard.overall).sort((a,b)=>a-b);
const q=p=>scores[Math.min(scores.length-1,Math.floor((scores.length-1)*p))]??null;
const report={difficulty,shard,generated:pool,accepted:res.manifest.acceptedCount,ms,rejectionCounts:res.manifest.rejectionCounts,score:{min:scores[0],p25:q(.25),median:q(.5),p75:q(.75),max:scores[scores.length-1]},families:Object.fromEntries([...new Set(res.manifest.accepted.map(r=>r.candidate.composition.family))].sort().map(f=>[f,res.manifest.accepted.filter(r=>r.candidate.composition.family===f).length]))};
fs.writeFileSync(`artifacts/generation/${difficulty}-s${shard}-analysis.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
