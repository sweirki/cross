"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrossMathAcademyRuntime = void 0;
exports.validateSkillGraph = validateSkillGraph;
exports.validateAttempt = validateAttempt;
exports.calculateMastery = calculateMastery;
function requireString(value, label) {
    if (typeof value !== "string" || value.trim() === "")
        throw new Error(`${label} must be a non-empty string.`);
}
function requireInteger(value, label, minimum = 0) {
    if (!Number.isInteger(value) || Number(value) < minimum)
        throw new Error(`${label} must be an integer >= ${minimum}.`);
}
function clamp(value, minimum = 0, maximum = 100) {
    return Math.max(minimum, Math.min(maximum, value));
}
function round(value) { return Math.round(value * 100) / 100; }
function bandFor(score, confidence, threshold) {
    if (confidence === 0)
        return "not-started";
    if (score >= threshold && confidence >= 60)
        return "mastered";
    if (score >= Math.max(60, threshold - 15))
        return "proficient";
    return "developing";
}
function thresholdFor(skill) { return skill.masteryThreshold ?? 85; }
function skillMap(graph) {
    return new Map(graph.skills.map((skill) => [skill.id, skill]));
}
function stableAttempts(attempts) {
    return [...attempts].sort((a, b) => a.occurredAt - b.occurredAt || a.id.localeCompare(b.id));
}
function validateSkillGraph(graph) {
    if (graph.schemaVersion !== 1)
        throw new Error("Unsupported skill graph schema.");
    requireString(graph.id, "Graph id");
    if (!Array.isArray(graph.skills) || graph.skills.length === 0)
        throw new Error("Skill graph must contain skills.");
    const ids = new Set();
    for (const skill of graph.skills) {
        requireString(skill.id, "Skill id");
        requireString(skill.title, "Skill title");
        if (ids.has(skill.id))
            throw new Error(`Duplicate skill id: ${skill.id}.`);
        ids.add(skill.id);
        const threshold = thresholdFor(skill);
        if (!Number.isFinite(threshold) || threshold < 1 || threshold > 100)
            throw new Error(`Invalid mastery threshold for ${skill.id}.`);
        if (new Set(skill.prerequisiteIds).size !== skill.prerequisiteIds.length)
            throw new Error(`Duplicate prerequisite for ${skill.id}.`);
        if (skill.prerequisiteIds.includes(skill.id))
            throw new Error(`Skill ${skill.id} cannot require itself.`);
    }
    for (const skill of graph.skills) {
        for (const prerequisite of skill.prerequisiteIds) {
            if (!ids.has(prerequisite))
                throw new Error(`Missing prerequisite ${prerequisite} for ${skill.id}.`);
        }
    }
    const map = skillMap(graph);
    const visiting = new Set();
    const visited = new Set();
    const visit = (id) => {
        if (visiting.has(id))
            throw new Error("Skill graph contains a cycle.");
        if (visited.has(id))
            return;
        visiting.add(id);
        for (const prerequisite of map.get(id)?.prerequisiteIds ?? [])
            visit(prerequisite);
        visiting.delete(id);
        visited.add(id);
    };
    for (const skill of graph.skills)
        visit(skill.id);
}
function validateAttempt(graph, attempt) {
    requireString(attempt.id, "Attempt id");
    requireString(attempt.skillId, "Attempt skill id");
    if (!skillMap(graph).has(attempt.skillId))
        throw new Error(`Unknown skill ${attempt.skillId}.`);
    requireInteger(attempt.stars, "Stars");
    if (attempt.stars > 3)
        throw new Error("Stars must be <= 3.");
    requireInteger(attempt.hintsUsed, "Hints");
    requireInteger(attempt.mistakes, "Mistakes");
    requireInteger(attempt.elapsedMs, "Elapsed milliseconds");
    requireInteger(attempt.occurredAt, "Attempt timestamp");
}
function attemptPerformance(attempt) {
    const completion = attempt.completed ? 55 : 10;
    const stars = attempt.stars * 15;
    const penalties = Math.min(25, attempt.hintsUsed * 5 + attempt.mistakes * 4);
    return clamp(completion + stars - penalties);
}
function calculateMastery(graph, attempts) {
    validateSkillGraph(graph);
    attempts.forEach((attempt) => validateAttempt(graph, attempt));
    const ordered = stableAttempts(attempts);
    return graph.skills.map((skill) => {
        const relevant = ordered.filter((attempt) => attempt.skillId === skill.id);
        if (relevant.length === 0)
            return {
                skillId: skill.id, score: 0, confidence: 0, band: "not-started",
                attempts: 0, completions: 0, lastPracticedAt: null,
            };
        let weighted = 0;
        let weights = 0;
        relevant.forEach((attempt, index) => {
            const weight = index + 1;
            weighted += attemptPerformance(attempt) * weight;
            weights += weight;
        });
        const score = round(weighted / weights);
        const confidence = clamp(relevant.length * 20);
        return {
            skillId: skill.id,
            score,
            confidence,
            band: bandFor(score, confidence, thresholdFor(skill)),
            attempts: relevant.length,
            completions: relevant.filter((attempt) => attempt.completed).length,
            lastPracticedAt: relevant[relevant.length - 1]?.occurredAt ?? null,
        };
    });
}
class CrossMathAcademyRuntime {
    createProfile(graph, playerId) {
        validateSkillGraph(graph);
        requireString(playerId, "Player id");
        return { schemaVersion: 1, graphId: graph.id, playerId, attempts: [], mastery: calculateMastery(graph, []), revision: 0 };
    }
    recordAttempt(graph, state, attempt) {
        this.validateProfile(graph, state);
        validateAttempt(graph, attempt);
        if (state.attempts.some((item) => item.id === attempt.id))
            throw new Error(`Duplicate attempt id: ${attempt.id}.`);
        const previous = new Map(state.mastery.map((item) => [item.skillId, item]));
        const attempts = stableAttempts([...state.attempts, attempt]);
        const mastery = calculateMastery(graph, attempts);
        const events = [{ type: "attempt-recorded", attemptId: attempt.id, skillId: attempt.skillId }];
        for (const current of mastery) {
            const prior = previous.get(current.skillId);
            if (prior && prior.band !== current.band) {
                events.push({ type: "skill-band-changed", skillId: current.skillId, from: prior.band, to: current.band });
                if (current.band === "mastered")
                    events.push({ type: "skill-mastered", skillId: current.skillId });
            }
        }
        return { state: { ...state, attempts, mastery, revision: state.revision + 1 }, events };
    }
    recommend(graph, state, lessons, practice, now = 0) {
        this.validateProfile(graph, state);
        const mastery = new Map(state.mastery.map((item) => [item.skillId, item]));
        const isMastered = (id) => mastery.get(id)?.band === "mastered";
        const available = graph.skills.filter((skill) => skill.prerequisiteIds.every(isMastered));
        const unmastered = available.filter((skill) => !isMastered(skill.id));
        if (unmastered.length === 0)
            return { type: "complete", reason: "All available skills are mastered." };
        const review = unmastered
            .filter((skill) => {
            const item = mastery.get(skill.id);
            return item && item.attempts > 0 && item.lastPracticedAt !== null && now - item.lastPracticedAt > 30 * 24 * 60 * 60 * 1000;
        })
            .sort((a, b) => a.id.localeCompare(b.id))[0];
        if (review)
            return {
                type: "review", skillId: review.id,
                puzzleIds: this.selectPractice(review.id, practice, 5),
                reason: "This skill has not been practiced recently.",
            };
        const target = [...unmastered].sort((a, b) => {
            const ma = mastery.get(a.id);
            const mb = mastery.get(b.id);
            return ma.score - mb.score || a.id.localeCompare(b.id);
        })[0];
        const lesson = lessons
            .filter((binding) => binding.skillIds.includes(target.id))
            .sort((a, b) => a.lessonId.localeCompare(b.lessonId))[0];
        const targetMastery = mastery.get(target.id);
        if (targetMastery.attempts === 0 && lesson) {
            return { type: "lesson", lessonId: lesson.lessonId, skillId: target.id, reason: "Learn the next prerequisite-ready skill." };
        }
        return {
            type: "practice", skillId: target.id,
            puzzleIds: this.selectPractice(target.id, practice, 5),
            reason: "Practice the weakest prerequisite-ready skill.",
        };
    }
    recommendWithEvent(graph, state, lessons, practice, now = 0) {
        const recommendation = this.recommend(graph, state, lessons, practice, now);
        return { recommendation, events: [{ type: "recommendation-created", recommendationType: recommendation.type }] };
    }
    selectPractice(skillId, catalog, count) {
        requireString(skillId, "Skill id");
        requireInteger(count, "Practice count", 1);
        return catalog.filter((item) => item.skillIds.includes(skillId))
            .sort((a, b) => a.difficulty.localeCompare(b.difficulty) || a.puzzleId.localeCompare(b.puzzleId))
            .slice(0, count).map((item) => item.puzzleId);
    }
    analytics(graph, attempts) {
        attempts.forEach((attempt) => validateAttempt(graph, attempt));
        const skills = graph.skills.map((skill) => {
            const rows = stableAttempts(attempts.filter((attempt) => attempt.skillId === skill.id));
            const count = rows.length;
            const firstByLesson = new Map();
            for (const row of rows) {
                const key = row.lessonId ?? row.id;
                if (!firstByLesson.has(key))
                    firstByLesson.set(key, row);
            }
            const average = (selector) => count === 0 ? 0 : round(rows.reduce((sum, row) => sum + selector(row), 0) / count);
            return {
                skillId: skill.id, attempts: count,
                completionRate: count === 0 ? 0 : round(rows.filter((row) => row.completed).length / count),
                averageStars: average((row) => row.stars),
                averageHints: average((row) => row.hintsUsed),
                averageMistakes: average((row) => row.mistakes),
                averageElapsedMs: average((row) => row.elapsedMs),
                firstAttemptSuccessRate: firstByLesson.size === 0 ? 0 :
                    round([...firstByLesson.values()].filter((row) => row.completed).length / firstByLesson.size),
            };
        });
        return { totalAttempts: attempts.length, completedAttempts: attempts.filter((item) => item.completed).length, skills };
    }
    coachDashboard(graph, profiles, lessons, practice, now = 0) {
        const learners = profiles.map((profile) => {
            this.validateProfile(graph, profile);
            const averageMastery = profile.mastery.length === 0 ? 0 :
                round(profile.mastery.reduce((sum, item) => sum + item.score, 0) / profile.mastery.length);
            const supportSkillIds = profile.mastery.filter((item) => item.attempts > 0 && item.band === "developing")
                .map((item) => item.skillId).sort();
            return {
                playerId: profile.playerId, averageMastery,
                masteredSkills: profile.mastery.filter((item) => item.band === "mastered").length,
                supportSkillIds, recommendation: this.recommend(graph, profile, lessons, practice, now),
            };
        }).sort((a, b) => a.playerId.localeCompare(b.playerId));
        const counts = new Map();
        learners.flatMap((learner) => learner.supportSkillIds).forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1));
        const prioritySupportSkillIds = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([id]) => id);
        const classAverageMastery = learners.length === 0 ? 0 :
            round(learners.reduce((sum, learner) => sum + learner.averageMastery, 0) / learners.length);
        return { learnerCount: learners.length, classAverageMastery, learners, prioritySupportSkillIds };
    }
    replay(graph, playerId, attempts) {
        let state = this.createProfile(graph, playerId);
        for (const attempt of stableAttempts(attempts))
            state = this.recordAttempt(graph, state, attempt).state;
        return state;
    }
    serialize(state) {
        return JSON.stringify({ ...state, attempts: stableAttempts(state.attempts), mastery: [...state.mastery].sort((a, b) => a.skillId.localeCompare(b.skillId)) });
    }
    restore(graph, serialized) {
        let value;
        try {
            value = JSON.parse(serialized);
        }
        catch {
            throw new Error("Invalid academy save JSON.");
        }
        this.validateProfile(graph, value);
        const state = value;
        const expected = [...calculateMastery(graph, state.attempts)].sort((a, b) => a.skillId.localeCompare(b.skillId));
        const actual = [...state.mastery].sort((a, b) => a.skillId.localeCompare(b.skillId));
        if (JSON.stringify(expected) !== JSON.stringify(actual))
            throw new Error("Academy mastery does not match attempts.");
        return { ...state, attempts: stableAttempts(state.attempts), mastery: actual };
    }
    validateProfile(graph, value) {
        validateSkillGraph(graph);
        if (!value || typeof value !== "object")
            throw new Error("Invalid academy profile.");
        const state = value;
        if (state.schemaVersion !== 1 || state.graphId !== graph.id)
            throw new Error("Academy profile schema or graph mismatch.");
        requireString(state.playerId, "Player id");
        requireInteger(state.revision, "Revision");
        if (!Array.isArray(state.attempts) || !Array.isArray(state.mastery))
            throw new Error("Invalid academy profile arrays.");
        const ids = new Set();
        state.attempts.forEach((attempt) => {
            validateAttempt(graph, attempt);
            if (ids.has(attempt.id))
                throw new Error(`Duplicate attempt id: ${attempt.id}.`);
            ids.add(attempt.id);
        });
        if (state.mastery.length !== graph.skills.length)
            throw new Error("Academy mastery length mismatch.");
        const masteryIds = new Set();
        const knownSkillIds = new Set(graph.skills.map((skill) => skill.id));
        for (const item of state.mastery) {
            requireString(item.skillId, "Mastery skill id");
            if (!knownSkillIds.has(item.skillId) || masteryIds.has(item.skillId))
                throw new Error("Invalid or duplicate mastery skill.");
            masteryIds.add(item.skillId);
            if (!Number.isFinite(item.score) || item.score < 0 || item.score > 100)
                throw new Error("Invalid mastery score.");
            if (!Number.isFinite(item.confidence) || item.confidence < 0 || item.confidence > 100)
                throw new Error("Invalid confidence.");
            requireInteger(item.attempts, "Mastery attempts");
            requireInteger(item.completions, "Mastery completions");
            if (!["not-started", "developing", "proficient", "mastered"].includes(item.band))
                throw new Error("Invalid mastery band.");
        }
    }
}
exports.CrossMathAcademyRuntime = CrossMathAcademyRuntime;
