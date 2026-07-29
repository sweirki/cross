"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTopologySampleReport = createTopologySampleReport;
exports.createTopologyBatchReport = createTopologyBatchReport;
exports.serializeTopologyBatchReport = serializeTopologyBatchReport;
const TopologySkeletonGenerator_1 = require("../../board/TopologySkeletonGenerator");
const OrganicTopologyMetrics_1 = require("./OrganicTopologyMetrics");
const TopologyQualityScore_1 = require("../scoring/TopologyQualityScore");
function round(value) {
    return Math.round(value * 1000) / 1000;
}
function createTopologySampleReport(sample) {
    if (!Number.isInteger(sample.seed)) {
        throw new Error("Topology sample seed must be an integer.");
    }
    const metrics = (0, OrganicTopologyMetrics_1.analyzeOrganicTopology)(sample.topology);
    return {
        seed: sample.seed,
        profile: sample.profile,
        difficulty: sample.difficulty?.trim() || null,
        archetype: sample.profile === "organic"
            ? sample.archetype ?? (0, TopologySkeletonGenerator_1.selectOrganicTopologyArchetype)(sample.seed)
            : null,
        metrics,
        score: (0, TopologyQualityScore_1.scoreOrganicTopology)(metrics),
    };
}
function metricSignature(metrics) {
    const degreeSequence = metrics.connectivity
        .map((entry) => entry.degree)
        .sort((left, right) => left - right)
        .join(",");
    return [
        metrics.intersectionCount,
        round(metrics.middleIntersectionRatio),
        round(metrics.endpointIntersectionRatio),
        round(metrics.averageEquationDegree),
        round(metrics.branchingEquationRatio),
        metrics.deadEndCount,
        metrics.boundingWidth,
        metrics.boundingHeight,
        round(metrics.density),
        round(metrics.symmetry),
        degreeSequence,
    ].join("|");
}
function standardDeviation(values) {
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
        values.length;
    return round(Math.sqrt(variance));
}
function createTopologyBatchReport(samples) {
    if (samples.length === 0) {
        throw new Error("Topology batch requires at least one sample.");
    }
    const reports = samples
        .map(createTopologySampleReport)
        .sort((left, right) => left.seed - right.seed ||
        left.profile.localeCompare(right.profile) ||
        (left.difficulty ?? "").localeCompare(right.difficulty ?? ""));
    const scores = reports.map((report) => report.score.total);
    const average = (values) => round(values.reduce((sum, value) => sum + value, 0) / values.length);
    const gradeCounts = {
        excellent: 0,
        good: 0,
        acceptable: 0,
        weak: 0,
    };
    const archetypeCounts = {
        chain: 0,
        fork: 0,
        hub: 0,
        spread: 0,
        cluster: 0,
    };
    for (const report of reports) {
        gradeCounts[report.score.grade] += 1;
        if (report.archetype !== null)
            archetypeCounts[report.archetype] += 1;
    }
    return {
        samples: reports,
        summary: {
            sampleCount: reports.length,
            averageScore: average(scores),
            minimumScore: Math.min(...scores),
            maximumScore: Math.max(...scores),
            scoreStandardDeviation: standardDeviation(scores),
            uniqueMetricSignatures: new Set(reports.map((report) => metricSignature(report.metrics))).size,
            archetypeCounts,
            averageMiddleIntersectionRatio: average(reports.map((report) => report.metrics.middleIntersectionRatio)),
            averageEndpointIntersectionRatio: average(reports.map((report) => report.metrics.endpointIntersectionRatio)),
            averageDensity: average(reports.map((report) => report.metrics.density)),
            averageEquationDegree: average(reports.map((report) => report.metrics.averageEquationDegree)),
            averageAspectRatio: average(reports.map((report) => report.metrics.aspectRatio)),
            gradeCounts,
        },
    };
}
function serializeTopologyBatchReport(report, pretty = false) {
    return JSON.stringify(report, null, pretty ? 2 : undefined);
}
