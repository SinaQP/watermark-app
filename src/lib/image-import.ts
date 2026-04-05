const ACCEPTED_IMAGE_TYPES = new Map<string, string>([
  ["image/png", "PNG"],
  ["image/jpeg", "JPG"],
  ["image/webp", "WebP"],
]);

const ACCEPTED_EXTENSIONS = new Map<string, string>([
  ["png", "PNG"],
  ["jpg", "JPG"],
  ["jpeg", "JPEG"],
  ["webp", "WebP"],
]);

export const ACCEPTED_IMAGE_INPUT = Array.from(ACCEPTED_IMAGE_TYPES.keys()).join(",");
export const SUPPORTED_IMAGE_LABEL = "PNG, JPG, JPEG, and WebP";
export const MULTIPLE_IMAGE_ERROR =
  "Upload one image at a time. Choose a single PNG, JPG, or WebP file.";

export type ImportedImage = {
  file: File;
  previewUrl: string;
  width: number;
  height: number;
  formatLabel: string;
};

export function validateImageFile(file: File): string | null {
  const formatLabel = resolveFormatLabel(file);

  if (!formatLabel) {
    return "Unsupported file format. Choose a PNG, JPG, JPEG, or WebP image.";
  }

  return null;
}

export async function createImportedImage(file: File): Promise<ImportedImage> {
  const validationError = validateImageFile(file);

  if (validationError) {
    throw new Error(validationError);
  }

  const previewUrl = URL.createObjectURL(file);

  try {
    const dimensions = await loadImageDimensions(previewUrl);

    return {
      file,
      previewUrl,
      width: dimensions.width,
      height: dimensions.height,
      formatLabel: resolveFormatLabel(file) ?? "Image",
    };
  } catch {
    URL.revokeObjectURL(previewUrl);

    throw new Error("This file could not be opened as an image. Choose a PNG, JPG, or WebP file.");
  }
}

export function formatFileSize(sizeInBytes: number): string {
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`;
  }

  const units = ["KB", "MB", "GB"];
  let value = sizeInBytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const precision = value >= 10 ? 0 : 1;

  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

export function formatLastModified(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function resolveFormatLabel(file: File): string | null {
  if (ACCEPTED_IMAGE_TYPES.has(file.type)) {
    return ACCEPTED_IMAGE_TYPES.get(file.type) ?? null;
  }

  const extension = file.name.split(".").pop()?.toLowerCase();

  if (!extension) {
    return null;
  }

  return ACCEPTED_EXTENSIONS.get(extension) ?? null;
}

function loadImageDimensions(previewUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      resolve({
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
      });
    };

    image.onerror = () => {
      reject(new Error("Image load failed"));
    };

    image.src = previewUrl;
  });
}
