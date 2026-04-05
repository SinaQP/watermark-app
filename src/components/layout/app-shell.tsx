import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { ExportSettingsPanel } from "@/components/export/export-settings-panel";
import { Panel } from "@/components/layout/panel";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { WatermarkCanvas } from "@/components/watermark/watermark-canvas";
import { WatermarkInspector } from "@/components/watermark/watermark-inspector";
import type { LogoWatermarkState, TextWatermarkState } from "@/components/watermark/types";
import { exportWatermarkedImage, type ExportSettings } from "@/lib/export";
import { MULTIPLE_IMAGE_ERROR, createImportedImage, type ImportedImage } from "@/lib/image-import";
import {
  clampLogoWidthToPosition,
  clampWatermarkPosition,
  fitLogoWidthToStage,
  formatWatermarkPosition,
  getPresetLabel,
  getPresetPosition,
  getWatermarkBoundsForWidth,
  measureRotatedWatermarkBounds,
  type WatermarkBounds,
  type WatermarkPresetId,
} from "@/lib/text-watermark";

type StageRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type TextDragState = {
  pointerId: number;
  stageRect: StageRect;
  overlayBounds: WatermarkBounds;
  offsetX: number;
  offsetY: number;
};

type LogoMoveState = {
  kind: "move";
  pointerId: number;
  stageRect: StageRect;
  offsetX: number;
  offsetY: number;
};

type LogoResizeState = {
  kind: "resize";
  pointerId: number;
  stageRect: StageRect;
  position: { x: number; y: number };
  rotation: number;
  aspectRatio: number;
};

type LogoInteractionState = LogoMoveState | LogoResizeState;

type ExportState = {
  error: string | null;
  lastSavedPath: string | null;
  message: string;
  status: "error" | "idle" | "saving" | "success";
};

const acceptedFormats = [
  "PNG preserves transparent edges for clean logo marks.",
  "JPG is practical for base photography and review shots.",
  "WebP stays lightweight for quick preview iterations.",
  "SVG works well for vector logos and brand marks.",
];

const workflowNotes = [
  "Upload a base image, then add an optional logo watermark.",
  "Tune text and logo opacity, rotation, and overall balance.",
  "Drag text or logo overlays directly on the preview, then export the final result to PNG or JPG.",
];

const defaultTextWatermark: TextWatermarkState = {
  text: "Studio Proof",
  fontSize: 68,
  color: "#ffffff",
  opacity: 0.58,
  rotation: -18,
  mode: "bottom-right",
  position: { x: 0.82, y: 0.84 },
};

const defaultLogoOpacity = 0.82;
const defaultLogoRotation = 0;
const defaultExportSettings: ExportSettings = {
  fileName: "watermarked-image",
  format: "png",
  quality: 92,
};
const defaultExportState: ExportState = {
  error: null,
  lastSavedPath: null,
  message: "Choose PNG or JPG, then save the rendered result to a local file.",
  status: "idle",
};

export function AppShell() {
  const imageInputId = useId();
  const logoInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const previewStageRef = useRef<HTMLDivElement>(null);
  const watermarkOverlayRef = useRef<HTMLButtonElement>(null);
  const textDragStateRef = useRef<TextDragState | null>(null);
  const logoInteractionRef = useRef<LogoInteractionState | null>(null);

  const [image, setImage] = useState<ImportedImage | null>(null);
  const [logoImage, setLogoImage] = useState<ImportedImage | null>(null);
  const [logoWatermark, setLogoWatermark] = useState<LogoWatermarkState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isImportDragActive, setIsImportDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isWatermarkDragging, setIsWatermarkDragging] = useState(false);
  const [logoInteractionMode, setLogoInteractionMode] = useState<"idle" | "move" | "resize">(
    "idle",
  );
  const [exportSettings, setExportSettings] = useState<ExportSettings>(defaultExportSettings);
  const [exportState, setExportState] = useState<ExportState>(defaultExportState);
  const [watermark, setWatermark] = useState<TextWatermarkState>(defaultTextWatermark);

  useEffect(() => {
    if (!image) {
      return;
    }

    return () => {
      URL.revokeObjectURL(image.previewUrl);
    };
  }, [image]);

  useEffect(() => {
    if (!logoImage) {
      return;
    }

    return () => {
      URL.revokeObjectURL(logoImage.previewUrl);
    };
  }, [logoImage]);

  useEffect(() => {
    if (!image) {
      return;
    }

    const syncPosition = () => {
      const stageRect = previewStageRef.current?.getBoundingClientRect();
      const overlayRect = watermarkOverlayRef.current?.getBoundingClientRect();
      const stage = {
        width: stageRect && stageRect.width > 0 ? stageRect.width : image.width,
        height: stageRect && stageRect.height > 0 ? stageRect.height : image.height,
      };
      const overlay = {
        width: overlayRect?.width ?? 0,
        height: overlayRect?.height ?? 0,
      };

      setWatermark((current) => ({
        ...current,
        position:
          current.mode === "custom"
            ? clampWatermarkPosition(current.position, stage, overlay)
            : getPresetPosition(current.mode, stage, overlay),
      }));
    };

    const frameId = window.requestAnimationFrame(syncPosition);
    window.addEventListener("resize", syncPosition);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", syncPosition);
    };
  }, [image, watermark.text, watermark.fontSize, watermark.rotation, watermark.mode]);

  useEffect(() => {
    if (!image || !logoImage) {
      return;
    }

    const syncLogo = () => {
      const stage = readStageBounds(image);
      if (!stage) {
        return;
      }

      const aspectRatio = resolveAspectRatio(logoImage);

      setLogoWatermark((current) => {
        if (!current) {
          return current;
        }

        const nextWidth = fitLogoWidthToStage(current.width, stage, current.rotation, aspectRatio);
        const overlayBounds = measureRotatedWatermarkBounds(
          getWatermarkBoundsForWidth(nextWidth, aspectRatio),
          current.rotation,
        );

        return {
          ...current,
          width: nextWidth,
          position: clampWatermarkPosition(current.position, stage, overlayBounds),
        };
      });
    };

    const frameId = window.requestAnimationFrame(syncLogo);
    window.addEventListener("resize", syncLogo);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", syncLogo);
    };
  }, [image, logoImage, logoWatermark?.rotation, logoWatermark?.width]);

  useEffect(() => {
    if (!image) {
      return;
    }

    setExportSettings((current) => ({
      ...current,
      fileName: resolveDefaultExportName(image.file.name),
    }));
  }, [image]);

  const sessionStatus = image
    ? "Preview ready"
    : isLoading
      ? "Reading image"
      : error
        ? "Needs attention"
        : "Awaiting image";

  const logoStatus = logoImage
    ? logoInteractionMode === "resize"
      ? "Resizing logo"
      : logoInteractionMode === "move"
        ? "Moving logo"
        : "Logo ready"
    : image
      ? "Text only"
      : "No logo";
  const exportStatus =
    exportState.status === "saving"
      ? "Exporting"
      : exportState.status === "success"
        ? "Saved locally"
        : exportState.status === "error"
          ? "Export error"
          : "Ready to export";

  async function importFiles(source: FileList | File[] | null, target: "base" | "logo") {
    const files = source ? Array.from(source) : [];

    if (files.length === 0) {
      return;
    }

    if (files.length > 1) {
      setError(MULTIPLE_IMAGE_ERROR);
      return;
    }

    if (target === "base") {
      setIsLoading(true);
    }

    setError(null);

    try {
      const importedImage = await createImportedImage(files[0]);

      if (target === "base") {
        setImage(importedImage);
      } else {
        const stage =
          readStageBounds(image) ??
          (image
            ? { width: image.width, height: image.height }
            : { width: importedImage.width, height: importedImage.height });
        const aspectRatio = resolveAspectRatio(importedImage);

        setLogoImage(importedImage);
        setLogoWatermark((current) => {
          const rotation = current?.rotation ?? defaultLogoRotation;
          const opacity = current?.opacity ?? defaultLogoOpacity;
          const baseWidth = current?.width ?? resolveInitialLogoWidth(importedImage, stage);
          const nextWidth = fitLogoWidthToStage(baseWidth, stage, rotation, aspectRatio);
          const overlayBounds = measureRotatedWatermarkBounds(
            getWatermarkBoundsForWidth(nextWidth, aspectRatio),
            rotation,
          );
          const fallbackPosition = getPresetPosition("bottom-right", stage, overlayBounds);

          return {
            opacity,
            position: clampWatermarkPosition(
              current?.position ?? fallbackPosition,
              stage,
              overlayBounds,
            ),
            rotation,
            width: nextWidth,
          };
        });
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong while reading the image.",
      );
    } finally {
      if (target === "base") {
        setIsLoading(false);
      }
      setIsImportDragActive(false);
    }
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function openLogoPicker() {
    logoInputRef.current?.click();
  }

  async function handleExport() {
    if (!image) {
      return;
    }

    setExportState((current) => ({
      ...current,
      error: null,
      message: "Choose a save location for the exported image.",
      status: "saving",
    }));

    try {
      const result = await exportWatermarkedImage({
        image,
        logo: logoImage,
        logoWatermark,
        onProgress: ({ message }) => {
          setExportState((current) => ({
            ...current,
            error: null,
            message,
            status: "saving",
          }));
        },
        previewStageSize: readStageBounds(image) ?? { height: image.height, width: image.width },
        settings: exportSettings,
        watermark,
      });

      if (!result) {
        setExportState((current) => ({
          ...current,
          error: null,
          message: "Export canceled. Choose a save location to try again.",
          status: "idle",
        }));
        return;
      }

      setExportState({
        error: null,
        lastSavedPath: result.path,
        message: "Saved the rendered watermark preview to your local machine.",
        status: "success",
      });
    } catch (caughtError) {
      setExportState((current) => ({
        ...current,
        error:
          caughtError instanceof Error ? caughtError.message : "The export could not be completed.",
        message: "Fix the export issue and try again.",
        status: "error",
      }));
    }
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    void importFiles(event.target.files, "base");
    event.target.value = "";
  }

  function handleLogoInputChange(event: ChangeEvent<HTMLInputElement>) {
    void importFiles(event.target.files, "logo");
    event.target.value = "";
  }

  function handleExportFileNameChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFileName = event.currentTarget.value;

    setExportSettings((current) => ({
      ...current,
      fileName: nextFileName,
    }));
    setExportState((current) =>
      current.status === "error"
        ? {
            ...current,
            error: null,
            message: defaultExportState.message,
            status: "idle",
          }
        : current,
    );
  }

  function handleExportFormatChange(format: ExportSettings["format"]) {
    setExportSettings((current) => ({ ...current, format }));
    setExportState((current) =>
      current.status === "error"
        ? {
            ...current,
            error: null,
            message: defaultExportState.message,
            status: "idle",
          }
        : current,
    );
  }

  function handleExportQualityChange(event: ChangeEvent<HTMLInputElement>) {
    const nextQuality = Number(event.currentTarget.value);

    setExportSettings((current) => ({
      ...current,
      quality: nextQuality,
    }));
  }

  function handleImportDragOver(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsImportDragActive(true);
  }

  function handleImportDragLeave(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsImportDragActive(false);
    }
  }

  function handleImportDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsImportDragActive(false);
    void importFiles(event.dataTransfer.files, "base");
  }

  function applyPreset(presetId: WatermarkPresetId) {
    const bounds = readPreviewBounds();
    setWatermark((current) => ({
      ...current,
      mode: presetId,
      position: bounds
        ? getPresetPosition(presetId, bounds.stage, bounds.overlay)
        : current.position,
    }));
  }

  function handleWatermarkPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!image) {
      return;
    }

    const stageRect = previewStageRef.current?.getBoundingClientRect();
    const overlayRect = watermarkOverlayRef.current?.getBoundingClientRect();

    if (!stageRect || stageRect.width <= 0 || stageRect.height <= 0) {
      return;
    }

    textDragStateRef.current = {
      pointerId: event.pointerId,
      stageRect: {
        left: stageRect.left,
        top: stageRect.top,
        width: stageRect.width,
        height: stageRect.height,
      },
      overlayBounds: { width: overlayRect?.width ?? 0, height: overlayRect?.height ?? 0 },
      offsetX: event.clientX - (stageRect.left + watermark.position.x * stageRect.width),
      offsetY: event.clientY - (stageRect.top + watermark.position.y * stageRect.height),
    };

    setIsWatermarkDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handleWatermarkPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const dragState = textDragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    setWatermark((current) => ({
      ...current,
      mode: "custom",
      position: clampWatermarkPosition(
        {
          x:
            (event.clientX - dragState.stageRect.left - dragState.offsetX) /
            dragState.stageRect.width,
          y:
            (event.clientY - dragState.stageRect.top - dragState.offsetY) /
            dragState.stageRect.height,
        },
        { width: dragState.stageRect.width, height: dragState.stageRect.height },
        dragState.overlayBounds,
      ),
    }));
  }

  function clearWatermarkDrag(event?: ReactPointerEvent<HTMLButtonElement>) {
    if (event && textDragStateRef.current?.pointerId === event.pointerId) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }

    textDragStateRef.current = null;
    setIsWatermarkDragging(false);
  }

  function handleLogoPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!image || !logoWatermark) {
      return;
    }

    const stageRect = previewStageRef.current?.getBoundingClientRect();

    if (!stageRect || stageRect.width <= 0 || stageRect.height <= 0) {
      return;
    }

    logoInteractionRef.current = {
      kind: "move",
      pointerId: event.pointerId,
      stageRect: {
        left: stageRect.left,
        top: stageRect.top,
        width: stageRect.width,
        height: stageRect.height,
      },
      offsetX: event.clientX - (stageRect.left + logoWatermark.position.x * stageRect.width),
      offsetY: event.clientY - (stageRect.top + logoWatermark.position.y * stageRect.height),
    };

    setLogoInteractionMode("move");
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handleLogoResizePointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!image || !logoImage || !logoWatermark) {
      return;
    }

    const stageRect = previewStageRef.current?.getBoundingClientRect();

    if (!stageRect || stageRect.width <= 0 || stageRect.height <= 0) {
      return;
    }

    logoInteractionRef.current = {
      kind: "resize",
      pointerId: event.pointerId,
      stageRect: {
        left: stageRect.left,
        top: stageRect.top,
        width: stageRect.width,
        height: stageRect.height,
      },
      position: logoWatermark.position,
      rotation: logoWatermark.rotation,
      aspectRatio: resolveAspectRatio(logoImage),
    };

    setLogoInteractionMode("resize");
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.stopPropagation();
  }

  function handleLogoPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const interaction = logoInteractionRef.current;

    if (!interaction || interaction.pointerId !== event.pointerId || !logoImage) {
      return;
    }

    if (interaction.kind === "move") {
      const aspectRatio = resolveAspectRatio(logoImage);

      setLogoWatermark((current) => {
        if (!current) {
          return current;
        }

        const overlayBounds = measureRotatedWatermarkBounds(
          getWatermarkBoundsForWidth(current.width, aspectRatio),
          current.rotation,
        );

        return {
          ...current,
          position: clampWatermarkPosition(
            {
              x:
                (event.clientX - interaction.stageRect.left - interaction.offsetX) /
                interaction.stageRect.width,
              y:
                (event.clientY - interaction.stageRect.top - interaction.offsetY) /
                interaction.stageRect.height,
            },
            {
              width: interaction.stageRect.width,
              height: interaction.stageRect.height,
            },
            overlayBounds,
          ),
        };
      });

      return;
    }

    const pointerVector = rotatePoint(
      {
        x:
          event.clientX -
          interaction.stageRect.left -
          interaction.position.x * interaction.stageRect.width,
        y:
          event.clientY -
          interaction.stageRect.top -
          interaction.position.y * interaction.stageRect.height,
      },
      -interaction.rotation,
    );
    const requestedWidth = Math.max(
      Math.abs(pointerVector.x) * 2,
      Math.abs(pointerVector.y) * 2 * interaction.aspectRatio,
    );

    setLogoWatermark((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        width: clampLogoWidthToPosition(
          requestedWidth,
          {
            width: interaction.stageRect.width,
            height: interaction.stageRect.height,
          },
          interaction.position,
          interaction.rotation,
          interaction.aspectRatio,
        ),
      };
    });
  }

  function clearLogoInteraction(event?: ReactPointerEvent<HTMLButtonElement>) {
    if (event && logoInteractionRef.current?.pointerId === event.pointerId) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }

    logoInteractionRef.current = null;
    setLogoInteractionMode("idle");
  }

  function removeLogo() {
    logoInteractionRef.current = null;
    setLogoInteractionMode("idle");
    setLogoImage(null);
    setLogoWatermark(null);
  }

  function readPreviewBounds() {
    if (!image) {
      return null;
    }

    const stageRect = previewStageRef.current?.getBoundingClientRect();
    const overlayRect = watermarkOverlayRef.current?.getBoundingClientRect();

    return {
      stage: {
        width: stageRect && stageRect.width > 0 ? stageRect.width : image.width,
        height: stageRect && stageRect.height > 0 ? stageRect.height : image.height,
      },
      overlay: {
        width: overlayRect?.width ?? 0,
        height: overlayRect?.height ?? 0,
      },
    };
  }

  function readStageBounds(sourceImage: Pick<ImportedImage, "width" | "height"> | null) {
    if (!sourceImage) {
      return null;
    }

    const stageRect = previewStageRef.current?.getBoundingClientRect();

    return {
      width: stageRect && stageRect.width > 0 ? stageRect.width : sourceImage.width,
      height: stageRect && stageRect.height > 0 ? stageRect.height : sourceImage.height,
    };
  }

  return (
    <div className="min-h-screen px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto flex max-w-[1700px] flex-col gap-5">
        <header className="panel-surface flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <p className="panel-label">Milestone 5</p>
            <div className="space-y-2">
              <h1 className="text-app-text text-3xl font-semibold tracking-tight sm:text-4xl">
                Image and text watermark editor
              </h1>
              <p className="text-muted max-w-3xl text-sm leading-6 sm:text-base">
                Apply a transparent logo watermark or text watermark, then move, rotate, size, and
                export the final composition locally.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill label={logoImage ? "Logo active" : "Single image"} tone="default" />
            <StatusPill label={getPresetLabel(watermark.mode)} tone="default" />
            <StatusPill
              label={isWatermarkDragging ? "Dragging text" : sessionStatus}
              tone={image ? "accent" : "default"}
            />
            <StatusPill label={logoStatus} tone={logoImage ? "accent" : "default"} />
            <StatusPill
              label={exportStatus}
              tone={exportState.status === "error" ? "default" : "accent"}
            />
            <ThemeToggle />
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-[18rem_minmax(0,1fr)_22rem]">
          <Panel
            eyebrow="Session"
            title="Watermark session"
            description="Preview state, text presets, and logo placement stay visible while you work."
          >
            <div className="space-y-4">
              <MetricCard label="Status" value={sessionStatus} />
              <MetricCard label="Text preset" value={getPresetLabel(watermark.mode)} />
              <MetricCard
                label="Text position"
                value={formatWatermarkPosition(watermark.position)}
              />
              <MetricCard label="Logo" value={logoImage ? logoImage.file.name : "No logo"} />
              <MetricCard label="Export" value={exportStatus} />
              <MetricCard
                label="Resolution"
                value={image ? `${image.width} x ${image.height}` : "No image"}
              />
              <InfoGroup title="Accepted formats" items={acceptedFormats} />
              <InfoGroup title="Workflow" items={workflowNotes} />
            </div>
          </Panel>

          <main className="panel-surface flex min-h-[42rem] flex-col gap-6 p-6">
            <WatermarkCanvas
              error={error}
              fileInputId={imageInputId}
              fileInputRef={fileInputRef}
              image={image}
              isImportDragActive={isImportDragActive}
              isLoading={isLoading}
              isLogoDragging={logoInteractionMode === "move"}
              isLogoResizing={logoInteractionMode === "resize"}
              isWatermarkDragging={isWatermarkDragging}
              logo={logoImage}
              logoFileInputId={logoInputId}
              logoFileInputRef={logoInputRef}
              logoWatermark={logoWatermark}
              openFilePicker={openFilePicker}
              openLogoPicker={openLogoPicker}
              previewStageRef={previewStageRef}
              selectedFileLabel={image ? image.file.name : "No file selected"}
              sessionStatus={sessionStatus}
              watermark={watermark}
              watermarkOverlayRef={watermarkOverlayRef}
              onDeleteLogo={removeLogo}
              onImportChange={handleInputChange}
              onImportDragLeave={handleImportDragLeave}
              onImportDragOver={handleImportDragOver}
              onImportDrop={handleImportDrop}
              onLogoImportChange={handleLogoInputChange}
              onLogoPointerDown={handleLogoPointerDown}
              onLogoPointerMove={handleLogoPointerMove}
              onLogoPointerUp={clearLogoInteraction}
              onLogoResizePointerDown={handleLogoResizePointerDown}
              onWatermarkPointerDown={handleWatermarkPointerDown}
              onWatermarkPointerMove={handleWatermarkPointerMove}
              onWatermarkPointerUp={clearWatermarkDrag}
            />
          </main>

          <div className="flex flex-col gap-5">
            <Panel
              eyebrow="Watermark"
              title="Watermark settings"
              description="Text and logo controls update the preview live while transforms stay clamped to the current image bounds."
            >
              <WatermarkInspector
                image={image}
                logo={logoImage}
                logoWatermark={logoWatermark}
                openFilePicker={openFilePicker}
                openLogoPicker={openLogoPicker}
                watermark={watermark}
                onApplyPreset={applyPreset}
                onDeleteLogo={removeLogo}
                onLogoWatermarkChange={setLogoWatermark}
                onWatermarkChange={setWatermark}
              />
            </Panel>

            <Panel
              eyebrow="Export"
              title="Export settings"
              description="Choose the output format, confirm the file name, and export the current preview to a desktop save location."
            >
              <ExportSettingsPanel
                fileName={exportSettings.fileName}
                format={exportSettings.format}
                image={image}
                quality={exportSettings.quality}
                state={exportState}
                onExport={handleExport}
                onFileNameChange={handleExportFileNameChange}
                onFormatChange={handleExportFormatChange}
                onQualityChange={handleExportQualityChange}
              />
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}

function resolveAspectRatio(image: ImportedImage) {
  return image.height > 0 ? image.width / image.height : 1;
}

function resolveInitialLogoWidth(
  logo: ImportedImage,
  stage: Pick<ImportedImage, "width" | "height">,
) {
  const aspectRatio = resolveAspectRatio(logo);
  const preferredWidth = clampNumber(stage.width * 0.22, 120, 300);
  const preferredHeight = clampNumber(stage.height * 0.16, 72, 180);

  return Math.min(preferredWidth, preferredHeight * aspectRatio);
}

function rotatePoint(point: { x: number; y: number }, rotation: number) {
  const radians = (rotation * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);

  return {
    x: point.x * cosine - point.y * sine,
    y: point.x * sine + point.y * cosine,
  };
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function resolveDefaultExportName(fileName: string) {
  const stem = fileName.replace(/\.[^/.]+$/, "").trim();

  return stem ? `${stem}-watermarked` : defaultExportSettings.fileName;
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-panel/80 rounded-2xl px-4 py-3">
      <p className="text-muted text-xs tracking-[0.2em] uppercase">{label}</p>
      <p className="text-app-text mt-2 text-base font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function InfoGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="border-outline/70 bg-panel/70 rounded-[1.25rem] border p-4">
      <p className="text-app-text text-sm font-semibold">{title}</p>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li
            key={item}
            className="bg-app-bg/70 text-muted rounded-2xl px-3 py-3 text-sm leading-6"
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function StatusPill({ label, tone }: { label: string; tone: "accent" | "default" }) {
  return (
    <span
      className={`rounded-full border px-3 py-2 text-xs font-semibold tracking-[0.2em] uppercase ${
        tone === "accent"
          ? "border-accent/40 bg-accent/10 text-accent"
          : "border-outline/80 bg-panel text-muted"
      }`}
    >
      {label}
    </span>
  );
}
