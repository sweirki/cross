
const fs=require("fs");
const path=require("path");
const g=require("../.generation-contracts-build/src/generation");
const difficulties=["easy","medium","hard","expert"];
const all=[];
const reports=[];
for(const difficulty of difficulties){
 const req={schema:g.GENERATION_SCHEMA_IDS.generationRequest,requestId:`launch-${difficulty}-v1`,rootSeed:`crossmath-launch-2026-${difficulty}`,difficulty,generatorVersion:g.COMMERCIAL_GENERATOR_VERSION,candidateCount:2500,constraints:{}};
 const t=Date.now();
 const res=g.runCandidateSearch(req,{poolSize:2500,acceptanceLimit:150,maximumPerComposition:50,maximumPerDependency:50});
 const ms=Date.now()-t;
 const accepted=res.manifest.accepted;
 const scores=accepted.map(r=>r.scorecard.overall).sort((a,b)=>a-b);
 const quantile=(p)=>scores[Math.min(scores.length-1,Math.floor((scores.length-1)*p))]??null;
 reports.push({difficulty,generated:2500,accepted:accepted.length,ms,rejectionCounts:res.manifest.rejectionCounts,score:{min:scores[0],p25:quantile(.25),median:quantile(.5),p75:quantile(.75),max:scores[scores.length-1]},families:Object.fromEntries([...new Set(accepted.map(r=>r.candidate.composition.family))].sort().map(f=>[f,accepted.filter(r=>r.candidate.composition.family===f).length]))});
 all.push(...accepted.map(r=>({difficulty,record:r})));
 console.log(difficulty,ms,accepted.length);
}
fs.mkdirSync("artifacts/generation",{recursive:true});
fs.writeFileSync("artifacts/generation/candidate-analysis.json",JSON.stringify({generated:10000,reports},null,2));
const selected=[];
for(const difficulty of difficulties){
 const rows=all.filter(x=>x.difficulty===difficulty).sort((a,b)=>b.record.scorecard.overall-a.record.scorecard.overall || b.record.noveltyScore-a.record.noveltyScore || a.record.index-b.record.index);
 const familyCounts={};
 for(const row of rows){
   const fam=row.record.candidate.composition.family;
   if((familyCounts[fam]||0)>=25) continue;
   selected.push(row.record); familyCounts[fam]=(familyCounts[fam]||0)+1;
   if(selected.filter(r=>r.candidate.request.difficulty===difficulty).length>=100) break;
 }
}
const puzzles=selected.map((r,i)=>{
 const c={...r.candidate,certificate:r.certificate};
 const p=g.candidateToPuzzle(c,`launch-v1-puzzle-${String(i+1).padStart(4,"0")}`);
 return {puzzle:p,scorecard:r.scorecard,dna:r.dna,certificate:r.certificate};
});
fs.writeFileSync("artifacts/generation/launch-catalog.json",JSON.stringify({schemaVersion:2,id:"crossmath-launch-v1",generatedFrom:10000,puzzleCount:puzzles.length,puzzles},null,2));
console.log(JSON.stringify({selected:puzzles.length,reports},null,2));
