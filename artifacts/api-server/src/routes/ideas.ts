import { Router, type IRouter } from "express";
import { db, ideasTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { CreateIdeaBody, DeleteIdeaParams, UpvoteIdeaParams } from "@workspace/api-zod";

const router: IRouter = Router();

function serialize(idea: typeof ideasTable.$inferSelect) {
  return {
    id: idea.id,
    text: idea.text,
    author: idea.author,
    votes: idea.votes,
    createdAt: idea.createdAt.toISOString(),
  };
}

router.get("/ideas", async (_req, res) => {
  const ideas = await db
    .select()
    .from(ideasTable)
    .orderBy(desc(ideasTable.votes), desc(ideasTable.createdAt));
  res.json(ideas.map(serialize));
});

router.post("/ideas", async (req, res) => {
  const { text, author } = CreateIdeaBody.parse(req.body);
  const [created] = await db
    .insert(ideasTable)
    .values({ text, author, votes: 0 })
    .returning();
  res.status(201).json(serialize(created));
});

router.delete("/ideas/:id", async (req, res) => {
  const { id } = DeleteIdeaParams.parse(req.params);
  const [deleted] = await db
    .delete(ideasTable)
    .where(eq(ideasTable.id, id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Idea not found" });
    return;
  }
  res.status(204).end();
});

router.post("/ideas/:id/upvote", async (req, res) => {
  const { id } = UpvoteIdeaParams.parse(req.params);
  const [updated] = await db
    .update(ideasTable)
    .set({ votes: sql`${ideasTable.votes} + 1` })
    .where(eq(ideasTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Idea not found" });
    return;
  }
  res.json(serialize(updated));
});

export default router;
