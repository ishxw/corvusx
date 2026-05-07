import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";

export function pathsEqual(path1: string, path2: string) {
	const normalizedPath1 = path1.replace(/^\/|\/$/g, "").toLowerCase();
	const normalizedPath2 = path2.replace(/^\/|\/$/g, "").toLowerCase();
	return normalizedPath1 === normalizedPath2;
}

function joinUrl(...parts: string[]): string {
	const joined = parts.join("/");
	return joined.replace(/\/+/g, "/");
}

export function getPostUrlBySlug(slug: string): string {
	return url(`/posts/${slug}/`);
}

export function getTagUrl(tag: string): string {
	if (!tag) return url("/archive/");
	return url(`/archive/?tag=${encodeURIComponent(tag.trim())}`);
}

export function getCategoryUrl(category: string | null): string {
	if (
		!category ||
		category.trim() === "" ||
		category.trim().toLowerCase() === i18n(I18nKey.uncategorized).toLowerCase()
	)
		return url("/archive/?uncategorized=true");
	return url(`/archive/?category=${encodeURIComponent(category.trim())}`);
}

export function getDir(path: string): string {
	const lastSlashIndex = path.lastIndexOf("/");
	if (lastSlashIndex < 0) {
		return "/";
	}
	return path.substring(0, lastSlashIndex + 1);
}

export function url(path: string) {
	return joinUrl("", import.meta.env.BASE_URL, path);
}

export function getCanonicalUrl(url: URL, request: Request, site?: URL): string {
	// 0. 运行时环境变量绝对优先 (尝试多种获取方式)
	const envSite =
		(typeof process !== "undefined" ? process.env.SITE : undefined) ||
		(import.meta.env ? import.meta.env.SITE : undefined);

	if (envSite && envSite.startsWith("http") && !envSite.includes("example.com")) {
		try {
			const base = envSite.endsWith("/") ? envSite : `${envSite}/`;
			return new URL(url.pathname.replace(/^\//, ""), base).toString();
		} catch {
			// ignore invalid URL
		}
	}

	// 1. 优先使用配置的站点 URL (通过 astro.config.mjs 传入的 site 对象)
	if (site && site.hostname !== "example.com" && site.hostname !== "127.0.0.1" && site.hostname !== "localhost") {
		return new URL(url.pathname, site).toString();
	}

	// 2. 尝试从反向代理头部获取 (处理开启了 HTTPS 代理但 Host 没传对的情况)
	const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
	const forwardedProto = request.headers.get("x-forwarded-proto") || "https";

	if (forwardedHost && !forwardedHost.includes("127.0.0.1") && !forwardedHost.includes("localhost")) {
		const protocol = forwardedProto.split(",")[0].trim();
		// 去掉可能存在的端口号（如果是标准 80/443）
		const host = forwardedHost.split(",")[0].trim();
		return `${protocol}://${host}${url.pathname}`;
	}

	// 3. 最后退回到原始请求 URL
	const canonical = new URL(url.pathname, url.origin);
	return canonical.toString();
}
