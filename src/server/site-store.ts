import fs from "node:fs/promises";
import path from "node:path";
import { defaultSiteSettings } from "./defaults";
import { DATA_DIR, SITE_SETTINGS_PATH } from "./paths";
import type { AdminSiteSettings } from "@/types/admin";

async function ensureDir(dir: string) {
	await fs.mkdir(dir, { recursive: true });
}

let cachedSettings: AdminSiteSettings | null = null;

export async function getSiteSettings(): Promise<AdminSiteSettings> {
	if (cachedSettings) return cachedSettings;
	try {
		const raw = await fs.readFile(SITE_SETTINGS_PATH, "utf8");
		const parsed = JSON.parse(raw) as Partial<AdminSiteSettings>;
		const bannerPosition =
			parsed.bannerPosition === "center"
				? "center"
				: parsed.bannerPosition === "bottom"
					? "bottom"
					: "top";
		const faviconSrc =
			parsed.faviconSrc === "public/favicon/corvusx.svg"
				? "/favicon/corvusx.svg"
				: parsed.faviconSrc ?? defaultSiteSettings.faviconSrc;
		cachedSettings = {
			...defaultSiteSettings,
			...parsed,
			bannerPosition,
			faviconSrc,
			profileLinks: parsed.profileLinks ?? defaultSiteSettings.profileLinks,
			navLinks: parsed.navLinks ?? defaultSiteSettings.navLinks,
		};
		return cachedSettings;
	} catch {
		return defaultSiteSettings;
	}
}

export async function saveSiteSettings(settings: AdminSiteSettings): Promise<void> {
	await ensureDir(DATA_DIR);
	await fs.writeFile(
		SITE_SETTINGS_PATH,
		`${JSON.stringify(settings, null, 2)}\n`,
		"utf8",
	);
	cachedSettings = settings;
}

export function getDataRelativePath(filePath: string): string {
	return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
}
