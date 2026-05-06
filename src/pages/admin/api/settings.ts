import type { APIRoute } from "astro";
import { logAdminActivity } from "@/server/admin-activity";
import { defaultSiteSettings } from "@/server/defaults";
import { getSiteSettings, saveSiteSettings } from "@/server/site-store";

function clampThemeHue(value: number, fallback: number): number {
	if (!Number.isFinite(value)) return fallback;
	return Math.min(360, Math.max(0, Math.round(value)));
}

function parseTocDepth(value: string, fallback: 1 | 2 | 3): 1 | 2 | 3 {
	if (value === "1" || value === "2" || value === "3") {
		return Number(value) as 1 | 2 | 3;
	}
	return fallback;
}

function parseBannerMode(
	value: string,
	fallback: "top" | "center" | "bottom",
): "top" | "center" | "bottom" {
	if (value === "top" || value === "center" || value === "bottom") {
		return value;
	}
	return fallback;
}

function normalizeText(
	value: FormDataEntryValue | null,
	fallback: string,
): string {
	const normalized = String(value ?? "").trim();
	return normalized || fallback;
}

function normalizeOptionalText(
	value: FormDataEntryValue | null,
	fallback = "",
): string {
	const normalized = String(value ?? "").trim();
	return normalized || fallback;
}

function isDefined<T>(value: T | null): value is T {
	return value !== null;
}

function parseProfileLinks(raw: string) {
	const parsed = JSON.parse(raw) as unknown;
	if (!Array.isArray(parsed)) throw new Error("Invalid profile links payload");
	return parsed
		.map((item) => {
			if (!item || typeof item !== "object") return null;
			const record = item as Record<string, unknown>;
			const name = String(record.name ?? "").trim();
			const url = String(record.url ?? "").trim();
			const icon = String(record.icon ?? "").trim() || "fa6-solid:link";
			if (!url) return null;
			return { name, url, icon };
		})
		.filter(isDefined);
}

function parseNavLinks(raw: string) {
	const parsed = JSON.parse(raw) as unknown;
	if (!Array.isArray(parsed)) throw new Error("Invalid nav links payload");
	return parsed
		.map((item) => {
			if (!item || typeof item !== "object") return null;
			const record = item as Record<string, unknown>;
			const name = String(record.name ?? "").trim();
			const url = String(record.url ?? "").trim();
			const icon = String(record.icon ?? "").trim();
			const external = Boolean(record.external) || /^https?:\/\//i.test(url);
			if (!name || !url) return null;
			return { name, url, icon: icon || undefined, external };
		})
		.filter(isDefined);
}

export const POST: APIRoute = async ({ request, locals, redirect }) => {
	if (!locals.adminUser) {
		return redirect("/admin/login/");
	}

	const current = await getSiteSettings();
	const form = await request.formData();

	const profileLinksJson = String(
		form.get("profileLinksJson") || JSON.stringify(current.profileLinks),
	);
	const navLinksJson = String(
		form.get("navLinksJson") || JSON.stringify(current.navLinks),
	);

	let profileLinks = current.profileLinks;
	let navLinks = current.navLinks;

	try {
		profileLinks = parseProfileLinks(profileLinksJson);
		navLinks = parseNavLinks(navLinksJson);
	} catch {
		return redirect("/admin/settings/?error=invalid-links");
	}

	try {
		await saveSiteSettings({
			...current,
			title: normalizeText(form.get("title"), current.title),
			subtitle: normalizeOptionalText(form.get("subtitle"), current.subtitle),
			lang: normalizeText(form.get("lang"), current.lang),
			themeHue: clampThemeHue(
				Number(form.get("themeHue") || current.themeHue),
				current.themeHue,
			),
			themeFixed: form.get("themeFixed") === "on",
			profileAvatar: normalizeOptionalText(
				form.get("profileAvatar"),
				current.profileAvatar,
			),
			profileName: normalizeText(form.get("profileName"), current.profileName),
			bannerSrc: normalizeOptionalText(
				form.get("bannerSrc"),
				current.bannerSrc,
			),
			bannerPosition: parseBannerMode(
				String(form.get("bannerPosition") || current.bannerPosition),
				current.bannerPosition,
			),
			tocDepth: parseTocDepth(
				String(form.get("tocDepth") || current.tocDepth),
				current.tocDepth,
			),
			faviconSrc:
				normalizeOptionalText(form.get("faviconSrc")) ||
				defaultSiteSettings.faviconSrc,
			profileBio: normalizeOptionalText(
				form.get("profileBio"),
				current.profileBio,
			),
			aboutMarkdown: String(form.get("aboutMarkdown") || current.aboutMarkdown),
			licenseName: normalizeOptionalText(
				form.get("licenseName"),
				current.licenseName,
			),
			licenseUrl: normalizeOptionalText(
				form.get("licenseUrl"),
				current.licenseUrl,
			),
			twikooEnvId: normalizeOptionalText(
				form.get("twikooEnvId"),
				current.twikooEnvId,
			),
			profileLinks,
			navLinks,
			bannerEnabled: form.get("bannerEnabled") === "on",
			tocEnabled: form.get("tocEnabled") === "on",
			licenseEnabled: form.get("licenseEnabled") === "on",
			twikooEnabled: form.get("twikooEnabled") === "on",
		});
	} catch {
		return redirect("/admin/settings/?error=save-failed");
	}

	await logAdminActivity(
		"site:settings",
		"保存了站点基础设置、导航链接、Twikoo 评论及版权协议配置",
	);
	return redirect("/admin/settings/?success=1");
};
