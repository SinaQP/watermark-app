import type { CSSProperties } from "react";

import type { LogoWatermarkState, TextWatermarkState } from "@/components/watermark/types";

export type ExportFormat = "png" | "jpg";

export type RenderSize = {
  width: number;
  height: number;
};

type RenderWatermarkCompositionOptions = {
  backgroundColor?: string | null;
  baseImage: CanvasImageSource;
  canvas: HTMLCanvasElement;
  logoAspectRatio?: number;
  logoImage?: CanvasImageSource | null;
  logoWatermark: LogoWatermarkState | null;
  outputSize: RenderSize;
  stageSize: RenderSize;
  watermark: TextWatermarkState;
};

const TEXT_FONT_FAMILY = '"IBM Plex Sans", "Segoe UI Variable Text", "Segoe UI", sans-serif';
const TEXT_FONT_WEIGHT = 900;
const TEXT_LETTER_SPACING_EM = 0.18;
const TEXT_LINE_HEIGHT = 0.95;
const TEXT_SHADOW_OFFSET_Y = 3;
const TEXT_SHADOW_BLUR = 18;
const TEXT_STROKE_WIDTH = 1;
const TEXT_STROKE_COLOR = "rgba(15, 23, 42, 0.18)";
const TEXT_SHADOW_COLOR = "rgba(0, 0, 0, 0.4)";

export async function renderWatermarkComposition({
  backgroundColor,
  baseImage,
  canvas,
  logoAspectRatio = 1,
  logoImage,
  logoWatermark,
  outputSize,
  stageSize,
  watermark,
}: RenderWatermarkCompositionOptions) {
  await waitForFonts();

  const safeOutputSize = normalizeSize(outputSize);
  const safeStageSize = normalizeSize(stageSize, safeOutputSize);
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Preview renderer is unavailable in this environment.");
  }

  canvas.width = safeOutputSize.width;
  canvas.height = safeOutputSize.height;

  context.save();
  context.clearRect(0, 0, safeOutputSize.width, safeOutputSize.height);

  if (backgroundColor) {
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, safeOutputSize.width, safeOutputSize.height);
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(baseImage, 0, 0, safeOutputSize.width, safeOutputSize.height);

  const scaleX = safeOutputSize.width / safeStageSize.width;
  const scaleY = safeOutputSize.height / safeStageSize.height;
  const uniformScale = (scaleX + scaleY) / 2;

  if (watermark.text.trim().length > 0) {
    drawTextWatermark(context, watermark, safeOutputSize, uniformScale);
  }

  if (logoImage && logoWatermark) {
    drawLogoWatermark(
      context,
      logoImage,
      logoWatermark,
      safeOutputSize,
      logoAspectRatio,
      scaleX,
      scaleY,
    );
  }

  context.restore();
}

export function getTextWatermarkOverlayStyle(
  watermark: TextWatermarkState,
  isDragging: boolean,
): CSSProperties {
  return {
    color: watermark.color,
    cursor: isDragging ? "grabbing" : "grab",
    fontFamily: TEXT_FONT_FAMILY,
    fontSize: `${watermark.fontSize}px`,
    fontWeight: TEXT_FONT_WEIGHT,
    letterSpacing: `${TEXT_LETTER_SPACING_EM}em`,
    lineHeight: `${TEXT_LINE_HEIGHT}`,
    opacity: watermark.opacity,
    textShadow: "0 3px 14px rgba(0,0,0,0.45), 0 0 22px rgba(0,0,0,0.22)",
    transform: `translate(-50%, -50%) rotate(${watermark.rotation}deg)`,
    WebkitTextStroke: `${TEXT_STROKE_WIDTH}px ${TEXT_STROKE_COLOR}`,
  };
}

export function resolveExportMimeType(format: ExportFormat) {
  return format === "png" ? "image/png" : "image/jpeg";
}

export function resolveExportExtension(format: ExportFormat) {
  return format === "png" ? "png" : "jpg";
}

function drawTextWatermark(
  context: CanvasRenderingContext2D,
  watermark: TextWatermarkState,
  outputSize: RenderSize,
  scale: number,
) {
  const fontSize = watermark.fontSize * scale;
  const letterSpacing = fontSize * TEXT_LETTER_SPACING_EM;
  const centerX = watermark.position.x * outputSize.width;
  const centerY = watermark.position.y * outputSize.height;

  context.save();
  context.translate(centerX, centerY);
  context.rotate((watermark.rotation * Math.PI) / 180);
  context.globalAlpha = watermark.opacity;
  context.font = `${TEXT_FONT_WEIGHT} ${fontSize}px ${TEXT_FONT_FAMILY}`;
  context.textAlign = "left";
  context.textBaseline = "middle";

  const textWidth = measureTrackedTextWidth(context, watermark.text, letterSpacing);
  const originX = -textWidth / 2;

  context.shadowColor = TEXT_SHADOW_COLOR;
  context.shadowBlur = TEXT_SHADOW_BLUR * scale;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = TEXT_SHADOW_OFFSET_Y * scale;
  context.fillStyle = watermark.color;
  drawTrackedText(context, watermark.text, originX, 0, letterSpacing, "fill");

  context.shadowColor = "transparent";
  context.shadowBlur = 0;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;
  context.lineJoin = "round";
  context.miterLimit = 2;
  context.lineWidth = Math.max(TEXT_STROKE_WIDTH * scale, 1);
  context.strokeStyle = TEXT_STROKE_COLOR;
  drawTrackedText(context, watermark.text, originX, 0, letterSpacing, "stroke");

  context.fillStyle = watermark.color;
  drawTrackedText(context, watermark.text, originX, 0, letterSpacing, "fill");
  context.restore();
}

function drawLogoWatermark(
  context: CanvasRenderingContext2D,
  logoImage: CanvasImageSource,
  logoWatermark: LogoWatermarkState,
  outputSize: RenderSize,
  logoAspectRatio: number,
  scaleX: number,
  scaleY: number,
) {
  const safeAspectRatio = logoAspectRatio > 0 ? logoAspectRatio : 1;
  const previewHeight = logoWatermark.width / safeAspectRatio;
  const width = logoWatermark.width * scaleX;
  const height = previewHeight * scaleY;
  const centerX = logoWatermark.position.x * outputSize.width;
  const centerY = logoWatermark.position.y * outputSize.height;

  context.save();
  context.globalAlpha = logoWatermark.opacity;
  context.translate(centerX, centerY);
  context.rotate((logoWatermark.rotation * Math.PI) / 180);
  context.drawImage(logoImage, -width / 2, -height / 2, width, height);
  context.restore();
}

function drawTrackedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  letterSpacing: number,
  mode: "fill" | "stroke",
) {
  let cursor = x;

  for (const character of text) {
    if (mode === "fill") {
      context.fillText(character, cursor, y);
    } else {
      context.strokeText(character, cursor, y);
    }

    cursor += context.measureText(character).width + letterSpacing;
  }
}

function measureTrackedTextWidth(
  context: CanvasRenderingContext2D,
  text: string,
  letterSpacing: number,
) {
  if (text.length === 0) {
    return 0;
  }

  let width = 0;

  for (const character of text) {
    width += context.measureText(character).width;
  }

  return width + letterSpacing * Math.max(text.length - 1, 0);
}

function normalizeSize(size: RenderSize, fallback = { width: 1, height: 1 }): RenderSize {
  const width = Math.max(Math.round(size.width), 1);
  const height = Math.max(Math.round(size.height), 1);

  if (Number.isFinite(width) && Number.isFinite(height)) {
    return { width, height };
  }

  return fallback;
}

async function waitForFonts() {
  if (typeof document === "undefined" || !("fonts" in document)) {
    return;
  }

  await document.fonts.ready;
}
