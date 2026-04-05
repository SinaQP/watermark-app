import { useEffect, useId, useRef, useState, type ChangeEvent, type DragEvent } from "react";

import { Panel } from "@/components/layout/panel";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  ACCEPTED_IMAGE_INPUT,
  MULTIPLE_IMAGE_ERROR,
  SUPPORTED_IMAGE_LABEL,
  createImportedImage,
  formatFileSize,
  formatLastModified,
  type ImportedImage,
} from "@/lib/image-import";

const acceptedFormats = [
  {
    label: "PNG",
    description: "Best for transparent artwork, logos, and sharp edges.",
  },
  {
    label: "JPG",
    description: "Good for photo uploads and lighter review files.",
  },
  {
    label: "WebP",
    description: "Modern compressed format for fast previewing.",
  },
];

const importChecklist = [
  {
    title: "Click to browse",
    description: "Open the file picker from the canvas or the inspector button.",
  },
  {
    title: "Drag one image",
    description: "Drop a single image straight onto the preview surface.",
  },
  {
    title: "Review metadata",
    description: "Check file type, size, and dimensions before the next step.",
  },
];

export function AppShell() {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<ImportedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!image) {
      return;
    }

    return () => {
      URL.revokeObjectURL(image.previewUrl);
    };
  }, [image]);

  const sessionStatus = image
    ? "Preview ready"
    : isLoading
      ? "Reading image"
      : error
        ? "Needs attention"
        : "Awaiting image";

  const resolutionLabel = image ? `${image.width} x ${image.height}` : "No image";
  const selectedFileLabel = image ? image.file.name : "No file selected";

  async function importFiles(source: FileList | File[] | null) {
    const files = source ? Array.from(source) : [];

    if (files.length === 0) {
      return;
    }

    if (files.length > 1) {
      setError(MULTIPLE_IMAGE_ERROR);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextImage = await createImportedImage(files[0]);
      setImage(nextImage);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong while reading the image.";

      setError(message);
    } finally {
      setIsLoading(false);
      setIsDragActive(false);
    }
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    void importFiles(event.target.files);
    event.target.value = "";
  }

  function handleDragOver(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsDragActive(true);
  }

  function handleDragLeave(event: DragEvent<HTMLElement>) {
    event.preventDefault();

    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsDragActive(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDragActive(false);
    void importFiles(event.dataTransfer.files);
  }

  return (
    <div className="min-h-screen px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto flex max-w-[1700px] flex-col gap-5">
        <header className="panel-surface flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <p className="panel-label">Milestone 2</p>
            <div className="space-y-2">
              <h1 className="text-app-text text-3xl font-semibold tracking-tight sm:text-4xl">
                Watermark App image import
              </h1>
              <p className="text-muted max-w-3xl text-sm leading-6 sm:text-base">
                Load one image, validate the format, and inspect the preview before moving into
                watermark placement.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill label="Single image" tone="default" />
            <StatusPill label={sessionStatus} tone={image ? "accent" : "default"} />
            <ThemeToggle />
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-[18rem_minmax(0,1fr)_22rem]">
          <Panel
            eyebrow="Import"
            title="Import flow"
            description="The left rail keeps the upload rules and current session state visible while you work."
          >
            <div className="space-y-4">
              <div className="border-outline/70 bg-app-bg/70 rounded-[1.25rem] border p-4">
                <p className="text-app-text text-sm font-semibold">Session state</p>
                <div className="mt-4 grid gap-3">
                  <MetricCard label="Status" value={sessionStatus} />
                  <MetricCard label="Selection" value={image ? "1 image" : "None"} />
                  <MetricCard label="Resolution" value={resolutionLabel} />
                </div>
              </div>

              <div className="border-outline/70 bg-panel/70 rounded-[1.25rem] border p-4">
                <p className="text-app-text text-sm font-semibold">Accepted formats</p>
                <ul className="mt-4 space-y-3">
                  {acceptedFormats.map((format) => (
                    <li
                      key={format.label}
                      className="bg-app-bg/65 rounded-2xl border border-transparent px-3 py-3"
                    >
                      <p className="text-app-text text-sm font-semibold">{format.label}</p>
                      <p className="text-muted mt-1 text-sm leading-6">{format.description}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-outline/70 bg-panel/70 rounded-[1.25rem] border p-4">
                <p className="text-app-text text-sm font-semibold">Checklist</p>
                <ul className="mt-4 space-y-3">
                  {importChecklist.map((item, index) => (
                    <li key={item.title} className="bg-app-bg/70 flex gap-3 rounded-2xl px-3 py-3">
                      <span className="bg-accent text-app-bg flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-app-text text-sm font-semibold">{item.title}</p>
                        <p className="text-muted mt-1 text-sm leading-6">{item.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Panel>

          <main className="panel-surface flex min-h-[42rem] flex-col gap-6 p-6">
            <input
              id={inputId}
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_IMAGE_INPUT}
              className="sr-only"
              aria-label="Choose image file"
              onChange={handleInputChange}
            />

            <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <p className="panel-label">Canvas</p>
                <div className="space-y-1">
                  <h2 className="text-app-text text-2xl font-semibold tracking-tight">
                    Single image import
                  </h2>
                  <p className="text-muted max-w-2xl text-sm leading-6">
                    Drop a file into the canvas or browse from disk. The preview updates as soon as
                    the image is loaded and validated.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <StatusPill label="Click or drop" tone="default" />
                <StatusPill label="PNG, JPG, WebP" tone="default" />
                <StatusPill label={image ? "Preview loaded" : "Empty canvas"} tone="accent" />
              </div>
            </header>

            <div className="grid gap-3 md:grid-cols-3">
              <SummaryStrip label="Input method" value="Click or drag and drop" />
              <SummaryStrip label="Supported" value={SUPPORTED_IMAGE_LABEL} />
              <SummaryStrip label="Current file" value={selectedFileLabel} />
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
                isDragActive
                  ? "border-accent bg-accent/10 shadow-[0_0_0_1px_rgba(227,134,59,0.2)]"
                  : "border-outline/70 bg-app-bg"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={!image && !isLoading ? openFilePicker : undefined}
            >
              <div className="bg-accent/10 absolute inset-x-8 top-6 h-24 rounded-full blur-3xl" />
              <div className="relative flex h-full flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-app-text text-sm font-semibold">Preview canvas</p>
                    <p className="text-muted mt-1 text-sm">
                      One image at a time with desktop-friendly drag and drop.
                    </p>
                  </div>
                  <span className="border-outline/80 text-muted rounded-full border px-3 py-1 text-xs tracking-[0.22em] uppercase">
                    {image ? image.formatLabel : "Empty"}
                  </span>
                </div>

                <div className="border-outline/70 relative flex flex-1 items-center justify-center overflow-hidden rounded-[1.75rem] border border-dashed bg-[linear-gradient(45deg,rgba(255,255,255,0.06)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.06)_75%,rgba(255,255,255,0.06)),linear-gradient(45deg,rgba(255,255,255,0.06)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.06)_75%,rgba(255,255,255,0.06)),linear-gradient(135deg,var(--color-app-bg),var(--color-panel))] [background-size:24px_24px,24px_24px,100%_100%] [background-position:0_0,12px_12px,0_0] p-5">
                  {isLoading ? (
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
                  ) : image ? (
                    <div className="flex h-full w-full flex-col gap-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="border-outline/80 bg-panel/90 text-app-text rounded-full border px-4 py-2 text-sm">
                          {image.file.name}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <OverlayPill label={`${image.width} x ${image.height}`} />
                          <OverlayPill label={formatFileSize(image.file.size)} />
                        </div>
                      </div>

                      <div className="border-outline/80 bg-panel/45 flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[1.4rem] border p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                        <img
                          src={image.previewUrl}
                          alt={`Preview of ${image.file.name}`}
                          className="max-h-full w-full rounded-[1rem] object-contain shadow-[0_20px_60px_-30px_rgba(15,23,42,0.72)]"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex max-w-xl flex-col items-center gap-4 text-center">
                      <div className="border-outline/80 bg-panel/90 text-app-text flex h-16 w-16 items-center justify-center rounded-full border text-lg font-semibold">
                        IMG
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-app-text text-2xl font-semibold tracking-tight">
                          Drop an image here
                        </h3>
                        <p className="text-muted text-sm leading-6 sm:text-base">
                          Drag a PNG, JPG, JPEG, or WebP file into the canvas, or click below to
                          browse from your desktop.
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
                  )}
                </div>

                <div className="border-outline/70 bg-panel/70 flex flex-col gap-3 rounded-[1.4rem] border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-app-text text-sm font-semibold">Import note</p>
                    <p className="text-muted text-sm leading-6">
                      {image
                        ? "Use Replace image to swap the current preview without leaving the canvas."
                        : "Click anywhere in the canvas or drag a file onto it to start the preview."}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="border-outline/80 bg-app-bg text-app-text hover:border-accent/50 hover:bg-surface rounded-2xl border px-4 py-3 text-sm font-semibold transition"
                    onClick={openFilePicker}
                  >
                    {image ? "Replace image" : "Choose image"}
                  </button>
                </div>
              </div>
            </section>
          </main>

          <Panel
            eyebrow="Inspector"
            title="File details"
            description="Metadata, validation notes, and next actions stay visible beside the canvas."
          >
            <div className="space-y-4">
              <div className="border-outline/70 bg-app-bg/70 rounded-[1.25rem] border p-4">
                <p className="text-app-text text-sm font-semibold">Metadata</p>

                {image ? (
                  <div className="mt-4 space-y-3">
                    <MetadataRow label="File name" value={image.file.name} />
                    <MetadataRow label="Format" value={image.formatLabel} />
                    <MetadataRow label="Size" value={formatFileSize(image.file.size)} />
                    <MetadataRow label="Dimensions" value={`${image.width} x ${image.height}`} />
                    <MetadataRow
                      label="Last modified"
                      value={formatLastModified(image.file.lastModified)}
                    />
                  </div>
                ) : (
                  <div className="border-outline/70 bg-panel/70 mt-4 rounded-2xl border px-4 py-4">
                    <p className="text-app-text text-sm font-semibold">No image selected</p>
                    <p className="text-muted mt-2 text-sm leading-6">
                      Choose a file to populate the inspector with dimensions, format, and timestamp
                      details.
                    </p>
                  </div>
                )}
              </div>

              {error ? (
                <div className="border-accent/35 bg-accent/10 rounded-[1.25rem] border p-4">
                  <p className="text-app-text text-sm font-semibold">Upload error</p>
                  <p className="text-muted mt-2 text-sm leading-6">{error}</p>
                </div>
              ) : null}

              <div className="border-outline/70 bg-panel/70 rounded-[1.25rem] border p-4">
                <p className="text-app-text text-sm font-semibold">Validation rules</p>
                <div className="text-muted mt-4 space-y-3 text-sm leading-6">
                  <RuleRow title="Allowed files" detail={SUPPORTED_IMAGE_LABEL} />
                  <RuleRow title="Upload count" detail="One image at a time" />
                  <RuleRow title="Preview target" detail="Render immediately on the main canvas" />
                </div>
              </div>

              <div className="border-outline/70 bg-panel/70 rounded-[1.25rem] border p-4">
                <p className="text-app-text text-sm font-semibold">Ready next</p>
                <p className="text-muted mt-2 text-sm leading-6">
                  Keep iterating in the canvas or replace the file to compare a new source image.
                </p>
                <button
                  type="button"
                  className="bg-accent text-app-bg mt-4 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition hover:brightness-110"
                  onClick={openFilePicker}
                >
                  {image ? "Choose another image" : "Browse image"}
                </button>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-panel/80 rounded-2xl px-4 py-3">
      <p className="text-muted text-xs tracking-[0.2em] uppercase">{label}</p>
      <p className="text-app-text mt-2 text-base font-semibold tracking-tight">{value}</p>
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

function OverlayPill({ label }: { label: string }) {
  return (
    <span className="border-outline/80 bg-app-bg/90 text-app-text rounded-full border px-3 py-2 text-xs font-semibold tracking-[0.18em] uppercase">
      {label}
    </span>
  );
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-panel/80 flex items-center justify-between gap-3 rounded-xl px-3 py-3">
      <span className="text-muted text-sm">{label}</span>
      <span className="text-app-text max-w-[13rem] text-right text-sm font-semibold">{value}</span>
    </div>
  );
}

function RuleRow({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="bg-app-bg/70 rounded-xl px-3 py-3">
      <p className="text-app-text text-sm font-semibold">{title}</p>
      <p className="text-muted mt-1 text-sm leading-6">{detail}</p>
    </div>
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
