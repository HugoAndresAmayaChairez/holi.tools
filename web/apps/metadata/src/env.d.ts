/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare global {
  interface Window {
    showDirectoryPicker?: (options?: any) => Promise<any>;
    showSaveFilePicker?: (options?: any) => Promise<any>;
  }
}

export {};
