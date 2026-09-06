import { lstat, open, realpath, stat, unlink } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";

export class LocalError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
  }
}

export function validateFilename(name: string, extension: string): void {
  if (
    !/^[a-z0-9][a-z0-9._-]{0,119}$/i.test(name) ||
    /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(name) ||
    !name.toLowerCase().endsWith(`.${extension}`)
  ) {
    throw new LocalError(
      "INVALID_OUTPUT",
      `Use a portable filename ending in .${extension}`
    );
  }
}

export async function createOutputFolder(directory: string) {
  if (
    !isAbsolute(directory) ||
    directory.startsWith("\\\\") ||
    directory.startsWith("//")
  ) {
    throw new LocalError(
      "INVALID_OUTPUT",
      "An existing absolute local output directory is required"
    );
  }
  const root = await realpath(resolve(directory));
  const identity = await stat(root);
  if (!identity.isDirectory())
    throw new LocalError("INVALID_OUTPUT", "Output must be a directory");

  const checkRoot = async () => {
    const current = await lstat(root);
    if (
      current.isSymbolicLink() ||
      !current.isDirectory() ||
      current.dev !== identity.dev ||
      current.ino !== identity.ino ||
      (await realpath(root)) !== root
    )
      throw new LocalError(
        "OUTPUT_CHANGED",
        "The output directory changed; restart the server"
      );
  };
  const check = async (name: string, extension: string) => {
    validateFilename(name, extension);
    await checkRoot();
    try {
      await lstat(join(root, name));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      throw error;
    }
    throw new LocalError(
      "OUTPUT_EXISTS",
      "The output filename already exists; choose a new name"
    );
  };

  return {
    root,
    check,
    async write(
      name: string,
      extension: string,
      data: Uint8Array,
      mimeType: string
    ) {
      await check(name, extension);
      const path = join(root, name);
      const handle = await open(path, "wx", 0o600).catch((error) => {
        if (error.code === "EEXIST")
          throw new LocalError(
            "OUTPUT_EXISTS",
            "The output filename already exists; choose a new name"
          );
        throw error;
      });
      const created = await handle.stat();
      try {
        await handle.writeFile(data);
        await handle.sync();
      } catch (error) {
        await handle.close();
        // Never delete a replacement another process may have placed here.
        const current = await lstat(path).catch(() => undefined);
        if (current?.dev === created.dev && current.ino === created.ino)
          await unlink(path).catch(() => undefined);
        throw error;
      }
      await handle.close();
      return {
        path,
        uri: pathToFileURL(path).href,
        mimeType,
        bytes: data.byteLength,
        sha256: createHash("sha256").update(data).digest("hex"),
      };
    },
  };
}

export type OutputFolder = Awaited<ReturnType<typeof createOutputFolder>>;
