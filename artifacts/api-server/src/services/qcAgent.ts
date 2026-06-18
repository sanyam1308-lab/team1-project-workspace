import {
  db,
  qcMetricConfigTable,
  qcRunsTable,
  qcSnapshotsTable,
  qcDeviationsTable,
} from "@workspace/db";
import { asc, desc, eq, lt } from "drizzle-orm";
import { queryDatasource, type QueryField } from "./tableau";
import { reasonRootCause } from "./claude";
import { logger } from "../lib/logger";

type RunRow = typeof qcRunsTable.$inferSelect;
type SnapshotRow = typeof qcSnapshotsTable.$inferSelect;
type DeviationRow = typeof qcDeviationsTable.$inferSelect;

export function serializeRun(r: RunRow) {
  return {
    id: r.id,
    trigger: r.trigger,
    status: r.status,
    message: r.message,
    metricsPulled: r.metricsPulled,
    deviationsFound: r.deviationsFound,
    startedAt: r.startedAt,
  };
}

export function serializeDeviation(d: DeviationRow) {
  return {
    id: d.id,
    runId: d.runId,
    metricKey: d.metricKey,
    measureField: d.measureField,
    dimensionValue: d.dimensionValue,
    previousValue: d.previousValue,
    currentValue: d.currentValue,
    pctChange: d.pctChange,
    reason: d.reason,
    likelyCause: d.likelyCause,
    confidence: d.confidence,
    explanation: d.explanation,
    recommendedCheck: d.recommendedCheck,
    createdAt: d.createdAt,
  };
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function extractMeasure(
  row: Record<string, unknown>,
  measureField: string,
  aggregation: string,
  dimensionField: string,
): number | null {
  const agg = (aggregation || "SUM").toUpperCase();
  const candidates = [measureField, `${agg}(${measureField})`, `${aggregation}(${measureField})`];
  for (const k of candidates) {
    if (Object.prototype.hasOwnProperty.call(row, k)) {
      return toNum(row[k]);
    }
  }
  const keys = Object.keys(row).filter((k) => k !== dimensionField);
  if (keys.length === 1) {
    return toNum(row[keys[0]]);
  }
  return null;
}

interface CurrentSeries {
  metricKey: string;
  measureField: string;
  dimensionField: string;
  dimensionValue: string;
  value: number | null;
  threshold: number;
}

interface DetectedDeviation {
  metricKey: string;
  measureField: string;
  dimensionValue: string;
  previousValue: number | null;
  currentValue: number | null;
  pctChange: number | null;
  reason: string;
}

export interface RunResult {
  run: ReturnType<typeof serializeRun>;
  deviations: ReturnType<typeof serializeDeviation>[];
}

export async function runAgent(trigger: string): Promise<RunResult> {
  const [run] = await db.insert(qcRunsTable).values({ trigger }).returning();
  const persistedDeviations: DeviationRow[] = [];

  try {
    const configs = await db
      .select()
      .from(qcMetricConfigTable)
      .orderBy(asc(qcMetricConfigTable.id));

    if (configs.length === 0) {
      const [updated] = await db
        .update(qcRunsTable)
        .set({
          status: "success",
          message: "No metrics configured. Add a metric to start monitoring.",
          metricsPulled: 0,
          deviationsFound: 0,
        })
        .where(eq(qcRunsTable.id, run.id))
        .returning();
      return { run: serializeRun(updated), deviations: [] };
    }

    // Baseline = the most recent prior run that actually pulled snapshots
    // (snapshots are only written on a successful pull). Comparing against the
    // immediately previous run — rather than the global latest-per-key — keeps
    // baselines fresh and prevents missing_dimension alerts from re-firing every
    // run once a value has disappeared.
    const [prevRun] = await db
      .select({ runId: qcSnapshotsTable.runId })
      .from(qcSnapshotsTable)
      .where(lt(qcSnapshotsTable.runId, run.id))
      .orderBy(desc(qcSnapshotsTable.runId))
      .limit(1);

    const prevSnaps = prevRun
      ? await db
          .select()
          .from(qcSnapshotsTable)
          .where(eq(qcSnapshotsTable.runId, prevRun.runId))
      : [];
    const prevByKey = new Map<string, SnapshotRow>();
    for (const s of prevSnaps) {
      prevByKey.set(s.metricKey, s);
    }

    // Pull current values from Tableau.
    const current: CurrentSeries[] = [];
    const monitoredKeys = new Set<string>();

    for (const cfg of configs) {
      const fields: QueryField[] = [];
      if (cfg.dimensionField) fields.push({ fieldCaption: cfg.dimensionField });
      fields.push({
        fieldCaption: cfg.measureField,
        function: cfg.aggregation || "SUM",
      });

      const rows = await queryDatasource(fields);

      if (cfg.dimensionField) {
        for (const row of rows) {
          const dimVal =
            row[cfg.dimensionField] == null
              ? ""
              : String(row[cfg.dimensionField]);
          const key = `${cfg.measureField} | ${cfg.dimensionField}=${dimVal}`;
          current.push({
            metricKey: key,
            measureField: cfg.measureField,
            dimensionField: cfg.dimensionField,
            dimensionValue: dimVal,
            value: extractMeasure(
              row,
              cfg.measureField,
              cfg.aggregation,
              cfg.dimensionField,
            ),
            threshold: cfg.thresholdPct,
          });
          monitoredKeys.add(key);
        }
      } else {
        const row = rows[0] ?? {};
        const key = cfg.measureField;
        current.push({
          metricKey: key,
          measureField: cfg.measureField,
          dimensionField: "",
          dimensionValue: "",
          value: extractMeasure(row, cfg.measureField, cfg.aggregation, ""),
          threshold: cfg.thresholdPct,
        });
        monitoredKeys.add(key);
      }
    }

    // Persist this run's snapshots.
    if (current.length > 0) {
      await db.insert(qcSnapshotsTable).values(
        current.map((c) => ({
          runId: run.id,
          metricKey: c.metricKey,
          measureField: c.measureField,
          dimensionField: c.dimensionField,
          dimensionValue: c.dimensionValue,
          value: c.value,
        })),
      );
    }

    // Detect deviations on current series.
    const detected: DetectedDeviation[] = [];
    for (const c of current) {
      const prev = prevByKey.get(c.metricKey);
      const prevVal = prev ? prev.value : null;
      let reason: string | null = null;
      let pct: number | null = null;

      if (c.value === null) {
        reason = "missing_value";
      } else if (c.value === 0) {
        reason = "zero_value";
      } else if (prevVal !== null && prevVal !== 0) {
        pct = ((c.value - prevVal) / Math.abs(prevVal)) * 100;
        if (Math.abs(pct) > c.threshold) reason = "threshold";
      }

      if (reason) {
        detected.push({
          metricKey: c.metricKey,
          measureField: c.measureField,
          dimensionValue: c.dimensionValue,
          previousValue: prevVal,
          currentValue: c.value,
          pctChange: pct,
          reason,
        });
      }
    }

    // Detect dimension values that disappeared since the previous snapshot.
    for (const [key, snap] of prevByKey) {
      if (monitoredKeys.has(key)) continue;
      const belongs = configs.some(
        (cfg) =>
          cfg.dimensionField &&
          key.startsWith(`${cfg.measureField} | ${cfg.dimensionField}=`),
      );
      if (belongs && snap.value !== null && snap.value !== 0) {
        detected.push({
          metricKey: key,
          measureField: snap.measureField,
          dimensionValue: snap.dimensionValue,
          previousValue: snap.value,
          currentValue: null,
          pctChange: null,
          reason: "missing_dimension",
        });
      }
    }

    // Ask Claude for a directional root-cause indicator per deviation.
    for (const d of detected) {
      let rc;
      try {
        rc = await reasonRootCause({
          metricKey: d.metricKey,
          measureField: d.measureField,
          dimensionValue: d.dimensionValue,
          previousValue: d.previousValue,
          currentValue: d.currentValue,
          pctChange: d.pctChange,
          reason: d.reason,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.warn({ err }, "Claude root-cause reasoning failed");
        rc = {
          likelyCause: "unclear" as const,
          confidence: "low" as const,
          explanation: `AI reasoning unavailable: ${message}`,
          recommendedCheck: "",
          rawResponse: "",
        };
      }

      const [inserted] = await db
        .insert(qcDeviationsTable)
        .values({
          runId: run.id,
          metricKey: d.metricKey,
          measureField: d.measureField,
          dimensionValue: d.dimensionValue,
          previousValue: d.previousValue,
          currentValue: d.currentValue,
          pctChange: d.pctChange,
          reason: d.reason,
          likelyCause: rc.likelyCause,
          confidence: rc.confidence,
          explanation: rc.explanation,
          recommendedCheck: rc.recommendedCheck,
          rawResponse: rc.rawResponse,
        })
        .returning();
      persistedDeviations.push(inserted);
    }

    const [updated] = await db
      .update(qcRunsTable)
      .set({
        status: "success",
        message: `Pulled ${current.length} metric series; found ${detected.length} deviation(s).`,
        metricsPulled: current.length,
        deviationsFound: detected.length,
      })
      .where(eq(qcRunsTable.id, run.id))
      .returning();

    return {
      run: serializeRun(updated),
      deviations: persistedDeviations.map(serializeDeviation),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "QC agent run failed");
    const [updated] = await db
      .update(qcRunsTable)
      .set({ status: "error", message })
      .where(eq(qcRunsTable.id, run.id))
      .returning();
    return {
      run: serializeRun(updated),
      deviations: persistedDeviations.map(serializeDeviation),
    };
  }
}
