function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

export function initSidebar({ sections, root }) {
  root.replaceChildren();
  root.dataset.expanded = "false";

  const toggle = createElement("button", "sidebar-toggle");
  toggle.type = "button";
  toggle.setAttribute("aria-label", "목차 펼치기");
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", "sidebar-panel");
  toggle.append(createElement("span", "sidebar-toggle__icon", "☰"), createElement("span", "sidebar-toggle__label", "목차"));

  const panel = createElement("div", "sidebar-panel");
  panel.id = "sidebar-panel";
  panel.append(createElement("p", "sidebar-panel__kicker", "CONTENTS"));
  const list = createElement("ol", "sidebar-list");
  const progress = createElement("span", "sidebar-progress");
  progress.style.setProperty("--progress", "0%");

  const links = sections.map((section, index) => {
    const item = createElement("li", "sidebar-item");
    const link = createElement("a", "sidebar-link");
    link.href = `#${section.id}`;
    link.append(
      createElement("span", "sidebar-link__number", String(index + 1).padStart(2, "0")),
      createElement("span", "sidebar-link__label", SECTION_LABELS[index]),
    );
    link.addEventListener("click", () => setExpanded(false));
    item.append(link);
    list.append(item);
    return link;
  });
  panel.append(progress, list);
  root.append(toggle, panel);

  const edgeButton = createElement("button", "sidebar-edge-tab");
  edgeButton.type = "button";
  edgeButton.setAttribute("aria-label", "목차 열기");
  edgeButton.setAttribute("aria-expanded", "false");
  edgeButton.setAttribute("aria-controls", "sidebar-panel");
  edgeButton.append(createElement("span", "sidebar-edge-tab__number", "01"), createElement("span", "", "목차"));
  root.append(edgeButton);

  function setExpanded(expanded) {
    root.dataset.expanded = String(expanded);
    toggle.setAttribute("aria-expanded", String(expanded));
    edgeButton.setAttribute("aria-expanded", String(expanded));
    toggle.setAttribute("aria-label", expanded ? "목차 접기" : "목차 펼치기");
  }

  function setActive(index) {
    if (index < 0 || index >= links.length || root.dataset.activeIndex === String(index)) return;
    root.dataset.activeIndex = String(index);
    links.forEach((link, linkIndex) => {
      if (linkIndex === index) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
    progress.style.setProperty("--progress", `${sections.length === 1 ? 100 : (index / (sections.length - 1)) * 100}%`);
    edgeButton.querySelector(".sidebar-edge-tab__number").textContent = String(index + 1).padStart(2, "0");
  }

  toggle.addEventListener("click", () => setExpanded(root.dataset.expanded !== "true"));
  edgeButton.addEventListener("click", () => setExpanded(root.dataset.expanded !== "true"));

  const onKeydown = (event) => {
    if (event.key === "Escape" && root.dataset.expanded === "true") {
      setExpanded(false);
      (window.innerWidth < 820 ? edgeButton : toggle).focus();
    }
  };
  const onOutsideClick = (event) => {
    if (window.innerWidth < 820 && root.dataset.expanded === "true" && !root.contains(event.target)) setExpanded(false);
  };
  document.addEventListener("keydown", onKeydown);
  document.addEventListener("pointerdown", onOutsideClick);

  let scheduled = false;
  const updateActiveSection = () => {
    scheduled = false;
    const marker = window.innerHeight * 0.34;
    const distances = sections.map((section) => Math.abs(section.getBoundingClientRect().top - marker));
    const closest = distances.indexOf(Math.min(...distances));
    setActive(closest);
  };
  const onScroll = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(updateActiveSection);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  updateActiveSection();

  return {
    destroy() {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("keydown", onKeydown);
      document.removeEventListener("pointerdown", onOutsideClick);
      root.replaceChildren();
    },
  };
}

const SECTION_LABELS = [
  "균주 정보",
  "특허 정보",
  "실험 내용",
  "관련 데이터",
  "적용제품",
  "핵심요소",
  "활용 절차",
  "보유 균주·특허",
];
