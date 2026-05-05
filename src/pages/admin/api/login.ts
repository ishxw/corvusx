import type { APIRoute } from "astro";
import { logAdminActivity } from "@/server/admin-activity";
import { createSessionToken, verifyAdminCredentials } from "@/server/auth";

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
	const form = await request.formData();
	const username = String(form.get("username") || "").trim();
	const password = String(form.get("password") || "");

	const ok = await verifyAdminCredentials(username, password);
	if (!ok) {
		return redirect("/admin/login/?error=1");
	}

	const token = await createSessionToken(username);
	const secure = url.protocol === "https:";

	cookies.set("corvusx_admin_session", token, {
		path: "/",
		httpOnly: true,
		sameSite: "lax",
		secure,
		maxAge: 60 * 60 * 24 * 7,
	});

	await logAdminActivity("auth:login", username);
	return redirect("/admin/");
};
