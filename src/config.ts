import { getCachedRuntimeConfig } from "./server/config-cache";
import type {
	ExpressiveCodeConfig,
	LicenseConfig,
	NavBarConfig,
	ProfileConfig,
	SiteConfig,
} from "./types/config";
import { LinkPreset } from "./types/config";

const runtimeConfig = getCachedRuntimeConfig();

export const siteConfig: SiteConfig = {
	...(runtimeConfig?.siteConfig || {
		title: "Corvusx",
		subtitle: "代码、系统与随笔的个人博客",
		lang: "zh_CN",
		themeColor: {
			hue: 220,
			fixed: false,
		},
		banner: {
			enable: true,
			src: "assets/images/default-banner.png",
			position: "center",
			credit: {
				enable: false,
				text: "",
				url: "",
			},
		},
		toc: {
			enable: true,
			depth: 2,
		},
		favicon: [
			{
				src: "/favicon/corvusx.svg",
			},
		],
	}),
};

export const navBarConfig: NavBarConfig = {
	links: runtimeConfig?.navBarConfig.links || [
		LinkPreset.Home,
		LinkPreset.Archive,
		LinkPreset.About,
	],
};

export const profileConfig: ProfileConfig = {
	...(runtimeConfig?.profileConfig || {
		avatar: "assets/images/default-avatar.png",
		name: "Corvusx",
		bio: "记录代码、设计、想法与长期项目。",
		links: [],
	}),
};

export const licenseConfig: LicenseConfig = {
	...(runtimeConfig?.licenseConfig || {
		enable: false,
		name: "CC BY-NC-SA 4.0",
		url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
	}),
};

export const expressiveCodeConfig: ExpressiveCodeConfig = {
	theme: "github-dark",
};
