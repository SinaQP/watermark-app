import type { ChangeEvent, DragEvent, PointerEvent as ReactPointerEvent, RefObject } from "react";

import { ACCEPTED_IMAGE_INPUT, formatFileSize, type ImportedImage } from "@/lib/image-import";
import { formatOpacity, formatRotation, formatWatermarkPosition } from "@/lib/text-watermark";
import { getTextWatermarkOverlayStyle } from "@/lib/watermark-render";

import type { LogoWatermarkState, TextWatermarkState } from "./types";

type WatermarkCanvasProps = {
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
  selectedFileLabel: string;
  sessionStatus: string;
  watermark: TextWatermarkState;
  watermarkOverlayRef: RefObject<HTMLButtonElement | null>;
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
  onWatermarkPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onWatermarkPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onWatermarkPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => void;
};

const logoResizeHandles = [
  {
    id: "top-left",
    ariaLabel: "Resize logo watermark from top left",
    className: "-left-2 -top-2 cursor-nwse-resize",
  },
  {
    id: "top-right",
    ariaLabel: "Resize logo watermark from top right",
    className: "-right-2 -top-2 cursor-nesw-resize",
  },
  {
    id: "bottom-left",
    ariaLabel: "Resize logo watermark from bottom left",
    className: "-bottom-2 -left-2 cursor-nesw-resize",
  },
  {
    id: "bottom-right",
    ariaLabel: "Resize logo watermark from bottom right",
    className: "-bottom-2 -right-2 cursor-nwse-resize",
  },
] as const;

export function WatermarkCanvas({
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
  selectedFileLabel,
  sessionStatus,
  watermark,
  watermarkOverlayRef,
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
  onWatermarkPointerDown,
  onWatermarkPointerMove,
  onWatermarkPointerUp,
}: WatermarkCanvasProps) {
  const hasWatermarkText = watermark.text.trim().length > 0;
  const logoAspectRatio = logo ? resolveAspectRatio(logo) : 1;
  const logoHeight = logoWatermark ? logoWatermark.width / logoAspectRatio : 0;

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
              Upload a base image, then position text and a transparent logo watermark directly on
              the live preview.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <StatusPill label="Live preview" tone="accent" />
          <StatusPill label={formatOpacity(watermark.opacity)} tone="default" />
          <StatusPill
            label={logoWatermark ? `Logo ${formatOpacity(logoWatermark.opacity)}` : "No logo"}
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

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryStrip label="Watermark text" value={watermark.text || "No text"} />
        <SummaryStrip label="Current file" value={selectedFileLabel} />
        <SummaryStrip label="Text placement" value={formatWatermarkPosition(watermark.position)} />
        <SummaryStrip label="Logo watermark" value={logo ? logo.file.name : "No logo uploaded"} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <UploadSlot
          description="Choose the main image you want to watermark."
          label="Base image"
          status={image ? image.file.name : "Missing"}
          actionLabel={image ? "Replace image" : "Choose image"}
          onAction={openFilePicker}
          tone="default"
        />
        <UploadSlot
          description="Upload a PNG, SVG, JPG, or WebP logo to place above the image."
          label="Logo watermark"
          status={logo ? logo.file.name : "Not uploaded yet"}
          actionLabel={logo ? "Replace logo" : "Choose logo"}
          onAction={openLogoPicker}
          tone="accent"
        />
      </div>

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
        className={`relative flex min-h-[30rem] flex-1 flex-col overflow-hidden rounded-[2rem] border p-4 transition sm:p-5 ${
          isImportDragActive
            ? "border-accent bg-accent/10 shadow-[0_0_0_1px_rgba(227,134,59,0.2)]"
            : "border-outline/70 bg-app-bg"
        }`}
        onDragOver={onImportDragOver}
        onDragLeave={onImportDragLeave}
        onDrop={onImportDrop}
        onClick={!image && !isLoading ? openFilePicker : undefined}
      >
        <div className="bg-accent/10 absolute inset-x-8 top-6 h-24 rounded-full blur-3xl" />
        <div className="relative flex h-full flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-app-text text-sm font-semibold">Preview canvas</p>
              <p className="text-muted mt-1 text-sm">
                Direct manipulation on top of the rendered image, with text snapping and freeform
                logo resizing that adapt to the current bounds.
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <span className="border-outline/80 text-muted rounded-full border px-3 py-1 text-xs tracking-[0.22em] uppercase">
                {image ? image.formatLabel : "Empty"}
              </span>
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

          <div className="border-outline/70 relative flex flex-1 items-center justify-center overflow-hidden rounded-[1.75rem] border border-dashed bg-[linear-gradient(45deg,rgba(255,255,255,0.06)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.06)_75%,rgba(255,255,255,0.06)),linear-gradient(45deg,rgba(255,255,255,0.06)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.06)_75%,rgba(255,255,255,0.06)),linear-gradient(135deg,var(--color-app-bg),var(--color-panel))] [background-size:24px_24px,24px_24px,100%_100%] [background-position:0_0,12px_12px,0_0] p-5">
            {isLoading ? (
              <LoadingState />
            ) : image ? (
              <div className="flex h-full w-full flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="border-outline/80 bg-panel/90 text-app-text rounded-full border px-4 py-2 text-sm">
                    {image.file.name}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <OverlayPill label={`${image.width} x ${image.height}`} />
                    <OverlayPill label={formatFileSize(image.file.size)} />
                    <OverlayPill label={sessionStatus} />
                    {logo ? <OverlayPill label={`Logo ${logo.formatLabel}`} /> : null}
                  </div>
                </div>

                <div className="border-outline/80 bg-panel/45 flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[1.4rem] border p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                  <div
                    ref={previewStageRef}
                    data-testid="preview-stage"
                    className="relative max-h-[34rem] max-w-full"
                    style={{ aspectRatio: `${image.width} / ${image.height}` }}
                  >
                    <img
                      src={image.previewUrl}
                      alt={`Preview of ${image.file.name}`}
                      className="block max-h-[34rem] max-w-full rounded-[1rem] object-contain shadow-[0_20px_60px_-30px_rgba(15,23,42,0.72)]"
                    />

                    {hasWatermarkText ? (
                      <button
                        ref={watermarkOverlayRef}
                        data-testid="watermark-overlay"
                        type="button"
                        aria-label="Drag watermark"
                        className="absolute z-10 touch-none whitespace-nowrap select-none"
                        style={{
                          left: `${watermark.position.x * 100}%`,
                          top: `${watermark.position.y * 100}%`,
                          ...getTextWatermarkOverlayStyle(watermark, isWatermarkDragging),
                        }}
                        onPointerCancel={onWatermarkPointerUp}
                        onPointerDown={onWatermarkPointerDown}
                        onPointerMove={onWatermarkPointerMove}
                        onPointerUp={onWatermarkPointerUp}
                      >
                        {watermark.text}
                      </button>
                    ) : null}

                    {logo && logoWatermark ? (
                      <div
                        data-testid="logo-overlay"
                        className="absolute z-20 touch-none select-none"
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
                          className="border-accent/55 hover:border-accent absolute inset-0 overflow-hidden rounded-[1rem] border border-dashed bg-white/5 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.9)] transition"
                          style={{ cursor: isLogoDragging ? "grabbing" : "grab" }}
                          onPointerCancel={onLogoPointerUp}
                          onPointerDown={onLogoPointerDown}
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
                            className={`border-accent bg-app-bg absolute h-4 w-4 rounded-full border shadow-[0_8px_18px_-10px_rgba(15,23,42,0.9)] ${handle.className}`}
                            onPointerCancel={onLogoPointerUp}
                            onPointerDown={onLogoResizePointerDown}
                            onPointerMove={onLogoPointerMove}
                            onPointerUp={onLogoPointerUp}
                          />
                        ))}

                        <div className="bg-panel/90 text-app-text pointer-events-none absolute top-[calc(100%+0.85rem)] left-1/2 -translate-x-1/2 rounded-full border border-white/15 px-3 py-1 text-[0.68rem] font-semibold tracking-[0.18em] uppercase shadow-[0_12px_30px_-18px_rgba(15,23,42,0.8)]">
                          {isLogoResizing ? "Resizing" : "Logo"}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState openFilePicker={openFilePicker} />
            )}
          </div>

          <div className="border-outline/70 bg-panel/70 flex flex-col gap-3 rounded-[1.4rem] border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-app-text text-sm font-semibold">Placement note</p>
              <p className="text-muted text-sm leading-6">
                {image
                  ? logo
                    ? "Drag the logo to reposition it, resize from any corner handle, and keep PNG transparency intact."
                    : "Choose a logo watermark to place above the base image, or keep working with text alone."
                  : "Choose an image first, then use the inspector to add text or a logo watermark."}
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
    <div className="flex max-w-xl flex-col items-center gap-4 text-center">
      <div className="border-outline/80 bg-panel/90 text-app-text flex h-16 w-16 items-center justify-center rounded-full border text-lg font-semibold">
        LOGO
      </div>
      <div className="space-y-2">
        <h3 className="text-app-text text-2xl font-semibold tracking-tight">Drop an image here</h3>
        <p className="text-muted text-sm leading-6 sm:text-base">
          Bring in one PNG, JPG, JPEG, or WebP image, then add text and an optional transparent logo
          watermark from the inspector.
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
      </div>
    </div>
  );
}

function SummaryStrip({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-outline/70 bg-panel/75 rounded-[1.35rem] border px-4 py-4">
      <p className="text-muted text-xs tracking-[0.2em] uppercase">{label}</p>
      <p className="text-app-text mt-2 text-sm leading-6 font-semibold">{value}</p>
    </div>
  );
}

function UploadSlot({
  actionLabel,
  description,
  label,
  onAction,
  status,
  tone,
}: {
  actionLabel: string;
  description: string;
  label: string;
  onAction: () => void;
  status: string;
  tone: "accent" | "default";
}) {
  return (
    <section
      className={`rounded-[1.35rem] border px-4 py-4 ${
        tone === "accent" ? "border-accent/35 bg-accent/8" : "border-outline/70 bg-panel/75"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-muted text-xs tracking-[0.2em] uppercase">{label}</p>
          <p className="text-app-text text-sm font-semibold">{status}</p>
          <p className="text-muted text-sm leading-6">{description}</p>
        </div>
        <button
          type="button"
          className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
            tone === "accent"
              ? "bg-accent text-app-bg hover:brightness-110"
              : "border-outline/80 bg-app-bg text-app-text hover:border-accent/50 hover:bg-surface border"
          }`}
          onClick={onAction}
        >
          {actionLabel}
        </button>
      </div>
    </section>
  );
}

function OverlayPill({ label }: { label: string }) {
  return (
    <span className="border-outline/80 bg-app-bg/90 text-app-text rounded-full border px-3 py-2 text-xs font-semibold tracking-[0.18em] uppercase">
      {label}
    </span>
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
