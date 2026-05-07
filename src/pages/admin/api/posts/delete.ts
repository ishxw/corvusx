import type { APIRoute } from "astro";
import { logAdminActivity } from "@/server/admin-activity";
import { requireSameOriginAdminRequest } from "@/server/admin-request";
import {
	deleteAdminPost,
	getAdminPost,
	isValidAdminSlug,
} from "@/server/post-store";

function buildRedirect(params: {
	status?: string;
	sort?: string;
	query?: string;
	page?: string;
	pageSize?: string;
}): string {
	const search = new URLSearchParams();
	if (params.status && params.status !== "all") {
		search.set("status", params.status);
	}
	if (params.sort && params.sort !== "published-desc") {
		search.set("sort", params.sort);
	}
	if (params.query) {
		search.set("q", params.query);
	}
	if (params.page && params.page !== "1") {
		search.set("page", params.page);
	}
	if (params.pageSize && params.pageSize !== "10") {
		search.set("pageSize", params.pageSize);
	}
	const queryString = search.toString();
	return queryString ? `/admin/?${queryString}` : "/admin/";
}

export const POST: APIRoute = async ({ request, locals, redirect }) => {
	if (!locals.adminUser) {
		return redirect("/admin/login/");
	}
	const originError = requireSameOriginAdminRequest(request);
	if (originError) {
		return redirect("/admin/login/");
	}

	const form = await request.formData();
	const status = String(form.get("status") || "all");
	const sort = String(form.get("sort") || "published-desc");
	const query = String(form.get("q") || "").trim();
	const page = String(form.get("page") || "1");
	const pageSize = String(form.get("pageSize") || "10");
	const slug = String(
		form.get("originalSlug") || form.get("slug") || "",
	).replace(/^\/|\/$/g, "");

	if (slug && isValidAdminSlug(slug)) {
		const post = await getAdminPost(slug);
		await deleteAdminPost(slug);
		await logAdminActivity(
			"post:delete",
			post?.title ? `${post.title} (${slug})` : slug,
		);
	}

	return redirect(buildRedirect({ status, sort, query, page, pageSize }));
};
