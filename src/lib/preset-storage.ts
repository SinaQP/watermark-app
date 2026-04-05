import type { LogoWatermarkState, TextWatermarkState } from "@/components/watermark/types";
import { WATERMARK_PRESETS, type WatermarkMode } from "@/lib/text-watermark";

export type SavedWatermarkPreset = {
  createdAt: number;
  id: string;
  logoWatermark: LogoWatermarkState | null;
  name: string;
  updatedAt: number;
  watermark: TextWatermarkState;
};

const PRESET_STORAGE_KEY = "watermark-custom-presets";
const PRESET_NAME_PREFIX = "Preset";
const MAX_PRESETS = 30;
const DEFAULT_MODE: WatermarkMode = "bottom-right";

export function loadSavedPresets(): SavedWatermarkPreset[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(PRESET_STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => normalizePreset(item))
      .filter((item): item is SavedWatermarkPreset => item !== null)
      .slice(0, MAX_PRESETS);
  } catch {
    return [];
  }
}

export function savePresets(presets: SavedWatermarkPreset[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets.slice(0, MAX_PRESETS)));
}

export function createPresetName(presets: SavedWatermarkPreset[]) {
  for (let index = 1; index <= MAX_PRESETS; index += 1) {
    const candidate = `${PRESET_NAME_PREFIX} ${index}`;
    if (!presets.some((preset) => preset.name.toLowerCase() === candidate.toLowerCase())) {
      return candidate;
    }
  }

  return `${PRESET_NAME_PREFIX} ${presets.length + 1}`;
}

function normalizePreset(value: unknown): SavedWatermarkPreset | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = typeof value.id === "string" && value.id.trim().length > 0 ? value.id.trim() : null;
  const name =
    typeof value.name === "string" && value.name.trim().length > 0 ? value.name.trim() : null;
  const watermark = normalizeTextWatermark(value.watermark);
  const logoWatermark = normalizeLogoWatermark(value.logoWatermark);

  if (!id || !name || !watermark) {
    return null;
  }

  return {
    createdAt: normalizeTimestamp(value.createdAt),
    id,
    logoWatermark,
    name,
    updatedAt: normalizeTimestamp(value.updatedAt),
    watermark,
  };
}

function normalizeTextWatermark(value: unknown): TextWatermarkState | null {
  if (!isRecord(value)) {
    return null;
  }

  if (typeof value.text !== "string") {
    return null;
  }

  const mode = isWatermarkMode(value.mode) ? value.mode : DEFAULT_MODE;
  const position = normalizePosition(value.position);

  if (!position) {
    return null;
  }

  return {
    color: normalizeColor(value.color),
    fontSize: normalizeNumber(value.fontSize, 20, 240, 68),
    mode,
    opacity: normalizeNumber(value.opacity, 0.05, 1, 0.58),
    position,
    rotation: normalizeNumber(value.rotation, -180, 180, -18),
    text: value.text.slice(0, 120),
  };
}

function normalizeLogoWatermark(value: unknown): LogoWatermarkState | null {
  if (!isRecord(value)) {
    return null;
  }

  const position = normalizePosition(value.position);
  if (!position) {
    return null;
  }

  return {
    opacity: normalizeNumber(value.opacity, 0, 1, 0.82),
    position,
    rotation: normalizeNumber(value.rotation, -180, 180, 0),
    width: normalizeNumber(value.width, 40, 4000, 160),
  };
}

function normalizePosition(value: unknown) {
  if (!isRecord(value)) {
    return null;
  }

  return {
    x: normalizeNumber(value.x, 0, 1, 0.82),
    y: normalizeNumber(value.y, 0, 1, 0.84),
  };
}

function normalizeColor(value: unknown) {
  if (typeof value !== "string") {
    return "#ffffff";
  }

  return /^#[0-9A-Fa-f]{6}$/.test(value) ? value : "#ffffff";
}

function normalizeTimestamp(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  return Date.now();
}

function normalizeNumber(value: unknown, min: number, max: number, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(Math.max(value, min), max);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isWatermarkMode(value: unknown): value is WatermarkMode {
  if (value === "custom") {
    return true;
  }

  return WATERMARK_PRESETS.some((preset) => preset.id === value);
}
