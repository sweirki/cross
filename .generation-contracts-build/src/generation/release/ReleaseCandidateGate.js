"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.certifyReleaseCandidate = certifyReleaseCandidate;
const Fingerprinting_1 = require("../certification/Fingerprinting");
function booleanCheck(id, passed, detail) {
    return Object.freeze({ id, status: passed ? "passed" : "failed", detail });
}
function statusCheck(id, status, detail) {
    return Object.freeze({ id, status, detail });
}
function certifyReleaseCandidate(input) {
    if (!input.releaseId.trim())
        throw new Error("Release ID is required.");
    if (!input.generatorVersion.trim())
        throw new Error("Generator version is required.");
    const checks = Object.freeze([
        booleanCheck("catalog-integrity", input.catalogValid, "Certified catalog validates."),
        booleanCheck("campaign-integrity", input.campaignValid, "Campaign references certified content."),
        booleanCheck("save-migration", input.saveMigrationValid, "Legacy progress migrates without loss."),
        booleanCheck("replay-determinism", input.replayDeterministic, "Replay output is deterministic."),
        booleanCheck("offline-readiness", input.offlineReady, "Core play requires no network dependency."),
        booleanCheck("accessibility-review", input.accessibilityReviewed, "Accessibility review completed."),
        booleanCheck("privacy-review", input.privacyReviewed, "Telemetry privacy review completed."),
        booleanCheck("crash-audit", input.crashAuditPassed, "Crash audit passed."),
        booleanCheck("performance-budget", input.performance.passed, input.performance.failures.join(",") || "Performance budgets passed."),
        statusCheck("android-release-build", input.androidBuildStatus, "Android release build verification."),
        statusCheck("ios-release-build", input.iosBuildStatus, "iOS release build verification."),
    ]);
    const passed = checks.every((check) => check.status === "passed");
    const base = {
        schemaVersion: 1,
        releaseId: input.releaseId,
        generatorVersion: input.generatorVersion,
        passed,
        checks,
    };
    return Object.freeze({ ...base, fingerprint: (0, Fingerprinting_1.fingerprint)(base) });
}
