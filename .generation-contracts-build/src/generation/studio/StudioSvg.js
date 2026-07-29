"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderCandidateSvg = renderCandidateSvg;
function escape(value) {
    return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
function renderCandidateSvg(inspection) {
    const candidate = inspection.candidate;
    if (!candidate)
        throw new Error("Cannot render a candidate that was not generated.");
    const plan = candidate.composition;
    const unit = 42;
    const margin = 28;
    const width = Math.max(1, plan.columns) * unit + margin * 2;
    const height = Math.max(1, plan.rows) * unit + margin * 2 + 46;
    const given = new Set(candidate.clues.givenCellIds);
    const values = candidate.fill.values;
    const operators = candidate.fill.operators;
    const cells = plan.occupiedCells.map((cell) => {
        const x = margin + cell.position.col * unit;
        const y = margin + 34 + cell.position.row * unit;
        let label = "";
        if (cell.kind === "number") {
            label = given.has(cell.cellId) ? String(values[cell.cellId] ?? "") : "·";
        }
        else if (cell.kind === "equals") {
            label = "=";
        }
        else {
            const equationId = Object.keys(operators).find((id) => id.includes(cell.cellId.split(":").slice(0, 2).join(":")));
            label = equationId ? String(operators[equationId] ?? "?") : "?";
        }
        const rect = cell.kind === "number"
            ? `<rect x="${x}" y="${y}" width="34" height="34" rx="7" fill="white" stroke="#222" stroke-width="2"/>`
            : "";
        return `${rect}<text x="${x + 17}" y="${y + 23}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="17">${escape(label)}</text>`;
    }).join("");
    return [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
        `<rect width="100%" height="100%" fill="#f5f5f5"/>`,
        `<text x="${margin}" y="25" font-family="system-ui,sans-serif" font-size="16" font-weight="700">${escape(candidate.id)}</text>`,
        cells,
        `</svg>`,
    ].join("");
}
