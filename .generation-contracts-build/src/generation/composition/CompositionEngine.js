"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCompositionPlan = generateCompositionPlan;
const DeterministicRandom_1 = require("../../engine/random/DeterministicRandom");
const ClusterLibrary_1 = require("../clusters/ClusterLibrary");
const ClusterTransforms_1 = require("../clusters/ClusterTransforms");
const GenerationSeeds_1 = require("../random/GenerationSeeds");
const SchemaVersions_1 = require("../versioning/SchemaVersions");
const CompositionMetrics_1 = require("./CompositionMetrics");
const CompositionTemplates_1 = require("./CompositionTemplates");
const CompositionValidator_1 = require("./CompositionValidator");
function dimensions(template) {
    return [
        Math.max(...template.cells.map((cell) => cell.position.row)) + 1,
        Math.max(...template.cells.map((cell) => cell.position.col)) + 1,
    ];
}
function slotFor(family, index, _count) {
    const slots = {
        "four-corners": [[0, 0], [0, 2], [2, 0], [2, 2], [1, 1], [1, 3]],
        triangle: [[0, 1], [1, 0], [1, 2], [2, 1], [2, 3], [3, 0]],
        "center-weighted": [[1, 1], [0, 0], [0, 2], [2, 0], [2, 2], [1, 3]],
        diagonal: [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4], [5, 5]],
        hourglass: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2], [3, 1]],
        "balanced-asymmetric": [[0, 0], [0, 2], [1, 1], [1, 3], [2, 0], [2, 2]],
    };
    const slot = slots[family][index];
    if (!slot)
        throw new Error(`Composition family ${family} has no slot ${index}.`);
    return slot;
}
function placeClusters(family, clusters, gap, margin) {
    const slots = clusters.map((_, index) => slotFor(family, index, clusters.length));
    const maxRows = Math.max(...clusters.map((cluster) => cluster.rows));
    const maxColumns = Math.max(...clusters.map((cluster) => cluster.columns));
    return clusters.map((cluster, index) => ({
        cluster,
        row: margin + slots[index][0] * (maxRows + gap),
        col: margin + slots[index][1] * (maxColumns + gap),
    }));
}
function chooseProfile(profiles, random) {
    if (profiles.length === 0)
        throw new Error("No composition profile supports this difficulty.");
    return profiles[random.nextInt(0, profiles.length - 1)];
}
function generateCompositionPlan(request, candidateIndex = 0) {
    const seeds = (0, GenerationSeeds_1.allocateStageSeeds)(request.rootSeed, candidateIndex);
    const compositionRandom = new DeterministicRandom_1.DeterministicRandom(seeds.composition.value);
    const clusterRandom = new DeterministicRandom_1.DeterministicRandom(seeds["cluster-selection"].value);
    const placementRandom = new DeterministicRandom_1.DeterministicRandom(seeds.placement.value);
    const profile = chooseProfile((0, CompositionTemplates_1.listCompositionProfilesForDifficulty)(request.difficulty), compositionRandom);
    const [minimumCount, maximumCount] = profile.clusterCount[request.difficulty];
    const clusterCount = compositionRandom.nextInt(minimumCount, maximumCount);
    const eligible = (0, ClusterLibrary_1.listClusterTemplatesForDifficulty)(request.difficulty);
    if (eligible.length === 0)
        throw new Error("No cluster templates support this difficulty.");
    const prepared = [];
    for (let index = 0; index < clusterCount; index += 1) {
        const base = eligible[clusterRandom.nextInt(0, eligible.length - 1)];
        const transform = base.allowedTransforms[placementRandom.nextInt(0, base.allowedTransforms.length - 1)];
        const transformed = (0, ClusterTransforms_1.transformClusterTemplate)(base, transform);
        const [rows, columns] = dimensions(transformed);
        prepared.push({
            instanceId: `cluster-${index}`,
            template: transformed,
            rows,
            columns,
            transform,
        });
    }
    const placements = placeClusters(profile.id, prepared, profile.minimumGap, profile.margin);
    const maxRow = Math.max(...placements.map(({ cluster, row }) => row + cluster.rows - 1));
    const maxCol = Math.max(...placements.map(({ cluster, col }) => col + cluster.columns - 1));
    let rows = maxRow + profile.margin + 1;
    let columns = maxCol + profile.margin + 1;
    rows = Math.max(rows, request.constraints.minimumRows ?? 1);
    columns = Math.max(columns, request.constraints.minimumColumns ?? 1);
    if (request.constraints.maximumRows !== undefined && rows > request.constraints.maximumRows) {
        throw new Error(`Composition requires ${rows} rows; maximum is ${request.constraints.maximumRows}.`);
    }
    if (request.constraints.maximumColumns !== undefined && columns > request.constraints.maximumColumns) {
        throw new Error(`Composition requires ${columns} columns; maximum is ${request.constraints.maximumColumns}.`);
    }
    const instances = [];
    const occupied = [];
    for (const { cluster, row, col } of placements) {
        const cellIdMap = {};
        for (const cell of cluster.template.cells) {
            const runtimeCellId = `${cluster.instanceId}:${cell.id}`;
            cellIdMap[cell.id] = runtimeCellId;
            occupied.push({
                cellId: runtimeCellId,
                position: { row: row + cell.position.row, col: col + cell.position.col },
                kind: cell.kind,
                clusterIds: [cluster.instanceId],
            });
        }
        instances.push({
            schema: SchemaVersions_1.GENERATION_SCHEMA_IDS.clusterInstance,
            id: cluster.instanceId,
            templateId: cluster.template.id.split("@")[0],
            transform: cluster.transform,
            origin: { row, col },
            cellIdMap: Object.freeze(cellIdMap),
        });
    }
    occupied.sort((left, right) => left.position.row - right.position.row ||
        left.position.col - right.position.col ||
        left.cellId.localeCompare(right.cellId));
    const plan = {
        schema: SchemaVersions_1.GENERATION_SCHEMA_IDS.compositionPlan,
        id: `${request.requestId}:candidate-${candidateIndex}:composition`,
        family: profile.id,
        rows,
        columns,
        clusters: Object.freeze(instances),
        occupiedCells: Object.freeze(occupied),
        metrics: (0, CompositionMetrics_1.calculateCompositionMetrics)(rows, columns, occupied, instances),
    };
    (0, CompositionValidator_1.assertValidCompositionPlan)(plan);
    return Object.freeze(plan);
}
