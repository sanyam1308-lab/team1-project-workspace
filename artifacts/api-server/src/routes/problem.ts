import { Router, type IRouter } from "express";
import { db, problemCardsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { UpdateProblemCardBody, UpdateProblemCardParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/problem-cards", async (_req, res) => {
  const cards = await db
    .select()
    .from(problemCardsTable)
    .orderBy(asc(problemCardsTable.position));
  res.json(
    cards.map((c) => ({ key: c.key, label: c.label, content: c.content })),
  );
});

router.patch("/problem-cards/:key", async (req, res) => {
  const { key } = UpdateProblemCardParams.parse(req.params);
  const { content } = UpdateProblemCardBody.parse(req.body);

  const [updated] = await db
    .update(problemCardsTable)
    .set({ content })
    .where(eq(problemCardsTable.key, key))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Problem card not found" });
    return;
  }

  res.json({
    key: updated.key,
    label: updated.label,
    content: updated.content,
  });
});

export default router;
