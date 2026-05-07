import type { APIRoute } from "astro";
import { resolveAdminPreviewUrl } from "@/server/admin-preview";

export const GET: APIRoute = async ({ url, locals }) => {
	if (!locals.adminUser) {
		return new Response("Unauthorized", { status: 401 });
	}

	const value = url.searchParams.get("value") || "";
	const sourcePath = url.searchParams.get("sourcePath") || "";
	const resolved = await resolveAdminPreviewUrl(value, sourcePath);
	return new Response(JSON.stringify(resolved), {
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			"Cache-Control": "no-store",
		},
	});
};
