import type { APIRoute } from "astro";
import { logAdminActivity } from "@/server/admin-activity";

export const POST: APIRoute = async ({ cookies, locals, redirect }) => {
	cookies.delete("corvusx_admin_session", { path: "/" });
	if (locals.adminUser) {
		await logAdminActivity("auth:logout", locals.adminUser);
	}
	return redirect("/admin/login/");
};
