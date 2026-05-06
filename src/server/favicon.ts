import fs from "node:fs/promises";
import path from "node:path";
import type { Favicon } from "@/types/config";

type ResolvedFavicon = Favicon & {
	href: string;
	type?: string;
};

const faviconMimeTypes: Record<string, string> = {
	".avif": "image/avif",
	".gif": "image/gif",
	".ico": "image/x-icon",
	".jpeg": "image/jpeg",
	".jpg": "image/jpeg",
	".png": "image/png",
	".svg": "image/svg+xml",
	".webp": "image/webp",
};

function splitUrlParts(value: string) {
	const [withoutHash, hash = ""] = value.split("#", 2);
	const [pathname, query = ""] = withoutHash.split("?", 2);
	return { hash, pathname, query };
}

function resolveFaviconFilePath(pathname: string): string | null {
	if (pathname.startsWith("/uploads/")) {
		let decodedPathname = pathname;
		try {
			decodedPathname = decodeURIComponent(pathname);
		} catch {
			return null;
		}

		const relativePath = decodedPathname
			.slice("/uploads/".length)
			.replace(/\/+$/g, "");
		const fileName = path.basename(relativePath);
		if (!relativePath || !fileName || fileName === ".") {
			return null;
		}

		return path.resolve("data/uploads", fileName);
	}

	if (pathname.startsWith("/favicon/")) {
		return path.resolve("public", pathname.slice(1));
	}

	return null;
}

async function getFaviconVersion(pathname: string): Promise<string | null> {
	const filePath = resolveFaviconFilePath(pathname);
	if (!filePath) {
		return null;
	}

	try {
		const stats = await fs.stat(filePath);
		return String(Math.round(stats.mtimeMs));
	} catch {
		return null;
	}
}

async function getVersionedFaviconHref(src: string): Promise<string> {
	const trimmed = src.trim();
	if (!trimmed || /^(https?:|data:)/i.test(trimmed)) {
		return trimmed;
	}

	const { hash, pathname, query } = splitUrlParts(trimmed);
	const version = await getFaviconVersion(pathname);
	if (!version) {
		return trimmed;
	}

	const searchParams = new URLSearchParams(query);
	searchParams.set("v", version);
	const serializedQuery = searchParams.toString();
	return `${pathname}${serializedQuery ? `?${serializedQuery}` : ""}${hash ? `#${hash}` : ""}`;
}

export function getFaviconMimeType(src: string): string | undefined {
	const { pathname } = splitUrlParts(src.trim());
	const extension = path.extname(pathname).toLowerCase();
	return faviconMimeTypes[extension];
}

export async function resolveFavicons(
	favicons: Favicon[],
): Promise<ResolvedFavicon[]> {
	return Promise.all(
		favicons.map(async (favicon) => ({
			...favicon,
			href: await getVersionedFaviconHref(favicon.src),
			type: getFaviconMimeType(favicon.src),
		})),
	);
}
