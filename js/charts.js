const SVG_NS = "http://www.w3.org/2000/svg";

function svgNode(tag, attributes = {}, content = "") {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  if (content !== "") node.textContent = content;
  return node;
}

function compactNumber(value) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}M`;
  return Number.isInteger(value) ? String(value) : String(value);
}

function constrainTextWidth(text, maxWidth) {
  if (!Number.isFinite(maxWidth) || maxWidth <= 0) return;
  text.dataset.maxWidth = String(maxWidth);
}

export function fitChartText(root = document) {
  root.querySelectorAll("svg [data-max-width]").forEach((text) => {
    text.removeAttribute("textLength");
    text.removeAttribute("lengthAdjust");
    const maxWidth = Number(text.dataset.maxWidth);
    if (!Number.isFinite(maxWidth) || text.getComputedTextLength() <= maxWidth) return;
    text.setAttribute("textLength", String(maxWidth));
    text.setAttribute("lengthAdjust", "spacingAndGlyphs");
  });
}

function appendChartLabel(group, x, y, label) {
  const text = svgNode("text", {
    x,
    y,
    class: "chart-label",
    "text-anchor": "middle",
  });
  const lines = String(label).split("\n");
  if (lines.length === 1) {
    text.textContent = label;
    group.append(text);
    return;
  }
  lines.forEach((line, index) => {
    text.append(svgNode("tspan", { x, dy: index === 0 ? "0" : "1.05em" }, line));
  });
  group.append(text);
}

export function renderChart(chart) {
  if (!Array.isArray(chart.labels) || chart.labels.length !== chart.values.length) {
    throw new Error(`${chart.id}: 차트 라벨과 값의 개수가 다릅니다.`);
  }

  const svg = svgNode("svg", {
    viewBox: "0 0 640 360",
    role: "img",
    "aria-labelledby": `${chart.id}-title ${chart.id}-desc`,
  });
  svg.append(
    svgNode("title", { id: `${chart.id}-title` }, chart.title),
    svgNode(
      "desc",
      { id: `${chart.id}-desc` },
      `${chart.labels.map((label, index) => `${label} ${chart.values[index]} ${chart.unit}`).join(", ")}. ${chart.sourceFigure}`,
    ),
  );

  const defs = svgNode("defs");
  const pattern = svgNode("pattern", {
    id: `${chart.id}-hatch`,
    width: "8",
    height: "8",
    patternUnits: "userSpaceOnUse",
    patternTransform: "rotate(45)",
  });
  pattern.append(
    svgNode("rect", { width: "8", height: "8", fill: "#35a9df" }),
    svgNode("line", { x1: "0", y1: "0", x2: "0", y2: "8", stroke: "#ffffff", "stroke-width": "2", opacity: ".42" }),
  );
  defs.append(pattern);
  svg.append(defs);

  const left = 54;
  const top = 96;
  const plotHeight = 137;
  const plotWidth = 540;
  const maxValue = Math.max(...chart.values, 1);
  const slot = plotWidth / chart.values.length;
  const barWidth = Math.min(96, slot * 0.62);

  svg.append(
    svgNode("line", { x1: left, y1: top + plotHeight, x2: left + plotWidth, y2: top + plotHeight, class: "chart-axis" }),
    svgNode("text", { x: left, y: 30, class: "chart-unit" }, chart.unit),
  );

  chart.values.forEach((value, index) => {
    const height = (value / maxValue) * plotHeight;
    const x = left + slot * index + (slot - barWidth) / 2;
    const y = top + plotHeight - height;
    const group = svgNode("g", { class: "chart-bar-group" });
    const bar = svgNode("rect", {
      x,
      y,
      width: barWidth,
      height,
      rx: "7",
      class: index === 1 ? "chart-bar chart-bar--accent" : "chart-bar",
    });
    if (index % 2) bar.setAttribute("fill", `url(#${chart.id}-hatch)`);
    const display = chart.displayValues?.[index] ?? compactNumber(value);
    const valueLabel = svgNode(
      "text",
      {
        x: x + barWidth / 2,
        y: Math.max(top - 10, y - 12),
        class: "chart-value",
        "text-anchor": "middle",
      },
      display,
    );
    group.append(bar, valueLabel);
    appendChartLabel(group, x + barWidth / 2, top + plotHeight + 30, chart.labels[index]);
    svg.append(group);
    constrainTextWidth(valueLabel, Math.max(1, slot - 16));
    const categoryLabel = group.querySelector(".chart-label");
    if (categoryLabel) constrainTextWidth(categoryLabel, Math.max(1, slot - 12));
  });

  const source = svgNode("text", { x: left, y: 332, class: "chart-source" }, `출처: ${chart.sourceFigure}`);
  svg.append(source);
  constrainTextWidth(source, plotWidth);
  return svg;
}
