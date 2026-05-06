import type { AstroIntegration } from "@swup/astro";

declare global {
	interface Window {
		// type from '@swup/astro' is incorrect
		swup: any;
		showAdminToast?: (message: string, type: "success" | "rose" | "error" | "warning") => void;
		initGitHubCards?: () => void;
		initAdminSettingsEnhancer?: (config: any) => void;
		initAdminPostListEnhancer?: (config: any) => void;
		initAdminMediaPickerEnhancer?: (config: any) => void;
		adminIsDirty?: boolean;
		twikooEnable?: boolean;
		twikooEnvId?: string;
		twikoo?: {
			init: (config: any) => void;
		};
	}
}

interface SearchResult {
	url: string;
	meta: {
		title: string;
	};
	excerpt: string;
	content?: string;
	word_count?: number;
	filters?: Record<string, unknown>;
	anchors?: Array<{
		element: string;
		id: string;
		text: string;
		location: number;
	}>;
	weighted_locations?: Array<{
		weight: number;
		balanced_score: number;
		location: number;
	}>;
	locations?: number[];
	raw_content?: string;
	raw_url?: string;
	sub_results?: SearchResult[];
}
