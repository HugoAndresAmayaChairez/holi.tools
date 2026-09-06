import { Worker } from "node:worker_threads";
import { LocalError } from "./output.js";
import type { WorkspaceFile, TypstDiagnostic } from "@holi/engine-typst";

export type Job =
  | {
      kind: "document";
      source: string;
      mainPath?: string;
      files?: WorkspaceFile[];
      allowPackages: boolean;
    }
  | {
      kind: "qr";
      content: string;
      config: Record<string, unknown>;
      format: "svg" | "png";
      size: number;
      /** Read the rendered file back with the local decoder. */
      verify: boolean;
    };
export interface JobResult {
  data?: Uint8Array;
  diagnostics: TypstDiagnostic[];
  /** Present for QR jobs that asked for verification. */
  verified?: boolean;
}

export function runJob(job: Job, timeout = 60_000): Promise<JobResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./worker.js", import.meta.url), {
      workerData: job,
      stdout: true,
      stderr: true,
      resourceLimits: {
        maxOldGenerationSizeMb: 256,
        maxYoungGenerationSizeMb: 32,
      },
    });
    // Compiler internals may print source/paths. Never relay those streams to logs or stdio MCP.
    worker.stdout.resume();
    worker.stderr.resume();
    let done = false;
    const finish = async (result?: JobResult, error?: Error) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      await worker.terminate();
      if (error) reject(error);
      else resolve(result!);
    };
    const timer = setTimeout(
      () =>
        void finish(
          undefined,
          new LocalError("TIMEOUT", "Rendering exceeded the time limit")
        ),
      timeout
    );
    worker.once("message", (result) => void finish(result));
    worker.once(
      "error",
      () =>
        void finish(
          undefined,
          new LocalError("ENGINE_FAILED", "The rendering worker failed")
        )
    );
    worker.once("exit", () => {
      if (!done)
        void finish(
          undefined,
          new LocalError("ENGINE_FAILED", "The rendering worker stopped")
        );
    });
  });
}

/** One bounded queue for all tools and HTTP connections sharing this server. */
export function createWorkQueue(limit = 8) {
  let pending = 0;
  let tail: Promise<unknown> = Promise.resolve();
  return async function enqueue<T>(work: () => Promise<T>): Promise<T> {
    if (pending >= limit)
      throw new LocalError(
        "BUSY",
        "The local render queue is full; retry later"
      );
    pending++;
    const task = tail.then(work);
    tail = task.catch(() => undefined);
    try {
      return await task;
    } finally {
      pending--;
    }
  };
}
