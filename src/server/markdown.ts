import MarkdownIt from "markdown-it";

const md = new MarkdownIt({
	html: true,
	linkify: true,
	typographer: true,
});

export function renderMarkdownToHtml(markdown: string): string {
	return md.render(markdown);
}
