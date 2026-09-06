/** Virtual paths never grant access to the runtime's host filesystem. */
export function isWorkspacePath(path: string): boolean {
  return (
    path.length > 0 &&
    path.length <= 240 &&
    !/[\\:]/.test(path) &&
    ![...path].some((char) => char.charCodeAt(0) < 32) &&
    !path.startsWith("/") &&
    path
      .split("/")
      .every((part) => part !== "" && part !== "." && part !== "..")
  );
}
