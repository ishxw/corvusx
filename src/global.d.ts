declare global {
	interface SwupHookRegistry {
		on: (
			event: string,
			handler: (...args: any[]) => void,
			options?: { before?: boolean },
		) => void;
	}

	interface SwupHeadPluginLike {
		options?: {
			persistAssets?: boolean;
			persistTags?: string;
		};
	}

	interface SwupInstanceLike {
		hooks: SwupHookRegistry;
		findPlugin?: (name: string) => SwupHeadPluginLike | undefined;
	}

	interface TwikooInstanceLike {
		init: (config: {
			envId: string;
			el: string;
			path: string;
			onCommentLoaded?: () => void;
		}) => void;
	}

	interface Window {
		swup?: SwupInstanceLike;
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
		twikoo?: TwikooInstanceLike;
	}

	const twikoo: TwikooInstanceLike | undefined;
}

export {};
