type PreviewUrlResult = {
	value: string;
	isResolvable: boolean;
};

const assetUrls = import.meta.glob("../assets/**/*", {
	query: "?url",
	import: "default",
	eager: true,
}) as Record<string, string>;

export async function resolveAdminPreviewUrl(input: string): Promise<PreviewUrlResult> {
	const trimmed = input.trim();
	if (!trimmed) {
		return { value: "", isResolvable: false };
	}

	if (
		trimmed.startsWith("http://") ||
		trimmed.startsWith("https://") ||
		trimmed.startsWith("data:") ||
		trimmed.startsWith("/")
	) {
		return { value: trimmed, isResolvable: true };
	}

	const normalized = trimmed.replace(/\\/g, "/").replace(/^\.?\//, "");
	const candidateKeys = [
		`../${normalized}`,
		normalized.startsWith("src/") ? `../${normalized.replace(/^src\//, "")}` : "",
	].filter(Boolean);

	for (const key of candidateKeys) {
		if (assetUrls[key]) {
			return {
				value: assetUrls[key],
				isResolvable: true,
			};
		}
	}

	return { value: trimmed, isResolvable: false };
}
