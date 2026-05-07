import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export type AdminMediaItem = {
	name: string;
	url: string;
	size: number;
	modifiedAt: string;
};

export type SaveAdminMediaOptions = {
	optimizeImage?: boolean;
};

const UPLOAD_DIR = path.resolve("data/uploads");
const MAX_MEDIA_FILE_SIZE = 10 * 1024 * 1024;
const DEFAULT_OPTIMIZE_IMAGES = true;
const ALLOWED_MEDIA_EXTENSIONS = new Set([
	".png",
	".jpg",
	".jpeg",
	".gif",
	".webp",
	".svg",
]);
const ALLOWED_MEDIA_MIME_TYPES = new Set([
	"image/png",
	"image/jpeg",
	"image/gif",
	"image/webp",
	"image/svg+xml",
]);

async function ensureUploadDir() {
	await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

export function toMediaUrl(fileName: string): string {
	return `/uploads/${encodeURIComponent(fileName)}`;
}

export function sanitizeMediaName(fileName: string): string {
	return (
		fileName
			// biome-ignore lint/suspicious/noControlCharactersInRegex: Required for sanitizing file names
			.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
			.replace(/-+/g, "-")
			.trim()
	);
}

function ensureMediaFileName(fileName: string): string {
	const sanitized = sanitizeMediaName(path.basename(fileName)).trim();
	if (!sanitized || sanitized === "." || sanitized === "..") {
		throw new Error("Invalid file name.");
	}
	return sanitized;
}

function ensureMediaExtension(fileName: string): string {
	const extension = path.extname(fileName).toLowerCase();
	if (!ALLOWED_MEDIA_EXTENSIONS.has(extension)) {
		throw new Error("Unsupported file type.");
	}
	return extension;
}

function ensureMediaMimeType(file: File): void {
	if (!ALLOWED_MEDIA_MIME_TYPES.has(file.type)) {
		throw new Error("Unsupported file type.");
	}
}

function ensureMediaFileSize(file: File): void {
	if (file.size <= 0) {
		throw new Error("Empty files are not allowed.");
	}
	if (file.size > MAX_MEDIA_FILE_SIZE) {
		throw new Error("File is too large.");
	}
}

function resolveUploadFilePath(fileName: string): string {
	const safeName = ensureMediaFileName(fileName);
	const targetPath = path.resolve(UPLOAD_DIR, safeName);
	if (path.dirname(targetPath) !== UPLOAD_DIR) {
		throw new Error("Invalid file path.");
	}
	return targetPath;
}

export async function listAdminMedia(): Promise<AdminMediaItem[]> {
	await ensureUploadDir();
	const entries = await fs.readdir(UPLOAD_DIR, { withFileTypes: true });

	const items = await Promise.all(
		entries
			.filter((entry) => entry.isFile())
			.map(async (entry) => {
				const filePath = path.join(UPLOAD_DIR, entry.name);
				const stats = await fs.stat(filePath);
				return {
					name: entry.name,
					url: toMediaUrl(entry.name),
					size: stats.size,
					modifiedAt: stats.mtime.toISOString(),
				};
			}),
	);

	return items.sort((a, b) => (a.modifiedAt < b.modifiedAt ? 1 : -1));
}

export async function saveAdminMediaFile(
	file: File,
	options: SaveAdminMediaOptions = {},
): Promise<AdminMediaItem> {
	await ensureUploadDir();
	ensureMediaFileSize(file);
	ensureMediaMimeType(file);

	const originalName = ensureMediaFileName(file.name || "upload.bin");
	const ext = path.extname(originalName).toLowerCase();
	ensureMediaExtension(originalName);

	const optimizeImage = options.optimizeImage ?? DEFAULT_OPTIMIZE_IMAGES;
	const canOptimizeImage = [".png", ".jpg", ".jpeg", ".webp"].includes(ext);
	const shouldConvertToWebp = canOptimizeImage && optimizeImage;
	const targetExt = shouldConvertToWebp ? ".webp" : ext;
	const baseName = path.basename(originalName, ext);

	let fileName = shouldConvertToWebp ? `${baseName}.webp` : originalName;
	let targetPath = resolveUploadFilePath(fileName);
	let counter = 1;

	while (
		await fs
			.access(targetPath)
			.then(() => true)
			.catch(() => false)
	) {
		fileName = `${baseName}-${counter}${targetExt}`;
		targetPath = resolveUploadFilePath(fileName);
		counter++;
	}

	const arrayBuffer = await file.arrayBuffer();
	const bytes = new Uint8Array(arrayBuffer);

	if (shouldConvertToWebp) {
		// Optimize supported raster uploads and normalize them to WebP.
		await sharp(bytes)
			.resize({ width: 2000, withoutEnlargement: true })
			.webp({ quality: 80, effort: 6 })
			.toFile(targetPath);
	} else {
		await fs.writeFile(targetPath, bytes);
	}

	const stats = await fs.stat(targetPath);
	return {
		name: fileName,
		url: toMediaUrl(fileName),
		size: stats.size,
		modifiedAt: stats.mtime.toISOString(),
	};
}

export async function deleteAdminMedia(fileOrUrl: string): Promise<void> {
	const fileName = ensureMediaFileName(
		decodeURIComponent(path.basename(fileOrUrl.split("?")[0])),
	);
	const targetPath = resolveUploadFilePath(fileName);
	await fs.rm(targetPath, { force: true });
}

export async function renameAdminMedia(
	oldName: string,
	newName: string,
): Promise<AdminMediaItem> {
	const oldBasename = ensureMediaFileName(oldName);
	const oldExt = path.extname(oldBasename);
	let safeNewName = ensureMediaFileName(newName);

	if (path.extname(safeNewName) === "" && oldExt !== "") {
		safeNewName += oldExt;
	}
	ensureMediaExtension(safeNewName);

	const oldPath = resolveUploadFilePath(oldBasename);
	const newPath = resolveUploadFilePath(safeNewName);

	const isCaseOnlyChange =
		oldBasename.toLowerCase() === safeNewName.toLowerCase() &&
		oldBasename !== safeNewName;

	if (
		!isCaseOnlyChange &&
		(await fs
			.access(newPath)
			.then(() => true)
			.catch(() => false))
	) {
		throw new Error("Target file already exists.");
	}

	await fs.rename(oldPath, newPath);
	const stats = await fs.stat(newPath);

	return {
		name: safeNewName,
		url: toMediaUrl(safeNewName),
		size: stats.size,
		modifiedAt: stats.mtime.toISOString(),
	};
}

export function getMediaUploadConstraints() {
	return {
		maxBytes: MAX_MEDIA_FILE_SIZE,
		allowedExtensions: [...ALLOWED_MEDIA_EXTENSIONS],
		defaultOptimizeImages: DEFAULT_OPTIMIZE_IMAGES,
	};
}
