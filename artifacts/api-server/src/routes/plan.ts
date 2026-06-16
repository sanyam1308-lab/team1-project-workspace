import { Router, type IRouter } from "express";
import { db, tasksTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { CreateTaskBody, UpdateTaskParams, UpdateTaskBody, DeleteTaskParams } from "@workspace/api-zod";

const router: IRouter = Router();

const WEEK_DEFS = [
  { number: 1, title: "Week 1", dateRange: "Mon 15 – Fri 19 Jun", theme: "Frame & gather" },
  { number: 2, title: "Week 2", dateRange: "Mon 22 – Fri 26 Jun", theme: "Build the agent" },
  { number: 3, title: "Week 3", dateRange: "Mon 29 Jun – Fri 10 Jul", theme: "Integrate, test, finalise" },
];

function serializeTask(t: typeof tasksTable.$inferSelect) {
  return {
    id: t.id,
    weekNumber: t.weekNumber,
    name: t.name,
    owner: t.owner,
    targetDate: t.targetDate,
    done: t.done,
    position: t.position,
  };
}

async function buildPlan() {
  const tasks = await db
    .select()
    .from(tasksTable)
    .orderBy(asc(tasksTable.position), asc(tasksTable.id));

  const weeks = WEEK_DEFS.map((def) => {
    const weekTasks = tasks.filter((t) => t.weekNumber === def.number);
    const doneCount = weekTasks.filter((t) => t.done).length;
    return {
      ...def,
      tasks: weekTasks.map(serializeTask),
      doneCount,
      totalCount: weekTasks.length,
    };
  });

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.done).length;
  const percentComplete =
    totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);

  return { weeks, totalTasks, doneTasks, percentComplete };
}

router.get("/plan", async (_req, res) => {
  res.json(await buildPlan());
});

router.post("/plan/reset", async (_req, res) => {
  await db.delete(tasksTable);
  res.json(await buildPlan());
});

router.post("/tasks", async (req, res) => {
  const body = CreateTaskBody.parse(req.body);
  const existing = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.weekNumber, body.weekNumber));
  const position = existing.length;
  const [created] = await db
    .insert(tasksTable)
    .values({
      weekNumber: body.weekNumber,
      name: body.name ?? "",
      owner: body.owner ?? "",
      targetDate: body.targetDate ?? "",
      position,
    })
    .returning();
  res.status(201).json(serializeTask(created));
});

router.patch("/tasks/:id", async (req, res) => {
  const { id } = UpdateTaskParams.parse(req.params);
  const body = UpdateTaskBody.parse(req.body);

  const updates: Partial<typeof tasksTable.$inferInsert> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.owner !== undefined) updates.owner = body.owner;
  if (body.targetDate !== undefined) updates.targetDate = body.targetDate;
  if (body.done !== undefined) updates.done = body.done;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields provided to update" });
    return;
  }

  const [updated] = await db
    .update(tasksTable)
    .set(updates)
    .where(eq(tasksTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json(serializeTask(updated));
});

router.delete("/tasks/:id", async (req, res) => {
  const { id } = DeleteTaskParams.parse(req.params);
  const [deleted] = await db
    .delete(tasksTable)
    .where(eq(tasksTable.id, id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.status(204).end();
});

export default router;
