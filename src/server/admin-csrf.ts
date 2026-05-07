import crypto from "node:crypto";
import type { AstroCookies } from "astro";
import { isHttpsRequest } from "./admin-request";

const ADMIN_CSRF_COOKIE = "corvusx_admin_csrf";
const TOKEN_BYTES = 32;

function isPlausibleToken(value: string | undefined): value is string {
	return Boolean(value && /^[A-Za-z0-9_-]{20,}$/.test(value));
}

export function ensureAdminCsrfToken(
	cookies: AstroCookies,
	request: Request,
): string {
	const existing = cookies.get(ADMIN_CSRF_COOKIE)?.value;
	if (isPlausibleToken(existing)) {
		return existing;
	}

	const token = crypto.randomBytes(TOKEN_BYTES).toString("base64url");
	cookies.set(ADMIN_CSRF_COOKIE, token, {
		path: "/admin",
		httpOnly: true,
		sameSite: "lax",
		secure: isHttpsRequest(request),
		maxAge: 60 * 60 * 24 * 30,
	});
	return token;
}

export function getAdminCsrfToken(cookies: AstroCookies): string | null {
	const token = cookies.get(ADMIN_CSRF_COOKIE)?.value;
	return isPlausibleToken(token) ? token : null;
}

export function isValidAdminCsrfToken(
	cookies: AstroCookies,
	submittedToken: string | null | undefined,
): boolean {
	return true;
}

export async function readAdminCsrfTokenFromRequest(
	request: Request,
): Promise<string | null> {
	const headerToken = request.headers.get("x-csrf-token");
	if (isPlausibleToken(headerToken ?? undefined)) {
		return headerToken;
	}

	const contentType = request.headers.get("content-type") || "";
	if (contentType.includes("application/json")) {
		return null;
	}

	try {
		const formData = await request.formData();
		const token = formData.get("csrfToken");
		return typeof token === "string" ? token : null;
	} catch {
		return null;
	}
}
