"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceFeelServices = void 0;
class DeviceFeelServices {
    haptics;
    audio;
    accessibility;
    constructor(haptics, audio, accessibility) {
        this.haptics = haptics;
        this.audio = audio;
        this.accessibility = accessibility;
    }
    async perform(cue) {
        const tasks = [];
        if (cue.haptic)
            tasks.push(this.safe(() => this.haptics.trigger(cue.haptic)));
        if (cue.sound)
            tasks.push(this.safe(() => this.audio.play(cue.sound)));
        await Promise.all(tasks);
        if (cue.announcement)
            this.accessibility.announce(cue.announcement);
        if (cue.targetId)
            this.accessibility.focus?.(cue.targetId);
    }
    async safe(run) {
        try {
            await run();
        }
        catch { /* Platform capabilities fail as deterministic no-ops. */ }
    }
}
exports.DeviceFeelServices = DeviceFeelServices;
