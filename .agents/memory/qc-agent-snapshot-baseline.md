---
name: QC Agent snapshot baseline
description: How the QC Agent picks the "previous" snapshot to compare against when detecting metric deviations.
---

# QC Agent deviation baseline

The QC Agent compares each run's pulled metric values against the **immediately previous run that produced snapshots**, identified by the max `runId` in `qc_snapshots` with `runId < currentRunId`. It then loads only that run's snapshots into the per-metricKey baseline map.

**Why:** An earlier implementation took the global latest-snapshot-per-metricKey across all history. That caused two bugs:
1. Stale baselines — if a metric key was absent for a run and later returned, it compared against an old value instead of run N-1.
2. `missing_dimension` deviations re-fired every run forever — a disappeared dimension value stayed in the global map, so each later run kept re-detecting it as missing.

**How to apply:** Any change to deviation detection must keep the baseline scoped to a single previous run's snapshots. `missing_dimension` must be derived only from keys present in that previous run, so a disappearance fires once (the next run's baseline no longer contains the key). Snapshots are written only on a successful Tableau pull, so a failed run is correctly skipped as a baseline.
