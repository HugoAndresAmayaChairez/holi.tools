---
title: "A Typst project structure that grows without friction"
description: "Organize documents, images, shared styles, and exports so one browser workspace can hold several projects."
summary: "Keep each document self-contained, reserve a shared area for deliberate reuse, and let the editor resolve the same paths in folder and browser storage modes."
tags: ["typst", "projects", "files"]
category: "Typst"
format: "tutorial"
icon: "description"
color: "var(--palette-typst-accent)"
lang: en
order: 3
---

A single `main.typ` file is enough to begin, but documents quickly collect images, bibliography files, styles, and exports. A predictable tree prevents the file panel from becoming the product.

## Use one folder per project

Start with a workspace that can hold independent projects:

```text
workspace/
  projects/
    thesis/
      main.typ
      sections/
      images/
        placeholder.svg
      references.bib
    invoice-template/
      main.typ
      images/
  shared/
    brand.typ
  exports/
```

Each project should compile without depending on another project's private files. That makes export, backup, and sharing predictable.

## Resolve paths from the project root

The editor should know the active project and resolve `images/chart.svg` from that root. Users should not need separate “import file” and “import folder” flows once a workspace exists. The file panel can focus on creating files and folders, renaming, moving, and revealing the active project.

## Make images ordinary files

Create an `images/` folder in every starter project and include a lightweight placeholder. Dropping or pasting an image writes it there and inserts a relative reference. Keep the original filename only after validating that it is safe and does not collide with an existing file.

## Share styles carefully

The `shared/` directory is useful for fonts, colors, and common functions, but it creates coupling. Move a file there only when two real projects use it. A project intended for export should be able to copy its shared dependencies into its own tree.

## Separate source from output

Generated PDFs are not source documents. Put downloads in a dedicated export area or use the browser's save dialog. Do not continuously write every preview frame to disk.

## Support both storage modes

The structure should be identical in a selected folder and in browser-owned storage. Only the adapter changes. This keeps compilation paths, recent projects, empty states, and recovery behavior consistent.

## Starter-project checklist

- `main.typ` compiles immediately.
- `images/placeholder.svg` proves relative image paths work.
- The project name can be changed without breaking imports.
- Autosave writes only after a local change.
- Export never overwrites a source file.
- Closing folder permission does not discard the in-memory draft.
