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

export const qcDeviationsTable = pgTable("qc_deviations", {
  id: serial("id").primaryKey(),
  runId: integer("run_id").notNull(),
  metricKey: text("metric_key").notNull(),
  measureField: text("measure_field").notNull(),
  dimensionValue: text("dimension_value").notNull().default(""),
  previousValue: doublePrecision("previous_value"),
  currentValue: doublePrecision("current_value"),
  pctChange: doublePrecision("pct_change"),
  reason: text("reason").notNull().default("threshold"),
  likelyCause: text("likely_cause").notNull().default("unclear"),
  confidence: text("confidence").notNull().default("low"),
  explanation: text("explanation").notNull().default(""),
  recommendedCheck: text("recommended_check").notNull().default(""),
  rawResponse: text("raw_response").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertQcDeviationSchema = createInsertSchema(
  qcDeviationsTable,
).omit({ id: true });
export type InsertQcDeviation = z.infer<typeof insertQcDeviationSchema>;
export type QcDeviation = typeof qcDeviationsTable.$inferSelect;
