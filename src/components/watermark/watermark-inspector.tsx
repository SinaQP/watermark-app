import { useState, type Dispatch, type SetStateAction } from "react";

import {
  CollapsibleControlSection,
  FormField,
  SliderWithNumberField,
} from "@/components/controls/control-field";
import type { ImportedImage } from "@/lib/image-import";
import { formatFileSize, formatLastModified } from "@/lib/image-import";
import type { SavedWatermarkPreset } from "@/lib/preset-storage";
import {
  WATERMARK_PRESETS,
  formatOpacity,
  formatRotation,
  type WatermarkPresetId,
} from "@/lib/text-watermark";

import type { LogoWatermarkState, TextWatermarkState } from "./types";

type WatermarkInspectorProps = {
  activePresetId: string | null;
  image: ImportedImage | null;
  logo: ImportedImage | null;
  logoWatermark: LogoWatermarkState | null;
  openFilePicker: () => void;
  openLogoPicker: () => void;
  presetFeedback: string;
  savedPresets: SavedWatermarkPreset[];
  suggestedPresetName: string;
  watermark: TextWatermarkState;
  onApplyPreset: (presetId: WatermarkPresetId) => void;
  onDeleteLogo: () => void;
  onDeleteSavedPreset: (presetId: string) => void;
  onLoadSavedPreset: (presetId: string) => void;
  onLogoWatermarkChange: Dispatch<SetStateAction<LogoWatermarkState | null>>;
  onRenameSavedPreset: (presetId: string, name: string) => void;
  onSavePreset: (name: string) => void;
  onWatermarkChange: Dispatch<SetStateAction<TextWatermarkState>>;
};

export function WatermarkInspector({
  activePresetId,
  image,
  logo,
  logoWatermark,
  openFilePicker,
  openLogoPicker,
  presetFeedback,
  savedPresets,
  suggestedPresetName,
  watermark,
  onApplyPreset,
  onDeleteLogo,
  onDeleteSavedPreset,
  onLoadSavedPreset,
  onLogoWatermarkChange,
  onRenameSavedPreset,
  onSavePreset,
  onWatermarkChange,
}: WatermarkInspectorProps) {
  const [presetName, setPresetName] = useState("");
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  function update<K extends keyof TextWatermarkState>(key: K, value: TextWatermarkState[K]) {
    onWatermarkChange((current) => ({ ...current, [key]: value }));
  }

  function updateLogo<K extends keyof LogoWatermarkState>(key: K, value: LogoWatermarkState[K]) {
    onLogoWatermarkChange((current) => (current ? { ...current, [key]: value } : current));
  }

  const resolvedPresetName = presetName.trim().length > 0 ? presetName.trim() : suggestedPresetName;

  function beginRenameFlow(preset: SavedWatermarkPreset) {
    setEditingPresetId(preset.id);
    setRenameDraft(preset.name);
  }

  function commitRename() {
    if (!editingPresetId) {
      return;
    }

    onRenameSavedPreset(editingPresetId, renameDraft);
    setEditingPresetId(null);
    setRenameDraft("");
  }

  return (
    <div className="space-y-3">
      <CollapsibleControlSection
        title="Text settings"
        description="Start here: set the watermark message and readable scale."
        defaultOpen
      >
        <div className="space-y-4">
          <FormField
            label="Watermark text"
            helper="Use short text so it stays legible on smaller images."
          >
            <input
              type="text"
              value={watermark.text}
              className="border-outline/80 bg-app-bg text-app-text focus:border-accent w-full rounded-2xl border px-3 py-3 text-sm transition outline-none"
              placeholder="Enter watermark text"
              aria-label="Watermark text"
              onChange={(event) => {
                update("text", event.currentTarget.value);
              }}
            />
          </FormField>

          <SliderWithNumberField
            id="watermark-font-size"
            label="Font size"
            helper="Quickly balance visibility against image composition."
            min={24}
            max={140}
            value={watermark.fontSize}
            displayValue={`${watermark.fontSize}px`}
            onValueChange={(nextValue) => {
              update("fontSize", clampNumber(nextValue, 24, 140));
            }}
          />
        </div>
      </CollapsibleControlSection>

      <CollapsibleControlSection
        title="Image/logo settings"
        description="Upload or replace the logo watermark and adjust logo-only controls."
        defaultOpen
      >
        {logo && logoWatermark ? (
          <div className="space-y-4">
            <div className="border-outline/70 bg-app-bg/70 rounded-xl border px-3 py-3">
              <p className="text-app-text text-sm font-semibold">{logo.file.name}</p>
              <p className="text-muted mt-1 text-xs leading-5">
                Transparent logos preserve clean edges in the final export.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                className="bg-accent text-app-bg rounded-xl px-4 py-3 text-sm font-semibold transition hover:brightness-110"
                onClick={openLogoPicker}
              >
                Replace logo
              </button>
              <button
                type="button"
                className="text-app-text rounded-xl border border-rose-400/45 bg-rose-500/10 px-4 py-3 text-sm font-semibold transition hover:border-rose-400 hover:bg-rose-500/15"
                onClick={onDeleteLogo}
              >
                Delete logo
              </button>
            </div>

            <SliderWithNumberField
              id="logo-opacity"
              label="Logo opacity"
              helper="Lower values create a subtle brand mark."
              min={5}
              max={100}
              value={Math.round(logoWatermark.opacity * 100)}
              displayValue={formatOpacity(logoWatermark.opacity)}
              onValueChange={(nextValue) => {
                updateLogo("opacity", clampNumber(nextValue, 5, 100) / 100);
              }}
            />

            <SliderWithNumberField
              id="logo-rotation"
              label="Logo rotation"
              helper="Fine-tune logo angle to match the composition."
              min={-180}
              max={180}
              value={logoWatermark.rotation}
              displayValue={formatRotation(logoWatermark.rotation)}
              onValueChange={(nextValue) => {
                updateLogo("rotation", clampNumber(nextValue, -180, 180));
              }}
            />

            <details className="border-outline/60 bg-app-bg/60 rounded-xl border px-3 py-3">
              <summary className="text-app-text cursor-pointer text-sm font-semibold">
                Advanced logo details
              </summary>
              <div className="mt-3 space-y-2">
                <MetadataRow label="Format" value={logo.formatLabel} />
                <MetadataRow label="Size" value={formatFileSize(logo.file.size)} />
                <MetadataRow label="Dimensions" value={`${logo.width} x ${logo.height}`} />
                <MetadataRow label="Canvas width" value={`${Math.round(logoWatermark.width)}px`} />
              </div>
            </details>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-muted text-sm leading-6">
              {image
                ? "No logo selected yet. Add a logo watermark if you want branding on top of text."
                : "Import a base image first, then add a logo watermark if needed."}
            </p>
            <button
              type="button"
              className="bg-accent text-app-bg w-full rounded-xl px-4 py-3 text-sm font-semibold transition hover:brightness-110"
              onClick={openLogoPicker}
            >
              Upload logo watermark
            </button>
          </div>
        )}
      </CollapsibleControlSection>

      <CollapsibleControlSection
        title="Position and alignment"
        description="Use presets for quick placement before manual dragging on canvas."
        defaultOpen
      >
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {WATERMARK_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                aria-pressed={watermark.mode === preset.id}
                className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                  watermark.mode === preset.id
                    ? "border-accent bg-accent/12 text-app-text"
                    : "border-outline/80 bg-app-bg text-muted hover:border-accent/40 hover:text-app-text"
                }`}
                onClick={() => {
                  onApplyPreset(preset.id);
                }}
              >
                <span className="block text-base">{preset.shortLabel}</span>
                <span className="mt-1 block text-[0.68rem] tracking-[0.16em] uppercase">
                  {preset.label}
                </span>
              </button>
            ))}
          </div>
          <p className="text-muted text-xs leading-5">
            After applying a preset, drag directly on the canvas for final alignment.
          </p>
        </div>
      </CollapsibleControlSection>

      <CollapsibleControlSection
        title="Appearance"
        description="Tune final look for readability and subtlety."
        defaultOpen
      >
        <div className="space-y-4">
          <FormField label="Color" helper="Use high contrast when exporting over busy photos.">
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
              <div className="border-outline/80 bg-app-bg text-app-text flex-1 rounded-xl border px-3 py-3 text-sm font-semibold uppercase">
                {watermark.color}
              </div>
            </div>
          </FormField>

          <SliderWithNumberField
            id="watermark-opacity"
            label="Opacity"
            helper="Lower opacity keeps the content readable."
            min={15}
            max={100}
            value={Math.round(watermark.opacity * 100)}
            displayValue={formatOpacity(watermark.opacity)}
            onValueChange={(nextValue) => {
              update("opacity", clampNumber(nextValue, 15, 100) / 100);
            }}
          />

          <SliderWithNumberField
            id="watermark-rotation"
            label="Rotation"
            helper="A small angle often feels less intrusive."
            min={-45}
            max={45}
            value={watermark.rotation}
            displayValue={formatRotation(watermark.rotation)}
            onValueChange={(nextValue) => {
              update("rotation", clampNumber(nextValue, -45, 45));
            }}
          />
        </div>
      </CollapsibleControlSection>

      <CollapsibleControlSection
        title="Presets"
        description="Save and reuse combinations of text and logo transforms."
        defaultOpen
      >
        <div className="space-y-4">
          <FormField
            label="Preset name"
            helper="Use project-specific names so saved configurations are easy to scan."
          >
            <input
              type="text"
              value={presetName}
              className="border-outline/80 bg-app-bg text-app-text focus:border-accent w-full rounded-xl border px-3 py-3 text-sm transition outline-none"
              placeholder={suggestedPresetName}
              aria-label="Preset name"
              onChange={(event) => {
                setPresetName(event.currentTarget.value);
              }}
            />
          </FormField>

          <button
            type="button"
            className="bg-accent text-app-bg w-full rounded-xl px-4 py-3 text-sm font-semibold transition hover:brightness-110"
            onClick={() => {
              onSavePreset(resolvedPresetName);
              setPresetName("");
            }}
          >
            Save current preset
          </button>

          <p className="text-muted text-sm leading-6">{presetFeedback}</p>

          {savedPresets.length > 0 ? (
            <div className="border-outline/70 bg-app-bg/70 space-y-2 rounded-xl border p-2">
              {savedPresets.map((preset) => {
                const isEditing = editingPresetId === preset.id;

                return (
                  <article
                    key={preset.id}
                    className={`rounded-xl border px-3 py-3 ${
                      activePresetId === preset.id
                        ? "border-accent/45 bg-accent/10"
                        : "border-outline/70 bg-panel/75"
                    }`}
                  >
                    {isEditing ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={renameDraft}
                          className="border-outline/80 bg-app-bg text-app-text focus:border-accent w-full rounded-xl border px-3 py-2 text-sm transition outline-none"
                          onChange={(event) => {
                            setRenameDraft(event.currentTarget.value);
                          }}
                        />
                        <div className="grid gap-2 sm:grid-cols-2">
                          <button
                            type="button"
                            className="bg-accent text-app-bg rounded-xl px-3 py-2 text-sm font-semibold transition hover:brightness-110"
                            onClick={commitRename}
                          >
                            Save name
                          </button>
                          <button
                            type="button"
                            className="border-outline/80 bg-app-bg text-app-text hover:border-accent/50 hover:bg-surface rounded-xl border px-3 py-2 text-sm font-semibold transition"
                            onClick={() => {
                              setEditingPresetId(null);
                              setRenameDraft("");
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-app-text text-sm font-semibold">{preset.name}</p>
                            <p className="text-muted mt-1 text-xs leading-5">
                              Updated {formatPresetTimestamp(preset.updatedAt)}
                            </p>
                          </div>
                          {activePresetId === preset.id ? (
                            <span className="border-accent/40 bg-accent/10 text-accent rounded-full border px-2 py-1 text-[0.64rem] font-semibold tracking-[0.16em] uppercase">
                              Active
                            </span>
                          ) : null}
                        </div>
                        <div className="grid gap-2 sm:grid-cols-3">
                          <button
                            type="button"
                            className="bg-accent text-app-bg rounded-xl px-3 py-2 text-sm font-semibold transition hover:brightness-110"
                            onClick={() => {
                              onLoadSavedPreset(preset.id);
                            }}
                          >
                            Load
                          </button>
                          <button
                            type="button"
                            className="border-outline/80 bg-app-bg text-app-text hover:border-accent/50 hover:bg-surface rounded-xl border px-3 py-2 text-sm font-semibold transition"
                            onClick={() => {
                              beginRenameFlow(preset);
                            }}
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            className="text-app-text rounded-xl border border-rose-400/45 bg-rose-500/10 px-3 py-2 text-sm font-semibold transition hover:border-rose-400 hover:bg-rose-500/15"
                            onClick={() => {
                              onDeleteSavedPreset(preset.id);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="border-outline/70 bg-app-bg/70 rounded-xl border px-4 py-4">
              <p className="text-app-text text-sm font-semibold">No presets saved yet</p>
              <p className="text-muted mt-2 text-sm leading-6">
                Save your current text and logo settings to reuse them in future sessions.
              </p>
            </div>
          )}

          <details className="border-outline/60 bg-app-bg/60 rounded-xl border px-3 py-3">
            <summary className="text-app-text cursor-pointer text-sm font-semibold">
              Source file details
            </summary>
            <div className="mt-3 space-y-2">
              {image ? (
                <>
                  <MetadataRow label="File name" value={image.file.name} />
                  <MetadataRow label="Format" value={image.formatLabel} />
                  <MetadataRow label="Size" value={formatFileSize(image.file.size)} />
                  <MetadataRow label="Dimensions" value={`${image.width} x ${image.height}`} />
                  <MetadataRow
                    label="Last modified"
                    value={formatLastModified(image.file.lastModified)}
                  />
                </>
              ) : (
                <p className="text-muted text-sm leading-6">
                  Import a file to view source metadata here.
                </p>
              )}
            </div>
          </details>

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              className="bg-accent text-app-bg rounded-xl px-4 py-3 text-sm font-semibold transition hover:brightness-110"
              onClick={openFilePicker}
            >
              {image ? "Replace image" : "Browse image"}
            </button>
            <button
              type="button"
              className="border-outline/80 bg-app-bg text-app-text hover:border-accent/50 hover:bg-surface rounded-xl border px-4 py-3 text-sm font-semibold transition"
              onClick={openLogoPicker}
            >
              {logo ? "Replace logo" : "Browse logo"}
            </button>
          </div>
        </div>
      </CollapsibleControlSection>
    </div>
  );
}

function formatPresetTimestamp(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-panel/80 flex items-center justify-between gap-3 rounded-xl px-3 py-3">
      <span className="text-muted text-sm">{label}</span>
      <span className="text-app-text max-w-[13rem] text-right text-sm font-semibold">{value}</span>
    </div>
  );
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
