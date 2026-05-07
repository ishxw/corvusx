import type { APIRoute } from "astro";
import { isValidAdminCsrfToken } from "@/server/admin-csrf";
import { logAdminActivity } from "@/server/admin-activity";
import {
	deleteAdminMedia,
	getMediaUploadConstraints,
	listAdminMedia,
	renameAdminMedia,
	saveAdminMediaFile,
} from "@/server/media-store";

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

function parseOptimizeImageFlag(value: FormDataEntryValue | null): boolean {
	if (typeof value !== "string") {
		return true;
	}

	const normalized = value.trim().toLowerCase();
	if (!normalized) {
		return true;
	}

	return !["0", "false", "off", "no"].includes(normalized);
}

export const GET: APIRoute = async ({ locals }) => {
	if (!locals.adminUser) {
		return jsonResponse({ error: "Unauthorized" }, 401);
	}

	const items = await listAdminMedia();
	return jsonResponse({ items, constraints: getMediaUploadConstraints() });
};

export const POST: APIRoute = async ({ request, cookies, locals, redirect }) => {
	if (!locals.adminUser) {
		return redirect("/admin/login/");
	}

	const form = await request.formData();
	const csrfToken = String(form.get("csrfToken") || "");
	if (!isValidAdminCsrfToken(cookies, csrfToken)) {
		if (wantsJson(request)) {
			return jsonResponse({ error: "Forbidden" }, 403);
		}
		return redirect("/admin/login/?error=origin");
	}
	const file = form.get("file");
	const optimizeImage = parseOptimizeImageFlag(form.get("optimizeImage"));

	if (!(file instanceof File)) {
		if (wantsJson(request)) {
			return jsonResponse({ error: "Missing file" }, 400);
		}
		return redirect("/admin/media/?error=missing-file");
	}

	let item;
	try {
		item = await saveAdminMediaFile(file, { optimizeImage });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to upload file";
		if (wantsJson(request)) {
			return jsonResponse({ error: message }, 400);
		}
		return redirect("/admin/media/?error=invalid-file");
	}

	await logAdminActivity("media:upload", item.name);

	if (wantsJson(request)) {
		return jsonResponse({ ok: true, item });
	}

	return redirect("/admin/media/?success=1");
};

export const DELETE: APIRoute = async ({ request, cookies, locals }) => {
	if (!locals.adminUser) {
		return jsonResponse({ error: "Unauthorized" }, 401);
	}

	const csrfToken = request.headers.get("x-csrf-token");
	if (!isValidAdminCsrfToken(cookies, csrfToken)) {
		return jsonResponse({ error: "Forbidden" }, 403);
	}

	const { file } = (await request.json()) as { file?: string };
	if (!file) {
		return jsonResponse({ error: "Missing file" }, 400);
	}

	await deleteAdminMedia(file);
	await logAdminActivity("media:delete", file);
	return jsonResponse({ ok: true });
};

export const PUT: APIRoute = async ({ request, cookies, locals }) => {
	if (!locals.adminUser) {
		return jsonResponse({ error: "Unauthorized" }, 401);
	}

	const csrfToken = request.headers.get("x-csrf-token");
	if (!isValidAdminCsrfToken(cookies, csrfToken)) {
		return jsonResponse({ error: "Forbidden" }, 403);
	}

	const { oldName, newName } = (await request.json()) as {
		oldName?: string;
		newName?: string;
	};
	if (!oldName || !newName) {
		return jsonResponse({ error: "Missing parameters" }, 400);
	}

	try {
		const item = await renameAdminMedia(oldName, newName);
		await logAdminActivity("media:rename", `${oldName} -> ${newName}`);
		return jsonResponse({ ok: true, item });
	} catch (e) {
		const err = e as Error;
		return jsonResponse({ error: err.message }, 400);
	}
};
