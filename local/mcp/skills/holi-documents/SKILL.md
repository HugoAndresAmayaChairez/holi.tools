---
name: holi-documents
description: Create PDF reports, letters or Typst documents with a connected Holi Local MCP server. Use for local deterministic document rendering; DOCX and signatures are outside this tool's scope.
---

Read `holi_info` to discover the configured output folder, limits and package
policy. Use `document_templates` for the exact template schemas and source.

Use `document_render` for reports and letters. Pass the user's text as JSON;
do not interpolate it into Typst code. For custom layouts use
`document_compile` with virtual files explicitly supplied by the user or built
for this task. Paths refer to that virtual workspace, not arbitrary local files.

Choose a descriptive, unused `.pdf` basename. The server cannot overwrite or
change its output folder. On compilation failure, use the returned file/line
diagnostics to fix source; retain successful outputs from earlier calls.

Return the artifact path. Inspect the PDF in an available viewer before making
claims about layout. Mention if visual inspection is unavailable. Package
downloads are an operator setting and may fail offline; prefer bundled assets
when they satisfy the request. Do not imply that the assistant provider cannot
see prompts or results merely because rendering happens locally.
