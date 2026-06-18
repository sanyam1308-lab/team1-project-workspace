import {
  pgTable,
  text,
  serial,
  doublePrecision,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const qcMetricConfigTable = pgTable("qc_metric_config", {
  id: serial("id").primaryKey(),
  measureField: text("measure_field").notNull(),
  aggregation: text("aggregation").notNull().default("SUM"),
  dimensionField: text("dimension_field").notNull().default(""),
  thresholdPct: doublePrecision("threshold_pct").notNull().default(10),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertQcMetricConfigSchema = createInsertSchema(
  qcMetricConfigTable,
).omit({ id: true });
export type InsertQcMetricConfig = z.infer<typeof insertQcMetricConfigSchema>;
export type QcMetricConfig = typeof qcMetricConfigTable.$inferSelect;
