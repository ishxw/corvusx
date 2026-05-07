import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

/**
 * Safely writes data to a file using an atomic rename operation.
 * This prevents data corruption if the process crashes during a write.
 */
export async function writeFileAtomic(filePath: string, data: string | Uint8Array): Promise<void> {
	const dir = path.dirname(filePath);
	await fs.mkdir(dir, { recursive: true });
	const tmpPath = `${filePath}.${crypto.randomBytes(8).toString("hex")}.tmp`;
	try {
		await fs.writeFile(tmpPath, data, "utf8");
		await fs.rename(tmpPath, filePath);
	} catch (error) {
		await fs.rm(tmpPath, { force: true });
		throw error;
	}
}

/**
 * Safely writes data to a JSON file using an atomic rename operation.
 */
export async function writeJsonAtomic(filePath: string, data: unknown): Promise<void> {
	await writeFileAtomic(filePath, `${JSON.stringify(data, null, 2)}\n`);
}
