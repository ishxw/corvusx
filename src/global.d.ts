declare global {
	interface Window {
		// type from '@swup/astro' is incorrect
		swup: unknown;
		showAdminToast?: (
			message: string,
			tone?: "success" | "rose" | "error" | "warning" | string,
		) => void;
		showAdminConfirm?: (message: string) => Promise<boolean>;
		showAdminAlert?: (message: string, title?: string) => Promise<void>;
		showAdminPrompt?: (
			message: string,
			defaultValue?: string,
			title?: string,
		) => Promise<string | null>;
		// biome-ignore lint/suspicious/noExplicitAny: Required for global injection
		initAdminPostEditor?: (options: any) => void;
		// biome-ignore lint/suspicious/noExplicitAny: Required for global injection
		initAdminPostList?: (options: any) => void;
		initGitHubCards?: () => void;
		// biome-ignore lint/suspicious/noExplicitAny: Required for global injection
		initAdminSettingsEnhancer?: (config: any) => void;
		// biome-ignore lint/suspicious/noExplicitAny: Required for global injection
		initAdminPostListEnhancer?: (config: any) => void;
		// biome-ignore lint/suspicious/noExplicitAny: Required for global injection
		initAdminMediaPickerEnhancer?: (config: any) => void;
		adminIsDirty?: boolean;
		twikooEnable?: boolean;
		twikooEnvId?: string;
		twikoo?: {
			// biome-ignore lint/suspicious/noExplicitAny: External library
			init: (config: any) => void;
		};
	}
}

export {};
