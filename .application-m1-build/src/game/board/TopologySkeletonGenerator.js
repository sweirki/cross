"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ORGANIC_TOPOLOGY_ARCHETYPES = void 0;
exports.selectOrganicTopologyArchetype = selectOrganicTopologyArchetype;
exports.generateTopologySkeleton = generateTopologySkeleton;
exports.materializeTopologySkeleton = materializeTopologySkeleton;
exports.serializeTopologySkeleton = serializeTopologySkeleton;
const BoardTopologyEngine_1 = require("./BoardTopologyEngine");
exports.ORGANIC_TOPOLOGY_ARCHETYPES = [
    "chain",
    "fork",
    "hub",
    "spread",
    "cluster",
];
const NUMBER_OFFSETS = [0, 2, 4];
const ALL_OFFSETS = [0, 1, 2, 3, 4];
function key(position) {
    return `${position.row}:${position.column}`;
}
function positionAt(equation, offset) {
    return equation.orientation === "horizontal"
        ? { row: equation.start.row, column: equation.start.column + offset }
        : { row: equation.start.row + offset, column: equation.start.column };
}
function nodeKind(offset) {
    if (offset === 1)
        return "operator";
    if (offset === 3)
        return "equals";
    return "number";
}
function opposite(orientation) {
    return orientation === "horizontal" ? "vertical" : "horizontal";
}
function seedToState(seed) {
    if (!Number.isInteger(seed)) {
        throw new Error("Topology seed must be an integer.");
    }
    return seed >>> 0;
}
function nextRandom(state) {
    state.value = (state.value + 0x6d2b79f5) >>> 0;
    let value = state.value;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}
function chooseIndex(length, state) {
    return Math.floor(nextRandom(state) * length);
}
function fits(equation, width, height, occupied, requiredIntersection) {
    let intersections = 0;
    for (const offset of ALL_OFFSETS) {
        const position = positionAt(equation, offset);
        if (position.row < 0 ||
            position.row >= height ||
            position.column < 0 ||
            position.column >= width) {
            return false;
        }
        const existing = occupied.get(key(position));
        if (existing === undefined)
            continue;
        if (existing.participation >= 2)
            return false;
        const incomingKind = nodeKind(offset);
        const isRequired = position.row === requiredIntersection.row &&
            position.column === requiredIntersection.column;
        if (!isRequired ||
            incomingKind !== "number" ||
            existing.kind !== "number" ||
            existing.orientation === equation.orientation) {
            return false;
        }
        intersections += 1;
    }
    return intersections === 1;
}
function occupy(equation, occupied) {
    for (const offset of ALL_OFFSETS) {
        const position = positionAt(equation, offset);
        const coordinate = key(position);
        const existing = occupied.get(coordinate);
        if (existing === undefined) {
            occupied.set(coordinate, {
                kind: nodeKind(offset),
                orientation: equation.orientation,
                participation: 1,
            });
        }
        else {
            occupied.set(coordinate, {
                ...existing,
                participation: existing.participation + 1,
            });
        }
    }
}
function candidateSignature(equation) {
    return `${equation.orientation}:${equation.start.row}:${equation.start.column}`;
}
function validateRequest(request) {
    if (!Number.isInteger(request.width) || request.width < 5) {
        throw new Error("Topology width must be an integer of at least 5.");
    }
    if (!Number.isInteger(request.height) || request.height < 5) {
        throw new Error("Topology height must be an integer of at least 5.");
    }
    if (!Number.isInteger(request.equationCount) || request.equationCount < 2) {
        throw new Error("Equation count must be an integer of at least 2.");
    }
    if (request.profile !== undefined &&
        request.profile !== "classic" &&
        request.profile !== "organic") {
        throw new Error(`Unknown topology generation profile: ${String(request.profile)}.`);
    }
    if (request.archetype !== undefined &&
        !exports.ORGANIC_TOPOLOGY_ARCHETYPES.includes(request.archetype)) {
        throw new Error(`Unknown organic topology archetype: ${String(request.archetype)}.`);
    }
}
function boundsFor(equations) {
    const positions = equations.flatMap((equation) => ALL_OFFSETS.map((offset) => positionAt(equation, offset)));
    return {
        minRow: Math.min(...positions.map((position) => position.row)),
        maxRow: Math.max(...positions.map((position) => position.row)),
        minColumn: Math.min(...positions.map((position) => position.column)),
        maxColumn: Math.max(...positions.map((position) => position.column)),
    };
}
function area(bounds) {
    return ((bounds.maxRow - bounds.minRow + 1) *
        (bounds.maxColumn - bounds.minColumn + 1));
}
function areaGrowth(equations, candidate) {
    const before = boundsFor(equations);
    const after = boundsFor([...equations, candidate]);
    return area(after) - area(before);
}
function selectOrganicTopologyArchetype(seed) {
    if (!Number.isInteger(seed)) {
        throw new Error("Topology seed must be an integer.");
    }
    return exports.ORGANIC_TOPOLOGY_ARCHETYPES[stableHash(`organic-archetype:${seed}`) %
        exports.ORGANIC_TOPOLOGY_ARCHETYPES.length];
}
function equationDegrees(equations) {
    const degrees = new Map(equations.map((equation) => [equation.id, 0]));
    for (let leftIndex = 0; leftIndex < equations.length; leftIndex += 1) {
        const left = equations[leftIndex];
        const leftNumbers = new Set(NUMBER_OFFSETS.map((offset) => key(positionAt(left, offset))));
        for (let rightIndex = leftIndex + 1; rightIndex < equations.length; rightIndex += 1) {
            const right = equations[rightIndex];
            if (NUMBER_OFFSETS.some((offset) => leftNumbers.has(key(positionAt(right, offset))))) {
                degrees.set(left.id, (degrees.get(left.id) ?? 0) + 1);
                degrees.set(right.id, (degrees.get(right.id) ?? 0) + 1);
            }
        }
    }
    return degrees;
}
function organicScore(candidate, archetype = "cluster", equations = [], seed = 0) {
    const middleSides = Number(candidate.existingOffset === 2) +
        Number(candidate.incomingOffset === 2);
    const degrees = equationDegrees(equations);
    const parentDegree = degrees.get(candidate.existingEquationId) ?? 0;
    const latestEquationId = equations[equations.length - 1]?.id;
    const deterministicJitter = stableHash(`${seed}:${equations.length}:${archetype}:${candidateSignature(candidate.equation)}`) % 997;
    // All organic candidates are still required to involve a middle number.
    // The family-specific terms shape the equation graph and silhouette rather
    // than weakening the core crossword-style crossing guarantee.
    let familyScore = 0;
    switch (archetype) {
        case "chain":
            familyScore += parentDegree <= 1 ? 9_000 : -9_000;
            familyScore += candidate.existingEquationId === latestEquationId ? 5_000 : 0;
            familyScore += candidate.incomingOffset === 2 ? 0 : 2_000;
            familyScore += candidate.areaGrowth * 80;
            break;
        case "fork":
            familyScore += parentDegree === 2 ? 10_000 : parentDegree === 1 ? 5_000 : 0;
            familyScore += middleSides === 2 ? 1_500 : 3_000;
            familyScore += candidate.areaGrowth * 35;
            break;
        case "hub":
            familyScore += candidate.existingEquationId === equations[0]?.id ? 12_000 : 0;
            familyScore += parentDegree * 4_000;
            familyScore += middleSides === 2 ? 2_000 : 500;
            familyScore -= candidate.areaGrowth * 20;
            break;
        case "spread":
            familyScore += candidate.areaGrowth * 500;
            familyScore += middleSides === 1 ? 6_000 : 0;
            familyScore += parentDegree <= 1 ? 2_000 : 0;
            break;
        case "cluster":
            familyScore -= candidate.areaGrowth * 450;
            familyScore += middleSides * 3_000;
            familyScore += parentDegree === 1 ? 1_500 : 0;
            break;
    }
    return middleSides * 100_000 + familyScore + deterministicJitter;
}
function selectCandidate(candidates, profile, randomState) {
    if (profile === "classic") {
        return candidates[chooseIndex(candidates.length, randomState)];
    }
    const bestScore = Math.max(...candidates.map((candidate) => organicScore(candidate)));
    const best = candidates.filter((candidate) => organicScore(candidate) === bestScore);
    return best[chooseIndex(best.length, randomState)];
}
function stableHash(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}
function enumerateCandidates(equations, occupied, request) {
    const candidates = [];
    const signatures = new Set();
    const nextId = `eq-${String(equations.length + 1).padStart(4, "0")}`;
    for (const existingEquation of equations) {
        for (const existingOffset of NUMBER_OFFSETS) {
            const intersection = positionAt(existingEquation, existingOffset);
            const orientation = opposite(existingEquation.orientation);
            for (const incomingOffset of NUMBER_OFFSETS) {
                const start = orientation === "horizontal"
                    ? {
                        row: intersection.row,
                        column: intersection.column - incomingOffset,
                    }
                    : {
                        row: intersection.row - incomingOffset,
                        column: intersection.column,
                    };
                const equation = {
                    id: nextId,
                    orientation,
                    start,
                };
                const signature = candidateSignature(equation);
                if (!signatures.has(signature) &&
                    fits(equation, request.width, request.height, occupied, intersection)) {
                    signatures.add(signature);
                    candidates.push({
                        existingEquationId: existingEquation.id,
                        equation,
                        existingOffset,
                        incomingOffset,
                        areaGrowth: areaGrowth(equations, equation),
                    });
                }
            }
        }
    }
    return candidates;
}
function generateOrganicEquations(request, first) {
    const attempt = (allowEndpointOnly) => {
        let visitedStates = 0;
        const maximumStates = 50_000;
        const search = (equations, occupied) => {
            visitedStates += 1;
            if (visitedStates > maximumStates)
                return null;
            if (equations.length === request.equationCount)
                return [...equations];
            const candidates = enumerateCandidates(equations, occupied, request)
                .filter((candidate) => allowEndpointOnly ||
                candidate.existingOffset === 2 ||
                candidate.incomingOffset === 2)
                .sort((left, right) => {
                const archetype = request.archetype ?? selectOrganicTopologyArchetype(request.seed);
                const scoreDifference = organicScore(right, archetype, equations, request.seed) -
                    organicScore(left, archetype, equations, request.seed);
                if (scoreDifference !== 0)
                    return scoreDifference;
                const leftSignature = candidateSignature(left.equation);
                const rightSignature = candidateSignature(right.equation);
                const leftTie = stableHash(`${request.seed}:${equations.length}:${leftSignature}`);
                const rightTie = stableHash(`${request.seed}:${equations.length}:${rightSignature}`);
                if (leftTie !== rightTie)
                    return leftTie - rightTie;
                return leftSignature.localeCompare(rightSignature);
            });
            for (const candidate of candidates) {
                const nextOccupied = new Map(occupied);
                occupy(candidate.equation, nextOccupied);
                const result = search([...equations, candidate.equation], nextOccupied);
                if (result !== null)
                    return result;
            }
            return null;
        };
        const initialOccupied = new Map();
        occupy(first, initialOccupied);
        return search([first], initialOccupied);
    };
    const middleConnected = attempt(false);
    if (middleConnected !== null)
        return middleConnected;
    const fallback = attempt(true);
    if (fallback !== null)
        return fallback;
    throw new Error(`Unable to place ${request.equationCount} equations on a ` +
        `${request.width}x${request.height} board for seed ${request.seed}.`);
}
/**
 * Generates a connected, operator-free topology skeleton.
 *
 * Every equation after the first intersects exactly one existing equation at
 * a number coordinate. Candidate enumeration and seeded selection are stable,
 * so identical requests always produce identical skeletons.
 */
function generateTopologySkeleton(request) {
    validateRequest(request);
    const profile = request.profile ?? "classic";
    const randomState = { value: seedToState(request.seed) };
    const firstOrientation = nextRandom(randomState) < 0.5 ? "horizontal" : "vertical";
    const first = firstOrientation === "horizontal"
        ? {
            id: "eq-0001",
            orientation: firstOrientation,
            start: {
                row: Math.floor(request.height / 2),
                column: Math.floor((request.width - 5) / 2),
            },
        }
        : {
            id: "eq-0001",
            orientation: firstOrientation,
            start: {
                row: Math.floor((request.height - 5) / 2),
                column: Math.floor(request.width / 2),
            },
        };
    if (profile === "organic") {
        return {
            width: request.width,
            height: request.height,
            equations: generateOrganicEquations(request, first),
        };
    }
    const equations = [first];
    const occupied = new Map();
    occupy(first, occupied);
    while (equations.length < request.equationCount) {
        const candidates = enumerateCandidates(equations, occupied, request)
            .sort((left, right) => candidateSignature(left.equation).localeCompare(candidateSignature(right.equation)));
        if (candidates.length === 0) {
            throw new Error(`Unable to place ${request.equationCount} equations on a ` +
                `${request.width}x${request.height} board for seed ${request.seed}.`);
        }
        const selected = selectCandidate(candidates, profile, randomState);
        equations.push(selected.equation);
        occupy(selected.equation, occupied);
    }
    return {
        width: request.width,
        height: request.height,
        equations,
    };
}
function resolveOperator(assignment, equation, index) {
    if (typeof assignment === "string")
        return assignment;
    if (typeof assignment === "function")
        return assignment(equation, index);
    const operator = assignment[equation.id];
    if (operator === undefined) {
        throw new Error(`Missing operator assignment for ${equation.id}.`);
    }
    return operator;
}
/** Converts an operator-free skeleton into the canonical board topology. */
function materializeTopologySkeleton(skeleton, assignment) {
    const equations = skeleton.equations.map((equation, index) => ({
        ...equation,
        operator: resolveOperator(assignment, equation, index),
    }));
    return (0, BoardTopologyEngine_1.buildBoardTopology)({
        width: skeleton.width,
        height: skeleton.height,
        equations,
    });
}
function serializeTopologySkeleton(skeleton) {
    return JSON.stringify(skeleton);
}
