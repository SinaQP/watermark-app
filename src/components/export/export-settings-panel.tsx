import type { ChangeEvent } from "react";

import {
  CollapsibleControlSection,
  FormField,
  SliderWithNumberField,
} from "@/components/controls/control-field";
import type { ImportedImage } from "@/lib/image-import";
import type { ExportFormat } from "@/lib/watermark-render";

type ExportPanelState = {
  error: string | null;
  lastSavedPath: string | null;
  message: string;
  status: "error" | "idle" | "saving" | "success";
};

export type BatchQueueItemView = {
  error: string | null;
  fileName: string;
  id: string;
  outputPath: string | null;
  status: "failed" | "processing" | "queued" | "success";
};

type ExportSettingsPanelProps = {
  batchItems: BatchQueueItemView[];
  batchMessage: string;
  batchOutputFolder: string | null;
  fileName: string;
  format: ExportFormat;
  image: ImportedImage | null;
  isBatchRunning: boolean;
  onAddBatchFiles: () => void;
  onClearBatchQueue: () => void;
  onExport: () => void;
  onFileNameChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onFormatChange: (format: ExportFormat) => void;
  onQualityChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRunBatchExport: () => void;
  onSelectBatchOutputFolder: () => void;
  quality: number;
  state: ExportPanelState;
};

const exportFormats = [
  {
    description: "Keeps transparency from PNG logos and transparent source images.",
    id: "png",
    label: "PNG",
  },
  {
    description: "Flattens transparency onto white for lighter review exports.",
    id: "jpg",
    label: "JPG",
  },
] as const;

export function ExportSettingsPanel({
  batchItems,
  batchMessage,
  batchOutputFolder,
  fileName,
  format,
  image,
  isBatchRunning,
  onAddBatchFiles,
  onClearBatchQueue,
  onExport,
  onFileNameChange,
  onFormatChange,
  onQualityChange,
  onRunBatchExport,
  onSelectBatchOutputFolder,
  quality,
  state,
}: ExportSettingsPanelProps) {
  const isExporting = state.status === "saving";
  const canExport = Boolean(image) && !isExporting;
  const completedCount = batchItems.filter((item) => item.status === "success").length;
  const failedCount = batchItems.filter((item) => item.status === "failed").length;
  const runningCount = batchItems.filter((item) => item.status === "processing").length;
  const queuedCount = batchItems.filter((item) => item.status === "queued").length;
  const canRunBatch = batchItems.length > 0 && Boolean(batchOutputFolder) && !isBatchRunning;

  return (
    <div className="space-y-3">
      <CollapsibleControlSection
        title="Export settings"
        description="Set output file details and run single export."
        defaultOpen
      >
        <div className="space-y-4">
          <FormField label="File name" helper="This name is used before extension is added.">
            <input
              type="text"
              value={fileName}
              aria-label="File name"
              className="border-outline/80 bg-app-bg text-app-text focus:border-accent w-full rounded-xl border px-3 py-3 text-sm transition outline-none"
              placeholder="watermarked-image"
              onChange={onFileNameChange}
            />
          </FormField>

          <FormField
            label="Format"
            helper="Pick PNG for transparency, JPG for lighter review files."
          >
            <div className="grid grid-cols-2 gap-2">
              {exportFormats.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={format === option.id}
                  className={`rounded-xl border px-3 py-3 text-left transition ${
                    format === option.id
                      ? "border-accent bg-accent/12 text-app-text"
                      : "border-outline/80 bg-app-bg text-muted hover:border-accent/40 hover:text-app-text"
                  }`}
                  onClick={() => {
                    onFormatChange(option.id);
                  }}
                >
                  <span className="block text-sm font-semibold">{option.label}</span>
                  <span className="text-muted mt-1 block text-xs leading-5">
                    {option.description}
                  </span>
                </button>
              ))}
            </div>
          </FormField>

          {format === "jpg" ? (
            <SliderWithNumberField
              id="export-quality"
              label="JPG quality"
              helper="Higher quality preserves detail but increases file size."
              min={60}
              max={100}
              value={quality}
              displayValue={`${quality}%`}
              onValueChange={(nextValue) => {
                const bounded = clampNumber(nextValue, 60, 100);
                onQualityChange({
                  currentTarget: { value: String(bounded) },
                } as ChangeEvent<HTMLInputElement>);
              }}
            />
          ) : (
            <p className="border-outline/70 bg-app-bg/70 text-muted rounded-xl border px-3 py-3 text-sm leading-6">
              PNG keeps transparent pixels from source assets and logos.
            </p>
          )}

          <div
            aria-live="polite"
            className={`rounded-xl border px-3 py-3 ${
              state.status === "error"
                ? "border-rose-400/45 bg-rose-500/10"
                : state.status === "success"
                  ? "border-outline/70 bg-panel/80"
                  : "border-outline/70 bg-app-bg/70"
            }`}
          >
            <p className="text-app-text text-sm font-semibold">
              {state.status === "saving"
                ? "Export in progress"
                : state.status === "success"
                  ? "Last export saved"
                  : state.status === "error"
                    ? "Export failed"
                    : "Ready to export"}
            </p>
            <p
              className={`mt-2 text-sm leading-6 ${state.status === "error" ? "text-app-text" : "text-muted"}`}
            >
              {state.error ?? state.message}
            </p>
            {state.lastSavedPath ? (
              <p className="text-app-text mt-2 text-sm font-semibold break-all">
                {state.lastSavedPath}
              </p>
            ) : null}
          </div>

          {state.error ? (
            <div
              role="alert"
              className="text-app-text rounded-xl border border-rose-400/45 bg-rose-500/10 px-3 py-3 text-sm leading-6"
            >
              {state.error}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <MetaPill
              label="Source size"
              value={image ? `${image.width} x ${image.height}` : "No image"}
            />
            <MetaPill label="Format" value={format === "png" ? "PNG" : "JPG"} />
          </div>

          <button
            type="button"
            className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition ${
              canExport
                ? "bg-accent text-app-bg hover:brightness-110"
                : "border-outline/80 bg-panel text-muted border"
            }`}
            disabled={!canExport}
            onClick={onExport}
          >
            {isExporting ? "Exporting..." : "Export image"}
          </button>
        </div>
      </CollapsibleControlSection>

      <CollapsibleControlSection
        title="Batch export settings"
        description="Run the same watermark setup across multiple files."
        defaultOpen
      >
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              className="bg-accent text-app-bg rounded-xl px-4 py-3 text-sm font-semibold transition hover:brightness-110"
              onClick={onAddBatchFiles}
            >
              Add images
            </button>
            <button
              type="button"
              className="border-outline/80 bg-app-bg text-app-text hover:border-accent/50 hover:bg-surface rounded-xl border px-4 py-3 text-sm font-semibold transition"
              onClick={onSelectBatchOutputFolder}
            >
              {batchOutputFolder ? "Change output folder" : "Choose output folder"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <MetaPill label="Queue" value={`${batchItems.length}`} />
            <MetaPill label="Queued" value={`${queuedCount}`} />
            <MetaPill label="Processing" value={`${runningCount}`} />
            <MetaPill label="Done" value={`${completedCount}`} />
            <MetaPill label="Failed" value={`${failedCount}`} />
          </div>

          <div className="border-outline/70 bg-app-bg/70 rounded-xl border px-3 py-3">
            <p className="text-app-text text-sm font-semibold">Output folder</p>
            <p className="text-muted mt-1 text-sm leading-6 break-all">
              {batchOutputFolder ?? "Choose a folder before running batch export."}
            </p>
          </div>

          <div className="border-outline/70 bg-app-bg/70 rounded-xl border px-3 py-3">
            <p className="text-app-text text-sm font-semibold">Batch status</p>
            <p className="text-muted mt-1 text-sm leading-6">{batchMessage}</p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                canRunBatch
                  ? "bg-accent text-app-bg hover:brightness-110"
                  : "border-outline/80 bg-panel text-muted border"
              }`}
              disabled={!canRunBatch}
              onClick={onRunBatchExport}
            >
              {isBatchRunning ? "Processing batch..." : "Run batch export"}
            </button>
            <button
              type="button"
              className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                isBatchRunning
                  ? "border-outline/80 bg-panel text-muted"
                  : "text-app-text border-rose-400/45 bg-rose-500/10 hover:border-rose-400 hover:bg-rose-500/15"
              }`}
              disabled={isBatchRunning || batchItems.length === 0}
              onClick={onClearBatchQueue}
            >
              Clear queue
            </button>
          </div>

          {batchItems.length > 0 ? (
            <details className="border-outline/70 bg-panel/65 rounded-xl border px-3 py-3" open>
              <summary className="text-app-text cursor-pointer text-sm font-semibold">
                Queue items
              </summary>
              <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                {batchItems.map((item) => (
                  <article
                    key={item.id}
                    className="border-outline/70 bg-app-bg/80 rounded-xl border px-3 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-app-text max-w-[16rem] text-sm font-semibold break-all">
                        {item.fileName}
                      </p>
                      <StatusBadge status={item.status} />
                    </div>
                    {item.error ? (
                      <p className="text-app-text mt-2 text-sm leading-6">{item.error}</p>
                    ) : item.outputPath ? (
                      <p className="text-muted mt-2 text-sm leading-6 break-all">
                        {item.outputPath}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            </details>
          ) : (
            <p className="border-outline/70 bg-app-bg/70 text-muted rounded-xl border px-3 py-3 text-sm leading-6">
              Add multiple images to build a queue. The current watermark settings will be reused.
            </p>
          )}
        </div>
      </CollapsibleControlSection>
    </div>
  );
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-outline/70 bg-panel/80 rounded-xl border px-3 py-3">
      <p className="text-muted text-[0.64rem] font-semibold tracking-[0.2em] uppercase">{label}</p>
      <p className="text-app-text mt-1 text-sm leading-5 font-semibold">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: BatchQueueItemView["status"] }) {
  const label =
    status === "queued"
      ? "Queued"
      : status === "processing"
        ? "Processing"
        : status === "success"
          ? "Done"
          : "Failed";
  const className =
    status === "success"
      ? "border-accent/40 bg-accent/10 text-accent"
      : status === "failed"
        ? "border-rose-400/45 bg-rose-500/10 text-app-text"
        : "border-outline/80 bg-panel text-muted";

  return (
    <span
      className={`rounded-full border px-2 py-1 text-[0.66rem] font-semibold tracking-[0.16em] uppercase ${className}`}
    >
      {label}
    </span>
  );
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
