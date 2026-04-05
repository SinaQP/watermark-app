import type { ChangeEvent, ReactNode } from "react";

import type { ImportedImage } from "@/lib/image-import";
import type { ExportFormat } from "@/lib/watermark-render";

type ExportPanelState = {
  error: string | null;
  lastSavedPath: string | null;
  message: string;
  status: "error" | "idle" | "saving" | "success";
};

type ExportSettingsPanelProps = {
  fileName: string;
  format: ExportFormat;
  image: ImportedImage | null;
  onExport: () => void;
  onFileNameChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onFormatChange: (format: ExportFormat) => void;
  onQualityChange: (event: ChangeEvent<HTMLInputElement>) => void;
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
  fileName,
  format,
  image,
  onExport,
  onFileNameChange,
  onFormatChange,
  onQualityChange,
  quality,
  state,
}: ExportSettingsPanelProps) {
  const isExporting = state.status === "saving";
  const canExport = Boolean(image) && !isExporting;

  return (
    <div className="space-y-4">
      <ControlGroup title="Output">
        <label className="space-y-2">
          <span className="text-app-text text-sm font-semibold">File name</span>
          <input
            type="text"
            value={fileName}
            className="border-outline/80 bg-app-bg text-app-text focus:border-accent w-full rounded-2xl border px-3 py-3 text-sm transition outline-none"
            placeholder="watermarked-image"
            onChange={onFileNameChange}
          />
        </label>

        <div className="grid gap-2">
          {exportFormats.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={format === option.id}
              className={`rounded-2xl border px-4 py-4 text-left transition ${
                format === option.id
                  ? "border-accent bg-accent/12 text-app-text"
                  : "border-outline/80 bg-app-bg text-muted hover:border-accent/40 hover:text-app-text"
              }`}
              onClick={() => {
                onFormatChange(option.id);
              }}
            >
              <span className="block text-sm font-semibold">{option.label}</span>
              <span className="mt-2 block text-sm leading-6">{option.description}</span>
            </button>
          ))}
        </div>

        {format === "jpg" ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="export-quality" className="text-app-text text-sm font-semibold">
                JPG quality
              </label>
              <span className="text-muted text-sm font-semibold">{quality}%</span>
            </div>
            <input
              id="export-quality"
              type="range"
              min={60}
              max={100}
              value={quality}
              className="accent-accent w-full"
              onChange={onQualityChange}
            />
          </div>
        ) : (
          <div className="border-outline/70 bg-app-bg/70 text-muted rounded-2xl border px-4 py-4 text-sm leading-6">
            PNG export keeps transparent pixels when the imported image or logo includes alpha.
          </div>
        )}
      </ControlGroup>

      <ControlGroup title="Export status">
        <div
          aria-live="polite"
          className={`rounded-2xl border px-4 py-4 ${
            state.status === "error"
              ? "border-accent/35 bg-accent/10"
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
            className={`mt-2 text-sm leading-6 ${
              state.status === "error" ? "text-app-text" : "text-muted"
            }`}
          >
            {state.error ?? state.message}
          </p>
          {state.lastSavedPath ? (
            <p className="text-app-text mt-3 text-sm font-semibold break-all">
              {state.lastSavedPath}
            </p>
          ) : null}
        </div>

        {state.error ? (
          <div
            role="alert"
            className="border-accent/35 bg-accent/10 text-app-text rounded-2xl border px-4 py-3 text-sm leading-6"
          >
            {state.error}
          </div>
        ) : null}

        <MetadataRow
          label="Source size"
          value={image ? `${image.width} x ${image.height}` : "Load an image first"}
        />
        <MetadataRow label="Format" value={format === "png" ? "PNG" : "JPG"} />

        <button
          type="button"
          className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${
            canExport
              ? "bg-accent text-app-bg hover:brightness-110"
              : "border-outline/80 bg-panel text-muted border"
          }`}
          disabled={!canExport}
          onClick={onExport}
        >
          {isExporting ? "Exporting..." : "Export image"}
        </button>
      </ControlGroup>
    </div>
  );
}

function ControlGroup({ title, children }: { children: ReactNode; title: string }) {
  return (
    <section className="border-outline/70 bg-panel/70 rounded-[1.25rem] border p-4">
      <p className="text-app-text text-sm font-semibold">{title}</p>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
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
