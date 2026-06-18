import { logger } from "../lib/logger";

export interface TableauField {
  fieldName: string;
  fieldCaption: string;
  dataType?: string;
}

export interface QueryField {
  fieldCaption: string;
  function?: string;
}

interface TableauConfig {
  pod: string;
  site: string;
  apiVersion: string;
  patName: string;
  patSecret: string;
  datasourceLuid: string;
}

function getConfig(): TableauConfig {
  const pod = process.env.TABLEAU_POD;
  const patName = process.env.TABLEAU_PAT_NAME;
  const patSecret = process.env.TABLEAU_PAT_SECRET;
  const datasourceLuid = process.env.TABLEAU_DATASOURCE_LUID;

  const missing: string[] = [];
  if (!pod) missing.push("TABLEAU_POD");
  if (!patName) missing.push("TABLEAU_PAT_NAME");
  if (!patSecret) missing.push("TABLEAU_PAT_SECRET");
  if (!datasourceLuid) missing.push("TABLEAU_DATASOURCE_LUID");
  if (missing.length > 0) {
    throw new Error(`Missing Tableau configuration: ${missing.join(", ")}`);
  }

  return {
    pod: pod!,
    site: process.env.TABLEAU_SITE ?? "",
    apiVersion: process.env.TABLEAU_API_VERSION || "3.21",
    patName: patName!,
    patSecret: patSecret!,
    datasourceLuid: datasourceLuid!,
  };
}

function baseUrl(pod: string): string {
  if (pod.startsWith("http://") || pod.startsWith("https://")) {
    return pod.replace(/\/$/, "");
  }
  if (pod.includes(".")) {
    return `https://${pod}`;
  }
  return `https://${pod}.online.tableau.com`;
}

interface CachedToken {
  token: string;
  siteId: string;
  expiresAt: number;
}

let cached: CachedToken | null = null;

async function signIn(cfg: TableauConfig): Promise<CachedToken> {
  if (cached && cached.expiresAt > Date.now()) {
    return cached;
  }

  const url = `${baseUrl(cfg.pod)}/api/${cfg.apiVersion}/auth/signin`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      credentials: {
        personalAccessTokenName: cfg.patName,
        personalAccessTokenSecret: cfg.patSecret,
        site: { contentUrl: cfg.site },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Tableau sign-in failed (${res.status}): ${text.slice(0, 500)}`);
  }

  const json = (await res.json()) as {
    credentials?: { token?: string; site?: { id?: string } };
  };
  const token = json.credentials?.token;
  const siteId = json.credentials?.site?.id ?? "";
  if (!token) {
    throw new Error("Tableau sign-in returned no token");
  }

  // PAT sessions last ~120 minutes; refresh a little early.
  cached = { token, siteId, expiresAt: Date.now() + 110 * 60 * 1000 };
  return cached;
}

async function authedPost(
  cfg: TableauConfig,
  path: string,
  body: unknown,
): Promise<unknown> {
  let session = await signIn(cfg);
  const doFetch = (token: string) =>
    fetch(`${baseUrl(cfg.pod)}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Tableau-Auth": token,
      },
      body: JSON.stringify(body),
    });

  let res = await doFetch(session.token);
  if (res.status === 401) {
    cached = null;
    session = await signIn(cfg);
    res = await doFetch(session.token);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Tableau request failed (${res.status}): ${text.slice(0, 500)}`);
  }
  return res.json();
}

export async function readMetadata(): Promise<TableauField[]> {
  const cfg = getConfig();
  const json = (await authedPost(cfg, "/api/v1/vizql-data-service/read-metadata", {
    datasource: { datasourceLuid: cfg.datasourceLuid },
  })) as { data?: Array<Record<string, unknown>> };

  const data = Array.isArray(json.data) ? json.data : [];
  return data.map((f) => ({
    fieldName: String(f.fieldName ?? f.fieldCaption ?? ""),
    fieldCaption: String(f.fieldCaption ?? f.fieldName ?? ""),
    dataType: f.dataType ? String(f.dataType) : undefined,
  }));
}

export async function queryDatasource(
  fields: QueryField[],
): Promise<Array<Record<string, unknown>>> {
  const cfg = getConfig();
  const json = (await authedPost(
    cfg,
    "/api/v1/vizql-data-service/query-datasource",
    {
      datasource: { datasourceLuid: cfg.datasourceLuid },
      query: {
        fields: fields.map((f) =>
          f.function
            ? { fieldCaption: f.fieldCaption, function: f.function }
            : { fieldCaption: f.fieldCaption },
        ),
      },
    },
  )) as { data?: Array<Record<string, unknown>> };

  return Array.isArray(json.data) ? json.data : [];
}

async function getDatasourceName(
  cfg: TableauConfig,
  token: string,
  siteId: string,
): Promise<string | undefined> {
  if (!siteId) return undefined;
  try {
    const res = await fetch(
      `${baseUrl(cfg.pod)}/api/${cfg.apiVersion}/sites/${siteId}/datasources/${cfg.datasourceLuid}`,
      { headers: { Accept: "application/json", "X-Tableau-Auth": token } },
    );
    if (!res.ok) return undefined;
    const json = (await res.json()) as { datasource?: { name?: string } };
    return json.datasource?.name;
  } catch {
    return undefined;
  }
}

export interface ConnectionResult {
  connected: boolean;
  datasourceName?: string;
  fieldCount?: number;
  fields?: TableauField[];
  error?: string;
}

export async function testConnection(): Promise<ConnectionResult> {
  try {
    const cfg = getConfig();
    const session = await signIn(cfg);
    const datasourceName = await getDatasourceName(
      cfg,
      session.token,
      session.siteId,
    );
    const fields = await readMetadata();
    return {
      connected: true,
      datasourceName,
      fieldCount: fields.length,
      fields,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn({ err }, "Tableau test connection failed");
    return { connected: false, error: message };
  }
}
