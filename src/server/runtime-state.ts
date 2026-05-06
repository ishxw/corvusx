import { setCachedRuntimeConfig } from "./config-cache";
import { siteSettingsToRuntimeConfig } from "./runtime-config";
import { getSiteSettings } from "./site-store";

export async function getRuntimeState() {
	const settings = await getSiteSettings();
	const runtime = {
		settings,
		...siteSettingsToRuntimeConfig(settings),
	};
	setCachedRuntimeConfig(runtime);
	return runtime;
}
