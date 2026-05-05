import type { AdminSiteSettings } from "@/types/admin";

export const defaultSiteSettings: AdminSiteSettings = {
	title: "Corvusx",
	subtitle: "代码、系统与随笔的个人博客",
	lang: "zh_CN",
	themeHue: 220,
	themeFixed: false,
	bannerEnabled: true,
	bannerSrc: "assets/images/demo-banner.png",
	bannerPosition: "top",
	tocEnabled: true,
	tocDepth: 2,
	faviconSrc: "/favicon/corvusx.svg",
	profileAvatar: "assets/images/demo-avatar.png",
	profileName: "Corvusx",
	profileBio: "记录代码、设计、想法与长期项目。",
	profileLinks: [],
	navLinks: [
		{ name: "首页", url: "/" },
		{ name: "归档", url: "/archive/" },
		{ name: "关于", url: "/about/" },
	],
	licenseEnabled: false,
	licenseName: "CC BY-NC-SA 4.0",
	licenseUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
	aboutMarkdown: `# About

这里是 **Corvusx**，一个基于 [Astro](https://astro.build/) 搭建的个人博客。

这里会慢慢收集几类内容：

- 开发笔记与踩坑复盘
- 项目从想法到落地的过程记录
- 工具、工作流与效率实践
- 一些还没长成完整文章的想法碎片

这个站点现在还是第一版骨架，但已经准备好开始长期写作。`,
};
