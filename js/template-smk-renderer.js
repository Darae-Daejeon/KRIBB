import { getTechnology, loadCatalog } from "./catalog.js";

const slide = document.querySelector("#smk-slide");
const designWidth = 1600;
const designHeight = 900;

function byId(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const node = byId(id);
  if (node) node.textContent = value ?? "-";
}

function replaceList(id, items) {
  const list = byId(id);
  if (!list) return;
  list.replaceChildren(...items.map((value) => {
    const item = document.createElement("li");
    item.textContent = value;
    return item;
  }));
}

function fitSlide() {
  const padding = 16;
  const scale = Math.min(
    (window.innerWidth - padding) / designWidth,
    (window.innerHeight - padding) / designHeight,
    1,
  );
  slide.style.setProperty("--slide-scale", String(Math.max(scale, 0.1)));
}

function setupLightbox(image) {
  const lightbox = byId("image-lightbox");
  const lightboxImage = byId("image-lightbox-image");
  const closeButton = byId("image-lightbox-close");
  if (!image || !lightbox || !lightboxImage || !closeButton) return;

  const open = () => {
    lightboxImage.src = image.currentSrc || image.src;
    lightboxImage.alt = image.alt;
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
  };
  const close = () => {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
  };
  image.tabIndex = 0;
  image.setAttribute("role", "button");
  image.addEventListener("click", open);
  image.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") open();
  });
  closeButton.addEventListener("click", close);
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) close();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
}

function renderClassification(technology) {
  const headers = ["수탁번호(기탁일자)", "미생물명", "미생물종류", "유래·핵심 특성"];
  ["major", "middle", "small", "detail"].forEach((key, index) => setText(`classification-header-${key}`, headers[index]));
  setText("classification-major", `${technology.strain.depositNumber} (${technology.strain.depositDate})`);
  setText("classification-middle", technology.strain.microorganismName);
  setText("classification-small", technology.strain.microorganismType);
  setText("classification-detail", "Carex pumila 내생세균 / 내염성·생장촉진·ROS 억제");
}

function renderPatent(technology) {
  replaceList("overview-list", [
    `특허명칭: ${technology.patent.title}`,
    `출원번호: ${technology.patent.applicationNumber}`,
    `핵심 차별성: ${technology.patent.differentiators[0]}`,
  ]);
  const keywordPanel = byId("overview-hashtag-container");
  const keywords = ["#내염성", "#식물생장촉진", "#산화스트레스억제", "#PGPB"];
  keywordPanel.replaceChildren(...keywords.map((value) => {
    const item = document.createElement("span");
    item.textContent = value;
    return item;
  }));
}

function renderExperiments(technology) {
  replaceList("tech-content-list", [
    "JBR1은 최대 10% NaCl 조건에서도 생육",
    "1,000 mM NaCl에서 IAA 합성, EPS·카탈라아제·ACC 탈아미노효소 활성 확인",
    "애기장대 싹 2.7배, 뿌리 3.4~5.1배 증가",
  ]);
  const image = byId("tech-representative-image");
  image.src = technology.relatedData[0].image;
  image.alt = technology.relatedData[0].caption;
  image.dataset.source = technology.id;
  setupLightbox(image);
}

function renderAdvantages(technology) {
  setText("comparison-as-is-title", "[ 기술우위성 ]");
  setText("comparison-to-be-title", "[ 고도화 필요사항 ]");
  replaceList("comparison-as-is-list", technology.advantages.slice(0, 2).map((item) => `${item.title}: ${item.details[0]}`));
  replaceList("comparison-to-be-list", technology.developmentNeeds.slice(0, 2).map((item) => `${item.title}: ${item.details[0]}`));
}

function renderRelatedData(technology) {
  replaceList("market-trend-list", technology.experiments[2].details.slice(1, 4));
  const canvas = byId("marketChart");
  const image = document.createElement("img");
  image.id = "marketChart";
  image.className = "market-chart-canvas";
  image.src = technology.relatedData[1].image;
  image.alt = technology.relatedData[1].caption;
  image.dataset.source = technology.id;
  image.style.width = "100%";
  image.style.height = "100%";
  image.style.objectFit = "contain";
  canvas.replaceWith(image);
  setText("market-chart-source", `<${technology.relatedData[1].caption}>`);
}

function renderProducts(technology) {
  replaceList("business-idea-list", technology.products.slice(0, 3).map((item) => item.name));
  setText("business-image-1", technology.products[3].name);
  setText("business-image-2", technology.products[4].name);
  byId("business-idea-box").style.display = "none";
}

function renderProcess(technology) {
  const scale = byId("maturity-scale");
  scale.dataset.level = "4";
  scale.style.gridTemplateColumns = "repeat(4, minmax(0, 1fr))";
  byId("maturity-marker").hidden = true;
  technology.utilizationSteps.forEach((step, index) => {
    setText(`maturity-number-${index + 1}`, step.step);
    const item = byId(`maturity-item-${index + 1}`);
    item.title = `${step.title}: ${step.details.join(" / ")}`;
  });
  for (let index = 5; index <= 9; index += 1) byId(`maturity-item-${index}`).style.display = "none";
  setText("maturity-note", technology.utilizationSteps.map((step) => `${step.step} ${step.title}`).join("  →  "));
}

function renderPortfolio(technology) {
  const table = byId("ip-table");
  const headRow = table.tHead.rows[0];
  const widths = ["6%", "16%", "29%", "49%"];
  headRow.replaceChildren(...["No", "기탁번호", "균주명", "특허명"].map((value, index) => {
    const cell = document.createElement("th");
    cell.textContent = value;
    cell.style.width = widths[index];
    return cell;
  }));
  const body = table.tBodies[0];
  body.replaceChildren(...technology.portfolio.map((item, index) => {
    const row = document.createElement("tr");
    [String(index + 1).padStart(2, "0"), item.depositNumber, item.strainName, item.patentTitle].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      cell.style.width = widths[row.children.length];
      row.append(cell);
    });
    return row;
  }));
}

async function render(technology) {
  setText("document-id", "전북연구개발특구 | 한국생명공학연구원");
  setText("tag-primary", technology.classification.major);
  setText("tag-secondary", technology.classification.middle);
  setText("technology-title", technology.title);
  setText("researcher-name", technology.researcher);
  setText("researcher-position", "박사");
  setText("researcher-affiliation", `${technology.organization} 생물자원센터`);

  setText("section-classification-title", "균주 정보");
  setText("section-overview-title", "특허 정보");
  setText("section-tech-content-title", "실험 정보");
  setText("section-limit-improvement-title", "기술우위성 및 고도화 필요사항");
  setText("section-market-trend-title", "관련 데이터");
  setText("section-business-idea-title", "적용제품 시나리오");
  setText("section-maturity-title", "기술활용 절차");
  setText("section-ip-portfolio-title", "연구자 보유 균주 및 특허");

  renderClassification(technology);
  renderPatent(technology);
  renderExperiments(technology);
  renderAdvantages(technology);
  renderRelatedData(technology);
  renderProducts(technology);
  renderProcess(technology);
  renderPortfolio(technology);

  document.title = `${technology.title} | KRIBB 기존형 SMK`;
  await document.fonts.ready;
  await Promise.all([...document.images].map((image) => image.decode?.().catch(() => undefined)));
  fitSlide();
  slide.dataset.ready = "true";
}

async function init() {
  const id = new URLSearchParams(window.location.search).get("tech");
  const catalog = await loadCatalog();
  const technology = getTechnology(catalog, id);
  if (!technology) throw new Error("표시할 기술 정보를 찾을 수 없습니다.");
  await render(technology);
  window.addEventListener("resize", fitSlide, { passive: true });
}

init().catch((error) => {
  console.error(error);
  slide.dataset.ready = "error";
});
