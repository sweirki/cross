import type {
  AccessibilityDriver, AudioDriver, DeviceFeelCue, HapticsDriver,
} from "./types";

export class DeviceFeelServices {
  constructor(
    private readonly haptics: HapticsDriver,
    private readonly audio: AudioDriver,
    private readonly accessibility: AccessibilityDriver,
  ) {}

  async perform(cue: DeviceFeelCue): Promise<void> {
    const tasks: Promise<void>[] = [];
    if (cue.haptic) tasks.push(this.safe(() => this.haptics.trigger(cue.haptic!)));
    if (cue.sound) tasks.push(this.safe(() => this.audio.play(cue.sound!)));
    await Promise.all(tasks);
    if (cue.announcement) this.accessibility.announce(cue.announcement);
    if (cue.targetId) this.accessibility.focus?.(cue.targetId);
  }

  private async safe(run: () => Promise<void>): Promise<void> {
    try { await run(); } catch { /* Platform capabilities fail as deterministic no-ops. */ }
  }
}
