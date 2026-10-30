/** mp ids from stored mp links or pasted text (urls, ids, any separator) */
export const mpIds = (text: string | null | undefined): string[] => (text ?? "").match(/\d{6,}/g) ?? [];

/** how mp links are stored: unique ids joined by "," */
export const mpCsv = (ids: (string | number)[]) => [...new Set(ids.map(String))].join(",");
