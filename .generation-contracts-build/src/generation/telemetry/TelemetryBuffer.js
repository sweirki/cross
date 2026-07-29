"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelemetryBuffer = void 0;
const DifficultyTelemetry_1 = require("./DifficultyTelemetry");
class TelemetryBuffer {
    session;
    constructor(initial) {
        const privacy = (0, DifficultyTelemetry_1.validateTelemetryPrivacy)(initial);
        if (!privacy.valid)
            throw new Error(`TELEMETRY_PRIVACY_VIOLATION:${privacy.forbiddenPaths.join(",")}`);
        this.session = Object.freeze({ ...initial, events: Object.freeze([...initial.events]) });
    }
    record(event) {
        const privacy = (0, DifficultyTelemetry_1.validateTelemetryPrivacy)(event);
        if (!privacy.valid)
            throw new Error(`TELEMETRY_PRIVACY_VIOLATION:${privacy.forbiddenPaths.join(",")}`);
        this.session = (0, DifficultyTelemetry_1.appendTelemetryEvent)(this.session, event);
    }
    snapshot() {
        return this.session;
    }
    summary() {
        return (0, DifficultyTelemetry_1.summarizeDifficultyTelemetry)(this.session);
    }
    drainSummary() {
        const summary = this.summary();
        this.session = Object.freeze({ ...this.session, events: Object.freeze([]) });
        return summary;
    }
}
exports.TelemetryBuffer = TelemetryBuffer;
