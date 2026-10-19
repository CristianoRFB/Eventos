import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  sqliteTable,
  text,
  unique,
  type SQLiteTableExtraConfigValue,
} from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";

/** Tenant timestamps are UTC RFC3339 strings; auth timestamps remain adapter-owned. */
const utcNow = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;
const timestamps = () => ({
  createdAt: text("created_at").notNull().default(utcNow),
  updatedAt: text("updated_at").notNull().default(utcNow),
});
const organizationId = () =>
  text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "restrict" });

export const membershipRoles = [
  "organization_owner",
  "organization_admin",
  "event_manager",
  "content_editor",
  "publisher",
  "reviewer_staff",
] as const;
export type MembershipRole = (typeof membershipRoles)[number];
export type BrandTokens = Record<string, string>;

export const organizations = sqliteTable(
  "organizations",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    status: text("status", { enum: ["active", "suspended", "archived"] })
      .notNull()
      .default("active"),
    timezone: text("timezone").notNull().default("America/Sao_Paulo"),
    revision: integer("revision").notNull().default(1),
    tokensJson: text("tokens_json", { mode: "json" })
      .$type<BrandTokens>()
      .notNull()
      .default({}),
    ...timestamps(),
  },
  (table) => [
    unique("organizations_slug_unique").on(table.slug),
    check(
      "organizations_status_check",
      sql`${table.status} IN ('active','suspended','archived')`,
    ),
    check(
      "organizations_slug_check",
      sql`length(${table.slug}) BETWEEN 1 AND 80 AND ${table.slug} = lower(${table.slug}) AND ${table.slug} NOT GLOB '*[^a-z0-9-]*'`,
    ),
    check("organizations_name_check", sql`length(trim(${table.name})) > 0`),
    check("organizations_revision_check", sql`${table.revision} >= 1`),
    check(
      "organizations_tokens_check",
      sql`json_valid(${table.tokensJson}) AND json_type(${table.tokensJson}) = 'object'`,
    ),
  ],
);

/** Platform access is provisioned out-of-band, never as a tenant role. */
export const platformOwners = sqliteTable("platform_owners", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "restrict" }),
  createdAt: text("created_at").notNull().default(utcNow),
});

export const memberships = sqliteTable(
  "memberships",
  {
    id: text("id").primaryKey(),
    organizationId: organizationId(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    role: text("role", { enum: membershipRoles }).notNull(),
    status: text("status", { enum: ["active", "revoked"] })
      .notNull()
      .default("active"),
    revision: integer("revision").notNull().default(1),
    ...timestamps(),
  },
  (table) => [
    unique("memberships_org_user_unique").on(
      table.organizationId,
      table.userId,
    ),
    unique("memberships_org_id_unique").on(table.organizationId, table.id),
    index("memberships_user_status_idx").on(table.userId, table.status),
    check(
      "memberships_role_check",
      sql`${table.role} IN ('organization_owner','organization_admin','event_manager','content_editor','publisher','reviewer_staff')`,
    ),
    check(
      "memberships_status_check",
      sql`${table.status} IN ('active','revoked')`,
    ),
    check("memberships_revision_check", sql`${table.revision} >= 1`),
  ],
);

export const brandProfiles = sqliteTable(
  "brand_profiles",
  {
    id: text("id").primaryKey(),
    organizationId: organizationId(),
    name: text("name").notNull(),
    tokensJson: text("tokens_json", { mode: "json" })
      .$type<BrandTokens>()
      .notNull()
      .default({}),
    logoAssetId: text("logo_asset_id"),
    revision: integer("revision").notNull().default(1),
    ...timestamps(),
  },
  (table): SQLiteTableExtraConfigValue[] => [
    unique("brand_profiles_org_id_unique").on(table.organizationId, table.id),
    foreignKey({
      name: "brand_profiles_logo_scope_fk",
      columns: [table.organizationId, table.logoAssetId],
      foreignColumns: [mediaAssets.organizationId, mediaAssets.id],
    }).onDelete("restrict"),
    check("brand_profiles_name_check", sql`length(trim(${table.name})) > 0`),
    check("brand_profiles_revision_check", sql`${table.revision} >= 1`),
    check(
      "brand_profiles_tokens_check",
      sql`json_valid(${table.tokensJson}) AND json_type(${table.tokensJson}) = 'object'`,
    ),
  ],
);

export const events = sqliteTable(
  "events",
  {
    id: text("id").primaryKey(),
    organizationId: organizationId(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    brandProfileId: text("brand_profile_id"),
    tokensJson: text("tokens_json", { mode: "json" })
      .$type<BrandTokens>()
      .notNull()
      .default({}),
    status: text("status", { enum: ["draft", "active", "archived"] })
      .notNull()
      .default("draft"),
    revision: integer("revision").notNull().default(1),
    ...timestamps(),
  },
  (table): SQLiteTableExtraConfigValue[] => [
    unique("events_org_id_unique").on(table.organizationId, table.id),
    unique("events_org_slug_unique").on(table.organizationId, table.slug),
    foreignKey({
      name: "events_brand_scope_fk",
      columns: [table.organizationId, table.brandProfileId],
      foreignColumns: [brandProfiles.organizationId, brandProfiles.id],
    }).onDelete("restrict"),
    check(
      "events_slug_check",
      sql`length(${table.slug}) BETWEEN 1 AND 100 AND ${table.slug} = lower(${table.slug}) AND ${table.slug} NOT GLOB '*[^a-z0-9-]*'`,
    ),
    check("events_name_check", sql`length(trim(${table.name})) > 0`),
    check(
      "events_status_check",
      sql`${table.status} IN ('draft','active','archived')`,
    ),
    check("events_revision_check", sql`${table.revision} >= 1`),
    check(
      "events_tokens_check",
      sql`json_valid(${table.tokensJson}) AND json_type(${table.tokensJson}) = 'object'`,
    ),
  ],
);

export const editions = sqliteTable(
  "editions",
  {
    id: text("id").primaryKey(),
    organizationId: organizationId(),
    eventId: text("event_id").notNull(),
    editionKey: text("edition_key").notNull(),
    name: text("name").notNull(),
    city: text("city").notNull().default(""),
    timeZone: text("time_zone").notNull().default("America/Sao_Paulo"),
    startAt: text("start_at"),
    endAt: text("end_at"),
    externalTicketUrl: text("external_ticket_url"),
    brandProfileId: text("brand_profile_id"),
    tokensJson: text("tokens_json", { mode: "json" })
      .$type<BrandTokens>()
      .notNull()
      .default({}),
    status: text("status", { enum: ["draft", "active", "archived"] })
      .notNull()
      .default("draft"),
    revision: integer("revision").notNull().default(1),
    ...timestamps(),
  },
  (table): SQLiteTableExtraConfigValue[] => [
    unique("editions_org_id_unique").on(table.organizationId, table.id),
    unique("editions_org_event_key_unique").on(
      table.organizationId,
      table.eventId,
      table.editionKey,
    ),
    index("editions_org_event_status_idx").on(
      table.organizationId,
      table.eventId,
      table.status,
    ),
    foreignKey({
      name: "editions_event_scope_fk",
      columns: [table.organizationId, table.eventId],
      foreignColumns: [events.organizationId, events.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "editions_brand_scope_fk",
      columns: [table.organizationId, table.brandProfileId],
      foreignColumns: [brandProfiles.organizationId, brandProfiles.id],
    }).onDelete("restrict"),
    check(
      "editions_key_check",
      sql`length(${table.editionKey}) BETWEEN 1 AND 100 AND ${table.editionKey} = lower(${table.editionKey}) AND ${table.editionKey} NOT GLOB '*[^a-z0-9-]*'`,
    ),
    check("editions_name_check", sql`length(trim(${table.name})) > 0`),
    check(
      "editions_status_check",
      sql`${table.status} IN ('draft','active','archived')`,
    ),
    check("editions_revision_check", sql`${table.revision} >= 1`),
    check(
      "editions_interval_check",
      sql`${table.startAt} IS NULL OR ${table.endAt} IS NULL OR ${table.endAt} > ${table.startAt}`,
    ),
    check(
      "editions_tokens_check",
      sql`json_valid(${table.tokensJson}) AND json_type(${table.tokensJson}) = 'object'`,
    ),
  ],
);

export const venues = sqliteTable(
  "venues",
  {
    id: text("id").primaryKey(),
    organizationId: organizationId(),
    editionId: text("edition_id").notNull(),
    name: text("name").notNull(),
    addressPublic: text("address_public").notNull().default(""),
    geodataJson: text("geodata_json", { mode: "json" }).$type<{
      latitude: number;
      longitude: number;
    } | null>(),
    accessibility: text("accessibility").notNull().default(""),
    revision: integer("revision").notNull().default(1),
    ...timestamps(),
  },
  (table) => [
    unique("venues_org_id_unique").on(table.organizationId, table.id),
    unique("venues_org_edition_id_unique").on(
      table.organizationId,
      table.editionId,
      table.id,
    ),
    foreignKey({
      name: "venues_edition_scope_fk",
      columns: [table.organizationId, table.editionId],
      foreignColumns: [editions.organizationId, editions.id],
    }).onDelete("restrict"),
    check("venues_name_check", sql`length(trim(${table.name})) > 0`),
    check("venues_revision_check", sql`${table.revision} >= 1`),
    check(
      "venues_geodata_check",
      sql`${table.geodataJson} IS NULL OR (json_valid(${table.geodataJson}) AND json_type(${table.geodataJson}) = 'object')`,
    ),
  ],
);

export const eventAssignments = sqliteTable(
  "event_assignments",
  {
    id: text("id").primaryKey(),
    organizationId: organizationId(),
    eventId: text("event_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    permissionsJson: text("permissions_json", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default([]),
    ...timestamps(),
  },
  (table) => [
    unique("event_assignments_org_id_unique").on(
      table.organizationId,
      table.id,
    ),
    unique("event_assignments_org_event_user_unique").on(
      table.organizationId,
      table.eventId,
      table.userId,
    ),
    foreignKey({
      name: "event_assignments_event_scope_fk",
      columns: [table.organizationId, table.eventId],
      foreignColumns: [events.organizationId, events.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "event_assignments_member_scope_fk",
      columns: [table.organizationId, table.userId],
      foreignColumns: [memberships.organizationId, memberships.userId],
    }).onDelete("restrict"),
    check(
      "event_assignments_permissions_check",
      sql`json_valid(${table.permissionsJson}) AND json_type(${table.permissionsJson}) = 'array'`,
    ),
  ],
);

export const invitations = sqliteTable(
  "invitations",
  {
    id: text("id").primaryKey(),
    organizationId: organizationId(),
    emailHash: text("email_hash").notNull(),
    tokenHash: text("token_hash").notNull(),
    role: text("role", { enum: membershipRoles }).notNull(),
    eventId: text("event_id"),
    invitedBy: text("invited_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    expiresAt: text("expires_at").notNull(),
    acceptedAt: text("accepted_at"),
    revokedAt: text("revoked_at"),
    createdAt: text("created_at").notNull().default(utcNow),
  },
  (table) => [
    unique("invitations_org_id_unique").on(table.organizationId, table.id),
    unique("invitations_token_hash_unique").on(table.tokenHash),
    index("invitations_org_email_idx").on(
      table.organizationId,
      table.emailHash,
    ),
    foreignKey({
      name: "invitations_event_scope_fk",
      columns: [table.organizationId, table.eventId],
      foreignColumns: [events.organizationId, events.id],
    }).onDelete("restrict"),
    check(
      "invitations_role_check",
      sql`${table.role} IN ('organization_owner','organization_admin','event_manager','content_editor','publisher','reviewer_staff')`,
    ),
    check(
      "invitations_token_hash_check",
      sql`length(${table.tokenHash}) = 64 AND ${table.tokenHash} NOT GLOB '*[^0-9a-f]*'`,
    ),
    check(
      "invitations_email_hash_check",
      sql`length(${table.emailHash}) = 64 AND ${table.emailHash} NOT GLOB '*[^0-9a-f]*'`,
    ),
    check(
      "invitations_expiry_check",
      sql`${table.expiresAt} > ${table.createdAt}`,
    ),
    check(
      "invitations_acceptance_check",
      sql`${table.acceptedAt} IS NULL OR (${table.revokedAt} IS NULL AND ${table.acceptedAt} <= ${table.expiresAt})`,
    ),
  ],
);

export const auditEvents = sqliteTable(
  "audit_events",
  {
    id: text("id").primaryKey(),
    organizationId: organizationId(),
    actorId: text("actor_id").references(() => user.id, {
      onDelete: "restrict",
    }),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id").notNull(),
    diffSafeJson: text("diff_safe_json", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: text("created_at").notNull().default(utcNow),
  },
  (table) => [
    unique("audit_events_org_id_unique").on(table.organizationId, table.id),
    index("audit_events_org_created_idx").on(
      table.organizationId,
      table.createdAt,
    ),
    index("audit_events_org_resource_idx").on(
      table.organizationId,
      table.resourceType,
      table.resourceId,
    ),
    check(
      "audit_events_diff_check",
      sql`json_valid(${table.diffSafeJson}) AND json_type(${table.diffSafeJson}) = 'object'`,
    ),
  ],
);

/** Explicit owner columns allow SQLite to enforce a polymorphic owner's tenant. */
export const mediaAssets = sqliteTable(
  "media_assets",
  {
    id: text("id").primaryKey(),
    organizationId: organizationId(),
    ownerType: text("owner_type", {
      enum: ["organization", "event", "edition"],
    }).notNull(),
    ownerId: text("owner_id").notNull(),
    eventId: text("event_id"),
    editionId: text("edition_id"),
    visibility: text("visibility", { enum: ["private", "public"] })
      .notNull()
      .default("private"),
    r2Key: text("r2_key").notNull(),
    mime: text("mime").notNull(),
    size: integer("size").notNull(),
    originalName: text("original_name").notNull(),
    licenseStatus: text("license_status", {
      enum: ["pending", "licensed", "owned", "rejected"],
    })
      .notNull()
      .default("pending"),
    licenseNote: text("license_note").notNull().default(""),
    altText: text("alt_text").notNull().default(""),
    status: text("status", { enum: ["ready", "archived"] })
      .notNull()
      .default("ready"),
    uploadedBy: text("uploaded_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    revision: integer("revision").notNull().default(1),
    ...timestamps(),
  },
  (table): SQLiteTableExtraConfigValue[] => [
    unique("media_assets_org_id_unique").on(table.organizationId, table.id),
    unique("media_assets_r2_key_unique").on(table.r2Key),
    index("media_assets_org_owner_idx").on(
      table.organizationId,
      table.ownerType,
      table.ownerId,
    ),
    foreignKey({
      name: "media_assets_event_scope_fk",
      columns: [table.organizationId, table.eventId],
      foreignColumns: [events.organizationId, events.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "media_assets_edition_scope_fk",
      columns: [table.organizationId, table.editionId],
      foreignColumns: [editions.organizationId, editions.id],
    }).onDelete("restrict"),
    check(
      "media_assets_owner_check",
      sql`(
      (${table.ownerType} = 'organization' AND ${table.ownerId} = ${table.organizationId} AND ${table.eventId} IS NULL AND ${table.editionId} IS NULL)
      OR (${table.ownerType} = 'event' AND ${table.ownerId} = ${table.eventId} AND ${table.eventId} IS NOT NULL AND ${table.editionId} IS NULL)
      OR (${table.ownerType} = 'edition' AND ${table.ownerId} = ${table.editionId} AND ${table.editionId} IS NOT NULL AND ${table.eventId} IS NULL)
    )`,
    ),
    check(
      "media_assets_visibility_check",
      sql`${table.visibility} IN ('private','public')`,
    ),
    check(
      "media_assets_license_check",
      sql`${table.licenseStatus} IN ('pending','licensed','owned','rejected')`,
    ),
    check(
      "media_assets_public_license_check",
      sql`${table.visibility} != 'public' OR ${table.licenseStatus} IN ('licensed','owned')`,
    ),
    check(
      "media_assets_status_check",
      sql`${table.status} IN ('ready','archived')`,
    ),
    check(
      "media_assets_size_check",
      sql`${table.size} > 0 AND ${table.size} <= 10485760`,
    ),
    check(
      "media_assets_key_scope_check",
      sql`substr(${table.r2Key}, 1, length('org/' || ${table.organizationId} || '/')) = 'org/' || ${table.organizationId} || '/'`,
    ),
    check("media_assets_revision_check", sql`${table.revision} >= 1`),
  ],
);

/** Immutable editorial revisions. Page and section rows are normalized indexes
 * of a revision; snapshot_json is the exact content that may be published. */
export const contentDrafts = sqliteTable(
  "content_drafts",
  {
    id: text("id").primaryKey(),
    organizationId: organizationId(),
    editionId: text("edition_id").notNull(),
    revision: integer("revision").notNull(),
    contentJson: text("content_json", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: text("created_at").notNull().default(utcNow),
  },
  (table) => [
    unique("content_drafts_org_id_unique").on(table.organizationId, table.id),
    unique("content_drafts_edition_id_unique").on(
      table.organizationId,
      table.editionId,
      table.id,
    ),
    unique("content_drafts_edition_revision_unique").on(
      table.organizationId,
      table.editionId,
      table.revision,
    ),
    foreignKey({
      name: "content_drafts_edition_scope_fk",
      columns: [table.organizationId, table.editionId],
      foreignColumns: [editions.organizationId, editions.id],
    }).onDelete("restrict"),
    check("content_drafts_revision_check", sql`${table.revision} >= 1`),
    check(
      "content_drafts_json_check",
      sql`json_valid(${table.contentJson}) AND json_type(${table.contentJson}) = 'object'`,
    ),
  ],
);

export const contentPages = sqliteTable(
  "pages",
  {
    id: text("id").primaryKey(),
    organizationId: organizationId(),
    draftId: text("draft_id").notNull(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    unique("pages_org_id_unique").on(table.organizationId, table.id),
    unique("pages_draft_slug_unique").on(
      table.organizationId,
      table.draftId,
      table.slug,
    ),
    foreignKey({
      name: "pages_draft_scope_fk",
      columns: [table.organizationId, table.draftId],
      foreignColumns: [contentDrafts.organizationId, contentDrafts.id],
    }).onDelete("restrict"),
    check(
      "pages_slug_check",
      sql`${table.slug} = 'home' OR (${table.slug} = lower(${table.slug}) AND ${table.slug} NOT GLOB '*[^a-z0-9-]*' AND length(${table.slug}) BETWEEN 1 AND 100)`,
    ),
    check("pages_title_check", sql`length(trim(${table.title})) > 0`),
  ],
);

export const contentSections = sqliteTable(
  "sections",
  {
    id: text("id").primaryKey(),
    organizationId: organizationId(),
    pageId: text("page_id").notNull(),
    type: text("type").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    contentJson: text("content_json", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull(),
  },
  (table) => [
    unique("sections_org_id_unique").on(table.organizationId, table.id),
    foreignKey({
      name: "sections_page_scope_fk",
      columns: [table.organizationId, table.pageId],
      foreignColumns: [contentPages.organizationId, contentPages.id],
    }).onDelete("restrict"),
    check(
      "sections_type_check",
      sql`${table.type} IN ('hero','cards','agenda','cta','faq','sponsors','gallery','text')`,
    ),
    check(
      "sections_json_check",
      sql`json_valid(${table.contentJson}) AND json_type(${table.contentJson}) = 'object'`,
    ),
  ],
);

export const contentFaqItems = sqliteTable(
  "content_faq_items",
  {
    id: text("id").primaryKey(),
    organizationId: organizationId(),
    pageId: text("page_id").notNull(),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    unique("content_faq_org_id_unique").on(table.organizationId, table.id),
    foreignKey({
      name: "content_faq_page_scope_fk",
      columns: [table.organizationId, table.pageId],
      foreignColumns: [contentPages.organizationId, contentPages.id],
    }).onDelete("restrict"),
    check(
      "content_faq_question_check",
      sql`length(trim(${table.question})) > 0`,
    ),
    check("content_faq_answer_check", sql`length(trim(${table.answer})) > 0`),
  ],
);

export const publications = sqliteTable(
  "publications",
  {
    id: text("id").primaryKey(),
    organizationId: organizationId(),
    editionId: text("edition_id").notNull(),
    sourceDraftId: text("source_draft_id").notNull(),
    revision: integer("revision").notNull(),
    snapshotJson: text("snapshot_json", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    rollbackOfId: text("rollback_of_id"),
    createdAt: text("created_at").notNull().default(utcNow),
  },
  (table) => [
    unique("publications_org_id_unique").on(table.organizationId, table.id),
    unique("publications_edition_id_unique").on(
      table.organizationId,
      table.editionId,
      table.id,
    ),
    unique("publications_edition_revision_unique").on(
      table.organizationId,
      table.editionId,
      table.revision,
    ),
    foreignKey({
      name: "publications_edition_scope_fk",
      columns: [table.organizationId, table.editionId],
      foreignColumns: [editions.organizationId, editions.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "publications_draft_scope_fk",
      columns: [table.organizationId, table.sourceDraftId],
      foreignColumns: [contentDrafts.organizationId, contentDrafts.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "publications_rollback_scope_fk",
      columns: [table.organizationId, table.rollbackOfId],
      foreignColumns: [table.organizationId, table.id],
    }).onDelete("restrict"),
    check("publications_revision_check", sql`${table.revision} >= 1`),
    check(
      "publications_json_check",
      sql`json_valid(${table.snapshotJson}) AND json_type(${table.snapshotJson}) = 'object'`,
    ),
  ],
);

export const editionPublicationPointers = sqliteTable(
  "edition_publication_pointers",
  {
    organizationId: organizationId(),
    editionId: text("edition_id").notNull(),
    publicationId: text("publication_id").notNull(),
    revision: integer("revision").notNull(),
    updatedAt: text("updated_at").notNull().default(utcNow),
  },
  (table) => [
    unique("edition_publication_pointers_pk").on(
      table.organizationId,
      table.editionId,
    ),
    foreignKey({
      name: "edition_publication_edition_scope_fk",
      columns: [table.organizationId, table.editionId],
      foreignColumns: [editions.organizationId, editions.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "edition_publication_target_scope_fk",
      columns: [table.organizationId, table.editionId, table.publicationId],
      foreignColumns: [
        publications.organizationId,
        publications.editionId,
        publications.id,
      ],
    }).onDelete("restrict"),
    check("edition_publication_revision_check", sql`${table.revision} >= 1`),
  ],
);

export const contentRedirects = sqliteTable(
  "content_redirects",
  {
    id: text("id").primaryKey(),
    organizationId: organizationId(),
    editionId: text("edition_id").notNull(),
    fromSlug: text("from_slug").notNull(),
    toSlug: text("to_slug").notNull(),
    statusCode: integer("status_code").notNull().default(301),
    createdAt: text("created_at").notNull().default(utcNow),
  },
  (table) => [
    unique("content_redirects_org_id_unique").on(
      table.organizationId,
      table.id,
    ),
    unique("content_redirects_source_unique").on(
      table.organizationId,
      table.editionId,
      table.fromSlug,
    ),
    foreignKey({
      name: "content_redirects_edition_scope_fk",
      columns: [table.organizationId, table.editionId],
      foreignColumns: [editions.organizationId, editions.id],
    }).onDelete("restrict"),
    check(
      "content_redirects_code_check",
      sql`${table.statusCode} IN (301, 302)`,
    ),
  ],
);

/** A row is routable only after each independent domain-verification gate passes. */
export const domainBindings = sqliteTable(
  "domain_bindings",
  {
    id: text("id").primaryKey(),
    organizationId: organizationId(),
    hostname: text("hostname").notNull(),
    destination: text("destination", { enum: ["FIXED_EDITION"] }).notNull(),
    destinationId: text("destination_id").notNull(),
    status: text("status").notNull().default("requested"),
    ownershipVerified: integer("ownership_verified", { mode: "boolean" })
      .notNull()
      .default(false),
    hostnameStatus: text("hostname_status"),
    sslStatus: text("ssl_status"),
    dnsVerified: integer("dns_verified", { mode: "boolean" })
      .notNull()
      .default(false),
    version: integer("version").notNull().default(1),
    ...timestamps(),
  },
  (table) => [
    unique("domain_bindings_hostname_unique").on(table.hostname),
    unique("domain_bindings_org_id_unique").on(table.organizationId, table.id),
    foreignKey({
      name: "domain_bindings_edition_scope_fk",
      columns: [table.organizationId, table.destinationId],
      foreignColumns: [editions.organizationId, editions.id],
    }).onDelete("restrict"),
    check("domain_bindings_version_check", sql`${table.version} >= 1`),
    check(
      "domain_bindings_status_check",
      sql`${table.status} IN ('requested','ownership_pending','tls_pending','dns_pending','active','suspended','releasing','released','failed')`,
    ),
    check(
      "domain_bindings_hostname_check",
      sql`length(${table.hostname}) BETWEEN 3 AND 253 AND ${table.hostname} = lower(${table.hostname})`,
    ),
  ],
);
