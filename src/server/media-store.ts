import fs from "node:fs/promises";
import path from "node:path";

export type AdminMediaItem = {
	name: string;
	url: string;
	size: number;
	modifiedAt: string;
};

const UPLOAD_DIR = path.resolve("data/uploads");

async function ensureUploadDir() {
	await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

export function toMediaUrl(fileName: string): string {
	return `/uploads/${encodeURIComponent(fileName)}`;
}

export function sanitizeMediaName(fileName: string): string {
	// Remove characters that are definitely illegal in file systems or problematic in URLs
	// But preserve characters that are valid in most modern OSs and URL paths (like Chinese characters)
	return fileName.replace(/[<>:"/\\|?*\x00-\x1F]/g, "-").replace(/-+/g, "-").trim();
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

export async function saveAdminMediaFile(file: File): Promise<AdminMediaItem> {
	await ensureUploadDir();

	const originalName = file.name || "upload.bin";
	const ext = path.extname(originalName);
	const baseName = path.basename(originalName, ext);
	
	let fileName = originalName;
	let targetPath = path.join(UPLOAD_DIR, fileName);
	let counter = 1;

	while (await fs.access(targetPath).then(() => true).catch(() => false)) {
		fileName = `${baseName}-${counter}${ext}`;
		targetPath = path.join(UPLOAD_DIR, fileName);
		counter++;
	}

	const arrayBuffer = await file.arrayBuffer();
	await fs.writeFile(targetPath, new Uint8Array(arrayBuffer));

	const stats = await fs.stat(targetPath);
	return {
		name: fileName,
		url: toMediaUrl(fileName),
		size: stats.size,
		modifiedAt: stats.mtime.toISOString(),
	};
}

export async function deleteAdminMedia(fileOrUrl: string): Promise<void> {
	const fileName = decodeURIComponent(path.basename(fileOrUrl.split("?")[0]));
	const targetPath = path.join(UPLOAD_DIR, fileName);
	await fs.rm(targetPath, { force: true });
}

export async function renameAdminMedia(oldName: string, newName: string): Promise<AdminMediaItem> {
	const oldExt = path.extname(oldName);
	let safeNewName = sanitizeMediaName(newName);
	
	// If the new name doesn't have an extension, preserve the old one
	if (path.extname(safeNewName) === "" && oldExt !== "") {
		safeNewName += oldExt;
	}

	const oldBasename = path.basename(oldName);
	const oldPath = path.join(UPLOAD_DIR, oldBasename);
	const newPath = path.join(UPLOAD_DIR, safeNewName);

	// Case-insensitive check: if names differ ONLY in case, skip existence check
	const isCaseOnlyChange = oldBasename.toLowerCase() === safeNewName.toLowerCase() && oldBasename !== safeNewName;

	if (!isCaseOnlyChange && await fs.access(newPath).then(() => true).catch(() => false)) {
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
