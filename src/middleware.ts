import { defineMiddleware } from "astro:middleware";
import { verifySessionToken } from "./server/auth";
import { getSiteSettings } from "./server/site-store";
import { setCachedRuntimeConfig } from "./server/config-cache";
import { siteSettingsToRuntimeConfig } from "./server/runtime-config";
import fs from "node:fs/promises";
import path from "node:path";

export const onRequest = defineMiddleware(async (context, next) => {
	const url = new URL(context.request.url);

	// Performance: Skip middleware logic for static assets and internal Astro paths
	if (
		url.pathname.startsWith("/_astro/") ||
		url.pathname.startsWith("/favicon/") ||
		url.pathname.startsWith("/assets/") ||
		url.pathname.endsWith(".png") ||
		url.pathname.endsWith(".jpg") ||
		url.pathname.endsWith(".jpeg") ||
		url.pathname.endsWith(".webp") ||
		url.pathname.endsWith(".svg")
	) {
		return next();
	}
	
	// Direct serve for uploads to avoid Astro static serving issues in dev/prod
	if (url.pathname.startsWith("/uploads/")) {
		const fileName = path.basename(decodeURIComponent(url.pathname));
		const filePath = path.resolve("data/uploads", fileName);
		try {
			const stats = await fs.stat(filePath);
			if (stats.isFile()) {
				const data = await fs.readFile(filePath);
				const ext = path.extname(filePath).toLowerCase();
				const mimeTypes: Record<string, string> = {
					".png": "image/png",
					".jpg": "image/jpeg",
					".jpeg": "image/jpeg",
					".gif": "image/gif",
					".webp": "image/webp",
					".svg": "image/svg+xml",
				};
				return new Response(data, {
					headers: {
						"Content-Type": mimeTypes[ext] || "application/octet-stream",
						"Cache-Control": "public, max-age=31536000",
					},
				});
			}
		} catch (e) {
			// Fall through if file not found
		}
	}

	const token = context.cookies.get("corvusx_admin_session")?.value;
	const username = await verifySessionToken(token);
	context.locals.adminUser = username;

	const settings = await getSiteSettings();
	setCachedRuntimeConfig({
		...siteSettingsToRuntimeConfig(settings),
	});

	return next();
});
