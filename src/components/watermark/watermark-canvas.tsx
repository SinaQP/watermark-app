import {
  useEffect,
  useState,
  type ChangeEvent,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  type WheelEvent as ReactWheelEvent,
} from "react";

import { ACCEPTED_IMAGE_INPUT, formatFileSize, type ImportedImage } from "@/lib/image-import";
import { formatOpacity, formatRotation } from "@/lib/text-watermark";
import { getTextWatermarkOverlayStyle } from "@/lib/watermark-render";

import type { LogoWatermarkState, TextWatermarkState } from "./types";

type WatermarkCanvasProps = {
  activeWatermarkType: "logo" | "text";
  error: string | null;
  fileInputId: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  image: ImportedImage | null;
  isImportDragActive: boolean;
  isLoading: boolean;
  isLogoDragging: boolean;
  isLogoResizing: boolean;
  isWatermarkDragging: boolean;
  logo: ImportedImage | null;
  logoFileInputId: string;
  logoFileInputRef: RefObject<HTMLInputElement | null>;
  logoWatermark: LogoWatermarkState | null;
  openFilePicker: () => void;
  openLogoPicker: () => void;
  previewStageRef: RefObject<HTMLDivElement | null>;
  previewMode: "after" | "before";
  selectedFileLabel: string;
  sessionStatus: string;
  watermark: TextWatermarkState;
  watermarkOverlayRef: RefObject<HTMLButtonElement | null>;
  onBeforePeekEnd: () => void;
  onBeforePeekStart: () => void;
  onCanvasViewScaleChange: (scale: number) => void;
  onDeleteLogo: () => void;
  onImportChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onImportDragLeave: (event: DragEvent<HTMLElement>) => void;
  onImportDragOver: (event: DragEvent<HTMLElement>) => void;
  onImportDrop: (event: DragEvent<HTMLElement>) => void;
  onLogoImportChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onLogoPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onLogoPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onLogoPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onLogoResizePointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPreviewAfter: () => void;
  onPreviewBefore: () => void;
  onWatermarkPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onWatermarkPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onWatermarkPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => void;
};

const MIN_ZOOM_SCALE = 0.45;
const MAX_ZOOM_SCALE = 3;
const ZOOM_STEP = 0.12;

const logoResizeHandles = [
  {
    id: "top-left",
    ariaLabel: "Resize logo watermark from top left",
    className: "-left-2.5 -top-2.5 cursor-nwse-resize",
  },
  {
    id: "top-right",
    ariaLabel: "Resize logo watermark from top right",
    className: "-right-2.5 -top-2.5 cursor-nesw-resize",
  },
  {
    id: "bottom-left",
    ariaLabel: "Resize logo watermark from bottom left",
    className: "-bottom-2.5 -left-2.5 cursor-nesw-resize",
  },
  {
    id: "bottom-right",
    ariaLabel: "Resize logo watermark from bottom right",
    className: "-bottom-2.5 -right-2.5 cursor-nwse-resize",
  },
] as const;

export function WatermarkCanvas({
  activeWatermarkType,
  error,
  fileInputId,
  fileInputRef,
  image,
  isImportDragActive,
  isLoading,
  isLogoDragging,
  isLogoResizing,
  isWatermarkDragging,
  logo,
  logoFileInputId,
  logoFileInputRef,
  logoWatermark,
  openFilePicker,
  openLogoPicker,
  previewStageRef,
  previewMode,
  selectedFileLabel,
  sessionStatus,
  watermark,
  watermarkOverlayRef,
  onBeforePeekEnd,
  onBeforePeekStart,
  onCanvasViewScaleChange,
  onDeleteLogo,
  onImportChange,
  onImportDragLeave,
  onImportDragOver,
  onImportDrop,
  onLogoImportChange,
  onLogoPointerDown,
  onLogoPointerMove,
  onLogoPointerUp,
  onLogoResizePointerDown,
  onPreviewAfter,
  onPreviewBefore,
  onWatermarkPointerDown,
  onWatermarkPointerMove,
  onWatermarkPointerUp,
}: WatermarkCanvasProps) {
  const hasWatermarkText = previewMode === "after" && watermark.text.trim().length > 0;
  const hasLogoOverlay = previewMode === "after" && Boolean(logo && logoWatermark);
  const logoAspectRatio = logo ? resolveAspectRatio(logo) : 1;
  const logoHeight = logoWatermark ? logoWatermark.width / logoAspectRatio : 0;
  const [zoomScale, setZoomScale] = useState(1);
  const [isTextHovered, setIsTextHovered] = useState(false);
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  const [showInteractionHint, setShowInteractionHint] = useState(true);

  const isTransforming = isWatermarkDragging || isLogoDragging || isLogoResizing;
  const isTextSelected = activeWatermarkType === "text";
  const isLogoSelected = activeWatermarkType === "logo" && hasLogoOverlay;
  const showGuides =
    Boolean(image) && previewMode === "after" && (isTextSelected || isLogoSelected);
  const zoomPercent = Math.round(zoomScale * 100);
  const zoomInputId = `${fileInputId}-zoom-scale`;
  const interactionStatus = isLogoResizing
    ? "Resizing logo"
    : isLogoDragging
      ? "Dragging logo"
      : isWatermarkDragging
        ? "Dragging text"
        : null;

  useEffect(() => {
    onCanvasViewScaleChange(image ? zoomScale : 1);
  }, [image, onCanvasViewScaleChange, zoomScale]);

  function updateZoom(nextValue: number | ((value: number) => number)) {
    setZoomScale((current) => {
      const requested = typeof nextValue === "function" ? nextValue(current) : nextValue;
      return clampZoomScale(requested);
    });
  }

  function handleZoomOut() {
    updateZoom((current) => current - ZOOM_STEP);
  }

  function handleZoomIn() {
    updateZoom((current) => current + ZOOM_STEP);
  }

  function handleFitToScreen() {
    updateZoom(1);
  }

  function handleResetZoom() {
    if (!image || !previewStageRef.current || zoomScale <= 0) {
      updateZoom(1);
      return;
    }

    const stageRect = previewStageRef.current.getBoundingClientRect();
    if (stageRect.width <= 0 || stageRect.height <= 0) {
      updateZoom(1);
      return;
    }

    const baseWidth = stageRect.width / zoomScale;
    const baseHeight = stageRect.height / zoomScale;
    const nativeScale = Math.max(image.width / baseWidth, image.height / baseHeight);
    updateZoom(nativeScale);
  }

  function handleZoomSliderChange(event: ChangeEvent<HTMLInputElement>) {
    updateZoom(Number(event.currentTarget.value));
  }

  function handleCanvasWheel(event: ReactWheelEvent<HTMLDivElement>) {
    if (!image) {
      return;
    }

    event.preventDefault();
    const direction = event.deltaY < 0 ? 1 : -1;
    const speed = 0.7 + Math.min(Math.abs(event.deltaY) / 200, 1);
    updateZoom((current) => current + direction * ZOOM_STEP * speed);
  }

  function handleWatermarkPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    setShowInteractionHint(false);
    onWatermarkPointerDown(event);
  }

  function handleLogoPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    setShowInteractionHint(false);
    onLogoPointerDown(event);
  }

  function handleLogoResizePointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    setShowInteractionHint(false);
    onLogoResizePointerDown(event);
  }

  return (
    <>
      <input
        id={fileInputId}
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_IMAGE_INPUT}
        className="sr-only"
        aria-label="Choose image file"
        onChange={onImportChange}
      />
      <input
        id={logoFileInputId}
        ref={logoFileInputRef}
        type="file"
        accept={ACCEPTED_IMAGE_INPUT}
        className="sr-only"
        aria-label="Choose logo file"
        onChange={onLogoImportChange}
      />

      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="panel-label">Canvas</p>
          <div className="space-y-1">
            <h2 className="text-app-text text-2xl font-semibold tracking-tight">
              Watermark canvas
            </h2>
            <p className="text-muted max-w-2xl text-sm leading-6">
              Keep attention on the preview while you move, resize, rotate, and compare overlays in
              real time.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <StatusPill
            label={previewMode === "after" ? "After view" : "Before view"}
            tone={previewMode === "after" ? "accent" : "default"}
          />
          <StatusPill
            label={logoWatermark ? `Logo ${formatOpacity(logoWatermark.opacity)}` : "Text only"}
            tone="default"
          />
          <StatusPill
            label={
              logoWatermark
                ? formatRotation(logoWatermark.rotation)
                : formatRotation(watermark.rotation)
            }
            tone="default"
          />
        </div>
      </header>

      {error ? (
        <div
          role="alert"
          className="border-accent/35 bg-accent/10 text-app-text rounded-[1.3rem] border px-4 py-3 text-sm leading-6"
        >
          {error}
        </div>
      ) : null}

      <section
        role="region"
        aria-label="Image upload surface"
        className={`relative flex min-h-[36rem] flex-1 flex-col overflow-hidden rounded-[2rem] border p-4 transition sm:p-5 ${
          isImportDragActive
            ? "border-accent bg-accent/10 shadow-[0_0_0_1px_rgba(30,123,96,0.28)]"
            : "border-outline/70 bg-app-bg"
        }`}
        onDragOver={onImportDragOver}
        onDragLeave={onImportDragLeave}
        onDrop={onImportDrop}
        onClick={!image && !isLoading ? openFilePicker : undefined}
      >
        <div className="bg-accent/12 absolute inset-x-10 top-6 h-32 rounded-full blur-3xl" />
        <div className="relative flex h-full flex-col gap-4">
          <div className="border-outline/70 bg-panel/78 flex flex-col gap-3 rounded-[1.2rem] border px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <p className="text-app-text text-sm font-semibold">Preview workspace</p>
              <p className="text-muted text-sm leading-6">
                {image
                  ? "Drag overlays directly on canvas. Use zoom controls to inspect edges and spacing."
                  : "Import a base image to start placing text or logo watermarks."}
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <span className="border-outline/80 text-muted rounded-full border px-3 py-1 text-xs tracking-[0.22em] uppercase">
                {image ? image.formatLabel : "Empty"}
              </span>
              <div className="border-outline/80 bg-panel/90 inline-flex rounded-full border p-1">
                <button
                  type="button"
                  aria-pressed={previewMode === "before"}
                  className={`rounded-full px-3 py-2 text-xs font-semibold tracking-[0.16em] uppercase transition ${
                    previewMode === "before"
                      ? "bg-app-bg text-app-text"
                      : "text-muted hover:text-app-text"
                  }`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onPreviewBefore();
                  }}
                >
                  Before
                </button>
                <button
                  type="button"
                  aria-pressed={previewMode === "after"}
                  className={`rounded-full px-3 py-2 text-xs font-semibold tracking-[0.16em] uppercase transition ${
                    previewMode === "after"
                      ? "bg-app-bg text-app-text"
                      : "text-muted hover:text-app-text"
                  }`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onPreviewAfter();
                  }}
                >
                  After
                </button>
              </div>
              <button
                type="button"
                className="border-outline/80 bg-panel/90 text-app-text hover:border-accent/50 hover:bg-surface rounded-full border px-3 py-2 text-xs font-semibold tracking-[0.18em] uppercase transition"
                onPointerCancel={onBeforePeekEnd}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  onBeforePeekStart();
                }}
                onPointerLeave={onBeforePeekEnd}
                onPointerUp={onBeforePeekEnd}
              >
                Hold compare
              </button>
              <button
                type="button"
                className="border-outline/80 bg-panel/90 text-app-text hover:border-accent/50 hover:bg-surface rounded-full border px-3 py-2 text-xs font-semibold tracking-[0.18em] uppercase transition"
                onClick={(event) => {
                  event.stopPropagation();
                  openLogoPicker();
                }}
              >
                {logo ? "Replace logo" : "Upload logo"}
              </button>
            </div>
          </div>

          <div className="border-outline/70 relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.75rem] border bg-[linear-gradient(45deg,rgba(255,255,255,0.05)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.05)_75%,rgba(255,255,255,0.05)),linear-gradient(45deg,rgba(255,255,255,0.05)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.05)_75%,rgba(255,255,255,0.05)),linear-gradient(145deg,var(--color-app-bg),color-mix(in_srgb,var(--color-panel)_88%,var(--color-app-bg)_12%))] [background-size:20px_20px,20px_20px,100%_100%] [background-position:0_0,10px_10px,0_0] p-4 sm:p-5">
            {isLoading ? (
              <LoadingState />
            ) : image ? (
              <div className="flex min-h-0 flex-1 flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="border-outline/80 bg-panel/90 text-app-text rounded-full border px-4 py-2 text-sm">
                    {selectedFileLabel}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <OverlayPill label={`${image.width} x ${image.height}`} />
                    <OverlayPill label={formatFileSize(image.file.size)} />
                    <OverlayPill label={sessionStatus} />
                    {logo ? <OverlayPill label={`Logo ${logo.formatLabel}`} /> : null}
                  </div>
                </div>

                <div className="border-outline/80 bg-panel/44 relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.4rem] border shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                  <div className="border-outline/70 bg-app-bg/75 border-b px-3 py-2 sm:px-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-muted text-xs font-semibold tracking-[0.2em] uppercase">
                        Zoom and framing
                      </p>
                      <div className="bg-panel/85 flex items-center gap-1 rounded-full border border-white/12 px-2 py-1">
                        <button
                          type="button"
                          aria-label="Zoom out"
                          className="text-app-text hover:bg-app-bg/70 rounded-full px-2 py-1 text-sm font-semibold transition"
                          onClick={handleZoomOut}
                        >
                          -
                        </button>
                        <label htmlFor={zoomInputId} className="sr-only">
                          Canvas zoom
                        </label>
                        <input
                          id={zoomInputId}
                          aria-label="Canvas zoom"
                          type="range"
                          min={MIN_ZOOM_SCALE}
                          max={MAX_ZOOM_SCALE}
                          step={0.01}
                          value={zoomScale}
                          className="accent-accent h-1.5 w-24"
                          onChange={handleZoomSliderChange}
                        />
                        <button
                          type="button"
                          aria-label="Zoom in"
                          className="text-app-text hover:bg-app-bg/70 rounded-full px-2 py-1 text-sm font-semibold transition"
                          onClick={handleZoomIn}
                        >
                          +
                        </button>
                        <span className="text-app-text min-w-[3.1rem] px-1 text-center text-xs font-semibold">
                          {zoomPercent}%
                        </span>
                        <button
                          type="button"
                          className="border-outline/80 text-app-text hover:border-accent/50 hover:bg-app-bg/75 rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold tracking-[0.14em] uppercase transition"
                          onClick={handleFitToScreen}
                        >
                          Fit
                        </button>
                        <button
                          type="button"
                          className="border-outline/80 text-app-text hover:border-accent/50 hover:bg-app-bg/75 rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold tracking-[0.14em] uppercase transition"
                          onClick={handleResetZoom}
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </div>

                  <div
                    className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto p-5 sm:p-7"
                    role="region"
                    aria-label="Preview canvas viewport"
                    onWheel={handleCanvasWheel}
                  >
                    <div
                      className={`relative will-change-transform ${isTransforming ? "" : "transition-transform duration-150 ease-out"}`}
                      style={{ transform: `scale(${zoomScale})` }}
                    >
                      <div
                        ref={previewStageRef}
                        data-testid="preview-stage"
                        className="relative max-h-[34rem] max-w-full"
                        style={{ aspectRatio: `${image.width} / ${image.height}` }}
                      >
                        <img
                          src={image.previewUrl}
                          alt={`Preview of ${image.file.name}`}
                          className="block max-h-[34rem] max-w-full rounded-[1rem] object-contain shadow-[0_24px_70px_-36px_rgba(15,23,42,0.85)]"
                        />

                        {showGuides ? <CanvasGuideOverlay isTransforming={isTransforming} /> : null}

                        {hasWatermarkText ? (
                          <button
                            ref={watermarkOverlayRef}
                            data-testid="watermark-overlay"
                            type="button"
                            aria-label="Drag watermark"
                            className={`absolute z-20 touch-none rounded-xl border px-3 py-2 whitespace-nowrap transition-[border-color,background-color,box-shadow] duration-150 select-none ${
                              isTextSelected || isWatermarkDragging || isTextHovered
                                ? "border-accent/65 bg-panel/45 shadow-[0_18px_45px_-26px_rgba(15,23,42,0.92)]"
                                : "border-transparent bg-black/15 hover:border-white/40 hover:bg-black/20"
                            }`}
                            style={{
                              left: `${watermark.position.x * 100}%`,
                              top: `${watermark.position.y * 100}%`,
                              ...getTextWatermarkOverlayStyle(watermark, isWatermarkDragging),
                            }}
                            onPointerCancel={onWatermarkPointerUp}
                            onPointerDown={handleWatermarkPointerDown}
                            onPointerEnter={() => {
                              setIsTextHovered(true);
                            }}
                            onPointerLeave={() => {
                              setIsTextHovered(false);
                            }}
                            onPointerMove={onWatermarkPointerMove}
                            onPointerUp={onWatermarkPointerUp}
                          >
                            <span className="relative z-10">{watermark.text}</span>
                            {isTextSelected || isWatermarkDragging || isTextHovered ? (
                              <>
                                <span className="pointer-events-none absolute inset-[0.28rem] rounded-[0.62rem] ring-1 ring-white/45" />
                                <span className="border-accent bg-app-bg pointer-events-none absolute -top-1.5 -left-1.5 h-3 w-3 rounded-full border" />
                                <span className="border-accent bg-app-bg pointer-events-none absolute -right-1.5 -bottom-1.5 h-3 w-3 rounded-full border" />
                              </>
                            ) : null}
                          </button>
                        ) : null}

                        {hasLogoOverlay && logo && logoWatermark ? (
                          <div
                            data-testid="logo-overlay"
                            className="absolute z-30 touch-none select-none"
                            style={{
                              left: `${logoWatermark.position.x * 100}%`,
                              top: `${logoWatermark.position.y * 100}%`,
                              width: `${logoWatermark.width}px`,
                              height: `${logoHeight}px`,
                              opacity: logoWatermark.opacity,
                              transform: `translate(-50%, -50%) rotate(${logoWatermark.rotation}deg)`,
                            }}
                          >
                            <button
                              type="button"
                              aria-label="Drag logo watermark"
                              className={`absolute inset-0 overflow-hidden rounded-[1rem] border transition-[border-color,box-shadow,background-color] duration-150 ${
                                isLogoSelected || isLogoDragging || isLogoResizing || isLogoHovered
                                  ? "border-accent bg-white/6 shadow-[0_22px_52px_-30px_rgba(15,23,42,0.9)]"
                                  : "hover:border-accent/75 border-white/35 bg-white/3"
                              }`}
                              style={{ cursor: isLogoDragging ? "grabbing" : "grab" }}
                              onPointerCancel={onLogoPointerUp}
                              onPointerDown={handleLogoPointerDown}
                              onPointerEnter={() => {
                                setIsLogoHovered(true);
                              }}
                              onPointerLeave={() => {
                                setIsLogoHovered(false);
                              }}
                              onPointerMove={onLogoPointerMove}
                              onPointerUp={onLogoPointerUp}
                            >
                              <div className="pointer-events-none absolute inset-[0.35rem] rounded-[0.8rem] ring-1 ring-white/35" />
                              <img
                                src={logo.previewUrl}
                                alt={`Logo watermark ${logo.file.name}`}
                                data-testid="logo-watermark-image"
                                draggable={false}
                                className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                              />
                            </button>

                            {logoResizeHandles.map((handle) => (
                              <button
                                key={handle.id}
                                type="button"
                                aria-label={handle.ariaLabel}
                                data-testid={`logo-resize-${handle.id}`}
                                className={`border-accent bg-app-bg absolute h-5 w-5 rounded-full border shadow-[0_10px_20px_-12px_rgba(15,23,42,0.9)] ${handle.className}`}
                                onPointerCancel={onLogoPointerUp}
                                onPointerDown={handleLogoResizePointerDown}
                                onPointerMove={onLogoPointerMove}
                                onPointerUp={onLogoPointerUp}
                              />
                            ))}

                            <div className="bg-panel/92 text-app-text pointer-events-none absolute top-[calc(100%+0.85rem)] left-1/2 -translate-x-1/2 rounded-full border border-white/15 px-3 py-1 text-[0.64rem] font-semibold tracking-[0.18em] uppercase shadow-[0_12px_30px_-18px_rgba(15,23,42,0.8)]">
                              {isLogoResizing ? "Resizing" : isLogoDragging ? "Moving" : "Logo"}
                            </div>
                          </div>
                        ) : null}

                        {previewMode === "before" ? (
                          <div className="bg-panel/90 text-app-text pointer-events-none absolute top-3 left-3 rounded-full border border-white/15 px-3 py-1 text-[0.68rem] font-semibold tracking-[0.18em] uppercase shadow-[0_12px_30px_-18px_rgba(15,23,42,0.8)]">
                            Original image
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {showInteractionHint && previewMode === "after" && !interactionStatus ? (
                      <CanvasHintOverlay hasLogo={Boolean(logo)} hasText={hasWatermarkText} />
                    ) : null}

                    {interactionStatus ? (
                      <div className="bg-accent/16 text-app-text border-accent/35 pointer-events-none absolute top-3 right-3 rounded-full border px-3 py-1 text-[0.68rem] font-semibold tracking-[0.18em] uppercase">
                        {interactionStatus}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState openFilePicker={openFilePicker} />
            )}
          </div>

          <div className="border-outline/70 bg-panel/72 flex flex-col gap-3 rounded-[1.4rem] border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-app-text text-sm font-semibold">Canvas workflow</p>
              <p className="text-muted text-sm leading-6">
                {image
                  ? logo
                    ? "Move text or logo in the canvas, resize from logo corners, then compare and export."
                    : "Position the text watermark now, or upload a logo for multi-layer branding."
                  : "Import one base image to activate canvas editing tools and live compare mode."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="border-outline/80 bg-app-bg text-app-text hover:border-accent/50 hover:bg-surface rounded-2xl border px-4 py-3 text-sm font-semibold transition"
                onClick={openFilePicker}
              >
                {image ? "Replace image" : "Choose image"}
              </button>
              <button
                type="button"
                className="border-outline/80 bg-app-bg text-app-text hover:border-accent/50 hover:bg-surface rounded-2xl border px-4 py-3 text-sm font-semibold transition"
                onClick={(event) => {
                  event.stopPropagation();
                  openLogoPicker();
                }}
              >
                {logo ? "Replace logo" : "Choose logo"}
              </button>
              {logo ? (
                <button
                  type="button"
                  className="border-accent/35 bg-accent/10 text-app-text hover:border-accent hover:bg-accent/15 rounded-2xl border px-4 py-3 text-sm font-semibold transition"
                  onClick={onDeleteLogo}
                >
                  Delete logo
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function resolveAspectRatio(image: ImportedImage) {
  return image.height > 0 ? image.width / image.height : 1;
}

function clampZoomScale(value: number) {
  return Math.min(Math.max(value, MIN_ZOOM_SCALE), MAX_ZOOM_SCALE);
}

function LoadingState() {
  return (
    <div className="flex max-w-md flex-col items-center gap-3 text-center">
      <div className="border-accent/35 bg-accent/12 text-app-text flex h-14 w-14 items-center justify-center rounded-full border text-sm font-semibold">
        ...
      </div>
      <div className="space-y-1">
        <p className="text-app-text text-lg font-semibold">Reading image</p>
        <p className="text-muted text-sm leading-6">
          Extracting file details and preparing the preview canvas.
        </p>
      </div>
    </div>
  );
}

function EmptyState({ openFilePicker }: { openFilePicker: () => void }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 text-center">
      <div className="border-outline/80 bg-panel/90 text-app-text flex h-18 w-18 items-center justify-center rounded-full border text-xl font-semibold">
        IMG
      </div>
      <div className="space-y-2">
        <h3 className="text-app-text text-2xl font-semibold tracking-tight">
          Start with a base image
        </h3>
        <p className="text-muted text-sm leading-6 sm:text-base">
          Drop a PNG, JPG, JPEG, or WebP file here. Then adjust watermark controls from side panels
          while this preview stays centered.
        </p>
      </div>
      <div className="grid gap-2 text-left sm:grid-cols-2">
        <p className="border-outline/70 bg-panel/85 text-muted rounded-xl border px-3 py-2 text-sm leading-6">
          1. Import image with `Ctrl/Cmd + O`
        </p>
        <p className="border-outline/70 bg-panel/85 text-muted rounded-xl border px-3 py-2 text-sm leading-6">
          2. Add text or logo watermark
        </p>
        <p className="border-outline/70 bg-panel/85 text-muted rounded-xl border px-3 py-2 text-sm leading-6 sm:col-span-2">
          3. Drag and resize in canvas, then export from the right panel
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          className="bg-accent text-app-bg rounded-2xl px-4 py-3 text-sm font-semibold transition hover:brightness-110"
          onClick={(event) => {
            event.stopPropagation();
            openFilePicker();
          }}
        >
          Browse image
        </button>
        <span className="border-outline/80 bg-panel/90 text-muted rounded-full border px-3 py-2 text-xs tracking-[0.2em] uppercase">
          One file only
        </span>
        <span className="border-outline/80 bg-panel/90 text-muted rounded-full border px-3 py-2 text-xs tracking-[0.2em] uppercase">
          Drag and drop
        </span>
      </div>
    </div>
  );
}

function CanvasGuideOverlay({ isTransforming }: { isTransforming: boolean }) {
  const cells = [
    "cell-1",
    "cell-2",
    "cell-3",
    "cell-4",
    "cell-5",
    "cell-6",
    "cell-7",
    "cell-8",
    "cell-9",
  ];

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
        {cells.map((cell) => (
          <div key={cell} className="border border-white/7" />
        ))}
      </div>
      <div
        className={`bg-accent/50 absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-opacity ${
          isTransforming ? "opacity-85" : "opacity-30"
        }`}
      />
      <div
        className={`bg-accent/50 absolute inset-x-0 top-1/2 h-px -translate-y-1/2 transition-opacity ${
          isTransforming ? "opacity-85" : "opacity-30"
        }`}
      />
    </div>
  );
}

function CanvasHintOverlay({ hasLogo, hasText }: { hasLogo: boolean; hasText: boolean }) {
  return (
    <div className="bg-panel/88 text-app-text pointer-events-none absolute right-3 bottom-3 max-w-xs rounded-2xl border border-white/12 px-3 py-3 text-xs leading-5 shadow-[0_18px_42px_-30px_rgba(15,23,42,0.9)]">
      <p className="text-[0.62rem] font-semibold tracking-[0.22em] uppercase">Quick hint</p>
      <p className="text-muted mt-1">
        {hasLogo
          ? "Drag logo to move and use corner handles to resize."
          : hasText
            ? "Drag text watermark to position, then use zoom to refine."
            : "Use text controls from the right panel to add your first watermark."}
      </p>
    </div>
  );
}

function OverlayPill({ label }: { label: string }) {
  return (
    <span className="border-outline/80 bg-app-bg/90 text-app-text rounded-full border px-3 py-2 text-[0.68rem] font-semibold tracking-[0.18em] uppercase">
      {label}
    </span>
  );
}

function StatusPill({ label, tone }: { label: string; tone: "accent" | "default" }) {
  return (
    <span
      className={`rounded-full border px-3 py-2 text-[0.68rem] font-semibold tracking-[0.2em] uppercase ${
        tone === "accent"
          ? "border-accent/40 bg-accent/10 text-accent"
          : "border-outline/80 bg-panel/80 text-muted"
      }`}
    >
      {label}
    </span>
  );
}
