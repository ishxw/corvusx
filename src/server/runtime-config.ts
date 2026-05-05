import { LinkPreset, type LicenseConfig, type NavBarConfig, type ProfileConfig, type SiteConfig } from "@/types/config";
import type { AdminSiteSettings } from "@/types/admin";

export function siteSettingsToRuntimeConfig(settings: AdminSiteSettings): {
	siteConfig: SiteConfig;
	navBarConfig: NavBarConfig;
	profileConfig: ProfileConfig;
	licenseConfig: LicenseConfig;
} {
	return {
		siteConfig: {
			title: settings.title,
			subtitle: settings.subtitle,
			lang: settings.lang as SiteConfig["lang"],
			themeColor: {
				hue: settings.themeHue,
				fixed: settings.themeFixed,
			},
			banner: {
				enable: settings.bannerEnabled,
				src: settings.bannerSrc,
				position: settings.bannerPosition,
				credit: {
					enable: false,
					text: "",
					url: "",
				},
			},
			toc: {
				enable: settings.tocEnabled,
				depth: settings.tocDepth,
			},
			favicon: settings.faviconSrc ? [{ src: settings.faviconSrc }] : [],
		},
		navBarConfig: {
			links:
				settings.navLinks.length > 0
					? settings.navLinks
					: [LinkPreset.Home, LinkPreset.Archive, LinkPreset.About],
		},
		profileConfig: {
			avatar: settings.profileAvatar,
			name: settings.profileName,
			bio: settings.profileBio,
			links: settings.profileLinks,
		},
		licenseConfig: {
			enable: settings.licenseEnabled,
			name: settings.licenseName,
			url: settings.licenseUrl,
		},
	};
}
