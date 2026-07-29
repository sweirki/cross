"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportTopologyQualityJson = exportTopologyQualityJson;
function exportTopologyQualityJson(value, pretty = false) {
    if (value.schema !== "crossmath.topology-quality/v1") {
        throw new Error("Unsupported topology quality export schema.");
    }
    return JSON.stringify({
        schema: value.schema,
        topology: value.topology,
        metrics: value.metrics,
        score: value.score,
    }, null, pretty ? 2 : undefined);
}
