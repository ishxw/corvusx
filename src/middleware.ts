import { defineMiddleware } from "astro:middleware";
import { verifySessionToken } from "./server/auth";
import { getSiteSettings } from "./server/site-store";
import { setCachedRuntimeConfig } from "./server/config-cache";
import { siteSettingsToRuntimeConfig } from "./server/runtime-config";

export const onRequest = defineMiddleware(async (context, next) => {
	const token = context.cookies.get("corvusx_admin_session")?.value;
	const username = await verifySessionToken(token);
	context.locals.adminUser = username;

	const settings = await getSiteSettings();
	setCachedRuntimeConfig({
		...siteSettingsToRuntimeConfig(settings),
	});

	return next();
});
