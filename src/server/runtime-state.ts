import { getSiteSettings } from "./site-store";
import { siteSettingsToRuntimeConfig } from "./runtime-config";
import { setCachedRuntimeConfig } from "./config-cache";

export async function getRuntimeState() {
	const settings = await getSiteSettings();
	const runtime = {
		settings,
		...siteSettingsToRuntimeConfig(settings),
	};
	setCachedRuntimeConfig(runtime);
	return runtime;
}
