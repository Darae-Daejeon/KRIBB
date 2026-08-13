const assert = require("node:assert/strict");
const { chromium } = require("playwright");

const catalogUrl = process.env.KRIBB_CATALOG_URL || "http://127.0.0.1:61721/";

const expectedIds = [
  "park-1020220067778",
  "lee-p2025-033",
  "lee-p2025-033-template",
];

const expectedHeadings = [
  "균주 정보",
  "특허 정보",
  "실험 정보",
  "기술우위성 및 고도화 필요사항",
  "관련 데이터",
  "적용제품 시나리오",
  "기술활용 절차",
  "연구자 보유 균주 및 특허",
];

const layoutSelectors = [
  "#slide-header",
  "#content-grid",
  "#left-column",
  "#right-column",
];

(async () => {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const browser = await chromium.launch({ headless: true, executablePath });
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => {
    const location = message.location().url || "unknown";
    if (message.type() === "error" && !location.endsWith("/favicon.ico")) {
      errors.push(`console: ${message.text()} @ ${location}`);
    }
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("response", (response) => {
    if (response.status() >= 400) errors.push(`http ${response.status()}: ${response.url()}`);
  });

  await page.goto(catalogUrl, { waitUntil: "domcontentloaded", timeout: 10_000 });
  await page.waitForSelector(".technology-table tbody tr", { timeout: 10_000 });
  const rows = await page.locator(".technology-table tbody tr").count();
  assert.equal(rows, 3, "랜딩페이지는 기술 3개를 표시해야 한다");
  const ids = await page.locator(".technology-table tbody tr").evaluateAll((nodes) => nodes.map((node) => node.dataset.technologyId));
  assert.deepEqual(ids, expectedIds, "1·2번 순서를 유지하고 3번을 추가해야 한다");
  const hrefs = await page.locator(".technology-table__link").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")));
  assert.equal(hrefs[0], "./smk.html?tech=park-1020220067778");
  assert.equal(hrefs[1], "./classic-smk.html?tech=lee-p2025-033");
  assert.equal(hrefs[2], "./template-smk.html?tech=lee-p2025-033");
  for (const width of [1024, 1280, 1600]) {
    await page.setViewportSize({ width, height: 900 });
    const rowGeometry = await page.locator(".technology-table tbody tr").evaluateAll((rows) => rows.map((row) => {
      const strain = row.querySelector(".technology-table__strain").getBoundingClientRect();
      const action = row.querySelector(".technology-table__action").getBoundingClientRect();
      const link = row.querySelector(".technology-table__link").getBoundingClientRect();
      return {
        cellsSeparated: strain.right <= action.left + 0.5,
        linkInsideAction: link.left >= action.left - 0.5 && link.right <= action.right + 0.5,
      };
    }));
    assert.ok(rowGeometry.every((row) => row.cellsSeparated && row.linkInsideAction), `${width}px에서 균주명과 보러가기 버튼이 겹치면 안 된다`);
  }

  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto(`${catalogUrl}template-smk.html?tech=lee-p2025-033`, { waitUntil: "domcontentloaded", timeout: 10_000 });
  await page.waitForSelector("#smk-slide[data-ready]", { timeout: 10_000 });
  assert.equal(await page.locator("#smk-slide").getAttribute("data-ready"), "true", `3번 렌더링 실패: ${errors.join(" | ")}`);
  assert.equal(await page.locator(".smk-slide").count(), 1, "3번은 단일 16:9 장표여야 한다");
  const slideSize = await page.locator("#smk-slide").evaluate((node) => ({ width: node.offsetWidth, height: node.offsetHeight }));
  assert.deepEqual(slideSize, { width: 1600, height: 900 });

  const headings = await page.locator(".section-heading").evaluateAll((nodes) => nodes.map((node) => node.textContent.trim()));
  assert.deepEqual(headings, expectedHeadings, "2번의 8개 목차 제목을 그대로 사용해야 한다");
  assert.equal(await page.locator("#technology-title").textContent(), "염 스트레스 내성 Pseudomonas sp. JBR1 균주기반 농업 미생물 플랫폼");
  assert.equal(await page.locator("img[data-source='lee-p2025-033']").count(), 2, "2번의 PPT 이미지 2개를 사용해야 한다");
  assert.ok(!(await page.locator("body").innerText()).includes("{{"), "템플릿 자리표시자가 화면에 남으면 안 된다");

  const templateGeometry = await page.evaluate(() => {
    const content = document.querySelector("#content-grid");
    const contentStyle = getComputedStyle(content);
    return {
      heroHeight: document.querySelector("#hero-box").offsetHeight,
      contentHeight: content.offsetHeight,
      contentColumns: contentStyle.gridTemplateColumns,
      contentGap: contentStyle.columnGap,
      contentPaddingLeft: contentStyle.paddingLeft,
      contentPaddingRight: contentStyle.paddingRight,
      leftWidth: document.querySelector("#left-column").offsetWidth,
      rightWidth: document.querySelector("#right-column").offsetWidth,
    };
  });
  assert.deepEqual(templateGeometry, {
    heroHeight: 130,
    contentHeight: 716,
    contentColumns: "710px 710px",
    contentGap: "132px",
    contentPaddingLeft: "24px",
    contentPaddingRight: "24px",
    leftWidth: 710,
    rightWidth: 710,
  }, "기존 템플릿의 1600×900 핵심 배치를 그대로 유지해야 한다");
  const clipped = await page.evaluate((selectors) => {
    const slide = document.querySelector("#smk-slide").getBoundingClientRect();
    return selectors.filter((selector) => {
      const rect = document.querySelector(selector).getBoundingClientRect();
      return rect.left < slide.left - 0.5 || rect.top < slide.top - 0.5 || rect.right > slide.right + 0.5 || rect.bottom > slide.bottom + 0.5;
    });
  }, layoutSelectors);
  assert.deepEqual(clipped, [], "주요 영역이 장표 바깥으로 잘리면 안 된다");

  assert.deepEqual(errors, [], `브라우저 오류 발생: ${errors.join(" | ")}`);
  await browser.close();
  console.log("PASS: landing 3 rows, legacy template fidelity, Lee content, images, and clipping checks");
})().catch((error) => {
  console.error(`FAIL: ${error.stack || error.message}`);
  process.exit(1);
});
