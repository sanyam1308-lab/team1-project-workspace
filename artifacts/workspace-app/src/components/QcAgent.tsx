import React, { useState } from "react";
import {
  useListQcMetrics,
  useCreateQcMetric,
  useUpdateQcMetric,
  useDeleteQcMetric,
  useTestQcConnection,
  useRunQcAgent,
  useListQcRuns,
  useListQcDeviations,
  getListQcMetricsQueryKey,
  getListQcRunsQueryKey,
  getListQcDeviationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

const AGGREGATIONS = ["SUM", "AVG", "COUNT", "COUNTD", "MIN", "MAX", "MEDIAN"];

const numberFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

function fmtValue(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return numberFmt.format(v);
}

function fmtPct(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}%`;
}

const REASON_LABELS: Record<string, string> = {
  missing_value: "Missing / null value",
  zero_value: "Value dropped to zero",
  threshold: "Change exceeded threshold",
  missing_dimension: "Dimension value disappeared",
};

const CAUSE_LABELS: Record<string, string> = {
  source_data: "SOURCE DATA",
  mapping_files: "MAPPING FILES",
  unclear: "UNCLEAR",
};

function causeClasses(cause: string): string {
  if (cause === "source_data")
    return "bg-primary text-primary-foreground border-primary";
  if (cause === "mapping_files")
    return "bg-foreground text-background border-foreground";
  return "bg-muted text-muted-foreground border-border";
}

export default function QcAgent() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase text-primary tracking-widest">
          QC Agent
        </h2>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Pulls monitored metrics from the published Tableau data source,
          compares them against the previous snapshot, and uses Claude to give a
          directional root-cause indicator. Triggers: the button below, the
          scheduled run (weekdays 07:00), or the{" "}
          <code className="font-mono text-xs">POST /api/tableau-webhook</code>{" "}
          webhook.
        </p>
      </div>

      <ConnectionPanel />
      <MetricsConfig />
      <RunPanel />
      <DeviationsList />
    </section>
  );
}

function ConnectionPanel() {
  const testConnection = useTestQcConnection();
  const [result, setResult] = useState<{
    connected: boolean;
    datasourceName?: string;
    fieldCount?: number;
    error?: string;
  } | null>(null);

  const handleTest = () => {
    testConnection.mutate(undefined, {
      onSuccess: (data) => setResult(data),
    });
  };

  return (
    <div className="bg-card border border-border p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-bold uppercase text-foreground">
            Tableau Connection
          </h3>
          {result === null ? (
            <p className="text-sm text-muted-foreground">
              Connection not tested yet.
            </p>
          ) : result.connected ? (
            <p className="text-sm font-bold text-foreground">
              <span className="text-primary">CONNECTED</span>
              {result.datasourceName ? ` to ${result.datasourceName}` : ""}
              {typeof result.fieldCount === "number"
                ? ` · ${result.fieldCount} fields available`
                : ""}
            </p>
          ) : (
            <p className="text-sm font-bold text-destructive break-words">
              NOT CONNECTED — {result.error}
            </p>
          )}
        </div>
        <Button
          onClick={handleTest}
          disabled={testConnection.isPending}
          className="uppercase font-bold rounded-none whitespace-nowrap"
        >
          {testConnection.isPending ? "TESTING…" : "TEST CONNECTION"}
        </Button>
      </div>
    </div>
  );
}

function MetricsConfig() {
  const queryClient = useQueryClient();
  const { data: metrics, isLoading } = useListQcMetrics({
    query: { refetchInterval: 5000, queryKey: getListQcMetricsQueryKey() },
  });

  const createMetric = useCreateQcMetric();

  const [measureField, setMeasureField] = useState("");
  const [dimensionField, setDimensionField] = useState("");
  const [aggregation, setAggregation] = useState("SUM");
  const [thresholdPct, setThresholdPct] = useState("10");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!measureField.trim()) return;
    const threshold = parseFloat(thresholdPct);
    createMetric.mutate(
      {
        data: {
          measureField: measureField.trim(),
          dimensionField: dimensionField.trim(),
          aggregation,
          thresholdPct: Number.isFinite(threshold) ? threshold : 10,
        },
      },
      {
        onSuccess: () => {
          setMeasureField("");
          setDimensionField("");
          setAggregation("SUM");
          setThresholdPct("10");
          queryClient.invalidateQueries({
            queryKey: getListQcMetricsQueryKey(),
          });
        },
      },
    );
  };

  return (
    <div className="bg-card border border-border p-6 shadow-sm space-y-4">
      <h3 className="text-sm font-bold uppercase text-foreground">
        Monitored Metrics
      </h3>

      <div className="bg-muted p-4 border border-border">
        <form
          onSubmit={handleAdd}
          className="grid grid-cols-1 md:grid-cols-[1fr_1fr_140px_120px_auto] gap-3 md:items-end"
        >
          <FieldLabel label="Measure field">
            <Input
              value={measureField}
              onChange={(e) => setMeasureField(e.target.value)}
              placeholder="e.g. Revenue"
              className="rounded-none shadow-none focus-visible:ring-primary bg-card"
            />
          </FieldLabel>
          <FieldLabel label="Dimension (optional)">
            <Input
              value={dimensionField}
              onChange={(e) => setDimensionField(e.target.value)}
              placeholder="e.g. Region"
              className="rounded-none shadow-none focus-visible:ring-primary bg-card"
            />
          </FieldLabel>
          <FieldLabel label="Aggregation">
            <Select value={aggregation} onValueChange={setAggregation}>
              <SelectTrigger className="rounded-none shadow-none bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                {AGGREGATIONS.map((a) => (
                  <SelectItem key={a} value={a} className="rounded-none">
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldLabel>
          <FieldLabel label="Threshold %">
            <Input
              type="number"
              min="0"
              step="1"
              value={thresholdPct}
              onChange={(e) => setThresholdPct(e.target.value)}
              className="rounded-none shadow-none focus-visible:ring-primary bg-card"
            />
          </FieldLabel>
          <Button
            type="submit"
            disabled={createMetric.isPending || !measureField.trim()}
            className="uppercase font-bold rounded-none"
          >
            ADD
          </Button>
        </form>
      </div>

      {isLoading ? (
        <div className="h-16 animate-pulse bg-muted rounded-none" />
      ) : metrics && metrics.length > 0 ? (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-[1fr_1fr_120px_120px_auto] gap-4 px-3 py-2 text-xs font-bold uppercase text-muted-foreground">
            <div>Measure</div>
            <div>Dimension</div>
            <div>Aggregation</div>
            <div>Threshold</div>
            <div className="w-8" />
          </div>
          {metrics.map((m) => (
            <MetricRow key={m.id} metric={m} />
          ))}
        </div>
      ) : (
        <div className="py-8 text-center text-muted-foreground border border-dashed border-border text-sm">
          No metrics configured yet. Add a measure (e.g. Revenue) above to start
          monitoring.
        </div>
      )}
    </div>
  );
}

function MetricRow({
  metric,
}: {
  metric: {
    id: number;
    measureField: string;
    dimensionField: string;
    aggregation: string;
    thresholdPct: number;
  };
}) {
  const queryClient = useQueryClient();
  const updateMetric = useUpdateQcMetric();
  const deleteMetric = useDeleteQcMetric();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListQcMetricsQueryKey() });

  const handleThreshold = (value: string) => {
    const n = parseFloat(value);
    if (!Number.isFinite(n)) return;
    updateMetric.mutate(
      { id: metric.id, data: { thresholdPct: n } },
      { onSuccess: invalidate },
    );
  };

  const handleDelete = () => {
    deleteMetric.mutate({ id: metric.id }, { onSuccess: invalidate });
  };

  return (
    <div className="grid grid-cols-[1fr_1fr_120px_120px_auto] gap-4 items-center bg-background border border-border p-3">
      <span className="font-bold text-sm text-foreground">
        {metric.measureField}
      </span>
      <span className="text-sm text-muted-foreground">
        {metric.dimensionField || "— (total)"}
      </span>
      <span className="text-sm text-muted-foreground">{metric.aggregation}</span>
      <Input
        type="number"
        min="0"
        step="1"
        defaultValue={String(metric.thresholdPct)}
        onBlur={(e) => handleThreshold(e.target.value)}
        className="h-8 rounded-none border-transparent hover:border-input focus-visible:border-input shadow-none bg-transparent text-sm"
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDelete}
        disabled={deleteMetric.isPending}
        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-none"
        title="Remove metric"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 6h18" />
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </svg>
      </Button>
    </div>
  );
}

function RunPanel() {
  const queryClient = useQueryClient();
  const runAgent = useRunQcAgent();
  const { data: runs } = useListQcRuns(
    { limit: 1 },
    {
      query: {
        refetchInterval: 5000,
        queryKey: getListQcRunsQueryKey({ limit: 1 }),
      },
    },
  );

  const lastRun = runs && runs.length > 0 ? runs[0] : null;

  const handleRun = () => {
    runAgent.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListQcRunsQueryKey() });
        queryClient.invalidateQueries({
          queryKey: getListQcDeviationsQueryKey(),
        });
      },
    });
  };

  return (
    <div className="bg-card border border-border p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-bold uppercase text-foreground">
            Run Agent
          </h3>
          {lastRun ? (
            <p className="text-sm text-muted-foreground">
              Last run:{" "}
              <span
                className={
                  lastRun.status === "error"
                    ? "font-bold text-destructive"
                    : "font-bold text-foreground"
                }
              >
                {lastRun.status.toUpperCase()}
              </span>{" "}
              · {lastRun.trigger} ·{" "}
              {new Date(lastRun.startedAt).toLocaleString()} —{" "}
              {lastRun.message}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              The agent has not run yet.
            </p>
          )}
        </div>
        <Button
          onClick={handleRun}
          disabled={runAgent.isPending}
          className="uppercase font-bold rounded-none whitespace-nowrap"
        >
          {runAgent.isPending ? "RUNNING…" : "RUN AGENT NOW"}
        </Button>
      </div>
    </div>
  );
}

function DeviationsList() {
  const { data: deviations, isLoading } = useListQcDeviations(
    { limit: 50 },
    {
      query: {
        refetchInterval: 5000,
        queryKey: getListQcDeviationsQueryKey({ limit: 50 }),
      },
    },
  );

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold uppercase text-foreground">
        Detected Deviations
      </h3>

      {isLoading ? (
        <div className="h-32 animate-pulse bg-muted rounded-none" />
      ) : deviations && deviations.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {deviations.map((d) => (
            <DeviationCard key={d.id} deviation={d} />
          ))}
        </div>
      ) : (
        <div className="py-12 text-center text-muted-foreground border border-dashed border-border text-sm">
          No deviations detected. Run the agent to check the latest data.
        </div>
      )}
    </div>
  );
}

function DeviationCard({
  deviation: d,
}: {
  deviation: {
    id: number;
    metricKey: string;
    reason: string;
    previousValue?: number | null;
    currentValue?: number | null;
    pctChange?: number | null;
    likelyCause: string;
    confidence: string;
    explanation: string;
    recommendedCheck: string;
  };
}) {
  return (
    <div className="bg-card border border-border shadow-sm flex flex-col">
      <div className="flex items-start justify-between gap-3 p-5 border-b border-border">
        <div className="space-y-1">
          <p className="font-bold text-foreground text-sm break-words">
            {d.metricKey}
          </p>
          <p className="text-xs uppercase font-bold text-muted-foreground tracking-wide">
            {REASON_LABELS[d.reason] ?? d.reason}
          </p>
        </div>
        <span
          className={`text-xs font-bold uppercase px-2 py-1 border whitespace-nowrap ${causeClasses(
            d.likelyCause,
          )}`}
        >
          {CAUSE_LABELS[d.likelyCause] ?? d.likelyCause}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 p-5 border-b border-border text-center">
        <Stat label="Previous" value={fmtValue(d.previousValue)} />
        <Stat label="Current" value={fmtValue(d.currentValue)} />
        <Stat label="Change" value={fmtPct(d.pctChange)} />
      </div>

      <div className="p-5 space-y-3 flex-1">
        <div>
          <p className="text-xs font-bold uppercase text-muted-foreground mb-1">
            Indicator · {d.confidence} confidence
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            {d.explanation || "No explanation provided."}
          </p>
        </div>
        {d.recommendedCheck ? (
          <div>
            <p className="text-xs font-bold uppercase text-muted-foreground mb-1">
              Recommended check
            </p>
            <p className="text-sm text-foreground leading-relaxed">
              {d.recommendedCheck}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase font-bold text-muted-foreground mb-1">
        {label}
      </p>
      <p className="text-base font-bold text-foreground break-words">{value}</p>
    </div>
  );
}

function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-bold uppercase text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
