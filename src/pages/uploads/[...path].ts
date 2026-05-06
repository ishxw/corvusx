import fs from "node:fs/promises";
import path from "node:path";
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ params }) => {
	const { path: rawPath } = params;
	if (!rawPath) {
		return new Response("Not Found", { status: 404 });
	}

	// Decode the path component. Astro usually provides it encoded.
	const decodedPath = decodeURIComponent(rawPath);
	const fileName = path.basename(decodedPath);
	const baseDir = path.resolve(process.cwd(), "data", "uploads");
	const absolutePath = path.join(baseDir, fileName);

	if (!absolutePath.startsWith(baseDir)) {
		return new Response("Forbidden", { status: 403 });
	}

	try {
		const stats = await fs.stat(absolutePath);
		if (!stats.isFile()) {
			return new Response("Not Found", { status: 404 });
		}

		const data = await fs.readFile(absolutePath);
		const ext = path.extname(absolutePath).toLowerCase();

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
				"Cache-Control": "no-cache, no-store, must-revalidate",
				Pragma: "no-cache",
				Expires: "0",
			},
		});
	} catch (_e) {
		return new Response("Not Found", { status: 404 });
	}
};
