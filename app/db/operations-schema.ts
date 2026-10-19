import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  unique,
  foreignKey,
  check,
  primaryKey,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";
import { contentDrafts, venues } from "./tenant-schema";

const columns = () => ({
  organizationId: text("organization_id").notNull(),
  editionId: text("edition_id").notNull(),
  draftId: text("draft_id").notNull(),
  id: text("id").notNull(),
  dataJson: text("data_json").notNull(),
});
const scope = (
  t: {
    organizationId: AnySQLiteColumn;
    editionId: AnySQLiteColumn;
    draftId: AnySQLiteColumn;
    id: AnySQLiteColumn;
    dataJson: AnySQLiteColumn;
  },
  name: string,
) => [
  unique(`${name}_scope_id`).on(t.organizationId, t.draftId, t.id),
  foreignKey({
    columns: [t.organizationId, t.editionId, t.draftId],
    foreignColumns: [
      contentDrafts.organizationId,
      contentDrafts.editionId,
      contentDrafts.id,
    ],
  }).onDelete("restrict"),
  check(
    `${name}_json`,
    sql`json_valid(${t.dataJson}) AND json_type(${t.dataJson})='object'`,
  ),
];
export const stages = sqliteTable(
  "stages",
  { ...columns(), venueId: text("venue_id") },
  (t) => [
    ...scope(t, "stages"),
    foreignKey({
      columns: [t.organizationId, t.editionId, t.venueId],
      foreignColumns: [venues.organizationId, venues.editionId, venues.id],
    }).onDelete("restrict"),
  ],
);
export const guests = sqliteTable("guests", columns(), (t) =>
  scope(t, "guests"),
);
export const exhibitors = sqliteTable("exhibitors", columns(), (t) =>
  scope(t, "exhibitors"),
);
export const editionSponsors = sqliteTable("edition_sponsors", columns(), (t) =>
  scope(t, "edition_sponsors"),
);
export const programItems = sqliteTable(
  "program_items",
  {
    ...columns(),
    stageId: text("stage_id").notNull(),
    startAt: text("start_at").notNull(),
    endAt: text("end_at").notNull(),
  },
  (t) => [
    ...scope(t, "program_items"),
    foreignKey({
      columns: [t.organizationId, t.draftId, t.stageId],
      foreignColumns: [stages.organizationId, stages.draftId, stages.id],
    }).onDelete("restrict"),
    check("program_interval", sql`${t.endAt}>${t.startAt}`),
  ],
);
export const participations = sqliteTable(
  "participations",
  {
    organizationId: text("organization_id").notNull(),
    draftId: text("draft_id").notNull(),
    programId: text("program_id").notNull(),
    guestId: text("guest_id").notNull(),
  },
  (t) => [
    primaryKey({
      columns: [t.organizationId, t.draftId, t.programId, t.guestId],
    }),
    foreignKey({
      columns: [t.organizationId, t.draftId, t.programId],
      foreignColumns: [
        programItems.organizationId,
        programItems.draftId,
        programItems.id,
      ],
    }).onDelete("restrict"),
    foreignKey({
      columns: [t.organizationId, t.draftId, t.guestId],
      foreignColumns: [guests.organizationId, guests.draftId, guests.id],
    }).onDelete("restrict"),
  ],
);
