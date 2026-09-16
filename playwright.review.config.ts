import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

export default defineConfig(base, { outputDir: "artifacts/qa-review", use: { ...base.use, baseURL: "http://localhost:8090" } });
