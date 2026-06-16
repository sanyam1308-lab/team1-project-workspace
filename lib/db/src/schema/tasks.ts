import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  weekNumber: integer("week_number").notNull(),
  name: text("name").notNull().default(""),
  owner: text("owner").notNull().default(""),
  targetDate: text("target_date").notNull().default(""),
  done: boolean("done").notNull().default(false),
  position: integer("position").notNull().default(0),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({
  id: true,
});
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
