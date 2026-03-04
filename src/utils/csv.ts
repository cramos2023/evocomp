/**
 * CSV utilities — proper escaping and browser download.
 * No external dependencies.
 */

/**
 * Escape a single CSV cell value.
 * Wraps in quotes if value contains comma, double-quote, or newline.
 * Double-quotes are escaped by doubling them.
 */
export function toCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Format a numeric value for CSV export.
 * - currency/number: 2 decimal places, no symbol
 * - percent: raw fraction (e.g. 0.05)
 * - null/undefined: empty string
 */
export function formatCsvValue(value: unknown, dataType?: string): string {
  if (value === null || value === undefined || value === '') return '';
  const num = Number(value);
  if (isNaN(num)) return String(value);

  if (dataType === 'currency' || dataType === 'number') {
    return num.toFixed(2);
  }
  if (dataType === 'percent') {
    return num.toString(); // raw fraction, e.g. 0.05
  }
  return num.toString();
}

/**
 * Build a CSV string from headers and rows.
 */
export function buildCsv(headers: string[], rows: string[][]): string {
  const headerLine = headers.map(toCsvCell).join(',');
  const dataLines = rows.map(row => row.map(toCsvCell).join(','));
  return [headerLine, ...dataLines].join('\r\n');
}

/**
 * Trigger a CSV file download in the browser.
 */
export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
