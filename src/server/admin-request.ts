const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function normalizeOrigin(value: string | null): string | null {
	if (!value) return null;
	try {
		return new URL(value).origin;
	} catch {
		return null;
	}
}

function getFirstForwardedValue(value: string | null): string | null {
	if (!value) return null;
	const first = value.split(",")[0]?.trim();
	return first || null;
}

function stripWrappingQuotes(value: string): string {
	return value.replace(/^"|"$/g, "");
}

function parseForwardedHeader(value: string | null): {
	host: string | null;
	proto: string | null;
} {
	const entry = getFirstForwardedValue(value);
	if (!entry) {
		return { host: null, proto: null };
	}

	const result = { host: null as string | null, proto: null as string | null };
	for (const segment of entry.split(";")) {
		const [rawKey, rawValue] = segment.split("=", 2);
		if (!rawKey || !rawValue) continue;
		const key = rawKey.trim().toLowerCase();
		const valuePart = stripWrappingQuotes(rawValue.trim());
		if (!valuePart) continue;
		if (key === "host") {
			result.host = valuePart;
		}
		if (key === "proto") {
			result.proto = valuePart.toLowerCase();
		}
	}

	return result;
}

function getTrustedRequestOrigins(request: Request): string[] {
	const requestUrl = new URL(request.url);
	const protocol = requestUrl.protocol.replace(/:$/, "");
	const origins = new Set<string>([requestUrl.origin]);

	const forwarded = parseForwardedHeader(request.headers.get("forwarded"));
	if (forwarded.host) {
		origins.add(`${forwarded.proto || protocol}://${forwarded.host}`);
	}

	const forwardedHost = getFirstForwardedValue(
		request.headers.get("x-forwarded-host"),
	);
	if (forwardedHost) {
		const forwardedProto =
			getFirstForwardedValue(request.headers.get("x-forwarded-proto")) || protocol;
		origins.add(`${forwardedProto.replace(/:$/, "")}://${forwardedHost}`);
	}

	const hostHeader = request.headers.get("host");
	if (hostHeader) {
		origins.add(`${protocol}://${hostHeader}`);
	}

	return [...origins];
}

export function isHttpsRequest(request: Request): boolean {
	const requestUrl = new URL(request.url);
	if (requestUrl.protocol === "https:") {
		return true;
	}

	const forwarded = parseForwardedHeader(request.headers.get("forwarded"));
	if (forwarded.proto === "https") {
		return true;
	}

	const forwardedProto = getFirstForwardedValue(
		request.headers.get("x-forwarded-proto"),
	);
	return forwardedProto?.toLowerCase() === "https";
}

export function requireSameOriginAdminRequest(request: Request): Response | null {
	if (SAFE_METHODS.has(request.method.toUpperCase())) {
		return null;
	}

	const requestOrigins = getTrustedRequestOrigins(request);
	const originHeader = normalizeOrigin(request.headers.get("origin"));
	const refererHeader = request.headers.get("referer");
	const refererOrigin = normalizeOrigin(refererHeader);

	if (originHeader && requestOrigins.includes(originHeader)) {
		return null;
	}

	if (!originHeader && refererOrigin && requestOrigins.includes(refererOrigin)) {
		return null;
	}

	return new Response("Forbidden", {
		status: 403,
		headers: {
			"Cache-Control": "no-store",
		},
	});
}
