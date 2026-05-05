import { vitePreprocess } from "@astrojs/svelte";

export default {
  preprocess: [vitePreprocess({ script: true })],
  compilerOptions: {
    hydratable: true,
  },
  onwarn: (warning, handler) => {
    // Ignore experimental async_ssr warning from Svelte 5
    if (warning.code === "experimental_async_ssr") return;
    // Ignore common a11y warnings that might be noisy in third-party or inherited components
    if (warning.code.startsWith("a11y-")) return;
    handler(warning);
  },
};
