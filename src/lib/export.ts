import type { LogoWatermarkState, TextWatermarkState } from "@/components/watermark/types";
import type { ImportedImage } from "@/lib/image-import";
import {
  renderWatermarkComposition,
  resolveExportExtension,
  resolveExportMimeType,
  type ExportFormat,
  type RenderSize,
} from "@/lib/watermark-render";

type ExportProgressStep = "dialog" | "loading" | "rendering" | "saving";

export type ExportProgress = {
  message: string;
  step: ExportProgressStep;
};

export type ExportSettings = {
  fileName: string;
  format: ExportFormat;
  quality: number;
};

export type ExportResult = {
  bytesWritten: number;
  path: string;
};

type ExportWatermarkedImageOptions = {
  image: ImportedImage;
  logo: ImportedImage | null;
  logoWatermark: LogoWatermarkState | null;
  onProgress?: (progress: ExportProgress) => void;
  previewStageSize: RenderSize;
  settings: ExportSettings;
  watermark: TextWatermarkState;
};

type SaveDialogModule = typeof import("@tauri-apps/plugin-dialog");
type TauriCoreModule = typeof import("@tauri-apps/api/core");

export async function exportWatermarkedImage({
  image,
  logo,
  logoWatermark,
  onProgress,
  previewStageSize,
  settings,
  watermark,
}: ExportWatermarkedImageOptions): Promise<ExportResult | null> {
  ensureDesktopRuntime();

  const fileName = buildExportFileName(settings.fileName, settings.format);

  onProgress?.({
    message: "Choose a save location for the exported image.",
    step: "dialog",
  });

  const saveDialog = await loadSaveDialogModule();
  const selectedPath = await saveDialog.save({
    defaultPath: fileName,
    filters: [resolveDialogFilter(settings.format)],
    title: "Export watermarked image",
  });

  if (!selectedPath) {
    return null;
  }

  onProgress?.({
    message: "Loading the preview assets for export.",
    step: "loading",
  });

  const [baseImage, logoImage] = await Promise.all([
    loadImageElement(image.previewUrl),
    logo ? loadImageElement(logo.previewUrl) : Promise.resolve(null),
  ]);

  const canvas = document.createElement("canvas");

  onProgress?.({
    message: "Rendering the final watermarked image.",
    step: "rendering",
  });

  await renderWatermarkComposition({
    backgroundColor: settings.format === "jpg" ? "#ffffff" : null,
    baseImage,
    canvas,
    logoAspectRatio: logo ? resolveAspectRatio(logo) : 1,
    logoImage,
    logoWatermark,
    outputSize: { width: image.width, height: image.height },
    stageSize: normalizeStageSize(previewStageSize, image),
    watermark,
  });

  const blob = await canvasToBlob(
    canvas,
    resolveExportMimeType(settings.format),
    settings.format === "png" ? undefined : settings.quality / 100,
  );
  const bytesBase64 = arrayBufferToBase64(await blob.arrayBuffer());
  const tauriCore = await loadTauriCoreModule();

  onProgress?.({
    message: "Writing the export to disk.",
    step: "saving",
  });

  const invoke = resolveInvoke(tauriCore);

  return invoke<ExportResult>("export_watermarked_image", {
    base64Data: bytesBase64,
    format: settings.format,
    path: selectedPath,
  });
}

export function buildExportFileName(fileName: string, format: ExportFormat) {
  const baseName = sanitizeFileNameSegment(stripKnownExtension(fileName)) || "watermarked-image";

  return `${baseName}.${resolveExportExtension(format)}`;
}

function normalizeStageSize(
  previewStageSize: RenderSize,
  image: Pick<ImportedImage, "width" | "height">,
): RenderSize {
  if (previewStageSize.width > 0 && previewStageSize.height > 0) {
    return previewStageSize;
  }

  return { width: image.width, height: image.height };
}

function resolveDialogFilter(format: ExportFormat) {
  return format === "png"
    ? { extensions: ["png"], name: "PNG image" }
    : { extensions: ["jpg", "jpeg"], name: "JPEG image" };
}

function resolveAspectRatio(image: Pick<ImportedImage, "width" | "height">) {
  return image.height > 0 ? image.width / image.height : 1;
}

function sanitizeFileNameSegment(fileName: string) {
  return fileName
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .trim();
}

function stripKnownExtension(fileName: string) {
  return fileName.replace(/\.(png|jpe?g)$/i, "");
}

function loadImageElement(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      resolve(image);
    };
    image.onerror = () => {
      reject(new Error("One of the source images could not be loaded for export."));
    };
    image.src = source;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("The export renderer did not produce an image file."));
          return;
        }

        resolve(blob);
      },
      type,
      quality,
    );
  });
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    let value = "";

    for (const byte of chunk) {
      value += String.fromCharCode(byte);
    }

    binary += value;
  }

  return btoa(binary);
}

async function loadSaveDialogModule(): Promise<SaveDialogModule> {
  try {
    return await import("@tauri-apps/plugin-dialog");
  } catch {
    throw new Error("Desktop export is only available inside the Tauri app.");
  }
}

async function loadTauriCoreModule(): Promise<TauriCoreModule> {
  try {
    return await import("@tauri-apps/api/core");
  } catch {
    throw new Error("The desktop bridge is unavailable, so the export could not be saved.");
  }
}

function ensureDesktopRuntime() {
  if (!hasTauriInternals()) {
    throw new Error("Export is only available in the desktop app. Run the project with Tauri.");
  }
}

function resolveInvoke(tauriCore: TauriCoreModule) {
  if (typeof tauriCore.invoke === "function") {
    return tauriCore.invoke;
  }

  if (!hasTauriInternals()) {
    throw new Error("Export is only available in the desktop app. Run the project with Tauri.");
  }

  throw new Error("The Tauri invoke bridge is unavailable. Restart the desktop app and try again.");
}

function hasTauriInternals() {
  const scope = globalThis as typeof globalThis & {
    __TAURI_INTERNALS__?: { invoke?: unknown };
  };

  return typeof scope.__TAURI_INTERNALS__?.invoke === "function";
}
