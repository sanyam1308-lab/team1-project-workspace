import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  if (!client) {
    client = new Anthropic({ apiKey });
  }
  return client;
}

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

export interface RootCauseInput {
  metricKey: string;
  measureField: string;
  dimensionValue: string;
  previousValue: number | null;
  currentValue: number | null;
  pctChange: number | null;
  reason: string;
}

export type LikelyCause = "source_data" | "mapping_files" | "unclear";
export type Confidence = "high" | "medium" | "low";

export interface RootCauseResult {
  likelyCause: LikelyCause;
  confidence: Confidence;
  explanation: string;
  recommendedCheck: string;
  rawResponse: string;
}

const SYSTEM_PROMPT = `You are a data quality analyst for a revenue reporting pipeline.

Revenue metrics flow from upstream SOURCE DATA (raw transactional/extract data loaded into the Tableau data source) through MAPPING FILES (lookup/configuration files that map and categorize raw values into reporting dimensions such as region, product, or account).

When a monitored metric deviates unexpectedly, classify the most likely root-cause direction:
- "source_data": the underlying data appears missing, null, zero, partially loaded, or its overall magnitude changed. A metric dropping to zero/null or a large total swing usually points here.
- "mapping_files": totals look plausible but a breakdown shifted between dimension values, or a dimension value disappeared/appeared. This usually points to a mapping/categorization change rather than missing source data.
- "unclear": there is not enough signal to choose.

You give a DIRECTIONAL indicator to help a human investigate faster — you are not making a final determination.

Respond with ONLY a single JSON object and nothing else (no prose, no markdown, no code fences). The JSON must have exactly these keys:
{
  "likely_cause": "source_data" | "mapping_files" | "unclear",
  "confidence": "high" | "medium" | "low",
  "explanation": "1-2 sentence rationale",
  "recommended_check": "one concrete next check a human should perform"
}`;

function buildPrompt(input: RootCauseInput): string {
  const fmt = (v: number | null) => (v === null ? "missing/null" : String(v));
  const reasonText: Record<string, string> = {
    missing_value: "the current value is missing/null",
    zero_value: "the current value is zero",
    threshold:
      "the value changed by more than the allowed threshold versus the previous snapshot",
    missing_dimension:
      "a dimension value that had data in the previous snapshot is now absent from the results",
  };

  return `A monitored revenue metric deviated.

Metric: ${input.metricKey}
Measure: ${input.measureField}
Dimension value: ${input.dimensionValue || "(none — total)"}
Previous value: ${fmt(input.previousValue)}
Current value: ${fmt(input.currentValue)}
Percent change: ${input.pctChange === null ? "n/a" : `${input.pctChange.toFixed(1)}%`}
Detected reason: ${reasonText[input.reason] ?? input.reason}

Classify the most likely root-cause direction and respond with the JSON object only.`;
}

function normalizeCause(value: unknown): LikelyCause {
  const v = String(value ?? "").toLowerCase();
  if (v.includes("source")) return "source_data";
  if (v.includes("mapping")) return "mapping_files";
  return "unclear";
}

function normalizeConfidence(value: unknown): Confidence {
  const v = String(value ?? "").toLowerCase();
  if (v.includes("high")) return "high";
  if (v.includes("med")) return "medium";
  return "low";
}

function parseResult(text: string): RootCauseResult {
  const raw = text;
  let cleaned = text.trim();
  // strip code fences if present
  cleaned = cleaned
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }

  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    return {
      likelyCause: normalizeCause(parsed.likely_cause ?? parsed.likelyCause),
      confidence: normalizeConfidence(parsed.confidence),
      explanation: String(parsed.explanation ?? "").slice(0, 2000),
      recommendedCheck: String(
        parsed.recommended_check ?? parsed.recommendedCheck ?? "",
      ).slice(0, 2000),
      rawResponse: raw,
    };
  } catch {
    return {
      likelyCause: "unclear",
      confidence: "low",
      explanation:
        raw.slice(0, 2000) || "Could not parse a structured response from the model.",
      recommendedCheck: "",
      rawResponse: raw,
    };
  }
}

export async function reasonRootCause(
  input: RootCauseInput,
): Promise<RootCauseResult> {
  const anthropic = getClient();
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildPrompt(input) }],
  });

  const block = message.content[0];
  const text = block && block.type === "text" ? block.text : "";
  return parseResult(text);
}
