import node, { getAdapter as getNodeAdapter } from "@astrojs/node";

export default function corvusxNodeAdapter(options) {
	const base = node(options);
	const baseConfigDone = base.hooks?.["astro:config:done"];

	return {
		...base,
		hooks: {
			...base.hooks,
			"astro:config:done": ({ setAdapter, config }) => {
				baseConfigDone?.({ setAdapter, config });

				const adapterOptions = {
					...options,
					client: config.build.client?.toString(),
					server: config.build.server?.toString(),
					host: config.server.host,
					port: config.server.port,
					assets: config.build.assets,
					experimentalStaticHeaders:
						options.experimentalStaticHeaders ?? false,
					experimentalErrorPageHost: options.experimentalErrorPageHost,
				};

				setAdapter({
					...getNodeAdapter(adapterOptions),
					serverEntrypoint:
						"./src/server/astro-node-server-entry.mjs",
				});
			},
		},
	};
}
