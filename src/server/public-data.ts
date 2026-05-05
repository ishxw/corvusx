import type { PublicPostSummary } from "@/types/admin";
import type { Category, Tag } from "@/utils/content-utils";

export type RuntimePost = PublicPostSummary & {
	prevSlug?: string;
	prevTitle?: string;
	nextSlug?: string;
	nextTitle?: string;
};

export function attachPrevNext(posts: PublicPostSummary[]): RuntimePost[] {
	const enriched: RuntimePost[] = posts.map((post) => ({ ...post }));

	for (let i = 1; i < enriched.length; i++) {
		enriched[i].nextSlug = enriched[i - 1].slug;
		enriched[i].nextTitle = enriched[i - 1].title;
	}

	for (let i = 0; i < enriched.length - 1; i++) {
		enriched[i].prevSlug = enriched[i + 1].slug;
		enriched[i].prevTitle = enriched[i + 1].title;
	}

	return enriched;
}

export function getRuntimeTags(posts: PublicPostSummary[]): Tag[] {
	const countMap: Record<string, number> = {};

	for (const post of posts) {
		for (const tag of post.tags) {
			countMap[tag] = (countMap[tag] || 0) + 1;
		}
	}

	return Object.keys(countMap)
		.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
		.map((name) => ({ name, count: countMap[name] }));
}

export function getRuntimeCategories(
	posts: PublicPostSummary[],
	uncategorizedLabel: string,
	categoryUrlBuilder: (category: string | null) => string,
): Category[] {
	const countMap: Record<string, number> = {};

	for (const post of posts) {
		const category = post.category?.trim() || uncategorizedLabel;
		countMap[category] = (countMap[category] || 0) + 1;
	}

	return Object.keys(countMap)
		.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
		.map((name) => ({
			name,
			count: countMap[name],
			url: categoryUrlBuilder(name === uncategorizedLabel ? null : name),
		}));
}
