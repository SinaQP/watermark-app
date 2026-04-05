export const WATERMARK_PRESETS = [
  { id: "top-left", label: "Top left", shortLabel: "TL" },
  { id: "top-center", label: "Top center", shortLabel: "TC" },
  { id: "top-right", label: "Top right", shortLabel: "TR" },
  { id: "center", label: "Center", shortLabel: "C" },
  { id: "bottom-left", label: "Bottom left", shortLabel: "BL" },
  { id: "bottom-center", label: "Bottom center", shortLabel: "BC" },
  { id: "bottom-right", label: "Bottom right", shortLabel: "BR" },
] as const;

export type WatermarkPresetId = (typeof WATERMARK_PRESETS)[number]["id"];
export type WatermarkMode = WatermarkPresetId | "custom";

export type WatermarkPosition = {
  x: number;
  y: number;
};

export type WatermarkBounds = {
  width: number;
  height: number;
};

const DEFAULT_INSET = 0.1;
const EXTRA_EDGE_PADDING = 0.02;
const DEFAULT_MIN_LOGO_WIDTH = 56;

export function clampWatermarkPosition(
  position: WatermarkPosition,
  stageBounds: WatermarkBounds,
  overlayBounds: WatermarkBounds,
): WatermarkPosition {
  const limits = resolveLimits(stageBounds, overlayBounds);

  return {
    x: clamp(position.x, limits.minX, limits.maxX),
    y: clamp(position.y, limits.minY, limits.maxY),
  };
}

export function getPresetPosition(
  presetId: WatermarkPresetId,
  stageBounds: WatermarkBounds,
  overlayBounds: WatermarkBounds,
): WatermarkPosition {
  const limits = resolveLimits(stageBounds, overlayBounds);

  switch (presetId) {
    case "top-left":
      return { x: limits.minX, y: limits.minY };
    case "top-center":
      return { x: 0.5, y: limits.minY };
    case "top-right":
      return { x: limits.maxX, y: limits.minY };
    case "center":
      return { x: 0.5, y: 0.5 };
    case "bottom-left":
      return { x: limits.minX, y: limits.maxY };
    case "bottom-center":
      return { x: 0.5, y: limits.maxY };
    case "bottom-right":
      return { x: limits.maxX, y: limits.maxY };
  }
}

export function formatWatermarkPosition(position: WatermarkPosition): string {
  return `${Math.round(position.x * 100)}% x ${Math.round(position.y * 100)}%`;
}

export function formatOpacity(opacity: number): string {
  return `${Math.round(opacity * 100)}%`;
}

export function formatRotation(rotation: number): string {
  return `${rotation > 0 ? "+" : ""}${rotation}deg`;
}

export function getPresetLabel(mode: WatermarkMode): string {
  if (mode === "custom") {
    return "Custom";
  }

  return WATERMARK_PRESETS.find((preset) => preset.id === mode)?.label ?? "Custom";
}

export function getWatermarkBoundsForWidth(width: number, aspectRatio: number): WatermarkBounds {
  if (width <= 0 || aspectRatio <= 0) {
    return { width: 0, height: 0 };
  }

  return {
    width,
    height: width / aspectRatio,
  };
}

export function measureRotatedWatermarkBounds(
  bounds: WatermarkBounds,
  rotation: number,
): WatermarkBounds {
  if (bounds.width <= 0 || bounds.height <= 0) {
    return { width: 0, height: 0 };
  }

  const radians = Math.abs((rotation * Math.PI) / 180);
  const cosine = Math.abs(Math.cos(radians));
  const sine = Math.abs(Math.sin(radians));

  return {
    width: bounds.width * cosine + bounds.height * sine,
    height: bounds.width * sine + bounds.height * cosine,
  };
}

export function fitLogoWidthToStage(
  width: number,
  stageBounds: WatermarkBounds,
  rotation: number,
  aspectRatio: number,
  minWidth = DEFAULT_MIN_LOGO_WIDTH,
): number {
  return clampWidth(
    width,
    resolveMaxWidth(stageBounds.width, stageBounds.height, rotation, aspectRatio),
    minWidth,
  );
}

export function clampLogoWidthToPosition(
  width: number,
  stageBounds: WatermarkBounds,
  position: WatermarkPosition,
  rotation: number,
  aspectRatio: number,
  minWidth = DEFAULT_MIN_LOGO_WIDTH,
): number {
  const availableWidth = Math.max(Math.min(position.x, 1 - position.x) * stageBounds.width * 2, 0);
  const availableHeight = Math.max(
    Math.min(position.y, 1 - position.y) * stageBounds.height * 2,
    0,
  );

  return clampWidth(
    width,
    resolveMaxWidth(availableWidth, availableHeight, rotation, aspectRatio),
    minWidth,
  );
}

function resolveLimits(stageBounds: WatermarkBounds, overlayBounds: WatermarkBounds) {
  const insetX = resolveInset(stageBounds.width, overlayBounds.width);
  const insetY = resolveInset(stageBounds.height, overlayBounds.height);

  return {
    minX: insetX,
    maxX: 1 - insetX,
    minY: insetY,
    maxY: 1 - insetY,
  };
}

function resolveInset(stageSize: number, overlaySize: number): number {
  if (stageSize <= 0) {
    return DEFAULT_INSET;
  }

  const halfRatio = overlaySize > 0 ? overlaySize / (2 * stageSize) : DEFAULT_INSET;
  const inset = Math.max(DEFAULT_INSET, halfRatio + EXTRA_EDGE_PADDING);

  return Math.min(inset, 0.5);
}

function clamp(value: number, min: number, max: number): number {
  if (min > max) {
    return 0.5;
  }

  return Math.min(Math.max(value, min), max);
}

function clampWidth(width: number, maxWidth: number, minWidth: number): number {
  if (!Number.isFinite(maxWidth) || maxWidth <= 0) {
    return minWidth;
  }

  const safeMinWidth = Math.min(minWidth, maxWidth);

  return Math.min(Math.max(width, safeMinWidth), maxWidth);
}

function resolveMaxWidth(
  availableWidth: number,
  availableHeight: number,
  rotation: number,
  aspectRatio: number,
): number {
  if (availableWidth <= 0 || availableHeight <= 0 || aspectRatio <= 0) {
    return 0;
  }

  const radians = Math.abs((rotation * Math.PI) / 180);
  const cosine = Math.abs(Math.cos(radians));
  const sine = Math.abs(Math.sin(radians));
  const widthFactor = cosine + sine / aspectRatio;
  const heightFactor = sine + cosine / aspectRatio;

  return Math.min(availableWidth / widthFactor, availableHeight / heightFactor);
}
