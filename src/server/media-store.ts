import fs from "node:fs/promises";
import path from "node:path";

export type AdminMediaItem = {
	name: string;
	url: string;
	size: number;
	modifiedAt: string;
};

const UPLOAD_DIR = path.resolve("public/uploads");

async function ensureUploadDir() {
	await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

function toMediaUrl(fileName: string): string {
	return `/uploads/${fileName}`;
}

function sanitizeMediaName(fileName: string): string {
	return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
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

	const sanitizedName = sanitizeMediaName(file.name || "upload.bin");
	const fileName = `${Date.now()}-${sanitizedName}`;
	const targetPath = path.join(UPLOAD_DIR, fileName);
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
	const fileName = path.basename(fileOrUrl);
	const targetPath = path.join(UPLOAD_DIR, fileName);
	await fs.rm(targetPath, { force: true });
}

export async function renameAdminMedia(oldName: string, newName: string): Promise<AdminMediaItem> {
	const safeNewName = sanitizeMediaName(newName);
	const oldPath = path.join(UPLOAD_DIR, path.basename(oldName));
	const newPath = path.join(UPLOAD_DIR, safeNewName);

	if (await fs.access(newPath).then(() => true).catch(() => false)) {
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
