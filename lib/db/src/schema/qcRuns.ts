import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const qcRunsTable = pgTable("qc_runs", {
  id: serial("id").primaryKey(),
  trigger: text("trigger").notNull().default("manual"),
  status: text("status").notNull().default("success"),
  message: text("message").notNull().default(""),
  metricsPulled: integer("metrics_pulled").notNull().default(0),
  deviationsFound: integer("deviations_found").notNull().default(0),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertQcRunSchema = createInsertSchema(qcRunsTable).omit({
  id: true,
});
export type InsertQcRun = z.infer<typeof insertQcRunSchema>;
export type QcRun = typeof qcRunsTable.$inferSelect;
