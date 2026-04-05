import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "@/app/App";
import { exportWatermarkedImage } from "@/lib/export";

vi.mock("@/lib/export", async () => {
  const actual = await vi.importActual<typeof import("@/lib/export")>("@/lib/export");

  return {
    ...actual,
    exportWatermarkedImage: vi.fn(),
  };
});

const exportWatermarkedImageMock = vi.mocked(exportWatermarkedImage);

describe("App shell", () => {
  beforeEach(() => {
    exportWatermarkedImageMock.mockReset();
  });

  it("renders the text watermark shell and toggles the theme", async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(
      screen.getByRole("heading", { name: /image and text watermark editor/i }),
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
});
