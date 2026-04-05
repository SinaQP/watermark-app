import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import App from "@/app/App";

describe("App shell", () => {
  it("renders the import shell and toggles the theme", async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(
      screen.getByRole("heading", { name: /watermark app image import/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Import flow" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /single image import/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "File details" })).toBeInTheDocument();

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("light");
    });

    await user.click(screen.getByRole("button", { name: /switch to dark theme/i }));

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("dark");
      expect(window.localStorage.getItem("watermark-theme")).toBe("dark");
    });
  });

  it("uploads a valid image from the file picker and shows the preview metadata", async () => {
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
    expect(screen.getAllByText("portrait.png").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2400 x 1600").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /replace image/i })).toBeInTheDocument();
  });

  it("accepts drag and drop uploads", async () => {
    render(<App />);

    const surface = screen.getByRole("region", { name: /image upload surface/i });
    const file = new File(["image-data"], "scene.webp", {
      type: "image/webp",
      lastModified: new Date("2026-04-05T09:45:00Z").getTime(),
    });

    fireEvent.dragOver(surface, {
      dataTransfer: {
        files: [file],
        dropEffect: "copy",
      },
    });

    fireEvent.drop(surface, {
      dataTransfer: {
        files: [file],
      },
    });

    expect(await screen.findByRole("img", { name: /preview of scene\.webp/i })).toBeInTheDocument();
  });

  it("shows a useful error for unsupported uploads", async () => {
    render(<App />);

    const surface = screen.getByRole("region", { name: /image upload surface/i });
    const file = new File(["plain-text"], "notes.txt", {
      type: "text/plain",
      lastModified: new Date("2026-04-05T10:00:00Z").getTime(),
    });

    fireEvent.drop(surface, {
      dataTransfer: {
        files: [file],
      },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(/unsupported file format/i);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
