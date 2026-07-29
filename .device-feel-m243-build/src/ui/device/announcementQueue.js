"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMPTY_ANNOUNCEMENT_QUEUE = void 0;
exports.enqueueAnnouncement = enqueueAnnouncement;
exports.dequeueAnnouncement = dequeueAnnouncement;
exports.EMPTY_ANNOUNCEMENT_QUEUE = Object.freeze({
    nextSequence: 0, pending: Object.freeze([]), lastMessage: null,
});
function enqueueAnnouncement(queue, message, politeness = "polite") {
    const normalized = message.trim();
    if (!normalized || normalized === queue.lastMessage)
        return queue;
    const item = Object.freeze({ sequence: queue.nextSequence, message: normalized, politeness });
    return Object.freeze({
        nextSequence: queue.nextSequence + 1,
        pending: Object.freeze([...queue.pending, item]),
        lastMessage: normalized,
    });
}
function dequeueAnnouncement(queue) {
    const [announcement, ...remaining] = queue.pending;
    if (!announcement)
        return { announcement: null, queue };
    return {
        announcement,
        queue: Object.freeze({ ...queue, pending: Object.freeze(remaining) }),
    };
}
