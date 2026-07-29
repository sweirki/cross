import { canonicalSerialize } from "../versioning/CanonicalSerialization";
import { getClusterTemplate } from "../clusters/ClusterLibrary";
import { transformClusterTemplate } from "../clusters/ClusterTransforms";
import { renderCompositionAscii } from "../composition/CompositionPreview";
import { renderDependencyGraphAsText } from "../dependency/DependencyPreview";
import { simulateDeductions } from "../clues/DeductionSimulator";
import { generateCandidate } from "../industrial/CandidatePipeline";
import { normalizeSearchOptions } from "../industrial/SearchCheckpoint";
import { runCandidateSearch } from "../industrial/CandidateSearch";
import type {
  GenerationManifest,
  RankedCandidateRecord,
} from "../industrial/IndustrialTypes";
import type { PuzzleCandidate } from "../contracts/GenerationContracts";
import { renderCandidateSvg } from "./StudioSvg";
import type {
  PuzzleStudioV2Contract,
  StudioArithmeticEquation,
  StudioCandidateSummary,
  StudioComparison,
  StudioComparisonMetric,
  StudioExport,
  StudioInspection,
  StudioSearchSession,
} from "./StudioTypes";

function summary(record: RankedCandidateRecord): StudioCandidateSummary {
  return Object.freeze({
    index: record.index,
    ...(record.candidate ? { id: record.candidate.id } : {}),
    disposition: record.disposition,
    ...(record.rank === undefined ? {} : { rank: record.rank }),
    ...(record.scorecard ? { overallScore: record.scorecard.overall } : {}),
    ...(record.noveltyScore === undefined ? {} : { noveltyScore: record.noveltyScore }),
    certified: record.certificate?.valid === true,
    ...(record.rejectionReason ? { rejectionReason: record.rejectionReason } : {}),
  });
}

function findRecord(manifest: GenerationManifest, index: number): RankedCandidateRecord {
  if (!Number.isInteger(index) || index < 0) throw new Error("Candidate index must be a non-negative integer.");
  const record = manifest.records.find((item) => item.index === index);
  if (!record) throw new Error(`Unknown candidate index ${index}.`);
  return record;
}

function equations(candidate: PuzzleCandidate): readonly StudioArithmeticEquation[] {
  const output: StudioArithmeticEquation[] = [];
  for (const cluster of candidate.composition.clusters) {
    const template = transformClusterTemplate(getClusterTemplate(cluster.templateId), cluster.transform);
    for (const path of template.equations) {
      const id = `${cluster.id}:${path.id.split(":").pop()!}`;
      const cellIds = [
        cluster.cellIdMap[path.cellIds[0]]!,
        cluster.cellIdMap[path.cellIds[2]]!,
        cluster.cellIdMap[path.cellIds[4]]!,
      ] as const;
      output.push(Object.freeze({
        id,
        left: candidate.fill.values[cellIds[0]]!,
        operator: candidate.fill.operators[id]!,
        right: candidate.fill.values[cellIds[1]]!,
        result: candidate.fill.values[cellIds[2]]!,
        cellIds,
      }));
    }
  }
  return Object.freeze(output.sort((a, b) => a.id.localeCompare(b.id)));
}

function inspectRecord(record: RankedCandidateRecord): StudioInspection {
  const candidate = record.candidate;
  if (!candidate) {
    return Object.freeze({
      summary: summary(record),
      equations: Object.freeze([]),
      givenCells: Object.freeze([]),
      hiddenCells: Object.freeze([]),
      deductionSteps: Object.freeze([]),
      failures: record.failures,
    });
  }
  const trace = simulateDeductions(candidate.composition, candidate.fill, candidate.clues);
  const values = candidate.fill.values;
  return Object.freeze({
    summary: summary(record),
    candidate,
    compositionAscii: renderCompositionAscii(candidate.composition),
    dependencyText: renderDependencyGraphAsText(candidate.dependency),
    equations: equations(candidate),
    givenCells: Object.freeze(candidate.clues.givenCellIds.map((id) => Object.freeze({ id, value: values[id]! }))),
    hiddenCells: Object.freeze(candidate.clues.hiddenCellIds.map((id) => Object.freeze({ id, value: values[id]! }))),
    deductionTrace: trace,
    deductionSteps: trace.steps,
    ...(record.scorecard ? { scorecard: record.scorecard } : {}),
    failures: record.failures,
    ...(candidate.dna ? { provenance: candidate.dna } : {}),
  });
}

function textExport(inspection: StudioInspection): string {
  const lines = [
    `Candidate ${inspection.summary.index}: ${inspection.summary.id ?? "generation failed"}`,
    `Disposition: ${inspection.summary.disposition}`,
    `Score: ${inspection.summary.overallScore ?? "n/a"}`,
  ];
  if (inspection.compositionAscii) lines.push("", "Composition", inspection.compositionAscii);
  if (inspection.equations.length > 0) {
    lines.push("", "Arithmetic");
    for (const equation of inspection.equations) {
      lines.push(`${equation.id}: ${equation.left} ${equation.operator} ${equation.right} = ${equation.result}`);
    }
  }
  if (inspection.deductionTrace) {
    lines.push("", `Deduction solved: ${inspection.deductionTrace.solved}`);
    for (const step of inspection.deductionSteps) lines.push(`${step.index + 1}. ${step.rule} -> ${step.cellId} = ${step.value}`);
  }
  if (inspection.failures.length > 0) {
    lines.push("", "Failures");
    for (const failure of inspection.failures) lines.push(`${failure.gate}/${failure.code}: ${failure.message}`);
  }
  return lines.join("\n");
}

function metric(
  name: string,
  left: number | string | undefined,
  right: number | string | undefined,
): StudioComparisonMetric {
  return Object.freeze({
    metric: name,
    ...(left === undefined ? {} : { left }),
    ...(right === undefined ? {} : { right }),
    ...(typeof left === "number" && typeof right === "number" ? { delta: Number((right - left).toFixed(6)) } : {}),
  });
}

export class PuzzleStudioV2 implements PuzzleStudioV2Contract {
  public runSearch(request: Parameters<PuzzleStudioV2Contract["runSearch"]>[0],
    options: Parameters<PuzzleStudioV2Contract["runSearch"]>[1] = {},
    checkpoint?: Parameters<PuzzleStudioV2Contract["runSearch"]>[2]): StudioSearchSession {
    const normalized = normalizeSearchOptions(request, options);
    const result = runCandidateSearch(request, normalized, checkpoint);
    return Object.freeze({
      request,
      options: normalized,
      result,
      summaries: Object.freeze(result.manifest.records.map(summary)),
    });
  }

  public inspect(manifest: GenerationManifest, candidateIndex: number): StudioInspection {
    return inspectRecord(findRecord(manifest, candidateIndex));
  }

  public replay(request: Parameters<PuzzleStudioV2Contract["replay"]>[0], candidateIndex: number): StudioInspection {
    if (!Number.isInteger(candidateIndex) || candidateIndex < 0) throw new Error("Candidate index must be a non-negative integer.");
    const generated = generateCandidate(request, candidateIndex);
    const record: RankedCandidateRecord = generated.candidate
      ? Object.freeze({
          index: candidateIndex,
          disposition: "ranked-out",
          candidate: generated.candidate,
          dna: generated.candidate.dna,
          failures: Object.freeze([]),
        })
      : Object.freeze({
          index: candidateIndex,
          disposition: "generation-failed",
          failures: Object.freeze([]),
          rejectionReason: generated.generationFailure ?? "Candidate generation failed.",
        });
    return inspectRecord(record);
  }

  public compare(manifest: GenerationManifest, leftIndex: number, rightIndex: number): StudioComparison {
    if (leftIndex === rightIndex) throw new Error("Candidate comparison requires two different indexes.");
    const left = this.inspect(manifest, leftIndex);
    const right = this.inspect(manifest, rightIndex);
    const metrics: StudioComparisonMetric[] = [
      metric("disposition", left.summary.disposition, right.summary.disposition),
      metric("rank", left.summary.rank, right.summary.rank),
      metric("overall", left.scorecard?.overall, right.scorecard?.overall),
      metric("novelty", left.summary.noveltyScore, right.summary.noveltyScore),
      metric("composition", left.scorecard?.composition, right.scorecard?.composition),
      metric("dependency", left.scorecard?.dependency, right.scorecard?.dependency),
      metric("deductionRhythm", left.scorecard?.deductionRhythm, right.scorecard?.deductionRhythm),
      metric("arithmeticTexture", left.scorecard?.arithmeticTexture, right.scorecard?.arithmeticTexture),
      metric("clueQuality", left.scorecard?.clueQuality, right.scorecard?.clueQuality),
      metric("deductionDepth", left.deductionTrace?.metrics.deductionDepth, right.deductionTrace?.metrics.deductionDepth),
      metric("equationCount", left.equations.length, right.equations.length),
    ];
    const leftScore = left.scorecard?.overall;
    const rightScore = right.scorecard?.overall;
    return Object.freeze({
      leftIndex,
      rightIndex,
      ...(leftScore === undefined || rightScore === undefined || leftScore === rightScore
        ? {}
        : { preferredIndex: leftScore > rightScore ? leftIndex : rightIndex }),
      metrics: Object.freeze(metrics),
    });
  }

  public exportCandidate(inspection: StudioInspection, format: "json" | "svg" | "text"): StudioExport {
    const base = `candidate-${inspection.summary.index}`;
    if (format === "json") {
      return Object.freeze({
        fileName: `${base}.json`,
        mediaType: "application/json",
        content: canonicalSerialize(inspection),
      });
    }
    if (format === "svg") {
      return Object.freeze({
        fileName: `${base}.svg`,
        mediaType: "image/svg+xml",
        content: renderCandidateSvg(inspection),
      });
    }
    return Object.freeze({
      fileName: `${base}.txt`,
      mediaType: "text/plain",
      content: textExport(inspection),
    });
  }
}
