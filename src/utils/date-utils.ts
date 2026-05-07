export function formatDateToYYYYMMDD(date: Date | string | number): string {
	const d = new Date(date);
	if (Number.isNaN(d.getTime())) return "";
	return d.toISOString().substring(0, 10);
}

export function formatDateTime(date: Date | string | number): string {
	const d = new Date(date);
	if (Number.isNaN(d.getTime())) return "";
	return d.toISOString().slice(0, 16).replace("T", " ");
}

/**
 * Normalizes a date string to YYYY-MM-DD.
 * Returns undefined if input is invalid.
 */
export function normalizeDate(value: string | Date | undefined): string | undefined {
	if (!value) return undefined;
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return undefined;
	return d.toISOString().slice(0, 10);
}

/**
 * Normalizes a date-time string to YYYY-MM-DDTHH:mm.
 */
export function normalizeDateTime(value: string | Date | undefined): string | undefined {
	if (!value) return undefined;
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return undefined;
	return d.toISOString().slice(0, 16);
}
