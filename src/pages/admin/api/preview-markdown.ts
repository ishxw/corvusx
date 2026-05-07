import type { APIRoute } from "astro";
import { isValidAdminCsrfToken } from "@/server/admin-csrf";
import { renderRuntimeMarkdown } from "@/server/runtime-markdown";

export const POST: APIRoute = async ({ request, cookies }) => {
	const csrfToken = request.headers.get("x-csrf-token");
	if (!isValidAdminCsrfToken(cookies, csrfToken)) {
		return new Response("Forbidden", { status: 403 });
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
