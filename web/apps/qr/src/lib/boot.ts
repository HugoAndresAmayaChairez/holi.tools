/**
 * boot.ts — client entry for the QR workspace.
 * Order matters: icons first (inline `.icon` names become SVGs), then the
 * controller (renderers + global helpers), then the input logic and shell.
 */
import { getIconSvg } from "./icons";
import { qrController } from "./qr-controller";
import "./input-area-logic";
import { initWorkspace } from "./workspace/shell";

// Keep the debugging handle the old entry exposed.
(window as any).qrControllerApp = qrController;

function initAllIcons(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>(".icon, .material-icons").forEach((el) => {
    const name = el.textContent?.trim();
    if (name && !el.querySelector("svg") && /^[a-z_]+$/.test(name)) {
      const svg = getIconSvg(name, 20);
      if (svg) el.innerHTML = svg;
    }
  });
}

initAllIcons();
initWorkspace();
if (document.readyState !== "complete") {
  window.addEventListener("load", () => initAllIcons(), { once: true });
}
