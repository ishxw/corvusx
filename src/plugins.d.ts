declare module "@/plugins/*" {
	// biome-ignore lint/suspicious/noExplicitAny: Required for untyped plugins
	const content: any;
	export = content;
}
