import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll, vi } from "vitest";

const storage = new Map<string, string>();
let objectUrlCount = 0;

beforeAll(() => {
  Object.defineProperty(window, "localStorage", {
    writable: true,
    value: {
      getItem: vi.fn((key: string) => storage.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        storage.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        storage.delete(key);
      }),
      clear: vi.fn(() => {
        storage.clear();
      }),
      key: vi.fn((index: number) => Array.from(storage.keys())[index] ?? null),
      get length() {
        return storage.size;
      },
    } satisfies Storage,
  });

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  Object.defineProperty(URL, "createObjectURL", {
    writable: true,
    value: vi.fn(() => `blob:mock-${++objectUrlCount}`),
  });

  Object.defineProperty(URL, "revokeObjectURL", {
    writable: true,
    value: vi.fn(),
  });

  class MockImage {
    onload: null | (() => void) = null;
    onerror: null | (() => void) = null;
    naturalWidth = 2400;
    naturalHeight = 1600;
    width = 2400;
    height = 1600;

    set src(_value: string) {
      queueMicrotask(() => {
        this.onload?.();
      });
    }
  }

  Object.defineProperty(window, "Image", {
    writable: true,
    value: MockImage,
  });
  Object.defineProperty(globalThis, "Image", {
    writable: true,
    value: MockImage,
  });
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.documentElement.dataset.theme = "light";
  document.documentElement.style.colorScheme = "light";
  vi.clearAllMocks();
});
