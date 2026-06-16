import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const problemCardsTable = pgTable("problem_cards", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  content: text("content").notNull(),
  position: integer("position").notNull().default(0),
});

export const insertProblemCardSchema = createInsertSchema(
  problemCardsTable,
).omit({ id: true });
export type InsertProblemCard = z.infer<typeof insertProblemCardSchema>;
export type ProblemCard = typeof problemCardsTable.$inferSelect;
