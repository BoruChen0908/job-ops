import type {
  ExtractorManifest,
  ExtractorProgressEvent,
} from "@shared/types/extractors";
import { filterExistingJobs } from "@shared/utils/filter-existing-jobs.js";
import {
  runSimplifyJobs,
  type SimplifyJobsProgressEvent,
} from "./run";

function toProgress(event: SimplifyJobsProgressEvent): ExtractorProgressEvent {
  if (event.type === "repo_start") {
    return {
      phase: "list",
      termsProcessed: Math.max(event.repoIndex - 1, 0),
      termsTotal: event.repoTotal,
      currentUrl: event.repo,
      detail: `Simplify Jobs: fetching ${event.repo} (${event.repoIndex}/${event.repoTotal})`,
    };
  }

  return {
    phase: "list",
    termsProcessed: event.repoIndex,
    termsTotal: event.repoTotal,
    currentUrl: event.repo,
    jobPagesProcessed: event.jobsFound ?? 0,
    detail: `Simplify Jobs: ${event.repo} done — ${event.jobsFound ?? 0} jobs found`,
  };
}

export const manifest: ExtractorManifest = {
  id: "simplifyjobs",
  displayName: "Simplify Jobs",
  providesSources: ["simplifyjobs"],

  async run(context) {
    if (context.shouldCancel?.()) {
      return { success: true, jobs: [] };
    }

    const existingJobUrls = await context.getExistingJobUrls?.();

    const parsedMax = context.settings.jobspyResultsWanted
      ? Number.parseInt(context.settings.jobspyResultsWanted, 10)
      : Number.NaN;
    const maxJobs = Number.isFinite(parsedMax) ? Math.max(1, parsedMax) : 200;

    const result = await runSimplifyJobs({
      repos: ["Summer2026-Internships", "New-Grad-Positions"],
      searchTerms: context.searchTerms,
      maxJobs,
      shouldCancel: context.shouldCancel,
      onProgress: (event) => {
        if (context.shouldCancel?.()) return;
        context.onProgress?.(toProgress(event));
      },
    });

    if (!result.success) {
      return { success: false, jobs: [], error: result.error };
    }

    const { jobs } = filterExistingJobs(result.jobs, existingJobUrls, "Simplify Jobs");
    return { success: true, jobs };
  },
};

export default manifest;
