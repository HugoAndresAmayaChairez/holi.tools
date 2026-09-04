import type {
  IncomingFileDecision,
  IncomingFileOffer,
} from "../p2p/chat";

export type ChatFileKind = "image" | "video" | "file";

export type ChatFileLabels = {
  save: string;
  incoming: string;
  accept: string;
  reject: string;
  imagePreview: string;
  videoPreview: string;
};

const IMAGE_EXTENSIONS = new Set([
  "avif",
  "bmp",
  "gif",
  "heic",
  "heif",
  "ico",
  "jpeg",
  "jpg",
  "png",
  "svg",
  "webp",
]);

const VIDEO_EXTENSIONS = new Set([
  "avi",
  "m4v",
  "mkv",
  "mov",
  "mp4",
  "mpeg",
  "mpg",
  "ogv",
  "webm",
]);

function extensionOf(filename: string): string {
  const lastPart = filename.trim().toLowerCase().split(/[\\/]/).pop() || "";
  const dot = lastPart.lastIndexOf(".");
  return dot >= 0 ? lastPart.slice(dot + 1) : "";
}

export function getChatFileKind(
  filename: string,
  mimeType = ""
): ChatFileKind {
  const normalizedMime = mimeType.trim().toLowerCase();
  if (normalizedMime.startsWith("image/")) return "image";
  if (normalizedMime.startsWith("video/")) return "video";

  const extension = extensionOf(filename);
  if (IMAGE_EXTENSIONS.has(extension)) return "image";
  if (VIDEO_EXTENSIONS.has(extension)) return "video";
  return "file";
}

export function formatChatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024))
  );
  const value = bytes / Math.pow(1024, index);
  const digits = index === 0 || value >= 10 ? 0 : 1;
  const formatted = value.toFixed(digits).replace(/\.0$/, "");
  return `${formatted} ${units[index]}`;
}

function clearElement(element: HTMLElement) {
  while (element.firstChild) element.firstChild.remove();
}

export function appendChatFilePreview(options: {
  host: HTMLElement;
  blob: Blob;
  filename: string;
  side: "me" | "peer";
  labels: ChatFileLabels;
}): () => void {
  const filename = options.filename.trim() || "file";
  const kind = getChatFileKind(filename, options.blob.type);
  const objectUrl = URL.createObjectURL(options.blob);

  const row = document.createElement("div");
  row.className = `flex w-full ${options.side === "me" ? "justify-end" : "justify-start"}`;

  const card = document.createElement("article");
  card.className =
    options.side === "me"
      ? "max-w-[88%] overflow-hidden rounded-2xl rounded-br-md border border-purple-300/20 bg-purple-600 text-white shadow-lg"
      : "max-w-[88%] overflow-hidden rounded-2xl rounded-bl-md border border-white/10 bg-zinc-800 text-zinc-100 shadow-lg";

  if (kind === "image") {
    const image = document.createElement("img");
    image.src = objectUrl;
    image.alt = `${options.labels.imagePreview} ${filename}`;
    image.loading = "lazy";
    image.className =
      "block max-h-80 w-full min-w-48 bg-black/30 object-contain";
    card.appendChild(image);
  } else if (kind === "video") {
    const video = document.createElement("video");
    video.src = objectUrl;
    video.controls = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.setAttribute("aria-label", `${options.labels.videoPreview} ${filename}`);
    video.className =
      "block max-h-80 w-full min-w-48 bg-black object-contain";
    card.appendChild(video);
  }

  const details = document.createElement("div");
  details.className = "flex items-center gap-3 px-3 py-2.5";

  const fileIcon = document.createElement("span");
  fileIcon.className =
    "grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-black/20 text-base";
  fileIcon.setAttribute("aria-hidden", "true");
  fileIcon.textContent = kind === "image" ? "▧" : kind === "video" ? "▶" : "↧";

  const metadata = document.createElement("div");
  metadata.className = "min-w-0 flex-1";
  const name = document.createElement("p");
  name.className = "truncate text-sm font-semibold";
  name.textContent = filename;
  name.title = filename;
  const size = document.createElement("p");
  size.className = "text-[11px] opacity-70";
  size.textContent = formatChatFileSize(options.blob.size);
  metadata.append(name, size);

  const save = document.createElement("a");
  save.href = objectUrl;
  save.download = filename;
  save.className =
    "shrink-0 rounded-lg bg-black/20 px-2.5 py-1.5 text-xs font-semibold hover:bg-black/30 focus:outline-none focus:ring-2 focus:ring-white/60";
  save.textContent = options.labels.save;

  details.append(fileIcon, metadata, save);
  card.appendChild(details);
  row.appendChild(card);
  options.host.appendChild(row);
  options.host.scrollTop = options.host.scrollHeight;

  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    URL.revokeObjectURL(objectUrl);
    row.remove();
  };
}

export function requestIncomingChatFile(options: {
  host: HTMLElement;
  offer: IncomingFileOffer;
  labels: ChatFileLabels;
  signal?: AbortSignal;
  timeoutMs?: number;
}): Promise<IncomingFileDecision> {
  return new Promise((resolve) => {
    const row = document.createElement("div");
    row.className = "flex w-full justify-start";

    const card = document.createElement("section");
    card.className =
      "max-w-[92%] rounded-2xl rounded-bl-md border border-purple-400/30 bg-purple-500/10 px-3 py-3 text-zinc-100";

    const title = document.createElement("p");
    title.className = "text-sm font-semibold";
    title.textContent = options.labels.incoming;

    const metadata = document.createElement("p");
    metadata.className = "mt-1 break-all text-xs text-zinc-300";
    metadata.textContent = `${options.offer.filename} · ${formatChatFileSize(options.offer.size)}`;

    const actions = document.createElement("div");
    actions.className = "mt-3 flex gap-2";

    const accept = document.createElement("button");
    accept.type = "button";
    accept.className =
      "rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-300";
    accept.textContent = options.labels.accept;

    const reject = document.createElement("button");
    reject.type = "button";
    reject.className =
      "rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50";
    reject.textContent = options.labels.reject;

    actions.append(accept, reject);
    card.append(title, metadata, actions);
    row.appendChild(card);
    options.host.appendChild(row);
    options.host.scrollTop = options.host.scrollHeight;

    let finished = false;
    const timeout = window.setTimeout(
      () => finish({ decision: "reject", reason: "File offer timed out" }),
      options.timeoutMs ?? 55_000
    );

    function finish(decision: IncomingFileDecision) {
      if (finished) return;
      finished = true;
      window.clearTimeout(timeout);
      options.signal?.removeEventListener("abort", handleAbort);
      clearElement(actions);
      row.remove();
      resolve(decision);
    }

    function handleAbort() {
      finish({ decision: "reject", reason: "Chat closed" });
    }

    accept.addEventListener("click", () => finish("accept"), { once: true });
    reject.addEventListener(
      "click",
      () => finish({ decision: "reject", reason: "User rejected" }),
      { once: true }
    );
    options.signal?.addEventListener("abort", handleAbort, { once: true });
    if (options.signal?.aborted) handleAbort();
  });
}
