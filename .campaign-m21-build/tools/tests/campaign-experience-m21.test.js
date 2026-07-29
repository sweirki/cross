"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const v1_1 = require("../../src/application/v1");
const CrossMathApplicationRuntime_1 = require("../../src/application/v1/CrossMathApplicationRuntime");
const learningContent_1 = require("../../src/data/learningContent");
let passed = 0;
function test(name, run) {
    try {
        run();
        console.log(`PASS ${name}`);
        passed += 1;
    }
    catch (error) {
        console.error(`FAIL ${name}`);
        throw error;
    }
}
function equal(actual, expected) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
    }
}
function truthy(value) {
    if (!value)
        throw new Error(`Expected truthy value, received ${JSON.stringify(value)}.`);
}
function completeLesson(app, state, lessonIndex, starsMode = "perfect") {
    const lesson = learningContent_1.LEARNING_CONTENT.lessons[lessonIndex];
    if (lesson === undefined)
        throw new Error("Missing fixture lesson.");
    let next = state;
    for (const puzzleId of lesson.puzzleIds) {
        next = app.recordPuzzleCompleted(next, puzzleId, starsMode === "perfect" ? 2 : 7, starsMode === "perfect" ? 0 : 2, `2026-01-0${lessonIndex + 1}T00:00:00.000Z`);
    }
    return next;
}
const app = new CrossMathApplicationRuntime_1.CrossMathApplicationRuntime();
const runtime = new v1_1.CrossMathCampaignExperience();
function fresh() {
    return runtime.build(learningContent_1.LEARNING_CONTENT, app.create("p1"));
}
test("builds a deterministic campaign view", () => {
    equal(fresh(), fresh());
});
test("includes every chapter", () => {
    equal(fresh().chapters.length, learningContent_1.LEARNING_CONTENT.campaign.chapters.length);
});
test("includes every lesson exactly once", () => {
    const ids = fresh().chapters.flatMap((chapter) => chapter.lessons.map((lesson) => lesson.id));
    equal(ids, learningContent_1.LEARNING_CONTENT.campaign.chapters.flatMap((chapter) => chapter.lessonIds));
});
test("starts at zero percent", () => {
    equal(fresh().completionPercent, 0);
});
test("starts with zero stars", () => {
    equal(fresh().earnedStars, 0);
});
test("calculates maximum stars", () => {
    const expected = learningContent_1.LEARNING_CONTENT.lessons.reduce((sum, lesson) => sum + lesson.puzzleIds.length * 3, 0);
    equal(fresh().maximumStars, expected);
});
test("unlocks only the first lesson initially", () => {
    const lessons = fresh().chapters.flatMap((chapter) => chapter.lessons);
    equal(lessons.map((lesson) => lesson.status), ["available", "locked", "locked", "locked"]);
});
test("marks the first chapter active", () => {
    equal(fresh().chapters[0]?.status, "active");
});
test("marks the second chapter locked", () => {
    equal(fresh().chapters[1]?.status, "locked");
});
test("recommends the first lesson initially", () => {
    equal(fresh().nextLessonId, learningContent_1.LEARNING_CONTENT.lessons[0]?.id);
});
test("has no resume target initially", () => {
    equal(fresh().resumeLessonId, null);
});
test("marks a started lesson in progress", () => {
    const lesson = learningContent_1.LEARNING_CONTENT.lessons[0];
    const puzzleId = lesson.puzzleIds[0];
    const state = app.recordPuzzleStarted(app.create("p1"), puzzleId, lesson.id);
    const view = runtime.build(learningContent_1.LEARNING_CONTENT, state);
    equal(view.chapters[0]?.lessons[0]?.status, "in-progress");
});
test("selects the started lesson as resume target", () => {
    const lesson = learningContent_1.LEARNING_CONTENT.lessons[0];
    const state = app.recordPuzzleStarted(app.create("p1"), lesson.puzzleIds[0], lesson.id);
    const view = runtime.build(learningContent_1.LEARNING_CONTENT, state);
    equal(view.resumeLessonId, lesson.id);
    equal(view.chapters[0]?.lessons[0]?.isResumeTarget, true);
});
test("does not resume a completed lesson", () => {
    const lesson = learningContent_1.LEARNING_CONTENT.lessons[0];
    let state = app.recordPuzzleStarted(app.create("p1"), lesson.puzzleIds[0], lesson.id);
    state = completeLesson(app, state, 0);
    equal(runtime.build(learningContent_1.LEARNING_CONTENT, state).resumeLessonId, null);
});
test("unlocks the next lesson after completion", () => {
    const state = completeLesson(app, app.create("p1"), 0);
    const lessons = runtime.build(learningContent_1.LEARNING_CONTENT, state).chapters[0].lessons;
    equal(lessons.map((lesson) => lesson.status), ["completed", "available"]);
});
test("awards three stars for a perfect completion", () => {
    const state = completeLesson(app, app.create("p1"), 0);
    equal(runtime.build(learningContent_1.LEARNING_CONTENT, state).earnedStars, 3);
});
test("preserves lower earned stars", () => {
    const state = completeLesson(app, app.create("p1"), 0, "hinted");
    equal(runtime.build(learningContent_1.LEARNING_CONTENT, state).earnedStars, 1);
});
test("calculates chapter completion", () => {
    let state = completeLesson(app, app.create("p1"), 0);
    state = completeLesson(app, state, 1);
    const chapter = runtime.build(learningContent_1.LEARNING_CONTENT, state).chapters[0];
    equal([chapter.completedLessons, chapter.totalLessons, chapter.completionPercent], [2, 2, 100]);
});
test("marks a completed chapter", () => {
    let state = completeLesson(app, app.create("p1"), 0);
    state = completeLesson(app, state, 1);
    equal(runtime.build(learningContent_1.LEARNING_CONTENT, state).chapters[0]?.status, "completed");
});
test("activates the next chapter", () => {
    let state = completeLesson(app, app.create("p1"), 0);
    state = completeLesson(app, state, 1);
    equal(runtime.build(learningContent_1.LEARNING_CONTENT, state).chapters[1]?.status, "active");
});
test("builds path segments between lessons", () => {
    const chapter = fresh().chapters[0];
    equal(chapter.path.length, Math.max(0, chapter.lessons.length - 1));
});
test("marks completed path segments", () => {
    const state = completeLesson(app, app.create("p1"), 0);
    equal(runtime.build(learningContent_1.LEARNING_CONTENT, state).chapters[0]?.path[0]?.status, "completed");
});
test("calculates overall completion percentage", () => {
    let state = completeLesson(app, app.create("p1"), 0);
    state = completeLesson(app, state, 1);
    equal(runtime.build(learningContent_1.LEARNING_CONTENT, state).completionPercent, 50);
});
test("finds lessons by ID", () => {
    equal(runtime.findLesson(learningContent_1.LEARNING_CONTENT, "lesson-001-place-a-number")?.title, "Place Your First Number");
});
test("returns null for an unknown lesson", () => {
    equal(runtime.findLesson(learningContent_1.LEARNING_CONTENT, "missing"), null);
});
test("reports chapter unlock state", () => {
    const state = app.create("p1");
    equal([
        runtime.isChapterUnlocked(learningContent_1.LEARNING_CONTENT.campaign, learningContent_1.LEARNING_CONTENT, state, "chapter-01-foundations"),
        runtime.isChapterUnlocked(learningContent_1.LEARNING_CONTENT.campaign, learningContent_1.LEARNING_CONTENT, state, "chapter-02-crossings"),
    ], [true, false]);
});
test("unlocks the second chapter after prior lessons", () => {
    let state = completeLesson(app, app.create("p1"), 0);
    state = completeLesson(app, state, 1);
    truthy(runtime.isChapterUnlocked(learningContent_1.LEARNING_CONTENT.campaign, learningContent_1.LEARNING_CONTENT, state, "chapter-02-crossings"));
});
test("marks the campaign complete", () => {
    let state = app.create("p1");
    for (let index = 0; index < learningContent_1.LEARNING_CONTENT.lessons.length; index += 1) {
        state = completeLesson(app, state, index);
    }
    const view = runtime.build(learningContent_1.LEARNING_CONTENT, state);
    equal([view.campaignCompleted, view.completionPercent, view.nextLessonId], [true, 100, null]);
});
console.log(`\n${passed}/28 milestone-2.1 campaign-experience tests passed.`);
