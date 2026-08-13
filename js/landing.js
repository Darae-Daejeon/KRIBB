import { getPublicTechnologies, loadCatalog } from "./catalog.js";

const list = document.querySelector("#technology-list");
const status = document.querySelector("#status-message");

function text(tag, value, className) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = value;
  return element;
}

function renderCard(technology, index) {
  const article = document.createElement("article");
  article.className = "technology-card";
  article.dataset.technologyId = technology.id;

  const top = document.createElement("div");
  top.className = "technology-card__top";
  top.append(
    text("span", String(index + 1).padStart(2, "0"), "technology-card__number"),
  );

  const body = document.createElement("div");
  body.className = "technology-card__body";
  body.append(
    text("p", technology.summary, "technology-card__summary"),
    text("h2", technology.title, "technology-card__title"),
  );

  const meta = document.createElement("dl");
  meta.className = "technology-card__meta";
  for (const [label, value] of [
    ["연구자", technology.researcher],
    ["수탁번호", technology.strain.depositNumber],
  ]) {
    meta.append(text("dt", label), text("dd", value));
  }

  const link = document.createElement("a");
  link.className = "technology-card__link";
  link.href = `./smk.html?tech=${encodeURIComponent(technology.id)}`;
  link.append(text("span", "기술 보러가기"), text("span", "↗", "technology-card__arrow"));
  link.setAttribute("aria-label", `${technology.title} 기술 보러가기`);

  body.append(meta, link);
  article.append(top, body);
  return article;
}

async function init() {
  try {
    const catalog = await loadCatalog();
    const technologies = getPublicTechnologies(catalog);
    const fragment = document.createDocumentFragment();
    technologies.forEach((technology, index) => fragment.append(renderCard(technology, index)));
    list.replaceChildren(fragment);
    status.textContent = technologies.length ? "" : "현재 공개된 기술이 없습니다.";
  } catch (error) {
    status.classList.add("is-error");
    status.textContent = `기술 정보를 불러오지 못했습니다. ${error.message}`;
  }
}

init();
