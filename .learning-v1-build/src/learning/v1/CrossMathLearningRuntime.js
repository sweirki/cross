"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.learningRuntime = exports.CrossMathLearningRuntime = void 0;
exports.validateLessonDefinition = validateLessonDefinition;
exports.validateCampaignDefinition = validateCampaignDefinition;
function canonical(value) {
    if (Array.isArray(value))
        return value.map(canonical);
    if (value !== null && typeof value === "object") {
        const output = {};
        for (const key of Object.keys(value).sort()) {
            output[key] = canonical(value[key]);
        }
        return output;
    }
    return value;
}
function assertId(value, label) {
    if (value.trim().length === 0)
        throw new Error(`${label} must not be empty.`);
}
function objectiveTarget(objective) {
    switch (objective.type) {
        case "place-tiles":
        case "complete-equations":
            return objective.count;
        default:
            return 1;
    }
}
function validateObjective(objective) {
    assertId(objective.id, "Objective ID");
    if ((objective.type === "place-tiles" || objective.type === "complete-equations") &&
        (!Number.isInteger(objective.count) || objective.count <= 0)) {
        throw new Error(`Objective ${objective.id} has an invalid count.`);
    }
    if (objective.type === "finish-within-moves" &&
        (!Number.isInteger(objective.maxMoves) || objective.maxMoves <= 0)) {
        throw new Error(`Objective ${objective.id} has an invalid move limit.`);
    }
    if (objective.type === "finish-within-time" &&
        (!Number.isInteger(objective.maxElapsedMs) || objective.maxElapsedMs <= 0)) {
        throw new Error(`Objective ${objective.id} has an invalid time limit.`);
    }
}
function validateLessonDefinition(definition) {
    if (definition.schemaVersion !== 1)
        throw new Error("Unsupported lesson schema.");
    assertId(definition.id, "Lesson ID");
    assertId(definition.title, "Lesson title");
    assertId(definition.puzzleId, "Lesson puzzle ID");
    if (definition.objectives.length === 0)
        throw new Error("A lesson requires at least one objective.");
    const ids = new Set();
    for (const objective of definition.objectives) {
        validateObjective(objective);
        if (ids.has(objective.id))
            throw new Error(`Duplicate objective ID: ${objective.id}.`);
        ids.add(objective.id);
    }
    if (definition.minimumStarsToMaster !== undefined &&
        ![1, 2, 3].includes(definition.minimumStarsToMaster)) {
        throw new Error("minimumStarsToMaster must be 1, 2, or 3.");
    }
}
function validateCampaignDefinition(definition) {
    if (definition.schemaVersion !== 1)
        throw new Error("Unsupported campaign schema.");
    assertId(definition.id, "Campaign ID");
    assertId(definition.title, "Campaign title");
    if (definition.chapters.length === 0)
        throw new Error("A campaign requires at least one chapter.");
    const lessons = new Map();
    for (const lesson of definition.lessons) {
        validateLessonDefinition(lesson);
        if (lessons.has(lesson.id))
            throw new Error(`Duplicate lesson ID: ${lesson.id}.`);
        lessons.set(lesson.id, lesson);
    }
    const referenced = new Set();
    for (const chapter of definition.chapters) {
        assertId(chapter.id, "Chapter ID");
        assertId(chapter.title, "Chapter title");
        if (chapter.lessonIds.length === 0)
            throw new Error(`Chapter ${chapter.id} has no lessons.`);
        for (const lessonId of chapter.lessonIds) {
            if (!lessons.has(lessonId))
                throw new Error(`Unknown campaign lesson: ${lessonId}.`);
            if (referenced.has(lessonId))
                throw new Error(`Lesson appears more than once: ${lessonId}.`);
            referenced.add(lessonId);
        }
    }
    if (referenced.size !== lessons.size)
        throw new Error("Every campaign lesson must appear in exactly one chapter.");
}
function initialMetrics() {
    return {
        placedTiles: 0,
        completedEquationIds: [],
        hintsUsed: 0,
        mistakes: 0,
        moves: 0,
        elapsedMs: 0,
    };
}
function initialObjectiveProgress(definition) {
    return definition.objectives.map((objective) => ({
        objectiveId: objective.id,
        current: 0,
        target: objectiveTarget(objective),
        completed: false,
    }));
}
function currentFor(objective, metrics, puzzleCompleted) {
    switch (objective.type) {
        case "place-tiles":
            return Math.min(metrics.placedTiles, objective.count);
        case "complete-equations":
            return Math.min(metrics.completedEquationIds.length, objective.count);
        case "solve-puzzle":
            return puzzleCompleted ? 1 : 0;
        case "finish-without-hints":
            return puzzleCompleted && metrics.hintsUsed === 0 ? 1 : 0;
        case "finish-within-moves":
            return puzzleCompleted && metrics.moves <= objective.maxMoves ? 1 : 0;
        case "finish-within-time":
            return puzzleCompleted && metrics.elapsedMs <= objective.maxElapsedMs ? 1 : 0;
    }
}
function computeStars(definition, progress) {
    const completed = progress.filter((item) => item.completed).length;
    if (completed === 0)
        return 0;
    if (completed === progress.length)
        return 3;
    if (completed * 2 >= progress.length)
        return 2;
    return 1;
}
function validateLessonState(definition, state) {
    validateLessonDefinition(definition);
    if (state.schemaVersion !== 1 || state.lessonId !== definition.id || state.puzzleId !== definition.puzzleId) {
        throw new Error("Saved lesson state is incompatible.");
    }
    if (!Number.isInteger(state.attempt) || state.attempt < 1 ||
        !Number.isInteger(state.revision) || state.revision < 0) {
        throw new Error("Saved lesson counters are invalid.");
    }
    if (![0, 1, 2, 3].includes(state.stars))
        throw new Error("Saved lesson stars are invalid.");
    if (state.objectives.length !== definition.objectives.length) {
        throw new Error("Saved lesson objective count is invalid.");
    }
    const expectedIds = definition.objectives.map((objective) => objective.id);
    state.objectives.forEach((item, index) => {
        if (item.objectiveId !== expectedIds[index] ||
            !Number.isInteger(item.current) || item.current < 0 ||
            !Number.isInteger(item.target) || item.target <= 0 ||
            item.current > item.target ||
            item.completed !== (item.current >= item.target)) {
            throw new Error("Saved lesson objective progress is invalid.");
        }
    });
    const metrics = state.metrics;
    if (![metrics.placedTiles, metrics.hintsUsed, metrics.mistakes, metrics.moves, metrics.elapsedMs]
        .every((value) => Number.isInteger(value) && value >= 0)) {
        throw new Error("Saved lesson metrics are invalid.");
    }
    if (new Set(metrics.completedEquationIds).size !== metrics.completedEquationIds.length) {
        throw new Error("Saved lesson equation progress contains duplicates.");
    }
}
function lessonOrder(definition) {
    return definition.chapters.flatMap((chapter) => chapter.lessonIds);
}
function validateCampaignState(definition, state) {
    validateCampaignDefinition(definition);
    if (state.schemaVersion !== 1 || state.campaignId !== definition.id ||
        !Number.isInteger(state.revision) || state.revision < 0) {
        throw new Error("Saved campaign state is incompatible.");
    }
    const order = lessonOrder(definition);
    if (state.lessons.length !== order.length)
        throw new Error("Saved campaign lesson count is invalid.");
    state.lessons.forEach((item, index) => {
        if (item.lessonId !== order[index] || ![0, 1, 2, 3].includes(item.bestStars) ||
            !Number.isInteger(item.attempts) || item.attempts < 0 ||
            item.mastered && !item.completed) {
            throw new Error("Saved campaign lesson progress is invalid.");
        }
    });
}
class CrossMathLearningRuntime {
    createLesson(definition) {
        validateLessonDefinition(definition);
        const state = {
            schemaVersion: 1,
            lessonId: definition.id,
            puzzleId: definition.puzzleId,
            status: "in-progress",
            attempt: 1,
            objectives: initialObjectiveProgress(definition),
            activeObjectiveIndex: 0,
            stars: 0,
            metrics: initialMetrics(),
            revision: 0,
        };
        return { state, events: [{ type: "lesson-started", lessonId: definition.id, attempt: 1 }] };
    }
    restartLesson(definition, state) {
        validateLessonState(definition, state);
        const attempt = state.attempt + 1;
        const next = {
            schemaVersion: 1,
            lessonId: definition.id,
            puzzleId: definition.puzzleId,
            status: "in-progress",
            attempt,
            objectives: initialObjectiveProgress(definition),
            activeObjectiveIndex: 0,
            stars: 0,
            metrics: initialMetrics(),
            revision: state.revision + 1,
        };
        return { state: next, events: [{ type: "lesson-restarted", lessonId: definition.id, attempt }] };
    }
    observe(definition, state, game) {
        validateLessonState(definition, state);
        if (game.state.puzzleId !== definition.puzzleId)
            throw new Error("Game puzzle does not match lesson.");
        if (state.status === "completed")
            return { state, events: [] };
        const placedTiles = state.metrics.placedTiles +
            game.events.filter((event) => event.type === "tile-placed").length;
        const completedEquationIds = [...new Set([
                ...state.metrics.completedEquationIds,
                ...game.events
                    .filter((event) => event.type === "equation-completed")
                    .map((event) => event.equationId),
            ])].sort();
        const metrics = {
            placedTiles,
            completedEquationIds,
            hintsUsed: game.state.history.present.hintsUsed,
            mistakes: game.state.mistakes,
            moves: game.state.history.present.moves,
            elapsedMs: game.state.clock.elapsedMs,
        };
        const puzzleCompleted = game.state.status === "completed";
        const objectives = definition.objectives.map((objective) => {
            const current = currentFor(objective, metrics, puzzleCompleted);
            const target = objectiveTarget(objective);
            return { objectiveId: objective.id, current, target, completed: current >= target };
        });
        const events = [];
        objectives.forEach((objective, index) => {
            if (objective.completed && !state.objectives[index]?.completed) {
                events.push({ type: "objective-completed", lessonId: definition.id, objectiveId: objective.objectiveId });
            }
        });
        const stars = computeStars(definition, objectives);
        for (let star = state.stars + 1; star <= stars; star += 1) {
            events.push({ type: "star-earned", lessonId: definition.id, star: star });
        }
        const completed = puzzleCompleted && objectives.every((objective) => objective.completed);
        if (completed) {
            events.push({ type: "lesson-completed", lessonId: definition.id, stars: stars });
        }
        const activeObjectiveIndex = Math.max(0, objectives.findIndex((objective) => !objective.completed));
        const next = {
            ...state,
            status: completed ? "completed" : "in-progress",
            objectives,
            activeObjectiveIndex: completed ? objectives.length : activeObjectiveIndex,
            stars,
            metrics,
            revision: state.revision + 1,
        };
        return { state: next, events };
    }
    serializeLesson(state) {
        return JSON.stringify(canonical(state));
    }
    restoreLesson(definition, serialized) {
        let parsed;
        try {
            parsed = JSON.parse(serialized);
        }
        catch {
            throw new Error("Saved lesson state is not valid JSON.");
        }
        if (parsed === null || typeof parsed !== "object")
            throw new Error("Saved lesson state is invalid.");
        const state = parsed;
        validateLessonState(definition, state);
        return state;
    }
    createCampaign(definition) {
        validateCampaignDefinition(definition);
        const order = lessonOrder(definition);
        const lessons = order.map((lessonId, index) => ({
            lessonId,
            unlocked: index === 0,
            completed: false,
            mastered: false,
            bestStars: 0,
            attempts: 0,
        }));
        return { state: { schemaVersion: 1, campaignId: definition.id, lessons, completed: false, revision: 0 }, events: [] };
    }
    recordLesson(definition, state, lesson) {
        validateCampaignState(definition, state);
        const index = state.lessons.findIndex((item) => item.lessonId === lesson.lessonId);
        if (index < 0)
            throw new Error(`Lesson ${lesson.lessonId} is not in campaign.`);
        const lessonDefinition = definition.lessons.find((item) => item.id === lesson.lessonId);
        if (lessonDefinition === undefined)
            throw new Error("Campaign lesson definition is missing.");
        validateLessonState(lessonDefinition, lesson);
        if (!state.lessons[index]?.unlocked)
            throw new Error("Cannot record progress for a locked lesson.");
        const masteryStars = lessonDefinition.minimumStarsToMaster ?? 3;
        const lessons = state.lessons.map((item, itemIndex) => {
            if (itemIndex !== index)
                return item;
            return {
                ...item,
                completed: item.completed || lesson.status === "completed",
                mastered: item.mastered || (lesson.status === "completed" && lesson.stars >= masteryStars),
                bestStars: Math.max(item.bestStars, lesson.stars),
                attempts: Math.max(item.attempts, lesson.attempt),
            };
        });
        const events = [];
        if (lesson.status === "completed" && index + 1 < lessons.length && !lessons[index + 1]?.unlocked) {
            const next = lessons[index + 1];
            lessons[index + 1] = { ...next, unlocked: true };
            events.push({ type: "lesson-unlocked", lessonId: next.lessonId });
        }
        const completed = lessons.every((item) => item.completed);
        if (completed && !state.completed) {
            events.push({ type: "campaign-completed", campaignId: definition.id });
        }
        return {
            state: { ...state, lessons, completed, revision: state.revision + 1 },
            events,
        };
    }
    serializeCampaign(state) {
        return JSON.stringify(canonical(state));
    }
    restoreCampaign(definition, serialized) {
        let parsed;
        try {
            parsed = JSON.parse(serialized);
        }
        catch {
            throw new Error("Saved campaign state is not valid JSON.");
        }
        if (parsed === null || typeof parsed !== "object")
            throw new Error("Saved campaign state is invalid.");
        const state = parsed;
        validateCampaignState(definition, state);
        return state;
    }
}
exports.CrossMathLearningRuntime = CrossMathLearningRuntime;
exports.learningRuntime = new CrossMathLearningRuntime();
