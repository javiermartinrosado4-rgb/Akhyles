import { cloudState } from "./cloud";
import { AppState } from "../types";

/** Private portability export. Device tokens, account metadata and cloud revision data never leave the app. */
export function personalExport(state: AppState): string {
  return JSON.stringify({
    format: "akhyles-personal-export",
    version: 1,
    exportedAt: new Date().toISOString(),
    data: cloudState(state),
  }, null, 2);
}

export function personalExportFilename(date = new Date()): string {
  return `akhyles-datos-${date.toISOString().slice(0, 10)}.json`;
}
