
import { fingerprint } from "../certification/Fingerprinting";
import type { ReleaseCandidateInput, ReleaseCandidateReport, ReleaseCheck, ReleaseGateStatus } from "./ReleaseTypes";

function booleanCheck(id: string, passed: boolean, detail: string): ReleaseCheck {
  return Object.freeze({ id, status: passed ? "passed" as const : "failed" as const, detail });
}
function statusCheck(id: string, status: ReleaseGateStatus, detail: string): ReleaseCheck {
  return Object.freeze({ id, status, detail });
}

export function certifyReleaseCandidate(input: ReleaseCandidateInput): ReleaseCandidateReport {
  if (!input.releaseId.trim()) throw new Error("Release ID is required.");
  if (!input.generatorVersion.trim()) throw new Error("Generator version is required.");
  const checks: readonly ReleaseCheck[] = Object.freeze([
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
    schemaVersion: 1 as const,
    releaseId: input.releaseId,
    generatorVersion: input.generatorVersion,
    passed,
    checks,
  };
  return Object.freeze({ ...base, fingerprint: fingerprint(base) });
}
