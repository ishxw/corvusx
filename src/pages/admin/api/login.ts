import type { APIRoute } from "astro";
import { logAdminActivity } from "@/server/admin-activity";
import { isHttpsRequest } from "@/server/admin-request";
import { createSessionToken, verifyAdminCredentials } from "@/server/auth";

// Simple in-memory rate limiting
const loginAttempts = new Map<string, { count: number; lockUntil: number }>();
const RATE_LIMIT_WINDOW_MS = 1000 * 60 * 15;

function cleanupLoginAttempts(now: number) {
	for (const [key, attempt] of loginAttempts.entries()) {
		if (attempt.lockUntil !== 0 && attempt.lockUntil < now - RATE_LIMIT_WINDOW_MS) {
			loginAttempts.delete(key);
			continue;
		}
		if (attempt.lockUntil === 0 && attempt.count === 0) {
			loginAttempts.delete(key);
		}
	}
}

export const POST: APIRoute = async ({
	request,
	cookies,
	redirect,
	clientAddress,
}) => {
	const form = await request.formData();
	const username = String(form.get("username") || "").trim();
	const password = String(form.get("password") || "");
	const now = Date.now();

	cleanupLoginAttempts(now);

	// Rate limit check
	const clientKey = `${clientAddress}_${username}`;
	const attempt = loginAttempts.get(clientKey);
	if (attempt && attempt.lockUntil > now) {
		const remaining = Math.ceil((attempt.lockUntil - now) / 1000 / 60);
		return redirect(`/admin/login/?error=rate-limit&minutes=${remaining}`);
	}

	const ok = await verifyAdminCredentials(username, password);
	if (!ok) {
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
	const secure = isHttpsRequest(request);

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
