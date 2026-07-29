"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateLessonGuidance = validateLessonGuidance;
exports.buildGuidedLessonState = buildGuidedLessonState;
exports.lessonProgressLabel = lessonProgressLabel;
function sharedNumberCellIds(puzzle) {
    const counts = new Map();
    for (const equation of puzzle.equations) {
        for (const index of [0, 2, 4]) {
            const cellId = equation.cellIds[index];
            counts.set(cellId, (counts.get(cellId) ?? 0) + 1);
        }
    }
    return new Set([...counts.entries()]
        .filter(([, count]) => count > 1)
        .map(([cellId]) => cellId));
}
function criterionComplete(criterion, puzzle, view, selectedTileId) {
    switch (criterion.type) {
        case "select-tile":
            return selectedTileId !== null || Object.keys(view.session.placements).length > 0;
        case "place-any-tile":
            return Object.keys(view.session.placements).length > 0;
        case "fill-shared-cell": {
            const shared = sharedNumberCellIds(puzzle);
            return Object.keys(view.session.placements).some((cellId) => shared.has(cellId));
        }
        case "correct-equations-at-least":
            return view.equations.filter((equation) => equation.state === "correct").length >= criterion.count;
        case "complete-puzzle":
            return view.session.completed;
    }
}
function validateLessonGuidance(lesson) {
    if (lesson.guidance.length === 0) {
        throw new Error(`Lesson ${lesson.id} must contain at least one guidance step.`);
    }
    const ids = new Set();
    for (const step of lesson.guidance) {
        if (step.id.trim().length === 0 || step.title.trim().length === 0 || step.message.trim().length === 0) {
            throw new Error(`Lesson ${lesson.id} contains an incomplete guidance step.`);
        }
        if (ids.has(step.id)) {
            throw new Error(`Lesson ${lesson.id} contains duplicate guidance step ${step.id}.`);
        }
        ids.add(step.id);
        if (step.completeWhen.type === "correct-equations-at-least" &&
            (!Number.isInteger(step.completeWhen.count) || step.completeWhen.count < 1)) {
            throw new Error(`Lesson ${lesson.id} contains an invalid equation target.`);
        }
    }
    if (lesson.guidance[lesson.guidance.length - 1]?.completeWhen.type !== "complete-puzzle") {
        throw new Error(`Lesson ${lesson.id} must end with puzzle completion.`);
    }
    if (lesson.completionMessage.trim().length === 0) {
        throw new Error(`Lesson ${lesson.id} must include a completion message.`);
    }
    return lesson;
}
function buildGuidedLessonState(lesson, puzzle, view, selectedTileId = null) {
    validateLessonGuidance(lesson);
    if (!lesson.puzzleIds.includes(puzzle.id)) {
        throw new Error(`Puzzle ${puzzle.id} does not belong to lesson ${lesson.id}.`);
    }
    if (view.puzzle.id !== puzzle.id || view.session.puzzleId !== puzzle.id) {
        throw new Error("Guided lesson state does not match the active puzzle.");
    }
    const completedStepIds = [];
    let activeStep = null;
    let activeStepIndex = lesson.guidance.length;
    for (let index = 0; index < lesson.guidance.length; index += 1) {
        const step = lesson.guidance[index];
        if (criterionComplete(step.completeWhen, puzzle, view, selectedTileId)) {
            completedStepIds.push(step.id);
            continue;
        }
        activeStep = step;
        activeStepIndex = index;
        break;
    }
    return {
        lessonId: lesson.id,
        activeStep,
        activeStepIndex,
        totalSteps: lesson.guidance.length,
        completedStepIds,
        puzzleCompleted: view.session.completed,
    };
}
function lessonProgressLabel(state) {
    if (state.puzzleCompleted)
        return "Lesson complete";
    return `Step ${Math.min(state.activeStepIndex + 1, state.totalSteps)} of ${state.totalSteps}`;
}
