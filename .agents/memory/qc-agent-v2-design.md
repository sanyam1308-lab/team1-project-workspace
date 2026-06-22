---
name: QC Agent v2 design (multi-view, two-check reconciliation)
description: Agreed forward design for expanding the QC Agent — per-view configs, temporal + reconciliation checks, owner email reports. Not yet built.
---

# QC Agent v2 — agreed design (planning, not yet implemented)

Reached after extended back-and-forth with the user; record so a future session does not re-litigate settled decisions.

## The two-check model
- **Check #1 — temporal (3 KPIs):** snapshot a view's KPIs each cycle, compare to the previous snapshot, flag movement beyond tolerance. This is the existing snapshot engine, scoped per view.
- **Check #2 — reconciliation (5 KPIs):** compare the view's KPIs against the raw source's KPIs at the same point in time. Disagreement = the view no longer ties to its source.
- Combined signal drives the directional indicator: view+source moved together → source-data change; view diverged from source → mapping/extract issue. (This is what disambiguates the existing source_data vs mapping_files categories.)

## Key decision: how the raw source is read (Path A)
- Raw data is delivered as **Tableau Hyper extracts**, and each cycle's raw Hyper is **published to the Tableau site** so the agent queries it via the same VizQL Data Service it already uses for the view.
- **Why:** makes Check #2 a near-mirror of Check #1 (same PAT sign-in, same query engine, same KPI definitions; only difference is two sources vs two points in time). Avoids reading .hyper files directly — Tableau's Hyper API is Python/C++/Java with no reliable Node reader, and this stack is Node/TS.
- SharePoint is the versioned home / audit trail of the raw extracts (and the email sends from Outlook), NOT the thing the agent parses.

## Reconciliation layer
- Because both sides are queried identically via VizQL, **calc-neutral comparison is exact** (raw sums, row counts, category counts) — no need to replicate the workbook's probability-weighting / Activity-basis / currency math. Avoid full calc replication unless validating the dashboard's internal formulas becomes a specific goal.
- **Why this matters:** the view applies workbook math the raw data lacks (seen directly: same Revenue measure was $38.9B raw vs $785M once view filters matched, with prospective years probability-weighted). Naive view-vs-raw compares would flag these as false mismatches.

## Per-view config ("customized links")
Each monitored view = one config entry holding: the view's published data source + the exact filter set that reproduces that view's slice, the paired raw published Hyper, the owner email, and KPI definitions. **Filters must be first-class in the KPI/config schema** — a measure is meaningless without them (same measure swung from $38.9B to $785M purely from filters). The current v1 qc_metric_config supports measure + dimension + threshold only; v2 needs filters added.

## Integrations (available, connect at build time)
- SharePoint Online connector — read/version raw extracts.
- Microsoft Outlook connector (or Gmail) — email per-owner reports.

## Tuning defaults (user-approved, overridable)
- Tolerance/severity: within 0.5% = OK, within 5% = Warning, beyond = Critical (per-KPI override).
- Cadence: fire on Tableau refresh webhook, weekday 07:00 schedule as backstop; skip Check #2 if the paired raw Hyper is stale.
- Pairing: a naming rule to auto-match each view's source with its raw Hyper per cycle (shared key + cycle date).

## Pending from user before build
- KPI definitions per view (3 for Check #1, 5 for Check #2): name, measure + aggregation, filters, optional dimension, tolerance; for Check #2, confirm field names match on the raw Hyper or provide a mapping.
- One example view to wire end-to-end first.
- One-time connect of SharePoint + Outlook.
