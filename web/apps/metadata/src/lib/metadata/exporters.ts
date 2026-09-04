export function toCsv(rows: Record<string, string | number | null | undefined>[]) {
  const keys = Array.from(
    rows.reduce((acc, row) => {
      Object.keys(row).forEach((k) => acc.add(k));
      return acc;
    }, new Set<string>())
  );

  if (keys.length === 0) return "";

  const escapeCell = (value: unknown) => {
    const text = value == null ? "" : String(value);
    const needsQuotes = /[",\n\r]/.test(text);
    const escaped = text.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  };

  const header = keys.map(escapeCell).join(",");
  const body = rows
    .map((row) => keys.map((k) => escapeCell((row as any)[k])).join(","))
    .join("\n");
  return `${header}\n${body}\n`;
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2500);
}

export function downloadJson(filename: string, data: unknown) {
  downloadBlob(
    filename,
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
  );
}

export function downloadCsv(filename: string, rows: Record<string, any>[]) {
  downloadBlob(filename, new Blob([toCsv(rows)], { type: "text/csv" }));
}
