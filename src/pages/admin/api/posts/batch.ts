import type { APIRoute } from "astro";
import { logAdminActivity } from "@/server/admin-activity";
import { deleteAdminPost, getAdminPost, saveAdminPost } from "@/server/post-store";

type BatchAction =
	| "publish"
	| "draft"
	| "delete"
	| "set-category"
	| "set-tags"
	| "set-published-date"
	| "set-publish-at";

function normalizeSlug(value: FormDataEntryValue | null): string {
	return String(value ?? "").replace(/^\/|\/$/g, "");
}

function buildRedirect(params: {
	success?: string;
	error?: string;
	count?: number;
	status?: string;
	sort?: string;
	query?: string;
}): string {
	const search = new URLSearchParams();
	if (params.success) search.set("success", params.success);
	if (params.error) search.set("error", params.error);
	if (typeof params.count === "number") search.set("count", String(params.count));
	if (params.status && params.status !== "all") search.set("status", params.status);
	if (params.sort && params.sort !== "published-desc") search.set("sort", params.sort);
	if (params.query) search.set("q", params.query);
	const queryString = search.toString();
	return queryString ? `/admin/?${queryString}` : "/admin/";
}

async function updateDraftState(slug: string, draft: boolean): Promise<boolean> {
	const post = await getAdminPost(slug);
	if (!post) return false;
	if (post.draft !== draft) {
		post.draft = draft;
		post.updated = new Date().toISOString().slice(0, 10);
		await saveAdminPost(post);
	}
	return true;
}

async function publishPosts(slugs: string[]): Promise<number> {
	let count = 0;
	for (const slug of slugs) {
		if (await updateDraftState(slug, false)) count += 1;
	}
	return count;
}

async function draftPosts(slugs: string[]): Promise<number> {
	let count = 0;
	for (const slug of slugs) {
		if (await updateDraftState(slug, true)) count += 1;
	}
	return count;
}

async function deletePosts(slugs: string[]): Promise<number> {
	let count = 0;
	for (const slug of slugs) {
		const post = await getAdminPost(slug);
		if (!post) continue;
		await deleteAdminPost(slug);
		count += 1;
	}
	return count;
}

async function updateCategory(slugs: string[], category: string): Promise<number> {
	let count = 0;
	for (const slug of slugs) {
		const post = await getAdminPost(slug);
		if (!post) continue;
		post.category = category;
		post.updated = new Date().toISOString().slice(0, 10);
		await saveAdminPost(post);
		count += 1;
	}
	return count;
}

async function updateTags(slugs: string[], tags: string[]): Promise<number> {
	let count = 0;
	for (const slug of slugs) {
		const post = await getAdminPost(slug);
		if (!post) continue;
		post.tags = tags;
		post.updated = new Date().toISOString().slice(0, 10);
		await saveAdminPost(post);
		count += 1;
	}
	return count;
}

async function updatePublishedDate(slugs: string[], published: string): Promise<number> {
	if (!published) return 0;
	let count = 0;
	for (const slug of slugs) {
		const post = await getAdminPost(slug);
		if (!post) continue;
		post.published = published;
		post.updated = new Date().toISOString().slice(0, 10);
		await saveAdminPost(post);
		count += 1;
	}
	return count;
}

async function updatePublishAt(slugs: string[], publishAt: string): Promise<number> {
	let count = 0;
	for (const slug of slugs) {
		const post = await getAdminPost(slug);
		if (!post) continue;
		post.publishAt = publishAt || undefined;
		post.updated = new Date().toISOString().slice(0, 10);
		await saveAdminPost(post);
		count += 1;
	}
	return count;
}

export const POST: APIRoute = async ({ request, locals, redirect }) => {
	if (!locals.adminUser) {
		return redirect("/admin/login/");
	}

	const form = await request.formData();
	const action = String(form.get("action") || "") as BatchAction;
	const status = String(form.get("status") || "all");
	const sort = String(form.get("sort") || "published-desc");
	const query = String(form.get("q") || "").trim();
	const category = String(form.get("category") || "").trim();
	const published = String(form.get("published") || "").trim();
	const publishAt = String(form.get("publishAt") || "").trim();
	const tags = String(form.get("tags") || "")
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
	const slugs = Array.from(
		new Set(
			form
				.getAll("slug")
				.flatMap((val) => String(val).split(","))
				.map((value) => normalizeSlug(value))
				.filter(Boolean),
		),
	);

	if (slugs.length === 0) {
		return redirect(buildRedirect({ error: "no-selection", status, sort, query }));
	}

	let success = "";
	let count = 0;

	try {
		if (action === "publish") {
			count = await publishPosts(slugs);
			success = "published";
		} else if (action === "draft") {
			count = await draftPosts(slugs);
			success = "drafted";
		} else if (action === "delete") {
			count = await deletePosts(slugs);
			success = "deleted";
		} else if (action === "set-category") {
			count = await updateCategory(slugs, category);
			success = "categorized";
		} else if (action === "set-tags") {
			count = await updateTags(slugs, tags);
			success = "tagged";
		} else if (action === "set-published-date") {
			count = await updatePublishedDate(slugs, published);
			success = "dated";
		} else if (action === "set-publish-at") {
			count = await updatePublishAt(slugs, publishAt);
			success = "scheduled";
		} else {
			return redirect(buildRedirect({ error: "invalid-action", status, sort, query }));
		}
	} catch (e) {
		console.error("[BATCH-ACTION] Error:", e);
		return redirect(buildRedirect({ error: "batch-failed", status, sort, query }));
	}

	await logAdminActivity("post:batch", `${action} × ${count}`);
	return redirect(buildRedirect({ success, count, status, sort, query }));
};
