export const MAX_JSON_FILE_BYTES = 5 * 1024 * 1024;

export async function readTextFile(
  file: File,
  maxBytes = MAX_JSON_FILE_BYTES,
): Promise<string> {
  if (file.size > maxBytes) {
    throw new Error("文件不能超过 5 MB");
  }

  return file.text();
}

export function downloadText(
  value: string,
  filename: string,
  type = "application/json;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([value], { type }));
  const anchor = document.createElement("a");
  anchor.download = filename;
  anchor.href = url;
  anchor.click();
  URL.revokeObjectURL(url);
}
