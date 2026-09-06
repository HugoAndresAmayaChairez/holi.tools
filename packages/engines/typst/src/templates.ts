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

const text = { type: "string", maxLength: 100_000 };
const schema = (properties: Record<string, unknown>, required: string[]) => ({
  type: "object",
  additionalProperties: false,
  properties,
  required,
});

export const documentTemplates: readonly DocumentTemplate[] = [
  {
    v: 1,
    id: "report",
    name: "Report",
    description:
      "A titled report with an optional byline and plain-text sections.",
    entrypoint: "main.typ",
    dataSchema: schema(
      {
        title: text,
        subtitle: text,
        author: text,
        date: text,
        sections: {
          type: "array",
          minItems: 1,
          maxItems: 100,
          items: schema({ heading: text, body: text }, ["heading", "body"]),
        },
      },
      ["title", "sections"]
    ),
    example: {
      title: "Project report",
      author: "Holi",
      date: "2026-09-05",
      sections: [
        { heading: "Findings", body: "Write the verified findings here." },
      ],
    },
    source: `#let data = json("data.json")
#set page(paper: "a4", margin: 24mm, numbering: "1")
#set text(font: "Libertinus Serif", size: 11pt)
#set par(justify: true)
#text(size: 26pt, weight: "bold", data.title)
#if "subtitle" in data { parbreak(); text(size: 14pt, data.subtitle) }
#v(8pt)
#if "author" in data { text(data.author); linebreak() }
#if "date" in data { text(fill: rgb("666666"), data.date) }
#v(14pt)
#for section in data.sections {
  heading(level: 1, section.heading)
  parbreak()
  text(section.body)
  parbreak()
}
`,
  },
  {
    v: 1,
    id: "letter",
    name: "Letter",
    description:
      "A letter with sender, recipient, date, subject and plain-text body.",
    entrypoint: "main.typ",
    dataSchema: schema(
      {
        sender: text,
        recipient: text,
        date: text,
        subject: text,
        body: text,
        closing: text,
      },
      ["sender", "recipient", "date", "subject", "body"]
    ),
    example: {
      sender: "Alex Rivera",
      recipient: "Project team",
      date: "2026-09-05",
      subject: "Project update",
      body: "The review is ready.",
      closing: "Thank you,\nAlex",
    },
    source: `#let data = json("data.json")
#set page(paper: "a4", margin: 25mm)
#set text(font: "Libertinus Serif", size: 11pt)
#text(weight: "bold", data.sender)
#parbreak()
#text(data.date)
#v(18pt)
#text(data.recipient)
#v(18pt)
#text(size: 14pt, weight: "bold", data.subject)
#v(12pt)
#text(data.body)
#if "closing" in data { v(18pt); text(data.closing) }
`,
  },
];

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
