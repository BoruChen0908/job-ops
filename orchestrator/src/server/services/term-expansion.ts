/**
 * Service for discovering new search terms from high-scoring job descriptions.
 */

import { logger } from "@infra/logger";
import type { ScoredJob } from "@server/pipeline/steps/types";
import { LlmService } from "./llm/service";
import type { JsonSchemaDefinition } from "./llm/types";
import { resolveLlmModel } from "./modelSelection";
import {
  getEffectivePromptTemplate,
  renderPromptTemplate,
} from "./prompt-templates";

export interface ExtractedTerm {
  term: string;
  confidence: number;
  sourceJobIds: string[];
}

interface TermExtractionResult {
  terms: ExtractedTerm[];
}

export type TermExpansionScope =
  | { mode: "top_n"; n: number }
  | { mode: "above_score"; threshold: number }
  | { mode: "all" };

/** JSON schema for term extraction response */
const TERM_EXTRACTION_SCHEMA: JsonSchemaDefinition = {
  name: "term_extraction",
  schema: {
    type: "object",
    properties: {
      terms: {
        type: "array",
        items: {
          type: "object",
          properties: {
            term: { type: "string" },
            confidence: { type: "number" },
          },
          required: ["term", "confidence"],
          additionalProperties: false,
        },
      },
    },
    required: ["terms"],
    additionalProperties: false,
  },
};

const BATCH_SIZE = 5;
const MAX_JD_LENGTH = 2000;

/**
 * Filter jobs by scope, then extract new search terms from their JDs via LLM.
 */
export async function extractNewTerms({
  scoredJobs,
  existingSearchTerms,
  profileSummary,
  scope = { mode: "top_n", n: 10 },
}: {
  scoredJobs: readonly ScoredJob[];
  existingSearchTerms: readonly string[];
  profileSummary: string;
  scope?: TermExpansionScope;
}): Promise<ExtractedTerm[]> {
  const filtered = filterJobsByScope(scoredJobs, scope);

  if (filtered.length === 0) {
    logger.info("No jobs matched term expansion scope, skipping", {
      scope,
      totalJobs: scoredJobs.length,
    });
    return [];
  }

  const batches = createBatches(filtered, BATCH_SIZE);
  const model = await resolveLlmModel("scoring");
  const promptTemplate = await getEffectivePromptTemplate(
    "termExpansionPromptTemplate",
  );
  const existingTermsText = existingSearchTerms.join(", ") || "(none)";

  logger.info("Starting term extraction", {
    jobCount: filtered.length,
    batchCount: batches.length,
    scope,
  });

  const llm = new LlmService();
  const allTerms: ExtractedTerm[] = [];

  for (const batch of batches) {
    const batchTerms = await extractTermsFromBatch({
      jobs: batch,
      model,
      llm,
      promptTemplate,
      profileSummary,
      existingTermsText,
    });
    allTerms.push(...batchTerms);
  }

  return deduplicateTerms(allTerms, existingSearchTerms);
}

export function filterJobsByScope(
  jobs: readonly ScoredJob[],
  scope: TermExpansionScope,
): ScoredJob[] {
  const withDescription = jobs.filter(
    (j) => j.jobDescription && j.jobDescription.trim().length > 0,
  );

  const sorted = [...withDescription].sort(
    (a, b) => b.suitabilityScore - a.suitabilityScore,
  );

  switch (scope.mode) {
    case "top_n":
      return sorted.slice(0, scope.n);
    case "above_score":
      return sorted.filter((j) => j.suitabilityScore >= scope.threshold);
    case "all":
      return sorted;
  }
}

function createBatches<T>(items: readonly T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size) as T[]);
  }
  return batches;
}

async function extractTermsFromBatch({
  jobs,
  model,
  llm,
  promptTemplate,
  profileSummary,
  existingTermsText,
}: {
  jobs: readonly ScoredJob[];
  model: string;
  llm: LlmService;
  promptTemplate: string;
  profileSummary: string;
  existingTermsText: string;
}): Promise<ExtractedTerm[]> {
  const jobDescriptionsBatch = jobs
    .map((job, i) => {
      const jd = (job.jobDescription ?? "").slice(0, MAX_JD_LENGTH);
      return `--- JD ${i + 1}: ${job.title} (score: ${job.suitabilityScore}) ---\n${jd}`;
    })
    .join("\n\n");

  const prompt = renderPromptTemplate(promptTemplate, {
    profileSummary,
    existingSearchTerms: existingTermsText,
    jobDescriptionsBatch,
  });

  try {
    const result = await llm.callJson<TermExtractionResult>({
      model,
      messages: [{ role: "user", content: prompt }],
      jsonSchema: TERM_EXTRACTION_SCHEMA,
      maxRetries: 1,
    });

    if (!result.success) {
      logger.warn("Term extraction LLM call failed for batch", {
        error: result.error,
        jobCount: jobs.length,
      });
      return [];
    }

    if (!Array.isArray(result.data.terms)) {
      logger.warn("Term extraction returned non-array terms", {
        data: result.data,
      });
      return [];
    }

    const batchJobIds = jobs.map((j) => j.id);

    return result.data.terms
      .filter(
        (t) =>
          typeof t.term === "string" &&
          t.term.trim().length > 0 &&
          typeof t.confidence === "number",
      )
      .map((t) => ({
        term: t.term.trim(),
        confidence: Math.min(1, Math.max(0, t.confidence)),
        sourceJobIds: batchJobIds,
      }));
  } catch (error) {
    logger.warn("Term extraction batch threw unexpected error", {
      error: error instanceof Error ? error.message : String(error),
      jobCount: jobs.length,
    });
    return [];
  }
}

/**
 * Deduplicate extracted terms (case-insensitive), keeping the highest confidence
 * and merging sourceJobIds, then filter out any that already exist in the user's search terms.
 */
export function deduplicateTerms(
  terms: readonly ExtractedTerm[],
  existingSearchTerms: readonly string[],
): ExtractedTerm[] {
  const existingLower = new Set(
    existingSearchTerms.map((t) => t.toLowerCase()),
  );

  const seen = new Map<string, ExtractedTerm>();

  for (const term of terms) {
    const lower = term.term.toLowerCase();
    if (existingLower.has(lower)) continue;

    const existing = seen.get(lower);
    if (!existing) {
      seen.set(lower, { ...term });
    } else {
      const mergedJobIds = Array.from(
        new Set([...existing.sourceJobIds, ...term.sourceJobIds]),
      );
      if (term.confidence > existing.confidence) {
        seen.set(lower, { ...term, sourceJobIds: mergedJobIds });
      } else {
        existing.sourceJobIds = mergedJobIds;
      }
    }
  }

  return Array.from(seen.values());
}
