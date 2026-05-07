import path from "node:path";

type PreviewUrlResult = {
	value: string;
	isResolvable: boolean;
};

const assetUrls = import.meta.glob("../assets/**/*.{png,jpg,jpeg,gif,webp,avif,svg}", {
	query: "?url",
	import: "default",
	eager: true,
}) as Record<string, string>;

const contentUrls = import.meta.glob(
	"../content/**/*.{png,jpg,jpeg,gif,webp,avif,svg}",
	{
		query: "?url",
		import: "default",
		eager: true,
	},
) as Record<string, string>;

function addCandidate(candidates: string[], next: string) {
	const normalized = next.replace(/\\/g, "/");
	if (!candidates.includes(normalized)) {
		candidates.push(normalized);
	}
}

function normalizeSourcePath(sourcePath: string): string {
	return sourcePath
		.replace(/\\/g, "/")
		.replace(/^src\/content\/posts\//, "")
		.replace(/^content\/posts\//, "")
		.replace(/^\/+/, "");
}

export async function resolveAdminPreviewUrl(
	input: string,
	sourcePath = "",
): Promise<PreviewUrlResult> {
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

	const normalizedInput = trimmed.replace(/\\/g, "/");
	const normalized = normalizedInput.replace(/^\.?\//, "");
	const contentCandidates: string[] = [];
	const assetCandidates: string[] = [];

	if (sourcePath) {
		const postSourcePath = normalizeSourcePath(sourcePath);
		const postDir = path.posix.dirname(postSourcePath);
		const relativeToPost = path.posix.normalize(
			path.posix.join(postDir === "." ? "" : postDir, normalizedInput),
		);
		addCandidate(contentCandidates, `../content/posts/${relativeToPost}`);
	}

	if (normalized.startsWith("src/content/")) {
		addCandidate(contentCandidates, `../${normalized.replace(/^src\//, "")}`);
	}
	if (normalized.startsWith("content/")) {
		addCandidate(contentCandidates, `../${normalized}`);
	}
	if (normalized.startsWith("posts/")) {
		addCandidate(contentCandidates, `../content/${normalized}`);
	}
	addCandidate(contentCandidates, `../content/posts/${normalized}`);

	if (normalized.startsWith("src/assets/")) {
		addCandidate(assetCandidates, `../${normalized.replace(/^src\//, "")}`);
	}
	if (normalized.startsWith("assets/")) {
		addCandidate(assetCandidates, `../${normalized}`);
	}
	addCandidate(assetCandidates, `../assets/${normalized}`);

	for (const key of contentCandidates) {
		if (contentUrls[key]) {
			return {
				value: contentUrls[key],
				isResolvable: true,
			};
		}
	}

	for (const key of assetCandidates) {
		if (assetUrls[key]) {
			return {
				value: assetUrls[key],
				isResolvable: true,
			};
		}
	}

	return { value: trimmed, isResolvable: false };
}
