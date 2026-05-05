import type { APIRoute } from "astro";
import { logAdminActivity } from "@/server/admin-activity";
import { getAdminPost, deleteAdminPost } from "@/server/post-store";

export const POST: APIRoute = async ({ request, locals, redirect }) => {
	if (!locals.adminUser) {
		return redirect("/admin/login/");
	}

	const form = await request.formData();
	const slug = String(form.get("originalSlug") || form.get("slug") || "").replace(/^\/|\/$/g, "");

	if (slug) {
		const post = await getAdminPost(slug);
		await deleteAdminPost(slug);
		await logAdminActivity("post:delete", post?.title ? `${post.title} (${slug})` : slug);
	}

	return redirect("/admin/");
};
