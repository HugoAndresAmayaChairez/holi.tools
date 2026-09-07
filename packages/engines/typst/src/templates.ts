import templateManifest from "./templates.v1.json" with { type: "json" };
import type { WorkspaceFile } from "./compiler.js";

export interface DocumentTemplate {
  v: 1;
  id: string;
  name: string;
  description: string;
  entrypoint: "main.typ";
  dataSchema: Record<string, unknown>;
  example: Record<string, unknown>;
  source: string;
}

export const documentTemplates =
  templateManifest as unknown as readonly DocumentTemplate[];

function validate(
  value: unknown,
  rule: Record<string, any>,
  path = "data"
): void {
  if (rule.type === "string") {
    if (typeof value !== "string" || value.length > rule.maxLength)
      throw new Error(`Invalid ${path}: expected bounded text`);
  } else if (rule.type === "array") {
    if (
      !Array.isArray(value) ||
      value.length < rule.minItems ||
      value.length > rule.maxItems
    )
      throw new Error(
        `Invalid ${path}: expected ${rule.minItems}–${rule.maxItems} items`
      );
    value.forEach((item, index) =>
      validate(item, rule.items, `${path}[${index}]`)
    );
  } else {
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error(`Invalid ${path}: expected an object`);
    const data = value as Record<string, unknown>;
    for (const key of Object.keys(data)) {
      if (!Object.hasOwn(rule.properties, key))
        throw new Error(`Invalid ${path}: unknown field`);
    }
    for (const key of rule.required) {
      if (!Object.hasOwn(data, key))
        throw new Error(`Invalid ${path}: missing ${key}`);
    }
    for (const [key, item] of Object.entries(data))
      validate(item, rule.properties[key], `${path}.${key}`);
  }
}

export function prepareTemplate(
  id: string,
  data: unknown
): { source: string; files: WorkspaceFile[]; mainPath: string } {
  const template = documentTemplates.find((template) => template.id === id);
  if (!template) throw new Error("Unknown document template");
  validate(data, template.dataSchema);
  return {
    source: template.source,
    mainPath: template.entrypoint,
    files: [{ path: "data.json", kind: "data", content: JSON.stringify(data) }],
  };
}
