import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  unique,
  index,
  foreignKey,
  check,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { editions, organizations } from "./tenant-schema";
import { user } from "./auth-schema";
const createdAt = () =>
  text("created_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`);
export const forms = sqliteTable(
  "forms",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    editionId: text("edition_id").notNull(),
    name: text("name").notNull(),
    state: text("state", { enum: ["draft", "open", "closed"] })
      .notNull()
      .default("draft"),
    revision: integer("revision").notNull().default(1),
    createdAt: createdAt(),
  },
  (t) => [
    unique("forms_org_id").on(t.organizationId, t.id),
    unique("forms_org_edition_id").on(t.organizationId, t.editionId, t.id),
    foreignKey({
      columns: [t.organizationId, t.editionId],
      foreignColumns: [editions.organizationId, editions.id],
    }),
    check("forms_state", sql`${t.state} IN ('draft','open','closed')`),
    check("forms_revision", sql`${t.revision}>=1`),
  ],
);
export const formDefinitions = sqliteTable(
  "form_definitions",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    formId: text("form_id").notNull(),
    revision: integer("revision").notNull(),
    definitionJson: text("definition_json").notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    createdAt: createdAt(),
  },
  (t) => [
    unique("form_definitions_org_id").on(t.organizationId, t.id),
    unique("form_definitions_org_form_id").on(t.organizationId, t.formId, t.id),
    unique("form_definitions_version").on(
      t.organizationId,
      t.formId,
      t.revision,
    ),
    foreignKey({
      columns: [t.organizationId, t.formId],
      foreignColumns: [forms.organizationId, forms.id],
    }),
    check(
      "form_definitions_json",
      sql`json_valid(${t.definitionJson}) AND json_type(${t.definitionJson})='object'`,
    ),
  ],
);
export const formFields = sqliteTable(
  "form_fields",
  {
    organizationId: text("organization_id").notNull(),
    definitionId: text("definition_id").notNull(),
    fieldKey: text("field_key").notNull(),
    fieldJson: text("field_json").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.organizationId, t.definitionId, t.fieldKey] }),
    foreignKey({
      columns: [t.organizationId, t.definitionId],
      foreignColumns: [formDefinitions.organizationId, formDefinitions.id],
    }),
    check("form_fields_json", sql`json_valid(${t.fieldJson})`),
  ],
);
export const formSubmissions = sqliteTable(
  "form_submissions",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    editionId: text("edition_id").notNull(),
    formId: text("form_id").notNull(),
    definitionId: text("definition_id").notNull(),
    idempotencyHash: text("idempotency_hash").notNull(),
    payloadHash: text("payload_hash").notNull(),
    receiptHash: text("receipt_hash").notNull().unique(),
    answersCiphertext: text("answers_ciphertext"),
    profileCiphertext: text("profile_ciphertext"),
    listingOptIn: integer("listing_opt_in").notNull().default(0),
    state: text("state", { enum: ["active", "withdrawn", "purged"] })
      .notNull()
      .default("active"),
    receiptExpiresAt: text("receipt_expires_at").notNull(),
    retentionUntil: text("retention_until").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("form_submissions_org_id").on(t.organizationId, t.id),
    unique("form_submissions_idempotency").on(
      t.organizationId,
      t.formId,
      t.idempotencyHash,
    ),
    foreignKey({
      columns: [t.organizationId, t.editionId, t.formId],
      foreignColumns: [forms.organizationId, forms.editionId, forms.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.formId, t.definitionId],
      foreignColumns: [
        formDefinitions.organizationId,
        formDefinitions.formId,
        formDefinitions.id,
      ],
    }),
    check(
      "form_submissions_state",
      sql`${t.state} IN ('active','withdrawn','purged')`,
    ),
    check("form_submissions_optin", sql`${t.listingOptIn} IN (0,1)`),
    index("form_submissions_retention").on(t.organizationId, t.retentionUntil),
  ],
);
export const exhibitorApplications = sqliteTable(
  "exhibitor_applications",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    editionId: text("edition_id").notNull(),
    submissionId: text("submission_id").notNull(),
    status: text("status", {
      enum: ["submitted", "needs_info", "approved", "rejected"],
    })
      .notNull()
      .default("submitted"),
    applicantMessage: text("applicant_message").notNull().default(""),
    revision: integer("revision").notNull().default(1),
    createdAt: createdAt(),
  },
  (t) => [
    unique("applications_org_id").on(t.organizationId, t.id),
    unique("applications_submission").on(t.organizationId, t.submissionId),
    unique("applications_edition_id").on(t.organizationId, t.editionId, t.id),
    foreignKey({
      columns: [t.organizationId, t.submissionId],
      foreignColumns: [formSubmissions.organizationId, formSubmissions.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.editionId],
      foreignColumns: [editions.organizationId, editions.id],
    }),
    check(
      "applications_status",
      sql`${t.status} IN ('submitted','needs_info','approved','rejected')`,
    ),
    check("applications_revision", sql`${t.revision}>=1`),
  ],
);
export const applicationEvents = sqliteTable(
  "application_events",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    applicationId: text("application_id").notNull(),
    actorId: text("actor_id").references(() => user.id),
    action: text("action").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({
      columns: [t.organizationId, t.applicationId],
      foreignColumns: [
        exhibitorApplications.organizationId,
        exhibitorApplications.id,
      ],
    }),
  ],
);
export const publicProfileSources = sqliteTable(
  "public_profile_sources",
  {
    organizationId: text("organization_id").notNull(),
    editionId: text("edition_id").notNull(),
    exhibitorId: text("exhibitor_id").notNull(),
    applicationId: text("application_id").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.organizationId, t.editionId, t.exhibitorId] }),
    unique("public_profile_application").on(t.organizationId, t.applicationId),
    foreignKey({
      columns: [t.organizationId, t.editionId, t.applicationId],
      foreignColumns: [
        exhibitorApplications.organizationId,
        exhibitorApplications.editionId,
        exhibitorApplications.id,
      ],
    }),
  ],
);
export const publicFormRateLimits = sqliteTable(
  "public_form_rate_limits",
  {
    organizationId: text("organization_id").notNull(),
    formId: text("form_id").notNull(),
    keyHash: text("key_hash").notNull(),
    bucket: integer("bucket").notNull(),
    count: integer("count").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.organizationId, t.formId, t.keyHash, t.bucket] }),
    foreignKey({
      columns: [t.organizationId, t.formId],
      foreignColumns: [forms.organizationId, forms.id],
    }),
    check("form_rate_count", sql`${t.count}>=1 AND ${t.count}<=10`),
  ],
);

/** At most one encrypted applicant reply for each needs_info revision.
 * Reply content may only be redacted (never changed or re-exposed).
 */
export const applicationReplies = sqliteTable(
  "application_replies",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    editionId: text("edition_id").notNull(),
    applicationId: text("application_id").notNull(),
    requestedRevision: integer("requested_revision").notNull(),
    replyCiphertext: text("reply_ciphertext"),
    createdAt: createdAt(),
  },
  (t) => [
    unique("application_replies_once_per_request").on(
      t.organizationId, t.applicationId, t.requestedRevision,
    ),
    index("application_replies_by_application").on(
      t.organizationId, t.applicationId, t.createdAt,
    ),
    foreignKey({
      columns: [t.organizationId, t.editionId, t.applicationId],
      foreignColumns: [
        exhibitorApplications.organizationId,
        exhibitorApplications.editionId,
        exhibitorApplications.id,
      ],
    }),
    check("application_reply_revision", sql`${t.requestedRevision}>=1`),
  ],
);

/** Private applicant attachment references. R2 objects are never public assets. */
export const applicationAttachments = sqliteTable(
  "application_attachments",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    editionId: text("edition_id").notNull(),
    applicationId: text("application_id").notNull(),
    objectKey: text("object_key").notNull().unique(),
    originalName: text("original_name").notNull(),
    mime: text("mime", { enum: ["image/png", "image/jpeg", "image/webp"] }).notNull(),
    byteSize: integer("byte_size").notNull(),
    sha256: text("sha256").notNull(),
    state: text("state", { enum: ["ready", "delete_pending", "deleted"] }).notNull().default("ready"),
    createdAt: createdAt(),
    removedAt: text("removed_at"),
  },
  (t) => [
    index("application_attachments_by_app").on(t.organizationId, t.applicationId, t.state),
    index("application_attachments_cleanup").on(t.state, t.createdAt),
    foreignKey({
      columns: [t.organizationId, t.editionId, t.applicationId],
      foreignColumns: [
        exhibitorApplications.organizationId,
        exhibitorApplications.editionId,
        exhibitorApplications.id,
      ],
    }),
    check("attachment_mime", sql`${t.mime} IN ('image/png','image/jpeg','image/webp')`),
    check("attachment_size", sql`${t.byteSize}>0 AND ${t.byteSize}<=2097152`),
    check("attachment_hash", sql`length(${t.sha256})=64 AND ${t.sha256} NOT GLOB '*[^0-9a-f]*'`),
    check("attachment_key", sql`${t.objectKey}=('org/'||${t.organizationId}||'/applications/'||${t.applicationId}||'/'||${t.id})`),
    check("attachment_state", sql`${t.state} IN ('ready','delete_pending','deleted')`),
    check("attachment_deleted_time", sql`(${t.state}='ready' AND ${t.removedAt} IS NULL) OR ${t.state}='delete_pending' OR (${t.state}='deleted' AND ${t.removedAt} IS NOT NULL)`),
  ],
);

/** Encrypted key-rotation shadow; does not mutate immutable source fields. */
export const privateCipherRewraps = sqliteTable(
  "private_cipher_rewraps",
  {
    organizationId: text("organization_id").notNull(),
    sourceKind: text("source_kind", { enum: ["submission", "reply"] }).notNull(),
    sourceId: text("source_id").notNull(),
    fieldName: text("field_name", { enum: ["answers", "profile", "reply"] }).notNull(),
    sourceHash: text("source_hash").notNull(),
    rewrappedCiphertext: text("rewrapped_ciphertext").notNull(),
    createdAt: createdAt(),
    updatedAt: text("updated_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  },
  (t) => [
    primaryKey({ columns: [t.organizationId, t.sourceKind, t.sourceId, t.fieldName] }),
    index("rewrap_by_tenant").on(t.organizationId,t.sourceKind,t.sourceId),
    check("rewrap_source_kind",sql`${t.sourceKind} IN ('submission','reply')`),
    check("rewrap_field",sql`(${t.sourceKind}='submission' AND ${t.fieldName} IN ('answers','profile')) OR (${t.sourceKind}='reply' AND ${t.fieldName}='reply')`),
    check("rewrap_source_hash",sql`length(${t.sourceHash})=64 AND ${t.sourceHash} NOT GLOB '*[^0-9a-f]*'`),
    check("rewrap_envelope",sql`${t.rewrappedCiphertext} LIKE 'v2.%'`),
  ],
);
