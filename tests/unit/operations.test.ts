import { describe, it, expect } from "vitest";
import {
  operationsSchema,
  emptyOperations,
  publicOperations,
  programDays,
} from "../../app/domain/operations";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";

const fixture = () =>
  operationsSchema.parse({
    ...emptyOperations,
    stages: [
      { id: "s1", name: "Palco Aurora" },
      { id: "s2", name: "Palco Horizonte" },
    ],
    guests: [{ id: "g1", name: "Pessoa fictícia", status: "public" }],
    program: [
      {
        id: "p1",
        title: "Abertura",
        stageId: "s1",
        guestIds: ["g1"],
        startAt: "2027-06-12T12:00:00Z",
        endAt: "2027-06-12T13:00:00Z",
        status: "public",
      },
      {
        id: "p2",
        title: "Dia seguinte",
        stageId: "s2",
        guestIds: ["g1"],
        startAt: "2027-06-13T12:00:00Z",
        endAt: "2027-06-13T13:00:00Z",
        status: "public",
      },
    ],
  });
describe("edition operations", () => {
  it("groups two days in the event timezone and canonicalizes UTC", () => {
    const ops = fixture();
    expect(programDays(ops, "America/Sao_Paulo")).toEqual([
      "2027-06-12",
      "2027-06-13",
    ]);
    expect(ops.program[0].startAt).toBe("2027-06-12T12:00:00.000Z");
  });
  it("reports all stage and guest conflicts, including drafts", () => {
    const ops = fixture();
    ops.program[1] = {
      ...ops.program[0],
      id: "p2",
      startAt: "2027-06-12T12:30:00.000Z",
    };
    const result = operationsSchema.safeParse(ops);
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues.map((i) => i.message)).toEqual(
        expect.arrayContaining([
          expect.stringContaining("Conflito de palco"),
          expect.stringContaining("Conflito de convidado"),
        ]),
      );
  });
  it("accepts adjacent activities but rejects zero duration and foreign stage/guest references", () => {
    const ops = fixture();
    ops.program[1] = {
      ...ops.program[0],
      id: "p2",
      startAt: ops.program[0].endAt,
      endAt: "2027-06-12T14:00:00.000Z",
    };
    expect(operationsSchema.safeParse(ops).success).toBe(true);
    ops.program[1].endAt = ops.program[1].startAt;
    expect(operationsSchema.safeParse(ops).success).toBe(false);
    ops.program[1].stageId = "foreign";
    ops.program[1].guestIds = ["foreign"];
    const result = operationsSchema.safeParse(ops);
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues.length).toBeGreaterThanOrEqual(3);
  });
  it("uses actual timezone offsets across DST while UTC remains monotonic", () => {
    const ops = fixture();
    ops.program = ops.program.map((p, i) => ({
      ...p,
      startAt: `2027-03-14T0${i + 6}:00:00.000Z`,
      endAt: `2027-03-14T0${i + 7}:00:00.000Z`,
    }));
    expect(operationsSchema.safeParse(ops).success).toBe(true);
    const time = new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/New_York",
      hour: "2-digit",
      minute: "2-digit",
    });
    expect(time.format(new Date(ops.program[0].startAt))).toBe("01:00");
    expect(time.format(new Date(ops.program[1].startAt))).toBe("03:00");
  });
  it("requires public guest profiles and a separate exhibitor listing opt-in", () => {
    const ops = fixture();
    ops.exhibitors = [
      {
        id: "x1",
        name: "Privado",
        description: "",
        website: "",
        category: "",
        status: "public",
        publicOptIn: false,
      },
      {
        id: "x2",
        name: "Autorizado",
        description: "",
        website: "",
        category: "",
        status: "public",
        publicOptIn: true,
      },
    ];
    expect(publicOperations(ops).exhibitors.map((e) => e.id)).toEqual(["x2"]);
    ops.guests[0].status = "draft";
    expect(() => publicOperations(ops)).toThrow("PUBLIC_PROGRAM");
  });
  it("rejects executable sponsor URLs and duplicate entity IDs", () => {
    const ops = fixture();
    expect(
      operationsSchema.safeParse({
        ...ops,
        sponsors: [
          { id: "sponsor", name: "Teste", website: "javascript:alert(1)" },
        ],
      }).success,
    ).toBe(false);
    expect(
      operationsSchema.safeParse({
        ...ops,
        stages: [ops.stages[0], ops.stages[0]],
      }).success,
    ).toBe(false);
  });
  it("enforces scope, immutable revisions, stage and guest conflicts in SQLite too", () => {
    const db = new DatabaseSync(":memory:");
    try {
      db.exec("PRAGMA foreign_keys=ON");
      for (const f of readdirSync("migrations")
        .filter((f) => f.endsWith(".sql"))
        .sort())
        db.exec(readFileSync(`migrations/${f}`, "utf8"));
      db.exec(
        "INSERT INTO organizations(id,slug,name) VALUES('a','a','A'),('b','b','B'); INSERT INTO user(id,name,email,created_at,updated_at) VALUES('u','Synthetic','u@example.test',1,1); INSERT INTO events(id,organization_id,slug,name) VALUES('e','a','event','Event'); INSERT INTO editions(id,organization_id,event_id,edition_key,name) VALUES('ed','a','e','2027','Edition'); INSERT INTO content_drafts(id,organization_id,edition_id,revision,content_json,created_by) VALUES('d','a','ed',1,'{}','u'); INSERT INTO stages(organization_id,edition_id,draft_id,id,data_json) VALUES('a','ed','d','s1','{}'),('a','ed','d','s2','{}'); INSERT INTO guests(organization_id,edition_id,draft_id,id,data_json) VALUES('a','ed','d','g','{}');",
      );
      expect(() =>
        db.exec(
          "INSERT INTO stages(organization_id,edition_id,draft_id,id,data_json) VALUES('b','ed','d','foreign','{}')",
        ),
      ).toThrow(/FOREIGN KEY/);
      const insert = (id: string, stage: string) =>
        db
          .prepare(
            "INSERT INTO program_items(organization_id,edition_id,draft_id,id,data_json,stage_id,start_at,end_at) VALUES('a','ed','d',?,'{}',?,'2027-06-12T12:00:00.000Z','2027-06-12T13:00:00.000Z')",
          )
          .run(id, stage);
      insert("p1", "s1");
      expect(() => insert("conflict", "s1")).toThrow("program_stage_conflict");
      insert("p2", "s2");
      db.exec("INSERT INTO participations VALUES('a','d','p1','g')");
      expect(() =>
        db.exec("INSERT INTO participations VALUES('a','d','p2','g')"),
      ).toThrow("program_guest_conflict");
      expect(() => db.exec("UPDATE stages SET data_json='{}'")).toThrow(
        "immutable_editorial_revision",
      );
      expect(() => db.exec("DELETE FROM program_items")).toThrow(
        "immutable_editorial_revision",
      );
    } finally {
      db.close();
    }
  });
});
