import type { PluginOptions } from '@grafana/plugin-e2e';
import { defineConfig } from '@playwright/test';
import baseConfig from './.config/playwright.config';
export default defineConfig<PluginOptions>(baseConfig, {
  workers: 1,
  reporter: 'list',
  timeout: 60000,
  use: {
    baseURL: process.env.GRAFANA_URL || 'http://127.0.0.1:3025',
    viewport: { width: 1500, height: 1400 },
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {},
  },
});
