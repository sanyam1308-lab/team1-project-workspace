import { logger } from "./logger";

const REQUIRED_QC_SECRETS = [
  "TABLEAU_POD",
  "TABLEAU_SITE",
  "TABLEAU_PAT_NAME",
  "TABLEAU_PAT_SECRET",
  "TABLEAU_DATASOURCE_LUID",
  "ANTHROPIC_API_KEY",
];

export function checkQcSecrets(): void {
  const missing = REQUIRED_QC_SECRETS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    logger.warn(
      { missing },
      "QC Agent configuration incomplete — Tableau pull and/or Claude reasoning will not work until these secrets are set",
    );
  } else {
    logger.info("QC Agent configuration present");
  }
}
