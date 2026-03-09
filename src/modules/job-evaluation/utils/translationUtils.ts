
/**
 * Normalizes a string or number to be used as a consistent translation key.
 * Algorithm: lowercase -> replace non-alphanumeric with "_" -> collapse consecutive underscores -> trim underscores.
 * 
 * @param value The value to normalize
 * @returns A normalized string suitable for i18n keys
 */
export const normalizeOptionKey = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return "";
  
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
};
