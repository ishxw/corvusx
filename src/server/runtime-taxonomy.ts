import type { RuntimeRenderedPost } from "./public-posts";
import type { Category, Tag } from "@/utils/content-utils";
import { getCategoryUrl, getTagUrl } from "@/utils/url-utils";

export function getRuntimeTags(posts: RuntimeRenderedPost[]): Tag[] {
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
	posts: RuntimeRenderedPost[],
	uncategorizedLabel: string,
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
			url: getCategoryUrl(name === uncategorizedLabel ? null : name),
		}));
}

export { getTagUrl };
