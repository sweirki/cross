"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.campaignExperience = exports.CrossMathCampaignExperience = void 0;
function percentage(completed, total) {
    if (total <= 0)
        return 0;
    return Math.round((completed / total) * 100);
}
function orderedLessons(content) {
    return content.campaign.chapters.flatMap((chapter) => chapter.lessonIds.map((lessonId) => {
        const lesson = content.lessons.find((candidate) => candidate.id === lessonId);
        if (lesson === undefined) {
            throw new Error(`Campaign chapter ${chapter.id} references missing lesson ${lessonId}.`);
        }
        return lesson;
    }));
}
function lessonCompleted(lesson, progress) {
    return lesson.puzzleIds.length > 0 &&
        lesson.puzzleIds.every((puzzleId) => progress.puzzleProgress[puzzleId]?.completed === true);
}
function lessonStarted(lesson, progress) {
    return lesson.puzzleIds.some((puzzleId) => progress.puzzleProgress[puzzleId] !== undefined) || progress.lastLessonId === lesson.id;
}
function lessonUnlocked(ordered, progress, lessonId) {
    const index = ordered.findIndex((lesson) => lesson.id === lessonId);
    if (index < 0)
        return false;
    if (index === 0)
        return true;
    const previous = ordered[index - 1];
    return previous !== undefined && lessonCompleted(previous, progress);
}
function lessonStatus(ordered, lesson, progress) {
    if (lessonCompleted(lesson, progress))
        return "completed";
    if (!lessonUnlocked(ordered, progress, lesson.id))
        return "locked";
    return lessonStarted(lesson, progress) ? "in-progress" : "available";
}
function buildLesson(chapterId, ordered, lesson, progress, resumeLessonId) {
    const completedPuzzles = lesson.puzzleIds.filter((puzzleId) => progress.puzzleProgress[puzzleId]?.completed === true).length;
    const earnedStars = lesson.puzzleIds.reduce((sum, puzzleId) => sum + (progress.puzzleProgress[puzzleId]?.stars ?? 0), 0);
    const maximumStars = lesson.puzzleIds.length * 3;
    return {
        id: lesson.id,
        chapterId,
        order: lesson.order,
        title: lesson.title,
        instruction: lesson.instruction,
        status: lessonStatus(ordered, lesson, progress),
        earnedStars,
        maximumStars,
        completedPuzzles,
        totalPuzzles: lesson.puzzleIds.length,
        completionPercent: percentage(completedPuzzles, lesson.puzzleIds.length),
        isResumeTarget: lesson.id === resumeLessonId,
    };
}
function buildPath(lessons) {
    const segments = [];
    for (let index = 0; index < lessons.length - 1; index += 1) {
        const from = lessons[index];
        const to = lessons[index + 1];
        if (from === undefined || to === undefined)
            continue;
        segments.push({
            fromLessonId: from.id,
            toLessonId: to.id,
            status: from.status === "completed"
                ? "completed"
                : to.status === "locked"
                    ? "locked"
                    : "current",
        });
    }
    return segments;
}
function chapterStatus(lessons) {
    if (lessons.length > 0 && lessons.every((lesson) => lesson.status === "completed")) {
        return "completed";
    }
    if (lessons.every((lesson) => lesson.status === "locked")) {
        return "locked";
    }
    return "active";
}
class CrossMathCampaignExperience {
    build(content, progress) {
        const ordered = orderedLessons(content);
        const next = ordered.find((lesson) => !lessonCompleted(lesson, progress)) ?? null;
        const resume = progress.lastLessonId !== null
            ? ordered.find((lesson) => lesson.id === progress.lastLessonId &&
                lessonUnlocked(ordered, progress, lesson.id) &&
                !lessonCompleted(lesson, progress)) ?? null
            : null;
        const chapters = content.campaign.chapters.map((chapter) => {
            const lessons = chapter.lessonIds.map((lessonId) => {
                const lesson = ordered.find((candidate) => candidate.id === lessonId);
                if (lesson === undefined) {
                    throw new Error(`Campaign chapter ${chapter.id} references missing lesson ${lessonId}.`);
                }
                return buildLesson(chapter.id, ordered, lesson, progress, resume?.id ?? null);
            });
            const completedLessons = lessons.filter((lesson) => lesson.status === "completed").length;
            const earnedStars = lessons.reduce((sum, lesson) => sum + lesson.earnedStars, 0);
            const maximumStars = lessons.reduce((sum, lesson) => sum + lesson.maximumStars, 0);
            return {
                id: chapter.id,
                title: chapter.title,
                description: chapter.description,
                status: chapterStatus(lessons),
                lessons,
                path: buildPath(lessons),
                completedLessons,
                totalLessons: lessons.length,
                earnedStars,
                maximumStars,
                completionPercent: percentage(completedLessons, lessons.length),
            };
        });
        const allLessons = chapters.flatMap((chapter) => chapter.lessons);
        const completedLessons = allLessons.filter((lesson) => lesson.status === "completed").length;
        const earnedStars = allLessons.reduce((sum, lesson) => sum + lesson.earnedStars, 0);
        const maximumStars = allLessons.reduce((sum, lesson) => sum + lesson.maximumStars, 0);
        return {
            campaignId: content.campaign.id,
            title: content.campaign.title,
            chapters,
            completedLessons,
            totalLessons: allLessons.length,
            earnedStars,
            maximumStars,
            completionPercent: percentage(completedLessons, allLessons.length),
            nextLessonId: next?.id ?? null,
            resumeLessonId: resume?.id ?? null,
            campaignCompleted: allLessons.length > 0 &&
                allLessons.every((lesson) => lesson.status === "completed"),
        };
    }
    findLesson(content, lessonId) {
        return content.lessons.find((lesson) => lesson.id === lessonId) ?? null;
    }
    isChapterUnlocked(campaign, content, progress, chapterId) {
        const ordered = orderedLessons(content);
        const chapter = campaign.chapters.find((candidate) => candidate.id === chapterId);
        if (chapter === undefined || chapter.lessonIds.length === 0)
            return false;
        const firstLessonId = chapter.lessonIds[0];
        return firstLessonId !== undefined &&
            lessonUnlocked(ordered, progress, firstLessonId);
    }
}
exports.CrossMathCampaignExperience = CrossMathCampaignExperience;
exports.campaignExperience = new CrossMathCampaignExperience();
