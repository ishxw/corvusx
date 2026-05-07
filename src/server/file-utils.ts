import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const writeQueues = new Map<string, Promise<void>>();

/**
 * Internal helper to write a file atomically without queueing.
 * Use this only when already inside a queued task.
 */
async function writeAtomicInternal(
	absolutePath: string,
	data: string | Uint8Array,
): Promise<void> {
	const dir = path.dirname(absolutePath);
	await fs.mkdir(dir, { recursive: true });
	const tmpPath = `${absolutePath}.${crypto.randomBytes(8).toString("hex")}.tmp`;
	try {
		await fs.writeFile(tmpPath, data, "utf8");

		// Windows specific: Retry rename if the file is temporarily locked by another process (like a read or antivirus)
		let attempts = 0;
		const maxAttempts = 10;
		while (attempts < maxAttempts) {
			try {
				await fs.rename(tmpPath, absolutePath);
				return;
			} catch (error: any) {
				if (
					(error.code === "EPERM" || error.code === "EBUSY") &&
					attempts < maxAttempts - 1
				) {
					attempts++;
					// Exponential backoff
					await new Promise((resolve) =>
						setTimeout(resolve, 20 * Math.pow(1.5, attempts)),
					);
					continue;
				}
				throw error;
			}
		}
	} catch (error) {
		await fs.rm(tmpPath, { force: true }).catch(() => {});
		throw error;
	}
}

/**
 * Safely writes data to a file using an atomic rename operation.
 * This prevents data corruption if the process crashes during a write.
 * It also uses a queue to prevent concurrent writes to the same file.
 */
export async function writeFileAtomic(
	filePath: string,
	data: string | Uint8Array,
): Promise<void> {
	const absolutePath = path.resolve(filePath);
	const existingQueue = writeQueues.get(absolutePath) || Promise.resolve();

	const nextTask = (async () => {
		try {
			await existingQueue;
			await writeAtomicInternal(absolutePath, data);
		} finally {
			// Clean up the queue if no more tasks are pending for this path
			if (writeQueues.get(absolutePath) === nextTask) {
				writeQueues.delete(absolutePath);
			}
		}
	})();

	writeQueues.set(absolutePath, nextTask);
	return nextTask;
}

/**
 * Safely writes data to a JSON file using an atomic rename operation.
 */
export async function writeJsonAtomic(
	filePath: string,
	data: unknown,
): Promise<void> {
	await writeFileAtomic(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

/**
 * Safely reads a JSON file by ensuring it's serialized through the same queue as writes.
 * This prevents EPERM errors on Windows where a read might lock the file during a rename.
 */
export async function readJsonAtomic<T>(filePath: string): Promise<T | null> {
	const absolutePath = path.resolve(filePath);
	const existingQueue = writeQueues.get(absolutePath) || Promise.resolve();

	const task = (async () => {
		await existingQueue;
		try {
			const raw = await fs.readFile(absolutePath, "utf8");
			return JSON.parse(raw) as T;
		} catch (error: any) {
			if (error.code === "ENOENT") return null;
			throw error;
		}
	})();

	const nextTask = (async () => {
		try {
			await task;
		} catch {
			// Ignore error in nextTask chain
		} finally {
			if (writeQueues.get(absolutePath) === nextTask) {
				writeQueues.delete(absolutePath);
			}
		}
	})();

	writeQueues.set(absolutePath, nextTask);
	return task;
}

/**
 * Safely updates a JSON file atomically by ensuring the read-modify-write cycle is serialized.
 */
export async function updateJsonAtomic<T>(
	filePath: string,
	updater: (data: T | null) => T | Promise<T>,
): Promise<void> {
	const absolutePath = path.resolve(filePath);
	const existingQueue = writeQueues.get(absolutePath) || Promise.resolve();

	const nextTask = (async () => {
		try {
			await existingQueue;
			let currentData: T | null = null;
			try {
				const raw = await fs.readFile(absolutePath, "utf8");
				currentData = JSON.parse(raw) as T;
			} catch {
				currentData = null;
			}

			const newData = await updater(currentData);
			// Use internal helper to avoid deadlocking with writeFileAtomic's queue
			await writeAtomicInternal(absolutePath, `${JSON.stringify(newData, null, 2)}\n`);
		} finally {
			if (writeQueues.get(absolutePath) === nextTask) {
				writeQueues.delete(absolutePath);
			}
		}
	})();

	writeQueues.set(absolutePath, nextTask);
	return nextTask;
}
