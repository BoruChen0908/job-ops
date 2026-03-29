/**
 * Pipeline step: extract new search terms from high-scoring JDs via LLM.
 *
 * Non-blocking: on failure, logs a warning and returns zero counts
 * so the pipeline can continue.
 */

import { logger } from "@infra/logger";
import * as recommendedTermsRepo from "@server/repositories/recommended-terms";
import * as settingsRepo from "@server/repositories/settings";
import {
  extractNewTerms,
  type TermExpansionScope,
} from "@server/services/term-expansion";
import type { ScoredJob } from "./types";
import { progressHelpers } from "../progress";

interface ExtractTermsResult {
  newTermsCount: number;
  updatedTermsCount: number;
}

export async function extractTermsStep(args: {
  scoredJobs: readonly ScoredJob[];
  profile: Record<string, unknown>;
  shouldCancel?: () => boolean;
}): Promise<ExtractTermsResult> {
  logger.info("Running term extraction step", {
    scoredJobCount: args.scoredJobs.length,
  });

  progressHelpers.extractingTermsStart(args.scoredJobs.length);

  try {
    if (args.shouldCancel?.()) {
      return { newTermsCount: 0, updatedTermsCount: 0 };
    }

    // Read existing search terms from settings
    const searchTermsSetting = await settingsRepo.getSetting("searchTerms");
    const existingSearchTerms: string[] = searchTermsSetting
      ? JSON.parse(searchTermsSetting)
      : [];

    // Build a profile summary for the prompt
    const profile = args.profile as {
      basics?: { label?: string; summary?: string };
      skills?: { items?: Array<{ name?: string; keywords?: string[] }> };
    };
    const profileSummary = [
      profile.basics?.label ?? "",
      profile.basics?.summary ?? "",
      ...(profile.skills?.items?.flatMap((s) => s.keywords ?? []) ?? []),
    ]
      .filter(Boolean)
      .join(". ");

    // Default scope: top 10 highest-scoring jobs
    const scope: TermExpansionScope = { mode: "top_n", n: 10 };

    const terms = await extractNewTerms({
      scoredJobs: args.scoredJobs,
      existingSearchTerms,
      profileSummary: profileSummary || "Software engineer seeking internship",
      scope,
    });

    if (args.shouldCancel?.()) {
      return { newTermsCount: 0, updatedTermsCount: 0 };
    }

    if (terms.length === 0) {
      logger.info("No new terms extracted from JDs");
      progressHelpers.extractingTermsComplete(0, 0);
      return { newTermsCount: 0, updatedTermsCount: 0 };
    }

    // Upsert discovered terms into recommended_terms table
    const upsertInput = terms.map((t) => ({
      term: t.term,
      confidence: t.confidence,
      sourceJobIds: t.sourceJobIds,
    }));

    const result = await recommendedTermsRepo.upsertTerms(upsertInput);

    logger.info("Term extraction step completed", {
      newTerms: result.newCount,
      updatedTerms: result.updatedCount,
      totalExtracted: terms.length,
    });

    progressHelpers.extractingTermsComplete(
      result.newCount,
      result.updatedCount,
    );
    return {
      newTermsCount: result.newCount,
      updatedTermsCount: result.updatedCount,
    };
  } catch (error) {
    logger.warn("Term extraction step failed (non-blocking)", {
      error: error instanceof Error ? error.message : String(error),
    });
    progressHelpers.extractingTermsComplete(0, 0);
    return { newTermsCount: 0, updatedTermsCount: 0 };
  }
}
