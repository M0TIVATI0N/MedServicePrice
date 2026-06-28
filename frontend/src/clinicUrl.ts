export function publicSourceUrl(clinicId: string, sourceUrl: string): string {
  if (sourceUrl.startsWith("http") && !sourceUrl.includes("/api/")) {
    if (clinicId.startsWith("invitro-") && sourceUrl.includes("/offices/")) {
      return sourceUrl;
    }
    if (clinicId.startsWith("helix-") && sourceUrl.includes("helix.")) {
      return sourceUrl;
    }
    if (clinicId.startsWith("kdl-") && sourceUrl.includes("/cabinets/")) {
      return sourceUrl;
    }
    if (clinicId.startsWith("doq-") && sourceUrl.includes("/clinics/")) {
      return sourceUrl;
    }
    if (!clinicId.startsWith("invitro-") && !clinicId.startsWith("helix-")) {
      return sourceUrl;
    }
  }

  if (sourceUrl.includes("/api/analysis-data") || sourceUrl.includes("analysis-data?")) {
    const m = clinicId.match(/^kdl-([^-]+)/);
    if (m) return `https://www.kdlolymp.kz/pricelist/${m[1]}`;
  }

  const kdl = clinicId.match(/^kdl-([^-]+)/);
  if (kdl) {
    return `https://www.kdlolymp.kz/cabinets/${kdl[1]}`;
  }

  if (clinicId.startsWith("doq-")) {
    if (sourceUrl.includes("/clinics/")) return sourceUrl;
    if (sourceUrl.includes("/doctors/")) return "https://doq.kz/";
    return sourceUrl.startsWith("http") ? sourceUrl : "https://doq.kz/";
  }

  const invitro = clinicId.match(/^invitro-([^-]+)/);
  if (invitro) return `https://invitro.kz/offices/${invitro[1]}/`;

  const helix = clinicId.match(/^helix-(.+)$/);
  if (helix) return `https://helix.ru/${helix[1]}`;

  const gemotest = clinicId.match(/^gemotest-(.+)$/);
  if (gemotest) return `https://gemotest.kz/${gemotest[1]}/catalog/`;

  return sourceUrl.startsWith("http") ? sourceUrl : "";
}
