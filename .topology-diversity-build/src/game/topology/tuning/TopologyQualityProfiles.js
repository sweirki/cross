"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOPOLOGY_QUALITY_PROFILES = void 0;
exports.evaluateTopologyQualityGate = evaluateTopologyQualityGate;
exports.TOPOLOGY_QUALITY_PROFILES = Object.freeze({
    exploratory: Object.freeze({
        minimumScore: 50,
        minimumMiddleIntersectionRatio: 0.6,
        maximumEndpointIntersectionRatio: 0.4,
        minimumDensity: 0.12,
        maximumDensity: 0.8,
    }),
    production: Object.freeze({
        minimumScore: 65,
        minimumMiddleIntersectionRatio: 0.75,
        maximumEndpointIntersectionRatio: 0.25,
        minimumDensity: 0.18,
        maximumDensity: 0.68,
    }),
});
function evaluateTopologyQualityGate(input, profile = "production") {
    const thresholds = exports.TOPOLOGY_QUALITY_PROFILES[profile];
    const failures = [];
    if (input.score < thresholds.minimumScore)
        failures.push("score");
    if (input.middleIntersectionRatio <
        thresholds.minimumMiddleIntersectionRatio) {
        failures.push("middleIntersectionRatio");
    }
    if (input.endpointIntersectionRatio >
        thresholds.maximumEndpointIntersectionRatio) {
        failures.push("endpointIntersectionRatio");
    }
    if (input.density < thresholds.minimumDensity ||
        input.density > thresholds.maximumDensity) {
        failures.push("density");
    }
    return { accepted: failures.length === 0, failures };
}
