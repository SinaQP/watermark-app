import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "@/app/App";
import {
  exportWatermarkedImage,
  exportWatermarkedImageToPath,
  pickExportFolder,
} from "@/lib/export";

vi.mock("@/lib/export", async () => {
  const actual = await vi.importActual<typeof import("@/lib/export")>("@/lib/export");

  return {
    ...actual,
    exportWatermarkedImage: vi.fn(),
    exportWatermarkedImageToPath: vi.fn(),
    pickExportFolder: vi.fn(),
  };
});

const exportWatermarkedImageMock = vi.mocked(exportWatermarkedImage);
const exportWatermarkedImageToPathMock = vi.mocked(exportWatermarkedImageToPath);
const pickExportFolderMock = vi.mocked(pickExportFolder);

describe("App shell", () => {
  beforeEach(() => {
    exportWatermarkedImageMock.mockReset();
    exportWatermarkedImageToPathMock.mockReset();
    pickExportFolderMock.mockReset();
  });

  it("renders the text watermark shell and toggles the theme", async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(
      screen.getByRole("heading", { name: /portfolio-ready watermark editor/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /watermark session/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /watermark canvas/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /watermark settings/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /export settings/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("light");
    });

    await user.click(screen.getByRole("button", { name: /switch to dark theme/i }));

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("dark");
      expect(window.localStorage.getItem("watermark-theme")).toBe("dark");
    });
  });

  it("uploads an image and renders the default watermark overlay", async () => {
    const user = userEvent.setup();

    render(<App />);

    const input = screen.getByLabelText(/choose image file/i);
    const file = new File(["image-data"], "portrait.png", {
      type: "image/png",
      lastModified: new Date("2026-04-05T09:30:00Z").getTime(),
    });

    await user.upload(input, file);

    expect(
      await screen.findByRole("img", { name: /preview of portrait\.png/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("watermark-overlay")).toHaveTextContent("Studio Proof");
  });

  it("updates watermark controls live", async () => {
    const user = userEvent.setup();

    render(<App />);

    const input = screen.getByLabelText(/choose image file/i);
    const file = new File(["image-data"], "portrait.png", {
      type: "image/png",
      lastModified: new Date("2026-04-05T09:30:00Z").getTime(),
    });

    await user.upload(input, file);

    await user.clear(screen.getByLabelText(/watermark text/i));
    await user.type(screen.getByLabelText(/watermark text/i), "Confidential");
    fireEvent.change(screen.getByLabelText(/font size/i), { target: { value: "92" } });
    fireEvent.change(screen.getByLabelText(/watermark color/i), {
      target: { value: "#ff6600" },
    });
    fireEvent.change(screen.getByLabelText(/opacity/i), { target: { value: "72" } });
    fireEvent.change(screen.getByLabelText(/rotation/i), { target: { value: "12" } });

    const overlay = screen.getByTestId("watermark-overlay");

    expect(overlay).toHaveTextContent("Confidential");
    expect(overlay).toHaveStyle({ fontSize: "92px", opacity: "0.72" });
    expect(overlay.style.transform).toContain("rotate(12deg)");
  });

  it("supports drag-to-move on the watermark overlay", async () => {
    const user = userEvent.setup();

    render(<App />);

    const input = screen.getByLabelText(/choose image file/i);
    const file = new File(["image-data"], "scene.webp", {
      type: "image/webp",
      lastModified: new Date("2026-04-05T09:45:00Z").getTime(),
    });

    await user.upload(input, file);

    const stage = screen.getByTestId("preview-stage");
    const overlay = screen.getByTestId("watermark-overlay");

    Object.defineProperty(stage, "getBoundingClientRect", {
      value: () => ({
        bottom: 500,
        height: 500,
        left: 0,
        right: 800,
        top: 0,
        width: 800,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    Object.defineProperty(overlay, "getBoundingClientRect", {
      value: () => ({
        bottom: 460,
        height: 60,
        left: 546,
        right: 766,
        top: 400,
        width: 220,
        x: 546,
        y: 400,
        toJSON: () => ({}),
      }),
    });

    fireEvent.pointerDown(overlay, { clientX: 656, clientY: 420, pointerId: 1 });
    fireEvent.pointerMove(overlay, { clientX: 320, clientY: 180, pointerId: 1 });
    fireEvent.pointerUp(overlay, { clientX: 320, clientY: 180, pointerId: 1 });

    expect(parseFloat(overlay.style.left)).toBeGreaterThan(30);
    expect(parseFloat(overlay.style.left)).toBeLessThan(50);
    expect(parseFloat(overlay.style.top)).toBeGreaterThan(25);
    expect(parseFloat(overlay.style.top)).toBeLessThan(45);
  });

  it("uploads an svg logo watermark and updates logo controls live", async () => {
    const user = userEvent.setup();

    render(<App />);

    const logoInput = screen.getByLabelText(/choose logo file/i);
    const logoFile = new File(
      [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="24" fill="#ffffff"/></svg>',
      ],
      "mark.svg",
      {
        type: "image/svg+xml",
        lastModified: new Date("2026-04-05T09:50:00Z").getTime(),
      },
    );
    const input = screen.getByLabelText(/choose image file/i);
    const file = new File(["image-data"], "portrait.png", {
      type: "image/png",
      lastModified: new Date("2026-04-05T09:30:00Z").getTime(),
    });

    await user.upload(logoInput, logoFile);
    await user.upload(input, file);

    expect(screen.getAllByText(/mark\.svg/i).length).toBeGreaterThan(0);

    const logoOverlay = await screen.findByTestId("logo-overlay");

    expect(screen.getByTestId("logo-watermark-image")).toHaveAttribute(
      "alt",
      expect.stringMatching(/logo watermark mark\.svg/i),
    );

    fireEvent.change(screen.getByLabelText(/logo opacity/i), { target: { value: "64" } });
    fireEvent.change(screen.getByLabelText(/logo rotation/i), { target: { value: "33" } });

    expect(logoOverlay).toHaveStyle({ opacity: "0.64" });
    expect(logoOverlay.style.transform).toContain("rotate(33deg)");
  });

  it("supports move, resize, and delete for the logo watermark", async () => {
    const user = userEvent.setup();

    render(<App />);

    const imageInput = screen.getByLabelText(/choose image file/i);
    const imageFile = new File(["image-data"], "scene.webp", {
      type: "image/webp",
      lastModified: new Date("2026-04-05T09:45:00Z").getTime(),
    });
    const logoInput = screen.getByLabelText(/choose logo file/i);
    const logoFile = new File(["logo-data"], "seal.png", {
      type: "image/png",
      lastModified: new Date("2026-04-05T09:50:00Z").getTime(),
    });

    await user.upload(imageInput, imageFile);
    await user.upload(logoInput, logoFile);

    const stage = screen.getByTestId("preview-stage");
    const logoOverlay = await screen.findByTestId("logo-overlay");
    const dragSurface = screen.getByRole("button", { name: /drag logo watermark/i });
    const resizeHandle = screen.getByTestId("logo-resize-bottom-right");

    Object.defineProperty(stage, "getBoundingClientRect", {
      value: () => ({
        bottom: 500,
        height: 500,
        left: 0,
        right: 800,
        top: 0,
        width: 800,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    fireEvent.pointerDown(dragSurface, { clientX: 640, clientY: 420, pointerId: 2 });
    fireEvent.pointerMove(dragSurface, { clientX: 420, clientY: 250, pointerId: 2 });
    fireEvent.pointerUp(dragSurface, { clientX: 420, clientY: 250, pointerId: 2 });

    expect(parseFloat(logoOverlay.style.left)).toBeGreaterThan(50);
    expect(parseFloat(logoOverlay.style.left)).toBeLessThan(70);
    expect(parseFloat(logoOverlay.style.top)).toBeGreaterThan(40);
    expect(parseFloat(logoOverlay.style.top)).toBeLessThan(60);

    fireEvent.pointerDown(resizeHandle, { clientX: 520, clientY: 300, pointerId: 3 });
    fireEvent.pointerMove(resizeHandle, { clientX: 660, clientY: 380, pointerId: 3 });
    fireEvent.pointerUp(resizeHandle, { clientX: 660, clientY: 380, pointerId: 3 });

    expect(parseFloat(logoOverlay.style.width)).toBeGreaterThan(160);

    await user.click(screen.getAllByRole("button", { name: /delete logo/i })[0]);

    expect(screen.queryByTestId("logo-overlay")).not.toBeInTheDocument();
  });

  it("exports the current image with the selected output settings", async () => {
    const user = userEvent.setup();

    exportWatermarkedImageMock.mockResolvedValue({
      bytesWritten: 2048,
      path: "C:\\Exports\\client-proof.jpg",
    });

    render(<App />);

    const imageInput = screen.getByLabelText(/choose image file/i);
    const imageFile = new File(["image-data"], "portrait.png", {
      type: "image/png",
      lastModified: new Date("2026-04-05T09:30:00Z").getTime(),
    });

    await user.upload(imageInput, imageFile);
    await user.click(screen.getByRole("button", { name: /jpg/i }));
    fireEvent.change(screen.getByLabelText(/jpg quality/i), { target: { value: "88" } });
    await user.clear(screen.getByLabelText(/file name/i));
    await user.type(screen.getByLabelText(/file name/i), "client-proof");
    await user.click(screen.getByRole("button", { name: /export image/i }));

    await waitFor(() => {
      expect(exportWatermarkedImageMock).toHaveBeenCalledWith(
        expect.objectContaining({
          previewStageSize: { height: 1600, width: 2400 },
          settings: expect.objectContaining({
            fileName: "client-proof",
            format: "jpg",
            quality: 88,
          }),
        }),
      );
    });

    expect(await screen.findByText(/saved the rendered watermark preview/i)).toBeInTheDocument();
    expect(screen.getByText(/client-proof\.jpg/i)).toBeInTheDocument();
  });

  it("shows a useful error when export fails", async () => {
    const user = userEvent.setup();

    exportWatermarkedImageMock.mockRejectedValue(
      new Error("The app could not write to that location. Choose a folder you can access."),
    );

    render(<App />);

    const imageInput = screen.getByLabelText(/choose image file/i);
    const imageFile = new File(["image-data"], "portrait.png", {
      type: "image/png",
      lastModified: new Date("2026-04-05T09:30:00Z").getTime(),
    });

    await user.upload(imageInput, imageFile);
    await user.click(screen.getByRole("button", { name: /export image/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not write to that location/i);
  });

  it("runs batch export and isolates individual file failures", async () => {
    const user = userEvent.setup();

    pickExportFolderMock.mockResolvedValue("C:\\Exports");
    exportWatermarkedImageToPathMock.mockResolvedValueOnce({
      bytesWritten: 1024,
      path: "C:\\Exports\\city-watermarked.png",
    });
    exportWatermarkedImageToPathMock.mockRejectedValueOnce(
      new Error("The selected save folder could not be found. Choose another location."),
    );

    render(<App />);

    const queueInput = screen.getByLabelText(/choose batch image files/i);
    const cityFile = new File(["image-data"], "city.png", {
      type: "image/png",
      lastModified: new Date("2026-04-05T10:20:00Z").getTime(),
    });
    const posterFile = new File(["image-data"], "poster.png", {
      type: "image/png",
      lastModified: new Date("2026-04-05T10:21:00Z").getTime(),
    });

    await user.upload(queueInput, [cityFile, posterFile]);
    await user.click(screen.getByRole("button", { name: /choose output folder/i }));
    await user.click(screen.getByRole("button", { name: /run batch export/i }));

    await waitFor(() => {
      expect(exportWatermarkedImageToPathMock).toHaveBeenCalledTimes(2);
    });

    expect(exportWatermarkedImageToPathMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        outputPath: "C:\\Exports\\city-watermarked.png",
      }),
    );
    expect(exportWatermarkedImageToPathMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        outputPath: "C:\\Exports\\poster-watermarked.png",
      }),
    );
    expect(
      await screen.findByText(/batch completed\. 1 succeeded, 1 failed\./i),
    ).toBeInTheDocument();
    expect(screen.getByText(/city-watermarked\.png/i)).toBeInTheDocument();
    expect(screen.getByText(/selected save folder could not be found/i)).toBeInTheDocument();
  });

  it("saves, loads, renames, and deletes a custom preset", async () => {
    const user = userEvent.setup();

    render(<App />);

    const imageInput = screen.getByLabelText(/choose image file/i);
    const imageFile = new File(["image-data"], "portrait.png", {
      type: "image/png",
      lastModified: new Date("2026-04-05T09:30:00Z").getTime(),
    });

    await user.upload(imageInput, imageFile);
    await user.clear(screen.getByLabelText(/watermark text/i));
    await user.type(screen.getByLabelText(/watermark text/i), "Client Draft");
    await user.type(screen.getByLabelText(/preset name/i), "Client A");
    await user.click(screen.getByRole("button", { name: /save current preset/i }));

    await user.clear(screen.getByLabelText(/watermark text/i));
    await user.type(screen.getByLabelText(/watermark text/i), "Temporary");
    await user.click(screen.getByRole("button", { name: /^load$/i }));

    expect(screen.getByTestId("watermark-overlay")).toHaveTextContent("Client Draft");
    expect(screen.getByText(/loaded "client a"/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^rename$/i }));
    const renameInput = screen.getByDisplayValue("Client A");
    await user.clear(renameInput);
    await user.type(renameInput, "Client A Final");
    await user.click(screen.getByRole("button", { name: /save name/i }));

    expect(screen.getByText("Client A Final")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^delete$/i }));

    expect(screen.queryByText("Client A Final")).not.toBeInTheDocument();
    expect(screen.getByText(/no presets saved yet/i)).toBeInTheDocument();
  });

  it("restores presets after remount and toggles before or after preview", async () => {
    const user = userEvent.setup();

    const firstRender = render(<App />);

    const imageInput = screen.getByLabelText(/choose image file/i);
    const imageFile = new File(["image-data"], "scene.webp", {
      type: "image/webp",
      lastModified: new Date("2026-04-05T09:45:00Z").getTime(),
    });

    await user.upload(imageInput, imageFile);
    await user.type(screen.getByLabelText(/preset name/i), "Reusable");
    await user.click(screen.getByRole("button", { name: /save current preset/i }));

    firstRender.unmount();
    render(<App />);

    expect(screen.getByText("Reusable")).toBeInTheDocument();

    const secondImageInput = screen.getByLabelText(/choose image file/i);
    await user.upload(secondImageInput, imageFile);

    expect(await screen.findByTestId("watermark-overlay")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /before/i }));
    expect(screen.queryByTestId("watermark-overlay")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /after/i }));
    expect(screen.getByTestId("watermark-overlay")).toBeInTheDocument();

    await user.keyboard("b");
    expect(screen.queryByTestId("watermark-overlay")).not.toBeInTheDocument();
  });
});
