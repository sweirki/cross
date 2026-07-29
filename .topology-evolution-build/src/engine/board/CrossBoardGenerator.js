"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCrossBoard = generateCrossBoard;
const ExpressionGenerator_1 = require("../math/ExpressionGenerator");
const SLOT_TO_PATH_INDEX = {
    left: 0,
    right: 2,
    result: 4,
};
function slotValue(expression, slot) {
    return expression[slot];
}
function createHorizontalNodes(expression) {
    return [
        {
            id: "n-h-left",
            kind: "number",
            position: { row: 2, column: 0 },
        },
        {
            id: "o-h",
            kind: "operator",
            operator: expression.operation,
            position: { row: 2, column: 1 },
        },
        {
            id: "n-h-right",
            kind: "number",
            position: { row: 2, column: 2 },
        },
        {
            id: "e-h",
            kind: "equals",
            position: { row: 2, column: 3 },
        },
        {
            id: "n-h-result",
            kind: "number",
            position: { row: 2, column: 4 },
        },
    ];
}
function horizontalNumberId(slot) {
    switch (slot) {
        case "left":
            return "n-h-left";
        case "right":
            return "n-h-right";
        case "result":
            return "n-h-result";
    }
}
function coordinateForHorizontalSlot(slot) {
    return {
        row: 2,
        column: SLOT_TO_PATH_INDEX[slot],
    };
}
function createVerticalNodes(expression, sharedNodeId, sharedSlot, column) {
    const ids = [
        "n-v-left",
        "o-v",
        "n-v-right",
        "e-v",
        "n-v-result",
    ];
    return ids.flatMap((id, index) => {
        if (index === SLOT_TO_PATH_INDEX[sharedSlot]) {
            return [];
        }
        if (index === 1) {
            return [
                {
                    id,
                    kind: "operator",
                    operator: expression.operation,
                    position: { row: index, column },
                },
            ];
        }
        if (index === 3) {
            return [
                {
                    id,
                    kind: "equals",
                    position: { row: index, column },
                },
            ];
        }
        return [
            {
                id,
                kind: "number",
                position: { row: index, column },
            },
        ];
    });
}
function verticalPathNodeIds(sharedNodeId, sharedSlot) {
    const ids = [
        "n-v-left",
        "o-v",
        "n-v-right",
        "e-v",
        "n-v-result",
    ];
    ids[SLOT_TO_PATH_INDEX[sharedSlot]] = sharedNodeId;
    return ids;
}
function assignExpressionValues(target, expression, prefix) {
    target[`n-${prefix}-left`] = expression.left;
    target[`n-${prefix}-right`] = expression.right;
    target[`n-${prefix}-result`] = expression.result;
}
function chooseCompatiblePair(expressions, horizontalSlot, verticalSlot) {
    for (const horizontal of expressions) {
        const sharedValue = slotValue(horizontal, horizontalSlot);
        for (const vertical of expressions) {
            if (slotValue(vertical, verticalSlot) === sharedValue) {
                return [horizontal, vertical];
            }
        }
    }
    return null;
}
function generateCrossBoard(options) {
    const horizontalSharedSlot = options.horizontalSharedSlot ?? "result";
    const verticalSharedSlot = options.verticalSharedSlot ?? "right";
    const expressions = (0, ExpressionGenerator_1.generateExpressionArray)(options);
    const pair = chooseCompatiblePair(expressions, horizontalSharedSlot, verticalSharedSlot);
    if (pair === null) {
        throw new Error("No compatible expression pair exists for the configured shared slots.");
    }
    const [horizontalExpression, verticalExpression] = pair;
    const sharedNodeId = horizontalNumberId(horizontalSharedSlot);
    const sharedPosition = coordinateForHorizontalSlot(horizontalSharedSlot);
    const nodes = [
        ...createHorizontalNodes(horizontalExpression),
        ...createVerticalNodes(verticalExpression, sharedNodeId, verticalSharedSlot, sharedPosition.column),
    ];
    const horizontalNodeIds = ["n-h-left", "o-h", "n-h-right", "e-h", "n-h-result"];
    const equations = [
        {
            id: "eq-horizontal",
            orientation: "horizontal",
            nodeIds: horizontalNodeIds,
        },
        {
            id: "eq-vertical",
            orientation: "vertical",
            nodeIds: verticalPathNodeIds(sharedNodeId, verticalSharedSlot),
        },
    ];
    const canonicalSolution = {};
    assignExpressionValues(canonicalSolution, horizontalExpression, "h");
    assignExpressionValues(canonicalSolution, verticalExpression, "v");
    canonicalSolution[sharedNodeId] = slotValue(horizontalExpression, horizontalSharedSlot);
    delete canonicalSolution[verticalSharedSlot === "left"
        ? "n-v-left"
        : verticalSharedSlot === "right"
            ? "n-v-right"
            : "n-v-result"];
    return {
        topology: {
            width: 5,
            height: 5,
            nodes,
            equations,
        },
        canonicalSolution,
        horizontalExpression,
        verticalExpression,
        sharedNodeId,
    };
}
