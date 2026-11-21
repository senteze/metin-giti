function pad2(value: number): string {
	return value.toString().padStart(2, '0');
}

/**
 * Formats a Date as "DD.MM.YYYY HH:mm" for default version labels.
 */
export function formatDateTimeLabel(date: Date): string {
	const day = pad2(date.getDate());
	const month = pad2(date.getMonth() + 1);
	const year = date.getFullYear();
	const hours = pad2(date.getHours());
	const minutes = pad2(date.getMinutes());
	return `${day}.${month}.${year} ${hours}:${minutes}`;
}

/**
 * Formats a Date as "HH:mm" for the status bar indicator.
 */
export function formatTimeShort(date: Date): string {
	const hours = pad2(date.getHours());
	const minutes = pad2(date.getMinutes());
	return `${hours}:${minutes}`;
}
