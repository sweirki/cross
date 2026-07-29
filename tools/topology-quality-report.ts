declare const require: (id: string) => {
  mkdirSync(path: string, options?: { recursive?: boolean }): void;
  writeFileSync(path: string, data: string, encoding: string): void;
};
declare const process: {
  readonly argv: readonly string[];
  readonly cwd: () => string;
  exitCode?: number;
};

import {
  generateTopologySkeleton,
  materializeTopologySkeleton,
} from "../src/game/board";
import {
  createTopologyBatchReport,
  renderTopologyAscii,
  renderTopologySvg,
  serializeTopologyBatchReport,
} from "../src/game/topology";

const fs = require("node:fs");
const path = require("node:path") as unknown as {
  resolve(...parts: string[]): string;
  join(...parts: string[]): string;
};

interface Options {
  count: number;
  profile: "classic" | "organic";
  equationCount: number;
  width: number;
  height: number;
  seed: number;
  output: string;
  previews: number;
}

function integer(value: string | undefined, name: string, minimum: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum) {
    throw new Error(`${name} must be an integer of at least ${minimum}.`);
  }
  return parsed;
}

function parseOptions(arguments_: readonly string[]): Options {
  const values = new Map<string, string>();
  for (let index = 0; index < arguments_.length; index += 2) {
    const key = arguments_[index];
    const value = arguments_[index + 1];
    if (key === undefined || !key.startsWith("--") || value === undefined) {
      throw new Error(`Expected --name value arguments; received ${arguments_.join(" ")}.`);
    }
    values.set(key.slice(2), value);
  }

  const profile = values.get("profile") ?? "organic";
  if (profile !== "classic" && profile !== "organic") {
    throw new Error("profile must be classic or organic.");
  }

  return {
    count: integer(values.get("count") ?? "250", "count", 1),
    profile,
    equationCount: integer(
      values.get("equations") ?? "6",
      "equations",
      2,
    ),
    width: integer(values.get("width") ?? "13", "width", 5),
    height: integer(values.get("height") ?? "13", "height", 5),
    seed: integer(values.get("seed") ?? "100000", "seed", 0),
    output: values.get("output") ?? "topology-quality-report",
    previews: integer(values.get("previews") ?? "12", "previews", 0),
  };
}

function main(): void {
  const options = parseOptions(process.argv.slice(2));
  const output = path.resolve(process.cwd(), options.output);
  fs.mkdirSync(output, { recursive: true });

  const samples = Array.from({ length: options.count }, (_, index) => {
    const seed = options.seed + index;
    const topology = materializeTopologySkeleton(
      generateTopologySkeleton({
        seed,
        profile: options.profile,
        equationCount: options.equationCount,
        width: options.width,
        height: options.height,
      }),
      (_equation, operatorIndex) =>
        (["add", "subtract", "multiply", "divide"] as const)[
          operatorIndex % 4
        ]!,
    );
    return {
      seed,
      profile: options.profile,
      topology,
    };
  });

  const report = createTopologyBatchReport(samples);
  fs.writeFileSync(
    path.join(output, "report.json"),
    `${serializeTopologyBatchReport(report, true)}\n`,
    "utf8",
  );

  const ranked = [...report.samples].sort(
    (left, right) =>
      right.score.total - left.score.total || left.seed - right.seed,
  );
  const previewCount = Math.min(options.previews, ranked.length);
  const previews: string[] = [];

  for (let index = 0; index < previewCount; index += 1) {
    const rankedSample = ranked[index]!;
    const source = samples.find((sample) => sample.seed === rankedSample.seed)!;
    const name = `${String(index + 1).padStart(2, "0")}-seed-${rankedSample.seed}`;
    previews.push(
      `# ${name} archetype=${rankedSample.archetype ?? "classic"} score=${rankedSample.score.total} grade=${rankedSample.score.grade}\n` +
        renderTopologyAscii(source.topology),
    );
    fs.writeFileSync(
      path.join(output, `${name}.svg`),
      `${renderTopologySvg(source.topology)}\n`,
      "utf8",
    );
  }

  fs.writeFileSync(
    path.join(output, "previews.txt"),
    `${previews.join("\n\n")}\n`,
    "utf8",
  );

  console.log(
    `Analyzed ${report.summary.sampleCount} ${options.profile} topologies. ` +
      `Average=${report.summary.averageScore}, ` +
      `minimum=${report.summary.minimumScore}, ` +
      `maximum=${report.summary.maximumScore}, ` +
      `standardDeviation=${report.summary.scoreStandardDeviation}, ` +
      `uniqueSignatures=${report.summary.uniqueMetricSignatures}.`,
  );
  console.log(`Report written to ${output}.`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
