import { listPublicPosts } from "./post-store";
import { type RuntimeHeading, renderRuntimeMarkdown } from "./runtime-markdown";

export type RuntimeRenderedPost = {
	slug: string;
	sourcePath?: string;
	title: string;
	published: Date;
	updated?: Date;
	description: string;
	image: string;
	tags: string[];
	category: string | null;
	draft: boolean;
	lang: string;
	body: string;
	html: string;
	headings: RuntimeHeading[];
	excerpt: string;
	words: number;
	minutes: number;
	prevSlug?: string;
	prevTitle?: string;
	nextSlug?: string;
	nextTitle?: string;
};

export async function getRuntimeRenderedPosts(
	includeDrafts = false,
): Promise<RuntimeRenderedPost[]> {
	const posts = await listPublicPosts(includeDrafts);
	const rendered: RuntimeRenderedPost[] = await Promise.all(
		posts.map(async (post) => {
			const renderedMarkdown = await renderRuntimeMarkdown(post.body);
			return {
				...post,
				html: renderedMarkdown.html,
				headings: renderedMarkdown.headings,
				excerpt: renderedMarkdown.excerpt,
				words: renderedMarkdown.words,
				minutes: renderedMarkdown.minutes,
			};
		}),
	);

	for (let i = 1; i < rendered.length; i++) {
		rendered[i].nextSlug = rendered[i - 1].slug;
		rendered[i].nextTitle = rendered[i - 1].title;
	}
	for (let i = 0; i < rendered.length - 1; i++) {
		rendered[i].prevSlug = rendered[i + 1].slug;
		rendered[i].prevTitle = rendered[i + 1].title;
	}

	return rendered.sort((a, b) => (a.published < b.published ? 1 : -1));
}

export async function getRuntimeRenderedPostBySlug(
	slug: string,
	includeDrafts = false,
): Promise<RuntimeRenderedPost | null> {
	const posts = await getRuntimeRenderedPosts(includeDrafts);
	return posts.find((post) => post.slug === slug) ?? null;
}

export function buildPagination(
	currentPage: number,
	totalItems: number,
	pageSize: number,
) {
	const lastPage = Math.max(1, Math.ceil(totalItems / pageSize));
	const safeCurrentPage = Math.min(Math.max(currentPage, 1), lastPage);
	const start = (safeCurrentPage - 1) * pageSize;
	const end = start + pageSize;
	return {
		currentPage: safeCurrentPage,
		lastPage,
		start,
		end,
		url: {
			current: safeCurrentPage === 1 ? "/" : `/${safeCurrentPage}/`,
			prev:
				safeCurrentPage > 1
					? safeCurrentPage - 1 === 1
						? "/"
						: `/${safeCurrentPage - 1}/`
					: undefined,
			next: safeCurrentPage < lastPage ? `/${safeCurrentPage + 1}/` : undefined,
			first: safeCurrentPage > 1 ? "/" : undefined,
			last: safeCurrentPage < lastPage ? `/${lastPage}/` : undefined,
		},
	};
}
