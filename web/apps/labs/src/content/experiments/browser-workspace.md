---
title: "Build a browser workspace that never traps the user"
description: "A practical architecture for working with a chosen folder or a browser-owned fallback without changing the editor flow."
summary: "Use one workspace contract, two storage adapters, explicit permissions, and exportable recovery so local-first remains useful even when folder access is unavailable."
tags: ["local-first", "files", "indexeddb"]
category: "Local-first"
format: "tutorial"
icon: "folder_open"
color: "var(--palette-labs-accent)"
lang: en
order: 1
featured: true
---

A local-first editor should not make people understand browser storage before they can create something. The product flow can stay the same whether the files live in a folder selected by the user or in storage managed by the browser.

## Start with one workspace contract

Give the editor a small interface instead of direct access to either storage API:

```ts
interface Workspace {
  list(path: string): Promise<Entry[]>;
  read(path: string): Promise<Uint8Array>;
  write(path: string, data: Uint8Array): Promise<void>;
  remove(path: string): Promise<void>;
}
```

The UI can now open, save, rename, and preview files without knowing which adapter is active.

## Adapter A: a folder chosen by the user

Use the File System Access API when it is available and the person chooses a folder. Keep the directory handle locally, but request permission again when the browser requires it. A saved handle is not permission to read forever.

Important rules:

- Opening a folder must be a deliberate gesture.
- Do not scan outside the selected directory.
- Show the active folder name and permission state.
- If permission is lost, keep the document in memory and offer a recovery export.

## Adapter B: a browser-owned workspace

When there is no active folder, create the same project tree in IndexedDB or OPFS. This is the default workspace—not an error state. It should support the same commands as the folder adapter.

A useful initial tree might be:

```text
workspace/
  projects/
    welcome/
      main.typ
      images/
        sample.svg
  shared/
  exports/
```

## Switch without losing work

Changing adapters is a migration, not a preference toggle. Copy into the destination, verify every file, and only then mark the new workspace active. Never delete the source automatically.

## Add a recovery path

Browser storage can be cleared by the browser or the user. A resilient product therefore needs:

1. A visible workspace status.
2. Export of a project or the full workspace.
3. Import that validates paths before writing.
4. A warning before large or irreversible changes.

## Privacy check

Neither adapter needs a server. The selected folder path, filenames, handles, and document bytes should remain on the device. Serving the web application still exposes connection metadata such as IP address and request timing to the hosting provider, but not the local workspace content unless a separate connected feature explicitly sends it.

## Shipping checklist

- The editor works before an account or folder exists.
- Folder permission has a clear requested, granted, and lost state.
- Both adapters pass the same behavior tests.
- The user can export before clearing or migrating storage.
- Network inspection shows no document or filename upload during local editing.
