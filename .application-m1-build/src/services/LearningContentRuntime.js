"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.countTemplateIntersections = countTemplateIntersections;
exports.validateLearningContent = validateLearningContent;
exports.buildLessonStates = buildLessonStates;
exports.selectLessonPuzzle = selectLessonPuzzle;
const GuidedLessonRuntime_1 = require("./GuidedLessonRuntime");
function coordinateKey(row, column) {
    return `${row}:${column}`;
}
function countTemplateIntersections(template) {
    const numberCoordinates = new Map();
    for (const equation of template.equations) {
        for (const offset of [0, 2, 4]) {
            const row = equation.orientation === "horizontal"
                ? equation.start.row
                : equation.start.row + offset;
            const column = equation.orientation === "horizontal"
                ? equation.start.column + offset
                : equation.start.column;
            const key = coordinateKey(row, column);
            numberCoordinates.set(key, (numberCoordinates.get(key) ?? 0) + 1);
        }
    }
    return [...numberCoordinates.values()].filter((count) => count > 1).length;
}
function validateLearningContent(content, library) {
    const templateIds = new Set();
    for (const template of content.templates) {
        if (template.schemaVersion !== 1 || template.id.trim().length === 0) {
            throw new Error("Invalid learning topology template.");
        }
        if (templateIds.has(template.id))
            throw new Error(`Duplicate template: ${template.id}.`);
        templateIds.add(template.id);
        if (template.width < 5 || template.height < 1 || template.equations.length < 1) {
            throw new Error(`Template ${template.id} has invalid dimensions or no equations.`);
        }
        const equationIds = new Set();
        for (const equation of template.equations) {
            if (equationIds.has(equation.id))
                throw new Error(`Duplicate equation in ${template.id}.`);
            equationIds.add(equation.id);
            const endRow = equation.start.row + (equation.orientation === "vertical" ? 4 : 0);
            const endColumn = equation.start.column + (equation.orientation === "horizontal" ? 4 : 0);
            if (equation.start.row < 0 || equation.start.column < 0 ||
                endRow >= template.height || endColumn >= template.width) {
                throw new Error(`Equation ${equation.id} is outside template ${template.id}.`);
            }
        }
    }
    const puzzleIds = new Set(library.puzzles.map((puzzle) => puzzle.id));
    const lessonIds = new Set();
    const sortedLessons = [...content.lessons].sort((a, b) => a.order - b.order);
    let previousEquations = 0;
    let previousIntersections = 0;
    for (const lesson of sortedLessons) {
        if (lesson.schemaVersion !== 1 || lessonIds.has(lesson.id)) {
            throw new Error(`Invalid or duplicate lesson: ${lesson.id}.`);
        }
        lessonIds.add(lesson.id);
        (0, GuidedLessonRuntime_1.validateLessonGuidance)(lesson);
        const template = content.templates.find((candidate) => candidate.id === lesson.templateId);
        if (template === undefined)
            throw new Error(`Missing template for lesson ${lesson.id}.`);
        if (!template.concepts.includes(lesson.concept)) {
            throw new Error(`Lesson ${lesson.id} concept is not taught by its template.`);
        }
        if (lesson.puzzleIds.length === 0 || lesson.puzzleIds.some((id) => !puzzleIds.has(id))) {
            throw new Error(`Lesson ${lesson.id} references a missing puzzle.`);
        }
        const intersections = countTemplateIntersections(template);
        if (template.equations.length < previousEquations || intersections < previousIntersections) {
            throw new Error(`Lesson ${lesson.id} regresses structural progression.`);
        }
        previousEquations = template.equations.length;
        previousIntersections = intersections;
    }
    if (content.campaign.schemaVersion !== 1)
        throw new Error("Invalid learning campaign.");
    const campaignLessonIds = content.campaign.chapters.flatMap((chapter) => chapter.lessonIds);
    if (new Set(campaignLessonIds).size !== campaignLessonIds.length) {
        throw new Error("A lesson appears more than once in the learning campaign.");
    }
    for (const id of campaignLessonIds) {
        if (!lessonIds.has(id))
            throw new Error(`Campaign references unknown lesson: ${id}.`);
    }
    return content;
}
function buildLessonStates(content, library, progress = {}) {
    validateLearningContent(content, library);
    const ordered = content.campaign.chapters.flatMap((chapter) => chapter.lessonIds.map((id) => content.lessons.find((lesson) => lesson.id === id)));
    let prerequisiteComplete = true;
    return ordered.map((lesson) => {
        const stars = lesson.puzzleIds.map((id) => progress[id]?.stars ?? 0);
        const totalStars = stars.reduce((sum, value) => sum + value, 0);
        const earnedStars = Math.min(3, totalStars);
        const completed = lesson.puzzleIds.every((id) => progress[id]?.completed === true) &&
            earnedStars >= lesson.masteryStars;
        const state = {
            lesson,
            locked: !prerequisiteComplete,
            completed,
            earnedStars,
            puzzleIds: lesson.puzzleIds,
        };
        prerequisiteComplete = completed;
        return state;
    });
}
function selectLessonPuzzle(lesson, library, completedPuzzleIds = new Set()) {
    const id = lesson.puzzleIds.find((candidate) => !completedPuzzleIds.has(candidate))
        ?? lesson.puzzleIds[0];
    const puzzle = library.puzzles.find((candidate) => candidate.id === id);
    if (puzzle === undefined)
        throw new Error(`Lesson puzzle ${id} is unavailable.`);
    return puzzle;
}
