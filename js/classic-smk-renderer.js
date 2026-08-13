import { getTechnology, loadCatalog } from "./catalog.js";

const root = document.querySelector("#classic-root");
const status = document.querySelector("#status-message");
const SECTION_TITLES = [
  "균주 정보",
  "특허 정보",
  "실험 정보",
  "관련 데이터",
  "기술우위성 및 고도화 필요사항",
  "적용제품 시나리오",
  "기술활용 절차",
  "연구자 보유 균주 및 특허",
];
const PROTECTED_TOKEN = /(Pseudomonas sp\. JBR1|Pseudomonas korensis|Carex pumila|KCTC\s?\d+(?:BP|P)|\d+(?:,\d{3})?(?:\.\d+)?\s?(?:mM|mg\/mL|kU|CFU)|\d+(?:\.\d+)?%\s?NaCl|Na⁺\/K⁺|K⁺\/Na⁺|16S rRNA sequencing|GFP tagging|Plant Growth-Promoting|Abiotic stress)/g;

function element(tag, className = "", value) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value !== undefined) appendProtectedText(node, String(value));
  return node;
}

function appendProtectedText(node, value) {
  let start = 0;
  for (const match of value.matchAll(PROTECTED_TOKEN)) {
    if (match.index > start) node.append(document.createTextNode(value.slice(start, match.index)));
    const token = document.createElement("span");
    token.className = "nowrap-token";
    token.textContent = match[0];
    node.append(token);
    start = match.index + match[0].length;
  }
  if (start < value.length) node.append(document.createTextNode(value.slice(start)));
}

function list(values, className = "classic-bullets") {
  const ul = element("ul", className);
  values.forEach((value) => ul.append(element("li", "", value)));
  return ul;
}

function section(number, modifier) {
  const node = element("section", `classic-section classic-section--${modifier}`);
  node.dataset.sectionNumber = number;
  const header = element("header", "classic-section__heading");
  header.append(
    element("span", "classic-section__number", number),
    element("h2", "classic-section__title", SECTION_TITLES[Number(number) - 1]),
  );
  node.append(header);
  return node;
}

function table(headers, rows, label, variant = "") {
  const wrapper = element("div", "classic-table-scroll");
  const node = element("table", `classic-table${variant ? ` classic-table--${variant}` : ""}`);
  node.setAttribute("aria-label", label);
  if (headers?.length) {
    const thead = document.createElement("thead");
    const row = document.createElement("tr");
    headers.forEach((header) => row.append(element("th", "", header)));
    thead.append(row);
    node.append(thead);
  }
  const body = document.createElement("tbody");
  rows.forEach((values) => {
    const row = document.createElement("tr");
    values.forEach((value) => {
      const cell = document.createElement("td");
      if (Array.isArray(value)) cell.append(list(value, "classic-cell-list"));
      else appendProtectedText(cell, value || "-");
      row.append(cell);
    });
    body.append(row);
  });
  node.append(body);
  wrapper.append(node);
  return wrapper;
}

function definitionTable(entries, label) {
  return table(null, entries, label, "definition");
}

function renderHeader(technology) {
  const header = element("header", "classic-header");
  const top = element("div", "classic-header__top");
  const logo = document.createElement("img");
  logo.className = "classic-logo";
  logo.src = "./assets/kribb-ci/kribb-signature-ko-en.png";
  logo.alt = "한국생명공학연구원";
  top.append(
    logo,
    element("p", "classic-document-id", "전북연구개발특구 · 「전북 INNOTECH ROUNDMEET」 - 첨단바이오편"),
  );

  const tags = element("div", "classic-tags");
  Object.values(technology.classification).forEach((value, index) => {
    tags.append(element("span", index === 0 ? "classic-tag classic-tag--primary" : "classic-tag", value));
  });

  const hero = element("div", "classic-hero");
  const copy = element("div", "classic-hero__copy");
  copy.append(
    element("h1", "classic-hero__title", technology.title),
    element("p", "classic-hero__subtitle", technology.subtitle),
  );
  hero.append(copy, element("p", "classic-researcher", technology.researcherDisplay));
  header.append(top, tags, hero);
  return header;
}

function renderStrain(technology) {
  const node = section("01", "strain");
  node.append(definitionTable([
    ["수탁번호(기탁일자)", `${technology.strain.depositNumber} (${technology.strain.depositDate})`],
    ["미생물명", technology.strain.microorganismName],
    ["미생물종류", technology.strain.microorganismType],
    ["분류 특성", technology.strain.classificationFeature],
    ["분리원", technology.strain.origin],
    ["핵심 활성", technology.strain.coreFeature],
    ["적용 형태", technology.strain.applicationForms],
  ], "균주 정보"));
  return node;
}

function renderPatent(technology) {
  const node = section("02", "patent");
  node.append(definitionTable([
    ["특허명칭", technology.patent.title],
    ["등록번호", technology.patent.number],
    ["핵심 차별성", technology.patent.differentiators],
  ], "특허 정보"));
  return node;
}

function renderExperiments(technology) {
  const node = section("03", "experiments");
  const grid = element("div", "classic-experiment-grid");
  technology.experiments.forEach((experiment, index) => {
    const article = element("article", "classic-experiment");
    article.append(
      element("h3", "classic-experiment__title", `${index + 1}. ${experiment.title}`),
      list(experiment.details),
    );
    grid.append(article);
  });
  node.append(grid);
  return node;
}

function renderRelatedData(technology) {
  const node = section("04", "data");
  const grid = element("div", "classic-data-grid");
  technology.relatedData.forEach((item) => {
    const figure = element("figure", "classic-data-figure");
    const link = document.createElement("a");
    link.className = "classic-data-link";
    link.href = item.image;
    link.target = "_blank";
    link.rel = "noopener";
    link.setAttribute("aria-label", `${item.caption} 원본 이미지 열기`);
    const image = document.createElement("img");
    image.className = "classic-data-image";
    image.src = item.image;
    image.alt = item.caption;
    link.append(image);
    figure.append(element("figcaption", "", item.caption), link);
    grid.append(figure);
  });
  node.append(grid);
  return node;
}

function compareColumn(title, items, className) {
  const column = element("div", className);
  column.append(element("h3", "classic-compare__label", title));
  items.forEach((item, index) => {
    const entry = element("article", "classic-compare__item");
    entry.append(
      element("h4", "", `${index + 1}. ${item.title}`),
      list(item.details),
    );
    column.append(entry);
  });
  return column;
}

function renderAdvantages(technology) {
  const node = section("05", "advantages");
  const compare = element("div", "classic-compare");
  compare.append(
    compareColumn("기술우위성", technology.advantages, "classic-compare__column classic-compare__column--advantage"),
    compareColumn("고도화 필요사항", technology.developmentNeeds, "classic-compare__column classic-compare__column--need"),
  );
  node.append(compare);
  return node;
}

function renderProducts(technology) {
  const node = section("06", "products");
  node.append(table(
    ["우선순위", "적용 가능제품·서비스", "활용방향"],
    technology.products.map((product) => [product.priority, product.name, product.directions]),
    "적용제품 시나리오",
    "products",
  ));
  return node;
}

function renderProcess(technology) {
  const node = section("07", "process");
  const process = element("ol", "classic-process");
  technology.utilizationSteps.forEach((item) => {
    const step = element("li", "classic-process__step");
    step.append(
      element("span", "classic-process__number", item.step),
      element("h3", "classic-process__title", item.title),
      element("p", "classic-process__description", item.details.join(" · ")),
    );
    process.append(step);
  });
  node.append(process);
  return node;
}

function renderPortfolio(technology) {
  const node = section("08", "portfolio");
  node.append(table(
    ["기탁번호", "균주명", "특허명"],
    technology.portfolio.map((item) => [item.depositNumber, item.strainName, item.patentTitle]),
    "연구자 보유 균주 및 특허",
    "portfolio",
  ));
  return node;
}

function fitSheet() {
  const sheet = root.querySelector(".classic-sheet");
  if (!sheet || window.matchMedia("(max-width: 900px)").matches) {
    root.style.removeProperty("width");
    root.style.removeProperty("height");
    return;
  }
  const scale = Math.min((window.innerWidth - 32) / 1600, (window.innerHeight - 32) / 900, 1);
  root.style.width = `${1600 * scale}px`;
  root.style.height = `${900 * scale}px`;
  sheet.style.setProperty("--classic-scale", String(scale));
}

async function waitForImages(node) {
  const images = [...node.querySelectorAll("img")];
  await Promise.all(images.map((image) => {
    if (image.complete) return image.decode?.().catch(() => undefined);
    return new Promise((resolve) => {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", resolve, { once: true });
    });
  }));
}

async function renderTechnology(technology) {
  const sheet = element("article", "classic-sheet");
  const content = element("main", "classic-grid");
  content.append(
    renderStrain(technology),
    renderPatent(technology),
    renderExperiments(technology),
    renderRelatedData(technology),
    renderAdvantages(technology),
    renderProducts(technology),
    renderProcess(technology),
    renderPortfolio(technology),
  );
  const footer = element("footer", "classic-footer");
  footer.append(
    element("span", "", "다래전략사업화센터"),
    element("span", "", "Korea Research Institute of Bioscience and Biotechnology"),
  );
  sheet.append(renderHeader(technology), content, footer);
  root.replaceChildren(sheet);
  await document.fonts.ready;
  await waitForImages(sheet);
  fitSheet();
  sheet.dataset.ready = "true";
}

async function init() {
  try {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("tech");
    const catalog = await loadCatalog();
    const technology = getTechnology(catalog, id);
    if (!technology || technology.template !== "classic") throw new Error("표시할 기존형 기술소개서를 찾을 수 없습니다.");
    await renderTechnology(technology);
    document.title = `${technology.title} | KRIBB`;
    status.textContent = "";
    window.addEventListener("resize", fitSheet, { passive: true });
  } catch (error) {
    status.classList.add("is-error");
    status.textContent = error instanceof Error ? error.message : "기술소개서를 표시하지 못했습니다.";
  }
}

init();
