export function publicSourceUrl(clinicId: string, sourceUrl: string): string {
  if (sourceUrl.includes("/api/analysis-data") || sourceUrl.includes("analysis-data?")) {
    const m = clinicId.match(/^kdl-(.+)$/);
    if (m) return `https://www.kdlolymp.kz/pricelist/${m[1]}`;
  }

  if (clinicId.startsWith("doq-")) {
    if (sourceUrl.includes("/doctors/")) return sourceUrl;
    const doctorSlug = sourceUrl.match(/\/clinics\/[^/]+\/([^/?#]+)/)?.[1];
    if (doctorSlug) return `https://doq.kz/doctors/${doctorSlug}`;
    return "https://doq.kz/";
  }

  const invitro = clinicId.match(/^invitro-(.+)$/);
  if (invitro) return `https://invitro.kz/analizes/for-doctors/${invitro[1]}/`;

  const helix = clinicId.match(/^helix-(.+)$/);
  if (helix) return `https://helix.kz/`;

  const gemotest = clinicId.match(/^gemotest-(.+)$/);
  if (gemotest) return `https://gemotest.kz/${gemotest[1]}/catalog/`;

  if (sourceUrl.startsWith("http") && !sourceUrl.includes("/api/")) {
    return sourceUrl;
  }

  return sourceUrl.startsWith("http") ? sourceUrl : "";
}
