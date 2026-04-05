import type { ChangeEvent, Dispatch, ReactNode, SetStateAction } from "react";

import type { ImportedImage } from "@/lib/image-import";
import { formatFileSize, formatLastModified } from "@/lib/image-import";
import {
  WATERMARK_PRESETS,
  formatOpacity,
  formatRotation,
  type WatermarkPresetId,
} from "@/lib/text-watermark";

import type { LogoWatermarkState, TextWatermarkState } from "./types";

type WatermarkInspectorProps = {
  image: ImportedImage | null;
  logo: ImportedImage | null;
  logoWatermark: LogoWatermarkState | null;
  openFilePicker: () => void;
  openLogoPicker: () => void;
  watermark: TextWatermarkState;
  onApplyPreset: (presetId: WatermarkPresetId) => void;
  onDeleteLogo: () => void;
  onLogoWatermarkChange: Dispatch<SetStateAction<LogoWatermarkState | null>>;
  onWatermarkChange: Dispatch<SetStateAction<TextWatermarkState>>;
};

export function WatermarkInspector({
  image,
  logo,
  logoWatermark,
  openFilePicker,
  openLogoPicker,
  watermark,
  onApplyPreset,
  onDeleteLogo,
  onLogoWatermarkChange,
  onWatermarkChange,
}: WatermarkInspectorProps) {
  function update<K extends keyof TextWatermarkState>(key: K, value: TextWatermarkState[K]) {
    onWatermarkChange((current) => ({ ...current, [key]: value }));
  }

  function updateLogo<K extends keyof LogoWatermarkState>(key: K, value: LogoWatermarkState[K]) {
    onLogoWatermarkChange((current) => (current ? { ...current, [key]: value } : current));
  }

  return (
    <div className="space-y-4">
      <ControlGroup title="Logo watermark upload">
        {logo && logoWatermark ? (
          <div className="space-y-4">
            <div className="border-outline/70 bg-app-bg/70 rounded-2xl border px-4 py-4">
              <p className="text-app-text text-sm font-semibold">{logo.file.name}</p>
              <p className="text-muted mt-2 text-sm leading-6">
                Transparent PNG edges stay intact because the preview renders the original logo
                asset directly.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                className="bg-accent text-app-bg rounded-2xl px-4 py-3 text-sm font-semibold transition hover:brightness-110"
                onClick={openLogoPicker}
              >
                Replace logo
              </button>
              <button
                type="button"
                className="border-accent/35 bg-accent/10 text-app-text hover:border-accent hover:bg-accent/15 rounded-2xl border px-4 py-3 text-sm font-semibold transition"
                onClick={onDeleteLogo}
              >
                Delete logo
              </button>
            </div>

            <RangeField
              id="logo-opacity"
              label="Logo opacity"
              max={100}
              min={5}
              value={Math.round(logoWatermark.opacity * 100)}
              valueLabel={formatOpacity(logoWatermark.opacity)}
              onChange={(event) => {
                updateLogo("opacity", Number(event.currentTarget.value) / 100);
              }}
            />

            <RangeField
              id="logo-rotation"
              label="Logo rotation"
              max={180}
              min={-180}
              value={logoWatermark.rotation}
              valueLabel={formatRotation(logoWatermark.rotation)}
              onChange={(event) => {
                updateLogo("rotation", Number(event.currentTarget.value));
              }}
            />

            <MetadataRow label="Format" value={logo.formatLabel} />
            <MetadataRow label="Size" value={formatFileSize(logo.file.size)} />
            <MetadataRow label="Dimensions" value={`${logo.width} x ${logo.height}`} />
            <MetadataRow label="Canvas width" value={`${Math.round(logoWatermark.width)}px`} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border-outline/70 bg-app-bg/70 rounded-2xl border px-4 py-4">
              <p className="text-app-text text-sm font-semibold">
                {image ? "No logo selected" : "Logo watermark ready to import"}
              </p>
              <p className="text-muted mt-2 text-sm leading-6">
                {image
                  ? "Upload a transparent PNG, SVG, or another image to place it above the base image."
                  : "Upload a logo watermark now, then choose the base image when you are ready."}
              </p>
            </div>
            <button
              type="button"
              className="bg-accent text-app-bg w-full rounded-2xl px-4 py-3 text-sm font-semibold transition hover:brightness-110"
              onClick={openLogoPicker}
            >
              Upload logo watermark
            </button>
          </div>
        )}
      </ControlGroup>

      <ControlGroup title="Text">
        <label className="space-y-2">
          <span className="text-app-text text-sm font-semibold">Watermark text</span>
          <input
            type="text"
            value={watermark.text}
            className="border-outline/80 bg-app-bg text-app-text focus:border-accent w-full rounded-2xl border px-3 py-3 text-sm transition outline-none"
            placeholder="Enter watermark text"
            onChange={(event) => {
              update("text", event.currentTarget.value);
            }}
          />
        </label>
      </ControlGroup>

      <ControlGroup title="Text appearance">
        <RangeField
          id="watermark-font-size"
          label="Font size"
          max={140}
          min={24}
          value={watermark.fontSize}
          valueLabel={`${watermark.fontSize}px`}
          onChange={(event) => {
            update("fontSize", Number(event.currentTarget.value));
          }}
        />

        <label className="space-y-2">
          <span className="text-app-text text-sm font-semibold">Color</span>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={watermark.color}
              className="border-outline/80 bg-app-bg h-11 w-16 rounded-xl border p-1"
              aria-label="Watermark color"
              onChange={(event) => {
                update("color", event.currentTarget.value);
              }}
            />
            <div className="border-outline/80 bg-app-bg text-app-text flex-1 rounded-2xl border px-3 py-3 text-sm font-semibold uppercase">
              {watermark.color}
            </div>
          </div>
        </label>

        <RangeField
          id="watermark-opacity"
          label="Opacity"
          max={100}
          min={15}
          value={Math.round(watermark.opacity * 100)}
          valueLabel={formatOpacity(watermark.opacity)}
          onChange={(event) => {
            update("opacity", Number(event.currentTarget.value) / 100);
          }}
        />

        <RangeField
          id="watermark-rotation"
          label="Rotation"
          max={45}
          min={-45}
          value={watermark.rotation}
          valueLabel={formatRotation(watermark.rotation)}
          onChange={(event) => {
            update("rotation", Number(event.currentTarget.value));
          }}
        />
      </ControlGroup>

      <ControlGroup title="Text position presets">
        <div className="grid grid-cols-3 gap-2">
          {WATERMARK_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              aria-pressed={watermark.mode === preset.id}
              className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
                watermark.mode === preset.id
                  ? "border-accent bg-accent/12 text-app-text"
                  : "border-outline/80 bg-app-bg text-muted hover:border-accent/40 hover:text-app-text"
              }`}
              onClick={() => {
                onApplyPreset(preset.id);
              }}
            >
              <span className="block text-base">{preset.shortLabel}</span>
              <span className="mt-1 block text-[0.7rem] tracking-[0.16em] uppercase">
                {preset.label}
              </span>
            </button>
          ))}
        </div>
      </ControlGroup>

      <ControlGroup title="Base image details">
        {image ? (
          <div className="space-y-3">
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
          <div className="border-outline/70 bg-app-bg/70 rounded-2xl border px-4 py-4">
            <p className="text-app-text text-sm font-semibold">No image selected</p>
            <p className="text-muted mt-2 text-sm leading-6">
              Import a file to see metadata beside the watermark controls.
            </p>
          </div>
        )}
      </ControlGroup>

      <ControlGroup title="Ready next">
        <p className="text-muted text-sm leading-6">
          Replace the base image to test the same setup on a different size, or swap the logo while
          keeping its current placement and opacity controls.
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            className="bg-accent text-app-bg rounded-2xl px-4 py-3 text-sm font-semibold transition hover:brightness-110"
            onClick={openFilePicker}
          >
            {image ? "Replace image" : "Browse image"}
          </button>
          <button
            type="button"
            className="border-outline/80 bg-app-bg text-app-text hover:border-accent/50 hover:bg-surface rounded-2xl border px-4 py-3 text-sm font-semibold transition"
            onClick={openLogoPicker}
          >
            {logo ? "Replace logo" : "Browse logo"}
          </button>
        </div>
      </ControlGroup>
    </div>
  );
}

function ControlGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-outline/70 bg-panel/70 rounded-[1.25rem] border p-4">
      <p className="text-app-text text-sm font-semibold">{title}</p>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function RangeField({
  id,
  label,
  min,
  max,
  value,
  valueLabel,
  onChange,
}: {
  id: string;
  label: string;
  min: number;
  max: number;
  value: number;
  valueLabel: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-app-text text-sm font-semibold">
          {label}
        </label>
        <span className="text-muted text-sm font-semibold">{valueLabel}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        className="accent-accent w-full"
        onChange={onChange}
      />
    </div>
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
