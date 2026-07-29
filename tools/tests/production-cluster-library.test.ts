import {
  PRODUCTION_CLUSTER_LIBRARY,
  canonicalClusterSignature,
  getClusterTemplate,
  listClusterTemplatesForDifficulty,
  renderClusterAscii,
  transformClusterTemplate,
  validateClusterTemplate,
} from "../../src/generation";

let assertions = 0;
function check(condition: unknown, message: string): asserts condition {
  assertions += 1;
  if (!condition) throw new Error(message);
}

function checkThrows(action: () => void, pattern: RegExp): void {
  let message = "";
  try { action(); } catch (error) { message = error instanceof Error ? error.message : String(error); }
  check(pattern.test(message), `expected error matching ${pattern}, got ${message}`);
}

check(PRODUCTION_CLUSTER_LIBRARY.length === 8, "expected eight production templates");
check(new Set(PRODUCTION_CLUSTER_LIBRARY.map((t) => t.id)).size === 8, "template ids must be unique");
check(new Set(PRODUCTION_CLUSTER_LIBRARY.map((t) => t.canonicalId)).size === 8, "canonical ids must be unique");

for (const template of PRODUCTION_CLUSTER_LIBRARY) {
  const result = validateClusterTemplate(template);
  check(result.valid, `${template.id}: ${result.errors.join("; ")}`);
  check(result.metrics.intersectionCount >= 2, `${template.id} needs multiple intersections`);
  check(template.ports.length > 0, `${template.id} needs ports`);
  check(renderClusterAscii(template).includes("□"), `${template.id} preview must contain numbers`);
  const signature = canonicalClusterSignature(template);
  check(signature.length > 20, `${template.id} signature must be populated`);

  for (const transform of template.allowedTransforms) {
    const transformed = transformClusterTemplate(template, transform);
    const transformedResult = validateClusterTemplate(transformed);
    check(transformedResult.valid, `${template.id}/${transform}: ${transformedResult.errors.join("; ")}`);
    check(
      canonicalClusterSignature(transformed) === signature,
      `${template.id}/${transform} canonical signature changed`,
    );
  }
}

check(getClusterTemplate("rectangle-four").id === "rectangle-four", "registry lookup failed");
checkThrows(() => getClusterTemplate("missing"), /Unknown cluster template/);
check(listClusterTemplatesForDifficulty("easy").length >= 3, "easy library too small");
check(listClusterTemplatesForDifficulty("expert").length >= 3, "expert library too small");

const invalid = {
  ...getClusterTemplate("t-three"),
  cells: getClusterTemplate("t-three").cells.slice(1),
};
check(!validateClusterTemplate(invalid).valid, "invalid template must be rejected");

console.log(`Production cluster library: ${assertions}/${assertions} assertions passed.`);
