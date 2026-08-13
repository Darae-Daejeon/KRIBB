export async function loadCatalog(url = "./data/technologies.json") {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`기술 데이터 로드 실패: HTTP ${response.status}`);
  }
  const catalog = await response.json();
  if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.technologies)) {
    throw new Error("지원하지 않는 기술 데이터 형식입니다.");
  }
  return catalog;
}

export function getPublicTechnologies(catalog) {
  return catalog.technologies.filter((item) => item.visibility === "public");
}

export function getPublicCatalogEntries(catalog) {
  const technologies = new Map(catalog.technologies.map((item) => [item.id, item]));
  if (!Array.isArray(catalog.catalogEntries)) return getPublicTechnologies(catalog);
  return catalog.catalogEntries
    .filter((entry) => entry.visibility === "public")
    .map((entry) => {
      const technology = technologies.get(entry.technologyId);
      if (!technology) return null;
      return { ...technology, id: entry.id, sourceTechnologyId: technology.id, template: entry.template };
    })
    .filter(Boolean);
}

export function getTechnology(catalog, id) {
  return catalog.technologies.find((item) => item.id === id) ?? null;
}
