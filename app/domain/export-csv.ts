/**
 * Serialize staff-only CSV safely, without spreadsheet formula execution.
 * Every cell is quoted, embedded quotes are escaped, and multiline/untrusted
 * prefixes cannot be interpreted as commands by spreadsheet applications.
 */
export function csvCell(input: unknown): string {
  const raw = String(input ?? "").replace(/[\r\n\u0000-\u001f\u007f]/g, " ");
  const safe = /^[\s]*[=+\-@]/.test(raw) ? "'" + raw : raw;
  return '"' + safe.replaceAll('"', '""') + '"';
}
export function csvRow(cells: unknown[]): string {
  return cells.map(csvCell).join(",");
}
