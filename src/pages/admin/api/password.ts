import type { APIRoute } from "astro";
import { logAdminActivity } from "@/server/admin-activity";
import { updateAdminPassword } from "@/server/auth";

export const POST: APIRoute = async ({ request, locals, redirect }) => {
	const form = await request.formData();
	const currentPassword = String(form.get("currentPassword") || "");
	const nextPassword = String(form.get("nextPassword") || "");

	const result = await updateAdminPassword(
		locals.adminUser!,
		currentPassword,
		nextPassword,
	);

	if (!result.ok) {
		if (result.reason === "Current password is incorrect") {
			return redirect("/admin/password/?error=mismatch");
		}
		if (result.reason === "Password too short") {
			return redirect("/admin/password/?error=short");
		}
		return redirect("/admin/password/?error=1");
	}

	await logAdminActivity("auth:password", locals.adminUser!);
	return redirect("/admin/?success=password-updated");
};
