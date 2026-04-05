import type { WatermarkMode, WatermarkPosition } from "@/lib/text-watermark";

export type TextWatermarkState = {
  text: string;
  fontSize: number;
  color: string;
  opacity: number;
  rotation: number;
  mode: WatermarkMode;
  position: WatermarkPosition;
};

export type LogoWatermarkState = {
  position: WatermarkPosition;
  width: number;
  opacity: number;
  rotation: number;
};

export type LogoResizeHandle = "top-left" | "top-right" | "bottom-left" | "bottom-right";
