import type { APIRoute } from "astro";
import { getRuntimeRenderedPosts } from "@/server/public-posts";
import { getPostUrlBySlug } from "@/utils/url-utils";

export const GET: APIRoute = async ({ request }) => {
	const query = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() || "";

	if (!query) {
		return new Response(JSON.stringify({ results: [] }), {
			headers: { "Content-Type": "application/json; charset=utf-8" },
		});
	}

	const posts = await getRuntimeRenderedPosts(false);
	const results = posts
		.filter((post) => {
			const haystack = [
				post.title,
				post.description,
				post.excerpt,
				post.body,
				post.category || "",
				post.tags.join(" "),
			]
				.join(" ")
				.toLowerCase();
			return haystack.includes(query);
		})
		.slice(0, 12)
		.map((post) => ({
			url: getPostUrlBySlug(post.slug),
			meta: {
				title: post.title,
			},
			excerpt: post.description || post.excerpt || "",
		}));

	return new Response(JSON.stringify({ results }), {
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			"Cache-Control": "no-store",
		},
	});
};
