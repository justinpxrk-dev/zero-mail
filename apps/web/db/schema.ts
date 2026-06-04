import { relations } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { account } from "./auth-schema";

export * from "./auth-schema";

export const gmailWatch = pgTable("gmail_watch", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  accountId: text("account_id")
    .notNull()
    .unique()
    .references(() => account.id, { onDelete: "cascade" }),
  historyId: text("history_id").notNull(),
  expiration: timestamp("expiration").notNull(),
  topicName: text("topic_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const gmailWatchRelations = relations(gmailWatch, ({ one }) => ({
  account: one(account, {
    fields: [gmailWatch.accountId],
    references: [account.id],
  }),
}));

export const email = pgTable(
  "email",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    accountId: text("account_id")
      .notNull()
      .references(() => account.id, { onDelete: "cascade" }),
    gmailMessageId: text("gmail_message_id").notNull(),
    gmailThreadId: text("gmail_thread_id").notNull(),
    from: text("from").notNull(),
    subject: text("subject").notNull(),
    snippet: text("snippet").notNull(),
    body: text("body").notNull(),
    receivedAt: timestamp("received_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // Pub/Sub delivers at-least-once; dedup on (account, Gmail message id) so a
    // re-pushed message is a no-op insert.
    unique().on(table.accountId, table.gmailMessageId),
  ],
);

export const extraction = pgTable(
  "extraction",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    emailId: text("email_id")
      .notNull()
      .references(() => email.id, { onDelete: "cascade" }),
    // Action kind — "info" | "task" | "event" | "notification". The union is
    // owned by the extraction client in packages/core; stored loosely as text
    // here.
    type: text("type").notNull(),
    // Type-specific structured action payload (shape owned by packages/core).
    data: jsonb("data").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index().on(table.emailId)],
);

export const emailRelations = relations(email, ({ many, one }) => ({
  account: one(account, {
    fields: [email.accountId],
    references: [account.id],
  }),
  extractions: many(extraction),
}));

export const extractionRelations = relations(extraction, ({ one }) => ({
  email: one(email, {
    fields: [extraction.emailId],
    references: [email.id],
  }),
}));

// account is defined in the Better Auth-generated auth-schema.ts, which cannot
// import these app tables without a circular import. Drizzle merges multiple
// relations() configs for the same table, so account's inverse (child) side is
// declared here.
export const accountInverseRelations = relations(account, ({ many, one }) => ({
  emails: many(email),
  gmailWatch: one(gmailWatch),
}));
