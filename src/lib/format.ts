/** Format a timestamp as a short, friendly absolute date (e.g. "Jun 23, 2026"). */
export function formatWhen(date: Date | string): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
