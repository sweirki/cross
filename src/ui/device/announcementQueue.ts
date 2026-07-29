import type { AccessibilityPoliteness } from "./types";

export interface Announcement {
  readonly sequence: number;
  readonly message: string;
  readonly politeness: AccessibilityPoliteness;
}

export interface AnnouncementQueue {
  readonly nextSequence: number;
  readonly pending: readonly Announcement[];
  readonly lastMessage: string | null;
}

export const EMPTY_ANNOUNCEMENT_QUEUE: AnnouncementQueue = Object.freeze({
  nextSequence: 0, pending: Object.freeze([]), lastMessage: null,
});

export function enqueueAnnouncement(
  queue: AnnouncementQueue,
  message: string,
  politeness: AccessibilityPoliteness = "polite",
): AnnouncementQueue {
  const normalized = message.trim();
  if (!normalized || normalized === queue.lastMessage) return queue;
  const item = Object.freeze({ sequence: queue.nextSequence, message: normalized, politeness });
  return Object.freeze({
    nextSequence: queue.nextSequence + 1,
    pending: Object.freeze([...queue.pending, item]),
    lastMessage: normalized,
  });
}

export function dequeueAnnouncement(queue: AnnouncementQueue): {
  readonly announcement: Announcement | null; readonly queue: AnnouncementQueue;
} {
  const [announcement, ...remaining] = queue.pending;
  if (!announcement) return { announcement: null, queue };
  return {
    announcement,
    queue: Object.freeze({ ...queue, pending: Object.freeze(remaining) }),
  };
}
