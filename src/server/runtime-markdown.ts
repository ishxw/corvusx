import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import GithubSlugger from "github-slugger";
import readingTime from "reading-time";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeComponents from "rehype-components";
import rehypeExpressiveCode from "rehype-expressive-code";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import remarkGithubAdmonitionsToDirectives from "remark-github-admonitions-to-directives";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import remarkSectionize from "remark-sectionize";
import { unified } from "unified";
// @ts-expect-error
import { AdmonitionComponent } from "@/plugins/rehype-component-admonition.mjs";
// @ts-expect-error
import { GithubCardComponent } from "@/plugins/rehype-component-github-card.mjs";
// @ts-expect-error
import { parseDirectiveNode } from "@/plugins/remark-directive-rehype";

export type RuntimeHeading = {
	depth: number;
	slug: string;
	text: string;
};

function extractExcerpt(markdown: string): string {
	const lines = markdown.split(/\r?\n/);
	const paragraph: string[] = [];

	for (const line of lines) {
		if (!line.trim()) {
			if (paragraph.length > 0) break;
			continue;
		}
		if (line.trim().startsWith("#")) continue;
		paragraph.push(line.trim());
	}

	return paragraph.join(" ").trim();
}

function extractHeadings(markdown: string): RuntimeHeading[] {
	const lines = markdown.split(/\r?\n/);
	const slugger = new GithubSlugger();
	const headings: RuntimeHeading[] = [];

	for (const line of lines) {
		const match = /^(#{1,6})\s+(.*)$/.exec(line.trim());
		if (!match) continue;
		const depth = match[1].length;
		const text = match[2].trim();
		headings.push({
			depth,
			text: `${text}#`,
			slug: slugger.slug(text),
		});
	}

	return headings;
}

export async function renderRuntimeMarkdown(markdown: string): Promise<{
	html: string;
	headings: RuntimeHeading[];
	excerpt: string;
	words: number;
	minutes: number;
}> {
	const excerpt = extractExcerpt(markdown);
	const headings = extractHeadings(markdown);
	const stats = readingTime(markdown);

	const file = await unified()
		.use(remarkParse)
		.use(remarkMath)
		.use(remarkGfm)
		.use(remarkGithubAdmonitionsToDirectives)
		.use(remarkDirective)
		.use(remarkSectionize)
		// biome-ignore lint/suspicious/noExplicitAny: Expected usage in rehype
		.use(parseDirectiveNode as any)
		.use(remarkRehype, { allowDangerousHtml: true })
		.use(rehypeKatex)
		.use(rehypeSlug)
		.use(
			// biome-ignore lint/suspicious/noExplicitAny: Expected usage in rehype
			rehypeComponents as any,
			{
				components: {
					// biome-ignore lint/suspicious/noExplicitAny: Expected usage in rehype
					github: GithubCardComponent as any,
					note: (props: Record<string, unknown>, children: unknown) =>
						AdmonitionComponent(props, children, "note"),
					tip: (props: Record<string, unknown>, children: unknown) =>
						AdmonitionComponent(props, children, "tip"),
					important: (props: Record<string, unknown>, children: unknown) =>
						AdmonitionComponent(props, children, "important"),
					caution: (props: Record<string, unknown>, children: unknown) =>
						AdmonitionComponent(props, children, "caution"),
					warning: (props: Record<string, unknown>, children: unknown) =>
						AdmonitionComponent(props, children, "warning"),
				},
				// biome-ignore lint/suspicious/noExplicitAny: Expected usage in rehype
			} as any,
		)
		// @ts-expect-error Type mismatch in expressive code config
		.use(rehypeExpressiveCode, {
			themes: ["github-dark"],
			plugins: [pluginLineNumbers()],
			defaultProps: {
				showLineNumbers: true,
			},
			frames: {
				showCopyToClipboardButton: true,
			},
		})
		.use(rehypeAutolinkHeadings, {
			behavior: "append",
			properties: {
				className: ["anchor"],
			},
			content: {
				type: "element",
				tagName: "span",
				properties: {
					className: ["anchor-icon"],
					"data-pagefind-ignore": true,
				},
				children: [{ type: "text", value: "#" }],
			},
		})
		.use(rehypeStringify, { allowDangerousHtml: true })
		.process(markdown);

	return {
		html: String(file),
		headings,
		excerpt,
		words: stats.words,
		minutes: Math.max(1, Math.round(stats.minutes)),
	};
}
