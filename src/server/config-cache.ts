import type {
	LicenseConfig,
	NavBarConfig,
	ProfileConfig,
	SiteConfig,
	TwikooConfig,
} from "@/types/config";

type RuntimeConfigSnapshot = {
	siteConfig: SiteConfig;
	navBarConfig: NavBarConfig;
	profileConfig: ProfileConfig;
	licenseConfig: LicenseConfig;
	twikooConfig: TwikooConfig;
};

let cachedRuntimeConfig: RuntimeConfigSnapshot | null = null;

export function setCachedRuntimeConfig(config: RuntimeConfigSnapshot) {
	cachedRuntimeConfig = config;
}

export function getCachedRuntimeConfig() {
	return cachedRuntimeConfig;
}
