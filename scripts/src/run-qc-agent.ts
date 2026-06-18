/**
 * Triggers a QC Agent run by calling the API server's /api/qc/run endpoint.
 *
 * Intended for use as a Replit Scheduled Deployment (cron). Default schedule:
 * weekdays at 07:00 — cron expression `0 7 * * 1-5`.
 *
 * Configure the target with QC_AGENT_URL. In a Scheduled Deployment, set this
 * to the published app's domain, e.g.
 *   QC_AGENT_URL=https://<your-app>.replit.app/api/qc/run
 * Locally it defaults to the dev proxy on port 80.
 */

const url =
  process.env.QC_AGENT_URL || "http://localhost:80/api/qc/run";

async function main(): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`QC agent run failed (${res.status}): ${text.slice(0, 1000)}`);
  }

  console.log(`QC agent run triggered (${res.status}): ${text.slice(0, 1000)}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
