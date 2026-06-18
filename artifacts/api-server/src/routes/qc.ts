import { Router, type IRouter } from "express";
import { db, qcMetricConfigTable } from "@workspace/db";
import { asc, desc, eq } from "drizzle-orm";
import {
  CreateQcMetricBody,
  UpdateQcMetricParams,
  UpdateQcMetricBody,
  DeleteQcMetricParams,
  ListQcRunsQueryParams,
  ListQcDeviationsQueryParams,
} from "@workspace/api-zod";
import { qcRunsTable, qcDeviationsTable } from "@workspace/db";
import { testConnection } from "../services/tableau";
import { runAgent, serializeRun, serializeDeviation } from "../services/qcAgent";

const router: IRouter = Router();

function serializeMetric(m: typeof qcMetricConfigTable.$inferSelect) {
  return {
    id: m.id,
    measureField: m.measureField,
    aggregation: m.aggregation,
    dimensionField: m.dimensionField,
    thresholdPct: m.thresholdPct,
    createdAt: m.createdAt,
  };
}

router.post("/qc/test-connection", async (_req, res) => {
  const result = await testConnection();
  res.json(result);
});

router.get("/qc/config", async (_req, res) => {
  const metrics = await db
    .select()
    .from(qcMetricConfigTable)
    .orderBy(asc(qcMetricConfigTable.id));
  res.json(metrics.map(serializeMetric));
});

router.post("/qc/config", async (req, res) => {
  const body = CreateQcMetricBody.parse(req.body);
  const [created] = await db
    .insert(qcMetricConfigTable)
    .values({
      measureField: body.measureField,
      aggregation: body.aggregation ?? "SUM",
      dimensionField: body.dimensionField ?? "",
      thresholdPct: body.thresholdPct ?? 10,
    })
    .returning();
  res.status(201).json(serializeMetric(created));
});

router.patch("/qc/config/:id", async (req, res) => {
  const { id } = UpdateQcMetricParams.parse(req.params);
  const body = UpdateQcMetricBody.parse(req.body);

  const updates: Partial<typeof qcMetricConfigTable.$inferInsert> = {};
  if (body.measureField !== undefined) updates.measureField = body.measureField;
  if (body.aggregation !== undefined) updates.aggregation = body.aggregation;
  if (body.dimensionField !== undefined)
    updates.dimensionField = body.dimensionField;
  if (body.thresholdPct !== undefined) updates.thresholdPct = body.thresholdPct;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields provided to update" });
    return;
  }

  const [updated] = await db
    .update(qcMetricConfigTable)
    .set(updates)
    .where(eq(qcMetricConfigTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Metric not found" });
    return;
  }
  res.json(serializeMetric(updated));
});

router.delete("/qc/config/:id", async (req, res) => {
  const { id } = DeleteQcMetricParams.parse(req.params);
  const [deleted] = await db
    .delete(qcMetricConfigTable)
    .where(eq(qcMetricConfigTable.id, id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Metric not found" });
    return;
  }
  res.status(204).end();
});

router.post("/qc/run", async (_req, res) => {
  const result = await runAgent("manual");
  res.json(result);
});

router.get("/qc/runs", async (req, res) => {
  const { limit } = ListQcRunsQueryParams.parse(req.query);
  const runs = await db
    .select()
    .from(qcRunsTable)
    .orderBy(desc(qcRunsTable.id))
    .limit(limit ?? 20);
  res.json(runs.map(serializeRun));
});

router.get("/qc/deviations", async (req, res) => {
  const { limit } = ListQcDeviationsQueryParams.parse(req.query);
  const deviations = await db
    .select()
    .from(qcDeviationsTable)
    .orderBy(desc(qcDeviationsTable.id))
    .limit(limit ?? 50);
  res.json(deviations.map(serializeDeviation));
});

router.post("/tableau-webhook", async (_req, res) => {
  const result = await runAgent("webhook");
  res.json(result);
});

export default router;
