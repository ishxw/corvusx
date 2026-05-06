export type AdminSiteSettings = {
	title: string;
	subtitle: string;
	lang: string;
	themeHue: number;
	themeFixed: boolean;
	bannerEnabled: boolean;
	bannerSrc: string;
	bannerPosition: "top" | "center" | "bottom";
	tocEnabled: boolean;
	tocDepth: 1 | 2 | 3;
	faviconSrc: string;
	profileAvatar: string;
	profileName: string;
	profileBio: string;
	profileLinks: {
		name: string;
		url: string;
		icon: string;
	}[];
	navLinks: {
		name: string;
		url: string;
		icon?: string;
		external?: boolean;
	}[];
	twikooEnabled: boolean;
	twikooEnvId: string;
	licenseEnabled: boolean;
	licenseName: string;
	licenseUrl: string;
	aboutMarkdown: string;
};

export type AdminPost = {
	slug: string;
	sourcePath?: string;
	title: string;
	published: string;
	publishAt?: string;
	updated?: string;
	description: string;
	image: string;
	tags: string[];
	category: string;
	draft: boolean;
	lang: string;
	body: string;
};

export type PublicPostSummary = {
	slug: string;
	sourcePath?: string;
	title: string;
	published: Date;
	publishAt?: Date;
	updated?: Date;
	description: string;
	image: string;
	tags: string[];
	category: string | null;
	draft: boolean;
	lang: string;
	body: string;
};
