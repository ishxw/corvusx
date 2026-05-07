export { createExports } from "@astrojs/node/server.js";
import { start as astroNodeStart } from "@astrojs/node/server.js";
import { ensureAdminAuthReady } from "./auth.ts";

export async function start(manifest, options) {
	await ensureAdminAuthReady();
	astroNodeStart(manifest, options);
}
