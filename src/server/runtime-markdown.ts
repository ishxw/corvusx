import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkDirective from "remark-directive";
import remarkSectionize from "remark-sectionize";
import remarkGithubAdmonitionsToDirectives from "remark-github-admonitions-to-directives";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeKatex from "rehype-katex";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeComponents from "rehype-components";
import rehypeStringify from "rehype-stringify";
import rehypeExpressiveCode from "rehype-expressive-code";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import GithubSlugger from "github-slugger";
import readingTime from "reading-time";
import { parseDirectiveNode } from "@/plugins/remark-directive-rehype";
import { GithubCardComponent } from "@/plugins/rehype-component-github-card.mjs";
import { AdmonitionComponent } from "@/plugins/rehype-component-admonition.mjs";

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
		.use(parseDirectiveNode as any)
		.use(remarkRehype, { allowDangerousHtml: true })
		.use(rehypeKatex)
		.use(rehypeSlug)
		.use(rehypeComponents as any, {
			components: {
				github: GithubCardComponent as any,
				note: (props: any, children: any) => AdmonitionComponent(props, children, "note"),
				tip: (props: any, children: any) => AdmonitionComponent(props, children, "tip"),
				important: (props: any, children: any) => AdmonitionComponent(props, children, "important"),
				caution: (props: any, children: any) => AdmonitionComponent(props, children, "caution"),
				warning: (props: any, children: any) => AdmonitionComponent(props, children, "warning"),
			},
		} as any)
		.use(rehypeExpressiveCode, {
			themes: ["github-dark"],
			plugins: [pluginLineNumbers()],
			defaultProps: {
				showLineNumbers: true,
			},
			frames: {
				showCopyToClipboardButton: true,
			}
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
