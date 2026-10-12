import { afterEach, expect, it, vi } from "vitest";
import { copyText } from "./clipboard";

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(document, "execCommand");
});

it("falls back to a temporary textarea when navigator clipboard fails", async () => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: vi.fn().mockRejectedValue(new Error("permission denied")),
    },
  });
  const execCommand = vi.fn().mockReturnValue(true);
  Object.defineProperty(document, "execCommand", {
    configurable: true,
    value: execCommand,
  });

  await expect(copyText("copy me")).resolves.toBe(true);

  expect(execCommand).toHaveBeenCalledWith("copy");
  expect(document.querySelector("textarea")).not.toBeInTheDocument();
});

it("reports failure when both clipboard paths are unavailable", async () => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: vi.fn().mockRejectedValue(new Error("permission denied")),
    },
  });
  Object.defineProperty(document, "execCommand", {
    configurable: true,
    value: vi.fn().mockReturnValue(false),
  });

  await expect(copyText("copy me")).resolves.toBe(false);
});
