---
name: Secrets require workflow restart
description: Updated Replit secrets do not reach a running server until its workflow restarts; bash diagnostics read fresh values and mask the staleness.
---

A long-running workflow process (e.g. the Express API server) captures `process.env` at startup. When a secret/env var is changed via the Secrets UI or `requestEnvVar`, the running process keeps the OLD value until the workflow is explicitly restarted.

**Why this bites:** ad hoc `node -e` / bash diagnostics spawn a fresh shell, so they read the NEW secret values — making it look like the server "should" have them too. The server can keep failing on stale credentials while your diagnostics look correct, sending you chasing the wrong cause (we burned many rounds on a "the personal access token is invalid" 401 that was really a stale-secret problem).

**How to apply:** after ANY secret/env change, restart the relevant workflow (`restart_workflow <name>`) BEFORE testing the server. If a server-side credential error persists even though a fresh-shell diagnostic shows the value is correct, suspect a stale process first and restart.
