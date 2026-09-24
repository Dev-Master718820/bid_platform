/** Calls a file endpoint and triggers a browser download, surfacing JSON API errors. */
export async function downloadFile(url: string, fallbackName: string, init?: RequestInit) {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    let message = `Download failed (${res.status})`;
    try {
      message = ((await res.json()) as { error?: string }).error ?? message;
    } catch {}
    throw new Error(message);
  }
  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition") ?? "";
  const utf = /filename\*=UTF-8''([^;]+)/i.exec(cd)?.[1];
  const plain = /filename="([^"]+)"/i.exec(cd)?.[1];
  const name = utf ? decodeURIComponent(utf) : (plain ?? fallbackName);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Downloads an in-memory string (e.g. JSON) as a file. */
export function downloadText(text: string, name: string, type = "application/json") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
