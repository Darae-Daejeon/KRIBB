import { getPublicTechnologies, loadCatalog } from "./catalog.js";

const list = document.querySelector("#technology-list");
const status = document.querySelector("#status-message");

function text(tag, value, className) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = value;
  return element;
}

function technologyHref(technology) {
  const page = technology.template === "classic" ? "classic-smk.html" : "smk.html";
  return `./${page}?tech=${encodeURIComponent(technology.id)}`;
}

function renderTable(technologies) {
  const wrapper = document.createElement("div");
  wrapper.className = "technology-table-scroll";
  wrapper.tabIndex = 0;
  wrapper.setAttribute("aria-label", "기술 목록 가로 스크롤 영역");

  const table = document.createElement("table");
  table.className = "technology-table";
  table.setAttribute("aria-label", "KRIBB 균주 기술 목록");

  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  ["특허명", "출원번호", "기탁번호", "균주명", "보러가기"].forEach((label) => {
    headRow.append(text("th", label));
  });
  head.append(headRow);

  const body = document.createElement("tbody");
  technologies.forEach((technology) => {
    const row = document.createElement("tr");
    row.dataset.technologyId = technology.id;
    row.append(
      text("td", technology.patent.title, "technology-table__patent"),
      text("td", technology.patent.applicationNumber || technology.patent.number || "-", "technology-table__number"),
      text("td", technology.strain.depositNumber || "-", "technology-table__number"),
      text("td", technology.strain.microorganismName || "-", "technology-table__strain"),
    );

    const action = document.createElement("td");
    action.className = "technology-table__action";
    const link = document.createElement("a");
    link.className = "technology-table__link";
    link.href = technologyHref(technology);
    link.textContent = "보러 가기";
    link.setAttribute("aria-label", `${technology.title} 소개서 보러 가기`);
    action.append(link);
    row.append(action);
    body.append(row);
  });

  table.append(head, body);
  wrapper.append(table);
  return wrapper;
}

async function init() {
  try {
    const catalog = await loadCatalog();
    const technologies = getPublicTechnologies(catalog);
    list.replaceChildren(renderTable(technologies));
    status.textContent = technologies.length ? "" : "현재 공개된 기술이 없습니다.";
  } catch (error) {
    status.classList.add("is-error");
    status.textContent = `기술 정보를 불러오지 못했습니다. ${error.message}`;
  }
}

init();
