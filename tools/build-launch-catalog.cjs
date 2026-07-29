
const fs=require("fs"), path=require("path");
const g=require("../.generation-contracts-build/src/generation");
const dir="artifacts/generation";
const files=fs.readdirSync(dir).filter(f=>f.endsWith("-manifest.json"));
const accepted=[];
for(const f of files){
  const m=JSON.parse(fs.readFileSync(path.join(dir,f),"utf8"));
  for(const r of m.accepted||[]) accepted.push(r);
}
const byDiff={easy:[],medium:[],hard:[],expert:[]};
for(const r of accepted) byDiff[r.candidate.request.difficulty].push(r);
for(const rows of Object.values(byDiff)) rows.sort((a,b)=>b.scorecard.overall-a.scorecard.overall || (b.noveltyScore||0)-(a.noveltyScore||0) || a.index-b.index);
const quotas={easy:195,medium:200,hard:5,expert:0};
const picked=[];
for(const d of Object.keys(quotas)){
 const familyCount={};
 for(const r of byDiff[d]){
   const fam=r.candidate.composition.family;
   if((familyCount[fam]||0)>=Math.ceil(quotas[d]/2)) continue;
   picked.push(r); familyCount[fam]=(familyCount[fam]||0)+1;
   if(picked.filter(x=>x.candidate.request.difficulty===d).length>=quotas[d]) break;
 }
}
const puzzles=picked.map((r,i)=>g.candidateToPuzzle({...r.candidate,certificate:r.certificate},`launch-v1-puzzle-${String(i+1).padStart(4,"0")}`));
const ts=`import type { Puzzle } from "../../types/Puzzle";\n\nexport const CERTIFIED_LAUNCH_PUZZLES: readonly Puzzle[] = Object.freeze(${JSON.stringify(puzzles,null,2)});\n`;
fs.mkdirSync("src/data/generated",{recursive:true});
fs.writeFileSync("src/data/generated/certifiedLaunchPuzzles.ts",ts);
const analyses=fs.readdirSync(dir).filter(f=>f.endsWith("-analysis.json")).map(f=>JSON.parse(fs.readFileSync(path.join(dir,f),"utf8")));
const generated=analyses.filter(x=>x.generated).reduce((s,x)=>s+x.generated,0);
const report={generatedCandidates:generated,availableAccepted:Object.fromEntries(Object.entries(byDiff).map(([k,v])=>[k,v.length])),launchCatalog:Object.fromEntries(Object.keys(quotas).map(k=>[k,picked.filter(x=>x.candidate.request.difficulty===k).length])),puzzleCount:puzzles.length,notes:["Hard and expert generation throughput requires tuning before broad launch expansion.","Legacy generator retained until multiple full regression cycles pass."]};
fs.writeFileSync("artifacts/generation/launch-analysis.json",JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
