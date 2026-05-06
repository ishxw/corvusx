import type { APIRoute } from "astro";
import { logAdminActivity } from "@/server/admin-activity";
import {
	getAdminPost,
	moveAdminPostSlug,
	saveAdminPost,
} from "@/server/post-store";

function normalizeDate(value: string): string {
	return value || new Date().toISOString().slice(0, 10);
}

function normalizePublishAt(value: string): string | undefined {
	const normalized = value.trim();
	return normalized || undefined;
}

function buildPostRedirect(params: {
	mode: string;
	originalSlug: string;
	slug: string;
	success?: boolean;
	error?: string;
	intent?: string;
}) {
	const targetSlug = params.slug || params.originalSlug;

	if (params.success && params.intent === "preview" && targetSlug) {
		return `/posts/${targetSlug}/?preview=1`;
	}

	if (params.success && params.intent === "return") {
		return "/admin/?success=1";
	}

	const basePath =
		params.mode === "update" && targetSlug
			? `/admin/posts/${targetSlug}/`
			: "/admin/posts/new/";

	const search = new URLSearchParams();
	if (params.success) search.set("success", "1");
	if (params.error) search.set("error", params.error);

	const query = search.toString();
	return query ? `${basePath}?${query}` : basePath;
}

export const POST: APIRoute = async ({ request, locals, redirect }) => {
	if (!locals.adminUser) {
		return redirect("/admin/login/");
	}

	const form = await request.formData();
	const mode = String(form.get("mode") || "create");
	const intent = String(form.get("intent") || "stay");
	const slug = String(form.get("slug") || "").replace(/^\/|\/$/g, "");
	const originalSlug = String(form.get("originalSlug") || slug).replace(
		/^\/|\/$/g,
		"",
	);
	const title = String(form.get("title") || "").trim();

	if (!slug || !title) {
		return redirect(
			buildPostRedirect({
				mode,
				originalSlug,
				slug,
				intent,
				error: "required",
			}),
		);
	}

	const existing = mode === "update" ? await getAdminPost(originalSlug) : null;
	const nowDate = new Date().toISOString().slice(0, 10);

	await saveAdminPost({
		slug,
		title,
		published: normalizeDate(String(form.get("published") || "")),
		publishAt: normalizePublishAt(String(form.get("publishAt") || "")),
		updated: mode === "update" ? nowDate : existing?.updated,
		description: String(form.get("description") || "").trim(),
		image: String(form.get("image") || "").trim(),
		tags: String(form.get("tags") || "")
			.split(",")
			.map((item) => item.trim())
			.filter(Boolean),
		category: String(form.get("category") || "").trim(),
		draft: form.get("publishedState") !== "on",
		lang: existing?.lang || "",
		body: String(form.get("body") || "")
			.replace(/\r\n/g, "\n")
			.trim(),
	});

	if (mode === "update" && originalSlug !== slug) {
		await moveAdminPostSlug(originalSlug, slug);
	}

	await logAdminActivity(
		mode === "create" ? "post:create" : "post:save",
		`${title} (${slug})`,
	);

	return redirect(
		buildPostRedirect({
			mode,
			originalSlug,
			slug,
			intent,
			success: true,
		}),
	);
};
