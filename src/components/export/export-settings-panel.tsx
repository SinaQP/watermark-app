import { useState, type ChangeEvent } from "react";

import {
  CollapsibleControlSection,
  FormField,
  SliderWithNumberField,
} from "@/components/controls/control-field";
import { ExportIcon, ImageFileIcon } from "@/components/ui/app-icons";
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
  const [activeTab, setActiveTab] = useState<"batch" | "single">("single");
  const isExporting = state.status === "saving";
  const canExport = Boolean(image) && !isExporting;
  const completedCount = batchItems.filter((item) => item.status === "success").length;
  const failedCount = batchItems.filter((item) => item.status === "failed").length;
  const runningCount = batchItems.filter((item) => item.status === "processing").length;
  const queuedCount = batchItems.filter((item) => item.status === "queued").length;
  const canRunBatch = batchItems.length > 0 && Boolean(batchOutputFolder) && !isBatchRunning;

  return (
    <div className="space-y-2">
      <div className="tool-subtle inline-flex rounded-lg border p-1">
        <button
          type="button"
          aria-pressed={activeTab === "single"}
          className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
            activeTab === "single" ? "bg-accent/16 text-app-text" : "text-muted hover:text-app-text"
          }`}
          onClick={() => {
            setActiveTab("single");
          }}
        >
          Single
        </button>
        <button
          type="button"
          aria-pressed={activeTab === "batch"}
          className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
            activeTab === "batch" ? "bg-accent/16 text-app-text" : "text-muted hover:text-app-text"
          }`}
          onClick={() => {
            setActiveTab("batch");
          }}
        >
          Batch
        </button>
      </div>

      <div className={activeTab === "single" ? "block" : "hidden"}>
        <CollapsibleControlSection
          title="Export settings"
          description="Single image export."
          icon={<ExportIcon className="h-4 w-4" />}
          defaultOpen
        >
          <FormField label="File name" compact>
            <input
              type="text"
              value={fileName}
              aria-label="File name"
              className="tool-input w-full"
              placeholder="watermarked-image"
              onChange={onFileNameChange}
            />
          </FormField>

          <FormField label="Format" compact>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                aria-pressed={format === "png"}
                className={`rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                  format === "png"
                    ? "border-accent/55 bg-accent/14 text-app-text"
                    : "tool-subtle text-muted hover:text-app-text"
                }`}
                onClick={() => {
                  onFormatChange("png");
                }}
              >
                PNG
              </button>
              <button
                type="button"
                aria-pressed={format === "jpg"}
                className={`rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                  format === "jpg"
                    ? "border-accent/55 bg-accent/14 text-app-text"
                    : "tool-subtle text-muted hover:text-app-text"
                }`}
                onClick={() => {
                  onFormatChange("jpg");
                }}
              >
                JPG
              </button>
            </div>
          </FormField>

          {format === "jpg" ? (
            <SliderWithNumberField
              id="export-quality"
              label="JPG quality"
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
            <p className="tool-subtle rounded-lg border px-3 py-2 text-[0.72rem]">
              PNG keeps transparent edges.
            </p>
          )}

          <div
            aria-live="polite"
            className={`rounded-lg border px-3 py-2 text-[0.72rem] ${
              state.status === "error"
                ? "text-app-text border-rose-400/45 bg-rose-500/10"
                : state.status === "success"
                  ? "border-accent/45 bg-accent/10 text-app-text"
                  : "tool-subtle"
            }`}
          >
            <p className="font-semibold">
              {state.status === "saving"
                ? "Exporting..."
                : state.status === "success"
                  ? "Saved"
                  : state.status === "error"
                    ? "Export failed"
                    : "Ready"}
            </p>
            <p className="mt-1">{state.error ?? state.message}</p>
            {state.lastSavedPath ? <p className="mt-1 break-all">{state.lastSavedPath}</p> : null}
          </div>

          {state.error ? (
            <div
              role="alert"
              className="rounded-lg border border-rose-400/45 bg-rose-500/10 px-3 py-2 text-[0.72rem]"
            >
              {state.error}
            </div>
          ) : null}

          <button
            type="button"
            className={`w-full rounded-lg border px-3 py-2 text-xs font-semibold transition ${
              canExport
                ? "border-accent/55 bg-accent/14 text-app-text hover:bg-accent/18"
                : "tool-subtle text-muted"
            }`}
            disabled={!canExport}
            onClick={onExport}
          >
            {isExporting ? "Exporting..." : "Export image"}
          </button>
        </CollapsibleControlSection>
      </div>

      <div className={activeTab === "batch" ? "block" : "hidden"}>
        <CollapsibleControlSection
          title="Batch export settings"
          description="Queue and process multiple files."
          icon={<ImageFileIcon className="h-4 w-4" />}
          defaultOpen
        >
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              className="border-accent/45 bg-accent/12 rounded-lg border px-2 py-2 text-xs font-semibold"
              onClick={onAddBatchFiles}
            >
              Add images
            </button>
            <button
              type="button"
              className="tool-subtle rounded-lg border px-2 py-2 text-xs font-semibold"
              onClick={onSelectBatchOutputFolder}
            >
              {batchOutputFolder ? "Change output folder" : "Choose output folder"}
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1.5 text-center">
            <MiniStat label="All" value={String(batchItems.length)} />
            <MiniStat label="Queued" value={String(queuedCount)} />
            <MiniStat label="Run" value={String(runningCount)} />
            <MiniStat label="Done" value={String(completedCount)} />
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <MiniStat label="Failed" value={String(failedCount)} />
            <MiniStat label="Folder" value={batchOutputFolder ? "Ready" : "Missing"} />
          </div>

          <div className="tool-subtle rounded-lg border px-3 py-2 text-[0.72rem]">
            <p className="font-semibold">Batch status</p>
            <p className="mt-1">{batchMessage}</p>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              className={`rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                canRunBatch
                  ? "border-accent/55 bg-accent/14 text-app-text hover:bg-accent/18"
                  : "tool-subtle text-muted"
              }`}
              disabled={!canRunBatch}
              onClick={onRunBatchExport}
            >
              {isBatchRunning ? "Processing..." : "Run batch export"}
            </button>
            <button
              type="button"
              className={`rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                isBatchRunning
                  ? "tool-subtle text-muted"
                  : "text-app-text border-rose-400/45 bg-rose-500/10"
              }`}
              disabled={isBatchRunning || batchItems.length === 0}
              onClick={onClearBatchQueue}
            >
              Clear queue
            </button>
          </div>

          {batchItems.length > 0 ? (
            <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
              {batchItems.map((item) => (
                <article key={item.id} className="tool-subtle rounded-lg border px-2.5 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-app-text truncate text-[0.72rem] font-semibold">
                      {item.fileName}
                    </p>
                    <StatusBadge status={item.status} />
                  </div>
                  {item.error ? (
                    <p className="mt-1 text-[0.68rem]">{item.error}</p>
                  ) : item.outputPath ? (
                    <p className="text-muted mt-1 truncate text-[0.68rem]">{item.outputPath}</p>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <p className="tool-subtle rounded-lg border px-3 py-2 text-[0.72rem]">
              Queue is empty.
            </p>
          )}
        </CollapsibleControlSection>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="tool-subtle rounded-lg border px-2 py-1.5 text-center">
      <p className="text-muted text-[0.62rem] font-semibold uppercase">{label}</p>
      <p className="text-app-text text-[0.72rem] font-semibold">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: BatchQueueItemView["status"] }) {
  const label =
    status === "queued"
      ? "Queued"
      : status === "processing"
        ? "Run"
        : status === "success"
          ? "Done"
          : "Fail";
  const className =
    status === "success"
      ? "border-accent/45 bg-accent/10 text-accent"
      : status === "failed"
        ? "border-rose-400/45 bg-rose-500/10 text-app-text"
        : "tool-subtle text-muted";

  return (
    <span
      className={`rounded-full border px-2 py-1 text-[0.6rem] font-semibold uppercase ${className}`}
    >
      {label}
    </span>
  );
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
