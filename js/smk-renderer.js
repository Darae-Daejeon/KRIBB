import { getTechnology, loadCatalog } from "./catalog.js";
import { fitChartText, renderChart } from "./charts.js";
import { initSidebar } from "./sidebar.js";
import { composePrintPages, preparePrintLayout } from "./print-layout.js";

export const SECTION_TITLES = [
  "균주 정보",
  "특허 정보",
  "실험 내용",
  "관련 데이터",
  "기술(균주) 적용제품",
  "기술 핵심요소",
  "기술활용 절차",
  "연구자 보유 균주 및 특허",
];

const root = document.querySelector("#smk-root");
const status = document.querySelector("#status-message");

function renderStatus(message, { error = true, link = false } = {}) {
  status.replaceChildren();
  status.classList.toggle("is-error", error);
  status.append(document.createTextNode(message));
  if (link) {
    status.append(document.createTextNode(" "));
    const anchor = document.createElement("a");
    anchor.href = "./index.html";
    anchor.textContent = "기술 목록으로 이동";
    status.append(anchor);
  }
}

function node(tag, className, value) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (value !== undefined) element.textContent = value;
  return element;
}

function section(index) {
  const element = node("section", "smk-section");
  element.id = `section-${String(index + 1).padStart(2, "0")}`;
  element.dataset.sectionNumber = String(index + 1).padStart(2, "0");
  const header = node("header", "section-heading");
  header.append(
    node("span", "section-heading__number", element.dataset.sectionNumber),
    node("h2", "section-heading__title", SECTION_TITLES[index]),
  );
  element.append(header);
  return element;
}

function definitionTable(entries, label = "정보") {
  const table = node("table", "info-table");
  table.setAttribute("aria-label", label);
  const body = document.createElement("tbody");
  entries.forEach(([heading, value]) => {
    const row = document.createElement("tr");
    const valueClass = /(수탁번호|등록번호)/.test(heading) ? "info-table__value--nowrap" : "";
    row.append(
      node("th", "", heading),
      node("td", valueClass, Array.isArray(value) ? value.join(", ") : value || "-"),
    );
    body.append(row);
  });
  table.append(body);
  return table;
}

function dataTable(headers, rows, label, variant = "") {
  const wrapper = node("div", "table-scroll");
  const table = node("table", `data-table${variant ? ` data-table--${variant}` : ""}`);
  table.setAttribute("aria-label", label);
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  headers.forEach((header) => headRow.append(node("th", "", header)));
  head.append(headRow);
  const body = document.createElement("tbody");
  rows.forEach((values) => {
    const row = document.createElement("tr");
    values.forEach((value) => row.append(node("td", "", value || "-")));
    body.append(row);
  });
  table.append(head, body);
  wrapper.append(table);
  return wrapper;
}

function factRow(label, value) {
  const row = node("div", "fact-row");
  row.append(node("span", "fact-row__label", label), node("span", "fact-row__value", value));
  return row;
}

function renderHero(technology) {
  const hero = node("header", "smk-hero");
  const brand = node("div", "smk-hero__brand");
  const logo = document.createElement("img");
  logo.src = "./assets/kribb-ci/kribb-signature-ko-en.png";
  logo.alt = "한국생명공학연구원";
  brand.append(logo, node("span", "smk-hero__document-type", "전북연구개발특구"));

  const title = node("h1", "smk-hero__title");
  technology.titleLines.forEach((line, index) => {
    const lineElement = node("span", "smk-hero__title-line");
    const phrases = Array.isArray(line) ? line : [line];
    phrases.forEach((phrase, phraseIndex) => {
      lineElement.append(node("span", "smk-hero__title-phrase", phrase));
      if (phraseIndex < phrases.length - 1) {
        lineElement.append(document.createTextNode(" "));
      }
    });
    title.append(lineElement);
    if (index < technology.titleLines.length - 1) title.append(document.createTextNode(" "));
  });

  const copy = node("div", "smk-hero__copy");
  copy.append(
    node("p", "eyebrow", `${technology.organization} · ${technology.researcher} 연구자`),
    title,
    node("p", "smk-hero__summary", technology.summary),
  );

  const classification = node("dl", "classification-grid");
  for (const [label, value] of [
    ["대분류", technology.classification.major],
    ["중분류", technology.classification.middle],
    ["소분류", technology.classification.minor],
    ["확장유형", technology.classification.extension],
  ]) {
    if (!value) continue;
    const item = node("div", "classification-grid__item");
    item.append(node("dt", "", label), node("dd", "", value));
    classification.append(item);
  }
  hero.append(brand, copy, classification);
  return hero;
}

function renderTechnology(technology) {
  const fragment = document.createDocumentFragment();
  fragment.append(renderHero(technology));

  const sections = SECTION_TITLES.map((_, index) => section(index));
  sections[0].append(definitionTable([
    ["수탁번호(기탁일자)", `${technology.strain.depositNumber} (${technology.strain.depositDate})`],
    ["미생물명", technology.strain.microorganismName],
    ["미생물종류", technology.strain.microorganismType],
    ["균주 별칭", technology.strain.aliases],
    ["유래", technology.strain.origin],
    ["핵심 특성", technology.strain.coreFeature],
  ], "균주 정보"));

  sections[1].append(definitionTable([
    ["특허명칭", technology.patent.title],
    ["등록번호", technology.patent.number],
    ["핵심 차별성", technology.patent.differentiators],
  ], "특허 정보"));

  const experiments = node("div", "experiment-grid");
  technology.experiments.forEach((experiment, index) => {
    const card = node("article", "experiment-card");
    const heading = node("header", "compact-card-heading");
    heading.append(
      node("span", "card-index", String(index + 1).padStart(2, "0")),
      node("h3", "", experiment.title),
    );
    card.append(
      heading,
      factRow("방법", experiment.method),
      factRow("결과", experiment.result),
    );
    experiments.append(card);
  });
  sections[2].append(experiments);

  const charts = node("div", `chart-grid chart-grid--${technology.charts.length}`);
  technology.charts.forEach((chart) => {
    const figure = node("figure", "evidence-chart");
    figure.append(node("figcaption", "", chart.title), renderChart(chart));
    if (chart.valueStatus === "estimated-from-figure") {
      figure.append(node("p", "chart-note", "※ 도면 판독 기반 추정값"));
    }
    charts.append(figure);
  });
  sections[3].append(charts);

  sections[4].append(dataTable(
    ["적용제품·서비스", "적용 방향", "주요 수요처"],
    technology.products.map((item) => [item.name, item.application, item.customer]),
    "기술 적용제품",
    "products",
  ));

  const elements = node(
    "div",
    `core-grid core-grid--${technology.coreElements.length}`,
  );
  technology.coreElements.forEach((item, index) => {
    const card = node("article", "core-card");
    const heading = node("header", "compact-card-heading");
    heading.append(
      node("span", "core-card__number", String(index + 1).padStart(2, "0")),
      node("h3", "", item.title),
    );
    card.append(heading, node("p", "core-card__description", item.description));
    elements.append(card);
  });
  sections[5].append(elements);

  const process = node("ol", "process-list process-flow");
  technology.utilizationSteps.forEach((item) => {
    const step = node("li", "process-node");
    step.append(
      node("span", "process-node__circle", item.step),
      node("h3", "process-node__title", item.title),
      node("p", "process-node__description", item.description),
    );
    process.append(step);
  });
  sections[6].append(process);

  sections[7].append(dataTable(
    ["구분", "보유 균주 및 특허", "번호", "상태"],
    technology.portfolio.map((item) => [item.type, item.name, item.number, item.status]),
    "연구자 보유 균주 및 특허",
    "portfolio",
  ));

  sections.forEach((item) => fragment.append(item));
  root.replaceChildren(fragment);
  fitChartText(root);
}

async function init() {
  try {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("tech");
    if (!id) {
      renderStatus("표시할 기술을 선택해 주세요.", { link: true });
      return;
    }
    const catalog = await loadCatalog();
    const technology = getTechnology(catalog, id);
    if (!technology) {
      renderStatus("기술을 찾을 수 없습니다.", { link: true });
      return;
    }
    if (technology.visibility === "private" && params.get("preview") !== "1") {
      renderStatus("미공개 기술입니다. 미리보기 권한이 필요합니다.", { link: true });
      return;
    }
    renderTechnology(technology);
    await document.fonts.ready;
    fitChartText(root);
    initSidebar({
      sections: [...root.querySelectorAll(".smk-section")],
      root: document.querySelector("#screen-sidebar"),
    });
    const printOptions = {
      sourceRoot: root,
      printRoot: document.querySelector("#print-root"),
      technologyId: technology.id,
    };
    window.__KRIBB_PRINT_LAYOUT__ = await preparePrintLayout(printOptions);
    window.addEventListener("beforeprint", () => {
      window.__KRIBB_PRINT_LAYOUT__ = composePrintPages(printOptions);
    });
    document.title = `${technology.title} | KRIBB`;
    renderStatus("", { error: false });
  } catch (error) {
    const safeMessage = error instanceof Error ? error.message : "알 수 없는 오류";
    renderStatus(`기술소개서를 표시하지 못했습니다. ${safeMessage}`, { link: true });
  }
}

init();
