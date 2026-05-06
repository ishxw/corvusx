import { defineMiddleware } from "astro:middleware";
import fs from "node:fs/promises";
import path from "node:path";
import { verifySessionToken } from "./server/auth";
import { setCachedRuntimeConfig } from "./server/config-cache";
import { siteSettingsToRuntimeConfig } from "./server/runtime-config";
import { getSiteSettings } from "./server/site-store";

export const onRequest: ReturnType<typeof defineMiddleware> = defineMiddleware(
	async (context, next) => {
		const url = new URL(context.request.url);
		const pathname = url.pathname;
		const lowercasePath = pathname.toLowerCase();

		// Always serve uploads from filesystem directly to keep runtime mapping stable.
		if (pathname.startsWith("/uploads/")) {
			let decodedPathname = pathname;
			try {
				decodedPathname = decodeURIComponent(pathname);
			} catch {
				return new Response("Not Found", { status: 404 });
			}

			const relativePath = decodedPathname
				.slice("/uploads/".length)
				.replace(/\/+$/g, "");
			const fileName = path.basename(relativePath);
			if (!relativePath || !fileName || fileName === ".") {
				return new Response("Not Found", { status: 404 });
			}

			const filePath = path.resolve("data/uploads", fileName);
			try {
				const stats = await fs.stat(filePath);
				if (!stats.isFile()) {
					return new Response("Not Found", { status: 404 });
				}

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
				return new Response(data as unknown as BodyInit, {
					headers: {
						"Content-Type": mimeTypes[ext] || "application/octet-stream",
						"Cache-Control": "public, max-age=31536000",
					},
				});
			} catch {
				return new Response("Not Found", { status: 404 });
			}
		}

		// Performance: Skip middleware logic for static assets and internal Astro paths
		if (
			pathname.startsWith("/_astro/") ||
			pathname.startsWith("/favicon/") ||
			pathname.startsWith("/assets/") ||
			lowercasePath.endsWith(".png") ||
			lowercasePath.endsWith(".jpg") ||
			lowercasePath.endsWith(".jpeg") ||
			lowercasePath.endsWith(".webp") ||
			lowercasePath.endsWith(".svg")
		) {
			return next();
		}

		const token = context.cookies.get("corvusx_admin_session")?.value;
		const username = await verifySessionToken(token);
		context.locals.adminUser = username;

		const settings = await getSiteSettings();
		setCachedRuntimeConfig({
			...siteSettingsToRuntimeConfig(settings),
		});

		return next();
	},
);
