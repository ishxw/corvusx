import type { APIRoute } from "astro";
import { renderRuntimeMarkdown } from "@/server/runtime-markdown";

export const POST: APIRoute = async ({ request, locals }) => {
	if (!locals.adminUser) {
		return new Response("Unauthorized", { status: 401 });
	}

	let markdown = "";
	try {
		const body = (await request.json()) as { markdown?: string };
		markdown = body.markdown || "";
	} catch {
		return new Response("Bad Request", { status: 400 });
	}

	const rendered = await renderRuntimeMarkdown(markdown);

	return new Response(
		JSON.stringify({
			html: rendered.html,
			excerpt: rendered.excerpt,
			words: rendered.words,
			minutes: rendered.minutes,
		}),
		{
			headers: {
				"Content-Type": "application/json; charset=utf-8",
				"Cache-Control": "no-store",
			},
		},
	);
};
