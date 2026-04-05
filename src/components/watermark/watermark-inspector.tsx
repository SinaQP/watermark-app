import { useState, type Dispatch, type SetStateAction } from "react";

import {
  CollapsibleControlSection,
  FormField,
  SliderWithNumberField,
} from "@/components/controls/control-field";
import {
  ImageFileIcon,
  LogoMarkIcon,
  PresetIcon,
  SettingsIcon,
  TextToolIcon,
} from "@/components/ui/app-icons";
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
    <div className="space-y-2">
      <CollapsibleControlSection
        title="Text settings"
        description="Core watermark text and scale."
        icon={<TextToolIcon className="h-4 w-4" />}
        defaultOpen
      >
        <FormField label="Watermark text" compact>
          <input
            type="text"
            value={watermark.text}
            className="tool-input w-full"
            placeholder="Studio Proof"
            aria-label="Watermark text"
            onChange={(event) => {
              update("text", event.currentTarget.value);
            }}
          />
        </FormField>

        <SliderWithNumberField
          id="watermark-font-size"
          label="Font size"
          min={24}
          max={140}
          value={watermark.fontSize}
          displayValue={`${watermark.fontSize}px`}
          onValueChange={(nextValue) => {
            update("fontSize", clampNumber(nextValue, 24, 140));
          }}
        />
      </CollapsibleControlSection>

      <CollapsibleControlSection
        title="Appearance"
        description="Opacity, color, and rotation."
        icon={<SettingsIcon className="h-4 w-4" />}
        defaultOpen
      >
        <FormField label="Watermark color" compact>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={watermark.color}
              className="border-outline/80 bg-app-bg h-10 w-14 rounded-lg border p-1"
              aria-label="Watermark color"
              onChange={(event) => {
                update("color", event.currentTarget.value);
              }}
            />
            <div className="tool-input flex-1 py-2 text-xs font-semibold uppercase">
              {watermark.color}
            </div>
          </div>
        </FormField>

        <SliderWithNumberField
          id="watermark-opacity"
          label="Opacity"
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
          min={-45}
          max={45}
          value={watermark.rotation}
          displayValue={formatRotation(watermark.rotation)}
          onValueChange={(nextValue) => {
            update("rotation", clampNumber(nextValue, -45, 45));
          }}
        />
      </CollapsibleControlSection>

      <CollapsibleControlSection
        title="Position"
        description="Apply one-click placement presets."
        icon={<ImageFileIcon className="h-4 w-4" />}
        defaultOpen
      >
        <div className="grid grid-cols-4 gap-1.5">
          {WATERMARK_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              aria-pressed={watermark.mode === preset.id}
              className={`rounded-lg border px-2 py-2 text-center text-[0.68rem] font-semibold transition ${
                watermark.mode === preset.id
                  ? "border-accent/55 bg-accent/14 text-app-text"
                  : "border-outline/80 bg-app-bg text-muted hover:border-accent/45 hover:text-app-text"
              }`}
              onClick={() => {
                onApplyPreset(preset.id);
              }}
            >
              {preset.shortLabel}
            </button>
          ))}
        </div>
      </CollapsibleControlSection>

      <CollapsibleControlSection
        title="Image/logo settings"
        description="Upload, remove, and tweak logo watermark."
        icon={<LogoMarkIcon className="h-4 w-4" />}
        defaultOpen
      >
        {logo && logoWatermark ? (
          <div className="space-y-3">
            <div className="tool-subtle rounded-lg border px-3 py-2">
              <p className="text-app-text text-xs font-semibold">{logo.file.name}</p>
              <p className="text-muted text-[0.68rem]">
                {logo.width} x {logo.height}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                className="border-accent/45 bg-accent/12 rounded-lg border px-3 py-2 text-xs font-semibold"
                onClick={openLogoPicker}
              >
                Replace logo
              </button>
              <button
                type="button"
                className="rounded-lg border border-rose-400/45 bg-rose-500/10 px-3 py-2 text-xs font-semibold"
                onClick={onDeleteLogo}
              >
                Delete logo
              </button>
            </div>

            <SliderWithNumberField
              id="logo-opacity"
              label="Logo opacity"
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
              min={-180}
              max={180}
              value={logoWatermark.rotation}
              displayValue={formatRotation(logoWatermark.rotation)}
              onValueChange={(nextValue) => {
                updateLogo("rotation", clampNumber(nextValue, -180, 180));
              }}
            />
          </div>
        ) : (
          <button
            type="button"
            className="border-accent/45 bg-accent/12 rounded-lg border px-3 py-2 text-xs font-semibold"
            onClick={openLogoPicker}
          >
            Upload logo watermark
          </button>
        )}
      </CollapsibleControlSection>

      <CollapsibleControlSection
        title="Presets"
        description="Save, recall, and manage reusable looks."
        icon={<PresetIcon className="h-4 w-4" />}
        defaultOpen
      >
        <FormField label="Preset name" compact>
          <input
            type="text"
            value={presetName}
            className="tool-input w-full"
            placeholder={suggestedPresetName}
            aria-label="Preset name"
            onChange={(event) => {
              setPresetName(event.currentTarget.value);
            }}
          />
        </FormField>

        <button
          type="button"
          className="border-accent/45 bg-accent/14 rounded-lg border px-3 py-2 text-xs font-semibold"
          onClick={() => {
            onSavePreset(resolvedPresetName);
            setPresetName("");
          }}
        >
          Save current preset
        </button>

        <p className="text-muted text-[0.72rem]">{presetFeedback}</p>

        {savedPresets.length > 0 ? (
          <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
            {savedPresets.map((preset) => {
              const isEditing = editingPresetId === preset.id;

              return (
                <article
                  key={preset.id}
                  className={`tool-subtle rounded-lg border px-2.5 py-2 ${
                    activePresetId === preset.id ? "border-accent/45 bg-accent/10" : ""
                  }`}
                >
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={renameDraft}
                        className="tool-input w-full"
                        onChange={(event) => {
                          setRenameDraft(event.currentTarget.value);
                        }}
                      />
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          className="border-accent/45 bg-accent/12 rounded-lg border px-2 py-1.5 text-xs font-semibold"
                          onClick={commitRename}
                        >
                          Save name
                        </button>
                        <button
                          type="button"
                          className="tool-subtle rounded-lg border px-2 py-1.5 text-xs font-semibold"
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
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-app-text truncate text-xs font-semibold">
                            {preset.name}
                          </p>
                          <p className="text-muted text-[0.66rem]">
                            {formatPresetTimestamp(preset.updatedAt)}
                          </p>
                        </div>
                        {activePresetId === preset.id ? (
                          <span className="text-accent text-[0.62rem] font-semibold uppercase">
                            Active
                          </span>
                        ) : null}
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          className="border-accent/45 bg-accent/12 rounded-lg border px-2 py-1.5 text-xs font-semibold"
                          onClick={() => {
                            onLoadSavedPreset(preset.id);
                          }}
                        >
                          Load
                        </button>
                        <button
                          type="button"
                          className="tool-subtle rounded-lg border px-2 py-1.5 text-xs font-semibold"
                          onClick={() => {
                            beginRenameFlow(preset);
                          }}
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-rose-400/45 bg-rose-500/10 px-2 py-1.5 text-xs font-semibold"
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
          <p className="tool-subtle rounded-lg border px-3 py-2 text-xs">No presets saved yet</p>
        )}
      </CollapsibleControlSection>

      <CollapsibleControlSection
        title="File / source"
        description="Source metadata and quick replace actions."
        icon={<ImageFileIcon className="h-4 w-4" />}
        defaultOpen={false}
      >
        {image ? (
          <div className="space-y-1.5 text-[0.72rem]">
            <MetadataRow label="Name" value={image.file.name} />
            <MetadataRow label="Format" value={image.formatLabel} />
            <MetadataRow label="Size" value={formatFileSize(image.file.size)} />
            <MetadataRow label="Date" value={formatLastModified(image.file.lastModified)} />
          </div>
        ) : (
          <p className="text-muted text-[0.72rem]">No image selected.</p>
        )}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            className="border-accent/45 bg-accent/12 rounded-lg border px-3 py-2 text-xs font-semibold"
            onClick={openFilePicker}
          >
            {image ? "Replace image" : "Browse image"}
          </button>
          <button
            type="button"
            className="tool-subtle rounded-lg border px-3 py-2 text-xs font-semibold"
            onClick={openLogoPicker}
          >
            {logo ? "Replace logo" : "Browse logo"}
          </button>
        </div>
      </CollapsibleControlSection>
    </div>
  );
}

function formatPresetTimestamp(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp));
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="tool-subtle flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5">
      <span className="text-muted text-[0.68rem]">{label}</span>
      <span className="text-app-text max-w-[12rem] truncate text-[0.68rem] font-semibold">
        {value}
      </span>
    </div>
  );
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
