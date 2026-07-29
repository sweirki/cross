"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const generation_1 = require("../../src/generation");
let assertions = 0;
function check(condition, message) {
    assertions += 1;
    if (!condition)
        throw new Error(message);
}
function checkThrows(action, pattern) {
    let message = "";
    try {
        action();
    }
    catch (error) {
        message = error instanceof Error ? error.message : String(error);
    }
    check(pattern.test(message), `expected error matching ${pattern}, got ${message}`);
}
check(generation_1.PRODUCTION_CLUSTER_LIBRARY.length === 8, "expected eight production templates");
check(new Set(generation_1.PRODUCTION_CLUSTER_LIBRARY.map((t) => t.id)).size === 8, "template ids must be unique");
check(new Set(generation_1.PRODUCTION_CLUSTER_LIBRARY.map((t) => t.canonicalId)).size === 8, "canonical ids must be unique");
for (const template of generation_1.PRODUCTION_CLUSTER_LIBRARY) {
    const result = (0, generation_1.validateClusterTemplate)(template);
    check(result.valid, `${template.id}: ${result.errors.join("; ")}`);
    check(result.metrics.intersectionCount >= 2, `${template.id} needs multiple intersections`);
    check(template.ports.length > 0, `${template.id} needs ports`);
    check((0, generation_1.renderClusterAscii)(template).includes("□"), `${template.id} preview must contain numbers`);
    const signature = (0, generation_1.canonicalClusterSignature)(template);
    check(signature.length > 20, `${template.id} signature must be populated`);
    for (const transform of template.allowedTransforms) {
        const transformed = (0, generation_1.transformClusterTemplate)(template, transform);
        const transformedResult = (0, generation_1.validateClusterTemplate)(transformed);
        check(transformedResult.valid, `${template.id}/${transform}: ${transformedResult.errors.join("; ")}`);
        check((0, generation_1.canonicalClusterSignature)(transformed) === signature, `${template.id}/${transform} canonical signature changed`);
    }
}
check((0, generation_1.getClusterTemplate)("rectangle-four").id === "rectangle-four", "registry lookup failed");
checkThrows(() => (0, generation_1.getClusterTemplate)("missing"), /Unknown cluster template/);
check((0, generation_1.listClusterTemplatesForDifficulty)("easy").length >= 3, "easy library too small");
check((0, generation_1.listClusterTemplatesForDifficulty)("expert").length >= 3, "expert library too small");
const invalid = {
    ...(0, generation_1.getClusterTemplate)("t-three"),
    cells: (0, generation_1.getClusterTemplate)("t-three").cells.slice(1),
};
check(!(0, generation_1.validateClusterTemplate)(invalid).valid, "invalid template must be rejected");
console.log(`Production cluster library: ${assertions}/${assertions} assertions passed.`);
