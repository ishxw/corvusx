import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import type { AdminPost, PublicPostSummary } from "@/types/admin";
import { getAdminPostStatus } from "./admin-post-status";
import { POSTS_DIR } from "./paths";
import { normalizeDate, normalizeDateTime } from "@/utils/date-utils";
import { writeFileAtomic } from "./file-utils";

type Frontmatter = {
	title: string | Date;
	published: string | Date;
	publishAt?: string | Date;
	updated?: string | Date;
	description?: string;
	image?: string;
	tags?: string[];
	category?: string;
	draft?: boolean;
	lang?: string;
};

// Simple in-memory cache for admin posts
let cachedAdminPosts: AdminPost[] | null = null;

function invalidatePostCache() {
	cachedAdminPosts = null;
}

async function ensureDir(dir: string) {
	await fs.mkdir(dir, { recursive: true });
}

async function pathExists(targetPath: string): Promise<boolean> {
	try {
		await fs.access(targetPath);
		return true;
	} catch {
		return false;
	}
}

async function walkMarkdownFiles(dir: string): Promise<string[]> {
	try {
		const entries = await fs.readdir(dir, { withFileTypes: true });
		const nested = await Promise.all(
			entries.map(async (entry) => {
				const fullPath = path.join(dir, entry.name);
				if (entry.isDirectory()) {
					return walkMarkdownFiles(fullPath);
				}
				return /\.(md|mdx)$/i.test(entry.name) ? [fullPath] : [];
			}),
		);
		return nested.flat();
	} catch {
		return [];
	}
}

function toSlug(filePath: string): string {
	const relativePath = path.relative(POSTS_DIR, filePath).replace(/\\/g, "/");
	if (relativePath.endsWith("/index.md")) {
		return relativePath.slice(0, -"/index.md".length);
	}
	if (relativePath.endsWith(".md")) {
		return relativePath.slice(0, -".md".length);
	}
	if (relativePath.endsWith(".mdx")) {
		return relativePath.slice(0, -".mdx".length);
	}
	return relativePath;
}

type PostPathStyle = "flat" | "index";

const VALID_SLUG_SEGMENT_PATTERN = /^[\p{Letter}\p{Number}_-]+$/u;

function validateSlugOrThrow(slug: string): string {
	if (!slug || slug === "/") {
		return "";
	}

	const normalized = slug.replace(/^\/|\/$/g, "");
	if (!normalized) {
		return "";
	}

	const segments = normalized.split("/");
	for (const segment of segments) {
		if (!segment || segment === "." || segment === "..") {
			throw new Error("Invalid slug.");
		}
		if (!VALID_SLUG_SEGMENT_PATTERN.test(segment)) {
			throw new Error("Invalid slug.");
		}
	}

	return normalized;
}

function buildPathFromSlug(
	slug: string,
	style?: PostPathStyle,
): string {
	if (!slug || slug === "/") {
		return path.join(POSTS_DIR, "index.md");
	}
	const normalized = validateSlugOrThrow(slug);
	const resolvedStyle =
		style ?? (normalized.includes("/") ? "index" : "flat");
	const targetPath =
		resolvedStyle === "index"
			? path.resolve(POSTS_DIR, normalized, "index.md")
			: path.resolve(POSTS_DIR, `${normalized}.md`);
	if (!targetPath.startsWith(`${POSTS_DIR}${path.sep}`)) {
		throw new Error("Invalid slug.");
	}
	return targetPath;
}

async function resolveExistingPostPath(slug: string): Promise<string | null> {
	if (!slug || slug === "/") {
		const rootPath = path.join(POSTS_DIR, "index.md");
		return (await pathExists(rootPath)) ? rootPath : null;
	}

	const normalized = validateSlugOrThrow(slug);
	const candidates = [
		buildPathFromSlug(normalized, "flat"),
		buildPathFromSlug(normalized, "index"),
	];

	for (const candidate of candidates) {
		if (await pathExists(candidate)) {
			return candidate;
		}
	}

	return null;
}

function inferPathStyle(sourcePath?: string): PostPathStyle | undefined {
	if (!sourcePath) return undefined;
	return sourcePath.replace(/\\/g, "/").endsWith("/index.md")
		? "index"
		: "flat";
}

async function cleanupEmptyParentDirs(targetPath: string): Promise<void> {
	let currentDir = path.dirname(targetPath);

	while (currentDir !== POSTS_DIR && currentDir.startsWith(POSTS_DIR)) {
		try {
			const entries = await fs.readdir(currentDir);
			if (entries.length > 0) return;
			await fs.rmdir(currentDir);
			currentDir = path.dirname(currentDir);
		} catch {
			return;
		}
	}
}

function parseFrontmatter(filePath: string, raw: string): AdminPost {
	const parsed = matter(raw);
	const data = parsed.data as Frontmatter;
	return {
		slug: toSlug(filePath),
		sourcePath: path.relative(POSTS_DIR, filePath).replace(/\\/g, "/"),
		title:
			data.title instanceof Date
				? data.title.toISOString()
				: String(data.title ?? ""),
		published:
			normalizeDate(data.published) ??
			new Date().toISOString().slice(0, 10),
		publishAt: normalizeDateTime(data.publishAt),
		updated: normalizeDate(data.updated),
		description: data.description ?? "",
		image: data.image ?? "",
		tags: data.tags ?? [],
		category: data.category ?? "",
		draft: data.draft ?? false,
		lang: data.lang ?? "",
		body: parsed.content.trim(),
	};
}

function yamlQuote(value: string): string {
	return JSON.stringify(value ?? "");
}

function serializePost(post: AdminPost): string {
	const frontmatter = [
		"---",
		`title: ${yamlQuote(post.title)}`,
		`published: ${post.published}`,
		post.publishAt ? `publishAt: ${post.publishAt}` : null,
		post.updated ? `updated: ${post.updated}` : null,
		`description: ${yamlQuote(post.description)}`,
		`image: ${yamlQuote(post.image)}`,
		`tags: [${post.tags.map((tag) => yamlQuote(tag)).join(", ")}]`,
		`category: ${yamlQuote(post.category)}`,
		`draft: ${post.draft ? "true" : "false"}`,
		`lang: ${yamlQuote(post.lang)}`,
		"---",
		"",
		post.body.trim(),
		"",
	]
		.filter((line) => line !== null)
		.join("\n");

	return `${frontmatter}\n`;
}

export async function listAdminPosts(): Promise<AdminPost[]> {
	if (cachedAdminPosts) return cachedAdminPosts;

	await ensureDir(POSTS_DIR);
	const files = await walkMarkdownFiles(POSTS_DIR);
	const posts = await Promise.all(
		files.map(async (filePath) => {
			const raw = await fs.readFile(filePath, "utf8");
			return parseFrontmatter(filePath, raw);
		}),
	);
	cachedAdminPosts = posts.sort((a, b) => (a.published < b.published ? 1 : -1));
	return cachedAdminPosts;
}

export async function getAdminPost(slug: string): Promise<AdminPost | null> {
	// Try to find in cache first
	if (cachedAdminPosts) {
		const found = cachedAdminPosts.find((p) => p.slug === slug);
		if (found) return found;
	}

	let targetPath: string;
	try {
		targetPath =
			(await resolveExistingPostPath(slug)) ?? buildPathFromSlug(slug);
	} catch {
		return null;
	}
	try {
		const raw = await fs.readFile(targetPath, "utf8");
		return parseFrontmatter(targetPath, raw);
	} catch {
		return null;
	}
}

export async function saveAdminPost(post: AdminPost): Promise<void> {
	const targetPath = buildPathFromSlug(
		post.slug,
		inferPathStyle(post.sourcePath),
	);
	await ensureDir(path.dirname(targetPath));
	await writeFileAtomic(targetPath, serializePost(post));
	invalidatePostCache();
}

export async function moveAdminPostSlug(
	previousSlug: string,
	nextSlug: string,
): Promise<void> {
	if (!previousSlug || previousSlug === nextSlug) return;

	const oldPath =
		(await resolveExistingPostPath(previousSlug)) ??
		buildPathFromSlug(previousSlug);
	const nextPath = buildPathFromSlug(nextSlug, inferPathStyle(oldPath));

	try {
		await ensureDir(path.dirname(nextPath));
		try {
			await fs.access(nextPath);
			await fs.rm(oldPath, { force: true });
			await cleanupEmptyParentDirs(oldPath);
			invalidatePostCache();
			return;
		} catch {
			// fall through to rename when the next path does not exist yet
		}
		await fs.rename(oldPath, nextPath);
		await cleanupEmptyParentDirs(oldPath);
		invalidatePostCache();
	} catch {
		// no-op if old file does not exist yet
	}
}

export async function deleteAdminPost(slug: string): Promise<void> {
	const targetPath =
		(await resolveExistingPostPath(slug)) ?? buildPathFromSlug(slug);
	await fs.rm(targetPath, { force: true });
	await cleanupEmptyParentDirs(targetPath);
	invalidatePostCache();
}

export function isValidAdminSlug(slug: string): boolean {
	try {
		validateSlugOrThrow(slug);
		return true;
	} catch {
		return false;
	}
}

export async function listPublicPosts(
	includeDrafts = false,
): Promise<PublicPostSummary[]> {
	const posts = await listAdminPosts();
	return posts
		.filter(
			(post) =>
				includeDrafts || getAdminPostStatus(post).status === "published",
		)
		.map((post) => ({
			slug: post.slug,
			sourcePath: post.sourcePath,
			title: post.title,
			published: new Date(post.published),
			publishAt: post.publishAt ? new Date(post.publishAt) : undefined,
			updated: post.updated ? new Date(post.updated) : undefined,
			description: post.description,
			image: post.image,
			tags: post.tags,
			category: post.category || null,
			draft: post.draft,
			lang: post.lang,
			body: post.body,
		}))
		.sort((a, b) => (a.published < b.published ? 1 : -1));
}
