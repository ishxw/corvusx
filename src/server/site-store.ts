import fs from "node:fs/promises";
import path from "node:path";
import { defaultSiteSettings } from "./defaults";
import { DATA_DIR, SITE_SETTINGS_PATH } from "./paths";
import type { AdminSiteSettings } from "@/types/admin";

async function ensureDir(dir: string) {
	await fs.mkdir(dir, { recursive: true });
}

export async function getSiteSettings(): Promise<AdminSiteSettings> {
	try {
		const raw = await fs.readFile(SITE_SETTINGS_PATH, "utf8");
		const parsed = JSON.parse(raw) as Partial<AdminSiteSettings>;
		return {
			...defaultSiteSettings,
			...parsed,
			profileLinks: parsed.profileLinks ?? defaultSiteSettings.profileLinks,
			navLinks: parsed.navLinks ?? defaultSiteSettings.navLinks,
		};
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
}

export function getDataRelativePath(filePath: string): string {
	return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
}
