/**
 * Computes a SHA-256 hex digest for the given UTF-8 text using Web Crypto.
 * Falls back to a deterministic 64-bit FNV-1a hex string if SubtleCrypto is unavailable.
 */
export async function computeContentHash(content: string): Promise<string> {
	if (typeof crypto !== 'undefined' && crypto.subtle) {
		const data = new TextEncoder().encode(content);
		const digest = await crypto.subtle.digest('SHA-256', data);
		const bytes = new Uint8Array(digest);
		let hex = '';
		for (const byte of bytes) {
			hex += byte.toString(16).padStart(2, '0');
		}
		return hex;
	}

	// Deterministic fallback for restricted environments without SubtleCrypto
	let h1 = 0x811c9dc5;
	let h2 = 0x811c9dc5;
	for (let i = 0; i < content.length; i++) {
		const ch = content.charCodeAt(i);
		h1 ^= ch;
		h1 = Math.imul(h1, 0x01000193);
		h2 ^= ch ^ (i & 0xff);
		h2 = Math.imul(h2, 0x01000193);
	}
	return (
		(h1 >>> 0).toString(16).padStart(8, '0') +
		(h2 >>> 0).toString(16).padStart(8, '0')
	);
}

/**
 * Generates a unique identifier for documents or versions.
 */
export function generateId(prefix: string): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return `${prefix}_${crypto.randomUUID()}`;
	}
	const timePart = Date.now().toString(36);
	const randPart = Math.random().toString(36).slice(2, 10);
	return `${prefix}_${timePart}_${randPart}`;
}
