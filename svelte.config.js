import { vitePreprocess } from "@astrojs/svelte";

export default {
	preprocess: [vitePreprocess({ script: true })],
	compilerOptions: {
		hydratable: true,
	},
	onwarn: (warning, handler) => {
		// Ignore common a11y warnings that might be noisy in third-party or inherited components
		if (warning.code.startsWith("a11y-")) return;
		handler(warning);
	},
};
