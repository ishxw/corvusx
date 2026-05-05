import type { APIRoute } from "astro";
import { logAdminActivity } from "@/server/admin-activity";
import { createSessionToken, verifyAdminCredentials } from "@/server/auth";

// Simple in-memory rate limiting
const loginAttempts = new Map<string, { count: number; lockUntil: number }>();

export const POST: APIRoute = async ({ request, cookies, redirect, url, clientAddress }) => {
	const form = await request.formData();
	const username = String(form.get("username") || "").trim();
	const password = String(form.get("password") || "");

	// Rate limit check
	const clientKey = `${clientAddress}_${username}`;
	const attempt = loginAttempts.get(clientKey);
	if (attempt && attempt.lockUntil > Date.now()) {
		const remaining = Math.ceil((attempt.lockUntil - Date.now()) / 1000 / 60);
		return redirect(`/admin/login/?error=rate-limit&minutes=${remaining}`);
	}

	const ok = await verifyAdminCredentials(username, password);
	if (!ok) {
		const now = Date.now();
		const current = loginAttempts.get(clientKey) || { count: 0, lockUntil: 0 };
		current.count += 1;
		if (current.count >= 3) {
			current.lockUntil = now + 1000 * 60 * 5; // Lock for 5 minutes
			current.count = 0; // Reset count for after the lock
		}
		loginAttempts.set(clientKey, current);
		return redirect("/admin/login/?error=invalid");
	}

	// Success: reset attempts
	loginAttempts.delete(clientKey);

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
