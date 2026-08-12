function element(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

const PRINT_EVENT_TITLE = "InnoTech RoundMeet - 첨단바이오 : 한국생명공학연구원 균주 기술설명회";
const COMPANY_NAME = "다래전략사업화센터";
const PRINT_PAGE_GROUPS = [
  ["section-01", "section-02", "section-03", "section-04"],
  ["section-05", "section-06", "section-07", "section-08"],
];

function createPrintPage(index) {
  const page = element("article", "print-page");
  page.dataset.pageIndex = String(index);

  const header = element("header", "print-page__header");
  const logo = document.createElement("img");
  logo.src = index === 0
    ? "./assets/kribb-ci/kribb-signature-ko-en.png"
    : "./assets/kribb-ci/kribb-symbol-color.png";
  logo.alt = index === 0 ? "한국생명공학연구원" : "";
  const event = element("p", "print-page__event");
  event.textContent = PRINT_EVENT_TITLE;
  header.append(logo, event);

  const body = element("main", "print-page__body");
  const watermark = document.createElement("img");
  watermark.className = "print-page__watermark";
  watermark.src = "./assets/motifs/microbe-watermark.svg";
  watermark.alt = "";

  const footer = element("footer", "print-page__footer");
  const identity = element("span", "");
  identity.textContent = COMPANY_NAME;
  const number = element("span", "");
  number.textContent = String(index + 1).padStart(2, "0");
  footer.append(identity, number);
  page.append(header, body, watermark, footer);
  return { element: page, body, index };
}

export function composePrintPages({ sourceRoot, printRoot, technologyId }) {
  printRoot.replaceChildren();
  printRoot.classList.add("is-measuring");
  try {
    const placements = [];
    const sourceSections = [...sourceRoot.querySelectorAll(".smk-section")];
    const sourceSectionIds = sourceSections.map(section => section.id);
    const idCounts = sourceSectionIds.reduce((counts, id) => {
      counts.set(id, (counts.get(id) || 0) + 1);
      return counts;
    }, new Map());
    const sectionById = new Map(sourceSections.map(section => [section.id, section]));
    const expectedIds = PRINT_PAGE_GROUPS.flat();
    const missingIds = expectedIds.filter(id => !sectionById.has(id));
    const unexpectedIds = [...new Set(sourceSectionIds.filter(id => !expectedIds.includes(id)))];
    const duplicateIds = [...idCounts]
      .filter(([, count]) => count > 1)
      .map(([id]) => id);

    if (missingIds.length || unexpectedIds.length || duplicateIds.length) {
      throw new Error(
        `${technologyId || "SMK"} 인쇄 섹션 구성이 올바르지 않습니다. `
        + `누락: ${missingIds.join(", ") || "없음"}; `
        + `예상 외: ${unexpectedIds.join(", ") || "없음"}; `
        + `중복: ${duplicateIds.join(", ") || "없음"}`
      );
    }

    const sourceHeroes = sourceRoot.querySelectorAll(".smk-hero");
    if (sourceHeroes.length !== 1) {
      throw new Error(
        `${technologyId || "SMK"} 인쇄 표지가 정확히 1개여야 합니다. `
        + `현재 ${sourceHeroes.length}개입니다.`
      );
    }

    const pages = PRINT_PAGE_GROUPS.map((_, index) => createPrintPage(index));
    printRoot.append(...pages.map(page => page.element));

    const hero = sourceHeroes[0].cloneNode(true);
    hero.classList.add("print-cover");
    pages[0].body.append(hero);

    PRINT_PAGE_GROUPS.forEach((sectionIds, pageIndex) => {
      const page = pages[pageIndex];
      sectionIds.forEach(sectionId => {
        const clone = sectionById.get(sectionId).cloneNode(true);
        clone.classList.add("print-section");
        clone.dataset.sectionId = sectionId;
        clone.removeAttribute("id");
        page.body.append(clone);
        placements.push({ sectionId, pageIndex });
      });

      if (page.body.scrollHeight > page.body.clientHeight + 1) {
        const overflow = page.body.scrollHeight - page.body.clientHeight;
        throw new Error(
          `${technologyId || "SMK"} 인쇄 ${pageIndex + 1}페이지 `
          + `(${sectionIds.join(", ")})가 A4 본문을 ${overflow}px 초과합니다.`
        );
      }
    });

    return { pageCount: pages.length, placements };
  } catch (error) {
    printRoot.replaceChildren();
    throw error;
  } finally {
    printRoot.classList.remove("is-measuring");
  }
}

async function waitForImages(root) {
  const images = [...root.querySelectorAll("img")];
  await Promise.all(images.map((image) => {
    if (image.complete) return image.decode?.().catch(() => undefined);
    return new Promise((resolve) => {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", resolve, { once: true });
    });
  }));
}

export async function preparePrintLayout(options) {
  if (document.fonts?.ready) await document.fonts.ready;
  await waitForImages(options.sourceRoot);
  return composePrintPages(options);
}
