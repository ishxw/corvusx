import type { APIRoute } from "astro";
import { isValidAdminCsrfToken } from "@/server/admin-csrf";
import { logAdminActivity } from "@/server/admin-activity";

export const GET: APIRoute = ({ redirect }) => {
	return redirect("/admin/login/");
};

export const POST: APIRoute = async ({ request, cookies, locals, redirect }) => {
	const form = await request.formData();
	const csrfToken = String(form.get("csrfToken") || "");
	if (!isValidAdminCsrfToken(cookies, csrfToken)) {
		return redirect("/admin/login/?error=origin");
	}

	cookies.delete("corvusx_admin_session", { path: "/" });
	if (locals.adminUser) {
		await logAdminActivity("auth:logout", locals.adminUser);
	}
	return redirect("/admin/login/");
};
