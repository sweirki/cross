import { appendTelemetryEvent, summarizeDifficultyTelemetry, validateTelemetryPrivacy } from "./DifficultyTelemetry";
import type { DifficultyTelemetryEvent, DifficultyTelemetrySession, DifficultyTelemetrySummary } from "./TelemetryTypes";

export class TelemetryBuffer {
  private session: DifficultyTelemetrySession;

  public constructor(initial: DifficultyTelemetrySession) {
    const privacy = validateTelemetryPrivacy(initial);
    if (!privacy.valid) throw new Error(`TELEMETRY_PRIVACY_VIOLATION:${privacy.forbiddenPaths.join(",")}`);
    this.session = Object.freeze({ ...initial, events: Object.freeze([...initial.events]) });
  }

  public record(event: DifficultyTelemetryEvent): void {
    const privacy = validateTelemetryPrivacy(event);
    if (!privacy.valid) throw new Error(`TELEMETRY_PRIVACY_VIOLATION:${privacy.forbiddenPaths.join(",")}`);
    this.session = appendTelemetryEvent(this.session, event);
  }

  public snapshot(): DifficultyTelemetrySession {
    return this.session;
  }

  public summary(): DifficultyTelemetrySummary {
    return summarizeDifficultyTelemetry(this.session);
  }

  public drainSummary(): DifficultyTelemetrySummary {
    const summary = this.summary();
    this.session = Object.freeze({ ...this.session, events: Object.freeze([]) });
    return summary;
  }
}
