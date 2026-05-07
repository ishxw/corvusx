import fs from "node:fs/promises";
import path from "node:path";
import type { AdminSiteSettings } from "@/types/admin";
import { defaultSiteSettings } from "./defaults";
import { DATA_DIR, SITE_SETTINGS_PATH } from "./paths";

async function ensureDir(dir: string) {
	await fs.mkdir(dir, { recursive: true });
}

let cachedSettings: AdminSiteSettings | null = null;
let cachedSettingsMtimeMs: number | null = null;

async function getSiteSettingsMtimeMs(): Promise<number | null> {
	try {
		const stats = await fs.stat(SITE_SETTINGS_PATH);
		return stats.mtimeMs;
	} catch {
		return null;
	}
}

function normalizeSiteSettings(
	parsed: Partial<AdminSiteSettings>,
): AdminSiteSettings {
	const bannerPosition =
		parsed.bannerPosition === "center"
			? "center"
			: parsed.bannerPosition === "bottom"
				? "bottom"
				: "top";
	const faviconSrc = parsed.faviconSrc?.trim() || defaultSiteSettings.faviconSrc;

	return {
		...defaultSiteSettings,
		...parsed,
		bannerPosition,
		faviconSrc,
		profileLinks: parsed.profileLinks ?? defaultSiteSettings.profileLinks,
		navLinks: parsed.navLinks ?? defaultSiteSettings.navLinks,
	};
}

export async function getSiteSettings(): Promise<AdminSiteSettings> {
	const currentMtimeMs = await getSiteSettingsMtimeMs();
	if (
		cachedSettings &&
		cachedSettingsMtimeMs !== null &&
		currentMtimeMs !== null &&
		cachedSettingsMtimeMs === currentMtimeMs
	) {
		return cachedSettings;
	}
	try {
		const raw = await fs.readFile(SITE_SETTINGS_PATH, "utf8");
		const parsed = JSON.parse(raw) as Partial<AdminSiteSettings>;
		cachedSettings = normalizeSiteSettings(parsed);
		cachedSettingsMtimeMs = currentMtimeMs ?? (await getSiteSettingsMtimeMs());
		return cachedSettings;
	} catch {
		cachedSettings = defaultSiteSettings;
		cachedSettingsMtimeMs = null;
		return defaultSiteSettings;
	}
}

export async function saveSiteSettings(
	settings: AdminSiteSettings,
): Promise<void> {
	await ensureDir(DATA_DIR);
	await fs.writeFile(
		SITE_SETTINGS_PATH,
		`${JSON.stringify(settings, null, 2)}\n`,
		"utf8",
	);
	cachedSettings = settings;
	cachedSettingsMtimeMs = await getSiteSettingsMtimeMs();
}

export function getDataRelativePath(filePath: string): string {
	return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
}
