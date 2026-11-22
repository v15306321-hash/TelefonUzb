"use client";

export type UploadedAsset = { id: string; url: string; width: number | null; height: number | null; mimeType: string; size: number; filename: string };

/** Upload a file to /api/admin/upload with progress reporting. */
export function uploadFile(file: File | Blob, kind: "image" | "model" | "video", onProgress?: (p: number) => void, filename?: string): Promise<UploadedAsset> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append("kind", kind);
    fd.append("file", file, filename ?? (file instanceof File ? file.name : "file"));
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/upload");
    xhr.responseType = "json";
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      const body = xhr.response as (UploadedAsset & { error?: string }) | null;
      if (xhr.status >= 200 && xhr.status < 300 && body?.id) resolve(body);
      else if (xhr.status === 401) reject(new Error("Сессия истекла — войдите снова"));
      else reject(new Error(body?.error || `Ошибка загрузки (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Сетевая ошибка при загрузке"));
    xhr.send(fd);
  });
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} Б`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} КБ`;
  return `${(n / 1024 / 1024).toFixed(1)} МБ`;
}
