import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import {
  ExportSettingsPanel,
  type BatchQueueItemView,
} from "@/components/export/export-settings-panel";
import { Panel } from "@/components/layout/panel";
import { SectionCard } from "@/components/layout/section-card";
import { WorkspaceLayout } from "@/components/layout/workspace-layout";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  AppMarkIcon,
  ExportIcon,
  ImageFileIcon,
  KeyboardIcon,
  LogoMarkIcon,
  PresetIcon,
  RedoIcon,
  TextToolIcon,
  UndoIcon,
} from "@/components/ui/app-icons";
import { IconAction } from "@/components/ui/icon-action";
import { WatermarkCanvas } from "@/components/watermark/watermark-canvas";
import { WatermarkInspector } from "@/components/watermark/watermark-inspector";
import type { LogoWatermarkState, TextWatermarkState } from "@/components/watermark/types";
import {
  buildExportFileName,
  buildOutputPath,
  exportWatermarkedImage,
  exportWatermarkedImageToPath,
  pickExportFolder,
  type ExportSettings,
} from "@/lib/export";
import {
  ACCEPTED_IMAGE_INPUT,
  MULTIPLE_IMAGE_ERROR,
  createImportedImage,
  validateImageFile,
  type ImportedImage,
} from "@/lib/image-import";
import {
  createPresetName,
  loadSavedPresets,
  savePresets,
  type SavedWatermarkPreset,
} from "@/lib/preset-storage";
import {
  clampLogoWidthToPosition,
  clampWatermarkPosition,
  fitLogoWidthToStage,
  getPresetPosition,
  getWatermarkBoundsForWidth,
  measureRotatedWatermarkBounds,
  type WatermarkBounds,
  WATERMARK_PRESETS,
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

type BatchQueueItem = {
  error: string | null;
  file: File;
  id: string;
  outputPath: string | null;
  status: BatchQueueItemView["status"];
};

const exportFormatHint = "PNG preserves transparent edges for clean logo marks.";

const workflowNotes = [
  "Upload a base image, then add text and an optional logo watermark.",
  "Save presets after tuning opacity, rotation, and placement so new sessions start faster.",
  "Use before/after preview mode to validate readability before single or batch export.",
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
const defaultBatchMessage =
  "Add images, choose an output folder, then run batch export with the current watermark config.";
const ONBOARDING_STORAGE_KEY = "watermark-onboarding-complete";
const PRESET_LIMIT_MESSAGE = "Preset limit reached. Delete one preset before saving another.";
const keyboardShortcutHints = [
  "Ctrl/Cmd + O: choose base image",
  "Ctrl/Cmd + Shift + O: choose logo watermark",
  "Ctrl/Cmd + E: export current image",
  "1-7: apply text position presets",
  "B: toggle before or after preview",
];

export function AppShell() {
  const imageInputId = useId();
  const logoInputId = useId();
  const batchInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const batchInputRef = useRef<HTMLInputElement>(null);
  const previewStageRef = useRef<HTMLDivElement>(null);
  const watermarkOverlayRef = useRef<HTMLButtonElement>(null);
  const textDragStateRef = useRef<TextDragState | null>(null);
  const logoInteractionRef = useRef<LogoInteractionState | null>(null);
  const previewModeBeforeHoldRef = useRef<"after" | "before" | null>(null);
  const imageRef = useRef<ImportedImage | null>(null);
  const openFilePickerShortcutRef = useRef<() => void>(() => {});
  const openLogoPickerShortcutRef = useRef<() => void>(() => {});
  const exportShortcutRef = useRef<() => void>(() => {});
  const applyPresetShortcutRef = useRef<(presetId: WatermarkPresetId) => void>(() => {});
  const togglePreviewShortcutRef = useRef<() => void>(() => {});

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
  const [batchQueue, setBatchQueue] = useState<BatchQueueItem[]>([]);
  const [batchOutputFolder, setBatchOutputFolder] = useState<string | null>(null);
  const [batchMessage, setBatchMessage] = useState(defaultBatchMessage);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [exportSettings, setExportSettings] = useState<ExportSettings>(defaultExportSettings);
  const [exportState, setExportState] = useState<ExportState>(defaultExportState);
  const [watermark, setWatermark] = useState<TextWatermarkState>(defaultTextWatermark);
  const [previewMode, setPreviewMode] = useState<"after" | "before">("after");
  const [canvasViewScale, setCanvasViewScale] = useState(1);
  const [savedPresets, setSavedPresets] = useState<SavedWatermarkPreset[]>(() =>
    loadSavedPresets(),
  );
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [activeWatermarkType, setActiveWatermarkType] = useState<"logo" | "text">("text");
  const [presetFeedback, setPresetFeedback] = useState(
    "Save a preset to reuse the same text and logo settings.",
  );
  const [showOnboarding, setShowOnboarding] = useState(() => shouldShowOnboarding());
  const [leftRailView, setLeftRailView] = useState<"files" | "presets" | "shortcuts">("files");

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
      const safeCanvasScale =
        Number.isFinite(canvasViewScale) && canvasViewScale > 0 ? canvasViewScale : 1;
      const stageRect = previewStageRef.current?.getBoundingClientRect();
      const stage = {
        width: stageRect && stageRect.width > 0 ? stageRect.width / safeCanvasScale : image.width,
        height:
          stageRect && stageRect.height > 0 ? stageRect.height / safeCanvasScale : image.height,
      };

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
  }, [canvasViewScale, image, logoImage, logoWatermark?.rotation, logoWatermark?.width]);

  useEffect(() => {
    if (!image) {
      return;
    }

    setExportSettings((current) => ({
      ...current,
      fileName: resolveDefaultExportName(image.file.name),
    }));
  }, [image]);

  useEffect(() => {
    if (!image) {
      setCanvasViewScale(1);
    }
  }, [image]);

  useEffect(() => {
    savePresets(savedPresets);
  }, [savedPresets]);

  useEffect(() => {
    if (!activePresetId) {
      return;
    }

    if (!savedPresets.some((preset) => preset.id === activePresetId)) {
      setActivePresetId(null);
    }
  }, [activePresetId, savedPresets]);

  const sessionStatus = image
    ? "Preview ready"
    : isLoading
      ? "Reading image"
      : error
        ? "Needs attention"
        : "Awaiting image";

  const exportStatus =
    exportState.status === "saving"
      ? "Exporting"
      : exportState.status === "success"
        ? "Saved locally"
        : exportState.status === "error"
          ? "Export error"
          : "Ready to export";
  const batchStatus = isBatchRunning
    ? "Batch running"
    : batchQueue.length === 0
      ? "Queue empty"
      : `${batchQueue.length} queued`;
  const previewStatus = previewMode === "before" ? "Before view" : "After view";
  const suggestedPresetName = createPresetName(savedPresets);
  const canQuickExport = Boolean(image) && exportState.status !== "saving";
  const quickExportLabel = exportState.status === "saving" ? "Quick exporting..." : "Quick export";
  const recentPresets = savedPresets.slice(0, 6);
  const statusHint =
    activeWatermarkType === "logo"
      ? "Tip: drag the logo on canvas, then resize from corners."
      : "Tip: drag text directly on the canvas to fine-tune placement.";

  imageRef.current = image;
  openFilePickerShortcutRef.current = openFilePicker;
  openLogoPickerShortcutRef.current = openLogoPicker;
  exportShortcutRef.current = () => {
    if (imageRef.current) {
      void handleExport();
    }
  };
  applyPresetShortcutRef.current = applyPreset;
  togglePreviewShortcutRef.current = togglePreviewMode;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const isPrimaryModifier = event.ctrlKey || event.metaKey;
      const isEditable = isEditableTarget(event.target);

      if (isPrimaryModifier && key === "o") {
        event.preventDefault();

        if (event.shiftKey) {
          openLogoPickerShortcutRef.current();
        } else {
          openFilePickerShortcutRef.current();
        }

        return;
      }

      if (isPrimaryModifier && !event.shiftKey && key === "e") {
        if (isEditable) {
          return;
        }

        if (!imageRef.current) {
          return;
        }

        event.preventDefault();
        exportShortcutRef.current();

        return;
      }

      if (isPrimaryModifier || event.altKey || isEditable) {
        return;
      }

      if (key === "b") {
        event.preventDefault();
        togglePreviewShortcutRef.current();
        return;
      }

      if (/^[1-7]$/.test(event.key)) {
        const presetIndex = Number(event.key) - 1;
        const preset = WATERMARK_PRESETS[presetIndex];

        if (!preset) {
          return;
        }

        event.preventDefault();
        applyPresetShortcutRef.current(preset.id);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

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
        setActiveWatermarkType("logo");
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

  function openBatchFilePicker() {
    batchInputRef.current?.click();
  }

  async function handleBatchFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    event.target.value = "";

    await enqueueBatchFiles(files);
  }

  async function enqueueBatchFiles(source: FileList | File[] | null) {
    const files = source ? Array.from(source) : [];

    if (files.length === 0) {
      return;
    }

    const nextQueueItems = files.map((file, index) => {
      const validationError = validateImageFile(file);

      return {
        error: validationError,
        file,
        id: createBatchQueueId(file, index),
        outputPath: null,
        status: validationError ? "failed" : "queued",
      } satisfies BatchQueueItem;
    });

    setBatchQueue((current) => [...current, ...nextQueueItems]);

    const validItems = nextQueueItems.filter((item) => item.status === "queued");
    const invalidCount = nextQueueItems.length - validItems.length;
    setBatchMessage(
      invalidCount > 0
        ? `Added ${validItems.length} files to queue. ${invalidCount} files were rejected.`
        : `Added ${validItems.length} files to queue.`,
    );

    if (image || validItems.length === 0) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const firstImage = await createImportedImage(validItems[0].file);
      setImage(firstImage);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong while preparing the preview image.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSelectBatchOutputFolder() {
    try {
      const folderPath = await pickExportFolder();

      if (!folderPath) {
        setBatchMessage("Output folder selection canceled.");
        return;
      }

      setBatchOutputFolder(folderPath);
      setBatchMessage("Output folder selected. You can now run batch export.");
    } catch (caughtError) {
      setBatchMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Output folder selection failed. Try again.",
      );
    }
  }

  function clearBatchQueue() {
    if (isBatchRunning) {
      return;
    }

    setBatchQueue([]);
    setBatchMessage(defaultBatchMessage);
  }

  async function handleRunBatchExport() {
    if (isBatchRunning) {
      return;
    }

    if (batchQueue.length === 0) {
      setBatchMessage("Batch queue is empty. Add images before running export.");
      return;
    }

    if (!batchOutputFolder) {
      setBatchMessage("Choose an output folder before running batch export.");
      return;
    }

    const targets = batchQueue.filter(
      (item) => item.status === "queued" || item.status === "failed",
    );

    if (targets.length === 0) {
      setBatchMessage("No pending files found. Clear queue or add more files.");
      return;
    }

    setIsBatchRunning(true);
    setBatchMessage(`Preparing batch export for ${targets.length} files.`);

    let stageForBatch =
      readStageBounds(image) ?? (image ? { width: image.width, height: image.height } : null);

    if (!stageForBatch) {
      try {
        const fallbackImage = await createImportedImage(targets[0].file);
        stageForBatch = { height: fallbackImage.height, width: fallbackImage.width };
        URL.revokeObjectURL(fallbackImage.previewUrl);
      } catch {
        stageForBatch = { height: 1080, width: 1920 };
      }
    }

    const usedOutputNames = new Set<string>();
    let successCount = 0;
    let failedCount = 0;

    try {
      for (const [index, item] of targets.entries()) {
        setBatchQueue((current) =>
          current.map((entry) =>
            entry.id === item.id
              ? { ...entry, error: null, outputPath: null, status: "processing" }
              : entry,
          ),
        );
        setBatchMessage(`Processing ${index + 1}/${targets.length}: ${item.file.name}`);
        await waitForUiFrame();

        let importedImage: ImportedImage | null = null;

        try {
          importedImage = await createImportedImage(item.file);
          const suggestedName = buildExportFileName(
            resolveDefaultExportName(item.file.name),
            exportSettings.format,
          );
          const outputFileName = ensureUniqueFileName(suggestedName, usedOutputNames);
          const outputPath = buildOutputPath(batchOutputFolder, outputFileName);
          const result = await exportWatermarkedImageToPath({
            image: importedImage,
            logo: logoImage,
            logoWatermark,
            outputPath,
            previewStageSize: stageForBatch,
            settings: {
              ...exportSettings,
              fileName: outputFileName,
            },
            watermark,
          });

          successCount += 1;
          setBatchQueue((current) =>
            current.map((entry) =>
              entry.id === item.id
                ? { ...entry, error: null, outputPath: result.path, status: "success" }
                : entry,
            ),
          );
        } catch (caughtError) {
          failedCount += 1;
          const message =
            caughtError instanceof Error ? caughtError.message : "Export failed for this file.";
          setBatchQueue((current) =>
            current.map((entry) =>
              entry.id === item.id
                ? { ...entry, error: message, outputPath: null, status: "failed" }
                : entry,
            ),
          );
        } finally {
          if (importedImage) {
            URL.revokeObjectURL(importedImage.previewUrl);
          }
        }
      }
    } finally {
      setIsBatchRunning(false);
    }

    setBatchMessage(`Batch completed. ${successCount} succeeded, ${failedCount} failed.`);
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

  function saveCurrentPreset(name: string) {
    const cleanedName = name.trim();

    if (!cleanedName) {
      setPresetFeedback("Enter a preset name before saving.");
      return;
    }

    if (savedPresets.length >= 30) {
      setPresetFeedback(PRESET_LIMIT_MESSAGE);
      return;
    }

    const timestamp = Date.now();
    const newPreset: SavedWatermarkPreset = {
      createdAt: timestamp,
      id: createPresetId(),
      logoWatermark: logoWatermark ? cloneLogoWatermark(logoWatermark) : null,
      name: cleanedName,
      updatedAt: timestamp,
      watermark: cloneTextWatermark(watermark),
    };

    setSavedPresets((current) => [newPreset, ...current]);
    setActivePresetId(newPreset.id);
    setPresetFeedback(`Saved "${cleanedName}".`);
  }

  function loadSavedPreset(presetId: string) {
    const preset = savedPresets.find((item) => item.id === presetId);

    if (!preset) {
      setPresetFeedback("Preset not found.");
      return;
    }

    setWatermark(cloneTextWatermark(preset.watermark));
    setLogoWatermark(preset.logoWatermark ? cloneLogoWatermark(preset.logoWatermark) : null);
    setActiveWatermarkType(preset.logoWatermark ? "logo" : "text");
    setPreviewMode("after");
    setActivePresetId(preset.id);
    setPresetFeedback(`Loaded "${preset.name}".`);
  }

  function renameSavedPreset(presetId: string, name: string) {
    const cleanedName = name.trim();

    if (!cleanedName) {
      setPresetFeedback("Preset name cannot be empty.");
      return;
    }

    let renamed = false;
    setSavedPresets((current) =>
      current.map((preset) => {
        if (preset.id !== presetId) {
          return preset;
        }

        renamed = true;

        return {
          ...preset,
          name: cleanedName,
          updatedAt: Date.now(),
        };
      }),
    );

    if (renamed) {
      setPresetFeedback(`Renamed preset to "${cleanedName}".`);
    }
  }

  function deleteSavedPreset(presetId: string) {
    const removedPreset = savedPresets.find((preset) => preset.id === presetId);

    setSavedPresets((current) => current.filter((preset) => preset.id !== presetId));

    if (activePresetId === presetId) {
      setActivePresetId(null);
    }

    setPresetFeedback(
      removedPreset ? `Deleted "${removedPreset.name}".` : "Preset removed from the list.",
    );
  }

  function togglePreviewMode() {
    setPreviewMode((current) => (current === "after" ? "before" : "after"));
  }

  function setPreviewToBefore() {
    setPreviewMode("before");
  }

  function setPreviewToAfter() {
    setPreviewMode("after");
  }

  function handleBeforePeekStart() {
    previewModeBeforeHoldRef.current = previewMode;
    setPreviewMode("before");
  }

  function handleBeforePeekEnd() {
    if (!previewModeBeforeHoldRef.current) {
      return;
    }

    setPreviewMode(previewModeBeforeHoldRef.current);
    previewModeBeforeHoldRef.current = null;
  }

  function dismissOnboarding() {
    setShowOnboarding(false);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "done");
    }
  }

  function handleWatermarkPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!image) {
      return;
    }
    setActiveWatermarkType("text");

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
    setActiveWatermarkType("logo");

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
    setActiveWatermarkType("logo");

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
    setActiveWatermarkType("text");
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
    const safeCanvasScale =
      Number.isFinite(canvasViewScale) && canvasViewScale > 0 ? canvasViewScale : 1;

    return {
      width:
        stageRect && stageRect.width > 0 ? stageRect.width / safeCanvasScale : sourceImage.width,
      height:
        stageRect && stageRect.height > 0 ? stageRect.height / safeCanvasScale : sourceImage.height,
    };
  }

  return (
    <>
      <input
        id={batchInputId}
        ref={batchInputRef}
        type="file"
        accept={ACCEPTED_IMAGE_INPUT}
        multiple
        className="sr-only"
        aria-label="Choose batch image files"
        onChange={handleBatchFileInputChange}
      />

      <WorkspaceLayout
        topBar={
          <header className="panel-surface flex h-full items-center justify-between gap-2 px-3">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="sr-only">Portfolio-ready watermark editor</h1>
              <div className="border-outline/60 bg-accent/12 text-accent flex h-8 w-8 items-center justify-center rounded-lg border">
                <AppMarkIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="panel-label">Watermark app</p>
                <p className="text-app-text truncate text-sm font-semibold tracking-wide">
                  Watermark Editor
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <IconAction
                label={image ? "Replace image" : "Choose image"}
                icon={<ImageFileIcon className="h-4 w-4" />}
                compact
                tone="accent"
                onClick={openFilePicker}
              />
              <IconAction
                label={logoImage ? "Replace logo" : "Choose logo"}
                icon={<LogoMarkIcon className="h-4 w-4" />}
                compact
                onClick={openLogoPicker}
              />
              <IconAction
                label="Undo"
                icon={<UndoIcon className="h-4 w-4" />}
                compact
                disabled
                onClick={() => {}}
              />
              <IconAction
                label="Redo"
                icon={<RedoIcon className="h-4 w-4" />}
                compact
                disabled
                onClick={() => {}}
              />
              <IconAction
                label="Toggle compare"
                icon={<TextToolIcon className="h-4 w-4" />}
                compact
                active={previewMode === "before"}
                onClick={togglePreviewMode}
              />
              <IconAction
                label={quickExportLabel}
                icon={<ExportIcon className="h-4 w-4" />}
                compact
                disabled={!canQuickExport}
                tone="accent"
                onClick={() => {
                  void handleExport();
                }}
              />
              <ThemeToggle compact />
            </div>
          </header>
        }
        leftSidebar={
          <Panel
            eyebrow="Sidebar"
            title="Watermark session"
            description="Core actions and quick navigation."
            className="h-full"
          >
            <div className="space-y-2">
              <div className="tool-subtle grid grid-cols-3 gap-1 rounded-lg border p-1">
                <RailTabButton
                  isActive={leftRailView === "files"}
                  label="Files"
                  icon={<ImageFileIcon className="h-4 w-4" />}
                  onClick={() => {
                    setLeftRailView("files");
                  }}
                />
                <RailTabButton
                  isActive={leftRailView === "presets"}
                  label="Presets"
                  icon={<PresetIcon className="h-4 w-4" />}
                  onClick={() => {
                    setLeftRailView("presets");
                  }}
                />
                <RailTabButton
                  isActive={leftRailView === "shortcuts"}
                  label="Shortcuts"
                  icon={<KeyboardIcon className="h-4 w-4" />}
                  onClick={() => {
                    setLeftRailView("shortcuts");
                  }}
                />
              </div>

              {leftRailView === "files" ? (
                <div className="space-y-2">
                  <SectionCard title="Source files">
                    <MetadataPair
                      label="Base image"
                      value={image ? image.file.name : "Not selected"}
                    />
                    <MetadataPair
                      label="Logo image"
                      value={logoImage ? logoImage.file.name : "Not selected"}
                    />
                    <div className="grid grid-cols-2 gap-1.5">
                      <IconAction
                        label={image ? "Replace image" : "Choose image"}
                        icon={<ImageFileIcon className="h-4 w-4" />}
                        className="justify-center"
                        onClick={openFilePicker}
                      />
                      <IconAction
                        label={logoImage ? "Replace logo" : "Choose logo"}
                        icon={<LogoMarkIcon className="h-4 w-4" />}
                        className="justify-center"
                        onClick={openLogoPicker}
                      />
                    </div>
                  </SectionCard>

                  <SectionCard title="Watermark type">
                    <div className="grid grid-cols-2 gap-1.5">
                      <ModeButton
                        isActive={activeWatermarkType === "text"}
                        label="Text"
                        icon={<TextToolIcon className="h-4 w-4" />}
                        onClick={() => {
                          setActiveWatermarkType("text");
                        }}
                      />
                      <ModeButton
                        isActive={activeWatermarkType === "logo"}
                        label="Logo"
                        icon={<LogoMarkIcon className="h-4 w-4" />}
                        onClick={() => {
                          setActiveWatermarkType("logo");
                          if (!logoImage) {
                            openLogoPicker();
                          }
                        }}
                      />
                    </div>
                  </SectionCard>
                </div>
              ) : null}

              {leftRailView === "presets" ? (
                <SectionCard title="Recent presets">
                  <MetadataPair label="Saved" value={`${savedPresets.length}`} />
                  <MetadataPair
                    label="Active"
                    value={
                      activePresetId
                        ? (savedPresets.find((preset) => preset.id === activePresetId)?.name ??
                          "Unknown")
                        : "None"
                    }
                  />
                  {recentPresets.length > 0 ? (
                    <div className="space-y-1.5">
                      {recentPresets.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          className={`tool-subtle w-full rounded-lg border px-2.5 py-2 text-left transition ${
                            preset.id === activePresetId ? "border-accent/50 bg-accent/12" : ""
                          }`}
                          onClick={() => {
                            loadSavedPreset(preset.id);
                          }}
                        >
                          <p className="text-app-text truncate text-xs font-semibold">
                            {preset.name}
                          </p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted text-xs">No presets yet.</p>
                  )}
                </SectionCard>
              ) : null}

              {leftRailView === "shortcuts" ? (
                <SectionCard title="Session hints">
                  <div className="space-y-1.5">
                    {keyboardShortcutHints.map((item) => (
                      <p
                        key={item}
                        className="tool-subtle rounded-lg border px-2.5 py-2 text-[0.72rem]"
                      >
                        {item}
                      </p>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    {workflowNotes.slice(0, 2).map((item) => (
                      <p
                        key={item}
                        className="tool-subtle rounded-lg border px-2.5 py-2 text-[0.72rem]"
                      >
                        {item}
                      </p>
                    ))}
                  </div>
                  <p className="tool-subtle rounded-lg border px-2.5 py-2 text-[0.72rem]">
                    {exportFormatHint}
                  </p>
                </SectionCard>
              ) : null}

              {showOnboarding ? (
                <SectionCard title="First run" description="Fast start">
                  <div className="grid grid-cols-2 gap-1.5">
                    <IconAction
                      label="Choose image"
                      icon={<ImageFileIcon className="h-4 w-4" />}
                      className="justify-center"
                      tone="accent"
                      onClick={openFilePicker}
                    />
                    <IconAction
                      label="Dismiss guide"
                      icon={<AppMarkIcon className="h-4 w-4" />}
                      className="justify-center"
                      onClick={dismissOnboarding}
                    />
                  </div>
                </SectionCard>
              ) : null}
            </div>
          </Panel>
        }
        centerStage={
          <section className="panel-surface flex h-full min-h-0 min-w-0 flex-col overflow-hidden p-3">
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <WatermarkCanvas
                activeWatermarkType={activeWatermarkType}
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
                previewMode={previewMode}
                selectedFileLabel={image ? image.file.name : "No file selected"}
                sessionStatus={sessionStatus}
                watermark={watermark}
                watermarkOverlayRef={watermarkOverlayRef}
                onBeforePeekEnd={handleBeforePeekEnd}
                onBeforePeekStart={handleBeforePeekStart}
                onCanvasViewScaleChange={setCanvasViewScale}
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
                onPreviewAfter={setPreviewToAfter}
                onPreviewBefore={setPreviewToBefore}
                onWatermarkPointerDown={handleWatermarkPointerDown}
                onWatermarkPointerMove={handleWatermarkPointerMove}
                onWatermarkPointerUp={clearWatermarkDrag}
              />
            </div>
          </section>
        }
        rightSidebar={
          <div className="grid h-full min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
            <Panel
              eyebrow="Inspector"
              title="Watermark settings"
              description="Compact editing controls."
            >
              <SectionCard
                title={
                  activeWatermarkType === "logo"
                    ? "Logo watermark selected"
                    : "Text watermark selected"
                }
                description={statusHint}
                className={activeWatermarkType === "logo" ? "border-accent/40" : "border-accent/30"}
              >
                <div className="grid grid-cols-2 gap-2">
                  <ModeButton
                    isActive={activeWatermarkType === "text"}
                    label="Edit text"
                    icon={<TextToolIcon className="h-4 w-4" />}
                    onClick={() => {
                      setActiveWatermarkType("text");
                    }}
                  />
                  <ModeButton
                    isActive={activeWatermarkType === "logo"}
                    label="Edit logo"
                    icon={<LogoMarkIcon className="h-4 w-4" />}
                    onClick={() => {
                      setActiveWatermarkType("logo");
                      if (!logoImage) {
                        openLogoPicker();
                      }
                    }}
                  />
                </div>
                <MetadataPair
                  label="Current overlay"
                  value={
                    activeWatermarkType === "logo"
                      ? logoImage
                        ? logoImage.file.name
                        : "No logo selected"
                      : watermark.text || "No watermark text"
                  }
                />
              </SectionCard>

              <WatermarkInspector
                activePresetId={activePresetId}
                image={image}
                logo={logoImage}
                logoWatermark={logoWatermark}
                openFilePicker={openFilePicker}
                openLogoPicker={openLogoPicker}
                presetFeedback={presetFeedback}
                savedPresets={savedPresets}
                suggestedPresetName={suggestedPresetName}
                watermark={watermark}
                onApplyPreset={applyPreset}
                onDeleteLogo={removeLogo}
                onDeleteSavedPreset={deleteSavedPreset}
                onLoadSavedPreset={loadSavedPreset}
                onLogoWatermarkChange={setLogoWatermark}
                onRenameSavedPreset={renameSavedPreset}
                onSavePreset={saveCurrentPreset}
                onWatermarkChange={setWatermark}
              />
            </Panel>

            <Panel eyebrow="Output" title="Export settings" description="Single and batch output.">
              <ExportSettingsPanel
                batchItems={batchQueue.map((item) => ({
                  error: item.error,
                  fileName: item.file.name,
                  id: item.id,
                  outputPath: item.outputPath,
                  status: item.status,
                }))}
                batchMessage={batchMessage}
                batchOutputFolder={batchOutputFolder}
                fileName={exportSettings.fileName}
                format={exportSettings.format}
                image={image}
                isBatchRunning={isBatchRunning}
                onAddBatchFiles={openBatchFilePicker}
                onClearBatchQueue={clearBatchQueue}
                quality={exportSettings.quality}
                state={exportState}
                onExport={handleExport}
                onFileNameChange={handleExportFileNameChange}
                onFormatChange={handleExportFormatChange}
                onQualityChange={handleExportQualityChange}
                onRunBatchExport={handleRunBatchExport}
                onSelectBatchOutputFolder={handleSelectBatchOutputFolder}
              />
            </Panel>
          </div>
        }
        statusBar={
          <footer
            className="panel-surface flex h-full items-center gap-1.5 px-2.5"
            aria-live="polite"
          >
            <StatusRailItem
              label="Zoom"
              value={image ? `${Math.round(canvasViewScale * 100)}%` : "No image"}
            />
            <StatusRailItem
              label="Image"
              value={image ? `${image.width} x ${image.height}` : "No image loaded"}
            />
            <StatusRailItem
              label="Export"
              value={exportStatus}
              tone={exportState.status === "error" ? "default" : "accent"}
            />
            <StatusRailItem label="Queue" value={batchStatus} />
            <StatusRailItem label="Preview" value={previewStatus} className="ml-auto" />
          </footer>
        }
      />
    </>
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

function createBatchQueueId(file: File, index: number) {
  return `${file.name}-${file.lastModified}-${file.size}-${index}-${Date.now()}`;
}

function ensureUniqueFileName(fileName: string, usedNames: Set<string>) {
  if (!usedNames.has(fileName)) {
    usedNames.add(fileName);
    return fileName;
  }

  const extensionIndex = fileName.lastIndexOf(".");
  const stem = extensionIndex >= 0 ? fileName.slice(0, extensionIndex) : fileName;
  const extension = extensionIndex >= 0 ? fileName.slice(extensionIndex) : "";
  let counter = 2;
  let candidate = `${stem}-${counter}${extension}`;

  while (usedNames.has(candidate)) {
    counter += 1;
    candidate = `${stem}-${counter}${extension}`;
  }

  usedNames.add(candidate);
  return candidate;
}

function waitForUiFrame() {
  return new Promise<void>((resolve) => {
    window.setTimeout(() => resolve(), 0);
  });
}

function shouldShowOnboarding() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(ONBOARDING_STORAGE_KEY) !== "done";
}

function createPresetId() {
  if (typeof window !== "undefined" && "crypto" in window && "randomUUID" in window.crypto) {
    return window.crypto.randomUUID();
  }

  return `preset-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
}

function cloneTextWatermark(watermark: TextWatermarkState): TextWatermarkState {
  return {
    ...watermark,
    position: { ...watermark.position },
  };
}

function cloneLogoWatermark(logoWatermark: LogoWatermarkState): LogoWatermarkState {
  return {
    ...logoWatermark,
    position: { ...logoWatermark.position },
  };
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select";
}

function MetadataPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-outline/70 bg-app-bg/70 rounded-xl border px-3 py-2">
      <p className="text-muted text-[0.64rem] font-semibold tracking-[0.2em] uppercase">{label}</p>
      <p className="text-app-text mt-1 text-sm leading-6 font-semibold break-all">{value}</p>
    </div>
  );
}

function RailTabButton({
  isActive,
  label,
  icon,
  onClick,
}: {
  isActive: boolean;
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      aria-label={label}
      title={label}
      className={`rounded-md px-2 py-2 transition ${
        isActive ? "bg-accent/18 text-app-text" : "text-muted hover:bg-panel/70 hover:text-app-text"
      }`}
      onClick={onClick}
    >
      <span className="flex items-center justify-center">{icon}</span>
    </button>
  );
}

function ModeButton({
  isActive,
  label,
  icon,
  onClick,
}: {
  isActive: boolean;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      className={`rounded-lg border px-2.5 py-2 text-xs font-semibold transition ${
        isActive
          ? "border-accent/45 bg-accent/12 text-app-text"
          : "border-outline/80 bg-app-bg text-muted hover:border-accent/35 hover:text-app-text"
      }`}
      onClick={onClick}
    >
      <span className="flex items-center justify-center gap-1.5">
        {icon ? <span>{icon}</span> : null}
        <span>{label}</span>
      </span>
    </button>
  );
}

function StatusRailItem({
  label,
  value,
  tone = "default",
  className = "",
}: {
  label: string;
  value: string;
  tone?: "accent" | "default";
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border px-2.5 py-1.5 ${className} ${
        tone === "accent" ? "border-accent/45 bg-accent/12" : "border-outline/70 bg-panel/72"
      }`}
    >
      <p className="text-muted text-[0.56rem] font-semibold tracking-[0.2em] uppercase">{label}</p>
      <p className="text-app-text mt-0.5 text-[0.72rem] leading-4 font-semibold break-all">
        {value}
      </p>
    </div>
  );
}
