import type { APIRoute } from "astro";
import { logAdminActivity } from "@/server/admin-activity";
import { deleteAdminMedia, listAdminMedia, renameAdminMedia, saveAdminMediaFile } from "@/server/media-store";

function wantsJson(request: Request): boolean {
	const accept = request.headers.get("accept") || "";
	return accept.includes("application/json");
}

function jsonResponse(payload: unknown, status = 200): Response {
	return new Response(JSON.stringify(payload), {
		status,
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			"Cache-Control": "no-store",
		},
	});
}

export const GET: APIRoute = async ({ locals }) => {
	if (!locals.adminUser) {
		return jsonResponse({ error: "Unauthorized" }, 401);
	}

	const items = await listAdminMedia();
	return jsonResponse({ items });
};

export const POST: APIRoute = async ({ request, locals, redirect }) => {
	if (!locals.adminUser) {
		return redirect("/admin/login/");
	}

	const form = await request.formData();
	const file = form.get("file");

	if (!(file instanceof File)) {
		if (wantsJson(request)) {
			return jsonResponse({ error: "Missing file" }, 400);
		}
		return redirect("/admin/media/?error=missing-file");
	}

	const item = await saveAdminMediaFile(file);
	await logAdminActivity("media:upload", item.name);

	if (wantsJson(request)) {
		return jsonResponse({ ok: true, item });
	}

	return redirect("/admin/media/?success=1");
};

export const DELETE: APIRoute = async ({ request, locals }) => {
	if (!locals.adminUser) {
		return jsonResponse({ error: "Unauthorized" }, 401);
	}

	const { file } = (await request.json()) as { file?: string };
	if (!file) {
		return jsonResponse({ error: "Missing file" }, 400);
	}

	await deleteAdminMedia(file);
	await logAdminActivity("media:delete", file);
	return jsonResponse({ ok: true });
};

export const PUT: APIRoute = async ({ request, locals }) => {
	if (!locals.adminUser) {
		return jsonResponse({ error: "Unauthorized" }, 401);
	}

	const { oldName, newName } = (await request.json()) as { oldName?: string; newName?: string };
	if (!oldName || !newName) {
		return jsonResponse({ error: "Missing parameters" }, 400);
	}

	try {
		const item = await renameAdminMedia(oldName, newName);
		await logAdminActivity("media:rename", `${oldName} -> ${newName}`);
		return jsonResponse({ ok: true, item });
	} catch (e: any) {
		return jsonResponse({ error: e.message }, 500);
	}
};
