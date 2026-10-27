import { describe, expect, it } from "vitest";
import { csvCell, csvRow } from "../../app/domain/export-csv";

describe("staff-only CSV serialization", () => {
  it("quotes delimiters, embedded quotes, multiline cells and formula payloads", () => {
    expect(csvCell("Ana, Maria")).toBe('"Ana, Maria"');
    expect(csvCell('A "teste"')).toBe('"A ""teste"""');
    expect(csvCell("a\nb\rc")).toBe('"a b c"');
    for (const prefix of ["=", "+", "-", "@", "  ="]) {
      const formula = prefix + "SUM(1,2)";
      expect(csvCell(formula)).toBe('"\'' + formula + '"');
    }
  });
  it("serializes private JSON as an uninterpreted quoted value", () => {
    const row = csvRow(["id-1", "Evento de anime", "active", '{"email":"x@example.test"}']);
    expect(row).toBe('"id-1","Evento de anime","active","{""email"":""x@example.test""}"');
    expect(csvCell(null)).toBe('""');
  });
});
