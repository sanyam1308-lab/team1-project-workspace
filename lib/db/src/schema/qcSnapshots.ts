import {
  pgTable,
  text,
  serial,
  integer,
  doublePrecision,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const qcSnapshotsTable = pgTable("qc_snapshots", {
  id: serial("id").primaryKey(),
  runId: integer("run_id").notNull(),
  metricKey: text("metric_key").notNull(),
  measureField: text("measure_field").notNull(),
  dimensionField: text("dimension_field").notNull().default(""),
  dimensionValue: text("dimension_value").notNull().default(""),
  value: doublePrecision("value"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertQcSnapshotSchema = createInsertSchema(qcSnapshotsTable).omit({
  id: true,
});
export type InsertQcSnapshot = z.infer<typeof insertQcSnapshotSchema>;
export type QcSnapshot = typeof qcSnapshotsTable.$inferSelect;
