/**
 * Serialize staff-only CSV safely, without spreadsheet formula execution.
 * Every cell is quoted, embedded quotes are escaped, and multiline/untrusted
 * prefixes cannot be interpreted as commands by spreadsheet applications.
 */
export function csvCell(input: unknown): string {
  const raw = Array.from(String(input ?? ""), (character) => {
    const code = character.codePointAt(0) ?? 0;
    return code < 32 || code === 127 ? " " : character;
  }).join("");
  const safe = /^[\s]*[=+\-@]/.test(raw) ? "'" + raw : raw;
  return '"' + safe.replaceAll('"', '""') + '"';
}
export function csvRow(cells: unknown[]): string {
  return cells.map(csvCell).join(",");
}
