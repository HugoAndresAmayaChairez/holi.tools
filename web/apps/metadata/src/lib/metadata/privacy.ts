import type { FileMetadata } from "./types";

export type PrivacySeverity = "high" | "medium" | "low";

export type PrivacyFinding = {
  id: string;
  severity: PrivacySeverity;
  title: string;
  detail: string;
};

const hasText = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0;

export function getPrivacyFindings(metadata: FileMetadata): PrivacyFinding[] {
  const findings: PrivacyFinding[] = [];
  const common = metadata.common ?? {};
  const tags = metadata.tags ?? {};

  if (metadata.exif?.gps) {
    findings.push({
      id: "gps",
      severity: "high",
      title: "GPS detectado",
      detail:
        "El archivo incluye coordenadas que pueden revelar donde fue creado o capturado.",
    });
  }

  if (hasText(common.author) || hasText(tags["docx:creator"]) || hasText(tags["png:Author"])) {
    findings.push({
      id: "author",
      severity: "medium",
      title: "Autor o creador",
      detail:
        "La metadata puede identificar a una persona, cuenta o dispositivo de origen.",
    });
  }

  if (hasText(common.created) || hasText(common.modified) || hasText(metadata.exif?.datetimeOriginal)) {
    findings.push({
      id: "timestamps",
      severity: "medium",
      title: "Fechas internas",
      detail:
        "Las fechas de creacion, modificacion o captura pueden revelar flujo de trabajo y zona temporal.",
    });
  }

  if (hasText(common.software) || hasText(tags["docx:Application"]) || hasText(tags["png:Software"])) {
    findings.push({
      id: "software",
      severity: "low",
      title: "Software de origen",
      detail:
        "El archivo expone herramientas usadas para editarlo o generarlo.",
    });
  }

  if (
    hasText(tags["docx:Company"]) ||
    hasText(tags["docx:Manager"]) ||
    hasText(tags["docx:Template"])
  ) {
    findings.push({
      id: "office-org",
      severity: "medium",
      title: "Datos organizacionales",
      detail:
        "El documento puede incluir empresa, manager, plantilla u otros rastros de oficina.",
    });
  }

  return findings;
}

export function getPrivacyScore(findings: PrivacyFinding[]) {
  if (findings.some((finding) => finding.severity === "high")) return "high";
  if (findings.some((finding) => finding.severity === "medium")) return "medium";
  if (findings.length > 0) return "low";
  return "clean";
}
