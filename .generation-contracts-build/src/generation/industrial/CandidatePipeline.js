"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCandidate = generateCandidate;
const SchemaVersions_1 = require("../versioning/SchemaVersions");
const GenerationSeeds_1 = require("../random/GenerationSeeds");
const dependency_1 = require("../dependency");
const certification_1 = require("../certification");
const filling_1 = require("../filling");
const composition_1 = require("../composition");
const clues_1 = require("../clues");
function puzzleDNA(candidate, index) {
    return Object.freeze({
        schema: SchemaVersions_1.GENERATION_SCHEMA_IDS.puzzleDNA,
        generatorVersion: candidate.request.generatorVersion,
        rootSeed: candidate.request.rootSeed,
        stageSeeds: (0, GenerationSeeds_1.allocateStageSeeds)(candidate.request.rootSeed, index),
        compositionFamily: candidate.composition.family,
        clusterTemplateIds: Object.freeze(candidate.composition.clusters.map((cluster) => cluster.templateId)),
        dependencyProfile: `${candidate.request.difficulty}-structural/v1`,
        operatorProfile: candidate.fill.profileId,
        clueProfile: candidate.clues.profileId,
        fingerprints: (0, certification_1.candidateFingerprints)(candidate),
    });
}
function generateCandidate(request, index) {
    try {
        const composition = (0, composition_1.generateCompositionPlan)(request, index);
        const dependency = (0, dependency_1.buildStructuralDependencyGraph)(request, composition);
        const filling = (0, filling_1.fillEquations)(request, composition, index);
        if (!filling.ok) {
            return Object.freeze({
                index,
                generationFailure: `FILLING_FAILED:${filling.code}:${filling.message}`,
            });
        }
        const clues = (0, clues_1.planClues)(request, composition, filling.plan, index);
        if (!clues.ok) {
            return Object.freeze({
                index,
                generationFailure: `CLUE_PLANNING_FAILED:${clues.code}:${clues.message}`,
            });
        }
        const base = {
            schema: SchemaVersions_1.GENERATION_SCHEMA_IDS.puzzleCandidate,
            id: `${request.requestId}:candidate:${index}`,
            request,
            composition,
            dependency,
            fill: filling.plan,
            clues: clues.plan,
        };
        const candidate = Object.freeze({
            ...base,
            dna: puzzleDNA(base, index),
        });
        return Object.freeze({
            index,
            candidate,
            deductionTrace: clues.trace,
            fillingDiagnostics: filling.diagnostics,
        });
    }
    catch (error) {
        return Object.freeze({
            index,
            generationFailure: `GENERATION_EXCEPTION:${error instanceof Error ? error.message : String(error)}`,
        });
    }
}
