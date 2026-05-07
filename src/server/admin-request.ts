const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function normalizeOrigin(value: string | null): string | null {
	if (!value) return null;
	try {
		return new URL(value).origin;
	} catch {
		return null;
	}
}

export function requireSameOriginAdminRequest(request: Request): Response | null {
	if (SAFE_METHODS.has(request.method.toUpperCase())) {
		return null;
	}

	const requestUrl = new URL(request.url);
	const requestOrigin = requestUrl.origin;
	const originHeader = normalizeOrigin(request.headers.get("origin"));
	const refererHeader = request.headers.get("referer");
	const refererOrigin = normalizeOrigin(refererHeader);

	if (originHeader && originHeader === requestOrigin) {
		return null;
	}

	if (!originHeader && refererOrigin && refererOrigin === requestOrigin) {
		return null;
	}

	return new Response("Forbidden", {
		status: 403,
		headers: {
			"Cache-Control": "no-store",
		},
	});
}
